import React from 'react';
import { EnclosureConfig, PortConfig, PortType } from '../types/enclosure';
import { calculatePortPhysics } from '../acoustic/bassReflex';
import { DriverModel } from '../types/driver';
import { Wind, CornerDownRight, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface PortSettingsProps {
  enclosure: EnclosureConfig;
  driver: DriverModel;
  netVbLiters: number;
  onUpdatePort: (updated: Partial<PortConfig>) => void;
}

export const PortSettings: React.FC<PortSettingsProps> = ({
  enclosure,
  driver,
  netVbLiters,
  onUpdatePort
}) => {
  const port = enclosure.port;
  const isVented = enclosure.type === 'bass_reflex' ||
    enclosure.type === 'bass_reflex_slot' ||
    enclosure.type === 'bass_reflex_tube' ||
    enclosure.type === 'bandpass_4th' ||
    enclosure.type === 'bandpass_6th';

  if (!isVented) {
    return (
      <div className="p-4 rounded-lg bg-neutral-800/30 border border-neutral-800 text-center">
        <Wind className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
        <span className="text-xs font-semibold text-neutral-400 block">Obudowa Zamknięta (Sealed)</span>
        <p className="text-[11px] text-neutral-500 mt-1">
          Brak portu rezonansowego. Powietrze wewnątrz komory działa jak czysta sprężyna akustyczna (Cab).
        </p>
      </div>
    );
  }

  const portPhysics = calculatePortPhysics(
    port,
    netVbLiters,
    driver.ts.sd * enclosure.driverCount,
    driver.ts.xmax,
    driver.ts.pe
  );

  return (
    <div className="space-y-4">
      {/* Port Type & Location */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Typ Portu Rezonansowego
          </label>
          <select
            value={port.type}
            onChange={(e) => onUpdatePort({ type: e.target.value as PortType })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-amber-500 font-medium"
          >
            <option value="slot_l_bend">Szczelinowy Zagięty (L-Slot)</option>
            <option value="slot">Szczelinowy Prosty (Straight Slot)</option>
            <option value="round">Rura Okrągła (Round Tube)</option>
            <option value="aeroport">Rura z zaokrąglonymi wylotami (Aeroport)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Położenie Wylotu Portu
          </label>
          <select
            value={port.portLocation}
            onChange={(e) => onUpdatePort({ portLocation: e.target.value as any })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-amber-500 font-medium"
          >
            <option value="front_right">Front — Prawa Strona</option>
            <option value="front_left">Front — Lewa Strona</option>
            <option value="front_bottom">Front — Dół (Szczelina dolna)</option>
          </select>
        </div>
      </div>

      {/* Target Tuning Mode (Auto vs Manual) */}
      <div className="p-2.5 rounded-lg bg-neutral-800/40 border border-neutral-800 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-neutral-200 block">Tryb Strojenia</span>
          <span className="text-[10px] text-neutral-400">
            {port.autoCalculateLength
              ? 'Długość tunelu wyliczana automatycznie pod docelowe Fb'
              : 'Długość zadawana ręcznie (Fb wyliczane z geometrii)'}
          </span>
        </div>

        <button
          onClick={() => onUpdatePort({ autoCalculateLength: !port.autoCalculateLength })}
          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition ${
            port.autoCalculateLength
              ? 'bg-amber-500 text-black'
              : 'bg-neutral-700 text-neutral-300 hover:text-white'
          }`}
        >
          {port.autoCalculateLength ? 'AUTO (Cel: Fb)' : 'MANUAL'}
        </button>
      </div>

      {/* Dimensions Inputs */}
      {port.type === 'round' || port.type === 'aeroport' ? (
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div>
            <span className="text-[10px] text-neutral-500 block mb-0.5">Średnica wewnętrzna [mm]</span>
            <input
              type="number"
              min="40"
              max="250"
              value={port.diameterMm}
              onChange={(e) => onUpdatePort({ diameterMm: Math.max(20, Number(e.target.value)) })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-neutral-100 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <span className="text-[10px] text-neutral-500 block mb-0.5">
              {port.autoCalculateLength ? 'Docelowe Strojenie Fb [Hz]' : 'Długość fizyczna [mm]'}
            </span>
            <input
              type="number"
              min={port.autoCalculateLength ? 15 : 50}
              max={port.autoCalculateLength ? 80 : 1500}
              value={port.autoCalculateLength ? port.targetFbHz : port.lengthMm}
              onChange={(e) => onUpdatePort(
                port.autoCalculateLength
                  ? { targetFbHz: Number(e.target.value) }
                  : { lengthMm: Number(e.target.value) }
              )}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-amber-400 font-bold focus:border-amber-500 outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 font-mono text-xs">
          <div>
            <span className="text-[10px] text-neutral-500 block mb-0.5">Szerokość szczeliny [mm]</span>
            <input
              type="number"
              min="15"
              max="150"
              step="2"
              value={port.slotWidthMm}
              onChange={(e) => onUpdatePort({ slotWidthMm: Math.max(10, Number(e.target.value)) })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-neutral-100 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <span className="text-[10px] text-neutral-500 block mb-0.5">Wysokość szczeliny [mm]</span>
            <input
              type="number"
              min="100"
              max="800"
              value={port.slotHeightMm}
              onChange={(e) => onUpdatePort({ slotHeightMm: Math.max(50, Number(e.target.value)) })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-neutral-100 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <span className="text-[10px] text-neutral-500 block mb-0.5">
              {port.autoCalculateLength ? 'Docelowe Fb [Hz]' : 'Długość osi [mm]'}
            </span>
            <input
              type="number"
              min={port.autoCalculateLength ? 18 : 50}
              max={port.autoCalculateLength ? 70 : 1800}
              value={port.autoCalculateLength ? port.targetFbHz : port.lengthMm}
              onChange={(e) => onUpdatePort(
                port.autoCalculateLength
                  ? { targetFbHz: Number(e.target.value) }
                  : { lengthMm: Number(e.target.value) }
              )}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-amber-400 font-bold focus:border-amber-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Physics & End-Correction Analysis Card */}
      <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-1.5">
          <span className="font-semibold text-neutral-300">Fizyka Rezonatora Helmholtza</span>
          <span className="font-mono text-amber-400 font-bold text-sm">
            Fb = {portPhysics.tuningFbHz} Hz
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-neutral-500">Przekrój portu (Sp):</span>
            <span className="text-neutral-200 font-bold">{portPhysics.crossSectionAreaCm2} cm²</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-500">Min. zalecany (Keele):</span>
            <span className={portPhysics.isAreaTooSmall ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {portPhysics.recommendedMinAreaCm2} cm²
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-500">Długość fizyczna (L_phys):</span>
            <span className="text-neutral-200 font-bold">{portPhysics.physicalLengthMm} mm</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-500">Korekcja końcowa (Δl):</span>
            <span className="text-amber-400 font-bold">+{portPhysics.endCorrectionMm} mm</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-500">Długość efektywna (L_eff):</span>
            <span className="text-neutral-100 font-bold">{portPhysics.effectiveLengthMm} mm</span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-500">Kubatura powietrza:</span>
            <span className="text-neutral-300">{portPhysics.airVolumeLiters} L</span>
          </div>
        </div>

        {portPhysics.isAreaTooSmall && (
          <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-800/50 text-[11px] text-rose-300 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <span>
              Za małe pole przekroju portu! Przy mocy znamionowej wystąpi kompresja przepływu i słyszalny szum turbulencji.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
