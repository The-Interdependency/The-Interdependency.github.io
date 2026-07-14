import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('build manifest and change report are generated', async () => {
  const manifest = JSON.parse(await readFile('src/_data/generated/buildManifest.json', 'utf8'));
  const changes = JSON.parse(await readFile('src/_data/generated/changes.json', 'utf8'));
  assert.ok(manifest.siteCommit);
  assert.ok(manifest.counts.canonUnits > 0);
  assert.equal(changes.canon.unitCount, manifest.counts.canonUnits);
});
