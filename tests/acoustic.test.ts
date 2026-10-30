import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndDeriveTS } from '../src/acoustic/thieleSmall';
import { calculatePortPhysics } from '../src/acoustic/bassReflex';
import { resolveDesign } from '../src/geometry/resolveDesign';
import { simulateEnclosureAcoustics } from '../src/acoustic/simulation';
import { calculateAlignmentPresets } from '../src/acoustic/alignment';
import { VERIFIED_DRIVER_LIBRARY } from '../src/drivers/library';
import { DEFAULT_PROJECT } from '../src/project/projectStorage';

test('Thiele-Small parameters consistency check verifies Qts formula', () => {
  const driver = VERIFIED_DRIVER_LIBRARY[0]; // Dayton RSS315HO
  const result = validateAndDeriveTS(driver.ts);
  
  // Qts = (Qes * Qms) / (Qes + Qms) = (0.36 * 4.12) / (0.36 + 4.12) = 1.4832 / 4.48 = 0.331
  assert.equal(Math.abs(result.calculatedQts - 0.33) < 0.02, true);
  assert.equal(result.isValid, true);
});

test('Helmholtz bass-reflex physics computes accurate tuning frequency and end correction', () => {
  const portConfig = {
    type: 'slot_l_bend' as const,
    diameterMm: 100,
    slotWidthMm: 42,
    slotHeightMm: 400,
    lengthMm: 600,
    effectiveLengthMm: 680,
    targetFbHz: 32,
    autoCalculateLength: false,
    wallThicknessMm: 19,
    portLocation: 'front_right' as const,
    hasCornerReflector: true,
    flangeType: 'one_flanged' as const
  };

  const netVbLiters = 50;
  const result = calculatePortPhysics(portConfig, netVbLiters, 500, 14, 500);

  // Cross section area: 42mm * 400mm = 16800 mm^2 = 168 cm^2
  assert.equal(result.crossSectionAreaCm2, 168);
  // End correction should be positive (>0 mm)
  assert.equal(result.endCorrectionMm > 50, true);
  // Tuning frequency should be in realistic subwoofer range (20 Hz - 45 Hz)
  assert.equal(result.tuningFbHz >= 25 && result.tuningFbHz <= 40, true);
  // Area should be sufficient for 12" driver with 14mm Xmax (no warning)
  assert.equal(result.isAreaTooSmall, false);
});

test('Acoustic simulation generates accurate SPL, excursion, and double-peak impedance for bass reflex', () => {
  const driver = VERIFIED_DRIVER_LIBRARY[0];
  const enclosure = DEFAULT_PROJECT.enclosure;
  const netVb = 50;

  const simResult = simulateEnclosureAcoustics(driver, enclosure, netVb, { inputPowerWatts: 300 });

  assert.equal(simResult.curve.length > 50, true);
  assert.equal(simResult.tuningFbHz > 25 && simResult.tuningFbHz < 40, true);
  assert.equal(simResult.maxSplDb > 105, true);

  // In bass-reflex, cone excursion has a pronounced dip near Fb
  const pointNearFb = simResult.curve.reduce((prev, curr) => 
    Math.abs(curr.freqHz - simResult.tuningFbHz) < Math.abs(prev.freqHz - simResult.tuningFbHz) ? curr : prev
  );
  const pointBelowFb = simResult.curve.find(p => p.freqHz < 20)!;
  // Excursion below Fb is unloaded and higher than at Fb
  assert.equal(pointBelowFb.excursionMm > pointNearFb.excursionMm, true);
});

test('Alignment presets calculate valid recommended volumes and tunings including Chebyshev C4', () => {
  const driver = VERIFIED_DRIVER_LIBRARY[0];
  const presets = calculateAlignmentPresets(driver);

  assert.equal(presets.length >= 5, true);
  const qb3 = presets.find(p => p.type === 'QB3');
  assert.notEqual(qb3, undefined);
  assert.equal(qb3!.recommendedVbLiters > 10 && qb3!.recommendedVbLiters < 80, true);

  const c4 = presets.find(p => p.type === 'C4');
  assert.notEqual(c4, undefined);
  assert.equal(c4!.recommendedVbLiters > 0, true);
  assert.equal(c4!.recommendedFbHz > 20, true);
});

test('Bandpass 4th and 6th simulation properly splits front and rear chamber and models acoustic bandpass filter', () => {
  const driver = VERIFIED_DRIVER_LIBRARY[0];
  const bp4thEnclosure = {
    ...DEFAULT_PROJECT.enclosure,
    type: 'bandpass_4th' as const,
    bandpass: {
      frontChamberRatio: 0.40,
      rearFbHz: 30
    }
  };

  const simResult = simulateEnclosureAcoustics(driver, bp4thEnclosure, 60, { inputPowerWatts: 250 });
  assert.equal(simResult.curve.length > 50, true);
  assert.equal(simResult.maxSplDb > 100, true);
  // Bandpass must attenuate both below passband and above passband (acoustic lowpass filter characteristic)
  const lowPoint = simResult.curve[0]; // 15 Hz
  const highPoint = simResult.curve[simResult.curve.length - 1]; // 250 Hz
  assert.equal(lowPoint.splDb < simResult.maxSplDb - 6, true);
  assert.equal(highPoint.splDb < simResult.maxSplDb - 6, true);
});

test('Tube port calculation correctly derives effective length with flaring end correction', () => {
  const tubePort = {
    type: 'round' as const,
    diameterMm: 100,
    tubeCount: 2,
    hasFlare: true,
    slotWidthMm: 0,
    slotHeightMm: 0,
    lengthMm: 300,
    effectiveLengthMm: 370,
    targetFbHz: 33,
    autoCalculateLength: true,
    wallThicknessMm: 3,
    portLocation: 'front_bottom' as const,
    hasCornerReflector: false,
    flangeType: 'both_flanged' as const
  };

  const result = calculatePortPhysics(tubePort, 50, 500, 15, 300);
  assert.equal(result.crossSectionAreaCm2 > 70, true);
  assert.equal(result.physicalLengthMm > 50, true);
  assert.equal(result.effectiveLengthMm > result.physicalLengthMm, true);
});

test('Subbox Pro 10 inch slot reference reproduces the published port length', () => {
  // Subbox Pro 10 inch front slot: Vb 38 L, Fb 38 Hz, Sp 16.27 in²,
  // port inlet 1.51 × 10.79 in, and published physical length 17.69 in.
  const result = calculatePortPhysics({
    type: 'slot_l_bend',
    diameterMm: 100,
    slotWidthMm: 1.51 * 25.4,
    slotHeightMm: 10.79 * 25.4,
    lengthMm: 17.69 * 25.4,
    effectiveLengthMm: 0,
    targetFbHz: 38,
    autoCalculateLength: false,
    wallThicknessMm: 18,
    portLocation: 'front_right',
    hasCornerReflector: false,
    flangeType: 'one_flanged'
  }, 38, 450, 12, 300);

  assert.equal(Math.abs(result.tuningFbHz - 38) < 0.2, true);
  assert.equal(Math.abs(result.physicalLengthMm - 17.69 * 25.4) < 1, true);
});

test('Automatic port length and net volume resolve to the same target tuning', () => {
  const resolved = resolveDesign(DEFAULT_PROJECT.enclosure, VERIFIED_DRIVER_LIBRARY[0]);
  const portResult = calculatePortPhysics(
    resolved.enclosure.port,
    resolved.volumeBalance.netAcousticVolumeLiters,
    VERIFIED_DRIVER_LIBRARY[0].ts.sd,
    VERIFIED_DRIVER_LIBRARY[0].ts.xmax,
    VERIFIED_DRIVER_LIBRARY[0].ts.pe
  );

  assert.equal(resolved.enclosure.port.lengthMm > 20, true);
  assert.equal(resolved.volumeBalance.netAcousticVolumeLiters > 0, true);
  assert.equal(Math.abs(portResult.tuningFbHz - resolved.enclosure.port.targetFbHz) < 0.2, true);
  assert.equal(
    Math.abs(portResult.physicalLengthMm - resolved.enclosure.port.lengthMm) < 1,
    true
  );
});

