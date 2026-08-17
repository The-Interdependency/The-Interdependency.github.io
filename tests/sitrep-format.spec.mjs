// Usage: run with `playwright test tests/sitrep-format.spec.mjs` after generating `_site`.
// Evidence boundary: verifies responsive hierarchy and disclosure behavior, not live repository freshness.
import { test, expect } from '@playwright/test';

test('SITREP supports scan, summary, and full-evidence reading depths', async ({ page }) => {
  await page.goto('/sitrep/');

  await expect(page.getByRole('navigation', { name: 'Repository situation index' }).locator('a')).toHaveCount(5);
  await expect(page.locator('.sitrep-card')).toHaveCount(5);
  await expect(page.locator('.sitrep-reading-key > div')).toHaveCount(3);

  const desktopColumns = await page.locator('.sitrep-dual').first().evaluate(element => getComputedStyle(element).gridTemplateColumns);
  expect(desktopColumns.trim().split(/\s+/)).toHaveLength(2);

  const firstCard = page.locator('.sitrep-card').first();
  await firstCard.getByText('Open full report').click();
  await expect(firstCard.locator('.detail-frontier')).toBeVisible();
  await expect(firstCard.locator('.detail-hmmm')).toBeVisible();

  await page.locator('.sitrep-control-plane > summary').click();
  await expect(page.locator('.sitrep-contract-grid')).toBeVisible();
});

test('SITREP remains contained and sequential on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sitrep/');

  const mobileColumns = await page.locator('.sitrep-dual').first().evaluate(element => getComputedStyle(element).gridTemplateColumns);
  expect(mobileColumns.trim().split(/\s+/)).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

  const index = page.getByRole('navigation', { name: 'Repository situation index' });
  await expect(index.locator('a')).toHaveCount(5);
  await expect(page.locator('.sitrep-reading-key > div')).toHaveCount(3);
});
