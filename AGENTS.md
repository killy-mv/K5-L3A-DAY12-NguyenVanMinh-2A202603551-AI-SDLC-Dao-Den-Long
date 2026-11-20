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
