import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('canon data preserves Wayseer identity, provenance, stable unit evidence, and the Interdefinables boundary', async () => {
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
  const preamble = canon.units.find(unit => unit.title === 'Preamble');
  assert.ok(interdefinables);
  assert.ok(preamble);
  assert.match(interdefinables.content, /Human consciousness emerges from/i);
  assert.match(interdefinables.content, /Binary essences meaningfully/i);
  assert.match(interdefinables.content, /Trinary perceptual/i);
  assert.match(interdefinables.content, /Archetype passions of possession/i);
  assert.equal(canon.units.some(unit => /^Human consciousness emerges from:?$/i.test(unit.title)), false);
  assert.equal(canon.units.some(unit => /^Binary essences meaningfully/i.test(unit.title)), false);
  assert.equal(canon.units.some(unit => /^Trinary perceptual/i.test(unit.title)), false);
  assert.equal(canon.units.some(unit => /Archetype passions of possession/i.test(unit.title)), false);
  const interdefinablesIndex = canon.units.findIndex(unit => unit.id === interdefinables.id);
  const preambleIndex = canon.units.findIndex(unit => unit.id === preamble.id);
  assert.equal(preambleIndex, interdefinablesIndex + 1);
  assert.equal(preamble.level, 2);
  assert.equal(preamble.section, 'preamble');
});
