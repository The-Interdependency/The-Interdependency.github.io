// === MODULE_BUILD ===
// id: edcm_reference_drift_gate
//   module_name: check-edcm-reference-drift
//   module_kind: instrument
//   summary: Fails when the website copy differs from the exact commit-pinned EDCM reference identity or an explicitly supplied producer checkout.
//   owner: Erin Spencer
//   public_surface: node scripts/check-edcm-reference-drift.mjs [reference-file]
//   internal_surface: none
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/edcm-mathematics.test.mjs
//   rollout: npm run check:edcm-reference and npm run check
//   rollback: remove only with another deterministic cross-repository reference gate
//   since: 2026-08-02
//   unresolved: none
// === END MODULE_BUILD ===
// Usage: run `npm run check:edcm-reference`; when an EDCM checkout is available, run `node scripts/check-edcm-reference-drift.mjs /path/to/edcm/docs/EDCM_MATHEMATICS.md` for a direct byte comparison.
// Limits: exact Git and SHA-256 identities prove copy equality, not truth, authorship, or producer authentication.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import loadEdcmMathematics from '../src/_data/edcm_mathematics.js';

const artifact = loadEdcmMathematics();
const copied = Buffer.from(artifact.reference_markdown, 'utf8');
const referenceArgument = process.argv[2] || process.env.EDCM_REFERENCE_PATH;

if (referenceArgument) {
  const referencePath = resolve(referenceArgument);
  const authoritative = await readFile(referencePath);
  if (!copied.equals(authoritative)) {
    throw new Error(`EDCM reference byte drift against ${referencePath}`);
  }
}

process.stdout.write(`${JSON.stringify({
  repository: artifact.source.repository,
  path: artifact.source.path,
  commit: artifact.source.commit,
  blob: artifact.observed.blob,
  sha256: artifact.observed.sha256,
  utf8_bytes: copied.length,
  direct_reference_compared: Boolean(referenceArgument)
})}\n`);
