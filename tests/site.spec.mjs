// Usage: run `npm run test:e2e` after `npm run build`; Playwright starts the loopback static server.
// Evidence boundary: checks route reachability and visible content, not external DNS or Pages freshness.
import { test, expect } from '@playwright/test';

const routes = [
  ['/', /A way through complexity/],
  ['/preamble/', /Humanity faces extinction/],
  ['/articles/', /Publication drafts/],
  ['/articles/article-two/', /Freedom without abandonment/],
  ['/way/', /The Way/],
  ['/lab/', /Article Lab/],
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
