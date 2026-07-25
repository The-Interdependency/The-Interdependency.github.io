// Usage: run through `npm run test:browser`; verifies that Chromium receives visible static MathML from the generated textbook artifact.
// Evidence boundary: checks browser delivery and presentation without JavaScript, not mathematical validity or every browser's font metrics.
import { test, expect } from '@playwright/test';

test('Chapter One mathematics is visible without JavaScript or a runtime renderer', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto('/chapters/chapter-one/');

  expect(response?.ok()).toBeTruthy();
  const math = page.locator('.textbook-chapter math');
  expect(await math.count()).toBeGreaterThanOrEqual(10);
  await expect(math.first()).toBeVisible();
  await expect(page.locator('.textbook-chapter math[display="block"]').first()).toBeVisible();
  await expect(page.locator('.textbook-chapter annotation[encoding="application/x-tex"]').first()).toHaveCount(1);
  await expect(page.locator('script[src*="temml"], script[src*="katex"], script[src*="mathjax"]')).toHaveCount(0);

  const overflow = await page.locator('.textbook-chapter math.tml-display').first().evaluate(element => getComputedStyle(element).overflowX);
  expect(overflow).toBe('auto');
  await context.close();
});
