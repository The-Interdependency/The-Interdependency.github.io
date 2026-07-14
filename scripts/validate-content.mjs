import { readFile } from 'node:fs/promises';
const canon=JSON.parse(await readFile('src/_data/generated/canon.json','utf8')); const repos=JSON.parse(await readFile('src/_data/generated/repos.json','utf8'));
if(!canon.source.contentSha256 || !canon.units.length) throw new Error('canon missing hash or units');
if(repos.publicRepoCount !== repos.generatedRouteCount) throw new Error('repo route mismatch');
console.log(`validated ${canon.units.length} canon units and ${repos.publicRepoCount} repos`);
