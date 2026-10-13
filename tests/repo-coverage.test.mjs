import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// Exercise the same Nunjucks dependency that Eleventy uses, including nested installs.
const require = createRequire(import.meta.url);
const requireEleventy = createRequire(require.resolve('@11ty/eleventy'));
const nunjucks = requireEleventy('nunjucks');

function templateEnvironment() {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader('src/_includes'), { autoescape: true });
  env.addFilter('statusClass', () => 'status-implemented');
  return env;
}

// Usage: run with `node --test tests/repo-coverage.test.mjs` after generated repo data exists.
test('active repo route count equals displayed public repo count and excludes archived repositories', async () => {
  const repos = JSON.parse(await readFile('src/_data/generated/repos.json', 'utf8'));
  assert.equal(repos.publicRepoCount, repos.generatedRouteCount);
  assert.equal(new Set(repos.repositories.map(repo => repo.slug)).size, repos.repositories.length);
  assert.equal(repos.repositories.some(repo => repo.archived), false);
  assert.ok(Number.isInteger(repos.excludedArchivedRepoCount));
  assert.ok(repos.excludedArchivedRepoCount >= 0);
});

test('license labels preserve reported identifiers and distinguish missing from unclassified metadata', () => {
  const env = templateEnvironment();
  for (const [license, expected] of [
    ['Apache-2.0', 'Apache-2.0'],
    ['MIT', 'MIT'],
    ['AGPL-3.0-or-later', 'AGPL-3.0-or-later'],
    ['MIT OR Apache-2.0', 'MIT OR Apache-2.0'],
    ['  MPL-2.0  ', 'MPL-2.0'],
    ['NOASSERTION', 'Other / unclassified'],
    [null, 'Not detected'],
    [undefined, 'Not detected'],
    ['', 'Not detected'],
    ['   ', 'Not detected'],
    [{ spdx_id: 'BSD-3-Clause' }, 'BSD-3-Clause'],
    [{ spdx_id: 'NOASSERTION', name: 'Other' }, 'Other / unclassified'],
    [{ name: 'Unrecognized license' }, 'Other / unclassified']
  ]) {
    const actual = env.render('components/repo-license.njk', { repo: { license } }).trim();
    assert.equal(actual, expected, `license ${JSON.stringify(license)}`);
  }
});

test('license labels escape repository metadata even when template autoescaping is disabled', () => {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader('src/_includes'), { autoescape: false });
  const html = env.render('components/repo-license.njk', { repo: { license: '<script>alert(1)</script>' } }).trim();
  assert.equal(html, '&lt;script&gt;alert(1)&lt;/script&gt;');
});

test('every repository in the full generated inventory gets one static license label on its card', async () => {
  const repos = JSON.parse(await readFile('src/_data/generated/repos.json', 'utf8'));
  const source = await readFile('src/projects/index.njk', 'utf8');
  const env = templateEnvironment();
  const html = env.renderString(source, { generated: { repos } });
  const cards = [...html.matchAll(/<a class="card" href="\/projects\/([^"/]+)\/">([\s\S]*?)<\/a>/g)];
  assert.equal(cards.length, repos.repositories.length);
  assert.equal((html.match(/class="repo-license"/g) || []).length, repos.repositories.length);
  const bySlug = new Map(repos.repositories.map(repo => [repo.slug, repo]));
  for (const [, slug, card] of cards) {
    const repo = bySlug.get(slug);
    assert.ok(repo, `known repository ${slug}`);
    const label = env.render('components/repo-license.njk', { repo }).trim();
    assert.ok(card.includes(`<strong>License:</strong> ${label}</p>`), `license visible on ${slug}`);
    assert.doesNotMatch(card, /<a\b|<script\b/i);
  }
  assert.doesNotMatch(source, /<script\b/i);
  assert.match(html, /Check each repository/);
});
