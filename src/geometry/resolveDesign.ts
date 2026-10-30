import { calculatePortPhysics, calculateAutoPortLengthWithDisplacement } from '../acoustic/bassReflex';
import { DriverModel } from '../types/driver';
import { EnclosureConfig } from '../types/enclosure';
import { SolvedGeometry, solveEnclosureGeometry } from './joinery';
import { calculateVolumeBalance } from './volumeBalance';

export interface ResolvedDesign {
  /** Enclosure with the calculated physical port length applied for CAD/export. */
  enclosure: EnclosureConfig;
  geometry: SolvedGeometry;
  volumeBalance: ReturnType<typeof calculateVolumeBalance>;
}

function hasPort(enclosure: EnclosureConfig): boolean {
  return enclosure.type === 'bass_reflex' ||
    enclosure.type === 'bass_reflex_slot' ||
    enclosure.type === 'bass_reflex_tube' ||
    enclosure.type === 'bandpass_4th' ||
    enclosure.type === 'bandpass_6th';
}

/**
 * Resolves the shared model values used by the UI, acoustic calculation, CAD,
 * and exports. Auto port length is solved against net volume after the port's
 * air column and material displacement have been removed from the enclosure.
 */
export function resolveDesign(
  enclosure: EnclosureConfig,
  driver: DriverModel,
  materialDensityKgM3 = 750
): ResolvedDesign {
  let resolvedEnclosure = enclosure;

  if (hasPort(enclosure) && enclosure.port.autoCalculateLength) {
    const zeroLengthEnclosure: EnclosureConfig = {
      ...enclosure,
      port: { ...enclosure.port, lengthMm: 0 }
    };
    const zeroLengthGeometry = solveEnclosureGeometry(zeroLengthEnclosure, driver, materialDensityKgM3);
    const volumeAvailableBeforePort = calculateVolumeBalance(
      zeroLengthEnclosure,
      driver,
      zeroLengthGeometry
    ).netAcousticVolumeLiters;
    const physicalLengthMm = calculateAutoPortLengthWithDisplacement(
      enclosure.port,
      volumeAvailableBeforePort
    );

    resolvedEnclosure = {
      ...enclosure,
      port: {
        ...enclosure.port,
        lengthMm: physicalLengthMm
      }
    };
  }

  const geometry = solveEnclosureGeometry(resolvedEnclosure, driver, materialDensityKgM3);
  const volumeBalance = calculateVolumeBalance(resolvedEnclosure, driver, geometry);
  return { enclosure: resolvedEnclosure, geometry, volumeBalance };
}

export function getResolvedPortPhysics(
  resolvedEnclosure: EnclosureConfig,
  driver: DriverModel,
  netVbLiters: number
) {
  if (!hasPort(resolvedEnclosure)) return undefined;
  return calculatePortPhysics(
    resolvedEnclosure.port,
    netVbLiters,
    driver.ts.sd * resolvedEnclosure.driverCount,
    driver.ts.xmax,
    driver.ts.pe
  );
}
