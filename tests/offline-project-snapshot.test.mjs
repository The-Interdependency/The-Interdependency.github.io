import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

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


test('clean offline project documentation refresh emits unavailable observations without inventing absence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interdependency-project-docs-offline-'));
  try {
    await mkdir(join(root, 'src', '_data', 'generated'), { recursive: true });
    await writeFile(
      join(root, 'src', '_data', 'generated', 'repos.json'),
      JSON.stringify({
        repositories: [{
          name: 'ucns',
          default_branch: 'main',
          head_sha: '0123456789abcdef0123456789abcdef01234567',
          head_committed_at: '2026-09-25T00:00:00Z'
        }]
      }, null, 2)
    );

    const result = await execFileAsync(process.execPath, [projectDocsScriptPath], {
      cwd: root,
      env: { ...process.env, OFFLINE: '1', GITHUB_TOKEN: '' }
    });
    assert.match(result.stdout, /metadata-only offline/);

    const generated = JSON.parse(await readFile(join(root, 'src', '_data', 'generated', 'projectDocs.json'), 'utf8'));
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
    assert.equal(projection.documentation.projectedDocumentCount, 0);
    assert.match(projection.documentation.hmmm.join(' '), /document content remains unavailable/);

    const projectTemplate = await readFile(join(repositoryRoot, 'src', 'projects', 'repo.njk'), 'utf8');
    assert.match(projectTemplate, /Repository documentation was not observed for this build/);
    assert.match(projectTemplate, /no document-content observation is claimed/);
    assert.match(projectTemplate, /repoDocs and repoDocs\.unavailable %\}hmmm/);
    assert.match(projectTemplate, /repoDocs and repoDocs\.unavailable %\}unavailable/);
    assert.doesNotMatch(
      projectTemplate,
      /repoDocs and repoDocs\.unavailable %\}[\s\S]{0,100}projectedDocumentCount/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
