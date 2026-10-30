import { SOUND_SPEED, AIR_DENSITY } from './thieleSmall';
import { PortConfig } from '../types/enclosure';

export interface PortCalculationResult {
  crossSectionAreaCm2: number;
  crossSectionAreaM2: number;
  physicalLengthMm: number;
  effectiveLengthMm: number;
  endCorrectionMm: number;
  tuningFbHz: number;
  airVolumeLiters: number;
  recommendedMinAreaCm2: number; // Richard Small minimal area to prevent chuffing at rated power
  isAreaTooSmall: boolean;
}

interface PortGeometry {
  crossSectionAreaM2: number;
  /** Volume removed from the enclosure per metre of port (air + port material). */
  displacedAreaM2: number;
  endCorrectionM: number;
}

function getPortGeometry(port: PortConfig): PortGeometry {
  if (port.type === 'round' || port.type === 'aeroport') {
    const radiusM = Math.max(0, port.diameterMm / 2) * 1e-3;
    const wallM = Math.max(0, port.wallThicknessMm || 0) * 1e-3;
    const innerAreaM2 = Math.PI * radiusM ** 2;
    const count = Math.max(1, Math.floor(port.tubeCount || 1));
    const outerAreaM2 = Math.PI * (radiusM + wallM) ** 2;
    const diameterM = radiusM * 2;
    const endFactor = port.hasFlare || port.flangeType === 'both_flanged'
      ? 0.85
      : port.flangeType === 'free'
        ? 0.614
        : 0.732;

    return {
      crossSectionAreaM2: innerAreaM2 * count,
      displacedAreaM2: outerAreaM2 * count,
      // Each tube has the same length and its own two-end correction.
      endCorrectionM: endFactor * diameterM
    };
  }

  const widthM = Math.max(0, port.slotWidthMm) * 1e-3;
  const heightM = Math.max(0, port.slotHeightMm) * 1e-3;
  const wallM = Math.max(0, port.wallThicknessMm || 0) * 1e-3;
  const areaM2 = widthM * heightM;
  const coefficient = port.flangeType === 'both_flanged'
    ? 1.05
    : port.flangeType === 'free'
      ? 0.85
      : 1.18;

  return {
    crossSectionAreaM2: areaM2,
    displacedAreaM2: (widthM + wallM) * heightM,
    endCorrectionM: coefficient * Math.sqrt(areaM2)
  };
}

/**
 * Finds an auto-sized port length while accounting for the volume occupied by
 * the port itself. This solves the Helmholtz length and net-volume equations
 * together instead of calculating a length from a stale gross volume.
 */
export function calculateAutoPortLengthWithDisplacement(
  port: PortConfig,
  availableVolumeBeforePortLiters: number
): number {
  const geometry = getPortGeometry(port);
  const availableVolumeM3 = Math.max(0, availableVolumeBeforePortLiters) * 1e-3;
  const fbHz = Math.max(1, port.targetFbHz || 32);
  const helmholtzConstant = (SOUND_SPEED ** 2 * geometry.crossSectionAreaM2) /
    (4 * Math.PI ** 2 * fbHz ** 2);
  const beta = geometry.displacedAreaM2;

  if (availableVolumeM3 <= 0 || geometry.crossSectionAreaM2 <= 0) return 20;

  let lengthM: number;
  if (beta < 1e-9) {
    lengthM = helmholtzConstant / availableVolumeM3 - geometry.endCorrectionM;
  } else {
    // beta*L² - (V - beta*E)*L + (K - V*E) = 0
    const b = availableVolumeM3 - beta * geometry.endCorrectionM;
    const c = helmholtzConstant - availableVolumeM3 * geometry.endCorrectionM;
    const discriminant = b ** 2 - 4 * beta * c;
    if (discriminant < 0 || b <= 0) return 20;
    lengthM = (b - Math.sqrt(discriminant)) / (2 * beta);
  }

  return Math.max(20, Number.isFinite(lengthM) ? lengthM * 1000 : 20);
}

/**
 * Oblicza fizyczną i efektywną długość portu oraz strojenie rezonatora Helmholtza.
 * Z uwzględnieniem korekcji końcowej zależnej od geometrii wylotów (rura, aeroport z flarą, szczelina, slot L-bend).
 * 
 * @param port Konfiguracja portu
 * @param netVbLiters Rzeczywista objętość akustyczna netto komory [L]
 * @param driverSdCm2 Łączna powierzchnia membran przetworników [cm²]
 * @param driverXmaxMm Maksymalne wychylenie liniowe [mm]
 * @param driverPeWatts Moc znamionowa przetwornika [W]
 */
export function calculatePortPhysics(
  port: PortConfig,
  netVbLiters: number,
  driverSdCm2: number = 500,
  driverXmaxMm: number = 15,
  driverPeWatts: number = 300
): PortCalculationResult {
  const portGeometry = getPortGeometry(port);
  const spM2 = portGeometry.crossSectionAreaM2;
  const endCorrectionM = portGeometry.endCorrectionM;
  const vbM3 = Math.max(1e-6, netVbLiters * 1e-3);

  const spCm2 = spM2 * 1e4;

  // Minimalne zalecane pole przekroju portu wg reguły D.B. Keele / Richard Small:
  // Sp_min >= 0.6 * Fb * Vd = 0.6 * Fb * (Sd * Xmax)
  const vdM3 = (driverSdCm2 * 1e-4) * (driverXmaxMm * 1e-3);
  const minSpM2 = Math.max(0.002, 0.6 * (port.targetFbHz || 32) * vdM3);
  const minSpCm2 = minSpM2 * 1e4;

  let physicalLengthM: number;
  let effectiveLengthM: number;
  let tunedFb: number;

  if (port.autoCalculateLength) {
    const targetFbHz = Math.max(1, port.targetFbHz || 32);
    // Leff = c^2 * Sp / (4 * pi^2 * Fb^2 * Vb)
    effectiveLengthM = (SOUND_SPEED ** 2 * spM2) / (4 * (Math.PI ** 2) * (targetFbHz ** 2) * vbM3);
    physicalLengthM = Math.max(0.02, effectiveLengthM - endCorrectionM);
    // Report the tuning of the realizable physical length. If the target would
    // require a negative port, the 20 mm minimum must not be reported as target Fb.
    effectiveLengthM = physicalLengthM + endCorrectionM;
    tunedFb = (SOUND_SPEED / (2 * Math.PI)) * Math.sqrt(spM2 / (vbM3 * effectiveLengthM));
  } else {
    physicalLengthM = Math.max(0.02, port.lengthMm * 1e-3);
    effectiveLengthM = physicalLengthM + endCorrectionM;
    // Fb = (c / 2*pi) * sqrt(Sp / (Vb * Leff))
    tunedFb = (SOUND_SPEED / (2 * Math.PI)) * Math.sqrt(spM2 / (vbM3 * effectiveLengthM));
  }

  // W przypadku dwóch rur powietrze w obu rurach tworzy łączną kubaturę
  const airVolumeM3 = spM2 * physicalLengthM;
  const airVolumeLiters = airVolumeM3 * 1000;

  return {
    crossSectionAreaCm2: Number(spCm2.toFixed(2)),
    crossSectionAreaM2: spM2,
    physicalLengthMm: Number((physicalLengthM * 1000).toFixed(1)),
    effectiveLengthMm: Number((effectiveLengthM * 1000).toFixed(1)),
    endCorrectionMm: Number((endCorrectionM * 1000).toFixed(1)),
    tuningFbHz: Number(tunedFb.toFixed(1)),
    airVolumeLiters: Number(airVolumeLiters.toFixed(2)),
    recommendedMinAreaCm2: Number(minSpCm2.toFixed(1)),
    isAreaTooSmall: spCm2 < minSpCm2 * 0.85
  };
}
