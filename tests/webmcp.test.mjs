import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeRegistry, readFallback } from '../scripts/fetch-skill-registry.mjs';
import { createSkillRegistry } from '../src/assets/js/webmcp-registry.js';

// Usage: run with `npm test`; these checks verify registry provenance, the shared curated human/agent catalogue, current WebMCP Document API usage, click-driven human selection, explicit browser+remote human handoff publication, and the visible remote MCP session without requiring a WebMCP-capable test browser.

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

test('public registry presents the same msdmd-plus-meta catalogue to human and agent surfaces', () => {
  const registry = createSkillRegistry(sampleProjection());
  assert.deepEqual(registry.listSkills().map(skill => skill.name), ['msdmd', 'cap-build', 'meta']);
  assert.equal(registry.findSkills({ query: 'audit repository' }).length, 0);
  assert.equal(registry.findSkills({ query: 'capability' })[0].name, 'cap-build');
  assert.throws(() => registry.inspectSkill({ name: 'repo-audit-repair' }), /unknown public skill/);

  const closure = registry.resolveSkillClosure({ name: 'cap-build' });
  assert.deepEqual(closure.map(skill => skill.name), ['msdmd', 'cap-build']);
  const status = registry.getRegistryStatus();
  assert.equal(status.skill_count, 3);
  assert.equal(status.source_skill_count, 4);
  assert.equal(status.public_scope, 'metadata-block plus meta');
});

test('WebMCP provider registers five base registry tools and one explicit dynamic handoff tool through document.modelContext', async () => {
  const source = await readFile('src/assets/js/webmcp.js', 'utf8');
  for (const name of [
    'tiw_registry_status',
    'tiw_list_skills',
    'tiw_find_skill',
    'tiw_inspect_skill',
    'tiw_resolve_skill_closure'
  ]) {
    assert.match(source, new RegExp(`name: '${name}'`));
  }
  assert.match(source, /HANDOFF_TOOL_NAME = 'tiw_human_handoff'/);
  assert.match(source, /name: HANDOFF_TOOL_NAME/);
  assert.equal((source.match(/annotations: \{ readOnlyHint: true/g) || []).length, 6);
  assert.match(source, /annotations: \{ readOnlyHint: true, untrustedContentHint: true \}/);
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /\{ signal: controller\.signal \}/);
  assert.match(source, /globalThis\.document\?\.modelContext/);
  assert.doesNotMatch(source, /navigator\?\.modelContext|provideContext/);
  assert.doesNotMatch(source, /install_skill|propagate_skill|update_file|create_file/);
});

test('human selection carries exact registry identity without typed internal skill names', async () => {
  const source = await readFile('src/assets/js/webmcp.js', 'utf8');
  assert.match(source, /bindHumanCatalogue\(registry\)/);
  assert.match(source, /dataset\.skillName/);
  assert.match(source, /registry\.inspectSkill\(\{ name \}\)/);
  assert.match(source, /searchParams\.set\('skill', skill\.name\)/);
  assert.match(source, /history\.replaceState/);
  assert.match(source, /data-selected-action/);
});

test('human handoff requires explicit submit and publishes one payload to browser and opaque remote MCP session', async () => {
  const source = await readFile('src/assets/js/webmcp.js', 'utf8');
  assert.match(source, /data-human-handoff-form/);
  assert.match(source, /new FormData\(event\.currentTarget\)\.get\('intent'\)/);
  assert.match(source, /registry\.resolveSkillClosure\(\{ name: selectedName \}\)/);
  assert.match(source, /human_request: intent/);
  assert.match(source, /publishRemoteHandoff\(handoff\)/);
  assert.match(source, /publishBrowserHandoffTool\(handoff\)/);
  assert.match(source, /x-handoff-key/);
  assert.match(source, /method: 'DELETE'/);
  assert.match(source, /remote_session_url_is_bearer_read_capability: true/);
  assert.match(source, /write_key_shared_with_agent: false/);
  assert.match(source, /volatile memory only; expires automatically/);
  assert.match(source, /globalThis\.crypto\?\.getRandomValues/);
  assert.match(source, /data-remote-handoff-url/);
  assert.match(source, /clearPublishedHandoff\('Request text changed/);
  assert.match(source, /clearPublishedHandoff\('Skill selection changed/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
});

test('dedicated WebMCP route presents collapsible cards, remote session URL, and one ordinary-language send box', async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile('src/webmcp/index.njk', 'utf8'),
    readFile('src/_includes/layouts/base.njk', 'utf8'),
    readFile('package.json', 'utf8')
  ]);
  assert.match(page, /permalink: \/webmcp\//);
  assert.match(page, /webmcp: true/);
  assert.match(page, /The page is the provider/);
  assert.match(page, /https:\/\/the-interdependency-mcp\.onrender\.com\/mcp/);
  assert.match(page, /skill\.kind == "metadata-block"/);
  assert.match(page, /skill\.name == "meta"/);
  assert.match(page, /<details data-skill-description>/);
  assert.match(page, /<summary>Description<\/summary>/);
  assert.match(page, /data-select-skill/);
  assert.match(page, /data-selected-skill/);
  assert.match(page, /data-selected-action="inspect"/);
  assert.match(page, /data-selected-action="closure"/);
  assert.match(page, /data-remote-handoff-url/);
  assert.match(page, /possession is read access/i);
  assert.match(page, /data-human-handoff-form/);
  assert.match(page, /<textarea[^>]+data-human-handoff-intent/);
  assert.match(page, /data-human-handoff-send disabled/);
  assert.match(page, /Nothing is sent merely by typing/);
  assert.match(page, /Send selected skill \+ request to agent/);
  assert.match(page, /notifications\/tools\/list_changed/);
  assert.doesNotMatch(page, /data-webmcp-find|data-webmcp-inspect|data-webmcp-closure/);
  assert.match(page, /No internal skill name needs to be typed/);
  assert.match(layout, /\{% if webmcp %\}<script src="\/assets\/js\/webmcp\.js" type="module"><\/script>\{% endif %\}/);
  assert.match(packageJson, /"refresh:skills": "node scripts\/fetch-skill-registry\.mjs"/);
});
