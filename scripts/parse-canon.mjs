import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import slugify from 'slugify';

// === MODULE_BUILD ===
// id: canon_structure_parser
//   purpose: Derive stable sections, units, note text, bounded routes, links, and hashes from the canonical snapshot.
//   entrypoint: npm run refresh:canon
//   tests: tests/canon-integrity.test.mjs
// === END MODULE_BUILD ===

const parserVersion = '0.3.0';
const provenance = JSON.parse(await readFile('src/_data/snapshots/canon.provenance.json', 'utf8'));
const raw = await readFile('src/_data/snapshots/canon.last-known-good.md', 'utf8');
const text = raw.replace(/^---\n[\s\S]*?\n---\n/, '');
const lines = text.split(/\r?\n/);
const documentHash = createHash('sha256').update(text).digest('hex');
const units = [];
const sections = [];
let current = null;
let sectionId = 'source';
const articleBySection = new Map();

function slug(value) {
  return slugify(value, { lower: true, strict: true }) || 'unit';
}
function boundedRouteSlug(id) {
  const candidate = slug(id);
  if (candidate.length <= 96) return candidate;
  const suffix = createHash('sha256').update(id).digest('hex').slice(0, 10);
  return `${candidate.slice(0, 84).replace(/-+$/, '')}-${suffix}`;
}
function finish(endLine) {
  if (!current) return;
  current.endLine = endLine;
  current.content = current.lines.join('\n').trim();
  current.hash = createHash('sha256').update(current.content).digest('hex');
  const notePattern = /^\s*\[([^\]]+)\]\s+(.+)$/gm;
  current.notes = [...current.content.matchAll(notePattern)].map(match => ({ marker: `[${match[1]}]`, text: match[2].trim() }));
  current.noteMarkers = [...new Set([...current.content.matchAll(/\[([^\]]+)\]/g)].map(match => `[${match[1]}]`))];
  units.push(current);
}

for (let index = 0; index < lines.length; index += 1) {
  const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[index]);
  if (!heading) {
    if (current) current.lines.push(lines[index]);
    continue;
  }
  finish(index);
  const level = heading[1].length;
  const title = heading[2].replace(/#+$/, '').trim();
  if (level <= 3) {
    sectionId = slug(title).replace(/^the-/, '');
    if (!sections.some(section => section.id === sectionId)) sections.push({ id: sectionId, title, level, line: index + 1 });
  }
  let localId = slug(title);
  if (/^article\s+/i.test(title)) {
    const count = (articleBySection.get(sectionId) || 0) + 1;
    articleBySection.set(sectionId, count);
    localId = `article-${count}`;
  }
  current = {
    id: `${sectionId}.${localId}`,
    title,
    section: sectionId,
    level,
    startLine: index + 1,
    lines: [lines[index]]
  };
}
finish(lines.length);
if (!units.length) throw new Error('canon parser produced no units');

const duplicateIds = units.map(unit => unit.id).filter((id, index, all) => all.indexOf(id) !== index);
if (duplicateIds.length) {
  for (const duplicate of new Set(duplicateIds)) {
    units.filter(unit => unit.id === duplicate).forEach((unit, index) => { unit.id = `${unit.id}-${index + 1}`; });
  }
}
for (const unit of units) unit.routeSlug = boundedRouteSlug(unit.id);
if (new Set(units.map(unit => unit.routeSlug)).size !== units.length) throw new Error('canon route slug collision');
const notes = units.flatMap(unit => unit.notes.map(note => ({ id: `${unit.id}.note-${slug(note.marker)}`, unit_id: unit.id, ...note })));
const data = {
  source: { ...provenance, contentSha256: documentHash, parserVersion },
  sections,
  units: units.map(({ lines: ignored, ...unit }) => unit),
  notes,
  edges: units.map(unit => ({ from: unit.id, to: unit.section, type: 'unit-parent' }))
};
await mkdir('src/_data/generated', { recursive: true });
await writeFile('src/_data/generated/canon.json', JSON.stringify(data, null, 2));
console.log(`units ${units.length}; notes ${notes.length}; longest route ${Math.max(...units.map(unit => unit.routeSlug.length))}`);
