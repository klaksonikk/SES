import test from 'node:test';
import assert from 'node:assert/strict';
import { solveEnclosureGeometry } from '../src/geometry/joinery';
import { calculateVolumeBalance } from '../src/geometry/volumeBalance';
import { detectGeometricCollisions } from '../src/geometry/collision';
import { VERIFIED_DRIVER_LIBRARY } from '../src/drivers/library';
import { DEFAULT_PROJECT } from '../src/project/projectStorage';

test('Section 8 joinery rule: standard_top_bottom_overlay produces full overlay top and bottom', () => {
  const enclosure = { ...DEFAULT_PROJECT.enclosure, joinery: 'standard_top_bottom_overlay' as const };
  const driver = VERIFIED_DRIVER_LIBRARY[0];
  const t = enclosure.panelThicknessMm; // 19mm
  const W = enclosure.outerWidthMm;
  const H = enclosure.outerHeightMm;
  const D = enclosure.outerDepthMm;

  const solved = solveEnclosureGeometry(enclosure, driver);

  const topPanel = solved.panels.find(p => p.id === 'panel_top')!;
  const botPanel = solved.panels.find(p => p.id === 'panel_bottom')!;
  const frontPanel = solved.panels.find(p => p.id === 'panel_front')!;
  const leftPanel = solved.panels.find(p => p.id === 'panel_left')!;

  // 1. Góra i dół: W_ext x D_ext (Section 8)
  assert.equal(topPanel.widthMm, W);
  assert.equal(topPanel.heightMm, D);
  assert.equal(botPanel.widthMm, W);
  assert.equal(botPanel.heightMm, D);

  // 2. Przód i tył: W_ext x (H_ext - 2*t)
  const expectedFrontH = H - 2 * t;
  assert.equal(frontPanel.widthMm, W);
  assert.equal(frontPanel.heightMm, expectedFrontH);

  // 3. Boki: wpuszczone między przód a tył, o wysokości równej H_int
  assert.equal(leftPanel.heightMm, expectedFrontH);

  // 4. Cut list must contain top/bottom, front/back, sides
  assert.equal(solved.cutList.length >= 4, true);
  const cutTopBot = solved.cutList.find(c => c.id === 'cut_top_bot')!;
  assert.equal(cutTopBot.widthMm, W);
  assert.equal(cutTopBot.lengthMm, D);
  assert.equal(cutTopBot.quantity, 2);
});

test('Volume ledger strictly balances external volume = internal + walls', () => {
  const enclosure = DEFAULT_PROJECT.enclosure;
  const driver = VERIFIED_DRIVER_LIBRARY[0];
  const solved = solveEnclosureGeometry(enclosure, driver);
  const balance = calculateVolumeBalance(enclosure, driver, solved);

  const expectedExternalLiters = (enclosure.outerWidthMm * enclosure.outerHeightMm * enclosure.outerDepthMm) / 1e6;
  assert.equal(Math.abs(balance.grossExternalLiters - expectedExternalLiters) < 0.01, true);

  // Gross internal should be smaller than gross external
  assert.equal(balance.grossInternalLiters < balance.grossExternalLiters, true);

  // Net acoustic volume must account for driver and port displacement
  assert.equal(balance.netAcousticVolumeLiters < balance.grossInternalLiters, true);
  assert.equal(balance.driverDisplacementLiters > 0, true);
  assert.equal(balance.portAirVolumeLiters > 0, true);
});

test('Slot port front opening is included in the baffle drawing', () => {
  const enclosure = {
    ...DEFAULT_PROJECT.enclosure,
    port: { ...DEFAULT_PROJECT.enclosure.port, type: 'slot_l_bend' as const, portLocation: 'front_right' as const }
  };
  const solved = solveEnclosureGeometry(enclosure, VERIFIED_DRIVER_LIBRARY[0]);
  const frontPanel = solved.panels.find(panel => panel.id === 'panel_front')!;
  const portOpening = frontPanel.cutouts.find(cutout => cutout.id === 'front_slot_port');

  assert.notEqual(portOpening, undefined);
  assert.equal(portOpening!.type, 'port_opening');
  assert.equal(portOpening!.widthMm, enclosure.port.slotWidthMm);
  assert.equal(portOpening!.heightMm, enclosure.port.slotHeightMm);
});

test('Collision detector catches driver magnet collision if box is too shallow', () => {
  const driver = VERIFIED_DRIVER_LIBRARY[1]; // JL Audio 12W6v3 has mounting depth of 191mm
  // Create an artificially shallow enclosure with depth 150mm (internal depth ~112mm)
  const shallowEnclosure = {
    ...DEFAULT_PROJECT.enclosure,
    outerDepthMm: 150,
    hasDoubleBaffle: false
  };

  const solved = solveEnclosureGeometry(shallowEnclosure, driver);
  const warnings = detectGeometricCollisions(shallowEnclosure, driver, solved);

  const magnetCollision = warnings.find(w => w.code === 'MAGNET_PENETRATES_BACK_WALL');
  assert.notEqual(magnetCollision, undefined);
  assert.equal(magnetCollision!.severity, 'error');
});

test('Bandpass geometry generates internal divider baffle and splits chamber volumes', () => {
  const driver = VERIFIED_DRIVER_LIBRARY[0];
  const bpEnclosure = {
    ...DEFAULT_PROJECT.enclosure,
    type: 'bandpass_4th' as const,
    bandpass: {
      frontChamberRatio: 0.35,
      rearFbHz: 30
    }
  };

  const solved = solveEnclosureGeometry(bpEnclosure, driver);
  const internalBaffle = solved.panels.find(p => p.id === 'panel_internal_baffle');
  assert.notEqual(internalBaffle, undefined);
  assert.equal(internalBaffle!.isBracing, true);

  // Divider panel cut list entry must be present
  const cutBaffle = solved.cutList.find(c => c.id === 'cut_bandpass_divider');
  assert.notEqual(cutBaffle, undefined);

  // Volume balance must report rear and front chamber volumes
  const balance = calculateVolumeBalance(bpEnclosure, driver, solved);
  assert.equal(balance.isBandpass, true);
  assert.equal(balance.rearChamberVolumeLiters! > 0, true);
  assert.equal(balance.frontChamberVolumeLiters! > 0, true);
  assert.equal(balance.internalBaffleWoodLiters! > 0, true);
});

