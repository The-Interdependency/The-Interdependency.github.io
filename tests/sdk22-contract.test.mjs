import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Android SDK 22 display floor stays progressive-enhancement safe', async () => {
  const css = await readFile('src/assets/css/site.css', 'utf8');
  const base = await readFile('src/_includes/layouts/base.njk', 'utf8');
  const splash = await readFile('src/_includes/layouts/splash.njk', 'utf8');
  const gonol = await readFile('src/artifacts/gonol-relationships.njk', 'utf8');
  const retainedArtifact = await readFile('artifacts/four-cuts-1.html', 'utf8');

  const start = css.indexOf('/* SDK22_FALLBACK_START');
  const end = css.indexOf('/* SDK22_FALLBACK_END */');
  const modern = css.indexOf(':root');
  assert.ok(start === 0, 'SDK 22 fallback must be the first CSS contract');
  assert.ok(end > start && modern > end, 'modern CSS must progressively enhance after the SDK 22 fallback');
  const floor = css.slice(start, end);
  assert.doesNotMatch(floor, /\b(?:var|clamp|min|max|color-mix)\s*\(/i);
  assert.doesNotMatch(floor, /display\s*:\s*grid/i);
  assert.doesNotMatch(floor, /\bgap\s*:/i);
  assert.doesNotMatch(floor, /\baspect-ratio\s*:/i);
  assert.doesNotMatch(floor, /\binset\s*:/i);

  for (const [name, source] of [
    ['base layout', base],
    ['splash layout', splash],
    ['retained artifact', retainedArtifact]
  ]) {
    assert.match(source, /<script src="\/assets\/js\/site\.js" type="module" defer><\/script>/, `${name} must let API 22 ignore modern site enhancement JS`);
  }
  assert.match(gonol, /<script src="\/assets\/js\/gonol-relationships\.js" type="module" defer><\/script>/);
  assert.match(base, /<nav id="primary-nav" class="primary-nav"/);
  assert.match(base, /<main id="content" class="site-main">/);
  assert.match(base, /<noscript>/);
});
