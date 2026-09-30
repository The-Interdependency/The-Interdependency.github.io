// Usage: npx playwright test tests/forge.spec.mjs after a static build.
import { test, expect } from '@playwright/test';

test('a phone visitor can enter the Forge and open independent research without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/projects/');
  await page.getByRole('link', { name: 'Enter the forge', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Stack — The Forge', exact: true })).toBeVisible();
  const first = page.locator('#forge-ahbg');
  const second = page.locator('#forge-english-gonol');
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('open', '');
  await expect(first.getByRole('link', { name: 'Read workspace and evidence' })).toBeVisible();
  await expect(second).not.toHaveAttribute('open', '');
  await second.locator('summary').click();
  await expect(second).toHaveAttribute('open', '');
  await expect(first).toHaveAttribute('open', '');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
