import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// === MODULE_BUILD ===
// id: edcm_mathematics_public_artifact_record
//   module_name: edcm-mathematics
//   module_kind: schema
//   summary: Publishes an exact commit-pinned reproduction of the EDCM mathematical reference without creating a second mathematical authority.
//   owner: Erin Spencer
//   public_surface: edcm_mathematics, /artifacts/edcm-mathematics/
//   internal_surface: gitBlobSha1, reference_markdown
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/edcm-mathematics.test.mjs, tests/generated-site.test.mjs
//   rollout: loaded by Eleventy and linked from /artifacts/
//   rollback: remove this data module, its pinned reference bytes, route, index card, and contract checks together
//   since: 2026-08-02
//   unresolved: Git content identities detect drift but do not provide a cryptographic producer signature
// === END MODULE_BUILD ===
// Usage: render reference_markdown unchanged; correct equations or statuses in The-Interdependency/edcm first, then update the commit, blob, SHA-256, and copied bytes together.
// Limits: this module is a publication consumer. It transfers no canon, proof, theorem, measurement, empirical, or runtime status.

// === CONTRACTS ===
// id: edcm_reference_source_pin_visible
//   given: the EDCM mathematical reference is published
//   then: the EDCM repository, path, commit, Git blob, SHA-256, license, and correction target remain visible
//   class: evidence
//
// id: edcm_reference_bytes_reproduced
//   given: the website builds the EDCM mathematical reference
//   then: the rendered Markdown source has the exact SHA-256 and Git blob identity of the commit-pinned EDCM reference
//   class: correctness
//
// id: edcm_reference_status_does_not_transfer
//   given: EDCM equations and status boundaries appear on the website
//   then: the publication identifies itself as a non-authoritative copy and transfers no canon, proof, theorem, measurement, empirical, or runtime status
//   class: safety
// === END CONTRACTS ===

const SOURCE = Object.freeze({
  repository: 'The-Interdependency/edcm',
  path: 'docs/EDCM_MATHEMATICS.md',
  commit: '2f09f9af10ef950ce68c765bcbed7dca83625c65',
  blob: 'c2e059de15c4ef2c5fa9368c63363b606e503206',
  sha256: '889336c7c723d6e013188e1b3f969f98aeca88e3075b8ce2e67bc87e897e724f',
  license: 'MPL-2.0',
  url: 'https://github.com/The-Interdependency/edcm/blob/2f09f9af10ef950ce68c765bcbed7dca83625c65/docs/EDCM_MATHEMATICS.md'
});

const referenceBytes = readFileSync(new URL('./edcm_mathematics_reference.md', import.meta.url));
const referenceMarkdown = referenceBytes.toString('utf8');

function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

const observedSha256 = createHash('sha256').update(referenceBytes).digest('hex');
const observedBlob = gitBlobSha1(referenceBytes);
if (observedSha256 !== SOURCE.sha256 || observedBlob !== SOURCE.blob) {
  throw new Error(
    `EDCM reference drift: expected sha256=${SOURCE.sha256} blob=${SOURCE.blob}; ` +
    `observed sha256=${observedSha256} blob=${observedBlob}`
  );
}

const edcmMathematics = Object.freeze({
  schema: 'interdependentway.artifact.edcm-mathematics/2.0.0',
  '@id': 'https://interdependentway.org/artifacts/edcm-mathematics/#record',
  title: 'EDCM mathematical reference',
  route: '/artifacts/edcm-mathematics/',
  publication_role: 'commit-pinned reproduction',
  authority: 'The-Interdependency/edcm source modules and CANON.md',
  source: SOURCE,
  observed: {
    blob: observedBlob,
    sha256: observedSha256,
    utf8_bytes: referenceBytes.length
  },
  status_transfer: {
    authority: false,
    canon: false,
    proof: false,
    theorem: false,
    measurement: false,
    empirical: false,
    runtime: false
  },
  reference_markdown: referenceMarkdown,
  hmmm: 'The exact commit and content identities detect copy drift; they do not authenticate the producer. Every mathematical unresolved boundary remains inside the reproduced EDCM reference.'
});

export default function loadEdcmMathematics() {
  return structuredClone(edcmMathematics);
}
