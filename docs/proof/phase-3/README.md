# Phase 3 evidence — Đèn cạn dầu / Contract v1.2

This folder contains **actual local outputs**, not manually written sample JSONL. All tests can be reproduced using Node.js 24+ on macOS/Linux/Windows without GPU.

## Reproduce

Run at the repository root:

```bash
npm --prefix web ci
npm --prefix web test
npm --prefix web run build
node scripts/verify.mjs
```

The production Vite/TypeScript build and 41 Node tests passed on the 2026-11-20 Windows run. `scripts/verify.mjs` independently launches CLI processes twice per case and compares generated JSONL byte-for-byte. It verifies Contract v1.2, all three maps, event names, six Phase 3 transition scenarios and the Night-3 18,000-tick benchmark (about 184ms on tested Windows/Node 24 environment, well below 30 seconds).

## Evidence index

| File | Expected evidence | Source scenario |
|---|---|---|
| `fuel-decay.jsonl` | initial 100 fuel becomes 98 after 120 steps | `fuel-decay.json` |
| `drain.jsonl` | weak lantern loses natural+shade drain; `fuel_drain` at tick 60 | `drain.json` |
| `extinguish.jsonl` | `lantern_out` at tick 60, fuel 0, deposited reset | `extinguish.json` |
| `refuel.jsonl` | `refuel` event, amount 3, fuel 100, score +15 | `refuel.json`, `interact-inputs.json` |
| `relight.jsonl` | `lantern_lit.relight=true`, capacity increase to 12 | `relight.json`, `interact-inputs.json` |
| `dawn-win.jsonl` | at final tick with 3/5 lit, `game_over.reason=dawn_survived` | `dawn-win.json` |
| `dawn-loss.jsonl` | at final tick with only 2/5 lit, `game_over.reason=dawn` | `dawn-loss.json` |
| `browser-night1.png` | Chrome software-WebGL image with one low-fuel, one high-fuel, and one extinguished lantern | browser `?autoplay=1&visual-proof=1` |
| `browser-night2.png`, `browser-night3.png` | Chrome render smoke tests for later worlds | browser `?autoplay=N&visual-proof=1` |
| `browser-colorblind.png` | Browser visual accessibility smoke | browser `?autoplay=1&visual-proof=1&colorblind=1` |

The JSON scenario definitions and input frames are under `web/tests/scenarios/phase-3/`. Use, e.g.:

```bash
node web/src/headless.mjs --seed 11 --night 1 --scenario web/tests/scenarios/phase-3/drain.json --ticks 60 --out drain-test.jsonl --snapshot-every 30
```

## Traceability to TICKET-03

- Fuel and refuel arithmetic, off/re-light, capacity and score: `web/tests/phase3.test.mjs`, `game.contract.json`, JSONL above.
- Safe-zone loss when fuel below 30, shade target/drain/exit behavior and pulse bonus: `phase3.test.mjs`, `drain.jsonl`.
- Dawn thresholds 3/5, 4/6, 5/7 and no early all-lit victory: dedicated tests and `dawn-win.jsonl` / `dawn-loss.jsonl`.
- Colorblind mode, fuel bar and visual distinction: `web/src/main-v12.ts`, `style-v12.css`, browser screenshots.
- Design rationale: `docs/adr/0003-lantern-fuel-and-dawn.md`; compatibility changes: `CHANGELOG.md`.

## Limitations

- Chrome images were captured by real Chrome using **software WebGL**, not a 30-FPS benchmark on a physical GPU.
- No full human-driven playthrough of all three nights is claimed. UI settings persistence, extensive camera angles and actual mouse/keyboard feel need manual acceptance.
- Hidden tests are not visible; only the documented contract and supplied test cases have been checked.
- A visual-proof URL is an explicitly opt-in **browser scene**; headless CLI and normal gameplay are unchanged.
