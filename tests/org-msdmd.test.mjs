import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrgMap, parseCollectionText } from '../scripts/fetch-org-msdmd.mjs';

// Usage: `node --test tests/org-msdmd.test.mjs`; all fixtures are local and perform no network requests.

test('parses generated and hand-authored msdmd collection points without evaluation', () => {
  const generated = `
    import { defineMsdmdCollection } from './collection';
    export default defineMsdmdCollection({"repo":"alpha","declarations":[],"gaps":[],"edges":[]});
    // ratios: ignored
  `;
  assert.deepEqual(parseCollectionText(generated), {
    repo: 'alpha', declarations: [], gaps: [], edges: []
  });

  const handAuthored = `
    export default defineMsdmdCollection({
      repo: 'alpha',
      declarations: [{ file: 'src/a.py', block: 'DEPENDENCIES', id: 'alpha_dep', fields: { requires: 'beta::beta_cap', }, }],
      gaps: [],
      edges: [{ from: 'alpha_dep', to: 'beta::beta_cap', kind: 'requires', source_block: 'DEPENDENCIES', source_id: 'alpha_dep', }],
    });
    // ratios: trailing source seal
  `;
  const parsed = parseCollectionText(handAuthored);
  assert.equal(parsed.repo, 'alpha');
  assert.equal(parsed.declarations[0].fields.requires, 'beta::beta_cap');
  assert.equal(parsed.edges[0].kind, 'requires');
});

test('resolves only exact cross-repo targets and retains unresolved edges', () => {
  const inputs = [
    {
      name: 'alpha', slug: 'alpha', defaultBranch: 'main', headSha: 'a'.repeat(40), headCommittedAt: '2026-08-15T00:00:00Z',
      collectionStatus: 'ok', collectionPath: 'alpha_msdmd.ts', collectionSha256: '1'.repeat(64),
      collection: {
        repo: 'alpha', source_commit: 'a'.repeat(40), gaps: [],
        declarations: [{ file: 'src/a.py', block: 'DEPENDENCIES', id: 'alpha_dep', fields: {} }],
        edges: [
          { from: 'alpha_dep', to: 'beta::beta_cap', kind: 'requires', source_block: 'DEPENDENCIES', source_id: 'alpha_dep' },
          { from: 'alpha_dep', to: 'looks-like-something', kind: 'requires', source_block: 'DEPENDENCIES', source_id: 'alpha_dep' }
        ]
      }
    },
    {
      name: 'beta', slug: 'beta', defaultBranch: 'main', headSha: 'b'.repeat(40), headCommittedAt: '2026-08-16T00:00:00Z',
      collectionStatus: 'ok', collectionPath: 'beta_msdmd.ts', collectionSha256: '2'.repeat(64),
      collection: {
        repo: 'beta', source_commit: 'b'.repeat(40), gaps: [], edges: [],
        declarations: [{ file: 'src/b.py', block: 'CAPABILITIES', id: 'beta_cap', fields: {} }]
      }
    },
    {
      name: 'gamma', slug: 'gamma', defaultBranch: 'main', headSha: 'c'.repeat(40), headCommittedAt: '2026-08-14T00:00:00Z',
      collectionStatus: 'missing', collectionPath: 'gamma_msdmd.ts', collectionError: 'collection point absent at consumed head'
    }
  ];

  const first = buildOrgMap(inputs);
  const second = buildOrgMap(inputs);
  assert.equal(JSON.stringify(first), JSON.stringify(second), 'same inputs must emit byte-equivalent data');
  assert.equal(first.summary.repositoryCount, 3);
  assert.equal(first.summary.collectionCount, 2);
  assert.equal(first.summary.missingCollectionCount, 1);
  assert.equal(first.summary.crossRepoPairCount, 1);
  assert.equal(first.summary.unresolvedEdgeCount, 1);
  assert.deepEqual(first.repositoryEdges[0], {
    from: 'alpha', to: 'beta', count: 1, kinds: ['requires'], sourceBlocks: ['DEPENDENCIES']
  });
  assert.equal(first.unresolvedEdges[0].targetRaw, 'looks-like-something');
  assert.match(first.repositories.find(repo => repo.name === 'gamma').hmmm[0], /No consumable repo-level msdmd collection point/);
});

test('flags collection source commit drift without rejecting the source bytes', () => {
  const data = buildOrgMap([{
    name: 'alpha', slug: 'alpha', defaultBranch: 'main', headSha: 'a'.repeat(40), headCommittedAt: '2026-08-16T00:00:00Z',
    collectionStatus: 'ok', collectionPath: 'alpha_msdmd.ts', collectionSha256: '3'.repeat(64),
    collection: { repo: 'alpha', source_commit: 'b'.repeat(40), declarations: [], gaps: [], edges: [] }
  }]);
  const repo = data.repositories[0];
  assert.equal(repo.collection.sourceCommitMatchesHead, false);
  assert.ok(repo.hmmm.some(item => /does not match/.test(item)));
});
