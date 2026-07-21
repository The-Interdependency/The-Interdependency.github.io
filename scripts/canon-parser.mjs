import { createHash } from 'node:crypto';
import slugify from 'slugify';

// === MODULE_BUILD ===
// id: canon_parser_core
//   module_name: canon-parser
//   module_kind: engine
//   summary: Parses canonical or recovery text into stable sections, units, notes, routes, and provenance-bearing hashes.
//   owner: Erin Spencer
//   public_surface: parseCanon, detectHeading, extractNotes
//   internal_surface: slug, boundedRouteSlug, parseDefinitionLine, extractNoteMarkers
//   auth_boundary: none
//   storage_boundary: none
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/canon-parser.test.mjs, tests/canon-integrity.test.mjs
//   rollout: imported by scripts/parse-canon.mjs during every canon refresh
//   rollback: restore the prior inline parser and remove this import
// === END MODULE_BUILD ===
// Usage: import parseCanon(text, provenance); run `node --test tests/canon-parser.test.mjs` for recovery and note fixtures.
// Limits: heading recognition is canon-specific; unknown headings remain body text and must surface as hmmm during editorial review.

export const parserVersion = '0.5.0';

function slug(value) {
  return slugify(value, { lower: true, strict: true }) || 'unit';
}

function boundedRouteSlug(id) {
  const candidate = slug(id);
  if (candidate.length <= 96) return candidate;
  const suffix = createHash('sha256').update(id).digest('hex').slice(0, 10);
  return `${candidate.slice(0, 84).replace(/-+$/, '')}-${suffix}`;
}

export function detectHeading(line) {
  const markdown = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
  if (markdown) {
    const sourceLevel = markdown[1].length;
    // The recovery mirror uses H3 for the same major divisions that the plain-text
    // canon expresses as level 2, and H4 for article units. Normalize those levels
    // before assigning parents so offline and remote builds have the same structure.
    const level = sourceLevel >= 3 ? sourceLevel - 1 : sourceLevel;
    return {
      level,
      sourceLevel,
      title: markdown[2].replace(/#+$/, '').trim(),
      syntax: 'markdown'
    };
  }

  const title = line.trim();
  if (!title) return null;
  if (title === 'The Interdependent Way') return { level: 1, sourceLevel: 1, title, syntax: 'plain' };
  if (/^(Awakening|The Interdefinables|Human consciousness emerges from|Preamble|Etiquette of the Body Politic)$/i.test(title)) {
    return { level: 2, sourceLevel: 2, title, syntax: 'plain' };
  }
  if (/^Rights[\w\s’'&⁰¹²³⁴⁵⁶⁷⁸⁹-]+of The Way[⁰¹²³⁴⁵⁶⁷⁸⁹]*$/i.test(title)) {
    return { level: 2, sourceLevel: 2, title, syntax: 'plain' };
  }
  if (/^Addendum:\s+.+$/i.test(title)) return { level: 2, sourceLevel: 2, title, syntax: 'plain' };
  if (/^Article\s+(One|Two|Three|Four|Five|Six|Seven|Eight)(?:\s+\([^)]+\))?$/i.test(title)) {
    return { level: 3, sourceLevel: 3, title, syntax: 'plain' };
  }
  if (/^(Binary essences meaningfully, divided; then, rooted\.|Trinary perceptual focal states of complex system spirals:.+|Trinary states of social perception:|Archetype passions of possession\..+|Summary|One-sentence takeaway \(exactly as previously given\))$/i.test(title)) {
    return { level: 3, sourceLevel: 3, title, syntax: 'plain' };
  }
  return null;
}

function parseDefinitionLine(line) {
  const normalized = line.replace(/^\s*>?\s*/, '').trim();
  const first =
    /^(\[.+?])\s+(.+)$/.exec(normalized) ||
    /^([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*(.+)$/.exec(normalized) ||
    /^(\d+)\s+(.+)$/.exec(normalized);
  if (!first) return [];

  const notes = [];
  let marker = first[1];
  let remaining = first[2];
  const nextPattern = /\s+(\[.+?]|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*/;

  while (true) {
    const next = nextPattern.exec(remaining);
    if (!next) {
      if (remaining.trim()) notes.push({ marker, text: remaining.trim() });
      break;
    }
    const text = remaining.slice(0, next.index).trim();
    if (text) notes.push({ marker, text });
    marker = next[1];
    remaining = remaining.slice(next.index + next[0].length);
  }
  return notes;
}

export function extractNotes(content) {
  return content.split(/\r?\n/).flatMap(parseDefinitionLine);
}

function extractNoteMarkers(content) {
  const markers = [];
  for (const match of content.matchAll(/\[.+?]|[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g)) markers.push(match[0]);
  return [...new Set(markers)];
}

export function parseCanon(text, provenance = {}) {
  const lines = text.split(/\r?\n/);
  const documentHash = createHash('sha256').update(text).digest('hex');
  const units = [];
  const sections = [];
  let current = null;
  let sectionId = 'source';

  function finish(endLine) {
    if (!current) return;
    current.endLine = endLine;
    current.content = current.lines.join('\n').trim();
    current.hash = createHash('sha256').update(current.content).digest('hex');
    current.notes = extractNotes(current.content);
    current.noteMarkers = extractNoteMarkers(current.content);
    units.push(current);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const heading = detectHeading(lines[index]);
    if (!heading) {
      if (current) current.lines.push(lines[index]);
      continue;
    }

    finish(index);
    const { level, sourceLevel, title, syntax } = heading;
    if (level <= 2) {
      sectionId = slug(title).replace(/^the-/, '');
      if (!sections.some(section => section.id === sectionId)) {
        sections.push({ id: sectionId, title, level, sourceLevel, syntax, line: index + 1 });
      }
    }

    current = {
      id: `${sectionId}.${slug(title)}`,
      title,
      section: sectionId,
      level,
      sourceLevel,
      syntax,
      startLine: index + 1,
      lines: [lines[index]]
    };
  }
  finish(lines.length);

  if (!units.length) throw new Error('canon parser produced no units');

  const duplicateIds = units.map(unit => unit.id).filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateIds.length) {
    for (const duplicate of new Set(duplicateIds)) {
      units.filter(unit => unit.id === duplicate).forEach((unit, index) => {
        unit.id = `${unit.id}-${index + 1}`;
      });
    }
  }

  for (const unit of units) unit.routeSlug = boundedRouteSlug(unit.id);
  if (new Set(units.map(unit => unit.routeSlug)).size !== units.length) throw new Error('canon route slug collision');

  const notes = units.flatMap(unit => unit.notes.map((note, index) => ({
    id: `${unit.id}.note-${index + 1}-${slug(note.marker)}`,
    unit_id: unit.id,
    ...note
  })));

  return {
    source: { ...provenance, contentSha256: documentHash, parserVersion },
    sections,
    units: units.map(({ lines: ignored, ...unit }) => unit),
    notes,
    edges: units.map(unit => ({ from: unit.id, to: unit.section, type: 'unit-parent' }))
  };
}
