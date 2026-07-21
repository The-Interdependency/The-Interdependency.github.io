// Usage: run `npm run test:browser` after `npm run build`; CI installs Chromium before execution.
// Limits: tests the generated artifact on loopback and does not replace live deployment identity verification.
// === MODULE_BUILD ===
// id: generated_site_browser_harness
//   module_name: playwright-config
//   module_kind: instrument
//   summary: Configures browser, route, and automated accessibility checks against the generated site.
//   owner: Erin Spencer
//   public_surface: npm run test:browser, npm run test:e2e, npm run test:a11y
//   internal_surface: Playwright webServer and Chromium test configuration
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: internal
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/site.spec.mjs, tests/accessibility.spec.mjs
//   rollout: required by pull-request and Pages workflows
//   rollback: remove browser scripts, workflow steps, and static test server together
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: generated_site_browser_harness_boundary
//   summary: Launches Chromium and a loopback-only static server against generated public files.
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: internal
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: browser processes, loopback listener
//   owner: Erin Spencer
// === END BOUNDARIES ===
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.mjs'],
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node scripts/serve-static.mjs',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
