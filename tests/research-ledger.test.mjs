// Usage: run through `npm test`; every Rights Article must retain at least one reviewed support and dissent claim, while mixed and limit records preserve conditional evidence.
// Evidence boundary: validates provenance and coverage structure, not the truth of every source claim or application.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

const requiredDomains = [
  'Medical',
  'Construction',
  'Engineering',
  'Agriculture',
  'Jurisprudence',
  'Transportation and distribution',
  'Child craft',
  'Information systems',
  'Emergency response',
  'Hospitality and sanitation',
  'Community governance'
];

test('research ledgers parse and claims resolve to reviewed sources', async () => {
  const sources = yaml.load(await readFile('src/_data/research/sources.yml', 'utf8'));
  const claims = yaml.load(await readFile('src/_data/research/claims.yml', 'utf8'));
  const articleLab = JSON.parse(await readFile('src/_data/article_lab.json', 'utf8'));
  assert.ok(Array.isArray(sources) && sources.length > 0);
  assert.ok(Array.isArray(claims) && claims.length > 0);
  assert.ok(Array.isArray(articleLab) && articleLab.length === 8);

  const sourceIds = new Set(sources.map(source => source.id));
  const labUnitIds = new Set(articleLab.map(record => record.unit_id));
  assert.equal(sourceIds.size, sources.length, 'source ids must be unique');
  assert.equal(new Set(claims.map(claim => claim.id)).size, claims.length, 'claim ids must be unique');
  assert.equal(labUnitIds.size, 8, 'each Rights article must have one Lab record');

  for (const source of sources) {
    assert.ok(source.title && source.url && source.reviewed_on && source.boundary);
  }
  for (const claim of claims) {
    assert.ok(['support', 'dissent', 'limit', 'mixed'].includes(claim.stance));
    assert.ok(claim.status && claim.claim);
    assert.ok(labUnitIds.has(claim.article), `claim ${claim.id} is not attached to a Rights Article Lab record`);
    assert.ok(Array.isArray(claim.source_ids) && claim.source_ids.length > 0);
    for (const sourceId of claim.source_ids) assert.ok(sourceIds.has(sourceId), `unknown source ${sourceId}`);
    assert.ok(claim.limitation);
  }

  for (const record of articleLab) {
    assert.ok(record.public_title);
    assert.ok(record.ad_absurdum?.overextension && record.ad_absurdum?.counter_overextension && record.ad_absurdum?.boundary);
    assert.ok(Array.isArray(record.worst_practices) && record.worst_practices.length >= 4);
    assert.ok(Array.isArray(record.best_practices) && record.best_practices.length >= 4);
    assert.deepEqual(Object.keys(record.applications), requiredDomains, `${record.unit_id} must preserve the shared domain order`);
    const articleClaims = claims.filter(claim => claim.article === record.unit_id);
    assert.ok(articleClaims.length > 0, `${record.unit_id} needs reviewed research contact`);
    assert.ok(articleClaims.some(claim => claim.stance === 'support'), `${record.unit_id} needs reviewed support`);
    assert.ok(articleClaims.some(claim => claim.stance === 'dissent'), `${record.unit_id} needs reviewed dissent`);
  }
});
