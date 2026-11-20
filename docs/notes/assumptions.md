# Current assumptions — Phase 3, Contract v1.2

TICKET-03 is the current authoritative source. See ADR-0003 for design reasoning and CHANGELOG.md for superseded behavior. Phase 1 and Phase 2 assumptions are archived as `phase-1-assumptions.md` and `phase-2-assumptions.md` respectively.

- All lamp fuel and drain calculations use integer units (60 per fuel). Round to one decimal only in JSONL/renderer.
- Headless simulation order follows previous 60 Hz phases: tick input, timer/fuel decay/drain, movement/pickup/deposit/safety/pulse, shades/drifters, hits/spawns, final death/dawn checks. Pause stops gameplay tick; it does not decrement fuel.
- Fuel below 30 is not protected; exactly 30 is protected until the next active tick can reduce it.
- Drain already active at the start of the step consumes 5 units in step 2, in addition to 1 natural decay. A shade entering drain during shade motion starts draining on the *next* gameplay step.
- For scenario lanterns with `lit:true` and no `fuel`, initialize exactly 100; scenario setup emits no score/events, and scenario-lit lamps do not increase `successful_lights`.
- `fuel=0` immediately extinguishes the lantern on the next active tick, and may be an intentional test scenario.
- A lantern initially full may be eligible for refuel in the first gameplay tick because step-2 decay occurs before step-5 interactions. This follows the contract's explicit step order.
- `score.per_mote=5` is awarded on **deposit/refuel**, not pickup. Every pulse against a `drain` shade awards total +15, not +5+15.
- A world-space fuel gauge only displays core state; accessibility setting and all stylistic additions have no effects on JSONL.
- Performance benchmarks use an unthrottled local Node CLI and should not be confused with rendering FPS.
