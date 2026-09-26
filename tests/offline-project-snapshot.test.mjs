import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import Eleventy from '@11ty/eleventy';

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
        content: '# Observed ' + name + '\n\nSnapshot README body.',
        sourceUrl: 'https://github.com/The-Interdependency/' + name + '/blob/' + headSha + '/README.md'
      },
      documents: [{ path: 'docs/guide.md', bytes: 42, sourceUrl: 'https://github.com/The-Interdependency/' + name + '/blob/' + headSha + '/docs/guide.md' }],
      projectedDocumentCount: 1,
      projectedBytes: 42,
      hmmm: []
    },
    msdmd: null,
    fallback: false,
    hmmm: []
  };
}

// Usage: runs the real project-docs refresh with OFFLINE=1 in an isolated working tree.
// snapshot: undefined (no file), a string (raw file bytes), or an object (serialized JSON).
async function runOfflineProjectDocs(repositories, snapshot) {
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
  const result = await execFileAsync(process.execPath, [projectDocsScriptPath], {
    cwd: root,
    env: { ...process.env, OFFLINE: '1', GITHUB_TOKEN: '' }
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
    assert.equal(provenance(html, 'count'), '1');
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
