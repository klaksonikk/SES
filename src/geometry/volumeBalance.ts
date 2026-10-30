import { EnclosureConfig, VolumeBalance } from '../types/enclosure';
import { DriverModel } from '../types/driver';
import { SolvedGeometry } from './joinery';

/**
 * Ścisły bilans objętości skrzynki (Section 6 & 12).
 * Obsługuje obudowy Sealed, Bass-Reflex Slot, Bass-Reflex Tube oraz Bandpass 4th & 6th order.
 */
export function calculateVolumeBalance(
  enclosure: EnclosureConfig,
  driver: DriverModel,
  solvedGeometry: SolvedGeometry
): VolumeBalance {
  const { outerWidthMm, outerHeightMm, outerDepthMm, panelThicknessMm } = enclosure;
  const { internalDimensionsMm } = solvedGeometry;

  // 1. Zewnętrzna objętość brutto [L]
  const grossExternalLiters = (outerWidthMm * outerHeightMm * outerDepthMm) / 1e6;

  // 2. Wewnętrzna objętość brutto [L]
  const grossInternalLiters = (
    internalDimensionsMm.widthMm *
    internalDimensionsMm.heightMm *
    internalDimensionsMm.depthMm
  ) / 1e6;

  // 3. Drewno ścian zewnętrznych
  const wallPanelsLiters = Math.max(0, grossExternalLiters - grossInternalLiters);

  // 4. Wyparcie głośników (Driver Displacement)
  const driverDisplacementLiters = Math.max(0, driver.geometry.displacementLiters) * enclosure.driverCount;

  // 5. Port Bass-Reflex / Bandpass:
  let portWoodDisplacementLiters = 0;
  let portAirVolumeLiters = 0;

  const isVented = 
    enclosure.type === 'bass_reflex' ||
    enclosure.type === 'bass_reflex_slot' ||
    enclosure.type === 'bass_reflex_tube' ||
    enclosure.type === 'bandpass_4th' ||
    enclosure.type === 'bandpass_6th';

  if (isVented) {
    if (enclosure.port.type === 'round' || enclosure.port.type === 'aeroport' || enclosure.type === 'bass_reflex_tube') {
      const count = enclosure.port.tubeCount || 1;
      const radiusM = (enclosure.port.diameterMm / 2) * 1e-3;
      const portAreaM2 = Math.PI * (radiusM ** 2);
      const wallM = Math.max(0, enclosure.port.wallThicknessMm || 0) * 1e-3;
      const outerRadiusM = radiusM + wallM;
      const outerAreaM2 = Math.PI * (outerRadiusM ** 2);
      const lenM = enclosure.port.lengthMm * 1e-3;

      portAirVolumeLiters = count * portAreaM2 * lenM * 1000;
      portWoodDisplacementLiters = count * (outerAreaM2 - portAreaM2) * lenM * 1000;
    } else {
      // Port szczelinowy
      const wM = enclosure.port.slotWidthMm * 1e-3;
      const hM = (enclosure.port.slotHeightMm || internalDimensionsMm.heightMm) * 1e-3;
      const tPortM = (enclosure.port.wallThicknessMm || panelThicknessMm) * 1e-3;
      const lenM = enclosure.port.lengthMm * 1e-3;

      portAirVolumeLiters = wM * hM * lenM * 1000;
      portWoodDisplacementLiters = tPortM * hM * lenM * 1000;
    }

  }

  // 6. Wzmocnienia (Bracing)
  const bracingLiters = enclosure.bracing.type === 'none'
    ? 0
    : Math.max(0, enclosure.bracing.displacementLiters);

  // 7. Przegroda wewnętrzna w Bandpass
  const isBandpass = enclosure.type === 'bandpass_4th' || enclosure.type === 'bandpass_6th';
  let internalBaffleWoodLiters = 0;
  if (isBandpass) {
    internalBaffleWoodLiters = (internalDimensionsMm.widthMm * internalDimensionsMm.heightMm * panelThicknessMm) / 1e6;
  }

  // 8. Terminale
  const terminalsDisplacementLiters = Math.max(0, enclosure.terminalDisplacementLiters);

  // 9. Czysta łączna objętość akustyczna netto Vb
  const netAcousticVolumeLiters = Math.max(
    0,
    grossInternalLiters -
    driverDisplacementLiters -
    portWoodDisplacementLiters -
    portAirVolumeLiters -
    bracingLiters -
    internalBaffleWoodLiters -
    terminalsDisplacementLiters
  );

  // 10. Rozbicie komór dla Bandpass
  let rearChamberVolumeLiters: number | undefined;
  let frontChamberVolumeLiters: number | undefined;

  if (isBandpass) {
    const ratio = enclosure.bandpass?.frontChamberRatio ?? 0.40;
    frontChamberVolumeLiters = Number((netAcousticVolumeLiters * ratio).toFixed(1));
    rearChamberVolumeLiters = Number((netAcousticVolumeLiters * (1 - ratio)).toFixed(1));
  }

  const effectiveVolumeWithDampingLiters = netAcousticVolumeLiters * Math.max(0, enclosure.dampingAbsorptionFactor);

  return {
    grossExternalLiters: Number(grossExternalLiters.toFixed(2)),
    wallPanelsLiters: Number(wallPanelsLiters.toFixed(2)),
    grossInternalLiters: Number(grossInternalLiters.toFixed(2)),
    driverDisplacementLiters: Number(driverDisplacementLiters.toFixed(2)),
    portWoodDisplacementLiters: Number(portWoodDisplacementLiters.toFixed(2)),
    portAirVolumeLiters: Number(portAirVolumeLiters.toFixed(2)),
    bracingDisplacementLiters: Number(bracingLiters.toFixed(2)),
    terminalsDisplacementLiters: Number(terminalsDisplacementLiters.toFixed(2)),
    netAcousticVolumeLiters: Number(netAcousticVolumeLiters.toFixed(2)),
    effectiveVolumeWithDampingLiters: Number(effectiveVolumeWithDampingLiters.toFixed(2)),
    isBandpass,
    rearChamberVolumeLiters,
    frontChamberVolumeLiters,
    internalBaffleWoodLiters: Number(internalBaffleWoodLiters.toFixed(2))
  };
}
