import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Usage: run with `node --test tests/repo-coverage.test.mjs` after generated repo data exists.
test('active repo route count equals displayed public repo count and excludes archived repositories', async () => {
  const repos = JSON.parse(await readFile('src/_data/generated/repos.json', 'utf8'));
  assert.equal(repos.publicRepoCount, repos.generatedRouteCount);
  assert.equal(new Set(repos.repositories.map(repo => repo.slug)).size, repos.repositories.length);
  assert.equal(repos.repositories.some(repo => repo.archived), false);
  assert.ok(Number.isInteger(repos.excludedArchivedRepoCount));
  assert.ok(repos.excludedArchivedRepoCount >= 0);
});
