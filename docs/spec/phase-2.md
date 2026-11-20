# Phase 2 — Ticket-02 acceptance criteria (Contract v1.1)

Source: issued "TICKET-02 — Ba hòn đảo", Day 12 AI SDLC Lab. This document maps the requested behavior to code and reproducible checks. It is a specification / progress record, not a substitute for the original ticket.

## Part 1: standardized mechanics

| Requirement | Measurable acceptance criterion | Check |
|---|---|---|
| 60 Hz | 60 steps decrease remaining time by exactly 1 s; pause freezes sim_tick | game.test.mjs |
| Movement | Run 6 m/s, jump initial velocity 7 m/s, gravity -20 m/s², full air input | game.test.mjs (movement); visual manual check pending |
| Dash | 14 m/s for 12 ticks, cooldown 90 ticks, may be used mid-air | dash.jsonl |
| Motes | 20 different starting points, 10 capacity, pickup XZ <=1 and vertical <=1.5, one extra per 240 ticks, 30 cap | game.test.mjs |
| Lanterns | 10 mote requirement, 2m interaction, nearest unlIt lantern, partial deposit persists | lantern-win.jsonl |
| Safe zones | 6m radius, shade cannot enter from outside, shades inside exit within 30 ticks | game.test.mjs |
| Pulse | 3 motes, 3s cooldown; 3D radius 5 about foot+0.8m; stun 120 ticks; push 4m/15 ticks | game.test.mjs |
| Shades | 4m/s night 1/2, 4.5m/s night 3; 12/18m chase thresholds, contact/recoil, scheduled 300+Nk | game.test.mjs; full AI patrol acceptance needs further review |
| Damage / fall | one flame per hit, floor(carried/2) drops for 480 ticks, 90 ticks invulnerability; below -10 loses flame+all motes and respawns after 60 ticks | game.test.mjs |
| Score | +10 for each mote **deposited**, +100 per lit lantern, +5 per stunned shade; time and flames win bonuses | game.test.mjs; game.contract.json score.per_mote=10 applies on deposit |
| Outcome | no_flames beats all_lit beats dawn, evaluated in this order at tick end | game.test.mjs |

**Design disclosure:** The single contract tuning property `shade_speed` is the standard 4m/s; `MAPS[3].shadeSpeed` implements the ticket's 4.5m/s Night 3 override. `score.per_mote=10` is applied during a **deposit**, not pickup.

## Part 2: exact maps

- **Night 1:** radius 40, 5 ticket coordinates, 24 mote spawn locations, 12 shade spawn points, max 6 shades.
- **Night 2:** two radius-28 islands separated by 70m, bridge x=26..44 and |z|<=2, two 1m launch pads, 6 lanterns, max 8 shades.
- **Night 3:** radius 45, elevated half-annulus at y=3, center disk at y=6, two ramps, jump pad, bell tower, 7 lanterns, 30 mote points, 16 shade points, gust each 30s.

Map definitions are in `web/src/core/game-v11.js`; visual geometry is in `web/src/main-v11.ts`. Snapshot maps are in `docs/proof/phase-2/night*-map.jsonl`.

## Part 3: feature acceptance checklist

| Feature | Acceptance criterion | Evidence | Status |
|---|---|---|---|
| Gió Lạc | Night 2/3; D1,D2 spawn every 1200 ticks; chase when carried>=5 and distance<=15m; steal max3 at <=1.2m and flee; pulse interrupts | drifter.jsonl, game.test.mjs | Core tested; full visual play pending |
| Bùa Gió | C1/C2 availability; at pickup 600 ticks, 7.2m/s, no dash cooldown; respawn after 2700 ticks | charm.jsonl, game.test.mjs | Core tested |
| Three-night sequence | Menu -> Ông Đăng intro -> night -> result -> next night -> Bình Minh total score; retry current night on loss | browser-night2.png, browser-night3.png plus UI source | Smoke-tested render; full human sequence pending |
| Pause | Esc/P edge toggles, `tick` advances, `sim_tick` and timer freeze, Resume/Restart/Settings/Menu available | pause.jsonl, game.test.mjs | Core tested; UI manual test pending |
| Settings | Volume and mouse sensitivity persisted after reload | main-v11.ts, localStorage | Implementation present; manual persistence test pending |
| Audio | Original ambient chord and cues for mote, lantern, pulse, hit, jump, dash, win, loss, spawn, countdown | main-v11.ts | Implemented; audible manual check pending |
| HUD | Top flame/time/score/lamps, 10 mote slots, cooldown, interaction prompt, offscreen lantern arrow, danger timer | browser-night2.png, browser-night3.png | Visual smoke-tested |
| Color palette | Ticket RGB colors, night ambient intensity `0.15 + 0.55*lit/total` | main-v11.ts; screenshot | Visual smoke-tested; pixel-level tolerance not measured |

## Part 4: headless v1.1 acceptance

- Root `game.contract.json` version 1.1 with standardized tuning, new dash and night durations.
- CLI supports `--night 1|2|3`, `--seed`, `--scenario`, `--inputs`, `--ticks`, `--out`, `--snapshot-every`.
- Output includes snapshot `night`, `wind`, player vel/grounded/cooldowns/invuln/charm; mote kind/ttl; drifters; charms; new events.
- Deterministic repeated runs verified across all three nights; CLI returns 0 on success and 2 on bad input.
- 21,600 ticks for Night 3 measured under 30 seconds in local Windows environment.

## Known gaps and follow-up verification

- **Full 3-night manual gameplay and 30 FPS graphics benchmark on a hardware-rendering browser are pending.** Screenshots from Chrome software WebGL confirm rendering, not 30 FPS on a real GPU.
- Exact visuals for tier-3 ramps, the bell-tower collision, and AI edge behavior should receive human walkthrough and further targeted tests before declaring full DoD.
- Scenario timing/collision edge cases in hidden tests may expose differences; no hidden-test access is claimed.
- Evidence is generated from actual local commands without altering JSONL outputs.
