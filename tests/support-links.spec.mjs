// Usage: npm run test:browser after building. Does not navigate to payment providers.
// Boundary: verifies rendered links, keyboard navigation, history and mobile layout, not checkout.
import { test, expect } from '@playwright/test';

test('support links remain readable without JavaScript on a narrow screen', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  const support = page.locator('#support-the-researcher');
  await expect(support.getByRole('heading')).toHaveText('Support the Researcher');
  await expect(support).toContainText('every dollar supports a disabled veteran, USMC, researching the bleeding edge while living on the street because fuck you.');
  await expect(support).toContainText('No roadmap promises, no private Slack, no special favors.');
  await expect(support.getByRole('link', { name: 'Support via Cash App ($wayseer00)', exact: true })).toHaveAttribute('href', 'https://cash.app/$wayseer00');
  await expect(support.getByRole('link', { name: 'Follow on X (@wayseer00)', exact: true })).toHaveAttribute('href', 'https://x.com/wayseer00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('footer support navigation works repeatedly and with browser history', async ({ page }) => {
  await page.goto('/about-me/');
  const link = page.locator('footer').getByRole('link', { name: 'Support the Researcher', exact: true });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/#support-the-researcher$/);
  await expect(page.locator('#support-the-researcher')).toBeInViewport();
  await page.locator('footer').getByRole('link', { name: 'Support the Researcher', exact: true }).click();
  await expect(page).toHaveURL(/\/#support-the-researcher$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/about-me\/$/);
  await page.goForward();
  await expect(page.locator('#support-the-researcher')).toBeInViewport();
});
