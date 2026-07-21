// Usage: run through `npm test`; add claims only with source ids, limitations, and reviewed metadata.
// Evidence boundary: validates provenance structure, not the truth of every source claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

test('research ledgers parse and claims resolve to reviewed sources', async () => {
  const sources = yaml.load(await readFile('src/_data/research/sources.yml', 'utf8'));
  const claims = yaml.load(await readFile('src/_data/research/claims.yml', 'utf8'));
  assert.ok(Array.isArray(sources) && sources.length > 0);
  assert.ok(Array.isArray(claims) && claims.length > 0);

  const sourceIds = new Set(sources.map(source => source.id));
  assert.equal(sourceIds.size, sources.length, 'source ids must be unique');
  assert.equal(new Set(claims.map(claim => claim.id)).size, claims.length, 'claim ids must be unique');

  for (const source of sources) {
    assert.ok(source.title && source.url && source.reviewed_on && source.boundary);
  }
  for (const claim of claims) {
    assert.ok(['support', 'dissent', 'limit', 'mixed'].includes(claim.stance));
    assert.ok(Array.isArray(claim.source_ids) && claim.source_ids.length > 0);
    for (const sourceId of claim.source_ids) assert.ok(sourceIds.has(sourceId), `unknown source ${sourceId}`);
    assert.ok(claim.limitation);
  }
});
