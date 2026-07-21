# E14 — Acquired Taste
> Act II · Tier 11 (Grand Luxury Wing) · Taste attribute + exclusivity multiplier + appreciating assets · Beat 14 *Provenance* (+ beat 25 setup) · **Connoisseur** path emphasis

**Epic goal:** Ship the Old-Money Aesthete economy — a Taste attribute, an exclusivity multiplier, and collections of appreciating art & wine — slow, expensive, prestige-friendly wealth that unlocks the Grand Luxury Wing.
**Player-visible outcome:** The player cultivates Taste, builds art/wine collections whose value quietly appreciates over time, watches an exclusivity meter turn refinement into a global `×`, buys luxury tiers at a Taste discount, and graduates to the Grand Luxury Wing (tier 11).
**Systems touched:** `js/data/collections.js` (new art/wine assets), `config.TASTE` + `config.EXCLUSIVITY` + `config.APPRECIATION` (new), `data/skills.js` (Taste), `data/paths.js` (connoisseur), `engine.js`/`math.js` (exclusivity `×`, appreciation tick, luxury discount), `data/accommodation.js` (Grand Luxury Wing gate), `state.js` (collections + migration), `ui.js` (gallery/cellar), `data/story.js` (beat 14 *Provenance*, beat 25 setup).
**Math/balance notes:** exclusivity `L_exclusivity = 1 + EXCL_RATE · log10(1 + exclusivity/E0)` (global `×`); Taste XP `xpToNext = TASTE.base · TASTE.growth^L`; appreciating assets `value = cost · (1 + appreciationRate)^ageYears` (game-time, softcapped by `APPRECIATION.valueCap`); luxury discount `costMult = clamp(1 − TASTE.discount · tasteL, 0.4, 1)`; connoisseur perk luxury `+25%` Comfort; `Golden Ratio` tree node exclusivity `×+10%`.

## E14-S1 — The Collector's Catalogue (data model)
_As an aesthete, I want a declarative catalogue of art, wine, Taste config, and exclusivity knobs, so that refinement is tunable data._  All connoisseur content is data; the engine stays generic.
- **E14-S1-T1** — Create collections module — Add `js/data/collections.js` with `ART` and `WINE` arrays; each asset `{id,name,tag:'luxury',costBase,costGrowth,appreciationRate,exclusivity,comfort,tasteXp}`.
- **E14-S1-T2** — Seed the art wing — Write 6 art pieces (`velvet_elvis`, `dogs_playing_klaverjas`, `minor_dutch_master`, `abstract_beige`, `bronze_stroopwafel`, `nft_of_a_windmill`) with rising `costBase` and `appreciationRate`.
- **E14-S1-T3** — Seed the wine cellar — Write 6 wines (`supermarket_red`, `duty_free_champagne`, `actual_bordeaux`, `grand_cru`, `investment_burgundy`, `judgment_of_paris_lot`) as appreciating bottles.
- **E14-S1-T4** — Add `config.TASTE` — In `config.js` add `TASTE = { rate, base, growth, discount }` so the Taste skill and its luxury discount are data, not literals.
- **E14-S1-T5** — Add `config.EXCLUSIVITY` — Add `EXCLUSIVITY = { rate:EXCL_RATE, E0, softExp }` defining the exclusivity → `×` curve.
- **E14-S1-T6** — Add `config.APPRECIATION` — Add `APPRECIATION = { globalRate, softcapAge, valueCap }` governing asset value growth and its anti-runaway cap.
- **E14-S1-T7** — Tag luxury-tier scope — Mark expensive generators/amenities with `tag:'luxury'` so the connoisseur `+25%` Comfort perk and the Taste discount can target them.
- **E14-S1-T8** — Provenance metadata — Give each asset a `provenance` string (fake auction house, year) for flavor and the beat-14 *Provenance* callback.
- **E14-S1-T9** — Flavor copy — One wry line per asset ("Dogs Playing Klaverjas — the Dutch answer to poker dogs; Abstract Beige — it matches everything, that's the point").
- **E14-S1-T10** — Schema doc comment — Document the `ART`/`WINE` shapes + appreciation contract at the top of `collections.js` for E21/E24 reuse.

## E14-S2 — Taste, Time & Appreciation (core logic)
_As a patient investor, I want Taste to level, assets to appreciate, and exclusivity to become a multiplier, so that quiet spending compounds._  The connoisseur loop runs every tick.
- **E14-S2-T1** — Implement the Taste skill — Add Taste to the skills engine using `xpToNext = TASTE.base · TASTE.growth^L`; XP earned from luxury/collection spend.
- **E14-S2-T2** — Luxury discount — In `math.js` add `luxuryCostMult(state) = clamp(1 − TASTE.discount · tasteLevel, 0.4, 1)` applied to every `tag:'luxury'` purchase.
- **E14-S2-T3** — Exclusivity accumulator — Sum owned assets' and luxury items' `exclusivity` weights into `state.exclusivity`, softcapped by `EXCLUSIVITY.softExp`.
- **E14-S2-T4** — Exclusivity multiplier — Add `L_exclusivity = 1 + EXCL_RATE · log10(1 + exclusivity/E0)` and fold it into the global multiplier stack alongside `L_comfort`.
- **E14-S2-T5** — Appreciation tick — Each tick, grow each asset's stored value toward `cost · (1 + appreciationRate)^ageYears`, capped by `APPRECIATION.valueCap`.
- **E14-S2-T6** — Age in game-time — Track asset `age` in *playtime* (not wall-clock) so appreciation is fair under `GAME_SPEED` and offline replay.
- **E14-S2-T7** — Net-worth contribution — Add appreciated asset value into `totalCash`/net worth so collections legitimately feed Savvy synergy and prestige `lifetimeCash`.
- **E14-S2-T8** — Connoisseur Comfort perk — When `branch==='connoisseur'`, boost `tag:'luxury'` `comfort` contribution by +25% into `ComfortRaw`.
- **E14-S2-T9** — Taste unlock-gates — Expose Taste-level gates (`taste ≥ X`) that later unlock 6/7-star & villa tiers (E18/E21/E22 hooks); implement the gate check here.
- **E14-S2-T10** — Feed `L_path(connoisseur)` — Convert connoisseur points into `1 + PATH.rate · points^PATH.softcapExp` scoped to luxury tiers.

## E14-S3 — The Gallery & the Cellar (UI)
_As a collector, I want a gallery and a wine cellar view, so that I can admire, buy, and appraise my appreciating things._  Refinement is visible and buyable.
- **E14-S3-T1** — Gallery panel — Render an art-gallery card: each piece with name, owned count, current appraised value, and a buy button.
- **E14-S3-T2** — Cellar panel — Render a wine-cellar list with bottle counts and the appreciation gained since purchase.
- **E14-S3-T3** — Exclusivity meter — Add a readout showing the exclusivity score and the resulting global `×`.
- **E14-S3-T4** — Appraisal display — Show each asset's "bought for X → now worth Y (+Z%)" using live appreciation.
- **E14-S3-T5** — Buy flow — Wire buttons to a generic `engine.buyAsset(id)` honouring `luxuryCostMult`; no bespoke per-asset code.
- **E14-S3-T6** — Taste readout — Show Taste level, an XP bar, and the current luxury discount % it grants.
- **E14-S3-T7** — Discount tag — On discounted purchases, show the struck-through original price for the "old-money haggle" feel.
- **E14-S3-T8** — Unlock reveal — Gate the gallery behind the connoisseur seed + a Comfort threshold; emit `unlock` with a velvet-rope toast.
- **E14-S3-T9** — Provenance tooltips — Hover shows the asset's fake provenance string for flavor.
- **E14-S3-T10** — Number formatting — Route appraised values through `util.format`; ensure long provenance strings truncate gracefully.

## E14-S4 — Provenance (appreciating collections)
_As an old-money aesthete, I want art & wine that grows in value while I own it, so that taste itself becomes an investment._  The signature player-facing feature.
- **E14-S4-T1** — Appreciation formula — Implement `value = cost · (1 + appreciationRate)^ageYears` with a softcap so no single bottle runs away.
- **E14-S4-T2** — Per-asset rates — Give rarer assets higher `appreciationRate` (supermarket red barely moves; grand cru compounds).
- **E14-S4-T3** — Sell/liquidate flow — Add `engine.sellAsset(id)` returning appreciated value as cash (a strategic sink→source), with a Taste-based better price.
- **E14-S4-T4** — Hold incentive — Make holding also feed exclusivity + Comfort, so selling trades long-term `×` for short-term cash (a real decision).
- **E14-S4-T5** — Collection set bonus — Owning a full themed set (e.g. every wine) grants a bonus exclusivity `×`, seeding the E24 set-collection mechanic.
- **E14-S4-T6** — Appraisal event — An occasional "appraisal" flavor event bumps a piece's value (seeded via `util.rng`), a gentle connoisseur analogue to crypto booms.
- **E14-S4-T7** — Provenance beat tie-in — Wire a signature piece's acquisition to beat 14 *Provenance* for narrative payoff.
- **E14-S4-T8** — Anti-runaway cap — Enforce `APPRECIATION.valueCap` and `softcapAge` so 20h of appreciation stays inside the intended curve.
- **E14-S4-T9** — Value-over-time UI — A small sparkline/text trend of an asset's value so appreciation is felt, not merely stated.
- **E14-S4-T10** — Balance note — Ensure appreciation contributes meaningfully but slower than active income (prestige-friendly, not dominant).

## E14-S5 — Quiet Luxury (connoisseur amenity cluster)
_As someone with taste, I want understated expensive comforts, so that there's a refined small win every minute plus Comfort._  Small-wins cadence for the connoisseur stage.
- **E14-S5-T1** — Define connoisseur amenities — Add to `data/amenities.js`: `cigar_lounge`, `private_sommelier`, `silk_robe`, `monogrammed_slippers`, `antique_writing_desk`, `butler_drawn_bath`, each `{costBase,costGrowth:1.5,comfort,xMult,tag:'luxury'}`.
- **E14-S5-T2** — Wire generic buy — Reuse `engine.buyAmenity(id)`; ramp ≈2× per step.
- **E14-S5-T3** — Comfort contribution — Feed `amenityScore` into `ComfortRaw`; verify the saturating cap and that the connoisseur +25% perk stacks correctly.
- **E14-S5-T4** — Targeted multiplier — Small `xMult` scoped to luxury tiers via `L_path(connoisseur)`.
- **E14-S5-T5** — Exclusivity weight — Give each a small `exclusivity` value so the cluster also raises the exclusivity meter.
- **E14-S5-T6** — Flavor copy — Wry one-liners ("monogrammed slippers: your initials, on your feet, for no one to see").
- **E14-S5-T7** — UI buttons — Show name/cost/owned/next-Comfort delta per the standard amenity button.
- **E14-S5-T8** — Cadence check — Confirm one is affordable ~every 60–90s of active connoisseur play via the harness.
- **E14-S5-T9** — Save/migration — Persist levels; default 0 for old saves.
- **E14-S5-T10** — QA — Zero-cash, rapid buys, Comfort + exclusivity recompute, no free offline items.

## E14-S6 — The Grand Luxury Wing (accommodation step)
_As a person of refinement, I want to move into the Grand Luxury Wing, so that my Taste is matched by my address._  Tier 11, the epic's ladder step.
- **E14-S6-T1** — Tier-11 entry — Add the Grand Luxury Wing as accommodation tier 11 in `accommodation.js` with `accScore = ACC.base · ACC.growth^11`.
- **E14-S6-T2** — Taste + exclusivity gate — Require both a Comfort threshold (`STORY_GATES`) and a Taste/exclusivity minimum, so the tier is connoisseur-flavored to reach.
- **E14-S6-T3** — Discount interplay — Apply `luxuryCostMult` to the wing's upgrade purchases so Taste tangibly cheapens the climb.
- **E14-S6-T4** — accScore jump — Verify the ~2.6× Comfort step lands on the ladder without overshoot.
- **E14-S6-T5** — Reveal beat text — Wry copy about being ushered past the velvet rope ("they saw the wine you ordered and simply *knew*").
- **E14-S6-T6** — Cross-lane note — Since the ladder lists tier 11 as unlocked by E14, ensure crypto/vlogger/traveler players can also reach it via the neutral Comfort gate.
- **E14-S6-T7** — Unlock event — Emit `unlock` + `story:beat`; swap the accommodation label/backdrop.
- **E14-S6-T8** — `L_comfort` recompute — Confirm the tier flows into `L_comfort` correctly and Comfort still saturates toward its cap.
- **E14-S6-T9** — Save/migration — Persist `tier`/`ownedTiers`; old saves default to their prior tier.
- **E14-S6-T10** — QA — Assert the double gate can't be bypassed and Comfort isn't double-counted on re-entry.

## E14-S7 — Provenance (connoisseur branch flavor)
_As a committed Aesthete, I want branch perks and a *Provenance* beat, so that taste is a distinct, rewarding path._  Branch identity + the beat-14 variant and beat-25 setup.
- **E14-S7-T1** — Branch perk: luxury +25% Comfort — Implement the connoisseur Comfort boost on `tag:'luxury'` when `branch==='connoisseur'`.
- **E14-S7-T2** — Branch perk: exclusivity × — Grant an extra exclusivity `×` multiplier for the connoisseur branch.
- **E14-S7-T3** — Beat 14 *Provenance* — Author the connoisseur variant beat (≤90 words, wry, ending on a hook toward the villa/island).
- **E14-S7-T4** — Beat gate — Require `paths.connoisseur.points ≥ P1` (from `config.STORY_GATES`).
- **E14-S7-T5** — Choice → flag — The beat's choice sets `flags.provenance`, granting Taste XP + a signature appreciating piece.
- **E14-S7-T6** — Beat 25 setup — Plant the *Where the Rich Hide* setup line (exclusive destinations) so E24 pays off.
- **E14-S7-T7** — Hybrid line — Bonus line if connoisseur *and* traveler ≥ P1 ("you don't buy souvenirs; you acquire provenance").
- **E14-S7-T8** — Golden Ratio synergy note — Surface that the `Golden Ratio` tree node adds +10% exclusivity, teasing ascension synergy.
- **E14-S7-T9** — Cosmetic badge — Grant a connoisseur badge (a tiny monocle) via `ui:branchBadge` on beat completion.
- **E14-S7-T10** — QA — Verify a non-connoisseur player still passes beat 14 via its neutral fallback.

## E14-S8 — The Price of Taste (balance & tuning)
_As the balance owner, I want the connoisseur lane fit to the curve, so that slow, expensive taste pays off on schedule without dominating._  Constants fit to targets.
- **E14-S8-T1** — Fit `EXCL_RATE`/`E0` — Tune exclusivity so a maxed connoisseur reaches a ~1.5–3× global `×` by mid-Act-II, comparable to other lanes.
- **E14-S8-T2** — Taste discount clamp — Verify `luxuryCostMult` never exceeds the −60% floor (clamp 0.4) even at high Taste.
- **E14-S8-T3** — Appreciation rate — Tune `APPRECIATION.globalRate`/`valueCap` so 20h of holding adds meaningful but not dominant net worth.
- **E14-S8-T4** — Comfort perk check — Confirm the +25% luxury Comfort perk doesn't blow past the saturating Comfort cap.
- **E14-S8-T5** — Set-bonus value — Balance the collection set bonus so completing a set is exciting but not mandatory.
- **E14-S8-T6** — Path softcap — Confirm `PATH.rate`/`PATH.softcapExp = 0.85` tames connoisseur point scaling.
- **E14-S8-T7** — Harness beat time — Run the greedy-ROI harness; connoisseur beat 14 near its `T_target` from `docs/05 §1`.
- **E14-S8-T8** — Slowness feel — Verify the lane is deliberately steeper early (prestige-friendly) yet catches up by beat 22, per design intent.
- **E14-S8-T9** — Golden file — Commit the connoisseur milestone curve as a regression fixture.
- **E14-S8-T10** — Cross-lane parity — Compare against crypto/vlogger so no branch strictly dominates time-to-beat-14.

## E14-S9 — Aging in the Cellar (save & offline)
_As a collector who steps away, I want my assets to have appreciated correctly while gone, so that offline respects the slow-compound fantasy._  Correct, deterministic offline appreciation.
- **E14-S9-T1** — Extend the state schema — Add `state.collections = { art:{id:{count,boughtValue,age}}, wine:{...} }`, `state.exclusivity`, and the Taste skill; bump `version`.
- **E14-S9-T2** — Migration function — Add `MIGRATIONS[N]` initialising empty collections, `exclusivity:0`, and Taste `{xp:0,level:0}` for old saves.
- **E14-S9-T3** — Offline appreciation — Advance each asset's `age` by offline playtime and recompute value in the macro-step loop (game-time based, deterministic).
- **E14-S9-T4** — Offline exclusivity — Recompute the exclusivity `×` after offline so returning players see the correct multiplier immediately.
- **E14-S9-T5** — Cap fairness — Respect `OFFLINE_CAP` and the appreciation `valueCap`; round in the player's favour.
- **E14-S9-T6** — Appraisal-event determinism — Offline appraisal events use the seeded `rng` cursor so they match live play.
- **E14-S9-T7** — Away summary — Add connoisseur lines to the "While you were away…" modal ("your Bordeaux quietly gained €X").
- **E14-S9-T8** — Export/import — Ensure collections + exclusivity survive the base64 round-trip.
- **E14-S9-T9** — Backup safety — Confirm the rotating backup carries the new fields; malformed input keeps the current save.
- **E14-S9-T10** — Migration test — Load a v(previous) fixture; assert collections init without NaN and appreciation starts from purchase time, not epoch.

## E14-S10 — White Gloves (QA & polish)
_As a QA-minded builder, I want the connoisseur lane precise and elegant, so that appreciation never NaNs and exclusivity never explodes._  Shipping-quality refinement.
- **E14-S10-T1** — Taste unit tests — Assert the Taste discount clamps at 0.4 and the XP curve matches `TASTE.base · growth^L`.
- **E14-S10-T2** — Exclusivity monotonic test — Assert the exclusivity `×` is monotonic and softcapped (no cliff) across the asset range.
- **E14-S10-T3** — Appreciation purity test — Same asset + same age yields the same value; no wall-clock leakage.
- **E14-S10-T4** — Sell round-trip test — Buy → appreciate → sell yields the expected cash with the Taste bonus; net worth updates correctly.
- **E14-S10-T5** — Set-bonus test — Completing/incompleting a set toggles the bonus `×` exactly once, no double-count.
- **E14-S10-T6** — Edge: appreciation cap — Assert value never exceeds `valueCap` even at extreme age or `GAME_SPEED`.
- **E14-S10-T7** — Gallery juice — Add a subtle appraisal shimmer + value-up count animation, respecting `prefers-reduced-motion`.
- **E14-S10-T8** — Debug hooks — Debug-panel buttons: grant Taste level, force an appraisal event, add exclusivity, gift an asset.
- **E14-S10-T9** — Console QA — Expose a `window.IV.collections` snapshot + a `harness.connoisseur()` milestone dump.
- **E14-S10-T10** — Formatting pass — Verify appraised values and the exclusivity `×` format cleanly; provenance strings never break layout.

## Definition of Done (epic)
- [ ] `data/collections.js`, `config.TASTE`, `config.EXCLUSIVITY`, and `config.APPRECIATION` shipped; all connoisseur content is data.
- [ ] Taste skill levels via `TASTE.base · growth^L` and grants a clamped luxury discount (floor −60%).
- [ ] Exclusivity meter feeds a monotonic, softcapped global `L_exclusivity` multiplier.
- [ ] Art & wine appreciate on game-time via `cost · (1 + rate)^ageYears`, capped by `valueCap`.
- [ ] Sell/hold decision, set bonus, and seeded appraisal events implemented.
- [ ] Connoisseur amenity cluster hits the ~60–90s small-win cadence.
- [ ] Grand Luxury Wing (tier 11) gated on Comfort + Taste/exclusivity; reachable by all branches via the neutral gate.
- [ ] Connoisseur branch perks (luxury +25% Comfort, exclusivity ×) and beat 14 *Provenance* land; beat 25 setup planted; neutral fallback verified.
- [ ] `Golden Ratio` exclusivity synergy noted; constants tuned and beat 14 hits its `T_target`; golden file committed.
- [ ] Offline appreciation deterministic; migration from the previous version passes with no NaN.
- [ ] Tests green: Taste clamp, exclusivity monotonicity, appreciation purity, sell round-trip, formatting.
