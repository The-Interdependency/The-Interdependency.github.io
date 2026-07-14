import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const owner = 'wayseer00';
const repo = 'main';
const branch = 'main';
const path = 'canon/INTERDEPENDENT_WAY.txt';
const repository = `${owner}/${repo}`;
const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

function curlJson(url) {
  const args = ['-fsSL', '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'];
  if (process.env.GITHUB_TOKEN) args.push('-H', `Authorization: Bearer ${process.env.GITHUB_TOKEN}`);
  args.push(url);
  return JSON.parse(execFileSync('curl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
}

function curlText(url) {
  return execFileSync('curl', ['-fsSL', url], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 });
}

let text;
let commit;
let blob;
let fallback = false;
try {
  const branchInfo = curlJson(`${apiBase}/branches/${branch}`);
  const contentInfo = curlJson(`${apiBase}/contents/${encodeURIComponent(path).replaceAll('%2F', '/')}?ref=${branch}`);
  text = curlText(rawUrl);
  commit = branchInfo.commit.sha;
  blob = contentInfo.sha;
} catch (error) {
  fallback = true;
  throw new Error(`Unable to fetch canonical text from ${repository}:${branch}/${path}. hmmm: canon is only valid from wayseer00/main main; refusing local substitute. ${error.message}`);
}

const hash = createHash('sha256').update(text).digest('hex');
await mkdir('src/_data/snapshots', { recursive: true });
await writeFile('src/_data/snapshots/canon.last-known-good.md', `---\nrepository: ${repository}\npath: ${path}\nbranch: ${branch}\ncommit: ${commit}\nblob: ${blob}\nretrieved_at: ${new Date().toISOString()}\ncontent_sha256: ${hash}\nfallback: ${fallback}\n---\n${text}`);
console.log(`canon ${repository}@${commit} ${hash}`);
