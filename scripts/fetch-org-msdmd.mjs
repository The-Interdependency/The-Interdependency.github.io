import { fetchCollection, parseCollectionText, matchesRepository, collectionCounts } from './msdmd-collection.mjs';
import { prepareRetainedPages, publishMetadataPages } from './msdmd-pages.mjs';
export { parseCollectionText } from './msdmd-collection.mjs';
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
//   failure: missing, invalid, stale, ambiguous, and broken explicit inputs remain visible; ordinary owner/file/route/tool/external targets remain valid opaque relations rather than being mislabeled hmmm
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: organization_msdmd_exact_input_identity
//   given: a repository head and collection file are consumed
//   then: repository, exact head SHA, collection path, collection SHA-256, declared source commit, and match status remain in the output receipt
//   class: evidence
//
// id: organization_msdmd_target_kinds_remain_distinct
//   given: an msdmd edge target is not a repository or declaration identity
//   then: retain it as an opaque external target; only empty, ambiguous declaration, or broken explicit declaration references become unresolved hmmm
//   class: safety
//
// id: organization_msdmd_reproducible_snapshot
//   given: repository heads and collection bytes do not change
//   then: the emitted JSON is byte-identical because no wall-clock build timestamp enters the artifact
//   class: correctness
// === END CONTRACTS ===
// Usage: run after `npm run refresh:github`. The generated artifact is consumed by /projects/map/ and copied to /assets/data/org-msdmd.json.

const ORGANIZATION = 'The-Interdependency';
const GENERATED_REPOS = 'src/_data/generated/repos.json';
const GENERATED_OUT = 'src/_data/generated/orgMsdmd.json';
const SNAPSHOT_OUT = 'src/_data/snapshots/org-msdmd.last-known-good.json';
const COLLECTION_SUFFIX = '_msdmd.ts';
const HMMM_RESOLUTIONS = new Set(['empty-target', 'ambiguous-declaration', 'broken-explicit-declaration']);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
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
    id: declaration.address || `${repoName}::${localId}`,
    localId,
    repo: repoName,
    file: String(declaration?.file || 'hmmm'),
    block: String(declaration?.block || 'hmmm'),
    fields: declaration?.fields && typeof declaration.fields === 'object' ? declaration.fields : {}
  };
}

function explicitRepoTarget(target, repoNames) {
  if (repoNames.has(target)) return { repo: target, declaration: null };
  const escapedOrg = ORGANIZATION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const full = new RegExp(`^${escapedOrg}/([^@#:\\s/]+)(?:@[^#:\\s]+)?(?:#{1}|::)(.+)$`).exec(target);
  if (full && repoNames.has(full[1])) return { repo: full[1], declaration: full[2].trim() || null };
  const fullRepo = new RegExp(`^${escapedOrg}/([^@#:\\s/]+)(?:@[^#:\\s]+)?$`).exec(target);
  if (fullRepo && repoNames.has(fullRepo[1])) return { repo: fullRepo[1], declaration: null };
  const scoped = /^([^:\s]+)::(.+)$/.exec(target);
  if (scoped && repoNames.has(scoped[1])) return { repo: scoped[1], declaration: scoped[2].trim() || null };
  return null;
}

function resolveEdgeTarget(sourceRepo, target, context) {
  const raw = String(target || '').trim();
  if (!raw) return { resolution: 'empty-target', targetId: null, targetRepo: null };

  const local = `${sourceRepo}::${raw}`;
  if (context.addressOwners.has(raw)) {
    return { resolution: 'qualified-address', targetId: raw, targetRepo: context.addressOwners.get(raw) };
  }
  const localTargets = context.aliases.get(local) || [];
  if (localTargets.length === 1) return { resolution: 'local-declaration', targetId: localTargets[0], targetRepo: sourceRepo };
  if (localTargets.length > 1) return { resolution: 'ambiguous-declaration', targetId: null, targetRepo: null };

  const explicit = explicitRepoTarget(raw, context.repoNames);
  if (explicit) {
    if (!explicit.declaration) {
      return { resolution: 'explicit-repository', targetId: `repo:${explicit.repo}`, targetRepo: explicit.repo };
    }
    const explicitId = `${explicit.repo}::${explicit.declaration}`;
    const targets = context.aliases.get(explicitId) || [];
    if (targets.length === 1) return { resolution: 'explicit-declaration', targetId: targets[0], targetRepo: explicit.repo };
    if (targets.length > 1) return { resolution: 'ambiguous-declaration', targetId: null, targetRepo: explicit.repo };
    return { resolution: 'broken-explicit-declaration', targetId: null, targetRepo: explicit.repo };
  }

  const global = context.globalIds.get(raw) || [];
  if (global.length === 1) {
    const [targetId] = global;
    return { resolution: 'unique-global-declaration', targetId, targetRepo: context.addressOwners.get(targetId) };
  }
  if (global.length > 1) {
    return { resolution: 'ambiguous-declaration', targetId: null, targetRepo: null };
  }
  return { resolution: 'external-target', targetId: null, targetRepo: null };
}

function isHmmmResolution(value) {
  return HMMM_RESOLUTIONS.has(value);
}

function aggregateRepositoryEdges(edges) {
  const grouped = new Map();
  for (const edge of edges) {
    if (!edge.targetRepo || edge.targetRepo === edge.sourceRepo || isHmmmResolution(edge.resolution)) continue;
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

  const addressOwners = new Map();
  const aliases = new Map();
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
      counts: {
        nativeFacts: null,
        declarations: 0,
        gaps: 0,
        edges: 0,
        resolvedEdges: 0,
        externalTargets: 0,
        unresolvedEdges: 0,
        crossRepoEdges: 0
      },
      blockCounts: {},
      hmmm
    };

    if (!collection || !matchesRepository(collection, item.name)) {
      for (const key of Object.keys(row.counts)) row.counts[key] = null;
    }
    if (!collection) {
      if (item.collectionStatus === 'invalid') hmmm.push('The repository collection point was present but could not be parsed.');
      else hmmm.push('No consumable repo-level msdmd collection point was found at the recorded head.');
      repositoryRows.push(row);
      continue;
    }
    if (!matchesRepository(collection, item.name)) {
      row.collection.status = 'invalid';
      hmmm.push(`Collection declares repo=${collection.repo}; consumed repository is ${item.name}.`);
      repositoryRows.push(row);
      continue;
    }
    if (row.collection.sourceCommitMatchesHead === false) {
      hmmm.push('Collection-declared source_commit does not match the repository head consumed by this website build.');
    }

    row.collection.schemaVersion = collection.schema_version || '1.0.0';
    row.collection.sourceRevision = collection.source?.revision || collection.source_commit || null;
    Object.assign(row.counts, collectionCounts(collection));
    for (const fact of collection.facts || []) {
      if (fact.address) addressOwners.set(fact.address, item.name);
      if (fact.subject?.address) addressOwners.set(fact.subject.address, item.name);
    }
    for (const declaration of collection.declarations || []) {
      const normalized = normalizeDeclaration(item.name, declaration);
      if (!normalized) continue;
      declarations.push(normalized);
      addressOwners.set(normalized.id, item.name);
      const alias = item.name + '::' + normalized.localId;
      const local = aliases.get(alias) || [];
      local.push(normalized.id);
      aliases.set(alias, local);
      row.blockCounts[normalized.block] = (row.blockCounts[normalized.block] || 0) + 1;
    }
    for (const gap of collection.gaps || []) {
      gaps.push({
        repo: item.name,
        file: String(gap?.file || 'hmmm'),
        missing: Array.isArray(gap?.missing) ? gap.missing.map(String) : [],
        reason: gap?.reason ? String(gap.reason) : null
      });
    }
    row._rawEdges = Array.isArray(collection.edges) ? collection.edges : [];
    row.counts.edges = row._rawEdges.length;
    repositoryRows.push(row);
  }

  const globalIds = new Map();
  for (const declaration of declarations) {
    const values = globalIds.get(declaration.localId) || [];
    values.push(declaration.id);
    globalIds.set(declaration.localId, values);
  }
  const context = { repoNames, addressOwners, aliases, globalIds };
  const edges = [];
  for (const row of repositoryRows) {
    for (const edge of row._rawEdges || []) {
      const from = String(edge?.from || edge?.source_id || 'hmmm');
      const nativeFormat = row.collection.schemaVersion === '2.0.0';
      const sourceLocalId = nativeFormat ? edge.source_entry_id ?? null : from;
      const sourceId = nativeFormat ? from : `${row.name}::${from}`;
      const targetRaw = String(edge?.to || '');
      const resolved = edge.target_resolution === 'ambiguous'
        ? { resolution: 'ambiguous-declaration', targetId: null, targetRepo: null }
        : resolveEdgeTarget(row.name, targetRaw, context);
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
        sourceDeclarationId: nativeFormat ? edge.source_id ?? null : String(edge?.source_id || from),
        ...(edge.target_resolution ? { declaredTargetResolution: edge.target_resolution } : {})
      };
      edges.push(normalized);
      if (isHmmmResolution(normalized.resolution)) row.counts.unresolvedEdges += 1;
      else if (normalized.resolution === 'external-target') row.counts.externalTargets += 1;
      else row.counts.resolvedEdges += 1;
      if (normalized.targetRepo && normalized.targetRepo !== row.name && !isHmmmResolution(normalized.resolution)) {
        row.counts.crossRepoEdges += 1;
      }
    }
    delete row._rawEdges;
  }

  const repositoryEdges = aggregateRepositoryEdges(edges);
  const unresolvedEdges = edges.filter(edge => isHmmmResolution(edge.resolution));
  const externalTargetCount = edges.filter(edge => edge.resolution === 'external-target').length;
  const graphResolvedEdgeCount = edges.length - unresolvedEdges.length - externalTargetCount;
  const collectionCount = repositoryRows.filter(repo => repo.collection.status === 'ok').length;
  const invalidCollectionCount = repositoryRows.filter(repo => repo.collection.status === 'invalid').length;
  const missingCollectionCount = repositoryRows.length - collectionCount - invalidCollectionCount;
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
      nativeFactCount: repositoryRows.reduce((sum, row) => sum + (row.counts.nativeFacts || 0), 0),
      gapCount: gaps.length,
      edgeCount: edges.length,
      resolvedEdgeCount: graphResolvedEdgeCount,
      externalTargetCount,
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
      'Only empty, ambiguous declaration, and broken explicit declaration references are unresolved. Ordinary owners, routes, files, tools, capability names, and external systems remain valid opaque targets.',
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
      const bytes = await fetchCollection(name, base.headSha);
      const collection = parseCollectionText(bytes.toString('utf8'));
      if (!matchesRepository(collection, name)) throw new Error('Collection declares a different repository');
      inputs.push({
        ...base,
        collectionStatus: 'ok',
        collectionSha256: sha256(bytes),
        collection
      });
    } catch (error) {
      const status = error.status === 404 ? 'missing' : 'invalid';
      inputs.push({
        ...base,
        collectionStatus: status,
        collectionError: status === 'missing' ? 'collection point absent at consumed head' : String(error?.message || error)
      });
    }
  }
  return inputs;
}

export function immutableCollectionRegressions(inputs, previousSnapshot) {
  const previousByName = new Map((previousSnapshot?.repositories || []).map(repo => [repo.name, repo]));
  return inputs.filter(input => {
    if (input.collectionStatus === 'ok') return false;
    const previous = previousByName.get(input.name);
    return previous?.headSha === input.headSha
      && previous?.collection?.path === input.collectionPath
      && previous?.collection?.status === 'ok';
  }).map(input => input.name).sort();
}

async function readSnapshot() {
  try {
    return JSON.parse(await readFile(SNAPSHOT_OUT, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  await mkdir('src/_data/generated', { recursive: true });
  await mkdir('src/_data/snapshots', { recursive: true });

  if (process.env.OFFLINE === '1') {
    const fallback = JSON.parse(await readFile(SNAPSHOT_OUT, 'utf8'));
    fallback.fallback = true;
    fallback.hmmm = [...new Set([...(fallback.hmmm || []), 'OFFLINE=1: displaying the last-known-good org msdmd snapshot.'])];
    await prepareRetainedPages(fallback);
    await writeFile(GENERATED_OUT, JSON.stringify(fallback));
    console.log(`org-msdmd ${fallback.summary?.collectionCount || 0}/${fallback.summary?.repositoryCount || 0} fallback`);
    return;
  }

  const repoData = JSON.parse(await readFile(GENERATED_REPOS, 'utf8'));
  const previous = await readSnapshot();
  const inputs = await fetchRepositoryInputs(repoData.repositories || []);
  const skillLib = inputs.find(input => input.name === 'skill-lib');
  if (skillLib?.collectionStatus !== 'ok') {
    throw new Error('Cannot publish the skill-lib reader: ' + (skillLib?.collectionError || 'repository absent'));
  }
  const regressions = immutableCollectionRegressions(inputs, previous);
  if (regressions.length) throw new Error('Previously readable immutable collections could not be read: ' + regressions.join(', '));
  const data = buildOrgMap(inputs);
  await publishMetadataPages(inputs, data);
  await writeFile(GENERATED_OUT, JSON.stringify(data));
  await writeFile(SNAPSHOT_OUT, stableJson(data));
  console.log(`org-msdmd ${data.summary.collectionCount}/${data.summary.repositoryCount} collections · ${data.summary.nativeFactCount} native facts · ${data.summary.unresolvedEdgeCount} unresolved edges`);
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) await main();
