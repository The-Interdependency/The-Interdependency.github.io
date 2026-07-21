// Usage: run `npm run test:e2e` after `npm run build`; Playwright starts the loopback static server.
// Evidence boundary: checks route reachability and visible content, not external DNS or Pages freshness.
import { test, expect } from '@playwright/test';

const routes = [
  ['/', /A way through complexity/],
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

test('all eight rights articles are reachable from the article index', async ({ page }) => {
  await page.goto('/articles/');
  for (const word of ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']) {
    const link = page.locator(`a[href="/articles/article-${word}/"]`).first();
    await expect(link).toBeVisible();
  }
});
