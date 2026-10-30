import React from 'react';
import { ProjectData, exportProjectToJson } from '../project/projectStorage';
import { SolvedGeometry } from '../geometry/joinery';
import { VolumeBalance } from '../types/enclosure';
import { generateFullNestingDxf, generatePanelDxf } from '../cad/dxfExport';
import { generateCutListCsv } from '../cad/csvExport';
import { generatePanelSvg } from '../cad/svgExport';
import { 
  X, 
  Download, 
  FileCode, 
  FileSpreadsheet, 
  Printer, 
  Package, 
  CheckCircle2,
  Layers
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  solved: SolvedGeometry;
  volumeBalance: VolumeBalance;
  onDownloadZip: () => void;
  isZipping?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  solved,
  volumeBalance,
  onDownloadZip,
  isZipping = false
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const jsonStr = exportProjectToJson(project);
    downloadFile(jsonStr, `${project.name.replace(/\s+/g, '_')}.json`, 'application/json');
  };

  const handleExportFullDxf = () => {
    const dxf = generateFullNestingDxf(solved.panels);
    downloadFile(dxf, `${project.name.replace(/\s+/g, '_')}_all_panels_CNC.dxf`, 'application/dxf');
  };

  const handleExportFrontDxf = () => {
    const front = solved.panels.find(p => p.id === 'panel_front');
    if (front) {
      const dxf = generatePanelDxf(front, project.name);
      downloadFile(dxf, `${project.name.replace(/\s+/g, '_')}_front_baffle.dxf`, 'application/dxf');
    }
  };

  const handleExportCsv = () => {
    const csv = generateCutListCsv(solved.cutList, project.name);
    downloadFile(csv, `${project.name.replace(/\s+/g, '_')}_cutlist.csv`, 'text/csv');
  };

  const handleExportFrontSvg = () => {
    const front = solved.panels.find(p => p.id === 'panel_front');
    if (front) {
      const svg = generatePanelSvg(front, project.name);
      downloadFile(svg, `${project.name.replace(/\s+/g, '_')}_front_blueprint.svg`, 'image/svg+xml');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-100">Centrum Eksportu & Produkcji CNC</h2>
              <p className="text-xs text-neutral-400">Wygeneruj dokumentację i pliki CAD dla warsztatu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. DXF Full Nesting */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-amber-500/40 transition flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold uppercase inline-block mb-1">
                  AutoCAD DXF R12
                </span>
                <h3 className="text-sm font-bold text-neutral-100 mb-1">Wszystkie Płyty (Nesting CNC)</h3>
                <p className="text-xs text-neutral-400 mb-3">
                  Zbiorczy arkusz ze wszystkimi panelami, wycięciami pod kosz głośnika i otworami na terminal. Warstwy CAD gotowe do CAM.
                </p>
              </div>
              <button
                onClick={handleExportFullDxf}
                className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-amber-500 hover:text-black text-neutral-200 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pobierz Pełny DXF</span>
              </button>
            </div>

            {/* 2. DXF Front Baffle */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-amber-500/40 transition flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold uppercase inline-block mb-1">
                  AutoCAD DXF R12
                </span>
                <h3 className="text-sm font-bold text-neutral-100 mb-1">Płyta Przednia (Front Baffle)</h3>
                <p className="text-xs text-neutral-400 mb-3">
                  Płyta czołowa z wycięciem przelotowym ⌀{project.driver.geometry.cutoutDiameterMm}mm i frezowaniem pod kołnierz głośnika.
                </p>
              </div>
              <button
                onClick={handleExportFrontDxf}
                className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-amber-500 hover:text-black text-neutral-200 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pobierz Front DXF</span>
              </button>
            </div>

            {/* 3. Cut List CSV */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-emerald-500/40 transition flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase inline-block mb-1">
                  Formatka CSV
                </span>
                <h3 className="text-sm font-bold text-neutral-100 mb-1">Lista Cięcia dla Stolarza</h3>
                <p className="text-xs text-neutral-400 mb-3">
                  Arkusz zgodny z CutList Plus, MaxCut, OptiCut. Wymiary, grubości, ilości i naddatki materiałowe.
                </p>
              </div>
              <button
                onClick={handleExportCsv}
                className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-emerald-500 hover:text-black text-neutral-200 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Pobierz CSV</span>
              </button>
            </div>

            {/* 4. Blueprint SVG */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 hover:border-sky-500/40 transition flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono text-[10px] font-bold uppercase inline-block mb-1">
                  Wektorowy SVG
                </span>
                <h3 className="text-sm font-bold text-neutral-100 mb-1">Rysunek Techniczny 2D</h3>
                <p className="text-xs text-neutral-400 mb-3">
                  Wektorowy rysunek warsztatowy frontu z wymiarami, osiami symetrii i tabliczką inżynierską.
                </p>
              </div>
              <button
                onClick={handleExportFrontSvg}
                className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-sky-500 hover:text-black text-neutral-200 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pobierz SVG</span>
              </button>
            </div>
          </div>

          {/* Advanced speaker and enclosure data export */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-neutral-950 to-neutral-900 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase inline-block mb-1">
                DANE TECHNICZNE
              </span>
              <h3 className="text-sm font-bold text-neutral-100">Zaawansowane dane głośnika i obudowy (ZIP)</h3>
              <p className="text-xs text-neutral-400">
                ZIP zawiera jeden plik JSON z parametrami T/S i geometrią głośnika, konfiguracją obudowy, bilansem objętości, obliczeniami portu, symulacją akustyczną oraz geometrią i listą elementów.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportJson}
                className="flex-1 sm:flex-none py-2 px-3.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition"
              >
                Projekt JSON
              </button>
              <button
                onClick={onDownloadZip}
                disabled={isZipping}
                className="flex-1 sm:flex-none py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Package className="w-4 h-4" />
                <span>{isZipping ? 'Pakowanie...' : 'Pobierz dane ZIP'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
