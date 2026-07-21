// Usage: run `npm run test:e2e` after `npm run build`; Playwright starts the loopback static server.
// Evidence boundary: checks route reachability and visible content, not external DNS or Pages freshness.
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const canon = JSON.parse(readFileSync('src/_data/generated/canon.json', 'utf8'));
const articleLab = JSON.parse(readFileSync('src/_data/article_lab.json', 'utf8'));
const labRoutes = articleLab.map(record => {
  const unit = canon.units.find(candidate => candidate.id === record.unit_id);
  if (!unit) throw new Error(`missing Lab canon unit ${record.unit_id}`);
  return { ...record, route: `/lab/${unit.routeSlug}/` };
});

const routes = [
  ['/', /A way through complexity/],
  ['/preamble/', /Humanity faces extinction/],
  ['/articles/', /Publication drafts/],
  ['/articles/article-two/', /Freedom without abandonment/],
  ['/way/', /The Way/],
  ['/lab/', /Rights Article laboratories/],
  ['/source/', /Source/],
  ['/projects/', /Projects/],
  ['/artifacts/', /Artifacts/],
  ['/fallback/', /Emergency static edition/]
];

test('primary public routes render meaningful headings', async ({ page }) => {
  for (const [route, heading] of routes) {
    const response = await page.goto(route);
    expect(response?.ok(), `${route} should return a successful response`).toBeTruthy();
    await expect(page.locator('body')).toContainText(heading);
  }
});

test('Preamble is one click from the public entrance and primary navigation', async ({ page }) => {
  await page.goto('/');
  const heroLink = page.locator('main a[href="/preamble/"]', { hasText: 'Read the Preamble' }).first();
  const navLink = page.locator('nav[aria-label="Primary navigation"] a[href="/preamble/"]');
  await expect(heroLink).toBeVisible();
  await expect(navLink).toBeVisible();
  await heroLink.click();
  await expect(page).toHaveURL(/\/preamble\/$/);
  await expect(page.locator('h1')).toHaveText('Preamble');
  await expect(page.locator('.source-block')).toContainText('Humanity faces extinction');
});

test('all eight rights articles are reachable from the article index', async ({ page }) => {
  await page.goto('/articles/');
  for (const word of ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']) {
    const link = page.locator(`a[href="/articles/article-${word}/"]`).first();
    await expect(link).toBeVisible();
  }
});

test('all eight Rights Article Labs are indexed and expose the shared contact structure', async ({ page }) => {
  await page.goto('/lab/');
  for (const record of labRoutes) await expect(page.locator(`a[href="${record.route}"]`)).toBeVisible();

  await page.goto(labRoutes[0].route);
  await expect(page.locator('body')).toContainText('Reductio ad absurdum');
  await expect(page.locator('body')).toContainText('Worst practices and best practices');
  await expect(page.locator('body')).toContainText('Applications by domain');
  await expect(page.locator('body')).toContainText('Child craft');
  await expect(page.locator('body')).toContainText('Research field');
});
