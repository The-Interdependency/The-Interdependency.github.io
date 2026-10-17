// === MODULE_BUILD ===
// id: browser_mcp_client
//   purpose: Discover and invoke advertised Streamable HTTP MCP tools from an explicitly selected trusted endpoint.
//   entrypoint: imported by /assets/js/webmcp.js
//   tests: tests/mcp-client.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: browser_mcp_client_boundary
//   network: direct browser POST to the human-selected HTTPS MCP endpoint (or loopback development endpoint)
//   storage: none; optional bearer credential stays in the DOM until page exit or endpoint change
//   effects: tools/call can mutate; never call automatically and require explicit invocation from the UI
//   response: only JSON MCP replies; SSE and session-required transports fail visibly
// === END BOUNDARIES ===
// Usage: discoverMcpTools(url, { token }); invokeMcpTool(url, name, argumentsObject, { token }).
// Never treat registry skill descriptions as executable tool definitions.

export const SKILL_EXECUTION_TOOL = 'tiw_execute_skill';
export const MCP_PROTOCOL_VERSION = '2026-07-28';
const MAX_RESPONSE_CHARS = 262144;
const MAX_ARGUMENT_CHARS = 65536;
let nextId = 1;

export function normalizeMcpEndpoint(value) {
  let url;
  try { url = new URL(String(value || '').trim()); }
  catch { throw new Error('MCP endpoint must be an absolute URL'); }

  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!(url.protocol === 'https:' || (loopback && url.protocol === 'http:'))) {
    throw new Error('MCP endpoint requires HTTPS (HTTP permitted only for loopback)');
  }
  if (url.username || url.password || url.hash || url.search) {
    throw new Error('MCP endpoint must not contain credentials, a query, or a fragment');
  }
  return url.href;
}

async function mcpRequest(endpoint, method, params, { token = '', fetchImpl = fetch, signal } = {}) {
  if (method !== 'tools/list' && method !== 'tools/call') throw new Error('Unsupported MCP method');
  if (token && (typeof token !== 'string' || /[\r\n]/.test(token))) throw new Error('Invalid bearer token');
  const url = normalizeMcpEndpoint(endpoint);
  const id = nextId++;
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    'mcp-protocol-version': MCP_PROTOCOL_VERSION,
    'mcp-method': method
  };
  if (method === 'tools/call') headers['mcp-name'] = params.name;
  if (token) headers.authorization = `Bearer ${token}`;
  const body = JSON.stringify({
    jsonrpc: '2.0', id, method,
    params: { ...params, _meta: { 'io.modelcontextprotocol/protocolVersion': MCP_PROTOCOL_VERSION } }
  });
  if (body.length > MAX_ARGUMENT_CHARS) throw new Error('MCP arguments exceed the request limit');

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST', headers, body,
      cache: 'no-store', credentials: 'omit', redirect: 'error', signal
    });
  } catch {
    throw new Error('MCP request failed: check endpoint availability, HTTPS, CORS, and network access');
  }

  if (!response.ok) throw new Error(`MCP HTTP ${response.status} ${response.statusText || ''}`.trim());
  const type = response.headers.get('content-type') || '';
  if (!/^application\/(?:json|[^;]+\+json)(?:\s*;|$)/i.test(type)) {
    throw new Error('MCP endpoint did not return JSON (SSE/session transports require a separate adapter)');
  }
  const size = Number(response.headers.get('content-length') || 0);
  if (size > MAX_RESPONSE_CHARS) throw new Error('MCP response exceeds the display limit');
  const raw = await response.text();
  if (raw.length > MAX_RESPONSE_CHARS) throw new Error('MCP response exceeds the display limit');

  let message;
  try { message = JSON.parse(raw); }
  catch { throw new Error('MCP endpoint returned malformed JSON'); }
  if (message?.jsonrpc !== '2.0' || message.id !== id) throw new Error('MCP response identity mismatch');
  if (message.error) throw new Error(`MCP error ${message.error.code}: ${message.error.message || 'Unknown error'}`);
  if (!message.result || typeof message.result !== 'object') throw new Error('MCP result missing');
  return message.result;
}

export async function discoverMcpTools(endpoint, options = {}) {
  const result = await mcpRequest(endpoint, 'tools/list', {}, options);
  if (!Array.isArray(result.tools)) throw new Error('MCP tools/list returned no tool catalogue');
  const names = new Set();
  for (const tool of result.tools) {
    if (!tool || typeof tool.name !== 'string' || !tool.name.trim() || names.has(tool.name)) {
      throw new Error('MCP tools/list contains an invalid or duplicate tool name');
    }
    names.add(tool.name);
  }
  return result.tools;
}

export async function invokeMcpTool(endpoint, name, args = {}, options = {}) {
  if (!name || typeof name !== 'string') throw new Error('A discovered MCP tool must be selected');
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new Error('MCP tool arguments must be a JSON object');
  }
  return mcpRequest(endpoint, 'tools/call', { name, arguments: args }, options);
}
