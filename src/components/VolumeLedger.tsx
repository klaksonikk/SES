import React from 'react';
import { VolumeBalance } from '../types/enclosure';
import { Scale, PieChart, Layers } from 'lucide-react';

interface VolumeLedgerProps {
  volumeBalance: VolumeBalance;
  totalWoodWeightKg: number;
  materialName: string;
}

export const VolumeLedger: React.FC<VolumeLedgerProps> = ({
  volumeBalance,
  totalWoodWeightKg,
  materialName
}) => {
  const {
    grossExternalLiters,
    grossInternalLiters,
    wallPanelsLiters,
    driverDisplacementLiters,
    portWoodDisplacementLiters,
    portAirVolumeLiters,
    bracingDisplacementLiters,
    terminalsDisplacementLiters,
    netAcousticVolumeLiters,
    effectiveVolumeWithDampingLiters
  } = volumeBalance;

  // Percentage breakdown relative to Gross External
  const pct = (val: number) => Math.max(1, (val / grossExternalLiters) * 100);

  return (
    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-neutral-200">Bilans Objętości i Masa Obudowy</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400">
          <Scale className="w-3.5 h-3.5 text-amber-400" />
          <span>Waga skrzyni: <strong className="text-neutral-100">{totalWoodWeightKg} kg</strong></span>
        </div>
      </div>

      {/* Stacked Proportional Bar */}
      <div>
        <div className="h-5 rounded-md overflow-hidden flex text-[10px] font-mono font-bold select-none shadow-inner border border-neutral-800">
          {/* Net Acoustic Volume */}
          <div
            style={{ width: `${pct(netAcousticVolumeLiters)}%` }}
            className="bg-amber-500 text-black flex items-center justify-center px-1 truncate transition-all duration-300"
            title={`Objętość robocza netto Vb: ${netAcousticVolumeLiters} L`}
          >
            Vb {netAcousticVolumeLiters}L
          </div>

          {/* Driver Displacement */}
          <div
            style={{ width: `${pct(driverDisplacementLiters)}%` }}
            className="bg-indigo-600 text-white flex items-center justify-center px-1 truncate transition-all duration-300"
            title={`Wyparcie głośnika: ${driverDisplacementLiters} L`}
          >
            Głośnik
          </div>

          {/* Port Air */}
          {portAirVolumeLiters > 0 && (
            <div
              style={{ width: `${pct(portAirVolumeLiters)}%` }}
              className="bg-teal-500 text-black flex items-center justify-center px-1 truncate transition-all duration-300"
              title={`Powietrze w tunelu: ${portAirVolumeLiters} L`}
            >
              Port
            </div>
          )}

          {/* Port Wood */}
          {portWoodDisplacementLiters > 0 && (
            <div
              style={{ width: `${pct(portWoodDisplacementLiters)}%` }}
              className="bg-orange-700 text-white flex items-center justify-center px-1 truncate transition-all duration-300"
              title={`Ścianki tunelu: ${portWoodDisplacementLiters} L`}
            >
              Śc.
            </div>
          )}

          {/* Wall Panels */}
          <div
            style={{ width: `${pct(wallPanelsLiters)}%` }}
            className="bg-neutral-700 text-neutral-300 flex items-center justify-center px-1 truncate transition-all duration-300"
            title={`Formatki ścian zewnętrznych: ${wallPanelsLiters} L`}
          >
            Płyty
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-400 mt-2 font-mono">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            <span>Netto (Vb): <strong className="text-amber-400">{netAcousticVolumeLiters}L</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" />
            <span>Głośnik: {driverDisplacementLiters}L</span>
          </div>
          {portAirVolumeLiters > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 inline-block" />
              <span>Tunel portu: {portAirVolumeLiters}L</span>
            </div>
          )}
          {volumeBalance.isBandpass && (
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
              <span>Przegroda komór: {volumeBalance.internalBaffleWoodLiters || 0}L</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-neutral-700 inline-block" />
            <span>Płyty ({materialName}): {wallPanelsLiters}L</span>
          </div>
        </div>
      </div>

      {/* Bandpass Dual Chamber Card */}
      {volumeBalance.isBandpass && (
        <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/30 text-xs font-mono">
          <span className="text-[10px] text-blue-400 font-bold block mb-1 uppercase tracking-wide">
            Komory Obudowy Pasmowo-Przepustowej (Bandpass)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block">Komora Tylna (V_rear)</span>
              <span className="text-sm font-bold text-blue-300">{volumeBalance.rearChamberVolumeLiters ?? 0} L</span>
            </div>
            <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block">Komora Przednia (V_front)</span>
              <span className="text-sm font-bold text-amber-300">{volumeBalance.frontChamberVolumeLiters ?? 0} L</span>
            </div>
          </div>
        </div>
      )}

      {/* Accounting Table */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 text-xs font-mono">
        <div className="bg-neutral-950/50 p-2 rounded border border-neutral-800">
          <span className="text-[10px] text-neutral-500 block">Zewnętrzna Brutto</span>
          <span className="text-sm font-bold text-neutral-100">{grossExternalLiters} L</span>
        </div>

        <div className="bg-neutral-950/50 p-2 rounded border border-neutral-800">
          <span className="text-[10px] text-neutral-500 block">Wewnętrzna Czysta</span>
          <span className="text-sm font-bold text-neutral-200">{grossInternalLiters} L</span>
        </div>

        <div className="bg-amber-950/20 p-2 rounded border border-amber-500/30">
          <span className="text-[10px] text-amber-500/80 block">Akustyczna Netto (Vb)</span>
          <span className="text-sm font-bold text-amber-400">{netAcousticVolumeLiters} L</span>
        </div>

        <div className="bg-neutral-950/50 p-2 rounded border border-neutral-800">
          <span className="text-[10px] text-neutral-500 block">Pozorna z Wytłumieniem</span>
          <span className="text-sm font-bold text-sky-400">{effectiveVolumeWithDampingLiters} L</span>
        </div>
      </div>
    </div>
  );
};
