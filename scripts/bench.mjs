#!/usr/bin/env node
// Actual Chromium+Three.js requestAnimationFrame measurements via Chrome DevTools.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {createServer} from './web-server.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function parse(argv){
 const o={seed:42,duration:30,out:null};
 for(let i=0;i<argv.length;i+=2){
  if(!argv[i+1])throw new TypeError('Missing '+argv[i]);
  if(argv[i]==='--seed')o.seed=Number(argv[i+1]);
  else if(argv[i]==='--duration')o.duration=Number(argv[i+1]);
  else if(argv[i]==='--out')o.out=argv[i+1];
  else throw new TypeError('Unknown argument '+argv[i]);
 }
 if(!Number.isSafeInteger(o.seed)||!Number.isFinite(o.duration)||o.duration<=0||o.duration>300||!o.out)
  throw new TypeError('Usage: node scripts/bench.mjs --seed 42 --duration 30 --out bench.json');
 return o;
}
async function freePort(){
 const sock=net.createServer();
 await new Promise((res,rej)=>sock.once('error',rej).listen(0,'127.0.0.1',res));
 const port=sock.address().port;
 await new Promise(res=>sock.close(res));
 return port;
}
async function connect(debugPort,timeout=18000){
 const started=Date.now();
 while(Date.now()-started<timeout){
  try{
   const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list');
   const pages=await response.json();
   const page=pages.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
   if(page)return page.webSocketDebuggerUrl;
  }catch{}
  await sleep(300);
 }
 throw Error('Chrome DevTools did not become available within '+timeout+'ms');
}
async function cdp(wsUrl){
 const ws=new WebSocket(wsUrl),pending=new Map();let serial=0;
 await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});
  ws.addEventListener('error',reject,{once:true});
 });
 ws.addEventListener('message',event=>{
  const msg=JSON.parse(event.data);
  if(!pending.has(msg.id))return;
  const [resolve,reject]=pending.get(msg.id);pending.delete(msg.id);
  if(msg.error)reject(Error(msg.error.message));
  else resolve(msg.result);
 });
 return {
  send(method,params={}){
   return new Promise((resolve,reject)=>{
    const id=++serial;pending.set(id,[resolve,reject]);
    ws.send(JSON.stringify({id,method,params}));
   });
  },
  close(){ws.close();}
 };
}
async function main({seed,duration,out}){
 const startEpoch=Date.now(),server=createServer({allowScores:false});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+
  '/?benchmark=1&seed='+seed+'&duration='+duration;
 const debuggerPort=await freePort();
 const userDir=fs.mkdtempSync(path.join(os.tmpdir(),'ddl-bench-chrome-'));
 const chrome=process.env.CHROME_PATH||
  (process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'google-chrome');
 const flags=['--no-first-run','--no-default-browser-check','--disable-extensions',
  '--disable-gpu-sandbox','--enable-unsafe-swiftshader','--disable-gpu-vsync',
  '--disable-frame-rate-limit','--remote-allow-origins=*','--disable-background-timer-throttling',
  '--remote-debugging-port='+debuggerPort,'--user-data-dir='+userDir,
  '--window-size=1280,720','--app='+url];
 // Leave visible by default for actual on-screen benchmarking. --headless is
 // only an opt-in environmental override for CI or remote systems.
 if(process.env.BENCH_HEADLESS==='1')flags.unshift('--headless=new');
 const child=spawn(chrome,flags,{stdio:'ignore',windowsHide:false});
 child.on('error',err=>{console.error('Chrome process error:',err.message)});
 let session;
 try{
  const wsUrl=await connect(debuggerPort);
  session=await cdp(wsUrl);
  await session.send('Emulation.setDeviceMetricsOverride',{
   width:1280,height:720,deviceScaleFactor:1,mobile:false
  });
  await session.send('Page.enable');
  const deadline=Date.now()+(duration+35)*1000;
  let value=null;
  while(Date.now()<deadline){
   const result=await session.send('Runtime.evaluate',{
    expression:'JSON.stringify(window.__benchmarkOutput ?? null)',
    returnByValue:true
   });
   if(result.exceptionDetails)throw Error('Browser evaluation error: '+JSON.stringify(result.exceptionDetails));
   const text=result.result?.value;
   if(text&&text!=='null'){value=JSON.parse(text);break;}
   await sleep(500);
  }
  if(!value)throw Error('Benchmark did not finish in allotted time');
  if(value.scene.shades!==200||value.scene.motes!==100||value.scene.lit!==3)
   throw Error('Invalid benchmark scene counts: '+JSON.stringify(value.scene));
  if(value.scene.viewport[0]!==1280||value.scene.viewport[1]!==720)
   throw Error('Viewport is not 1280x720: '+JSON.stringify(value.scene.viewport));
  const report={
   contract_version:'1.3',
   avg_fps:+value.avg_fps.toFixed(2),
   p1_low_fps:+value.p1_low_fps.toFixed(2),
   frame_ms_p95:+value.frame_ms_p95.toFixed(2),
   frames:value.frames,
   load_ms:Math.max(0,Math.round(value.first_frame_epoch_ms-startEpoch)),
   peak_mem_mb:null,
   vsync_off:false,
   renderer:'Three.js 0.181.2 WebGLRenderer, Chromium (vsync disable requested; not verifiable)',
   os:os.platform()+' '+os.release()
  };
  fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  console.log('Rendered scene: '+JSON.stringify(value.scene));
  if(report.avg_fps<60||report.p1_low_fps<30||report.load_ms>10000)
   console.warn('Warning: local benchmark below one or more course thresholds; grading hardware may differ.');
 }finally{
  session?.close();
  child.kill();
  server.close();
  // Windows Chrome may hold SingletonLock briefly after process.kill().
  // A cleanup lock must never invalidate a successfully completed benchmark.
  try { fs.rmSync(userDir,{recursive:true,force:true,maxRetries:3,retryDelay:200}); }
  catch(e){console.warn('Temporary Chrome profile cleanup deferred:',e.code);}
 }
}
try{await main(parse(process.argv.slice(2)))}catch(e){
 console.error('BENCHMARK ERROR:',e.stack??e);
 process.exitCode=e instanceof TypeError?2:1;
}
