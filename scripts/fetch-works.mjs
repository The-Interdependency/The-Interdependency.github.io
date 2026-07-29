import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// === MODULE_BUILD ===
// id: related_works_registry_fetch
//   module_name: fetch-works
//   module_kind: instrument
//   summary: Resolves maintainer-approved related-work submissions from GitHub issues into one provenance-bearing works registry dataset.
//   owner: Erin Spencer
//   public_surface: npm run refresh:works, generated.works
//   internal_surface: issue-form body parsing, per-submission validation with visible exclusions, snapshot fallback
//   auth_boundary: optional read-only GITHUB_TOKEN
//   storage_boundary: writes generated works data and a last-known-good snapshot
//   network_boundary: allowlisted read-only HTTPS to api.github.com
//   user_data_boundary: publishes only fields submitters place in a public GitHub issue
//   admin_only: false
//   tests: tests/works-registry.test.mjs
//   rollout: included in refresh:data before validation and Eleventy generation
//   rollback: remove refresh:works and the /works/ route; submissions remain as ordinary GitHub issues
// === END MODULE_BUILD ===
// Usage: run `npm run refresh:works`; set OFFLINE=1 to use the retained snapshot or an empty registry.
// Limits: listing is maintainer moderation only — it transfers no endorsement, review status, or
// theorem/proof/empirical status, and it never touches the research ledgers or canon.

// === BOUNDARIES ===
// id: related_works_network_boundary
//   summary: Reads only issues labeled related-work and approved from this repository via the allowlisted GitHub API.
//   auth_boundary: optional GitHub read token
//   storage_boundary: write beneath src/_data/generated and src/_data/snapshots
//   network_boundary: external read-only
//   user_data_boundary: public issue content only; submitter login retained as provenance
//   admin_only: false
//   pii: none beyond what submitters publish themselves
//   secrets: GITHUB_TOKEN is passed only as an HTTPS authorization header and never written
//   side_effects: generated dataset and snapshot writes
//   owner: Erin Spencer
// === END BOUNDARIES ===

const apiOrigin = 'https://api.github.com';
const registryRepository = 'The-Interdependency/The-Interdependency.github.io';
const submissionLabel = 'related-work';
const approvalLabel = 'approved';
const snapshotPath = 'src/_data/snapshots/works.last-known-good.json';
const generatedPath = 'src/_data/generated/works.json';

export const WORK_TYPES = ['essay', 'paper', 'art', 'music', 'video', 'code', 'response', 'other'];

export const REQUIRED_FIELDS = {
  'Work title': 'title',
  'Creator': 'creator',
  'Link': 'url',
  'Work type': 'type',
  'Relation to The Interdependent Way': 'relation',
  'Description': 'description'
};

const OPTIONAL_FIELDS = { 'License note': 'license' };

// GitHub issue forms render each field as "### <Label>" followed by the value;
// empty optional fields arrive as "_No response_".
export function parseIssueForm(body) {
  const fields = {};
  const sections = String(body || '').split(/^### /m).slice(1);
  for (const section of sections) {
    const newline = section.indexOf('\n');
    if (newline === -1) continue;
    const label = section.slice(0, newline).trim();
    const value = section.slice(newline + 1).trim();
    fields[label] = value === '_No response_' ? '' : value;
  }
  return fields;
}

export function validateSubmission(fields) {
  const problems = [];
  const work = {};
  for (const [label, key] of Object.entries(REQUIRED_FIELDS)) {
    const value = (fields[label] || '').trim();
    if (!value) problems.push(`missing required field: ${label}`);
    work[key] = value;
  }
  for (const [label, key] of Object.entries(OPTIONAL_FIELDS)) {
    work[key] = (fields[label] || '').trim() || null;
  }
  if (work.url) {
    try {
      const url = new URL(work.url);
      if (url.protocol !== 'https:') problems.push('link must be https');
      work.url = url.href;
    } catch {
      problems.push(`link is not a valid URL: ${work.url}`);
    }
  }
  if (work.type) {
    const normalized = work.type.toLowerCase();
    if (!WORK_TYPES.includes(normalized)) problems.push(`work type must be one of: ${WORK_TYPES.join(', ')}`);
    work.type = normalized;
  }
  if (work.description.length > 1200) problems.push('description exceeds 1200 characters');
  if (work.relation.length > 1200) problems.push('relation exceeds 1200 characters');
  return { work, problems };
}

export function buildRegistry(issues) {
  const works = [];
  const excluded = [];
  for (const issue of issues) {
    if (issue.pull_request) continue;
    const labels = (issue.labels || []).map(label => (typeof label === 'string' ? label : label.name));
    if (!labels.includes(submissionLabel) || !labels.includes(approvalLabel)) continue;
    const { work, problems } = validateSubmission(parseIssueForm(issue.body));
    const provenance = {
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      submittedBy: issue.user?.login || 'hmmm',
      submittedAt: issue.created_at || null
    };
    if (problems.length > 0) {
      excluded.push({ ...provenance, problems });
    } else {
      works.push({ ...work, ...provenance });
    }
  }
  works.sort((a, b) => b.issueNumber - a.issueNumber);
  excluded.sort((a, b) => b.issueNumber - a.issueNumber);
  return { works, excluded };
}

function curlJson(target, headers) {
  const url = target instanceof URL ? target : new URL(target);
  if (url.protocol !== 'https:' || url.origin !== apiOrigin) throw new Error(`refusing non-allowlisted works target: ${url.origin}`);
  return JSON.parse(execFileSync('curl', ['-fsSL', '--retry', '2', '--max-time', '30', ...headers, url.href], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }));
}

function fetchApprovedIssues() {
  const headers = ['-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'];
  if (process.env.GITHUB_TOKEN) headers.push('-H', `Authorization: Bearer ${process.env.GITHUB_TOKEN}`);
  const issues = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = new URL(`/repos/${registryRepository}/issues`, apiOrigin);
    url.searchParams.set('labels', `${submissionLabel},${approvalLabel}`);
    url.searchParams.set('state', 'all');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const batch = curlJson(url, headers);
    issues.push(...batch);
    if (batch.length < 100) break;
  }
  return issues;
}

async function readSnapshot() {
  try {
    const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
    return Array.isArray(snapshot?.works) ? snapshot : null;
  } catch {
    return null;
  }
}

async function main() {
  await mkdir('src/_data/generated', { recursive: true });
  await mkdir('src/_data/snapshots', { recursive: true });
  const offline = process.env.OFFLINE === '1';
  let dataset;
  if (offline) {
    const previous = await readSnapshot();
    dataset = previous
      ? { ...previous, fallback: true, retrievalError: 'offline requested; retained last-known-good works registry' }
      : { schema: 'interdependency.related-works/1.0.0', generatedAt: null, fallback: true, retrievalError: 'offline requested; no retained works snapshot', works: [], excluded: [] };
  } else {
    try {
      const { works, excluded } = buildRegistry(fetchApprovedIssues());
      dataset = {
        schema: 'interdependency.related-works/1.0.0',
        generatedAt: new Date().toISOString(),
        fallback: false,
        retrievalError: null,
        works,
        excluded
      };
      await writeFile(snapshotPath, JSON.stringify(dataset, null, 2));
    } catch (error) {
      const previous = await readSnapshot();
      const message = String(error?.message || error);
      dataset = previous
        ? { ...previous, fallback: true, retrievalError: message }
        : { schema: 'interdependency.related-works/1.0.0', generatedAt: null, fallback: true, retrievalError: message, works: [], excluded: [] };
    }
  }
  await writeFile(generatedPath, JSON.stringify(dataset, null, 2));
  console.log(`works registry works=${dataset.works.length} excluded=${dataset.excluded.length} fallback=${dataset.fallback}`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
