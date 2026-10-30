import { DriverTSParams } from '../types/driver';

export const AIR_DENSITY = 1.2041; // kg/m^3 @ 20°C, 1013 hPa
export const SOUND_SPEED = 343.2; // m/s @ 20°C

export interface ConsistencyCheck {
  isValid: boolean;
  calculatedQts: number;
  calculatedVasLiters?: number;
  calculatedSensitivity?: number;
  discrepancies: string[];
}

/**
 * Walidacja spójności parametrów Thiele'a-Smalla (Small-Signal Model)
 * Zgodnie z pracami: A.N. Thiele (JAES 1971), R.H. Small (JAES 1972/1973)
 */
export function validateAndDeriveTS(ts: DriverTSParams): ConsistencyCheck {
  const discrepancies: string[] = [];
  
  // 1. Relacja Qts = (Qes * Qms) / (Qes + Qms)
  const calcQts = (ts.qes * ts.qms) / (ts.qes + ts.qms);
  const qtsDiff = Math.abs(ts.qts - calcQts);
  if (qtsDiff > 0.05) {
    discrepancies.push(
      `Podane Qts (${ts.qts.toFixed(3)}) różni się od obliczonego z Qes i Qms (${calcQts.toFixed(3)}) o ${(qtsDiff * 100).toFixed(1)}%.`
    );
  }

  // 2. Relacja Vas = rho0 * c^2 * Sd^2 * Cms
  let calcVas: number | undefined;
  if (ts.cms > 0 && ts.sd > 0) {
    const sdM2 = ts.sd * 1e-4; // cm^2 -> m^2
    const cmsMPerN = ts.cms * 1e-3; // mm/N -> m/N
    const vasM3 = AIR_DENSITY * (SOUND_SPEED ** 2) * (sdM2 ** 2) * cmsMPerN;
    calcVas = vasM3 * 1000; // m^3 -> liters
    
    if (ts.vas > 0) {
      const vasDiffPercent = Math.abs(ts.vas - calcVas) / ts.vas * 100;
      if (vasDiffPercent > 15) {
        discrepancies.push(
          `Podane Vas (${ts.vas.toFixed(1)} L) różni się od Vas wynikającego z Cms i Sd (${calcVas.toFixed(1)} L) o ${vasDiffPercent.toFixed(1)}%.`
        );
      }
    }
  }

  // 3. Sprawność odniesienia eta0 i SPL (1W/1m)
  // eta0 = (4 * pi^2 / c^3) * (Fs^3 * Vas_m3 / Qes)
  let calcSpl: number | undefined;
  if (ts.vas > 0 && ts.qes > 0 && ts.fs > 0) {
    const vasM3 = ts.vas * 1e-3;
    const eta0 = (4 * Math.PI ** 2 / (SOUND_SPEED ** 3)) * ((ts.fs ** 3) * vasM3 / ts.qes);
    calcSpl = 112.0 + 10 * Math.log10(Math.max(1e-8, eta0));
  }

  return {
    isValid: discrepancies.length === 0,
    calculatedQts: Number(calcQts.toFixed(3)),
    calculatedVasLiters: calcVas ? Number(calcVas.toFixed(1)) : undefined,
    calculatedSensitivity: calcSpl ? Number(calcSpl.toFixed(1)) : undefined,
    discrepancies
  };
}
