# E04 — The Backpacker Circuit
> Act I · Tier 3 (Budget Guesthouse) · Destinations + Transport tier-1 + Path-point scaffold · Beats 5–6 (*First Passport Stamp*, *Wi-Fi & Ambition*) · World-Traveler primary, seeds for all four paths

**Epic goal:** Turn the linear climb into a map — introduce **destinations** (each a flat global `×`), the first **transport** tier (bus/train), and the **path-point scaffold** that plants all four build-path seeds, while checking into the Budget Guesthouse (tier 3).
**Player-visible outcome:** A "Destinations" map of unlockable places (each a permanent global `×`), bus/train buttons that speed destination cycling, a four-bar path-points meter, and the branch-seed story choice at *Wi-Fi & Ambition*.
**Systems touched:** new `data/destinations.js` (+ transport rows), `data/paths.js` scaffold, `engine.js` (destination `×`, transport tick, path accrual), `state.js` (`state.destinations`, `state.transport`, `state.paths`), `math.js` (`L_path` softcap), `data/story.js` (beats 5–6), `data/amenities.js` (guesthouse cluster), `data/accommodation.js` (tier-3 row), `ui.js`.
**Math/balance notes:** Each destination contributes a flat `×` folded into a global factor `L_dest = Π mult_d` (product of owned destinations), multiplied across layers alongside `L_comfort`. Path bonus `L_path = 1 + PATH.rate · points^PATH.softcapExp` with `PATH.softcapExp = 0.85`. New `DEST.costGrowth`, `DEST.baseMult`, `DEST.visitYield` in `config.js`. Destination `×` values kept modest (≈1.08–1.20 each) so breadth pays off gradually, not explosively.

## E04-S1 — Pack the Rucksack (data model: destinations & transport)
_As a restless Dutchman, I want the world defined as data, so that new places and rides are declarative rows the engine just reads._  Content-as-data foundation for the whole travel system.
- **E04-S1-T1** — Create `data/destinations.js` — New ES module exporting a `DESTINATIONS` array; each row `{id, name, region, costBase, costGrowth, mult, unlockAfter, tag, pathAffinity}` where `mult` is the flat global `×` the place grants. Wire it into the `config→util→math→data` dependency chain with no cycle.
- **E04-S1-T2** — Seed starter destinations — Add ~8 backpacker stops (`dest_ardennes_daytrip`, `dest_paris_hostel`, `dest_berlin`, `dest_prague`, `dest_amsterdam_return`, `dest_brussels`, `dest_cologne`, `dest_vienna`) with escalating `costBase` (≈×3 each) and `mult` ≈1.08–1.20 so early breadth is cheap and felt.
- **E04-S1-T3** — Define transport data — Add a `TRANSPORT` array (tier-1 rides `bus`, `train`) each `{id, name, slots, speed, costBase, upkeep}`, where `speed` shortens the effective cost/time of reaching a destination and `upkeep` is a small cash/s drain.
- **E04-S1-T4** — Add regions & affinities — Tag each destination with a `region` (for later E24 set-collection) and a `pathAffinity` weight (mostly `traveler`) so visiting nudges the matching path; store weights in the data row, not the engine.
- **E04-S1-T5** — Extend state shape — Add `state.destinations = { [id]:{owned:false, visits:0} }` and `state.transport = { owned:[], activeSlot:null }` to the canonical `state` in `state.js`; default every place unowned and no ride bought.
- **E04-S1-T6** — Path-point scaffold data — Ensure `data/paths.js` exports all four archetypes `traveler/vlogger/crypto/connoisseur`, each `{id, name, rate, seedFrom}`; E04 fully populates `traveler` and leaves the other three as inert seeds until beat 6.
- **E04-S1-T7** — `DEST` config block — Add a `DEST` section to `config.js` (`DEST.costGrowth`, `DEST.baseMult`, `DEST.visitYield`) so the engine holds no magic numbers; destination rows reference these defaults where a per-row value is absent.
- **E04-S1-T8** — Story data skeletons — Add beats 5 (*First Passport Stamp*) and 6 (*Wi-Fi & Ambition*) to `data/story.js` with `requires`/`grants`/`unlocks` fields wired; leave prose for S4/S7.
- **E04-S1-T9** — Tier-3 stub — Ensure `data/accommodation.js` has a Budget Guesthouse (tier 3) row with `accScore` and `unlock` present so S6 only fills detail.
- **E04-S1-T10** — Schema validation — Add a dev `validateDestinations()` assertion (called from `dev/harness.js`) checking every row has required keys, strictly increasing `costBase`, and `mult ≥ 1`; fail loudly on malformed data.

## E04-S2 — The Timetable (core logic/engine: travel & path accrual)
_As the engine, I want to apply destination multipliers and accrue path points each tick, so that travel actually changes the economy._  The formulas that make the map matter.
- **E04-S2-T1** — Compute `L_dest` — In `math.js` add pure `destMult(state) = Π (owned destinations' mult)`; returns 1 when none owned.
- **E04-S2-T2** — Fold `L_dest` into the stack — Multiply `L_dest` into every tier's `M_k` (global scope) alongside `L_path`/`L_comfort`, preserving "multiplicative across layers".
- **E04-S2-T3** — Implement `L_path` — Add `pathMult(points) = 1 + PATH.rate · points^PATH.softcapExp` (`PATH.softcapExp = 0.85`) in `math.js`, applied per-archetype with the correct `scope` per math §5.
- **E04-S2-T4** — `buyDestination` intent — `engine.buyDestination(id)`: check `cash ≥ cost`, deduct, set `owned=true`, emit `purchase` + `unlock`, recompute `L_dest`; block if already owned.
- **E04-S2-T5** — Transport speed effect — Apply the active ride's `speed` to reduce the effective destination cost: `effectiveCost = cost / (1 + transportSpeed)`; recompute affordable set on change.
- **E04-S2-T6** — Passive path-point trickle — In `engine.tick`, accrue path points proportional to relevant activity (traveler from owned destinations; others from Clout/Savvy once > 0), scaled so cadence matches docs/05.
- **E04-S2-T7** — `buyTransport` intent — `engine.buyTransport(id)`: cash check, push to `state.transport.owned`, set `activeSlot`, begin applying `upkeep` in tick.
- **E04-S2-T8** — Upkeep sink — Subtract `transport.upkeep` cash/s in `engine.tick` so a ride is a trade-off, not free power; clamp `cash ≥ 0`.
- **E04-S2-T9** — Unlock gating — Reveal a destination only when its `unlockAfter` (prior place owned or Comfort threshold) is satisfied; emit `unlock` for UI reveals.
- **E04-S2-T10** — Determinism — Ensure travel/path math is a pure function of `state` (no `Date.now` in tick) so offline `==` online and the harness is reproducible.

## E04-S3 — The Departures Board (UI/buttons: map & path meter)
_As a player staring at a wall of options, I want a clean map and a path meter, so that I can see every place, ride, and archetype at a glance._  Exposes the new systems as simple buttons.
- **E04-S3-T1** — Destinations panel — Render a "Destinations" card grid in `ui.js`: each place shows name, cost, its `×` bonus, and an owned checkmark; disabled when unaffordable.
- **E04-S3-T2** — Region grouping — Group destination buttons under `region` headers and separate owned from available for scannability.
- **E04-S3-T3** — Transport buttons — A "Getting Around" row with bus/train buy buttons showing cost, `speed`, `upkeep`, and an active-ride indicator.
- **E04-S3-T4** — Global-`×` readout — Show the combined `L_dest` in the header plus a "next place: +x%" preview so the mechanic reads clearly.
- **E04-S3-T5** — Path meter widget — Four thin bars (traveler/vlogger/crypto/connoisseur) showing current points and the live `L_path` each yields; highlight traveler this epic.
- **E04-S3-T6** — Unlock reveal — On an `unlock` event, slide in the newly revealed destination card with a passport-stamp flourish (respect `prefers-reduced-motion`).
- **E04-S3-T7** — Buy feedback — On `buyDestination`, flash the `×` delta and append it to the `aria-live` "you earned" ticker for accessibility.
- **E04-S3-T8** — Affordability tinting — Grey/disable buttons the player can't afford and live-enable them as cash crosses cost, driven by events (no full re-render).
- **E04-S3-T9** — Flavor tooltips — Hover/tap tooltips carry the wry one-liner per destination (read from data), keeping the UI a pure view over state.
- **E04-S3-T10** — Event wiring — Subscribe UI to `purchase`/`unlock`/`state:changed` and re-render only the affected panel sections per architecture §3.3.

## E04-S4 — First Passport Stamp (headline new thing: the destination system)
_As a broke tourist with a fresh passport, I want to buy my first destination and watch all my income jump, so that going places tangibly pays._  The epic's signature player-facing feature (beat 5).
- **E04-S4-T1** — Beat-5 trigger — Fire *First Passport Stamp* when the player owns their first destination (gate: `own 1 destination`) and set story flag `hasTraveled`.
- **E04-S4-T2** — First-destination onboarding — Price the cheapest place (`dest_ardennes_daytrip`) trivially so every player earns the stamp right after tier-3 check-in.
- **E04-S4-T3** — Passport artifact — Add a lightweight "passport" UI element that stamps each owned destination; purely cosmetic, reads `state.destinations`.
- **E04-S4-T4** — The `×` is felt — Verify the first destination's `mult` produces a visible income bump in the ticker so the global-multiplier mechanic teaches itself.
- **E04-S4-T5** — Visit vs own — Define "visit" (repeatable, small path-point + tiny cash `DEST.visitYield`) vs "own" (one-time unlock, permanent `×`); implement the visit-action button.
- **E04-S4-T6** — Traveler seed grant — Beat 5 grants initial `traveler` path points (via `story.js grants`), softly nudging `story.branch` toward traveler without locking anyone out.
- **E04-S4-T7** — Copy pass — Write beat-5 text in the Dutch-abroad voice (poncho, first stamp, "the guesthouse Wi-Fi actually works today"), ≤90 words, ending on a hook toward *Wi-Fi & Ambition*.
- **E04-S4-T8** — Reveal the map — Unlock the Destinations panel at beat 5 (`unlocks:['ui:destinations']`); keep it hidden before to avoid early clutter.
- **E04-S4-T9** — Collection scaffold — Track owned-count toward a future set bonus (E24) but leave the bonus dormant; just persist the counter.
- **E04-S4-T10** — QA the headline — Test buying with exact cash, re-buying an owned destination (blocked), and that `L_dest` recomputes and survives save/load.

## E04-S5 — Backpacker Kit (amenity cluster: guesthouse small-wins)
_As a penny-pinching packer, I want a growing kit of cheap traveller gear, so that there's a new silly thing to buy every minute plus a Comfort nudge._  The stage's small-wins cluster.
- **E04-S5-T1** — Define kit amenities — Add `kit_{poncho,stroopwafel_stash,earplugs,padlock,microfiber_towel,travel_pillow}` to `data/amenities.js`, each `{id,name,tag:'backpack',costBase,costGrowth:1.5,comfort,xMult}`.
- **E04-S5-T2** — Ramp costs — Use `AMENITY.growth ≈ 1.5` and stagger `costBase` so a new kit item is affordable ~every 60–90s of active guesthouse play.
- **E04-S5-T3** — Comfort contribution — Feed each item's `amenityScore` into `ComfortRaw`; confirm the saturating cap `Comfort = cap·raw/(raw+cap)` still holds.
- **E04-S5-T4** — Targeted `×` — Give each a small `xMult` scoped to traveler/social tiers, added inside `L_path` per additive-within-layer.
- **E04-S5-T5** — Reuse buy flow — Route all kit items through generic `engine.buyAmenity(id)` (`AMENITY` cost curve, `level++`, Comfort recompute); no bespoke code.
- **E04-S5-T6** — Unlock chain — Gate later kit items behind earlier ones + small Comfort thresholds; emit `unlock` for reveals.
- **E04-S5-T7** — Flavor copy — One-liners in Dutch-tourist voice, e.g. "Earplugs: for the bunkmate who snores in three languages."
- **E04-S5-T8** — UI section — Add a "Backpack" buy-buttons group: name, cost, owned, next-Comfort delta; disabled when unaffordable.
- **E04-S5-T9** — Save/migration — Persist levels in `state.amenities`; migration defaults new keys to 0 for old saves.
- **E04-S5-T10** — QA — Test buy-at-zero-cash, rapid buys, Comfort recompute, and no free offline kit items.

## E04-S6 — Checking Into the Guesthouse (accommodation step: tier 3)
_As someone sick of bunk beds, I want to check into the Budget Guesthouse, so that I get a real mattress and a felt Comfort jump._  The tier-up + gate + reveal.
- **E04-S6-T1** — Tier-3 data — Finalize the Budget Guesthouse row in `data/accommodation.js`: `{tier:3, name, accScore = ACC.base·ACC.growth^3, unlock:ACC.unlock[3]}`.
- **E04-S6-T2** — Unlock gate — Set `ACC.unlock[3]` to the Comfort threshold preceding beat 5, tied to `STORY_GATES`; reveal the tier-up button when met.
- **E04-S6-T3** — Tier-up flow — Reuse `engine.upgradeAccommodation()` to move tier 2→3: spend cash, push to `state.accommodation.ownedTiers`, bump `accScore`.
- **E04-S6-T4** — `accScore` jump — Confirm `ACC.growth ≈ 2.6` makes tier 3 a felt Comfort jump feeding `ComfortRaw` via `w_acc·accScore`.
- **E04-S6-T5** — Beat linkage — Reaching tier 3 continues the *Checkout Time*→guesthouse narrative and satisfies the prerequisite state for beat 5.
- **E04-S6-T6** — UI reveal — Update the accommodation card name/art to the guesthouse; show "now: Budget Guesthouse" with a teaser of the next tier (1-Star Hotel, E05).
- **E04-S6-T7** — Copy — Guesthouse arrival blurb: "A real mattress. A shared bathroom, but a *real* mattress." Ends hooking toward the passport.
- **E04-S6-T8** — Balance — Set the tier-3 cash cost so it lands right after E03's social-tier ramp; verify via harness beat-time.
- **E04-S6-T9** — Save/migration — Persist tier in `state.accommodation.tier`; migrate old saves without regressing an already-earned tier.
- **E04-S6-T10** — QA — Test can't-skip (tier 3 requires tier 2 + Comfort gate) and that Comfort/`accScore` recompute post-upgrade.

## E04-S7 — Wi-Fi & Ambition (path/branch flavor: the four seeds + branch-seed choice)
_As a backpacker with signal and dreams, I want to peek at four possible futures, so that I softly pick an emphasis without ever being locked in._  How this epic plants every build path (beat 6).
- **E04-S7-T1** — Beat-6 gate — Fire *Wi-Fi & Ambition* when `Clout > 0 OR Savvy > 0` (or the first path point is earned); this is the branch-seed moment.
- **E04-S7-T2** — Seed all four paths — Ensure `data/paths.js` exposes traveler/vlogger/crypto/connoisseur with `rate` constants and that E04 unlocks the ability to earn points in each — none locked.
- **E04-S7-T3** — Branch-seed choice — Implement the story choice (camera vs. wallet vs. wine vs. map) that softly sets `story.branch` and grants seed points/XP per the `story.js` data example.
- **E04-S7-T4** — Reversibility — Confirm the choice only nudges `story.branch`/`flags`; no path is exiled and re-spec stays possible, matching "emphasis, not exile".
- **E04-S7-T5** — Traveler emphasis — Give the traveler seed a head start this epic (extra points from destinations) so E04's primary path feels rewarded.
- **E04-S7-T6** — Vlogger/Crypto stubs — Wire the tiny first sources: a stub `Clout` trickle and a stub Savvy-XP source that cross zero, so beat-6's gate is satisfiable on any build.
- **E04-S7-T7** — `L_path` preview — In the path meter, show each seed's projected `×` (`1 + PATH.rate·points^0.85`) so the choice is informed.
- **E04-S7-T8** — Hybrid hook — Add a dormant data flag for a future hybrid beat (two paths ≥ P1) but keep it inert now.
- **E04-S7-T9** — Copy — Beat-6 text: guesthouse Wi-Fi tempts three futures (influencer, trader, aesthete) plus the map; wry, ≤90 words, ending on "…but first, breakfast is extra."
- **E04-S7-T10** — QA — Test each choice sets the right branch/flags/grants, and that ignoring the choice still auto-satisfies beat 6 from normal progression.

## E04-S8 — Fitting the Curve (balance & tuning)
_As the balancer, I want the travel and path constants tuned to the pacing contract, so that the guesthouse stage hits its beat targets._  Set constants, run the harness, hit cadence.
- **E04-S8-T1** — Set `PATH.rate` — Choose `PATH.rate` so an early traveler build's `L_path` reaches ~1.3–1.6× by end of Act I; document the value in `config.js`.
- **E04-S8-T2** — Confirm softcap — Lock `PATH.softcapExp = 0.85`; unit-test `points^0.85` so early points feel great and late points diminish.
- **E04-S8-T3** — Destination `×` values — Tune each `mult` (≈1.08–1.20) so owning the full starter set ≈×2 global, not runaway.
- **E04-S8-T4** — Cost slopes — Set `DEST.costGrowth` so destinations pace at the "new major thing every ~10–20 min" cadence from docs/05 §5.
- **E04-S8-T5** — Transport ROI — Balance bus/train `costBase` vs `speed` vs `upkeep` so buying a ride is a real choice (positive but not a no-brainer).
- **E04-S8-T6** — Harness run — Run `dev/harness.js` for beats 5–6 and assert cumulative times land near the ~0:20 (beat 5) target within ±15%.
- **E04-S8-T7** — Cadence log check — Verify time-to-next-purchase stays in the 30–120s active band across the guesthouse stage.
- **E04-S8-T8** — Interaction audit — Check that `L_dest·L_path·L_comfort` don't compound into an early runaway; adjust the single largest-miss lever per the docs/05 fit procedure.
- **E04-S8-T9** — Golden file — Commit the resulting beat-5/6 timing curve as a golden snapshot so regressions are caught.
- **E04-S8-T10** — Debug grants — Add debug-panel buttons to grant destinations/path points/transport for QA of downstream epics.

## E04-S9 — Save the Itinerary (save/migration/offline)
_As a returning traveller, I want my map, rides, and path points preserved and progressed while away, so that nothing is lost between sessions._  Persist new state, migrate old saves, offline correctness.
- **E04-S9-T1** — Persist travel state — Serialize `state.destinations`, `state.transport`, `state.paths` into the save blob; confirm they JSON round-trip.
- **E04-S9-T2** — Bump save version — Increment `state.version` and add a `MIGRATIONS` entry that defaults destinations/transport/paths for pre-E04 saves.
- **E04-S9-T3** — Migration fixtures — Add a fixture save from the E03 version and assert it loads with all destinations unowned and no crash.
- **E04-S9-T4** — Offline destination income — Ensure `L_dest` applies during offline macro-steps (`engine.tick`) so away-time benefits from owned places.
- **E04-S9-T5** — Offline path accrual — Accrue path points during offline steps at the same rate as online, capped by `OFFLINE_CAP`.
- **E04-S9-T6** — No free offline unlocks — Guarantee offline never auto-buys destinations/transport; only income and points accrue.
- **E04-S9-T7** — Upkeep offline — Apply transport `upkeep` during offline steps so the ride trade-off stays honest across away time.
- **E04-S9-T8** — Away summary — Add destinations' contribution and path-point gains to the "While you were away…" modal.
- **E04-S9-T9** — Export/import — Confirm the base64 export includes travel state and re-imports cleanly (try/catch guards malformed input).
- **E04-S9-T10** — Backup rotation — Verify the rotating `...backup` key captures pre-migration state so a bad migration is recoverable.

## E04-S10 — Smooth the Trip (QA/polish/juice)
_As a QA-minded traveller, I want the travel system hardened and juicy, so that it's correct at the edges and satisfying to use._  Tests, edge cases, formatting, feedback.
- **E04-S10-T1** — Unit: `destMult` — Test the product math for 0/1/many owned; assert monotonic and matching config.
- **E04-S10-T2** — Unit: `pathMult` — Test `1 + PATH.rate·points^0.85` at points 0/1/100; assert the softcap shape.
- **E04-S10-T3** — Edge: zero cash — Attempt buys at exactly 0 and cost−1 cash; assert rejection and no negative cash.
- **E04-S10-T4** — Edge: rapid buys — Spam `buyDestination`/`buyTransport`; assert idempotent owned flags and correct event counts.
- **E04-S10-T5** — Number formatting — Ensure destination `×` and costs use `util.format` (scientific/suffix) and never show raw floats.
- **E04-S10-T6** — Ticker juice — Passport-stamp animation plus a small "ka-ching" tick on new destinations (respect reduced-motion/mute).
- **E04-S10-T7** — Accessibility — Destination/transport controls are semantic `<button>`s, keyboard-focusable, with aria labels for `×` values.
- **E04-S10-T8** — Regression: stack order — Test that `M_k` equals `milestoneMult·L_upgrade·L_path·L_dest·L_comfort·…` in the documented order.
- **E04-S10-T9** — Story integrity — Assert beats 5–6 fire from pure progression even if the player never clicks the branch choice.
- **E04-S10-T10** — Cleanup — Remove console logs, guard debug grants behind the debug toggle, and confirm `destinations.js` introduces no dependency cycle.

## Definition of Done (epic)
- [ ] `data/destinations.js` + transport rows defined, validated, and wired without a dependency cycle.
- [ ] Destinations grant a permanent global `L_dest` `×`; transport tier-1 (bus/train) speeds cost with an upkeep sink.
- [ ] `L_path = 1 + PATH.rate·points^0.85` implemented and folded per-scope; four-path scaffold seeds all archetypes, none locked.
- [ ] Beats 5 (*First Passport Stamp*) and 6 (*Wi-Fi & Ambition*) fire from progression, with the reversible branch-seed choice.
- [ ] Budget Guesthouse (tier 3) reachable behind its `ACC.unlock[3]`/`STORY_GATES` Comfort gate; backpacker amenity cluster live.
- [ ] Constants (`PATH.rate`, `PATH.softcapExp`, `DEST.*`) tuned; harness hits beat-5/6 targets within ±15%; golden file committed.
- [ ] New state persisted, old saves migrated, offline income/path accrual correct with no free purchases.
- [ ] Unit/edge/regression tests pass; number formatting via `util.format`; UI accessible and juice reduced-motion-safe.
