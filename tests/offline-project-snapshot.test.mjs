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

// Usage: this runs the real refresh script in an isolated temporary working tree with OFFLINE=1.
test('offline refresh preserves reviewed last-known-good editorial fields', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interdependency-project-snapshot-'));
  try {
    await mkdir(join(root, 'src', '_data', 'snapshots'), { recursive: true });
    await writeFile(join(root, 'src', '_data', 'project-overrides.yml'), '{}\n');
    await writeFile(
      join(root, 'src', '_data', 'snapshots', 'repos.last-known-good.json'),
      JSON.stringify({
        repositories: [{
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
          default_branch: 'main',
          topics: ['verification'],
          language: 'JavaScript',
          homepage: 'https://example.org',
          visibility: 'public',
          hmmm: ['A reviewed unresolved remains visible.']
        }]
      }, null, 2)
    );

    await execFileAsync(process.execPath, [scriptPath], {
      cwd: root,
      env: { ...process.env, OFFLINE: '1', GITHUB_TOKEN: '' }
    });

    const generated = JSON.parse(await readFile(join(root, 'src', '_data', 'generated', 'repos.json'), 'utf8'));
    const [repo] = generated.repositories;
    assert.equal(generated.fallback, true);
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
