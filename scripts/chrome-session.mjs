import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createServer} from './web-server.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){
 const sock=net.createServer();
 await new Promise((resolve,reject)=>sock.once('error',reject).listen(0,'127.0.0.1',resolve));
 const port=sock.address().port;
 await new Promise(resolve=>sock.close(resolve));return port;
}
export async function browserSession({headless=true}={}){
 const server=createServer();
 await new Promise(res=>server.listen(0,'127.0.0.1',res));
 const site='http://127.0.0.1:'+server.address().port;
 const remotePort=await freePort();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ddl-browser-test-'));
 const chrome=process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'google-chrome');
 const flags=['--no-first-run','--disable-extensions','--disable-gpu-sandbox',
  '--enable-unsafe-swiftshader','--no-default-browser-check','--remote-allow-origins=*',
  '--remote-debugging-port='+remotePort,'--user-data-dir='+dir,'--window-size=1280,720',
  '--app='+site+'/'];
 if(headless)flags.unshift('--headless=new');
 const proc=spawn(chrome,flags,{stdio:'ignore',windowsHide:false});
 proc.on('error',e=>console.error('Chrome:',e.message));
 let wsURL=null;
 for(let i=0;i<60;i++){
  try{
   const pages=await (await fetch('http://127.0.0.1:'+remotePort+'/json/list')).json();
   wsURL=pages.find(x=>x.type==='page'&&x.webSocketDebuggerUrl)?.webSocketDebuggerUrl;
   if(wsURL)break;
  }catch{}
  await sleep(300);
 }
 if(!wsURL)throw Error('Chrome remote debugging did not initialize');
 const ws=new WebSocket(wsURL);
 await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});
 });
 let serial=0;const pending=new Map();
 ws.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(!pending.has(message.id))return;
  const [resolve,reject]=pending.get(message.id);pending.delete(message.id);
  if(message.error)reject(Error(message.error.message));else resolve(message.result);
 });
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++serial;pending.set(id,[resolve,reject]);
  ws.send(JSON.stringify({id,method,params}));
 });
 await send('Page.enable');
 await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 const navigate=async(route='/')=>{
  await send('Page.navigate',{url:site+route});
  await sleep(900);
 };
 const evaluate=async(expression)=>{
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description??'Browser script exception');
  return result.result?.value;
 };
 return {
  site,send,navigate,evaluate,sleep,
  async screenshot(file){
   const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});
   fs.writeFileSync(file,Buffer.from(result.data,'base64'));
  },
  async close(){
   ws.close();proc.kill();server.close();
   try{fs.rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200});}catch{}
  }
 };
}
