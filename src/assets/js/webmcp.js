import { createSkillRegistry } from './webmcp-registry.js';

// === MODULE_BUILD ===
// id: interdependency_webmcp_surface
//   purpose: Register the website-owned read-only WebMCP tools and bind the human-readable skill-selection surface to the same commit-pinned registry records.
//   entrypoint: /webmcp/
//   tests: tests/webmcp.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: interdependency_webmcp_surface_boundary
//   network: same-origin GET of /assets/data/skill-registry.json plus read-only health GET to the website-owned Render MCP runtime
//   storage: none
//   user_data: none
//   operational_effects: none; selection changes only page state and URL query, while v0 MCP operations remain read-only
//   authority: the website owns tool registration and remote runtime; The-Interdependency/skill-lib remains authority for skill definitions
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: webmcp_tools_are_read_only_registry_operations
//   given: a browser agent invokes any v0 operation
//   then: execution reads the generated registry projection and returns structured results without mutating the site, GitHub, or skill-lib
//   class: safety
//
// id: webmcp_human_selection_is_exact_registry_identity
//   given: a human selects a presented skill card
//   then: the page opens that card's description, records the exact registered skill name in visible state and the URL, and derives inspection/closure from the same registry object without requiring typed internal identifiers
//   class: correctness
// === END CONTRACTS ===
// Usage: open `/webmcp/`; humans select from the curated cards while agents receive the same canonical registry material through `document.modelContext.registerTool(...)`. Selection is instruction, not write authority.

const REGISTRY_URL = '/assets/data/skill-registry.json';
const REMOTE_MCP_BASE = 'https://the-interdependency-mcp.onrender.com';
const statusElement = () => document.querySelector('[data-webmcp-status]');
const sourceElement = () => document.querySelector('[data-webmcp-source]');
const remoteStatusElement = () => document.querySelector('[data-remote-mcp-status]');
const outputElement = () => document.querySelector('[data-webmcp-output]');
const selectedElement = () => document.querySelector('[data-selected-skill]');
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

function bindHumanCatalogue(registry) {
  const form = document.querySelector('[data-human-skill-filter-form]');
  const input = document.querySelector('[data-human-skill-filter]');
  const count = document.querySelector('[data-human-skill-count]');
  const cards = [...document.querySelectorAll('[data-human-skill]')];
  const selectedActions = [...document.querySelectorAll('[data-selected-action]')];
  let selectedName = '';

  form?.addEventListener('submit', event => event.preventDefault());

  const applyFilter = () => {
    const query = String(input?.value || '').trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const show = !query || card.textContent.toLowerCase().includes(query);
      card.hidden = !show;
      if (show) visible += 1;
    }
    if (count) count.textContent = `${visible} of ${cards.length} presented skills shown`;
  };

  const setSelected = (name, { updateUrl = true } = {}) => {
    const card = cards.find(candidate => candidate.dataset.skillName === name);
    if (!card) return false;

    const skill = registry.inspectSkill({ name });
    selectedName = name;

    for (const candidate of cards) {
      const selected = candidate === card;
      candidate.dataset.selected = selected ? 'true' : 'false';
      candidate.querySelector('[data-select-skill]')?.setAttribute('aria-pressed', String(selected));
      if (selected) candidate.querySelector('[data-skill-description]')?.setAttribute('open', '');
    }

    const target = selectedElement();
    if (target) {
      target.textContent = `${skill.name} · ${skill.kind} · ${skill.canonical_path}`;
      target.dataset.skillName = skill.name;
    }

    for (const action of selectedActions) action.disabled = false;
    showResult('SELECTED SKILL', skill);

    if (updateUrl) {
      const url = new URL(globalThis.location.href);
      url.searchParams.set('skill', skill.name);
      globalThis.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
    return true;
  };

  for (const card of cards) {
    card.querySelector('[data-select-skill]')?.addEventListener('click', () => {
      setSelected(card.dataset.skillName || '');
    });
  }

  document.querySelector('[data-selected-action="inspect"]')?.addEventListener('click', () => {
    if (!selectedName) return;
    showResult('INSPECT SELECTED', registry.inspectSkill({ name: selectedName }));
  });

  document.querySelector('[data-selected-action="closure"]')?.addEventListener('click', () => {
    if (!selectedName) return;
    showResult('REQUIRED SKILL SET', registry.resolveSkillClosure({ name: selectedName }));
  });

  input?.addEventListener('input', applyFilter);
  applyFilter();

  const requested = new URL(globalThis.location.href).searchParams.get('skill');
  if (requested) setSelected(requested, { updateUrl: false });

  return { getSelectedName: () => selectedName };
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
  bindHumanCatalogue(registry);
  void checkRemoteMcp();

  if (!modelContext()?.registerTool) {
    setStatus(`Registry live for ${status.skill_count} skills. Browser WebMCP registration requires a WebMCP-capable browser; human selection and the remote MCP server remain usable.`, 'hmmm');
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
