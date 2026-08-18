// === MODULE_BUILD ===
// id: sitrep_interaction_renderer
//   purpose: Add pan/zoom repository dependency visualization and make SITREP metric tiles open their exact report sections.
//   entrypoint: base layout deferred module; activates only when SITREP controls exist
//   tests: tests/sitrep-format.spec.mjs, tests/site-contract.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: sitrep_interaction_boundary
//   network: none; consumes only server-rendered projection data
//   storage: none
//   failure: static repository cards, full-report disclosures, and relation list remain complete
// === END BOUNDARIES ===
// Usage: no direct invocation. On /sitrep/, drag the map to pan, use +/−/Reset to zoom, and select a metric tile to open that exact report section.

const SVG_NS = 'http://www.w3.org/2000/svg';
const MIN_SCALE = 0.55;
const MAX_SCALE = 2.8;

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function labelFor(repository) {
  const text = String(repository || 'hmmm');
  const parts = text.split('/');
  return parts.at(-1) || text;
}

function shortLabel(value, limit = 20) {
  const text = String(value || 'hmmm');
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function positionsFor(nodes) {
  const rows = [...nodes].sort((a, b) => a.label.localeCompare(b.label));
  const centerX = 600;
  const centerY = 400;
  const outerCount = rows.length > 12 ? Math.ceil(rows.length * 0.62) : rows.length;
  return new Map(rows.map((node, index) => {
    const outer = index < outerCount;
    const ringRows = outer ? rows.slice(0, outerCount) : rows.slice(outerCount);
    const ringIndex = outer ? index : index - outerCount;
    const radius = outer ? 300 : 185;
    const angle = (-Math.PI / 2) + (2 * Math.PI * ringIndex / Math.max(1, ringRows.length));
    return [node.repository, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    }];
  }));
}

function collectMapData(root) {
  const nodeMap = new Map();
  for (const element of root.querySelectorAll('[data-sitrep-map-node]')) {
    const repository = element.dataset.repository;
    if (!repository) continue;
    nodeMap.set(repository, {
      repository,
      label: element.dataset.label || labelFor(repository),
      slug: element.dataset.slug || null,
      projected: true
    });
  }

  const edges = [...root.querySelectorAll('[data-sitrep-map-edge]')].map(element => ({
    from: element.dataset.from,
    to: element.dataset.to,
    relation: element.dataset.relation || 'depends on'
  })).filter(edge => edge.from && edge.to);

  for (const edge of edges) {
    for (const repository of [edge.from, edge.to]) {
      if (!nodeMap.has(repository)) {
        nodeMap.set(repository, {
          repository,
          label: labelFor(repository),
          slug: null,
          projected: false
        });
      }
    }
  }
  return { nodes: [...nodeMap.values()], edges };
}

function renderDependencyMap(root) {
  const viewport = root.querySelector('[data-sitrep-map-viewport]');
  const detail = root.querySelector('[data-sitrep-map-detail]');
  if (!viewport || !detail) return;

  const { nodes, edges } = collectMapData(root);
  const placeholder = viewport.querySelector('[data-sitrep-map-placeholder]');
  if (!nodes.length) {
    if (placeholder) placeholder.textContent = 'No projected repository nodes are available in this snapshot.';
    return;
  }

  const positions = positionsFor(nodes);
  const svg = svgElement('svg', {
    viewBox: '0 0 1200 800',
    role: 'img',
    'aria-label': 'Repository dependency graph. Nodes are repositories and directed lines are projected dependencies.'
  });
  const defs = svgElement('defs');
  const marker = svgElement('marker', {
    id: 'sitrep-arrow',
    viewBox: '0 0 10 10',
    refX: 9,
    refY: 5,
    markerWidth: 6,
    markerHeight: 6,
    orient: 'auto-start-reverse'
  });
  marker.append(svgElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'sitrep-map-arrow' }));
  defs.append(marker);
  svg.append(defs);

  const world = svgElement('g', { 'data-sitrep-map-world': '' });
  const edgeLayer = svgElement('g', { class: 'sitrep-map-edges' });
  for (const edge of edges) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    const line = svgElement('line', {
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      class: 'sitrep-map-edge',
      'marker-end': 'url(#sitrep-arrow)'
    });
    const title = svgElement('title');
    title.textContent = `${edge.from} → ${edge.to}: ${edge.relation}`;
    line.append(title);
    line.addEventListener('pointerenter', () => {
      detail.textContent = `${edge.from} → ${edge.to} · ${edge.relation}`;
    });
    edgeLayer.append(line);
  }
  world.append(edgeLayer);

  const nodeLayer = svgElement('g', { class: 'sitrep-map-nodes' });
  for (const node of nodes) {
    const point = positions.get(node.repository);
    if (!point) continue;
    const attributes = {
      class: `sitrep-map-node${node.projected ? ' is-participant' : ' is-dependency'}`,
      'data-repository': node.repository,
      'aria-label': node.repository
    };
    const group = node.slug
      ? svgElement('a', { ...attributes, href: `#${node.slug}` })
      : svgElement('g', { ...attributes, tabindex: 0, role: 'group' });
    const radius = node.projected ? 24 : 18;
    group.append(svgElement('circle', { cx: point.x, cy: point.y, r: radius }));
    const text = svgElement('text', {
      x: point.x,
      y: point.y + radius + 22,
      'text-anchor': 'middle'
    });
    text.textContent = shortLabel(node.label);
    group.append(text);
    const update = () => {
      detail.textContent = node.projected
        ? `${node.repository} · participating SITREP repository`
        : `${node.repository} · dependency endpoint outside the five participating SITREP reports`;
    };
    group.addEventListener('pointerenter', update);
    group.addEventListener('focus', update);
    nodeLayer.append(group);
  }
  world.append(nodeLayer);
  svg.append(world);
  if (placeholder) placeholder.remove();
  viewport.prepend(svg);

  let scale = 1;
  let panX = 0;
  let panY = 0;
  let drag = null;

  function applyTransform() {
    world.setAttribute('transform', `translate(${panX} ${panY}) scale(${scale})`);
    root.dataset.scale = scale.toFixed(2);
  }

  function zoom(factor) {
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    applyTransform();
    detail.textContent = `Map zoom ${Math.round(scale * 100)}%.`;
  }

  function reset() {
    scale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
    detail.textContent = `${nodes.length} repositories · ${edges.length} projected relation${edges.length === 1 ? '' : 's'}.`;
  }

  root.querySelector('[data-sitrep-map-zoom-in]')?.addEventListener('click', () => zoom(1.22));
  root.querySelector('[data-sitrep-map-zoom-out]')?.addEventListener('click', () => zoom(1 / 1.22));
  root.querySelector('[data-sitrep-map-reset]')?.addEventListener('click', reset);

  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest?.('.sitrep-map-node')) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-panning');
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const rect = viewport.getBoundingClientRect();
    const factorX = 1200 / Math.max(1, rect.width);
    const factorY = 800 / Math.max(1, rect.height);
    panX = drag.panX + (event.clientX - drag.x) * factorX;
    panY = drag.panY + (event.clientY - drag.y) * factorY;
    applyTransform();
  });
  const endDrag = event => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    viewport.classList.remove('is-panning');
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  viewport.addEventListener('keydown', event => {
    const panStep = 35 / scale;
    if (event.key === '+' || event.key === '=') zoom(1.22);
    else if (event.key === '-' || event.key === '_') zoom(1 / 1.22);
    else if (event.key === '0') reset();
    else if (event.key === 'ArrowLeft') panX += panStep;
    else if (event.key === 'ArrowRight') panX -= panStep;
    else if (event.key === 'ArrowUp') panY += panStep;
    else if (event.key === 'ArrowDown') panY -= panStep;
    else return;
    event.preventDefault();
    applyTransform();
  });

  reset();
}

function activateMetricDisclosures() {
  for (const button of document.querySelectorAll('[data-sitrep-section]')) {
    const card = button.closest('.sitrep-card');
    const details = card?.querySelector('.sitrep-details');
    const sectionName = button.dataset.sitrepSection;
    const target = card?.querySelector(`[data-sitrep-detail="${sectionName}"]`);
    if (!card || !details || !target) continue;

    button.addEventListener('click', () => {
      details.open = true;
      for (const peer of card.querySelectorAll('[data-sitrep-section]')) {
        peer.setAttribute('aria-expanded', peer === button ? 'true' : 'false');
        peer.classList.toggle('is-active', peer === button);
      }
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        target.focus({ preventScroll: true });
      });
    });

    details.addEventListener('toggle', () => {
      if (!details.open) {
        for (const peer of card.querySelectorAll('[data-sitrep-section]')) {
          peer.setAttribute('aria-expanded', 'false');
          peer.classList.remove('is-active');
        }
      }
    });
  }
}

for (const root of document.querySelectorAll('[data-sitrep-map]')) renderDependencyMap(root);
activateMetricDisclosures();
