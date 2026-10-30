import { DriverModel } from '../types/driver';
import { EnclosureConfig } from '../types/enclosure';
import { AcousticPoint, AcousticSimulationResult } from '../types/acoustic';
import { AIR_DENSITY, SOUND_SPEED } from './thieleSmall';
import { calculatePortPhysics } from './bassReflex';

export interface BandpassChambersBreakdown {
  rearChamberLiters: number;
  frontChamberLiters: number;
  frontTuningFbHz: number;
  rearTuningFbHz?: number;
  passbandLowF3Hz: number;
  passbandHighF3Hz: number;
  bandwidthHz: number;
  efficiencyGainDb: number;
}

export function calculateBandpassChambers(
  enclosure: EnclosureConfig,
  driver: DriverModel,
  totalNetVbLiters: number
): BandpassChambersBreakdown {
  const is6th = enclosure.type === 'bandpass_6th';
  const ratio = enclosure.bandpass?.frontChamberRatio ?? 0.40;
  
  const frontLiters = Math.max(2, totalNetVbLiters * ratio);
  const rearLiters = Math.max(2, totalNetVbLiters * (1 - ratio));

  const vas = driver.ts.vas;
  const fsb = driver.ts.fs * Math.sqrt(1 + vas / rearLiters);
  const qtsb = driver.ts.qts * Math.sqrt(1 + vas / rearLiters);

  const targetFrontFb = enclosure.port.autoCalculateLength
    ? Math.round(fsb)
    : enclosure.port.targetFbHz;

  const bandwidth = Math.max(20, fsb / Math.max(0.3, qtsb));
  const fLow = Math.max(18, Math.round(targetFrontFb - bandwidth / 2));
  const fHigh = Math.round(targetFrontFb + bandwidth / 2);

  const sParam = 0.5 * Math.sqrt(rearLiters / frontLiters);
  const efficiencyGainDb = Number((20 * Math.log10(Math.max(0.5, sParam * 2))).toFixed(1));

  return {
    rearChamberLiters: Number(rearLiters.toFixed(1)),
    frontChamberLiters: Number(frontLiters.toFixed(1)),
    frontTuningFbHz: targetFrontFb,
    rearTuningFbHz: is6th ? (enclosure.bandpass?.rearFbHz || Math.round(targetFrontFb * 0.6)) : undefined,
    passbandLowF3Hz: fLow,
    passbandHighF3Hz: fHigh,
    bandwidthHz: Math.round(bandwidth),
    efficiencyGainDb
  };
}

export function simulateBandpassAcoustics(
  driver: DriverModel,
  enclosure: EnclosureConfig,
  totalNetVbLiters: number,
  inputPowerWatts: number = 100
): AcousticSimulationResult {
  const ts = driver.ts;
  const numDrivers = enclosure.driverCount;
  const is6th = enclosure.type === 'bandpass_6th';
  
  const bp = calculateBandpassChambers(enclosure, driver, totalNetVbLiters);
  const vrM3 = bp.rearChamberLiters * 1e-3;
  const vfM3 = bp.frontChamberLiters * 1e-3;

  const eg = Math.sqrt(Math.max(1, inputPowerWatts) * ts.re);
  const sdM2 = (ts.sd * numDrivers) * 1e-4;
  const mms = (ts.mms * 1e-3) * numDrivers;
  const cms = (ts.cms > 0 ? ts.cms * 1e-3 : ts.vas * 1e-3 / (AIR_DENSITY * SOUND_SPEED ** 2 * sdM2 ** 2)) / numDrivers;
  const rms = (ts.rms > 0 ? ts.rms : (2 * Math.PI * ts.fs * mms) / ts.qms) * numDrivers;
  const bl = ts.bl;
  const re = ts.re;
  const le = (ts.le || 0.8) * 1e-3;

  const cabRear = vrM3 / (AIR_DENSITY * (SOUND_SPEED ** 2));
  const cabFront = vfM3 / (AIR_DENSITY * (SOUND_SPEED ** 2));

  const frontPortPhysics = calculatePortPhysics(
    enclosure.port,
    bp.frontChamberLiters,
    ts.sd * numDrivers,
    ts.xmax,
    inputPowerWatts
  );
  const spFrontM2 = frontPortPhysics.crossSectionAreaM2;
  const mapFront = (AIR_DENSITY * frontPortPhysics.effectiveLengthMm * 1e-3) / spFrontM2;
  const rapFront = (2 * Math.PI * bp.frontTuningFbHz * mapFront) / 40;

  const rearFb = bp.rearTuningFbHz || 30;
  const spRearM2 = spFrontM2 * 0.9;
  const mapRear = is6th ? (AIR_DENSITY * 0.35) / spRearM2 : 0;
  const rapRear = is6th ? (2 * Math.PI * rearFb * mapRear) / 40 : 0;

  const pointsCount = 75;
  const minFreq = 15;
  const maxFreq = 250;
  const curve: AcousticPoint[] = [];

  let maxAirVel = 0;
  let maxExcursion = 0;
  let peakSpl = 0;

  for (let i = 0; i < pointsCount; i++) {
    const freq = minFreq * Math.pow(maxFreq / minFreq, i / (pointsCount - 1));
    const omega = 2 * Math.PI * freq;

    const zeReal = re;
    const zeImag = omega * le;
    const zeMagSq = zeReal ** 2 + zeImag ** 2;

    const zmechReal = rms;
    const zmechImag = omega * mms - 1 / (omega * cms);

    let zRearR = 0;
    let zRearI = 0;
    if (!is6th) {
      zRearI = - (sdM2 ** 2) / (omega * cabRear);
    } else {
      const yCabR = omega * cabRear;
      const denomPortR = rapRear ** 2 + (omega * mapRear - 1 / yCabR) ** 2;
      zRearR = (sdM2 ** 2 * rapRear) / denomPortR;
      zRearI = - (sdM2 ** 2 * (omega * mapRear - 1 / yCabR)) / denomPortR;
    }

    const yCabF = omega * cabFront;
    const zpFReal = rapFront;
    const zpFImag = omega * mapFront - 1 / yCabF;

    const denomF = zpFReal ** 2 + zpFImag ** 2;
    const zFrontR = (sdM2 ** 2 * zpFReal) / denomF;
    const zFrontI = - (sdM2 ** 2 * zpFImag) / denomF;

    const zTotalMechR = zmechReal + zRearR + zFrontR + (bl ** 2 * zeReal) / zeMagSq;
    const zTotalMechI = zmechImag + zRearI + zFrontI - (bl ** 2 * zeImag) / zeMagSq;
    const totalMechMagSq = zTotalMechR ** 2 + zTotalMechI ** 2;

    const fSourceR = (bl * eg * zeReal) / zeMagSq;
    const fSourceI = -(bl * eg * zeImag) / zeMagSq;

    const udR = (fSourceR * zTotalMechR + fSourceI * zTotalMechI) / totalMechMagSq;
    const udI = (fSourceI * zTotalMechR - fSourceR * zTotalMechI) / totalMechMagSq;
    const udMag = Math.sqrt(udR ** 2 + udI ** 2);
    const xdMm = (udMag / omega) * 1000;

    const couplTransfMag = (sdM2) / (Math.sqrt(zpFReal ** 2 + zpFImag ** 2) * yCabF);
    const upFrontMag = udMag * couplTransfMag;
    const vPortFront = upFrontMag / spFrontM2;

    const uRadTotal = is6th ? upFrontMag * 1.3 : upFrontMag;
    const pPa = (AIR_DENSITY * omega * uRadTotal) / (2 * Math.PI * 1.0);
    const spl = 20 * Math.log10(Math.max(1e-6, pPa) / 2e-5);

    const zmotR = (bl ** 2 * zTotalMechR) / totalMechMagSq;
    const zmotI = -(bl ** 2 * zTotalMechI) / totalMechMagSq;
    const zTotalR = zeReal + zmotR;
    const zTotalI = zeImag + zmotI;
    const zTotalMag = Math.sqrt(zTotalR ** 2 + zTotalI ** 2);
    const zPhaseDeg = (Math.atan2(zTotalI, zTotalR) * 180) / Math.PI;

    maxAirVel = Math.max(maxAirVel, vPortFront);
    maxExcursion = Math.max(maxExcursion, xdMm);
    peakSpl = Math.max(peakSpl, spl);

    curve.push({
      freqHz: Number(freq.toFixed(1)),
      splDb: Number(spl.toFixed(1)),
      splNormalizedDb: Number((spl - 90).toFixed(1)),
      impedanceMagOhm: Number(zTotalMag.toFixed(2)),
      impedancePhaseDeg: Number(zPhaseDeg.toFixed(1)),
      excursionMm: Number(xdMm.toFixed(2)),
      portAirVelocityMs: Number(vPortFront.toFixed(2)),
      groupDelayMs: Number((550 / (freq + 15)).toFixed(1))
    });
  }

  return {
    f3Hz: bp.passbandLowF3Hz,
    f6Hz: Math.max(15, bp.passbandLowF3Hz - 6),
    f10Hz: Math.max(12, bp.passbandLowF3Hz - 12),
    tuningFbHz: bp.frontTuningFbHz,
    maxSplDb: Number(peakSpl.toFixed(1)),
    maxAirVelocityMs: Number(maxAirVel.toFixed(1)),
    isAirVelocityDangerous: maxAirVel > 17,
    isExcursionExceeded: maxExcursion > ts.xmax,
    curve
  };
}
