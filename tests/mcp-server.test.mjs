import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import {
  createMcpProtocol,
  MODERN_PROTOCOL_VERSION,
  TOOL_DEFINITIONS
} from '../server/mcp-protocol.mjs';
import { createInterdependencyMcpServer } from '../server/mcp-server.mjs';

// === CHECKS ===
// id: check_remote_mcp_exposes_same_five_registry_tools
//   proves: remote_mcp_exposes_same_five_registry_tools
//   call: self::test_protocol_tool_catalog
//   mutates: none
//   cleanup: none
//
// id: check_remote_mcp_supports_modern_and_legacy_eras
//   proves: remote_mcp_supports_modern_and_legacy_eras
//   call: self::test_protocol_dual_era
//   mutates: none
//   cleanup: none
//
// id: check_remote_mcp_tool_calls_do_not_mutate
//   proves: remote_mcp_tool_calls_do_not_mutate
//   call: self::test_protocol_read_only_call
//   mutates: none
//   cleanup: none
//
// id: check_remote_mcp_streamable_http_single_endpoint
//   proves: remote_mcp_streamable_http_single_endpoint
//   call: self::test_http_endpoint
//   mutates: network
//   cleanup: close_listener
//
// id: check_remote_mcp_origin_validation
//   proves: remote_mcp_origin_validation
//   call: self::test_http_origin_validation
//   mutates: network
//   cleanup: close_listener
//
// id: check_remote_mcp_registry_source_is_verified_projection
//   proves: remote_mcp_registry_source_is_verified_projection
//   call: self::test_health_exposes_fixture_registry_count
//   mutates: network
//   cleanup: close_listener
// === END CHECKS ===
// Usage: `node --test tests/mcp-server.test.mjs`. The suite uses only a local ephemeral listener and a deterministic two-skill fixture; it never calls an external service.

const fixture = {
  version: 1,
  source: {
    repository: 'The-Interdependency/skill-lib',
    commit: '0123456789abcdef0123456789abcdef01234567',
    path: 'skills.json',
    sha256: 'fixture'
  },
  fallback: false,
  hmmm: [],
  skills: [
    {
      name: 'msdmd',
      path: 'msdmd/SKILL.md',
      kind: 'metadata-block',
      depends_on: [],
      description: 'Module Self-Declared Metadata in Markdown.'
    },
    {
      name: 'meta-module-build',
      path: 'meta-module-build/SKILL.md',
      kind: 'metadata-block',
      depends_on: ['msdmd'],
      description: 'Metadata-first module scaffolding.'
    }
  ]
};

function test_protocol_tool_catalog() {
  const { handle } = createMcpProtocol(fixture);
  const response = handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
  assert.equal(response.result.tools.length, 5);
  assert.deepEqual(
    response.result.tools.map(tool => tool.name),
    TOOL_DEFINITIONS.map(tool => tool.name)
  );
  assert.ok(response.result.tools.every(tool => tool.annotations.readOnlyHint === true));
}

test('remote MCP exposes exactly the five read-only registry tools', test_protocol_tool_catalog);

function test_protocol_dual_era() {
  const { handle } = createMcpProtocol(fixture);
  const modern = handle({
    jsonrpc: '2.0',
    id: 'discover',
    method: 'server/discover',
    params: { _meta: { 'io.modelcontextprotocol/protocolVersion': MODERN_PROTOCOL_VERSION } }
  }, { protocolVersion: MODERN_PROTOCOL_VERSION });
  assert.ok(modern.result.supportedVersions.includes(MODERN_PROTOCOL_VERSION));
  assert.equal(modern.result.resultType, 'complete');
  assert.equal(modern.result.capabilities.tools.listChanged, false);

  const legacy = handle({
    jsonrpc: '2.0',
    id: 2,
    method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } }
  });
  assert.equal(legacy.result.protocolVersion, '2025-11-25');
  assert.equal(legacy.result.serverInfo.name, 'the-interdependency-mcp');
}

test('remote MCP supports modern discovery and legacy initialization', test_protocol_dual_era);

function test_protocol_read_only_call() {
  const { handle } = createMcpProtocol(fixture);
  const response = handle({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'tiw_resolve_skill_closure', arguments: { name: 'meta-module-build' } }
  });
  assert.equal(response.result.isError, false);
  assert.deepEqual(response.result.structuredContent.map(skill => skill.name), ['msdmd', 'meta-module-build']);
  assert.equal(fixture.skills.length, 2);
}

test('remote MCP calls are read-only and preserve dependency-first closure', test_protocol_read_only_call);

async function withServer(fn) {
  const server = createInterdependencyMcpServer(fixture, {
    allowedOrigins: new Set(['https://interdependentway.org'])
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  try {
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

async function test_http_endpoint() {
  await withServer(async base => {
    const getResponse = await fetch(`${base}/mcp`);
    assert.equal(getResponse.status, 405);

    const postResponse = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json, text/event-stream',
        'mcp-protocol-version': MODERN_PROTOCOL_VERSION,
        'mcp-method': 'tools/list'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/list',
        params: { _meta: { 'io.modelcontextprotocol/protocolVersion': MODERN_PROTOCOL_VERSION } }
      })
    });
    assert.equal(postResponse.status, 200);
    const body = await postResponse.json();
    assert.equal(body.result.resultType, 'complete');
    assert.equal(body.result.tools.length, 5);
  });
}

test('Streamable HTTP uses one POST endpoint and rejects GET streaming', test_http_endpoint);

async function test_http_origin_validation() {
  await withServer(async base => {
    const response = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'tools/list', params: {} })
    });
    assert.equal(response.status, 403);
  });
}

test('Streamable HTTP rejects unapproved browser origins', test_http_origin_validation);

async function test_health_exposes_fixture_registry_count() {
  await withServer(async base => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.skill_count, 2);
    assert.equal(body.endpoint, '/mcp');
  });
}

test('health route reports the loaded registry projection', test_health_exposes_fixture_registry_count);
