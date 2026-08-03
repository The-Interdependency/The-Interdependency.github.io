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
  ['/artifacts/gonol-relationships/', /Public Gonol relationship lab/],
  ['/artifacts/edcm-mathematics/', /EDCM mathematical reference/],
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
  await expect(page.locator('.awakening-text > .field-actions > .copy-button')).toHaveCount(3);
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

test('every established text-field type receives one working copy control', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/articles/article-two/');
  for (const selector of ['.page-head', '.panel', '.reading', '.card', '.hmmm']) {
    const field = page.locator(selector).first();
    await expect(field.locator(':scope > .field-actions > .copy-button')).toHaveCount(3);
  }

  const reading = page.locator('.reading').first();
  const copy = reading.locator(':scope > .field-actions > .copy-button').first();
  await copy.click();
  await expect(copy).toHaveText('Copied');
  await expect(reading.locator(':scope > .copy-status')).toHaveText('Copied to clipboard.');
  await expect.poll(async () => page.evaluate(() => navigator.clipboard.readText())).toContain('None shall be enslaved');
  await expect(reading.locator(':scope > .field-actions > .copy-button')).toHaveCount(3);
  await expect(reading.getByRole('button', { name: /download markdown/i })).toHaveText('.md');
  await expect(reading.getByRole('button', { name: /print or save as pdf/i })).toHaveText('PDF');

  await page.goto('/chapters/chapter-zero/');
  await expect(page.locator('.provenance > .field-actions > .copy-button')).toHaveCount(3);
  await expect(page.locator('.textbook-chapter > .field-actions > .copy-button')).toHaveCount(3);

  await page.goto('/way/');
  const unit = page.locator('details.canon-unit').first();
  await expect(unit.locator(':scope > .field-actions > .copy-button')).toHaveCount(3);
  await expect(unit.locator('.source-block > .field-actions > .copy-button')).toHaveCount(3);

  await page.goto('/chapters/');
  const linkedCard = page.locator('.copy-field-link').first();
  await expect(linkedCard.locator(':scope > .field-actions > .copy-button')).toHaveCount(3);
  await expect(linkedCard.locator('a .copy-button')).toHaveCount(0);

  await page.goto('/artifacts/four-cuts/');
  await expect(page.locator('.bracket-ref > .field-actions > .copy-button')).toHaveCount(3);
  await expect(page.locator('.measure').first().locator(':scope > .field-actions > .copy-button')).toHaveCount(3);
  await expect(page.locator('.x-ready > .field-actions > .copy-button')).toHaveCount(3);
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
  await expect(page.locator('.canon-unit-lab a')).toHaveCount(articleLab.length);
  const article = page.locator('details.canon-unit', { has: page.locator(`a[href="${labRoutes[0].route}"]`) }).first();
  const sourceBlock = article.locator('.source-block');
  const labLink = article.locator(`a[href="${labRoutes[0].route}"]`);
  await expect(article).not.toHaveAttribute('open', '');
  await expect(sourceBlock).not.toBeVisible();
  await expect(labLink).not.toBeVisible();
  await article.locator('summary').click();
  await expect(article).toHaveAttribute('open', '');
  await expect(sourceBlock).toBeVisible();
  await expect(sourceBlock).toContainText('Article One');
  expect((await sourceBlock.textContent())?.trim().length).toBeGreaterThan(100);
  await expect(labLink).toBeVisible();
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

test('EDCM mathematics stays source-bound and renders without a runtime math dependency', async ({ page }) => {
  await page.goto('/artifacts/edcm-mathematics/');
  await expect(page.locator('h1')).toHaveText('EDCM mathematical reference');
  await expect(page.locator('body')).toContainText('Commit-pinned reproduction');
  await expect(page.locator('body')).toContainText('2f09f9af10ef950ce68c765bcbed7dca83625c65');
  await expect(page.locator('body')).toContainText('c2e059de15c4ef2c5fa9368c63363b606e503206');
  await expect(page.locator('body')).toContainText('Implemented v0.3.1 architecture layer');
  await expect(page.locator('body')).toContainText('not a joint UCNS–EDCM canon selection');
  await expect(page.locator('.textbook-chapter math').first()).toBeVisible();
  expect(await page.locator('.textbook-chapter math').count()).toBeGreaterThanOrEqual(50);
  await expect(page.locator('script[src*="temml"], script[src*="katex"], script[src*="mathjax"]')).toHaveCount(0);
  await expect(page.locator('.hmmm')).toContainText('content identities detect copy drift');
});

test('Public Gonol lab preserves vesica pieces, triquetra pair receipts, and unresolved seven geometry', async ({ page }) => {
  await page.goto('/artifacts/gonol-relationships/');
  await expect(page.locator('h1')).toHaveText('Public Gonol relationship lab');
  await expect(page.locator('[data-gonol-status]')).toContainText('Primitive 2 receipt updated');
  await expect(page.locator('[data-gonol-stage] .gonol-operand-ring')).toHaveCount(2);
  await expect(page.locator('[data-gonol-stage] .gonol-lens')).toHaveCount(1);
  await expect(page.locator('[data-gonol-stage] .gonol-intersection')).toHaveCount(2);
  await expect(page.locator('[data-gonol-stage] .gonol-scope-ring')).toHaveCount(1);
  await expect(page.locator('[data-gonol-stage] .gonol-relationship-ring')).toHaveCount(1);
  await expect(page.locator('.gonol-pair:not([hidden])')).toHaveCount(1);

  const activeOperandOutput = page.locator('.gonol-operand:not([hidden]) .gonol-output').first();
  await expect(activeOperandOutput.locator(':scope > .copy-button')).toHaveCount(1);
  const completeReceiptOutput = page.locator('[data-receipt-output]').locator('..');
  await expect(completeReceiptOutput.locator(':scope > .copy-button')).toHaveCount(1);

  await page.locator('#gonol-payload-A').fill('root');
  await page.locator('#gonol-payload-B').fill('root');
  await page.locator('[data-comparison-policy]').selectOption('exact-utf8');
  await expect(page.locator('[data-receipt-output]')).toContainText('"exact_utf8_equal": true');
  await expect(page.locator('[data-vector-output]')).toContainText('"code_point": "U+0072"');

  await page.locator('.gonol-segmented label', { has: page.locator('input[value="3"]') }).click();
  await expect(page.locator('[data-gonol-status]')).toContainText('3 retained pairwise vesicas');
  await expect(page.locator('[data-gonol-stage] .gonol-lens')).toHaveCount(3);
  await expect(page.locator('[data-gonol-stage] [data-pair-intersection]')).toHaveCount(6);
  await expect(page.locator('.gonol-pair:not([hidden])')).toHaveCount(3);
  for (const pair of ['AB', 'BC', 'CA']) {
    await expect(page.locator(`.gonol-pair[data-pair="${pair}"]`)).toContainText(`vesica-${pair.toLowerCase()}`);
  }

  await page.locator('.gonol-segmented label', { has: page.locator('input[value="7"]') }).click();
  await expect(page.locator('[data-gonol-status]')).toContainText('geometry and pairing remain hmmm');
  await expect(page.locator('[data-gonol-stage] .gonol-identity-box')).toHaveCount(7);
  await expect(page.locator('[data-gonol-stage] .gonol-operand-ring')).toHaveCount(0);
  await expect(page.locator('[data-receipt-output]')).toContainText('no seven-form geometry or pairing count was inferred');
});

test('Public Gonol lab contains long receipts on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/artifacts/gonol-relationships/');
  await expect(page.locator('[data-gonol-status]')).toContainText('Primitive 2 receipt updated');
  const widths = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
});

test('all eight Rights Article Labs are linked from the Way tree and expose the shared contact structure', async ({ page }) => {
  await page.goto('/way/');
  for (const record of labRoutes) await expect(page.locator(`a[href="${record.route}"]`)).toHaveCount(1);

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
