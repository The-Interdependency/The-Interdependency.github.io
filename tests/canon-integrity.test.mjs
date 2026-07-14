import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('canon data preserves Wayseer identity, provenance, and stable unit evidence', async () => {
  const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
  assert.equal(canon.source.repository, 'wayseer00/wayseer.github.io');
  assert.equal(canon.source.path, 'canon/the_interdependent_way.md');
  assert.match(canon.source.contentSha256, /^[a-f0-9]{64}$/);
  assert.ok(canon.units.length > 0);
  const routes = new Set();
  for (const unit of canon.units) {
    assert.ok(unit.id);
    assert.match(unit.hash, /^[a-f0-9]{64}$/);
    assert.ok(unit.startLine <= unit.endLine);
    assert.ok(Array.isArray(unit.notes));
    assert.ok(unit.routeSlug);
    assert.ok(unit.routeSlug.length <= 96);
    assert.equal(routes.has(unit.routeSlug), false);
    routes.add(unit.routeSlug);
  }
});
