// Generate static, phone-sized reading pages from the parsed public collection.
// The only paths we write are our own repository slug, section names and numeric record/page numbers.
import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const READER_DIR = '.cache/msdmd-public-pages';
const PAGE_BYTES = 48 * 1024;
const RECORD_BYTES = 16 * 1024;
const sections = {
  facts: 'Native facts', declarations: 'Declarations', edges: 'Relationships', coverage: 'Coverage',
  discovery: 'Source inventory', gaps: 'Block adoption gaps', diagnostics: 'Diagnostics', conflicts: 'Conflicts',
  reader_manifests: 'Reader definitions', reader_runs: 'Reader runs', capabilities: 'Capabilities', requirements: 'Requirements'
};

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const display = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
const pre = value => '<pre>' + escape(display(value)) + '</pre>';
const link = (url, name) => '<a href="' + escape(url) + '">' + escape(name) + '</a>';
const bytes = value => Buffer.byteLength(value);

function shell(title, crumbs, body, index = false) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="color-scheme" content="dark"><title>' + escape(title) + ' · The Interdependent Way</title>'
    + '<link rel="stylesheet" href="/assets/css/site.css"><link rel="stylesheet" href="/assets/css/msdmd-reader.css"></head>'
    + (index ? '<body>' : '<body data-pagefind-ignore="all">') + '<a class="skip-link" href="#content">Skip to records</a><main id="content" class="site-main metadata-reader">'
    + '<nav class="breadcrumb" aria-label="Breadcrumb">' + crumbs.join(' / ') + '</nav><h1>' + escape(title) + '</h1>' + body + '</main></body></html>';
}

function sourceFile(record, section) {
  if (section === 'facts' || section === 'declarations') return record.source?.file ?? record.file ?? '';
  return '';
}

function recordLabel(record, section) {
  if (record == null || typeof record !== 'object') return String(record);
  if (section === 'facts') return record.subject?.identity || record.native?.id || record.kind;
  if (section === 'declarations') return record.id;
  if (section === 'edges') return record.kind;
  return record.code || record.reader_id || record.identity || record.file || sections[section] || 'Collection details';
}

function sourceLink(repo, head, record) {
  const file = record?.source?.file || record?.file;
  if (!file || typeof file !== 'string' || file.split('/').some(part => !part || part === '.' || part === '..')) return '';
  const line = record.source?.location?.start_line;
  const route = 'https://github.com/The-Interdependency/' + encodeURIComponent(repo) + '/blob/' + head
    + '/' + file.split('/').map(encodeURIComponent).join('/') + (Number.isSafeInteger(line) && line > 0 ? '#L' + line : '');
  return link(route, file + (Number.isSafeInteger(line) && line > 0 ? ' · line ' + line : ''));
}

async function recordHtml(dir, item, section, record, number) {
  const label = String(recordLabel(record, section) || sections[section] || 'Record');
  const fileLink = sourceLink(item.name, item.headSha, record);
  const badges = [record?.kind, record?.block, record?.standing].filter(v => v && v !== label).map(escape).join(' · ');
  let value = record;
  let metadata;
  if (section === 'facts') {
    const { native, ...rest } = record;
    if (native && Object.hasOwn(native, 'value')) {
      value = native.value;
      const { value: _value, ...nativeMeta } = native;
      metadata = { ...rest, native: nativeMeta };
    }
  } else if (section === 'declarations') {
    const { fields, ...rest } = record;
    value = fields; metadata = rest;
  }
  let content = pre(value);
  let provenance = metadata ? '<details><summary>Record provenance</summary>' + pre(metadata) + '</details>' : '';
  if (bytes(content) + bytes(provenance) > RECORD_BYTES) {
    const json = JSON.stringify(record, null, 2);
    await writeFile(path.join(dir, 'record-' + number + '.json'), json + '\n');
    content = '<p>Value preview</p>' + pre(String(display(value) ?? '').slice(0, 800))
      + '<p>' + link('../record-' + number + '.json', 'Open complete record (' + Math.ceil(bytes(json) / 1024) + ' KiB)') + '</p>';
    provenance = '';
  }
  return '<article id="r-' + number + '" class="metadata-record"><h2>' + escape(label.slice(0, 300)) + '</h2>'
    + (badges ? '<p>' + badges + '</p>' : '') + (fileLink ? '<p>Source · ' + fileLink + '</p>' : '')
    + content + provenance + '</article>';
}

async function writeSection(dir, route, item, key, records, crumbs) {
  const name = sections[key] || 'Collection details';
  const sectionDir = path.join(dir, key);
  await mkdir(sectionDir, { recursive: true });
  const groups = new Map();
  records.forEach((record, index) => {
    const file = sourceFile(record, key);
    if (!groups.has(file)) groups.set(file, []);
    groups.get(file).push({ record, number: index + 1 });
  });
  const pages = [];
  const files = [];
  let current, size;
  const ordered = [...groups].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  for (const [file, group] of ordered) {
    for (let i = 0; i < group.length; i++) {
      const { record, number } = group[i];
      const html = await recordHtml(sectionDir, item, key, record, number);
      if (!current || current.rows.length >= 24 || size + bytes(html) > PAGE_BYTES) {
        current = { rows: [], first: recordLabel(record, key) || name };
        pages.push(current); size = 0;
      }
      if (file && i === 0) files.push([file, pages.length + '/#r-' + number, group.length]);
      current.rows.push(html); size += bytes(html);
    }
  }
  const listing = files.length ? files.map(([file, href, count]) => '<li>' + link(href, file) + ' <small>(' + count + ')</small></li>')
    : pages.map((page, index) => '<li>' + link((index + 1) + '/', 'Page ' + (index + 1) + ' · ' + String(page.first).slice(0, 100)) + '</li>');
  const countLabel = records.length + (records.length === 1 ? ' record' : ' records');
  // Bound even a large source index; each file is reachable without downloading every record.
  const indexCount = Math.max(1, Math.ceil(listing.length / 160));
  const indexUrl = n => route + key + '/' + (n ? 'files-' + (n + 1) + '.html' : '');
  for (let n = 0; n < indexCount; n++) {
    const navigation = [n > 0 && link(indexUrl(n - 1), 'Previous index page'), n + 1 < indexCount && link(indexUrl(n + 1), 'Next index page')].filter(Boolean).join(' · ');
    const body = '<p>' + countLabel + '</p>' + (pages.length ? '<p>' + link('1/', 'Read records') + '</p>' : '')
      + (files.length ? '<h2>Browse by source file</h2>' : '') + '<ul class="metadata-index">'
      + listing.slice(n * 160, (n + 1) * 160).join('') + '</ul><nav>' + navigation + '</nav>';
    await writeFile(path.join(sectionDir, n ? 'files-' + (n + 1) + '.html' : 'index.html'), shell(name, crumbs, body));
  }
  for (const [i, page] of pages.entries()) {
    const nav = '<nav class="metadata-pager" aria-label="Record pages">' + [
      i > 0 && link('../' + i + '/', 'Previous'), link('../', 'Index'),
      i + 1 < pages.length && link('../' + (i + 2) + '/', 'Next')
    ].filter(Boolean).join(' · ') + '</nav>';
    const body = '<p>Page ' + (i + 1) + ' of ' + pages.length + ' · ' + countLabel + '</p>' + nav + page.rows.join('') + nav;
    const pageDir = path.join(sectionDir, String(i + 1));
    await mkdir(pageDir);
    await writeFile(path.join(pageDir, 'index.html'), shell(name, [...crumbs, link('../', name)], body));
  }
}

export async function writeMetadataPages(root, item) {
  const c = item.collection;
  const { name, slug, headSha, collectionSha256: digest } = item;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !(slug === '-github' && name === '.github')) throw new Error('Invalid metadata route slug');
  if (!/^[a-f0-9]{40}$/i.test(headSha) || !/^[a-f0-9]{64}$/i.test(digest)) throw new Error('Missing collection publication identity');
  const dir = path.join(root, slug, 'metadata');
  const route = '/projects/' + slug + '/metadata/';
  await mkdir(dir, { recursive: true });
  const crumbs = [link('/projects/', 'Projects'), link('/projects/' + slug + '/', name)];
  const readingCrumbs = [...crumbs, link(route, 'Metadata')];
  const groups = Object.entries(sections).filter(([key]) => Object.hasOwn(c, key));
  const rest = Object.fromEntries(Object.entries(c).filter(([key]) => !Object.hasOwn(sections, key)));
  const cards = [];
  for (const [key, label] of [...groups, ['collection', 'Collection details']]) {
    const records = key === 'collection' ? [rest] : Array.isArray(c[key]) ? c[key] : [c[key]];
    await writeSection(dir, route, item, key, records, readingCrumbs);
    cards.push('<li>' + link(key + '/', label) + ' <small>(' + records.length + ')</small></li>');
  }
  const exactSource = 'https://raw.githubusercontent.com/The-Interdependency/' + encodeURIComponent(name) + '/' + headSha + '/' + encodeURIComponent(name + '_msdmd.ts');
  const body = '<ul class="metadata-index">' + cards.join('') + '</ul><details><summary>Provenance</summary><dl><dt>Repository commit</dt><dd><code>'
    + headSha + '</code></dd><dt>Collection SHA-256</dt><dd><code>' + digest + '</code></dd></dl>'
    + link(exactSource, 'Open exact collection source') + '</details>';
  await writeFile(path.join(dir, 'index.html'), shell(name + ' metadata', crumbs, body, true));
  return route;
}

export async function publishMetadataPages(inputs, map, destination = READER_DIR) {
  const parent = path.dirname(destination);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(path.join(parent, 'msdmd-build-'));
  try {
    await mkdir(path.join(staging, 'projects'));
    const rows = new Map(map.repositories.map(row => [row.name, row]));
    for (const item of inputs) {
      const row = rows.get(item.name);
      if (row?.collection.status !== 'ok' || !item.collection) continue;
      row.collection.readerPath = await writeMetadataPages(path.join(staging, 'projects'), item);
    }
    await writeFile(path.join(staging, 'receipt.json'), JSON.stringify({ snapshot: map.sourceSnapshot.stateDigest }));
    await rm(destination, { recursive: true, force: true });
    await rename(staging, destination);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function prepareRetainedPages(map, destination = READER_DIR) {
  // Historical snapshots can predate this reader. Never link a page from a different snapshot.
  let valid = false;
  try {
    const receipt = JSON.parse(await readFile(path.join(destination, 'receipt.json'), 'utf8'));
    valid = receipt.snapshot === map.sourceSnapshot.stateDigest;
    if (valid) for (const row of map.repositories) {
      if (row.collection.readerPath) await access(path.join(destination, 'projects', row.slug, 'metadata', 'index.html'));
    }
  } catch { valid = false; }
  if (!valid) {
    await rm(destination, { recursive: true, force: true });
    await mkdir(path.join(destination, 'projects'), { recursive: true });
    for (const row of map.repositories) delete row.collection.readerPath;
  }
}
