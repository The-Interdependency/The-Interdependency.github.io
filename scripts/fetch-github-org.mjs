import { writeFile, readFile, mkdir } from 'node:fs/promises';
const org='The-Interdependency';
async function fetchAll(){
 if(process.env.OFFLINE==='1') throw new Error('offline requested');
 const { execFileSync } = await import('node:child_process');
 let page=1, repos=[]; while(true){
  const args=['-fsSL','-H','Accept: application/vnd.github+json','-H','X-GitHub-Api-Version: 2022-11-28'];
  if(process.env.GITHUB_TOKEN) args.push('-H',`Authorization: Bearer ${process.env.GITHUB_TOKEN}`);
  args.push(`https://api.github.com/orgs/${org}/repos?type=public&per_page=100&page=${page}`);
  const batch=JSON.parse(execFileSync('curl',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  repos.push(...batch); if(batch.length<100) break; page++;
 }
 return repos;
}
let fallback=false, repos=[];
try { repos=await fetchAll(); } catch(e){ fallback=true; try{repos=JSON.parse(await readFile('src/_data/snapshots/repos.last-known-good.json','utf8')).repositories;}catch{repos=[];} }
const mapped=repos.map(r=>({name:r.name,slug:r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),html_url:r.html_url,description:r.description,archived:r.archived,fork:r.fork,default_branch:r.default_branch,topics:r.topics||[],license:r.license?.spdx_id||null,language:r.language,homepage:r.homepage,pushed_at:r.pushed_at,visibility:r.visibility||'public',hmmm:['Editorial project map missing until .interdependency/project.yml is reviewed.']}));
const data={organization:org,snapshotAt:new Date().toISOString(),fallback,publicRepoCount:mapped.length,generatedRouteCount:mapped.length,repositories:mapped};
await mkdir('src/_data/generated',{recursive:true}); await writeFile('src/_data/generated/repos.json',JSON.stringify(data,null,2)); await mkdir('src/_data/snapshots',{recursive:true}); await writeFile('src/_data/snapshots/repos.last-known-good.json',JSON.stringify(data,null,2)); console.log(`repos ${mapped.length}${fallback?' fallback':''}`);
