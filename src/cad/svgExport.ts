import { Panel3D } from '../types/cad';

/**
 * Generuje wektorowy rysunek techniczny SVG w konwencji rysunku maszynowego/stolarskiego.
 * Zawiera linie wymiarowe, osie symetrii, opisy otworów i tabliczkę rysunkową.
 */
export function generatePanelSvg(
  panel: Panel3D,
  projectTitle: string = 'Subwoofer Engineering Studio'
): string {
  const w = panel.widthMm;
  const h = panel.heightMm;
  const margin = 70;
  const viewWidth = w + margin * 2;
  const viewHeight = h + margin * 2 + 60; // ekstra miejsce na tabliczkę

  const originX = margin;
  const originY = margin + 30;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}" width="100%" height="100%" style="background:#0f1115; font-family:'JetBrains Mono', monospace;">
  <defs>
    <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1c212b" stroke-width="0.5"/>
    </pattern>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b"/>
    </marker>
  </defs>

  <!-- Siatka tła -->
  <rect width="100%" height="100%" fill="url(#cadGrid)"/>

  <!-- Tło arkusza płyty -->
  <g transform="translate(${originX}, ${originY})">
    <!-- Płyta materiału -->
    <rect x="0" y="0" width="${w}" height="${h}" fill="#1c1917" stroke="#fbbf24" stroke-width="2"/>

    <!-- Osie symetrii -->
    <line x1="${w / 2}" y1="-15" x2="${w / 2}" y2="${h + 15}" stroke="#52525b" stroke-width="1" stroke-dasharray="8,4,2,4"/>
    <line x1="-15" y1="${h / 2}" x2="${w + 15}" y2="${h / 2}" stroke="#52525b" stroke-width="1" stroke-dasharray="8,4,2,4"/>

    <!-- Wycięcia / Cutouts -->
    ${panel.cutouts.map(cutout => {
      const cx = w / 2 + cutout.xMm;
      const cy = h / 2 - cutout.yMm; // odwrócenie osi Y dla grafiki wektorowej
      const isRebate = cutout.type === 'driver_rebate';
      const isRect = Boolean(cutout.widthMm && cutout.heightMm && !cutout.diameterMm);

      if (isRect) {
        const rw = cutout.widthMm!;
        const rh = cutout.heightMm!;
        return `
        <!-- Wycięcie prostokątne: ${cutout.id} -->
        <rect x="${cx - rw / 2}" y="${cy - rh / 2}" width="${rw}" height="${rh}" fill="#0c0a09" stroke="#38bdf8" stroke-width="2"/>
        <text x="${cx}" y="${cy - rh / 2 - 6}" fill="#38bdf8" font-size="10" text-anchor="middle">
          SZCZELINA ${rw}×${rh} mm
        </text>`;
      }

      const dia = cutout.diameterMm || 100;
      const r = dia / 2;
      return `
      <!-- Otwór: ${cutout.id} -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${isRebate ? '#451a03' : '#0c0a09'}" stroke="${isRebate ? '#f97316' : '#38bdf8'}" stroke-width="${isRebate ? '1.5' : '2'}" stroke-dasharray="${isRebate ? '4,2' : 'none'}"/>
      <!-- Krzyżak środka -->
      <line x1="${cx - 10}" y1="${cy}" x2="${cx + 10}" y2="${cy}" stroke="#a1a1aa" stroke-width="1"/>
      <line x1="${cx}" y1="${cy - 10}" x2="${cx}" y2="${cy + 10}" stroke="#a1a1aa" stroke-width="1"/>
      <!-- Etykieta otworu -->
      <text x="${cx}" y="${cy - r - 6}" fill="${isRebate ? '#fb923c' : '#38bdf8'}" font-size="10" text-anchor="middle">
        ⌀${dia} mm ${isRebate ? `(Gł. ${cutout.depthMm || 12}mm)` : 'PRZELOT'}
      </text>`;
    }).join('\n')}

    <!-- Wymiar poziomy (Szerokość) -->
    <line x1="0" y1="${h + 25}" x2="${w}" y2="${h + 25}" stroke="#f59e0b" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
    <line x1="0" y1="${h + 5}" x2="0" y2="${h + 35}" stroke="#71717a" stroke-width="1"/>
    <line x1="${w}" y1="${h + 5}" x2="${w}" y2="${h + 35}" stroke="#71717a" stroke-width="1"/>
    <text x="${w / 2}" y="${h + 42}" fill="#fbbf24" font-size="12" font-weight="bold" text-anchor="middle">
      ${w} mm
    </text>

    <!-- Wymiar pionowy (Wysokość) -->
    <line x1="${-25}" y1="0" x2="${-25}" y2="${h}" stroke="#f59e0b" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
    <line x1="${-35}" y1="0" x2="${-5}" y2="0" stroke="#71717a" stroke-width="1"/>
    <line x1="${-35}" y1="${h}" x2="${-5}" y2="${h}" stroke="#71717a" stroke-width="1"/>
    <text x="${-40}" y="${h / 2}" fill="#fbbf24" font-size="12" font-weight="bold" text-anchor="middle" transform="rotate(-90, ${-40}, ${h / 2})">
      ${h} mm
    </text>
  </g>

  <!-- Tabliczka rysunkowa -->
  <g transform="translate(${originX}, ${viewHeight - 55})">
    <rect x="0" y="0" width="${w}" height="45" fill="#18181b" stroke="#3f3f46" stroke-width="1"/>
    <text x="15" y="18" fill="#f43f5e" font-size="11" font-weight="bold">${projectTitle.toUpperCase()}</text>
    <text x="15" y="34" fill="#a1a1aa" font-size="10">ELEMENT: <tspan fill="#fafafa" font-weight="bold">${panel.namePl.toUpperCase()}</tspan> | GRUBOŚĆ: <tspan fill="#fbbf24">${panel.thicknessMm} mm</tspan></text>
    <text x="${w - 15}" y="26" fill="#71717a" font-size="10" text-anchor="end">JEDNOSTKA: mm | TOLERANCJA: ±0.5 mm</text>
  </g>
</svg>`;

  return svg;
}
