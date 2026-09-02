import { createSkillRegistry } from './webmcp-registry.js';

// === MODULE_BUILD ===
// id: interdependency_webmcp_surface
//   purpose: Register the website-owned, read-only WebMCP tool surface, provide the same registry operations to the human-facing demo page, and filter the build-time human skill catalogue.
//   entrypoint: /webmcp/
//   tests: tests/webmcp.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: interdependency_webmcp_surface_boundary
//   network: same-origin GET of /assets/data/skill-registry.json plus read-only health GET to the website-owned Render MCP runtime
//   storage: none
//   user_data: none
//   operational_effects: none; v0 exposes registry discovery and dependency resolution only
//   authority: the website owns tool registration and remote runtime; The-Interdependency/skill-lib remains authority for skill definitions
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: webmcp_tools_are_read_only_registry_operations
//   given: a human control or browser agent invokes any v0 operation
//   then: execution reads the generated registry projection and returns structured results without mutating the site, GitHub, or skill-lib
//   class: safety
//
// id: webmcp_human_catalogue_remains_source_bound
//   given: a visitor browses or filters the human-readable skill catalogue
//   then: filtering only hides or reveals build-time cards derived from the same generated registry and never creates a second skill definition
//   class: correctness
// === END CONTRACTS ===
// Usage: open `/webmcp/` in any browser to browse the human-readable skill catalogue and exercise the five registry operations directly. In a WebMCP-capable browser the same operations register through `document.modelContext.registerTool(...)`. The remote MCP endpoint is independently health-checked and remains read-only.

const REGISTRY_URL = '/assets/data/skill-registry.json';
const REMOTE_MCP_BASE = 'https://the-interdependency-mcp.onrender.com';
const statusElement = () => document.querySelector('[data-webmcp-status]');
const sourceElement = () => document.querySelector('[data-webmcp-source]');
const remoteStatusElement = () => document.querySelector('[data-remote-mcp-status]');
const outputElement = () => document.querySelector('[data-webmcp-output]');
const modelContext = () => globalThis.document?.modelContext;

function setStatus(message, state = 'hmmm') {
  const target = statusElement();
  if (!target) return;
  target.textContent = message;
  target.dataset.state = state;
}

function setRemoteStatus(message, state = 'hmmm') {
  const target = remoteStatusElement();
  if (!target) return;
  target.textContent = message;
  target.dataset.state = state;
}

function jsonResult(value) {
  return JSON.stringify(value, null, 2);
}

function showResult(label, value) {
  const target = outputElement();
  if (!target) return;
  target.textContent = `${label}\n\n${jsonResult(value)}`;
}

async function loadRegistry() {
  const response = await fetch(REGISTRY_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`registry HTTP ${response.status}`);
  return response.json();
}

function updateSource(status) {
  const target = sourceElement();
  if (!target) return;
  const suffix = status.fallback ? ' (last-known-good fallback)' : '';
  target.textContent = `${status.source.repository}@${status.source.commit.slice(0, 12)}:${status.source.path}${suffix}`;
}

async function checkRemoteMcp() {
  try {
    const response = await fetch(`${REMOTE_MCP_BASE}/health`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = await response.json();
    if (!health?.ok || health.endpoint !== '/mcp') throw new Error('invalid health response');
    setRemoteStatus(`Remote MCP LIVE · ${health.skill_count} skills · ${REMOTE_MCP_BASE}/mcp`, 'implemented');
    return health;
  } catch (error) {
    setRemoteStatus(`Remote MCP health unresolved: ${error.message}`, 'hmmm');
    return null;
  }
}

function bindHumanCatalogue() {
  const form = document.querySelector('[data-human-skill-filter-form]');
  const input = document.querySelector('[data-human-skill-filter]');
  const count = document.querySelector('[data-human-skill-count]');
  const cards = [...document.querySelectorAll('[data-human-skill]')];

  form?.addEventListener('submit', event => event.preventDefault());
  if (!input || cards.length === 0) return;

  const applyFilter = () => {
    const query = String(input.value || '').trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const show = !query || card.textContent.toLowerCase().includes(query);
      card.hidden = !show;
      if (show) visible += 1;
    }
    if (count) count.textContent = `${visible} of ${cards.length} skills shown`;
  };

  input.addEventListener('input', applyFilter);
  applyFilter();
}

function bindHumanControls(registry) {
  document.querySelector('[data-webmcp-action="status"]')?.addEventListener('click', () => {
    showResult('STATUS', registry.getRegistryStatus());
  });

  document.querySelector('[data-webmcp-action="list"]')?.addEventListener('click', () => {
    showResult('LIST', registry.listSkills());
  });

  document.querySelector('[data-webmcp-find]')?.addEventListener('submit', event => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get('query') || '').trim();
    showResult('FIND', registry.findSkills({ query }));
  });

  document.querySelector('[data-webmcp-inspect]')?.addEventListener('submit', event => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') || '').trim();
    try {
      showResult('INSPECT', registry.inspectSkill({ name }));
    } catch (error) {
      showResult('INSPECT', { error: error.message });
    }
  });

  document.querySelector('[data-webmcp-closure]')?.addEventListener('submit', event => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') || '').trim();
    try {
      showResult('RESOLVE CLOSURE', registry.resolveSkillClosure({ name }));
    } catch (error) {
      showResult('RESOLVE CLOSURE', { error: error.message });
    }
  });
}

async function registerTool(tool) {
  const context = modelContext();
  if (!context?.registerTool) throw new Error('WebMCP API unavailable during tool registration');
  await context.registerTool(tool);
}

export async function registerInterdependencyWebMCP() {
  const data = await loadRegistry();
  const registry = createSkillRegistry(data);
  const status = registry.getRegistryStatus();
  updateSource(status);
  bindHumanCatalogue();
  bindHumanControls(registry);
  void checkRemoteMcp();

  if (!modelContext()?.registerTool) {
    setStatus(`Registry live for ${status.skill_count} skills. Browser WebMCP registration requires a WebMCP-capable browser; the human catalogue, controls, and remote MCP server remain usable.`, 'hmmm');
    return { registered: false, reason: 'webmcp-unavailable', registry: status };
  }
  if (globalThis.__interdependencyWebMcpRegistered) {
    return { registered: true, reused: true, registry: status };
  }

  await registerTool({
    name: 'tiw_registry_status',
    title: 'The Interdependency registry status',
    description: 'Return provenance, version, skill count, and fallback state for the website\'s commit-pinned projection of The-Interdependency/skill-lib.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async () => jsonResult(registry.getRegistryStatus())
  });

  await registerTool({
    name: 'tiw_list_skills',
    title: 'List Interdependency skills',
    description: 'List skills in The-Interdependency/skill-lib registry. Optionally filter by exact skill kind.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: 'Optional exact kind such as procedural or metadata-block.' }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async input => jsonResult(registry.listSkills(input))
  });

  await registerTool({
    name: 'tiw_find_skill',
    title: 'Find an Interdependency skill',
    description: 'Search the canonical skill registry by task words, skill name, path, and description. Returns the highest-scoring matches without loading the whole library into agent context.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Task or capability to search for.' },
        kind: { type: 'string', description: 'Optional exact kind filter.' },
        limit: { type: 'integer', minimum: 1, maximum: 20, default: 8 }
      },
      required: ['query'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async input => jsonResult(registry.findSkills(input))
  });

  await registerTool({
    name: 'tiw_inspect_skill',
    title: 'Inspect an Interdependency skill',
    description: 'Return one registered skill\'s kind, description, declared dependencies, canonical path, and commit-pinned GitHub source URL.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Exact registered skill name.' } },
      required: ['name'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async input => jsonResult(registry.inspectSkill(input))
  });

  await registerTool({
    name: 'tiw_resolve_skill_closure',
    title: 'Resolve Interdependency skill closure',
    description: 'Resolve the smallest dependency-first transitive skill closure required by one exact registered skill.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Exact registered skill name.' } },
      required: ['name'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async input => jsonResult(registry.resolveSkillClosure(input))
  });

  globalThis.__interdependencyWebMcpRegistered = true;
  setStatus(`WebMCP LIVE · 5 read-only tools registered over ${status.skill_count} skills.`, status.fallback ? 'hmmm' : 'implemented');
  return { registered: true, tools: 5, registry: status };
}

registerInterdependencyWebMCP().catch(error => {
  console.error('Interdependency WebMCP registration failed', error);
  setStatus(`WebMCP registration failed: ${error.message}`, 'hmmm');
});
