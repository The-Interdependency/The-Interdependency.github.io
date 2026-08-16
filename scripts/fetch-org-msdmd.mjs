import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// === MODULE_BUILD ===
// id: organization_msdmd_map_collector
//   purpose: Join repo-owned msdmd collection points into one provenance-bearing organization map without transferring source authority to the website.
//   entrypoint: npm run refresh:msdmd
//   tests: tests/org-msdmd.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: organization_msdmd_source_boundary
//   network: reads only commit-pinned raw.githubusercontent.com collection files named <repo>_msdmd.ts; repository heads come from the prior GitHub metadata refresh
//   storage: writes generated and last-known-good JSON snapshots only
//   authority: repository collection points remain source authority; this module namespaces, resolves, aggregates, and displays their declared relations
//   failure: missing, invalid, stale, and unresolved inputs remain explicit hmmm evidence and are never silently omitted
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: organization_msdmd_exact_input_identity
//   given: a repository head and collection file are consumed
//   then: repository, exact head SHA, collection path, collection SHA-256, declared source commit, and match status remain in the output receipt
//   class: evidence
//
// id: organization_msdmd_no_inferred_edges
//   given: an msdmd edge target cannot be resolved exactly by local id, explicit repository identity, or globally unique declaration id
//   then: the edge is retained unresolved rather than guessed
//   class: safety
//
// id: organization_msdmd_reproducible_snapshot
//   given: repository heads and collection bytes do not change
//   then: the emitted JSON is byte-identical because no wall-clock build timestamp enters the artifact
//   class: correctness
// === END CONTRACTS ===
// Usage: run after `npm run refresh:github`. The generated artifact is consumed by /projects/map/ and copied to /assets/data/org-msdmd.json.

const ORGANIZATION = 'The-Interdependency';
const RAW_GITHUB_ORIGIN = 'https://raw.githubusercontent.com';
const GENERATED_REPOS = 'src/_data/generated/repos.json';
const GENERATED_OUT = 'src/_data/generated/orgMsdmd.json';
const SNAPSHOT_OUT = 'src/_data/snapshots/org-msdmd.last-known-good.json';
const COLLECTION_SUFFIX = '_msdmd.ts';
const COLLECTION_MARKER = 'defineMsdmdCollection(';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function rawGithubUrl(repo, commit, path) {
  const parts = [ORGANIZATION, repo, commit, ...String(path).split('/')].map(encodeURIComponent);
  return new URL(`/${parts.join('/')}`, RAW_GITHUB_ORIGIN);
}

function getText(target) {
  const url = target instanceof URL ? target : new URL(target);
  if (url.protocol !== 'https:' || url.origin !== RAW_GITHUB_ORIGIN) {
    throw new Error(`refusing non-raw-GitHub target: ${url.origin}`);
  }
  return execFileSync(
    'curl',
    ['-fsSL', '--retry', '2', '--max-time', '20', url.href],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
}

export function stripComments(text) {
  let out = '';
  let quote = '';
  for (let i = 0; i < text.length;) {
    const ch = text[i];
    if (quote) {
      out += ch;
      if (ch === '\\' && i + 1 < text.length) {
        out += text[i + 1];
        i += 2;
        continue;
      }
      if (ch === quote) quote = '';
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      i += 2;
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

export function extractCollectionPayload(text) {
  const start = text.indexOf(COLLECTION_MARKER);
  if (start < 0) throw new Error('collection marker not found');
  const payloadStart = start + COLLECTION_MARKER.length;
  let depth = 1;
  let quote = '';
  for (let i = payloadStart; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(payloadStart, i);
    }
  }
  throw new Error('unterminated collection call');
}

function readQuoted(text, start) {
  const quote = text[start];
  let value = '';
  for (let i = start + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === quote) return { json: JSON.stringify(value), next: i + 1 };
    if (ch !== '\\') {
      value += ch;
      continue;
    }
    if (i + 1 >= text.length) throw new Error('unterminated string escape');
    const next = text[++i];
    const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };
    if (next === 'u') {
      const hex = text.slice(i + 1, i + 5);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new Error('invalid unicode escape');
      value += String.fromCharCode(Number.parseInt(hex, 16));
      i += 4;
    } else if (next === 'x') {
      const hex = text.slice(i + 1, i + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) throw new Error('invalid hex escape');
      value += String.fromCharCode(Number.parseInt(hex, 16));
      i += 2;
    } else {
      value += escapes[next] ?? next;
    }
  }
  throw new Error('unterminated quoted string');
}

export function objectLiteralToJson(text) {
  let out = '';
  for (let i = 0; i < text.length;) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      const quoted = readQuoted(text, i);
      out += quoted.json;
      i = quoted.next;
      continue;
    }
    const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(text.slice(i));
    if (match) {
      const ident = match[0];
      let j = i + ident.length;
      while (/\s/.test(text[j] || '')) j += 1;
      out += text[j] === ':' ? JSON.stringify(ident) : ident;
      i += ident.length;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}

export function parseCollectionText(text) {
  const stripped = stripComments(String(text)).trim();
  if (stripped.startsWith('{')) return JSON.parse(stripped);
  const payload = extractCollectionPayload(stripped).trim();
  try {
    return JSON.parse(payload);
  } catch {
    return JSON.parse(objectLiteralToJson(payload));
  }
}

function normalizeRepoName(value) {
  const name = String(value || '');
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name)) throw new Error(`invalid repository name: ${name}`);
  return name;
}

function normalizeDeclaration(repoName, declaration) {
  const localId = String(declaration?.id || '').trim();
  if (!localId) return null;
  return {
    id: `${repoName}::${localId}`,
    localId,
    repo: repoName,
    file: String(declaration?.file || 'hmmm'),
    block: String(declaration?.block || 'hmmm'),
    fields: declaration?.fields && typeof declaration.fields === 'object' ? declaration.fields : {}
  };
}

function explicitRepoTarget(target, repoNames) {
  if (repoNames.has(target)) return { repo: target, declaration: null };
  const full = new RegExp(`^${ORGANIZATION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^@#:\\s/]+)(?:@[^#:\\s]+)?(?:#{1}|::)(.+)$`).exec(target);
  if (full && repoNames.has(full[1])) return { repo: full[1], declaration: full[2].trim() || null };
  const fullRepo = new RegExp(`^${ORGANIZATION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^@#:\\s/]+)(?:@[^#:\\s]+)?$`).exec(target);
  if (fullRepo && repoNames.has(fullRepo[1])) return { repo: fullRepo[1], declaration: null };
  const scoped = /^([^:\s]+)::(.+)$/.exec(target);
  if (scoped && repoNames.has(scoped[1])) return { repo: scoped[1], declaration: scoped[2].trim() || null };
  return null;
}

function resolveEdgeTarget(sourceRepo, target, context) {
  const raw = String(target || '').trim();
  if (!raw) return { resolution: 'unresolved', targetId: null, targetRepo: null };

  const local = `${sourceRepo}::${raw}`;
  if (context.declarationIds.has(local)) {
    return { resolution: 'local-declaration', targetId: local, targetRepo: sourceRepo };
  }

  const explicit = explicitRepoTarget(raw, context.repoNames);
  if (explicit) {
    if (!explicit.declaration) {
      return { resolution: 'explicit-repository', targetId: `repo:${explicit.repo}`, targetRepo: explicit.repo };
    }
    const explicitId = `${explicit.repo}::${explicit.declaration}`;
    if (context.declarationIds.has(explicitId)) {
      return { resolution: 'explicit-declaration', targetId: explicitId, targetRepo: explicit.repo };
    }
    return { resolution: 'unresolved', targetId: null, targetRepo: explicit.repo };
  }

  const global = context.globalIds.get(raw) || [];
  if (global.length === 1) {
    const [targetId] = global;
    return { resolution: 'unique-global-declaration', targetId, targetRepo: targetId.split('::')[0] };
  }
  return { resolution: 'unresolved', targetId: null, targetRepo: null };
}

function aggregateRepositoryEdges(edges) {
  const grouped = new Map();
  for (const edge of edges) {
    if (!edge.targetRepo || edge.targetRepo === edge.sourceRepo || edge.resolution === 'unresolved') continue;
    const key = `${edge.sourceRepo}\u0000${edge.targetRepo}`;
    const entry = grouped.get(key) || {
      from: edge.sourceRepo,
      to: edge.targetRepo,
      count: 0,
      kinds: new Set(),
      sourceBlocks: new Set()
    };
    entry.count += 1;
    entry.kinds.add(edge.kind);
    entry.sourceBlocks.add(edge.sourceBlock);
    grouped.set(key, entry);
  }
  return [...grouped.values()]
    .map(item => ({
      from: item.from,
      to: item.to,
      count: item.count,
      kinds: [...item.kinds].sort(),
      sourceBlocks: [...item.sourceBlocks].sort()
    }))
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

export function buildOrgMap(repositoryInputs) {
  const repoNames = new Set(repositoryInputs.map(item => item.name));
  const declarations = [];
  const gaps = [];
  const repositoryRows = [];

  for (const item of repositoryInputs) {
    const hmmm = [...(item.hmmm || [])];
    const collection = item.collection || null;
    const row = {
      name: item.name,
      slug: item.slug,
      archived: Boolean(item.archived),
      defaultBranch: item.defaultBranch || null,
      headSha: item.headSha || null,
      headCommittedAt: item.headCommittedAt || null,
      collection: {
        status: item.collectionStatus || 'missing',
        path: item.collectionPath || `${item.name}${COLLECTION_SUFFIX}`,
        sha256: item.collectionSha256 || null,
        declaredRepo: collection?.repo || null,
        declaredSourceCommit: collection?.source_commit || null,
        sourceCommitMatchesHead: collection?.source_commit && item.headSha
          ? collection.source_commit === item.headSha
          : null,
        error: item.collectionError || null
      },
      counts: { declarations: 0, gaps: 0, edges: 0, resolvedEdges: 0, unresolvedEdges: 0, crossRepoEdges: 0 },
      blockCounts: {},
      hmmm
    };

    if (!collection) {
      if (item.collectionStatus === 'invalid') hmmm.push('The repository collection point was present but could not be parsed.');
      else hmmm.push('No consumable repo-level msdmd collection point was found at the recorded head.');
      repositoryRows.push(row);
      continue;
    }
    if (collection.repo && collection.repo !== item.name) {
      hmmm.push(`Collection declares repo=${collection.repo}; consumed repository is ${item.name}.`);
    }
    if (row.collection.sourceCommitMatchesHead === false) {
      hmmm.push('Collection-declared source_commit does not match the repository head consumed by this website build.');
    }

    for (const declaration of collection.declarations || []) {
      const normalized = normalizeDeclaration(item.name, declaration);
      if (!normalized) continue;
      declarations.push(normalized);
      row.counts.declarations += 1;
      row.blockCounts[normalized.block] = (row.blockCounts[normalized.block] || 0) + 1;
    }
    for (const gap of collection.gaps || []) {
      gaps.push({
        repo: item.name,
        file: String(gap?.file || 'hmmm'),
        missing: Array.isArray(gap?.missing) ? gap.missing.map(String) : [],
        reason: gap?.reason ? String(gap.reason) : null
      });
      row.counts.gaps += 1;
    }
    row._rawEdges = Array.isArray(collection.edges) ? collection.edges : [];
    row.counts.edges = row._rawEdges.length;
    repositoryRows.push(row);
  }

  const declarationIds = new Set(declarations.map(item => item.id));
  const globalIds = new Map();
  for (const declaration of declarations) {
    const values = globalIds.get(declaration.localId) || [];
    values.push(declaration.id);
    globalIds.set(declaration.localId, values);
  }
  const context = { repoNames, declarationIds, globalIds };
  const edges = [];
  for (const row of repositoryRows) {
    for (const edge of row._rawEdges || []) {
      const sourceLocalId = String(edge?.from || edge?.source_id || 'hmmm');
      const sourceId = declarationIds.has(`${row.name}::${sourceLocalId}`)
        ? `${row.name}::${sourceLocalId}`
        : `${row.name}::${sourceLocalId}`;
      const targetRaw = String(edge?.to || 'hmmm');
      const resolved = resolveEdgeTarget(row.name, targetRaw, context);
      const normalized = {
        sourceRepo: row.name,
        sourceId,
        sourceLocalId,
        targetRaw,
        targetId: resolved.targetId,
        targetRepo: resolved.targetRepo,
        resolution: resolved.resolution,
        kind: String(edge?.kind || 'relation'),
        sourceBlock: String(edge?.source_block || 'hmmm'),
        sourceDeclarationId: String(edge?.source_id || sourceLocalId)
      };
      edges.push(normalized);
      if (normalized.resolution === 'unresolved') row.counts.unresolvedEdges += 1;
      else row.counts.resolvedEdges += 1;
      if (normalized.targetRepo && normalized.targetRepo !== row.name && normalized.resolution !== 'unresolved') {
        row.counts.crossRepoEdges += 1;
      }
    }
    delete row._rawEdges;
  }

  const repositoryEdges = aggregateRepositoryEdges(edges);
  const unresolvedEdges = edges.filter(edge => edge.resolution === 'unresolved');
  const collectionCount = repositoryRows.filter(repo => repo.collection.status === 'ok').length;
  const invalidCollectionCount = repositoryRows.filter(repo => repo.collection.status === 'invalid').length;
  const missingCollectionCount = repositoryRows.length - collectionCount - invalidCollectionCount;
  const resolvedEdgeCount = edges.length - unresolvedEdges.length;
  const latestHeadCommittedAt = repositoryRows
    .map(repo => repo.headCommittedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
  const stateMaterial = repositoryRows
    .map(repo => ({
      repo: repo.name,
      headSha: repo.headSha,
      collectionStatus: repo.collection.status,
      collectionSha256: repo.collection.sha256
    }))
    .sort((a, b) => a.repo.localeCompare(b.repo));

  return {
    schema: 'interdependency.org-msdmd-map/0.1.0',
    organization: ORGANIZATION,
    fallback: false,
    sourceSnapshot: {
      policy: 'current default-branch heads recorded by refresh:github; collection bytes fetched at those exact SHAs',
      latestHeadCommittedAt,
      stateDigest: sha256(JSON.stringify(stateMaterial))
    },
    summary: {
      repositoryCount: repositoryRows.length,
      collectionCount,
      missingCollectionCount,
      invalidCollectionCount,
      declarationCount: declarations.length,
      gapCount: gaps.length,
      edgeCount: edges.length,
      resolvedEdgeCount,
      crossRepoEdgeCount: repositoryEdges.reduce((sum, edge) => sum + edge.count, 0),
      crossRepoPairCount: repositoryEdges.length,
      unresolvedEdgeCount: unresolvedEdges.length
    },
    repositories: repositoryRows.sort((a, b) => a.name.localeCompare(b.name)),
    declarations: declarations.sort((a, b) => a.repo.localeCompare(b.repo) || a.file.localeCompare(b.file) || a.block.localeCompare(b.block) || a.localId.localeCompare(b.localId)),
    gaps: gaps.sort((a, b) => a.repo.localeCompare(b.repo) || a.file.localeCompare(b.file)),
    edges: edges.sort((a, b) => a.sourceRepo.localeCompare(b.sourceRepo) || a.sourceId.localeCompare(b.sourceId) || a.kind.localeCompare(b.kind) || a.targetRaw.localeCompare(b.targetRaw)),
    repositoryEdges,
    unresolvedEdges: unresolvedEdges.sort((a, b) => a.sourceRepo.localeCompare(b.sourceRepo) || a.sourceId.localeCompare(b.sourceId) || a.targetRaw.localeCompare(b.targetRaw)),
    hmmm: [
      'An unresolved edge means the source repository declared a target that cannot be exactly identified from current repo collection identities; the website does not guess the relation.',
      'Missing collection points remain visible until the source repository publishes one.'
    ]
  };
}

async function fetchRepositoryInputs(repositories) {
  const inputs = [];
  for (const repo of repositories) {
    const name = normalizeRepoName(repo.name);
    const collectionPath = `${name}${COLLECTION_SUFFIX}`;
    const base = {
      name,
      slug: repo.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      archived: repo.archived,
      defaultBranch: repo.default_branch,
      headSha: repo.head_sha || null,
      headCommittedAt: repo.head_committed_at || null,
      collectionPath,
      hmmm: []
    };
    if (!base.headSha) {
      inputs.push({ ...base, collectionStatus: 'missing', collectionError: 'exact default-branch head unavailable' });
      continue;
    }
    try {
      const text = getText(rawGithubUrl(name, base.headSha, collectionPath));
      const collection = parseCollectionText(text);
      inputs.push({
        ...base,
        collectionStatus: 'ok',
        collectionSha256: sha256(Buffer.from(text, 'utf8')),
        collection
      });
    } catch (error) {
      const stderr = String(error?.stderr || '');
      const status = /404|not found/i.test(stderr) ? 'missing' : 'invalid';
      inputs.push({
        ...base,
        collectionStatus: status,
        collectionError: status === 'missing' ? 'collection point absent at consumed head' : String(error?.message || error)
      });
    }
  }
  return inputs;
}

async function main() {
  await mkdir('src/_data/generated', { recursive: true });
  await mkdir('src/_data/snapshots', { recursive: true });

  if (process.env.OFFLINE === '1') {
    const fallback = JSON.parse(await readFile(SNAPSHOT_OUT, 'utf8'));
    fallback.fallback = true;
    fallback.hmmm = [...new Set([...(fallback.hmmm || []), 'OFFLINE=1: displaying the last-known-good org msdmd snapshot.'])];
    await writeFile(GENERATED_OUT, stableJson(fallback));
    console.log(`org-msdmd ${fallback.summary?.collectionCount || 0}/${fallback.summary?.repositoryCount || 0} fallback`);
    return;
  }

  try {
    const repoData = JSON.parse(await readFile(GENERATED_REPOS, 'utf8'));
    const inputs = await fetchRepositoryInputs(repoData.repositories || []);
    const data = buildOrgMap(inputs);
    await writeFile(GENERATED_OUT, stableJson(data));
    await writeFile(SNAPSHOT_OUT, stableJson(data));
    console.log(`org-msdmd ${data.summary.collectionCount}/${data.summary.repositoryCount} collections · ${data.summary.crossRepoPairCount} cross-repo pairs · ${data.summary.unresolvedEdgeCount} unresolved edges`);
  } catch (error) {
    const fallback = JSON.parse(await readFile(SNAPSHOT_OUT, 'utf8'));
    fallback.fallback = true;
    fallback.hmmm = [...new Set([...(fallback.hmmm || []), `Refresh failed; displaying last-known-good snapshot: ${String(error?.message || error)}`])];
    await writeFile(GENERATED_OUT, stableJson(fallback));
    console.log(`org-msdmd ${fallback.summary?.collectionCount || 0}/${fallback.summary?.repositoryCount || 0} fallback`);
  }
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) await main();
