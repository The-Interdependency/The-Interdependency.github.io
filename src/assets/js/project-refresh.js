const ENDPOINT = 'https://the-interdependency-mcp-live.onrender.com/api/repository-refresh';

function escapeText(value) {
  const span = document.createElement('span');
  span.textContent = String(value ?? '');
  return span.innerHTML;
}

function renderDocumentation(documentation) {
  if (!documentation) return '<section class="hmmm"><h2>hmmm</h2><p>Live documentation projection was unavailable.</p></section>';
  const readme = documentation.readme
    ? '<section class="project-readme prose"><p class="eyebrow">README · live exact-head projection</p>' + documentation.readme.html + '<p><a href="' + escapeText(documentation.readme.sourceUrl) + '" rel="noopener noreferrer">Open exact README source</a></p></section>'
    : '<section class="hmmm"><h2>README</h2><p>No README is rendered in this section. See the repository documents and availability notes below.</p></section>';
  const documents = (documentation.documents || []).map(document =>
    '<details class="project-document"><summary>' + escapeText(document.path) + '</summary><div class="prose">' + document.html + '</div><p><a href="' + escapeText(document.sourceUrl) + '" rel="noopener noreferrer">Open exact source</a></p></details>'
  ).join('');
  const hmmm = (documentation.hmmm || []).map(item => '<li>' + escapeText(item) + '</li>').join('');
  return readme
    + (documents ? '<section aria-labelledby="project-documents-live-title"><h2 id="project-documents-live-title">Repository documents</h2>' + documents + '</section>' : '')
    + (hmmm ? '<section class="hmmm"><h2>hmmm</h2><ul>' + hmmm + '</ul></section>' : '');
}

async function refreshRepository(button, repository, options, status) {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ repository, ...options }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Repository service returned ' + response.status);
    const payload = await response.json();
    if (!/^[0-9a-f]{40}$/i.test(payload?.headSha)) throw new Error('Missing repository commit');
    return payload;
  } catch {
    if (status) status.textContent = 'Reading the public repository from GitHub…';
    const { refreshFromGitHub } = await import('/assets/project-refresh/github.js');
    const data = button.dataset;
    const published = data.publishedHead ? {
      name: repository, headSha: data.publishedHead, sha256: data.publishedSha256,
      counts: JSON.parse(data.publishedCounts)
    } : null;
    return refreshFromGitHub(repository, options, published);
  }
}

for (const button of document.querySelectorAll('[data-msdmd-refresh]')) {
  button.addEventListener('click', async () => {
    const repository = button.dataset.repository;
    const scope = button.closest('[data-repository-refresh-scope]');
    const status = scope?.querySelector('[data-msdmd-refresh-status]')
      || document.querySelector('[data-msdmd-refresh-status]');
    const docs = scope?.querySelector('[data-project-docs-content]')
      || document.querySelector('[data-project-docs-content]');
    button.disabled = true;
    if (status) status.textContent = 'Refreshing current repository HEAD…';
    try {
      const options = { includeDocumentation: Boolean(docs), includeMsdmd: true };
      const payload = await refreshRepository(button, repository, options, status);
      const msdmd = payload.msdmd;
      if (status) {
        const head = String(payload.headSha || 'hmmm').slice(0, 9);
        const counts = msdmd?.status === 'ok' && msdmd.counts;
        const totals = counts ? [
          [counts.nativeFacts, 'native fact'], [counts.declarations, 'declaration'],
          [counts.edges, 'edge'], [counts.gaps, 'gap']
        ].filter(([count]) => count != null)
          .map(([count, label]) => count + ' ' + label + (count === 1 ? '' : 's')) : [];
        status.textContent = ['MSDMD ' + (msdmd?.status || 'unavailable'), ...totals, 'HEAD ' + head].join(' · ');
      }
      if (docs) {
        docs.innerHTML = renderDocumentation(payload.documentation);
        // Keep overflowed code keyboard-scrollable after replacing the static view.
        for (const pre of docs.querySelectorAll('pre')) pre.setAttribute('tabindex', '0');
        const head = scope?.querySelector('[data-project-doc-head]');
        const branch = scope?.querySelector('[data-project-doc-branch]');
        const count = scope?.querySelector('[data-project-doc-count]');
        const mode = scope?.querySelector('[data-project-doc-mode]');
        if (head) head.textContent = payload.headSha || 'hmmm';
        if (branch) branch.textContent = payload.defaultBranch || 'hmmm';
        if (count) count.textContent = payload.documentation?.projectedDocumentCount ?? 'hmmm';
        if (mode) mode.textContent = 'live exact-head observation';
      }
      button.textContent = docs ? 'Refresh MSDMD + docs' : 'Refresh MSDMD';
    } catch (error) {
      if (status) status.textContent = 'hmmm · live refresh unavailable; the current page content remains displayed.';
    } finally {
      button.disabled = false;
    }
  });
}
