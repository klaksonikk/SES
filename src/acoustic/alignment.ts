import { DriverModel } from '../types/driver';
import { AlignmentPreset } from '../types/acoustic';

/**
 * Oblicza klasyczne zestrojenia obudów wg A.N. Thiele & Richard H. Small:
 * - Chebyshev C4 (Maksymalna efektywność, wyrazisty punch SPL, ripple ~1.5 dB)
 * - QB3: Quasi-Butterworth 3rd order (najbardziej liniowa faza i minimalne opóźnienie grupowe)
 * - B4: Butterworth 4th order (maksymalnie płaska charakterystyka)
 * - SC4: Sub-Chebyshev 4th order (głębokie strojenie pod kątem ochrony przed wychyleniem)
 * - EBS: Extended Bass Shelf (bardzo niska f3, optymalne pod room-gain)
 * - Zamknięta: Butterworth Qtc = 0.707 (krytycznie tłumiona, optymalne zebranie)
 * - Zamknięta: Bessel Qtc = 0.577 (audiofilska, wzorcowa odpowiedź impulsowa)
 * - Zamknięta: Chebyshev Qtc = 0.95 (kompaktowa skrzynia z podbitym wyższym basem)
 */
export function calculateAlignmentPresets(driver: DriverModel): AlignmentPreset[] {
  const { fs, qts, vas } = driver.ts;
  const presets: AlignmentPreset[] = [];

  // ==================== BASS-REFLEX ALIGNMENTS ====================

  // 1. Chebyshev C4 (Maksymalna efektywność SPL / Punch)
  // Wzory Thiele'a-Smalla dla 4. rzędu Czebyszewa z tętnieniem (ripple ~1.2-1.5 dB):
  const vbC4 = 26 * vas * Math.pow(qts, 3.1);
  const fbC4 = 0.55 * fs * Math.pow(qts, -0.85);
  presets.push({
    name: 'Chebyshev C4 (Maksymalny Punch / SPL)',
    descriptionPl: 'Wyższa efektywność w paśmie 35-50 Hz z lekkim podbiciem (+1.5 dB). Idealne do mocnego kina i car audio SPL.',
    recommendedVbLiters: Number(Math.max(6, vbC4).toFixed(1)),
    recommendedFbHz: Number(Math.max(22, fbC4).toFixed(1)),
    type: 'C4',
    category: 'bass_reflex',
    badge: 'Mocny Bas / SPL'
  });

  // 2. Quasi-Butterworth QB3 (SQ / Szybki bas)
  // Vb = 15 * Vas * Qts^3.3, Fb = 0.42 * Fs * Qts^-0.96
  const vbQb3 = 15 * vas * Math.pow(qts, 3.3);
  const fbQb3 = 0.42 * fs * Math.pow(qts, -0.96);
  presets.push({
    name: 'Quasi-Butterworth QB3 (Szybki Bas / SQ)',
    descriptionPl: 'Kompaktowa objętość, doskonałe opóźnienie grupowe, precyzyjny bas do muzyki akustycznej i rocka.',
    recommendedVbLiters: Number(Math.max(5, vbQb3).toFixed(1)),
    recommendedFbHz: Number(Math.max(18, fbQb3).toFixed(1)),
    type: 'QB3',
    category: 'bass_reflex',
    badge: 'Precyzja SQ'
  });

  // 3. Butterworth B4 (Wzorcowa Płaska Studyjna)
  // Standardowe kryterium maksymalnie płaskiej charakterystyki: Vb = 20 * Vas * Qts^3.3
  const vbB4 = 20 * vas * Math.pow(qts, 3.3);
  const fbB4 = fs * Math.pow(vas / Math.max(1, vbB4), 0.32);
  presets.push({
    name: 'Butterworth B4 (Referencyjna Płaska)',
    descriptionPl: 'Maksymalnie płaskie pasmo przenoszenia bez podbić w całym zakresie roboczym, standard studyjny.',
    recommendedVbLiters: Number(Math.max(8, vbB4).toFixed(1)),
    recommendedFbHz: Number(Math.max(20, fbB4).toFixed(1)),
    type: 'BB4',
    category: 'bass_reflex',
    badge: 'Płaska / Monitor'
  });

  // 4. Sub-Chebyshev SC4 (Bezpieczne wychylenie)
  const vbSc4 = 11 * vas * Math.pow(qts, 2.87);
  const fbSc4 = 0.45 * fs * Math.pow(qts, -0.9);
  presets.push({
    name: 'Sub-Chebyshev SC4 (Ochrona Membrany)',
    descriptionPl: 'Bardzo niskie strojenie Fb zapobiega przekroczeniu Xmax poniżej pasma użytecznego.',
    recommendedVbLiters: Number(Math.max(6, vbSc4).toFixed(1)),
    recommendedFbHz: Number(Math.max(16, fbSc4).toFixed(1)),
    type: 'SC4',
    category: 'bass_reflex',
    badge: 'Niskie Fb'
  });

  // 5. Extended Bass Shelf (EBS - zejście do infra z room gain)
  const vbEbs = 28 * vas * Math.pow(qts, 3.2);
  const fbEbs = Math.max(16, fs * 0.72);
  presets.push({
    name: 'EBS (Extended Bass Shelf)',
    descriptionPl: 'Duża objętość z bardzo niskim strojeniem. W pomieszczeniu podbicie room-gain wyrównuje pasmo do 20 Hz.',
    recommendedVbLiters: Number(Math.max(12, vbEbs).toFixed(1)),
    recommendedFbHz: Number(fbEbs.toFixed(1)),
    type: 'EBS',
    category: 'bass_reflex',
    badge: 'Sub-Bass 20Hz'
  });

  // ==================== SEALED ALIGNMENTS ====================

  // 6. Obudowa zamknięta: Butterworth Qtc = 0.707 (maksymalnie płaska)
  if (qts < 0.707) {
    const alphaButter = Math.max(0.1, (0.707 / qts) ** 2 - 1);
    const vbButter = vas / alphaButter;
    const fcButter = fs * (0.707 / qts);
    presets.push({
      name: 'Zamknięta: Butterworth (Qtc = 0.707)',
      descriptionPl: 'Optymalny kompromis między zejściem basu a odpowiedzią impulsową. Brak jakichkolwiek podbić.',
      recommendedVbLiters: Number(vbButter.toFixed(1)),
      recommendedFbHz: Number(fcButter.toFixed(1)),
      type: 'Butterworth',
      category: 'sealed',
      badge: 'Qtc 0.707'
    });
  }

  // 7. Obudowa zamknięta: Bessel Qtc = 0.577 (audiofilska)
  if (qts < 0.577) {
    const alphaBessel = Math.max(0.1, (0.577 / qts) ** 2 - 1);
    const vbBessel = vas / alphaBessel;
    const fcBessel = fs * (0.577 / qts);
    presets.push({
      name: 'Zamknięta: Bessel (Qtc = 0.577)',
      descriptionPl: 'Najlepsza możliwa kontrola transjentów, minimalne opóźnienie grupowe, idealny impuls muzyczny.',
      recommendedVbLiters: Number(vbBessel.toFixed(1)),
      recommendedFbHz: Number(fcBessel.toFixed(1)),
      type: 'Bessel',
      category: 'sealed',
      badge: 'Impuls SQ'
    });
  }

  // 8. Obudowa zamknięta: Chebyshev Qtc = 0.95 (kompaktowa skrzynia)
  if (qts < 0.95) {
    const alphaCheb = Math.max(0.1, (0.95 / qts) ** 2 - 1);
    const vbCheb = vas / alphaCheb;
    const fcCheb = fs * (0.95 / qts);
    presets.push({
      name: 'Zamknięta: Chebyshev (Qtc = 0.95)',
      descriptionPl: 'Zwarta mała skrzynka z podbiciem punchu (+1 dB przy 60 Hz). Dobre dla muzyki klubowej i małych bagażników.',
      recommendedVbLiters: Number(Math.max(3, vbCheb).toFixed(1)),
      recommendedFbHz: Number(fcCheb.toFixed(1)),
      type: 'Chebyshev_Sealed',
      category: 'sealed',
      badge: 'Punch / Compact'
    });
  }

  return presets;
}
