import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('legacy standalone pages are redirected into unified navigation', async () => {
  const legacy = JSON.parse(await readFile('src/_data/generated/legacyRoutes.json', 'utf8'));
  assert.ok(legacy.count > 0);
  assert.ok(legacy.routes.every((route) => route.status === 'deprecated'));
  assert.ok(legacy.routes.some((route) => route.source === '/canon/article-1.html' && route.target === '/lab/'));
  const redirect = await readFile('_site/canon/article-1.html', 'utf8');
  assert.match(redirect, /Deprecated page moved/);
  assert.match(redirect, /url=\/lab\//);
  const index = await readFile('_site/legacy/index.html', 'utf8');
  assert.match(index, /Deprecated legacy pages/);
});
