// Usage: node --test tests/forge.test.mjs; FORGE_SOURCE_ROOT adds exact-source replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { forgeSourceUrl } from '../.eleventy.js';
const forge = JSON.parse(readFileSync('src/_data/forge.json', 'utf8'));
const require = createRequire(import.meta.url);
const nunjucks = createRequire(require.resolve('@11ty/eleventy'))('nunjucks');
const env = new nunjucks.Environment(new nunjucks.FileSystemLoader('src/_includes'), { autoescape: false });
env.addFilter('forgeSourceUrl', forgeSourceUrl);
const render = (data = forge, head = forge.source.commit) => env.render('components/forge.njk', { forge: data, repo: { head_sha: head } });

test('Forge retains exact source identities and independent authority boundaries', () => {
  assert.match(forge.source.commit, /^[a-f0-9]{40}$/);
  assert.equal(forge.source.url, `https://github.com/The-Interdependency/stack/blob/${forge.source.commit}/`);
  assert.equal(forge.manifest.boundaries.authority_transfer, false);
  assert.equal(forge.manifest.boundaries.proof_status_transfer, false);
  assert.equal(new Set(forge.research.map(row => row.id)).size, forge.research.length);
  const paths = new Set(forge.source.sources.map(source => source.path));
  for (const source of forge.source.sources) {
    assert.match(source.blob, /^[a-f0-9]{40}$/);
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
  }
  for (const work of forge.research) {
    assert.ok(paths.has(work.path), `source witness for ${work.id}`);
    for (const field of ['purpose', 'standing', 'relations', 'hmmm']) assert.ok(work[field]);
  }
  for (const graduate of forge.manifest.repositories.filter(row => row.lifecycle === 'graduated')) {
    assert.ok(paths.has(graduate.transition_receipt));
    assert.match(graduate.release.url, /^https:\/\/github.com\/The-Interdependency\//);
  }
});

test('graduation is rendered only from the source lifecycle and the snapshot stays dated', () => {
  const html = render();
  for (const id of ['brought-together', 'in-the-forge', 'graduated', 'returned-upstream']) assert.ok(html.includes(`id="${id}"`));
  assert.equal((html.match(/class="forge-work" id=/g) || []).length, forge.research.length);
  assert.match(html, /retained editorial snapshot, not a live status feed/);
  assert.match(html, /no consolidated ledger of completed upstream returns/);
  const ungraduated = structuredClone(forge);
  ungraduated.manifest.repositories.forEach(row => { delete row.lifecycle; });
  assert.doesNotMatch(render(ungraduated), /Explore independent release/);
  assert.match(render(forge, '0'.repeat(40)), /different source commits/);
  assert.doesNotMatch(html, /different source commits/);
});

test('companion metadata cannot introduce executable HTML', () => {
  const unsafe = structuredClone(forge);
  unsafe.research[0].title = '<script>alert(1)</script>';
  unsafe.manifest.repositories[0].authority = '<img src=x onerror=alert(1)>';
  const html = render(unsafe);
  assert.ok(!html.includes(unsafe.research[0].title));
  assert.ok(!html.includes(unsafe.manifest.repositories[0].authority));
  assert.match(html, /&lt;script&gt;/);
});

test('pinned source replay matches every referenced byte', { skip: !process.env.FORGE_SOURCE_ROOT }, () => {
  const root = process.env.FORGE_SOURCE_ROOT;
  assert.equal(execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), forge.source.commit);
  for (const source of forge.source.sources) {
    const bytes = readFileSync(`${root}/${source.path}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, source.path);
    assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), source.blob, source.path);
  }
  assert.deepEqual(JSON.parse(readFileSync(`${root}/stack-manifest.json`, 'utf8')), forge.manifest);
});

test('source links reject attribute injection, foreign origins and traversal at render time', () => {
  for (const path of ['README.md" onclick="alert(1)', '../README.md', 'https://example.org', 'README.md?x=1']) {
    assert.throws(() => forgeSourceUrl(forge.source, path), /invalid Forge/);
    const unsafe = structuredClone(forge);
    unsafe.research[0].path = path;
    assert.throws(() => render(unsafe), /invalid Forge/);
  }
  assert.throws(() => forgeSourceUrl({ ...forge.source, url: 'javascript:alert(1)' }, 'README.md'), /invalid Forge/);
  assert.equal(forgeSourceUrl(forge.source, 'README.md#usage-guidance'), forge.source.url + 'README.md#usage-guidance');
});
