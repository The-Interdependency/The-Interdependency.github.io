import { test, expect } from '@playwright/test';

test('a phone visitor can read a real skill-lib record and follow its pinned source without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 }, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/projects/skill-lib/');
    await page.getByRole('link', { name: 'Browse collected metadata' }).click();
    await expect(page.getByRole('heading', { name: 'skill-lib metadata' })).toBeVisible();
    await page.getByRole('link', { name: 'Native facts', exact: true }).click();
    await page.getByRole('link', { name: 'Read records' }).click();
    const first = page.locator('article').first();
    await expect(first.locator('pre').first()).toBeVisible();
    expect((await first.locator('pre').first().textContent()).trim().length).toBeGreaterThan(0);
    await expect(first.getByRole('link').first()).toHaveAttribute('href', /^https:\/\/github\.com\/The-Interdependency\/skill-lib\/blob\/[a-f0-9]{40}\//);
    await expect(first.locator('details')).not.toHaveAttribute('open', '');
    await first.getByText('Record provenance', { exact: true }).click();
    await expect(first.locator('details pre')).toContainText('source');
    expect(await page.locator('body').evaluate(body => body.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Next', exact: true }).first().click();
    await expect(page).toHaveURL(/\/facts\/2\/$/);
    await page.goto('/projects/map/');
    await page.locator('a.org-map-repo-card[href="/projects/skill-lib/metadata/"]').click();
    await expect(page.getByRole('heading', { name: 'skill-lib metadata' })).toBeVisible();
  } finally { await context.close(); }
});
