import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('canonical source is only wayseer00/main on main', async () => {
  const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
  const manifest = JSON.parse(await readFile('src/_data/generated/buildManifest.json', 'utf8'));
  assert.equal(canon.source.repository, 'wayseer00/main');
  assert.equal(canon.source.path, 'canon/INTERDEPENDENT_WAY.txt');
  assert.equal(canon.source.branch, 'main');
  assert.equal(manifest.canon.repository, 'wayseer00/main');
  assert.equal(manifest.fallback.canon, false);
  assert.notEqual(canon.source.commit, 'local-snapshot');
});
