import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('SITREP consumes the frozen skill-lib projection instead of redefining repo authority', async () => {
  const source = await readFile('scripts/fetch-sitrep.mjs', 'utf8');
  assert.match(source, /repository-plan-report\.schema\.json/);
  assert.match(source, /9b347b2dff7692054b571602f30ee6d00c2e7265/);
  assert.match(source, /interdependent-work-graph\/portfolio_plan\.py/);
  assert.match(source, /97b8b546b4151486164c8a4b730c24a8c895b25b/);
  assert.match(source, /runPortfolio/);
  assert.match(source, /python3/);
  assert.match(source, /missingReports/);
});

test('SITREP failure publication classifies errors instead of echoing command details', async () => {
  const source = await readFile('scripts/fetch-sitrep.mjs', 'utf8');
  assert.match(source, /function publicFailureReason/);
  assert.match(source, /fallbackData\(publicFailureReason\(error\)\)/);
  assert.doesNotMatch(source, /fallbackData\(error\.message/);
  assert.doesNotMatch(source, /reason:\s*error\.message/);
});

test('HEAD mismatch is exposed as difference without inferring substantive staleness', async () => {
  const source = await readFile('scripts/fetch-sitrep.mjs', 'utf8');
  assert.match(source, /sourceCommit === head \? 'current' : 'HEAD differs'/);
  assert.doesNotMatch(source, /sourceCommit === head \? 'current' : 'stale'/);
});

test('SITREP presentation keeps declared situation separate from observed GitHub telemetry', async () => {
  const template = await readFile('src/sitrep/index.njk', 'utf8');
  assert.match(template, /Declared · repo-owned/);
  assert.match(template, /Observed · GitHub/);
  assert.match(template, /Report\/head mismatch is shown rather than silently reconciled/);
  assert.match(template, /authority transfer: false/);
});

test('website participates through the skill-lib repository-plan-report contract', async () => {
  const report = JSON.parse(await readFile('docs/work-graphs/repository-plan-report.json', 'utf8'));
  assert.equal(report.schema, 'the-interdependency.repository-plan-report');
  assert.equal(report.version, '1.0.0');
  assert.equal(report.repository, 'The-Interdependency/The-Interdependency.github.io');
  assert.equal(report.contract.repository, 'The-Interdependency/skill-lib');
  assert.equal(report.contract.path, 'interdependent-work-graph/repository-plan-report.schema.json');
  assert.equal(report.contract.blob_sha, '9b347b2dff7692054b571602f30ee6d00c2e7265');
  assert.equal(report.portfolio_role.reports_to.skill, 'interdependent-work-graph');
  assert.match(report.source.commit, /^[0-9a-f]{40}$/);
  assert.ok(report.authority.non_transfer.length > 0);
});