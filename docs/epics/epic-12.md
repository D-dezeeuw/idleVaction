# E12 — Lights, Camera, Clout
> The Climb (Act II, first branch epic) · Tier 11 band (Creator Loft within the Grand Wing) · Clout currency · content tiers · sponsor deals · active-play `comboMult` · Beat 14 variant *Going Viral* · Build-path emphasis: **Vlogger**

**Epic goal:** Build the **Luxury Vlogging Backpacker** economy — a second currency, **Clout**, produced by content generators and amplified by an active-play **combo** that rewards (but never requires) tapping, plus sponsor deals and the vlogger branch perk.
**Player-visible outcome:** A Creator Dashboard with a Clout counter, content buttons, a decaying **combo meter** that lights up when you tap, sponsor-deal cards to accept, creator gear to unlock, and a vlogger-flavored loft — all completable idle, all juicier when you play actively.
**Systems touched:** `data/paths.js` (vlogger points + perk), `data/generators.js`/content data (content tiers), `data/amenities.js` (creator gear), `data/accommodation.js` (Creator Loft in tier-11 band), `data/story.js` (Beat 14 *Going Viral*), `config.js` (`CLOUT.*`, `PATH.rate`, `PATH.softcapExp`), `math.js` (Clout rate, combo), `engine.js` (Clout tick, combo decay, sponsors), `state.js` (`resources.clout`, `combo`, sponsors), `ui.js`.
**Math/balance notes:** `dClout/dt = contentRate·(1 + charisma·0.02)·comboMult`; `comboMult` climbs on `tap` events (from E10) and **decays over ~30s** with an idle floor `comboMult ≥ 1`; vlogger branch perk **Clout ×1.25**; `L_path(social) = 1 + PATH.rate·points^PATH.softcapExp` (`softcapExp=0.85`) on social tiers D2/D3; sponsor deals apply timed multipliers; Beat 14 gate `path points ≥ P1`.

## E12-S1 — The Content Calendar (data model)
_As a designer, I want Clout, content tiers, sponsors and combo declared as data, so that the vlogger economy plugs into the generic engine and config._  Establishes the branch's declarative foundation.
- **E12-S1-T1** — Add the Clout resource — Add `clout:0` to `state.resources` defaults so Clout serializes and formats like cash/comfort.
- **E12-S1-T2** — Author the content tiers — Define content generators (`selfie_post → story_reel → daily_vlog → travel_series → documentary`) in the content data, each `{costBase,costGrowth,contentRate}` producing Clout up the chain.
- **E12-S1-T3** — Author sponsor deals — Add sponsor-deal data `{id,name,mult,durationSec,cooldownSec,requires}` (e.g. energy-drink, luggage brand, dubious crypto exchange) as timed Clout multipliers.
- **E12-S1-T4** — Add the `CLOUT.*` config block — In `config.js` add `CLOUT={contentBase, charismaCoupling:0.02, comboDecaySec:30, comboMax:5, comboPerTap:0.25, vloggerPerk:1.25}`.
- **E12-S1-T5** — Declare the combo state — Add `state.combo={mult:1, points:0, lastTapAt:0}` so combo persists shape (values reset to floor on load).
- **E12-S1-T6** — Encode the vlogger perk — Store the `×1.25` Clout perk as a data flag keyed on `story.branch==='vlogger'`, not a hardcoded constant in the engine.
- **E12-S1-T7** — Set the charisma coupling — Confirm the `+0.02·charisma` term lives in `CLOUT.charismaCoupling` so the skill→Clout link is tunable.
- **E12-S1-T8** — Author the creator gear — Add a `tag:'gear'` amenity cluster (`ring_light`,`gimbal`,`clip_mic`,`drone`,`4k_camera`) with `costGrowth:1.5`, small `comfort` + `contentRate` bumps.
- **E12-S1-T9** — Add the Beat 14 variant — Add Beat 14 *Going Viral* to `data/story.js` as the vlogger variant with `requires:{pathPoints:'P1'}` and a Clout grant.
- **E12-S1-T10** — Define the P1 path gate — Add the `P1` path-points threshold to `config.STORY_GATES` so Beat 14 unlocks at the right vlogger investment.

## E12-S2 — The Clout Economy (core logic / engine)
_As a player, I want Clout to accumulate from my content, my charisma and my combo, so that building an audience is a real second economy._  Implements the Clout production formula.
- **E12-S2-T1** — Implement the Clout rate — In `math.js` add `cloutRate(state)=contentRate·(1+charisma·CLOUT.charismaCoupling)·comboMult`, a pure function of state.
- **E12-S2-T2** — Aggregate contentRate — Sum `contentRate` across owned content tiers (with their multiplier stack) so higher content tiers dominate as they should.
- **E12-S2-T3** — Update combo on taps — Subscribe to the `tap` event from E10; on a full tap add `CLOUT.comboPerTap` to `combo.points` (capped at `comboMax`) and stamp `lastTapAt`.
- **E12-S2-T4** — Decay the combo — In `engine.tick`, decay `combo.points` toward 0 over `CLOUT.comboDecaySec` (~30s) since the last tap, so combos fade when you stop.
- **E12-S2-T5** — Enforce the idle floor — Compute `comboMult = 1 + combo.points` clamped so it never drops below 1, guaranteeing idle Clout is never gated by active play.
- **E12-S2-T6** — Apply sponsor multipliers — Multiply `cloutRate` by the product of currently-active sponsor `mult`s, expiring each when its `durationSec` elapses.
- **E12-S2-T7** — Apply the vlogger perk — When `branch==='vlogger'`, multiply Clout gain by `CLOUT.vloggerPerk` (×1.25), stacking cleanly on top of the base rate.
- **E12-S2-T8** — Add Clout sinks — Let Clout be spent on content-tier upgrades and cosmetic unlocks so it is a currency with purpose, not just a counter.
- **E12-S2-T9** — Feed Charisma XP back — Grant a Charisma XP trickle proportional to content output, so vlogging trains the charisma that boosts vlogging.
- **E12-S2-T10** — Emit Clout events — Emit `clout:gain` and `clout:spend` so the UI ticker and combo meter update without polling.

## E12-S3 — The Creator Dashboard (UI / buttons)
_As a player, I want a dashboard for Clout, content and sponsors, so that I can watch my audience grow and jump on combos and deals._  Exposes the vlogger economy as plain UI.
- **E12-S3-T1** — Render the Clout readout — Show current Clout and `+clout/s` (via `util.format`) prominently on the dashboard.
- **E12-S3-T2** — Render the combo meter — Show `comboMult` with a countdown/bar to its next decay tick, so players see the ~30s window.
- **E12-S3-T3** — Render content buttons — For each content tier show name, cost, owned count and its `contentRate` contribution, routed through the generic buy flow.
- **E12-S3-T4** — Render sponsor cards — Show available sponsor deals with their `mult`, duration and an Accept button; grey out ones on cooldown.
- **E12-S3-T5** — Emphasize the tap button — Make the tap button visually reinforce the combo (fills the meter), tying E10's clicker to Clout.
- **E12-S3-T6** — Add the unlock reveal — Reveal the Creator Dashboard with a one-time highlight when the vlogger economy unlocks (Clout > 0 or branch chosen).
- **E12-S3-T7** — Announce Clout gains — Route Clout ticks and combo peaks to an `aria-live="polite"` line for accessibility.
- **E12-S3-T8** — Respect reduced motion — Gate the combo-meter pulse and "viral" flourishes behind `prefers-reduced-motion`.
- **E12-S3-T9** — Show the branch badge — Display the vlogger branch badge and perk (×1.25) so the identity is visible.
- **E12-S3-T10** — Subscribe the dashboard — Re-render on `clout:gain`, `purchase`, `tap` and `unlock` events only, keeping it cheap.

## E12-S4 — The Combo Meter (the headline new thing)
_As an active player, I want tapping to build a combo that multiplies my Clout and decays if I stop, so that there's an optional high-skill layer that never blocks idle progress._  The epic's signature active-play feature.
- **E12-S4-T1** — Model the combo state — Implement `combo={points, mult, lastTapAt}` as the single source of truth for active-play bonus.
- **E12-S4-T2** — Increment on tap — On each full-energy `tap`, raise `combo.points` by `comboPerTap`, capped at `CLOUT.comboMax`, so a hot streak tops out cleanly.
- **E12-S4-T3** — Implement the decay curve — Linearly (or exponentially) decay `combo.points` to 0 over `comboDecaySec≈30s` from `lastTapAt`, so the meter drains predictably.
- **E12-S4-T4** — Derive `comboMult` — Compute `comboMult = clamp(1 + combo.points, 1, 1+comboMax)` so the mapping from points to multiplier is legible.
- **E12-S4-T5** — Feed Clout and a cash trickle — Apply `comboMult` to Clout (primary) and a small cash trickle (secondary), so combos feel rewarding on both meters.
- **E12-S4-T6** — Guarantee the idle floor — Assert `comboMult≥1` at all times so a player who never taps still earns full idle Clout.
- **E12-S4-T7** — Couple to energy — Because taps cost E10 energy, let the energy tank naturally throttle combo length, making Body an enabler of longer combos.
- **E12-S4-T8** — Build the combo bar — Add a color-state combo bar (cold → warm → viral) that fills on taps and drains on decay.
- **E12-S4-T9** — Balance active vs idle — Tune `comboPerTap`/`comboMax`/`decay` so active play gives a meaningful but bounded uplift over pure idle (target ratio in `docs/05`).
- **E12-S4-T10** — QA the decay timing — Test that the combo fully decays in ~30s of no taps, holds at max under sustained tapping, and never exceeds `1+comboMax`.

## E12-S5 — Creator Gear (small-wins cluster)
_As an aspiring influencer, I want a growing kit of camera gear to unlock, so that there's a new toy every few minutes that bumps my content rate and Comfort._  A cheap, flavored amenity cluster.
- **E12-S5-T1** — Define the gear items — Confirm the `tag:'gear'` chain (`ring_light → gimbal → clip_mic → drone → 4k_camera → studio_setup`), each `costGrowth:1.5`, ramping ~2× per step.
- **E12-S5-T2** — Wire the purchase flow — Route every gear buy through the generic `engine.buyAmenity(id)`; no bespoke gear code.
- **E12-S5-T3** — Feed a small Comfort bump — Add gear `amenityScore` into `ComfortRaw` so the kit contributes modestly to Comfort too.
- **E12-S5-T4** — Boost content with `xMult` — Give gear a `contentRate`/`xMult` scoped to content/social tiers so better gear means faster Clout.
- **E12-S5-T5** — Tag the contentRate bonus — Mark each gear item's `contentRate` bonus so it feeds `cloutRate` through the same aggregation as content tiers.
- **E12-S5-T6** — Gate the unlock reveals — Reveal each gear tier behind the previous plus a Clout/Comfort threshold, emitting `unlock`.
- **E12-S5-T7** — Write the flavor copy — One-line Dutch-tourist descriptions (e.g. "Drone: for the sweeping aerial shot of you looking pensive, which the algorithm demands").
- **E12-S5-T8** — Build the UI buttons — Show name, cost, owned level and next content-rate/Comfort delta per gear item.
- **E12-S5-T9** — Balance the cadence — Tune costs so a new gear item is affordable roughly every 60–90s active; confirm via harness.
- **E12-S5-T10** — QA the gear cluster — Test zero-cash presses, rapid buys, contentRate recompute, and no free offline gear.

## E12-S6 — The Creator Loft (accommodation step)
_As a vlogger on the rise, I want a loft in the Grand Wing set up for shooting, so that my accommodation reflects my hustle and unlocks Beat 14._  The epic's accommodation step within the shared tier-11 band.
- **E12-S6-T1** — Add the Creator Loft sub-entry — In `data/accommodation.js` add a vlogger-flavored `creator_loft` within the tier-11 band (the Grand Luxury Wing is finalized in E14), with its own `accScore` bump.
- **E12-S6-T2** — Gate by vlogger path — Gate the loft behind vlogger `path points` and a Comfort threshold so it reads as a branch reward, not a default step.
- **E12-S6-T3** — Contribute to `accScore` — Feed the loft's bonus into `accScore` so owning it raises Comfort persistently.
- **E12-S6-T4** — Reveal + Beat 14 — On loft purchase (or `pathPoints ≥ P1`) satisfy Beat 14 *Going Viral* and emit `story:beat`.
- **E12-S6-T5** — Add a loft content bonus — Give the loft a small standing `contentRate` bonus (good backdrops, ring lights everywhere) so it aids Clout directly.
- **E12-S6-T6** — Write the loft flavor — Author the reveal copy ("A loft with north-facing light and a ring light in every room — your poncho now hangs on an aesthetic hook").
- **E12-S6-T7** — Build the reveal card — Add the loft's UI card with cost, its Comfort/content contribution and a one-time unlock highlight.
- **E12-S6-T8** — Tie the P1 gate — Ensure Beat 14's `requires` reads `pathPoints ≥ P1` in both `STORY_GATES` and `data/story.js`, and note the shared tier-11 hub.
- **E12-S6-T9** — Migrate default ownership — Default the loft as not-owned for older saves so it presents as newly available.
- **E12-S6-T10** — QA the gating — Verify the loft gates on vlogger points/Comfort, aids content, and that Beat 14 fires once.

## E12-S7 — The Vlogger Perk (path / branch flavor)
_As a committed vlogger, I want my branch to grant a real Clout edge and a stronger combo, so that choosing the camera feels distinct and rewarding._  Delivers the branch's mechanical identity while keeping combination builds first-class.
- **E12-S7-T1** — Apply the Clout ×1.25 perk — When `story.branch==='vlogger'`, apply `CLOUT.vloggerPerk` to all Clout gain, the branch's signature bonus.
- **E12-S7-T2** — Strengthen the vlogger combo — For vloggers, grant a higher `comboMax` or slower decay so active play pays off more for the committed creator.
- **E12-S7-T3** — Boost social tiers via `L_path` — Apply `L_path(social)=1+PATH.rate·points^0.85` to D2/D3 so vlogger points also lift the shared income ladder.
- **E12-S7-T4** — Earn path points — Award vlogger `pathPoints` from content spend and the Beat 14 choice, so investment compounds.
- **E12-S7-T5** — Write the *Going Viral* beat — Author the Beat 14 vlogger variant text in the wry Dutch-abroad voice, ending on a hook toward sponsors/logistics.
- **E12-S7-T6** — Add hybrid bonuses — Add small hybrid perks (vlogger+traveler "travel vlog" `×`, vlogger+crypto "sponsored token shill") to reward mixed builds per `docs/02`.
- **E12-S7-T7** — Scale sponsors with charisma/branch — Make better sponsor deals available at higher Charisma / vlogger points so the branch deepens sponsor value.
- **E12-S7-T8** — Keep neutral players earning — Ensure non-vlogger branches still earn baseline Clout (no perk, no lock-out) so the economy is universal.
- **E12-S7-T9** — Make points respec-safe — Ensure vlogger path points are refundable/re-specable so a player can pivot without losing the Clout economy.
- **E12-S7-T10** — QA the branch perk — Test that the ×1.25 perk, stronger combo and hybrids apply only under the right flags and that neutral is unaffected.

## E12-S8 — Tuning Clout & Combo (balance & tuning)
_As a balancer, I want the Clout, combo and sponsor constants set to the Beat-14 target, so that the vlogger economy paces well and active play stays bounded._  Sets and validates the epic's numbers.
- **E12-S8-T1** — Set the content base — Tune `CLOUT.contentBase` so early content produces a satisfying starter Clout trickle without dwarfing cash.
- **E12-S8-T2** — Set the combo constants — Fix `comboDecaySec=30`, `comboMax` and `comboPerTap` so the combo feels responsive and tops out in a few seconds of tapping.
- **E12-S8-T3** — Set sponsor multipliers — Tune sponsor `mult`, `durationSec` and `cooldownSec` so deals are exciting spikes, not permanent crutches.
- **E12-S8-T4** — Set the path constants — Confirm `PATH.rate` and `PATH.softcapExp=0.85` and the `P1` gate so vlogger points feel great early but softcap for whales.
- **E12-S8-T5** — Confirm the perk value — Validate the `×1.25` vlogger perk is felt but not mandatory for progression.
- **E12-S8-T6** — Run the harness to Beat 14 — Simulate and confirm `T(beat 14)` lands on the smooth curve (~2:30, between Beat 13 and Beat 15 ~3:00).
- **E12-S8-T7** — Bound the active-play upside — Verify combo + sponsors give a meaningful but capped uplift so active play never trivializes the curve.
- **E12-S8-T8** — Confirm the idle path completes — Verify a never-tapping, no-sponsor idle player still reaches Beat 14 on target via the floor `comboMult=1`.
- **E12-S8-T9** — Update the golden file — Commit the resulting milestone curve as the balance golden file.
- **E12-S8-T10** — Document the constants — Comment each `CLOUT.*`/`PATH.*` knob in `config.js` with its pacing and anti-runaway role.

## E12-S9 — Clout While You Sleep (save / migration / offline)
_As a returning player, I want my Clout, content and sponsors handled correctly across sessions, so that the vlogger economy is reliable offline._  Save correctness for the new state.
- **E12-S9-T1** — Persist Clout — Serialize `resources.clout` so the audience currency round-trips through save/load.
- **E12-S9-T2** — Reset combo on load — Persist `combo` shape but floor `combo.points=0`/`mult=1` on load, since there are no active taps while away.
- **E12-S9-T3** — Persist active sponsors — Save active sponsor deals with their `expiry`, and expire any that lapsed during downtime on load.
- **E12-S9-T4** — Persist content, gear, loft — Save content-tier counts, creator-gear levels and loft ownership so the whole economy restores.
- **E12-S9-T5** — Add a migration — Bump `state.version` and default `clout`, `combo`, sponsors, content and loft fields for pre-E12 saves.
- **E12-S9-T6** — Floor combo offline — During offline catch-up compute Clout with `comboMult=1` (no offline taps), keeping away-progress honest.
- **E12-S9-T7** — Earn Clout offline — Let content tiers produce Clout during offline macro-steps through the same tick, bounded by the offline cap.
- **E12-S9-T8** — Summarize offline Clout — Include "+X Clout" (and any sponsor expiries) in the "While you were away" modal.
- **E12-S9-T9** — Extend export/import — Add Clout/combo/sponsor/content/loft fields to the export string, guarding malformed imports.
- **E12-S9-T10** — QA old-save + expiries — Load a pre-E12 fixture and a save with an in-flight sponsor; assert clean defaults and correct on-load expiry.

## E12-S10 — Going Viral (QA / polish / juice)
_As a QA-minded developer, I want the Clout economy covered by tests and a little viral sparkle, so that the vlogger path is robust and fun._  Hardening and juice.
- **E12-S10-T1** — Unit-test the Clout formula — Assert `cloutRate = contentRate·(1+charisma·0.02)·comboMult` for crafted states, including perk and sponsor factors.
- **E12-S10-T2** — Test the combo decay timing — Assert `combo.points` reaches 0 in ~`comboDecaySec` and holds at `comboMax` under sustained taps.
- **E12-S10-T3** — Test sponsor expiry — Assert sponsor multipliers apply for exactly `durationSec` and then drop, respecting cooldown.
- **E12-S10-T4** — Test the idle floor — Assert a never-tapping player always has `comboMult=1` and still earns Clout.
- **E12-S10-T5** — Test the vlogger perk — Assert Clout gain is ×1.25 only when `branch==='vlogger'` and unchanged otherwise.
- **E12-S10-T6** — Test the charisma coupling — Assert raising Charisma raises `cloutRate` by exactly the `+0.02·charisma` factor.
- **E12-S10-T7** — Juice the viral burst — Add a celebratory burst when the combo hits max ("Going viral!"), gated by `prefers-reduced-motion`.
- **E12-S10-T8** — Format Clout numbers — Route Clout and `+clout/s` through `util.format` for K/M/scientific suffixes.
- **E12-S10-T9** — Edge: extreme game speed — Test `gameSpeed=1000` and confirm Clout, combo decay and sponsor timers stay finite and correct.
- **E12-S10-T10** — Regression: no lock-in — Assert neutral/other branches still earn Clout, path points respec cleanly, and no build is stranded.

## Definition of Done (epic)
- [ ] Clout is a second currency produced by `dClout/dt = contentRate·(1+charisma·0.02)·comboMult`, with content tiers, sinks and a Charisma feedback loop.
- [ ] The combo meter climbs on E10 taps, decays over ~30s, is capped at `1+comboMax`, and never drops below the idle floor of 1.
- [ ] Sponsor deals apply timed Clout multipliers with cooldowns; the vlogger perk grants Clout ×1.25 and a stronger combo.
- [ ] `L_path(social)=1+PATH.rate·points^0.85` boosts D2/D3; hybrid bonuses reward mixed builds; no branch is locked in or stranded.
- [ ] Creator gear cluster ships with wry copy and hits the ~60–90s cadence; the Creator Loft unlocks in the tier-11 band and satisfies Beat 14 *Going Viral* at `pathPoints ≥ P1`.
- [ ] Harness confirms Beat 14 pacing, that active play is a bounded uplift, and that a pure-idle player still completes on target; golden file updated.
- [ ] Save/migration/offline persist Clout, content, gear, loft and sponsors; combo floors to 1 offline; lapsed sponsors expire correctly on load.
- [ ] Tests cover the Clout formula, combo decay, sponsor expiry, idle floor, the vlogger perk and charisma coupling; Clout numbers formatted and reduced-motion respected.
