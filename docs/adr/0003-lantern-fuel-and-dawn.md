# ADR-0003 — Lantern fuel, re-light state, and dawn victory

**Date:** 2026-11-20  
**Status:** Accepted for Phase 3 (TICKET-03, Contract v1.2)  
**Supersedes:** Phase 1–2 immediate-all-lit victory and non-refuelable lantern assumptions

## Context

TICKET-03 changes the objective: all lamps may be temporarily lit, but the player must keep enough lamps burning at dawn. Lamps lose fuel naturally and Bóng Mực can accelerate decay. Tests require exact tick accounting, reproducible outcomes, and scenario overrides without side effects.

## Decision

1. **One state owner:** core gameplay in `web/src/core/game-v12.js`, independently runnable in Node without GPU. Three.js reads the same state.
2. **Fixed-point fuel:** `fuelUnits` is an integer with 60 units per displayed fuel point. Max 100 = 6,000 units; natural loss = 1 unit per active tick; each `drain` shade adds 5 units per active tick. Only snapshot/event/renderer convert units to a number with one decimal.
3. **Per-lantern history:** `lit`, `deposited`, `fuelUnits`, `ever_lit`, `relit_count`. An unlit first-time lantern needs 10 motes; a previously lit lantern needs 5 to relight. Successful lights (not pre-lit scenario overrides) increase carrying capacity from 10 by 2 each, capped at 20.
4. **Interaction selection:** nearest lamp in XZ within 2m that can accept input, tie-break by id. An active lamp below 100 fuel can be refueled; an extinguished lamp accepts deposits. A lit lamp at 100 never accepts an interaction if no decay has occurred. Processing order means an initially full lamp decays by 1/60 *before* interaction in the first gameplay tick.
5. **Shade interactions:** lit lamps with fuel below 30 no longer protect a safe zone. A wandering shade can target a weak lamp; when within 2m it enters `drain`, costing 5 additional fuel per second. Draining immediately stops on stun, safe refuel, extinguish or incompatible position.
6. **New victory rule:** never win immediately from all lit. At zero time, win if surviving with at least `ceil(0.6 × lamp count)` lit (3/5, 4/6, 5/7). Loss of all flames takes precedence, even on the last tick.
7. **Phase-specific scoring:** +5 per deposited mote (including refuel), +100 first light, +40 relight, +5 normal pulse stun, +15 pulse against a shade previously in `drain`. On successful dawn, add 50 + floor(fuel) for each still-lit lantern, and 50 per remaining flame. No time bonus.

## Alternatives rejected

- Floating-point fuel accumulated each tick: can produce threshold/off-by-one disagreements during long simulations.
- Derive `ever_lit` only from `lit`: loses history after a lamp extinguishes; would force incorrect relight cost.
- End game when all lamps become lit: directly conflicts with the change request and discourages maintaining fuel.
- Render-only fuel values: would diverge from the headless contract and break automated grading.

## Verification and consequences

Tests cover exact 60-tick decay, drain stacking and scheduled events, refuel ceiling, relight price, capacity, safe-zone threshold, dawn scoring and victory precedence. New JSONL examples are in `docs/proof/phase-3/`; previous Phase 2 source remains inspectable via Git tag `phase-2`.

Renderer displays world-space fuel bars and different shapes for lit vs extinguished lanterns. Colorblind mode changes shade eyes/outline and warnings without touching the headless engine.
