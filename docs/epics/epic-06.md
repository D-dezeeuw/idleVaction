# E06 — Continental Comforts
> Act I · Tier 5 (2-Star Hotel) · Breakfast/room amenity bloom + Comfort global multiplier online (`L_comfort`) · Beat 8 (*Continental Breakfast*) · Neutral (pool teased)

**Epic goal:** Bring the **Comfort global multiplier** online — `L_comfort = 1 + COMFORT.mult·log10(1 + Comfort/COMFORT.C0)` — so accumulated Comfort finally multiplies income game-wide, and bloom the amenities with a **continental-breakfast cluster** while checking into the 2-Star Hotel (tier 5).
**Player-visible outcome:** A live "Comfort ×" readout that boosts all income, a generous breakfast/room amenity bloom, the 2-Star Hotel, and a teaser that the next place has a **pool**.
**Systems touched:** `math.js` (`comfortMult`/`L_comfort`), `engine.js` (fold `L_comfort` globally, recompute chain), `config.js` (`COMFORT.mult`, `COMFORT.C0`, `COMFORT.cap`), `data/amenities.js` (breakfast + room cluster), `data/accommodation.js` (tier-5 row), `data/story.js` (beat 8 + pool tease), `state.js`, `ui.js`.
**Math/balance notes:** `L_comfort = 1 + COMFORT.mult·log10(1 + Comfort/COMFORT.C0)`, scope `all`, multiplied across layers. `Comfort = COMFORT.cap · ComfortRaw/(ComfortRaw + COMFORT.cap)` (saturating), so amenities always help but never trivially max. Tune `COMFORT.mult` and `COMFORT.C0` so Comfort contributes ~1.5–3× by mid-Act-I. Beat 8 gates on `Comfort ≥ C7` (`STORY_GATES`).

## E06-S1 — The Breakfast Menu (data model: breakfast cluster + comfort constants)
_As a guest who paid for "continental," I want every roll and jam defined as data, so that the breakfast bloom is pure content._  Declarative source for the stage's Comfort bloom.
- **E06-S1-T1** — Define breakfast amenities — Add `bfast_{stale_croissant,boiled_egg,cheese_slice,hagelslag,orange_juice,filter_coffee,waffle_iron,fresh_fruit}` to `data/amenities.js`, `tag:'breakfast'`, `costGrowth:1.5`.
- **E06-S1-T2** — Room-comfort amenities — Add `room2_{blackout_curtain,real_towel,hot_shower,duvet,minifridge}` (the 2-star room bloom) alongside breakfast.
- **E06-S1-T3** — Comfort weights — Give each item a `comfort` value (breakfast generous) so `ComfortRaw` climbs toward the C7 gate for beat 8.
- **E06-S1-T4** — `COMFORT` config block — Ensure `config.js` exposes `COMFORT.mult`, `COMFORT.C0`, `COMFORT.cap` as the sole knobs for the global multiplier.
- **E06-S1-T5** — Targeted `×` tags — Give a few items a small `xMult` scoped to relevant tiers, marked with `scope` per math §3.
- **E06-S1-T6** — Extend state — Confirm breakfast/room keys land in `state.amenities` as `{level}`; no new sub-tree needed.
- **E06-S1-T7** — Story entry — Add beat-8 *Continental Breakfast* skeleton (gate `Comfort ≥ C7`) with a pool-teaser `unlocks` hook.
- **E06-S1-T8** — Tier-5 stub — Ensure `data/accommodation.js` tier-5 (2-Star) row exists with `accScore` and `unlock` (detailed in S6).
- **E06-S1-T9** — Cross-ref the pool — Add a dormant `poolTeased` flag in data referencing E07 so the tease is data-driven.
- **E06-S1-T10** — Validate — Dev assertion that breakfast/room items have `comfort ≥ 0`, `costGrowth` set, and unique ids.

## E06-S2 — Comfort Pays Off (core logic/engine: `L_comfort` online)
_As the engine, I want Comfort to multiply all income, so that the meter finally has teeth._  The formula that turns the Comfort spine into money.
- **E06-S2-T1** — Implement `comfortMult` — In `math.js`: `comfortMult(comfort) = 1 + COMFORT.mult·log10(1 + comfort/COMFORT.C0)`; a pure function.
- **E06-S2-T2** — Global fold — Multiply `L_comfort` into every tier's `M_k` (scope `all`) in the documented stack position after `L_skill`.
- **E06-S2-T3** — Recompute chain — On any amenity/tier change, recompute `ComfortRaw → saturating Comfort → L_comfort → income` in one ordered pass.
- **E06-S2-T4** — Cap interaction — Confirm the saturating `Comfort = cap·raw/(raw+cap)` feeds `log10` so `L_comfort` grows but never explodes.
- **E06-S2-T5** — Breakfast buy flow — Route all breakfast/room items through `engine.buyAmenity(id)` with Comfort recompute on each.
- **E06-S2-T6** — First-time online event — Emit a one-shot `unlock` ("Comfort now multiplies income") when `L_comfort` first exceeds 1 meaningfully.
- **E06-S2-T7** — Idle correctness — Ensure `L_comfort` applies inside `engine.tick` so offline macro-steps benefit identically.
- **E06-S2-T8** — No double-count — Verify Comfort isn't also added elsewhere (only via `L_comfort`) to keep the additive/multiplicative layering clean.
- **E06-S2-T9** — Beat-8 check — After Comfort crosses C7 (`STORY_GATES`), fire beat 8; grant its rewards and the pool tease.
- **E06-S2-T10** — Purity/determinism — Keep `comfortMult` pure over state so the harness and offline reproduce exactly.

## E06-S3 — The Comfort Dial (UI/buttons: `×` readout + breakfast buttons)
_As a player, I want to see my Comfort turn into a global multiplier, so that buying comfort feels strategically valuable, not just cosmetic._  Exposes the new multiplier as a readable dial.
- **E06-S3-T1** — Comfort `×` header — A prominent readout showing current Comfort and the live "×N.NN income" from `L_comfort`.
- **E06-S3-T2** — Next-delta preview — On each amenity button, show "+Comfort → new `×` preview" so players see the global payoff, not just the local one.
- **E06-S3-T3** — Breakfast section — A "Continental Breakfast" buy-button group: name, cost, owned level, next-Comfort delta; disabled when unaffordable.
- **E06-S3-T4** — Room section — A "2-Star Room" group beside breakfast for the room-bloom items.
- **E06-S3-T5** — Saturating-bar viz — A Comfort bar that visibly approaches its cap (asymptote), teaching the saturating model at a glance.
- **E06-S3-T6** — Online reveal — When `L_comfort` comes online, show a highlighted banner ("Your comfort now pays") via the `unlock` event.
- **E06-S3-T7** — Ticker feedback — Buys flash the Comfort `+` and the resulting global `×` bump to the `aria-live` ticker.
- **E06-S3-T8** — Pool teaser card — A locked "Pool?" card hinting at E07, revealed by beat 8's tease flag.
- **E06-S3-T9** — Flavor tooltips — Data-driven wry tooltips, e.g. "Hagelslag: chocolate sprinkles, a Dutch human right."
- **E06-S3-T10** — Section wiring — Subscribe to `purchase`/`unlock`/`story:beat`; re-render only the comfort/breakfast panels.

## E06-S4 — When Comfort Starts Paying (headline new thing: the global multiplier online)
_As a weary traveler, I want my accumulated comfort to boost everything, so that being comfortable is finally strategically valuable._  The epic's signature system: `L_comfort`.
- **E06-S4-T1** — Signature moment — Make `L_comfort` coming online the epic's headline, with a clear before/after in income when it activates.
- **E06-S4-T2** — Legible formula — Surface `1 + COMFORT.mult·log10(1+Comfort/C0)` as a friendly explanation in the UI/help.
- **E06-S4-T3** — Global-scope proof — Demonstrate that every tier's income rises together when Comfort rises (not just one tier).
- **E06-S4-T4** — Teach diminishing returns — Show via the `log10` curve that early Comfort helps a lot and later Comfort helps less, matching the saturating design.
- **E06-S4-T5** — Tie to breakfast — Make the breakfast bloom the vehicle: buying breakfast visibly pushes Comfort → pushes the global `×`.
- **E06-S4-T6** — Beat-8 narrative — Wire the headline to beat 8 *Continental Breakfast* as the story moment comfort "clicks" into money.
- **E06-S4-T7** — Copy — Beat-8 text: the free breakfast is stale but abundant; being comfy suddenly makes money; ends teasing a pool. ≤90 words, wry.
- **E06-S4-T8** — Balance seam — Keep `COMFORT.mult` and `COMFORT.C0` the only levers so S8 tunes strength without engine edits.
- **E06-S4-T9** — Cross-epic setup — Confirm `L_comfort` scales gracefully so E07's pool amenities plug into the same multiplier.
- **E06-S4-T10** — QA the headline — Test income multiplies globally as Comfort rises; test the online event fires once and persists.

## E06-S5 — All-You-Can-Eat (amenity cluster: the breakfast bloom)
_As a guest rationing the buffet into lunch, I want a big cheap bloom of breakfast items, so that there's a new small win constantly plus steady Comfort._  The stage's headline small-wins cluster.
- **E06-S5-T1** — Bloom size — Ensure the breakfast + room cluster is large and cheap enough to deliver "new thing every ~45–90s" through the 2-star stage.
- **E06-S5-T2** — Cost ramp — Stagger `costBase` with `AMENITY.growth ≈ 1.5` so items unlock steadily rather than all at once.
- **E06-S5-T3** — Comfort push — Confirm cumulative breakfast Comfort reliably lifts Comfort to the C7 gate for beat 8.
- **E06-S5-T4** — Targeted `×` — Give small `xMult`s scoped appropriately, additive within their layer.
- **E06-S5-T5** — Reuse buy flow — All items via `engine.buyAmenity(id)`; no bespoke code.
- **E06-S5-T6** — Unlock chain — Gate fancier breakfast (waffle iron, fresh fruit) behind the basics + Comfort thresholds; emit `unlock`.
- **E06-S5-T7** — Flavor copy — Wry lines, e.g. "Filter coffee: technically hot, technically coffee."
- **E06-S5-T8** — UI polish — Group breakfast vs room and show next-Comfort delta and owned level per item.
- **E06-S5-T9** — Save/migration — Persist levels; default new keys to 0 for old saves.
- **E06-S5-T10** — QA — Zero-cash buys, rapid buys, Comfort recompute, no free offline breakfast.

## E06-S6 — Two Whole Stars (accommodation step: tier 5)
_As a tourist on the up, I want to check into the 2-Star Hotel, so that I get a real breakfast buffet and one step closer to a pool._  The tier-up + gate + reveal.
- **E06-S6-T1** — Tier-5 data — Finalize the 2-Star Hotel row: name, `accScore = ACC.base·ACC.growth^5`, `unlock = ACC.unlock[5]` tied to `STORY_GATES`.
- **E06-S6-T2** — Comfort gate — Set `ACC.unlock[5]` so it lands after the breakfast bloom + `L_comfort` onboarding; reveal the tier-up when met.
- **E06-S6-T3** — Tier-up flow — Reuse `engine.upgradeAccommodation()` for 4→5: spend cash, push to `ownedTiers`, bump `accScore`, recompute Comfort/`L_comfort`.
- **E06-S6-T4** — `accScore` jump — Verify `ACC.growth ≈ 2.6` makes tier 5 a felt jump that itself boosts `L_comfort`.
- **E06-S6-T5** — Pool foreshadow — On reaching tier 5, strengthen the pool tease (E07/beat 9) in both narrative and UI.
- **E06-S6-T6** — UI reveal — Rename the card to "2-Star Hotel"; tease the 3-Star (pool!) with its Comfort gate.
- **E06-S6-T7** — Copy — Arrival blurb: "Two stars, and a breakfast buffet you'll ration into lunch." Hooks toward the pool.
- **E06-S6-T8** — Balance — Tune the tier-5 cash cost to land near beat-8's target; verify via harness.
- **E06-S6-T9** — Save/migration — Persist tier; migrate old saves without regressing an earned tier.
- **E06-S6-T10** — QA — Can't buy tier 5 without tier 4 + Comfort gate; Comfort/`L_comfort` recompute post-upgrade.

## E06-S7 — Comfort for Everyone (path/branch flavor: neutral `×` serving all; pool tease)
_As any build, I want the Comfort `×` to help me, so that the neutral spine keeps all four paths on track before the branch split._  How this neutral epic serves every archetype.
- **E06-S7-T1** — Universal benefit — Confirm `L_comfort` is scope `all` so every path's income gains equally from Comfort.
- **E06-S7-T2** — Traveler note — Show how the Comfort `×` stacks multiplicatively with `L_dest` for a traveler build (breadth × comfort).
- **E06-S7-T3** — Vlogger note — Note the Comfort `×` compounds with future Clout-boosted social tiers; keep breakfast items with a `social` backdrop tag.
- **E06-S7-T4** — Crypto note — Ensure `L_comfort` lifts the passive cash base a Savvy build will scale, and that it applies to cash income offline too.
- **E06-S7-T5** — Connoisseur seed — Add one premium breakfast item (e.g. real espresso) with outsized Comfort per cost, previewing the taste build's Comfort focus.
- **E06-S7-T6** — Path-point trickle — Buying comfort amenities sprinkles path points to the leaning branch (reads `story.branch`), keeping momentum pre-split.
- **E06-S7-T7** — Pool tease per path — Adapt the pool-teaser copy slightly by branch flag (vlogger: "content goldmine"; connoisseur: "a tasteful lap pool").
- **E06-S7-T8** — No lock-in — Confirm nothing here gates a branch; all effects are scoped bonuses.
- **E06-S7-T9** — Hybrid hook — Add a dormant flag rewarding players who bloom Comfort across categories (future hybrid perk).
- **E06-S7-T10** — QA — Verify `L_comfort` applies identically across traveler/vlogger/crypto/connoisseur test states.

## E06-S8 — Calibrating Comfort (balance & tuning)
_As the balancer, I want `COMFORT.mult`/`C0` tuned to the target contribution, so that Comfort adds ~1.5–3× by mid-Act-I without runaway._  Set constants, run the harness, hit cadence.
- **E06-S8-T1** — Set `COMFORT.mult` — Tune `COMFORT.mult` so `L_comfort` reaches ~1.5–3× by mid-Act-I per the epic's math note; document in `config.js`.
- **E06-S8-T2** — Set `COMFORT.C0` — Choose `C0` so the `log10` curve's sweet spot aligns with 2-star Comfort values (early gains feel strong).
- **E06-S8-T3** — Cap check — Validate `COMFORT.cap` keeps Comfort saturating below runaway while still feeding a meaningful `L_comfort`.
- **E06-S8-T4** — Unit-test the curve — Assert `comfortMult` at Comfort = 0, C0, 10·C0, 100·C0 matches the expected 1.x…3.x shape.
- **E06-S8-T5** — Harness run — Simulate beat 8; assert cumulative time near the ~1:10 (Act-I close approach) target within ±15%.
- **E06-S8-T6** — Cadence — Confirm the breakfast bloom keeps time-to-next-purchase in the 30–120s active band through 2-star.
- **E06-S8-T7** — Interaction audit — Check `L_comfort·L_upgrade·L_dest·L_path` don't compound into a runaway; nudge the single largest-miss lever per docs/05.
- **E06-S8-T8** — Gate alignment — Ensure Comfort reaches C7 for beat 8 and the tier-5 gate at the intended times.
- **E06-S8-T9** — Golden file — Commit the beat-8 timing and the `L_comfort` curve as a golden snapshot.
- **E06-S8-T10** — Debug tools — Add debug controls to set Comfort directly and preview `L_comfort` for QA of E07+.

## E06-S9 — Comfort on the Books (save/migration/offline)
_As a returning guest, I want my Comfort recomputed correctly and earning while away, so that the new multiplier survives every session._  Persist inputs, migrate, offline correctness.
- **E06-S9-T1** — Persist comfort inputs — Confirm Comfort is recomputed from saved amenities/tier/body on load (not stored stale) so `L_comfort` is always correct.
- **E06-S9-T2** — Bump version + migration — Increment `state.version`; `MIGRATIONS` defaults new breakfast/room keys to level 0.
- **E06-S9-T3** — Fixture test — Load an E05-version save; assert breakfast items absent→0, Comfort recomputes, `L_comfort` applies, no crash.
- **E06-S9-T4** — Offline `L_comfort` — Ensure `L_comfort` applies during offline macro-steps so away income reflects Comfort.
- **E06-S9-T5** — No free offline amenities — Guarantee offline accrues income (with `L_comfort`) but never auto-buys breakfast/room items.
- **E06-S9-T6** — `bestComfort` stat — Update `state.stats.bestComfort` on load/tick; ensure it persists and never decreases.
- **E06-S9-T7** — Away summary — Show "Comfort × N.NN was working while you were away" plus income earned in the modal.
- **E06-S9-T8** — Export/import — Verify export includes breakfast/room levels and re-imports cleanly with guards.
- **E06-S9-T9** — Backup rotation — Ensure a pre-migration backup is captured for recovery.
- **E06-S9-T10** — Recompute-on-load test — Assert load → Comfort/`L_comfort` match a fresh recompute (no drift).

## E06-S10 — Final Touches Before the Pool (QA/polish/juice)
_As a QA-minded guest, I want the Comfort multiplier hardened and juicy, so that it's correct at the edges and satisfying right before the pool era._  Tests, edge cases, formatting, feedback.
- **E06-S10-T1** — Unit: `comfortMult` — Test `1 + COMFORT.mult·log10(1+Comfort/C0)` at boundary Comforts; assert monotonic and no NaN at Comfort=0.
- **E06-S10-T2** — Unit: recompute order — Test amenity buy → `ComfortRaw` → saturating Comfort → `L_comfort` → income in one deterministic pass.
- **E06-S10-T3** — Edge: zero/near-zero — Comfort=0 gives `L_comfort=1` exactly; assert no divide-by-zero with `C0`.
- **E06-S10-T4** — Edge: huge Comfort — Very large Comfort keeps `L_comfort` finite and formatted (`util.format`), no overflow.
- **E06-S10-T5** — Formatting — Comfort, `×`, and costs via `util.format`; no raw floats; "×2.31"-style readouts.
- **E06-S10-T6** — Juice — Breakfast buys get a subtle "ding" and Comfort-bar fill; the online moment gets a celebratory flourish (reduced-motion/mute safe).
- **E06-S10-T7** — Accessibility — Breakfast/room buttons semantic and keyboard-focusable, with aria labels announcing Comfort and `×` deltas.
- **E06-S10-T8** — Regression: stack order — Assert `M_k` includes `L_comfort` in the documented global position.
- **E06-S10-T9** — Story integrity — Beat 8 fires purely from `Comfort ≥ C7` even if the player never opens the breakfast panel; the pool tease shows.
- **E06-S10-T10** — Cleanup — Remove logs, guard debug comfort controls, confirm no dependency cycle; ready the handoff to E07 (pool).

## Definition of Done (epic)
- [ ] `comfortMult` / `L_comfort = 1 + COMFORT.mult·log10(1+Comfort/COMFORT.C0)` implemented, pure, and folded globally into `M_k`.
- [ ] Saturating `Comfort = cap·raw/(raw+cap)` feeds `L_comfort`; the one-shot "Comfort now pays" online event fires once.
- [ ] Continental-breakfast + 2-star room amenity bloom live at the "new thing every ~45–90s" cadence.
- [ ] 2-Star Hotel (tier 5) reachable behind its `ACC.unlock[5]`/`STORY_GATES` gate; pool tease surfaced.
- [ ] Beat 8 (*Continental Breakfast*) fires from `Comfort ≥ C7`; the neutral `×` benefits all four paths equally.
- [ ] `COMFORT.mult`, `COMFORT.C0`, `COMFORT.cap` tuned to ~1.5–3× by mid-Act-I; harness hits beat-8 within ±15%; golden file committed.
- [ ] Comfort recomputed on load (never stale), old saves migrated, offline income reflects `L_comfort` with no free purchases.
- [ ] Unit/edge/regression tests pass; formatting via `util.format`; UI accessible and juice reduced-motion-safe.
