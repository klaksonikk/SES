import JSZip from 'jszip';
import { simulateEnclosureAcoustics } from '../acoustic/simulation';
import { ProjectData } from '../project/projectStorage';
import { detectGeometricCollisions } from '../geometry/collision';
import { SolvedGeometry } from '../geometry/joinery';
import { getResolvedPortPhysics } from '../geometry/resolveDesign';
import { getMaterialInfo } from '../geometry/materials';
import { calculateVolumeBalance } from '../geometry/volumeBalance';

/**
 * Creates a data-only engineering archive for the selected speaker and enclosure.
 * It intentionally contains no application source, CAD drawings, or workshop files.
 */
export async function createCompleteProjectZip(
  project: ProjectData,
  solved: SolvedGeometry,
  inputPowerWatts = project.driver.ts.pe
): Promise<Blob> {
  const enclosure = project.enclosure;
  const volumeBalance = calculateVolumeBalance(enclosure, project.driver, solved);
  const portPhysics = getResolvedPortPhysics(
    enclosure,
    project.driver,
    volumeBalance.netAcousticVolumeLiters
  );
  const acousticSimulation = simulateEnclosureAcoustics(
    project.driver,
    enclosure,
    volumeBalance.netAcousticVolumeLiters,
    { inputPowerWatts: Math.max(1, inputPowerWatts) }
  );
  const collisionWarnings = detectGeometricCollisions(enclosure, project.driver, solved);

  const engineeringData = {
    schema: 'subwoofer-engineering-studio/speaker-and-enclosure',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    speaker: project.driver,
    enclosure: {
      configuration: enclosure,
      material: getMaterialInfo(enclosure.material),
      internalDimensionsMm: solved.internalDimensionsMm,
      volumeBalance,
      portPhysics,
      simulationInputPowerWatts: Math.max(1, inputPowerWatts),
      acousticSimulation,
      collisionWarnings,
      construction: {
        panels: solved.panels,
        cutList: solved.cutList,
        totalWoodVolumeLiters: solved.totalWoodVolumeLiters,
        totalWoodWeightKg: solved.totalWoodWeightKg
      }
    }
  };

  const zip = new JSZip();
  zip.file('speaker-and-enclosure.json', JSON.stringify(engineeringData, null, 2));
  return zip.generateAsync({ type: 'blob' });
}
