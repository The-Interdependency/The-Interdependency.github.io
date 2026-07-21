import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('canon data preserves Wayseer identity, provenance, stable unit evidence, and nested heading parents', async () => {
  const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
  assert.equal(canon.source.repository, 'wayseer00/main');
  assert.equal(canon.source.path, 'canon/INTERDEPENDENT_WAY.txt');
  assert.match(canon.source.contentSha256, /^[a-f0-9]{64}$/);
  if (!canon.source.fallback) {
    assert.match(canon.source.commit, /^[a-f0-9]{40}$/);
    assert.match(canon.source.blob, /^[a-f0-9]{40}$/);
  }
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

  const interdefinables = canon.units.find(unit => unit.title === 'The Interdefinables');
  const human = canon.units.find(unit => /^Human consciousness emerges from:?$/i.test(unit.title));
  assert.ok(interdefinables);
  assert.ok(human);
  assert.equal(human.level, 3);
  assert.equal(human.section, interdefinables.section);
  assert.equal(human.parentId, interdefinables.id);
  assert.equal(canon.sections.some(section => /^Human consciousness emerges from:?$/i.test(section.title)), false);
  assert.ok(canon.edges.some(edge => edge.type === 'heading-parent' && edge.from === human.id && edge.to === interdefinables.id));
});
