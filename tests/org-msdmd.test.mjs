import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { COLLECTION_BYTE_LIMIT, fetchCollection } from '../scripts/msdmd-collection.mjs';
import { publishMetadataPages, prepareRetainedPages } from '../scripts/msdmd-pages.mjs';
import { fetchRepositoryPublicProjection } from '../scripts/repository-public-projection.mjs';
import { buildOrgMap, immutableCollectionRegressions, parseCollectionText } from '../scripts/fetch-org-msdmd.mjs';

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

test('resolves exact graph targets, preserves opaque targets, and isolates true hmmm edges', () => {
  const inputs = [
    {
      name: 'alpha', slug: 'alpha', defaultBranch: 'main', headSha: 'a'.repeat(40), headCommittedAt: '2026-08-15T00:00:00Z',
      collectionStatus: 'ok', collectionPath: 'alpha_msdmd.ts', collectionSha256: '1'.repeat(64),
      collection: {
        repo: 'alpha', source_commit: 'a'.repeat(40), gaps: [],
        declarations: [{ file: 'src/a.py', block: 'DEPENDENCIES', id: 'alpha_dep', fields: {} }],
        edges: [
          { from: 'alpha_dep', to: 'beta::beta_cap', kind: 'requires', source_block: 'DEPENDENCIES', source_id: 'alpha_dep' },
          { from: 'alpha_dep', to: 'node', kind: 'requires', source_block: 'DEPENDENCIES', source_id: 'alpha_dep' },
          { from: 'alpha_dep', to: 'The-Interdependency/beta#missing_cap', kind: 'requires', source_block: 'DEPENDENCIES', source_id: 'alpha_dep' }
        ]
      }
    },
    {
      name: 'beta', slug: 'beta', defaultBranch: 'main', headSha: 'b'.repeat(40), headCommittedAt: '2026-08-16T00:00:00Z',
      collectionStatus: 'ok', collectionPath: 'beta_msdmd.ts', collectionSha256: '2'.repeat(64),
      collection: {
        repo: 'The-Interdependency/beta', source_commit: 'b'.repeat(40), gaps: [], edges: [],
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
  assert.equal(first.summary.externalTargetCount, 1);
  assert.equal(first.summary.unresolvedEdgeCount, 1);
  assert.deepEqual(first.repositoryEdges[0], {
    from: 'alpha', to: 'beta', count: 1, kinds: ['requires'], sourceBlocks: ['DEPENDENCIES']
  });
  const opaque = first.edges.find(edge => edge.targetRaw === 'node');
  assert.equal(opaque.resolution, 'external-target');
  assert.equal(first.unresolvedEdges[0].targetRaw, 'The-Interdependency/beta#missing_cap');
  assert.equal(first.unresolvedEdges[0].resolution, 'broken-explicit-declaration');
  assert.match(first.repositories.find(repo => repo.name === 'gamma').hmmm[0], /No consumable repo-level msdmd collection point/);
  assert.equal(first.repositories.find(repo => repo.name === 'beta').hmmm.length, 0, 'full-name repo identity is accepted');
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

test('unchanged immutable heads cannot silently lose a previously retrieved collection', () => {
  const headSha = 'a'.repeat(40);
  const previous = {
    repositories: [{
      name: 'alpha',
      headSha,
      collection: { status: 'ok', path: 'alpha_msdmd.ts' }
    }]
  };
  assert.deepEqual(immutableCollectionRegressions([{
    name: 'alpha',
    headSha,
    collectionPath: 'alpha_msdmd.ts',
    collectionStatus: 'missing'
  }], previous), ['alpha']);
  assert.deepEqual(immutableCollectionRegressions([{
    name: 'alpha',
    headSha: 'b'.repeat(40),
    collectionPath: 'alpha_msdmd.ts',
    collectionStatus: 'missing'
  }], previous), [], 'a new head may deliberately remove its collection and must remain visible as missing');
});

const pin = 'a'.repeat(40);
function fact(id, value) {
  return {
    address: 'msdmd://alpha/' + id, kind: 'frontmatter', standing: 'declared',
    native: { value }, source: { file: 'skills/how to/SKILL.md', location: { start_line: 2 } },
    subject: { identity: id, address: 'msdmd://alpha/subject/' + id }
  };
}

function versionTwo(facts) {
  return {
    schema: 'the-interdependency.msdmd-collection', schema_version: '2.0.0',
    repo: 'The-Interdependency/alpha', source: { repository: 'The-Interdependency/alpha' },
    coverage: { native_facts: facts.length, supplemental_declarations: 1 }, facts,
    declarations: [{ id: 'manual', address: 'msdmd://alpha/block/manual', fields: { purpose: 'fixture' }, file: 'notes.md' }],
    gaps: [], edges: [{ from: facts[0].subject.address, to: facts[0].address, kind: 'references' }],
    discovery: [], reader_manifests: [], reader_runs: [], diagnostics: [], conflicts: []
  };
}

function generatedChunks(c) {
  const chunks = c.facts.map(record => JSON.stringify([record]));
  const object = JSON.stringify({ ...c, facts: 'CHUNKS' }, null, 2)
    .replace('"facts": "CHUNKS"', '"facts": mergeMsdmdFactChunks(\n' + chunks.join(',\n') + '\n  )');
  return 'import { defineMsdmdCollectionV2, mergeMsdmdFactChunks } from "./helpers";\n'
    + 'export default defineMsdmdCollectionV2(' + object + ');\n';
}

test('published schema-2 chunks, flat modules and JSON preserve native values, addresses and coverage', () => {
  const c = versionTwo([fact('one', 'quoted mergeMsdmdFactChunks( [ ] )'), fact('two', { value: 'é' })]);
  for (const input of [generatedChunks(c), 'export default defineMsdmdCollectionV2(' + JSON.stringify(c) + ');', JSON.stringify(c)]) {
    assert.deepEqual(parseCollectionText(input), c);
  }
  assert.throws(() => parseCollectionText(generatedChunks(c).replace('"native_facts": 2', '"native_facts": 1')), /coverage/);
  const executable = generatedChunks(c).replace('"é"', 'globalThis.fetch("should-never-run")');
  assert.throws(() => parseCollectionText(executable), /nonliteral/);
  const map = buildOrgMap([{ name: 'alpha', slug: 'alpha', collectionStatus: 'ok', collection: c }]);
  assert.equal(map.summary.nativeFactCount, 2);
  assert.equal(map.repositories[0].counts.declarations, 1);
  assert.equal(map.edges[0].sourceId, c.facts[0].subject.address);
  assert.equal(map.edges[0].targetId, c.facts[0].address);
});

test('live current-head refresh reads beyond the old 2 MiB limit with a hash of the exact source bytes', async t => {
  const c = versionTwo([fact('one', 'x'.repeat(3 * 1024 * 1024))]);
  const bytes = generatedChunks(c);
  t.mock.method(globalThis, 'fetch', async url => String(url).startsWith('https://api.github.com/')
    ? Response.json({ default_branch: 'main', private: false, visibility: 'public' })
    : new Response(bytes));
  const result = await fetchRepositoryPublicProjection('alpha', { headSha: pin, includeDocumentation: false });
  assert.equal(result.msdmd.status, 'ok');
  assert.deepEqual(result.msdmd.counts, { declarations: 1, gaps: 0, edges: 1, nativeFacts: 1, diagnostics: 0, conflicts: 0 });
  assert.equal(result.msdmd.sha256, createHash('sha256').update(bytes).digest('hex'));
});

test('fetch bounds declared and streamed bytes including when Content-Length is absent', async t => {
  const chunk = new Uint8Array(1024 * 1024);
  const responses = [
    () => new Response('', { headers: { 'content-length': String(COLLECTION_BYTE_LIMIT + 1) } }),
    () => new Response(new ReadableStream({ pull(controller) { controller.enqueue(chunk); } })),
    () => new Response('', { status: 404 })
  ];
  t.mock.method(globalThis, 'fetch', () => responses.shift()());
  await assert.rejects(fetchCollection('alpha', pin), /reading limit/);
  await assert.rejects(fetchCollection('alpha', pin), /reading limit/);
  await assert.rejects(fetchCollection('alpha', pin), { status: 404 });
  await assert.rejects(fetchCollection('../alpha', pin), /exact Git commit/);
});

test('static reader exposes every record, independent pages and complete oversized values', async t => {
  const parent = await mkdtemp(path.join(tmpdir(), 'msdmd-test-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const c = versionTwo(Array.from({ length: 26 }, (_, n) => fact('field-' + n, n === 25 ? 'large'.repeat(9000) : '<script>witness</script>')));
  const item = { name: 'alpha', slug: 'alpha', headSha: pin, collectionStatus: 'ok', collectionSha256: '1'.repeat(64), collection: c };
  const map = buildOrgMap([item]);
  const dir = path.join(parent, 'reader');
  await publishMetadataPages([item], map, dir);
  const base = path.join(dir, 'projects/alpha/metadata');
  assert.equal(map.repositories[0].collection.readerPath, '/projects/alpha/metadata/');
  const html = file => readFile(path.join(base, file), 'utf8');
  assert.match(await html('index.html'), /Native facts<\/a> <small>\(26\)/);
  assert.match(await html('facts/index.html'), /1\/#r-1/);
  const first = await html('facts/1/index.html');
  assert.match(first, /&lt;script&gt;witness&lt;\/script&gt;/);
  assert.match(first, new RegExp('/blob/' + pin + '/skills/how%20to/SKILL.md#L2'));
  const second = await html('facts/2/index.html');
  assert.match(second, /href="\.\.\/record-26.json"/);
  assert.equal((first + second).match(/<article id=/g).length, 26);
  assert.deepEqual(JSON.parse(await html('facts/record-26.json')), c.facts.at(-1));
  await prepareRetainedPages(map, dir);
  assert.ok(map.repositories[0].collection.readerPath);
  map.sourceSnapshot.stateDigest = 'different snapshot';
  await prepareRetainedPages(map, dir);
  assert.equal(map.repositories[0].collection.readerPath, undefined);
  await assert.rejects(html('index.html'), { code: 'ENOENT' });
});
