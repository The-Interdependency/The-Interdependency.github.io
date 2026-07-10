import { readFile } from 'node:fs/promises';
const repos=JSON.parse(await readFile('src/_data/generated/repos.json','utf8'));
const slugs=new Set(repos.repositories.map(r=>r.slug)); if(slugs.size!==repos.repositories.length) throw new Error('duplicate repo slug');
console.log(`project routes expected ${slugs.size}`);
