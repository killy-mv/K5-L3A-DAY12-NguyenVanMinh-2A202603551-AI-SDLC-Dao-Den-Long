import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Game,TUNING,MAPS,runSimulation} from '../src/core/game.js';
const cleared={random_motes:false,random_shades:false,random_drifters:false,motes:[],shades:[],drifters:[]};
const find=(r,name)=>r.filter(x=>x.type==='event'&&x.name===name);
const simulate=(scenario,frames,ticks=1,night=1)=>runSimulation({night,scenario,inputs:{frames}},{ticks,snapshotEvery:1});
test('Contract v1.2: numeric tuning agrees with engine',()=>{
 const contract=JSON.parse(fs.readFileSync(new URL('../../game.contract.json',import.meta.url),'utf8'));
 assert.equal(contract.contract_version,'1.2');
 assert.deepEqual(contract.tuning,TUNING);
});
test('map standard exact lanterns and correct counts per night',()=>{
 assert.equal(new Game({night:1}).lanterns.length,5);
 assert.equal(new Game({night:2}).lanterns.length,6);
 assert.equal(new Game({night:3}).lanterns.length,7);
 assert.deepEqual(MAPS[1].lanterns[0],[0,0,25]);
 assert.deepEqual(MAPS[2].lanterns[3],[70,0,20]);
 assert.deepEqual(MAPS[3].lanterns[0],[0,6,6]);
});
test('20 distinct initial motes; 30 max; 240th tick adds one',()=>{
 const g=new Game({night:1,scenario:{random_shades:false}});
 assert.equal(g.motes.length,20);assert.equal(new Set(g.motes.map(m=>m.pos.join(','))).size,20);
 for(let i=0;i<240;i++)g.step();
 assert.equal(g.motes.length,21);
});
test('camera-relative move and dt 1/60, step tick0 maps into tick1',()=>{
 const r=simulate(cleared,[{tick:0,move:[0,1],cam_yaw_deg:0}],60);
 assert.deepEqual(r[0].player.pos,[0,0,0]);
 assert.deepEqual(r.at(-2).player.pos,[0,0,6]);
 assert.equal(r.at(-1).ticks,60);
});
test('pickup checks XZ inclusive and vertical <=1.5, capacity10',()=>{
 const sc={...cleared,player:{carried:9},motes:[[1,0,0],[0,0,2]]};
 const r=simulate(sc,[],1);
 assert.equal(r.at(-2).player.carried,10);assert.equal(r.at(-2).motes_active,1);
 assert.equal(r.at(-2).score,0);
});
test('deposit awards 5 per mote and 100 per first light; honors edge',()=>{
 const sc={...cleared,player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0]}]};
 const r=simulate(sc,[{tick:0,interact:true}],2);
 assert.deepEqual(find(r,'deposit')[0].data,{lantern_id:'L1',amount:10,deposited:10});
 assert.equal(r.at(-2).score,150);
 assert.equal(find(r,'deposit').length,1);
});
test('pulse 3 motes, stun120 ticks, push in 15 ticks and +5 score',()=>{
 const sc={...cleared,player:{carried:3},shades:[{id:'S8',pos:[3,0,0]}]};
 const r=simulate(sc,[{tick:0,pulse:true}],15);
 assert.deepEqual(find(r,'pulse')[0].data,{stunned_ids:['S8']});
 assert.equal(r.at(-2).score,5);assert.equal(r.at(-2).player.carried,0);
 assert.ok(r.at(-2).shades[0].pos[0]>6);
 assert.equal(r.at(-2).shades[0].state,'stunned');
});
test('dash starts only on input edge, 14m/s for 12 ticks',()=>{
 const r=simulate(cleared,[{tick:0,move:[0,1],dash:true}],12);
 assert.ok(Math.abs(r.at(-2).player.pos[2]-2.8)<.001);
 assert.equal(find(r,'dash').length,1);
});
test('pause consumes tick but freezes sim_tick, timer and cooldown',()=>{
 const r=simulate(cleared,[{tick:0,pause:true},{tick:1,pause:false},{tick:5,pause:true}],8);
 assert.deepEqual(find(r,'paused').map(x=>x.tick),[1]);
 assert.deepEqual(find(r,'resumed').map(x=>x.tick),[6]);
 assert.equal(r.find(x=>x.type==='snapshot'&&x.tick===4).sim_tick,0);
 assert.equal(r.at(-2).sim_tick,2);
});
test('Bùa Gió pickup activates 600 ticks and respawns after 2700',()=>{
 const sc={...cleared,charms:[{id:'C1',pos:[0,0,0]}]};
 const r=simulate(sc,[],1,2);
 assert.deepEqual(find(r,'charm_picked')[0].data,{charm_id:'C1',charm_ticks:600});
 assert.equal(r.at(-2).player.charm_s,10);
 assert.equal(r.at(-2).charms[0].available,false);
});
test('Gió Lạc steals before shade, and pulse frightens',()=>{
 const sc={...cleared,player:{carried:6,flames:3},drifters:[{id:'D1',pos:[0,1,0],state:'chase'}],shades:[{id:'S1',pos:[0,1,0]}]};
 const r=simulate(sc,[],1,2);
 assert.equal(find(r,'drifter_steal').length,1);
 assert.equal(find(r,'player_hit').length,1);
 assert.equal(find(r,'drifter_steal')[0].data.amount,3);
});
test('shades first spawn exactly at gameplay tick300 with IDs S1 S2',()=>{
 const g=new Game({night:1,scenario:{random_motes:false}});
 let found=[];
 for(let i=0;i<300;i++)found.push(...g.step());
 assert.deepEqual(found.filter(x=>x.name==='shade_spawned').map(x=>x.data.id),['S1','S2']);
});
test('a lantern scenario override never awards score on initialization',()=>{
 const g=new Game({scenario:{...cleared,lanterns:Array.from({length:5},(_,i)=>({id:'L'+(i+1),lit:true}))}});
 assert.equal(g.score,0);assert.equal(g.state,'playing');
});
test('dawn-survived win is decided at dawn after final-tick deposit',()=>{
 const sc={...cleared,time_left_s:1/60,player:{carried:1},lanterns:[
 {id:'L1',pos:[0,0,0],deposited:9},...['L2','L3','L4','L5'].map(id=>({id,lit:true}))]};
 const r=simulate(sc,[{tick:0,interact:true}],2);
 assert.equal(r.at(-1).state,'won');
 assert.equal(find(r,'game_over')[0].data.reason,'dawn_survived');
 assert.equal(r.at(-1).score,100+5+4*(50+99)+(50+100)+3*50);
});
test('determinism of 3 night scenarios, seed and inputs',()=>{
 for(let night=1;night<=3;night++){
  const opts={night,seed:1234,inputs:{frames:[{tick:0,move:[.2,.7]},{tick:20,dash:true},{tick:21,dash:false}]}};
  assert.deepEqual(runSimulation(opts,{ticks:120}),runSimulation(opts,{ticks:120}));
 }
});
test('CLI v1.2 writes JSONL for night 3; bad files exit 2',()=>{
 const cli=fileURLToPath(new URL('../src/headless.mjs',import.meta.url));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ddl-v11-'));
 try{
  const output=path.join(dir,'out.jsonl');
  const ok=spawnSync(process.execPath,[cli,'--night','3','--ticks','25','--out',output],{encoding:'utf8'});
  assert.equal(ok.status,0,ok.stderr);
  const lines=fs.readFileSync(output,'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(lines[0].night,3);assert.equal(lines.at(-1).ticks,25);
  assert.ok('drifters' in lines[0]&&'wind' in lines[0]&&'charms' in lines[0]);
  const bad=spawnSync(process.execPath,[cli,'--night','4','--ticks','25','--out',output],{encoding:'utf8'});
  assert.equal(bad.status,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('fall below Y=-10 loses a flame and all carried motes, ignores invulnerability',()=>{
 const sc={...cleared,player:{pos:[0,-11,0],flames:2,carried:7,invuln_ticks:80}};
 const r=simulate(sc,[],1,1);
 const event=find(r,'player_hit')[0];
 assert.deepEqual(event.data,{by:'fall',flames:1,dropped:0,lost:7});
 assert.equal(r.at(-2).player.carried,0);
});
test('safe zone blocks hits and expels a shade from newly lit lantern',()=>{
 const sc={...cleared,player:{pos:[0,0,0]},shades:[{id:'S1',pos:[0,1,0]}],
 lanterns:[{id:'L1',pos:[0,0,0],lit:true}]};
 const r=simulate(sc,[],31);
 assert.equal(find(r,'player_hit').length,0);
 const end=r.at(-2);
 assert.ok(Math.hypot(end.shades[0].pos[0],end.shades[0].pos[2])>=6-0.01);
});
test('night 3 spawn remains on ground Y=0 below the elevated platform',()=>{
 const r=simulate(cleared,[],1,3);
 assert.equal(r.at(-2).player.pos[1],0);
});
test('night 2 jump pad produces high upward and horizontal launch velocity',()=>{
 const sc={...cleared,player:{pos:[20,0,18]}};
 const r=simulate(sc,[],1,2);
 assert.ok(r.at(-2).player.pos[0]>20.35);
 assert.ok(r.at(-2).player.pos[1]>.2);
 assert.ok(r.at(-2).player.vel[1]>13);
});
test('charm boosts run speed to 7.2m/s after pickup',()=>{
 const sc={...cleared,charms:[{id:'C1',pos:[0,0,0]}]};
 const r=simulate(sc,[{tick:0,move:[0,1]}],61,2);
 assert.ok(r.at(-2).player.pos[2]>6.9);
});
test('pulse uses 3D distance to target rather than only horizontal XZ',()=>{
 const sc={...cleared,player:{carried:3},shades:[{id:'S1',pos:[1,10,0]}]};
 const r=simulate(sc,[{tick:0,pulse:true}]);
 assert.deepEqual(find(r,'pulse')[0].data.stunned_ids,[]);
 assert.equal(r.at(-2).score,0);
});
