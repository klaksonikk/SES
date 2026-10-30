import React, { useState } from 'react';
import { Panel3D } from '../types/cad';
import { generatePanelSvg } from '../cad/svgExport';
import { generatePanelDxf } from '../cad/dxfExport';
import { Download, Compass, FileText, CheckCircle2 } from 'lucide-react';

interface WorkshopBlueprintProps {
  panels: Panel3D[];
  projectName: string;
}

export const WorkshopBlueprint: React.FC<WorkshopBlueprintProps> = ({
  panels,
  projectName
}) => {
  const [selectedPanelId, setSelectedPanelId] = useState<string>(
    panels.find(p => p.id === 'panel_front')?.id || panels[0]?.id || ''
  );

  const selectedPanel = panels.find(p => p.id === selectedPanelId) || panels[0];

  const handleDownloadSvg = () => {
    if (!selectedPanel) return;
    const svgContent = generatePanelSvg(selectedPanel, projectName);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_${selectedPanel.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDxf = () => {
    if (!selectedPanel) return;
    const dxfContent = generatePanelDxf(selectedPanel, projectName);
    const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_${selectedPanel.id}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedPanel) return null;

  const svgPreview = generatePanelSvg(selectedPanel, projectName);

  return (
    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-neutral-200">
            Rysunki Warsztatowe 2D (CNC)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Download DXF */}
          <button
            onClick={handleDownloadDxf}
            className="px-2.5 py-1 rounded-md text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/50 transition flex items-center gap-1"
            title="Pobierz plik AutoCAD DXF dla tego panelu"
          >
            <Download className="w-3 h-3" />
            <span>Pobierz DXF</span>
          </button>

          {/* Download SVG */}
          <button
            onClick={handleDownloadSvg}
            className="px-2.5 py-1 rounded-md text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition flex items-center gap-1"
            title="Pobierz rysunek SVG do wydruku"
          >
            <Download className="w-3 h-3" />
            <span>SVG</span>
          </button>
        </div>
      </div>

      {/* Panel Selector row */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-neutral-400 font-medium shrink-0">Wybierz formatkę:</span>
        <select
          value={selectedPanelId}
          onChange={(e) => setSelectedPanelId(e.target.value)}
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-2.5 py-1 text-xs text-neutral-200 outline-none focus:border-amber-500 font-medium"
        >
          {panels.map(p => (
            <option key={p.id} value={p.id}>
              {p.namePl} ({p.widthMm} × {p.heightMm} × {p.thicknessMm} mm)
            </option>
          ))}
        </select>
      </div>

      {/* SVG Canvas Preview */}
      <div
        className="w-full bg-[#0a0c10] border border-neutral-800/80 rounded-lg p-2 overflow-hidden flex items-center justify-center min-h-[220px]"
        dangerouslySetInnerHTML={{ __html: svgPreview }}
      />

      {/* Panel Cutouts & Offsets Details */}
      {selectedPanel.cutouts.length > 0 && (
        <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/70 text-xs font-mono">
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block mb-1">
            Współrzędne otworów (Względem środka płyty [0,0]):
          </span>
          <div className="space-y-1">
            {selectedPanel.cutouts.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-neutral-300">
                <span>{c.type === 'driver_rebate' ? 'Podfrezowanie kołnierza' : 'Wycięcie przelotowe'}:</span>
                <span className="text-amber-400 font-bold">
                  ⌀{c.diameterMm} mm @ X={c.xMm >= 0 ? `+${c.xMm}` : c.xMm} mm, Y={c.yMm >= 0 ? `+${c.yMm}` : c.yMm} mm
                  {c.depthMm ? ` (Głębokość frezu: ${c.depthMm}mm)` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
