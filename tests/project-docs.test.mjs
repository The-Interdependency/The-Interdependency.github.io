import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  fetchRepositoryPublicProjection,
  isRepositoryNotPublicError,
  REPOSITORY_NOT_PUBLIC,
  selectDocumentationPaths
} from '../scripts/repository-public-projection.mjs';
import { resolveRepositoryImageReference } from '../scripts/repository-markdown-links.mjs';

test('documentation selection keeps README first, root docs next, docs tree next, and excludes control metadata', () => {
  const selected = selectDocumentationPaths([
    { type: 'blob', path: 'docs/zeta.md' },
    { type: 'blob', path: '.agents/skills/msdmd/SKILL.md' },
    { type: 'blob', path: 'README.md' },
    { type: 'blob', path: 'ARCHITECTURE.md' },
    { type: 'blob', path: 'docs/alpha.md' },
    { type: 'blob', path: '.github/pull_request_template.md' },
    { type: 'blob', path: 'src/code.js' }
  ]);
  assert.equal(selected.readme, 'README.md');
  assert.deepEqual(selected.paths, ['README.md', 'ARCHITECTURE.md', 'docs/alpha.md', 'docs/zeta.md']);
  assert.equal(selected.omittedCount, 0);
});

test('live public projection rejects non-public repository metadata before resolving a commit', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async target => {
    requests.push(String(target));
    return {
      ok: true,
      json: async () => ({ default_branch: 'main', private: true, visibility: 'private' })
    };
  };
  try {
    await assert.rejects(
      fetchRepositoryPublicProjection('private-fixture', { includeDocumentation: false, includeMsdmd: false }),
      error => {
        assert.equal(error.code, REPOSITORY_NOT_PUBLIC);
        assert.equal(isRepositoryNotPublicError(error), true);
        return true;
      }
    );
    assert.equal(requests.length, 1);
    assert.match(requests[0], /\/repos\/The-Interdependency\/private-fixture$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('pinned public projection rechecks current visibility before reading exact-head content', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async target => {
    requests.push(String(target));
    return {
      ok: true,
      json: async () => ({ default_branch: 'main', private: true, visibility: 'private' })
    };
  };
  try {
    await assert.rejects(
      fetchRepositoryPublicProjection('private-fixture', {
        headSha: '0123456789abcdef0123456789abcdef01234567',
        defaultBranch: 'main',
        includeDocumentation: true,
        includeMsdmd: true
      }),
      error => {
        assert.equal(error.code, REPOSITORY_NOT_PUBLIC);
        assert.equal(isRepositoryNotPublicError(error), true);
        return true;
      }
    );
    assert.equal(requests.length, 1);
    assert.match(requests[0], /\/repos\/The-Interdependency\/private-fixture$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('metadata 404 is treated as non-public before any cached exact-head content can be read', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async target => {
    requests.push(String(target));
    return { ok: false, status: 404 };
  };
  try {
    await assert.rejects(
      fetchRepositoryPublicProjection('hidden-fixture', {
        headSha: '0123456789abcdef0123456789abcdef01234567',
        defaultBranch: 'main',
        includeDocumentation: true,
        includeMsdmd: true
      }),
      error => {
        assert.equal(error.code, REPOSITORY_NOT_PUBLIC);
        assert.equal(isRepositoryNotPublicError(error), true);
        return true;
      }
    );
    assert.equal(requests.length, 1);
    assert.match(requests[0], /\/repos\/The-Interdependency\/hidden-fixture$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('project-docs build refuses same-head fallback for a non-public repository failure', async () => {
  const [script, template] = await Promise.all([
    readFile('scripts/fetch-project-docs.mjs', 'utf8'),
    readFile('src/projects/repo.njk', 'utf8')
  ]);
  assert.match(script, /if \(isRepositoryNotPublicError\(error\)\)/);
  assert.match(script, /cached documentation was discarded instead of republished/);
  assert.match(script, /headSha: null/);
  assert.match(script, /unavailable: true/);
  assert.match(template, /repoDocs and repoDocs\.unavailable %\}unavailable/);
});

test('an explicitly missing captured head remains unavailable instead of re-resolving current HEAD', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    throw new Error('network must not be consulted');
  };
  try {
    await assert.rejects(
      fetchRepositoryPublicProjection('ucns', {
        headSha: null,
        defaultBranch: 'main',
        includeDocumentation: false,
        includeMsdmd: false
      }),
      /repository head unavailable/
    );
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('live MSDMD projection rejects a collection declaring another repository identity', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async target => {
    const url = String(target);
    if (/api\.github\.com\/repos\/The-Interdependency\/ucns$/.test(url)) {
      return {
        ok: true,
        json: async () => ({ default_branch: 'main', private: false, visibility: 'public' })
      };
    }
    assert.match(url, /raw\.githubusercontent\.com\/The-Interdependency\/ucns\/0123456789abcdef0123456789abcdef01234567\/ucns_msdmd\.ts$/);
    return {
      ok: true,
      text: async () => JSON.stringify({
        repo: 'The-Interdependency/not-ucns',
        source_commit: '0123456789abcdef0123456789abcdef01234567',
        declarations: [],
        gaps: [],
        edges: []
      })
    };
  };
  try {
    const projection = await fetchRepositoryPublicProjection('ucns', {
      headSha: '0123456789abcdef0123456789abcdef01234567',
      defaultBranch: 'main',
      includeDocumentation: false,
      includeMsdmd: true
    });
    assert.equal(projection.msdmd.status, 'invalid');
    assert.equal(projection.msdmd.declaredRepoMatchesRepository, false);
    assert.match(projection.msdmd.hmmm.join(' '), /repository identity does not match/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('project page exposes static exact-head documents and a per-repository live MSDMD refresh', async () => {
  const [source, sitrep] = await Promise.all([
    readFile('src/projects/repo.njk', 'utf8'),
    readFile('src/sitrep/index.njk', 'utf8')
  ]);
  assert.match(source, /generated\.projectDocs\.byRepository\[repo\.name\]/);
  assert.match(source, /data-msdmd-refresh/);
  assert.match(source, /data-project-docs-content/);
  assert.match(source, /projectDocMarkdown/);
  assert.doesNotMatch(source, /\{\{\s*document\s*\|\s*projectDocMarkdown/);
  assert.match(source, /The static page indexes exact-head documents/);
  assert.match(sitrep, /data-repository-refresh-scope/);
  assert.match(sitrep, /data-msdmd-refresh data-repository="{{ project\.name }}"/);
});

test('refresh data pipeline builds project documentation after repository heads are captured', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.match(pkg.scripts['refresh:data'], /refresh:github.*refresh:project-docs.*refresh:msdmd/);
  assert.equal(pkg.scripts['refresh:project-docs'], 'node scripts/fetch-project-docs.mjs');
});


test('project refresh targets the live Render auto-deploy service', async () => {
  const source = await readFile('src/assets/js/project-refresh.js', 'utf8');
  assert.match(source, /https:\/\/the-interdependency-mcp-live\.onrender\.com\/api\/repository-refresh/);
  assert.doesNotMatch(source, /https:\/\/the-interdependency-mcp\.onrender\.com\/api\/repository-refresh/);
});


test('Render deploy hook is explicit, secret-backed, and limited to main pushes', async () => {
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /name: Trigger Render MCP deploy/);
  assert.match(workflow, /github\.event_name == 'push'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /secrets\.RENDER_DEPLOY_HOOK_URL/);
  assert.match(workflow, /RENDER_DEPLOY_HOOK_URL is unset; Render MCP deployment remains hmmm/);
});


test('repository image references resolve to exact-head raw bytes', () => {
  const source = 'https://github.com/The-Interdependency/ucns/blob/0123456789abcdef0123456789abcdef01234567/docs/README.md';
  assert.equal(
    resolveRepositoryImageReference('../images/diagram.png', source),
    'https://raw.githubusercontent.com/The-Interdependency/ucns/0123456789abcdef0123456789abcdef01234567/images/diagram.png'
  );
  assert.equal(
    resolveRepositoryImageReference('/logo.svg', source),
    'https://raw.githubusercontent.com/The-Interdependency/ucns/0123456789abcdef0123456789abcdef01234567/logo.svg'
  );
});

test('truncated GitHub trees remain explicit incomplete evidence and API reads carry timeouts', async () => {
  const originalFetch = globalThis.fetch;
  const signals = [];
  globalThis.fetch = async (target, options = {}) => {
    signals.push(options.signal);
    const url = String(target);
    if (/api\.github\.com\/repos\/The-Interdependency\/ucns$/.test(url)) {
      return { ok: true, json: async () => ({ default_branch: 'main', private: false, visibility: 'public' }) };
    }
    if (/\/git\/trees\//.test(url)) {
      return { ok: true, json: async () => ({ truncated: true, tree: [] }) };
    }
    throw new Error('unexpected request: ' + url);
  };
  try {
    const projection = await fetchRepositoryPublicProjection('ucns', {
      headSha: '0123456789abcdef0123456789abcdef01234567',
      defaultBranch: 'main',
      includeDocumentation: true,
      includeMsdmd: false
    });
    assert.equal(projection.documentation.treeTruncated, true);
    assert.equal(projection.documentation.discoveryComplete, false);
    assert.match(projection.documentation.hmmm.join(' '), /tree response was truncated/);
    assert.match(projection.documentation.hmmm.join(' '), /README presence is unresolved/);
    assert.ok(signals.every(Boolean));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('transient exact-head document read failure propagates so build fallback can preserve same-head evidence', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async target => {
    const url = String(target);
    const parsed = new URL(url);
    if (parsed.origin === 'https://api.github.com' && parsed.pathname === '/repos/The-Interdependency/ucns') {
      return { ok: true, json: async () => ({ default_branch: 'main', private: false, visibility: 'public' }) };
    }
    if (parsed.origin === 'https://api.github.com' && parsed.pathname.includes('/git/trees/')) {
      return { ok: true, json: async () => ({ truncated: false, tree: [{ type: 'blob', path: 'README.md' }] }) };
    }
    if (parsed.origin === 'https://raw.githubusercontent.com') return { ok: false, status: 503 };
    throw new Error('unexpected request: ' + url);
  };
  try {
    await assert.rejects(
      fetchRepositoryPublicProjection('ucns', {
        headSha: '0123456789abcdef0123456789abcdef01234567',
        defaultBranch: 'main',
        includeDocumentation: true,
        includeMsdmd: false
      }),
      /raw GitHub request failed: 503/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('oversize document bytes are omitted at the reader boundary instead of materialized into the projection', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async target => {
    const url = String(target);
    const parsed = new URL(url);
    if (parsed.origin === 'https://api.github.com' && parsed.pathname === '/repos/The-Interdependency/ucns') {
      return { ok: true, json: async () => ({ default_branch: 'main', private: false, visibility: 'public' }) };
    }
    if (parsed.origin === 'https://api.github.com' && parsed.pathname.includes('/git/trees/')) {
      return { ok: true, json: async () => ({ truncated: false, tree: [{ type: 'blob', path: 'README.md' }] }) };
    }
    if (parsed.origin === 'https://raw.githubusercontent.com') {
      return { ok: true, text: async () => 'x'.repeat(128 * 1024 + 1) };
    }
    throw new Error('unexpected request: ' + url);
  };
  try {
    const projection = await fetchRepositoryPublicProjection('ucns', {
      headSha: '0123456789abcdef0123456789abcdef01234567',
      defaultBranch: 'main',
      includeDocumentation: true,
      includeMsdmd: false
    });
    assert.equal(projection.documentation.projectedDocumentCount, 0);
    assert.match(projection.documentation.hmmm.join(' '), /exceeds the per-document public projection limit/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('live refresh scopes SITREP to MSDMD and updates project provenance when documents are requested', async () => {
  const [client, template, eleventy, server] = await Promise.all([
    readFile('src/assets/js/project-refresh.js', 'utf8'),
    readFile('src/projects/repo.njk', 'utf8'),
    readFile('.eleventy.js', 'utf8'),
    readFile('server/mcp-server.mjs', 'utf8')
  ]);
  assert.match(client, /includeDocumentation: Boolean\(docs\), includeMsdmd: true/);
  assert.match(client, /data-project-doc-head/);
  assert.match(client, /live exact-head observation/);
  assert.match(template, /data-project-doc-head/);
  assert.match(template, /data-project-doc-count/);
  assert.match(template, /data-project-doc-mode/);
  assert.match(eleventy, /resolveRepositoryImageReference\(source, env\?\.sourceUrl\)/);
  assert.match(server, /repositoryRefresher\(body\?\.repository, projectionOptions\)/);
});
