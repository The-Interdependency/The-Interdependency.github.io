import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import loadResearchData from '../src/_data/research_data.js';

// === MODULE_BUILD ===
// id: generated_content_gate
//   module_name: validate-content
//   module_kind: instrument
//   summary: Refuses deployment when canon identity, heading hierarchy, textbook coverage, study-only research admission, snapshot integrity, generated route coverage, or recovery artifacts drift.
//   owner: Erin Spencer
//   public_surface: npm run validate
//   internal_surface: canon snapshot digest, heading hierarchy, distributed-textbook provenance, study-only research admission, and repository-route assertions
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/canon-parser.test.mjs, tests/canon-integrity.test.mjs, tests/textbook-integrity.test.mjs, tests/repo-coverage.test.mjs, tests/research-ledger.test.mjs, tests/site-contract.test.mjs
//   rollout: required by npm run build and npm run check
//   rollback: remove the gate only with an explicit replacement preserving provenance, hierarchy, textbook, and route checks
// === END MODULE_BUILD ===
// Usage: run `npm run validate`; it refreshes data first and exits nonzero on any integrity mismatch, including an unclassified or non-study Research source.
// Limits: validates repository artifacts and study admission structure, not each study's substantive result, GitHub Pages settings, or public DNS.

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
const textbook = JSON.parse(await readFile('src/_data/generated/textbook.json', 'utf8'));
const textbookSources = JSON.parse(await readFile('src/_data/textbook_sources.json', 'utf8'));
const biography = JSON.parse(await readFile('src/_data/erin.public-biography.json', 'utf8'));
const research = await loadResearchData();
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
const preamble = canon.units.find(unit => unit.title === 'Preamble');
if (!interdefinables || !preamble) throw new Error('canon missing Interdefinables or Preamble hierarchy unit');
for (const pattern of [
  /Human consciousness emerges from/i,
  /Binary essences meaningfully/i,
  /Trinary perceptual/i,
  /Archetype passions of possession/i
]) {
  if (!pattern.test(interdefinables.content)) throw new Error(`Interdefinables body lost required structure: ${pattern}`);
}
if (canon.units.some(unit => /^Human consciousness emerges from:?$/i.test(unit.title))) throw new Error('Human consciousness emerges from must remain body structure, not a tree unit');
if (canon.units.some(unit => /^Binary essences meaningfully/i.test(unit.title))) throw new Error('Binary essences must remain body structure, not a tree unit');
if (canon.units.some(unit => /^Trinary (?:perceptual|states of social perception|social perception)/i.test(unit.title))) throw new Error('Trinary Interdefinables labels must remain body structure, not tree units');
if (canon.units.some(unit => /Archetype passions of possession/i.test(unit.title))) throw new Error('Archetype passions must remain body structure, not a tree unit');
if (preamble.level !== 2 || preamble.section !== 'preamble') throw new Error('Preamble must remain a major section boundary');
if (!canon.source.fallback) {
  const interdefinablesUnitIndex = canon.units.findIndex(unit => unit.id === interdefinables.id);
  const preambleUnitIndex = canon.units.findIndex(unit => unit.id === preamble.id);
  if (interdefinablesUnitIndex < 0 || preambleUnitIndex !== interdefinablesUnitIndex + 1) throw new Error('Preamble must be the next Way-tree heading after The Interdefinables');
  const interdefinablesSectionIndex = canon.sections.findIndex(section => section.title === 'The Interdefinables');
  const preambleSectionIndex = canon.sections.findIndex(section => section.title === 'Preamble');
  if (interdefinablesSectionIndex < 0 || preambleSectionIndex !== interdefinablesSectionIndex + 1) throw new Error('Preamble must be the next major section after The Interdefinables');
}

if (textbook.schema !== 'interdependency.distributed-textbook/1.0.0') throw new Error(`unexpected textbook schema: ${textbook.schema}`);
if (!Array.isArray(textbookSources) || textbookSources.length !== 8) throw new Error('textbook source manifest must contain exactly eight chapters');
if (!Array.isArray(textbook.chapters) || textbook.chapters.length !== 8 || textbook.chapterCount !== 8) throw new Error('generated textbook must contain chapters zero through seven');
for (let number = 0; number < 8; number += 1) {
  const source = textbookSources[number];
  const chapter = textbook.chapters[number];
  if (source.number !== number || chapter.number !== number) throw new Error(`textbook chapter order drift at ${number}`);
  for (const key of ['slug', 'title', 'repository', 'path', 'branch']) {
    if (chapter[key] !== source[key]) throw new Error(`textbook chapter ${number} ${key} drift`);
  }
  for (const key of ['expected_title_match', 'license', 'license_status', 'correction_target']) {
    if (!chapter[key] || chapter[key] !== source[key]) throw new Error(`textbook chapter ${number} ${key} missing or drifted`);
  }
  if (!['declared', 'unknown', 'human-review-required'].includes(chapter.license_status)) throw new Error(`textbook chapter ${number} invalid license status`);
  if (chapter.correction_target !== `${chapter.repository}:${chapter.path}`) throw new Error(`textbook chapter ${number} correction target drift`);
}
if (new Set(textbook.chapters.map(chapter => chapter.slug)).size !== 8) throw new Error('duplicate textbook chapter slug');
if (new Set(textbook.chapters.map(chapter => `${chapter.repository}:${chapter.path}`)).size !== 8) throw new Error('duplicate textbook source location');
if (biography.schema !== 'interdependentway.public-biography/1.0.0') throw new Error('unexpected public biography schema');
if (biography.privacy?.scope !== 'public project biography') throw new Error('public biography privacy scope drift');
if (!Array.isArray(biography.privacy?.excludedCategories) || biography.privacy.excludedCategories.length < 1) throw new Error('public biography exclusions missing');
if (process.env.OFFLINE !== '1') {
  if (!textbook.complete || textbook.fallback) throw new Error('production textbook refresh is incomplete or using fallback content');
  for (const chapter of textbook.chapters) {
    if (!chapter.content?.trim()) throw new Error(`chapter ${chapter.number} content missing`);
    if (!/^[a-f0-9]{64}$/.test(chapter.contentSha256 || '')) throw new Error(`chapter ${chapter.number} digest missing`);
    if (!/^[a-f0-9]{40}$/.test(chapter.commit || '') || !/^[a-f0-9]{40}$/.test(chapter.blob || '')) throw new Error(`chapter ${chapter.number} source identity missing`);
    if (!chapter.sourceUrl?.startsWith(`https://github.com/${chapter.repository}/blob/${chapter.commit}/`)) throw new Error(`chapter ${chapter.number} exact source URL missing`);
  }
}

if (repos.publicRepoCount !== repos.generatedRouteCount) throw new Error('repo route mismatch');
if (new Set(repos.repositories.map(repo => repo.slug)).size !== repos.repositories.length) throw new Error('duplicate project slug');
if (!research.sources.length || research.sources.some(source => source.record_class !== 'research_study')) throw new Error('public Research contains a non-study source or no admitted studies');
if (!research.claims.length || research.claims.some(claim => claim.source_ids.some(sourceId => !research.sources.some(source => source.id === sourceId)))) {
  throw new Error('public Research claim cites a non-study or unknown source');
}
if (research.gaps.length !== 8 || research.gaps.some(gap => !gap.hmmm)) throw new Error('each Rights Article needs one explicit study-coverage hmmm');
await access('fallback/index.html');
await access('artifacts/four-cuts-1.html');
console.log(`validated ${canon.units.length} canon units, ${canon.notes.length} notes, ${textbook.chapterCount} textbook chapters, ${research.stats.admittedStudyCount} admitted studies, ${research.stats.publishedStudyClaimCount} study-only claims, canonical hierarchy, and ${repos.publicRepoCount} repositories`);
