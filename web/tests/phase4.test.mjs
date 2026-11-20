import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const entry=(name,score,time='2026-11-20T12:00:00+07:00')=>({
 name,score,nights_won:1,achieved_at:time,seed:2026
});
test('leaderboard rejects bad names / fields and enforces 3-12 ASCII chars',async()=>{
 const {validateEntry}=await import('../../scripts/leaderboard.mjs');
 for(const name of ['ab','abcdefghijklmn','A B','A!b','Đặng']){
  assert.throws(()=>validateEntry(entry(name,20)),TypeError);
 }
 assert.equal(validateEntry(entry('Mai_2026',20)).name,'Mai_2026');
 assert.throws(()=>validateEntry({...entry('Tst',3),nights_won:4}),TypeError);
 assert.throws(()=>validateEntry({...entry('Tst',3),achieved_at:'2026-11-20T12:00:00'}),TypeError);
});
test('top ten ranks by score desc, ties earlier achieved_at first',async()=>{
 const {topTen}=await import('../../scripts/leaderboard.mjs');
 const list=Array.from({length:14},(_,i)=>entry('User'+i,i*10));
 list.push(entry('Early',130,'2026-11-19T01:00:00Z'));
 const sorted=topTen(list);
 assert.equal(sorted.length,10);
 assert.equal(sorted[0].name,'Early');
 assert.equal(sorted[1].name,'User13');
 assert.equal(sorted.at(-1).score,50);
});
test('leaderboard file persists across a separate process and CLI exports ordered entries',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ddl-release-'));
 try{
  const file=path.join(dir,'leaderboard.json'),out=path.join(dir,'export.json');
  const script=path.join(dir,'writer.mjs');
  const moduleURL=new URL('../../scripts/leaderboard.mjs',import.meta.url).href;
  fs.writeFileSync(script,`import {addEntry} from '${moduleURL}';
addEntry({name:'Early',score:123,nights_won:3,achieved_at:'2026-11-20T10:00:00+07:00',seed:8});
addEntry({name:'Late',score:123,nights_won:1,achieved_at:'2026-11-20T11:00:00+07:00',seed:9});
`);
  const env={...process.env,LEADERBOARD_FILE:file};
  const w=spawnSync(process.execPath,[script],{env,encoding:'utf8'});
  assert.equal(w.status,0,w.stderr);
  const e=spawnSync(process.execPath,['scripts/run.mjs','--export-leaderboard',out],
   {cwd:root,env,encoding:'utf8'});
  assert.equal(e.status,0,e.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(out,'utf8')).entries.map(x=>x.name),['Early','Late']);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('soak cli runs 10 worlds in one process, no crashes and memory under 1.2x',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ddl-soak-'));
 try{
  const out=path.join(dir,'soak.json');
  const result=spawnSync(process.execPath,['--jitless','--expose-gc','scripts/soak.mjs','--seed','7',
   '--nights','10','--out',out],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const data=JSON.parse(fs.readFileSync(out,'utf8'));
  assert.equal(data.nights,10);assert.equal(data.crashes,0);assert.equal(data.results.length,10);
  assert.ok(data.mem_end_mb<=data.mem_start_mb*1.2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
