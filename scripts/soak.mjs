#!/usr/bin/env node
// Single-process, ten-night endurance simulation, independent from any browser/GPU.
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {Game} from '../web/src/core/game.js';
import os from 'node:os';

function options(argv){
 const out={seed:7,nights:10,output:null};
 for(let i=0;i<argv.length;i+=2){
  const v=argv[i+1];
  if(v===undefined)throw new TypeError('Missing argument '+argv[i]);
  if(argv[i]==='--seed')out.seed=Number(v);
  else if(argv[i]==='--nights')out.nights=Number(v);
  else if(argv[i]==='--out')out.output=v;
  else throw new TypeError('Unknown argument '+argv[i]);
 }
 if(!Number.isSafeInteger(out.seed)||!Number.isSafeInteger(out.nights)||out.nights<1||!out.output)
  throw new TypeError('Usage: node scripts/soak.mjs --seed 7 --nights 10 --out soak.json');
 return out;
}
function rng(seed){
 let x=seed>>>0;
 return ()=>{x=(x+0x6D2B79F5)>>>0;let t=Math.imul(x^(x>>>15),1|x);
 t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}
function mem(){return Math.round(process.memoryUsage().rss/1048576*100)/100}
function go({seed,nights,output}){
 const start=performance.now();
 const results=[];
 let crashes=0,memStart=0;
 let game=null;
 for(let i=0;i<nights;i++){
  // Seed 7+i, nights 1 -> 2 -> 3 -> 1...
  const night=i%3+1,s=seed+i;
  try {
   game=new Game({night,seed:s});
   if(i===0){
    if(global.gc)global.gc();
    memStart=mem();
   }
   const random=rng(s);let move=[0,0];
   let prev={jump:false,dash:false,pulse:false,interact:false};
   let ticks=0;
   while(game.state==='playing'&&ticks<game.map.duration*60){
    if(ticks%30===0){
     const a=random()*Math.PI*2;
     move=[Math.cos(a),Math.sin(a)];
    }
    // Buttons are independent Bernoulli trials on every tick;
    // the engine itself detects rising edges as in interactive play.
    const jump=random()<.05,dash=random()<.03,pulse=random()<.02,interact=random()<.1;
    const events=game.step({move,jump,dash,pulse,interact});
    prev={jump,dash,pulse,interact};
    ticks++;
    if(!Array.isArray(events))throw Error('Game returned invalid events');
   }
   if(!['won','lost'].includes(game.state))throw Error('Night did not reach a terminal state');
   results.push(game.state);
  }catch(e){
   crashes++;results.push('crashed');console.error('Night '+(i+1)+' crashed:',e.stack??e);
  }
 }
 // Reset final world in same process, then measure RSS.
 game=null;
 if(global.gc){global.gc();global.gc();}
 const memEnd=mem();
 const summary={nights,crashes,results,mem_start_mb:memStart,mem_end_mb:memEnd,
  duration_s:Math.round((performance.now()-start)/100)/10};
 fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n','utf8');
 console.log(JSON.stringify(summary));
 if(crashes>0||memEnd>memStart*1.2)process.exitCode=1;
}
try{go(options(process.argv.slice(2)))}catch(e){
 console.error(e.message);process.exitCode=e instanceof TypeError?2:1;
}
