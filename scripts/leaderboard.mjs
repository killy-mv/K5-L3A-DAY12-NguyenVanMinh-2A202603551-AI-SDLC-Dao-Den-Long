// Portable local-disk leaderboard. Exports the exact same entries the UI loads.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('data');
export const file=path.resolve(process.env.LEADERBOARD_FILE??path.join(root,'leaderboard.json'));
const validName=/^[A-Za-z0-9_]{3,12}$/;
const iso=(v)=>typeof v==='string'&&!Number.isNaN(Date.parse(v))&&/([+-]\d\d:\d\d|Z)$/.test(v);
export function validateEntry(e){
 if(!e||typeof e!=='object'||!validName.test(e.name))throw new TypeError('Name must be 3–12 ASCII letters, digits or underscore');
 if(!Number.isSafeInteger(e.score)||e.score<0)throw new TypeError('Invalid score');
 if(!Number.isSafeInteger(e.nights_won)||e.nights_won<0||e.nights_won>3)throw new TypeError('Invalid nights_won');
 if(!Number.isSafeInteger(e.seed))throw new TypeError('Invalid seed');
 if(!iso(e.achieved_at))throw new TypeError('Invalid achieved_at timezone-aware ISO 8601');
 return {name:e.name,score:e.score,nights_won:e.nights_won,achieved_at:e.achieved_at,seed:e.seed};
}
export function topTen(entries){
 return entries.map(validateEntry).map((entry,index)=>({entry,index}))
  .sort((a,b)=>b.entry.score-a.entry.score||
   Date.parse(a.entry.achieved_at)-Date.parse(b.entry.achieved_at)||a.index-b.index)
  .slice(0,10).map(x=>x.entry);
}
export function readLeaderboard(){
 try {
  const d=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!Array.isArray(d.entries))throw new TypeError('Bad leaderboard shape');
  return {entries:topTen(d.entries)};
 }catch(e){if(e.code==='ENOENT')return {entries:[]};throw e;}
}
export function addEntry(e){
 const {entries}=readLeaderboard();
 entries.push(validateEntry(e));
 const result={entries:topTen(entries)};
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const temp=file+'.tmp-'+process.pid;
 fs.writeFileSync(temp,JSON.stringify(result,null,2)+'\n','utf8');
 fs.renameSync(temp,file);
 return result;
}
