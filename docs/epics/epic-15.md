# E15 — Keys to the Coupe
> Act II · Tier 11 (+garage) · Vehicle ownership + transport slots + logistics × on travel · Beat 15 *Keys to the Coupe* · **Traveler**-leaning emphasis

**Epic goal:** Ship Private Logistics I — the player buys and owns cars that replace public transport, occupy transport slots, apply a logistics `×` to destinations/travel income, and cost ongoing upkeep as a balancing cash drain.
**Player-visible outcome:** A garage where the player owns vehicles; each car fills a transport slot, cycles destinations faster and multiplies destination income, at the cost of upkeep — turning "how do I get around" into a strategic sink-vs-multiplier decision.
**Systems touched:** `js/data/vehicles.js` (new) + the E04 destinations/transport data, `config.LOGISTICS` (new: slots, upkeep, logistics `×`), `engine.js`/`math.js` (slot allocation, logistics multiplier, upkeep drain), `data/accommodation.js` (garage reveal), `data/paths.js` (traveler), `state.js` (vehicles + upkeep + migration), `ui.js` (garage panel), `data/story.js` (beat 15 *Keys to the Coupe*).
**Math/balance notes:** transport slots `slots = LOGISTICS.baseSlots + travelerBranchBonus + wanderersInstinctRank` (traveler perk `+1`, `Wanderer's Instinct` `+1`); logistics `× = 1 + LOGISTICS.rate · Σ(equipped car.logisticsMult)` on destination income; upkeep drain `dCash/dt −= Σ(equipped car.upkeep) · LOGISTICS.upkeepScale`, sized so net gain stays positive but the `×` isn't free; destinations `−15%` cost with the traveler perk.

## E15-S1 — The Showroom Brochure (data model)
_As a would-be motorist, I want a catalogue of cars, slots, and upkeep numbers, so that the garage is tunable data._  All logistics content is data; the engine stays generic.
- **E15-S1-T1** — Create vehicles module — Add `js/data/vehicles.js` with a `CARS` array; each `{id,name,tier,costBase,slotCost,logisticsMult,upkeep,speed,comfort}`.
- **E15-S1-T2** — Seed the car roster — Write 6 cars (`rusty_hatchback`, `secondhand_estate`, `german_sedan`, `convertible_coupe`, `vintage_roadster`, `hand_built_grand_tourer`) with rising cost, `logisticsMult`, and upkeep.
- **E15-S1-T3** — Add `config.LOGISTICS` — In `config.js` add `LOGISTICS = { baseSlots, rate, upkeepScale, destDiscountTraveler }` as the single tuning surface for the lane.
- **E15-S1-T4** — Define transport slots — Model `slotCost` per car against `LOGISTICS.baseSlots` so bigger cars can occupy more than one slot (a Kombi versus a supercar tradeoff).
- **E15-S1-T5** — Upkeep schedule — Give each car an `upkeep` cash/s that scales with tier — the deliberate drain balancing its `×`.
- **E15-S1-T6** — Logistics scope tag — Tag the multiplier `scope:'destination'` so it targets travel income through the generic stack, not every tier.
- **E15-S1-T7** — Extend destinations — Add a `travelTime` field to the E04 destinations so cars can *reduce cycling time* — the felt speed benefit.
- **E15-S1-T8** — Flavor copy — Wry one-liners per car ("rusty hatchback: it starts, usually, if you ask nicely in Dutch").
- **E15-S1-T9** — Cross-reference transport — Ensure `vehicles.js` supersedes E04's bus/train tier cleanly (public transport becomes the `slotCost:0` fallback, never removed).
- **E15-S1-T10** — Schema doc comment — Document the `CARS` + slot/upkeep contract at the top of `vehicles.js` for E16/E17 (boats/jets) reuse.

## E15-S2 — Slots, Speed & Upkeep (core logic)
_As a car owner, I want owning and equipping cars to change my travel income and drain upkeep, so that logistics is a live system._  The fleet loop runs every tick.
- **E15-S2-T1** — Vehicle ownership — Add `engine.buyCar(id)` using the geometric cost path; store owned + equipped state.
- **E15-S2-T2** — Slot allocation — Enforce `Σ(equipped slotCost) ≤ availableSlots`; equipping over capacity is blocked with a clear reason string.
- **E15-S2-T3** — Logistics multiplier — In `math.js` add `logisticsMult(state) = 1 + LOGISTICS.rate · Σ(equipped car.logisticsMult)` applied to destination income.
- **E15-S2-T4** — Upkeep drain — Each tick subtract `Σ(equipped car.upkeep) · LOGISTICS.upkeepScale · dt` from cash; never below zero.
- **E15-S2-T5** — Travel-time reduction — Reduce destination cycling time by equipped-car `speed`, accelerating destination `×` acquisition.
- **E15-S2-T6** — Available-slots formula — Compute `slots = LOGISTICS.baseSlots + travelerBranchBonus + wanderersInstinctRank` so perks add slots.
- **E15-S2-T7** — Traveler destination discount — Apply `−15%` destination cost when `branch==='traveler'`, stacking with `Wanderer's Instinct −20%` from the tree.
- **E15-S2-T8** — Feed `L_path(traveler)` — Convert traveler points into `1 + PATH.rate · points^PATH.softcapExp` scoped to destinations.
- **E15-S2-T9** — Repossession guard — If cash can't cover upkeep, auto-unequip the costliest car after a grace period rather than going negative — a soft failure state.
- **E15-S2-T10** — Determinism — Keep slot/upkeep/logistics math pure over state so offline and the harness match live play.

## E15-S3 — The Garage (UI)
_As a proud owner, I want a garage panel showing my cars, slots, and upkeep, so that I can manage the fleet from my lounger._  The fleet is visible and manageable.
- **E15-S3-T1** — Garage panel — Render a garage card listing owned cars with equip/unequip toggles and buy buttons for new models.
- **E15-S3-T2** — Slot indicator — Show `used/total` transport slots with a filled-pips display.
- **E15-S3-T3** — Upkeep readout — Display total upkeep cash/s in red next to net travel income so the tradeoff is explicit.
- **E15-S3-T4** — Logistics × display — Show the current destination `×` from equipped cars.
- **E15-S3-T5** — Buy flow — Wire buttons to `engine.buyCar(id)` (honouring the traveler discount); no bespoke per-car code.
- **E15-S3-T6** — Equip UX — Clicking equip on a full rack prompts which car to swap out, respecting `slotCost`.
- **E15-S3-T7** — Travel-time display — Show destination cycling time before/after equipping a car ("Rome: 40s → 22s").
- **E15-S3-T8** — Unlock reveal — Gate the garage behind beat 15 + Comfort/tier; emit `unlock` with a jangling-keys toast.
- **E15-S3-T9** — Repossession warning — Surface an amber warning when upkeep exceeds income ("the bailiff eyes your coupe").
- **E15-S3-T10** — Number formatting — Route costs/upkeep/`×`/travel-time through `util.format`.

## E15-S4 — Keys to the Coupe (the garage & slots)
_As a Dutchman done with buses, I want private cars that go where I want faster, so that owning wheels tangibly speeds and multiplies my travels._  The epic's signature player-facing feature.
- **E15-S4-T1** — Slot system core — Implement the transport-slot model as the signature constraint that makes fleet choices matter.
- **E15-S4-T2** — Car-vs-public-transport swap — Owning a car replaces the E04 bus/train for its routes, in both flavor and math.
- **E15-S4-T3** — Speed → faster cycling — Wire car `speed` so destinations complete and re-trigger sooner — the headline "faster destination cycling."
- **E15-S4-T4** — Logistics × on destinations — Make equipped cars multiply each destination's flat global `×` — the core reward.
- **E15-S4-T5** — Tradeoff design — Ensure the upkeep drain makes bigger cars a *choice* (raw `×` versus net cash), not an auto-buy — the epic's design intent.
- **E15-S4-T6** — Fleet strategy — Support many small cars (more slots, low each) versus one supercar (one big `×`, heavy upkeep) as distinct viable builds.
- **E15-S4-T7** — Beat 15 trigger — Owning the first car fires beat 15 *Keys to the Coupe*.
- **E15-S4-T8** — Garage capacity upgrades — Add purchasable garage expansions that raise `baseSlots`, a sink that grows the system.
- **E15-S4-T9** — Visual fleet — A simple garage row of car icons reflecting owned/equipped state.
- **E15-S4-T10** — Balance hook — Expose slot count, total `×`, and net-of-upkeep income to the harness for tuning.

## E15-S5 — Fully Loaded (car-accessory amenity cluster)
_As a road-tripper, I want silly car accessories, so that there's a cheap new gadget every minute plus Comfort (and a tiny travel `×`)._  Small-wins cadence for the logistics stage.
- **E15-S5-T1** — Define car amenities — Add to `data/amenities.js`: `heated_leather_seats`, `booming_sound_system`, `dashcam_vlog_mount`, `pine_air_freshener_deluxe`, `panoramic_sunroof`, `heads_up_display`, each `{costBase,costGrowth:1.5,comfort,xMult,tag:'destination'}`.
- **E15-S5-T2** — Wire generic buy — Reuse `engine.buyAmenity(id)`; ramp ≈2× per step.
- **E15-S5-T3** — Comfort contribution — Feed `amenityScore` into `ComfortRaw`; verify the saturating cap.
- **E15-S5-T4** — Targeted multiplier — Small `xMult` scoped to destination income via `L_path(traveler)`.
- **E15-S5-T5** — Vlogger crossover — `dashcam_vlog_mount` gives a tiny Clout nudge too, rewarding hybrid traveler-vlogger builds.
- **E15-S5-T6** — Flavor copy — Wry one-liners ("pine air freshener deluxe: makes the hatchback smell like a *nicer* forest").
- **E15-S5-T7** — UI buttons — Show name/cost/owned/next-Comfort delta per the standard amenity button.
- **E15-S5-T8** — Cadence check — Confirm one is affordable ~every 60–90s of active travel play via the harness.
- **E15-S5-T9** — Save/migration — Persist levels; default 0 for old saves.
- **E15-S5-T10** — QA — Zero-cash, rapid buys, Comfort recompute, no free offline items.

## E15-S6 — A Garage of One's Own (accommodation step)
_As a car owner, I want my accommodation to include a garage, so that my wheels have a proper home befitting tier 11._  The epic's tier-11 (+garage) feature reveal.
- **E15-S6-T1** — Garage wing entry — Add the tier-11 garage as an accommodation feature/reveal in `accommodation.js` (sharing the tier-11 band with E13/E14).
- **E15-S6-T2** — Comfort gate — Set its unlock threshold from `STORY_GATES` for the branch era.
- **E15-S6-T3** — Slot synergy — Owning the garage wing grants `+garageSlots`, tying accommodation to the logistics system.
- **E15-S6-T4** — accScore contribution — Ensure the garage adds a modest Comfort bump without overshooting the ladder step.
- **E15-S6-T5** — Reveal beat text — Wry copy about finally having somewhere to park that isn't a canal ("no more feeding the meter with guilders").
- **E15-S6-T6** — Cross-lane note — Confirm non-traveler players can also unlock the garage via the neutral Comfort gate.
- **E15-S6-T7** — Unlock event — Emit `unlock` + `story:beat`; update the accommodation label.
- **E15-S6-T8** — `L_comfort` recompute — Confirm the garage flows into `L_comfort` correctly.
- **E15-S6-T9** — Save/migration — Persist the garage feature + slot bonus; old saves default without it.
- **E15-S6-T10** — QA — Assert garage slots apply exactly once and Comfort isn't double-counted.

## E15-S7 — The Grand Tourist's Coupe (traveler branch flavor)
_As a committed World Traveler, I want car perks and the *Keys to the Coupe* beat, so that logistics feels like my lane's payoff._  Branch identity + the beat-15 variant.
- **E15-S7-T1** — Branch perk: +1 slot — Grant the traveler branch its `+1` transport slot per the branch definition.
- **E15-S7-T2** — Branch perk: −15% destinations — Apply the traveler destination-cost discount.
- **E15-S7-T3** — Beat 15 *Keys to the Coupe* — Author the beat text (≤90 words, wry, ending on a hook toward boats/E16).
- **E15-S7-T4** — Beat gate — Require `own a car` (the first `engine.buyCar`) to fire beat 15.
- **E15-S7-T5** — Choice → flag — The beat's choice sets `flags.firstCar`, granting traveler path points + a starter accessory.
- **E15-S7-T6** — Hybrid line — Bonus line if traveler *and* crypto ≥ P1 ("you financed the coupe with StroopCoin gains, obviously").
- **E15-S7-T7** — Wanderer's Instinct synergy note — Surface that the tree node adds another slot + −20% destinations, teasing ascension.
- **E15-S7-T8** — Path-points source — Award traveler points from destinations owned + cars bought so the lane self-feeds.
- **E15-S7-T9** — Cosmetic badge — Grant a traveler badge (a tiny steering wheel) via `ui:branchBadge` on beat completion.
- **E15-S7-T10** — QA — Verify non-traveler players still pass beat 15 (any branch can own a car).

## E15-S8 — Upkeep vs Upside (balance & tuning)
_As the balance owner, I want upkeep and the logistics `×` tuned so cars are a real choice, so that the fleet enhances the 20h arc without trivializing travel._  Constants fit to targets.
- **E15-S8-T1** — Fit `LOGISTICS.rate` — Tune so a mid-fleet gives a ~1.3–2× destination `×`, comparable to other lanes' boosts.
- **E15-S8-T2** — Upkeep sizing — Set `LOGISTICS.upkeepScale` so net income after upkeep stays positive but the biggest car costs a real fraction of income.
- **E15-S8-T3** — No-brainer check — Verify at least one build where *not* equipping the supercar is optimal, proving upkeep creates a genuine decision.
- **E15-S8-T4** — Slot economy — Balance `baseSlots` + garage/perk slots so fleet composition (many small versus one big) is a live tradeoff.
- **E15-S8-T5** — Travel-time tuning — Tune `speed` → cycling-time reduction so faster destinations feel good but don't collapse the 30–120s pacing band.
- **E15-S8-T6** — Discount stacking — Confirm traveler −15% + `Wanderer's Instinct −20%` never drive destination cost implausibly low (add a floor).
- **E15-S8-T7** — Harness beat time — Run the greedy-ROI harness; confirm beat 15 lands near its `T_target` (~3:00 cumulative per `docs/05 §1`).
- **E15-S8-T8** — Repossession balance — Tune the upkeep grace period so accidental over-equipping is recoverable, not punishing.
- **E15-S8-T9** — Golden file — Commit the logistics milestone curve as a regression fixture.
- **E15-S8-T10** — Cross-lane parity — Compare traveler time-to-beat-15 against the other branches for fairness.

## E15-S9 — Meter's Running (save & offline)
_As a player who steps away, I want upkeep and travel income handled fairly offline, so that returning shows a correct, generous result._  Correct, generous, deterministic offline logistics.
- **E15-S9-T1** — Extend the state schema — Add `state.vehicles = { owned:{id:{count}}, equipped:[ids], garageSlots }` and `state.upkeepAccrued`; bump `version`.
- **E15-S9-T2** — Migration function — Add `MIGRATIONS[N]` initialising an empty fleet, `baseSlots` from config, and converting any E04 transport flag to the new model.
- **E15-S9-T3** — Offline upkeep — Deduct upkeep across the offline macro-steps alongside destination income, netted (never below zero).
- **E15-S9-T4** — Offline logistics × — Apply the equipped-car `×` during offline destination income so away-travel benefits from the fleet.
- **E15-S9-T5** — Cap fairness — Respect `OFFLINE_CAP`; if upkeep would exceed offline income, cap the loss (no returning to a bankrupt garage).
- **E15-S9-T6** — Grace on return — If offline upkeep emptied cash, apply the repossession grace rather than auto-selling on load.
- **E15-S9-T7** — Away summary — Add logistics lines to the "While you were away…" modal ("+cash from N destinations; −upkeep for the fleet").
- **E15-S9-T8** — Export/import — Ensure the fleet + slots survive the base64 round-trip.
- **E15-S9-T9** — Backup safety — Confirm the rotating backup carries the new fields; malformed input keeps the current save.
- **E15-S9-T10** — Migration test — Load a v(previous) fixture; assert the fleet inits without NaN and the equipped list stays within slot capacity.

## E15-S10 — Kicking the Tires (QA & polish)
_As a QA-minded builder, I want the garage bulletproof and satisfying, so that upkeep never goes negative and slots never overflow._  Shipping-quality logistics.
- **E15-S10-T1** — Slot-capacity test — Assert equipping beyond `availableSlots` is rejected and `Σ(slotCost) ≤ slots` always holds.
- **E15-S10-T2** — Upkeep-floor test — Assert upkeep never drives cash below zero, online or offline.
- **E15-S10-T3** — Logistics-purity test — Same equipped set yields the same `×`; pure over state.
- **E15-S10-T4** — Repossession test — Force upkeep > income; assert the costliest car auto-unequips after grace, with no negative cash.
- **E15-S10-T5** — Discount-floor test — Assert stacked destination discounts respect the cost floor.
- **E15-S10-T6** — Edge: sell equipped car — Selling/removing an equipped car frees its slots and recomputes `×` correctly.
- **E15-S10-T7** — Garage juice — Add an engine-rev toast + key-jingle icon on the first car purchase, respecting `prefers-reduced-motion`.
- **E15-S10-T8** — Debug hooks — Debug-panel buttons: grant a car, add slots, toggle upkeep, force repossession.
- **E15-S10-T9** — Console QA — Expose a `window.IV.vehicles` snapshot + a `harness.logistics()` milestone dump.
- **E15-S10-T10** — Formatting pass — Verify upkeep/`×`/travel-time values format cleanly and the garage row never overflows.

## Definition of Done (epic)
- [ ] `data/vehicles.js` and `config.LOGISTICS` shipped; all logistics content is data.
- [ ] Cars are ownable, equippable, and constrained by transport slots (`Σ slotCost ≤ slots`).
- [ ] Equipped cars apply a logistics `×` to destination income and reduce cycling time.
- [ ] Upkeep drains cash so bigger cars are a genuine choice, never an auto-buy; repossession grace implemented.
- [ ] Traveler perks (+1 slot, −15% destinations) and `Wanderer's Instinct` synergy wired.
- [ ] Car-accessory amenity cluster hits the ~60–90s small-win cadence.
- [ ] Tier-11 garage reveal grants slots; reachable by all branches via the neutral gate.
- [ ] Beat 15 *Keys to the Coupe* fires on first car; neutral fallback verified for non-travelers.
- [ ] Constants tuned so beat 15 hits its `T_target` and no build strictly dominates; golden file committed.
- [ ] Offline upkeep + logistics `×` deterministic and generous; migration from the previous version passes with no NaN.
- [ ] Tests green: slot capacity, upkeep floor, logistics purity, repossession, formatting.
