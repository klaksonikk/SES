import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROJECT, importProjectFromJson } from '../src/project/projectStorage';

test('Project JSON round-trip validates and preserves custom enclosure values', () => {
  const result = importProjectFromJson(JSON.stringify(DEFAULT_PROJECT));

  assert.equal(result.success, true);
  assert.equal(result.data?.enclosure.outerWidthMm, DEFAULT_PROJECT.enclosure.outerWidthMm);
  assert.equal(result.data?.driver.id, DEFAULT_PROJECT.driver.id);
});

test('Project JSON validation rejects invalid dimensions and driver parameters', () => {
  const invalidDimensions = structuredClone(DEFAULT_PROJECT);
  invalidDimensions.enclosure.outerWidthMm = Number.NaN;
  const badBox = importProjectFromJson(JSON.stringify(invalidDimensions));
  assert.equal(badBox.success, false);

  const invalidDriver = structuredClone(DEFAULT_PROJECT);
  invalidDriver.driver.ts.fs = 0;
  const badDriver = importProjectFromJson(JSON.stringify(invalidDriver));
  assert.equal(badDriver.success, false);
});
