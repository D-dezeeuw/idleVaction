# E10 — Body & Soul
> Personal Growth II (Act II opening) · Tier 8 + Wellness Wing · Body attribute · energy (clicker fuel) · Comfort-cap scaling · Beat 12 *The Body You Travel In* · Build-path emphasis: neutral (crypto/vlogger cosmetic synergy)

**Epic goal:** Open the **Body** attribute — tanning, fitness, spa and wellness — so a pale, slouching Dutchman can invest in the physique he travels in: raising the Comfort **cap** (`comfortCap = COMFORT.cap·(1+0.05·bodyL)`) and feeding a new **energy** resource that makes the optional clicker worth touching.
**Player-visible outcome:** A Wellness Wing bolted onto the Boutique Retreat with a gym, a tanning deck and a spa; a Body level bar that lifts the Comfort ceiling; and an Energy meter that turns idle tapping into a small, real reward without ever being mandatory.
**Systems touched:** `data/skills.js` (body attribute + XP sources), `data/amenities.js` (tan/gym/spa clusters), `data/accommodation.js` (wellness-wing sub-tier of tier 8), `config.js` (`BODY.*`, `ENERGY.*`, `COMFORT.cap`, `COMFORT.bodyCapRate`), `math.js` (comfortCap, energy regen), `engine.js` (energy tick, body XP accrual, `tap()`), `state.js` (`resources.energy`, `skills.body`), `ui.js`.
**Math/balance notes:** `xpToNext(L)=SKILL.base·SKILL.growth^L`; `comfortCap = COMFORT.cap·(1+COMFORT.bodyCapRate·bodyL)` with `bodyCapRate=0.05`, lifting the saturating ceiling `Comfort = comfortCap·ComfortRaw/(ComfortRaw+comfortCap)` so `L_comfort = 1 + COMFORT.mult·log10(1+Comfort/C0)` rises indirectly; `energyMax = ENERGY.base·(1+ENERGY.perBody·bodyL)`, regen `ENERGY.regen·(1+ENERGY.perBody·bodyL)`; Body feeds `ComfortRaw` via `w_body·bodyLevel`; Beat 12 gate `skills.body.level ≥ 8`.

## E10-S1 — Define the Body & its Wellness Data
_As a designer, I want the Body attribute, the energy resource and the tan/gym/spa data declared as plain data, so that the generic engine can drive them without bespoke code._  Establishes the declarative foundation for the whole epic.
- **E10-S1-T1** — Add the Body skill entry — In `data/skills.js` add `body:{id,name,xpBase,xpGrowth,effects:['comfortCap','comfortRaw','energyMax']}` so it slots into the existing XP→level machinery alongside charisma/comms.
- **E10-S1-T2** — Declare the energy resource — Add `energy:0` to `state.resources` defaults and register `energyMax` as a derived (never-serialized) value so energy participates in save/load like cash and comfort.
- **E10-S1-T3** — Author the tanning cluster — Add tan amenities (`sunbed`,`spray_tan`,`golden_hour_deck`,`bronzing_oil`) to `data/amenities.js`, each `{id,name,tag:'tan',costBase,costGrowth:1.5,comfort,xMult,bodyXp}` ramping ~2× per step.
- **E10-S1-T4** — Author the gym cluster — Add gym amenities (`dumbbell_rack`,`treadmill`,`personal_trainer`,`altitude_room`) with `tag:'gym'`, higher `bodyXp` weight than tan, same `costGrowth:1.5`.
- **E10-S1-T5** — Author the spa cluster — Add spa amenities (`sauna`,`hot_stone`,`seaweed_wrap`,`cryo_chamber`) with `tag:'spa'`, higher `comfort` weight than gym, same `costGrowth:1.5`.
- **E10-S1-T6** — Tag amenities as Body-XP sources — Give every tan/gym/spa item a `bodyXp` field so passive Body XP is data-driven, not hardcoded per item in the engine.
- **E10-S1-T7** — Define the Body XP source map — In `data/skills.js` list which activities feed Body XP (owning tan/gym/spa amenity levels, wellness-wing ownership, clicker taps) with per-source weights.
- **E10-S1-T8** — Add the `BODY.*` config block — In `config.js` add `BODY={base:SKILL.base, growth:SKILL.growth, comfortRawWeight:w_body, gateLevel:8}` so all Body knobs live in one place.
- **E10-S1-T9** — Add the `ENERGY.*` config block — Add `ENERGY={base:100, perBody:0.08, regen:2, tapCost:5, tapFloorFrac:0.25}` covering max energy, per-level scaling, regen/s, tap cost, and the depleted-tap floor.
- **E10-S1-T10** — Add the Comfort-cap constants — Add `COMFORT.cap` (base cap) and `COMFORT.bodyCapRate=0.05` to `config.js`, replacing any prior magic ceiling so `comfortCap` is fully tunable.

## E10-S2 — Muscles, Melanin & the Comfort Ceiling
_As a player, I want my Body level to actually raise the Comfort I can accumulate, so that investing in fitness meaningfully lifts my whole economy._  Wires Body into Comfort and energy.
- **E10-S2-T1** — Implement Body `xpToNext`/`level` — Reuse the shared `xpToNext(L)=BODY.base·BODY.growth^L` curve and cumulative-sum level solver from `skills.js`; no bespoke Body math.
- **E10-S2-T2** — Accrue passive Body XP — In `engine.tick(dt)` add `body.xp += dt·Σ(ownedAmenity.bodyXp·level)·BODY.passiveRate` so tan/gym/spa ownership slowly levels the Body.
- **E10-S2-T3** — Implement training purchases — Add a `trainBody(cost)` intent that spends cash for a flat Body XP chunk, giving impatient players a direct lever alongside the passive trickle.
- **E10-S2-T4** — Implement `comfortCap` — In `math.js` add `comfortCap(state)=COMFORT.cap·(1+COMFORT.bodyCapRate·bodyLevel)`, a pure function of Body level only.
- **E10-S2-T5** — Feed the saturating Comfort — Route `comfortCap` into `Comfort = comfortCap·ComfortRaw/(ComfortRaw+comfortCap)` so a higher Body raises the asymptote, not the raw score.
- **E10-S2-T6** — Add Body to `ComfortRaw` — Include `w_body·bodyLevel` (`w_body=BODY.comfortRawWeight`) in `ComfortRaw` so Body helps both the ceiling and the current value.
- **E10-S2-T7** — Implement energy regen tick — In `engine.tick(dt)` add `energy = clamp(energy + dt·ENERGY.regen·(1+ENERGY.perBody·bodyL), 0, energyMax)` so Body speeds recovery.
- **E10-S2-T8** — Implement energy drain on tap — Have `engine.tap()` subtract `ENERGY.tapCost` from energy before computing payout, so tapping is a spend, not free.
- **E10-S2-T9** — Clamp and derive energyMax — Compute `energyMax = ENERGY.base·(1+ENERGY.perBody·bodyL)` each tick and clamp stored energy into `[0, energyMax]` so a Body level-up widens the tank cleanly.
- **E10-S2-T10** — Emit and recompute on level-up — On a Body level-up emit `skill:levelup{skill:'body'}`, recompute `comfortCap`/`energyMax`/Comfort, and let `ui.js` re-render the affected panels.

## E10-S3 — The Wellness Wing Panel
_As a player, I want simple buttons and readouts for fitness, tanning and spa, so that I can see exactly what each purchase does to my body and my Comfort._  Exposes the new system as plain UI.
- **E10-S3-T1** — Render the Body level bar — Add a Body bar showing `level`, current XP and `xpToNext(level)` with a "next level in ~Xs at current XP rate" estimate.
- **E10-S3-T2** — Render the energy meter — Add an Energy meter showing `energy/energyMax` and the live regen rate (`ENERGY.regen·(1+ENERGY.perBody·bodyL)/s`).
- **E10-S3-T3** — Render tan/gym/spa buttons — For each amenity show name, cost, owned level and the next-level Comfort delta, routed through the generic `engine.buyAmenity(id)`.
- **E10-S3-T4** — Preview the Comfort-cap delta — On the Body panel show "+X Comfort ceiling at next Body level" so the abstract cap change is legible before the player commits.
- **E10-S3-T5** — Add training buttons — Add "Train (cash → Body XP)" buttons at a few price tiers wired to `trainBody`, each showing the XP granted.
- **E10-S3-T6** — Add the wing unlock reveal — When the Wellness Wing unlocks, reveal its card with a one-time highlight driven by the `unlock` event.
- **E10-S3-T7** — Write hover tooltips — Add tooltips explaining that Body raises the Comfort *ceiling* and fills the *energy tank*, so players understand it is not a direct income multiplier.
- **E10-S3-T8** — Wire an aria-live level-up line — Announce Body level-ups via an `aria-live="polite"` region for screen readers and the earned-ticker.
- **E10-S3-T9** — Respect reduced motion — Gate the energy-bar fill pulse behind `prefers-reduced-motion` so the meter stays calm when requested.
- **E10-S3-T10** — Subscribe the panel to events — Have the Wellness panel re-render only on `purchase`, `skill:levelup` and `state:changed` events, keeping the UI dumb and cheap.

## E10-S4 — Energy: Fuel for the Clicker
_As an active player, I want tapping to draw on an energy tank that my Body refills, so that the optional clicker is a satisfying between-tick activity that never becomes mandatory._  The epic's signature feature.
- **E10-S4-T1** — Define the `tap()` intent — Add `engine.tap()` as the single entry point for a clicker press, returning a payload `{cash, bodyXp, energyLeft}` for the UI and future combo hook.
- **E10-S4-T2** — Gate payout on energy — If `energy ≥ ENERGY.tapCost`, pay full; otherwise pay `ENERGY.tapFloorFrac` (25%) so an empty tank degrades gracefully instead of blocking taps.
- **E10-S4-T3** — Scale the cash trickle by Body — Set tap cash `= TAP_BASE·(1+0.02·bodyL)·L_comfort` so a fitter tourist taps a little harder, while keeping it a trickle, not a torrent.
- **E10-S4-T4** — Grant Body XP per tap — Award a small `BODY.tapXp` per full-energy tap, closing a gentle loop where tapping trains the very Body that fuels tapping.
- **E10-S4-T5** — Emit a `tap` event for E12 — Emit `tap{full:boolean}` so the future vlogger `comboMult` (E12) can subscribe without E10 depending on Clout.
- **E10-S4-T6** — Implement the empty-energy floor — Ensure taps at zero energy still work at the floor payout and never throw, honoring the "idle floor" contract from `docs/01 §5`.
- **E10-S4-T7** — Prevent energy overflow waste — Cap `energy` at `energyMax`; excess regen is discarded silently so a widened tank from a level-up is the only way to store more.
- **E10-S4-T8** — Add the tap button + cost readout — Add a prominent tap button showing cash-per-tap and the `ENERGY.tapCost`, plus a subtle "low energy" state.
- **E10-S4-T9** — Assert the clicker is never fastest — Add a balance assertion/harness check that sustained max-rate tapping yields `< X%` of idle income, keeping the game an idler not a clicker.
- **E10-S4-T10** — QA taps at zero energy — Test rapid tapping past depletion: payout drops to the floor, energy never goes negative, and Body XP only accrues on full taps.

## E10-S5 — The Spa Menu (small-wins cluster)
_As a poolside idler, I want a menu of increasingly ridiculous spa treatments to unlock, so that there is a new soothing thing to buy every couple of minutes plus a Comfort bump._  A dense, cheap flavor cluster.
- **E10-S5-T1** — Define spa items — Confirm the `tag:'spa'` chain (`sauna → hot_stone → seaweed_wrap → cryo_chamber → floatation_tank → gold_leaf_facial`), each `{costBase,costGrowth:1.5,comfort,xMult,bodyXp}`, ramping ~2× per step.
- **E10-S5-T2** — Wire the purchase flow — Route every spa buy through the generic `engine.buyAmenity(id)`; add zero bespoke spa purchase code.
- **E10-S5-T3** — Feed the Comfort contribution — Add spa `amenityScore` into `ComfortRaw` and confirm the saturating cap still holds as the chain grows.
- **E10-S5-T4** — Add a targeted multiplier — Give spa items a small `xMult` scoped via `L_path`/tag so they nudge income modestly, not globally.
- **E10-S5-T5** — Trickle Body XP from the spa — Use each item's `bodyXp` so lounging in the sauna slowly levels Body, reinforcing the wellness theme.
- **E10-S5-T6** — Gate the unlock reveals — Reveal each spa tier behind the previous item plus a Comfort threshold, emitting `unlock` so it pops onto the panel.
- **E10-S5-T7** — Write the flavor copy — One-line wry Dutch-tourist descriptions (e.g. "Cryo chamber: colder than a Rotterdam tram platform in February, but on purpose this time").
- **E10-S5-T8** — Build the UI buttons — Show name, cost, owned level and next-Comfort delta for each spa item, consistent with other amenity buttons.
- **E10-S5-T9** — Balance the cadence — Tune `costBase`/`costGrowth` so a new spa item is affordable roughly every 60–90s of active play at this stage; confirm via the harness purchase log.
- **E10-S5-T10** — QA the spa cluster — Test zero-cash presses, rapid buys, Comfort recompute after each purchase, and that no spa item is granted for free during offline catch-up.

## E10-S6 — The Wellness Wing (progression step)
_As a guest of the Boutique Retreat, I want to add a Wellness Wing to my accommodation, so that my stay gains a permanent Comfort source and unlocks Beat 12._  The epic's accommodation step (a sub-tier of tier 8).
- **E10-S6-T1** — Add the wing sub-tier — In `data/accommodation.js` add a `wellness_wing` add-on to tier 8 with its own `accScore` bump, modeled as an owned sub-feature rather than a full ladder step.
- **E10-S6-T2** — Gate the wing — Gate purchase behind a Comfort threshold and `skills.body.level ≥ BODY.gateLevel(8)`, so the wing arrives as Body matures.
- **E10-S6-T3** — Contribute to `accScore` — Feed the wing's bonus into `accScore` so Comfort rises when the wing is owned, persistently.
- **E10-S6-T4** — Raise the base cap — Have the wing add a small flat term to `COMFORT.cap` while owned, so it lifts the ceiling on top of the Body multiplier.
- **E10-S6-T5** — Hook Beat 12 — On wing purchase (or Body L≥8) satisfy the Beat 12 gate *The Body You Travel In* and emit `story:beat`.
- **E10-S6-T6** — Write the wing flavor — Author the reveal copy in the Dutch-abroad voice ("A whole wing devoted to your wellbeing — a concept previously limited to the sauna at the municipal pool back home").
- **E10-S6-T7** — Build the reveal card — Add the wing's UI card with cost, its Comfort/cap contribution and a one-time unlock highlight.
- **E10-S6-T8** — Tie the story gate — Ensure Beat 12's `requires` in `STORY_GATES` reads `body.level ≥ 8` and cross-check it matches `data/story.js`.
- **E10-S6-T9** — Migrate default ownership — Default `wellness_wing:{owned:false}` for pre-E10 saves so old games see it as newly available, not retroactively owned.
- **E10-S6-T10** — QA the gating — Verify the wing cannot be bought below the Body/Comfort gate and that owning it correctly raises both current Comfort and the ceiling.

## E10-S7 — Tan for the Camera, Abs on the Blockchain (path flavor)
_As a path-focused player, I want my Body to visibly synergize with my chosen build, so that fitness feels like part of the vlogger/crypto fantasy rather than a side chore._  Serves the emphasized paths cosmetically and mechanically.
- **E10-S7-T1** — Add a vlogger cosmetic flag — When `story.branch==='vlogger'` and Body is high, set a `photogenic` flag that later boosts content flavor and a tiny Clout readiness (hook for E12).
- **E10-S7-T2** — Add a crypto "poolside tan" flag — For `crypto`, give a cosmetic `sunKissed` flag reinforcing the "money works while I tan" fantasy, with no mechanical lock-in.
- **E10-S7-T3** — Cross-link Body and Charisma — Add a small synergy where high Body grants a minor Charisma XP trickle (the confidence of a good tan), stacking additively inside `L_skill`.
- **E10-S7-T4** — Prime combo readiness — Since energy fuels taps and taps feed the future `comboMult`, ensure a fit Body (bigger tank) naturally enables longer vlogger combos in E12.
- **E10-S7-T5** — Trickle path points from training — Award a tiny `pathPoints` trickle to the active branch when training Body, so the epic advances whatever lane the player favors.
- **E10-S7-T6** — Write branch copy variants — Author branch-flavored one-liners for the wing/spa (vlogger: "great lighting on those delts"; connoisseur: "a discreet, tasteful sort of fitness").
- **E10-S7-T7** — Add a hybrid bonus — If Body is high *and* the vlogger path is active, grant a small extra Comfort/Clout-readiness bonus, rewarding mixed builds per `docs/02`.
- **E10-S7-T8** — Keep neutral players whole — Ensure a `neutral` branch loses no core Body value; path flavor is strictly additive on top of the shared mechanics.
- **E10-S7-T9** — Store flags in state — Persist the cosmetic flags under `story.flags` so branch color survives saves and can be read by later epics.
- **E10-S7-T10** — QA branch variants — Test each branch to confirm the correct copy/flags appear, no branch gains an unfair edge, and neutral is unaffected.

## E10-S8 — Tuning the Body Curve (balance & tuning)
_As a balancer, I want the Body constants set so leveling to 8 lands on the Beat-12 pacing target, so that the epic fits the 20-hour arc._  Sets and validates the epic's numbers.
- **E10-S8-T1** — Set the Body XP curve — Fix `BODY.base` and `BODY.growth` (reusing `SKILL.base=50`, `SKILL.growth=1.25`) so reaching Body L8 aligns with the Beat-12 window.
- **E10-S8-T2** — Set the comfort-cap rate — Confirm `COMFORT.bodyCapRate=0.05` gives a felt but not explosive ceiling lift (≈+40% cap at L8).
- **E10-S8-T3** — Set the energy constants — Tune `ENERGY.base`, `ENERGY.perBody`, `ENERGY.regen`, `ENERGY.tapCost` so a fresh tank lasts a short satisfying burst and refills in ~30–60s.
- **E10-S8-T4** — Price the amenity clusters — Set tan/gym/spa `costBase` values so the three chains interleave into a steady "new thing every ~60–90s" cadence.
- **E10-S8-T5** — Run the harness to Beat 12 — Simulate with the greedy policy and confirm `T(beat 12)` sits on the smooth curve between Beat 10 (~1:10) and Beat 13.
- **E10-S8-T6** — Verify energy never dominates — Confirm via harness that maxed tapping contributes a small single-digit percentage of income, per the anti-clicker rule.
- **E10-S8-T7** — Verify the cap lift is felt — Check that Body L8 measurably raises steady-state Comfort and hence `L_comfort`, without trivially maxing the saturating curve.
- **E10-S8-T8** — Update the golden file — Commit the new milestone curve as the balance golden file so future regressions are caught.
- **E10-S8-T9** — Cross-check indirect `L_comfort` — Log the `L_comfort` gain attributable to Body and confirm it stacks multiplicatively across layers as intended.
- **E10-S8-T10** — Document the constants — Add inline `config.js` comments explaining each `BODY.*`/`ENERGY.*` knob and its pacing role, matching the `docs/05` lever list.

## E10-S9 — Persisting Gains (save / migration / offline)
_As a returning player, I want my Body level and energy to survive saves and reloads, so that hours of wellness investment are never lost and offline stays fair._  Save correctness for the new state.
- **E10-S9-T1** — Persist the Body skill — Serialize `skills.body:{xp,level}` in the save blob so progress round-trips through `JSON.stringify`.
- **E10-S9-T2** — Persist energy — Serialize `resources.energy` (clamped on load to the recomputed `energyMax`) so the tank restores sensibly.
- **E10-S9-T3** — Persist wing & amenity levels — Save `wellness_wing.owned` and all tan/gym/spa amenity levels so the wing and clusters restore exactly.
- **E10-S9-T4** — Add a migration — Bump `state.version` and add a `MIGRATIONS` entry defaulting `skills.body`, `resources.energy` and wing/amenity fields for older saves.
- **E10-S9-T5** — Regen energy offline — During offline catch-up, regenerate energy through the same tick so returning players find a topped-up tank (bounded by `energyMax`).
- **E10-S9-T6** — Accrue Body XP offline — Let passive Body XP from owned amenities accumulate during offline macro-steps, matching online math exactly.
- **E10-S9-T7** — Recompute cap on load — On load, recompute `comfortCap`/Comfort from the restored Body level before the first render so no stale ceiling flashes.
- **E10-S9-T8** — Grant no free offline items — Ensure offline never *buys* amenities or the wing; only resources/XP that flow from owned state accrue.
- **E10-S9-T9** — Extend export/import — Include the new Body/energy/wing fields in the base64 export string and guard the import against missing fields.
- **E10-S9-T10** — QA old-save load — Load a pre-E10 fixture save and assert the migration yields a valid, playable state with Body 0 and a full/rational energy tank.

## E10-S10 — Sweat the Details (QA / polish / juice)
_As a QA-minded developer, I want the Body and energy systems covered by tests and small feedback flourishes, so that the epic is robust and satisfying._  Hardening and juice.
- **E10-S10-T1** — Unit-test the XP curve — Assert `xpToNext`/`level` for Body across boundary XP values, including exact-threshold and off-by-one cases.
- **E10-S10-T2** — Test comfortCap monotonicity — Assert `comfortCap` is strictly increasing in Body level and that Comfort stays below the cap for all inputs.
- **E10-S10-T3** — Test energy clamping — Assert energy never exceeds `energyMax` nor drops below 0 across regen, taps and level-ups.
- **E10-S10-T4** — Test tap-at-zero — Assert a tap with empty energy pays the floor fraction, grants no Body XP, and emits `tap{full:false}`.
- **E10-S10-T5** — Format energy numbers — Route energy/energyMax through `util.format` so large tanks render with proper suffixes, not raw integers.
- **E10-S10-T6** — Juice the energy bar — Add a subtle fill/pulse on regen and a shake on a full-energy tap, both gated by `prefers-reduced-motion`.
- **E10-S10-T7** — Juice the level-up — Show a small "Body Level Up!" toast with the new Comfort-ceiling gain when Body levels.
- **E10-S10-T8** — Edge: extreme game speed — Test `gameSpeed=1000` and confirm energy regen, Body XP and Comfort all remain finite and clamped.
- **E10-S10-T9** — Edge: rapid spa buys — Stress-buy the spa chain and confirm no double-charge, correct Comfort recompute and stable UI.
- **E10-S10-T10** — Regression: Comfort correctness — Compare pre/post-epic Comfort at fixed states to confirm Body integration didn't shift the saturating formula unexpectedly.

## Definition of Done (epic)
- [ ] Body attribute levels via the shared `xpToNext=SKILL.base·SKILL.growth^L` curve from both passive amenity XP and paid training.
- [ ] `comfortCap = COMFORT.cap·(1+0.05·bodyL)` lifts the saturating Comfort ceiling and Body feeds `ComfortRaw` via `w_body·bodyLevel`.
- [ ] Energy resource with `energyMax`/regen scaled by Body; `engine.tap()` spends energy, degrades to a floor when empty, and emits `tap` for E12.
- [ ] Tan, gym and spa amenity clusters ship with wry copy and hit the ~60–90s active-play cadence.
- [ ] Wellness Wing sub-tier unlocks behind a Body/Comfort gate and satisfies Beat 12 *The Body You Travel In*.
- [ ] Path flavor (vlogger/crypto cosmetics, hybrid bonus) is additive with no branch lock-in; neutral players lose nothing.
- [ ] Harness confirms Beat 12 pacing and that tapping stays a small fraction of income; golden file updated.
- [ ] Save/migration/offline persist Body, energy, wing and amenities; old saves migrate; no free offline purchases.
- [ ] Tests cover XP curve, comfortCap monotonicity, energy clamps and tap-at-zero; number formatting and reduced-motion respected.
