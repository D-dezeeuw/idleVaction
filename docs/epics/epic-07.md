# E07 — Making a Splash
> Act I · Tier 6 (3-Star Hotel, **pool!**) · Pool sub-system (floatables, pool beds, poolside cocktail service) · Beat 9 (*Making a Splash*) · Path: neutral (vlogger/crypto love the pool)

**Epic goal:** Reach the 3-star hotel and open the game's headline small-wins showcase — a dense pool of cheap, flavored amenities (duck floatie → unicorn; lounger → heated pool bed → private cabana; tap water → butler-served cocktail) each granting a tiny `×`, Comfort, and an unlock.
**Player-visible outcome:** A dedicated Poolside panel where a new silly thing is affordable every ~45–90s, each nudging Comfort and income; the 3-star hotel tier.
**Systems touched:** `data/amenities.js` (three pool clusters + zone/tags), `data/accommodation.js` (tier 6), `data/story.js` (beat 9), `engine.js` (Comfort/unlock wiring), `ui.js` (Poolside panel), `config.js` (pool constants), `state.js` (migration).
**Math/balance notes:** many small `AMENITY` entries on `AMENITY.growth≈1.5` (service chain steeper ~1.8); contributions flow through `ComfortRaw → Comfort = cap·raw/(raw+cap) → L_comfort = 1 + COMFORT_MULT·log10(1+Comfort/C0)`; targeted `xMult` respect layer scoping (`L_path`); tier 6 `accScore = ACC.base·ACC.growth^6` (`ACC.growth≈2.6`); cadence target "new thing every ~45–90s" (`docs/05 §5`).

## E07-S1 — Pool Data Foundations
_As a systems engineer, I want the pool's amenities, tags and zone defined as pure data, so that the generic engine can drive dozens of pool upgrades without bespoke code._  The declarative spine every later pool story builds on.
- **E07-S1-T1** — Register the `pool` amenity tag — Add a `pool` tag to the tag registry in `data/amenities.js` so every poolside item can be grouped, filtered and Comfort-weighted as one zone by the panel and `amenityScore` aggregation.
- **E07-S1-T2** — Define the pool zone — Add `zones` entry `{id:'pool', name:'The Pool', unlockBeat:9, order:6}` so the UI renders a dedicated Poolside card gated behind beat 9 (*Making a Splash*).
- **E07-S1-T3** — Lock the shared amenity schema — Ensure each pool amenity carries `{id,name,tag,zone,costBase,costGrowth,comfort,xMult,scope,unlock,desc}`, matching the canonical amenity shape so `engine.buyAmenity` needs no special cases.
- **E07-S1-T4** — Seed default `costGrowth` — Set the floatable/seating clusters to the standard `AMENITY.growth≈1.5` from `config.js`, leaving the service chain (S6) to override with a steeper slope.
- **E07-S1-T5** — Write flavor-copy stubs — Author one-line wry Dutch-tourist `desc` strings ("chlorine: the smell of having finally made it") kept as data for later localization.
- **E07-S1-T6** — Declare unlock-dependency links — Give each item `unlock:{requires:[...ids], comfort:'Cx'}` referencing earlier items and a `STORY_GATES` Comfort threshold so reveals cascade instead of dumping at once.
- **E07-S1-T7** — Tag each `xMult` with `scope` — Mark targeted multipliers with a `scope` (`social` tier list or `all`) per the master multiplier rule so pool bonuses land on the right tiers.
- **E07-S1-T8** — Add `zone:'pool'` back-references — Give every pool amenity a `zone:'pool'` field so `amenityScore` aggregation and the UI can select the whole cluster in one filter.
- **E07-S1-T9** — Export the pool entries — Add the pool items to the canonical array exported by `data/amenities.js` so `state.js` hydration and `engine` iteration pick them up automatically.
- **E07-S1-T10** — Data-integrity unit test — Assert every pool item has a unique `id`, a valid `tag`, positive `costBase`/`costGrowth`, and resolvable `unlock.requires`, catching typos before they reach the engine.

## E07-S2 — Pool Engine & Comfort Wiring
_As the economy engine, I want pool amenities to feed Comfort and targeted multipliers through the existing formulas, so that the pool strengthens progression exactly like every other amenity._  Zero bespoke math — pure reuse of the canonical layers.
- **E07-S2-T1** — Aggregate pool `amenityScore` — Sum each owned pool item's `comfort·level` into `Σ amenityScore` so it flows into `ComfortRaw = w_acc·accScore + w_amen·Σ amenityScore + w_body·bodyLevel`.
- **E07-S2-T2** — Confirm the saturating cap — Verify pool contributions pass through `Comfort = cap·raw/(raw+cap)` so stacking floaties asymptotes toward `COMFORT.cap` and never trivially maxes the meter.
- **E07-S2-T3** — Apply pool `xMult` in the right layer — Fold each item's targeted `xMult` into the correct layer (`L_path` for social-scoped bonuses) so it multiplies across layers, never adds across them.
- **E07-S2-T4** — Route buys through `engine.buyAmenity(id)` — Ensure the generic intent handles `cost(level)=costBase·costGrowth^level`, deducts cash, increments `state.amenities[id].level`, and emits `purchase`.
- **E07-S2-T5** — Implement the unlock cascade — On each `purchase`/`tick`, evaluate every locked pool item's `unlock.requires`+`comfort` and emit `unlock` when satisfied, revealing the next silly floatie.
- **E07-S2-T6** — Dirty-flag Comfort recompute — Cache `Σ amenityScore` and recompute only when a pool buy dirties it, keeping the per-tick cost near zero.
- **E07-S2-T7** — Feed the pool into `L_comfort` — Ensure the raised Comfort lifts global `L_comfort = 1 + COMFORT_MULT·log10(1+Comfort/C0)` so the pool measurably boosts all income.
- **E07-S2-T8** — Guard against bad deltas — Clamp `amenityScore` inputs to ≥0 and assert finite so a mis-authored `comfort` value can't poison the meter.
- **E07-S2-T9** — Fire the beat-9 gate — When `accommodation.tier ≥ 6` and Comfort passes the mapped `STORY_GATES` value, emit `story:beat` for beat 9 (*Making a Splash*).
- **E07-S2-T10** — Unit-test the Comfort math — Assert buying N floaties raises `ComfortRaw` linearly but `Comfort` sub-linearly (saturating), and `L_comfort` moves in the expected direction.

## E07-S3 — The Poolside Panel
_As a player, I want a dedicated Poolside panel with clear buy-buttons, so that I can see, at a glance, every silly upgrade and what it does for my Comfort._  Makes the fun showcase actually feel fun.
- **E07-S3-T1** — Build the Poolside card — In `ui.js`, render a Spectre.css card for `zone:'pool'`, hidden until beat 9 unlocks the zone.
- **E07-S3-T2** — Render per-item buy-buttons — Each button shows `name`, next `cost`, owned `level`, and the next purchase's `+Comfort` delta, all via `util.format`.
- **E07-S3-T3** — Wire buttons to `engine.buyAmenity(id)` — Click dispatches the generic intent; buttons grey out when cash < cost and re-enable reactively on `state:changed`.
- **E07-S3-T4** — Show the next-Comfort delta — Compute the marginal `ΔComfort` of the next level so players feel the saturating curve ("+2.1 Comfort, then +1.9…").
- **E07-S3-T5** — Add unlock-reveal animation — On `unlock`, slide in the newly revealed item with a subtle ripple so a new floatie reads as an event, not a list refresh.
- **E07-S3-T6** — Group by sub-cluster — Divide the card into floatables, seating, and cocktail-service sections so the three chains read as distinct collections.
- **E07-S3-T7** — Respect `prefers-reduced-motion` — Gate ripple/slide juice behind the motion query per the accessibility floor, falling back to instant reveals.
- **E07-S3-T8** — Add an `aria-live` ticker — Announce "Bought Flamingo Floatie (+2 Comfort)" through the live region so the panel is screen-reader friendly.
- **E07-S3-T9** — Show a zone Comfort subtotal — Display the pool zone's total Comfort contribution and its share of `L_comfort` in the card header so the cluster's value is legible.
- **E07-S3-T10** — Snapshot-test the panel — Render the card from a fixture state, asserting buttons, deltas, and locked/revealed states match expectations.

## E07-S4 — The Floatables Collection (headline small-win cluster)
_As a poolside idler, I want a growing collection of ridiculous inflatable floaties, so that there's a new silly thing to unlock every few minutes plus a tiny Comfort bump._  The signature cheap-thrill chain of the epic.
- **E07-S4-T1** — Define floatable data — Add `pool_floatie_{duck,flamingo,unicorn,pizza,swan,island}` to `data/amenities.js`, each `{id,name,tag:'pool',costBase,costGrowth:1.5,comfort,xMult}`; ramp so each next `costBase` ≈2× the last.
- **E07-S4-T2** — Wire the purchase flow — Route through the generic `engine.buyAmenity(id)`; no bespoke code.
- **E07-S4-T3** — Comfort contribution — Feed each floatie's `amenityScore` into `ComfortRaw`; verify the saturating cap holds.
- **E07-S4-T4** — Targeted multiplier — Give each a small `xMult` scoped to social/vlogger tiers via `L_path`.
- **E07-S4-T5** — Unlock reveals — Gate later floaties behind earlier ones + Comfort thresholds; emit `unlock`.
- **E07-S4-T6** — Flavor copy — Write one-line Dutch-tourist descriptions per floatie.
- **E07-S4-T7** — UI buttons — Buy-buttons with name/cost/owned/next-Comfort delta.
- **E07-S4-T8** — Balance pass — Tune so each is affordable ~every 60–90s of active play; confirm via harness.
- **E07-S4-T9** — Save/migration — Persist levels; default 0 for old saves.
- **E07-S4-T10** — QA — Zero-cash, rapid buys, Comfort recompute, no free offline floaties.

## E07-S5 — Loungers, Pool Beds & Cabanas (amenity cluster)
_As a sun-seeker, I want to upgrade where I lie down — from a plastic lounger to a heated pool bed to a private cabana — so that comfort literally has a place to sit._  The Comfort backbone beneath the garnish floaties.
- **E07-S5-T1** — Define the seating chain — Add `pool_lounger`, `pool_bed_heated`, `pool_cabana`, `pool_cabana_private` to `data/amenities.js` with `tag:'pool'`, rising `costBase` (~×3 each) and larger `comfort` than floatables.
- **E07-S5-T2** — Set a moderate `costGrowth` — Use `costGrowth≈1.6` (slightly above the `AMENITY.growth` default) so seating feels considered — between the spammy floaties and the steep service tiers.
- **E07-S5-T3** — Weight seating Comfort high — Give this chain the largest `comfort` weights in the pool zone so it dominates `amenityScore` — the "real" Comfort investment.
- **E07-S5-T4** — Add a heated-bed body hook — Give `pool_bed_heated` a small `scope:'all'` `xMult` and a `bodyHint` flag foreshadowing the Body attribute (E10) without depending on it.
- **E07-S5-T5** — Chain the unlock gates — Require each seat behind the previous plus a `STORY_GATES` Comfort value so cabanas reveal only after loungers and beds are owned.
- **E07-S5-T6** — Write escalating flavor — "A lounger. A bed. A cabana with a little curtain so nobody sees you eat the entire minibar." One wry `desc` line each.
- **E07-S5-T7** — Add owned-count milestone juice — At every 10th purchase of a seating item flash a small note echoing the `MILESTONE_STEP=10` language (pure flavor — amenities don't actually double).
- **E07-S5-T8** — Balance the chain payback — Tune `costBase`/`comfort` so each step pays back within the ~45–90s cadence band during active play; verify in the harness.
- **E07-S5-T9** — Persist seating levels — Store each level in `state.amenities`; add a migration defaulting the new IDs to `level:0` for pre-E07 saves.
- **E07-S5-T10** — QA the seating chain — Test unlock order, cap saturation with all seats maxed, and correct Comfort recompute after a debug-remove.

## E07-S6 — Poolside Cocktail Service Tiers (amenity cluster)
_As a thirsty idler, I want my drinks to escalate from tap water to a butler-served cocktail, so that "service" becomes a visible ladder of small luxuries._  A steeper, prestige-feeling chain that foreshadows E08 service and E19 staff.
- **E07-S6-T1** — Define the service chain — Add `pool_drink_{tapwater,softdrink,cocktail,swimup_bar,cocktail_service,butler_served}` to `data/amenities.js`, `tag:'pool'`, each a clear step up in `costBase` (~×2.5) and `comfort`.
- **E07-S6-T2** — Use a steeper `costGrowth` — Set this chain's `costGrowth≈1.8` so repeat-buys wall faster than floaties, giving a "premium" cadence.
- **E07-S6-T3** — Give service a scoped income `×` — Attach `xMult` scoped to social tiers (D2/D3) via `L_path`, reading as "networking by the pool" and rewarding the vlogger lean.
- **E07-S6-T4** — Make the swim-up bar a mini-headline — Give `pool_drink_swimup_bar` a larger unlock and its own reveal copy ("you can drink without leaving the water — peak civilization").
- **E07-S6-T5** — Foreshadow staff with `butler_served` — Give the top tier a `staffHint` flag and copy teasing E19's butler, without introducing staff mechanics.
- **E07-S6-T6** — Chain unlocks by Comfort + prior tier — Gate each drink behind the previous and a `STORY_GATES` Comfort value so the ladder reveals in order.
- **E07-S6-T7** — Write the drinks flavor — Wry one-liners ("tap water, but with the confidence of a paying guest") as `desc`, escalating in absurd luxury.
- **E07-S6-T8** — Balance the steeper slope — Confirm via harness that `1.8` growth keeps service affordable roughly every ~90s active (slightly slower than floaties); nudge `costBase` if it walls.
- **E07-S6-T9** — Persist & migrate service levels — Store levels in `state.amenities`; migrate old saves to `level:0` with no double-grant on load.
- **E07-S6-T10** — QA the service ladder — Test that `costBase·1.8^level` computes correctly, unlocks fire in order, and the social-scoped `xMult` touches only D2/D3.

## E07-S7 — Splashdown: The 3-Star Pool Tier
_As a climber, I want moving into the 3-star hotel to actually open the pool, so that the accommodation upgrade and the epic's signature feature land as one triumphant moment._  The accommodation step that IS the headline reveal.
- **E07-S7-T1** — Define accommodation tier 6 — Add the 3-Star Hotel to `data/accommodation.js` with `accScore = ACC.base·ACC.growth^6` (`ACC.growth≈2.6`) — a big, felt Comfort jump.
- **E07-S7-T2** — Set the tier-6 unlock gate — Populate `ACC.unlock[6]` with the Comfort threshold mapping to beat 9's gate, tying tier-up to `STORY_GATES`.
- **E07-S7-T3** — Reveal the pool on tier-up — On reaching `accommodation.tier=6`, unlock `zone:'pool'` and reveal the first floatable/lounger so the pool is the reward for the upgrade.
- **E07-S7-T4** — Author beat 9 (*Making a Splash*) — Write the beat in `data/story.js`: ≤90 words, wry Dutch tone, ending on a hook ("…though the concierge mentioned the rooftop pool is members-only").
- **E07-S7-T5** — Add the accommodation buy-button — In `ui.js`, show the tier-6 upgrade with its Comfort/cash gate and a confirmation flourish on purchase.
- **E07-S7-T6** — Grant the tier Comfort baseline — Ensure tier 6's `accScore` feeds `ComfortRaw` immediately so pool amenities build on a higher floor.
- **E07-S7-T7** — Mount the panel on tier-up — Fire the `unlock` event that mounts the S3 Poolside panel exactly when the tier flips, not before.
- **E07-S7-T8** — Balance the tier gate — Tune the tier-6 Comfort/cash gate so players arrive near the beat-9 target (~1:00–1:10 into the run per `docs/05`); verify in harness.
- **E07-S7-T9** — Persist tier & ownedTiers — Record `accommodation.tier=6` and push to `ownedTiers`; migrate saves lacking tier-6 data to hold their current tier.
- **E07-S7-T10** — QA the reveal sequence — Test that the pool stays hidden pre-tier-6, unlocks exactly once, replays correctly from a mid-tier save, and doesn't double-fire beat 9.

## E07-S8 — Poolside Persona (path flavor)
_As a would-be influencer, I want the pool to feed my chosen vibe — vlogger clout or crypto-lounger cool — so that the same water rewards different builds._  Seeds the beat-10 persona arc without locking anyone in.
- **E07-S8-T1** — Scope pool `×` to path tiers — Ensure floatable/service `xMult` bonuses target each path's tiers (social D2/D3 for vlogger) through `L_path = 1 + PATH.rate·points^0.85`.
- **E07-S8-T2** — Add a vlogger content backdrop — Add `pool_photo_backdrop` amenity granting a small vlogger-scoped `×` and Comfort, flavored "the perfect infinity-pool selfie spot."
- **E07-S8-T3** — Add a crypto laptop-lounger — Add `pool_waterproof_laptop` amenity with a small crypto-leaning hook (flag only; Savvy arrives E13) and copy "money works while I tan."
- **E07-S8-T4** — Foreshadow beat 10 (*Poolside Persona*) — In `data/story.js`, plant the Charisma-gated beat-10 setup (fully opens in E09) so the pool visibly begins the persona arc.
- **E07-S8-T5** — Trickle path points from pool spend — Have poolside purchases grant a few path points toward the matching branch per `PATH.rate`, nudging emergent builds.
- **E07-S8-T6** — Keep bonuses reconvergent — Ensure no pool item hard-locks a branch; every `xMult` is emphasis, so any build still completes (per storyline design).
- **E07-S8-T7** — Write persona flavor copy — Two short variants (loud vlogger vs. quiet crypto-lounger) for the backdrop/laptop items, matching the storyline branch voices.
- **E07-S8-T8** — Balance path-flavor bonuses small — Keep these `xMult` modest so they color a build without dominating the neutral pool; confirm no runaway via `PATH.softcapExp=0.85`.
- **E07-S8-T9** — Persist path-flavor items — Store the two persona micro-upgrades in `state.amenities`; default 0 for old saves.
- **E07-S8-T10** — QA path scoping — Test that the vlogger-scoped `×` only lands on social tiers, the crypto flag sets no live bonus yet, and neither strands a non-matching build.

## E07-S9 — Making It Flow: Balance & Cadence Tuning
_As the balance owner, I want the pool cluster to deliver a small win every 45–90 seconds, so that E07 earns its "fun showcase" title without breaking the 20-hour curve._  Turns three clusters into one smooth cadence.
- **E07-S9-T1** — Encode the cadence target — Add the "new thing every ~45–90s active" goal from `docs/05 §5` as a harness assertion over the pool zone across the beat-9 window.
- **E07-S9-T2** — Tune the floatable ramp — Adjust each floatable's `costBase` so they come ~60–90s apart at expected beat-9 income, per S4-T8.
- **E07-S9-T3** — Tune seating vs. service slopes — Balance `costGrowth` 1.6 (seating) against 1.8 (service) so the three chains interleave rather than all walling at once.
- **E07-S9-T4** — Verify Comfort contribution target — Confirm the fully-bought pool lifts `L_comfort` a satisfying but bounded amount (cap holds), sitting in the mid-Act-I 1.5–3× Comfort band.
- **E07-S9-T5** — Run the greedy-ROI policy — Simulate the beat-8→beat-10 stretch with the reference `greedy(s)` policy and read the pool purchase log for cadence gaps.
- **E07-S9-T6** — Nudge the largest miss — Apply the `docs/05` fit procedure: change the single `costBase`/`costGrowth` with the biggest deviation, re-run, repeat until within band.
- **E07-S9-T7** — Cross-check global impact — Ensure pool `xMult` + `L_comfort` don't overshoot the tier ladder, so beat 10 still lands near its ~1:10 target.
- **E07-S9-T8** — Commit a golden pacing file — Snapshot the tuned pool curve as a golden file so future content changes flag beat-9 cadence regressions.
- **E07-S9-T9** — Document the constants — Record final pool `costBase/costGrowth/comfort/xMult` values inline in `config.js`/data comments per `docs/06`.
- **E07-S9-T10** — Extreme-speed sanity — Run at `GAME_SPEED=1000` to confirm no cadence assertion or Comfort math breaks under acceleration.

## E07-S10 — Watertight: Save, Migration, Offline & QA
_As a returning player, I want my pool to survive a reload and a 12-hour nap, so that no floatie is ever lost and offline never gifts free ones._  Persistence correctness plus the final polish pass.
- **E07-S10-T1** — Bump the save version — Increment `state.version` and register the pool amenity keys so saves round-trip through `JSON.stringify`.
- **E07-S10-T2** — Add the E07 migration — Add a `MIGRATIONS[n]` entry defaulting all pool amenity IDs and the tier-6 flag to safe zeros for pre-E07 saves, per `docs/00 §5`.
- **E07-S10-T3** — Verify offline Comfort — Confirm the `OFFLINE_STEPS`/`OFFLINE_CAP=12h` macro-steps recompute Comfort from stored amenity levels without re-granting or auto-buying anything.
- **E07-S10-T4** — Assert no free offline floaties — Test that returning after 12h advances income but never increments any `pool_*` level (amenities are bought, never auto-generated).
- **E07-S10-T5** — Export/import round-trip — Encode a pool-heavy state to the base64 export string and re-import, asserting byte-identical amenity levels.
- **E07-S10-T6** — Zero-cash rapid-buy fuzz — Fuzz rapid clicks with insufficient cash, asserting no level increments, no negative cash, and no ghost `purchase` events.
- **E07-S10-T7** — Comfort recompute stress test — Buy and debug-remove pool items in a loop, asserting `Comfort` and `L_comfort` always match a fresh recompute (no drift).
- **E07-S10-T8** — Number-format polish — Ensure all pool costs/deltas use `util.format` notation and don't overflow layout at large `level` counts.
- **E07-S10-T9** — Add splash juice — Add a small water-ripple/droplet flourish on pool purchases (motion-query gated) so the fun showcase feels wet and alive.
- **E07-S10-T10** — DoD regression suite — Assemble the S1–S10 tests into an E07 suite, gating the epic as done only when all pass.

## Definition of Done (epic)
- Beat 9 (*Making a Splash*) fires when `accommodation.tier ≥ 6` and the Comfort gate is met; text reads in wry Dutch tone and ends on a forward hook.
- 3-Star Hotel (tier 6) purchasable; `accScore = ACC.base·ACC.growth^6` feeds Comfort; the pool zone reveals on tier-up.
- Three pool amenity clusters live (floatables, seating, cocktail service), all driven by the generic `engine.buyAmenity(id)` — no bespoke purchase code.
- Pool contributions flow through `ComfortRaw → Comfort = cap·raw/(raw+cap) → L_comfort`; targeted `xMult` respect the additive-within / multiplicative-across layer rule.
- Poolside panel renders revealed items with cost/owned/next-Comfort delta, unlock reveals, `aria-live`, and reduced-motion support.
- Harness confirms a small win every ~45–90s across the beat-9 window; a golden pacing file is committed.
- Saves migrate from pre-E07 with pool defaults; offline never grants free amenities; export/import round-trips.
- All S1–S10 tests are green.
