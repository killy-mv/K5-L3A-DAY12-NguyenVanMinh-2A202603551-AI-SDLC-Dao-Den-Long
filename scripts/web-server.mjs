import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {readLeaderboard,addEntry} from './leaderboard.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web/dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png',
 '.ico':'image/x-icon','.svg':'image/svg+xml','.woff2':'font/woff2'};
export function createServer({allowScores=true}={}){
 return http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const reply=(status,value)=>{
   res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
   res.end(JSON.stringify(value));
  };
  if(url.pathname==='/api/leaderboard'&&allowScores){
   if(req.method==='GET'){try{reply(200,readLeaderboard())}catch(e){reply(500,{error:e.message})}return;}
   if(req.method==='POST'){
    let data='';
    try{
     for await(const chunk of req){data+=chunk;if(data.length>10000)throw new TypeError('Request too large');}
     reply(200,addEntry(JSON.parse(data)));
    }catch(e){reply(400,{error:e.message});}
    return;
   }
   reply(405,{error:'Method not allowed'});return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){reply(405,{error:'Method not allowed'});return;}
  const name=decodeURIComponent(url.pathname);
  const normalized=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!normalized.startsWith(root+path.sep)&&normalized!==root){reply(403,{error:'Forbidden'});return;}
  try {
   const stat=fs.statSync(normalized);
   if(!stat.isFile())throw Error('File not found');
   res.writeHead(200,{'Content-Type':types[path.extname(normalized)]??'application/octet-stream',
    'Cache-Control':'no-cache','Content-Length':stat.size});
   if(req.method==='HEAD')res.end();else fs.createReadStream(normalized).pipe(res);
  }catch{reply(404,{error:'Not found'});}
 });
}
