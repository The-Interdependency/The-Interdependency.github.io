import { test, expect } from '@playwright/test';

// === CHECKS ===
// id: browser_skill_catalogue_is_complete
//   proves: webmcp_full_catalogue_matches_source_registry
//   call: self::static_catalogue
//   mutates: none
//
// id: browser_mcp_invocation_requires_discovery_and_human_consent
//   proves: webmcp_remote_tool_invocation_is_explicit_and_evidence_bearing
//   call: self::mock_mcp_calls
//   mutates: browser_mock_only
// === END CHECKS ===

test('every registry skill is readable and searchable without choosing a repository', async ({ page }) => {
  const response = await page.request.get('/assets/data/skill-registry.json');
  const registry = await response.json();
  await page.goto('/webmcp/');
  await expect(page.locator('[data-human-skill]')).toHaveCount(registry.skills.length);
  const specialist = page.locator('[data-human-skill][data-skill-name="vm-mcp"]');
  await expect(specialist).toBeVisible();
  await expect(specialist.locator('[data-select-skill]')).toBeDisabled();
  await page.locator('[data-human-skill-filter]').fill('vm-mcp');
  await expect(specialist).toBeVisible();
  await page.locator('[data-human-repository-target]').selectOption({ index: 1 });
  await expect(specialist.locator('[data-select-skill]')).toBeEnabled();
});

test('public MCP server calls an advertised tool but cannot enact a skill', async ({ page }) => {
  const posted = [];
  await page.route('https://the-interdependency-mcp.onrender.com/mcp', async route => {
    const request = route.request();
    const headers = {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-method, mcp-name',
      'access-control-allow-methods': 'POST, OPTIONS'
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const message = request.postDataJSON();
    posted.push(message);
    const result = message.method === 'tools/list'
      ? { tools: [{ name: 'tiw_registry_status', title: 'Registry status', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true } }] }
      : { isError: false, content: [{ type: 'text', text: 'verified registry' }], structuredContent: { skill_count: 45 } };
    await route.fulfill({ status: 200, headers, body: JSON.stringify({ jsonrpc: '2.0', id: message.id, result }) });
  });
  await page.goto('/webmcp/');
  await expect(page.locator('[data-mcp-enact]')).toBeDisabled();
  await page.locator('[data-mcp-discover]').click();
  await expect(page.locator('[data-mcp-tool-status]')).toContainText('Discovered 1 MCP tools');
  await expect(page.locator('[data-mcp-enact]')).toBeDisabled();
  await page.locator('[data-mcp-tool]').selectOption('tiw_registry_status');
  await page.locator('[data-mcp-call]').click();
  await expect(page.locator('[data-mcp-tool-result]')).toContainText('skill_count');
  expect(posted.map(message => message.method)).toEqual(['tools/list', 'tools/call']);
  expect(posted[1].params.name).toBe('tiw_registry_status');
});

test('a separate advertised executor receives the exact selected skill only after confirmation', async ({ page }) => {
  const requests = [];
  await page.route('https://executor.example/mcp', async route => {
    const request = route.request();
    const headers = {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, accept, authorization, mcp-protocol-version, mcp-method, mcp-name',
      'access-control-allow-methods': 'POST, OPTIONS'
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const message = request.postDataJSON();
    requests.push(message);
    const result = message.method === 'tools/list'
      ? { tools: [{ name: 'tiw_execute_skill', annotations: { readOnlyHint: false }, inputSchema: { type: 'object' } }] }
      : { isError: false, content: [{ type: 'text', text: 'accepted' }], structuredContent: { status: 'accepted', receipt: 'fixture' } };
    await route.fulfill({ status: 200, headers, body: JSON.stringify({ jsonrpc: '2.0', id: message.id, result }) });
  });
  await page.goto('/webmcp/');
  await page.locator('[data-human-repository-target]').selectOption({ index: 1 });
  await page.locator('[data-human-skill][data-skill-name="msdmd"] [data-select-skill]').click();
  await page.locator('[data-human-handoff-intent]').fill('Audit metadata in the selected repository');
  await page.locator('[data-mcp-endpoint]').fill('https://executor.example/mcp');
  await page.locator('[data-mcp-bearer]').fill('fixture-token');
  await page.locator('[data-mcp-discover]').click();
  await expect(page.locator('[data-mcp-enact]')).toBeEnabled();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-mcp-enact]').click();
  await expect(page.locator('[data-mcp-tool-result]')).toContainText('accepted');
  expect(requests).toHaveLength(2);
  expect(requests[1].params.name).toBe('tiw_execute_skill');
  const envelope = requests[1].params.arguments;
  expect(envelope.target_repository.observed_head_sha).toMatch(/^[a-f0-9]{40}$/);
  expect(envelope.skill.name).toBe('msdmd');
  expect(envelope.required_skills.map(s => s.name)).toEqual(['msdmd']);
  expect(envelope.human_request).toBe('Audit metadata in the selected repository');
  await expect(page.locator('[data-mcp-execution-status]')).toContainText('Verify its receipt');
});
