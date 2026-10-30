import { Panel3D } from '../types/cad';

/**
 * Generuje czysty plik AutoCAD DXF (format ASCII R12 / AC1009)
 * Kompatybilny ze wszystkimi obrabiarkami CNC, frezarkami i programami CAM (VCarve, Fusion 360, Aspire, SheetCAM).
 */
export function generatePanelDxf(panel: Panel3D, projectTitle: string = 'Subwoofer_Project'): string {
  const w = panel.widthMm;
  const h = panel.heightMm;

  let dxf = '';

  // Nagłówek DXF
  dxf += '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n';

  // Warstwy (LAYERS)
  dxf += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n3\n';
  // Warstwa 1: KONTUR_ZEWNETRZNY (Biały/Czerwony)
  dxf += '0\nLAYER\n2\nKONTUR_ZEWNETRZNY\n70\n0\n62\n1\n6\nCONTINUOUS\n';
  // Warstwa 2: WYCIECIE_PRZELOTOWE (Żółty)
  dxf += '0\nLAYER\n2\nWYCIECIE_PRZELOTOWE\n70\n0\n62\n2\n6\nCONTINUOUS\n';
  // Warstwa 3: FREZOWANIE_KIESZEN (Cyjan)
  dxf += '0\nLAYER\n2\nFREZOWANIE_KIESZEN\n70\n0\n62\n4\n6\nCONTINUOUS\n';
  dxf += '0\nENDTAB\n0\nENDSEC\n';

  // Sekcja ENCJI (ENTITIES)
  dxf += '0\nSECTION\n2\nENTITIES\n';

  // 1. Zewnętrzny prostokąt płyty (KONTUR_ZEWNETRZNY) od (0,0) do (w, h)
  const drawLine = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    return `0\nLINE\n8\n${layer}\n10\n${x1.toFixed(3)}\n20\n${y1.toFixed(3)}\n30\n0.0\n11\n${x2.toFixed(3)}\n21\n${y2.toFixed(3)}\n31\n0.0\n`;
  };

  dxf += drawLine(0, 0, w, 0, 'KONTUR_ZEWNETRZNY');
  dxf += drawLine(w, 0, w, h, 'KONTUR_ZEWNETRZNY');
  dxf += drawLine(w, h, 0, h, 'KONTUR_ZEWNETRZNY');
  dxf += drawLine(0, h, 0, 0, 'KONTUR_ZEWNETRZNY');

  // 2. Otwory i wycięcia (koła / okręgi)
  const centerX = w / 2;
  const centerY = h / 2;

  panel.cutouts.forEach(cutout => {
    const cx = centerX + cutout.xMm;
    const cy = centerY + cutout.yMm;
    const layer = cutout.type === 'driver_rebate' ? 'FREZOWANIE_KIESZEN' : 'WYCIECIE_PRZELOTOWE';
    if (cutout.widthMm && cutout.heightMm) {
      const x0 = cx - cutout.widthMm / 2;
      const y0 = cy - cutout.heightMm / 2;
      const x1 = cx + cutout.widthMm / 2;
      const y1 = cy + cutout.heightMm / 2;
      dxf += drawLine(x0, y0, x1, y0, layer);
      dxf += drawLine(x1, y0, x1, y1, layer);
      dxf += drawLine(x1, y1, x0, y1, layer);
      dxf += drawLine(x0, y1, x0, y0, layer);
    } else if (cutout.diameterMm) {
      const radius = cutout.diameterMm / 2;
      dxf += `0\nCIRCLE\n8\n${layer}\n10\n${cx.toFixed(3)}\n20\n${cy.toFixed(3)}\n30\n0.0\n40\n${radius.toFixed(3)}\n`;
    }
  });

  // Koniec sekcji
  dxf += '0\nENDSEC\n0\nEOF\n';

  return dxf;
}

/**
 * Generuje zbiorczy plik DXF z rozłożonymi płytami (Nesting sheet)
 */
export function generateFullNestingDxf(panels: Panel3D[]): string {
  let dxf = '';
  dxf += '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n';
  dxf += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n3\n';
  dxf += '0\nLAYER\n2\nKONTUR_CIECIA\n70\n0\n62\n1\n6\nCONTINUOUS\n';
  dxf += '0\nLAYER\n2\nOTWORY\n70\n0\n62\n2\n6\nCONTINUOUS\n';
  dxf += '0\nLAYER\n2\nOPISY\n70\n0\n62\n7\n6\nCONTINUOUS\n';
  dxf += '0\nENDTAB\n0\nENDSEC\n';
  dxf += '0\nSECTION\n2\nENTITIES\n';

  let currentX = 0;
  const spacing = 30; // 30 mm odstępu między płytami na arkuszu

  panels.forEach(p => {
    const w = p.widthMm;
    const h = p.heightMm;

    // Linie konturu
    const x0 = currentX;
    const y0 = 0;
    const x1 = currentX + w;
    const y1 = h;

    const drawLine = (xa: number, ya: number, xb: number, yb: number) => {
      return `0\nLINE\n8\nKONTUR_CIECIA\n10\n${xa.toFixed(3)}\n20\n${ya.toFixed(3)}\n30\n0.0\n11\n${xb.toFixed(3)}\n21\n${yb.toFixed(3)}\n31\n0.0\n`;
    };

    dxf += drawLine(x0, y0, x1, y0);
    dxf += drawLine(x1, y0, x1, y1);
    dxf += drawLine(x1, y1, x0, y1);
    dxf += drawLine(x0, y1, x0, y0);

    // Otwory
    p.cutouts.forEach(c => {
      const cx = x0 + w / 2 + c.xMm;
      const cy = y0 + h / 2 + c.yMm;
      if (c.widthMm && c.heightMm) {
        const left = cx - c.widthMm / 2;
        const right = cx + c.widthMm / 2;
        const bottom = cy - c.heightMm / 2;
        const top = cy + c.heightMm / 2;
        dxf += drawLine(left, bottom, right, bottom);
        dxf += drawLine(right, bottom, right, top);
        dxf += drawLine(right, top, left, top);
        dxf += drawLine(left, top, left, bottom);
      } else if (c.diameterMm) {
        const r = c.diameterMm / 2;
        dxf += `0\nCIRCLE\n8\nOTWORY\n10\n${cx.toFixed(3)}\n20\n${cy.toFixed(3)}\n30\n0.0\n40\n${r.toFixed(3)}\n`;
      }
    });

    // Tekst z nazwą płyty
    dxf += `0\nTEXT\n8\nOPISY\n10\n${(x0 + 10).toFixed(3)}\n20\n${(y0 + 15).toFixed(3)}\n30\n0.0\n40\n12.0\n1\n${p.namePl} (${w}x${h}x${p.thicknessMm}mm)\n`;

    currentX += w + spacing;
  });

  dxf += '0\nENDSEC\n0\nEOF\n';
  return dxf;
}
