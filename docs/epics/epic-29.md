# E29 — Empire of Leisure
> Journey stage: Act III endgame · Accommodation tier 21+ · New systems: Legend prestige layer 2 (resets Legacy + skill tree), meta-meta shop, New Game+ (raise all gates, reshuffle destinations), BigNumber `{m,e}` swap if needed · Story beat 30 (*Empire of Leisure*) · Build-path emphasis: all four (lane-loyal legend perks)

**Epic goal:** Ship the second prestige layer — **Legend** — and **New Game+** for the players who want 200 hours. A Legend reset wipes Legacy and the permanent tree for Legend points, spent in a meta-meta shop; NG+ raises every story gate and reshuffles destinations for a genuinely fresh replay.
**Player-visible outcome:** A "Legend" screen with a live "reset now → +N Legend" readout, a meta-meta shop of permanent global `×` / cheaper-tree / lore unlocks, an NG+ toggle that hardens the whole world, and — if the endgame math demands it — an invisible swap to in-repo BigNumber so giant numbers stay correct and legible.
**Systems touched:** `prestige.js` (Legend reset, `L_legend`, NG+ apply), `data/legend.js`/`data/skilltree.js` (meta-meta shop), `config.js` (`LEGEND_K`, `LEGEND_SCALE`, `LEGEND_EXP`, `NGPLUS.*`), `math.js` + `util.format` (BigNumber `{m,e}` swap), `state.js` (Legend/NG+ persistence + migration), `data/story.js` (beat 30 + legend beats), `ui.js` (Legend/NG+ screens), `data/accommodation.js` (endless tiers).
**Math/balance notes:** `legendGain = floor(LEGEND_K·sqrt(stats.totalLegacyEverEarned/LEGEND_SCALE))` minus banked — same sqrt template one layer up. Meta-meta multipliers feed a new `L_legend` layer in `M_k = …·L_ascension·L_tree·L_legend`. NG+ scales `STORY_GATES` and `ACC.unlock[]` by `gateScale^ngPlus` and reseeds destinations with `util.rng(destShuffleSeedBase+ngPlus)`, offset by a persistent NG+ income `×` so cycles compress. Number-size audit: swap `math.js` primitives to `{m,e}` once any tracked value exceeds `1e290` (docs/05 §6 policy).

## E29-S1 — The Book of Legends (data model)
_As a 200-hour veteran, I want a defined Legend layer with its own currency and shop, so that there's a whole meta-game above ascension waiting once I've exhausted Legacy._  Declares the second prestige layer as data.
- **E29-S1-T1** — Legend currency in schema — Add `resources.legend` and `stats.totalLegacyEverEarned`; both persist across every reset below the Legend layer.
- **E29-S1-T2** — Meta-meta shop registry — Add `data/legend.js` with shop nodes `{id,name,effect,scope,costLegend,costGrowth,requires}` for global `×`, `treeDiscount`, and `loreUnlock` effects.
- **E29-S1-T3** — NG+ config data — Add `config.NGPLUS = {gateScale, destShuffleSeedBase, rewardMult, maxLevel}`; store the active level in `state.ngPlus`.
- **E29-S1-T4** — Legend constants — Add `LEGEND_K`, `LEGEND_SCALE`, and `LEGEND_EXP` (default `0.5`) to `config.js` beside the Legacy constants for symmetry.
- **E29-S1-T5** — Effect scopes — Tag each Legend node's effect with a scope (global income → `L_legend`, tree cost, offline cap, lore flag) so `prestige.js`/`math.js` know where to apply it.
- **E29-S1-T6** — Lore-unlock entries — Author permanent game-lore unlocks (extra beat text, a secret destination, cosmetic titles) gated by Legend spend.
- **E29-S1-T7** — Flavor copy — Wry Dutch-tourist naming ("The Statue of Yourself", "A Museum Wing Named After You").
- **E29-S1-T8** — Requires-gates — Add `requires` links between Legend nodes so the shop has meaningful order, mirroring the Legacy tree's gating.
- **E29-S1-T9** — Respec policy — Define a small Legend respec fee in data so meta builds stay experimental.
- **E29-S1-T10** — Data validation — Add a dev assert that every Legend node has effect + cost + scope and monotonic cost; fail fast on typos.

## E29-S2 — The Legend Reset (core logic/engine)
_As a player who has ascended dozens of times, I want to burn all my Legacy for Legend points, so that the same sqrt prestige magic works one layer up and my grind gets a fresh ceiling._  Implements the layer-2 reset and its multiplier.
- **E29-S2-T1** — Implement `legendGain` — In `prestige.js`, compute `legendGain = floor(LEGEND_K·sqrt(stats.totalLegacyEverEarned/LEGEND_SCALE))` minus already-banked Legend.
- **E29-S2-T2** — Legend reset path — Add `prestige.legendReset()` that wipes Legacy, the skill tree, and all run currencies, but keeps Legend, NG+ level, lore flags, stats, and settings.
- **E29-S2-T3** — Gate the reset — Allow the reset only when `legendGain ≥ 1` and ascension count ≥ a floor, so nobody Legends by accident (mirrors the ascension guardrail).
- **E29-S2-T4** — Apply meta-meta multipliers — On load, apply shop effects: global `×` → `L_legend`, `treeDiscount` → tree `nodeGrowth`, offline-cap bumps → `OFFLINE_CAP`.
- **E29-S2-T5** — Add `L_legend` to the stack — Insert `L_legend` into `M_k = …·L_ascension·L_tree·L_legend`, additive-inside and multiplicative-across per the master rule.
- **E29-S2-T6** — Spend flow — Add `prestige.buyLegendNode(id)` with geometric `costLegend·costGrowth^rank` and `requires`-gate checks.
- **E29-S2-T7** — Total-Legacy tracking — Increment `stats.totalLegacyEverEarned` on every ascension so the Legend curve reads lifetime Legacy, not current.
- **E29-S2-T8** — Respec implementation — Refund spent Legend minus the respec fee and recompute `L_legend` afterward.
- **E29-S2-T9** — Emit events — Fire `legend:reset`, `legend:buy`, and `ngplus:advance` for UI, stats, and story.
- **E29-S2-T10** — Unit tests — Test `legendGain` against the worked examples, the reset keep/wipe split, and `L_legend` stacking.

## E29-S3 — The Hall of Fame (UI / buttons)
_As a prestige player, I want a clear Legend screen showing what I'd gain and what I can buy, so that the meta-meta layer is as legible as the buttons that got me here._  Exposes Legend + NG+ as simple controls.
- **E29-S3-T1** — Legend panel — Add a "Legend" screen to `ui.js` with the live "reset now → +N Legend" readout and an ROI hint (like the ascension screen).
- **E29-S3-T2** — Meta-meta shop buttons — Render one button per Legend node: name, effect, cost, rank, and `requires` status.
- **E29-S3-T3** — Confirm-reset modal — Guard the Legend reset behind a two-step confirm listing exactly what wipes and what stays.
- **E29-S3-T4** — NG+ control — Add the NG+ advance button with a preview of the new gate multiplier and the reshuffle it will apply.
- **E29-S3-T5** — `L_legend` readout — Show the current global `L_legend` so players see the concrete meta payoff.
- **E29-S3-T6** — Lore log — A read-only list of unlocked lore entries/titles, with newly unlocked ones flagged.
- **E29-S3-T7** — Respec button — Expose Legend respec with its fee and a confirm; recompute the displayed multiplier after.
- **E29-S3-T8** — Unlock reveal — Reveal the Legend screen only after beat 30 unlocks it; show a teaser card before then.
- **E29-S3-T9** — Aria-live wiring — Announce Legend gain and NG+ advance via the accessibility ticker.
- **E29-S3-T10** — Snapshot test — Render the Legend panel from a mid-Legend fixture and assert the readouts and buttons.

## E29-S4 — New Game Plus (the headline new thing)
_As someone who has "beaten" the 20-hour arc, I want a New Game+ that raises every gate and reshuffles the world, so that a replay is genuinely fresh instead of the same climb._  The signature endgame feature.
- **E29-S4-T1** — NG+ advance logic — On Legend reset (or a dedicated toggle), increment `state.ngPlus` and apply its effects to a fresh run.
- **E29-S4-T2** — Raise all story gates — Scale every `STORY_GATES` C-threshold by `NGPLUS.gateScale^ngPlus`, so beats demand more Comfort each cycle.
- **E29-S4-T3** — Reshuffle destinations — Reseed destination order and multipliers with `util.rng(destShuffleSeedBase + ngPlus)` so the travel meta-game is re-explored.
- **E29-S4-T4** — Scale accommodation gates — Raise `ACC.unlock[]` thresholds in step so the ladder keeps pace with the harder gates.
- **E29-S4-T5** — NG+ reward multiplier — Grant a persistent income `×` (`NGPLUS.rewardMult` per level) so harder gates stay clearable within the compressed endgame curve.
- **E29-S4-T6** — Legend beats — Wire the recurring "Legends of Leisure" beat-30+ entries to fire per NG+ cycle with varied flavor.
- **E29-S4-T7** — Reshuffle guard — Assert the reshuffle never strands a build — every branch still reaches every gate, preserving reconvergence.
- **E29-S4-T8** — NG+ badge & flavor — Show an NG+ level badge with wry copy ("New Game Plus: the Netherlands is somehow even rainier this time").
- **E29-S4-T9** — Balance NG+ scaling — Tune `gateScale` and `rewardMult` so each cycle runs *faster* than the last, not into a wall.
- **E29-S4-T10** — QA NG+ — Test gate scaling, deterministic reshuffle (same seed → same world), and that all 30 beats remain reachable at max NG+.

## E29-S5 — Legend Perks (amenity / small-wins cluster — the meta-meta shop)
_As a Legend spender, I want a shelf of chunky permanent perks to buy, so that even the meta-meta layer has that "unlock a new thing" cadence._  Fills the shop with a steady stream of purchases.
- **E29-S5-T1** — Author the perk cluster — Fill the Legend shop with a batch: "Frequent Flyer" (destinations cheaper), "House Money" (start-run cash), "Faster Metabolism II" (`MILESTONE_STEP` −1), "Golden Sands" (island guest income `×`).
- **E29-S5-T2** — Wire generic purchase — Buy through `prestige.buyLegendNode(id)`; no bespoke code per perk.
- **E29-S5-T3** — Global `×` perks — Route several perks into `L_legend` and verify they stack additively within the layer.
- **E29-S5-T4** — Tree-discount perk — "Old Soul" reduces the Legacy tree's `nodeGrowth` so re-climbing the tree after a reset is faster.
- **E29-S5-T5** — Offline/QoL perks — "Endless Siesta" raises `OFFLINE_CAP`; "Autopilot" strengthens staff-automation caps from E19–E20.
- **E29-S5-T6** — Unlock cadence — Gate perks behind `requires` links + Legend thresholds so one becomes affordable roughly every reset or two.
- **E29-S5-T7** — Flavor copy — Wry Dutch-tourist descriptions leaning into absurd-luxury endgame humor.
- **E29-S5-T8** — UI buttons — Show name/effect/cost/rank and the marginal `L_legend` delta per perk.
- **E29-S5-T9** — Save/migration — Persist perk ranks; default 0 for pre-Legend saves; recompute effects on load.
- **E29-S5-T10** — QA — Zero-Legend, rapid buys, `requires`-gate enforcement, effect recompute, and respec-refund correctness.

## E29-S6 — Beyond the Island (accommodation / progression step)
_As an endless-mode player, I want prestige rungs above tier 21, so that even the accommodation ladder has somewhere to go in NG+ without breaking the fiction._  Extends the ladder for the long tail.
- **E29-S6-T1** — Endless tier scaffolding — Extend `data/accommodation.js` with parametric tiers 22+ ("Second Island", "Archipelago", "Own Micronation") generated from `ACC_BASE·ACC_GROWTH^t`.
- **E29-S6-T2** — NG+ tier gates — Gate 22+ behind NG+ level so they appear only in prestige cycles, keeping the base 20h arc capped at the island.
- **E29-S6-T3** — Head Start interaction — Ensure the tree's "Head Start" node and the NG+ start-tier stack sensibly without skipping narrative beats.
- **E29-S6-T4** — Comfort scaling — Verify `accScore` at tiers 22+ stays inside `double` pre-swap, or routes through `N` once the S9 audit engages BigNumber.
- **E29-S6-T5** — Reveal copy — Author wry reveal beats ("You bought a second island. The first one was lonely.").
- **E29-S6-T6** — Cosmetic themes — Add palette/backdrop variants per endless tier via framework-agnostic CSS.
- **E29-S6-T7** — Upgrade layer — Give endless tiers their own `L_upgrade` purchases so each rung has interaction, not just a bigger number.
- **E29-S6-T8** — Balance the steps — Tune the endless `ACC_GROWTH` so rungs pace with the NG+ income scaling.
- **E29-S6-T9** — Save/migration — Persist tiers 22+ and `ownedTiers`; migrate saves that never had them.
- **E29-S6-T10** — QA — Verify no endless tiers appear at NG+0, reveals fire once, and Comfort math stays finite.

## E29-S7 — Legends of Each Lane (path / branch flavor)
_As a player loyal to one build across resets, I want Legend perks and NG+ worlds that honor my lane, so that being "the eternal vlogger" or "the forever connoisseur" pays off._  Keeps identity meaningful into the meta-meta layer.
- **E29-S7-T1** — Branch Legend perks — Add a signature perk per branch (vlogger "Verified Forever", crypto "Diamond Hands", traveler "Passport of Legend", connoisseur "Provenance Eternal").
- **E29-S7-T2** — Tree synergy — Wire these to stack with the branch-synergy tree nodes (Magnetic/Unshakeable/Wanderer's Instinct/Golden Ratio) from docs/04 §5.
- **E29-S7-T3** — NG+ reshuffle weighting — Reseed destinations with branch-aware weighting so a traveler's NG+ world surfaces more destinations and a connoisseur's more exclusive ones.
- **E29-S7-T4** — Vlogger legend — Grant a Legend-level Clout `×` and expand NG+ sponsor variety.
- **E29-S7-T5** — Crypto legend — Reduce market-crash downside further (stacking toward, but still clamped by, Unshakeable) and add new NG+ event types.
- **E29-S7-T6** — Connoisseur legend — Raise the exclusivity ceiling and add rarer NG+ collectibles.
- **E29-S7-T7** — Traveler legend — Grant a permanent transport slot and add bonus reshuffled destinations.
- **E29-S7-T8** — Hybrid legend — Add a perk rewarding players who have maxed two branches across resets, mirroring the hybrid-beat pattern.
- **E29-S7-T9** — Balance branch legends — Ensure the branch Legend perks are within ~10% power of each other; harness-check.
- **E29-S7-T10** — QA — Load a save per branch and assert the correct legend perk + reshuffle weighting with no cross-branch leakage.

## E29-S8 — The Long Tail (balance & tuning)
_As the balancer for the 200-hour crowd, I want the Legend curve and NG+ scaling tuned so the endgame keeps giving, so that prestige-of-prestige is rewarding but self-limiting like every layer below it._  Fits the tail to the pacing philosophy.
- **E29-S8-T1** — Set Legend constants — First-pass `LEGEND_K`, `LEGEND_SCALE`, `LEGEND_EXP=0.5`; sanity-check with a worked example (`totalLegacy=1e6` → a small positive `legendGain`).
- **E29-S8-T2** — Legend-loop length — Tune so a first Legend reset is worthwhile after roughly a handful of ascensions, not a single one.
- **E29-S8-T3** — NG+ gate-scaling fit — Set `gateScale` so each NG+ cycle re-runs the arc in progressively less time thanks to `L_legend` + the NG+ `×`.
- **E29-S8-T4** — Extend the harness — Add a Legend-aware policy (Legend-reset at ROI break-even; buy cheapest positive-ROI Legend node) to `js/dev/harness.js`.
- **E29-S8-T5** — Simulate the tail — Run the harness across a multi-NG+ horizon and assert each cycle compresses with no beat becoming unreachable.
- **E29-S8-T6** — Cross-layer stack audit — Verify `milestone·L_upgrade·L_path·L_skill·L_comfort·L_ascension·L_tree·L_legend` stays balanced with no single layer dominating.
- **E29-S8-T7** — Number-size projection — Project the peak economy value across the intended tail and flag if any tracked value approaches `1e290` (feeds the S9 swap decision).
- **E29-S8-T8** — Retune from misses — Nudge the largest-miss lever per the docs/05 procedure and iterate to within ±15%.
- **E29-S8-T9** — Golden-file snapshot — Commit an extended golden file covering the Legend/NG+ curve so tail regressions are caught.
- **E29-S8-T10** — Document endgame levers — Comment which Legend/NG+ knob moves which symptom, extending the docs/05 lever table.

## E29-S9 — Carrying the Legend Forward + the BigNumber Swap (save / migration / offline)
_As a player deep in prestige, I want Legend, NG+ level, and ever-larger numbers to persist and compute correctly, so that the endgame swap to BigNumber is invisible and my save never corrupts._  Persists the layer and future-proofs the math.
- **E29-S9-T1** — Extend state — Persist `resources.legend`, `state.ngPlus`, Legend node ranks, lore flags, and `stats.totalLegacyEverEarned`.
- **E29-S9-T2** — Bump version + migration — Increment `state.version` and add a `MIGRATIONS[n]` seeding Legend/NG+ defaults for pre-Legend saves.
- **E29-S9-T3** — Number-size trigger — Wire the harness/runtime check that flags the BigNumber swap when any tracked value exceeds `1e290`, per docs/05 §6 policy.
- **E29-S9-T4** — Implement the `{m,e}` swap — Route `math.js` economy primitives through the in-repo mantissa+exponent `N` struct; only `math.js` and `util.format` change.
- **E29-S9-T5** — Format big values — Extend `util.format` to render `{m,e}` via `N.fmt` (scientific past `1e6`) so UI numbers stay legible beyond `double`.
- **E29-S9-T6** — Serialize BigNumbers — Ensure save/load round-trips `{m,e}` values (as `[m,e]` or string) without precision loss.
- **E29-S9-T7** — Offline correctness at scale — Verify offline macro-steps use `N` math so away progress matches online even past `1e300`.
- **E29-S9-T8** — Migrate numeric fields — Migrate existing native-number saves into the `N` representation on the first post-swap load.
- **E29-S9-T9** — Round-trip + boundary test — Save→load with values both below and above `1e290` and assert identical results across the native/`N` boundary.
- **E29-S9-T10** — Fixture migration test — Load a historical save from each version through the swap and assert it migrates, plays, and formats correctly.

## E29-S10 — Endgame Integrity (QA / polish / release)
_As a player at the far end of the curve, I want the prestige-of-prestige loop to be rock-solid, so that dozens of resets and giant numbers never desync, soft-lock, or lie to me._  The final integrity gate for the epic.
- **E29-S10-T1** — Prestige-loop tests — Automated test: ascend → Legend-reset → NG+ advance → replay; assert keep/wipe correctness at each layer.
- **E29-S10-T2** — Number-size audit — Run the harness to the intended tail and assert no NaN/Infinity and that BigNumber engages before overflow.
- **E29-S10-T3** — Determinism check — Confirm same seed + same actions → identical Legend gain and reshuffle; lock the seeded-RNG behavior.
- **E29-S10-T4** — Reset-safety edge cases — Test Legend reset at exactly `legendGain=1`, at NG+ max level, and with a fully-bought Legend shop.
- **E29-S10-T5** — Formatting QA — Verify every readout (Legend, `L_legend`, guest income, upkeep) formats correctly at `1e6`, `1e60`, and `1e300`.
- **E29-S10-T6** — Accessibility pass — Make Legend/NG+ controls keyboard-reachable, announce resets via `aria-live`, and focus-trap the confirm modals.
- **E29-S10-T7** — Reduced-motion — Ensure Legend/NG+ celebratory juice degrades to instant when `prefers-reduced-motion` is set.
- **E29-S10-T8** — Console QA hooks — Extend `window.IV` with grant-Legend, set-NG+, and force-swap-BigNumber for manual testing.
- **E29-S10-T9** — Regression-suite wiring — Add the S2/S4/S9 tests to the dev test runner so the endgame stays green.
- **E29-S10-T10** — Release polish — Add the beat-30 "Empire of Leisure" celebration copy and the NG+ intro; ship wry endgame flavor.

## Definition of Done (epic)
- [ ] Legend currency, meta-meta shop, and `legendGain = floor(LEGEND_K·sqrt(totalLegacyEverEarned/LEGEND_SCALE))` all implemented and gated behind an accidental-reset guardrail.
- [ ] `L_legend` slots into the multiplier stack additive-inside/multiplicative-across; meta-meta perks apply on load and respec correctly.
- [ ] New Game+ raises all `STORY_GATES` and `ACC.unlock[]` by `gateScale^ngPlus`, deterministically reshuffles destinations, and offsets difficulty with a persistent reward `×`.
- [ ] Every branch has a lane-loyal Legend perk within ~10% power parity; reconvergence still holds at max NG+.
- [ ] Endless accommodation tiers 22+ exist behind NG+ gates without disturbing the base 20h arc.
- [ ] Harness shows each NG+/Legend cycle compressing and staying finite; extended golden file committed.
- [ ] BigNumber `{m,e}` swap engages before `1e290`, round-trips through save/load, and matches online/offline; only `math.js` + `util.format` changed.
- [ ] Save migrates from pre-Legend versions; determinism, formatting, accessibility, and reduced-motion all verified.
