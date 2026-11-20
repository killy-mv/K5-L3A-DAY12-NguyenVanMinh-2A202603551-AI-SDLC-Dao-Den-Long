import * as THREE from 'three';
import {Game} from './core/game.js';

type BenchView={
 game:Game;camera:THREE.PerspectiveCamera;renderer:THREE.WebGLRenderer;scene:THREE.Scene;
 shades:Map<string,THREE.Group>;motes:Map<string,THREE.Group>;
};
function rng(seed:number){
 let x=seed>>>0;
 return ()=>{x=(x+0x6D2B79F5)>>>0;
  let t=Math.imul(x^(x>>>15),1|x);t^=t+Math.imul(t^(t>>>7),61|t);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
export function makeBenchmark(seed:number, duration:number){
 const random=rng(seed),shades=[],motes=[];
 for(let i=0;i<200;i++){
  const a=random()*Math.PI*2,r=12+26*Math.sqrt(random());
  shades.push({id:'S'+(i+1),pos:[r*Math.cos(a),1,r*Math.sin(a)],state:'wander'});
 }
 for(let i=0;i<100;i++){
  const a=random()*Math.PI*2,r=2+36*Math.sqrt(random());
  motes.push([r*Math.cos(a),0,r*Math.sin(a)]);
 }
 const scenario={random_motes:false,random_shades:false,random_drifters:false,
  motes,shades,lanterns:[{id:'L1',lit:true,fuel:100},{id:'L2',lit:true,fuel:100},
  {id:'L3',lit:true,fuel:100}]};
 const game=new Game({night:1,seed,scenario} as any);
 let first=-1,last=-1,measure=-1,finished=false,elapsed=0;
 const intervals:number[]=[];
 function frame(now:number,v:BenchView){
  if(finished)return;
  if(first<0){first=now;last=now;measure=now+3000;}
  const dt=Math.min(.1,Math.max(0,(now-last)/1000));
  const angle=2*Math.PI*(now-first)/15000;
  v.camera.position.set(30*Math.cos(angle),15,-30*Math.sin(angle));
  v.camera.lookAt(0,0,0);
  // Use the normal shade wander state machine, in fixed 60 Hz steps, with
  // player aggro disabled for the prescribed stationary player benchmark.
  // No combat, pickups, spawning, fuel decay, or game-over can occur.
  elapsed+=dt;
  while(elapsed>=1/60){
   game.simTick++;game.updateShades(true);
   elapsed-=1/60;
  }
  for(const shade of game.shades)
   v.shades.get(shade.id)?.position.set(shade.pos[0],shade.pos[1],shade.pos[2]);
  for(const mote of game.motes){
   const mesh=v.motes.get(mote.id);
   if(mesh)mesh.position.y=.6+.2*Math.sin(now*.002+mote.pos[0]);
  }
  v.renderer.render(v.scene,v.camera);
  if(now>=measure){
   if(last>=measure)intervals.push(now-last);
   if(now>=measure+duration*1000){
    finished=true;
    const samples=intervals.filter(x=>x>0&&Number.isFinite(x));
    const sum=samples.reduce((a,b)=>a+b,0);
    const sorted=[...samples].sort((a,b)=>a-b);
    const largest=[...samples].sort((a,b)=>b-a);
    const k=Math.max(1,Math.ceil(samples.length*.01));
    (window as any).__benchmarkOutput={
     avg_fps:1000*samples.length/sum,
     p1_low_fps:1000/(largest.slice(0,k).reduce((a,b)=>a+b,0)/k),
     frame_ms_p95:sorted[Math.max(0,Math.ceil(.95*samples.length)-1)],
     frames:samples.length,
     first_frame_epoch_ms:performance.timeOrigin+first,
     measured_ms:sum,
     scene:{shades:game.shades.length,motes:game.motes.length,
      lit:game.lanterns.filter((l:any)=>l.lit).length,
      seed,viewport:[innerWidth,innerHeight]}
    };
   }
  }
  last=now;
 }
 return {game,frame};
}
