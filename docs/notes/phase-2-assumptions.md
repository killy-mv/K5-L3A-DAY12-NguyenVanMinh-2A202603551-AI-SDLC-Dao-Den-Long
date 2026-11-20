# Phase 2 assumptions and deviations — Ticket-02, Contract v1.1

The numeric constants, maps, timings, event names, and tick order are taken from Ticket-02, NOT inferred from Phase 1. The former v1.0 assumptions have been preserved in `docs/notes/phase-1-assumptions.md` and Git tag `phase-1`.

- Every 1/60s gameplay step is deterministic. `tick` counts all steps including paused; `sim_tick` counts only active gameplay.
- `score.per_mote=10` means 10 points per mote **deposited**, not picked up. `per_lantern=100` when lit, `per_stun=5` per pulse hit.
- `shade_speed=4` is standard for Nights 1 and 2, with special Night 3 speed of 4.5m/s in MAPS[3].
- v1.1 palette and entity limits are enforced in the pure core where gameplay-facing. Decorative Three.js meshes/sounds do not affect gameplay state or headless output.
- Landing collision chooses the highest valid surface at or below Mây's feet, avoiding teleportation through upper platforms.
- A falling player is detected when feet Y < -10 regardless of lateral island position, and cannot be repeatedly penalized during the same recovery.
- User-selectable audio volume and pointer sensitivity are local display settings, omitted from headless simulation.
- Default generated motes use the map's valid spawn points. User scenario with explicit motes/shades replaces that initial list; future spawning depends on random flags.
- `night_start` is emitted on the first active gameplay step (not when assembling a scenario), preserving the prior contract's no-event rule during scenario setup.
- A pulse target is decided from the 3D distance to the pulse center (player feet +0.8 Y), with a fixed 15-tick horizontal push.
- Full manual end-to-end play and native GPU frame rate are not yet evidenced; only automated logic and software WebGL smoke test were performed.
