# E08 — Sun, Sand & Service
> Act I close · Tier 7 (4-Star Beach Resort) · Beach amenity cluster + pre-staff service-quality tiers + Comfort "service" weighting · Beat 10 (*Poolside Persona*, part) · Path: neutral (service seeds staff)

**Epic goal:** Trade the pool deck for a private beach: reach the 4-star beach resort and introduce **service quality** — a pre-staff ladder from self-serve cart to maître d' that weights Comfort, multiplies income, and foreshadows hiring real staff.
**Player-visible outcome:** A beachfront zone with sun/sand amenities and a visible "service quality" ladder that raises Comfort and income; the 4-star resort tier.
**Systems touched:** `data/amenities.js` (beach cluster + service chain + `service` tag), `data/accommodation.js` (tier 7), `data/story.js` (beat 10 part), `math.js`/`engine.js` (new `w_service` Comfort weight), `ui.js` (beach panel), `config.js` (service growth), `state.js` (migration).
**Math/balance notes:** service tiers are amenity chains with steeper `costGrowth≈1.9` for a prestige feel; a new Comfort weight `w_service` adds `w_service·Σ serviceScore` to `ComfortRaw` (still saturating below `COMFORT.cap`); service `xMult (scope:'all')` lifts all income; tier 7 `accScore = ACC.base·ACC.growth^7`.

## E08-S1 — Beach & Service Data Model
_As a systems engineer, I want the beach zone and the service-quality chain defined as data, so that a whole resort's worth of upgrades runs on the generic amenity engine._  The declarative foundation for the tier.
- **E08-S1-T1** — Add the `beach` tag & zone — Register a `beach` tag and a `{id:'beach', name:'The Beach', unlockBeat:10, order:7}` zone in `data/amenities.js` so beach items group into their own card.
- **E08-S1-T2** — Add the cross-zone `service` tag — Register a `service` tag so pool and beach service items share one Comfort-weighting bucket, distinct from physical amenities.
- **E08-S1-T3** — Define the service-quality chain — Add `service_{selfserve,waiter,head_waiter,maitre_d,concierge_seed}` with rising `costBase` (~×3) and a steeper `costGrowth` reserved for prestige feel.
- **E08-S1-T4** — Define the sun & sand cluster — Add `beach_{towel,umbrella,sun_lounger,cabana,jetski,private_stretch}` with `tag:'beach'`, standard `AMENITY.growth≈1.5`, and escalating `comfort`.
- **E08-S1-T5** — Add the `service` weight field — Give service items a `service` weight so the engine can sum a separate `Σ serviceScore` alongside `amenityScore`.
- **E08-S1-T6** — Author beach & service flavor stubs — Write wry Dutch `desc` lines ("a towel you didn't have to fight a German tourist for at dawn") as data.
- **E08-S1-T7** — Declare unlock dependencies — Chain beach items and service tiers with `unlock.requires` + `STORY_GATES` Comfort gates so the resort reveals progressively.
- **E08-S1-T8** — Set `scope` for service `×` — Scope service-tier income `xMult` to `all` (service lifts the whole operation) while beach items stay tag-targeted, per the multiplier rules.
- **E08-S1-T9** — Flag the staff bridge — Mark `service_concierge_seed` with a `staffHint` as the pre-staff bridge to E11/E19 so the ladder visibly points toward hiring.
- **E08-S1-T10** — Data-integrity test — Assert unique IDs, valid tags, resolvable unlocks, and that every `service` item carries a positive `service` weight.

## E08-S2 — Service-Quality Engine
_As the engine, I want service quality to be its own weighted Comfort input and a global income multiplier, so that "how well you're waited on" is a real, tunable lever ahead of actual staff._  Extends the Comfort formula cleanly.
- **E08-S2-T1** — Sum `Σ serviceScore` per tick — Aggregate owned service items' `service·level` into a dedicated sum feeding `ComfortRaw` via a new `w_service` weight.
- **E08-S2-T2** — Extend the Comfort formula — Add `w_service·Σ serviceScore` to `ComfortRaw = w_acc·accScore + w_amen·Σ amenityScore + w_service·Σ serviceScore + w_body·bodyLevel` in `math.js`.
- **E08-S2-T3** — Keep the saturating cap intact — Verify the new term still passes through `Comfort = cap·raw/(raw+cap)` so service can't blow past `COMFORT.cap`.
- **E08-S2-T4** — Apply the service income `×` — Fold service-tier `xMult (scope:'all')` into the correct multiplier layer so better service lifts all income multiplicatively.
- **E08-S2-T5** — Implement the steep cost curve — Ensure `cost(level)=costBase·costGrowth^level` uses the service chain's higher `costGrowth` so tiers feel prestigious.
- **E08-S2-T6** — Reuse `engine.buyAmenity(id)` — Route all service/beach buys through the generic intent — no bespoke purchase code — preserving `purchase`/`unlock` events.
- **E08-S2-T7** — Cascade service unlocks — Reveal each service tier when the prior tier + Comfort gate are met, emitting `unlock` for the beach panel.
- **E08-S2-T8** — Dirty-flag service recompute — Recompute `Σ serviceScore` only on service purchases to keep the tick cheap.
- **E08-S2-T9** — Guard weights & finiteness — Clamp `serviceScore` ≥0 and assert `w_service` finite so a mis-tuned weight can't corrupt Comfort.
- **E08-S2-T10** — Unit-test service math — Test that adding a service tier raises both `ComfortRaw` and the global `×`, and that Comfort stays below `cap`.

## E08-S3 — The Beachfront UI
_As a player, I want a beachfront panel that shows sun/sand upgrades and a clear service-quality meter, so that I can see my resort getting classier._  Legibility for the epic's headline ladder.
- **E08-S3-T1** — Build the Beachfront card — Render a `zone:'beach'` Spectre card in `ui.js`, hidden until beat 10 reveals the beach.
- **E08-S3-T2** — Render a service-quality meter — Show the current service tier as a labeled bar ("Self-serve → Waiter → Maître d'") with the next tier's cost and `+Comfort`/`+×` deltas.
- **E08-S3-T3** — Render beach amenity buttons — Buy-buttons with `name/cost/owned/+Comfort` via `util.format`, wired to `engine.buyAmenity(id)`.
- **E08-S3-T4** — Preview the service `×` — Display the global income `×` the next service tier grants so its steeper cost feels justified.
- **E08-S3-T5** — Unlock-reveal transitions — Slide in newly unlocked beach/service items on `unlock`, motion-query gated.
- **E08-S3-T6** — Separate sand vs. service — Divide the card into "Sun & Sand" and "Service" sections so the two chains read distinctly.
- **E08-S3-T7** — `aria-live` service announcements — Announce "Promoted to Head Waiter service (+global ×1.05)" through the live region.
- **E08-S3-T8** — Zone Comfort subtotal — Header shows the beach+service Comfort contribution and its share of `L_comfort`.
- **E08-S3-T9** — Disable/enable on affordability — Grey buttons when cash < cost; re-enable on `state:changed`.
- **E08-S3-T10** — Snapshot-test the card — Render from a fixture asserting meter position, deltas, and locked/revealed items.

## E08-S4 — Service-Quality Tiers (headline new thing)
_As a guest, I want the people serving me to visibly improve — from a self-serve cart to a maître d' who remembers my name — so that service becomes a status ladder before I ever hire staff._  The epic's signature system.
- **E08-S4-T1** — Finalize the five tiers — Lock names/copy: Self-serve Cart → Beach Waiter → Head Waiter → Maître d' → Resort Concierge (seed), escalating in absurd-luxury tone.
- **E08-S4-T2** — Set steep prestige growth — Set the service chain `costGrowth≈1.9` in `config.js`/data so each tier is a deliberate, felt investment, not a spam-buy.
- **E08-S4-T3** — Grant each tier a global `×` — Give ascending `xMult (scope:'all')` values (e.g. 1.03→1.12) so climbing service is a real economic choice.
- **E08-S4-T4** — Grant each tier `serviceScore` — Rising `service` weights so better waitstaff also lifts Comfort, double-rewarding the climb.
- **E08-S4-T5** — Gate tiers behind Comfort + prior — Use `STORY_GATES` Comfort values so the maître d' appears only once the resort earns it.
- **E08-S4-T6** — Bridge to staff (E19) — Give the concierge-seed tier copy and a `staffHint` explicitly teasing hiring a real butler later.
- **E08-S4-T7** — Write the ladder copy — Wry lines ("the maître d' pretends your poncho is 'a look'") as `desc`, one per tier.
- **E08-S4-T8** — Balance tier `×` vs. cost — Tune `xMult`/`costBase` so each promotion pays back within the late-Act-I cadence (~2 min); verify in harness.
- **E08-S4-T9** — Persist service state — Store service levels in `state.amenities`; migrate old saves to tier 0.
- **E08-S4-T10** — QA the ladder — Test steep-growth costs, in-order unlocks, global `×` correctness, and that the staff-seed flag doesn't activate staff mechanics.

## E08-S5 — Sun & Sand Amenity Cluster
_As a beach idler, I want a pile of cheap seaside upgrades — towel, umbrella, jet ski — so that there's always a small win between the big service promotions._  Keeps the cadence dense.
- **E08-S5-T1** — Define the sand cluster — Finalize `beach_{towel,umbrella,sun_lounger,cabana,jetski,private_stretch}` with `AMENITY.growth≈1.5` and a gentle `costBase` ramp (~×2).
- **E08-S5-T2** — Weight beach Comfort modestly — Set `comfort` values so the cluster is a steady Comfort trickle beneath the heavier service investments.
- **E08-S5-T3** — Add a jet-ski novelty `×` — Give `beach_jetski` a small fun `xMult` and standout copy so mid-cluster has a memorable toy.
- **E08-S5-T4** — Chain the unlock reveals — Gate each item behind the prior + Comfort so the beach fills in over the session.
- **E08-S5-T5** — Write sun & sand flavor — "An umbrella against a sun you flew 2,000km to find, having complained about its absence your whole life." One line each.
- **E08-S5-T6** — Interleave with service cadence — Ensure sand items fall between service promotions so the player always has a cheap next-buy.
- **E08-S5-T7** — Add a private-stretch capstone — Make `beach_private_stretch` the cluster's satisfying finale with a larger Comfort bump and exclusivity-foreshadow copy (E14/E21).
- **E08-S5-T8** — Balance cluster cadence — Confirm via harness the sand cluster delivers a small win every ~60–120s in the beat-10 window; nudge `costBase` as needed.
- **E08-S5-T9** — Persist & migrate — Store levels; default new IDs to 0 for old saves.
- **E08-S5-T10** — QA the cluster — Zero-cash spam, unlock order, Comfort recompute, no offline auto-buy.

## E08-S6 — Accommodation Step: The 4-Star Beach Resort
_As a climber, I want to check into the 4-star beach resort, so that the whole beach-and-service world opens as the reward for my Comfort climb._  The tier-up that gates the epic.
- **E08-S6-T1** — Define accommodation tier 7 — Add the 4-Star Beach Resort to `data/accommodation.js` with `accScore = ACC.base·ACC.growth^7`.
- **E08-S6-T2** — Set the tier-7 unlock gate — Populate `ACC.unlock[7]` with the Comfort threshold aligned to beat 10's gate in `STORY_GATES`.
- **E08-S6-T3** — Reveal the beach on tier-up — On `accommodation.tier=7`, unlock `zone:'beach'` and the first towel/umbrella + the self-serve service tier.
- **E08-S6-T4** — Author beat 10 (*Poolside Persona*, part) — Write the resort-arrival portion in `data/story.js` (≤90 words, wry, hooking toward the Charisma-gated persona in E09).
- **E08-S6-T5** — Add the tier-7 buy-button — Show the upgrade with its Comfort/cash gate and an arrival flourish.
- **E08-S6-T6** — Feed the tier baseline Comfort — Ensure tier-7 `accScore` lifts `ComfortRaw` immediately.
- **E08-S6-T7** — Mount the beach panel on unlock — Fire the `unlock` that mounts the S3 beach card exactly at the tier flip.
- **E08-S6-T8** — Balance arrival timing — Tune the gate so players reach tier 7 near the beat-10 target (~1:10, Act-I close) in the harness.
- **E08-S6-T9** — Persist tier & ownedTiers — Record tier 7, push to `ownedTiers`; migrate old saves safely.
- **E08-S6-T10** — QA the reveal — Beach hidden pre-tier-7, unlocks once, replays from a mid-tier save, beat 10 doesn't double-fire.

## E08-S7 — Beach Club Persona (path flavor)
_As a player leaning into a build, I want the beach club to flatter my chosen path, so that sun and service reward vloggers, connoisseurs and travelers differently._  Deepens the branch seeds without lock-in.
- **E08-S7-T1** — Scope beach `×` to path tiers — Route select beach/service `xMult` through `L_path = 1 + PATH.rate·points^0.85` toward the relevant tiers per branch.
- **E08-S7-T2** — Add a vlogger beach-content upgrade — `beach_drone_shot` amenity: small social-scoped `×` + Comfort, copy "cinematic drone footage of you not working."
- **E08-S7-T3** — Add a connoisseur reservation upgrade — `beach_reserved_table` with an exclusivity-flavored small `×`, foreshadowing Taste (E14).
- **E08-S7-T4** — Add a traveler beach-hop hook — A micro-upgrade nudging destination path points, tying the beach to the World-Traveler fantasy.
- **E08-S7-T5** — Continue the beat-10 persona thread — Add branch-voiced beat-10 lines here so persona flavor deepens on the sand (resolves fully in E09).
- **E08-S7-T6** — Trickle path points from beach spend — Beach/service purchases grant a few path points toward the matching branch per `PATH.rate`.
- **E08-S7-T7** — Keep everything reconvergent — Ensure no beach item hard-gates a branch; all bonuses are emphasis, every build still completes.
- **E08-S7-T8** — Balance path bonuses small — Keep `xMult` modest; verify `PATH.softcapExp=0.85` prevents runaway from beach spend.
- **E08-S7-T9** — Persist persona items — Store the three micro-upgrades; default 0 for old saves.
- **E08-S7-T10** — QA path scoping — Test each `×` lands only on its intended tiers and no branch is stranded.

## E08-S8 — Balance & Tuning
_As the balance owner, I want the beach-and-service economy to close Act I on schedule, so that steeper service growth adds prestige without stalling progress._  Fits the constants to the pacing contract.
- **E08-S8-T1** — Encode the beat-10 target — Add the ~1:10 Act-I-close target and the ~2-min service-cadence band to the harness.
- **E08-S8-T2** — Tune the `w_service` weight — Set the Comfort service weight so service moves Comfort meaningfully but not overwhelmingly relative to `w_amen`/`w_acc`.
- **E08-S8-T3** — Tune the service `costGrowth` — Balance the 1.9 slope so five tiers span the epic without walling; nudge if promotions bunch or starve.
- **E08-S8-T4** — Tune the beach `costBase` — Fit sand-cluster costs to the interleave cadence so cheap wins fill the gaps between promotions.
- **E08-S8-T5** — Verify global `×` stacking — Confirm service `xMult × L_comfort ×` tier ladder doesn't overshoot beat 11's later gate.
- **E08-S8-T6** — Run the greedy-ROI harness — Simulate beat-9→beat-11, reading the beach/service purchase log for cadence and timing misses.
- **E08-S8-T7** — Apply the fit procedure — Nudge the single most-off constant, re-run, repeat until beat 10 is within ±15% of target.
- **E08-S8-T8** — Commit a golden file — Snapshot the tuned beach/service curve to catch regressions.
- **E08-S8-T9** — Document constants — Inline-comment final `w_service`, service `costGrowth`, and `xMult` values in `config.js`/data.
- **E08-S8-T10** — Extreme-speed sanity — Run `GAME_SPEED=1000` to confirm no Comfort/service math breaks under acceleration.

## E08-S9 — Save, Migration & Offline
_As a returning player, I want my beach resort and service level to persist and behave offline, so that reloading never resets my maître d' to a self-serve cart._  Persistence correctness for the new state.
- **E08-S9-T1** — Bump the save version — Increment `state.version` and register beach/service amenity keys for round-trip serialization.
- **E08-S9-T2** — Add the E08 migration — `MIGRATIONS[n]` defaults all `beach_*`/`service_*` IDs and the tier-7 flag to zeros for pre-E08 saves.
- **E08-S9-T3** — Migrate the Comfort weight — Ensure old saves without `serviceScore` recompute Comfort correctly with `w_service` applied to a zero sum (no NaN).
- **E08-S9-T4** — Verify offline correctness — Confirm `OFFLINE_STEPS`/`OFFLINE_CAP` recompute Comfort from stored service/beach levels without re-granting.
- **E08-S9-T5** — No free offline promotions — Test that 12h away never increments a service tier or beach item.
- **E08-S9-T6** — Export/import round-trip — Encode a beach-heavy state to base64 and re-import; assert identical levels and service tier.
- **E08-S9-T7** — Backward-compat fixtures — Load a pre-E08 fixture save and assert clean migration to the current version.
- **E08-S9-T8** — Guard malformed saves — Ensure a corrupt `service` level falls back safely (try/catch keeps the current save) per `docs/00 §5`.
- **E08-S9-T9** — Persist zone-unlock flags — Save the beach-zone unlocked flag so the panel re-mounts correctly after reload.
- **E08-S9-T10** — Migration unit tests — Assert the E08 migration is idempotent and order-independent among stacked migrations.

## E08-S10 — QA, Polish & Juice
_As a player, I want the resort to feel crisp and classy, so that steeper service tiers land as satisfying promotions rather than confusing price jumps._  Final polish gating the epic.
- **E08-S10-T1** — Service-promotion juice — Add a small "ding + white-glove" flourish on service tier-ups (motion / `prefers-reduced-motion` gated).
- **E08-S10-T2** — Number-format audit — Ensure all beach/service costs and `×` use `util.format` and don't overflow layout at high levels.
- **E08-S10-T3** — Edge-case steep costs — Test `costBase·1.9^level` stays finite and formats sanely deep into the chain.
- **E08-S10-T4** — Comfort-drift stress test — Buy/remove service + beach items in a loop; assert Comfort/`L_comfort` always match a fresh recompute.
- **E08-S10-T5** — Unlock-order fuzz — Randomize purchase order (debug-granted cash) and assert the unlock cascade never reveals out of sequence.
- **E08-S10-T6** — Screen-reader pass — Verify `aria-live` announcements for beach buys and service promotions read cleanly.
- **E08-S10-T7** — Reduced-motion verification — Confirm all beach juice degrades to instant under the motion query.
- **E08-S10-T8** — Path-scope regression — Re-assert the beach persona `×` only touch intended tiers after tuning changes.
- **E08-S10-T9** — Beat-10 text QA — Proofread beat-10 copy for tone, length (≤90 words), and a forward hook to E09's Charisma gate.
- **E08-S10-T10** — DoD regression suite — Bundle the S1–S10 tests into an E08 suite gating the epic as done.

## Definition of Done (epic)
- 4-Star Beach Resort (tier 7) purchasable; `accScore = ACC.base·ACC.growth^7`; the beach zone reveals on tier-up.
- Beat 10 (*Poolside Persona*, part) fires at the tier-7/Comfort gate in wry Dutch tone with a hook to E09.
- Service-quality ladder (self-serve → maître d' → concierge seed) live with steeper `costGrowth≈1.9`, global `xMult`, and `serviceScore` Comfort via the new `w_service` weight.
- Sun & sand cluster delivers interleaved small wins on the standard `AMENITY.growth≈1.5`.
- Comfort formula extended with `w_service·Σ serviceScore` and still saturates below `COMFORT.cap`.
- Beachfront panel renders the service meter + amenity buttons with deltas, unlock reveals, `aria-live`, and reduced-motion.
- Harness confirms the Act-I close near the beat-10 target; a golden file is committed.
- Saves migrate from pre-E08; offline grants no free items/promotions; export/import round-trips; all S1–S10 tests are green.
