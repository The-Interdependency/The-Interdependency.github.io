import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
const repos = JSON.parse(await readFile('src/_data/generated/repos.json', 'utf8'));
const gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const manifest = {
  builtAt: new Date().toISOString(),
  siteCommit: gitCommit,
  node: process.version,
  canon: canon.source,
  counts: {
    canonUnits: canon.units.length,
    canonSections: canon.sections.length,
    publicRepos: repos.publicRepoCount,
    projectRoutes: repos.generatedRouteCount
  },
  fallback: {
    repos: repos.fallback,
    canon: canon.source.commit === 'local-snapshot'
  },
  hmmm: [
    'Canon fetch is wired to wayseer00/main on main; fallback is not allowed for canonical text.'
  ]
};
await mkdir('src/_data/generated', { recursive: true });
await writeFile('src/_data/generated/buildManifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest ${manifest.siteCommit}`);
