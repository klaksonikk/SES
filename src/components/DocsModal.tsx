import React from 'react';
import { X, BookOpen, Layers, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-100">Baza Wiedzy & Modele Fizyczne</h2>
              <p className="text-xs text-neutral-400">Podstawy inżynierskie, wzory elektroakustyczne i reguły stolarskie</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-neutral-300 text-xs leading-relaxed">
          {/* 1. Physics Equations */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span>1. Modele Matematyczne i Równania Akustyczne</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] space-y-2">
                <span className="text-amber-300 font-bold block">Rezonator Helmholtza & Długość Efektywna:</span>
                <p className="text-neutral-400 font-sans">
                  Strojenie portu rezonansowego wynika ze sprzężenia masy powietrza w tunelu z podatnością komory:
                </p>
                <div className="p-2 rounded bg-neutral-900 border border-neutral-800 text-amber-400 font-bold">
                  Fb = (c / 2π) · √( Sp / (Vb · L_eff) )
                </div>
                <p className="text-neutral-400 font-sans text-[10px]">
                  gdzie: c = 343.2 m/s, Sp = pole przekroju [m²], Vb = objętość netto [m³], L_eff = L_phys + Δl.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] space-y-2">
                <span className="text-amber-300 font-bold block">Korekcja Końcowa Portów Szczelinowych (Δl):</span>
                <p className="text-neutral-400 font-sans">
                  Zgodnie z badaniami Salvatti/Devantier (AES) oraz Vance Dickason (LDK), port przylegający do 3 ścian obudowy posiada zwiększoną masę akustyczną:
                </p>
                <div className="p-2 rounded bg-neutral-900 border border-neutral-800 text-sky-400 font-bold">
                  Δl_slot ≈ 0.85 · √Sp (do 1.05·√Sp dla L-bend)
                </div>
                <p className="text-neutral-400 font-sans text-[10px]">
                  Zastosowanie klasycznego wzoru rury wolnej (0.732·d) spowodowałoby błąd strojenia o 3-6 Hz w dół.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] space-y-2">
                <span className="text-amber-300 font-bold block">Minimalne Pole Przekroju (Próg Chuffingu):</span>
                <p className="text-neutral-400 font-sans">
                  Kryterium D.B. Keele / Richard Small zapobiegające powstawaniu słyszalnych świstów powietrza:
                </p>
                <div className="p-2 rounded bg-neutral-900 border border-neutral-800 text-emerald-400 font-bold">
                  Sp_min ≥ 0.6 · Fb · (Sd · Xmax)
                </div>
                <p className="text-neutral-400 font-sans text-[10px]">
                  Prędkość powietrza v_port &gt; 17 m/s powoduje słyszalne turbulencje na krawędziach.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] space-y-2">
                <span className="text-amber-300 font-bold block">Obudowa Zamknięta (Sealed Box):</span>
                <p className="text-neutral-400 font-sans">
                  Podbicie dobroci i częstotliwości rezonansowej w zamkniętej przestrzeni:
                </p>
                <div className="p-2 rounded bg-neutral-900 border border-neutral-800 text-purple-400 font-bold">
                  Fc = Fs · √(1 + Vas/Vb)  |  Qtc = Qts · √(1 + Vas/Vb)
                </div>
                <p className="text-neutral-400 font-sans text-[10px]">
                  Współczynnik dobroci Qtc = 0.707 zapewnia maksymalnie płaską charakterystykę bez podbicia na basie.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Joinery Section 8 */}
          <section className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              2. Reguła Połączeń Stolarskich (Sekcja 8)
            </h3>
            <p className="text-neutral-300">
              Dla standardowej obudowy prostopadłościennej z pełnymi płytami górną i dolną:
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-400 font-mono text-[11px]">
              <li><strong>Góra i Dół:</strong> W_ext × D_ext (największe płyty, pełne nakrycie)</li>
              <li><strong>Przód i Tył:</strong> W_ext × (H_ext - 2·t)</li>
              <li><strong>Boki lewy i prawy:</strong> (D_ext - 2·t) × H_int</li>
              <li><strong>Podwójny front:</strong> zewnętrzna płyta usztywniająca z podfrezowaniem pod kołnierz głośnika</li>
            </ul>
          </section>

          {/* 4. Bibliography */}
          <section className="space-y-1.5 border-t border-neutral-800 pt-4 text-[11px] text-neutral-400">
            <span className="font-bold text-neutral-200 block">Bibliografia Naukowa:</span>
            <p>1. A.N. Thiele, <em>Loudspeakers in Vented Boxes: Part I & II</em>, JAES, 1971.</p>
            <p>2. Richard H. Small, <em>Direct-Radiator Loudspeaker System Analysis</em>, JAES, 1972/1973.</p>
            <p>3. D.B. Keele, Jr., <em>Sensitivity of Vented-Box Loudspeaker Systems to Parameter Variations</em>, AES Preprint, 1973.</p>
            <p>4. Vance Dickason, <em>The Loudspeaker Design Cookbook</em>, 7th & 8th Edition, Audio Amateur Press.</p>
            <p>5. A. Salvatti, D. Button, A. Devantier, <em>Maximizing Performance from Loudspeaker Ports</em>, AES Convention Paper 5585.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
