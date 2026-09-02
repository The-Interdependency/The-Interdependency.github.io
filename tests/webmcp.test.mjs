import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeRegistry, readFallback } from '../scripts/fetch-skill-registry.mjs';
import { createSkillRegistry } from '../src/assets/js/webmcp-registry.js';

// Usage: run with `npm test`; these checks verify registry provenance, dependency closure, clean-checkout fallback identity, current WebMCP Document API usage, live human controls, and the visible remote MCP endpoint without requiring a WebMCP-capable test browser.

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

test('registry adapter finds skills and resolves the smallest dependency-first closure', () => {
  const registry = createSkillRegistry(sampleProjection());
  const matches = registry.findSkills({ query: 'audit repository' });
  assert.equal(matches[0].name, 'repo-audit-repair');

  const closure = registry.resolveSkillClosure({ name: 'cap-build' });
  assert.deepEqual(closure.map(skill => skill.name), ['msdmd', 'cap-build']);
  assert.match(closure[1].canonical_url, /The-Interdependency\/skill-lib\/blob\/0123456789abcdef/);
});

test('WebMCP provider registers only the five declared read-only registry tools through document.modelContext', async () => {
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
  assert.equal((source.match(/annotations: \{ readOnlyHint: true/g) || []).length, 5);
  assert.match(source, /globalThis\.document\?\.modelContext/);
  assert.doesNotMatch(source, /navigator\?\.modelContext|provideContext/);
  assert.doesNotMatch(source, /unregisterTool|install_skill|propagate_skill|update_file|create_file/);
});

test('registry provenance and human controls resolve before unsupported-browser WebMCP return', async () => {
  const source = await readFile('src/assets/js/webmcp.js', 'utf8');
  const loadIndex = source.indexOf('const data = await loadRegistry();');
  const sourceIndex = source.indexOf('updateSource(status);');
  const controlsIndex = source.indexOf('bindHumanControls(registry);');
  const unsupportedIndex = source.indexOf("if (!modelContext()?.registerTool)");
  assert.ok(loadIndex >= 0 && sourceIndex > loadIndex);
  assert.ok(controlsIndex > sourceIndex);
  assert.ok(unsupportedIndex > controlsIndex);
});

test('dedicated WebMCP route is the visible browser and remote MCP front door', async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile('src/webmcp/index.njk', 'utf8'),
    readFile('src/_includes/layouts/base.njk', 'utf8'),
    readFile('package.json', 'utf8')
  ]);
  assert.match(page, /permalink: \/webmcp\//);
  assert.match(page, /webmcp: true/);
  assert.match(page, /The Interdependency WebMCP/);
  assert.match(page, /The page is the provider/);
  assert.match(page, /document\.modelContext\.registerTool/);
  assert.match(page, /https:\/\/the-interdependency-mcp\.onrender\.com\/mcp/);
  assert.match(page, /data-remote-mcp-status/);
  assert.match(page, /data-webmcp-action="status"/);
  assert.match(page, /data-webmcp-find/);
  assert.match(page, /data-webmcp-inspect/);
  assert.match(page, /data-webmcp-closure/);
  assert.match(layout, /\{% if webmcp %\}<script src="\/assets\/js\/webmcp\.js" type="module"><\/script>\{% endif %\}/);
  assert.match(packageJson, /"refresh:skills": "node scripts\/fetch-skill-registry\.mjs"/);
  assert.match(packageJson, /refresh:github && npm run refresh:skills && npm run refresh:msdmd/);
});
