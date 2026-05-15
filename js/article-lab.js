(function () {
  const data = window.articleLabData || [];
  if (!data.length) return;

  const $ = (id) => document.getElementById(id);
  const tabs = $('article-tabs');
  const title = $('article-title');
  const canon = $('canon-text');
  const footnotes = $('footnotes');
  const plain = $('plain-reading');
  const req = $('requirement');
  const misunderstanding = $('misunderstanding');
  const diagram = $('diagram');
  const metrics = $('metrics');
  const supportive = $('supportive');
  const inversionExample = $('inversion-example');
  const steelman = $('steelman');
  const dissent = $('dissent');
  const invertButton = $('invert-button');
  const inversionView = $('inversion-view');

  function clear(node) { if (node) node.innerHTML = ''; }
  function text(node, value) { if (node) node.textContent = value || ''; }

  function pairCard(pair, className) {
    const el = document.createElement('div');
    el.className = className || 'node';
    const strong = document.createElement('strong');
    strong.textContent = pair[0] || '';
    const span = document.createElement('span');
    span.textContent = pair[1] || '';
    el.append(strong, span);
    return el;
  }

  function render(article) {
    text(title, article.title);
    text(canon, article.canon);
    clear(footnotes);
    (article.footnotes || []).forEach((note) => {
      const li = document.createElement('li');
      li.textContent = note;
      footnotes.appendChild(li);
    });
    text(plain, article.plain);
    text(req, article.requirement);
    text(misunderstanding, article.misunderstanding);

    clear(diagram);
    (article.diagram || []).forEach((pair) => diagram.appendChild(pairCard(pair, 'node')));

    clear(metrics);
    (article.metrics || []).forEach((pair) => metrics.appendChild(pairCard(pair, 'metric')));

    clear(supportive);
    (article.sources || []).forEach((pair) => supportive.appendChild(pairCard(pair, 'source-card')));

    text(inversionExample, article.inversionExample);
    text(steelman, article.steelman);
    clear(dissent);
    (article.dissent || []).forEach((pair) => dissent.appendChild(pairCard(pair, 'source-card')));

    [...tabs.querySelectorAll('button')].forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.articleId === article.id));
    });
    const url = new URL(window.location.href);
    url.searchParams.set('article', article.id);
    window.history.replaceState({}, '', url);
  }

  data.forEach((article, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.articleId = article.id;
    button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
    button.textContent = article.title.replace(/^Article /, '');
    button.addEventListener('click', () => render(article));
    tabs.appendChild(button);
  });

  if (invertButton && inversionView) {
    invertButton.addEventListener('click', () => {
      const hidden = inversionView.hasAttribute('hidden');
      if (hidden) inversionView.removeAttribute('hidden');
      else inversionView.setAttribute('hidden', '');
      invertButton.setAttribute('aria-expanded', String(hidden));
      invertButton.textContent = hidden ? 'Hide inversion research' : 'Show inversion research';
    });
  }

  const requested = new URLSearchParams(window.location.search).get('article');
  render(data.find((article) => article.id === requested) || data[0]);
})();
