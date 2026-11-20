#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { runSimulation } from './core/game.js';

function parseArgs(args) {
  const out = { seed: 1, night: 1, snapshotEvery: 10 };
  const map = { '--seed': 'seed', '--night': 'night', '--scenario': 'scenario', '--inputs': 'inputs',
    '--ticks': 'ticks', '--out': 'out', '--snapshot-every': 'snapshotEvery' };
  for (let i = 0; i < args.length; i++) {
    const k = map[args[i]];
    if (!k || i + 1 >= args.length) throw new TypeError('Invalid or incomplete argument: ' + args[i]);
    const v = args[++i];
    if (['seed', 'night', 'ticks', 'snapshotEvery'].includes(k)) {
      if (!/^-?\d+$/.test(v) || !Number.isSafeInteger(Number(v))) throw new TypeError(k + ' must be integer');
      out[k] = Number(v);
    } else out[k] = v;
  }
  if (!Number.isSafeInteger(out.ticks) || out.ticks < 0 || !out.out || ![1,2,3].includes(out.night))
    throw new TypeError('Required: --night 1|2|3 --ticks <nonnegative int> --out <file.jsonl>');
  if (!Number.isSafeInteger(out.snapshotEvery) || out.snapshotEvery < 1)
    throw new TypeError('--snapshot-every must be a positive integer');
  return out;
}
function readJson(filename, label) {
  try { return JSON.parse(fs.readFileSync(filename, 'utf8')); }
  catch (error) { throw new TypeError('Invalid ' + label + ' file: ' + error.message); }
}
function main() {
  try {
    const opts = parseArgs(process.argv.slice(2));
    const scenario = opts.scenario ? readJson(opts.scenario, 'scenario') : undefined;
    const inputs = opts.inputs ? readJson(opts.inputs, 'inputs') : undefined;
    const rows = runSimulation({ seed: opts.seed, night: opts.night, scenario, inputs },
      { ticks: opts.ticks, snapshotEvery: opts.snapshotEvery });
    fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
    fs.writeFileSync(opts.out, rows.map(x => JSON.stringify(x)).join('\n') + '\n');
  } catch (error) {
    console.error(error.message);
    process.exitCode = error instanceof TypeError ? 2 : 1;
  }
}
main();
