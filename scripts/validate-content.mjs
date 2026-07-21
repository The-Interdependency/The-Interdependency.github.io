import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';

// === MODULE_BUILD ===
// id: generated_content_gate
//   module_name: validate-content
//   module_kind: instrument
//   summary: Refuses deployment when canon identity, heading hierarchy, snapshot integrity, generated route coverage, or recovery artifacts drift.
//   owner: Erin Spencer
//   public_surface: npm run validate
//   internal_surface: canon snapshot digest, heading hierarchy, and repository-route assertions
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/canon-parser.test.mjs, tests/canon-integrity.test.mjs, tests/repo-coverage.test.mjs, tests/site-contract.test.mjs
//   rollout: required by npm run build and npm run check
//   rollback: remove the gate only with an explicit replacement preserving provenance, hierarchy, and route checks
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

const interdefinables = canon.units.find(unit => unit.title === 'The Interdefinables');
const humanConsciousness = canon.units.find(unit => /^Human consciousness emerges from:?$/i.test(unit.title));
const preamble = canon.units.find(unit => unit.title === 'Preamble');
if (!interdefinables || !humanConsciousness || !preamble) throw new Error('canon missing Interdefinables, Human consciousness, or Preamble hierarchy unit');
if (humanConsciousness.level !== 3) throw new Error('Human consciousness emerges from must be a level-3 subheading');
if (humanConsciousness.section !== interdefinables.section) throw new Error('Human consciousness emerges from escaped The Interdefinables section');
if (humanConsciousness.parentId !== interdefinables.id) throw new Error('Human consciousness emerges from must be parented by The Interdefinables');
if (canon.sections.some(section => /^Human consciousness emerges from:?$/i.test(section.title))) throw new Error('Human consciousness emerges from must not be promoted to a peer section');
if (preamble.level !== 2 || preamble.section !== 'preamble') throw new Error('Preamble must remain the next major section boundary');
if (!canon.source.fallback) {
  const interdefinablesIndex = canon.sections.findIndex(section => section.title === 'The Interdefinables');
  const preambleIndex = canon.sections.findIndex(section => section.title === 'Preamble');
  if (interdefinablesIndex < 0 || preambleIndex !== interdefinablesIndex + 1) {
    throw new Error('Preamble must be the next major section after The Interdefinables');
  }
}

if (repos.publicRepoCount !== repos.generatedRouteCount) throw new Error('repo route mismatch');
if (new Set(repos.repositories.map(repo => repo.slug)).size !== repos.repositories.length) throw new Error('duplicate project slug');
await access('fallback/index.html');
await access('artifacts/four-cuts-1.html');
console.log(`validated ${canon.units.length} canon units, ${canon.notes.length} notes, canonical heading hierarchy, and ${repos.publicRepoCount} repositories`);
