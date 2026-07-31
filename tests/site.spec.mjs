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
  ['/narratives/', /Living Narratives/],
  ['/narratives/jack-and-diane/', /The Longhand Journal/],
  ['/way/', /The Way/],
  ['/lab/', /Rights Article laboratories/],
  ['/source/', /Source/],
  ['/projects/', /Projects/],
  ['/artifacts/', /Artifacts/],
  ['/research/method/', /Legislation is not science/],
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
  const startLink = page.locator('nav[aria-label="Primary navigation"] a[href="/way/"]', { hasText: 'Start' });
  await expect(startLink).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary navigation"] a', { hasText: 'The Way' })).toHaveCount(0);
  await expect(page.locator('nav[aria-label="Primary navigation"] a[href="/preamble/"]', { hasText: 'Preamble' })).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary navigation"] a[href="/chapters/"]', { hasText: 'Textbook' })).toBeVisible();
  await expect(page.locator('main a[href="/chapters/"]').first()).toBeVisible();
  await startLink.click();
  await expect(page).toHaveURL(/\/way\/$/);
  await expect(page.locator('details.canon-unit').first()).toBeVisible();
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

test('clicking a Way row reveals its bounded canon text without leaving the tree', async ({ page }) => {
  await page.goto('/way/');
  const articleFive = page.locator('details.canon-unit', { has: page.locator('summary', { hasText: 'Article Five' }) }).first();
  const sourceBlock = articleFive.locator('.source-block');
  await expect(articleFive).not.toHaveAttribute('open', '');
  await expect(sourceBlock).not.toBeVisible();
  await articleFive.locator('summary').click();
  await expect(articleFive).toHaveAttribute('open', '');
  await expect(sourceBlock).toBeVisible();
  await expect(sourceBlock).toContainText('Article Five');
  expect((await sourceBlock.textContent())?.trim().length).toBeGreaterThan(100);
  await expect(articleFive.locator('a')).toHaveCount(0);
  await expect(page).toHaveURL(/\/way\/$/);
});

test('living narratives keep fiction and adulthood boundaries visible', async ({ page }) => {
  await page.goto('/narratives/');
  await expect(page.locator('a[href="/narratives/jack-and-diane/"]')).toBeVisible();

  await page.goto('/narratives/jack-and-diane/');
  await expect(page.locator('h1')).toHaveText('Jack & Diane: The Longhand Threshold');
  await expect(page.locator('.status-risk')).toContainText('not canon');
  await expect(page.locator('body')).toContainText('Jack and Diane remain minors');
  await expect(page.locator('.journal-entry')).toHaveCount(9);
  await expect(page.locator('.hmmm')).toContainText('Neither adulthood, interdependence, physical maturity, nor a Political Circle has been declared complete');
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

test('Research is study-only and exposes provisional citation gaps', async ({ page }) => {
  await page.goto('/research/method/');
  await expect(page.locator('h1')).toHaveText('Legislation is not science.');
  await expect(page.locator('body')).toContainText('19 admitted studies');
  await expect(page.locator('body')).toContainText('20 non-study records excluded');
  await expect(page.locator('body')).toContainText('provisional-full-text-locator-needed');

  await page.goto('/articles/article-three/');
  await expect(page.locator('body')).toContainText('Study-only research attachment');
  await expect(page.locator('body')).toContainText('support no-qualifying-study-found');
  await expect(page.locator('body')).toContainText('dissent no-qualifying-study-found');
  await expect(page.locator('body')).not.toContainText('TeamSTEPPS');
});
