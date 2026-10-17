import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createInterdependencyMcpServer } from '../server/mcp-server.mjs';
import {
  MCP_PROTOCOL_VERSION, SKILL_EXECUTION_TOOL,
  normalizeMcpEndpoint, discoverMcpTools, invokeMcpTool
} from '../src/assets/js/mcp-client.js';

// === CHECKS ===
// id: browser_mcp_real_roundtrip
//   proves: webmcp_remote_tool_invocation_is_explicit_and_evidence_bearing
//   call: self::mcp_roundtrip
//   mutates: loopback_listener_only
//   cleanup: close_listener
//
// id: browser_mcp_does_not_assume_execution
//   proves: webmcp_remote_tool_invocation_is_explicit_and_evidence_bearing
//   call: self::executor_discovery_and_result
//   mutates: none
// === END CHECKS ===

const fixture = {
  version: 1,
  source: { repository: 'The-Interdependency/skill-lib', commit: '0123456789abcdef0123456789abcdef01234567', path: 'skills.json', sha256: 'fixture' },
  fallback: false, hmmm: [],
  skills: [
    { name: 'msdmd', path: 'msdmd/SKILL.md', kind: 'metadata-block', depends_on: [], description: 'Metadata conventions.' },
    { name: 'repo-audit-repair', path: 'repo-audit-repair/SKILL.md', kind: 'procedural', depends_on: [], description: 'Audit and repair.' }
  ]
};

test('endpoint validation requires HTTPS or loopback and forbids URL credentials', () => {
  assert.equal(normalizeMcpEndpoint('https://example.org/mcp'), 'https://example.org/mcp');
  assert.equal(normalizeMcpEndpoint('http://127.0.0.1:3000/mcp'), 'http://127.0.0.1:3000/mcp');
  for (const url of ['http://example.org/mcp', 'https://user:secret@example.org/mcp',
    'https://example.org/mcp?token=secret', 'javascript:alert(1)', 'file:///etc/passwd']) {
    assert.throws(() => normalizeMcpEndpoint(url));
  }
});

test('live MCP client calls the existing server and reads both procedural and metadata skills', async () => {
  const server = createInterdependencyMcpServer(fixture);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const endpoint = `http://127.0.0.1:${server.address().port}/mcp`;
  try {
    const tools = await discoverMcpTools(endpoint);
    assert.equal(tools.length, 5);
    assert.ok(tools.every(tool => tool.annotations.readOnlyHint === true));
    assert.ok(!tools.some(tool => tool.name === SKILL_EXECUTION_TOOL));
    const result = await invokeMcpTool(endpoint, 'tiw_list_skills', {});
    assert.equal(result.isError, false);
    assert.deepEqual(result.structuredContent.map(skill => skill.name), ['msdmd', 'repo-audit-repair']);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('tool invocation uses advertised identity, a direct request, and no ambient browser credentials', async () => {
  const seen = [];
  const fakeFetch = async (url, init) => {
    seen.push({ url, init });
    const body = JSON.parse(init.body);
    return new Response(JSON.stringify({
      jsonrpc: '2.0', id: body.id,
      result: { isError: false, structuredContent: { accepted: true }, content: [] }
    }), { headers: { 'content-type': 'application/json' } });
  };
  const result = await invokeMcpTool('https://trusted.example/mcp', 'tiw_execute_skill',
    { human_request: 'run the selected skill' },
    { token: 'test-secret', fetchImpl: fakeFetch });
  assert.equal(result.structuredContent.accepted, true);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, 'https://trusted.example/mcp');
  assert.equal(seen[0].init.headers.authorization, 'Bearer test-secret');
  assert.equal(seen[0].init.headers['mcp-protocol-version'], MCP_PROTOCOL_VERSION);
  assert.equal(seen[0].init.headers['mcp-method'], 'tools/call');
  assert.equal(seen[0].init.headers['mcp-name'], 'tiw_execute_skill');
  assert.equal(seen[0].init.credentials, 'omit');
  assert.equal(seen[0].init.redirect, 'error');
  assert.equal(JSON.parse(seen[0].init.body).params.arguments.human_request, 'run the selected skill');
});

test('falsified tool response, SSE, bad identity and duplicate tools fail explicitly', async () => {
  const response = (body, type = 'application/json') => async (_url, init) => new Response(
    typeof body === 'function' ? JSON.stringify(body(JSON.parse(init.body))) : body,
    { headers: { 'content-type': type } }
  );
  await assert.rejects(
    discoverMcpTools('https://trusted.example/mcp', {
      fetchImpl: response(message => ({ jsonrpc: '2.0', id: message.id, result: { tools: [{ name: 'x' }, { name: 'x' }] } }))
    }), /duplicate/
  );
  await assert.rejects(
    discoverMcpTools('https://trusted.example/mcp', {
      fetchImpl: response('data: stream', 'text/event-stream')
    }), /did not return JSON/
  );
  await assert.rejects(
    invokeMcpTool('https://trusted.example/mcp', 'test', {}, {
      fetchImpl: response(() => ({ jsonrpc: '2.0', id: 'wrong', result: {} }))
    }), /identity mismatch/
  );
  await assert.rejects(
    invokeMcpTool('https://trusted.example/mcp', 'test', [], { fetchImpl: () => { throw new Error('should not be called'); } }),
    /JSON object/
  );
});

test('remote tool errors remain errors, not proof of an enacted skill', async () => {
  const fakeFetch = async (_url, init) => new Response(JSON.stringify({
    jsonrpc: '2.0', id: JSON.parse(init.body).id,
    result: { isError: true, content: [{ type: 'text', text: 'runner unavailable' }] }
  }), { headers: { 'content-type': 'application/json' } });
  const result = await invokeMcpTool('https://trusted.example/mcp', 'tiw_execute_skill', {}, { fetchImpl: fakeFetch });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /runner unavailable/);
});
