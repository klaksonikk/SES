import { CutListItem } from '../types/cad';

/**
 * Eksportuje listę elementów do formatu CSV zgodnego z oprogramowaniem do optymalizacji rozkroju płyt
 * (CutList Plus, MaxCut, OptiCut, SketchUp CutList).
 */
export function generateCutListCsv(cutList: CutListItem[], projectTitle: string): string {
  const headers = ['Nazwa Elementu', 'Długość [mm]', 'Szerokość [mm]', 'Grubość [mm]', 'Ilość [szt]', 'Materiał', 'Uwagi'];
  
  const rows = cutList.map(item => [
    `"${item.panelName.replace(/"/g, '""')}"`,
    item.lengthMm,
    item.widthMm,
    item.thicknessMm,
    item.quantity,
    `"${item.material.replace(/"/g, '""')}"`,
    `"${item.notes.replace(/"/g, '""')}"`
  ]);

  return [
    `# Projekt: ${projectTitle}`,
    `# Data wygenerowania: ${new Date().toISOString().split('T')[0]}`,
    headers.join(';'),
    ...rows.map(r => r.join(';'))
  ].join('\r\n');
}
