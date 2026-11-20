import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game, TUNING, runSimulation } from '../src/core/game.js';

const empty = { random_motes: false, random_shades: false, motes: [], shades: [] };
const events = rows => rows.filter(row => row.type === 'event');

test('contract has all five phase-1 lanterns and precise tuning', () => {
  const contract = JSON.parse(fs.readFileSync(new URL('../../game.contract.json', import.meta.url), 'utf8'));
  assert.deepEqual(contract.tuning, TUNING);
  assert.equal(new Game().lanterns.length, 5);
});

test('tick zero snapshot precedes input, and 60 steps move 6m', () => {
  const rows = runSimulation({ seed: 1, scenario: empty,
    inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 0 }] } },
    { ticks: 60, snapshotEvery: 60 });
  assert.deepEqual(rows[0].player.pos, [0, 0, 0]);
  assert.deepEqual(rows.at(-2).player.pos, [0, 0, 6]);
  assert.equal(rows.at(-2).time_left_s, 299);
  assert.deepEqual(rows.at(-1), { type: 'end', ticks: 60, state: 'playing', score: 0 });
});

test('camera yaw=90 rotates forward movement to positive X', () => {
  const rows=runSimulation({scenario:empty,inputs:{frames:[{tick:0,move:[0,1],cam_yaw_deg:90}]}},
    {ticks:10,snapshotEvery:10});
  assert.deepEqual(rows.at(-2).player.pos,[1,0,0]);
});

test('pickup radius inclusive and carry capacity enforced', () => {
  const rows = runSimulation({scenario:{...empty,motes:[[1.2,0,0],[0,0,0]],
    player:{carried:7}}}, {ticks:1,snapshotEvery:1});
  assert.equal(rows.at(-2).player.carried,8);
  assert.equal(rows.at(-2).motes_active,1);
  assert.equal(events(rows).filter(e=>e.name==='mote_picked').length,1);
});

test('deposit only on press edge; partial deposit then complete lantern', () => {
  const scenario={...empty, player:{carried:5},
    lanterns:[{id:'L1',pos:[0,0,0],deposited:2}]};
  const rows=runSimulation({scenario,inputs:{frames:[{tick:0,interact:true}]}},
    {ticks:2,snapshotEvery:1});
  const dep=events(rows).find(e=>e.name==='deposit');
  assert.deepEqual(dep.data,{lantern_id:'L1',amount:3,deposited:5});
  assert.equal(events(rows).filter(e=>e.name==='lantern_lit').length,1);
  assert.equal(rows.at(-2).player.carried,2);
  assert.equal(rows.at(-2).score,100);
});

test('pulse consumes motes, stuns shade, pushes and awards score', () => {
  const scenario={...empty, player:{carried:2}, shades:[{id:'Boss',pos:[3,0,0]}]};
  const rows=runSimulation({scenario,inputs:{frames:[{tick:0,pulse:true}]}},
    {ticks:2,snapshotEvery:1});
  assert.deepEqual(events(rows).find(e=>e.name==='pulse').data,{stunned_ids:['Boss']});
  assert.equal(rows.at(-2).shades[0].state,'stunned');
  assert.equal(rows.at(-2).player.carried,0);
  assert.equal(rows.at(-2).score,25);
  assert.ok(rows.at(-2).shades[0].pos[0]>5);
});

test('shade hit, invulnerability and loss at zero flames', () => {
  const scenario={...empty,player:{flames:1},shades:[{pos:[0,1,0]}]};
  const rows=runSimulation({scenario},{ticks:5,snapshotEvery:1});
  assert.equal(rows.at(-1).state,'lost');
  assert.equal(rows.at(-1).ticks,1);
  assert.deepEqual(events(rows).at(-1).data,{result:'lost',reason:'no_flames'});
});

test('five lit lanterns trigger win with time and flame score bonus', () => {
  const lanterns=Array.from({length:5},(_,i)=>({id:'L'+(i+1),lit:i!==0,...(i===0?{pos:[0,0,0],deposited:4}:{})}));
  const scenario={...empty,player:{carried:1},lanterns};
  const rows=runSimulation({scenario,inputs:{frames:[{tick:0,interact:true}]}},
    {ticks:20,snapshotEvery:1});
  assert.equal(rows.at(-1).ticks,1);
  assert.equal(rows.at(-1).state,'won');
  assert.equal(rows.at(-1).score,100+299*2+3*50);
  assert.deepEqual(events(rows).at(-1).data,{result:'won',reason:'all_lit'});
});

test('dawn causes loss after 60 ticks given 1-second scenario', () => {
  const rows=runSimulation({scenario:{...empty,time_left_s:1}},{ticks:100,snapshotEvery:60});
  assert.equal(rows.at(-1).ticks,60);
  assert.equal(rows.at(-1).state,'lost');
  assert.equal(events(rows).at(-1).data.reason,'dawn');
});

test('determinism with seed, scenario and inputs', () => {
  const options={seed:987,inputs:{frames:[{tick:0,move:[1,1]},{tick:40,pulse:true},{tick:41,pulse:false},{tick:100,move:[0,0]}]}};
  assert.deepEqual(runSimulation(options,{ticks:180}),runSimulation(options,{ticks:180}));
});

test('rejects malformed frame ordering and fields', () => {
  assert.throws(()=>new Game({inputs:{frames:[{tick:1},{tick:1}]}}),TypeError);
  assert.throws(()=>new Game({inputs:{frames:[{tick:0,move:[2,0]}]}}),TypeError);
  assert.throws(()=>new Game({scenario:{shades:[{pos:[NaN,0,0]}]}}),TypeError);
});

test('CLI writes JSONL and returns code 2 on invalid input',()=>{
  const cli=fileURLToPath(new URL('../src/headless.mjs',import.meta.url));
  const file=fileURLToPath(new URL('../../docs/proof/phase-1/test-cli.jsonl',import.meta.url));
  const args=['--seed','3','--night','1','--ticks','10','--out',file];
  execFileSync(process.execPath,[cli,...args]);
  const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows[0].type,'snapshot');
  assert.equal(rows.at(-1).type,'end');
  fs.rmSync(file,{force:true});
  const bad=spawnSync(process.execPath,[cli,'--night','2','--ticks','1','--out',file],{encoding:'utf8'});
  assert.equal(bad.status,2);
});
