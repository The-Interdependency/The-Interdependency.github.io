// Usage: run through `npm test`; every manifest-declared research ledger must parse and every Rights Article must retain reviewed support and dissent.
// Evidence boundary: validates provenance, segmentation, and coverage structure, not the truth of every source claim or application.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

const manifestPath = 'src/_data/research/ledger-manifest.json';
const ledgerPathPattern = /^src\/_data\/research\/[a-z0-9][a-z0-9.-]*\.yml$/;
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

async function readYamlLedgers(paths, kind) {
  assert.ok(Array.isArray(paths) && paths.length > 0, `${kind} ledger manifest must contain paths`);
  assert.equal(new Set(paths).size, paths.length, `${kind} ledger manifest paths must be unique`);

  const ledgers = [];
  for (const path of paths) {
    assert.equal(typeof path, 'string');
    assert.match(path, ledgerPathPattern, `${kind} ledger path must remain beneath src/_data/research`);
    const parsed = yaml.load(await readFile(path, 'utf8'));
    assert.ok(Array.isArray(parsed) && parsed.length > 0, `${path} must contain a non-empty YAML list`);
    ledgers.push(parsed);
  }
  return ledgers.flat();
}

test('research ledgers parse and claims resolve to reviewed sources', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.ok(manifest && typeof manifest === 'object' && !Array.isArray(manifest));

  const [sources, claims, articleLab] = await Promise.all([
    readYamlLedgers(manifest.sources, 'source'),
    readYamlLedgers(manifest.claims, 'claim'),
    readFile('src/_data/article_lab.json', 'utf8').then(JSON.parse)
  ]);

  assert.ok(sources.length >= 32, 'the reviewed source corpus must not regress below the current evidence floor');
  assert.ok(claims.length >= 30, 'the reviewed claim corpus must not regress below the current evidence floor');
  assert.ok(Array.isArray(articleLab) && articleLab.length === 8);

  const sourceIds = new Set(sources.map(source => source.id));
  const labUnitIds = new Set(articleLab.map(record => record.unit_id));
  assert.equal(sourceIds.size, sources.length, 'source ids must be unique across all ledgers');
  assert.equal(new Set(claims.map(claim => claim.id)).size, claims.length, 'claim ids must be unique across all ledgers');
  assert.equal(labUnitIds.size, 8, 'each Rights article must have one Lab record');

  for (const source of sources) {
    assert.ok(source.id && source.title && source.authors && source.year && source.publication && source.type);
    assert.ok(source.url && source.reviewed_on && source.relevance && source.boundary);
  }
  for (const claim of claims) {
    assert.ok(['support', 'dissent', 'limit', 'mixed'].includes(claim.stance));
    assert.ok(claim.id && claim.status && claim.claim && claim.limitation);
    assert.ok(labUnitIds.has(claim.article), `claim ${claim.id} is not attached to a Rights Article Lab record`);
    assert.ok(Array.isArray(claim.source_ids) && claim.source_ids.length > 0);
    for (const sourceId of claim.source_ids) assert.ok(sourceIds.has(sourceId), `unknown source ${sourceId}`);
  }

  for (const record of articleLab) {
    assert.ok(record.public_title);
    assert.ok(record.ad_absurdum?.overextension && record.ad_absurdum?.counter_overextension && record.ad_absurdum?.boundary);
    assert.ok(Array.isArray(record.worst_practices) && record.worst_practices.length >= 4);
    assert.ok(Array.isArray(record.best_practices) && record.best_practices.length >= 4);
    assert.deepEqual(Object.keys(record.applications), requiredDomains, `${record.unit_id} must preserve the shared domain order`);
    const articleClaims = claims.filter(claim => claim.article === record.unit_id);
    assert.ok(articleClaims.length >= 3, `${record.unit_id} needs more than a minimal support-dissent pair`);
    assert.ok(articleClaims.some(claim => claim.stance === 'support'), `${record.unit_id} needs reviewed support`);
    assert.ok(articleClaims.some(claim => claim.stance === 'dissent'), `${record.unit_id} needs reviewed dissent`);
  }
});
