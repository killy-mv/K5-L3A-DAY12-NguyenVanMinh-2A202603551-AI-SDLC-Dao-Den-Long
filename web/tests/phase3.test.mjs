import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,runSimulation,TUNING} from '../src/core/game.js';
const empty={random_motes:false,random_shades:false,random_drifters:false,motes:[],shades:[],drifters:[]};
const simulate=(scenario,frames=[],ticks=1,night=1)=>runSimulation({scenario,inputs:{frames},night,seed:12},{ticks,snapshotEvery:1});
const events=(r,name)=>r.filter(x=>x.type==='event'&&x.name===name);
const lanterns=(n,options={})=>Array.from({length:n},(_,i)=>({id:'L'+(i+1),...(options[i]||{})}));
test('fixed-point fuel decays exactly by 1 every 60 simulation ticks, pauses freeze it',()=>{
 const sc={...empty,lanterns:[{id:'L1',lit:true,fuel:95.5}]};
 let rows=simulate(sc,[],60);
 assert.equal(rows.at(-2).lanterns[0].fuel,94.5);
 rows=simulate(sc,[{tick:0,pause:true},{tick:10,pause:false},{tick:20,pause:true}],80);
 assert.equal(rows.at(-2).sim_tick,59);
 assert.equal(rows.at(-2).lanterns[0].fuel,Math.round((95.5-59/60)*10)/10);
});
test('every initial lit scenario lamp defaults to 100 fuel and no score',()=>{
 const sc={...empty,lanterns:lanterns(5,Object.fromEntries(Array.from({length:5},(_,i)=>[i,{lit:true}])))};
 const g=new Game({scenario:sc});
 assert.equal(g.state,'playing');
 assert.equal(g.score,0);assert.equal(g.player.successfulLights,0);
 assert.ok(g.lanterns.every(l=>l.fuelUnits===6000&&l.ever_lit));
});
test('extinguishing once resets deposited, remembers ever_lit, event occurs at exact tick',()=>{
 const sc={...empty,lanterns:[{id:'L1',lit:true,fuel:1}]};
 const r=simulate(sc,[],61);
 assert.equal(events(r,'lantern_out').length,1);
 assert.equal(events(r,'lantern_out')[0].tick,60);
 assert.equal(r.at(-2).lanterns[0].fuel,0);
 assert.equal(r.at(-2).lanterns[0].lit,false);
 assert.equal(r.at(-2).lanterns[0].deposited,0);
 assert.equal(r.at(-2).lanterns[0].ever_lit,true);
});
test('refuel ceil calculation and 5 score per mote',()=>{
 const sc={...empty,player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:74.9}]};
 const r=simulate(sc,[{tick:0,interact:true}],1);
 assert.equal(events(r,'refuel').length,1);
 assert.deepEqual(events(r,'refuel')[0].data,{lantern_id:'L1',amount:3,fuel:100});
 assert.equal(r.at(-2).player.carried,7);assert.equal(r.at(-2).score,15);
 assert.equal(r.at(-2).lanterns[0].fuel,100);
});
test('interact nearest available lantern; lit full ignored; tie sorted by id',()=>{
 const sc={...empty,player:{carried:10},lanterns:[
 {id:'L1',pos:[4,0,0],lit:true,fuel:100},
 {id:'L2',pos:[-1,0,0],lit:false},
 {id:'L3',pos:[1,0,0],lit:false}]};
 const r=simulate(sc,[{tick:0,interact:true}]);
 assert.equal(events(r,'deposit')[0].data.lantern_id,'L2');
});
test('relight needs five carried, scores 40 plus 25, boosts capacity and relit_count',()=>{
 const sc={...empty,player:{carried:5},lanterns:[{id:'L1',pos:[0,0,0],lit:false,ever_lit:true}]};
 const r=simulate(sc,[{tick:0,interact:true}]);
 assert.deepEqual(events(r,'lantern_lit')[0].data,{lantern_id:'L1',relight:true});
 assert.equal(r.at(-2).score,65);
 assert.equal(r.at(-2).player.capacity,12);
 assert.equal(r.at(-2).lanterns[0].fuel,100);
 assert.equal(r.at(-2).lanterns[0].relit_count,1);
});
test('first-time light needs 10, grants 100 plus 50 and 12 capacity',()=>{
 const sc={...empty,player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0]}]};
 const r=simulate(sc,[{tick:0,interact:true}]);
 assert.equal(r.at(-2).score,150);
 assert.equal(r.at(-2).player.capacity,12);
 assert.deepEqual(events(r,'lantern_lit')[0].data,{lantern_id:'L1',relight:false});
});
test('successful lights scenario increases capacity, capped at twenty',()=>{
 const sc={...empty,player:{successful_lights:8,carried:20},motes:[[0,0,0]]};
 const g=new Game({scenario:sc});
 assert.equal(g.capacity,20);
 assert.equal(g.snapshot().player.capacity,20);
});
test('shade already draining removes 5+1 fuel per second, with fuel_drain at tick60',()=>{
 const sc={...empty,player:{pos:[20,0,0]},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:20}],
 shades:[{id:'S1',pos:[1,1,0],state:'drain',target_lantern_id:'L1'}]};
 const r=simulate(sc,[],60);
 assert.equal(r.at(-2).lanterns[0].fuel,14);
 assert.equal(events(r,'fuel_drain').length,1);
 assert.deepEqual(events(r,'fuel_drain')[0].data,{lantern_id:'L1',shade_id:'S1',fuel:14});
});
test('two drainers stack with base decay, extinguish low-fuel lamp',()=>{
 const sc={...empty,player:{pos:[20,0,0]},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:1}],
 shades:[{id:'S1',pos:[1,1,0],state:'drain',target_lantern_id:'L1'},
 {id:'S2',pos:[-1,1,0],state:'drain',target_lantern_id:'L1'}]};
 const r=simulate(sc,[],10);
 assert.equal(events(r,'lantern_out').length,1);
 assert.equal(r.at(-2).lanterns[0].lit,false);
});
test('wander shade selects nearest weak lamp and enters drain at XZ <=2',()=>{
 const sc={...empty,player:{pos:[20,0,0]},lanterns:[{id:'L1',pos:[2,0,0],lit:true,fuel:20}],
 shades:[{id:'S9',pos:[1,1,0],state:'wander'}]};
 const r=simulate(sc,[],1);
 assert.equal(r.at(-2).shades[0].state,'drain');
});
test('drain exits into chase if player closer than 6',()=>{
 const sc={...empty,lanterns:[{id:'L1',pos:[15,0,0],lit:true,fuel:20}],
 player:{pos:[12,0,0]},shades:[{id:'S1',pos:[15,1,0],state:'drain',target_lantern_id:'L1'}]};
 const r=simulate(sc,[],1);
 assert.equal(r.at(-2).shades[0].state,'chase');
});
test('pulse into drain state awards 15 points rather than 5',()=>{
 const sc={...empty,player:{carried:3},lanterns:[{id:'L1',pos:[2,0,0],lit:true,fuel:20}],
 shades:[{id:'S1',pos:[1,1,0],state:'drain',target_lantern_id:'L1'}]};
 const r=simulate(sc,[{tick:0,pulse:true}]);
 assert.equal(r.at(-2).score,15);
 assert.equal(r.at(-2).shades[0].state,'stunned');
});
test('low lamp at 29.9 no protection; 30 has protection',()=>{
 const low={...empty,shades:[{id:'S1',pos:[0,1,0],state:'chase'}],
 lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:29.9}]};
 assert.equal(events(simulate(low),'player_hit').length,1);
 const strong={...empty,shades:[{id:'S1',pos:[0,1,0],state:'chase'}],
 lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:30.1}]};
 assert.equal(events(simulate(strong),'player_hit').length,0);
});
test('all lit never wins early; dawn threshold 3/5, 4/6, 5/7',()=>{
 for(const [night,n,required]of [[1,5,3],[2,6,4],[3,7,5]]){
  const sc={...empty,time_left_s:1/60,lanterns:lanterns(n,Object.fromEntries(
   Array.from({length:required},(_,i)=>[i,{lit:true,fuel:100}])))};
  const r=simulate(sc,[],1,night);
  assert.equal(r.at(-1).state,'won');
  assert.equal(events(r,'game_over')[0].data.reason,'dawn_survived');
  const less={...empty,time_left_s:1/60,lanterns:lanterns(n,Object.fromEntries(
   Array.from({length:required-1},(_,i)=>[i,{lit:true,fuel:100}])))};
  assert.equal(simulate(less,[],1,night).at(-1).state,'lost');
  const all={...empty,lanterns:lanterns(n,Object.fromEntries(
   Array.from({length:n},(_,i)=>[i,{lit:true,fuel:100}])))};
  assert.equal(simulate(all,[],1,night).at(-1).state,'playing');
 }
});
test('zero flames takes precedence over dawn',()=>{
 const sc={...empty,time_left_s:1/60,player:{flames:1},
 lanterns:lanterns(5,{0:{lit:true},1:{lit:true},2:{lit:true}}),
 shades:[{id:'S1',pos:[0,1,0],state:'chase'}]};
 const r=simulate(sc,[],1);
 assert.deepEqual(events(r,'game_over')[0].data,{result:'lost',reason:'no_flames'});
});
test('same seed, scenario and inputs remain deterministic with drain and refuel',()=>{
 const scenario={...empty,player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:20}],
 shades:[{id:'S1',pos:[2,1,0],state:'drain',target_lantern_id:'L1'}]};
 const options={seed:45,scenario,inputs:{frames:[{tick:0,interact:true}]}};
 assert.deepEqual(runSimulation(options,{ticks:100}),runSimulation(options,{ticks:100}));
});

test('shade drain outside 2m or at safe fuel does not consume extra fuel',()=>{
 const distant={...empty,player:{pos:[20,0,0]},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:20}],
 shades:[{id:'S1',pos:[4,1,0],state:'drain',target_lantern_id:'L1'}]};
 const r=simulate(distant,[],1);
 assert.equal(r.at(-2).lanterns[0].fuel,20);
 const strong={...empty,player:{pos:[20,0,0]},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:40}],
 shades:[{id:'S1',pos:[1,1,0],state:'drain',target_lantern_id:'L1'}]};
 assert.equal(simulate(strong,[],1).at(-2).lanterns[0].fuel,40);
});
test('refuel across 30 threshold expels nearby shade in at most 30 ticks',()=>{
 const sc={...empty,player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:20}],
 shades:[{id:'S1',pos:[2,1,0],state:'drain',target_lantern_id:'L1'}]};
 const r=simulate(sc,[{tick:0,interact:true}],32);
 assert.equal(events(r,'player_hit').length,0);
 assert.ok(Math.hypot(r.at(-2).shades[0].pos[0],r.at(-2).shades[0].pos[2])>=6-0.01);
 assert.equal(r.at(-2).lanterns[0].lit,true);
});
