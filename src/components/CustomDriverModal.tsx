import React, { useState, useEffect } from 'react';
import { DriverModel, DriverTSParams, DriverPhysicalGeometry } from '../types/driver';
import { createEmptyCustomDriver, saveCustomDriver } from '../drivers/customDrivers';
import { validateAndDeriveTS } from '../acoustic/thieleSmall';
import { X, Disc, Save, Download, Upload, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface CustomDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriverCreated: (driver: DriverModel) => void;
  driverToEdit?: DriverModel;
}

export const CustomDriverModal: React.FC<CustomDriverModalProps> = ({
  isOpen,
  onClose,
  onDriverCreated,
  driverToEdit
}) => {
  const [driver, setDriver] = useState<DriverModel>(() => driverToEdit || createEmptyCustomDriver());
  const [activeTab, setActiveTab] = useState<'ts' | 'geom'>('ts');

  useEffect(() => {
    if (isOpen) {
      setDriver(driverToEdit ? JSON.parse(JSON.stringify(driverToEdit)) : createEmptyCustomDriver());
    }
  }, [isOpen, driverToEdit]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateTS = (key: keyof DriverTSParams, value: any) => {
    const updated = { ...driver.ts, [key]: Number(value) };
    if (key === 'qes' || key === 'qms') {
      updated.qts = Number(((updated.qes * updated.qms) / (updated.qes + updated.qms)).toFixed(3));
    }
    setDriver({ ...driver, ts: updated });
  };

  const updateGeom = (key: keyof DriverPhysicalGeometry, value: any) => {
    setDriver({
      ...driver,
      geometry: { ...driver.geometry, [key]: typeof value === 'number' ? Number(value) : value }
    });
  };

  const consistency = validateAndDeriveTS(driver.ts);

  const handleSave = () => {
    if (!driver.brand.trim() || !driver.model.trim()) {
      alert('Wpisz markę i model przetwornika!');
      return;
    }
    const saved = {
      ...driver,
      source: 'user_custom' as const,
      id: driver.id || `custom_driver_${Date.now()}`
    };
    saveCustomDriver(saved);
    onDriverCreated(saved);
    onClose();
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(driver, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${driver.brand}_${driver.model}.json`.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.ts && parsed.geometry) {
          setDriver({
            ...parsed,
            id: `custom_driver_${Date.now()}`,
            source: 'user_custom'
          });
        }
      } catch (err) {
        alert('Nieprawidłowy plik JSON z przetwornikiem.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/90 backdrop-blur shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-100">Kreator Własnego Przetwornika (T/S & CAD)</h2>
              <p className="text-[11px] text-neutral-400">Dodaj dowolny głośnik niskotonowy i zapisz w swojej bibliotece</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation & Basic Info */}
        <div className="p-4 bg-neutral-950/50 border-b border-neutral-800 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Marka / Producent</label>
              <input
                type="text"
                value={driver.brand}
                onChange={(e) => setDriver({ ...driver, brand: e.target.value })}
                placeholder="np. B2 Audio, Pride, JL Audio, Dayton..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Model / Oznaczenie</label>
              <input
                type="text"
                value={driver.model}
                onChange={(e) => setDriver({ ...driver, model: e.target.value })}
                placeholder="np. Rampage 12 D2, Ultimax 15..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-100 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
              <button
                onClick={() => setActiveTab('ts')}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  activeTab === 'ts' ? 'bg-amber-500 text-black shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Parametry Thiele'a-Smalla (T/S)
              </button>
              <button
                onClick={() => setActiveTab('geom')}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  activeTab === 'geom' ? 'bg-amber-500 text-black shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Wymiary Fizyczne & Frezowanie (CAD)
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span className="hidden sm:inline">Import JSON</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
              <button
                onClick={handleExportJson}
                className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs flex items-center gap-1"
                title="Eksportuj przetwornik do pliku JSON"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Eksport</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable inputs body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'ts' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Fs [Hz]</span>
                  <input
                    type="number"
                    step="0.1"
                    value={driver.ts.fs}
                    onChange={(e) => updateTS('fs', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Qes</span>
                  <input
                    type="number"
                    step="0.01"
                    value={driver.ts.qes}
                    onChange={(e) => updateTS('qes', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Qms</span>
                  <input
                    type="number"
                    step="0.1"
                    value={driver.ts.qms}
                    onChange={(e) => updateTS('qms', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-amber-950/20 border border-amber-500/30">
                  <span className="text-[10px] text-amber-400 block mb-0.5">Qts (Wypadkowa)</span>
                  <input
                    type="number"
                    disabled
                    value={driver.ts.qts}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-1.5 py-1 text-amber-400 font-bold"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Vas [L]</span>
                  <input
                    type="number"
                    step="0.5"
                    value={driver.ts.vas}
                    onChange={(e) => updateTS('vas', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Sd [cm²]</span>
                  <input
                    type="number"
                    step="1"
                    value={driver.ts.sd}
                    onChange={(e) => updateTS('sd', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Xmax [mm]</span>
                  <input
                    type="number"
                    step="0.5"
                    value={driver.ts.xmax}
                    onChange={(e) => updateTS('xmax', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Re [Ω]</span>
                  <input
                    type="number"
                    step="0.1"
                    value={driver.ts.re}
                    onChange={(e) => updateTS('re', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Moc Pe [W RMS]</span>
                  <input
                    type="number"
                    step="50"
                    value={driver.ts.pe}
                    onChange={(e) => updateTS('pe', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Bl [T·m]</span>
                  <input
                    type="number"
                    step="0.1"
                    value={driver.ts.bl}
                    onChange={(e) => updateTS('bl', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Mms [g]</span>
                  <input
                    type="number"
                    step="1"
                    value={driver.ts.mms}
                    onChange={(e) => updateTS('mms', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Le [mH]</span>
                  <input
                    type="number"
                    step="0.1"
                    value={driver.ts.le}
                    onChange={(e) => updateTS('le', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>
              </div>

              {/* Consistency Check Callout */}
              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs flex items-center justify-between font-mono">
                <span className="text-neutral-400">Walidacja spójności (Small-Signal):</span>
                {consistency.isValid ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Parametry spójne
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Drobne rozbieżności
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Średnica wycięcia [mm]</span>
                  <input
                    type="number"
                    value={driver.geometry.cutoutDiameterMm}
                    onChange={(e) => updateGeom('cutoutDiameterMm', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-amber-400 font-bold"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Średnica kołnierza [mm]</span>
                  <input
                    type="number"
                    value={driver.geometry.outerDiameterMm}
                    onChange={(e) => updateGeom('outerDiameterMm', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Głębokość montażowa [mm]</span>
                  <input
                    type="number"
                    value={driver.geometry.mountingDepthMm}
                    onChange={(e) => updateGeom('mountingDepthMm', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Głębokość podfrezowania [mm]</span>
                  <input
                    type="number"
                    value={driver.geometry.flangeThicknessMm}
                    onChange={(e) => updateGeom('flangeThicknessMm', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Średnica magnesu [mm]</span>
                  <input
                    type="number"
                    value={driver.geometry.magnetDiameterMm}
                    onChange={(e) => updateGeom('magnetDiameterMm', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>

                <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block mb-0.5">Wyparcie głośnika [L]</span>
                  <input
                    type="number"
                    step="0.1"
                    value={driver.geometry.displacementLiters}
                    onChange={(e) => updateGeom('displacementLiters', e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Typ Montażu</label>
                <select
                  value={driver.geometry.mountingType}
                  onChange={(e) => updateGeom('mountingType', e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none"
                >
                  <option value="flush_rebate">Wpuszczany w podfrezowanie (Flush Rebate)</option>
                  <option value="front_surface">Montaż na powierzchni frontu (Surface Mount)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            className="py-2 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Zapisz i Zastosuj Przetwornik</span>
          </button>
        </div>
      </div>
    </div>
  );
};
