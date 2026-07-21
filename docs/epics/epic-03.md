# E03 — The Roadside Hostel
> Act I: Soggy Beginnings · Tier 2 (Roadside Hostel bunk) · Social income tiers D2–D3 (tier chaining) + recurring NPC roster + bulk-buy (×1/×10/max) + multiplier stack v1 · Beats 3–4 (*The Hostel Bunk*) · Neutral path (traveler/vlogger seeds)

**Epic goal:** Open the classic dimensional ladder beyond D1 — add income tiers **D2** and **D3** where higher tiers produce lower ones — teach "people = money" through a recurring NPC roster, and give the player quality-of-life bulk-buy plus the first real multiplier stack.
**Player-visible outcome:** Two new generator rows (social tiers) whose output feeds down the chain into cash, super-exponential growth from owning higher tiers, a ×1/×10/max bulk-buy toggle, recurring backpacker/vlogger NPCs, a bunk in a roadside hostel, and hostel-stage amenities.
**Systems touched:** `js/config.js` (`GEN` arrays extended), `js/state.js` (D2/D3 slots, `ui.bulkMode`), `js/engine.js` (tier chaining, `costBulk`, multiplier stack v1), `js/data/npcs.js` (new), `js/data/amenities.js` (hostel cluster), `js/accommodation.js` (tier 2), `js/ui.js` (generator rows + bulk toggle), `js/data/story.js` (beat 4), `js/save.js` (migration + offline chaining).
**Math/balance notes:** Extends `GEN.base=[15,100,1.1e3,…]`, `GEN.growth=[1.07,1.09,1.10,…]`, `GEN.perUnit` to indices 1–2 per `docs/01 §1.2`. Implements tier chaining `d(count_{k-1})/dt += prod_k` (k≥2) and the bulk geometric-sum cost `costBulk_k(b,q)=base·growth^b·(growth^q−1)/(growth−1)`. Assembles multiplier stack v1: `M_k = milestoneMult_k · L_upgrade · L_comfort` (with `L_upgrade = 1 + 0.5·#upgrades`), scaffolding `L_path`/`L_skill` (zeroed) for later epics. Tier-2 unlock gated on `Comfort ≥ C3`; beat 4 gated the same.

## E03-S1 — The Guest Book (data model: D2/D3 + NPC roster)
_As a developer, I want D2/D3 generator data plus an NPC roster, so that social income tiers and recurring characters exist as data before any engine or UI touches them._  The data behind "people = money."
- **E03-S1-T1** — Extend the GEN arrays — Populate `GEN.base[1]=100, base[2]=1.1e3`; `growth[1]=1.09, growth[2]=1.10`; `perUnit[1]`, `perUnit[2]` per `docs/01 §1.2`, so D2/D3 have tuned onboarding constants.
- **E03-S1-T2** — Add the D2/D3 generator slots — Push `{id:'d2',bought:0,count:0}` and `{id:'d3',bought:0,count:0}` into `state.generators`, giving the chain its next two rungs.
- **E03-S1-T3** — Create the NPC roster — Add `js/data/npcs.js` with `{id,name,tier,flavor,pathSeed}` entries (a backpacker, a selfie-stick vlogger, a hostel regular), the recurring cast that flavors social income.
- **E03-S1-T4** — Tag social tiers — Mark D2/D3 with a `social` tag so future path/skill bonuses can target them by scope per `docs/01 §3`.
- **E03-S1-T5** — Add the multiplier layer registry — Define the `M_k` layer list (`milestoneMult, L_upgrade, L_path, L_skill, L_comfort, L_ascension, L_tree`) with unused layers set to 1, so stack v1 is complete-shaped and future-proof.
- **E03-S1-T6** — Add the bulk-mode field — Add `state.ui.bulkMode ∈ {x1,x10,max}` so the buy quantity is persisted state, not a transient UI flag.
- **E03-S1-T7** — Seed per-tier upgrade data — Add a small `data/upgrades.js` list of buyable per-tier upgrades feeding `L_upgrade`, the data the multiplier stack v1 consumes.
- **E03-S1-T8** — Migrate old saves — In migration, default the new generator counts to 0 and `ui.bulkMode='x1'` for E02 saves, so upgrading never desyncs the generator array.
- **E03-S1-T9** — Add path-seed flags — Reserve `story.flags.travelerSeed`/`vloggerSeed` stubs the NPCs will set, wiring the seams for E04's path system without activating it.
- **E03-S1-T10** — QA the data — Add a test asserting `GEN.base/growth/perUnit` are equal length and cover D1–D3, and that NPC ids are unique, catching array misalignment early.

## E03-S2 — People Make Money (core engine: tier chaining + multiplier stack v1)
_As a player, I want higher tiers to accelerate lower ones, so that owning "sponsors" makes my "followers" grow which makes my cash grow — the classic compounding ladder._  The engine that makes the curve super-exponential.
- **E03-S2-T1** — Generalize production — Compute `prod_k = count_k · perUnit_k · M_k` for every tier, replacing the D1-only path from E01 with a tier-indexed loop.
- **E03-S2-T2** — Implement tier chaining — In `tick(dt)` add `count_{k-1} += prod_k · dt` for `k≥2`, so D3 feeds D2 and D2 feeds D1 per `docs/01 §1.1`.
- **E03-S2-T3** — Keep D1 → cash — Ensure only D1 outputs spendable cash (`cash += prod_1 · dt`), preserving the single-currency spine while higher tiers feed units.
- **E03-S2-T4** — Assemble multiplier stack v1 — Compute `M_k = milestoneMult_k · L_upgrade · L_comfort` (other layers = 1), the first real multi-layer stack.
- **E03-S2-T5** — Implement `L_upgrade` — Compute `L_upgrade = 1 + 0.5·(#upgrades bought for k)` additively within its layer per the master rule, wiring the per-tier upgrade data from S1.
- **E03-S2-T6** — Per-tier cost curves — Apply `cost_k(n) = GEN.base[k] · GEN.growth[k]^n` per tier so each higher tier is meaningfully more expensive.
- **E03-S2-T7** — Per-tier milestones — Compute `milestoneMult_k = 2^floor(bought_k / MILESTONE_STEP)` independently per tier, so each tier has its own "next ×2" target.
- **E03-S2-T8** — Generalize the buy action — Extend `engine.buy(id, qty)` to purchase any tier and quantity, the single entry point the UI and bulk-buy both call.
- **E03-S2-T9** — Verify polynomial degree — Confirm that owning D3 raises the effective growth degree (cash ≈ degree-3 polynomial over time), the mechanism that carries the long curve.
- **E03-S2-T10** — QA the chaining — Add a test: with only D3 owned and time advanced, `count_1` grows super-linearly, proving the chain integrates correctly.

## E03-S3 — Bunks and Buttons (UI: generator rows + bulk toggle)
_As a player, I want clear rows for each tier and a bulk-buy toggle, so that I can manage three generators without a hundred individual clicks._  Scaling the interface from one button to a ladder.
- **E03-S3-T1** — Build the generator row component — Create a reusable row showing name, owned count, next cost, and the tier's contribution, the template for all future tiers.
- **E03-S3-T2** — Render D1/D2/D3 rows — Lay out the three tiers in order so the "each tier feeds the one below" story reads top-to-bottom.
- **E03-S3-T3** — Add the bulk-buy toggle — Add a ×1/×10/max control bound to `state.ui.bulkMode`, letting the player pick purchase quantity.
- **E03-S3-T4** — Reflect bulk in cost preview — Show the total cost for the selected quantity on each row so players know what a ×10 will actually cost.
- **E03-S3-T5** — Implement buy-max in the UI — When "max" is selected, display and buy the largest affordable quantity, computed from the geometric-sum solver (S4).
- **E03-S3-T6** — Lock unrevealed rows — Keep D2/D3 rows hidden or greyed until revealed, avoiding an intimidating wall of locked content early.
- **E03-S3-T7** — Reveal D2 progressively — Reveal the D2 row after a D1 milestone/cash threshold, pacing the ladder's introduction.
- **E03-S3-T8** — Reveal D3 after D2 — Gate the D3 row behind owning some D2, so the chain is introduced one rung at a time.
- **E03-S3-T9** — Add per-tier milestone bars — Show a small "next ×2 in N" progress bar per row, giving each tier its own visible short-term goal.
- **E03-S3-T10** — QA bulk UI vs engine — Test that the displayed bulk cost/quantity exactly matches what `engine.buy` charges and grants, with no off-by-one.

## E03-S4 — The People Ladder (headline: social tiers + bulk-buy)
_As a social climber, I want my followers and sponsors to compound into cash, and to buy them in bulk, so that "people = money" becomes the engine of my rise._  The signature feature: the compounding social economy.
- **E03-S4-T1** — Theme D2/D3 — Name and flavor D2 ("Fellow Backpackers") and D3 ("Tour Referrals") so the social tiers have identity and the chain tells a story.
- **E03-S4-T2** — Implement the bulk cost formula — Code `costBulk_k(b,q) = base·growth^b·(growth^q−1)/(growth−1)` from `docs/01 §1.2`, the geometric sum powering ×10 and max.
- **E03-S4-T3** — Build the buy-max solver — Solve for the largest `q` affordable from current cash (closed-form log, loop-guarded), so "max" is exact and fast.
- **E03-S4-T4** — Respect milestones across bulk — Ensure a ×10 that crosses a milestone boundary applies the doubling correctly mid-batch, keeping bulk equivalent to sequential buys.
- **E03-S4-T5** — Tune the first "people = money" moment — Balance perUnit/growth so the first sponsor visibly accelerates followers and then cash, delivering the headline feeling.
- **E03-S4-T6** — Reveal social tiers via beat — Tie the D2/D3 reveal to the hostel arrival/beat 4 so content unlocks with narrative, not out of nowhere.
- **E03-S4-T7** — Flavor each tier — Write per-tier descriptions ("Referrals: strangers who vaguely trust you.") in the Dutch-abroad voice.
- **E03-S4-T8** — Show the chain readout — Add a line explaining "D3 → D2 → D1 → cash" so the compounding is legible, not mysterious.
- **E03-S4-T9** — Add buy feedback — Give bulk purchases a satisfying batched popup and sound so a ×10 feels distinct from a single buy.
- **E03-S4-T10** — QA bulk exactness — Test that `costBulk` and buy-max match iterating single buys exactly (cost, resulting `bought`, and milestones) for random `b,q`.

## E03-S5 — Hostel Comforts (amenity / small-wins cluster)
_As a budget traveler, I want cheap hostel upgrades to keep unlocking, so that the small-win drip continues at the new tier._  The stage-appropriate amenity batch.
- **E03-S5-T1** — Author the hostel cluster — Add `hostel_bunkpad`, `hostel_earplugs`, `hostel_locker`, `hostel_shared_kitchen`, `hostel_hot_shower`, `hostel_wifi` to `data/amenities.js` as the tier-2 small wins.
- **E03-S5-T2** — Write flavor per amenity — Give each a wry line ("Earplugs: for the snorer in bunk 4, and the rain on the roof.") keeping the tone and the weather jokes.
- **E03-S5-T3** — Ramp Comfort weights — Set each amenity's `comfort` so costs and Comfort scale sensibly above the motel cluster, feeding `ComfortRaw`.
- **E03-S5-T4** — Scope a few multipliers to social — Give some hostel amenities a small `xMult` scoped to the `social` tag (meeting people!), added additively within `L_upgrade`'s sibling layer.
- **E03-S5-T5** — Chain the unlocks — Gate later hostel amenities behind earlier ones plus Comfort, emitting `unlock` events for the "new!" flash.
- **E03-S5-T6** — Tune the cadence — Balance `costBase`/`costGrowth` so a new amenity is affordable every ~45–90s of active hostel-stage play, per the cadence target.
- **E03-S5-T7** — Add the "Hostel" UI section — Group the cluster under a "Hostel" heading, distinct from the motel section, so stages read clearly.
- **E03-S5-T8** — Persist amenity levels — Ensure the hostel amenities save in `state.amenities` and default to 0 for older saves.
- **E03-S5-T9** — Recompute Comfort on buy — Confirm each hostel amenity purchase recomputes Comfort and the meter/multiplier update immediately.
- **E03-S5-T10** — QA the cluster — Test buy-at-zero (blocked), rapid buys, and correct Comfort recompute, matching the E02 amenity QA bar.

## E03-S6 — The Hostel Bunk (accommodation / progression step)
_As a traveler on a budget, I want to move up from a motel room to a hostel bunk, so that the ladder advances and beat 4 introduces the recurring cast._  The tier-2 rung and its story beat.
- **E03-S6-T1** — Extend the ladder to tier 2 — Add "Roadside Hostel (bunk)" as tier 2 in `js/accommodation.js`, the next rung after the motel.
- **E03-S6-T2** — Apply the `accScore` jump — Compute the tier-2 `accScore = ACC.base · ACC.growth^2`, delivering another big Comfort step per `ACC.growth≈2.6`.
- **E03-S6-T3** — Gate the tier-2 unlock — Require `Comfort ≥ C3` plus a cash cost to move into the hostel, tying progression to the Comfort meter.
- **E03-S6-T4** — Fire beat 4 — Trigger beat 4 (*The Hostel Bunk*) at `Comfort ≥ C3`, the beat that introduces the NPC roster and "people = money."
- **E03-S6-T5** — Write beat 4 text — Author meeting fellow travelers in a cramped bunkroom (≤90 words), landing the "people = money" hook toward the social tiers.
- **E03-S6-T6** — Carry beat 3 continuity — Ensure beat 3 (*Checkout Time*) from E02 has completed before beat 4, keeping the spine ordered.
- **E03-S6-T7** — Reveal content on arrival — Unlock the hostel amenity cluster and the social tiers upon reaching tier 2, pacing content to the step.
- **E03-S6-T8** — Swap the tier cosmetic — Update the accommodation name/art to the hostel bunk so the world visibly advances.
- **E03-S6-T9** — Reveal the NPC roster — Unlock the NPC roster UI on hostel arrival so the recurring cast appears alongside the social tiers.
- **E03-S6-T10** — QA the tier-up — Test that the tier-2 upgrade fires once at `C3`, recomputes Comfort, reveals content, and persists.

## E03-S7 — Fellow Travelers (path / branch flavor: traveler & vlogger seeds)
_As a player, I want the backpackers and vloggers I meet to hint at future paths, so that Act I quietly plants the branch choices without locking me in._  Seeding the build paths ahead of E04.
- **E03-S7-T1** — Build the NPC roster UI — Render the recurring characters with portraits and flavor, the surface the path seeds live on.
- **E03-S7-T2** — Attach a path seed per NPC — Map each NPC's `pathSeed` to a build path (the backpacker → traveler, the selfie vlogger → vlogger), foreshadowing E04's branches.
- **E03-S7-T3** — Trickle path points from NPCs — Grant a tiny `pathPoints` stub from NPC interactions, recorded but not yet spent (the full path system arrives in E04).
- **E03-S7-T4** — Scaffold `L_path` — Wire `L_path = 1 + PATH_RATE·points^0.85` into the multiplier stack but hold it at 1 (points effectively zero), so E04 only flips it on.
- **E03-S7-T5** — Add soft story nudges — Let NPC dialogue choices nudge `story.flags` (not yet `story.branch`, which is E11), keeping Act I on the shared spine.
- **E03-S7-T6** — Write NPC dialogue — Author each recurring character's lines in the Dutch-abroad voice ("The vlogger films you eating a cold stroopwafel. 'Content.'").
- **E03-S7-T7** — Tag social tiers for future bonuses — Confirm D2/D3 carry the `social` tag so E04/E12 path bonuses have a target scope ready.
- **E03-S7-T8** — Add a branch-badge stub — Add a hidden UI badge slot that later reflects the emerging branch, wired now to avoid a UI change later.
- **E03-S7-T9** — Persist NPC and seed state — Save NPC-met flags and path seeds in `state`, so relationships and seeds survive reloads.
- **E03-S7-T10** — QA neutrality — Test that path seeds are recorded but do not yet change any balance number, keeping E03 mechanically neutral per the overview.

## E03-S8 — Balance & tuning
_As a designer, I want the D2/D3 constants, bulk-buy, and multiplier stack tuned in the harness, so that the ladder paces toward beat 4 and bulk-buy doesn't break ROI._  Fitting the expanded economy to the curve.
- **E03-S8-T1** — Lock D2/D3 cost constants — Set `GEN.base[1]=100, growth[1]=1.09` and `GEN.base[2]=1.1e3, growth[2]=1.10` per `docs/01`, the standard mid-tier slopes.
- **E03-S8-T2** — Tune per-tier onboarding — Set `perUnit[1]`, `perUnit[2]` so each new tier feels worth buying the moment it's revealed.
- **E03-S8-T3** — Tune the reveal thresholds — Calibrate when D2 and D3 rows reveal so the ladder unfolds smoothly rather than all at once.
- **E03-S8-T4** — Verify the coupling paces the curve — Confirm the super-exponential tier coupling advances cash toward the beat-4 window without a stall.
- **E03-S8-T5** — Fit beat 4 in the harness — Run the ROI-policy harness and confirm `T_target(beat 4)` lands within tolerance.
- **E03-S8-T6** — Sanity-check `L_upgrade` — Confirm the `1 + 0.5·#upgrades` rate makes upgrades attractive but not mandatory, adjusting the coefficient if it dominates.
- **E03-S8-T7** — Confirm bulk-buy ROI parity — Verify in the harness that ×10/max produce the same economy as sequential buys, so bulk is convenience, not an exploit.
- **E03-S8-T8** — Confirm mid-game acceleration — Check that `MILESTONE_STEP=10` doublings across three tiers deliver the intended acceleration without a runaway.
- **E03-S8-T9** — Extend the golden file — Capture a D1–D3 cost/production/Comfort golden so refactors can't silently shift Act I pacing.
- **E03-S8-T10** — Sweep for monotonicity — Sweep the new constants and confirm no cliffs and monotonic income across the ladder, honoring the continuity guarantee.

## E03-S9 — Save / migration / offline
_As a player, I want my three-tier ladder and NPCs to persist and to progress correctly while away, so that the deeper economy is as durable as the first one._  Persistence and offline for the chained economy.
- **E03-S9-T1** — Persist the new state — Save D2/D3 counts/bought, per-tier upgrades, NPC-met flags, path seeds, and `ui.bulkMode`, so nothing new is lost on reload.
- **E03-S9-T2** — Migrate E02 saves — Add the new fields with safe defaults in the migration switchboard so E02 saves load into the three-tier world cleanly.
- **E03-S9-T3** — Chain correctly offline — Ensure offline macro-steps preserve the tier coupling so higher tiers still fill lower ones while away, accurate to a few %.
- **E03-S9-T4** — Add the degree-3 fast path — Extend the closed-form no-purchase offline integration to the degree-3 tier polynomial for the common away case.
- **E03-S9-T5** — Enrich the away summary — Include per-tier contributions in the "While you were away" modal so the player sees which tiers earned while away.
- **E03-S9-T6** — Bump version and lastSeen — Increment `state.version` and stamp `meta.lastSeen` on save so migration and offline anchor correctly.
- **E03-S9-T7** — Guard partial saves — Keep the try/catch + backup fallback so a malformed three-tier save can't loop or brick.
- **E03-S9-T8** — Read older saves too — Verify E01 and E02 saves still load through the chained migration, not just the immediately previous version.
- **E03-S9-T9** — Keep offline honest — Confirm offline never awards free generators, upgrades, or amenities and is always in the player's favor.
- **E03-S9-T10** — QA reload + offline parity — Test that reload preserves all three tiers exactly and that offline results match a live run within a few % across tiers.

## E03-S10 — QA / polish / juice
_As a player, I want the ladder to feel snappy and bulk-buy to feel powerful, so that managing three tiers is a joy rather than a chore._  Final finish on the expanded economy.
- **E03-S10-T1** — Juice the generator rows — Add fill/flash on milestone doublings per row so each tier's `×2` is felt.
- **E03-S10-T2** — Polish the bulk affordance — Make the ×1/×10/max toggle and the max-affordable count read clearly and update live as cash changes.
- **E03-S10-T3** — Polish NPC presentation — Refine NPC portraits and dialogue toasts so the recurring cast feels characterful, not decorative.
- **E03-S10-T4** — Unit-test the bulk math — Test `costBulk` geometric sum and the buy-max solver against iterated single buys for many `b,q` pairs.
- **E03-S10-T5** — Add a chaining integration test — Simulate a run and assert D3 → D2 → D1 → cash flows produce the expected polynomial growth end-to-end.
- **E03-S10-T6** — Format larger magnitudes — Confirm `util.format` renders the higher tier counts and costs cleanly as they scale up.
- **E03-S10-T7** — Guard bulk edge cases — Test buy-max with zero cash (no-op), enormous affordable quantities (guarded), and single-unit fallback.
- **E03-S10-T8** — Lay out multi-tier for mobile — Ensure three generator rows plus the bulk toggle wrap and remain tappable on a phone.
- **E03-S10-T9** — Add accessibility for bulk — Give the bulk toggle and rows ARIA labels announcing quantity and cost for screen readers.
- **E03-S10-T10** — Profile at scale — Verify tick and paint stay in budget with three tiers, per-tier upgrades, and the full hostel amenity cluster owned.

## Definition of Done (epic)
- `GEN.base/growth/perUnit` cover D1–D3; D2/D3 generator rows exist and the tick chains `count_{k-1} += prod_k·dt` for k≥2, with only D1 outputting cash.
- Multiplier stack v1 (`M_k = milestoneMult_k · L_upgrade · L_comfort`) is assembled, with `L_upgrade = 1 + 0.5·#upgrades` and `L_path`/`L_skill` scaffolded at 1 for later epics.
- Bulk-buy ×1/×10/max works via `costBulk_k(b,q)` and a buy-max solver that exactly matches sequential purchases, including milestone crossings.
- The NPC roster exists with per-NPC path seeds (traveler/vlogger) that are recorded but do not yet change balance; the branch-badge slot is wired.
- Accommodation reaches tier 2 (Roadside Hostel) gated on `Comfort ≥ C3`; beat 4 (*The Hostel Bunk*) fires once at `C3` and introduces the cast; the hostel amenity cluster hits the 45–90s cadence.
- The D2/D3 constants are tuned in the harness so beat 4 hits its target; bulk-buy is confirmed ROI-neutral; a D1–D3 golden file guards the curve.
- Save/migration persists the three-tier economy and NPCs; E01/E02 saves migrate; offline preserves tier chaining, uses a degree-3 fast path, and never awards anything free.
- Unit + integration tests (chaining, bulk math) pass; UI is mobile-friendly and accessible; readouts use `util.format`.
