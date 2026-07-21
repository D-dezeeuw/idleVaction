# E22 — A Bungalow of One's Own
> Act III opening (The Summit) · Accommodation tier 16→17 (Private Bungalow → Overwater Villa) · New system: **owned property** (persistent Comfort + amenity host + upgrade tree) · Story beats 22–23 (*The Invitation* tail, *A Bungalow of One's Own*) · Build-path emphasis: neutral

**Epic goal:** Stop renting. Introduce the **owned-property model**: a one-time deed purchase flips a slot from rented to owned and contributes a big *persistent* Comfort source (a new `w_prop·propertyScore` term) that never gets "left behind," plus a per-property **upgrade tree** and property-hosted amenity slots.
**Player-visible outcome:** The player buys and owns a Private Bungalow, then an Overwater Villa; the deed sits on screen as a permanent Comfort floor, upgradeable room-by-room, that survives every future accommodation move.
**Systems touched:** new `js/data/property.js`; `state.property`; `engine` Comfort pipeline (`ComfortRaw`), unlock checks, purchase logic; `state.js` migration; `data/amenities.js` (property-slot tag); `data/accommodation.js` (tiers 16–17); `data/story.js` (beat 23); `config.PROPERTY`.
**Math/balance notes:** `propertyScore = PROPERTY.baseComfort[p] + Σ upgradeComfort`; upgrade cost `PROPERTY.base·PROPERTY.growth^rank` (`growth≈1.6`); folds into `ComfortRaw = w_acc·accScore + w_amen·Σamenity + w_body·bodyL + w_prop·propertyScore`, still saturated by `Comfort = cap·raw/(raw+cap)`. Persistence = the property term ignores the rented-`tier` value entirely.

## E22-S1 — Draft the owned-property data model (data model)
_As a systems dev, I want a declarative schema for owned properties, so that the engine stays generic and every property/upgrade is pure data._  Turns "owning a place" into editable data, not code.
- **E22-S1-T1** — Create `data/property.js` — Add an ES module exporting `PROPERTIES`; each entry `{id,name,tier,ownCost,baseComfort,upgrades:[],amenitySlots}`, imported by the engine like other `data/*`.
- **E22-S1-T2** — Define the bungalow entry — `{id:'bungalow', tier:16, ownCost:PROPERTY.ownCost[0], baseComfort:PROPERTY.baseComfort[0], amenitySlots:6}` as the first ownable place.
- **E22-S1-T3** — Define the overwater villa entry — `{id:'overwater_villa', tier:17, ...}` with higher `baseComfort` and more `amenitySlots`, gated behind owning the bungalow.
- **E22-S1-T4** — Model the upgrade-tree node shape — Each upgrade `{id,name,parent,costBase,costGrowth:1.6,comfort,xMult?,tag}`; `parent` makes it a real tree, not a flat list.
- **E22-S1-T5** — Author bungalow upgrade nodes — Add ~8 nodes (deck, plunge pool, glass floor, sun-shade, outdoor kitchen) with ramped `comfort` per node.
- **E22-S1-T6** — Author overwater-villa upgrade nodes — Add ~8 nodes (hammock net over water, glass-bottom lounge, private jetty, sea-star deck lights) with higher `comfort`.
- **E22-S1-T7** — Tag property-hosted amenities — Add a `slot:'property'` capability so amenities can attach to a property's `amenitySlots`.
- **E22-S1-T8** — Reference config, not literals — Every numeric field reads from `config.PROPERTY` (base/growth/baseComfort/ownCost arrays) so balancing is a config edit.
- **E22-S1-T9** — Write flavor copy — One-line wry Dutch descriptions per property/upgrade ("A deck. Yours. The seagulls are trespassers now.").
- **E22-S1-T10** — Add a data validation test — Unit test asserts unique ids, valid `parent` refs, monotone `baseComfort`, and that every upgrade's `costGrowth` equals `PROPERTY.growth`.

## E22-S2 — Wire owned property into the Comfort engine (core logic)
_As the engine, I want a persistent property Comfort term, so that owning a place raises Comfort forever regardless of which room tier is currently rented._  Owning becomes a permanent Comfort floor.
- **E22-S2-T1** — Add `propertyScore(state)` — Pure function in `math.js` summing owned `baseComfort` + bought upgrade `comfort`.
- **E22-S2-T2** — Extend `ComfortRaw` — Add the `w_prop·propertyScore` term alongside acc/amen/body, keeping the saturating cap `Comfort = cap·raw/(raw+cap)`.
- **E22-S2-T3** — Decouple from rented tier — Ensure `propertyScore` reads `state.property`, never `accommodation.tier`, so climbing the rented ladder never zeroes it (the persistence guarantee).
- **E22-S2-T4** — Implement `engine.buyProperty(id)` — Deduct `ownCost` from cash, set `state.property[id].owned=true`, emit `purchase` + `unlock`; idempotent (a second buy is a no-op).
- **E22-S2-T5** — Implement `engine.buyPropertyUpgrade(id)` — Generic upgrade purchase: verify parent, charge `costBase·1.6^rank`, increment rank, recompute Comfort.
- **E22-S2-T6** — Gate upgrades on ownership + parent — An upgrade is buyable only if its property is owned and its `parent` rank ≥ 1; enforced inside `affordablePurchases`.
- **E22-S2-T7** — Feed property `xMult` into the stack — Upgrades carrying `xMult` register as `L_upgrade`-scope bonuses (targeted or `all`) in `M_k` per the additive-within/multiplicative-across master rule.
- **E22-S2-T8** — Recompute on change only — Cache `propertyScore`; recompute on property/upgrade purchase, not every tick, to keep `engine.tick` cheap.
- **E22-S2-T9** — Emit Comfort-delta events — On each property purchase, emit pre/post Comfort so the UI can show a "+X Comfort" flourish.
- **E22-S2-T10** — Unit-test the persistence invariant — Own the bungalow, raise `accommodation.tier`, assert `propertyScore` unchanged and Comfort ≥ pre-move.

## E22-S3 — Build the property panel and buttons (UI)
_As a player, I want simple buttons to buy and improve my place, so that owning property is as legible as buying an amenity._  Deed + upgrade tree as plain Spectre buttons.
- **E22-S3-T1** — Add a "Property" card — New Spectre card section in `ui.js` listing owned/available properties with name, Comfort contribution, and a buy button.
- **E22-S3-T2** — Render the deed CTA — A prominent "Buy the Bungalow — ƒ<cost>" button, greyed with a reason string when unaffordable or gated.
- **E22-S3-T3** — Render the upgrade tree — Show upgrade nodes indented by `parent`; each a button with name/cost/rank and a next-Comfort delta.
- **E22-S3-T4** — Show next-Comfort delta — Each buyable previews "+X Comfort" computed from `math.propertyScore` before/after the purchase.
- **E22-S3-T5** — Unlock reveal — On the property `unlock` event, slide the card in with an `aria-live` "New: you can own a place" announcement.
- **E22-S3-T6** — Ownership badge — Once owned, replace the buy button with an "Owned ✓ deed" badge and reveal that property's upgrade subtree.
- **E22-S3-T7** — Wire buttons to intents — Buttons call `engine.buyProperty` / `engine.buyPropertyUpgrade`; the UI never mutates state directly (architecture rule).
- **E22-S3-T8** — Affordability styling — Colour costs red/green vs current cash, reusing the shared amenity-button affordability helper.
- **E22-S3-T9** — Format big numbers — Route `ownCost` through `util.format` so a ƒ12.4B deed reads cleanly in scientific/suffix notation.
- **E22-S3-T10** — Keyboard + reduced-motion — Nodes are focusable `<button>`s; the reveal respects `prefers-reduced-motion` (architecture §8).

## E22-S4 — The Deed: renting becomes owning (headline new thing)
_As a climbing tourist, I want to finally own the roof over my head, so that the game's biggest emotional beat — no more handing keys back — pays off mechanically._  The signature rent→own flip.
- **E22-S4-T1** — Model the ownership flip — Record owned places in `state.property.owned[]`; the first purchase transitions the player from implicit renting to owning.
- **E22-S4-T2** — Persistent Comfort floor — Make owned-property Comfort a floor that never decays or resets between tier moves — the headline mechanic vs rented `accScore`.
- **E22-S4-T3** — Deed purchase ceremony — On `buyProperty`, fire a one-time story-flavored modal ("The keys are yours. Kevin from the front desk weeps.") tied to beat 23.
- **E22-S4-T4** — Beat 23 hook — Wire beat 23 *A Bungalow of One's Own* to trigger on the first `buyProperty`; set `story.flags.owner=true`.
- **E22-S4-T5** — "Owner" income nudge — Owning any property grants a small permanent global `×` (owner-pride), registered as a global-scope bonus so ownership feels materially better than renting.
- **E22-S4-T6** — Rent-vs-own comparison — Add an inline note contrasting current rented-tier Comfort with owned-property Comfort so the persistence advantage is visible.
- **E22-S4-T7** — Prevent reversion — Once owned, rented-room upgrades still work but the property term dominates; assert no code path removes ownership except a hard reset.
- **E22-S4-T8** — Offline ownership — Credit owned-property Comfort in the closed-form offline fast-path (it is static, so no macro-stepping needed).
- **E22-S4-T9** — Flavor: the poncho hook — Unlock a permanent descriptor on ownership ("your poncho now hangs on a hook that is legally yours").
- **E22-S4-T10** — QA the flip — Test buying the deed at exactly `cash==ownCost`, at `cash<ownCost` (blocked), and that a second purchase is a no-op.

## E22-S5 — The private-deck amenity cluster (amenity / small-wins)
_As an idler, I want a stream of silly bungalow upgrades, so that owning a place still delivers a new little thing every minute._  Property-hosted micro-luxuries.
- **E22-S5-T1** — Define deck amenities — Add ~10 `AMENITY` entries tagged `slot:'property'` (hammock, mosquito candle, outdoor shower, sundowner cart) with `costGrowth:1.5`.
- **E22-S5-T2** — Ramp the cluster — Costs ramp ≈2× per step; each gives `comfort` + a tiny `xMult` per `docs/01 §6.1`.
- **E22-S5-T3** — Gate behind ownership — Deck amenities appear only once the bungalow is owned, reusing generic unlock gating.
- **E22-S5-T4** — Overwater sub-cluster — Add ~10 more amenities gated on the overwater villa (glass-floor rug, tide clock, kayak rack).
- **E22-S5-T5** — Slot-capacity rule — Amenities consume the property's `amenitySlots`; buying past capacity requires a slot-adding upgrade, creating a mini goal loop.
- **E22-S5-T6** — Reuse the generic buy flow — Use `engine.buyAmenity(id)`; no bespoke code, just data + tag.
- **E22-S5-T7** — Feed `amenityScore` — Confirm these flow into `ComfortRaw`'s `w_amen·ΣamenityScore` and respect the saturating cap.
- **E22-S5-T8** — Flavor copy — Wry Dutch one-liners ("A hammock. For when the sun, improbably, appears.").
- **E22-S5-T9** — Cadence check — Tune so a new deck item is affordable every ~60–90s of active play at this stage; verify via the harness purchase log.
- **E22-S5-T10** — QA — Zero-cash spam-buy, slot-cap enforcement, Comfort recompute correctness, no free offline items.

## E22-S6 — Tier 16→17: Bungalow to Overwater Villa (accommodation step)
_As a climber, I want the ladder to continue into owned places, so that progression flows from renting into owning without a seam._  Two new rungs, gated and revealed.
- **E22-S6-T1** — Register tiers 16–17 — Add Private Bungalow (16) and Overwater Villa (17) to `data/accommodation.js` with `accScore = ACC_BASE·2.6^t`.
- **E22-S6-T2** — Set unlock gates — Populate `ACC.unlock[16]` and `ACC.unlock[17]` Comfort thresholds tied to `STORY_GATES` (beats 22–23).
- **E22-S6-T3** — Ownership precondition — Reaching tier 17 requires owning tier 16's property first, so owning gates the next ownable step.
- **E22-S6-T4** — Reveal on gate — Emit `unlock` when Comfort crosses `ACC.unlock[16]`; the UI reveals the deed CTA.
- **E22-S6-T5** — Beat wiring — Tier 17's reveal advances the *Overwater Villa* narrative line, hooked to the beat-23 continuation.
- **E22-S6-T6** — Big-step Comfort jump — Validate the `2.6^t` step from 15→16→17 remains a felt jump against the saturating cap.
- **E22-S6-T7** — Story copy — Beat text for stepping onto stilts over turquoise water ("The water is warmer than any shower back home. Suspicious, even.").
- **E22-S6-T8** — Cross-check the canonical ladder — Verify tier indices match `docs/03` (16 Bungalow, 17 Overwater Villa).
- **E22-S6-T9** — Migration default — Old saves stay at their existing tier; tiers 16–17 stay locked until gates are met.
- **E22-S6-T10** — QA gate ordering — Test that 17 is unreachable without owning 16, and that Comfort exactly at threshold unlocks.

## E22-S7 — Path flavor: decorate the bungalow your way (path / branch flavor)
_As a player with a chosen emphasis, I want my branch to color my property, so that a connoisseur's bungalow feels different from a vlogger's._  Same deed, four vibes.
- **E22-S7-T1** — Connoisseur trim — Connoisseur unlocks an "understated teak" upgrade variant that grants extra Comfort via the branch's `+25%` luxury-Comfort perk.
- **E22-S7-T2** — Vlogger content-deck — Vlogger unlocks a "ring-light sunset deck" upgrade that also trickles `Clout` while owned.
- **E22-S7-T3** — Traveler's map-room — Traveler unlocks a study wall of pins granting a small destinations `−cost` synergy (bridges to E24).
- **E22-S7-T4** — Crypto solar-rig — Crypto unlocks an off-grid "solar rig" cosmetic giving a tiny Savvy passive nudge while on the property.
- **E22-S7-T5** — Branch-gated flavor text — Each branch shows a distinct deed-ceremony line keyed off `story.branch`.
- **E22-S7-T6** — Reuse `L_path` — Branch property bonuses register through `L_path` (global or targeted); no new multiplier layer is introduced.
- **E22-S7-T7** — Softcap respect — Apply `PATH.softcapExp=0.85` so branch property bonuses never runaway.
- **E22-S7-T8** — Hybrid reward — If two paths are ≥ P1, unlock a fusion upgrade (e.g. a crypto-funded vlog studio), rewarding mixed builds.
- **E22-S7-T9** — Copy pass — Write four branch-flavored upgrade descriptions in the wry Dutch tone.
- **E22-S7-T10** — QA branch switching — Re-spec paths and assert property bonuses recompute with no branch bonus double-counted.

## E22-S8 — Balance the property sink and Comfort curve (balance & tuning)
_As a balancer, I want owning a place to be a meaningful sink and a real Comfort jump, so that pacing at beats 22–23 hits the ~8:30 target._  Property earns its place on the curve.
- **E22-S8-T1** — Set `PROPERTY.baseComfort` — Choose baseComfort per property so owned Comfort ≈ one rented tier's worth at unlock, then grows.
- **E22-S8-T2** — Set `PROPERTY.base`/`growth` — Tune upgrade `base` and `growth=1.6` so a new upgrade is affordable roughly every 2–3 min at this stage.
- **E22-S8-T3** — Set `w_prop` — Pick the property Comfort weight so it contributes without trivially saturating the cap.
- **E22-S8-T4** — Price the deeds — Set each `ownCost` to ~a few minutes of current income — a felt but non-punishing sink.
- **E22-S8-T5** — Run the harness — Simulate to beat 23 and confirm cumulative time is within ±15% of `docs/05 §1`.
- **E22-S8-T6** — Time-to-next band — Verify the property era keeps time-to-next-meaningful-buy in the 30–120s active band.
- **E22-S8-T7** — Cross-layer sanity — Check property Comfort's `L_comfort` contribution against the multiplier stack so it doesn't dominate other layers.
- **E22-S8-T8** — Owner-pride `×` sizing — Tune the ownership global `×` (S4-T5) small enough to be a nudge, not a spike.
- **E22-S8-T9** — Golden-file update — Commit the new milestone-curve segment as a golden file so regressions are caught.
- **E22-S8-T10** — Document the constants — Add `PROPERTY.*` to the config comments and note the tuning rationale in the `docs/05` lever list.

## E22-S9 — Persist ownership, migrate, offline-correct (save / migration / offline)
_As a returning player, I want my owned place remembered exactly, so that owning survives reloads, old saves, and being away._  Deeds are permanent, including on disk.
- **E22-S9-T1** — Extend the state schema — Add `state.property = { <id>: { owned, upgrades:{ <id>:rank } } }` and bump `state.version`.
- **E22-S9-T2** — Write the migration — Add `MIGRATIONS[N]` initializing `state.property = {}` for pre-ownership saves; never break old saves.
- **E22-S9-T3** — Default for old saves — Players loading an old save see property locked until they re-reach the Comfort gate (no phantom ownership).
- **E22-S9-T4** — Serialize compactly — Store only bought upgrade ranks (omit rank-0) to keep the save string small.
- **E22-S9-T5** — Offline Comfort credit — Credit static property Comfort via the closed-form offline fast-path (no macro-stepping needed).
- **E22-S9-T6** — Offline income with owner `×` — Ensure the ownership global `×` applies during offline macro-steps identically to online.
- **E22-S9-T7** — Export/import round-trip — Confirm base64 export/import preserves `state.property` exactly, with try/catch on malformed input.
- **E22-S9-T8** — Backup rotation — Verify the rotating `...backup` key captures property state before an overwrite.
- **E22-S9-T9** — Migration unit test — Load a fixture v(N-1) save and assert it migrates to owned-capable v(N) with property empty.
- **E22-S9-T10** — Offline summary line — Add "While you were away… your bungalow stayed exactly where you left it (+X Comfort held)" to the away modal.

## E22-S10 — QA, edge cases, and juice (QA / polish)
_As QA, I want the owned-property system watertight and satisfying, so that the headline beat lands bug-free._  Own it, break it, polish it.
- **E22-S10-T1** — Zero-cash edge — Attempt deed and upgrade purchases at ƒ0; assert they are blocked with a clear reason and no negative cash.
- **E22-S10-T2** — Rapid-buy stress — Spam upgrade buys and assert costs follow `1.6^rank` exactly with no rank skips.
- **E22-S10-T3** — Comfort recompute audit — After arbitrary buy sequences, assert `Comfort` equals a from-scratch recompute (no drift).
- **E22-S10-T4** — Persistence regression test — Automated test: own → climb rented tiers → assert property intact until a hard reset.
- **E22-S10-T5** — Slot-cap edge — Fill all `amenitySlots`, then assert further buys are blocked until a slot-adding upgrade.
- **E22-S10-T6** — Number formatting — Verify `ownCost` and Comfort deltas format correctly across scientific/engineering/suffix notations.
- **E22-S10-T7** — Deed jingle juice — Add a subtle key-jingle + confetti flourish on ownership, respecting reduced-motion and the mute setting.
- **E22-S10-T8** — Event correctness — Assert `purchase`/`unlock`/`story:beat` events fire exactly once per relevant action.
- **E22-S10-T9** — Save-compat test — Run the save-compat fixture suite including the new version and assert clean migration.
- **E22-S10-T10** — Accessibility pass — Screen-reader labels for deed/upgrade buttons; `aria-live` announces "+X Comfort"; the tree is keyboard-navigable.

## Definition of Done (epic)
- [ ] `data/property.js` exists with the bungalow + overwater villa, each with a validated upgrade tree, and imports cleanly with no cycles.
- [ ] The owned-property model contributes persistent `w_prop·propertyScore` Comfort that survives all rented-tier moves (persistence invariant test green).
- [ ] `engine.buyProperty` / `engine.buyPropertyUpgrade` work through generic purchase logic, gate on ownership + parent, and emit `purchase`/`unlock`.
- [ ] The deed flip triggers beat 23, sets `story.flags.owner`, and grants the owner-pride global `×`.
- [ ] Property-slot amenity clusters (deck + overwater) drip at the target ~60–90s cadence and respect slot capacity.
- [ ] Tiers 16–17 are registered with `ACC.unlock` gates and a correct ownership precondition for tier 17.
- [ ] All four branches decorate the property via `L_path` (softcapped), with hybrid reward for mixed builds.
- [ ] `PROPERTY.*` constants tuned; harness puts beat 23 within ±15% of target; golden file committed.
- [ ] `state.property` persists, migrates from old saves, round-trips through export/import, and is offline-correct.
- [ ] QA green: zero-cash, rapid-buy, slot-cap, recompute audit, event counts, formatting, and accessibility.
