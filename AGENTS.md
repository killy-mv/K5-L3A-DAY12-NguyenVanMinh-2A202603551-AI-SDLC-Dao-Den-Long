# AI development harness — Dao Den Long (Day 12)

- Read README.md and the active phase PRD/Test Contract before writing code; never assume unreleased tickets.
- Source of truth for game rules: web/src/core/game.js; renderer in web/src/main.ts must only display core state.
- Run: npm --prefix web ci && npm --prefix web run build
- Test: npm --prefix web test; headless CLI: node web/src/headless.mjs --seed 1 --night 1 --ticks 60 --out output.jsonl
- Fixed simulation step = 1/60 second. Headless must never import Three.js, DOM or GPU code.
- Keep game.contract.json tuning exactly synchronized with Game TUNING values.
- Every phase: test, verify output and screenshots, log assumptions + AI usage, commit incremental changes; only tag once phase is verified.
- Don't forge test results or alter generated evidence. If a test fails, fix it or document the gap.
- Don't commit secrets, .env or binaries without provenance. All assets currently procedurally generated.
- On changing core logic, re-run unit, scenario, determinism and build checks.

## Phase 2 — Ticket-02 / Contract v1.1

- Pure deterministic engine: `web/src/core/game-v11.js` (re-export from `game.js`). Do not import DOM or Three.js into game logic.
- Browser UI entrypoint: `web/src/main-v11.ts`. Keep all visual additions outside headless simulation.
- Standard numeric tuning in `game.contract.json` must exactly match `TUNING`; Night 3's special 4.5m/s shade speed is held in `MAPS[3]`.
- Before marking a change done, run `npm --prefix web test`, `npm --prefix web run build`, and `node scripts/verify.mjs` at root. Do not commit red tests.
- New test scenarios: `web/tests/scenarios/phase-2`. Evidence: `docs/proof/phase-2`. Acceptance criteria: `docs/spec/phase-2.md`.
- Git history/tag from Phase 1 must remain intact. Never silently disable failed regression tests; explain any revised expectations from Ticket-02.
- Review source, tests and generated evidence separately. Do not claim the 30 FPS requirement has been measured using a software-rendering screenshot.

## Phase 3 — Contract v1.2 / Change Request TICKET-03

- Read `docs/adr/0003-lantern-fuel-and-dawn.md` and `CHANGELOG.md`. They explain why old instant victory, old scoring and old lantern interactions are invalid.
- Gameplay source of truth is now `web/src/core/game-v12.js`; `game.js` re-exports v1.2. `game-v11.js` remains historical, not used by the current build.
- All fuel internal values are integers in sixtieth units, and all timing is fixed 60Hz. Do not use wall clock or DOM APIs in the engine.
- Use `npm --prefix web test` (includes Phase 2 applicable regression plus new Phase 3 tests), `npm --prefix web run build`, `node scripts/verify.mjs`; fail CI if any fail.
- Do not silently skip regression tests. Revised Phase 2 expectations are documented in CHANGELOG (point values, immediate win, contract version). Only replace superseded assertions.
- Evidence source fixtures live in `web/tests/scenarios/phase-3/`, actual JSONL and real Chrome captures in `docs/proof/phase-3/`. Never hand-edit generated outputs.
- Change fuel/score/timing only together with root contract tuning and test updates. Browser colorblind styling/extra visuals must remain headless-independent.

### Active Phase 3 browser paths
- `web/index.html` loads `web/src/main-v12.ts`, which imports `web/src/style-v12.css`. Older v1.1 filename references elsewhere are historical.
