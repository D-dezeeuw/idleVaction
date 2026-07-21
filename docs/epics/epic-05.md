# E05 — One Star, Big Dreams
> Act I · Tier 4 (1-Star Hotel) · Accommodation ladder + per-tier upgrade layer (`L_upgrade`) + Comfort-gated unlocks · Beats 6–7 (*One Star, Big Dreams*) · Neutral

**Epic goal:** Formalize the shed→island **accommodation ladder** as data and add the per-tier **upgrade layer** — buyable "renovations" that visibly boost income (`L_upgrade`) — then check into the 1-Star Hotel (tier 4) behind a Comfort gate.
**Player-visible outcome:** A proper accommodation ladder panel, per-tier renovation upgrades that raise your income multiplier, Comfort-threshold unlocks tied to the story, and the 1-Star Hotel.
**Systems touched:** `data/accommodation.js` (full 30-tier ladder + upgrade rows), `engine.js` (`buyUpgrade`, `upgradeAccommodation`, `L_upgrade`), `math.js` (`L_upgrade` formula), `state.js` (`state.accommodation.upgrades`), `config.js` (`ACC.unlock[]`, `L_UPGRADE_RATE`), `data/story.js` (beats 6–7), `data/amenities.js` (1-star cluster), `ui.js`.
**Math/balance notes:** `L_upgrade = 1 + L_UPGRADE_RATE · (#upgrades bought for tier)` with `L_UPGRADE_RATE = 0.5` (additive within the upgrade layer). `accScore = ACC.base·ACC.growth^tier` with `ACC.growth ≈ 2.6`. `ACC.unlock[]` Comfort thresholds tie to `STORY_GATES` (`C1…C30`). `L_upgrade` multiplies across layers with `milestoneMult`, `L_path`, `L_dest`, `L_comfort`.

## E05-S1 — Blueprints for the Whole Climb (data model: ladder + upgrades)
_As a dreamer with a guidebook, I want the entire shed→island ladder defined as data, so that every future tier is a row, not a rewrite._  Declarative foundation for all accommodation to come.
- **E05-S1-T1** — Flesh out `accommodation.js` — Define an `ACCOMMODATION` array of the full ladder (tiers 0..21+); each `{tier,name,accScore,unlock,upgrades:[]}` with `accScore = ACC.base·ACC.growth^tier`.
- **E05-S1-T2** — Name the ladder — Fill tier names 0–5 now (Soggy Shed…2-Star) and stub 6–21 so later epics only edit strings, not structure.
- **E05-S1-T3** — Per-tier upgrade rows — For each tier add an `upgrades` list; each upgrade `{id,name,costBase,costGrowth,tierScope,effect:'L_upgrade'}`.
- **E05-S1-T4** — Populate tier-4 upgrades — Author ~5 renovations for the 1-Star Hotel: `up_hotel_curtains`, `up_hotel_kettle`, `up_hotel_mattress`, `up_hotel_lock`, `up_hotel_view`.
- **E05-S1-T5** — Config `ACC.unlock[]` — Add the Comfort-threshold array `ACC.unlock[0..21]` to `config.js`; tie `[3]`,`[4]`,`[5]` to the matching `STORY_GATES` C-values.
- **E05-S1-T6** — Config upgrade coefficient — Add `L_UPGRADE_RATE = 0.5` to `config.js` so `L_upgrade = 1 + rate·n` stays data-driven, not hard-coded in the engine.
- **E05-S1-T7** — Extend state — Add `state.accommodation.upgrades = { [upgradeId]:{bought:false} }` while keeping `tier` and `ownedTiers`.
- **E05-S1-T8** — Story entries — Add beat-7 *One Star, Big Dreams* skeleton (gate `Acc tier ≥ 4`) and the beat-6 continuation to `data/story.js`.
- **E05-S1-T9** — Cross-refs — Comment the tier rows with their dependencies (E04 destinations feeding income, E06 `L_comfort` coming online) so the ladder's role is legible.
- **E05-S1-T10** — Validate data — Add a dev assertion that `accScore` is strictly increasing, every `unlock` threshold is monotonic, and every upgrade has a `tierScope`; fail loudly on bad data.

## E05-S2 — Renovation Crew (core logic/engine: upgrades & `L_upgrade`)
_As the engine, I want renovations to raise a per-tier multiplier, so that spending on your room visibly grows income._  The formulas behind the upgrade layer.
- **E05-S2-T1** — `L_upgrade` formula — In `math.js` add pure `upgradeMult(tier,state) = 1 + L_UPGRADE_RATE · countBought(tier)` (additive within the upgrade layer).
- **E05-S2-T2** — Fold into `M_k` — Multiply `L_upgrade` into each tier's `M_k` in the documented stack order (after `milestoneMult`, before `L_path`).
- **E05-S2-T3** — Scope handling — Support `tierScope='all'` (global renovations) vs a tier list, marking each bonus's `scope` per the master rule in math §3.
- **E05-S2-T4** — `buyUpgrade` intent — `engine.buyUpgrade(id)`: cash check via `costBase·costGrowth^bought` (one-time buy), deduct, set `bought`, emit `purchase`, recompute `L_upgrade`.
- **E05-S2-T5** — `upgradeAccommodation` intent — Gate on `Comfort ≥ ACC.unlock[nextTier]` AND cash; advance `tier`, push to `ownedTiers`, bump `accScore`.
- **E05-S2-T6** — Comfort-gated reveal — Expose a tier's upgrades only once it's owned, and offer the tier itself only when its Comfort gate is met; emit `unlock`.
- **E05-S2-T7** — Recompute Comfort — On tier change, recompute `ComfortRaw` (`w_acc·accScore`) and the saturating `Comfort`; propagate to `L_comfort` dependents.
- **E05-S2-T8** — One-time enforcement — Ensure re-buying an owned upgrade or tier is blocked and idempotent.
- **E05-S2-T9** — Beat check — Emit a `story:beat` check after tier-up so beat 7 auto-fires when `tier ≥ 4`.
- **E05-S2-T10** — Purity — Keep all of it pure over `state` (no globals) so offline macro-steps and the harness reproduce exactly.

## E05-S3 — The Front Desk (UI/buttons: ladder panel + upgrade buttons)
_As a guest planning my climb, I want a clear ladder and renovation buttons, so that I can see where I am, what's next, and its gate._  Exposes the ladder as simple buttons.
- **E05-S3-T1** — Ladder panel — Render an "Accommodation" card showing current tier, `accScore`, and the next tier with its Comfort gate + cash cost.
- **E05-S3-T2** — Upgrade buttons — Under the current tier, list its renovations: name, cost, owned, and a `+×` preview; disabled when unaffordable or already bought.
- **E05-S3-T3** — Comfort-gate display — Show a locked next-tier row reading "needs Comfort ≥ X" with a live progress bar toward `ACC.unlock[t]`.
- **E05-S3-T4** — `L_upgrade` readout — Header shows the current per-tier `L_upgrade` and "next reno: +50%" so the effect is legible.
- **E05-S3-T5** — Renovate-cheapest button — Optional convenience button that buys the lowest-cost affordable upgrade, respecting one-time flags.
- **E05-S3-T6** — Tier-up button — Prominent "Check into 1-Star Hotel" button, enabled only when gate + cash are met; emits `upgradeAccommodation`.
- **E05-S3-T7** — Reveal on unlock — On `unlock`, animate the newly available tier/upgrade into view (reduced-motion safe).
- **E05-S3-T8** — Ticker feedback — On upgrade buy, flash `+×` and push to the `aria-live` ticker; on tier-up, a bigger celebratory line.
- **E05-S3-T9** — Flavor tooltips — Each renovation tooltip carries the wry data-driven one-liner, keeping the UI read-only.
- **E05-S3-T10** — Section wiring — Subscribe to `purchase`/`unlock`/`story:beat` and re-render only the accommodation panel.

## E05-S4 — Renovations (headline new thing: the per-tier upgrade layer)
_As a guest with opinions, I want to buy fixes for my room, so that each purchase permanently boosts my income._  The epic's signature system: `L_upgrade`.
- **E05-S4-T1** — Establish the layer — Make `L_upgrade` a first-class, visible layer in the multiplier stack (the epic's signature), documented in both UI and code.
- **E05-S4-T2** — Universal buy path — Route every renovation across every tier through the single `engine.buyUpgrade(id)`; no per-tier bespoke code.
- **E05-S4-T3** — Teach via first reno — Price the tier-4 curtains upgrade so it's affordable immediately, showing the `+50%` jump so the mechanic self-teaches.
- **E05-S4-T4** — Scope demonstration — Include at least one `all`-scope renovation and one tier-scoped one so players see targeted vs global effects.
- **E05-S4-T5** — Stacking clarity — Surface `L_upgrade = 1 + 0.5·n` as a friendly "+50% per renovation" so the additive-within-layer rule is intuitive.
- **E05-S4-T6** — Persist per tier — Renovations bought on tier 4 stay counted after moving to tier 5 (they do **not** reset on tier-up).
- **E05-S4-T7** — Copy — Renovation flavor in Dutch-tourist wry: "New mattress — the springs no longer greet you personally."
- **E05-S4-T8** — Beat linkage — Tie the headline to beat 7 *One Star, Big Dreams* — buying your first renovations is the narrative moment.
- **E05-S4-T9** — Balance seam — Expose `L_UPGRADE_RATE` and per-upgrade `costGrowth` so S8 can tune the layer without touching engine code.
- **E05-S4-T10** — QA the headline — Test buy → `L_upgrade` recompute → income rises; test blocked re-buy; test persistence across tier-up and save/load.

## E05-S5 — One-Star Amenities (amenity cluster: 1-star small-wins)
_As a proud one-star guest, I want a bloom of cheap room comforts, so that there's a new small win every minute plus Comfort toward the next gate._  The stage's small-wins cluster.
- **E05-S5-T1** — Define cluster — Add `star1_{minibar_water,tv_remote,extra_pillow,do_not_disturb,shampoo_sachet,window_that_opens}` to `data/amenities.js`, `tag:'hotel1'`, `costGrowth:1.5`.
- **E05-S5-T2** — Cost ramp — Stagger `costBase` (≈×2 each) so a new amenity lands every ~60–90s of active 1-star play (`AMENITY.growth ≈ 1.5`).
- **E05-S5-T3** — Comfort weights — Assign each a `comfort` value feeding `ComfortRaw`; confirm the saturating cap holds and pushes toward the beat-8 (C7) gate.
- **E05-S5-T4** — Targeted `×` — Give a small `xMult` scoped to relevant tiers, added inside `L_path`/`L_upgrade` per additive-within-layer.
- **E05-S5-T5** — Reuse buy flow — Route all items through `engine.buyAmenity(id)`; no bespoke code.
- **E05-S5-T6** — Unlock chain — Gate later items behind earlier ones + Comfort thresholds; emit `unlock`.
- **E05-S5-T7** — Flavor copy — Wry lines, e.g. "The TV gets two channels, both in a language you don't speak."
- **E05-S5-T8** — UI group — Add a "1-Star Room" buy-button section with name/cost/owned/next-Comfort delta.
- **E05-S5-T9** — Save/migration — Persist levels; migration defaults new keys to 0.
- **E05-S5-T10** — QA — Zero-cash buys, rapid buys, Comfort recompute, no free offline amenities.

## E05-S6 — Check-in, One Star (accommodation step: tier 4)
_As a tourist chasing a star, I want to check into the 1-Star Hotel, so that I finally have a room with my own key and a felt Comfort jump._  The tier-up + gate + reveal.
- **E05-S6-T1** — Tier-4 data — Finalize the 1-Star Hotel row: name, `accScore = ACC.base·ACC.growth^4`, `unlock = ACC.unlock[4]` tied to `STORY_GATES`.
- **E05-S6-T2** — Comfort gate — Set `ACC.unlock[4]` so it lands after the guesthouse amenity ramp; reveal the tier-up button when met.
- **E05-S6-T3** — Tier-up flow — Reuse `upgradeAccommodation()` to go 3→4: spend cash, push to `ownedTiers`, bump `accScore`, recompute Comfort.
- **E05-S6-T4** — `accScore` jump — Verify `ACC.growth ≈ 2.6` makes tier 4 a felt Comfort jump that itself moves toward beat-8's C7.
- **E05-S6-T5** — Beat 7 fire — Reaching tier 4 satisfies beat 7 *One Star, Big Dreams*; grant its rewards and unlock the renovations UI in full.
- **E05-S6-T6** — UI reveal — Rename the accommodation card to "1-Star Hotel" and tease the 2-Star (E06) with its Comfort gate.
- **E05-S6-T7** — Copy — Arrival blurb: "One whole star. The receptionist even smiled — at the guest behind you." Hooks toward breakfast.
- **E05-S6-T8** — Balance — Tune the tier-4 cash cost so it arrives near the beat-7 target time; verify via harness.
- **E05-S6-T9** — Save/migration — Persist tier; migrate old saves without regressing an earned tier; default upgrades `bought=false`.
- **E05-S6-T10** — QA — Can't buy tier 4 without tier 3 + Comfort gate; Comfort/`accScore` recompute; beat 7 fires exactly once.

## E05-S7 — Big Dreams, Any Build (path/branch flavor: neutral upgrades serving all)
_As any archetype, I want renovations to help my build, so that the neutral ladder never strands a playstyle before the branch split._  How the neutral epic still serves every path.
- **E05-S7-T1** — Scope diversity — Ensure tier-4 upgrades include bonuses scoped to each path's favored tiers so every branch finds value.
- **E05-S7-T2** — Traveler synergy — One renovation grants a small destination-cost discount hook (foreshadows the traveler perk), scoped via data.
- **E05-S7-T3** — Vlogger synergy — One renovation boosts social tiers (D2/D3), tagged `social`, where Clout will later matter.
- **E05-S7-T4** — Crypto synergy — One renovation adds a passive-friendly bonus (e.g. cheaper upkeep) that a Savvy build appreciates.
- **E05-S7-T5** — Connoisseur synergy — One premium renovation gives outsized Comfort per cost, rewarding the taste build's Comfort focus.
- **E05-S7-T6** — Path-point trickle — Buying renovations sprinkles path points to the player's leaning branch (reads `story.branch`).
- **E05-S7-T7** — Re-spec friendliness — Confirm nothing here locks a branch; effects are scoped bonuses, not gates.
- **E05-S7-T8** — Copy — Branch-aware one-liners on select renovations (vlogger sees "great backdrop", connoisseur sees "tasteful").
- **E05-S7-T9** — Hybrid nudge — Leave a dormant data flag so a future hybrid perk can read "owns renovations across scopes".
- **E05-S7-T10** — QA — Test each scoped bonus applies to the correct tier list and stacks additively within its layer.

## E05-S8 — Tuning the Ladder (balance & tuning)
_As the balancer, I want the upgrade and ladder constants tuned to the pacing contract, so that the 1-star stage hits its beat targets._  Set constants, run the harness, hit cadence.
- **E05-S8-T1** — Set `L_UPGRADE_RATE` — Confirm `0.5` gives a satisfying +50%/reno without trivializing; unit-test `L_upgrade` at n=0,1,5,10.
- **E05-S8-T2** — Upgrade cost slopes — Tune each renovation's `costGrowth` so the tier-4 set clears over the 1-star stage, not instantly.
- **E05-S8-T3** — `ACC.unlock[]` fit — Set `ACC.unlock[3..5]` so tier gates align with `STORY_GATES` C-values and the docs/05 beat targets.
- **E05-S8-T4** — `ACC.growth` check — Validate `ACC.growth ≈ 2.6` keeps each tier a "big felt jump" without breaking Comfort's saturating cap.
- **E05-S8-T5** — Harness run — Simulate beats 6–7; assert cumulative time lands near the ~0:40–1:00 band within ±15%.
- **E05-S8-T6** — Cadence — Verify renovations + amenities keep time-to-next-purchase in the 30–120s active band through the 1-star stage.
- **E05-S8-T7** — Interaction audit — Check `L_upgrade·L_dest·L_comfort` don't compound into an early runaway; nudge the single largest-miss lever.
- **E05-S8-T8** — Comfort-to-gate — Confirm the 1-star amenity + `accScore` Comfort reaches C7 (beat 8) around the E06 handoff time.
- **E05-S8-T9** — Golden file — Commit the beat-6/7 timing and the `L_upgrade` curve as a golden snapshot.
- **E05-S8-T10** — Debug tools — Add debug grants for tier jump and free renovations to speed QA of E06+.

## E05-S9 — Guest Records (save/migration/offline)
_As a returning guest, I want my tier and renovations preserved and correctly earning while away, so that the ladder survives every session._  Persist new state, migrate old saves, offline correctness.
- **E05-S9-T1** — Persist upgrades — Serialize `state.accommodation.upgrades`, `tier`, and `ownedTiers`; confirm JSON round-trip.
- **E05-S9-T2** — Bump version + migration — Increment `state.version`; add a `MIGRATIONS` entry defaulting upgrades `bought=false` while preserving earned tier.
- **E05-S9-T3** — Fixture test — Load an E04-version save; assert the ladder loads with tier intact, no upgrades bought, no crash.
- **E05-S9-T4** — Offline `accScore` — Ensure the current tier's `accScore` (and thus Comfort → `L_comfort`) applies during offline macro-steps.
- **E05-S9-T5** — No free tier-ups offline — Guarantee offline never auto-buys tiers or upgrades; only income accrues.
- **E05-S9-T6** — Comfort continuity — Confirm Comfort recomputes correctly on load from saved tier + amenities (not stored stale).
- **E05-S9-T7** — Away summary — Include "you're still in the 1-Star Hotel" context and income earned in the away modal.
- **E05-S9-T8** — Export/import — Verify export includes accommodation upgrades and re-imports cleanly with guards.
- **E05-S9-T9** — Backup rotation — Ensure a pre-migration backup is captured so a bad ladder migration is recoverable.
- **E05-S9-T10** — Downgrade safety — If a future save has an unknown tier, clamp to the max defined tier rather than crashing.

## E05-S10 — Polish the Lobby (QA/polish/juice)
_As a QA-minded guest, I want the ladder hardened and satisfying, so that it's correct at the edges and feels rewarding to climb._  Tests, edge cases, formatting, feedback.
- **E05-S10-T1** — Unit: `upgradeMult` — Test `1 + 0.5·n` across n and scopes; assert additive-within-layer.
- **E05-S10-T2** — Unit: gate logic — Test tier-up blocked below `ACC.unlock[t]` and allowed at/above; check boundary values.
- **E05-S10-T3** — Edge: exact cash — Buy tier/upgrade at exact cost and cost−1; assert accept/reject and no negative cash.
- **E05-S10-T4** — Edge: rapid tier-up — Prevent a double tier-up in one tick; assert a single advance and one `story:beat`.
- **E05-S10-T5** — Formatting — `accScore`, costs, and `×` via `util.format`; no raw floats in the UI.
- **E05-S10-T6** — Juice — Tier-up gets a "check-in bell" and a star-count bump animation (reduced-motion/mute safe).
- **E05-S10-T7** — Accessibility — Ladder/upgrade buttons semantic and keyboard-focusable, with aria labels for gates and `×` values.
- **E05-S10-T8** — Regression: stack order — Assert `M_k` order includes `L_upgrade` in the documented position.
- **E05-S10-T9** — Story integrity — Beats 6–7 fire from pure progression even if the player never opens the panel.
- **E05-S10-T10** — Cleanup — Remove logs, guard debug grants, confirm the expanded `accommodation.js` introduces no dependency cycle.

## Definition of Done (epic)
- [ ] `data/accommodation.js` defines the full ladder (tiers 0..21+) with `accScore`, `unlock`, and per-tier `upgrades`, validated.
- [ ] `L_upgrade = 1 + 0.5·n` implemented via `engine.buyUpgrade`, folded into `M_k` in the documented order; renovations persist across tier-up.
- [ ] `engine.upgradeAccommodation` gated on `Comfort ≥ ACC.unlock[t]` (tied to `STORY_GATES`); 1-Star Hotel (tier 4) reachable.
- [ ] Beats 6–7 (*One Star, Big Dreams*) fire from progression; renovations UI revealed at beat 7.
- [ ] One-star amenity cluster live; neutral upgrades carry scoped bonuses serving all four paths.
- [ ] `L_UPGRADE_RATE`, upgrade `costGrowth`, `ACC.unlock[3..5]` tuned; harness hits beat-6/7 within ±15%; golden file committed.
- [ ] New state persisted, old saves migrated (upgrades default false, tier preserved), offline correct with no free tier-ups.
- [ ] Unit/edge/regression tests pass; formatting via `util.format`; UI accessible and juice reduced-motion-safe.
