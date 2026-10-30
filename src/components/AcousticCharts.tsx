import React, { useState } from 'react';
import { AcousticSimulationResult, AcousticPoint } from '../types/acoustic';
import { DriverModel } from '../types/driver';
import { 
  Activity, 
  Wind, 
  Zap, 
  TrendingUp, 
  Clock, 
  Sliders, 
  AlertTriangle,
  Info
} from 'lucide-react';

interface AcousticChartsProps {
  simulation: AcousticSimulationResult;
  driver: DriverModel;
  inputPowerWatts: number;
  onUpdateInputPower: (watts: number) => void;
}

export type ChartTab = 'spl' | 'impedance' | 'excursion' | 'velocity' | 'group_delay';

export const AcousticCharts: React.FC<AcousticChartsProps> = ({
  simulation,
  driver,
  inputPowerWatts,
  onUpdateInputPower
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('spl');
  const [hoveredPoint, setHoveredPoint] = useState<AcousticPoint | null>(null);

  const { curve, f3Hz, f6Hz, tuningFbHz, maxSplDb, maxAirVelocityMs, isAirVelocityDangerous, isExcursionExceeded } = simulation;

  // Chart Dimensions
  const svgWidth = 650;
  const svgHeight = 240;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 32;

  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const minFreq = 15;
  const maxFreq = 250;

  // Logarithmic X scale
  const getX = (freq: number) => {
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logVal = Math.log10(Math.max(minFreq, Math.min(maxFreq, freq)));
    return padLeft + ((logVal - logMin) / (logMax - logMin)) * plotW;
  };

  // Determine Y range per tab
  let minY = 60, maxY = 120;
  let unit = 'dB';
  let chartTitle = 'Poziom Ciśnienia Akustycznego (SPL)';

  if (activeTab === 'spl') {
    minY = Math.floor(Math.min(...curve.map(c => c.splDb), 70) / 10) * 10;
    maxY = Math.ceil(Math.max(...curve.map(c => c.splDb), 110) / 10) * 10 + 5;
    unit = 'dB SPL';
    chartTitle = `Charakterystyka SPL @ 1m (${inputPowerWatts}W)`;
  } else if (activeTab === 'impedance') {
    minY = 0;
    maxY = Math.ceil(Math.max(...curve.map(c => c.impedanceMagOhm), 30) / 10) * 10;
    unit = 'Ω';
    chartTitle = 'Impedancja Elektryczna |Z(f)| i Faza';
  } else if (activeTab === 'excursion') {
    minY = 0;
    maxY = Math.max(driver.ts.xmax * 1.5, Math.ceil(Math.max(...curve.map(c => c.excursionMm), 15)));
    unit = 'mm';
    chartTitle = `Wychylenie Membrany X(f) vs Xmax (${driver.ts.xmax} mm)`;
  } else if (activeTab === 'velocity') {
    minY = 0;
    maxY = Math.max(30, Math.ceil(Math.max(...curve.map(c => c.portAirVelocityMs), 20)));
    unit = 'm/s';
    chartTitle = 'Prędkość Przepływu Powietrza w Porcie (Air Velocity)';
  } else if (activeTab === 'group_delay') {
    minY = 0;
    maxY = 50;
    unit = 'ms';
    chartTitle = 'Opóźnienie Grupowe (Group Delay)';
  }

  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return padTop + plotH - ((clamped - minY) / (maxY - minY)) * plotH;
  };

  // Path generator
  const getPathData = (accessor: (p: AcousticPoint) => number) => {
    if (curve.length === 0) return '';
    return curve.reduce((acc, pt, i) => {
      const x = getX(pt.freqHz);
      const y = getY(accessor(pt));
      return i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  };

  // Grid frequencies
  const gridFreqs = [20, 30, 40, 50, 60, 80, 100, 150, 200];
  // Y ticks
  const yTicks = [
    minY,
    minY + (maxY - minY) * 0.25,
    minY + (maxY - minY) * 0.5,
    minY + (maxY - minY) * 0.75,
    maxY
  ];

  return (
    <div className="w-full flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
      {/* Top Bar: Tabs & Quick Power Input */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 px-3 py-2 bg-neutral-950/60 gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('spl')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'spl'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>SPL (dB)</span>
          </button>

          <button
            onClick={() => setActiveTab('impedance')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'impedance'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Impedancja (Ω)</span>
          </button>

          <button
            onClick={() => setActiveTab('excursion')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'excursion'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Wychylenie (mm)</span>
          </button>

          <button
            onClick={() => setActiveTab('velocity')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'velocity'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Prędkość portu</span>
          </button>

          <button
            onClick={() => setActiveTab('group_delay')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'group_delay'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Opóźnienie</span>
          </button>
        </div>

        {/* Input Power Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">Moc wejściowa:</span>
          <div className="flex items-center gap-1">
            {Array.from(new Set([1, 100, 300, Math.round(driver.ts.pe || 300)].filter(w => w > 0)))
              .sort((a, b) => a - b)
              .map((watts) => (
                <button
                  key={`power-opt-${watts}`}
                  onClick={() => onUpdateInputPower(watts)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                    inputPowerWatts === watts
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
                  }`}
                >
                  {watts}W
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-neutral-950/30 border-b border-neutral-800/60 text-xs font-mono">
        <div className="p-2 rounded bg-neutral-800/40 border border-neutral-800/80">
          <span className="text-[10px] uppercase text-neutral-500 block">Strojenie Fb / Fs</span>
          <span className="text-sm font-bold text-amber-400">{tuningFbHz} Hz</span>
          <span className="text-[10px] text-neutral-400 ml-1">(Fs: {driver.ts.fs} Hz)</span>
        </div>

        <div className="p-2 rounded bg-neutral-800/40 border border-neutral-800/80">
          <span className="text-[10px] uppercase text-neutral-500 block">Spadek F3 (-3dB)</span>
          <span className="text-sm font-bold text-sky-400">{f3Hz} Hz</span>
          <span className="text-[10px] text-neutral-400 ml-1">F6: {f6Hz} Hz</span>
        </div>

        <div className="p-2 rounded bg-neutral-800/40 border border-neutral-800/80">
          <span className="text-[10px] uppercase text-neutral-500 block">Maksymalny SPL</span>
          <span className="text-sm font-bold text-emerald-400">{maxSplDb} dB</span>
          <span className="text-[10px] text-neutral-400 ml-1">@ {inputPowerWatts}W</span>
        </div>

        <div className={`p-2 rounded border ${
          isAirVelocityDangerous
            ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
            : 'bg-neutral-800/40 border-neutral-800/80 text-neutral-300'
        }`}>
          <span className="text-[10px] uppercase text-neutral-500 block">Szczyt prędkości w porcie</span>
          <span className={`text-sm font-bold ${isAirVelocityDangerous ? 'text-rose-400' : 'text-emerald-400'}`}>
            {maxAirVelocityMs} m/s
          </span>
          <span className="text-[10px] text-neutral-400 ml-1">
            {isAirVelocityDangerous ? '⚠️ Ryzyko świstu' : '✓ Czysty przepływ'}
          </span>
        </div>
      </div>

      {/* SVG Chart Surface */}
      <div className="relative w-full p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Background gridlines (vertical frequencies) */}
          {gridFreqs.map(f => {
            const x = getX(f);
            return (
              <g key={f}>
                <line x1={x} y1={padTop} x2={x} y2={padTop + plotH} stroke="#262626" strokeWidth="0.8" strokeDasharray="3,3" />
                <text x={x} y={padTop + plotH + 16} fill="#737373" fontSize="9" textAnchor="middle" fontFamily="monospace">
                  {f}
                </text>
              </g>
            );
          })}

          {/* Horizontal gridlines (Y ticks) */}
          {yTicks.map((yVal, idx) => {
            const y = getY(yVal);
            return (
              <g key={idx}>
                <line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} stroke="#262626" strokeWidth="0.8" />
                <text x={padLeft - 6} y={y + 3} fill="#737373" fontSize="9" textAnchor="end" fontFamily="monospace">
                  {Math.round(yVal)}
                </text>
              </g>
            );
          })}

          {/* Special Safety Thresholds (Excursion Xmax or Port Air Velocity Zones) */}
          {activeTab === 'excursion' && (
            <g>
              <line
                x1={padLeft}
                y1={getY(driver.ts.xmax)}
                x2={padLeft + plotW}
                y2={getY(driver.ts.xmax)}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="6,4"
              />
              <text x={padLeft + plotW - 4} y={getY(driver.ts.xmax) - 4} fill="#f43f5e" fontSize="9" textAnchor="end" fontFamily="monospace">
                Xmax = {driver.ts.xmax} mm
              </text>
            </g>
          )}

          {activeTab === 'velocity' && (
            <g>
              {/* Green zone < 17 m/s */}
              <rect x={padLeft} y={getY(17)} width={plotW} height={Math.max(0, getY(0) - getY(17))} fill="#10b981" fillOpacity="0.08" />
              {/* Caution zone 17-25 m/s */}
              <rect x={padLeft} y={getY(25)} width={plotW} height={Math.max(0, getY(17) - getY(25))} fill="#f59e0b" fillOpacity="0.1" />
              {/* Danger zone > 25 m/s */}
              <rect x={padLeft} y={padTop} width={plotW} height={Math.max(0, getY(25) - padTop)} fill="#ef4444" fillOpacity="0.1" />
              <line x1={padLeft} y1={getY(17)} x2={padLeft + plotW} y2={getY(17)} stroke="#10b981" strokeWidth="1" strokeDasharray="4,4" />
              <text x={padLeft + 6} y={getY(17) - 3} fill="#10b981" fontSize="8" fontFamily="monospace">Próg ciszy (17 m/s)</text>
              <line x1={padLeft} y1={getY(25)} x2={padLeft + plotW} y2={getY(25)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,4" />
              <text x={padLeft + 6} y={getY(25) - 3} fill="#ef4444" fontSize="8" fontFamily="monospace">Turbulencja / Chuffing (25 m/s)</text>
            </g>
          )}

          {/* Tuning Fb Reference line */}
          <line
            x1={getX(tuningFbHz)}
            y1={padTop}
            x2={getX(tuningFbHz)}
            y2={padTop + plotH}
            stroke="#fbbf24"
            strokeWidth="1.2"
            strokeDasharray="4,3"
          />
          <text x={getX(tuningFbHz)} y={padTop - 6} fill="#fbbf24" fontSize="9" textAnchor="middle" fontFamily="monospace">
            Fb {tuningFbHz}Hz
          </text>

          {/* Main Curve */}
          {activeTab === 'spl' && (
            <path d={getPathData(p => p.splDb)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" />
          )}

          {activeTab === 'impedance' && (
            <g>
              <path d={getPathData(p => p.impedanceMagOhm)} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinejoin="round" />
            </g>
          )}

          {activeTab === 'excursion' && (
            <path d={getPathData(p => p.excursionMm)} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinejoin="round" />
          )}

          {activeTab === 'velocity' && (
            <path d={getPathData(p => p.portAirVelocityMs)} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" />
          )}

          {activeTab === 'group_delay' && (
            <path d={getPathData(p => p.groupDelayMs)} fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinejoin="round" />
          )}
        </svg>

        {/* Legend / Axis Title */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400 px-2 mt-1 font-mono">
          <span>Oś X: Częstotliwość (Hz, skala log)</span>
          <span className="text-amber-400 font-semibold">{chartTitle}</span>
        </div>
      </div>
    </div>
  );
};
