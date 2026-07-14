import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import MarkdownIt from 'markdown-it';
import slugify from 'slugify';

const parserVersion = '0.2.0-markdown-it-tokens';
const raw = await readFile('src/_data/snapshots/canon.last-known-good.md', 'utf8');
const provenance = Object.fromEntries(
  [...raw.match(/^---\n([\s\S]*?)---\n/)?.[1]?.matchAll(/^([^:]+):\s*(.*)$/gm) || []]
    .map(([, key, value]) => [key.trim(), value.trim()])
);
const text = raw.replace(/^---[\s\S]*?---\n/, '');
const contentSha256 = createHash('sha256').update(text).digest('hex');
const lines = text.split(/\r?\n/);
const md = new MarkdownIt({ html: false });
const tokens = md.parse(text, {});

function slug(value) {
  return slugify(value, { lower: true, strict: true }) || 'unit';
}

function romanToInt(value) {
  const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
  let total = 0;
  let previous = 0;
  for (const char of value.toLowerCase().split('').reverse()) {
    const current = map[char] || 0;
    total += current < previous ? -current : current;
    previous = Math.max(previous, current);
  }
  return total || null;
}

function articleOrdinal(title, fallback) {
  const match = title.match(/article\s+([ivxlcdm]+|\d+)/i);
  if (!match) return null;
  const rawValue = match[1].toLowerCase();
  const number = /^\d+$/.test(rawValue) ? Number(rawValue) : romanToInt(rawValue);
  return number || fallback;
}

const headingTokens = [];
for (let i = 0; i < tokens.length; i++) {
  const token = tokens[i];
  if (token.type !== 'heading_open') continue;
  const title = tokens[i + 1]?.content?.trim() || 'Untitled';
  const level = Number(token.tag.slice(1));
  const startLine = (token.map?.[0] ?? 0) + 1;
  headingTokens.push({ title, level, startLine });
}


if (headingTokens.length < 3) {
  headingTokens.length = 0;
  const headingPatterns = [
    [/^The Interdependent Way\s*$/i, 1],
    [/^Awakening\s*$/i, 2],
    [/^The Interdefinables\s*$/i, 2],
    [/^Human consciousness emerges from\s*$/i, 2],
    [/^Binary essences/i, 3],
    [/^Trinary perceptual/i, 3],
    [/^Trinary states/i, 3],
    [/^Archetype passions/i, 3],
    [/^Preamble\s*$/i, 2],
    [/^Rights.*Definitions.*Way/i, 2],
    [/^Article\s+/i, 3],
    [/^Etiquette/i, 2],
    [/^Addendum/i, 2]
  ];
  for (let i = 0; i < lines.length; i++) {
    const title = lines[i].trim();
    if (!title || title.length > 160) continue;
    const found = headingPatterns.find(([pattern]) => pattern.test(title));
    if (found) headingTokens.push({ title, level: found[1], startLine: i + 1 });
  }
}

const sections = [];
const units = [];
const notes = [];
let currentSection = 'source';
let articleFallback = 0;

for (let index = 0; index < headingTokens.length; index++) {
  const heading = headingTokens[index];
  const next = headingTokens[index + 1];
  const endLine = next ? next.startLine - 1 : lines.length;
  if (heading.level <= 2) {
    currentSection = slug(heading.title).replace(/^the-/, '');
    sections.push({
      id: currentSection,
      title: heading.title,
      level: heading.level,
      line: heading.startLine
    });
    articleFallback = 0;
  }
  const articleNumber = articleOrdinal(heading.title, articleFallback + 1);
  if (articleNumber) articleFallback = articleNumber;
  const baseId = articleNumber
    ? `${currentSection}.article-${articleNumber}`
    : `${currentSection}.${slug(heading.title)}`;
  const id = `${baseId}-${heading.startLine}`;
  const routeSlug = `${slug(heading.title).slice(0, 64)}-${heading.startLine}`;
  const content = lines.slice(heading.startLine - 1, endLine).join('\n').trim();
  const unit = {
    id,
    title: heading.title,
    section: currentSection,
    level: heading.level,
    startLine: heading.startLine,
    endLine,
    content,
    hash: createHash('sha256').update(content).digest('hex'),
    routeSlug,
    reviewStatus: 'hmmm'
  };
  units.push(unit);
  for (const match of content.matchAll(/\[(\d+|[a-z])\]/gi)) {
    notes.push({
      id: `${id}.note-${match[1]}`,
      unit_id: id,
      marker: match[0],
      status: 'hmmm',
      hmmm: 'Marker detected; note text binding requires editorial parser review.'
    });
  }
}

if (!units.length) {
  sections.push({ id: 'source', title: 'Source', level: 1, line: 1 });
  units.push({
    id: 'source.full-text-1',
    title: 'The Interdependent Way',
    section: 'source',
    level: 1,
    startLine: 1,
    endLine: lines.length,
    content: text,
    hash: contentSha256,
    routeSlug: 'source-full-text-1',
    reviewStatus: 'hmmm'
  });
}

const data = {
  source: {
    repository: provenance.repository || 'wayseer00/main',
    path: provenance.path || 'canon/INTERDEPENDENT_WAY.txt',
    branch: provenance.branch || 'main',
    commit: provenance.commit || process.env.CANON_COMMIT || 'local-snapshot',
    blob: provenance.blob || null,
    retrievedAt: provenance.retrieved_at || new Date().toISOString(),
    contentSha256,
    parserVersion
  },
  sections,
  units,
  notes,
  edges: [
    ...units.map((unit) => ({ from: unit.id, to: unit.section, type: 'unit-parent' })),
    ...notes.map((note) => ({ from: note.id, to: note.unit_id, type: 'note-unit' }))
  ]
};

await mkdir('src/_data/generated', { recursive: true });
await writeFile('src/_data/generated/canon.json', `${JSON.stringify(data, null, 2)}\n`);
console.log(`units ${units.length}`);
