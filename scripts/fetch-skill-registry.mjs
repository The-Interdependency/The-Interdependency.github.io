import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// === MODULE_BUILD ===
// id: skill_registry_collector
//   purpose: Publish a commit-pinned projection of skill-lib/skills.json for the website-owned WebMCP surface without transferring skill authority to the website.
//   entrypoint: npm run refresh:skills
//   tests: tests/webmcp.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: skill_registry_source_boundary
//   network: reads only commit-pinned raw.githubusercontent.com/The-Interdependency/skill-lib/<commit>/skills.json
//   storage: writes generated, public asset, and last-known-good JSON snapshots only
//   authority: The-Interdependency/skill-lib remains canonical; this website publishes a derived registry projection for browser tools
//   failure: a network or parse failure falls back only to a previously verified snapshot; absence of both fails closed
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: skill_registry_exact_input_identity
//   given: skill-lib skills.json is projected into the website
//   then: repository, exact head commit, source path, and SHA-256 remain attached to the projection
//   class: evidence
//
// id: skill_registry_dependency_integrity
//   given: a skill declares depends_on entries
//   then: every dependency names another skill in the same registry
//   class: correctness
// === END CONTRACTS ===
// Usage: run `npm run refresh:skills` after `npm run refresh:github`; WebMCP consumes `/assets/data/skill-registry.json`. `OFFLINE=1 npm run refresh:skills` is valid on a clean checkout because the committed bootstrap snapshot is pinned to an exact skill-lib commit and Git blob; successful online refreshes replace it with the newest verified normalized snapshot.

const ORGANIZATION = 'The-Interdependency';
const REPOSITORY = 'skill-lib';
const SOURCE_PATH = 'skills.json';
const RAW_GITHUB_ORIGIN = 'https://raw.githubusercontent.com';
const GENERATED_REPOS = 'src/_data/generated/repos.json';
const GENERATED_OUT = 'src/_data/generated/skillRegistry.json';
const PUBLIC_OUT = 'src/assets/data/skill-registry.json';
const SNAPSHOT_OUT = 'src/_data/snapshots/skill-registry.last-known-good.json';
const BOOTSTRAP_SNAPSHOT_COMMIT = '260671303733a45c8f8d5563e41d8854e09856e6';
const BOOTSTRAP_SNAPSHOT_BLOB = '7f71adeadac07a751b953c39e38dd78be599976f';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function gitBlobSha1(value) {
  const body = Buffer.from(value);
  return createHash('sha1')
    .update(`blob ${body.length}\0`)
    .update(body)
    .digest('hex');
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function rawGithubUrl(commit) {
  return new URL(`/${ORGANIZATION}/${REPOSITORY}/${commit}/${SOURCE_PATH}`, RAW_GITHUB_ORIGIN);
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

export function normalizeRegistry(sourceText, commit) {
  const parsed = JSON.parse(String(sourceText));
  if (parsed?.repo !== `${ORGANIZATION}/${REPOSITORY}`) {
    throw new Error(`unexpected registry repo: ${parsed?.repo || 'missing'}`);
  }
  if (!Array.isArray(parsed.skills) || parsed.skills.length === 0) {
    throw new Error('skill registry has no skills');
  }

  const skills = parsed.skills.map(skill => ({
    name: String(skill.name || '').trim(),
    path: String(skill.path || '').trim(),
    kind: String(skill.kind || '').trim(),
    depends_on: Array.isArray(skill.depends_on) ? skill.depends_on.map(String) : [],
    description: String(skill.description || '').trim()
  }));

  const names = new Set(skills.map(skill => skill.name));
  if (names.size !== skills.length || skills.some(skill => !skill.name || !skill.path || !skill.description)) {
    throw new Error('skill registry contains duplicate or incomplete skill records');
  }
  for (const skill of skills) {
    for (const dependency of skill.depends_on) {
      if (!names.has(dependency)) throw new Error(`unresolved skill dependency: ${skill.name} -> ${dependency}`);
    }
  }

  return {
    version: parsed.version,
    source: {
      repository: `${ORGANIZATION}/${REPOSITORY}`,
      commit,
      path: SOURCE_PATH,
      sha256: sha256(sourceText)
    },
    install_path: parsed.install_path,
    superseded_skills: Array.isArray(parsed.superseded_skills) ? parsed.superseded_skills : [],
    skills
  };
}

export async function readFallback() {
  const text = await readFile(SNAPSHOT_OUT, 'utf8');
  const parsed = JSON.parse(text);

  if (parsed?.source?.commit && Array.isArray(parsed.skills) && parsed.skills.length > 0) {
    return parsed;
  }

  if (parsed?.repo === `${ORGANIZATION}/${REPOSITORY}` && Array.isArray(parsed.skills) && parsed.skills.length > 0) {
    const actualBlob = gitBlobSha1(text);
    if (actualBlob !== BOOTSTRAP_SNAPSHOT_BLOB) {
      throw new Error(`bootstrap skill registry snapshot blob mismatch: ${actualBlob}`);
    }
    return normalizeRegistry(text, BOOTSTRAP_SNAPSHOT_COMMIT);
  }

  throw new Error('last-known-good skill registry snapshot is invalid');
}

async function writeProjection(registry, fallback, hmmm = []) {
  await Promise.all([
    mkdir('src/_data/generated', { recursive: true }),
    mkdir('src/assets/data', { recursive: true })
  ]);
  const serialized = stableJson({ ...registry, fallback, hmmm });
  await Promise.all([
    writeFile(GENERATED_OUT, serialized),
    writeFile(PUBLIC_OUT, serialized)
  ]);
}

async function main() {
  if (process.env.OFFLINE === '1') {
    const snapshot = await readFallback();
    await writeProjection(snapshot, true, ['offline build: using last-known-good skill registry snapshot']);
    return;
  }

  try {
    const repoIndex = JSON.parse(await readFile(GENERATED_REPOS, 'utf8'));
    const skillLib = (repoIndex.repositories || []).find(repo => repo.name === REPOSITORY);
    if (!skillLib?.head_sha) throw new Error('skill-lib head_sha missing from generated repository index');

    const sourceText = getText(rawGithubUrl(skillLib.head_sha));
    const registry = normalizeRegistry(sourceText, skillLib.head_sha);
    await mkdir('src/_data/snapshots', { recursive: true });
    await writeFile(SNAPSHOT_OUT, stableJson(registry));
    await writeProjection(registry, false);
  } catch (error) {
    try {
      const snapshot = await readFallback();
      await writeProjection(snapshot, true, [`registry refresh failed: ${error.message}`]);
    } catch (fallbackError) {
      throw new Error(`skill registry refresh failed and no valid snapshot exists: ${error.message}; fallback: ${fallbackError.message}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
