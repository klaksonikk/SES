import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { createCompleteProjectZip } from '../src/cad/projectZip';
import { DEFAULT_PROJECT } from '../src/project/projectStorage';
import { getMaterialInfo } from '../src/geometry/materials';
import { resolveDesign } from '../src/geometry/resolveDesign';

test('engineering ZIP contains only advanced speaker and enclosure JSON data', async () => {
  const project = structuredClone(DEFAULT_PROJECT);
  const resolved = resolveDesign(
    project.enclosure,
    project.driver,
    getMaterialInfo(project.enclosure.material).densityKgM3
  );
  project.enclosure = resolved.enclosure;

  const blob = await createCompleteProjectZip(project, resolved.geometry, 250);
  const archive = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.deepEqual(Object.keys(archive.files), ['speaker-and-enclosure.json']);

  const data = JSON.parse(await archive.file('speaker-and-enclosure.json')!.async('string'));
  assert.equal(data.schema, 'subwoofer-engineering-studio/speaker-and-enclosure');
  assert.deepEqual(data.speaker.ts, project.driver.ts);
  assert.deepEqual(data.speaker.geometry, project.driver.geometry);
  assert.deepEqual(data.enclosure.configuration, resolved.enclosure);
  assert.equal(typeof data.enclosure.volumeBalance.netAcousticVolumeLiters, 'number');
  assert.equal(typeof data.enclosure.portPhysics.tuningFbHz, 'number');
  assert.equal(data.enclosure.simulationInputPowerWatts, 250);
  assert.equal(data.enclosure.acousticSimulation.curve.length > 0, true);
  assert.equal(data.enclosure.construction.panels.length > 0, true);
  assert.equal(data.enclosure.construction.cutList.length > 0, true);
  assert.equal('sourceCode' in data, false);
});
