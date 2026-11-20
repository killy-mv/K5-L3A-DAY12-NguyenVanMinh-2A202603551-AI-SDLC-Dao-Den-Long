# Phase 1 verification index

The exact commands and outputs are independently reproducible. Evidence is generated from unmodified program output.

| Requirement | Evidence | Status |
|---|---|---|
| CLI, snapshot tick 0, end row, deterministic JSONL | scripts/verify.mjs, npm --prefix web test | Verified automatically |
| 60 Hz movement, yaw, input edges | web/tests/game.test.mjs | Verified automatically |
| Pickup radius, capacity, scores | web/tests/game.test.mjs and pickup.jsonl | Verified automatically |
| Lantern partial deposit, lit state and win | web/tests/game.test.mjs and lantern-win.jsonl | Verified automatically |
| Shade damage / zero-flame loss | web/tests/game.test.mjs | Verified automatically |
| Pulse stun, push, score | web/tests/game.test.mjs | Verified automatically |
| Dawn loss after 60 ticks from 1 second | web/tests/game.test.mjs | Verified automatically |
| Rendering smoke test | Actual Chrome headless WebGL screenshot `browser-gameplay.png`, HTTP 200, rendered Three.js canvas and HUD | Browser smoke verified; full manual play-through still pending |
| Windows, Linux, macOS | Browser smoke checked on Windows; Node-based headless intended cross-platform; Ubuntu CI configured | Linux/macOS runtime not yet verified |

## Reproduce

At repository root:

```bash
npm --prefix web ci
npm --prefix web test
npm --prefix web run build
node scripts/verify.mjs
node web/src/headless.mjs --seed 7 --night 1 --scenario web/tests/scenarios/pickup.json --inputs web/tests/scenarios/move.json --ticks 60 --out docs/proof/phase-1/pickup.jsonl --snapshot-every 10
node web/src/headless.mjs --seed 7 --night 1 --scenario web/tests/scenarios/lantern-win.json --inputs web/tests/scenarios/interact.json --ticks 10 --out docs/proof/phase-1/lantern-win.jsonl --snapshot-every 1
```

Note: A generated JSONL is evidence of actual CLI output, not an assertion about visual presentation. Ensure the Git tag references the exact source used for each output.

## Executed results (Phase 1, 2026-11-20)

- `npm --prefix web test`: 12 passed, 0 failed.
- `npm --prefix web run build`: TypeScript check and Vite build passed; nonblocking warning about 500 KB bundle.
- `node scripts/verify.mjs`: deterministic 240-tick output reproduced twice and matched byte-for-byte.
- Chrome 157 headless + software WebGL screenshot: `browser-gameplay.png` (real rendered frame at 1280×720 using `?autoplay=1`).
- Dev server returned HTTP 200 and Chrome DOM contained a Three.js canvas and game HUD.
- *Not claimed*: a complete human play-through to victory on Windows or runtime verification on macOS/Linux.
