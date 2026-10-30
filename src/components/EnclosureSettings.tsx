import React from 'react';
import { EnclosureConfig, EnclosureType, JoineryStyle, MaterialType } from '../types/enclosure';
import { AlignmentPreset } from '../types/acoustic';
import { Box, Layers, Hammer, Sparkles, Sliders, Wind, Disc, SplitSquareVertical } from 'lucide-react';

interface EnclosureSettingsProps {
  enclosure: EnclosureConfig;
  alignmentPresets: AlignmentPreset[];
  onUpdateEnclosure: (updated: Partial<EnclosureConfig>) => void;
  onApplyAlignment: (preset: AlignmentPreset) => void;
}

export const EnclosureSettings: React.FC<EnclosureSettingsProps> = ({
  enclosure,
  alignmentPresets,
  onUpdateEnclosure,
  onApplyAlignment
}) => {
  const isBandpass = enclosure.type === 'bandpass_4th' || enclosure.type === 'bandpass_6th';
  const isTube = enclosure.type === 'bass_reflex_tube';

  const handleSelectEnclosureType = (type: EnclosureType) => {
    let updatedPort = { ...enclosure.port };
    if (type === 'bass_reflex_tube') {
      updatedPort.type = 'round';
      updatedPort.diameterMm = updatedPort.diameterMm || 100;
      updatedPort.tubeCount = updatedPort.tubeCount || 1;
    } else if (type === 'bass_reflex_slot' || type === 'bass_reflex') {
      updatedPort.type = 'slot_l_bend';
      updatedPort.slotWidthMm = updatedPort.slotWidthMm || 42;
    }
    onUpdateEnclosure({ type, port: updatedPort });
  };

  return (
    <div className="space-y-4">
      {/* Visual Enclosure Type Selector */}
      <div>
        <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
          Typ Konstrukcji Obudowy
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* 1. Sealed */}
          <button
            type="button"
            onClick={() => handleSelectEnclosureType('sealed')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              enclosure.type === 'sealed'
                ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <Box className={`w-4 h-4 ${enclosure.type === 'sealed' ? 'text-amber-400' : 'text-neutral-500'}`} />
              {enclosure.type === 'sealed' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
            </div>
            <span className="text-xs font-bold block">Zamknięta</span>
            <span className="text-[10px] text-neutral-400 block line-clamp-1">Kompaktowa, SQ</span>
          </button>

          {/* 2. Bass-Reflex Slot */}
          <button
            type="button"
            onClick={() => handleSelectEnclosureType('bass_reflex_slot')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              enclosure.type === 'bass_reflex_slot' || enclosure.type === 'bass_reflex'
                ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <Wind className={`w-4 h-4 ${enclosure.type === 'bass_reflex_slot' || enclosure.type === 'bass_reflex' ? 'text-amber-400' : 'text-neutral-500'}`} />
              {(enclosure.type === 'bass_reflex_slot' || enclosure.type === 'bass_reflex') && <span className="w-2 h-2 rounded-full bg-amber-400" />}
            </div>
            <span className="text-xs font-bold block">Szczelina (Slot)</span>
            <span className="text-[10px] text-neutral-400 block line-clamp-1">Duże pole, SPL</span>
          </button>

          {/* 3. Bass-Reflex Tube */}
          <button
            type="button"
            onClick={() => handleSelectEnclosureType('bass_reflex_tube')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              enclosure.type === 'bass_reflex_tube'
                ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <Disc className={`w-4 h-4 ${enclosure.type === 'bass_reflex_tube' ? 'text-amber-400' : 'text-neutral-500'}`} />
              {enclosure.type === 'bass_reflex_tube' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
            </div>
            <span className="text-xs font-bold block">Rura / Aeroport</span>
            <span className="text-[10px] text-neutral-400 block line-clamp-1">1x lub 2x rura</span>
          </button>

          {/* 4. Bandpass 4th */}
          <button
            type="button"
            onClick={() => handleSelectEnclosureType('bandpass_4th')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              enclosure.type === 'bandpass_4th'
                ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <SplitSquareVertical className={`w-4 h-4 ${enclosure.type === 'bandpass_4th' ? 'text-amber-400' : 'text-neutral-500'}`} />
              {enclosure.type === 'bandpass_4th' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
            </div>
            <span className="text-xs font-bold block">Bandpass 4th</span>
            <span className="text-[10px] text-neutral-400 block line-clamp-1">Tylna zamk. + port</span>
          </button>

          {/* 5. Bandpass 6th */}
          <button
            type="button"
            onClick={() => handleSelectEnclosureType('bandpass_6th')}
            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
              enclosure.type === 'bandpass_6th'
                ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <SplitSquareVertical className={`w-4 h-4 ${enclosure.type === 'bandpass_6th' ? 'text-amber-400' : 'text-neutral-500'}`} />
              {enclosure.type === 'bandpass_6th' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
            </div>
            <span className="text-xs font-bold block">Bandpass 6th</span>
            <span className="text-[10px] text-neutral-400 block line-clamp-1">Obie wentylowane</span>
          </button>
        </div>
      </div>

      {/* Bandpass Divider Controls (Shown only for Bandpass) */}
      {isBandpass && (
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">Podział Komór Bandpass</span>
            <span className="text-[11px] font-mono text-neutral-400">
              Przednia {Math.round((enclosure.bandpass?.frontChamberRatio ?? 0.4) * 100)}% / Tylna {Math.round((1 - (enclosure.bandpass?.frontChamberRatio ?? 0.4)) * 100)}%
            </span>
          </div>

          <div>
            <input
              type="range"
              min="0.25"
              max="0.65"
              step="0.05"
              value={enclosure.bandpass?.frontChamberRatio ?? 0.4}
              onChange={(e) => onUpdateEnclosure({
                bandpass: {
                  ...enclosure.bandpass,
                  frontChamberRatio: Number(e.target.value)
                }
              })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
              <span>Większa komora tylna (Głębszy bas)</span>
              <span>Większa komora przednia (Wyższa efektywność)</span>
            </div>
          </div>

          {enclosure.type === 'bandpass_6th' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80 text-xs font-mono">
              <div>
                <span className="text-[10px] text-neutral-400 block mb-0.5">Strojenie komory tylnej [Hz]</span>
                <input
                  type="number"
                  min="20"
                  max="60"
                  value={enclosure.bandpass?.rearFbHz ?? 30}
                  onChange={(e) => onUpdateEnclosure({
                    bandpass: {
                      ...enclosure.bandpass,
                      frontChamberRatio: enclosure.bandpass?.frontChamberRatio ?? 0.40,
                      rearFbHz: Number(e.target.value)
                    }
                  })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-amber-400 font-bold"
                />
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 block mb-0.5">Port tylny średnica [mm]</span>
                <input
                  type="number"
                  min="50"
                  max="160"
                  value={enclosure.bandpass?.rearPortDiameterMm ?? 100}
                  onChange={(e) => onUpdateEnclosure({
                    bandpass: {
                      ...enclosure.bandpass,
                      frontChamberRatio: enclosure.bandpass?.frontChamberRatio ?? 0.40,
                      rearPortDiameterMm: Number(e.target.value)
                    }
                  })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tube Port Specific Controls (When Tube is chosen) */}
      {isTube && (
        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
          <span className="text-xs font-bold text-amber-400 block">Konfiguracja Portu Tubowego / Rury</span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-[10px] text-neutral-400 block mb-1">Liczba Rur</span>
              <select
                value={enclosure.port.tubeCount || 1}
                onChange={(e) => onUpdateEnclosure({
                  port: { ...enclosure.port, tubeCount: Number(e.target.value) as 1 | 2 }
                })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
              >
                <option value="1">1x Pojedyncza Rura</option>
                <option value="2">2x Podwójna Rura</option>
              </select>
            </div>

            <div>
              <span className="text-[10px] text-neutral-400 block mb-1">Średnica Rury</span>
              <select
                value={enclosure.port.diameterMm}
                onChange={(e) => onUpdateEnclosure({
                  port: { ...enclosure.port, diameterMm: Number(e.target.value) }
                })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-100"
              >
                <option value="75">⌀75 mm (3")</option>
                <option value="100">⌀100 mm (4")</option>
                <option value="125">⌀125 mm (5")</option>
                <option value="150">⌀150 mm (6")</option>
                <option value="200">⌀200 mm (8")</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="flareCheckbox"
              checked={enclosure.port.hasFlare}
              onChange={(e) => onUpdateEnclosure({
                port: { ...enclosure.port, hasFlare: e.target.checked }
              })}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
            <label htmlFor="flareCheckbox" className="text-xs text-neutral-300 cursor-pointer">
              Aeroport z zaokrągloną flarą (zmniejsza turbulencje i świst)
            </label>
          </div>
        </div>
      )}

      {/* Joinery Style */}
      <div>
        <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
          Połączenia Płyt (Joinery)
        </label>
        <select
          value={enclosure.joinery}
          onChange={(e) => onUpdateEnclosure({ joinery: e.target.value as JoineryStyle })}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-amber-500 font-medium"
        >
          <option value="standard_top_bottom_overlay">Góra/Dół Pełne Nakrycie (Sekcja 8)</option>
          <option value="sides_overlay">Boki Obejmujące (Sides Overlay)</option>
          <option value="flush_front_inset">Front Wpuszczany (Flush Inset)</option>
        </select>
      </div>

      {/* Outer Dimensions [mm] */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Wymiary Zewnętrzne [mm]
          </label>
          <span className="text-[10px] text-amber-500/90 font-mono">
            {((enclosure.outerWidthMm * enclosure.outerHeightMm * enclosure.outerDepthMm) / 1e6).toFixed(1)} L brutto
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 font-mono text-xs">
          <div>
            <span className="text-[10px] text-neutral-500 block mb-0.5">Szerokość (W)</span>
            <input
              type="number"
              min="200"
              max="1400"
              step="5"
              value={enclosure.outerWidthMm}
              onChange={(e) => onUpdateEnclosure({ outerWidthMm: Math.max(150, Number(e.target.value)) })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-neutral-100 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <span className="text-[10px] text-neutral-500 block mb-0.5">Wysokość (H)</span>
            <input
              type="number"
              min="200"
              max="1400"
              step="5"
              value={enclosure.outerHeightMm}
              onChange={(e) => onUpdateEnclosure({ outerHeightMm: Math.max(150, Number(e.target.value)) })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-neutral-100 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <span className="text-[10px] text-neutral-500 block mb-0.5">Głębokość (D)</span>
            <input
              type="number"
              min="200"
              max="1400"
              step="5"
              value={enclosure.outerDepthMm}
              onChange={(e) => onUpdateEnclosure({ outerDepthMm: Math.max(150, Number(e.target.value)) })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-neutral-100 focus:border-amber-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Material & Thickness */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Materiał
          </label>
          <select
            value={enclosure.material}
            onChange={(e) => onUpdateEnclosure({ material: e.target.value as MaterialType })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-amber-500"
          >
            <option value="mdf">MDF Surowy (750 kg/m³)</option>
            <option value="baltic_birch">Sklejka Bałtycka (680 kg/m³)</option>
            <option value="plywood">Sklejka Iglasta (550 kg/m³)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Grubość Płyty
          </label>
          <select
            value={enclosure.panelThicknessMm}
            onChange={(e) => onUpdateEnclosure({ panelThicknessMm: Number(e.target.value) })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-amber-500 font-mono"
          >
            <option value="16">16 mm</option>
            <option value="18">18 mm</option>
            <option value="19">19 mm (3/4")</option>
            <option value="22">22 mm</option>
            <option value="25">25 mm (1")</option>
          </select>
        </div>
      </div>

      {/* Double Baffle (Not needed in Bandpass since driver is internal) */}
      {!isBandpass && (
        <div className="p-2.5 rounded-lg bg-neutral-800/40 border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="doubleBaffleCheckbox"
              checked={enclosure.hasDoubleBaffle}
              onChange={(e) => onUpdateEnclosure({ hasDoubleBaffle: e.target.checked })}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
            <label htmlFor="doubleBaffleCheckbox" className="text-xs text-neutral-200 cursor-pointer">
              Podwójny front (Double Baffle)
              <span className="block text-[10px] text-neutral-400">Podfrezowanie pod kołnierz głośnika bez osłabiania ścianki</span>
            </label>
          </div>

          {enclosure.hasDoubleBaffle && (
            <span className="text-[11px] font-mono text-amber-400 font-semibold">
              +{enclosure.doubleBaffleThicknessMm} mm
            </span>
          )}
        </div>
      )}

      {/* Alignment Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Zestrojenia Akustyczne (Chebyshev / Butterworth / Bessel)</span>
          </label>
        </div>

        <p className="text-[11px] text-neutral-400 mb-2.5">
          Wybierz model zestrojenia, aby automatycznie przeliczyć optymalną objętość Vb i strojenie portu:
        </p>

        <div className="space-y-2">
          {alignmentPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onApplyAlignment(preset)}
              className="w-full p-2.5 rounded-xl bg-neutral-950/80 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/50 transition text-left flex items-center justify-between group shadow-sm"
            >
              <div className="flex-1 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-neutral-200 group-hover:text-amber-400 transition">
                    {preset.name}
                  </span>
                  {preset.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {preset.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-neutral-400 block leading-tight">
                  {preset.descriptionPl}
                </span>
              </div>
              <div className="text-right shrink-0 font-mono text-xs pl-2 border-l border-neutral-800/80">
                <span className="text-amber-400 font-bold block">{preset.recommendedVbLiters}L</span>
                <span className="text-neutral-500 text-[10px] block">@{preset.recommendedFbHz}Hz</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
