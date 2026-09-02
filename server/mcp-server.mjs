import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readFallback } from '../scripts/fetch-skill-registry.mjs';
import {
  createMcpProtocol,
  MODERN_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS
} from './mcp-protocol.mjs';
import {
  createHandoffStore,
  DEFAULT_HANDOFF_TTL_MS,
  validHandoffToken
} from './handoff-store.mjs';

// === MODULE_BUILD ===
// id: interdependency_remote_mcp_http_server
//   module_name: remote_mcp_server
//   module_kind: service
//   summary: Public Streamable HTTP MCP endpoint over the website-owned public skill registry, with an opaque-session channel for short-lived human handoffs.
//   owner: Erin Spencer
//   public_surface: POST /mcp, GET /mcp?session=<opaque> SSE, POST|DELETE /handoff/<opaque>, GET /health
//   internal_surface: createInterdependencyMcpServer, loadRegistryProjection
//   auth_boundary: registry is public; handoff read uses an opaque session bearer; handoff publish/delete additionally requires a distinct write key and allowed website origin
//   storage_boundary: human handoffs are volatile process memory only with bounded TTL/capacity
//   network_boundary: external
//   user_data_boundary: bounded human-entered request text may transit the handoff endpoint and session MCP tool
//   admin_only: false
//   tests: tests/mcp-server.test.mjs
//   rollout: Render web service using `node server/mcp-server.mjs`
//   rollback: disable the Render service; browser-native WebMCP remains live independently
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: interdependency_remote_mcp_http_boundary
//   summary: exposes public read-only skill tools and one ephemeral human handoff only to the opaque MCP session selected by the human
//   auth_boundary: session id is read capability only; separate write key + explicit website origin is required to publish/delete handoff data
//   storage_boundary: volatile in-process map, 30-minute default TTL, bounded record count, no disk/database
//   network_boundary: external
//   user_data_boundary: human request is never indexed or listed; only a holder of the opaque session can read it through MCP
//   admin_only: false
//   pii: human-entered text is unclassified and treated as untrusted
//   secrets: write key is accepted only on the handoff mutation endpoint and never returned to MCP clients
//   side_effects: handoff publish/delete changes only ephemeral handoff state and session tool availability; no repository mutation
//   owner: website-runtime
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: remote_mcp_streamable_http_session_notifications
//   given: a client connects to GET /mcp?session=<opaque>
//   then: an SSE notification stream stays open; human handoff publish/delete emits `notifications/tools/list_changed`; base GET /mcp without a session remains 405
//   class: interoperability
//
// id: remote_mcp_handoff_write_is_separate_from_read
//   given: a browser publishes or deletes /handoff/<session>
//   then: the request must come from an explicitly allowed website origin and carry the distinct write key; a remote agent possessing only the MCP session URL cannot mutate the handoff
//   class: security
//
// id: remote_mcp_origin_validation
//   given: a request supplies an Origin header
//   then: MCP/health requests accept only configured MCP origins; handoff mutation requests additionally require a present origin in the narrower handoff-origin set
//   class: security
//
// id: remote_mcp_registry_source_is_verified_projection
//   given: the service starts
//   then: it loads the generated commit-pinned registry projection or the verified last-known-good fallback and never invents skill records
//   class: evidence
// === END CONTRACTS ===
// Usage: `PORT=3000 node server/mcp-server.mjs`; public clients connect to `/mcp`. Human/agent sessions use `/mcp?session=<opaque>`, with the website privately holding a different write key for `/handoff/<opaque>`.

const PUBLIC_REGISTRY_PATH = 'src/assets/data/skill-registry.json';
const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 1_000_000;
const SSE_HEARTBEAT_MS = 15_000;

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://interdependentway.org',
  'https://www.interdependentway.org',
  'https://chatgpt.com',
  'https://chat.openai.com'
]);

const DEFAULT_HANDOFF_ALLOWED_ORIGINS = new Set([
  'https://interdependentway.org',
  'https://www.interdependentway.org'
]);

function rpcError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message, ...(data === undefined ? {} : { data }) }
  };
}

function sendJson(response, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    ...headers
  });
  response.end(body);
}

function sendEmpty(response, status, headers = {}) {
  response.writeHead(status, headers);
  response.end();
}

function originsFromEnvironment(variable, fallback) {
  const configured = String(process.env[variable] || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return configured.length ? new Set(configured) : fallback;
}

function allowedOriginsFromEnvironment() {
  return originsFromEnvironment('MCP_ALLOWED_ORIGINS', DEFAULT_ALLOWED_ORIGINS);
}

function handoffAllowedOriginsFromEnvironment() {
  return originsFromEnvironment('MCP_HANDOFF_ALLOWED_ORIGINS', DEFAULT_HANDOFF_ALLOWED_ORIGINS);
}

function isOriginAllowed(request, allowedOrigins) {
  const origin = request.headers.origin;
  return !origin || allowedOrigins.has(origin);
}

function isExplicitOriginAllowed(request, allowedOrigins) {
  const origin = request.headers.origin;
  return Boolean(origin && allowedOrigins.has(origin));
}

function corsHeaders(request, allowedOrigins) {
  const origin = request.headers.origin;
  return origin && allowedOrigins.has(origin)
    ? { 'access-control-allow-origin': origin, vary: 'Origin' }
    : {};
}

async function readJsonBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('request body too large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) {
    const error = new Error('empty request body');
    error.statusCode = 400;
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch {
    const error = new Error('invalid JSON');
    error.statusCode = 400;
    error.parseError = true;
    throw error;
  }
}

function protocolVersionFor(request, message) {
  return request.headers['mcp-protocol-version']
    || message?.params?._meta?.['io.modelcontextprotocol/protocolVersion']
    || null;
}

function validateRoutingHeaders(request, message) {
  const methodHeader = request.headers['mcp-method'];
  if (methodHeader && methodHeader !== message.method) {
    return `Mcp-Method header ${methodHeader} does not match body method ${message.method}`;
  }
  const nameHeader = request.headers['mcp-name'];
  if (nameHeader && message.method === 'tools/call' && nameHeader !== message.params?.name) {
    return `Mcp-Name header ${nameHeader} does not match body tool ${message.params?.name}`;
  }
  return null;
}

function handoffSessionFromUrl(url) {
  const value = url.searchParams.get('session');
  if (value === null || value === '') return null;
  return validHandoffToken(value) ? value : false;
}

function handoffSessionFromPath(pathname) {
  if (!pathname.startsWith('/handoff/')) return null;
  const raw = pathname.slice('/handoff/'.length);
  if (!raw || raw.includes('/')) return false;
  try {
    const value = decodeURIComponent(raw);
    return validHandoffToken(value) ? value : false;
  } catch {
    return false;
  }
}

export async function loadRegistryProjection() {
  try {
    return JSON.parse(await readFile(PUBLIC_REGISTRY_PATH, 'utf8'));
  } catch {
    const fallback = await readFallback();
    return {
      ...fallback,
      fallback: true,
      hmmm: ['remote MCP service started from the verified last-known-good registry snapshot']
    };
  }
}

export function createInterdependencyMcpServer(registryData, {
  allowedOrigins = allowedOriginsFromEnvironment(),
  handoffAllowedOrigins = handoffAllowedOriginsFromEnvironment(),
  handoffStore = createHandoffStore()
} = {}) {
  const protocol = createMcpProtocol(registryData, { getHandoff: session => handoffStore.get(session) });
  const streams = new Map();

  const removeStream = (session, response) => {
    const set = streams.get(session);
    if (!set) return;
    set.delete(response);
    if (set.size === 0) streams.delete(session);
  };

  const broadcastToolListChanged = session => {
    const set = streams.get(session);
    if (!set?.size) return;
    const payload = `data: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' })}\n\n`;
    for (const response of [...set]) {
      try {
        response.write(payload);
      } catch {
        removeStream(session, response);
      }
    }
  };

  const openNotificationStream = (request, response, session) => {
    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
      ...corsHeaders(request, allowedOrigins)
    });
    response.write(': The Interdependency MCP handoff session connected\n\n');

    let set = streams.get(session);
    if (!set) {
      set = new Set();
      streams.set(session, set);
    }
    set.add(response);

    const heartbeat = setInterval(() => {
      if (!response.writableEnded) response.write(': keepalive\n\n');
    }, SSE_HEARTBEAT_MS);
    heartbeat.unref?.();

    const cleanup = () => {
      clearInterval(heartbeat);
      removeStream(session, response);
    };
    request.once('close', cleanup);
    response.once('close', cleanup);
  };

  return createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (request.method === 'GET' && url.pathname === '/health') {
      if (!isOriginAllowed(request, allowedOrigins)) {
        return sendJson(response, 403, rpcError(null, -32000, 'Forbidden origin'));
      }
      return sendJson(response, 200, {
        ok: true,
        service: 'the-interdependency-mcp',
        endpoint: '/mcp',
        session_endpoint: '/mcp?session=<opaque>',
        handoff_ttl_seconds: Math.floor(handoffStore.ttlMs / 1000),
        active_handoffs: handoffStore.size(),
        skill_count: protocol.registry.getRegistryStatus().skill_count
      }, corsHeaders(request, allowedOrigins));
    }

    const handoffPathSession = handoffSessionFromPath(url.pathname);
    if (handoffPathSession !== null) {
      if (handoffPathSession === false) {
        return sendJson(response, 400, rpcError(null, -32602, 'Invalid handoff session'));
      }
      if (!isExplicitOriginAllowed(request, handoffAllowedOrigins)) {
        return sendJson(response, 403, rpcError(null, -32000, 'Forbidden handoff origin'));
      }

      if (request.method === 'OPTIONS') {
        return sendEmpty(response, 204, {
          ...corsHeaders(request, handoffAllowedOrigins),
          'access-control-allow-methods': 'POST, DELETE, OPTIONS',
          'access-control-allow-headers': 'content-type, x-handoff-key',
          'access-control-max-age': '600'
        });
      }

      if (request.method !== 'POST' && request.method !== 'DELETE') {
        return sendEmpty(response, 405, { allow: 'POST, DELETE, OPTIONS' });
      }

      const writeKey = String(request.headers['x-handoff-key'] || '');
      if (!validHandoffToken(writeKey)) {
        return sendJson(response, 403, rpcError(null, -32000, 'Invalid handoff write key'), corsHeaders(request, handoffAllowedOrigins));
      }

      if (request.method === 'DELETE') {
        try {
          const removed = handoffStore.remove(handoffPathSession, writeKey);
          if (removed) broadcastToolListChanged(handoffPathSession);
          return sendJson(response, 200, { ok: true, removed }, corsHeaders(request, handoffAllowedOrigins));
        } catch (error) {
          const status = error?.code === 'HANDOFF_WRITE_KEY_REJECTED' ? 403 : 400;
          return sendJson(response, status, rpcError(null, -32000, error.message), corsHeaders(request, handoffAllowedOrigins));
        }
      }

      let handoff;
      try {
        handoff = await readJsonBody(request);
      } catch (error) {
        return sendJson(
          response,
          error.statusCode || 400,
          rpcError(null, error.parseError ? -32700 : -32600, error.message),
          corsHeaders(request, handoffAllowedOrigins)
        );
      }

      try {
        const receipt = handoffStore.put(handoffPathSession, writeKey, handoff);
        broadcastToolListChanged(handoffPathSession);
        return sendJson(response, 201, {
          ok: true,
          session: handoffPathSession,
          version: receipt.version,
          expires_at: new Date(receipt.expiresAt).toISOString(),
          mcp_path: `/mcp?session=${encodeURIComponent(handoffPathSession)}`
        }, corsHeaders(request, handoffAllowedOrigins));
      } catch (error) {
        const status = error?.code === 'HANDOFF_WRITE_KEY_REJECTED' ? 403 : 400;
        return sendJson(response, status, rpcError(null, -32602, error.message), corsHeaders(request, handoffAllowedOrigins));
      }
    }

    if (url.pathname !== '/mcp') {
      return sendJson(response, 404, rpcError(null, -32601, 'Not Found'));
    }

    if (!isOriginAllowed(request, allowedOrigins)) {
      return sendJson(response, 403, rpcError(null, -32000, 'Forbidden origin'));
    }

    const handoffSession = handoffSessionFromUrl(url);
    if (handoffSession === false) {
      return sendJson(response, 400, rpcError(null, -32602, 'Invalid handoff session'), corsHeaders(request, allowedOrigins));
    }

    if (request.method === 'GET') {
      if (!handoffSession) return sendEmpty(response, 405, { allow: 'POST, OPTIONS' });
      openNotificationStream(request, response, handoffSession);
      return;
    }

    if (request.method === 'OPTIONS') {
      return sendEmpty(response, 204, {
        ...corsHeaders(request, allowedOrigins),
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-method, mcp-name',
        'access-control-max-age': '600'
      });
    }

    if (request.method !== 'POST') {
      return sendEmpty(response, 405, { allow: 'GET, POST, OPTIONS' });
    }

    let message;
    try {
      message = await readJsonBody(request);
    } catch (error) {
      return sendJson(
        response,
        error.statusCode || 400,
        rpcError(null, error.parseError ? -32700 : -32600, error.message),
        corsHeaders(request, allowedOrigins)
      );
    }

    const routingError = validateRoutingHeaders(request, message);
    if (routingError) {
      return sendJson(response, 400, rpcError(message?.id, -32602, 'Invalid routing headers', { reason: routingError }), corsHeaders(request, allowedOrigins));
    }

    const protocolVersion = protocolVersionFor(request, message);
    const supported = [MODERN_PROTOCOL_VERSION, ...SUPPORTED_PROTOCOL_VERSIONS];
    if (protocolVersion && !supported.includes(protocolVersion)) {
      return sendJson(response, 400, rpcError(message?.id, -32602, 'Unsupported protocol version', {
        supported,
        requested: protocolVersion
      }), corsHeaders(request, allowedOrigins));
    }

    const result = protocol.handle(message, { protocolVersion, handoffSession });
    if (result?.notification) return sendEmpty(response, 202, corsHeaders(request, allowedOrigins));

    return sendJson(response, 200, result, corsHeaders(request, allowedOrigins));
  });
}

async function main() {
  const registryData = await loadRegistryProjection();
  const server = createInterdependencyMcpServer(registryData);
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const host = process.env.HOST || '0.0.0.0';
  server.listen(port, host, () => {
    console.log(`The Interdependency MCP listening on http://${host}:${port}/mcp`);
    console.log(`Ephemeral human handoff TTL: ${DEFAULT_HANDOFF_TTL_MS / 60000} minutes`);
  });
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
