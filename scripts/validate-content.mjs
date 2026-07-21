import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';

// === MODULE_BUILD ===
// id: generated_content_gate
//   module_name: validate-content
//   module_kind: instrument
//   summary: Refuses deployment when canon identity, snapshot integrity, generated route coverage, or recovery artifacts drift.
//   owner: Erin Spencer
//   public_surface: npm run validate
//   internal_surface: canon snapshot digest and repository-route assertions
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/canon-integrity.test.mjs, tests/repo-coverage.test.mjs, tests/site-contract.test.mjs
//   rollout: required by npm run build and npm run check
//   rollback: remove the gate only with an explicit replacement preserving provenance and route checks
// === END MODULE_BUILD ===
// Usage: run `npm run validate`; it refreshes data first and exits nonzero on any integrity mismatch.
// Limits: validates repository artifacts, not GitHub Pages settings or public DNS.

// === BOUNDARIES ===
// id: generated_content_validation_boundary
//   summary: Reads generated and snapshot artifacts to enforce release integrity.
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: none
//   owner: Erin Spencer
// === END BOUNDARIES ===

const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
const repos = JSON.parse(await readFile('src/_data/generated/repos.json', 'utf8'));
const snapshotRaw = await readFile('src/_data/snapshots/canon.last-known-good.md', 'utf8');
const snapshotText = snapshotRaw.replace(/^---\n[\s\S]*?\n---\n/, '');
const snapshotHash = createHash('sha256').update(snapshotText).digest('hex');

if (canon.source.repository !== 'wayseer00/main') throw new Error(`unexpected canon repository: ${canon.source.repository}`);
if (canon.source.path !== 'canon/INTERDEPENDENT_WAY.txt') throw new Error(`unexpected canon path: ${canon.source.path}`);
if (!canon.source.contentSha256 || canon.source.contentSha256.length !== 64) throw new Error('canon missing SHA-256 digest');
if (canon.source.contentSha256 !== snapshotHash) throw new Error('generated canon digest does not match selected snapshot');
if (!canon.source.fallback && (!canon.source.commit || !canon.source.blob)) throw new Error('remote canon provenance missing commit or blob SHA');
if (!canon.units.length || canon.units.some(unit => !unit.hash || !unit.id)) throw new Error('canon units missing identity or hash');
if (repos.publicRepoCount !== repos.generatedRouteCount) throw new Error('repo route mismatch');
if (new Set(repos.repositories.map(repo => repo.slug)).size !== repos.repositories.length) throw new Error('duplicate project slug');
await access('fallback/index.html');
await access('artifacts/four-cuts-1.html');
console.log(`validated ${canon.units.length} canon units, ${canon.notes.length} notes, and ${repos.publicRepoCount} repositories`);
