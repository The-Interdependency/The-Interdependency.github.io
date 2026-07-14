import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('homepage does not expose a primary source link', async () => {
  const html = await readFile('_site/index.html', 'utf8');
  assert.equal(/<nav[^>]*aria-label="Primary"[\s\S]*href="\/source\//.test(html), false);
  assert.equal(/<nav[^>]*aria-label="Primary"[\s\S]*href="\/source\/"/.test(html), false);
});

test('companion page links intentionally to exact source while source pages carry provenance', async () => {
  const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
  const slug = canon.units[0].routeSlug;
  const companion = await readFile(`_site/way/${slug}/index.html`, 'utf8');
  assert.match(companion, /Read the exact source/);
  assert.doesNotMatch(companion, /<pre class="source-block">/);
  const source = await readFile(`_site/source/${slug}/index.html`, 'utf8');
  assert.match(source, /Canonical unit ID/);
  assert.match(source, /Document hash/);
  assert.match(source, /<pre class="source-block">/);
});
