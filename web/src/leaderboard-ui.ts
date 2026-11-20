export type LeaderEntry={name:string;score:number;nights_won:number;achieved_at:string;seed:number};
const storageKey='ddl-leaderboard-v1';
export function sortBoard(entries:LeaderEntry[]):LeaderEntry[]{
 return entries.map((e,i)=>({e,i}))
  .sort((a,b)=>b.e.score-a.e.score||
   Date.parse(a.e.achieved_at)-Date.parse(b.e.achieved_at)||a.i-b.i)
  .slice(0,10).map(x=>x.e);
}
function localBoard():LeaderEntry[]{
 try{const d=JSON.parse(localStorage.getItem(storageKey)||'{"entries":[]}');
  return Array.isArray(d.entries)?sortBoard(d.entries):[];
 }catch{return [];}
}
export async function fetchBoard():Promise<LeaderEntry[]>{
 try {
  const response=await fetch('/api/leaderboard',{cache:'no-store'});
  if(!response.ok)throw new Error('Local API not available');
  const data=await response.json();
  if(!Array.isArray(data.entries))throw Error('Invalid leaderboard');
  return sortBoard(data.entries);
 }catch{return localBoard();}
}
export async function saveBoard(entry:LeaderEntry):Promise<{entries:LeaderEntry[],onDisk:boolean}>{
 if(!/^[A-Za-z0-9_]{3,12}$/.test(entry.name))throw Error('Tên phải có 3–12 ký tự A–Z, 0–9 hoặc _');
 try{
  const response=await fetch('/api/leaderboard',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)
  });
  if(!response.ok)throw Error((await response.json()).error||'Cannot save');
  const result=await response.json();
  return {entries:result.entries,onDisk:true};
 }catch{
  const entries=sortBoard([...localBoard(),entry]);
  localStorage.setItem(storageKey,JSON.stringify({entries}));
  return {entries,onDisk:false};
 }
}
