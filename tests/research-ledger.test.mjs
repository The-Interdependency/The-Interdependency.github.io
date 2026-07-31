// Usage: run through `npm test`; candidate ledgers must be fully screened and only admitted studies may reach the public Research data.
// Evidence boundary: validates record class, provenance structure, claim admission, and visible gaps; it does not reproduce or independently appraise each study.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import loadResearchData from '../src/_data/research_data.js';

const manifestPath = 'src/_data/research/ledger-manifest.json';
const ledgerPathPattern = /^src\/_data\/research\/[a-z0-9][a-z0-9.-]*\.yml$/;
const requiredDomains = [
  'Medical',
  'Construction',
  'Engineering',
  'Agriculture',
  'Jurisprudence',
  'Transportation and distribution',
  'Child craft',
  'Information systems',
  'Emergency response',
  'Hospitality and sanitation',
  'Community governance'
];

async function readYamlLedgers(paths, kind) {
  assert.ok(Array.isArray(paths) && paths.length > 0, `${kind} ledger manifest must contain paths`);
  assert.equal(new Set(paths).size, paths.length, `${kind} ledger manifest paths must be unique`);

  const ledgers = [];
  for (const path of paths) {
    assert.equal(typeof path, 'string');
    assert.match(path, ledgerPathPattern, `${kind} ledger path must remain beneath src/_data/research`);
    const parsed = yaml.load(await readFile(path, 'utf8'));
    assert.ok(Array.isArray(parsed) && parsed.length > 0, `${path} must contain a non-empty YAML list`);
    ledgers.push(parsed);
  }
  return ledgers.flat();
}

test('research admission is study-only and every candidate receives an explicit decision', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const [candidateSources, candidateClaims, admissions, claimReviews, researchData] = await Promise.all([
    readYamlLedgers(manifest.sources, 'source'),
    readYamlLedgers(manifest.claims, 'claim'),
    readYamlLedgers(manifest.source_admissions, 'source admission'),
    readYamlLedgers(manifest.claim_reviews, 'claim review'),
    loadResearchData()
  ]);

  const candidateSourceIds = new Set(candidateSources.map(source => source.id));
  const admissionIds = new Set(admissions.map(admission => admission.id));
  const admittedIds = new Set(researchData.sources.map(source => source.id));
  const publishedClaimIds = new Set(researchData.claims.map(claim => claim.id));

  assert.equal(candidateSourceIds.size, candidateSources.length, 'candidate source ids must be unique');
  assert.equal(admissionIds.size, admissions.length, 'source admission ids must be unique');
  assert.deepEqual(admissionIds, candidateSourceIds, 'every candidate source needs exactly one admission decision');
  assert.equal(new Set(candidateClaims.map(claim => claim.id)).size, candidateClaims.length, 'candidate claim ids must be unique');
  assert.equal(new Set(claimReviews.map(review => review.id)).size, claimReviews.length, 'claim review ids must be unique');

  for (const admission of admissions) {
    assert.ok(admission.screened_on, `${admission.id} is missing its screening date`);
    assert.ok(['admit-study', 'exclude-non-study'].includes(admission.decision));
    if (admission.decision === 'admit-study') {
      assert.equal(admission.record_class, 'research_study');
      assert.ok(admission.study_design && admission.evidence_mode && admission.screening_status && admission.appraisal_status);
      assert.ok(admission.risk_of_bias_status && admission.funding_conflicts_status && admission.correction_retraction_status);
      assert.ok(['empirical', 'systematic_synthesis', 'formal_simulation'].includes(admission.evidence_mode));
      assert.ok(admittedIds.has(admission.id), `${admission.id} was admitted but not published`);
    } else {
      assert.equal(admission.record_class, 'nonstudy_context');
      assert.ok(admission.exclusion_reason);
      assert.ok(!admittedIds.has(admission.id), `${admission.id} is non-study context but reached Research`);
    }
  }

  for (const source of researchData.sources) {
    assert.equal(source.record_class, 'research_study');
    assert.equal(source.decision, 'admit-study');
    assert.ok(source.id && source.title && source.authors && source.year && source.publication && source.type);
    assert.ok(source.url && source.reviewed_on && source.relevance && source.boundary);
  }

  for (const claim of researchData.claims) {
    assert.ok(['support', 'dissent', 'limit', 'mixed'].includes(claim.stance));
    assert.ok(claim.id && claim.status && claim.claim && claim.limitation);
    assert.ok(claim.study_result && claim.article_relation && claim.inference_gap && claim.locator && claim.reviewed_on);
    assert.ok(['verified-full-text', 'provisional-full-text-locator-needed'].includes(claim.verification_status));
    if (claim.verification_status === 'verified-full-text') {
      assert.ok(!claim.locator.startsWith('hmmm'), `${claim.id} cannot be verified without an exact locator`);
    } else {
      assert.match(claim.locator, /^hmmm\b/, `${claim.id} must expose its missing locator as hmmm`);
    }
    for (const sourceId of claim.source_ids) assert.ok(admittedIds.has(sourceId), `${claim.id} cites non-study source ${sourceId}`);
  }

  for (const candidateClaim of candidateClaims) {
    const onlyStudies = candidateClaim.source_ids.every(sourceId => admittedIds.has(sourceId));
    assert.equal(publishedClaimIds.has(candidateClaim.id), onlyStudies, `${candidateClaim.id} admission does not match its source classes`);
  }

  for (const requiredNonstudyId of [
    'who-2018-sanitation-health',
    'un-crpd-2014-legal-capacity',
    'ietf-1997-rfc2119',
    'fema-2017-nims',
    'hhs-1979-belmont-report'
  ]) {
    assert.ok(!admittedIds.has(requiredNonstudyId), `${requiredNonstudyId} must remain outside Research`);
  }

  assert.equal(researchData.stats.screenedSourceCount, candidateSources.length);
  assert.equal(researchData.stats.admittedStudyCount, researchData.sources.length);
  assert.equal(researchData.stats.excludedNonstudyCount, candidateSources.length - researchData.sources.length);
  assert.equal(researchData.stats.candidateClaimCount, candidateClaims.length);
  assert.equal(researchData.stats.publishedStudyClaimCount, researchData.claims.length);
  assert.equal(researchData.stats.excludedContextClaimCount, candidateClaims.length - researchData.claims.length);
});

test('every Rights Article records bidirectional screening without manufactured balance', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const [articleLab, gaps, researchData] = await Promise.all([
    readFile('src/_data/article_lab.json', 'utf8').then(JSON.parse),
    readYamlLedgers(manifest.gaps, 'evidence gap'),
    loadResearchData()
  ]);

  const labUnitIds = new Set(articleLab.map(record => record.unit_id));
  assert.equal(labUnitIds.size, 8, 'each Rights article must have one Lab record');
  assert.equal(gaps.length, 8, 'each Rights article must have one evidence-gap record');
  assert.deepEqual(new Set(gaps.map(gap => gap.article)), labUnitIds);

  for (const record of articleLab) {
    assert.ok(record.public_title);
    assert.ok(record.ad_absurdum?.overextension && record.ad_absurdum?.counter_overextension && record.ad_absurdum?.boundary);
    assert.ok(Array.isArray(record.worst_practices) && record.worst_practices.length >= 4);
    assert.ok(Array.isArray(record.best_practices) && record.best_practices.length >= 4);
    assert.deepEqual(Object.keys(record.applications), requiredDomains, `${record.unit_id} must preserve the shared domain order`);

    const claims = researchData.claims.filter(claim => claim.article === record.unit_id);
    const gap = gaps.find(candidate => candidate.article === record.unit_id);
    assert.ok(claims.length >= 1, `${record.unit_id} needs at least one admitted study contact or an intentional no-evidence page design`);
    assert.equal(gap.search_status, 'candidate-ledger-screened-both-directions');
    assert.ok(gap.hmmm && gap.reviewed_on);

    const expectedStatus = stance => claims.some(claim => stance.includes(claim.stance))
      ? 'qualifying-study-found'
      : 'no-qualifying-study-found';
    assert.equal(gap.support_status, expectedStatus(['support']));
    assert.equal(gap.dissent_status, expectedStatus(['dissent']));
    assert.equal(gap.mixed_or_limit_status, expectedStatus(['mixed', 'limit']));
  }

  const articleThreeClaims = researchData.claims.filter(claim => claim.article === 'rights-and-definitions-of-the-way.article-three');
  assert.ok(!articleThreeClaims.some(claim => claim.stance === 'support'), 'do not fabricate Article Three support for visual balance');
  assert.ok(!articleThreeClaims.some(claim => claim.stance === 'dissent'), 'do not relabel non-study theory as Article Three dissent');
});
