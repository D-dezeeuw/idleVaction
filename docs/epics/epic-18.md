# E18 — The Sail-Shaped Hotel
> Act II climb · Accommodation tiers 12–13 (6-star sail-shaped → Ultra Penthouse) · 6-star amenity tier, D6/D7 onboarding, Taste/exclusivity gate, gold-everything cosmetics · Beat 18 (*The Sail-Shaped Hotel*) · Connoisseur emphasis

**Epic goal:** Deliver the mid-game "I made it" tier — a Burj-style, sail-shaped 6-star hotel and the Ultra Penthouse above it — as the biggest single accommodation step yet, gated behind Taste and exclusivity so it feels earned, not merely expensive.
**Player-visible outcome:** Two new accommodation tiers (12 and 13), a velvet-rope gate that needs real Taste, a dense gold-everything cosmetic cluster, and pressure to onboard the D6/D7 income tiers to afford it all.
**Systems touched:** `data/accommodation.js` (tiers 12/13 + gates), `data/amenities.js` (gold + six-star clusters), `data/generators.js` (D6/D7 onboarding), `data/skills.js` (Taste gate), `config.js` (`ACC.base/growth/unlock`, `tasteGate`, `exclGate`, `GEN.base/growth[5..6]`), `engine.js`, `ui.js`, `state.js`.
**Math/balance notes:** Big `accScore` step at `ACC.growth≈2.6` for tiers 12/13; D6/D7 onboarding uses `GEN.base[5]=1.4e6, growth[5]=1.13` and `GEN.base[6]=1.5e7, growth[6]=1.14`; entry gated on `skills.taste.level>=tasteGate` and `exclusivity>=exclGate` (E14); gold cosmetics use a steep `costGrowth≈1.9` and feed exclusivity + Comfort.

## E18-S1 — Blueprints for a Sail (data model)
_As a climber staring up at a sail-shaped tower, I want the 6-star tier defined as data, so that the biggest accommodation jump yet is real and buyable._  One data set drives the tier, the penthouse, and the gold.
- **E18-S1-T1** — Add tiers 12 & 13 — In `data/accommodation.js` add tier 12 "6-Star (Sail-Shaped)" and tier 13 "Ultra Penthouse" with `accScore`, `unlock`, and reveal copy.
- **E18-S1-T2** — Set the big `accScore` step — Give tiers 12/13 their `ACC_BASE·ACC_GROWTH^12/13` scores (`ACC.growth≈2.6`) so the Comfort jump is dramatic.
- **E18-S1-T3** — Add the gate fields — Add `tasteGate` (required Taste level) and `exclGate` (required exclusivity) to tiers 12/13, defaulting off for lower tiers.
- **E18-S1-T4** — Define the gold cosmetic cluster — Add `tag:'gold'` amenities (gold taps, gold-leaf breakfast, gilded elevator, gold cabana, gold everything) as data rows.
- **E18-S1-T5** — Define 6-star service amenities — Add a `tag:'sixstar'` service cluster (private butler tea, helicopter transfer, in-suite spa) distinct from the pure cosmetics.
- **E18-S1-T6** — Wire D6/D7 onboarding hooks — Mark data so the tier reveal nudges the player toward buying `D6` (index 5) and `D7` (index 6) generators (`base` 1.4e6 / 1.5e7).
- **E18-S1-T7** — Author the sail copy — The showpiece reveal line ("A hotel shaped like a sail, for a man who arrived by poncho.").
- **E18-S1-T8** — Author gold-cosmetic copy — One preening line each ("The taps are gold. The water is the same. This is the point of taste.").
- **E18-S1-T9** — Set unlock ordering — Chain tier 13 behind tier 12, and gold cosmetics behind entering tier 12, so nothing reveals out of order.
- **E18-S1-T10** — Data-shape test — Assert tiers 12/13 carry `tasteGate`/`exclGate`, monotonic `accScore`, and that every gold/six-star amenity has required fields.

## E18-S2 — The Big Step Up (core logic/engine)
_As a player, I want the 6-star jump to actually gate on Taste and exclusivity, so that the ultra-luxury tier feels earned, not just expensive._  The engine enforces the gate and the big Comfort step.
- **E18-S2-T1** — Enforce the Taste gate — In `engine.js`, block purchasing tier 12/13 unless `skills.taste.level >= tasteGate`, surfacing a clear "your taste isn't ready" reason.
- **E18-S2-T2** — Enforce the exclusivity gate — Also require `exclusivity >= exclGate` (from E14) before the tier can be entered.
- **E18-S2-T3** — Apply the big accScore step — Feed tier 12/13 `accScore` into `ComfortRaw` so entering the sail delivers a large, felt Comfort jump within the saturating cap.
- **E18-S2-T4** — Onboard D6/D7 pressure — Verify `D6`/`D7` `base`/`growth` (1.4e6/1.13, 1.5e7/1.14) make them the natural next buys here, and unlock them if still hidden.
- **E18-S2-T5** — Satisfy beat 18 — Trigger beat 18 (*The Sail-Shaped Hotel*) when the player enters tier 12, advancing `story.beat`.
- **E18-S2-T6** — Gold-cosmetic effects — Wire gold cosmetics to feed exclusivity and Comfort (cosmetic-but-not-useless) via their marked scopes.
- **E18-S2-T7** — Reveal the penthouse — On entering tier 12 and meeting tier 13's gate, unlock the Ultra Penthouse purchase path.
- **E18-S2-T8** — Emit events — Fire `unlock`/`story:beat` for tier 12, tier 13, and each gold/six-star amenity so UI and gates react.
- **E18-S2-T9** — Keep it pure — Route the big `accScore` and exclusivity math through `math.js` `N.*` so numbers this large stay swap-safe.
- **E18-S2-T10** — Engine tests — Assert the tier is blocked below the Taste/exclusivity gates, delivers the Comfort step when met, and fires beat 18 exactly once.

## E18-S3 — The 6-Star Front Desk (UI/buttons)
_As a player, I want a clear front-desk panel for the sail, so that the gate requirements and the payoff are legible._  Buttons, gate readouts, and the gold shining through.
- **E18-S3-T1** — Add the front-desk panel — New `ui.js` section for tiers 12/13 that appears as the player nears the Taste/exclusivity gates.
- **E18-S3-T2** — Show gate progress — Render "Taste L X / needed" and "Exclusivity X / needed" progress bars so the player sees exactly what's missing.
- **E18-S3-T3** — Tier buy buttons — Buttons for tier 12 and 13 with cost, the Comfort delta, and a disabled state that names the unmet gate.
- **E18-S3-T4** — Gold-cosmetic buttons — Buy buttons for the gold cluster with cost/owned and their exclusivity/Comfort delta.
- **E18-S3-T5** — Six-star service buttons — Buttons for the service cluster, visually distinct from the pure cosmetics.
- **E18-S3-T6** — Gold visual treatment — A restrained gold accent on the panel (CSS only) that reads "ultra-luxury" without becoming a slot machine.
- **E18-S3-T7** — Wire generic intents — Buttons call `engine.buyAccommodation(tier)` / `engine.buyAmenity(id)`; no bespoke handlers.
- **E18-S3-T8** — a11y + reduced-motion — aria-live for tier/beat unlocks; any shimmer gated behind `prefers-reduced-motion`.
- **E18-S3-T9** — D6/D7 nudge — A subtle pointer in the panel toward buying `D6`/`D7` when they're the best next income move.
- **E18-S3-T10** — Render test — Assert the panel exposes gate-progress and tier-button `data-id` hooks and updates on Taste/exclusivity changes.

## E18-S4 — The Sail-Shaped Hotel (the headline new thing)
_As a Dutch tourist who began in a shed with six-legged guests, I want to check into a gold-drenched, sail-shaped tower, so that the mid-game has its unforgettable "I made it" tier._  The signature showpiece of Act II.
- **E18-S4-T1** — Build the showpiece tier — Make tier 12 the visual/mechanical centerpiece: the largest single Comfort step to date and a distinct "arrival" moment.
- **E18-S4-T2** — Gold-everything on entry — On checking in, reveal the full gold-cosmetic cluster so the tier immediately *looks* ultra-luxury.
- **E18-S4-T3** — The Ultra Penthouse peak — Make tier 13 the crowning room above the sail, gated a step higher for the players who push.
- **E18-S4-T4** — Exclusivity as the doorman — Frame the exclusivity/Taste gate narratively as a velvet rope, reinforcing the connoisseur fantasy.
- **E18-S4-T5** — Arrival ceremony — A one-time stronger unlock moment/line on first entering the sail (reduced-motion-safe).
- **E18-S4-T6** — Author the "I made it" copy — The emotional beat-18 line contrasting the shed and the sail, wry but earned, within the ≤90-word limit.
- **E18-S4-T7** — Comfort payoff tuning — Set tier-12/13 `accScore` so the jump is thrilling yet still leaves E21's 7-star room to grow (harness in S8).
- **E18-S4-T8** — Gold synergy with connoisseur — Ensure gold cosmetics feed exclusivity so the aesthete's showpiece is mechanically theirs.
- **E18-S4-T9** — Persist arrival state — Save first-entry flags for tiers 12/13 so the ceremony and gold reveal don't replay on reload.
- **E18-S4-T10** — QA the showpiece — Verify the sail can't be entered below its gates, delivers its Comfort step once, and the gold reveal fires exactly once.

## E18-S5 — Gold Everything (amenity / small-wins cluster)
_As an idler with more money than restraint, I want to gild absolutely everything, so that the 6-star tier has a dense drip of preposterous cosmetic wins._  The small-win engine, dipped in gold.
- **E18-S5-T1** — Define the gold cluster — Add ~10 `tag:'gold'` cosmetics (gold taps, gold sheets, gold-leaf breakfast, gilded elevator, gold robe, gold slippers, gold phone, gold minibar, gold balcony rail, gold everything-else).
- **E18-S5-T2** — Set the prestige slope — Give the cluster a steep `costGrowth≈1.9` so gilding reads as a genuine ultra-luxury rung, not pocket change.
- **E18-S5-T3** — Exclusivity contributions — Each gold item adds a small exclusivity bump (connoisseur-scoped) so cosmetics aren't purely decorative.
- **E18-S5-T4** — Comfort contributions — Feed modest `comfort` values into `amenityScore`; confirm the saturating cap keeps them meaningful-not-dominant.
- **E18-S5-T5** — Unlock cadence — Gate gold items behind entering tier 12 + prior item so one lands roughly every 60–120s of active late-game play.
- **E18-S5-T6** — Flavor copy pass — One preening Dutch-abroad line each ("Gold slippers. For the man whose feet were wet for thirty years.").
- **E18-S5-T7** — Generic buy flow — Confirm `engine.buyAmenity(id)` handles the entire gold cluster with no bespoke code.
- **E18-S5-T8** — Button readouts — Show name/cost/owned and next-Comfort/exclusivity delta per gold item.
- **E18-S5-T9** — Save the levels — Persist per-item `level`, default 0 for pre-E18 saves; migration no-op.
- **E18-S5-T10** — QA rapid buys — Zero-cash spam, buy-max, Comfort/exclusivity recompute, and no free offline gold.

## E18-S6 — Checking Into the Sail (accommodation / progression step)
_As a climber, I want the two-tier jump (6-star then Ultra Penthouse) to slot cleanly into the ladder, so that the biggest step yet still feels ordered._  Tiers 12 and 13 land with their gates and reveals.
- **E18-S6-T1** — Wire tier-12 unlock — Set tier 12's `ACC.unlock[12]` Comfort threshold plus its Taste/exclusivity gates in `STORY_GATES`.
- **E18-S6-T2** — Wire tier-13 unlock — Set tier 13's higher `ACC.unlock[13]` and its steeper gates, chained behind tier 12.
- **E18-S6-T3** — Confirm the accScore step — Verify tiers 12/13 contribute their `ACC_GROWTH^12/13` terms so the Comfort spine steps up as designed.
- **E18-S6-T4** — Reveal copy — Write distinct entry lines for the sail (tier 12) and the penthouse (tier 13).
- **E18-S6-T5** — Reveal events — Emit `unlock` + `story:beat` so UI swaps accommodation art/label at each step.
- **E18-S6-T6** — Gate top amenities on the tier — Make the top gold/six-star amenities require the penthouse so the very best toys stay aspirational.
- **E18-S6-T7** — Balance the two-step — Harness-confirm tier 12→13 doesn't overshoot the beat-18 window or starve D6/D7 buying.
- **E18-S6-T8** — Migration default — Old high-Comfort saves that predate tiers 12/13 unlock cleanly at load without skipping the gates.
- **E18-S6-T9** — UI label swaps — Show "Tier 12 · 6-Star (Sail)" and "Tier 13 · Ultra Penthouse" in the readout and stats screen.
- **E18-S6-T10** — QA the gates — Verify neither tier reveals below its Comfort+Taste+exclusivity gates, and each reveals exactly once.

## E18-S7 — The Old-Money Aesthete Arrives (path / branch flavor)
_As a Connoisseur, I want the sail-shaped hotel to be the tier my whole taste build was aiming at, so that Taste and exclusivity finally cash in._  The connoisseur's spotlight, without stranding other builds.
- **E18-S7-T1** — Connoisseur Comfort perk — Apply the `connoisseur` +25% Comfort to the 6-star/gold amenities so the aesthete's sail is richer.
- **E18-S7-T2** — Exclusivity `×` payoff — Ensure the tier's exclusivity contributions feed the connoisseur exclusivity global `×` from E14.
- **E18-S7-T3** — Taste-gate as identity — Frame the Taste gate so connoisseur players clear it naturally while others must invest — an emphasis, not a wall.
- **E18-S7-T4** — Path-point sources — Grant connoisseur path points for entering the sail, the penthouse, and completing the gold cluster.
- **E18-S7-T5** — Golden Ratio synergy — Ensure the tree node (exclusivity `×` +10%) stacks correctly with the tier's exclusivity here.
- **E18-S7-T6** — Neutral-safe floor — Confirm traveler/vlogger/crypto players can still reach and enter tiers 12/13 by investing in Taste; beat 18 always completable.
- **E18-S7-T7** — Softcap respected — Route connoisseur path/exclusivity bonuses through their softcaps so the sail doesn't runaway.
- **E18-S7-T8** — Branch flavor copy — Alternate reveal lines keyed on `story.branch` (connoisseur = provenance sniff, others = wide-eyed tourist).
- **E18-S7-T9** — Balance the perk — Harness-check the connoisseur stack keeps beat 18 within ±15% of a neutral build's timing.
- **E18-S7-T10** — QA re-spec — Switch to/from connoisseur and verify the Comfort/exclusivity bonuses on the sail recompute live.

## E18-S8 — Weighing the Anchor (balance & tuning)
_As the balancer, I want the big 6-star step, the D6/D7 onboarding, and the gate values tuned together, so that the sail lands on the pacing curve._  The epic's numbers meet the harness.
- **E18-S8-T1** — Set the ACC step — Fill `ACC.base`/`ACC.growth` (~2.6) and `ACC.unlock[12..13]` so the Comfort jump is dramatic but on-curve.
- **E18-S8-T2** — Tune D6/D7 onboarding — Confirm/adjust `GEN.base[5]=1.4e6, growth[5]=1.13` and `base[6]=1.5e7, growth[6]=1.14` so D6/D7 are the natural buys during this tier.
- **E18-S8-T3** — Set the Taste gate — Choose the `tasteGate` levels for tiers 12/13 so they demand real Taste investment without an impossible wall.
- **E18-S8-T4** — Set the exclusivity gate — Choose `exclGate` values that a connoisseur clears naturally and others reach with effort.
- **E18-S8-T5** — Run the harness — Simulate beat-17→18 at `GAME_SPEED=∞`; read `T(beat 18)` against its target window.
- **E18-S8-T6** — Time-to-next-purchase — Confirm gold/six-star amenity + D6/D7 buys keep the 30–120s active band through the tier.
- **E18-S8-T7** — Comfort-cap interaction — Verify the big `accScore` step plays correctly against the saturating Comfort cap and Body's cap scaling.
- **E18-S8-T8** — Stack sanity — Confirm `L_comfort`, exclusivity `×`, the connoisseur perk, and gold effects compose with no double-count.
- **E18-S8-T9** — Commit the golden curve — Snapshot the beat-18 milestone and the tier-12/13 Comfort values into the balance golden file.
- **E18-S8-T10** — Document the knobs — Inline-comment final `ACC`, `tasteGate`, `exclGate`, and D6/D7 values with rationale in `config.js`.

## E18-S9 — Concierge Handover (save / migration / offline)
_As a returning player, I want my 6-star tier, penthouse, gold, and gate progress to survive reloads and away-time, so that ultra-luxury doesn't vanish overnight._  Persistence and offline correctness for the tier jump.
- **E18-S9-T1** — Extend the save schema — Add tier-12/13 ownership, gold/six-star amenity levels, first-entry flags, and cached gate-met flags to `state.js`; bump `version`.
- **E18-S9-T2** — Write the migration — `MIGRATIONS[n]` seeds new fields (not-owned, level 0) for pre-E18 saves and re-derives gate flags from Taste/exclusivity.
- **E18-S9-T3** — Never trust stale gates — On load, recompute whether tiers 12/13 are legitimately entered from current Taste/exclusivity rather than a saved boolean alone.
- **E18-S9-T4** — Offline Comfort income — Ensure the big `accScore` and gold/exclusivity effects apply during coarse offline macro-steps identically to online.
- **E18-S9-T5** — Offline D6/D7 coupling — Confirm the tier polynomial (D6/D7 filling lower tiers) advances correctly across offline steps at this scale.
- **E18-S9-T6** — Away summary line — Add "the sail earned +X while you were away" to the "While you were away" modal.
- **E18-S9-T7** — Cap interaction — Verify `OFFLINE_CAP` bounds the now-large offline income sensibly and always in the player's favor.
- **E18-S9-T8** — Export/import round-trip — Verify the export string carries tiers 12/13, gold levels, and gate flags and re-imports identically.
- **E18-S9-T9** — Backup safety — Ensure a crash mid-migration falls back to the rotating backup without losing the penthouse.
- **E18-S9-T10** — Migration fixture test — Add a pre-E18 fixture save; assert it loads, migrates, re-derives gates, and shows a coherent 6-star state.

## E18-S10 — White-Glove Inspection (QA / polish / juice)
_As a player, I want the 6-star tier to feel immaculate, so that the game's biggest mid-run flex reads clean, funny, and bug-free._  Tests, formatting, and a little gilded shine.
- **E18-S10-T1** — Number formatting — Verify tier costs, the large Comfort values, and exclusivity all render through `util.format` with no raw floats.
- **E18-S10-T2** — Edge-case: gate exactly met — Confirm entering a tier at exactly `tasteGate`/`exclGate` works (off-by-one safe).
- **E18-S10-T3** — Edge-case: exclusivity drop — If exclusivity later dips below `exclGate`, confirm the owned tier stays owned (no eviction) and nothing re-locks wrongly.
- **E18-S10-T4** — Unlock-order fuzz — Randomized buy sequences never reveal tier 13 before 12 or a top amenity before its gate.
- **E18-S10-T5** — Event dedupe — Beat 18, tier-12 entry, tier-13 entry, and the gold reveal each fire exactly once across save/reload.
- **E18-S10-T6** — Juice: gilded shimmer — A restrained, reduced-motion-safe gold shimmer on the front-desk card on tier entry.
- **E18-S10-T7** — Copy proofread — Pass every tier/gold/six-star/beat string for tone (wry, Dutch, no "etc.") and the ≤90-word beat limit.
- **E18-S10-T8** — Performance check — Confirm recomputing the big `accScore` and exclusivity each render stays cheap at scale.
- **E18-S10-T9** — Regression suite — Add the S2/S8/S9 tests to the local runner so the 6-star tier stays covered.
- **E18-S10-T10** — Manual playtest — Play beat 17→18 at `GAME_SPEED=5`, checking the gate feels earned and the arrival lands; file follow-ups.

## Definition of Done (epic)
- [ ] Tiers 12 (6-star sail-shaped) and 13 (Ultra Penthouse) buyable, gated on Comfort + Taste + exclusivity via `STORY_GATES`.
- [ ] Big `accScore` step (`ACC.growth≈2.6` at tiers 12/13) delivers a dramatic, on-curve Comfort jump.
- [ ] D6/D7 onboarding confirmed (`GEN.base[5]=1.4e6/growth 1.13`, `base[6]=1.5e7/growth 1.14`) as the natural buys during the tier.
- [ ] Gold-everything cosmetic cluster + 6-star service cluster ship with steep `costGrowth`, Comfort + exclusivity effects, and ordered gating.
- [ ] Connoisseur branch bonuses (Comfort +25%, exclusivity `×`) applied; all builds can still clear the gate and complete beat 18.
- [ ] Harness shows beat 18 within its target window; tier-12/13 Comfort and gate values committed to the golden file.
- [ ] Tiers, gold levels, and gate progress persist, migrate from pre-E18 saves (gates re-derived, not trusted), and behave correctly offline.
- [ ] All new strings proofed; numbers formatted; tier/beat/gold events fire exactly once; the showpiece arrival reads as "I made it".
