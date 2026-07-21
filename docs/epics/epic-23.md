# E23 — Villa Vita
> Act III (The Summit) · Accommodation tier 18→19 (Private Villa + grounds → Private Estate) · New systems: **grounds** (garden/pool/court amenity mega-clusters), **estate staff**, **property×staff synergy** · Story beat 24 (*Villa Vita*) · Build-path emphasis: connoisseur / vlogger

**Epic goal:** Scale property and staff together. Add **grounds** — gardens, pool complexes, and sport courts as *amenity mega-clusters* — plus **estate staff** who maintain them, and a **property×staff multiplier** where staffing your grounds amplifies their Comfort and output.
**Player-visible outcome:** The player owns a sprawling villa (then estate) with dozens of grounds amenities, hires estate staff (gardeners, pool crew, groundskeeper, estate manager), assigns them to clusters, and watches a synergy multiplier reward scaling both at once.
**Systems touched:** `data/property.js` (grounds clusters), `data/staff.js` (estate roles, extends E19–20), `state.property.grounds`, `state.staff`; `engine` Comfort + synergy + payroll; `config.GROUNDS`, `config.ESTATE`; `data/accommodation.js` (tiers 18–19); `data/story.js` (beat 24).
**Math/balance notes:** grounds Comfort = mega-cluster sum feeding `w_amen`/`w_prop`; estate synergy `L_estate = 1 + ESTATE.synergyRate·sqrt(assignedStaff·propertyLevel)` (the property×staff interaction, sqrt-softened per `docs/05 §4`); payroll drain `Σ staff.wage` per tick; morale softcap on staff output.

## E23-S1 — Grounds and estate-staff data model (data model)
_As a systems dev, I want grounds and estate staff as pure data, so that mega-clusters and roles are content, not code._  Estate content stays declarative.
- **E23-S1-T1** — Add grounds clusters to `data/property.js` — Define `GROUNDS` clusters `{id,name,kind:'garden'|'pool'|'court',nodes:[]}`; each cluster is a batch of amenity nodes.
- **E23-S1-T2** — Author the garden cluster — ~12 nodes (topiary, rose walk, koi pond, orangery, fountain) with `costGrowth:1.5` and a ramped `comfort`.
- **E23-S1-T3** — Author the pool-complex cluster — ~12 nodes (lap pool, infinity edge, swim-up bar, grotto, hot springs) — a bigger sibling of the E07 pool.
- **E23-S1-T4** — Author the sport-court cluster — ~10 nodes (tennis, padel, croquet lawn, putting green, a very Dutch boules pit) with `comfort` + tiny `xMult`.
- **E23-S1-T5** — Extend `data/staff.js` with estate roles — Add gardener, pool technician, groundskeeper, and estate manager to the E19–20 staff model `{id,role,wage,automates,moraleBase}`.
- **E23-S1-T6** — Map roles to grounds — Each estate role's `automates` points at a grounds subsystem (gardener→garden, pool tech→pool cluster, groundskeeper→court).
- **E23-S1-T7** — Define the estate-manager role — Give the estate manager `automates:'synergy'` so it boosts the property×staff interaction rather than a single cluster.
- **E23-S1-T8** — Reference config — All wages/Comfort/morale read from `config.ESTATE`/`config.GROUNDS`; no literals in data.
- **E23-S1-T9** — Flavor copy — Wry Dutch descriptions ("A boules pit. To remind you where you came from — a damp car park in Utrecht.").
- **E23-S1-T10** — Validation test — Assert unique ids, every staff role maps to a real cluster or `'synergy'`, and monotone cluster `comfort` ramps.

## E23-S2 — Grounds Comfort and property×staff synergy engine (core logic)
_As the engine, I want mega-cluster Comfort plus a synergy multiplier, so that scaling grounds and staff together beats scaling either alone._  The "your money makes your money nicer" loop.
- **E23-S2-T1** — Implement `groundsScore(state)` — Pure function summing bought grounds-node `comfort` across all clusters; feeds `ComfortRaw` via `w_amen`/`w_prop`.
- **E23-S2-T2** — Add the assign intent — `engine.assignStaff(staffId, clusterId)` binds a hired staffer to a cluster or the synergy slot and validates role↔cluster match.
- **E23-S2-T3** — Implement the synergy formula — `L_estate = 1 + ESTATE.synergyRate·sqrt(assignedStaff·propertyLevel)` — the property×staff interaction, sqrt-softened.
- **E23-S2-T4** — Place synergy in the stack — `L_estate` multiplies grounds Comfort output (and a small global `×`), registered as its own legible slice of `M_k`.
- **E23-S2-T5** — Staff auto-buy — Assigned staff auto-purchase their cluster's cheapest positive-ROI node on a cadence, extending the E19 automation policy.
- **E23-S2-T6** — Payroll drain — Each tick subtract `Σ staff.wage` from cash; if cash can't cover payroll, staff go unpaid and morale drops.
- **E23-S2-T7** — Morale softcap — Scale staff output by `morale` with a softcap; unpaid or overworked staff lose morale, reducing automation rate and synergy.
- **E23-S2-T8** — Recompute discipline — Cache `groundsScore` and `L_estate`; recompute on assignment/purchase, not every tick.
- **E23-S2-T9** — Emit synergy + payroll — Emit the current `L_estate` and payroll on change so the UI can show "grounds ×N from staffing."
- **E23-S2-T10** — Unit-test synergy monotonicity — Assert `L_estate` rises with both more assigned staff and higher property level, and that the sqrt-softening holds.

## E23-S3 — Grounds and staff-wing UI (UI)
_As a player, I want to see my grounds and assign staff onto them, so that managing an estate stays button-simple._  Clusters, staff, and one big synergy readout.
- **E23-S3-T1** — Grounds panel — A card per cluster (garden/pool/court) with node buttons, a cluster Comfort subtotal, and a fill-progress bar.
- **E23-S3-T2** — Staff-wing panel — List hired estate staff with role, wage, a morale bar, and an "assign to…" control.
- **E23-S3-T3** — Assignment controls — Simple buttons/`<select>` to bind a staffer to a cluster or the synergy slot, calling `engine.assignStaff`.
- **E23-S3-T4** — Synergy readout — A prominent "Estate synergy ×N" tile showing `L_estate` and what raises it (more staff / bigger property).
- **E23-S3-T5** — Payroll meter — Show `ƒ/s` payroll versus income and turn it red when payroll exceeds income.
- **E23-S3-T6** — Morale indicators — Per-staff morale bar with a tooltip explaining low-morale causes (unpaid, overworked).
- **E23-S3-T7** — Node buttons — Cluster nodes show name/cost/owned/next-Comfort delta, reusing the amenity-button component.
- **E23-S3-T8** — Unlock reveals — Reveal each cluster and the staff wing via `unlock` events with `aria-live` announcements.
- **E23-S3-T9** — Wire to intents only — Every control calls an engine intent; the UI stays read-only over state.
- **E23-S3-T10** — Reduced-motion + keyboard — Assignment and node controls are fully keyboard-operable; animations gate on `prefers-reduced-motion`.

## E23-S4 — Estate staff wing + property×staff multiplier (headline new thing)
_As an estate owner, I want staffing my grounds to visibly multiply their value, so that the signature scaling loop clicks._  The synergy `×` is the star.
- **E23-S4-T1** — The synergy centerpiece — Make `L_estate` the epic's headline: a single readable multiplier that grows when property and staff scale together.
- **E23-S4-T2** — Estate-manager amplifier — Assigning the estate manager to the synergy slot boosts `ESTATE.synergyRate` — a manager-of-managers effect.
- **E23-S4-T3** — Beat 24 hook — Trigger beat 24 *Villa Vita* on the first grounds cluster + first estate hire; set `story.flags.estate=true`.
- **E23-S4-T4** — Surface the interaction math — Show the `sqrt(staff·propertyLevel)` term in a tooltip so players understand why balancing both wins.
- **E23-S4-T5** — Diminishing-but-worth-it — Confirm sqrt-softening keeps synergy strong yet non-runaway per `docs/05 §4` anti-runaway rules.
- **E23-S4-T6** — Staff auto-collect — Estate staff also auto-collect idle grounds output, reinforcing "the household runs itself."
- **E23-S4-T7** — Payroll tension — Ensure the synergy `×` clearly outweighs payroll drain at correct scaling, so hiring is a real decision, not a trap.
- **E23-S4-T8** — Offline synergy — Apply `L_estate` and payroll consistently across offline macro-steps; unpaid-away staff lose morale offline too.
- **E23-S4-T9** — Flavor: the household hums — Copy for the "runs itself" moment ("You wake; the lawn is already mowed. You did nothing. This is the dream.").
- **E23-S4-T10** — QA the interaction — Test synergy at (0 staff / big property) and (many staff / small property); both should underperform balanced scaling.

## E23-S5 — Garden/pool/court amenity mega-clusters (amenity / small-wins)
_As an idler, I want dozens of grounds upgrades, so that an estate offers a constant stream of new little luxuries._  Small wins at estate scale.
- **E23-S5-T1** — Finalize garden content — Lock ~12 garden nodes with ramped `costGrowth:1.5` and flavored names.
- **E23-S5-T2** — Finalize pool-complex content — Lock ~12 pool nodes with a steeper prestige `growth` on late nodes (grotto, glass tunnel).
- **E23-S5-T3** — Finalize court content — Lock ~10 court nodes including the Dutch boules pit and a canal-themed lazy river.
- **E23-S5-T4** — Cross-cluster completion nudge — Add a small bonus for completing a full cluster ("The garden is finished. Briefly.") — a set-collection tease for E24.
- **E23-S5-T5** — Scale rule — Grounds nodes don't consume property amenity slots but increase payroll pressure (more grounds → more upkeep), a natural pacing brake.
- **E23-S5-T6** — Generic buy flow — All nodes use the generic grounds-node purchase; no bespoke code per node.
- **E23-S5-T7** — Feed Comfort — Confirm mega-cluster Comfort flows into `ComfortRaw` and respects the saturating cap even at dozens of nodes.
- **E23-S5-T8** — Cadence tuning — Target a new grounds node affordable every ~90–120s of active play at this stage; verify via the harness.
- **E23-S5-T9** — Flavor copy pass — Write ~34 wry one-liners across the three clusters.
- **E23-S5-T10** — QA — Buy-all stress across clusters, Comfort recompute correctness, payroll scaling as designed, no free offline nodes.

## E23-S6 — Tier 18→19: Private Villa to Private Estate (accommodation step)
_As a climber, I want the ladder to reach a full estate, so that grounds and staff have a home tier to culminate in._  The estate rungs.
- **E23-S6-T1** — Register tiers 18–19 — Add Private Villa + grounds (18) and Private Estate (19) to `data/accommodation.js` with `accScore = ACC_BASE·2.6^t`.
- **E23-S6-T2** — Set unlock gates — Populate `ACC.unlock[18]` and `ACC.unlock[19]` tied to `STORY_GATES` (beat 24) and the Taste gate on luxury tiers.
- **E23-S6-T3** — Ownership + grounds precondition — Tier 19 requires owning tier 18 and at least one full grounds cluster (a scaling gate).
- **E23-S6-T4** — Reveal on gate — Emit `unlock` when the gates are met; reveal the estate deed and expanded grounds slots.
- **E23-S6-T5** — Estate raises staff cap — Reaching the estate raises the estate-staff cap (more roles hireable), tightening the property↔staff loop.
- **E23-S6-T6** — Big-step Comfort jump — Validate the `2.6^t` jump at 17→18→19 stays a felt step without over-saturating the cap.
- **E23-S6-T7** — Story copy — Beat text for the estate reveal ("A gate with your name on it. Misspelled, but yours.").
- **E23-S6-T8** — Cross-check the canonical ladder — Confirm tier indices match `docs/03` (18 Villa+grounds, 19 Estate).
- **E23-S6-T9** — Migration default — Old saves stay at their current tier; 18–19 stay locked until gates + ownership.
- **E23-S6-T10** — QA gate ordering — Assert the estate is unreachable without villa ownership + a completed cluster; test exact-threshold unlock.

## E23-S7 — Path flavor: topiary vs content-garden (path / branch flavor)
_As a branch player, I want my estate to reflect my identity, so that a connoisseur's grounds and a vlogger's grounds diverge meaningfully._  Connoisseur/vlogger take the lead here.
- **E23-S7-T1** — Connoisseur formal gardens — Connoisseur unlocks a "Versailles-lite parterre" grounds variant with `+25%` luxury Comfort and an exclusivity `×`.
- **E23-S7-T2** — Vlogger content-garden — Vlogger unlocks a "shoot-ready sunset lawn" cluster that trickles `Clout` and boosts the active-play combo when filmed.
- **E23-S7-T3** — Traveler's arboretum — Traveler unlocks a "plants from every destination" garden granting a destinations synergy (bridges to E24).
- **E23-S7-T4** — Crypto off-grid grounds — Crypto unlocks a solar-and-server "cooling pond" giving Savvy passive while the pool runs.
- **E23-S7-T5** — Branch-flavored staff line — The estate manager delivers a branch-specific quip keyed on `story.branch`.
- **E23-S7-T6** — Route through `L_path` — Branch grounds bonuses register as `L_path` bonuses with `PATH.softcapExp=0.85`; no new layer.
- **E23-S7-T7** — Emphasis weighting — Per the epic's emphasis, give connoisseur and vlogger slightly richer grounds content than traveler/crypto here.
- **E23-S7-T8** — Hybrid grounds reward — Two paths ≥ P1 unlock a fusion cluster (e.g. a crypto-funded content-garden greenhouse).
- **E23-S7-T9** — Copy pass — Write four branch-flavored cluster descriptions in the wry tone.
- **E23-S7-T10** — QA branch switching — Re-spec paths; assert grounds bonuses recompute and synergy isn't double-counted.

## E23-S8 — Balance mega-clusters, payroll, and synergy (balance & tuning)
_As a balancer, I want grounds, staff cost, and synergy in equilibrium, so that beat 24 lands near its pacing target._  Make hiring worth it, never a trap.
- **E23-S8-T1** — Set `GROUNDS.base`/`growth` — Tune so grounds nodes drip at a ~90–120s cadence and full mega-clusters are a multi-hour goal, not a wall.
- **E23-S8-T2** — Set `GROUNDS.comfortWeight` — Weight grounds Comfort so mega-clusters matter without instantly saturating the cap.
- **E23-S8-T3** — Set `ESTATE.synergyRate` — Tune the property×staff `×` so balanced scaling gives a clear, legible boost (~1.5–3× at this stage).
- **E23-S8-T4** — Set wages — Price `staff.wage` so payroll is a real drain (~10–25% of income) that synergy comfortably outweighs when balanced.
- **E23-S8-T5** — Tune the morale softcap — Set the morale curve so a slightly overworked estate still functions but rewards right-sizing staff.
- **E23-S8-T6** — Run the harness — Simulate to beat 24 and confirm cumulative time is within ±15% of `docs/05 §1`.
- **E23-S8-T7** — Payroll-vs-synergy sanity — Assert there exists a staffing level where synergy `×` > payroll cost, so hiring is never a strict trap.
- **E23-S8-T8** — Time-to-next band — Keep the grounds era's time-to-next-buy in the 30–120s active band.
- **E23-S8-T9** — Golden-file update — Commit the updated milestone-curve segment.
- **E23-S8-T10** — Document constants — Add `GROUNDS.*` and `ESTATE.*` to the config comments and the `docs/05` lever table.

## E23-S9 — Persist grounds, staff, assignments; migrate; offline (save / migration / offline)
_As a returning player, I want my estate — nodes, staff, and who's assigned where — remembered, so that reloading and being away are exact._  The household stays put.
- **E23-S9-T1** — Extend state — Add `state.property.grounds = { <node>:rank }` and `state.staff = { <id>:{hired,assignedTo,morale} }`; bump `version`.
- **E23-S9-T2** — Write migration — Add `MIGRATIONS[N]` initializing empty grounds + estate-staff for pre-estate saves.
- **E23-S9-T3** — Preserve E19–20 staff — Ensure existing butler/household staff saves merge cleanly with new estate roles (no clobber).
- **E23-S9-T4** — Serialize assignments — Persist `assignedTo` bindings; on load, re-validate role↔cluster and drop stale bindings safely.
- **E23-S9-T5** — Offline payroll — Apply payroll drain across offline macro-steps; if cash runs out while away, model morale loss deterministically.
- **E23-S9-T6** — Offline auto-buy — Assigned-staff auto-purchases run in offline macro-steps identically to online (same `engine.tick`).
- **E23-S9-T7** — Offline synergy — Apply `L_estate` per macro-step so away income reflects synergy correctly.
- **E23-S9-T8** — Export/import round-trip — Confirm grounds + staff + assignments survive base64 export/import, try/catch-guarded.
- **E23-S9-T9** — Migration unit test — Load a v(N-1) fixture and assert grounds/staff init while prior staff are preserved.
- **E23-S9-T10** — Offline summary — Away-modal line: "Your gardeners worked; your wallet noticed (−payroll, +Comfort)."

## E23-S10 — QA, edge cases, and juice (QA / polish)
_As QA, I want the estate systems airtight, so that grounds, staff, and synergy never desync or exploit._  Run the estate, then try to break it.
- **E23-S10-T1** — Unpaid-staff edge — Drive cash to ƒ0 with staff hired; assert morale drops deterministically and cash never goes negative.
- **E23-S10-T2** — Over-assignment edge — Assign more staff than a cluster needs; assert diminishing returns via morale/softcap and no infinite stacking.
- **E23-S10-T3** — Synergy recompute audit — After arbitrary hire/assign/buy sequences, assert `L_estate` matches a from-scratch recompute.
- **E23-S10-T4** — Comfort recompute audit — Assert grounds Comfort equals a fresh recompute after any node-buy order.
- **E23-S10-T5** — Assignment integrity — Fuzz assign/unassign; assert no staffer is bound to two clusters and no cluster is over-credited.
- **E23-S10-T6** — Payroll accounting — Verify `Σ wage` is deducted exactly once per tick, online and offline.
- **E23-S10-T7** — Number formatting — Check grounds costs, payroll `ƒ/s`, and the synergy `×` format across notations.
- **E23-S10-T8** — Estate juice — Add ambient flourishes (a sprinkler-emoji tick, a "lawn mowed" toast) respecting reduced-motion and mute.
- **E23-S10-T9** — Save-compat test — Run the fixture suite including the new version and prior staff saves; assert clean migration.
- **E23-S10-T10** — Accessibility pass — Labels for assignment controls, `aria-live` for synergy/payroll changes, keyboard-navigable panels.

## Definition of Done (epic)
- [ ] Grounds clusters (garden/pool/court) and estate-staff roles exist as validated pure data and import with no cycles.
- [ ] `groundsScore` feeds `ComfortRaw`, and `L_estate = 1 + ESTATE.synergyRate·sqrt(assignedStaff·propertyLevel)` is a legible, monotone, sqrt-softened slice of the stack.
- [ ] `engine.assignStaff` binds roles to clusters/synergy; assigned staff auto-buy and auto-collect; payroll drains each tick with a morale softcap.
- [ ] The synergy `×` is the visible headline, triggers beat 24, sets `story.flags.estate`, and clearly outweighs payroll at balanced scaling.
- [ ] The three mega-clusters (~34 nodes) drip at the ~90–120s cadence and increase upkeep pressure as designed.
- [ ] Tiers 18–19 registered with `ACC.unlock` gates, ownership + completed-cluster precondition, and raised staff cap at the estate.
- [ ] Connoisseur/vlogger get emphasized grounds content; all branches route through softcapped `L_path`; hybrid reward present.
- [ ] `GROUNDS.*`/`ESTATE.*` tuned; harness puts beat 24 within ±15%; a staffing level with synergy > payroll is guaranteed; golden file committed.
- [ ] Grounds, staff, and assignments persist, migrate (preserving E19–20 staff), round-trip, and are offline-correct (payroll + synergy + morale).
- [ ] QA green: unpaid/over-assignment edges, synergy + Comfort recompute audits, assignment integrity, payroll accounting, formatting, accessibility.
