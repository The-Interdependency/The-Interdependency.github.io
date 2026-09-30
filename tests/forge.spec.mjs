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

test('the Projects Forge feature remains legible with print backgrounds enabled', async ({ page }) => {
  await page.goto('/projects/');
  await page.emulateMedia({ media: 'print' });
  const style = await page.locator('.forge-entry').evaluate(element => {
    const computed = getComputedStyle(element);
    return { background: computed.backgroundColor, image: computed.backgroundImage, color: computed.color };
  });
  expect(style).toEqual({ background: 'rgb(255, 255, 255)', image: 'none', color: 'rgb(0, 0, 0)' });
});

test('live documentation refresh preserves keyboard access to code blocks', async ({ page }) => {
  await page.route('https://the-interdependency-mcp-live.onrender.com/api/repository-refresh', route => route.fulfill({
    json: { headSha: 'a'.repeat(40), defaultBranch: 'main', documentation: {
      readme: { html: '<pre><code>example command</code></pre>', sourceUrl: 'https://github.com/The-Interdependency/stack' },
      documents: [], hmmm: [], projectedDocumentCount: 1
    } }
  }));
  await page.goto('/projects/stack/');
  await page.getByRole('button', { name: 'Refresh MSDMD + docs' }).click();
  await expect(page.locator('[data-project-docs-content] pre')).toHaveAttribute('tabindex', '0');
  await expect(page.locator('[data-project-doc-mode]')).toHaveText('live exact-head observation');
});
