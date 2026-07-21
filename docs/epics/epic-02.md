# E02 — The Bug-Infested Motel
> Act I: Soggy Beginnings · Tier 1 (Bug-Infested Motel) · Amenities (the small-win engine) + the Comfort meter + accommodation upgrade #1 + offline v1 · Beats 2 (*Guests With Six Legs*) & 3 (*Checkout Time*) · Neutral path

**Epic goal:** Introduce the two systems that carry the rest of the game — **amenities** (cheap, frequent, flavored micro-upgrades) and the **Comfort** meter (a saturating global multiplier and story gate) — by fumigating a roach-ridden room and earning the first real accommodation upgrade off the shed.
**Player-visible outcome:** A Comfort meter that fills as you buy motel amenities, visibly raising cash/s via `L_comfort`; a room that de-roaches as it improves; the first accommodation step (shed → motel); and a "While you were away" summary that now credits amenity-driven Comfort correctly.
**Systems touched:** `js/data/amenities.js` (new), `js/engine.js` (Comfort + `buyAmenity`), `js/accommodation.js` (tier 1 + `accScore`), `js/ui.js` (Comfort meter + amenity buttons), `js/save.js` (offline v1 + migration), `js/data/story.js` (beats 2–3, manager NPC seed).
**Math/balance notes:** Introduces `AMENITY.base`, `AMENITY.growth≈1.5`, and per-amenity `comfort` weights; the saturating Comfort law `Comfort = comfortCap · ComfortRaw/(ComfortRaw + comfortCap)` with `ComfortRaw = w_acc·accScore + w_amen·Σ amenityScore + w_body·bodyLevel`; `L_comfort = 1 + COMFORT_MULT·log10(1 + Comfort/C0)`; and the ladder step `accScore = ACC.base · ACC.growth^tier` (`ACC.growth≈2.6`) with unlock threshold `C1`. Comfort's contribution is intentionally modest here (bigger in E06). Offline reuses the real tick with `OFFLINE_STEPS`.

## E02-S1 — The Room Inventory (data model: amenities)
_As a developer, I want an amenity data file and Comfort state, so that hundreds of small-win upgrades can be authored as data and the Comfort meter has fields to compute into._  The data foundation for every "new thing every minute."
- **E02-S1-T1** — Create the amenities module — Add `js/data/amenities.js` exporting entries shaped `{id,name,tag,costBase,costGrowth,comfort,xMult,scope}`, the schema every amenity in the game (motel → island) will use.
- **E02-S1-T2** — Author the motel amenity set — Define the starter batch (`motel_fumigation`, `motel_mattress`, `motel_curtains`, `motel_deadbolt`, `motel_kettle`, `motel_towel`) as the epic's small-win content.
- **E02-S1-T3** — Add the amenities state slice — Introduce `state.amenities` as an `{id: level}` map so ownership is sparse, cheap to save, and defaults cleanly for pre-E02 saves.
- **E02-S1-T4** — Add Comfort state fields — Add `state.comfortRaw`, `state.comfort`, and `state.comfortCap` so the meter is stored/derived in one place the UI and story engine read.
- **E02-S1-T5** — Add AMENITY config defaults — Put `AMENITY={base, growth:1.5}` in `config.js` as the default cost curve knobs, overridable per-amenity by `costBase`/`costGrowth`.
- **E02-S1-T6** — Add Comfort weights to config — Add `COMFORT={w_acc, w_amen, w_body, cap:COMFORT_CAP_BASE, mult:COMFORT_MULT, C0}` so the whole Comfort law is data-tunable per `docs/01 §6`.
- **E02-S1-T7** — Define the tag taxonomy — Establish tags (`room`, `hygiene`, `security`, `kitchenette`) so UI grouping and future scoped multipliers have a stable vocabulary.
- **E02-S1-T8** — Migrate old saves — In the migration switchboard default `state.amenities={}` and Comfort fields for E01 saves, so upgrading never crashes on missing keys.
- **E02-S1-T9** — Mark amenity scope — Give each entry a `scope` (`all` for global `xMult`, or `comfort-only` when it's pure Comfort), enforcing the "additive within a layer" rule from `docs/01 §3`.
- **E02-S1-T10** — QA the data — Add a validation test asserting unique ids, positive costs, `costGrowth>1`, and non-negative `comfort`, catching authoring typos before they ship.

## E02-S2 — Making It Habitable (core engine: Comfort + amenity purchase)
_As a player, I want buying amenities to raise a Comfort meter that boosts my income, so that cleaning up the room visibly pays off._  The engine that turns small wins into compounding power.
- **E02-S2-T1** — Implement `buyAmenity(id)` — Charge `cost = costBase · costGrowth^level`, deduct cash, increment `level`, the single generic purchase path all amenities route through (no bespoke code per amenity).
- **E02-S2-T2** — Compute amenity score — Sum each owned amenity's `comfort` contribution into `Σ amenityScore`, the amenity term of `ComfortRaw`.
- **E02-S2-T3** — Compute `ComfortRaw` — Implement `ComfortRaw = w_acc·accScore + w_amen·Σ amenityScore + w_body·bodyLevel` (`bodyLevel=0` until E10) per `docs/01 §6`.
- **E02-S2-T4** — Apply the saturating cap — Implement `Comfort = comfortCap · ComfortRaw/(ComfortRaw + comfortCap)` so amenities always help but Comfort only asymptotically approaches the cap.
- **E02-S2-T5** — Feed `L_comfort` into `M_k` — Add `L_comfort = 1 + COMFORT_MULT·log10(1 + Comfort/C0)` as a global layer in the multiplier stack, so Comfort raises every tier's income.
- **E02-S2-T6** — Recompute on change — Recompute Comfort whenever an amenity is bought or the accommodation tier changes, and cache it so the tick doesn't recompute needlessly.
- **E02-S2-T7** — Set the comfort cap base — Initialize `comfortCap = COMFORT_CAP_BASE` (Body/ascension scaling comes later), the ceiling motel amenities push toward but can't reach.
- **E02-S2-T8** — Apply targeted `xMult` — Route each amenity's small `xMult` into its scoped layer additively, keeping single-amenity power legible and un-exploitable.
- **E02-S2-T9** — Expose Comfort gates — Publish `Comfort` to the story engine so beat 2 can gate on `Comfort ≥ C1`, wiring narrative to the meter.
- **E02-S2-T10** — QA the saturating law — Add a test that as `ComfortRaw→∞`, `Comfort→comfortCap` (never exceeds), and that `L_comfort` is monotonic and continuous.

## E02-S3 — The Comfort Meter (UI / buttons)
_As a player, I want a clear Comfort meter and buyable amenity buttons, so that I can see exactly what each small purchase does for me._  Making the small-win loop legible.
- **E02-S3-T1** — Build the Comfort meter widget — Render a bar filling toward `comfortCap`, showing current Comfort numerically, the epic's headline readout.
- **E02-S3-T2** — Render amenity buy-buttons — List each amenity with name, next cost, owned level, and the `+Comfort` it would add, so value is obvious at a glance.
- **E02-S3-T3** — Gate buttons on affordability — Disable any amenity the player can't afford, matching the generator-button behavior from E01.
- **E02-S3-T4** — Preview the Comfort delta — Show the exact next-purchase Comfort increase (accounting for saturation) so players understand diminishing returns honestly.
- **E02-S3-T5** — Show the live `L_comfort` — Display the current global multiplier from Comfort (e.g. "Comfort bonus ×1.4") so the income link is explicit.
- **E02-S3-T6** — Group amenities by tag — Section the list by `tag` (room/hygiene/…) so the growing list stays scannable as more amenities unlock.
- **E02-S3-T7** — Flash unlock reveals — Emit and render a "new!" flash when an amenity first becomes available, reinforcing the "new thing every minute" cadence.
- **E02-S3-T8** — Add per-amenity tooltips — Surface the amenity's flavor line on hover/tap so the writing does its job at the point of purchase.
- **E02-S3-T9** — Animate the meter — Ease the Comfort bar and pulse it on gain so progress feels tactile, not just a number swap.
- **E02-S3-T10** — QA UI-vs-state — Test that after load and after offline the meter, buttons, and multiplier readout all reflect true state with no stale values.

## E02-S4 — Guests With Six Legs (headline: Comfort online via fumigation)
_As a horrified guest, I want to fumigate the roach-ridden room, so that Comfort comes online and I see it lift my income for the first time._  The signature moment: your misery becomes a multiplier.
- **E02-S4-T1** — Make fumigation the first Comfort source — Tune `motel_fumigation` as the cheapest, highest-impact opening amenity so the very first purchase visibly moves the meter.
- **E02-S4-T2** — Gate beat 2 on Comfort — Fire beat 2 (*Guests With Six Legs*) when `Comfort ≥ C1`, tying the story's first post-intro beat to the new meter.
- **E02-S4-T3** — Write beat 2 text — Author the roach vignette (≤90 words, wry, six-legged "guests") ending on a hook toward checking out of the shed.
- **E02-S4-T4** — Surface the income link — When Comfort first rises, make the cash/s readout visibly tick up from `L_comfort`, so the player learns "Comfort = money."
- **E02-S4-T5** — Tune the first felt jump — Balance fumigation's `comfort` weight so the opening Comfort gain feels generous without maxing the meter (that's the saturation's job).
- **E02-S4-T6** — Reveal the meter on first amenity — Keep the Comfort widget hidden until the first amenity is bought, then reveal it with a flourish so the system is introduced, not dumped.
- **E02-S4-T7** — Add the departing-roach cosmetic — Show roaches skittering away as Comfort rises, a cheap visual payoff for cleaning up.
- **E02-S4-T8** — Grant on beat 2 — Have beat 2 unlock the remaining motel amenities, pacing content behind the first meaningful Comfort threshold.
- **E02-S4-T9** — Write the six-legged flavor — Add the tooltip/beat lines for the roaches ("They've filed a noise complaint about you.") in the Dutch-abroad voice.
- **E02-S4-T10** — QA the threshold — Test that beat 2 fires at exactly `Comfort ≥ C1`, once, and that its grant applies a single time across reloads.

## E02-S5 — Small Comforts (amenity / small-wins cluster)
_As a bargain traveler, I want a steady drip of cheap room upgrades to unlock, so that there's always a new little win a minute away._  The dense small-win batch that sets the game's rhythm.
- **E02-S5-T1** — Define the ramped cluster — Author 8–10 motel amenities with `costBase`/`costGrowth` so each next one costs roughly 2× the last, keeping purchases frequent but escalating.
- **E02-S5-T2** — Write flavor per amenity — Give each a one-line Dutch-tourist description ("A mattress that only slightly fights back.") so every purchase has voice.
- **E02-S5-T3** — Assign diminishing Comfort weights — Set each amenity's `comfort` so later ones add less raw score, pairing with saturation to keep the meter meaningful.
- **E02-S5-T4** — Add tiny targeted multipliers — Give a few amenities a small `xMult` (e.g. kitchenette → cheaper upkeep flavor) added additively within its layer per the master rule.
- **E02-S5-T5** — Chain the unlocks — Gate later amenities behind earlier ones plus small Comfort thresholds, emitting `unlock` events so the UI can flash "new!".
- **E02-S5-T6** — Tune the cadence — Balance costs so a new amenity is affordable roughly every 45–90s of active early play, verified against the purchase-cadence log (`docs/01 §6.1`).
- **E02-S5-T7** — Add icons/labels — Assign simple icons or emoji labels per amenity so the list reads quickly on mobile.
- **E02-S5-T8** — Slot into the "Room" UI section — Place the cluster under a grouped "Room" heading so it's clearly the motel-stage content.
- **E02-S5-T9** — Persist amenity levels — Ensure levels save in `state.amenities` and default to 0 on migration, so the cluster survives reloads and old saves.
- **E02-S5-T10** — QA the cluster — Test buy-at-zero-cash (blocked), rapid repeated buys, and correct Comfort recompute after each purchase.

## E02-S6 — Checkout Time (accommodation / progression step)
_As a guest done with the shed, I want to check out and move up to the motel, so that the accommodation ladder delivers its first big Comfort jump._  The first real rung-up on the shed→island climb.
- **E02-S6-T1** — Extend the ladder to tier 1 — Add "Bug-Infested Motel" as tier 1 in `js/accommodation.js`, the first destination the player earns rather than stumbles into.
- **E02-S6-T2** — Implement `accScore` growth — Compute `accScore = ACC.base · ACC.growth^tier` with `ACC.growth≈2.6`, so stepping tier 0→1 is a big, felt Comfort jump.
- **E02-S6-T3** — Set the tier-1 unlock gate — Gate the upgrade on `Comfort ≥ C1` plus a cash cost from `ACC` config, replacing E01's temporary cash-only trigger.
- **E02-S6-T4** — Fire beat 3 on tier-up — Trigger beat 3 (*Checkout Time*) when `accommodation.tier ≥ 1`, tying the second beat to the ladder.
- **E02-S6-T5** — Write beat 3 text — Author leaving the shed for the motel (≤90 words), teasing travel and the road ahead as the E03 hook.
- **E02-S6-T6** — Deliver the Comfort jump — Verify the tier-1 `accScore` meaningfully raises `ComfortRaw`, so the upgrade feels like a reward, not a lateral move.
- **E02-S6-T7** — Reveal motel amenities on arrival — Unlock the motel amenity cluster (S5) upon reaching tier 1, pacing content to the accommodation step.
- **E02-S6-T8** — Swap the tier cosmetic — Update the accommodation name/art in the UI to the motel so the world visibly changes.
- **E02-S6-T9** — Set the travel-seed flag — On tier-up set a `story.flags.travelSeed` flag that E03/E04 read to introduce destinations and social tiers.
- **E02-S6-T10** — QA the tier-up — Test that the upgrade fires once at the correct gate, recomputes Comfort, and persists across reload.

## E02-S7 — The Manager's Clipboard (narrative flavor / NPC seed — repurposed slot)
_As a player, I want a grumpy motel manager who comments on my sorry progress, so that Act I has recurring texture and E03's NPC roster is set up._  Extra content in place of a branch slot this neutral epic doesn't need yet.
- **E02-S7-T1** — Seed a recurring NPC — Add a `motel_manager` NPC stub to the story/NPC data with an id, name, and a few reusable dialogue slots, the first recurring character.
- **E02-S7-T2** — Add Comfort-gated vignettes — Author short mini-beats that fire at intermediate Comfort levels between main beats, keeping the narrative present without new gates.
- **E02-S7-T3** — Write the manager's lines — Give the manager wry, deadpan dialogue ("Rats are down two stars this week. Congratulations.") in the Dutch-abroad voice.
- **E02-S7-T4** — Plant the hostel hook — Have the manager mention the hostel down the road, foreshadowing E03's social tiers and NPCs.
- **E02-S7-T5** — Record continuity flags — Set `story.flags` as vignettes fire so later beats can reference having met the manager.
- **E02-S7-T6** — Add a "note under the door" toast — Render manager vignettes as a small unobtrusive toast rather than a full modal, so flavor doesn't interrupt the loop.
- **E02-S7-T7** — Keep text localizable — Author all manager text as data in `story.js`, consistent with the localization rule from `docs/02`.
- **E02-S7-T8** — Guarantee no economic gate — Ensure the manager vignettes are pure flavor and never block progression, per the "story never blocks the economy" rule.
- **E02-S7-T9** — Persist vignette state — Save which vignettes have fired in `story.seen` so they don't repeat after a reload.
- **E02-S7-T10** — QA the vignettes — Test that each vignette fires once at its Comfort level and that skipping them still lets all main beats auto-satisfy.

## E02-S8 — Balance & tuning
_As a designer, I want the amenity and Comfort constants tuned against the harness, so that the small-win cadence and Comfort's income boost land at the right strength for Act I._  Making the new systems pace correctly.
- **E02-S8-T1** — Finalize `AMENITY.base`/`growth` — Set the default `AMENITY.base` and `AMENITY.growth≈1.5` so amenity costs ramp for the target 45–90s cadence.
- **E02-S8-T2** — Tune Comfort weights — Balance `w_acc` vs `w_amen` so accommodation tier dominates `ComfortRaw` early and amenities are the frequent top-up.
- **E02-S8-T3** — Tune Comfort's strength — Set `COMFORT_MULT` and `C0` so `L_comfort` is a modest multiplier here (Comfort's big role arrives in E06), avoiding an early runaway.
- **E02-S8-T4** — Set the ladder constants — Fix `ACC.base`, `ACC.growth≈2.6`, and the tier-1 unlock threshold `C1` so the shed→motel step and beat 3 land on schedule.
- **E02-S8-T5** — Fit beats 2–3 in the harness — Run the ROI-policy harness and confirm `T_target(beat 2)` and `T_target(beat 3)` land within tolerance.
- **E02-S8-T6** — Check purchase cadence — Read the purchase-cadence log to confirm amenities arrive every ~45–90s and adjust `costGrowth` if they clump or stall.
- **E02-S8-T7** — Tune the comfort cap — Set `COMFORT_CAP_BASE` so motel amenities can't max the meter, preserving headroom for later tiers.
- **E02-S8-T8** — Add a Comfort golden file — Capture the Comfort-vs-purchases curve as a regression golden so future tuning doesn't silently shift Act I.
- **E02-S8-T9** — Verify no cliffs — Confirm Comfort and `L_comfort` are continuous across every amenity buy and the tier step, honoring the no-cliff guarantee.
- **E02-S8-T10** — Sweep and confirm monotonic — Sweep the Comfort constants across a range and verify income remains monotonic in Comfort, catching any inversion.

## E02-S9 — While You Were Away (save / migration / offline v1)
_As a player, I want a real "while you were away" summary that respects Comfort and amenities, so that away-time is rewarding but never gives me free upgrades._  Offline that uses the same honest math.
- **E02-S9-T1** — Bound offline elapsed — Compute `elapsed = clamp(now − lastSeen, 0, OFFLINE_CAP=12h)` on load, the away-time budget from `docs/01 §7`.
- **E02-S9-T2** — Macro-step the real tick — Advance `engine.tick(dt)` over `OFFLINE_STEPS` with `dt = elapsed/OFFLINE_STEPS`, so offline uses the identical online economy.
- **E02-S9-T3** — Include Comfort in offline — Use the player's current Comfort/`L_comfort` (recomputed on load) during offline steps, without ever auto-buying amenities.
- **E02-S9-T4** — Add the no-purchase fast path — For the common "no buys while away" case, integrate the D1 polynomial closed-form (`docs/01 §7`) for speed, matching the stepped result within a few %.
- **E02-S9-T5** — Build the summary modal — Show `+cash` and elapsed time (and Comfort context) in a "While you were away" modal, the E01 stub now fleshed out.
- **E02-S9-T6** — Migrate E01 saves — Ensure migration adds `amenities:{}` and Comfort fields and recomputes Comfort on first load, so pre-amenity saves upgrade cleanly.
- **E02-S9-T7** — Recompute rather than trust — Recompute Comfort/`comfortCap` from data on load instead of trusting saved derived values, preventing tampered or stale multipliers.
- **E02-S9-T8** — Update lastSeen — Stamp `meta.lastSeen` after applying offline so the next session measures from the correct anchor.
- **E02-S9-T9** — Guard partial migration — Wrap migration in a guard that backs up and falls back safely if an old save is malformed, so upgrades never brick.
- **E02-S9-T10** — QA offline honesty — Test that offline output matches online within a few %, never awards amenities or Comfort "for free," and is always in the player's favor.

## E02-S10 — QA / polish / juice
_As a player, I want the roach-to-Comfort loop to feel satisfying and bug-free, so that the game's core small-win rhythm is a pleasure to repeat._  Turning the new systems into felt payoff.
- **E02-S10-T1** — Juice the Comfort meter — Add fill animation and a glow when Comfort crosses thresholds, making progress on the meter feel earned.
- **E02-S10-T2** — Polish the roach exit — Refine the departing-roach animation timing so it reads as a clear reward for cleaning up.
- **E02-S10-T3** — Add amenity buy feedback — Give amenity purchases a small sound/particle and popup so each small win registers.
- **E02-S10-T4** — Unit-test the Comfort math — Test `ComfortRaw`, the saturating cap, `L_comfort`, and `buyAmenity` cost/level across boundaries.
- **E02-S10-T5** — Add an integration test — Simulate buying several amenities and assert Comfort rises and cash/s increases via `L_comfort` end-to-end.
- **E02-S10-T6** — Format Comfort numbers — Route Comfort and multiplier readouts through `util.format` so they stay legible as they grow.
- **E02-S10-T7** — Guard division edges — Add guards for `comfortCap=0` and `ComfortRaw=0` so the saturating formula never divides by zero or returns NaN.
- **E02-S10-T8** — Lay out the amenity list for mobile — Ensure the grouped amenity buttons wrap and scroll cleanly on a phone.
- **E02-S10-T9** — Add accessibility labels — Give the meter and amenity buttons ARIA labels announcing cost and Comfort delta for screen readers.
- **E02-S10-T10** — Profile with many amenities — Verify tick and paint stay in budget with the full motel cluster owned, preventing slowdowns as content grows.

## Definition of Done (epic)
- `js/data/amenities.js` exists with the motel cluster; `buyAmenity(id)` routes all purchases through one generic path using `costBase · costGrowth^level`.
- The Comfort meter computes `ComfortRaw` and the saturating `Comfort`, feeds `L_comfort = 1 + COMFORT_MULT·log10(1 + Comfort/C0)` into the multiplier stack, and visibly raises cash/s.
- Beat 2 (*Guests With Six Legs*) fires at `Comfort ≥ C1`; beat 3 (*Checkout Time*) fires at `accommodation.tier ≥ 1`; both fire once and persist.
- The accommodation ladder reaches tier 1 with `accScore = ACC.base · ACC.growth^tier` (`≈2.6`), gated by `C1` plus cash; the tier-up delivers a felt Comfort jump.
- The motel amenity cluster lands a new affordable purchase roughly every 45–90s, verified against the cadence log.
- Offline v1 advances the real tick over `OFFLINE_STEPS`, includes Comfort, never awards free amenities, and shows a "While you were away" summary; E01 saves migrate cleanly.
- Comfort constants are tuned in the harness so beats 2–3 hit their targets; a Comfort golden file guards the curve; the saturating law is proven to approach but never exceed `comfortCap`.
- Unit + integration tests pass; UI is mobile-friendly and accessible; number readouts use `util.format`.
