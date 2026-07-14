import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('artifact inventory and page are generated truthfully', async () => {
  const inventory = JSON.parse(await readFile('src/_data/generated/artifacts.json', 'utf8'));
  assert.equal(typeof inventory.directoryCount, 'number');
  assert.equal(typeof inventory.fileCount, 'number');
  const html = await readFile('_site/artifacts/index.html', 'utf8');
  assert.match(html, /Artifacts/);
  if (inventory.directoryCount === 0) {
    assert.match(html, /No folder named artifact or artifacts was found/);
  }
});
