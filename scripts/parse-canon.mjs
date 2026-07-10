import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import slugify from 'slugify';
const parserVersion='0.1.0';
const raw=await readFile('src/_data/snapshots/canon.last-known-good.md','utf8');
const text=raw.replace(/^---[\s\S]*?---\n/,'');
const contentSha256=createHash('sha256').update(text).digest('hex');
const lines=text.split(/\r?\n/);
const units=[]; const sections=[]; const notes=[]; let current=null; let top='source'; let article=0;
function slug(s){return slugify(s,{lower:true,strict:true}) || 'unit';}
function push(end){ if(current){ current.endLine=end; current.content=current.lines.join('\n').trim(); current.hash=createHash('sha256').update(current.content).digest('hex'); units.push(current); }}
for (let i=0;i<lines.length;i++){
 const m=/^(#{1,6})\s+(.+?)\s*$/.exec(lines[i]);
 if(m){ push(i); const level=m[1].length; const title=m[2].replace(/#+$/,'').trim(); if(level<=2){top=slug(title).replace(/^the-/, ''); sections.push({id:top,title,level,line:i+1}); article=0;} if(/article\s+[ivxlcdm0-9]+/i.test(title)) article++; const id=/article/i.test(title)?`${top}.article-${article||slug(title)}`:slug(title); current={id:`${id}-${i+1}`,title,section:top,level,startLine:i+1,lines:[lines[i]]}; }
 else if(current) current.lines.push(lines[i]);
}
push(lines.length);
if(!units.length){ units.push({id:'source.full-text',title:'The Interdependent Way',section:'source',level:1,startLine:1,endLine:lines.length,content:text,hash:contentSha256}); sections.push({id:'source',title:'Source',level:1,line:1});}
for (const u of units){ const matches=[...u.content.matchAll(/\[(\d+|[a-z])\]/gi)]; for (const match of matches) notes.push({id:`${u.id}.note-${match[1]}`,unit_id:u.id,marker:match[0]}); }
const data={source:{repository:'The-Interdependency/a0',path:'interdependent_way.md',commit:process.env.CANON_COMMIT || 'local-snapshot',blob:null,retrievedAt:new Date().toISOString(),contentSha256,parserVersion},sections,units:units.map(({lines,...u})=>u),notes,edges:units.map(u=>({from:u.id,to:u.section,type:'unit-parent'}))};
await mkdir('src/_data/generated',{recursive:true}); await writeFile('src/_data/generated/canon.json',JSON.stringify(data,null,2));
console.log(`units ${units.length}`);
