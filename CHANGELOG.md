# Changelog

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
