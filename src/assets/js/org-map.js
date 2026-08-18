// === MODULE_BUILD ===
// id: organization_msdmd_map_renderer
//   purpose: Render the generated active-repository msdmd relation graph as an accessible SVG enhancement while preserving the complete static fallback below it.
//   entrypoint: base layout deferred script; activates only when [data-org-map] exists
//   tests: tests/org-msdmd.test.mjs, tests/generated-site.test.mjs
// === END MODULE_BUILD ===
// === BOUNDARIES ===
// id: organization_msdmd_map_renderer_boundary
//   network: fetches only the same-origin generated /assets/data/org-msdmd.json artifact
//   storage: none
//   failure: leaves the complete server-rendered active-repository, relation, unresolved-edge, and provenance lists intact
// === END BOUNDARIES ===
// Usage: no direct invocation is needed. The /projects/map/ page supplies data-source and an accessible static fallback; this script adds only the visual graph. Archived repositories are filtered again here as a display-layer guard even though the producer normally excludes them.

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function shortName(value, limit = 18) {
  const text = String(value || 'hmmm');
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function positionsFor(repositories) {
  const rows = [...repositories].sort((a, b) => a.name.localeCompare(b.name));
  const centerX = 500;
  const centerY = 350;
  const split = rows.length > 18 ? Math.ceil(rows.length * 0.62) : rows.length;
  return new Map(rows.map((repo, index) => {
    const outer = index < split;
    const ringRows = outer ? rows.slice(0, split) : rows.slice(split);
    const ringIndex = outer ? index : index - split;
    const radius = outer ? 285 : 175;
    const angle = (-Math.PI / 2) + (2 * Math.PI * ringIndex / Math.max(1, ringRows.length));
    return [repo.name, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    }];
  }));
}

function updateDetail(detail, repo) {
  detail.replaceChildren();
  const strong = document.createElement('strong');
  strong.textContent = repo.name;
  const span = document.createElement('span');
  const collection = repo.collection?.status || 'hmmm';
  const counts = repo.counts || {};
  span.textContent = `${collection} collection · ${counts.declarations || 0} declarations · ${counts.edges || 0} edges · ${counts.gaps || 0} gaps`;
  detail.append(strong, span);
}

export function renderOrganizationMap(root, data) {
  const frame = root.querySelector('[data-org-map-frame]');
  const detail = root.querySelector('[data-org-map-detail]');
  if (!frame || !detail || !Array.isArray(data?.repositories)) return;

  const repositories = data.repositories.filter(repo => !repo.archived);
  const positions = positionsFor(repositories);
  const byName = new Map(repositories.map(repo => [repo.name, repo]));
  const svg = svgElement('svg', {
    viewBox: '0 0 1000 700',
    role: 'img',
    'aria-label': 'Repository relationship map generated from msdmd declarations'
  });

  const edgeLayer = svgElement('g', { 'aria-hidden': 'true' });
  for (const edge of data.repositoryEdges || []) {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) continue;
    const line = svgElement('line', {
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      class: 'org-map-edge',
      'data-kind': (edge.kinds || []).join(' '),
      'stroke-width': Math.min(6, 1 + Math.log2((edge.count || 1) + 1))
    });
    edgeLayer.append(line);
  }
  svg.append(edgeLayer);

  const nodeLayer = svgElement('g');
  for (const repo of repositories) {
    const point = positions.get(repo.name);
    if (!point) continue;
    const link = svgElement('a', {
      href: `/projects/${repo.slug}/`,
      class: 'org-map-node',
      'data-status': repo.collection?.status || 'hmmm',
      'aria-label': `${repo.name}: ${repo.collection?.status || 'hmmm'} msdmd collection`
    });
    const radius = Math.min(21, 8 + Math.sqrt(repo.counts?.declarations || 0));
    link.append(svgElement('circle', { cx: point.x, cy: point.y, r: radius }));
    const label = svgElement('text', {
      x: point.x,
      y: point.y + radius + 19,
      'text-anchor': 'middle'
    });
    label.textContent = shortName(repo.name);
    link.append(label);
    link.addEventListener('mouseenter', () => updateDetail(detail, repo));
    link.addEventListener('focus', () => updateDetail(detail, repo));
    nodeLayer.append(link);
  }
  svg.append(nodeLayer);

  frame.prepend(svg);
  const first = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))[0];
  if (first) updateDetail(detail, first);
}

async function activate() {
  const root = document.querySelector('[data-org-map]');
  if (!root) return;
  const source = root.getAttribute('data-source');
  if (!source) return;
  try {
    const response = await fetch(source, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderOrganizationMap(root, await response.json());
  } catch (error) {
    const detail = root.querySelector('[data-org-map-detail]');
    if (detail) {
      detail.textContent = `Visual enhancement unavailable; the complete static map remains below. ${String(error?.message || error)}`;
    }
  }
}

activate();
