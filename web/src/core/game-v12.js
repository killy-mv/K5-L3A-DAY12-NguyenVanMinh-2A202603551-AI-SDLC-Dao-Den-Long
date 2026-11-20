// Day12 / Ticket-03: deterministic 60-Hz game core, independent from DOM, GPU, and Three.js.
// All gameplay mutations are performed here; presentation is a pure observer.
export const DT = 1 / 60;
export const TUNING = Object.freeze({
 player_speed:6, carry_capacity:10, lantern_cost:10, lantern_count_night1:5,
 fuel_max:100, fuel_decay_per_s:1, fuel_per_mote:10, relight_cost:5,
 win_ratio:.6, drain_per_s:5, low_fuel_threshold:30, capacity_max:20,
 pickup_radius:1, interact_radius:2, pulse_cost:3, pulse_radius:5,
 night1_duration_s:240, night2_duration_s:270, night3_duration_s:300,
 flames:3, invuln_s:1.5, hit_drop_ratio:.5, pulse_stun_s:2,
 pulse_push_m:4, pulse_cooldown_s:3, safe_radius:6,
 shade_speed:4, shade_hit_radius:1, fall_enabled:true,
 dash_speed:14, dash_duration_s:.2, dash_cooldown_s:1.5,
 score:{per_mote:5, per_lantern:100, per_stun:5,per_second_left:0,per_flame_left:50}
});
const exact=(x)=>Math.round((x+Number.EPSILON)*1000)/1000;
const copy=x=>JSON.parse(JSON.stringify(x));
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const dist3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const unit=(x,z)=>{let n=Math.hypot(x,z);return n? [x/n,z/n]:[1,0]};
const degrees=(a)=>a*Math.PI/180;
const vec3=x=>[...x];
const integer=(v)=>Number.isSafeInteger(v);
const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
function check(b,message){if(!b)throw new TypeError(message)}
function v3(v,label){check(Array.isArray(v)&&v.length===3&&v.every(finite),label+' must be [x,y,z]');}
function num(v,label,min=-Infinity){check(finite(v)&&v>=min,label+' must be valid number');}
function bool(v,label){check(typeof v==='boolean',label+' must be boolean');}
export function validateInputs(inputs){
 if(inputs==null)return [];
 check(inputs&&typeof inputs==='object'&&!Array.isArray(inputs)&&Array.isArray(inputs.frames),'inputs.frames required');
 let last=-1;
 return inputs.frames.map((f,i)=>{
  check(f&&typeof f==='object'&&!Array.isArray(f),'invalid frame');
  check(integer(f.tick)&&f.tick>=0&&f.tick>last,'tick must be strictly increasing');
  last=f.tick;
  for(const k of Object.keys(f))check(['tick','move','cam_yaw_deg','jump','interact','pulse','dash','pause'].includes(k),'unknown input key '+k);
  if('move'in f)check(Array.isArray(f.move)&&f.move.length===2&&f.move.every(x=>finite(x)&&x>=-1&&x<=1),'move values [-1,1] required');
  if('cam_yaw_deg'in f)num(f.cam_yaw_deg,'cam_yaw_deg');
  for(const k of ['jump','interact','pulse','dash','pause'])if(k in f)bool(f[k],k);
  return copy(f);
 });
}
export function validateScenario(sc,night=1){
 if(sc==null)return;
 check(sc&&typeof sc==='object'&&!Array.isArray(sc),'scenario must be object');
 if(sc.player){
  check(typeof sc.player==='object'&&!Array.isArray(sc.player),'player invalid');
  if('pos'in sc.player)v3(sc.player.pos,'player.pos');
  for(const k of ['carried','flames','invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks']){
   if(k in sc.player)check(integer(sc.player[k])&&sc.player[k]>=0,'player.'+k+' invalid');
  }
  if('successful_lights'in sc.player)check(integer(sc.player.successful_lights)&&sc.player.successful_lights>=0,'invalid successful_lights');
   const initialCapacity=Math.min(TUNING.capacity_max,TUNING.carry_capacity+2*(sc.player.successful_lights??0));
   if(sc.player.carried>initialCapacity)throw new TypeError('player carry overflow');
 }
 for(const k of ['random_motes','random_shades','random_drifters','wind_enabled'])if(k in sc)bool(sc[k],k);
 if('time_left_s'in sc)num(sc.time_left_s,'time_left_s',0);
 if('motes'in sc){check(Array.isArray(sc.motes),'motes must be array');for(const m of sc.motes)v3(m,'mote');}
 for(const k of ['shades','drifters','charms','lanterns'])if(k in sc)check(Array.isArray(sc[k]),k+' must be array');
 for(const [k,choices] of [['shades',['spawning','wander','chase','recoil','stunned','drain']],['drifters',['idle','chase','flee','removed']]]){
  const used=new Set();
  for(const e of sc[k]||[]){
   check(e&&typeof e==='object'&&!Array.isArray(e),'invalid '+k+' entry');
   v3(e.pos,k+'.pos');
   if('id'in e){check(typeof e.id==='string'&&e.id.length>0&&!used.has(e.id),'bad '+k+' id');used.add(e.id);}
   if('state'in e)check(choices.includes(e.state),'bad '+k+' state');
   if('state_ticks_left'in e)check(integer(e.state_ticks_left)&&e.state_ticks_left>=0,'bad '+k+' state_ticks_left');
   if('stolen'in e)check(integer(e.stolen)&&e.stolen>=0,'bad '+k+' stolen');
   if(k==='shades'&&'target_lantern_id'in e)
    check(typeof e.target_lantern_id==='string'&&new RegExp('^L[1-'+(night===1?5:night===2?6:7)+']$').test(e.target_lantern_id),'invalid target_lantern_id');
  }
 }
 const ids=new Set();
 for(const l of sc.lanterns||[]){
  check(l&&typeof l==='object'&&!Array.isArray(l)&&new RegExp('^L[1-'+(night===1?5:night===2?6:7)+']$').test(l.id)&&!ids.has(l.id),'invalid lantern id');
  ids.add(l.id);if('pos'in l)v3(l.pos,'lantern.pos');
  if('lit'in l)bool(l.lit,'lantern.lit');
   if('ever_lit'in l)bool(l.ever_lit,'lantern.ever_lit');
   if('fuel'in l)num(l.fuel,'lantern.fuel',0);
   if(l.fuel>TUNING.fuel_max)throw new TypeError('lantern fuel over max');
   if('relit_count'in l)check(integer(l.relit_count)&&l.relit_count>=0,'lantern.relit_count');
  if('deposited'in l)check(integer(l.deposited)&&l.deposited>=0,'lantern.deposited');
 }
 for(const c of sc.charms||[]){
  check(c&&typeof c==='object'&&!Array.isArray(c)&&typeof c.id==='string','invalid charm');
  if('pos'in c)v3(c.pos,'charm.pos');
  if('available'in c)bool(c.available,'charm.available');
  if('respawn_ticks'in c)check(integer(c.respawn_ticks)&&c.respawn_ticks>=0,'charm respawn');
 }
}
function randomFn(seed){
 let s=seed>>>0;
 return ()=>{
  s=(s+0x6D2B79F5)>>>0;
  let t=Math.imul(s^(s>>>15),1|s);
  t^=t+Math.imul(t^(t>>>7),61|t);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
const ring=(cx,cz,r,n,offset=0,y=0)=>Array.from({length:n},(_,i)=>{
 const a=degrees(offset+i*360/n);
 return [exact(cx+r*Math.cos(a)),y,exact(cz+r*Math.sin(a))];
});
export const MAPS = {
 1:{name:'Đảo Bến', duration:240,radius:40,lanterns:[[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]],
  motePoints:[...ring(0,0,12,8),...ring(0,0,33,16)],shadePoints:ring(0,0,37,12,15),shadeMax:6,shadeInterval:480,shadeSpeed:4},
 2:{name:'Đảo Cau',duration:270,radius:28,lanterns:[[0,0,20],[17,0,-10],[-17,0,-10],[70,0,20],[87,0,-10],[53,0,-10]],
  motePoints:[...ring(0,0,10,4),...ring(0,0,22,8),...ring(70,0,10,4),...ring(70,0,22,8)],
  shadePoints:[...ring(0,0,26,8,22.5),...ring(70,0,26,8,22.5)],shadeMax:8,shadeInterval:420,shadeSpeed:4},
 3:{name:'Đảo Chuông',duration:300,radius:45,lanterns:[[0,6,6],[18,3,10],[-18,3,10],[35,0,-10],[-35,0,-10],[20,0,-35],[-20,0,-35]],
  motePoints:[...ring(0,0,34,18),...[20,40,60,80,100,120,140,160].map(a=>{let t=degrees(a);return [exact(18*Math.cos(t)),3,exact(18*Math.sin(t))]}),...ring(0,0,5,4,45,6)],
  shadePoints:ring(0,0,43,16),shadeMax:10,shadeInterval:360,shadeSpeed:4.5}
};
export const CHARM_DEFAULTS = {
 1:[],
 2:[{id:'C1',pos:[35,0,0]}],
 3:[{id:'C1',pos:[30,0,25]},{id:'C2',pos:[-30,0,25]}]
};
const shift=(p,v,s)=>{p[0]+=v[0]*s;p[2]+=v[1]*s};
function groundAt(pos,night){
 const x=pos[0],z=pos[2],r=Math.hypot(x,z);
 if(night===1)return r<=40?0:null;
 if(night===2){
  if(Math.hypot(x,z)<=28||Math.hypot(x-70,z)<=28||x>=26&&x<=44&&Math.abs(z)<=2)return 0;
  return null;
 }
 if(r>45)return null;
 if(r<=8)return 6;
 if(r>=12&&r<=24&&z>0)return 3;
 // Ramps: thin 3m corridors from radius 30 at y0 to 24 at y3.
 for(const a of [30,150]){
  const t=degrees(a),along=x*Math.cos(t)+z*Math.sin(t),perp=-x*Math.sin(t)+z*Math.cos(t);
  if(along>=24&&along<=30&&Math.abs(perp)<=1.5)return (30-along)/2;
 }
 return 0;
}
// On night 3 platforms act as overhead roofs until the feet reach their elevation.
function floorUnderFeet(pos,night){
 if(night!==3)return groundAt(pos,night);
 const x=pos[0],z=pos[2],r=Math.hypot(x,z);
 if(r>45)return null;
 if(r<=8&&pos[1]>=6-1e-8)return 6;
 if(r>=12&&r<=24&&z>0&&pos[1]>=3-1e-8)return 3;
 for(const a of [30,150]){
  const t=degrees(a),along=x*Math.cos(t)+z*Math.sin(t),perp=-x*Math.sin(t)+z*Math.cos(t);
  if(along>=24&&along<=30&&Math.abs(perp)<=1.5)return (30-along)/2;
 }
 return 0;
}
function withinMap(p,night){return groundAt(p,night)!==null}
function spawnId(prefix,index){return prefix+index}

export class Game {
 constructor({seed=1,night=1,scenario=undefined,inputs=undefined}={}){
  check(integer(seed),'seed must be integer');
  check([1,2,3].includes(night),'night must be 1,2,3');
  validateScenario(scenario,night);
  this.seed=seed;this.night=night;this.map=MAPS[night];this.random=randomFn(seed);
  this.inputFrames=validateInputs(inputs);this.nextInputIndex=0;
  this.input={move:[0,0],cam_yaw_deg:0,jump:false,dash:false,interact:false,pulse:false,pause:false};
  this.prevInput={jump:false,dash:false,interact:false,pulse:false,pause:false};
  this.tick=0;this.simTick=0;this.state='playing';this.score=0;this.events=[];
  this.timeLeft=scenario?.time_left_s??this.map.duration;this.startTime=this.timeLeft;
  this.player={
   pos:[0,0,0],vel:[0,0,0],carried:0,flames:3,grounded:true,
   invuln:0,dashCd:0,dashTicks:0,dashDir:[0,1],pulseCd:0,charmTicks:0,
   respawnTicks:0,falling:false,launchTicks:0,launchDir:[0,0],facing:[0,1],
   platformLock:false,successfulLights:0
  };
  this.lanterns=this.map.lanterns.map((pos,i)=>({
   id:'L'+(i+1),pos:[...pos],lit:false,deposited:0,fuelUnits:0,ever_lit:false,relit_count:0
  }));
  this.motes=[];this.shades=[];this.drifters=[];this.charms=copy(CHARM_DEFAULTS[night]).map(c=>({...c,available:true,respawnTicks:0}));
  this.moteId=0;this.shadeId=0;this.drifterId=0;
  this.allowMotes=scenario?.random_motes!==false;
  this.allowShades=scenario?.random_shades!==false;
  this.allowDrifters=night!==1 && scenario?.random_drifters!==false;
  this.windEnabled=night===3 && scenario?.wind_enabled!==false;
  this.wind={active:false,dir_deg:0};this.windCycle=-1;
  this.spawnedMotePoints=new Set();
  this.pulsePushes=[];
  const sp=scenario?.player;
  if(sp){
   if(sp.pos)this.player.pos=vec3(sp.pos);
   if('carried'in sp)this.player.carried=sp.carried;
   if('flames'in sp)this.player.flames=sp.flames;
   this.player.successfulLights=sp.successful_lights??0;
   this.player.invuln=sp.invuln_ticks??0;
   this.player.dashCd=sp.dash_cd_ticks??0;
   this.player.pulseCd=sp.pulse_cd_ticks??0;
   this.player.charmTicks=sp.charm_ticks??0;
  }
  if(scenario?.lanterns)for(const patch of scenario.lanterns){
   const l=this.lanterns.find(x=>x.id===patch.id);
   if(patch.pos)l.pos=vec3(patch.pos);
   if('lit'in patch)l.lit=patch.lit;
   if('deposited'in patch)l.deposited=patch.deposited;
   if('ever_lit'in patch)l.ever_lit=patch.ever_lit;
   if('relit_count'in patch)l.relit_count=patch.relit_count;
   if('lit'in patch)l.ever_lit=l.ever_lit||patch.lit;
   l.fuelUnits=l.lit?Math.round((patch.fuel??100)*60):0;
  }
  if(scenario?.motes){
   for(const pos of scenario.motes)this.motes.push(this.makeMote(pos,'random'));
  }else if(this.allowMotes)for(let i=0;i<20;i++)this.spawnMotePoint();
  if(scenario?.shades)for(const [i,data] of scenario.shades.entries()){
   const id=data.id??'S'+(i+1);
   const shade=this.makeShade(data.pos,id,data.state??'chase',data.state_ticks_left??0);
   shade.target_lantern_id=data.target_lantern_id??null;
   if(shade.state==='drain'&&!shade.target_lantern_id){
    const weak=this.lanterns.filter(l=>l.lit&&l.fuelUnits<1800);
    weak.sort((a,b)=>dist(shade.pos,a.pos)-dist(shade.pos,b.pos)||a.id.localeCompare(b.id));
    shade.target_lantern_id=weak[0]?.id??null;
   }
   this.shades.push(shade);
   const match=/^S(\d+)$/.exec(id);if(match)this.shadeId=Math.max(this.shadeId,Number(match[1]));
  }
  if(scenario?.drifters)for(const [i,data] of scenario.drifters.entries()){
   const id=data.id??'D'+(i+1);this.drifters.push(this.makeDrifter(data.pos,id,data.state??'idle',data.stolen??0,data.state_ticks_left??0));
   const match=/^D(\d+)$/.exec(id);if(match)this.drifterId=Math.max(this.drifterId,Number(match[1]));
  }
  if(scenario?.charms)this.charms=scenario.charms.map((c,i)=>({
   id:c.id??'C'+(i+1),pos:vec3(c.pos??CHARM_DEFAULTS[night][i]?.pos??[0,0,0]),
   available:c.available??true,respawnTicks:c.respawn_ticks??0
  }));
  // Initial scenario is a direct state edit, not a game event / score.
  if(this.player.flames===0)this.state='lost';
  // All-lit scenarios are still playing in v1.2 until dawn.
 }
 makeMote(pos,kind='random',ttl=0){
  return {id:spawnId('M',++this.moteId),pos:vec3(pos),kind,ttl};
 }
 makeShade(pos,id,state='wander',stateTicks=0){
  return {id,pos:vec3(pos),state,stunTicks:state==='stunned'?stateTicks:0,
   recoilTicks:state==='recoil'?stateTicks:0,spawnTicks:state==='spawning'?stateTicks:0,
   heading:this.random()*Math.PI*2,pushTicks:0,pushDir:[1,0],safePushTicks:0,
   target_lantern_id:null,drainTicks:0};
 }
 makeDrifter(pos,id,state='idle',stolen=0,stateTicks=0){
  return {id,pos:vec3(pos),state,stolen,ttl:state==='flee'?stateTicks:0,heading:this.random()*Math.PI*2};
 }
 event(name,data={}){this.events.push({type:'event',tick:this.tick,name,data});}
 spawnMotePoint(){
  if(this.motes.length>=30)return;
  const points=this.map.motePoints.filter(p=>this.motes.every(m=>dist3(p,m.pos)>.1));
  if(!points.length)return;
  const point=points[Math.floor(this.random()*points.length)];
  this.motes.push(this.makeMote(point));
 }
 spawnShade(){
  if(this.shades.length>=this.map.shadeMax)return;
  const pts=this.map.shadePoints.filter(pos=>dist(pos,this.player.pos)>=15&&
   this.shades.every(s=>dist(pos,s.pos)>=1)&&this.lanterns.every(l=>!this.isSafe(l)||dist(pos,l.pos)>6));
  if(!pts.length)return;
  const point=pts[Math.floor(this.random()*pts.length)];
  const id=spawnId('S',++this.shadeId);
  this.shades.push(this.makeShade([point[0],point[1]+1,point[2]],id,'spawning',30));
  this.event('shade_spawned',{id});
 }
 spawnDrifter(){
  if(this.night===1||this.drifters.filter(d=>d.state!=='removed').length>=2)return;
  const positions=this.map.shadePoints;
  const point=positions[Math.floor(this.random()*positions.length)];
  const id=spawnId('D',++this.drifterId);
  this.drifters.push(this.makeDrifter([point[0],point[1]+1.5,point[2]],id));
 }
 finish(state,reason){
  if(this.state!=='playing')return;
  this.state=state;
  if(state==='won'){
    for(const l of this.lanterns.filter(l=>l.lit))
     this.score+=50+Math.floor(l.fuelUnits/60);
    this.score+=this.player.flames*50;
   }
  this.event('game_over',{result:state,reason});
 }
 updateInput(override){
  const inputTick=this.tick;
  while(this.nextInputIndex<this.inputFrames.length&&this.inputFrames[this.nextInputIndex].tick===inputTick)
   Object.assign(this.input,this.inputFrames[this.nextInputIndex++]);
  if(override)for(const k of ['move','cam_yaw_deg','jump','dash','interact','pulse','pause'])
   if(k in override)this.input[k]=override[k];
  const press={};
  for(const k of ['jump','dash','interact','pulse','pause']){
   press[k]=!!this.input[k]&&!this.prevInput[k];this.prevInput[k]=!!this.input[k];
  }
  return press;
 }
 step(override=/** @type {any} */(undefined)){
  if(this.state==='won'||this.state==='lost'){this.events=[];return [];}
  this.events=[];const press=this.updateInput(override);this.tick++;
  if(press.pause){
   this.state=this.state==='paused'?'playing':'paused';
   this.event(this.state==='paused'?'paused':'resumed');
   // Pause/resume consumes only input tick, never advances gameplay.
   return this.events;
  }
  if(this.state==='paused')return this.events;
  ++this.simTick;
  if(this.simTick===1)this.event('night_start',{night:this.night});
  // 2. Countdown, fixed-point fuel and lifetimes.
  this.timeLeft=Math.max(0,this.startTime-this.simTick*DT);
  this.updateFuel();
  const p=this.player;
  for(const k of ['invuln','dashCd','pulseCd','charmTicks'])p[k]=Math.max(0,p[k]-1);
  for(const m of this.motes)if(m.kind==='dropped')m.ttl--;
  this.motes=this.motes.filter(m=>m.kind!=='dropped'||m.ttl>0);
  for(const c of this.charms)if(!c.available){
   c.respawnTicks=Math.max(0,c.respawnTicks-1);
   if(c.respawnTicks===0)c.available=true;
  }
  // 3. Player physics + falling.
  if(p.respawnTicks>0){
   p.respawnTicks--;
   if(!p.respawnTicks){p.pos=[0,0,0];p.vel=[0,0,0];p.grounded=true;p.invuln=90;p.falling=false;}
  }else this.movePlayer(press);
  // 4. Pickups.
  if(!p.falling&&!p.respawnTicks)this.pickup();
  // 5. Lantern deposit.
  if(press.interact&&!p.falling&&!p.respawnTicks)this.deposit();
  // 6. Safe zones.
  this.updateSafeZones();
  // 7. Pulse.
  if(press.pulse&&!p.falling&&!p.respawnTicks)this.pulse();
  // 8. Shade and drifter motion.
  this.updateShades();this.updateDrifters();
  // 9. Drifter theft precedes shade hit.
  if(!p.falling&&!p.respawnTicks){this.drifterContacts();this.shadeContacts();}
  // 10. Scheduled spawns: entities cannot act on spawn tick.
  if(this.allowMotes&&this.simTick%240===0)this.spawnMotePoint();
  if(this.allowShades&&(this.simTick===300||this.simTick>300&&(this.simTick-300)%this.map.shadeInterval===0)){
   const n=this.simTick===300?2:1;
   for(let i=0;i<n;i++)this.spawnShade();
  }
  if(this.allowDrifters&&this.simTick%1200===0)this.spawnDrifter();
  // 11. Ordered terminal checks.
  if(p.flames<=0)this.finish('lost','no_flames');
  else if(this.timeLeft<=1e-9){
   const lit=this.lanterns.filter(l=>l.lit).length;
   if(lit>=Math.ceil(TUNING.win_ratio*this.lanterns.length))
    this.finish('won','dawn_survived');
   else this.finish('lost','dawn');
  }
  return this.events;
 }
 movePlayer(press){
  const p=this.player;
  const groundedAtStart=p.grounded;
  const previousPos=[...p.pos];
  // Falling is defined by feet Y<-10, independently of horizontal map support.
  if(p.pos[1]<-10){this.fall();return;}
  const t=degrees(this.input.cam_yaw_deg),[mx,mz]=this.input.move;
  let dx=mx*Math.cos(t)+mz*Math.sin(t),dz=-mx*Math.sin(t)+mz*Math.cos(t);
  const size=Math.hypot(dx,dz);
  if(size>1){dx/=size;dz/=size;}
  if(size>0)p.facing=unit(dx,dz);
  if(press.dash&&p.dashTicks===0&&(p.dashCd===0||p.charmTicks>0)){
   p.dashTicks=12;p.dashCd=p.charmTicks>0?0:90;p.dashDir=size>0?unit(dx,dz):[...p.facing];
   this.event('dash');
  }
  const dashActive=p.dashTicks>0;
  if(dashActive){
   const [vx,vz]=p.dashDir;p.vel[0]=vx*14;p.vel[2]=vz*14;p.dashTicks--;
  }else if(!p.launchTicks){
   const speed=p.charmTicks>0?7.2:6;p.vel[0]=dx*speed;p.vel[2]=dz*speed;
  }
  if(press.jump&&p.grounded&&!p.launchTicks){p.vel[1]=7;p.grounded=false;}
  if(this.night===2&&groundedAtStart){
   for(const [at,dir] of [[[20,0,18],[1,0]],[[50,0,-18],[-1,0]]]){
    if(dist(p.pos,at)<=1){
     p.vel=[dir[0]*24,14,dir[1]*24];p.launchDir=dir;p.launchTicks=100;
     p.grounded=false;break;
    }
   }
  }
  if(this.night===3&&groundedAtStart&&dist(p.pos,[0,3,13])<=1&&Math.abs(p.pos[1]-3)<=.1){
   p.vel=[0,12,-8];p.launchDir=[0,-1];p.launchTicks=100;p.grounded=false;
  }
  if(this.night===3&&this.windEnabled){
   const cycle=Math.floor(this.simTick/1800);
   if(cycle!==this.windCycle){this.windCycle=cycle;this.wind.dir_deg=Math.floor(this.random()*360);}
   const mod=this.simTick%1800;
   this.wind.active=mod>=0&&mod<300&&this.simTick>=1800;
   if(this.wind.active){
    p.pos[0]+=Math.cos(degrees(this.wind.dir_deg))*2*DT;
    p.pos[2]+=Math.sin(degrees(this.wind.dir_deg))*2*DT;
   }
  }
  if(!dashActive&&!p.grounded)p.vel[1]-=20*DT;
  if(p.launchTicks>0)p.launchTicks--;
  p.pos[0]+=p.vel[0]*DT;p.pos[1]+=dashActive?0:p.vel[1]*DT;p.pos[2]+=p.vel[2]*DT;
  // The bell tower has a solid 2m base on the top tier; it cannot be climbed.
  if(this.night===3&&p.pos[1]>=6&&Math.hypot(p.pos[0],p.pos[2])<2){
   p.pos[0]=previousPos[0];p.pos[2]=previousPos[2];
  }
  if(p.pos[1]<-10){this.fall();return;}
  const ground=floorUnderFeet(p.pos,this.night);
  if(ground!==null&&p.vel[1]<=0&&p.pos[1]<=ground){
   p.pos[1]=ground;p.vel[1]=0;p.grounded=true;p.launchTicks=0;
  }else p.grounded=false;
  if(ground===null&&p.pos[1]<-10)this.fall();
 }
 fall(){
  const p=this.player;
  if(p.falling)return;
  p.falling=true;p.flames--;const lost=p.carried;p.carried=0;
  this.event('player_hit',{by:'fall',flames:p.flames,dropped:0,lost});
  if(p.flames<=0)return;
  p.respawnTicks=60;p.vel=[0,0,0];
 }
 pickup(){
  const p=this.player;
  for(let i=this.motes.length-1;i>=0;i--){
   if(p.carried>=this.capacity)break;
   const mote=this.motes[i];
   if(mote.pickableAfter&&this.simTick<mote.pickableAfter)continue;
   if(dist(p.pos,mote.pos)<=1+1e-9&&Math.abs(p.pos[1]-mote.pos[1])<=1.5+1e-9){
    this.motes.splice(i,1);p.carried++;this.event('mote_picked',{carried:p.carried});
   }
  }
  for(const charm of this.charms){
   if(charm.available&&dist(p.pos,charm.pos)<=1+1e-9&&Math.abs(p.pos[1]-charm.pos[1])<=1.5+1e-9){
    charm.available=false;charm.respawnTicks=2700;p.charmTicks=600;
    this.event('charm_picked',{charm_id:charm.id,charm_ticks:600});
   }
  }
 }

 get capacity(){return Math.min(TUNING.capacity_max,TUNING.carry_capacity+2*this.player.successfulLights);}
 isSafe(l){return l.lit&&l.fuelUnits>=TUNING.low_fuel_threshold*60;}
 lanternOut(l){
  if(!l.lit)return;
  l.lit=false;l.fuelUnits=0;l.deposited=0;
  this.event('lantern_out',{lantern_id:l.id});
 }
 updateFuel(){
  // Exact sixtieth-unit arithmetic: one base unit plus five per drainer per tick.
  for(const l of this.lanterns){
   if(!l.lit)continue;
   const draining=this.shades.filter(s=>s.state==='drain'&&
     s.target_lantern_id===l.id&&s.stunTicks<=0&&
     l.fuelUnits<1800&&dist(s.pos,l.pos)<=2+1e-9);
   l.fuelUnits=Math.max(0,l.fuelUnits-1-5*draining.length);
   for(const shade of draining){
    shade.drainTicks++;
    if(shade.drainTicks%60===0)
     this.event('fuel_drain',{lantern_id:l.id,shade_id:shade.id,fuel:Math.round(l.fuelUnits/6)/10});
   }
   if(l.fuelUnits<=0)this.lanternOut(l);
  }
 }
 deposit(){
  const p=this.player;
  const options=this.lanterns.filter(l=>(!l.lit||l.fuelUnits<6000)&&dist(p.pos,l.pos)<=2+1e-9)
   .sort((a,b)=>dist(a.pos,p.pos)-dist(b.pos,p.pos)||a.id.localeCompare(b.id));
  if(!options.length||p.carried===0)return;
  const l=options[0];
  if(l.lit){
   const amount=Math.min(p.carried,Math.ceil((6000-l.fuelUnits)/600));
   if(amount<=0)return;
   p.carried-=amount;l.fuelUnits=Math.min(6000,l.fuelUnits+600*amount);
   this.score+=amount*5;
   this.event('refuel',{lantern_id:l.id,amount,fuel:Math.round(l.fuelUnits/6)/10});
   if(this.isSafe(l))for(const shade of this.shades){
    if(dist(shade.pos,l.pos)<6){
     shade.safePushTicks=Math.max(shade.safePushTicks,30);
     if(shade.state==='drain'){shade.state='wander';shade.target_lantern_id=null;shade.drainTicks=0;}
    }
   }
   return;
  }
  const cost=l.ever_lit?5:10;
  const amount=Math.min(p.carried,cost-l.deposited);
  if(amount<=0)return;
  p.carried-=amount;l.deposited+=amount;this.score+=amount*5;
  this.event('deposit',{lantern_id:l.id,amount,deposited:l.deposited});
  if(l.deposited>=cost){
   const relight=l.ever_lit;l.lit=true;l.ever_lit=true;l.fuelUnits=6000;
   if(relight)l.relit_count++;
   p.successfulLights++;
   this.score+=relight?40:100;
   this.event('lantern_lit',{lantern_id:l.id,relight});
  }
 }
 updateSafeZones(){
  const lit=this.lanterns.filter(l=>this.isSafe(l));
  for(const shade of this.shades){
   const close=lit.find(l=>dist(shade.pos,l.pos)<6);
   if(close&&!shade.safePushTicks)shade.safePushTicks=30;
  }
 }
 pulse(){
  const p=this.player;
  if(p.carried<3||p.pulseCd>0)return;
  p.carried-=3;p.pulseCd=180;
  const stunned=[],origin=[p.pos[0],p.pos[1]+.8,p.pos[2]];
  for(const s of this.shades){
   if(dist3(origin,s.pos)<=5+1e-9){
    const wasDraining=s.state==='drain';
    s.state='stunned';s.target_lantern_id=null;s.drainTicks=0;
    s.stunTicks=121;s.pushTicks=15;
    s.pushDir=unit(s.pos[0]-p.pos[0],s.pos[2]-p.pos[2]);
    stunned.push(s.id);this.score+=wasDraining?15:5;
   }
  }
  for(const d of this.drifters){
   if(dist3(origin,d.pos)>5||d.state==='removed')continue;
   if(d.state==='chase'){d.state='flee';d.ttl=240;d.stolen=0;}
   else if(d.state==='flee'&&d.stolen){
    const amount=d.stolen;d.stolen=0;this.dropMotes(amount,d.pos);
    d.ttl=Math.min(d.ttl||240,120);this.event('drifter_drop',{drifter_id:d.id,amount});
   }
  }
  this.event('pulse',{stunned_ids:stunned});
 }
 dropMotes(count,center){
  for(let i=0;i<count;i++){
   const a=this.random()*Math.PI*2,r=1.5+this.random();
   const candidate=[center[0]+r*Math.cos(a),center[1]||0,center[2]+r*Math.sin(a)];
   const m=this.makeMote(candidate,'dropped',480);m.pickableAfter=this.simTick+1;this.motes.push(m);
  }
 }
 updateShades(ignorePlayer=false){
  const p=this.player;
  for(const s of this.shades){
   if(s.spawnTicks>0){s.spawnTicks--;s.state=s.spawnTicks?'spawning':'wander';continue;}
   if(s.safePushTicks>0){
    const nearest=this.lanterns.filter(l=>this.isSafe(l)).sort((a,b)=>dist(a.pos,s.pos)-dist(b.pos,s.pos))[0];
    if(nearest&&dist(s.pos,nearest.pos)<6){
     const d=dist(nearest.pos,s.pos);
     const dir=unit(s.pos[0]-nearest.pos[0],s.pos[2]-nearest.pos[2]);
     shift(s.pos,dir,Math.min(6-d,6/Math.max(1,s.safePushTicks)));
    }
    s.safePushTicks--;
    if(!s.safePushTicks)for(const l of this.lanterns.filter(l=>this.isSafe(l))){
     if(dist(s.pos,l.pos)<6){
      const v=unit(s.pos[0]-l.pos[0],s.pos[2]-l.pos[2]);
      shift(s.pos,v,6-dist(s.pos,l.pos));
     }
    }
    continue;
   }
   if(s.pushTicks>0){
    const next=[...s.pos];shift(next,s.pushDir,4/15);
    if(withinMap(next,this.night)&&this.lanterns.every(l=>!this.isSafe(l)||dist(next,l.pos)>=6))
     s.pos=next;
    s.pushTicks--;
   }
   if(s.stunTicks>0){
    s.stunTicks--;s.state=s.stunTicks?'stunned':'wander';
    if(!s.stunTicks)s.target_lantern_id=null;
    continue;
   }
   if(s.recoilTicks>0){
    s.recoilTicks--;s.state=s.recoilTicks?'recoil':'wander';
    const next=[...s.pos];shift(next,s.recoilDir??[1,0],2/60);
    if(withinMap(next,this.night))s.pos=next;
    continue;
   }
   const distance=ignorePlayer?Infinity:dist(s.pos,p.pos);
   if(s.state==='drain'){
    const l=this.lanterns.find(l=>l.id===s.target_lantern_id);
    if(distance<6){s.state='chase';s.target_lantern_id=null;s.drainTicks=0;}
    else if(!l||!l.lit||l.fuelUnits>=1800||dist(s.pos,l.pos)>2+1e-9){
     s.state='wander';s.target_lantern_id=null;s.drainTicks=0;
    }else continue;
   }
   if(s.state==='chase'&&distance>=18)s.state='wander';
   if(s.state!=='chase'&&distance<=12)s.state='chase';
   const speed=this.map.shadeSpeed;
   let dir;
   if(s.state==='chase'){
    s.target_lantern_id=null;
    dir=unit(p.pos[0]-s.pos[0],p.pos[2]-s.pos[2]);
   }else{
    // Only wander shades are attracted by weak lamps; a tie chooses the smaller ID.
    const weak=this.lanterns.filter(l=>l.lit&&l.fuelUnits<1800);
    const candidates=weak.length?weak:this.lanterns.filter(l=>!l.lit);
    const goal=candidates.sort((a,b)=>dist(s.pos,a.pos)-dist(s.pos,b.pos)||a.id.localeCompare(b.id))[0];
    s.target_lantern_id=goal?.id??null;
    if(goal&&goal.lit&&dist(s.pos,goal.pos)<=2+1e-9){
     s.state='drain';s.drainTicks=0;continue;
    }
    if(goal)dir=unit(goal.pos[0]-s.pos[0],goal.pos[2]-s.pos[2]);
    else {
     if(this.simTick%120===0)s.heading=this.random()*Math.PI*2;
     dir=[Math.cos(s.heading),Math.sin(s.heading)];
    }
    s.state='wander';
   }
   const next=[...s.pos];shift(next,dir,speed*DT);
   if(withinMap(next,this.night)&&this.lanterns.every(l=>!this.isSafe(l)||dist(next,l.pos)>=6))
    s.pos=next;
   else if(s.state==='wander')s.heading+=Math.PI/2;
  }
 }
 updateDrifters(){
  const p=this.player;
  for(const d of this.drifters){
   if(d.state==='removed')continue;
   if(d.state==='flee'){
    d.ttl=Math.max(0,d.ttl-1);
    const dir=unit(d.pos[0]-p.pos[0],d.pos[2]-p.pos[2]);
    shift(d.pos,dir,7*DT);
    if(!d.ttl)d.state='removed';
   }else{
    if(p.carried>=5&&dist(d.pos,p.pos)<=15)d.state='chase';
    else d.state='idle';
    const dir=d.state==='chase'?unit(p.pos[0]-d.pos[0],p.pos[2]-d.pos[2]):
     [Math.cos(d.heading),Math.sin(d.heading)];
    shift(d.pos,dir,(d.state==='chase'?7:2)*DT);
    if(this.simTick%180===0)d.heading+=Math.PI/3;
   }
  }
  this.drifters=this.drifters.filter(d=>d.state!=='removed');
 }
 drifterContacts(){
  const p=this.player;
  for(const d of this.drifters){
   if(d.state!=='chase'||dist(p.pos,d.pos)>1.2+1e-9)continue;
   const amount=Math.min(3,p.carried);
   p.carried-=amount;d.stolen=amount;d.state='flee';d.ttl=240;
   this.event('drifter_steal',{drifter_id:d.id,amount,carried:p.carried});
  }
 }
 shadeContacts(){
  const p=this.player;
  if(p.invuln>0||p.falling)return;
  const sorted=[...this.shades].sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
  for(const s of sorted){
   if(['stunned','spawning','recoil','drain'].includes(s.state)||s.safePushTicks>0)continue;
   if(this.lanterns.some(l=>this.isSafe(l)&&dist(p.pos,l.pos)<=6))continue;
   if(dist(s.pos,p.pos)>1+1e-9||Math.abs(s.pos[1]-p.pos[1])>1.5+1e-9)continue;
   p.flames--;const dropped=Math.floor(p.carried/2);p.carried-=dropped;
   this.dropMotes(dropped,p.pos);p.invuln=90;
   s.state='recoil';s.recoilTicks=60;
   s.recoilDir=unit(s.pos[0]-p.pos[0],s.pos[2]-p.pos[2]);
   this.event('player_hit',{by:'shade',flames:p.flames,dropped});
   break; // at most one loss of a flame per gameplay tick
  }
 }
 snapshot(){
  const p=this.player;
  const pos=x=>x.map(exact);
  return {
   type:'snapshot',tick:this.tick,sim_tick:this.simTick,state:this.state,night:this.night,
   time_left_s:exact(this.timeLeft),score:this.score,
   wind:{active:this.wind.active,dir_deg:this.wind.dir_deg},
   player:{
    pos:pos(p.pos),vel:pos(p.vel),flames:p.flames,carried:p.carried,grounded:p.grounded,
    invuln:p.invuln,dash_cd_s:exact(p.dashCd*DT),pulse_cd_s:exact(p.pulseCd*DT),
    charm_s:exact(p.charmTicks*DT),capacity:this.capacity
   },
   lanterns:this.lanterns.map(l=>({id:l.id,pos:pos(l.pos),lit:l.lit,deposited:l.deposited,fuel:Math.round(l.fuelUnits/6)/10,ever_lit:l.ever_lit,relit_count:l.relit_count})),
   shades:this.shades.map(s=>({id:s.id,pos:pos(s.pos),state:s.state})),
   motes_active:this.motes.length,
   motes:this.motes.map(m=>({id:m.id,pos:pos(m.pos),kind:m.kind,ttl_s:m.kind==='dropped'?exact(m.ttl*DT):null})),
   drifters:this.drifters.map(d=>({id:d.id,pos:pos(d.pos),state:d.state,stolen:d.stolen})),
   charms:this.charms.map(c=>({id:c.id,available:c.available,respawn_s:exact(c.respawnTicks*DT)}))
  };
 }
 end(){return {type:'end',ticks:this.tick,state:this.state,score:this.score};}
}
export function runSimulation(options,{ticks,snapshotEvery=10}={}){
 check(integer(ticks)&&ticks>=0,'ticks must be a non-negative integer');
 check(integer(snapshotEvery)&&snapshotEvery>0,'snapshot-every must be positive integer');
 const game=new Game(options),out=[game.snapshot()];
 while(game.tick<ticks&&!['won','lost'].includes(game.state)){
  const events=game.step();out.push(...events);
  if(game.tick%snapshotEvery===0||['won','lost'].includes(game.state))out.push(game.snapshot());
 }
 out.push(game.end());
 return out;
}
