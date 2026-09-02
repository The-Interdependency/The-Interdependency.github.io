import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import {
  createMcpProtocol,
  HANDOFF_TOOL_DEFINITION,
  MODERN_PROTOCOL_VERSION,
  TOOL_DEFINITIONS
} from '../server/mcp-protocol.mjs';
import { createInterdependencyMcpServer } from '../server/mcp-server.mjs';
import { createHandoffStore } from '../server/handoff-store.mjs';

// === CHECKS ===
// id: check_remote_mcp_exposes_same_five_registry_tools
//   proves: remote_mcp_exposes_same_five_registry_tools
//   call: self::test_protocol_tool_catalog
//   mutates: none
//   cleanup: none
//
// id: check_remote_mcp_session_handoff_appears_only_when_ready
//   proves: remote_mcp_session_handoff_appears_only_when_ready
//   call: self::test_protocol_session_handoff
//   mutates: memory
//   cleanup: discard_fixture
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
// id: check_remote_mcp_streamable_http_session_notifications
//   proves: remote_mcp_streamable_http_session_notifications
//   call: self::test_http_session_notification
//   mutates: network,memory
//   cleanup: close_listener
//
// id: check_remote_mcp_handoff_write_is_separate_from_read
//   proves: remote_mcp_handoff_write_is_separate_from_read
//   call: self::test_handoff_write_boundary
//   mutates: network,memory
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
//
// id: check_handoff_store_is_bounded_and_ephemeral
//   proves: handoff_store_is_bounded_and_ephemeral
//   call: self::test_handoff_store_expiry
//   mutates: memory
//   cleanup: discard_fixture
//
// id: check_handoff_read_token_cannot_write
//   proves: handoff_read_token_cannot_write
//   call: self::test_handoff_write_key_is_distinct
//   mutates: memory
//   cleanup: discard_fixture
// === END CHECKS ===
// Usage: `node --test tests/mcp-server.test.mjs`. The suite uses only local ephemeral listeners and deterministic fixtures; it never calls an external service.

const SESSION = 's'.repeat(48);
const WRITE_KEY = 'w'.repeat(48);
const OTHER_WRITE_KEY = 'x'.repeat(48);

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

function handoffFixture(request = 'Add msdmd declarations to this source tree.') {
  return {
    ready: true,
    sent_at: '2026-09-02T12:00:00.000Z',
    skill: {
      name: 'msdmd',
      kind: 'metadata-block',
      depends_on: [],
      description: 'Module Self-Declared Metadata in Markdown.',
      canonical_path: 'msdmd/SKILL.md',
      canonical_url: 'https://example.test/msdmd'
    },
    required_skills: [{ name: 'msdmd' }],
    registry: { skill_count: 2, source: fixture.source },
    human_request: request,
    boundaries: {
      selection_is_instruction_not_permission: true,
      repository_write_authority: 'not granted by this handoff'
    }
  };
}

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

test('remote MCP exposes exactly the five read-only registry tools without a ready session handoff', test_protocol_tool_catalog);

function test_protocol_session_handoff() {
  let current = null;
  const { handle } = createMcpProtocol(fixture, { getHandoff: session => session === SESSION ? current : null });

  let response = handle(
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    { handoffSession: SESSION }
  );
  assert.equal(response.result.tools.length, 5);

  current = handoffFixture();
  response = handle(
    { jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} },
    { handoffSession: SESSION }
  );
  assert.equal(response.result.tools.length, 6);
  assert.equal(response.result.tools.at(-1).name, HANDOFF_TOOL_DEFINITION.name);

  const call = handle({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'tiw_human_handoff', arguments: {} }
  }, { handoffSession: SESSION });
  assert.equal(call.result.isError, false);
  assert.equal(call.result.structuredContent.human_request, 'Add msdmd declarations to this source tree.');

  current = null;
  response = handle(
    { jsonrpc: '2.0', id: 5, method: 'tools/list', params: {} },
    { handoffSession: SESSION }
  );
  assert.equal(response.result.tools.length, 5);
}

test('remote MCP session exposes tiw_human_handoff only while a human handoff is ready', test_protocol_session_handoff);

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
    id: 6,
    method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } }
  }, { handoffSession: SESSION });
  assert.equal(legacy.result.protocolVersion, '2025-11-25');
  assert.equal(legacy.result.serverInfo.name, 'the-interdependency-mcp');
  assert.equal(legacy.result.capabilities.tools.listChanged, true);
}

test('remote MCP supports modern discovery and legacy initialization with session list-change capability', test_protocol_dual_era);

function test_protocol_read_only_call() {
  const { handle } = createMcpProtocol(fixture);
  const response = handle({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name: 'tiw_resolve_skill_closure', arguments: { name: 'meta-module-build' } }
  });
  assert.equal(response.result.isError, false);
  assert.deepEqual(response.result.structuredContent.map(skill => skill.name), ['msdmd', 'meta-module-build']);
  assert.equal(fixture.skills.length, 2);
}

test('remote MCP calls are read-only and preserve dependency-first closure', test_protocol_read_only_call);

function test_handoff_store_expiry() {
  let now = 1_000;
  const store = createHandoffStore({ ttlMs: 100, maxEntries: 2, now: () => now });
  store.put(SESSION, WRITE_KEY, handoffFixture());
  assert.equal(store.get(SESSION).ready, true);
  assert.equal(store.size(), 1);
  now = 1_101;
  assert.equal(store.get(SESSION), null);
  assert.equal(store.size(), 0);
}

test('handoff store expires records and exposes no persistent state', test_handoff_store_expiry);

function test_handoff_write_key_is_distinct() {
  const store = createHandoffStore();
  store.put(SESSION, WRITE_KEY, handoffFixture());
  assert.throws(() => store.put(SESSION, OTHER_WRITE_KEY, handoffFixture('replace')), /write key rejected/);
  assert.throws(() => store.remove(SESSION, OTHER_WRITE_KEY), /write key rejected/);
  assert.equal(store.get(SESSION).human_request, 'Add msdmd declarations to this source tree.');
}

test('remote read session cannot replace or delete a handoff without the distinct write key', test_handoff_write_key_is_distinct);

async function withServer(fn) {
  const handoffStore = createHandoffStore({ ttlMs: 60_000 });
  const server = createInterdependencyMcpServer(fixture, {
    allowedOrigins: new Set(['https://interdependentway.org']),
    handoffAllowedOrigins: new Set(['https://interdependentway.org']),
    handoffStore
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  try {
    return await fn(`http://127.0.0.1:${address.port}`, handoffStore);
  } finally {
    server.closeAllConnections?.();
    server.close();
    await once(server, 'close');
  }
}

async function mcpPost(base, message, { session = null, origin = null } = {}) {
  const suffix = session ? `?session=${encodeURIComponent(session)}` : '';
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    'mcp-protocol-version': MODERN_PROTOCOL_VERSION
  };
  if (origin) headers.origin = origin;
  return fetch(`${base}/mcp${suffix}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(message)
  });
}

async function publishHandoff(base, {
  session = SESSION,
  writeKey = WRITE_KEY,
  origin = 'https://interdependentway.org',
  handoff = handoffFixture()
} = {}) {
  return fetch(`${base}/handoff/${encodeURIComponent(session)}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
      'x-handoff-key': writeKey
    },
    body: JSON.stringify(handoff)
  });
}

async function test_http_session_notification() {
  await withServer(async base => {
    const baseGet = await fetch(`${base}/mcp`);
    assert.equal(baseGet.status, 405);

    const controller = new AbortController();
    const streamResponse = await fetch(`${base}/mcp?session=${SESSION}`, {
      headers: { accept: 'text/event-stream' },
      signal: controller.signal
    });
    assert.equal(streamResponse.status, 200);
    assert.match(streamResponse.headers.get('content-type') || '', /text\/event-stream/);

    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let received = '';
    const initial = await reader.read();
    received += decoder.decode(initial.value || new Uint8Array(), { stream: true });
    assert.match(received, /connected/);

    const publish = await publishHandoff(base);
    assert.equal(publish.status, 201);

    const deadline = Date.now() + 2_000;
    while (!received.includes('notifications/tools/list_changed') && Date.now() < deadline) {
      const next = await Promise.race([
        reader.read(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SSE notification timeout')), 1_000))
      ]);
      if (next.done) break;
      received += decoder.decode(next.value || new Uint8Array(), { stream: true });
    }
    assert.match(received, /notifications\/tools\/list_changed/);

    const listResponse = await mcpPost(base, { jsonrpc: '2.0', id: 8, method: 'tools/list', params: {} }, { session: SESSION });
    assert.equal(listResponse.status, 200);
    const listBody = await listResponse.json();
    assert.equal(listBody.result.tools.length, 6);
    assert.equal(listBody.result.tools.at(-1).name, 'tiw_human_handoff');

    const callResponse = await mcpPost(base, {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: { name: 'tiw_human_handoff', arguments: {} }
    }, { session: SESSION });
    const callBody = await callResponse.json();
    assert.equal(callBody.result.structuredContent.human_request, 'Add msdmd declarations to this source tree.');
    assert.equal(callBody.result.structuredContent.remote_session.session, SESSION);

    controller.abort();
    await reader.cancel().catch(() => undefined);
  });
}

test('session SSE notifies a connected remote MCP client when human Send exposes the handoff tool', test_http_session_notification);

async function test_handoff_write_boundary() {
  await withServer(async base => {
    const noOrigin = await fetch(`${base}/handoff/${SESSION}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-handoff-key': WRITE_KEY },
      body: JSON.stringify(handoffFixture())
    });
    assert.equal(noOrigin.status, 403);

    const badOrigin = await publishHandoff(base, { origin: 'https://evil.example' });
    assert.equal(badOrigin.status, 403);

    const published = await publishHandoff(base);
    assert.equal(published.status, 201);
    const receipt = await published.json();
    assert.equal(receipt.ok, true);
    assert.equal(receipt.session, SESSION);
    assert.match(receipt.mcp_path, /session=/);

    const wrongKey = await publishHandoff(base, { writeKey: OTHER_WRITE_KEY, handoff: handoffFixture('replace') });
    assert.equal(wrongKey.status, 403);

    const remove = await fetch(`${base}/handoff/${SESSION}`, {
      method: 'DELETE',
      headers: { origin: 'https://interdependentway.org', 'x-handoff-key': WRITE_KEY }
    });
    assert.equal(remove.status, 200);
    const removed = await remove.json();
    assert.equal(removed.removed, true);

    const listResponse = await mcpPost(base, { jsonrpc: '2.0', id: 10, method: 'tools/list', params: {} }, { session: SESSION });
    const listBody = await listResponse.json();
    assert.equal(listBody.result.tools.length, 5);
  });
}

test('handoff publish/delete requires website origin plus distinct write key and never grants repository mutation', test_handoff_write_boundary);

async function test_http_origin_validation() {
  await withServer(async base => {
    const response = await mcpPost(
      base,
      { jsonrpc: '2.0', id: 11, method: 'tools/list', params: {} },
      { origin: 'https://evil.example' }
    );
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
    assert.equal(body.session_endpoint, '/mcp?session=<opaque>');
    assert.equal(body.handoff_ttl_seconds, 60);
    assert.equal(body.active_handoffs, 0);
  });
}

test('health route reports the loaded registry projection and bounded handoff runtime', test_health_exposes_fixture_registry_count);
