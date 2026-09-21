import { test, expect } from '@playwright/test';

const SDK22_USER_AGENT = 'Mozilla/5.0 (Linux; Android 5.1; Nexus 5 Build/LMY47D) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.0.0 Mobile Safari/537.36';
const routes = ['/home/', '/way/', '/chapters/', '/projects/', '/sitrep/', '/search/', '/about/'];

test.describe('Android SDK 22 display floor', () => {
  test.use({
    viewport: { width: 320, height: 568 },
    javaScriptEnabled: false,
    userAgent: SDK22_USER_AGENT
  });

  for (const route of routes) {
    test(`${route} preserves core reading and navigation without client JavaScript`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('#content')).toBeVisible();
      await expect(page.locator('#primary-nav')).toBeVisible();
      const text = (await page.locator('#content').innerText()).trim();
      expect(text.length).toBeGreaterThan(40);
      const width = await page.locator('#content').evaluate(node => node.getBoundingClientRect().width);
      expect(width).toBeLessThanOrEqual(320);
    });
  }
});
