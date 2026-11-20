# Phase 2 — Verification and evidence

Run from the repository root:

```bash
npm --prefix web ci
npm --prefix web test
npm --prefix web run build
node scripts/verify.mjs
```

Actual Phase 2 results on Windows, 2026-11-20:

- **22 / 22** Node unit/scenario tests passed on latest run.
- **PASS:** production TypeScript/Vite build (nonblocking 500 KB bundle warning).
- **PASS:** byte-identical deterministic JSONL for each night, scenario event assertions for dash, pause, charm, drifter, lantern.
- **PASS:** night-3 21,600-tick headless benchmark from local script in approximately **160ms**. Environment: Windows + Node.js 24.14.1; no GPU used.
- Real Chrome software-WebGL smoke screenshots: `browser-night2.png`, `browser-night3.png`. They show rendering but **do not prove 30 FPS** on a hardware GPU.
- Additional real CLI output traces: `dash.jsonl`, `pause.jsonl`, `charm.jsonl`, `drifter.jsonl`, `wind.jsonl`, `lantern-win.jsonl`, `night1-map.jsonl`, `night2-map.jsonl`, `night3-map.jsonl`.
- Each corresponding input JSON is in `web/tests/scenarios/phase-2/`.

If a scenario expected event is absent or behavior differs, fix code and regenerate output. Do not edit evidence by hand. Review `docs/spec/phase-2.md` for exact requirement-to-evidence traceability and outstanding validation.
