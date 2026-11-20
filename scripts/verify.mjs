import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const cli=path.resolve('web/src/headless.mjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'dao-den-long-'));
try {
 const out1=path.join(root,'first.jsonl'),out2=path.join(root,'second.jsonl');
 const args=['--seed','42','--night','1','--ticks','240','--out',out1,'--snapshot-every','10'];
 let first=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
 assert.equal(first.status,0,first.stderr);
 let second=spawnSync(process.execPath,[cli,...args.map(x=>x===out1?out2:x)],{encoding:'utf8'});
 assert.equal(second.status,0,second.stderr);
 assert.equal(fs.readFileSync(out1,'utf8'),fs.readFileSync(out2,'utf8'),'Determinism failed');
 const lines=fs.readFileSync(out1,'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(lines[0].type,'snapshot');
 assert.equal(lines[0].tick,0);
 assert.equal(lines.at(-1).type,'end');
 assert.equal(lines.at(-1).ticks,240);
 assert.equal(lines.at(-2).tick,240);
 const contract=JSON.parse(fs.readFileSync('game.contract.json','utf8'));
 assert.equal(contract.contract_version,'1.0');
 console.log('PASS: CLI exit 0, initial snapshot, JSONL end, 240 ticks, deterministic output, contract v1.0');
} finally { fs.rmSync(root,{recursive:true,force:true}); }
