# Changelog

## Phase 4 — Bình minh / Release v1.0.0 (Contract v1.3)

### New (non-functional + delivery)

- Browser FPS benchmarking with a fixed Night-1 scene: 1280×720, 200 wandering Bóng Mực, 100 motes, 3 lit lanterns, stationary Mây, 15s orbit, 3s warmup, real 30s frame timing. Outputs `bench.json`; benchmark bypasses extra spawns, damage, pickups, fuel decay and terminal checks.
- Node.js same-process soak test: 10 nights, seeds 7+i, random inputs at stated probabilities, RSS before/after reset, outputs `soak.json`.
- Portable local server and persistent top-10 leaderboard (`data/leaderboard.json`), name validation, ordered JSON export via `run_cmd --export-leaderboard`.
- Accessibility: remap all nine actions with duplicate detection, reset, persistent settings; low-fuel/wind/shade/last-10s text indicators; reduced-motion and 1.25× UI text.
- 18px minimum UI text at 1280×720, updated README, 1–2-page retrospective, MP4 demo, packaged web+server release ZIP.
- Rendering optimization shared by gameplay and benchmark: merged shade-eye and tentacle geometry, reducing GPU draw calls without changing gameplay or headless JSONL.
- GitHub Actions workflow builds and publishes GitHub Release `v1.0.0` when `phase-4` is pushed.
- Test Contract updated to `1.3`, adds `bench_cmd` and `soak_cmd`; gameplay tuning/logic remain compatible with v1.2.

### Verification

- 45 Node tests passed (41 gameplay + 4 release/soak/leaderboard).
- Real 30-second local benchmark: `170.83 avg_fps`, `49.36 p1_low_fps`, `13.70ms p95`, `397ms load`, `5125 frames`. Values represent this Windows test PC, not the grading machine.
- Soak 10 nights: no crashes, memory from 33.67MB to 36.75MB.
- Browser smoke verified settings, duplicate-key detection, 9 remappable actions, leaderboard and disk-based score saving.
- `peak_mem_mb=null` for browser benchmark; `vsync_off=false` because the disable flag cannot be independently verified in Chromium. No fabricated GPU memory or FPS claims.

## Phase 3 — TICKET-03 “Đèn cạn dầu” (Contract v1.2)

### Breaking gameplay changes

- **Victory:** no more `all_lit` instant win. Survive until dawn with >=60% of lanterns lit (3/5, 4/6, 5/7) to win (`dawn_survived`).
- **Duration:** nights change from 300/330/360 seconds to **240/270/300 seconds**.
- **Lanterns:** a lit lantern continuously decays by 1 fuel/sec, may extinguish, can be refueled for 10 fuel/mote, and can be relit using 5 motes instead of 10.
- **Shade AI:** `drain` state steals 5 fuel/sec from weak lanterns; below 30 fuel, the protected zone disappears.
- **Capacity:** from fixed 10 to 10+2 per successful lantern lighting (including relight), maximum 20.
- **Scoring:** deposit +5 per mote (was +10), first light +100, relight +40, stun +5 or +15 if draining, dawn bonus per active lamp and flame, time bonus removed.

### Breaking headless contract changes

- `game.contract.json`: version **1.2**, additional fuel / threshold / capacity tuning values.
- Snapshot `lanterns[]`: new `fuel` (one decimal), `ever_lit`, `relit_count`; player gains `capacity`. Shade state may be `drain`.
- Scenarios support `lanterns[].fuel`, `ever_lit`, `player.successful_lights`, and `shades[].target_lantern_id`.
- New events `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit` includes `relight`; no emitted `all_lit` reason.
- Previous Phase 2 tests expecting old scoring or instant victory were revised; still-applicable regression tests remain active.

### UI and delivery

- Added fuel bars, 1Hz flicker below 30, 20% shrink/torn-off paper effect for extinguished lanterns.
- Added persistent “Bảng màu dễ phân biệt” preference with blue enemy eyes/outline and high-contrast warnings.
- Retained all three worlds, menus, controls, graphics corrections, and headless verifier.
- See [ADR-0003](docs/adr/0003-lantern-fuel-and-dawn.md) and [Phase 3 proofs](docs/proof/phase-3/README.md).

## Phase 2 — TICKET-02 (Contract v1.1)

- Three nights, dash, Bùa Gió, Gió Lạc, wind, pause, menus, headless support 1–3, CI test/proofs.
- Historical version preserved at Git tag `phase-2`.

## Phase 1 — PRD-0 (Contract v1.0)

- Original single-night game, deterministic Node CLI, Three.js rendering and tests.
- Historical version preserved at Git tag `phase-1`.
