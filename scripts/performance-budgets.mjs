// Usage: run `npm run test:performance` after `npm run build`.
// Enforces repository-owned transfer-size ceilings over the generated static artifact.
// These deterministic byte budgets complement, but do not claim, real-user performance data.
// === MODULE_BUILD ===
// id: static_publication_performance_budgets
//   module_name: static-publication-performance-budgets
//   module_kind: verification
//   summary: Prevents unbounded growth in generated HTML, first-party CSS/JS, and the complete Pages artifact.
//   owner: Erin Spencer
//   public_surface: npm run test:performance
//   internal_surface: _site generated files
//   auth_boundary: none
//   storage_boundary: read
//   network_boundary: none
//   user_data_boundary: none
//   admin_only: false
//   tests: npm run test:performance
//   rollout: required by npm run check
//   rollback: revise budgets with measured evidence; do not restore a placeholder
// === END MODULE_BUILD ===
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const siteRoot = path.resolve('_site');
const budgets = Object.freeze({
  totalSiteBytes: 8 * 1024 * 1024,
  totalFirstPartyCssBytes: 96 * 1024,
  totalFirstPartyJsBytes: 128 * 1024,
  largestHtmlBytes: 192 * 1024
});

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const files = await walk(siteRoot);
const records = await Promise.all(files.map(async file => ({
  file,
  relative: path.relative(siteRoot, file).split(path.sep).join('/'),
  bytes: (await stat(file)).size
})));

const sum = predicate => records.filter(predicate).reduce((total, record) => total + record.bytes, 0);
const htmlRecords = records.filter(record => record.relative.endsWith('.html'));
const largestHtml = htmlRecords.reduce((largest, record) => record.bytes > largest.bytes ? record : largest, { relative: 'none', bytes: 0 });
const observed = {
  totalSiteBytes: sum(() => true),
  totalFirstPartyCssBytes: sum(record => record.relative.startsWith('assets/') && record.relative.endsWith('.css')),
  totalFirstPartyJsBytes: sum(record => record.relative.startsWith('assets/') && record.relative.endsWith('.js')),
  largestHtmlBytes: largestHtml.bytes
};

const failures = Object.entries(budgets)
  .filter(([name, limit]) => observed[name] > limit)
  .map(([name, limit]) => `${name}: ${observed[name]} bytes exceeds ${limit} bytes`);

console.log(JSON.stringify({ budgets, observed, largestHtml: largestHtml.relative }, null, 2));
if (failures.length) {
  console.error('static performance budget failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('static performance budgets passed');
}
