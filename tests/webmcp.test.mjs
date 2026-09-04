import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeRegistry, readFallback } from '../scripts/fetch-skill-registry.mjs';
import { createSkillRegistry } from '../src/assets/js/webmcp-registry.js';

const BOOTSTRAP_SNAPSHOT_COMMIT = '260671303733a45c8f8d5563e41d8854e09856e6';
const SNAPSHOT_PATH = 'src/_data/snapshots/skill-registry.last-known-good.json';

const sourceRegistry = JSON.stringify({
  version: 1,
  repo: 'The-Interdependency/skill-lib',
  install_path: '.agents/skills/<skill-name>/',
  superseded_skills: [],
  skills: [
    { name: 'msdmd', path: 'msdmd/SKILL.md', kind: 'metadata-block', description: 'foundational metadata convention' },
    { name: 'cap-build', path: 'cap-build/SKILL.md', kind: 'metadata-block', depends_on: ['msdmd'], description: 'capability inventory' },
    { name: 'meta', path: 'meta/SKILL.md', kind: 'procedural', description: 'METAPAT consultation router' },
    { name: 'fresh-making', path: 'fresh-making/SKILL.md', kind: 'procedural', description: 'deterministic restoration of derived artifact consistency' },
    { name: 'epac-selection-display', path: 'epac-selection-display/SKILL.md', kind: 'procedural', description: 'receipt-backed EPAC element and molecule selection and display' },
    { name: 'repo-audit-repair', path: 'repo-audit-repair/SKILL.md', kind: 'procedural', description: 'audit and repair a repository' }
  ]
});

function sampleProjection() {
  return {
    ...normalizeRegistry(sourceRegistry, '0123456789abcdef0123456789abcdef01234567'),
    fallback: false,
    hmmm: []
  };
}

test('skill registry projection preserves exact source identity and rejects unresolved dependencies', () => {
  const projection = sampleProjection();
  assert.equal(projection.source.repository, 'The-Interdependency/skill-lib');
  assert.equal(projection.source.commit, '0123456789abcdef0123456789abcdef01234567');
  assert.equal(projection.source.path, 'skills.json');
  assert.match(projection.source.sha256, /^[a-f0-9]{64}$/);

  const broken = JSON.stringify({
    version: 1,
    repo: 'The-Interdependency/skill-lib',
    skills: [{ name: 'a', path: 'a/SKILL.md', kind: 'procedural', depends_on: ['missing'], description: 'broken' }]
  });
  assert.throws(() => normalizeRegistry(broken, 'abc'), /unresolved skill dependency/);
});

test('committed or refreshed fallback snapshot is exact, usable, and retains source provenance', async () => {
  const rawSnapshot = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'));
  const snapshot = await readFallback();
  assert.equal(snapshot.source.repository, 'The-Interdependency/skill-lib');
  assert.equal(snapshot.source.path, 'skills.json');
  assert.match(snapshot.source.commit, /^[a-f0-9]{40}$/);
  assert.match(snapshot.source.sha256, /^[a-f0-9]{64}$/);

  if (rawSnapshot?.source?.commit) {
    assert.equal(snapshot.source.commit, rawSnapshot.source.commit);
    assert.equal(snapshot.source.sha256, rawSnapshot.source.sha256);
  } else {
    assert.equal(snapshot.source.commit, BOOTSTRAP_SNAPSHOT_COMMIT);
  }

  assert.ok(snapshot.skills.length > 0);
  assert.ok(snapshot.skills.some(skill => skill.name === 'repo-audit-repair'));
});

test('public registry presents msdmd, meta, fresh-making, and EPAC display while hiding unrelated specialist skills', () => {
  const registry = createSkillRegistry(sampleProjection());
  assert.deepEqual(
    registry.listSkills().map(skill => skill.name),
    ['msdmd', 'cap-build', 'meta', 'fresh-making', 'epac-selection-display']
  );
  assert.equal(registry.findSkills({ query: 'audit repository' }).length, 0);
  assert.equal(registry.findSkills({ query: 'capability' })[0].name, 'cap-build');
  assert.equal(registry.findSkills({ query: 'derived artifact' })[0].name, 'fresh-making');
  assert.equal(registry.findSkills({ query: 'EPAC molecule' })[0].name, 'epac-selection-display');
  assert.throws(() => registry.inspectSkill({ name: 'repo-audit-repair' }), /unknown public skill/);

  assert.deepEqual(registry.resolveSkillClosure({ name: 'cap-build' }).map(skill => skill.name), ['msdmd', 'cap-build']);
  assert.deepEqual(registry.resolveSkillClosure({ name: 'fresh-making' }).map(skill => skill.name), ['fresh-making']);
  assert.deepEqual(
    registry.resolveSkillClosure({ name: 'epac-selection-display' }).map(skill => skill.name),
    ['epac-selection-display']
  );
  const status = registry.getRegistryStatus();
  assert.equal(status.skill_count, 5);
  assert.equal(status.source_skill_count, 6);
  assert.equal(status.public_scope, 'metadata-block plus meta plus fresh-making plus epac-selection-display');
});

test('WebMCP provider registers five base registry tools and one explicit dynamic browser handoff', async () => {
  const source = await readFile('src/assets/js/webmcp.js', 'utf8');
  for (const name of [
    'tiw_registry_status',
    'tiw_list_skills',
    'tiw_find_skill',
    'tiw_inspect_skill',
    'tiw_resolve_skill_closure'
  ]) assert.match(source, new RegExp(`name: '${name}'`));

  assert.match(source, /HANDOFF_TOOL_NAME = 'tiw_human_handoff'/);
  assert.match(source, /name: HANDOFF_TOOL_NAME/);
  assert.equal((source.match(/annotations: \{ readOnlyHint: true/g) || []).length, 6);
  assert.match(source, /annotations: \{ readOnlyHint: true, untrustedContentHint: true \}/);
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /\{ signal: controller\.signal \}/);
  assert.match(source, /globalThis\.document\?\.modelContext/);
  assert.doesNotMatch(source, /navigator\?\.modelContext|provideContext/);
  assert.doesNotMatch(source, /\/handoff\/|remote_session|writeKey|install_skill|propagate_skill|update_file|create_file/);
  assert.doesNotMatch(source, /construct_element_gonol|construct_molecule|epac_public_gonol/);
});

test('human selection carries exact skill and repository identity without typed machine identifiers', async () => {
  const source = await readFile('src/assets/js/webmcp.js', 'utf8');
  assert.match(source, /dataset\.skillName/);
  assert.match(source, /data-human-repository-target/);
  assert.match(source, /dataset\.repositoryHead/);
  assert.match(source, /target_repository: repository/);
  assert.match(source, /observed_head_sha/);
  assert.match(source, /searchParams\.set\('skill', skill\.name\)/);
  assert.match(source, /searchParams\.set\('repo', repository\.name\)/);
  assert.match(source, /history\.replaceState/);
  assert.match(source, /webmcp_repository_context_precedes_agent_work_selection/);
  assert.match(source, /Choose a repository before choosing how the agent should work/);
  assert.match(source, /const skillWasCleared = clearSelectedSkill\(\)/);
  assert.ok(
    source.indexOf("searchParams.get('repo')") < source.indexOf("searchParams.get('skill')"),
    'URL restoration must establish repository context before restoring a skill selection'
  );
});

test('fresh-making supplies an editable default refresh request and still requires explicit Send', async () => {
  const source = await readFile('src/assets/js/webmcp.js', 'utf8');
  assert.match(source, /FRESH_MAKING_INTENT/);
  assert.match(source, /name === 'fresh-making'/);
  assert.match(source, /minimal affected closure/);
  assert.match(source, /new FormData\(event\.currentTarget\)\.get\('intent'\)/);
  assert.match(source, /registry\.resolveSkillClosure\(\{ name: selectedName \}\)/);
  assert.match(source, /human_request: intent/);
  assert.match(source, /repository_write_authority: 'not granted by this handoff'/);
  assert.match(source, /persistence: 'page session only'/);
  assert.match(source, /publishHandoffTool\(handoff\)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
});

test('dedicated WebMCP route presents collapsible skill cards, every generated repo target, and one send box', async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile('src/webmcp/index.njk', 'utf8'),
    readFile('src/_includes/layouts/base.njk', 'utf8'),
    readFile('package.json', 'utf8')
  ]);
  assert.match(page, /permalink: \/webmcp\//);
  assert.match(page, /webmcp: true/);
  assert.match(page, /The page is the provider/);
  assert.match(page, /skill\.kind == "metadata-block"/);
  assert.match(page, /skill\.name == "meta"/);
  assert.match(page, /skill\.name == "fresh-making"/);
  assert.match(page, /skill\.name == "epac-selection-display"/);
  assert.match(page, /data-skill-group="epac"/);
  assert.match(page, /Select and display EPAC/);
  assert.match(page, /<details data-skill-description>/);
  assert.match(page, /<summary>Description<\/summary>/);
  assert.match(page, /generated\.repos\.repositories/);
  assert.match(page, /data-human-repository-target/);
  assert.match(page, /data-repository-head=/);
  assert.match(page, /data-selected-repository/);
  assert.match(page, /data-human-handoff-form/);
  assert.match(page, /<textarea[^>]+data-human-handoff-intent/);
  assert.match(page, /data-human-handoff-send disabled/);
  assert.match(page, /Nothing is sent merely by selecting or typing/);
  assert.match(page, /Send repository \+ skill \+ request to agent/);
  assert.match(page, /No internal repository or skill identifier needs to be typed/);
  assert.match(page, /data-human-skill-filter[^>]+disabled/);
  assert.match(page, /data-select-skill[^>]+disabled/);
  const repositoryStep = page.indexOf('1. Choose the repository');
  const skillStep = page.indexOf('2. Choose how the agent should work');
  const outcomeStep = page.indexOf('3. State the outcome and send');
  assert.ok(repositoryStep >= 0 && repositoryStep < skillStep && skillStep < outcomeStep);
  assert.match(layout, /\{% if webmcp %\}<script src="\/assets\/js\/webmcp\.js" type="module"><\/script>\{% endif %\}/);
  assert.match(packageJson, /"refresh:github": "node scripts\/fetch-github-org\.mjs"/);
  assert.match(packageJson, /"refresh:skills": "node scripts\/fetch-skill-registry\.mjs"/);
});

test('human-readable surface keeps machine identifiers out of the visible reading path', async () => {
  const [page, source] = await Promise.all([
    readFile('src/webmcp/index.njk', 'utf8'),
    readFile('src/assets/js/webmcp.js', 'utf8')
  ]);

  assert.match(page, /skill\.human_title or skill\.name/);
  assert.doesNotMatch(page, /<code>\{\{\s*skill\.name\s*\}\}<\/code>/);
  assert.doesNotMatch(page, /<code>\{\{\s*dependency\s*\}\}<\/code>/);
  assert.doesNotMatch(page, /Depends on:/);
  assert.doesNotMatch(page, /<p class="eyebrow">\{\{\s*skill\.kind\s*\}\}<\/p>/);
  assert.doesNotMatch(page, /snapshot \{\{\s*generated\.repos\.snapshotAt\s*\}\}/);
  assert.doesNotMatch(page, /tiw_human_handoff/);

  assert.doesNotMatch(source, /\.slice\(0, 12\)/);
  assert.doesNotMatch(source, /status\.source\.commit/);
  assert.match(source, /The Interdependency skill library · commit-pinned verified snapshot/);
  assert.match(source, /skill\.human_title \|\| skill\.name/);
});
