// Reproducible Phase 2 verification harness, no UI/GPU needed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {TUNING,MAPS} from '../web/src/core/game.js';

const cli=path.resolve('web/src/headless.mjs');
const base=path.resolve('web/tests/scenarios/phase-2');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'dao-den-long-v12-'));
const contract=JSON.parse(fs.readFileSync('game.contract.json','utf8'));
assert.equal(contract.contract_version,'1.3');
assert.deepEqual(contract.tuning,TUNING);
let index=0;
function run(night,seed,scenario,inputs,ticks,snapshotEvery=10){
 const out=path.join(root,'run-'+(++index)+'.jsonl');
 const args=['--seed',String(seed),'--night',String(night),'--ticks',String(ticks),
  '--out',out,'--snapshot-every',String(snapshotEvery)];
 if(scenario)args.push('--scenario',path.join(base,scenario));
 if(inputs)args.push('--inputs',path.join(base,inputs));
 const start=performance.now();
 const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
 const ms=performance.now()-start;
 assert.equal(result.status,0,result.stderr);
 const content=fs.readFileSync(out,'utf8');
 const rows=content.trim().split('\n').map(JSON.parse);
 assert.equal(rows[0].type,'snapshot');
 assert.equal(rows[0].tick,0);
 assert.equal(rows[0].night,night);
 assert.ok('wind' in rows[0] && 'drifters' in rows[0] && 'charms' in rows[0] && 'motes' in rows[0]);
 assert.equal(rows.at(-1).type,'end');
 assert.ok(rows.at(-1).ticks<=ticks);
 return {content,rows,ms};
}
try{
 for(let night=1;night<=3;night++){
  const filename=night===1?'night1-standard.json':night===2?'night2-map.json':'night3-map.json';
  const a=run(night,17,filename,null,360,10);
  const b=run(night,17,filename,null,360,10);
  assert.equal(a.content,b.content,'Determinism failed on night '+night);
  assert.equal(a.rows[0].lanterns.length,MAPS[night].lanterns.length);
  console.log('PASS Night '+night+': exact map, deterministic JSONL; '+a.ms.toFixed(0)+'ms');
 }
 for(const [name,night,scenario,inputs,ticks,eventName] of [
  ['dash',1,'dash-scenario.json','dash-inputs.json',30,'dash'],
  ['pause',1,'pause-scenario.json','pause-inputs.json',100,'paused'],
  ['charm',2,'charm-scenario.json','charm-inputs.json',40,'charm_picked'],
  ['drifter',2,'drifter-scenario.json','drifter-inputs.json',40,'drifter_steal'],
  ['lantern',1,'lantern-win-scenario.json','lantern-win-inputs.json',10,'lantern_lit']
 ]){
  const r=run(night,17,scenario,inputs,ticks);
  assert.ok(r.rows.some(x=>x.type==='event'&&x.name===eventName),name+' event missing');
  console.log('PASS scenario '+name+' -> '+eventName);
 }
 // Contract v1.2: core fuel transitions and dawn state must be independently
 // confirmed through the actual Node CLI, not by calling the in-memory Game.
 const p3=[
  ['refuel','refuel.json','interact-inputs.json',2,'refuel','playing'],
  ['relight','relight.json','interact-inputs.json',2,'lantern_lit','playing'],
  ['drain','drain.json',null,60,'fuel_drain','playing'],
  ['out','extinguish.json',null,62,'lantern_out','playing'],
  ['dawn-won','dawn-win.json',null,3,'game_over','won'],
  ['dawn-lost','dawn-loss.json',null,3,'game_over','lost']
 ];
 for(const [name,scenario,inputs,ticks,expected,state] of p3){
  const a=run(1,11,'../phase-3/'+scenario,
   inputs?'../phase-3/'+inputs:null,ticks,1);
  const b=run(1,11,'../phase-3/'+scenario,
   inputs?'../phase-3/'+inputs:null,ticks,1);
  assert.equal(a.content,b.content,'Phase3 deterministic '+name);
  assert.equal(a.rows.at(-1).state,state);
  assert.ok(a.rows.some(x=>x.type==='event'&&x.name===expected),'Missing '+expected);
  if(name==='dawn-won')assert.equal(a.rows.find(x=>x.name==='game_over').data.reason,'dawn_survived');
  console.log('PASS Phase3 '+name+': '+expected+' + deterministic JSONL');
 }
 const benchmark=run(3,12,'night3-map.json',null,18000,10);
 assert.equal(benchmark.rows.at(-1).ticks,18000);
 assert.ok(benchmark.ms<=30000,'Night3 must complete within 30 seconds');
 console.log('PASS performance: 18,000 ticks in '+benchmark.ms.toFixed(0)+'ms (<=30000ms)');
 console.log('PASS v1.3 verification harness');
}finally{fs.rmSync(root,{recursive:true,force:true});}
