// Usage: run `npm run test:links` after `npm run build`.
// Checks generated internal href/src targets and HTML fragments without network access.
// External URLs remain outside this deterministic release gate.
// === MODULE_BUILD ===
// id: generated_site_link_checker
//   module_name: generated-site-link-checker
//   module_kind: verification
//   summary: Fails publication when a generated internal link, asset reference, or HTML fragment has no target.
//   owner: Erin Spencer
//   public_surface: npm run test:links
//   internal_surface: _site generated files
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: npm run test:links
//   rollout: required by npm run check
//   rollback: restore only with an equally strict internal-link verifier
// === END MODULE_BUILD ===
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const siteRoot = path.resolve('_site');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function toSitePath(absolute) {
  return path.relative(siteRoot, absolute).split(path.sep).join('/');
}

function toRoute(sitePath) {
  if (sitePath === 'index.html') return '/';
  if (sitePath.endsWith('/index.html')) return `/${sitePath.slice(0, -'index.html'.length)}`;
  return `/${sitePath}`;
}

function targetCandidates(pathname) {
  const relative = pathname.replace(/^\/+/, '');
  if (!relative) return ['index.html'];
  if (pathname.endsWith('/')) return [`${relative}index.html`];
  return [relative, `${relative}/index.html`];
}

function extractReferences(html) {
  return [...html.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)].map(match => match[2].trim());
}

function extractFragments(html) {
  const fragments = new Set();
  for (const match of html.matchAll(/\b(?:id|name)\s*=\s*(["'])(.*?)\1/gi)) fragments.add(match[2]);
  return fragments;
}

const files = await walk(siteRoot);
const fileSet = new Set(files.map(toSitePath));
const htmlFiles = files.filter(file => file.endsWith('.html'));
const htmlBySitePath = new Map();
const fragmentsBySitePath = new Map();

for (const file of htmlFiles) {
  const sitePath = toSitePath(file);
  const html = await readFile(file, 'utf8');
  htmlBySitePath.set(sitePath, html);
  fragmentsBySitePath.set(sitePath, extractFragments(html));
}

const failures = [];
let checked = 0;

for (const [sourcePath, html] of htmlBySitePath) {
  const sourceRoute = toRoute(sourcePath);
  for (const reference of extractReferences(html)) {
    if (!reference || reference.startsWith('//')) continue;
    if (/^(?:data|mailto|tel|javascript):/i.test(reference)) continue;

    let resolved;
    try {
      resolved = new URL(reference, `https://site.invalid${sourceRoute}`);
    } catch {
      failures.push(`${sourceRoute}: malformed reference ${JSON.stringify(reference)}`);
      continue;
    }
    if (resolved.origin !== 'https://site.invalid') continue;

    let pathname;
    let fragment;
    try {
      pathname = decodeURIComponent(resolved.pathname);
      fragment = decodeURIComponent(resolved.hash.slice(1));
    } catch {
      failures.push(`${sourceRoute}: invalid percent-encoding in ${JSON.stringify(reference)}`);
      continue;
    }

    checked += 1;
    const targetPath = targetCandidates(pathname).find(candidate => fileSet.has(candidate));
    if (!targetPath) {
      failures.push(`${sourceRoute}: ${JSON.stringify(reference)} has no generated target`);
      continue;
    }
    if (fragment && targetPath.endsWith('.html') && !fragmentsBySitePath.get(targetPath)?.has(fragment)) {
      failures.push(`${sourceRoute}: ${JSON.stringify(reference)} has no #${fragment} target in /${targetPath}`);
    }
  }
}

if (failures.length) {
  console.error(`internal link check failed with ${failures.length} error(s):`);
  for (const failure of failures.sort()) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`internal link check passed: ${checked} references across ${htmlFiles.length} HTML files`);
}
