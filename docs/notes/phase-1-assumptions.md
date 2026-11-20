# Phase 1 — PRD-0 assumptions (2026-11-20)

The PRD leaves many numeric thresholds unspecified. The following values are design decisions, all disclosed in game.contract.json: movement 6 m/s; capacity 8; lantern requires 5 motes; interact distance 3 m; pickup 1.2 m; pulse consumes 2 motes and affects shades within 5 m; night duration 300 s; 3 flames; invulnerability 1.5 s; 50% of carried motes dropped on a hit (rounded down); stun 2.5 s; push 2.8 m; pulse cooldown 1.5 s; lit lantern safe radius 4 m; shade movement 2.2 m/s, hit radius 1 m; falling disabled (island edge blocks movement).

- All distance checks use horizontal XZ distances and are inclusive.
- A lantern lights once 5 motes have been deposited; partial deposits persist. Interact is triggered on a false-to-true edge.
- Pulse is triggered on an input edge, spends motes only if affordable and off cooldown, and only stuns active shades within range.
- A hit removes one flame. Dropped motes return to the map near the player (unless zero). After loss of all flames, game ends immediately.
- Win after all 5 lanterns are lit; loss on zero flames or dawn. On win add floor(time remaining in seconds)*2 and remaining flames*50 as end bonus.
- The island has a solid invisible boundary at radius 24 m; jumping does not change planar pickup / interaction distances.
- Pulse cost and the lantern cost use the same carried-mote resource; render-only embellishments don't affect headless.
- Night 1 is the only phase-1 stage. Scene and shader decorations are not gameplay entities.
- Tick events are emitted before the optional snapshot at the resulting tick. Snapshot at tick 0 is emitted before any input.
- A scenario's time_left_s overrides the normal initial timer and decreases by 1/60 per executed step.
- All generated placements and identifiers are seeded; no ambient randomness in core logic.
