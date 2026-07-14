import { access, readFile } from 'node:fs/promises';

// === MODULE_BUILD ===
// id: generated_content_gate
//   purpose: Refuse deployment when canon identity, generated route coverage, or recovery artifacts drift.
//   entrypoint: npm run validate
//   tests: tests/canon-integrity.test.mjs, tests/repo-coverage.test.mjs, tests/site-contract.test.mjs
// === END MODULE_BUILD ===

const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
const repos = JSON.parse(await readFile('src/_data/generated/repos.json', 'utf8'));
if (canon.source.repository !== 'wayseer00/wayseer.github.io') throw new Error(`unexpected canon repository: ${canon.source.repository}`);
if (canon.source.path !== 'canon/the_interdependent_way.md') throw new Error(`unexpected canon path: ${canon.source.path}`);
if (!canon.source.contentSha256 || canon.source.contentSha256.length !== 64) throw new Error('canon missing SHA-256 digest');
if (!canon.units.length || canon.units.some(unit => !unit.hash || !unit.id)) throw new Error('canon units missing identity or hash');
if (repos.publicRepoCount !== repos.generatedRouteCount) throw new Error('repo route mismatch');
if (new Set(repos.repositories.map(repo => repo.slug)).size !== repos.repositories.length) throw new Error('duplicate project slug');
await access('fallback/index.html');
await access('artifacts/four-cuts-1.html');
console.log(`validated ${canon.units.length} canon units, ${canon.notes.length} notes, and ${repos.publicRepoCount} repositories`);
