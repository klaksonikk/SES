import React, { useState, useEffect } from 'react';
import { DriverModel, DriverTSParams, DriverPhysicalGeometry } from '../types/driver';
import { VERIFIED_DRIVER_LIBRARY } from '../drivers/library';
import { loadCustomDrivers, saveCustomDriver, deleteCustomDriver } from '../drivers/customDrivers';
import { validateAndDeriveTS } from '../acoustic/thieleSmall';
import { EnclosureConfig } from '../types/enclosure';
import { CustomDriverModal } from './CustomDriverModal';
import { Disc, CheckCircle2, AlertCircle, Edit3, Plus, Trash2, Sliders, Sparkles } from 'lucide-react';

interface DriverSettingsProps {
  driver: DriverModel;
  enclosure: EnclosureConfig;
  onUpdateDriver: (driver: DriverModel) => void;
  onUpdateEnclosure: (updated: Partial<EnclosureConfig>) => void;
}

export const DriverSettings: React.FC<DriverSettingsProps> = ({
  driver,
  enclosure,
  onUpdateDriver,
  onUpdateEnclosure
}) => {
  const [customDriversList, setCustomDriversList] = useState<DriverModel[]>(() => loadCustomDrivers());
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [driverBeingEdited, setDriverBeingEdited] = useState<DriverModel | undefined>(undefined);

  const reloadCustomDrivers = () => {
    setCustomDriversList(loadCustomDrivers());
  };

  const handleSelectDriver = (driverId: string) => {
    const foundCustom = customDriversList.find(d => d.id === driverId);
    if (foundCustom) {
      onUpdateDriver(JSON.parse(JSON.stringify(foundCustom)));
      return;
    }
    const foundLibrary = VERIFIED_DRIVER_LIBRARY.find(d => d.id === driverId);
    if (foundLibrary) {
      onUpdateDriver(JSON.parse(JSON.stringify(foundLibrary)));
    }
  };

  const handleDeleteCustom = (driverId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Czy na pewno chcesz usunąć ten własny przetwornik?')) {
      const remaining = deleteCustomDriver(driverId);
      setCustomDriversList(remaining);
      if (driver.id === driverId) {
        onUpdateDriver(VERIFIED_DRIVER_LIBRARY[0]);
      }
    }
  };

  const consistency = validateAndDeriveTS(driver.ts);

  return (
    <div className="space-y-4">
      {/* Driver Selector & Add Custom Button */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
            Przetwornik Niskotonowy
          </label>
          <button
            onClick={() => {
              setDriverBeingEdited(undefined);
              setIsCustomModalOpen(true);
            }}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Własny głośnik</span>
          </button>
        </div>

        <select
          value={driver.id}
          onChange={(e) => handleSelectDriver(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs text-neutral-100 outline-none focus:border-amber-500 font-medium"
        >
          {customDriversList.length > 0 && (
            <optgroup label="⭐ Moje Własne Przetworniki (Zapisane lokalnie)">
              {customDriversList.map(d => (
                <option key={d.id} value={d.id}>
                  {d.brand} — {d.model} ({d.geometry.nominalDiameterInch}") [Własny]
                </option>
              ))}
            </optgroup>
          )}

          <optgroup label="📚 Fabryczna Biblioteka Referencyjna (Zweryfikowana)">
            {VERIFIED_DRIVER_LIBRARY.map((d) => (
              <option key={d.id} value={d.id}>
                {d.brand} — {d.model} ({d.geometry.nominalDiameterInch}")
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Driver Card Header & Edit Action */}
      <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-100">{driver.brand} {driver.model}</span>
            {driver.source === 'user_custom' && (
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 font-mono text-[9px] rounded font-bold">
                WŁASNY
              </span>
            )}
          </div>
          <span className="text-[10px] text-neutral-400 block mt-0.5">
            Fs: {driver.ts.fs} Hz | Qts: {driver.ts.qts} | Vas: {driver.ts.vas} L | Xmax: {driver.ts.xmax} mm
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setDriverBeingEdited(driver);
              setIsCustomModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 transition"
            title="Edytuj parametry tego przetwornika"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {driver.source === 'user_custom' && (
            <button
              onClick={(e) => handleDeleteCustom(driver.id, e)}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-950 text-neutral-400 hover:text-rose-400 transition"
              title="Usuń ten własny głośnik z biblioteki"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Driver Configuration (Count, Arrangement) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Liczba Przetworników
          </label>
          <select
            value={enclosure.driverCount}
            onChange={(e) => onUpdateEnclosure({ driverCount: Number(e.target.value) as 1 | 2 | 4 })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-amber-500 font-mono"
          >
            <option value="1">1 głośnik</option>
            <option value="2">2 głośniki</option>
            <option value="4">4 głośniki</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Układ Montażu
          </label>
          <select
            value={enclosure.driverArrangement}
            onChange={(e) => onUpdateEnclosure({ driverArrangement: e.target.value as any })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-amber-500"
          >
            <option value="standard">Standardowy</option>
            <option value="isobaric">Izobaryczny (Isobaric 2x)</option>
            <option value="push_pull">Push-Pull</option>
          </select>
        </div>
      </div>

      {/* Physical Cutout Dimensions Card */}
      <div className="p-3 rounded-lg bg-neutral-800/40 border border-neutral-800 text-xs">
        <span className="text-[11px] font-semibold text-neutral-300 block mb-2">
          Fizyczne Wymiary Montażowe (Sekcja 9)
        </span>
        <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
          <div>
            <span className="text-[10px] text-neutral-500 block">Otwór wycięcia</span>
            <span className="text-amber-400 font-bold">⌀{driver.geometry.cutoutDiameterMm} mm</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 block">Kołnierz zewn.</span>
            <span className="text-neutral-200">⌀{driver.geometry.outerDiameterMm} mm</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 block">Głębokość</span>
            <span className="text-neutral-200">{driver.geometry.mountingDepthMm} mm</span>
          </div>
        </div>
      </div>

      {/* Driver Position / Shifting Controls */}
      <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Położenie Głośnika na Ściance (Offset X / Y)</span>
          </label>
          {((enclosure.driverOffsetXOffsetMm || 0) !== 0 || (enclosure.driverOffsetYOffsetMm || 0) !== 0) && (
            <button
              type="button"
              onClick={() => onUpdateEnclosure({ driverOffsetXOffsetMm: 0, driverOffsetYOffsetMm: 0 })}
              className="text-[10px] text-amber-400 hover:text-amber-300 font-mono font-bold"
              title="Przywróć głośnik na środek frontu"
            >
              Wyśrodkuj (0, 0)
            </button>
          )}
        </div>

        {/* X Offset Slider & Input */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-neutral-400 text-[11px]">Przesunięcie w poziomie (X)</span>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">{enclosure.driverOffsetXOffsetMm || 0} mm</span>
              <span className="text-[10px] text-neutral-500">
                {(enclosure.driverOffsetXOffsetMm || 0) < 0 ? '(w lewo)' : (enclosure.driverOffsetXOffsetMm || 0) > 0 ? '(w prawo)' : '(środek)'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateEnclosure({ driverOffsetXOffsetMm: (enclosure.driverOffsetXOffsetMm || 0) - 10 })}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono"
              title="Przesuń 10mm w lewo"
            >
              -10
            </button>
            <input
              type="range"
              min="-180"
              max="180"
              step="2"
              value={enclosure.driverOffsetXOffsetMm || 0}
              onChange={(e) => onUpdateEnclosure({ driverOffsetXOffsetMm: Number(e.target.value) })}
              className="flex-1 accent-amber-500 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onUpdateEnclosure({ driverOffsetXOffsetMm: (enclosure.driverOffsetXOffsetMm || 0) + 10 })}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono"
              title="Przesuń 10mm w prawo"
            >
              +10
            </button>
          </div>
        </div>

        {/* Y Offset Slider & Input */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-neutral-400 text-[11px]">Przesunięcie w pionie (Y)</span>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">{enclosure.driverOffsetYOffsetMm || 0} mm</span>
              <span className="text-[10px] text-neutral-500">
                {(enclosure.driverOffsetYOffsetMm || 0) < 0 ? '(w dół)' : (enclosure.driverOffsetYOffsetMm || 0) > 0 ? '(w górę)' : '(środek)'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateEnclosure({ driverOffsetYOffsetMm: (enclosure.driverOffsetYOffsetMm || 0) - 10 })}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono"
              title="Przesuń 10mm w dół"
            >
              -10
            </button>
            <input
              type="range"
              min="-180"
              max="180"
              step="2"
              value={enclosure.driverOffsetYOffsetMm || 0}
              onChange={(e) => onUpdateEnclosure({ driverOffsetYOffsetMm: Number(e.target.value) })}
              className="flex-1 accent-amber-500 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onUpdateEnclosure({ driverOffsetYOffsetMm: (enclosure.driverOffsetYOffsetMm || 0) + 10 })}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono"
              title="Przesuń 10mm w górę"
            >
              +10
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[10px] text-neutral-500">
          <span>Współrzędne są na bieżąco uwzględniane w 3D CAD, plikach DXF i rysunku 2D</span>
        </div>
      </div>

      {/* Modal for creating / editing driver */}
      <CustomDriverModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        driverToEdit={driverBeingEdited}
        onDriverCreated={(created) => {
          reloadCustomDrivers();
          onUpdateDriver(created);
        }}
      />
    </div>
  );
};
