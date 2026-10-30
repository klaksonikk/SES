import React from 'react';
import { CutListItem } from '../types/cad';
import { generateCutListCsv } from '../cad/csvExport';
import { Download, FileSpreadsheet, Scissors } from 'lucide-react';

interface CutListViewProps {
  cutList: CutListItem[];
  projectName: string;
  totalWoodWeightKg: number;
}

export const CutListView: React.FC<CutListViewProps> = ({
  cutList,
  projectName,
  totalWoodWeightKg
}) => {
  // Calculate total area in m^2
  const totalAreaM2 = cutList.reduce((acc, item) => {
    return acc + (item.widthMm * 1e-3) * (item.lengthMm * 1e-3) * item.quantity;
  }, 0);

  const handleDownloadCsv = () => {
    const csvContent = generateCutListCsv(cutList, projectName);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_lista_ciecia.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-neutral-200">
            Lista Cięcia i Formatki Stolarskie (Cut List)
          </span>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="px-2.5 py-1 rounded-md text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 transition flex items-center gap-1.5"
          title="Pobierz plik CSV dla programów rozkroju płyt (CutList Plus, MaxCut)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Eksport CSV</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 uppercase text-[10px]">
            <tr>
              <th className="py-2 px-3">Element</th>
              <th className="py-2 px-3 text-right">Długość</th>
              <th className="py-2 px-3 text-right">Szerokość</th>
              <th className="py-2 px-3 text-right">Grubość</th>
              <th className="py-2 px-3 text-center">Ilość</th>
              <th className="py-2 px-3">Materiał</th>
              <th className="py-2 px-3">Uwagi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 text-neutral-200">
            {cutList.map((item, idx) => (
              <tr key={idx} className="hover:bg-neutral-800/30 transition">
                <td className="py-2 px-3 font-semibold text-neutral-100">{item.panelName}</td>
                <td className="py-2 px-3 text-right text-amber-400 font-bold">{item.lengthMm} mm</td>
                <td className="py-2 px-3 text-right text-amber-400 font-bold">{item.widthMm} mm</td>
                <td className="py-2 px-3 text-right text-neutral-400">{item.thicknessMm} mm</td>
                <td className="py-2 px-3 text-center font-bold text-white bg-neutral-800/40">{item.quantity} szt</td>
                <td className="py-2 px-3 text-neutral-300">{item.material}</td>
                <td className="py-2 px-3 text-[11px] text-neutral-400">{item.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Material Summary */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-neutral-400 pt-1">
        <span>Łączna powierzchnia formatek: <strong className="text-neutral-200">{totalAreaM2.toFixed(2)} m²</strong></span>
        <span>Szacowana masa płyty: <strong className="text-amber-400">{totalWoodWeightKg} kg</strong></span>
      </div>
    </div>
  );
};
