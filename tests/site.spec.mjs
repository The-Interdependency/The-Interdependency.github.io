// Usage: run `npm run test:e2e` after `npm run build`; Playwright starts the loopback static server.
// Evidence boundary: checks route reachability and visible content, not external DNS or Pages freshness.
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const canon = JSON.parse(readFileSync('src/_data/generated/canon.json', 'utf8'));
const textbook = JSON.parse(readFileSync('src/_data/generated/textbook.json', 'utf8'));
const articleLab = JSON.parse(readFileSync('src/_data/article_lab.json', 'utf8'));
const labRoutes = articleLab.map(record => {
  const unit = canon.units.find(candidate => candidate.id === record.unit_id);
  if (!unit) throw new Error(`missing Lab canon unit ${record.unit_id}`);
  return { ...record, route: `/lab/${unit.routeSlug}/` };
});

const routes = [
  ['/', /You are not alone/],
  ['/home/', /A way through complexity/],
  ['/preamble/', /Humanity faces extinction/],
  ['/chapters/', /The Interdependency Textbook/],
  ['/chapters/chapter-zero/', /Zero is not nothing/],
  ['/chapters/chapter-seven/', /theory under development/],
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

test('Awakening is the public splash and preserves one-click continuation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.awakening-splash')).toBeVisible();
  await expect(page.locator('h1')).toHaveText('Awakening');
  await expect(page.locator('.awakening-text')).toContainText('You are not alone');
  await expect(page.locator('.site-header')).toHaveCount(0);

  const preambleLink = page.locator('a[href="/preamble/"]', { hasText: 'Read the Preamble' }).first();
  const homeLink = page.locator('a[href="/home/"]', { hasText: 'Enter the living system' }).first();
  await expect(preambleLink).toBeVisible();
  await expect(homeLink).toBeVisible();

  await preambleLink.click();
  await expect(page).toHaveURL(/\/preamble\/$/);
  await expect(page.locator('h1')).toHaveText('Preamble');
  await expect(page.locator('.source-block')).toContainText('Humanity faces extinction');
});

test('the knowledge-system home links to Awakening, Preamble, and the distributed textbook', async ({ page }) => {
  await page.goto('/home/');
  await expect(page.locator('a.brand')).toHaveAttribute('href', '/home/');
  await expect(page.locator('nav[aria-label="Primary navigation"] a[href="/"]', { hasText: 'Awakening' })).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary navigation"] a[href="/preamble/"]', { hasText: 'Preamble' })).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary navigation"] a[href="/chapters/"]', { hasText: 'Textbook' })).toBeVisible();
  await expect(page.locator('main a[href="/chapters/"]').first()).toBeVisible();
});

test('chapters zero through seven are indexed, source-bound, and sequentially navigable', async ({ page }) => {
  await page.goto('/chapters/');
  for (const chapter of textbook.chapters) {
    await expect(page.locator(`a[href="/chapters/${chapter.slug}/"]`)).toBeVisible();
  }

  await page.goto('/chapters/chapter-zero/');
  await expect(page.locator('.textbook-chapter')).toContainText('Zero is not nothing');
  await expect(page.locator('.chapter-provenance')).toContainText('The-Interdependency/metapat');
  await expect(page.locator('.chapter-pagination a', { hasText: 'Next chapter' })).toBeVisible();

  await page.goto('/chapters/chapter-seven/');
  await expect(page.locator('.textbook-chapter')).toContainText('theory under development');
  await expect(page.locator('.chapter-provenance')).toContainText('The-Interdependency/zfae');
  await expect(page.locator('.status-frontier')).toContainText('theory under development');
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
