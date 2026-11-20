# AI usage log — Phase 1

Date: 2026-11-20
Tool: ChatGPT GPT-6 via Bash 2.0 for development and verification.
Task: Implement an original Three.js browser game with reusable deterministic Node.js headless game simulation and tests.
Decision: Share one pure JavaScript simulation core between browser and CLI; keep Three.js render-only; set all tuning explicitly.
Verification: 12/12 Node unit/scenario tests passed; production Vite build passed (bundle size warning only); 240-tick CLI determinism check passed; Chrome headless WebGL gameplay screenshot captured (see docs/proof/phase-1). Full human play-through not yet performed.
Token usage: Exact usage is not exposed by this tool workflow; estimate unavailable (not fabricated).
Review/retro: Found and fixed a Windows file URL path bug in the CLI test and square sprite/glow issue in Chrome rendering. Added a procedural radial glow texture. Full user review pending; no independent reviewer recorded yet.

---

# Phase 2 — Ticket-02

Date: 2026-11-20
Tool: ChatGPT GPT-6 plus Bash 2.0 (Windows machine connector).

Tasks:
- Read Ticket-02 and preserve Phase 1 commit with a dedicated `phase-1` tag.
- Replace v1.0 runtime rules with new pure JS 60Hz v1.1 model; keep a thin re-export entrypoint.
- Update Node CLI, `game.contract.json`, unit/contract tests, scenario fixtures, three-night Three.js frontend, menu, settings, procedural sound, HUD, and docs.
- Run deterministic headless verification and benchmark; capture actual Chrome software-WebGL screenshots for nights 2 and 3.

Observed automated results: 22/22 tests passed, Vite/TypeScript build passed; Phase 2 CLI verification script passed; Night 3 21,600-tick run under 1 second locally.

AI mistakes noticed and corrected:
- Initial Phase 2 renderer TypeScript implicit-any errors (fixed annotations).
- Elevated Night 3 stage was initially a solid cylinder that visually obstructed Mây; changed to a thin upper platform.
- Walking below upper platforms incorrectly snapped Mây up to Y=6; corrected height-aware floor selection.
- Wind forces were initially added to launch velocity each tick, causing accumulation; changed to a position displacement per tick.
- Dash initially still applied the previous vertical velocity in air; frozen vertical displacement for dash duration.

Harness improvement

---

# Phase 2 — Ticket-02

Date: 2026-11-20
Tool: ChatGPT GPT-6 plus Bash 2.0.

Work performed: read Ticket-02, preserved Phase 1 commit/tag; implemented standardized v1.1 60Hz rules, nights 1–3, dash, drifters, charms, platforms, wind, pause, Node CLI, Three.js UI/menus, procedural audio, HUD, settings and scenario-based tests.

Measured results: 22/22 Node tests passed; TypeScript/Vite build passed; three-night deterministic verification passed; night-3 21,600-tick run finished in approximately 160ms on this Windows machine. Chrome headless screenshots captured for nights 2/3.

AI-assisted corrections:
- Fixed TypeScript implicit-any errors in newly added frontend.
- Replaced a solid Night 3 platform (which initially hid the player) with an elevated thin disk; corrected physics so ground-level Mây is not teleported to an overhead tier.
- Fixed wind acceleration accumulation during launch and upward movement during mid-air dash.
- Adjusted scoring contract so per_mote=10 means 10 points per mote deposited, not collected.
- Corrected fall-below-Y=-10 handling even when the foot position is horizontally inside an island.

Harness evolution: new scripts/verify.mjs checks v1.1 contract, deterministic JSONL across three nights, feature events and 21,600-tick performance; CI calls it.

Token/price: exact usage is not exposed by the current connector workflow. No fictitious usage estimate recorded.

Human checks still needed: play all nights end-to-end, confirm settings survive a browser reload, listen to generated audio, measure native-GPU 1280×720 FPS. These are not claimed as completed.
