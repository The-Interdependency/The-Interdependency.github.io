import { readFile } from 'node:fs/promises';

// === MODULE_BUILD ===
// id: article_canon_exactness_gate
//   module_name: verify-article-canon
//   module_kind: instrument
//   summary: Verifies every public rights-article page reproduces its complete canonical excerpt and canonical notes.
//   owner: Erin Spencer
//   public_surface: npm run validate
//   internal_surface: article blockquote extraction and normalized canon comparison
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: npm run validate against current generated canon and src/articles
//   rollout: required by validate before Eleventy generation
//   rollback: replace only with an equally strict generated excerpt mechanism
// === END MODULE_BUILD ===
// Usage: run `node scripts/verify-article-canon.mjs` after `npm run refresh:canon`.
// Limits: exactness covers quoted canon and notes; companion interpretation remains editorial.
// Footnote-marker notation (superscript digits vs bracketed [n]) is presentation and is
// normalized out of both sides before comparison; word-level drift still fails.

// === BOUNDARIES ===
// id: article_canon_verification_boundary
//   summary: Reads canon data and article sources to detect quotation or note drift.
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
const rightsSection = canon.sections.find(section => /^Rights/.test(section.title) && /of The Way/i.test(section.title));
if (!rightsSection) throw new Error('rights section missing from generated canon');

const articles = [
  ['One', 'one'], ['Two', 'two'], ['Three', 'three'], ['Four', 'four'],
  ['Five', 'five'], ['Six', 'six'], ['Seven', 'seven'], ['Eight', 'eight']
];

function decodeHtml(value) {
  return value
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function plainHtml(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function canonicalBody(unit) {
  const lines = unit.content.split(/\r?\n/).slice(1);
  const body = [];
  for (const line of lines) {
    if (/^\s*>?\s*(?:\[[^\]]+\]|[⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d+)\s+/.test(line)) break;
    if (/^\s*\*\*\[Notes/.test(line)) break;
    if (/^\s*---\s*$/.test(line)) break;
    if (/^\s*#{2,}\s/.test(line)) break;
    if (line.trim()) body.push(line.trim());
  }
  return body.join(' ').replace(/\s+/g, ' ').trim();
}

function stripFootnoteMarkers(value) {
  return value
    .replace(/\s*\[\d+\]/g, '')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const failures = [];
for (const [word, slug] of articles) {
  const title = `Article ${word}`;
  const unit = canon.units.find(candidate => candidate.title === title && candidate.section === rightsSection.id);
  if (!unit) throw new Error(`${title} missing from rights canon section`);

  const source = await readFile(`src/articles/article-${slug}.njk`, 'utf8');
  const blockquote = /<blockquote class="reading">([\s\S]*?)<\/blockquote>/.exec(source);
  if (!blockquote) throw new Error(`${title} page missing canonical reading blockquote`);

  const expected = stripFootnoteMarkers(canonicalBody(unit));
  const actual = stripFootnoteMarkers(plainHtml(blockquote[1]));
  if (actual !== expected) {
    failures.push(`${title} canonical excerpt drift\nexpected: ${expected}\nactual:   ${actual}`);
  }

  const pageText = plainHtml(source);
  for (const note of unit.notes) {
    if (!pageText.includes(note.text.replace(/\s+/g, ' ').trim())) {
      failures.push(`${title} missing complete canon note ${note.marker}: ${note.text}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`${failures.length} canon drift finding(s)\n\n${failures.join('\n\n')}`);
}

console.log('verified complete canon excerpts and notes for all eight rights articles');
