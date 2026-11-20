#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from './web-server.mjs';
import {readLeaderboard} from './leaderboard.mjs';
const args=process.argv.slice(2);
if(args[0]==='--export-leaderboard'){
 if(args.length!==2){console.error('Usage: node scripts/run.mjs --export-leaderboard out.json');process.exit(2);}
 const out=path.resolve(args[1]);fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(readLeaderboard(),null,2)+'\n');
 console.log('Wrote leaderboard:',out);process.exit(0);
}
if(args.length&&!(args.length===2&&args[0]==='--port'&&/^\d+$/.test(args[1]))){
 console.error('Usage: node scripts/run.mjs [--port 4173] | --export-leaderboard out.json');
 process.exit(2);
}
const port=args.length?Number(args[1]):Number(process.env.PORT||4173);
createServer().listen(port,'127.0.0.1',()=>{
 console.log('Đảo Đèn Lồng: http://127.0.0.1:'+port+'/');
});
