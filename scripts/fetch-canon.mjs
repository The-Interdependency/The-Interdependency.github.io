import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// === MODULE_BUILD ===
// id: canonical_source_fetch
//   purpose: Retrieve the Wayseer canonical text or preserve a visibly labeled local recovery mirror.
//   entrypoint: npm run refresh:canon
//   tests: tests/canon-integrity.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: canon_network_boundary
//   network: read-only HTTPS request to raw.githubusercontent.com
//   storage: writes generated snapshots beneath src/_data/snapshots
//   failure: falls back to the repository mirror and records fallback=true
// === END BOUNDARIES ===

const canonical = {
  repository: 'wayseer00/wayseer.github.io',
  path: 'canon/the_interdependent_way.md',
  branch: 'main',
  url: 'https://raw.githubusercontent.com/wayseer00/wayseer.github.io/main/canon/the_interdependent_way.md'
};
const localMirror = 'canon/the_interdependent_way.md';

function fetchRemote() {
  if (process.env.OFFLINE === '1') throw new Error('offline requested');
  return execFileSync('curl', ['-fsSL', '--retry', '2', '--max-time', '30', canonical.url], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

await mkdir('src/_data/snapshots', { recursive: true });
let text;
let fallback = false;
let retrievalError = null;
try {
  text = fetchRemote();
} catch (error) {
  fallback = true;
  retrievalError = String(error?.message || error);
  text = await readFile(localMirror, 'utf8');
}
if (!text.trim()) throw new Error('canonical text is empty');

let siteCommit = 'unknown';
try {
  siteCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {}
const contentSha256 = createHash('sha256').update(text).digest('hex');
const metadata = {
  ...canonical,
  retrievedAt: new Date().toISOString(),
  contentSha256,
  fallback,
  fallbackSource: fallback ? localMirror : null,
  retrievalError: fallback ? retrievalError : null,
  siteCommit
};
await writeFile('src/_data/snapshots/canon.last-known-good.md', `---\n${JSON.stringify(metadata)}\n---\n${text}`);
await writeFile('src/_data/snapshots/canon.provenance.json', JSON.stringify(metadata, null, 2));
console.log(`canon ${canonical.repository}/${canonical.path} ${contentSha256}${fallback ? ' fallback' : ''}`);
