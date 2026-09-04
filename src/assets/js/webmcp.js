import { createSkillRegistry } from './webmcp-registry.js';

// === MODULE_BUILD ===
// id: interdependency_webmcp_surface
//   purpose: Register website-owned read-only WebMCP skill tools and bind exact human-selected repository + skill + request into one ephemeral browser-agent handoff.
//   entrypoint: /webmcp/
//   tests: tests/webmcp.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: interdependency_webmcp_surface_boundary
//   network: same-origin GET of /assets/data/skill-registry.json plus read-only health GET to the website-owned Render MCP runtime
//   storage: none
//   user_data: human-entered handoff text exists only in page memory and is returned only when the browser agent invokes the explicit handoff tool
//   operational_effects: none; repository/skill selection, handoff publication, registry inspection, and dependency resolution do not mutate repositories or external systems
//   authority: skill-lib owns skill definitions; the website build observes public repository identities; external changes require separately authorized agent tools
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: webmcp_human_selection_is_exact_skill_and_repository_identity
//   given: a human selects a repository and then a presented skill
//   then: the page records exact registered skill identity plus the repository's observed default-branch head without requiring typed machine identifiers
//   class: correctness
//
// id: webmcp_repository_context_precedes_agent_work_selection
//   given: no repository is selected or the selected repository changes
//   then: skill controls remain disabled or the prior skill selection and visible output are invalidated so agent work is always chosen within the current repository context
//   class: human_in_loop
//
// id: webmcp_human_handoff_requires_explicit_send
//   given: a human has selected a skill and repository and supplied or accepted an ordinary-language intent
//   then: no agent handoff exists until submit; submit registers one page-session read-only `tiw_human_handoff` carrying skill closure, registry provenance, repository identity, and human intent
//   class: human_in_loop
// === END CONTRACTS ===
// Usage: on /webmcp/, choose a repository first, then choose a skill and describe the outcome. Changing the repository requires choosing the skill again; only explicit Send publishes the read-only page-session handoff.

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
const skillStageStatusElement = () => document.querySelector('[data-skill-stage-status]');
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

function showHumanMessage(message) {
  setText(outputElement(), message);
}

async function loadRegistry() {
  const response = await fetch(REGISTRY_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`registry HTTP ${response.status}`);
  return response.json();
}

function updateSource(status) {
  const suffix = status.fallback ? ' (last-known-good fallback)' : '';
  setText(sourceElement(), `The Interdependency skill library · commit-pinned verified snapshot${suffix}`);
}

async function checkRemoteMcp() {
  try {
    const response = await fetch(`${REMOTE_MCP_BASE}/health`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = await response.json();
    if (!health?.ok || health.endpoint !== '/mcp') throw new Error('invalid health response');
    setText(remoteStatusElement(), `Remote MCP LIVE · ${health.skill_count} public skills`, 'implemented');
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
      description: 'The human explicitly selected a public Interdependency repository, then a skill, and pressed Send. Read this before planning or changing anything. Returns the observed repository identity/head, exact skill and dependency closure, skill-registry provenance, and the human requested outcome. Selection is instruction, not permission.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async () => jsonResult(currentHandoff || { ready: false, hmmm: 'human handoff was invalidated before invocation' })
    }, { signal: controller.signal });
    setText(handoffStatusElement(), `Sent to browser agent context · ${handoff.target_repository.name} → ${handoff.skill.human_title || handoff.skill.name}.`, 'implemented');
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
  const skillButtons = cards.map(card => card.querySelector('[data-select-skill]')).filter(Boolean);
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
    const humanStatus = repository.category || repository.status || 'public repository';
    setText(selectedRepositoryElement(), `${repository.name} · ${humanStatus}`);
  };

  const setSkillStageEnabled = repository => {
    const enabled = Boolean(repository);
    if (filterInput) filterInput.disabled = !enabled;
    for (const skillButton of skillButtons) skillButton.disabled = !enabled;
    setText(
      skillStageStatusElement(),
      enabled
        ? `${repository.name} selected. Now choose how the agent should work in this repository.`
        : 'Choose a repository first to enable its agent-work choices.',
      enabled ? 'implemented' : 'hmmm'
    );
  };

  const clearSelectedSkill = () => {
    if (!selectedName) return false;
    const previousName = selectedName;
    selectedName = '';
    for (const card of cards) {
      card.dataset.selected = 'false';
      card.querySelector('[data-select-skill]')?.setAttribute('aria-pressed', 'false');
    }
    setText(selectedSkillElement(), 'No skill selected.');
    for (const action of selectedActions) action.disabled = true;
    if (previousName === 'fresh-making' && freshIntentIsAutomatic) {
      intentInput.value = '';
      freshIntentIsAutomatic = false;
    }
    return true;
  };

  const humanHeadingFor = name => {
    const card = cards.find(candidate => candidate.dataset.skillName === name);
    const cardHeading = card?.querySelector('h4')?.textContent?.trim();
    if (cardHeading) return cardHeading;
    const skill = registry.inspectSkill({ name });
    return skill.human_title || skill.name;
  };

  const setSelected = (name, { updateUrl = true } = {}) => {
    const repository = selectedRepository(repositorySelect);
    if (!repository) {
      setText(handoffStatusElement(), 'Choose a repository before choosing how the agent should work.', 'hmmm');
      repositorySelect?.focus();
      return false;
    }
    const card = cards.find(candidate => candidate.dataset.skillName === name);
    if (!card) return false;

    if (selectedName && selectedName !== name && currentHandoff) {
      clearPublishedHandoff('Skill selection changed. Review and press Send again before the agent receives a new handoff.');
    }

    const previousName = selectedName;
    const skill = registry.inspectSkill({ name });
    selectedName = name;
    const heading = humanHeadingFor(name);

    for (const candidate of cards) {
      const selected = candidate === card;
      candidate.dataset.selected = selected ? 'true' : 'false';
      candidate.querySelector('[data-select-skill]')?.setAttribute('aria-pressed', String(selected));
      if (selected) candidate.querySelector('[data-skill-description]')?.setAttribute('open', '');
    }

    setText(selectedSkillElement(), heading);
    for (const action of selectedActions) action.disabled = false;
    showHumanMessage(`Selected ${repository.name} with ${heading}. Press Send to hand the agent the exact repository identity, skill, and required skill set.`);

    if (name === 'fresh-making' && (!intentInput.value.trim() || freshIntentIsAutomatic)) {
      intentInput.value = FRESH_MAKING_INTENT;
      freshIntentIsAutomatic = true;
    } else if (previousName === 'fresh-making' && freshIntentIsAutomatic && name !== 'fresh-making') {
      intentInput.value = '';
      freshIntentIsAutomatic = false;
    }

    updateSendEnabled();
    if (!currentHandoff) setText(handoffStatusElement(), `${repository.name} and ${heading} selected. Review the outcome, then press Send.`, 'hmmm');

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
    const skillWasCleared = clearSelectedSkill();
    updateRepositoryDisplay();
    const repository = selectedRepository(repositorySelect);
    showHumanMessage(
      repository
        ? `${repository.name} selected. Previous skill or handoff output cleared. Choose how the agent should work in it.`
        : 'Repository selection cleared. Previous skill or handoff output cleared.'
    );
    setSkillStageEnabled(repository);
    updateSendEnabled();
    const url = new URL(globalThis.location.href);
    if (repository) url.searchParams.set('repo', repository.name);
    else url.searchParams.delete('repo');
    if (skillWasCleared) url.searchParams.delete('skill');
    globalThis.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    setText(
      handoffStatusElement(),
      repository
        ? `${repository.name} selected. Now choose how the agent should work in it.`
        : 'Choose a repository first. Nothing is sent merely by selecting or typing.',
      'hmmm'
    );
  });

  document.querySelector('[data-selected-action="inspect"]')?.addEventListener('click', () => {
    if (!selectedName) return;
    const skill = registry.inspectSkill({ name: selectedName });
    showHumanMessage(`${skill.human_title || skill.name}: ${skill.description}`);
  });

  document.querySelector('[data-selected-action="closure"]')?.addEventListener('click', () => {
    if (!selectedName) return;
    const closure = registry.resolveSkillClosure({ name: selectedName });
    showHumanMessage(`Required skills: ${closure.map(skill => skill.human_title || skill.name).join(', ')}.`);
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
      setText(handoffStatusElement(), 'Select a repository, then a skill, and provide an outcome before sending.', 'hmmm');
      updateSendEnabled();
      return;
    }

    const skill = registry.inspectSkill({ name: selectedName });
    const handoff = {
      ready: true,
      sent_at: new Date().toISOString(),
      target_repository: repository,
      skill,
      required_skills: registry.resolveSkillClosure({ name: selectedName }),
      skill_registry: registry.getRegistryStatus(),
      human_request: intent,
      boundaries: {
        selection_is_instruction_not_permission: true,
        observed_repository_head_is_provenance_not_write_authority: true,
        repository_write_authority: 'not granted by this handoff',
        persistence: 'page session only',
        remote_mcp_storage: false
      }
    };

    const published = await publishHandoffTool(handoff);
    const activeRepository = selectedRepository(repositorySelect);
    if (activeRepository?.name !== repository.name || selectedName !== skill.name) return;
    if (published) {
      showHumanMessage(`Handoff sent to the browser agent: repository ${repository.name} · skill ${skill.human_title || skill.name}. The agent now holds the exact repository head, required skill set, registry provenance, and your request.`);
    } else {
      showHumanMessage('The request was prepared in this page, but it could not be exposed to a browser agent here. Nothing was sent.');
    }
  });

  filterInput?.addEventListener('input', applyFilter);
  applyFilter();

  const requestedUrl = new URL(globalThis.location.href);
  const requestedRepo = requestedUrl.searchParams.get('repo');
  if (requestedRepo && repositorySelect) {
    const option = [...repositorySelect.options].find(candidate => candidate.value === requestedRepo);
    if (option) {
      repositorySelect.value = requestedRepo;
    }
  }
  updateRepositoryDisplay();
  const repository = selectedRepository(repositorySelect);
  setSkillStageEnabled(repository);

  const requestedSkill = requestedUrl.searchParams.get('skill');
  if (requestedSkill && repository) {
    if (!setSelected(requestedSkill, { updateUrl: false })) requestedUrl.searchParams.delete('skill');
  } else if (requestedSkill) {
    requestedUrl.searchParams.delete('skill');
  }
  if (requestedUrl.search !== globalThis.location.search) {
    globalThis.history.replaceState(null, '', `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`);
  }
  if (repository && !selectedName) {
    setText(handoffStatusElement(), `${repository.name} selected. Now choose how the agent should work in it.`, 'hmmm');
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
    description: 'List the same curated public skill set shown to the human: msdmd metadata-block applications, METAPAT meta, fresh-making, and evidence-bound EPAC selection/display.',
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
  setText(statusElement(), `WebMCP LIVE · five read-only registry tools over ${status.skill_count} public skills. A sixth handoff tool appears only after you press Send.`, status.fallback ? 'hmmm' : 'implemented');
  return { registered: true, tools: 5, dynamic_handoff_tool: HANDOFF_TOOL_NAME, registry: status };
}

registerInterdependencyWebMCP().catch(error => {
  console.error('Interdependency WebMCP registration failed', error);
  setText(statusElement(), `WebMCP registration failed: ${error.message}`, 'hmmm');
});
