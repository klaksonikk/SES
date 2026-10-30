import React, { useRef } from 'react';
import { 
  Volume2, 
  Download, 
  Upload, 
  FileCode, 
  HelpCircle, 
  Globe, 
  RotateCcw,
  Package,
  Layers
} from 'lucide-react';
import { ProjectData } from '../project/projectStorage';

interface HeaderProps {
  project: ProjectData;
  onUpdateProjectName: (name: string) => void;
  onResetProject: () => void;
  onExportJson: () => void;
  onImportJson: (json: string) => void;
  onOpenExportModal: () => void;
  onOpenDocsModal: () => void;
  onDownloadZip: () => void;
  isZipping?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  onUpdateProjectName,
  onResetProject,
  onExportJson,
  onImportJson,
  onOpenExportModal,
  onOpenDocsModal,
  onDownloadZip,
  isZipping = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onImportJson(content);
        }
      };
      reader.readAsText(file);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="h-14 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between px-4 select-none shrink-0 backdrop-blur z-20">
      {/* Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-amber-500 font-extrabold tracking-tight text-base">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Volume2 className="w-5 h-5" />
          </div>
          <span className="hidden sm:inline">SES</span>
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono hidden md:inline">
            v1.0 CAD/CNC
          </span>
        </div>

        <div className="h-5 w-px bg-neutral-800 mx-1 hidden sm:block" />

        <input
          type="text"
          value={project.name}
          onChange={(e) => onUpdateProjectName(e.target.value)}
          className="bg-transparent hover:bg-neutral-800/60 focus:bg-neutral-800 px-2 py-1 rounded text-sm font-medium text-neutral-200 border border-transparent focus:border-amber-500/50 outline-none w-48 sm:w-64 md:w-80 truncate"
          title="Kliknij, aby zmienić nazwę projektu"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        {/* Import JSON */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 transition flex items-center gap-1.5"
          title="Wczytaj projekt z pliku JSON"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Wgraj JSON</span>
        </button>

        {/* Export JSON */}
        <button
          onClick={onExportJson}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 transition flex items-center gap-1.5"
          title="Zapisz projekt do pliku JSON"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Zapisz JSON</span>
        </button>

        {/* Export Center (DXF, SVG, CSV, ZIP) */}
        <button
          onClick={onOpenExportModal}
          className="p-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 border border-amber-300 transition flex items-center gap-1.5 shadow-sm shadow-amber-500/10"
          title="Eksportuj pliki CAD, DXF, listę cięcia i dokumentację"
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Eksport & CNC</span>
        </button>

        {/* Download complete ZIP */}
        <button
          onClick={onDownloadZip}
          disabled={isZipping}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 transition flex items-center gap-1.5"
          title="Pobierz ZIP z danymi technicznymi głośnika i obudowy w formacie JSON"
        >
          <Package className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isZipping ? 'Pakowanie...' : 'Dane ZIP'}</span>
        </button>

        <div className="h-5 w-px bg-neutral-800 mx-1 hidden sm:block" />

        {/* Docs / Research Modal */}
        <button
          onClick={onOpenDocsModal}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-sky-400 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 transition flex items-center gap-1.5"
          title="Baza wiedzy inżynierskiej, wzory i porównania"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Baza wiedzy</span>
        </button>

        {/* Reset */}
        <button
          onClick={onResetProject}
          className="p-1.5 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition"
          title="Resetuj do szablonu domyślnego"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
