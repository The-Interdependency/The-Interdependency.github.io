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
    : '<section class="hmmm"><h2>README</h2><p>No root README.md was present at the refreshed head.</p></section>';
  const documents = (documentation.documents || []).map(document =>
    '<details class="project-document"><summary>' + escapeText(document.path) + '</summary><div class="prose">' + document.html + '</div><p><a href="' + escapeText(document.sourceUrl) + '" rel="noopener noreferrer">Open exact source</a></p></details>'
  ).join('');
  const hmmm = (documentation.hmmm || []).map(item => '<li>' + escapeText(item) + '</li>').join('');
  return readme
    + (documents ? '<section aria-labelledby="project-documents-live-title"><h2 id="project-documents-live-title">Repository documents</h2>' + documents + '</section>' : '')
    + (hmmm ? '<section class="hmmm"><h2>hmmm</h2><ul>' + hmmm + '</ul></section>' : '');
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
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ repository })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'refresh failed');
      const msdmd = payload.msdmd;
      if (status) {
        const head = String(payload.headSha || 'hmmm').slice(0, 9);
        status.textContent = msdmd
          ? 'MSDMD ' + msdmd.status + ' · ' + msdmd.counts.declarations + ' declarations · ' + msdmd.counts.gaps + ' gaps · HEAD ' + head
          : 'MSDMD unavailable · HEAD ' + head;
      }
      if (docs) docs.innerHTML = renderDocumentation(payload.documentation);
      button.textContent = 'Refresh MSDMD + docs';
    } catch (error) {
      if (status) status.textContent = 'hmmm · live refresh unavailable; static exact-head projection remains displayed.';
    } finally {
      button.disabled = false;
    }
  });
}
