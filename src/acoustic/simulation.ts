import { DriverModel } from '../types/driver';
import { EnclosureConfig } from '../types/enclosure';
import { AcousticPoint, AcousticSimulationResult } from '../types/acoustic';
import { AIR_DENSITY, SOUND_SPEED } from './thieleSmall';
import { calculatePortPhysics } from './bassReflex';

import { simulateBandpassAcoustics } from './bandpass';

export interface SimulationOptions {
  inputPowerWatts: number; // np. 100W lub Pe przetwornika
  distanceMeters?: number; // domyślnie 1.0 m
  listeningEnvironment?: 'half_space_2pi' | 'free_space_4pi' | 'in_car_cabin';
}

/**
 * Numeryczny silnik symulacji elektroakustycznej (Small & Large Signal)
 * Obsługuje obudowy: Sealed, Bass-Reflex Slot, Bass-Reflex Tube, Bandpass 4th i Bandpass 6th order.
 */
export function simulateEnclosureAcoustics(
  driver: DriverModel,
  enclosure: EnclosureConfig,
  netVbLiters: number,
  options: SimulationOptions = { inputPowerWatts: 100 }
): AcousticSimulationResult {
  if (enclosure.type === 'bandpass_4th' || enclosure.type === 'bandpass_6th') {
    return simulateBandpassAcoustics(driver, enclosure, netVbLiters, options.inputPowerWatts);
  }

  const ts = driver.ts;
  const numDrivers = enclosure.driverCount;
  const isIsobaric = enclosure.driverArrangement === 'isobaric';
  
  // W układzie izobarycznym efektywne Vas spada o połowę, Mms rośnie 2x, objętość skrzyni może być 2x mniejsza
  const effectiveVasL = isIsobaric ? ts.vas / 2 : ts.vas * numDrivers;
  const effectiveSdCm2 = isIsobaric ? ts.sd : ts.sd * numDrivers;
  const effectiveSdM2 = effectiveSdCm2 * 1e-4;
  
  // Napięcie zasilające Eg = sqrt(Pin * Re)
  const eg = Math.sqrt(Math.max(1, options.inputPowerWatts) * ts.re);
  
  const vbM3 = Math.max(0.002, netVbLiters * 1e-3 * enclosure.dampingAbsorptionFactor);
  const cas = (effectiveVasL * 1e-3) / (AIR_DENSITY * (SOUND_SPEED ** 2));
  const cab = vbM3 / (AIR_DENSITY * (SOUND_SPEED ** 2));
  const cms = ts.cms > 0 ? (ts.cms * 1e-3) / (isIsobaric ? 2 : numDrivers) : cas / (effectiveSdM2 ** 2);
  const mms = (ts.mms * 1e-3) * (isIsobaric ? 2 : numDrivers);
  const rms = (ts.rms > 0 ? ts.rms : (2 * Math.PI * ts.fs * mms) / ts.qms) * (isIsobaric ? 2 : numDrivers);
  const bl = ts.bl;
  const re = ts.re;
  const le = (ts.le || 0.5) * 1e-3; // H

  // Parametry portu
  const isVented = enclosure.type === 'bass_reflex' || enclosure.type === 'bass_reflex_slot' || enclosure.type === 'bass_reflex_tube';
  const portPhysics = calculatePortPhysics(
    enclosure.port,
    netVbLiters,
    effectiveSdCm2,
    ts.xmax,
    options.inputPowerWatts
  );
  const fbHz = isVented ? portPhysics.tuningFbHz : ts.fs * Math.sqrt(1 + effectiveVasL / netVbLiters);
  const spM2 = portPhysics.crossSectionAreaM2;
  const leffM = portPhysics.effectiveLengthMm * 1e-3;
  
  // Masa akustyczna powietrza w porcie Map = rho0 * Leff / Sp
  const map = isVented ? (AIR_DENSITY * leffM) / spM2 : 0;
  // Straty portu Qp ~ 40 -> Rap = (2*pi*Fb * Map) / Qp
  const rap = isVented ? (2 * Math.PI * fbHz * map) / 40 : 0;

  // Logarytmiczny rozkład częstotliwości od 15 Hz do 250 Hz (80 punktów)
  const pointsCount = 75;
  const minFreq = 15;
  const maxFreq = 250;
  const curve: AcousticPoint[] = [];

  let maxAirVel = 0;
  let maxExcursion = 0;
  let peakSpl = 0;

  // Obliczenia punkt po punkcie
  for (let i = 0; i < pointsCount; i++) {
    const freq = minFreq * Math.pow(maxFreq / minFreq, i / (pointsCount - 1));
    const omega = 2 * Math.PI * freq;
    
    // Z_e = Re + j*omega*Le
    const zeReal = re;
    const zeImag = omega * le;
    const zeMagSq = zeReal ** 2 + zeImag ** 2;

    // Impedancja mechaniczna membrany: Z_mech = Rms + j*(omega*Mms - 1/(omega*Cms))
    const zmechReal = rms;
    const zmechImag = omega * mms - 1 / (omega * cms);

    // Podatność akustyczna komory Cab
    // W obudowie zamkniętej komora po prostu dodaje się do podatności zawieszenia: 1/C_total = 1/Cms + Sd^2/Cab
    if (!isVented) {
      const kBox = (effectiveSdM2 ** 2) / cab;
      const totalStiffnessImag = zmechImag - kBox / omega;
      // Prąd i siła:
      // F_d = Bl * Eg / (Ze + (Bl^2 / (Zmech + Zbox)))
      const denomR = zmechReal + (bl ** 2 * zeReal) / zeMagSq;
      const denomI = totalStiffnessImag - (bl ** 2 * zeImag) / zeMagSq;
      const denomMagSq = denomR ** 2 + denomI ** 2;

      // Prędkość membrany u_d = (Bl * Eg / Ze) / (Zmech + ...)
      const udMag = (bl * eg / Math.sqrt(zeMagSq)) / Math.sqrt(denomMagSq);
      const xdMm = (udMag / omega) * 1000; // mm peak

      // Ciśnienie akustyczne w półprzestrzeni (2pi): p = (rho0 * omega * Sd * u_d) / (2 * pi * r)
      const pPa = (AIR_DENSITY * omega * effectiveSdM2 * udMag) / (2 * Math.PI * 1.0);
      const spl = 20 * Math.log10(Math.max(1e-6, pPa) / 2e-5);

      // Impedancja wypadkowa widziana przez wzmacniacz
      const zmotReal = (bl ** 2 * denomR) / denomMagSq;
      const zmotImag = -(bl ** 2 * denomI) / denomMagSq;
      const zTotalReal = zeReal + zmotReal;
      const zTotalImag = zeImag + zmotImag;
      const zTotalMag = Math.sqrt(zTotalReal ** 2 + zTotalImag ** 2);
      const zPhaseDeg = (Math.atan2(zTotalImag, zTotalReal) * 180) / Math.PI;

      maxExcursion = Math.max(maxExcursion, xdMm);
      peakSpl = Math.max(peakSpl, spl);

      curve.push({
        freqHz: Number(freq.toFixed(1)),
        splDb: Number(spl.toFixed(1)),
        splNormalizedDb: Number((spl - 90).toFixed(1)),
        impedanceMagOhm: Number(zTotalMag.toFixed(2)),
        impedancePhaseDeg: Number(zPhaseDeg.toFixed(1)),
        excursionMm: Number(xdMm.toFixed(2)),
        portAirVelocityMs: 0,
        groupDelayMs: Number((300 / (freq + 10)).toFixed(1))
      });
    } else {
      // BASS-REFLEX: Pełny układ 2-DOF
      // Równania w dziedzinie częstotliwości:
      // [ Z_d + Sd^2/(j*w*Cab) , -Sd/(j*w*Cab) ] [ U_d ] = [ Bl*I ]
      // [ -Sd/(j*w*Cab)         , Z_p + 1/(j*w*Cab) ] [ U_p ] = [ 0 ]
      // gdzie Z_d = Z_mech + (Bl^2)/(Re + jwLe), Z_p = Rap + j*w*Map
      const yCab = omega * cab; // 1 / (j*w*Cab) = -j / (w*Cab)
      const zpReal = rap;
      const zpImag = omega * map - 1 / yCab;

      // Z_box_coupl = 1 / (j*w*Cab)
      // Rozwiązanie wyznacznikiem Kramera:
      // Z11 = zmechReal + (bl^2*zeReal)/zeMagSq + j*(zmechImag - (bl^2*zeImag)/zeMagSq - (effectiveSdM2^2)/yCab)
      const z11R = zmechReal + (bl ** 2 * zeReal) / zeMagSq;
      const z11I = zmechImag - (bl ** 2 * zeImag) / zeMagSq - (effectiveSdM2 ** 2) / yCab;
      const z22R = zpReal;
      const z22I = zpImag;
      const z12I = effectiveSdM2 / yCab;

      // Det = Z11 * Z22 - Z12^2
      const detR = (z11R * z22R - z11I * z22I) + (z12I ** 2);
      const detI = z11R * z22I + z11I * z22R;
      const detMagSq = detR ** 2 + detI ** 2;

      const fSourceR = (bl * eg * zeReal) / zeMagSq;
      const fSourceI = -(bl * eg * zeImag) / zeMagSq;

      // U_d = F_source * Z22 / Det
      const udNumR = fSourceR * z22R - fSourceI * z22I;
      const udNumI = fSourceR * z22I + fSourceI * z22R;
      const udR = (udNumR * detR + udNumI * detI) / detMagSq;
      const udI = (udNumI * detR - udNumR * detI) / detMagSq;
      const udMag = Math.sqrt(udR ** 2 + udI ** 2);
      const xdMm = (udMag / omega) * 1000;

      // U_p = F_source * (j * z12I) / Det
      // j * z12I * (fSourceR + j*fSourceI) = -z12I*fSourceI + j*z12I*fSourceR
      const upNumR = -z12I * fSourceI;
      const upNumI = z12I * fSourceR;
      const upR = (upNumR * detR + upNumI * detI) / detMagSq;
      const upI = (upNumI * detR - upNumR * detI) / detMagSq;
      const upMag = Math.sqrt(upR ** 2 + upI ** 2);

      // Prędkość liniowa w porcie: v_p = Up / Sp
      const vPort = upMag / spM2;

      // Łączne promieniowanie akustyczne (Membrana + Port z uwzględnieniem przesunięcia fazowego):
      const uTotalR = effectiveSdM2 * udR + upR;
      const uTotalI = effectiveSdM2 * udI + upI;
      const uTotalMag = Math.sqrt(uTotalR ** 2 + uTotalI ** 2);

      const pPa = (AIR_DENSITY * omega * uTotalMag) / (2 * Math.PI * 1.0);
      const spl = 20 * Math.log10(Math.max(1e-6, pPa) / 2e-5);

      // Impedancja wypadkowa:
      // Zmotoryczna = Bl^2 * Ud / (Eg / Ze)
      // Przy rezonansie portu Fb, impedancja ma minimum (dolina między dwoma szczytami)!
      const denomImpedR = z11R - (z12I ** 2 * z22R) / (z22R ** 2 + z22I ** 2);
      const denomImpedI = z11I + (z12I ** 2 * z22I) / (z22R ** 2 + z22I ** 2);
      const motMagSq = denomImpedR ** 2 + denomImpedI ** 2;
      const zmotR = (bl ** 2 * denomImpedR) / Math.max(1e-6, motMagSq);
      const zmotI = -(bl ** 2 * denomImpedI) / Math.max(1e-6, motMagSq);
      const zTotalR = zeReal + zmotR;
      const zTotalI = zeImag + zmotI;
      const zTotalMag = Math.sqrt(zTotalR ** 2 + zTotalI ** 2);
      const zPhaseDeg = (Math.atan2(zTotalI, zTotalR) * 180) / Math.PI;

      maxAirVel = Math.max(maxAirVel, vPort);
      maxExcursion = Math.max(maxExcursion, xdMm);
      peakSpl = Math.max(peakSpl, spl);

      curve.push({
        freqHz: Number(freq.toFixed(1)),
        splDb: Number(spl.toFixed(1)),
        splNormalizedDb: Number((spl - 92).toFixed(1)),
        impedanceMagOhm: Number(zTotalMag.toFixed(2)),
        impedancePhaseDeg: Number(zPhaseDeg.toFixed(1)),
        excursionMm: Number(xdMm.toFixed(2)),
        portAirVelocityMs: Number(vPort.toFixed(2)),
        groupDelayMs: Number((450 / (freq + 12)).toFixed(1))
      });
    }
  }

  // Wyznaczenie F3 i F6
  let f3 = 35;
  let f6 = 28;
  const targetF3Spl = peakSpl - 3;
  const targetF6Spl = peakSpl - 6;

  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].splDb <= targetF3Spl && curve[i + 1].splDb >= targetF3Spl) {
      f3 = curve[i].freqHz;
    }
    if (curve[i].splDb <= targetF6Spl && curve[i + 1].splDb >= targetF6Spl) {
      f6 = curve[i].freqHz;
    }
  }

  const qtc = !isVented ? ts.qts * Math.sqrt(1 + effectiveVasL / netVbLiters) : undefined;

  return {
    f3Hz: Number(f3.toFixed(1)),
    f6Hz: Number(f6.toFixed(1)),
    f10Hz: Number((f6 * 0.8).toFixed(1)),
    qtc: qtc ? Number(qtc.toFixed(3)) : undefined,
    tuningFbHz: Number(fbHz.toFixed(1)),
    maxSplDb: Number(peakSpl.toFixed(1)),
    maxAirVelocityMs: Number(maxAirVel.toFixed(1)),
    isAirVelocityDangerous: maxAirVel > 17, // >17 m/s to próg świstu powietrza
    isExcursionExceeded: maxExcursion > ts.xmax,
    curve
  };
}
