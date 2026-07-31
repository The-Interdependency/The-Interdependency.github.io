import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

// === MODULE_BUILD ===
// id: article_lab_research_data_adapter
//   module_name: research_data
//   module_kind: adapter
//   summary: Admits only research studies from manifest-declared candidate ledgers and exposes their bounded claims, reviews, and evidence gaps.
//   owner: Erin Spencer
//   public_surface: research_data.sources, research_data.claims, research_data.gaps, research_data.stats
//   internal_surface: validateLedgerPaths, readYamlList, readYamlLedgers, indexUnique
//   auth_boundary: none
//   storage_boundary: read the repository-owned candidate, admission, claim-review, and gap ledgers
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/research-ledger.test.mjs, tests/generated-site.test.mjs
//   rollout: loaded automatically by Eleventy from src/_data/research_data.js
//   rollback: revert this adapter and the admission-ledger manifest entries together
// === END MODULE_BUILD ===
// Usage: add candidate sources and claims to their ledgers, classify every source in source-admissions, review every publishable claim in claim-reviews, and record Article-level search gaps before running `npm test`.
// Limits: admission establishes record class, not truth. A provisional claim remains provisional until its full-text result locator and appraisal are recorded.

// === BOUNDARIES ===
// id: article_lab_research_data_storage_boundary
//   summary: Reads allowlisted repository-local YAML ledgers, rejects incomplete classifications, and returns study-only public arrays.
//   auth_boundary: none
//   storage_boundary: read beneath src/_data/research only
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: none
//   owner: Erin Spencer
// === END BOUNDARIES ===

const manifestPath = 'src/_data/research/ledger-manifest.json';
const ledgerPathPattern = /^src\/_data\/research\/[a-z0-9][a-z0-9.-]*\.yml$/;

function validateLedgerPaths(paths, kind) {
  if (!Array.isArray(paths) || paths.length === 0) throw new TypeError(`${kind} ledger manifest must contain at least one path`);
  if (new Set(paths).size !== paths.length) throw new TypeError(`${kind} ledger manifest paths must be unique`);
  for (const path of paths) {
    if (typeof path !== 'string' || !ledgerPathPattern.test(path)) {
      throw new TypeError(`${kind} ledger path must remain beneath src/_data/research and end in .yml: ${String(path)}`);
    }
  }
  return paths;
}

async function readYamlList(path) {
  const parsed = yaml.load(await readFile(path, 'utf8'));
  if (!Array.isArray(parsed)) throw new TypeError(`${path} must contain a YAML list`);
  return parsed;
}

async function readYamlLedgers(paths, kind) {
  const validatedPaths = validateLedgerPaths(paths, kind);
  const ledgers = await Promise.all(validatedPaths.map(readYamlList));
  return ledgers.flat();
}

function indexUnique(records, kind) {
  const index = new Map();
  for (const record of records) {
    if (!record?.id || typeof record.id !== 'string') throw new TypeError(`${kind} record is missing a string id`);
    if (index.has(record.id)) throw new TypeError(`duplicate ${kind} id: ${record.id}`);
    index.set(record.id, record);
  }
  return index;
}

export default async function researchData() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new TypeError(`${manifestPath} must contain a JSON object`);

  const [candidateSources, candidateClaims, sourceAdmissions, claimReviews, gaps] = await Promise.all([
    readYamlLedgers(manifest.sources, 'source'),
    readYamlLedgers(manifest.claims, 'claim'),
    readYamlLedgers(manifest.source_admissions, 'source admission'),
    readYamlLedgers(manifest.claim_reviews, 'claim review'),
    readYamlLedgers(manifest.gaps, 'evidence gap')
  ]);

  const sourceIndex = indexUnique(candidateSources, 'candidate source');
  const claimIndex = indexUnique(candidateClaims, 'candidate claim');
  const admissionIndex = indexUnique(sourceAdmissions, 'source admission');
  const reviewIndex = indexUnique(claimReviews, 'claim review');

  for (const sourceId of sourceIndex.keys()) {
    if (!admissionIndex.has(sourceId)) throw new TypeError(`candidate source is missing an admission decision: ${sourceId}`);
  }
  for (const sourceId of admissionIndex.keys()) {
    if (!sourceIndex.has(sourceId)) throw new TypeError(`source admission has no candidate source: ${sourceId}`);
  }

  const admittedSourceIds = new Set();
  const sources = [];
  for (const source of candidateSources) {
    const admission = admissionIndex.get(source.id);
    if (admission.decision === 'admit-study') {
      if (admission.record_class !== 'research_study') throw new TypeError(`admitted source must be a research_study: ${source.id}`);
      if (
        !admission.study_design
        || !admission.evidence_mode
        || !admission.screening_status
        || !admission.appraisal_status
        || !admission.risk_of_bias_status
        || !admission.funding_conflicts_status
        || !admission.correction_retraction_status
      ) {
        throw new TypeError(`admitted source is missing study admission metadata: ${source.id}`);
      }
      admittedSourceIds.add(source.id);
      sources.push({ ...source, ...admission });
    } else if (admission.decision === 'exclude-non-study') {
      if (admission.record_class !== 'nonstudy_context' || !admission.exclusion_reason) {
        throw new TypeError(`excluded source is missing its non-study reason: ${source.id}`);
      }
    } else {
      throw new TypeError(`unknown source admission decision for ${source.id}: ${String(admission.decision)}`);
    }
  }

  for (const claim of candidateClaims) {
    if (!Array.isArray(claim.source_ids) || claim.source_ids.length === 0) throw new TypeError(`claim is missing source_ids: ${claim.id}`);
    for (const sourceId of claim.source_ids) {
      if (!sourceIndex.has(sourceId)) throw new TypeError(`claim ${claim.id} references unknown source ${sourceId}`);
    }
  }

  const admissibleClaims = candidateClaims.filter(claim => claim.source_ids.every(sourceId => admittedSourceIds.has(sourceId)));
  const admissibleClaimIds = new Set(admissibleClaims.map(claim => claim.id));
  for (const claim of admissibleClaims) {
    if (!reviewIndex.has(claim.id)) throw new TypeError(`study-only claim is missing a claim review: ${claim.id}`);
  }
  for (const claimId of reviewIndex.keys()) {
    if (!claimIndex.has(claimId)) throw new TypeError(`claim review has no candidate claim: ${claimId}`);
    if (!admissibleClaimIds.has(claimId)) throw new TypeError(`claim review cites a claim with a non-study source: ${claimId}`);
  }

  const claims = admissibleClaims.map(claim => ({ ...claim, ...reviewIndex.get(claim.id) }));
  const gapIds = new Set();
  for (const gap of gaps) {
    if (!gap?.article || gapIds.has(gap.article)) throw new TypeError(`evidence gap records must have unique article ids: ${String(gap?.article)}`);
    gapIds.add(gap.article);
  }

  return {
    sources,
    claims,
    gaps,
    stats: {
      screenedSourceCount: candidateSources.length,
      admittedStudyCount: sources.length,
      excludedNonstudyCount: candidateSources.length - sources.length,
      candidateClaimCount: candidateClaims.length,
      publishedStudyClaimCount: claims.length,
      excludedContextClaimCount: candidateClaims.length - claims.length,
      verifiedClaimCount: claims.filter(claim => claim.verification_status === 'verified-full-text').length
    }
  };
}
