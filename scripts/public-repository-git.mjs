// Anonymous Git transport for live GitHub lookups when its REST API cannot serve the request.
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const shaPattern = /^[a-f0-9]{40}$/;
function publicUrl(repo) {
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(repo) || repo === '.' || repo === '..') throw new Error('invalid public repository name');
  return 'https://github.com/The-Interdependency/' + repo + '.git';
}

function anonymousGit(args, cwd = tmpdir()) {
  // The web service may hold GitHub credentials for other purposes. Git must prove public access itself.
  const env = { PATH: process.env.PATH, NETRC: '/dev/null', LC_ALL: 'C', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_ALLOW_PROTOCOL: 'https', GIT_TERMINAL_PROMPT: '0', GIT_CEILING_DIRECTORIES: tmpdir() };
  for (const name of ['https_proxy', 'HTTPS_PROXY', 'http_proxy', 'HTTP_PROXY', 'no_proxy', 'NO_PROXY', 'SSL_CERT_FILE']) {
    if (process.env[name]) env[name] = process.env[name];
  }
  return execute('git', ['-c', 'credential.helper=', '-c', 'http.followRedirects=false', ...args],
    { cwd, env, encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
}

// The first advertised ref in Git's HTTP protocol v0 is HEAD with the default-branch symref.
// Read at most one packet after the service header, even if a repo advertises thousands of refs.
export async function readPublicHead(repo) {
  const response = await fetch(publicUrl(repo) + '/info/refs?service=git-upload-pack', {
    redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(15_000),
    headers: { accept: 'application/x-git-upload-pack-advertisement' }
  });
  if (!response.ok || response.headers.get('content-type')?.split(';')[0] !== 'application/x-git-upload-pack-advertisement') {
    await response.body?.cancel();
    throw new Error('Anonymous Git ref discovery failed (HTTP ' + response.status + ')');
  }
  const service = '001e# service=git-upload-pack\n0000';
  const headerBytes = service.length + 4;
  const limit = service.length + 65535;
  let data = Buffer.alloc(0);
  for await (const chunk of response.body) {
    data = Buffer.concat([data, chunk.subarray(0, limit - data.length)]);
    if (data.length < headerBytes) continue;
    const header = data.subarray(0, headerBytes).toString('ascii');
    const length = header.slice(service.length);
    if (!header.startsWith(service) || !/^[0-9a-f]{4}$/.test(length)) break;
    const end = service.length + Number.parseInt(length, 16);
    if (end < headerBytes) break;
    if (data.length < end) continue;
    const [ref, capabilities = ''] = data.subarray(headerBytes, end).toString('utf8').trimEnd().split('\0');
    const headSha = /^([a-f0-9]{40}) HEAD$/.exec(ref)?.[1];
    const defaultBranch = /(?:^| )symref=HEAD:refs\/heads\/([^ ]+)/.exec(capabilities)?.[1];
    if (headSha && defaultBranch) return { defaultBranch, headSha, headCommittedAt: null };
    break;
  }
  throw new Error('Public Git did not advertise a default-branch commit');
}

export async function readPublicDocumentTree(repo, headSha) {
  const url = publicUrl(repo);
  if (!shaPattern.test(headSha)) throw new Error('An exact public commit is required');
  const dir = await mkdtemp(join(tmpdir(), 'public-repository-tree-'));
  try {
    await anonymousGit(['init', '--bare', '--quiet'], dir);
    await anonymousGit(['fetch', '--quiet', '--depth=1', '--no-tags', '--filter=blob:none', url, headSha], dir);
    // Restrict output to paths the documentation reader can consume. No working tree or blob checkout.
    const { stdout } = await anonymousGit(['ls-tree', '-r', '-z', '--full-tree', headSha], dir);
    const tree = [];
    for (const entry of stdout.split('\0')) {
      const match = /^\d+ blob [a-f0-9]{40}\t([^\0]+\.md)$/i.exec(entry);
      if (match) tree.push({ type: 'blob', path: match[1] });
    }
    return { tree, truncated: false };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
