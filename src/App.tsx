import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { 
  ProjectData, 
  DEFAULT_PROJECT, 
  loadProjectFromStorage, 
  saveProjectToStorage, 
  exportProjectToJson, 
  importProjectFromJson 
} from './project/projectStorage';
import { resolveDesign } from './geometry/resolveDesign';
import { getMaterialInfo } from './geometry/materials';
import { detectGeometricCollisions } from './geometry/collision';
import { simulateEnclosureAcoustics } from './acoustic/simulation';
import { calculateAlignmentPresets } from './acoustic/alignment';
import { DriverModel } from './types/driver';
import { EnclosureConfig, PortConfig } from './types/enclosure';
import { AlignmentPreset } from './types/acoustic';
import { createCompleteProjectZip } from './cad/projectZip';

// Components
import { Header } from './components/Header';
import { EnclosureSettings } from './components/EnclosureSettings';
import { DriverSettings } from './components/DriverSettings';
import { PortSettings } from './components/PortSettings';
import { VolumeLedger } from './components/VolumeLedger';
import { WorkshopBlueprint } from './components/WorkshopBlueprint';
import { CutListView } from './components/CutListView';
import { ExportModal } from './components/ExportModal';
import { DocsModal } from './components/DocsModal';

const Viewport3D = lazy(() => import('./components/Viewport3D').then(module => ({ default: module.Viewport3D })));
const AcousticCharts = lazy(() => import('./components/AcousticCharts').then(module => ({ default: module.AcousticCharts })));

import { 
  Box, 
  Disc, 
  Wind, 
  Scissors, 
  Compass, 
  PieChart, 
  Layers,
  Activity,
  Sliders,
  FileCode
} from 'lucide-react';

export type SidebarTab = 'enclosure' | 'driver' | 'port' | 'cutlist' | 'blueprint';
export type MobileMainView = 'viewport' | 'acoustics' | 'settings' | 'workshop';

export default function App() {
  const [project, setProject] = useState<ProjectData>(() => loadProjectFromStorage());
  const [activeTab, setActiveTab] = useState<SidebarTab>('enclosure');
  const [mobileView, setMobileView] = useState<MobileMainView>('viewport');
  const [inputPowerWatts, setInputPowerWatts] = useState<number>(300);
  const [is3DMaximized, setIs3DMaximized] = useState<boolean>(false);

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Auto-save project changes to localStorage
  useEffect(() => {
    saveProjectToStorage(project);
  }, [project]);

  // Resolve one shared model for geometry, volume balance, simulation and exports.
  const resolvedDesign = useMemo(() => {
    const density = getMaterialInfo(project.enclosure.material).densityKgM3;
    return resolveDesign(project.enclosure, project.driver, density);
  }, [project.enclosure, project.driver]);
  const resolvedEnclosure = resolvedDesign.enclosure;
  const solvedGeometry = resolvedDesign.geometry;
  const volumeBalance = resolvedDesign.volumeBalance;
  const resolvedProject = useMemo(() => ({ ...project, enclosure: resolvedEnclosure }), [project, resolvedEnclosure]);

  // 3. Collision Detection
  const collisionWarnings = useMemo(() => {
    return detectGeometricCollisions(resolvedEnclosure, project.driver, solvedGeometry);
  }, [resolvedEnclosure, project.driver, solvedGeometry]);

  // 4. Acoustic 2-DOF Matrix Simulation
  const acousticSimulation = useMemo(() => {
    return simulateEnclosureAcoustics(
      project.driver,
      resolvedEnclosure,
      volumeBalance.netAcousticVolumeLiters,
      { inputPowerWatts }
    );
  }, [project.driver, resolvedEnclosure, volumeBalance.netAcousticVolumeLiters, inputPowerWatts]);

  // 5. Classic TS Alignment Recommendations
  const alignmentPresets = useMemo(() => {
    return calculateAlignmentPresets(project.driver);
  }, [project.driver]);

  // State Update Handlers
  const handleUpdateProjectName = (name: string) => {
    setProject(prev => ({ ...prev, name }));
  };

  const handleResetProject = () => {
    if (window.confirm('Czy na pewno chcesz zresetować projekt do parametrów domyślnych?')) {
      setProject(DEFAULT_PROJECT);
    }
  };

  const handleUpdateEnclosure = (updated: Partial<EnclosureConfig>) => {
    setProject(prev => ({
      ...prev,
      enclosure: { ...prev.enclosure, ...updated }
    }));
  };

  const handleUpdateDriver = (driver: DriverModel) => {
    setProject(prev => ({
      ...prev,
      driver
    }));
  };

  const handleUpdatePort = (updated: Partial<PortConfig>) => {
    setProject(prev => ({
      ...prev,
      enclosure: {
        ...prev.enclosure,
        port: { ...prev.enclosure.port, ...updated }
      }
    }));
  };

  const handleApplyAlignment = (preset: AlignmentPreset) => {
    const t = project.enclosure.panelThicknessMm;
    const targetVbL = preset.recommendedVbLiters;
    const intTargetM3 = (targetVbL + 8) * 1e-3;
    const side = Math.cbrt(intTargetM3);
    const newIntW = Math.round(side * 0.9 * 1000);
    const newIntH = Math.round(side * 1.05 * 1000);
    const newIntD = Math.round(side * 1.1 * 1000);

    const newOuterW = newIntW + 2 * t;
    const newOuterH = newIntH + 2 * t;
    const newOuterD = newIntD + 2 * t;

    setProject(prev => ({
      ...prev,
      enclosure: {
        ...prev.enclosure,
        type: preset.type === 'Butterworth' || preset.type === 'Bessel' ? 'sealed' : 'bass_reflex_slot',
        outerWidthMm: newOuterW,
        outerHeightMm: newOuterH,
        outerDepthMm: newOuterD,
        port: {
          ...prev.enclosure.port,
          targetFbHz: preset.recommendedFbHz,
          autoCalculateLength: true
        }
      }
    }));
  };

  const handleExportJson = () => {
    const jsonStr = exportProjectToJson(resolvedProject);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (jsonString: string) => {
    const result = importProjectFromJson(jsonString);
    if (result.success && result.data) {
      setProject(result.data);
    } else {
      alert(result.error || 'Błąd importu pliku JSON.');
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zipBlob = await createCompleteProjectZip(resolvedProject, solvedGeometry, inputPowerWatts);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_dane_glosnika_i_obudowy.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Błąd podczas generowania archiwum ZIP: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* 1. Header Navigation */}
      <Header
        project={project}
        onUpdateProjectName={handleUpdateProjectName}
        onResetProject={handleResetProject}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenDocsModal={() => setIsDocsModalOpen(true)}
        onDownloadZip={handleDownloadZip}
        isZipping={isZipping}
      />

      {/* Mobile Top View Switcher (Visible on mobile/tablet <lg) */}
      <div className="lg:hidden flex items-center justify-around bg-neutral-900 border-b border-neutral-800 px-1 py-1 text-xs shrink-0 select-none">
        <button
          onClick={() => setMobileView('viewport')}
          className={`flex-1 py-2 px-1 rounded-md font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileView === 'viewport' ? 'bg-amber-500 text-black shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D CAD</span>
        </button>

        <button
          onClick={() => setMobileView('acoustics')}
          className={`flex-1 py-2 px-1 rounded-md font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileView === 'acoustics' ? 'bg-amber-500 text-black shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Akustyka</span>
        </button>

        <button
          onClick={() => setMobileView('settings')}
          className={`flex-1 py-2 px-1 rounded-md font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileView === 'settings' ? 'bg-amber-500 text-black shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Ustawienia</span>
        </button>

        <button
          onClick={() => setMobileView('workshop')}
          className={`flex-1 py-2 px-1 rounded-md font-semibold flex items-center justify-center gap-1.5 transition ${
            mobileView === 'workshop' ? 'bg-amber-500 text-black shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>CNC & 2D</span>
        </button>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* DESKTOP VIEWPORT & CHARTS (or MOBILE VIEW SWITCHED) */}
        
        {/* 3D Viewport Area */}
        <div 
          className={`
            ${is3DMaximized ? 'fixed inset-0 z-40 bg-neutral-950 flex flex-col' : ''}
            ${!is3DMaximized ? 'lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden min-w-0' : ''}
            ${!is3DMaximized && mobileView !== 'viewport' && mobileView !== 'acoustics' ? 'hidden lg:flex' : ''}
          `}
        >
          {/* 3D Model: Always shown on desktop top half; On mobile shown when mobileView === 'viewport' */}
          <div 
            className={`
              ${is3DMaximized ? 'h-full w-full' : ''}
              ${!is3DMaximized && mobileView === 'viewport' ? 'h-full w-full' : ''}
              ${!is3DMaximized && mobileView !== 'viewport' ? 'hidden lg:block lg:h-[52%] w-full shrink-0 border-b border-neutral-800 relative' : 'relative'}
            `}
          >
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-xs text-neutral-500">Ładowanie widoku 3D…</div>}>
              <Viewport3D
                panels={solvedGeometry.panels}
                driver={project.driver}
                enclosure={resolvedEnclosure}
                warnings={collisionWarnings}
                isMaximized={is3DMaximized}
                onToggleMaximize={() => setIs3DMaximized(!is3DMaximized)}
              />
            </Suspense>
          </div>

          {/* Acoustic Curves & Volume Ledger: Shown on desktop bottom half, or mobileView === 'acoustics' */}
          {!is3DMaximized && (
            <div 
              className={`
                ${mobileView === 'acoustics' ? 'h-full overflow-y-auto p-3 sm:p-4 space-y-4 bg-neutral-950 block' : ''}
                ${mobileView !== 'acoustics' ? 'hidden lg:block lg:flex-1 lg:overflow-y-auto p-3 sm:p-4 space-y-4 bg-neutral-950' : ''}
              `}
            >
              <Suspense fallback={<div className="h-72 flex items-center justify-center text-xs text-neutral-500">Ładowanie wykresów…</div>}>
                <AcousticCharts
                  simulation={acousticSimulation}
                  driver={project.driver}
                  inputPowerWatts={inputPowerWatts}
                  onUpdateInputPower={setInputPowerWatts}
                />
              </Suspense>

              <VolumeLedger
                volumeBalance={volumeBalance}
                totalWoodWeightKg={solvedGeometry.totalWoodWeightKg}
                materialName={getMaterialInfo(project.enclosure.material).name}
              />
            </div>
          )}
        </div>

        {/* Sidebar / Inspector Area: Desktop right rail; Mobile 'settings' or 'workshop' */}
        <div 
          className={`
            ${is3DMaximized ? 'hidden' : ''}
            w-full lg:w-[440px] xl:w-[480px] shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-800 bg-neutral-900/60 backdrop-blur flex flex-col h-full min-h-0 z-10
            ${mobileView === 'viewport' || mobileView === 'acoustics' ? 'hidden lg:flex' : 'flex'}
          `}
        >
          {/* Sidebar Tab Bar */}
          <div className="flex items-center border-b border-neutral-800 bg-neutral-950/80 px-2 py-1.5 gap-1 shrink-0 overflow-x-auto">
            {/* Settings sub-tabs */}
            <button
              onClick={() => { setActiveTab('enclosure'); setMobileView('settings'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'enclosure'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Obudowa</span>
            </button>

            <button
              onClick={() => { setActiveTab('driver'); setMobileView('settings'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'driver'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Głośnik (T/S)</span>
            </button>

            <button
              onClick={() => { setActiveTab('port'); setMobileView('settings'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'port'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Port / Tunel</span>
            </button>

            <button
              onClick={() => { setActiveTab('blueprint'); setMobileView('workshop'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'blueprint'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Rysunki 2D</span>
            </button>

            <button
              onClick={() => { setActiveTab('cutlist'); setMobileView('workshop'); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'cutlist'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Formatki</span>
            </button>
          </div>

          {/* Sidebar Tab Content Body */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
            {activeTab === 'enclosure' && (
              <EnclosureSettings
                enclosure={project.enclosure}
                alignmentPresets={alignmentPresets}
                onUpdateEnclosure={handleUpdateEnclosure}
                onApplyAlignment={handleApplyAlignment}
              />
            )}

            {activeTab === 'driver' && (
              <DriverSettings
                driver={project.driver}
                enclosure={project.enclosure}
                onUpdateDriver={handleUpdateDriver}
                onUpdateEnclosure={handleUpdateEnclosure}
              />
            )}

            {activeTab === 'port' && (
              <PortSettings
                enclosure={project.enclosure}
                driver={project.driver}
                netVbLiters={volumeBalance.netAcousticVolumeLiters}
                onUpdatePort={handleUpdatePort}
              />
            )}

            {activeTab === 'blueprint' && (
              <WorkshopBlueprint
                panels={solvedGeometry.panels}
                projectName={project.name}
              />
            )}

            {activeTab === 'cutlist' && (
              <CutListView
                cutList={solvedGeometry.cutList}
                projectName={project.name}
                totalWoodWeightKg={solvedGeometry.totalWoodWeightKg}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={resolvedProject}
        solved={solvedGeometry}
        volumeBalance={volumeBalance}
        onDownloadZip={handleDownloadZip}
        isZipping={isZipping}
      />

      <DocsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />
    </div>
  );
}
