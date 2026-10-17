import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import Eleventy from '@11ty/eleventy';
import { fetchRepositoryPublicProjection, MAX_DOCUMENT_BYTES, MAX_TOTAL_BYTES } from '../scripts/repository-public-projection.mjs';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = join(repositoryRoot, 'scripts', 'fetch-github-org.mjs');
const projectDocsScriptPath = join(repositoryRoot, 'scripts', 'fetch-project-docs.mjs');

// Usage: this runs the real refresh script in an isolated temporary working tree with OFFLINE=1.
test('offline refresh preserves reviewed active fields and excludes archived repositories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interdependency-project-snapshot-'));
  try {
    await mkdir(join(root, 'src', '_data', 'snapshots'), { recursive: true });
    await writeFile(join(root, 'src', '_data', 'project-overrides.yml'), '{}\n');
    await writeFile(
      join(root, 'src', '_data', 'snapshots', 'repos.last-known-good.json'),
      JSON.stringify({
        repositories: [
          {
            name: 'reviewed-project',
            slug: 'reviewed-project',
            html_url: 'https://github.com/The-Interdependency/reviewed-project',
            description: 'Reviewed summary',
            purpose: 'Reviewed purpose',
            status: 'implemented',
            category: 'Mathematics & verification',
            relationships: ['Depends on verified geometry.'],
            primary_artifact: 'https://example.org/artifact',
            docs: 'https://example.org/docs',
            archived: false,
            default_branch: 'main',
            topics: ['verification'],
            language: 'JavaScript',
            homepage: 'https://example.org',
            visibility: 'public',
            hmmm: ['A reviewed unresolved remains visible.']
          },
          {
            name: 'archived-project',
            slug: 'archived-project',
            html_url: 'https://github.com/The-Interdependency/archived-project',
            description: 'Historical project',
            archived: true,
            default_branch: 'main',
            visibility: 'public',
            hmmm: []
          }
        ]
      }, null, 2)
    );

    await execFileAsync(process.execPath, [scriptPath], {
      cwd: root,
      env: { ...process.env, OFFLINE: '1', GITHUB_TOKEN: '' }
    });

    const generated = JSON.parse(await readFile(join(root, 'src', '_data', 'generated', 'repos.json'), 'utf8'));
    assert.equal(generated.fallback, true);
    assert.equal(generated.publicRepoCount, 1);
    assert.equal(generated.generatedRouteCount, 1);
    assert.equal(generated.excludedArchivedRepoCount, 1);
    assert.deepEqual(generated.repositories.map(repo => repo.name), ['reviewed-project']);

    const [repo] = generated.repositories;
    assert.equal(repo.description, 'Reviewed summary');
    assert.equal(repo.purpose, 'Reviewed purpose');
    assert.equal(repo.status, 'implemented');
    assert.equal(repo.category, 'Mathematics & verification');
    assert.deepEqual(repo.relationships, ['Depends on verified geometry.']);
    assert.equal(repo.primary_artifact, 'https://example.org/artifact');
    assert.equal(repo.docs, 'https://example.org/docs');
    assert.deepEqual(repo.hmmm, ['A reviewed unresolved remains visible.']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


const headA = 'a'.repeat(40);
const headB = 'b'.repeat(40);

function repoRow(name, headSha) {
  return {
    name,
    slug: name,
    html_url: 'https://github.com/The-Interdependency/' + name,
    category: 'Test',
    status: 'implemented',
    default_branch: 'main',
    head_sha: headSha,
    head_committed_at: '2026-09-25T00:00:00Z',
    relationships: [],
    hmmm: []
  };
}

function observedProjection(name, headSha) {
  const readmeContent = '# Observed ' + name + '\n\nSnapshot README body.';
  const guideContent = 'Guide body.';
  return {
    schema: 'interdependency.repository-public-projection/0.1.0',
    repository: 'The-Interdependency/' + name,
    name,
    defaultBranch: 'main',
    headSha,
    headCommittedAt: '2026-09-20T00:00:00Z',
    refreshedAt: '2026-09-20T00:00:00Z',
    documentation: {
      readme: {
        path: 'README.md',
        content: readmeContent,
        bytes: Buffer.byteLength(readmeContent),
        sha256: createHash('sha256').update(readmeContent).digest('hex'),
        sourceUrl: 'https://github.com/The-Interdependency/' + name + '/blob/' + headSha + '/README.md'
      },
      documents: [{ path: 'docs/guide.md', content: guideContent, bytes: Buffer.byteLength(guideContent), sha256: createHash('sha256').update(guideContent).digest('hex'), sourceUrl: 'https://github.com/The-Interdependency/' + name + '/blob/' + headSha + '/docs/guide.md' }],
      projectedDocumentCount: 2,
      projectedBytes: Buffer.byteLength(readmeContent) + Buffer.byteLength(guideContent),
      hmmm: []
    },
    msdmd: null,
    fallback: false,
    hmmm: []
  };
}

// Usage: runs the real project-docs refresh with OFFLINE=1 in an isolated working tree.
// snapshot: undefined (no file), a string (raw file bytes), or an object (serialized JSON).
async function runOfflineProjectDocs(repositories, snapshot, { onlineFailure = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'interdependency-project-docs-offline-'));
  await mkdir(join(root, 'src', '_data', 'generated'), { recursive: true });
  await writeFile(join(root, 'src', '_data', 'generated', 'repos.json'), JSON.stringify({ repositories }, null, 2));
  if (snapshot !== undefined) {
    await mkdir(join(root, 'src', '_data', 'snapshots'), { recursive: true });
    await writeFile(
      join(root, 'src', '_data', 'snapshots', 'project-docs.last-known-good.json'),
      typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot, null, 2)
    );
  }
  let executable = projectDocsScriptPath;
  if (onlineFailure) {
    // Run the identical script with only its network dependency replaced.
    await mkdir(join(root, 'scripts'), { recursive: true });
    executable = join(root, 'scripts', 'fetch-project-docs.mjs');
    await copyFile(projectDocsScriptPath, executable);
    await writeFile(join(root, 'scripts', 'repository-public-projection.mjs'),
      'export { selectDocumentationPaths, MAX_DOCUMENT_BYTES, MAX_TOTAL_BYTES } from ' + JSON.stringify(pathToFileURL(join(repositoryRoot, 'scripts', 'repository-public-projection.mjs')).href) + ';\n' +
      'export async function fetchRepositoryPublicProjection() { throw new Error("fixture network failure"); }\n' +
      'export function isRepositoryNotPublicError() { return false; }\n');
  }
  const result = await execFileAsync(process.execPath, [executable], {
    cwd: root,
    env: { ...process.env, OFFLINE: onlineFailure ? '0' : '1', GITHUB_TOKEN: '' }
  });
  const generated = JSON.parse(await readFile(join(root, 'src', '_data', 'generated', 'projectDocs.json'), 'utf8'));
  return { root, stdout: result.stdout, generated };
}

// Usage: renders the real src/projects/repo.njk through Eleventy with a minimal layout and
// stand-in filters, returning rendered HTML keyed by repository slug.
async function renderProjectPages(root, repositories, projectDocs) {
  const input = join(root, 'render-src');
  await mkdir(join(input, 'projects'), { recursive: true });
  await mkdir(join(input, '_includes', 'layouts'), { recursive: true });
  await mkdir(join(input, '_data', 'generated'), { recursive: true });
  await copyFile(join(repositoryRoot, 'src', 'projects', 'repo.njk'), join(input, 'projects', 'repo.njk'));
  await writeFile(join(input, '_includes', 'layouts', 'base.njk'), '{{ content | safe }}\n');
  await writeFile(join(input, '_data', 'generated', 'repos.json'), JSON.stringify({ repositories }));
  await writeFile(join(input, '_data', 'generated', 'projectDocs.json'), JSON.stringify(projectDocs));
  await writeFile(join(input, '_data', 'generated', 'orgMsdmd.json'), JSON.stringify({ repositories: [] }));
  const configPath = join(root, 'render.config.mjs');
  await writeFile(configPath, `export default function (eleventyConfig) {
  eleventyConfig.addFilter('where', (items, key, value) => (items || []).filter(item => item?.[key] === value));
  eleventyConfig.addFilter('statusClass', value => 'status-' + String(value || 'hmmm'));
  eleventyConfig.addFilter('projectDocMarkdown', document => '<div data-test-readme>' + String(document?.content || '') + '</div>');
}
`);
  const eleventy = new Eleventy(input, join(root, 'render-out'), { quietMode: true, configPath });
  const pages = await eleventy.toJSON();
  return Object.fromEntries(pages.map(page => [page.url.replace(/^\/projects\/|\/$/g, ''), page.content]));
}

function provenance(html, field) {
  const match = html.match(new RegExp('data-project-doc-' + field + '>([^<]*)<'));
  return match ? match[1] : null;
}

test('clean offline project documentation refresh emits unavailable observations without inventing absence', async () => {
  const repos = [repoRow('ucns', '0123456789abcdef0123456789abcdef01234567')];
  const { root, stdout, generated } = await runOfflineProjectDocs(repos);
  try {
    assert.match(stdout, /metadata-only offline \(missing snapshot\)/);
    assert.equal(generated.fallback, false);
    assert.equal(generated.fallbackCount, 0);
    assert.equal(generated.snapshotAt, null);
    assert.match(generated.hmmm.join(' '), /no last-known-good project documentation snapshot exists/);

    const projection = generated.byRepository.ucns;
    assert.equal(projection.unavailable, true);
    assert.equal(projection.headSha, null);
    assert.equal(projection.headCommittedAt, null);
    assert.equal(projection.documentation.readme, null);
    assert.deepEqual(projection.documentation.documents, []);
    assert.equal(projection.documentation.projectedDocumentCount, null);
    assert.match(projection.documentation.hmmm.join(' '), /document content remains unavailable/);

    const pages = await renderProjectPages(root, repos, generated);
    const html = pages.ucns;
    assert.match(html, /Repository documentation was not observed for this build/);
    assert.match(html, /no document-content observation is claimed/);
    assert.doesNotMatch(html, /No root README\.md/);
    assert.doesNotMatch(html, /copied from the exact repository head/);
    assert.doesNotMatch(html, /build-time exact-head projection remains/);
    assert.match(html, /The displayed content stays in place if refresh fails/);
    assert.equal(provenance(html, 'count'), 'hmmm');
    assert.equal(provenance(html, 'mode'), 'unavailable');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('offline snapshot entry at the matching head is retained per repository as same-head fallback', async () => {
  const repos = [repoRow('ucns', headA)];
  const snapshot = { snapshotAt: '2026-09-20T00:00:00Z', fallback: false, byRepository: { ucns: observedProjection('ucns', headA) }, hmmm: [] };
  const { root, stdout, generated } = await runOfflineProjectDocs(repos, snapshot);
  try {
    assert.match(stdout, /1 same-head fallback/);
    assert.equal(generated.fallback, true);
    assert.equal(generated.fallbackCount, 1);
    assert.equal(generated.snapshotAt, '2026-09-20T00:00:00Z');
    const projection = generated.byRepository.ucns;
    assert.equal(projection.fallback, true);
    assert.equal(projection.headSha, headA);
    assert.equal(projection.unavailable, undefined);

    const html = (await renderProjectPages(root, repos, generated)).ucns;
    assert.match(html, /Snapshot README body\./);
    assert.match(html, /retained from a last-known-good projection observed at the same repository head/);
    assert.equal(provenance(html, 'head'), headA);
    assert.equal(provenance(html, 'count'), '2');
    assert.equal(provenance(html, 'mode'), 'same-head last-known-good fallback');
    assert.doesNotMatch(html, /exact-head build observation/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('offline snapshot entry at a stale head is not reused and renders unavailable, not absence', async () => {
  const repos = [repoRow('ucns', headB)];
  const snapshot = { snapshotAt: '2026-09-20T00:00:00Z', byRepository: { ucns: observedProjection('ucns', headA) }, hmmm: [] };
  const { root, generated } = await runOfflineProjectDocs(repos, snapshot);
  try {
    assert.equal(generated.fallback, false);
    assert.equal(generated.fallbackCount, 0);
    const projection = generated.byRepository.ucns;
    assert.equal(projection.unavailable, true);
    assert.equal(projection.headSha, null);
    assert.equal(projection.documentation.projectedDocumentCount, null);
    assert.match(projection.hmmm.join(' '), /different head/);

    const html = (await renderProjectPages(root, repos, generated)).ucns;
    assert.doesNotMatch(html, /Snapshot README body\./);
    assert.doesNotMatch(html, /No root README\.md/);
    assert.doesNotMatch(html, /exact-head build observation/);
    assert.match(html, /different head than the current repository head/);
    assert.equal(provenance(html, 'head'), 'hmmm');
    assert.equal(provenance(html, 'count'), 'hmmm');
    assert.equal(provenance(html, 'mode'), 'unavailable');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('offline mixed snapshot keeps the matching repository and marks the missing repository unavailable', async () => {
  const repos = [repoRow('present-project', headA), repoRow('missing-project', headB)];
  const snapshot = { snapshotAt: '2026-09-20T00:00:00Z', byRepository: { 'present-project': observedProjection('present-project', headA) }, hmmm: [] };
  const { root, generated } = await runOfflineProjectDocs(repos, snapshot);
  try {
    assert.deepEqual(Object.keys(generated.byRepository).sort(), ['missing-project', 'present-project']);
    assert.equal(generated.fallbackCount, 1);
    assert.equal(generated.byRepository['present-project'].fallback, true);
    assert.equal(generated.byRepository['missing-project'].unavailable, true);
    assert.match(generated.byRepository['missing-project'].hmmm.join(' '), /holds no observed documentation for this repository/);

    const pages = await renderProjectPages(root, repos, generated);
    assert.equal(provenance(pages['present-project'], 'mode'), 'same-head last-known-good fallback');
    assert.equal(provenance(pages['missing-project'], 'mode'), 'unavailable');
    assert.equal(provenance(pages['missing-project'], 'count'), 'hmmm');
    assert.doesNotMatch(pages['missing-project'], /copied from the exact repository head/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('corrupt offline snapshot is reported as corrupt, not as absent, and reuses nothing', async () => {
  const repos = [repoRow('ucns', headA)];
  const { root, stdout, generated } = await runOfflineProjectDocs(repos, '{"byRepository": {"ucns": ');
  try {
    assert.match(stdout, /metadata-only offline \(corrupt snapshot\)/);
    assert.equal(generated.fallback, false);
    assert.equal(generated.snapshotAt, null);
    assert.match(generated.hmmm.join(' '), /snapshot is corrupt and was ignored/);
    assert.doesNotMatch(generated.hmmm.join(' '), /no last-known-good project documentation snapshot exists/);
    const projection = generated.byRepository.ucns;
    assert.equal(projection.unavailable, true);
    assert.match(projection.hmmm.join(' '), /corrupt and was ignored/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('repository with no emitted documentation projection renders unavailable rather than exact-head', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interdependency-project-docs-render-'));
  try {
    const repos = [repoRow('ucns', headA)];
    const html = (await renderProjectPages(root, repos, { byRepository: {} })).ucns;
    assert.match(html, /no documentation projection was emitted/);
    assert.doesNotMatch(html, /copied from the exact repository head/);
    assert.doesNotMatch(html, /No root README\.md/);
    assert.equal(provenance(html, 'head'), 'hmmm');
    assert.equal(provenance(html, 'count'), 'hmmm');
    assert.equal(provenance(html, 'mode'), 'unavailable');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// Usage: exercise each corrupted retained shape through both real fallback paths.
for (const onlineFailure of [false, true]) {
  test(`${onlineFailure ? 'online failed refresh' : 'offline refresh'} rejects malformed matching-head snapshots`, async () => {
    const malformed = [
      ['object-hmmm', value => { value.hmmm = {}; }],
      ['string-hmmm', value => { value.hmmm = 'not a list'; }],
      ['missing-documentation', value => { delete value.documentation; }],
      ['array-documentation', value => { value.documentation = []; }],
      ['invalid-document-hmmm', value => { value.documentation.hmmm = {}; }],
      ['missing-documents', value => { delete value.documentation.documents; }],
      ['invalid-document', value => { value.documentation.documents = [null]; }],
      ['missing-readme', value => { delete value.documentation.readme; }],
      ['missing-content', value => { delete value.documentation.readme.content; }],
      ['invalid-count', value => { value.documentation.projectedDocumentCount = 0; }],
      ['invalid-bytes', value => { value.documentation.projectedBytes = null; }],
      ['missing-document-bytes', value => { delete value.documentation.documents[0].bytes; }],
      ['string-document-bytes', value => { value.documentation.documents[0].bytes = '11'; }],
      ['negative-document-bytes', value => { value.documentation.documents[0].bytes = -1; }],
      ['unsafe-document-bytes', value => { value.documentation.documents[0].bytes = Number.MAX_SAFE_INTEGER + 1; }],
      ['wrong-document-bytes', value => { value.documentation.documents[0].bytes += 1; }],
      ['missing-readme-bytes', value => { delete value.documentation.readme.bytes; }],
      ['wrong-aggregate-bytes', value => { value.documentation.projectedBytes += 1; }],
      ['missing-document-digest', value => { delete value.documentation.documents[0].sha256; }],
      ['malformed-document-digest', value => { value.documentation.documents[0].sha256 = 'not-a-digest'; }],
      ['missing-readme-digest', value => { delete value.documentation.readme.sha256; }],
      ['mismatched-document-digest', value => { value.documentation.documents[0].sha256 = '0'.repeat(64); }],
      ['same-size-corrupt-document', value => { value.documentation.documents[0].content = 'Other body.'; }],
      ['same-size-corrupt-readme', value => { value.documentation.readme.content = value.documentation.readme.content.replace('Snapshot', 'Tampered'); }],
      ['wrong-document-source', value => { value.documentation.documents[0].sourceUrl = 'https://github.com/The-Interdependency/other/blob/' + headA + '/docs/guide.md'; }],
      ['wrong-readme-source-head', value => { value.documentation.readme.sourceUrl = value.documentation.readme.sourceUrl.replace(headA, headB); }],
      ['duplicate-document-path', value => { value.documentation.documents.push({ ...value.documentation.documents[0] }); value.documentation.projectedDocumentCount += 1; value.documentation.projectedBytes += value.documentation.documents[0].bytes; }],
      ['duplicate-readme-path', value => { value.documentation.documents.push({ ...value.documentation.readme }); value.documentation.projectedDocumentCount += 1; value.documentation.projectedBytes += value.documentation.readme.bytes; }],
      ['wrong-readme-path', value => { value.documentation.readme.path = 'docs/guide.md'; value.documentation.readme.sourceUrl = value.documentation.documents[0].sourceUrl; }],
      ['outside-document-selection', value => { const doc = value.documentation.documents[0]; doc.path = 'src/guide.md'; doc.sourceUrl = 'https://github.com/' + value.repository + '/blob/' + headA + '/src/guide.md'; }],
      ['traversing-document-path', value => { const doc = value.documentation.documents[0]; doc.path = 'docs/../guide.md'; doc.sourceUrl = 'https://github.com/' + value.repository + '/blob/' + headA + '/docs/../guide.md'; }],
      ['oversized-document', value => { const doc = value.documentation.documents[0]; doc.content = 'x'.repeat(MAX_DOCUMENT_BYTES + 1); doc.bytes = Buffer.byteLength(doc.content); doc.sha256 = createHash('sha256').update(doc.content).digest('hex'); value.documentation.projectedBytes = value.documentation.readme.bytes + doc.bytes; }],
      ['excess-document-count', value => { const doc = value.documentation.documents[0]; value.documentation.documents = Array.from({ length: 33 }, (_, i) => ({ ...doc, path: 'docs/guide-' + i + '.md', sourceUrl: 'https://github.com/' + value.repository + '/blob/' + headA + '/docs/guide-' + i + '.md' })); value.documentation.projectedDocumentCount = 34; value.documentation.projectedBytes = value.documentation.readme.bytes + 33 * doc.bytes; }],
      ['excess-aggregate-bytes', value => { const content = 'x'.repeat(MAX_DOCUMENT_BYTES); const bytes = Buffer.byteLength(content); const sha256 = createHash('sha256').update(content).digest('hex'); const count = Math.floor(MAX_TOTAL_BYTES / bytes) + 1; value.documentation.documents = Array.from({ length: count }, (_, i) => ({ path: 'docs/large-' + i + '.md', sourceUrl: 'https://github.com/' + value.repository + '/blob/' + headA + '/docs/large-' + i + '.md', content, bytes, sha256 })); value.documentation.projectedDocumentCount = count + 1; value.documentation.projectedBytes = value.documentation.readme.bytes + count * bytes; }],
      ['ill-formed-path', value => { value.documentation.documents[0].path = 'docs/\ud800.md'; }],
      ['ill-formed-content', value => { const doc = value.documentation.documents[0]; doc.content = '\ud800'; doc.bytes = Buffer.byteLength(doc.content); doc.sha256 = createHash('sha256').update(doc.content).digest('hex'); value.documentation.projectedBytes = value.documentation.readme.bytes + doc.bytes; }],
      ['wrong-repository', value => { value.repository = 'The-Interdependency/other'; }]
    ];
    const repos = [repoRow('good-project', headA), ...malformed.map(([name]) => repoRow(name, headA))];
    const byRepository = { 'good-project': observedProjection('good-project', headA) };
    for (const [name, corrupt] of malformed) {
      byRepository[name] = observedProjection(name, headA);
      corrupt(byRepository[name]);
    }
    const { root, generated } = await runOfflineProjectDocs(repos, { byRepository }, { onlineFailure });
    try {
      assert.equal(generated.fallbackCount, 1);
      assert.equal(generated.byRepository['good-project'].fallback, true);
      const pages = await renderProjectPages(root, repos, generated);
      for (const [name] of malformed) {
        const projection = generated.byRepository[name];
        assert.equal(projection.unavailable, true, name);
        assert.equal(projection.fallback, false, name);
        assert.equal(projection.headSha, null, name);
        assert.equal(projection.documentation.projectedDocumentCount, null, name);
        assert.equal(provenance(pages[name], 'mode'), 'unavailable', name);
        assert.equal(provenance(pages[name], 'count'), 'hmmm', name);
        assert.doesNotMatch(pages[name], /Snapshot README body|No root README\.md|exact-head build observation/, name);
        if (!onlineFailure) assert.match(projection.hmmm.join(' '), /structurally invalid/, name);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test(`${onlineFailure ? 'online failed refresh' : 'offline refresh'} retains a valid observed empty documentation set`, async () => {
    const repos = [repoRow('empty-project', headA)];
    const projection = observedProjection('empty-project', headA);
    projection.documentation = { readme: null, documents: [], projectedDocumentCount: 0, projectedBytes: 0, hmmm: [] };
    const { root, generated } = await runOfflineProjectDocs(repos, { byRepository: { 'empty-project': projection } }, { onlineFailure });
    try {
      assert.equal(generated.fallbackCount, 1);
      assert.equal(generated.byRepository['empty-project'].fallback, true);
      const html = (await renderProjectPages(root, repos, generated))['empty-project'];
      assert.equal(provenance(html, 'count'), '0');
      assert.equal(provenance(html, 'mode'), 'same-head last-known-good fallback');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

// Usage: valid UTF-8 bytes and percent-encoded exact-source links must remain eligible.
for (const onlineFailure of [false, true]) {
  test(`${onlineFailure ? 'online failed refresh' : 'offline refresh'} retains valid Unicode documents`, async () => {
    const repos = [repoRow('unicode-project', headA)];
    const projection = observedProjection('unicode-project', headA);
    const document = projection.documentation.documents[0];
    document.path = 'docs/é guide.md';
    document.content = 'Unicode witness: Ω 🧭';
    document.bytes = Buffer.byteLength(document.content);
    document.sha256 = createHash('sha256').update(document.content).digest('hex');
    document.sourceUrl = 'https://github.com/The-Interdependency/unicode-project/blob/' + headA + '/docs/%C3%A9%20guide.md';
    projection.documentation.projectedBytes = projection.documentation.readme.bytes + document.bytes;
    const { root, generated } = await runOfflineProjectDocs(repos, { byRepository: { 'unicode-project': projection } }, { onlineFailure });
    try {
      assert.equal(generated.fallbackCount, 1);
      assert.deepEqual(generated.byRepository['unicode-project'].documentation, projection.documentation);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('matching invalid head identifiers never qualify as observed fallback', async () => {
  const repos = [repoRow('invalid-head', 'not-a-git-sha')];
  const snapshot = { byRepository: { 'invalid-head': observedProjection('invalid-head', 'not-a-git-sha') } };
  for (const onlineFailure of [false, true]) {
    const { root, generated } = await runOfflineProjectDocs(repos, snapshot, { onlineFailure });
    try {
      assert.equal(generated.fallbackCount, 0);
      assert.equal(generated.byRepository['invalid-head'].unavailable, true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

// Usage: a null dedicated README slot cannot establish root README absence.
// Git can contain case-variant root names, and the producer can omit the selected
// README after a 404 while retaining another root README in the document index.
for (const omitSelectedReadme of [false, true]) {
  test(`actual producer case-variant README output remains valid when selected README is ${omitSelectedReadme ? 'omitted' : 'present'}`, async () => {
    const originalFetch = globalThis.fetch;
    let projection;
    globalThis.fetch = async target => {
      const url = new URL(target);
      if (url.origin === 'https://api.github.com') {
        return { ok: true, json: async () => url.pathname.includes('/git/trees/')
          ? { tree: ['README.md', 'readme.md', 'docs/guide.md'].map(path => ({ type: 'blob', path })) }
          : { private: false, visibility: 'public', default_branch: 'main' } };
      }
      if (omitSelectedReadme && url.pathname.endsWith('/README.md')) return { ok: false, status: 404 };
      return { ok: true, text: async () => 'Observed content for ' + url.pathname };
    };
    try {
      projection = await fetchRepositoryPublicProjection('case-project', { headSha: headA, includeDocumentation: true, includeMsdmd: false });
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.equal(projection.documentation.readme === null, omitSelectedReadme);
    assert.ok(projection.documentation.documents.some(document => document.path === 'readme.md'));
    const repos = [repoRow('case-project', headA)];
    for (const onlineFailure of [false, true]) {
      const { root, generated } = await runOfflineProjectDocs(repos, { byRepository: { 'case-project': projection } }, { onlineFailure });
      try {
        assert.equal(generated.fallbackCount, 1);
        const html = (await renderProjectPages(root, repos, generated))['case-project'];
        assert.doesNotMatch(html, /No root README\.md/);
        assert.match(html, /<code>readme\.md<\/code>/);
        if (omitSelectedReadme) assert.match(html, /No README is rendered in this section/);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  });
}

test('a README carried only in the document index does not imply root README absence', async () => {
  const projection = observedProjection('indexed-readme', headA);
  projection.documentation.documents.unshift(projection.documentation.readme);
  projection.documentation.readme = null;
  const repos = [repoRow('indexed-readme', headA)];
  const { root, generated } = await runOfflineProjectDocs(repos, { byRepository: { 'indexed-readme': projection } });
  try {
    assert.equal(generated.fallbackCount, 1);
    const html = (await renderProjectPages(root, repos, generated))['indexed-readme'];
    assert.match(html, /<code>README\.md<\/code>/);
    assert.match(html, /No README is rendered in this section/);
    assert.doesNotMatch(html, /No root README\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
