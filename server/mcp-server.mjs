import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readFallback } from '../scripts/fetch-skill-registry.mjs';
import {
  createMcpProtocol,
  MODERN_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS
} from './mcp-protocol.mjs';

// === MODULE_BUILD ===
// id: interdependency_remote_mcp_http_server
//   module_name: remote_mcp_server
//   module_kind: service
//   summary: Public stateless Streamable HTTP MCP endpoint over the website-owned skill registry projection.
//   owner: Erin Spencer
//   public_surface: POST /mcp, GET /health
//   internal_surface: createInterdependencyMcpServer, loadRegistryProjection
//   auth_boundary: none
//   storage_boundary: none
//   network_boundary: external
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/mcp-server.test.mjs
//   rollout: Render web service using `node server/mcp-server.mjs`
//   rollback: disable the Render service; browser-native WebMCP remains live independently
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: interdependency_remote_mcp_http_boundary
//   summary: accepts public MCP requests and exposes only read-only operations over public skill registry data
//   auth_boundary: none
//   storage_boundary: none
//   network_boundary: external
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: none
//   owner: website-runtime
// === END BOUNDARIES ===
// === CONTRACTS ===
// id: remote_mcp_streamable_http_single_endpoint
//   given: a client sends MCP JSON-RPC traffic
//   then: POST /mcp returns JSON MCP responses and GET /mcp returns 405 because this server has no unsolicited SSE stream
//   class: interoperability
//
// id: remote_mcp_origin_validation
//   given: a request supplies an Origin header
//   then: only an explicitly allowed origin is accepted
//   class: security
//
// id: remote_mcp_registry_source_is_verified_projection
//   given: the service starts
//   then: it loads the generated commit-pinned registry projection or the verified last-known-good fallback and never invents skill records
//   class: evidence
// === END CONTRACTS ===
// Usage: `PORT=3000 node server/mcp-server.mjs`; connect an MCP client to `http://127.0.0.1:3000/mcp`. The production deployment is intentionally public and read-only; adding mutation requires a separate authenticated service boundary.

const PUBLIC_REGISTRY_PATH = 'src/assets/data/skill-registry.json';
const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 1_000_000;

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://interdependentway.org',
  'https://www.interdependentway.org',
  'https://chatgpt.com',
  'https://chat.openai.com'
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

function allowedOriginsFromEnvironment() {
  const configured = String(process.env.MCP_ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return configured.length ? new Set(configured) : DEFAULT_ALLOWED_ORIGINS;
}

function isOriginAllowed(request, allowedOrigins) {
  const origin = request.headers.origin;
  return !origin || allowedOrigins.has(origin);
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
  allowedOrigins = allowedOriginsFromEnvironment()
} = {}) {
  const protocol = createMcpProtocol(registryData);

  return createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, {
        ok: true,
        service: 'the-interdependency-mcp',
        endpoint: '/mcp',
        skill_count: protocol.registry.getRegistryStatus().skill_count
      });
    }

    if (url.pathname !== '/mcp') {
      return sendJson(response, 404, rpcError(null, -32601, 'Not Found'));
    }

    if (!isOriginAllowed(request, allowedOrigins)) {
      return sendJson(response, 403, rpcError(null, -32000, 'Forbidden origin'));
    }

    if (request.method === 'GET') {
      return sendEmpty(response, 405, { allow: 'POST, OPTIONS' });
    }

    if (request.method === 'OPTIONS') {
      const origin = request.headers.origin;
      return sendEmpty(response, 204, {
        ...(origin && allowedOrigins.has(origin) ? { 'access-control-allow-origin': origin } : {}),
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-method, mcp-name',
        'access-control-max-age': '600'
      });
    }

    if (request.method !== 'POST') {
      return sendEmpty(response, 405, { allow: 'POST, OPTIONS' });
    }

    let message;
    try {
      message = await readJsonBody(request);
    } catch (error) {
      return sendJson(
        response,
        error.statusCode || 400,
        rpcError(null, error.parseError ? -32700 : -32600, error.message)
      );
    }

    const routingError = validateRoutingHeaders(request, message);
    if (routingError) {
      return sendJson(response, 400, rpcError(message?.id, -32602, 'Invalid routing headers', { reason: routingError }));
    }

    const protocolVersion = protocolVersionFor(request, message);
    const supported = [MODERN_PROTOCOL_VERSION, ...SUPPORTED_PROTOCOL_VERSIONS];
    if (protocolVersion && !supported.includes(protocolVersion)) {
      return sendJson(response, 400, rpcError(message?.id, -32602, 'Unsupported protocol version', {
        supported,
        requested: protocolVersion
      }));
    }

    const result = protocol.handle(message, { protocolVersion });
    if (result?.notification) return sendEmpty(response, 202);

    const origin = request.headers.origin;
    return sendJson(response, 200, result, {
      ...(origin && allowedOrigins.has(origin) ? { 'access-control-allow-origin': origin } : {})
    });
  });
}

async function main() {
  const registryData = await loadRegistryProjection();
  const server = createInterdependencyMcpServer(registryData);
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const host = process.env.HOST || '0.0.0.0';
  server.listen(port, host, () => {
    console.log(`The Interdependency MCP listening on http://${host}:${port}/mcp`);
  });
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
