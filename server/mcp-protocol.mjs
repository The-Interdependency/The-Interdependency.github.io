import { createSkillRegistry } from '../src/assets/js/webmcp-registry.js';

// === MODULE_BUILD ===
// id: interdependency_remote_mcp_protocol
//   module_name: mcp_protocol
//   module_kind: service
//   summary: Serve the website-owned skill registry as a real read-only MCP tool surface for modern 2026 and legacy 2025 protocol clients.
//   owner: Erin Spencer
//   public_surface: createMcpProtocol, TOOL_DEFINITIONS, SUPPORTED_PROTOCOL_VERSIONS, MODERN_PROTOCOL_VERSION
//   internal_surface: protocol negotiation, tool dispatch, modern response envelopes
//   auth_boundary: none
//   storage_boundary: none
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/mcp-server.test.mjs
//   rollout: imported by server/mcp-server.mjs
//   rollback: remove server deployment and this protocol module; browser-native WebMCP remains independent
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: interdependency_remote_mcp_protocol_boundary
//   summary: exposes only read-only transformations over a supplied public skill registry projection
//   auth_boundary: none
//   storage_boundary: none
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: none
//   owner: website-runtime
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: remote_mcp_exposes_same_five_registry_tools
//   given: a client lists MCP tools
//   then: exactly the five website registry operations are returned with read-only annotations
//   class: correctness
//
// id: remote_mcp_supports_modern_and_legacy_eras
//   given: a client uses MCP 2026-07-28 server/discover or a 2025 initialize handshake
//   then: the server returns the correct era-shaped response and the same tool semantics
//   class: interoperability
//
// id: remote_mcp_tool_calls_do_not_mutate
//   given: any registered tool is called
//   then: only supplied registry data is read and a structured result is returned
//   class: safety
// === END CONTRACTS ===
// Usage: create a protocol with `createMcpProtocol(registryData)`, then pass incoming JSON-RPC messages to `handle(message, { protocolVersion })`.

export const MODERN_PROTOCOL_VERSION = '2026-07-28';
export const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-11-25',
  '2025-06-18',
  '2025-03-26'
];

export const SERVER_INFO = Object.freeze({
  name: 'the-interdependency-mcp',
  title: 'The Interdependency MCP',
  version: '0.1.0',
  description: 'Read-only MCP server over the commit-pinned The-Interdependency/skill-lib registry.',
  websiteUrl: 'https://interdependentway.org/webmcp/'
});

export const TOOL_DEFINITIONS = Object.freeze([
  {
    name: 'tiw_registry_status',
    title: 'The Interdependency registry status',
    description: 'Return provenance, registry version, skill count, and fallback state for the commit-pinned skill-lib projection.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'tiw_list_skills',
    title: 'List Interdependency skills',
    description: 'List registered skills, optionally filtered by exact skill kind.',
    inputSchema: {
      type: 'object',
      properties: { kind: { type: 'string', description: 'Optional exact kind such as procedural or metadata-block.' } },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'tiw_find_skill',
    title: 'Find an Interdependency skill',
    description: 'Search the registry by task words, skill name, path, and description.',
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
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'tiw_inspect_skill',
    title: 'Inspect an Interdependency skill',
    description: 'Return one registered skill with its kind, description, dependencies, canonical path, and commit-pinned source URL.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Exact registered skill name.' } },
      required: ['name'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'tiw_resolve_skill_closure',
    title: 'Resolve Interdependency skill closure',
    description: 'Resolve the smallest dependency-first transitive closure required by one registered skill.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Exact registered skill name.' } },
      required: ['name'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }
]);

const TOOL_ARGUMENT_KEYS = Object.freeze({
  tiw_registry_status: [],
  tiw_list_skills: ['kind'],
  tiw_find_skill: ['query', 'kind', 'limit'],
  tiw_inspect_skill: ['name'],
  tiw_resolve_skill_closure: ['name']
});

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function rpcError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message, ...(data === undefined ? {} : { data }) }
  };
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function validateArguments(name, value) {
  const args = value === undefined ? {} : value;
  if (!isObject(args)) throw new Error('arguments must be an object');

  const allowed = TOOL_ARGUMENT_KEYS[name];
  if (!allowed) throw new Error(`unknown tool: ${name}`);
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key)) throw new Error(`unexpected argument: ${key}`);
  }

  if (name === 'tiw_find_skill' && typeof args.query !== 'string') {
    throw new Error('query is required and must be a string');
  }
  if ((name === 'tiw_inspect_skill' || name === 'tiw_resolve_skill_closure') && typeof args.name !== 'string') {
    throw new Error('name is required and must be a string');
  }
  if (args.kind !== undefined && typeof args.kind !== 'string') throw new Error('kind must be a string');
  if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 20)) {
    throw new Error('limit must be an integer from 1 to 20');
  }
  return args;
}

function toolResult(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
    isError: false
  };
}

function toolError(message) {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function negotiateLegacyVersion(requested) {
  return SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
    ? requested
    : SUPPORTED_PROTOCOL_VERSIONS[0];
}

function modernMeta() {
  return { 'io.modelcontextprotocol/serverInfo': { ...SERVER_INFO } };
}

function modernResult(id, result, { cacheable = false } = {}) {
  return rpcResult(id, {
    ...result,
    resultType: 'complete',
    ...(cacheable ? { ttlMs: 60_000, cacheScope: 'public' } : {}),
    _meta: { ...(result?._meta || {}), ...modernMeta() }
  });
}

function discoverResult(id) {
  return modernResult(id, {
    supportedVersions: [MODERN_PROTOCOL_VERSION, ...SUPPORTED_PROTOCOL_VERSIONS],
    capabilities: { tools: { listChanged: false } },
    instructions: 'Use the five read-only tiw_* tools to discover, inspect, and resolve dependency closure for The Interdependency skills.'
  }, { cacheable: true });
}

export function createMcpProtocol(registryData) {
  const registry = createSkillRegistry(registryData);
  const toolHandlers = {
    tiw_registry_status: args => registry.getRegistryStatus(args),
    tiw_list_skills: args => registry.listSkills(args),
    tiw_find_skill: args => registry.findSkills(args),
    tiw_inspect_skill: args => registry.inspectSkill(args),
    tiw_resolve_skill_closure: args => registry.resolveSkillClosure(args)
  };

  function handleToolCall(message, modern) {
    const name = message.params?.name;
    if (typeof name !== 'string' || !toolHandlers[name]) {
      return rpcError(message.id, -32602, 'Invalid params', { reason: `unknown tool: ${name}` });
    }
    try {
      const args = validateArguments(name, message.params?.arguments);
      const result = toolResult(toolHandlers[name](args));
      return modern ? modernResult(message.id, result) : rpcResult(message.id, result);
    } catch (error) {
      const result = toolError(error instanceof Error ? error.message : String(error));
      return modern ? modernResult(message.id, result) : rpcResult(message.id, result);
    }
  }

  function handle(message, { protocolVersion = null } = {}) {
    if (!isObject(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      return rpcError(message?.id, -32600, 'Invalid Request');
    }

    const hasId = Object.prototype.hasOwnProperty.call(message, 'id');
    if (!hasId) return { notification: true };

    const modern = protocolVersion === MODERN_PROTOCOL_VERSION || message.method === 'server/discover';

    switch (message.method) {
      case 'server/discover':
        return discoverResult(message.id);
      case 'initialize':
        return rpcResult(message.id, {
          protocolVersion: negotiateLegacyVersion(message.params?.protocolVersion),
          capabilities: { tools: { listChanged: false } },
          serverInfo: { ...SERVER_INFO },
          instructions: 'Use the five read-only tiw_* tools to discover, inspect, and resolve dependency closure for The Interdependency skills. Skill definitions remain authoritative in The-Interdependency/skill-lib.'
        });
      case 'ping':
        return rpcResult(message.id, {});
      case 'tools/list': {
        const result = { tools: TOOL_DEFINITIONS.map(tool => ({ ...tool })) };
        return modern ? modernResult(message.id, result, { cacheable: true }) : rpcResult(message.id, result);
      }
      case 'tools/call':
        return handleToolCall(message, modern);
      default:
        return rpcError(message.id, -32601, 'Method not found', { method: message.method });
    }
  }

  return { handle, registry };
}
