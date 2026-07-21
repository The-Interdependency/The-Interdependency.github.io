import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';

// === MODULE_BUILD ===
// id: generated_site_test_server
//   module_name: serve-static
//   module_kind: service
//   summary: Serves the generated site locally for browser and accessibility release checks.
//   owner: Erin Spencer
//   public_surface: http://127.0.0.1:4173 during Playwright runs
//   internal_surface: safePath and static response handler
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: internal
//   user_data_boundary: none
//   admin_only: false
//   tests: tests/site.spec.mjs, tests/accessibility.spec.mjs
//   rollout: started automatically by playwright.config.mjs
//   rollback: remove with Playwright webServer configuration and browser checks
// === END MODULE_BUILD ===
// Usage: run `node scripts/serve-static.mjs` after `npm run build`, or let Playwright start it.
// Limits: loopback-only test server; not a production server and intentionally has no directory listing.

// === BOUNDARIES ===
// id: generated_site_test_server_boundary
//   summary: Reads generated files and exposes them only on a loopback HTTP test server.
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: internal
//   user_data_boundary: none
//   admin_only: false
//   pii: none
//   secrets: none
//   side_effects: loopback listener
//   owner: Erin Spencer
// === END BOUNDARIES ===

const root = resolve(process.cwd(), '_site');
const port = Number(process.env.PORT || 4173);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8'
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const candidate = resolve(root, decoded.replace(/^([/\\])+/, ''));
  const fromRoot = relative(root, candidate);
  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) throw new Error('path traversal refused');
  return candidate;
}

const server = createServer(async (request, response) => {
  try {
    const requestPath = (request.url || '/').split('?')[0];
    let path = safePath(requestPath);
    if (requestPath.endsWith('/') || !extname(path)) path = join(path, 'index.html');
    const body = await readFile(path);
    response.writeHead(200, {
      'content-type': types[extname(path)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`serving _site at http://127.0.0.1:${port}`));
