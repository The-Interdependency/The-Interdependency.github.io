import { readFile, writeFile, mkdir } from 'node:fs/promises';

const canon = JSON.parse(await readFile('src/_data/generated/canon.json', 'utf8'));
const repos = JSON.parse(await readFile('src/_data/generated/repos.json', 'utf8'));
const changes = {
  generatedAt: new Date().toISOString(),
  canon: {
    sourceCommit: canon.source.commit,
    sourceHash: canon.source.contentSha256,
    unitCount: canon.units.length,
    changedUnitsRequiringReview: canon.units.filter((unit) => unit.reviewStatus === 'hmmm').map((unit) => unit.id)
  },
  repositories: {
    publicRepoCount: repos.publicRepoCount,
    generatedRouteCount: repos.generatedRouteCount,
    fallback: repos.fallback
  },
  hmmm: [
    'No previous canonical manifest comparison is implemented yet; all generated Lab interpretations remain review-needed.'
  ]
};
await mkdir('src/_data/generated', { recursive: true });
await writeFile('src/_data/generated/changes.json', `${JSON.stringify(changes, null, 2)}\n`);
console.log(`change report ${changes.canon.unitCount} units`);
