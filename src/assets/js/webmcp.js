import { createSkillRegistry } from './webmcp-registry.js';

// === MODULE_BUILD ===
// id: interdependency_webmcp_surface
//   purpose: Register website-owned read-only WebMCP skill tools and bind exact human-selected skill + repository + request into one ephemeral browser-agent handoff.
//   entrypoint: /webmcp/
//   tests: tests/webmcp.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: interdependency_webmcp_surface_boundary
//   network: same-origin GET of /assets/data/skill-registry.json plus read-only health GET to the website-owned Render MCP runtime
//   storage: none
//   user_data: human-entered handoff text exists only in page memory and is returned only when the browser agent invokes the explicit handoff tool
//   operational_effects: none; skill/repository selection, handoff publication, registry inspection, and dependency resolution do not mutate repositories or external systems
//   authority: skill-lib owns skill definitions; the website build observes public repository identities; external changes require separately authorized agent tools
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: webmcp_human_selection_is_exact_skill_and_repository_identity
//   given: a human selects a presented skill and repository
//   then: the page records exact registered skill identity plus the repository's observed default-branch head without requiring typed machine identifiers
//   class: correctness
//
// id: webmcp_human_handoff_requires_explicit_send
//   given: a human has selected a skill and repository and supplied or accepted an ordinary-language intent
//   then: no agent handoff exists until submit; submit registers one page-session read-only `tiw_human_handoff` carrying skill closure, registry provenance, repository identity, and human intent
//   class: human_in_loop
// === END CONTRACTS ===

const REGISTRY_URL = '/assets/data/skill-registry.json';
const REMOTE_MCP_BASE = 'https://the-interdependency-mcp.onrender.com';
const HANDOFF_TOOL_NAME = 'tiw_human_handoff';
const FRESH_MAKING_INTENT = 'Evaluate the selected repository under the fresh-making contract and make every affected declared derived artifact provably fresh. Resolve exact current input identities, compute the minimal affected closure, regenerate only known-not-fresh targets, verify outputs independently of executor success, preserve authority boundaries, and report fresh, made-fresh, blocked, and hmmm results.';

const statusElement = () => document.querySelector('[data-webmcp-status]');
const sourceElement = () => document.querySelector('[data-webmcp-source]');
const remoteStatusElement = () => document.querySelector('[data-remote-mcp-status]');
const outputElement = () => document.querySelector('[data-webmcp-output]');
const selectedSkillElement = () => document.querySelector('[data-selected-skill]');
const selectedRepositoryElement = () => document.querySelector('[data-selected-repository]');
const handoffStatusElement = () => document.querySelector('[data-human-handoff-status]');
const modelContext = () => globalThis.document?.modelContext;

let currentHandoff = null;
let handoffController = null;

function setText(target, message, state = null) {
  if (!target) return;
  target.textContent = message;
  if (state) target.dataset.state = state;
}

function jsonResult(value) {
  return JSON.stringify(value, null, 2);
}

function showResult(label, value) {
  setText(outputElement(), `${label}\n\n${jsonResult(value)}`);
}

async function loadRegistry() {
  const response = await fetch(REGISTRY_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`registry HTTP ${response.status}`);
  return response.json();
}

function updateSource(status) {
  const suffix = status.fallback ? ' (last-known-good fallback)' : '';
  setText(sourceElement(), `${status.source.repository}@${status.source.commit.slice(0, 12)}:${status.source.path}${suffix}`);
}

async function checkRemoteMcp() {
  try {
    const response = await fetch(`${REMOTE_MCP_BASE}/health`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = await response.json();
    if (!health?.ok || health.endpoint !== '/mcp') throw new Error('invalid health response');
    setText(remoteStatusElement(), `Remote MCP LIVE · ${health.skill_count} public skills · ${REMOTE_MCP_BASE}/mcp`, 'implemented');
    return health;
  } catch (error) {
    setText(remoteStatusElement(), `Remote MCP health unresolved: ${error.message}`, 'hmmm');
    return null;
  }
}

function repositoryFromOption(option) {
  if (!option?.value) return null;
  return {
    name: option.value,
    canonical_url: option.dataset.repositoryUrl || null,
    observed_head_sha: option.dataset.repositoryHead || null,
    default_branch: option.dataset.repositoryBranch || null,
    status: option.dataset.repositoryStatus || null,
    category: option.dataset.repositoryCategory || null,
    identity_source: 'The Interdependency website build-time public repository projection'
  };
}

function selectedRepository(select) {
  return repositoryFromOption(select?.selectedOptions?.[0]);
}

function clearPublishedHandoff(reason) {
  currentHandoff = null;
  if (handoffController) {
    handoffController.abort();
    handoffController = null;
  }
  if (reason) setText(handoffStatusElement(), reason, 'hmmm');
}

async function publishHandoffTool(handoff) {
  currentHandoff = handoff;
  const context = modelContext();
  if (!context?.registerTool) {
    setText(handoffStatusElement(), 'Request prepared in this page, but browser WebMCP is unavailable here, so it cannot be exposed directly to a browser agent.', 'hmmm');
    return false;
  }

  if (handoffController) handoffController.abort();
  const controller = new AbortController();
  handoffController = controller;

  try {
    await context.registerTool({
      name: HANDOFF_TOOL_NAME,
      title: 'Human-sent Interdependency handoff',
      description: 'The human explicitly selected a public Interdependency skill and repository and pressed Send. Read this before planning or changing anything. Returns exact skill and dependency closure, skill-registry provenance, observed repository identity/head, and the human requested outcome. Selection is instruction, not permission.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async () => jsonResult(currentHandoff || { ready: false, hmmm: 'human handoff was invalidated before invocation' })
    }, { signal: controller.signal });
    setText(handoffStatusElement(), `Sent to browser agent context · ${handoff.skill.name} → ${handoff.target_repository.name}.`, 'implemented');
    return true;
  } catch (error) {
    if (controller.signal.aborted) return false;
    currentHandoff = null;
    handoffController = null;
    setText(handoffStatusElement(), `Could not expose the handoff to WebMCP: ${error.message}`, 'hmmm');
    return false;
  }
}

function bindHumanCatalogue(registry) {
  const filterForm = document.querySelector('[data-human-skill-filter-form]');
  const filterInput = document.querySelector('[data-human-skill-filter]');
  const count = document.querySelector('[data-human-skill-count]');
  const cards = [...document.querySelectorAll('[data-human-skill]')];
  const selectedActions = [...document.querySelectorAll('[data-selected-action]')];
  const repositorySelect = document.querySelector('[data-human-repository-target]');
  const handoffForm = document.querySelector('[data-human-handoff-form]');
  const intentInput = document.querySelector('[data-human-handoff-intent]');
  const sendButton = document.querySelector('[data-human-handoff-send]');
  let selectedName = '';
  let freshIntentIsAutomatic = false;

  filterForm?.addEventListener('submit', event => event.preventDefault());

  const applyFilter = () => {
    const query = String(filterInput?.value || '').trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const show = !query || card.textContent.toLowerCase().includes(query);
      card.hidden = !show;
      if (show) visible += 1;
    }
    if (count) count.textContent = `${visible} of ${cards.length} presented skills shown`;
  };

  const updateSendEnabled = () => {
    if (!sendButton) return;
    sendButton.disabled = !selectedName || !selectedRepository(repositorySelect) || !String(intentInput?.value || '').trim();
  };

  const updateRepositoryDisplay = () => {
    const repository = selectedRepository(repositorySelect);
    if (!repository) {
      setText(selectedRepositoryElement(), 'No repository selected.');
      return;
    }
    const head = repository.observed_head_sha ? repository.observed_head_sha.slice(0, 12) : 'head hmmm';
    setText(selectedRepositoryElement(), `${repository.name} · ${repository.default_branch || 'branch hmmm'}@${head} · ${repository.status || 'status hmmm'}`);
  };

  const setSelected = (name, { updateUrl = true } = {}) => {
    const card = cards.find(candidate => candidate.dataset.skillName === name);
    if (!card) return false;

    if (selectedName && selectedName !== name && currentHandoff) {
      clearPublishedHandoff('Skill selection changed. Review and press Send again before the agent receives a new handoff.');
    }

    const previousName = selectedName;
    const skill = registry.inspectSkill({ name });
    selectedName = name;

    for (const candidate of cards) {
      const selected = candidate === card;
      candidate.dataset.selected = selected ? 'true' : 'false';
      candidate.querySelector('[data-select-skill]')?.setAttribute('aria-pressed', String(selected));
      if (selected) candidate.querySelector('[data-skill-description]')?.setAttribute('open', '');
    }

    setText(selectedSkillElement(), `${skill.name} · ${skill.kind} · ${skill.canonical_path}`);
    for (const action of selectedActions) action.disabled = false;
    showResult('SELECTED SKILL', skill);

    if (name === 'fresh-making' && (!intentInput.value.trim() || freshIntentIsAutomatic)) {
      intentInput.value = FRESH_MAKING_INTENT;
      freshIntentIsAutomatic = true;
    } else if (previousName === 'fresh-making' && freshIntentIsAutomatic && name !== 'fresh-making') {
      intentInput.value = '';
      freshIntentIsAutomatic = false;
    }

    updateSendEnabled();
    if (!currentHandoff) setText(handoffStatusElement(), 'Skill selected. Choose a repository, review the outcome, then press Send.', 'hmmm');

    if (updateUrl) {
      const url = new URL(globalThis.location.href);
      url.searchParams.set('skill', skill.name);
      globalThis.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
    return true;
  };

  for (const card of cards) {
    card.querySelector('[data-select-skill]')?.addEventListener('click', () => setSelected(card.dataset.skillName || ''));
  }

  repositorySelect?.addEventListener('change', () => {
    if (currentHandoff) clearPublishedHandoff('Repository selection changed. Press Send again before the agent receives a new handoff.');
    updateRepositoryDisplay();
    updateSendEnabled();
    const repository = selectedRepository(repositorySelect);
    const url = new URL(globalThis.location.href);
    if (repository) url.searchParams.set('repo', repository.name);
    else url.searchParams.delete('repo');
    globalThis.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  });

  document.querySelector('[data-selected-action="inspect"]')?.addEventListener('click', () => {
    if (selectedName) showResult('INSPECT SELECTED', registry.inspectSkill({ name: selectedName }));
  });

  document.querySelector('[data-selected-action="closure"]')?.addEventListener('click', () => {
    if (selectedName) showResult('REQUIRED SKILL SET', registry.resolveSkillClosure({ name: selectedName }));
  });

  intentInput?.addEventListener('input', () => {
    freshIntentIsAutomatic = false;
    if (currentHandoff) clearPublishedHandoff('Request text changed. Press Send again before the agent receives the revision.');
    updateSendEnabled();
  });

  handoffForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const repository = selectedRepository(repositorySelect);
    const intent = String(new FormData(event.currentTarget).get('intent') || '').trim();
    if (!selectedName || !repository || !intent) {
      setText(handoffStatusElement(), 'Select a skill and repository and provide an outcome before sending.', 'hmmm');
      updateSendEnabled();
      return;
    }

    const skill = registry.inspectSkill({ name: selectedName });
    const handoff = {
      ready: true,
      sent_at: new Date().toISOString(),
      skill,
      required_skills: registry.resolveSkillClosure({ name: selectedName }),
      skill_registry: registry.getRegistryStatus(),
      target_repository: repository,
      human_request: intent,
      boundaries: {
        selection_is_instruction_not_permission: true,
        observed_repository_head_is_provenance_not_write_authority: true,
        repository_write_authority: 'not granted by this handoff',
        persistence: 'page session only',
        remote_mcp_storage: false
      }
    };

    showResult('HUMAN → AGENT HANDOFF', handoff);
    await publishHandoffTool(handoff);
  });

  filterInput?.addEventListener('input', applyFilter);
  applyFilter();
  updateRepositoryDisplay();

  const requestedUrl = new URL(globalThis.location.href);
  const requestedSkill = requestedUrl.searchParams.get('skill');
  if (requestedSkill) setSelected(requestedSkill, { updateUrl: false });
  const requestedRepo = requestedUrl.searchParams.get('repo');
  if (requestedRepo && repositorySelect) {
    const option = [...repositorySelect.options].find(candidate => candidate.value === requestedRepo);
    if (option) {
      repositorySelect.value = requestedRepo;
      updateRepositoryDisplay();
    }
  }
  updateSendEnabled();

  return { getSelectedName: () => selectedName, getSelectedRepository: () => selectedRepository(repositorySelect) };
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
    setText(statusElement(), `Registry live for ${status.skill_count} public skills. Browser WebMCP registration requires a WebMCP-capable browser; the human catalogue remains usable.`, 'hmmm');
    return { registered: false, reason: 'webmcp-unavailable', registry: status };
  }
  if (globalThis.__interdependencyWebMcpRegistered) return { registered: true, reused: true, registry: status };

  await registerTool({
    name: 'tiw_registry_status',
    title: 'The Interdependency registry status',
    description: 'Return provenance, public scope, skill counts, version, and fallback state for the website commit-pinned projection of The-Interdependency/skill-lib.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async () => jsonResult(registry.getRegistryStatus())
  });

  await registerTool({
    name: 'tiw_list_skills',
    title: 'List public Interdependency skills',
    description: 'List the same curated public skill set shown to the human: msdmd metadata-block applications, METAPAT meta, and fresh-making.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string' } }, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async input => jsonResult(registry.listSkills(input))
  });

  await registerTool({
    name: 'tiw_find_skill',
    title: 'Find a public Interdependency skill',
    description: 'Search the same curated public skill material the human can browse by task words, skill name, path, and description.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        kind: { type: 'string' },
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
    title: 'Inspect a public Interdependency skill',
    description: 'Return the same selected skill material shown to the human: kind, description, dependencies, canonical path, and commit-pinned source URL.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'], additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async input => jsonResult(registry.inspectSkill(input))
  });

  await registerTool({
    name: 'tiw_resolve_skill_closure',
    title: 'Resolve public Interdependency skill closure',
    description: 'Resolve the smallest dependency-first transitive public skill set required by one selected public skill.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'], additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async input => jsonResult(registry.resolveSkillClosure(input))
  });

  globalThis.__interdependencyWebMcpRegistered = true;
  setText(statusElement(), `WebMCP LIVE · 5 registry tools over ${status.skill_count} public skills. An ephemeral sixth handoff tool appears only after explicit human Send.`, status.fallback ? 'hmmm' : 'implemented');
  return { registered: true, tools: 5, dynamic_handoff_tool: HANDOFF_TOOL_NAME, registry: status };
}

registerInterdependencyWebMCP().catch(error => {
  console.error('Interdependency WebMCP registration failed', error);
  setText(statusElement(), `WebMCP registration failed: ${error.message}`, 'hmmm');
});
