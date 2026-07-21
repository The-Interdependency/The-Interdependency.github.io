// Usage: run `npm run test:a11y` after `npm run build`; serious and critical axe findings fail.
// Evidence boundary: automated axe checks do not replace manual keyboard, screen-reader, or cognitive-access review.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const canon = JSON.parse(readFileSync('src/_data/generated/canon.json', 'utf8'));
const articleLab = JSON.parse(readFileSync('src/_data/article_lab.json', 'utf8'));
const firstLabUnit = canon.units.find(unit => unit.id === articleLab[0].unit_id);
if (!firstLabUnit) throw new Error(`missing Lab canon unit ${articleLab[0].unit_id}`);

for (const route of ['/', '/home/', '/preamble/', '/articles/', '/articles/article-two/', '/way/', '/lab/', `/lab/${firstLabUnit.routeSlug}/`, '/projects/']) {
  test(`${route} has no serious or critical automated accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await page.addScriptTag({ path: axePath });
    const results = await page.evaluate(async () => globalThis.axe.run(document, {
      resultTypes: ['violations'],
      rules: { region: { enabled: false } }
    }));
    const blocking = results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact));
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}
