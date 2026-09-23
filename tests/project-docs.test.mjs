import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectDocumentationPaths } from '../scripts/repository-public-projection.mjs';

test('documentation selection keeps README first, root docs next, docs tree next, and excludes control metadata', () => {
  const selected = selectDocumentationPaths([
    { type: 'blob', path: 'docs/zeta.md' },
    { type: 'blob', path: '.agents/skills/msdmd/SKILL.md' },
    { type: 'blob', path: 'README.md' },
    { type: 'blob', path: 'ARCHITECTURE.md' },
    { type: 'blob', path: 'docs/alpha.md' },
    { type: 'blob', path: '.github/pull_request_template.md' },
    { type: 'blob', path: 'src/code.js' }
  ]);
  assert.equal(selected.readme, 'README.md');
  assert.deepEqual(selected.paths, ['README.md', 'ARCHITECTURE.md', 'docs/alpha.md', 'docs/zeta.md']);
  assert.equal(selected.omittedCount, 0);
});

test('project page exposes static exact-head documents and a per-repository live MSDMD refresh', async () => {
  const [source, sitrep] = await Promise.all([
    readFile('src/projects/repo.njk', 'utf8'),
    readFile('src/sitrep/index.njk', 'utf8')
  ]);
  assert.match(source, /generated\.projectDocs\.byRepository\[repo\.name\]/);
  assert.match(source, /data-msdmd-refresh/);
  assert.match(source, /data-project-docs-content/);
  assert.match(source, /projectDocMarkdown/);
  assert.doesNotMatch(source, /\{\{\s*document\s*\|\s*projectDocMarkdown/);
  assert.match(source, /The static page indexes exact-head documents/);
  assert.match(sitrep, /data-repository-refresh-scope/);
  assert.match(sitrep, /data-msdmd-refresh data-repository="{{ project\.name }}"/);
});

test('refresh data pipeline builds project documentation after repository heads are captured', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.match(pkg.scripts['refresh:data'], /refresh:github.*refresh:project-docs.*refresh:msdmd/);
  assert.equal(pkg.scripts['refresh:project-docs'], 'node scripts/fetch-project-docs.mjs');
});
