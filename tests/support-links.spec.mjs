// Usage: npm run test:browser after building. Does not navigate to payment providers.
// Boundary: verifies rendered links, keyboard navigation, history and mobile layout, not checkout.
import { test, expect } from '@playwright/test';

test('support links remain readable without JavaScript on a narrow screen', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  const support = page.locator('#support-the-researcher');
  await expect(support.getByRole('heading')).toHaveText('Support the Researcher');
  await expect(support).toContainText("I'm asking for money to keep this research running. Not for a promise about what it will become.");
  await expect(support).toContainText('Boardy (exact runtime model unavailable to this session) generated from context and prompt by Erin Spencer.');
  await expect(support.getByRole('link', { name: 'Support via Cash App ($wayseer00)', exact: true })).toHaveAttribute('href', 'https://cash.app/$wayseer00');
  await expect(support.getByRole('link', { name: 'Follow on X (@wayseer00)', exact: true })).toHaveAttribute('href', 'https://x.com/wayseer00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('footer support navigation works repeatedly and with browser history', async ({ page }) => {
  await page.goto('/about-me/');
  const link = page.locator('footer').getByRole('link', { name: 'Support me', exact: true });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/support\/$/);
  await expect(page.getByRole('heading', { name: 'Support me', exact: true })).toBeInViewport();
  await page.locator('footer').getByRole('link', { name: 'Support me', exact: true }).click();
  await expect(page).toHaveURL(/\/support\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/about-me\/$/);
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Support me', exact: true })).toBeInViewport();
});

// Usage: this checks the complete static financial display on a phone viewport.
test('support page keeps balances, funding coverage, and source age readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/support/');
  await expect(page.getByRole('heading', { name: 'Support me', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Funding received', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Balance totals', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Checking total', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Credit total', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('Reported card balance total');
  await expect(page.locator('main')).toContainText('Cash App and cash receipts are not connected');
  await expect(page.locator('main')).toContainText('These are aggregate snapshots.');
  await expect(page.locator('main')).not.toContainText('X Money');
  await expect(page.locator('main')).not.toContainText('Capital One');
  await expect(page.locator('main')).not.toContainText('Chase checking');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
