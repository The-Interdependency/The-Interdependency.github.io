import { createSkillRegistry } from './webmcp-registry.js';

// === MODULE_BUILD ===
// id: interdependency_webmcp_surface
//   purpose: Register the website-owned, read-only WebMCP tool surface over the commit-pinned skill-lib registry projection.
//   entrypoint: /webmcp/
//   tests: tests/webmcp.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: interdependency_webmcp_surface_boundary
//   network: same-origin GET of /assets/data/skill-registry.json only
//   storage: none
//   user_data: none
//   operational_effects: none; v0 exposes registry discovery and dependency resolution only
//   authority: the website owns tool registration; The-Interdependency/skill-lib remains authority for skill definitions
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: webmcp_tools_are_read_only_registry_operations
//   given: an agent invokes any v0 tool
//   then: execution reads the generated registry projection and returns structured results without mutating the site, GitHub, or skill-lib
//   class: safety
// === END CONTRACTS ===
// Usage: open `/webmcp/` in a WebMCP-capable browser or in-app browser. The page registers five read-only tools through `navigator.modelContext`. Unsupported browsers still resolve and display registry provenance without polyfilling or faking WebMCP support.

const REGISTRY_URL = '/assets/data/skill-registry.json';
const statusElement = () => document.querySelector('[data-webmcp-status]');
const sourceElement = () => document.querySelector('[data-webmcp-source]');
const modelContext = () => globalThis.navigator?.modelContext;

function setStatus(message, state = 'hmmm') {
  const target = statusElement();
  if (!target) return;
  target.textContent = message;
  target.dataset.state = state;
}

function jsonResult(value) {
  return JSON.stringify(value, null, 2);
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

  if (!modelContext()?.registerTool) {
    setStatus(`WebMCP API unavailable in this browser. Registry provenance resolved for ${status.skill_count} skills; tool registration requires a WebMCP-capable browser.`, 'hmmm');
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
  setStatus(`WebMCP live: 5 read-only tools registered over ${status.skill_count} skills.`, status.fallback ? 'hmmm' : 'implemented');
  return { registered: true, tools: 5, registry: status };
}

registerInterdependencyWebMCP().catch(error => {
  console.error('Interdependency WebMCP registration failed', error);
  setStatus(`WebMCP registration failed: ${error.message}`, 'hmmm');
});
