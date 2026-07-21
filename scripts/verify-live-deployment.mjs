import { setTimeout as delay } from 'node:timers/promises';

// === MODULE_BUILD ===
// id: live_deployment_truth_gate
//   module_name: verify-live-deployment
//   module_kind: instrument
//   summary: Refuses a green Pages deployment until the public build identity matches the deployed commit.
//   owner: Erin Spencer
//   public_surface: node scripts/verify-live-deployment.mjs <base-url> <expected-commit>
//   internal_surface: bounded HTTPS retries and build.json identity comparison
//   auth_boundary: none
//   storage_boundary: none
//   network_boundary: external
//   user_data_boundary: none
//   admin_only: false
//   tests: .github/workflows/pages.yml deployment contact
//   rollout: required after actions/deploy-pages completes
//   rollback: remove only when replaced by another public commit-identity gate
// === END MODULE_BUILD ===
// Usage: `node scripts/verify-live-deployment.mjs https://interdependentway.org "$GITHUB_SHA"`.
// Limits: verifies served identity; it cannot alter Pages source, DNS, TLS, or environment rules.

// === BOUNDARIES ===
// id: public_site_verification_boundary
//   summary: Reads public HTTPS build identity from Pages and the custom domain.
//   auth_boundary: none
//   storage_boundary: none
//   network_boundary: external
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: bounded external GET requests
//   owner: Erin Spencer
// === END BOUNDARIES ===


const [baseUrl, expectedCommit] = process.argv.slice(2);
if (!baseUrl || !expectedCommit) throw new Error('usage: node scripts/verify-live-deployment.mjs <base-url> <expected-commit>');
if (!/^https:\/\//.test(baseUrl)) throw new Error(`refusing non-HTTPS deployment URL: ${baseUrl}`);

const target = `${baseUrl.replace(/\/$/, '')}/build.json`;
const attempts = Number(process.env.DEPLOY_VERIFY_ATTEMPTS || 12);
const delayMs = Number(process.env.DEPLOY_VERIFY_DELAY_MS || 10000);
let lastError = 'not attempted';

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const response = await fetch(`${target}?expected=${encodeURIComponent(expectedCommit)}&attempt=${attempt}`, {
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const info = await response.json();
    if (info.commit !== expectedCommit) throw new Error(`expected ${expectedCommit}, received ${info.commit || 'missing commit'}`);
    console.log(`verified live deployment ${target} at ${expectedCommit}`);
    process.exit(0);
  } catch (error) {
    lastError = String(error?.message || error);
    console.log(`deployment verification attempt ${attempt}/${attempts} failed: ${lastError}`);
    if (attempt < attempts) await delay(delayMs);
  }
}

throw new Error(`live deployment did not converge at ${target}: ${lastError}`);
