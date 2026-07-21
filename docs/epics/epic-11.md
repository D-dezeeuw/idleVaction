# E11 — Five-Star Frame of Mind
> The Climb (Act II) · Tiers 9 (5-Star Hotel) → 10 (5-Star Suite) · Concierge auto-buyer (first automation seed) · Suite amenities · D4/D5 tier pressure · Beat 13 *Five-Star Frame of Mind* · Build-path emphasis: neutral

**Epic goal:** Reach the 5-Star Hotel and Suite, and introduce the **concierge** — the game's first automation seed: a bounded, configurable auto-purchaser that quietly buys the cheapest positive-ROI items so the player micromanages less and enjoys more.
**Player-visible outcome:** Two accommodation steps in one epic (5-star hotel, then the suite), a suite full of small perks, the higher **D4/D5** income tiers coming online, and a Concierge Desk where the player dials in a budget and a whitelist and lets the hotel do the shopping.
**Systems touched:** `data/accommodation.js` (tiers 9,10), `data/amenities.js` (suite cluster), `data/generators.js` (D4/D5 onboarding), `config.js` (`CONCIERGE.*`, `GEN.base[3..4]`, `GEN.growth[3..4]`), `engine.js` (concierge policy tick, tier-chaining), `state.js` (`concierge` config block), `ui.js`.
**Math/balance notes:** Concierge is a **bounded auto-purchase policy** — reuse the harness's greedy `affordablePurchases → marginalIncomeGain/cost` ranking, capped by `CONCIERGE.budgetFrac·cash` per interval and a reserve floor; D4/D5 onboarding `GEN.base[3]=1.2e4, growth[3]=1.11` and `GEN.base[4]=1.3e5, growth[4]=1.12` with tier chaining `d(count_{k-1})/dt=prod_k`; Beat 13 gate `accommodation.tier ≥ 10`.

## E11-S1 — The Concierge Ledger (data model)
_As a designer, I want the concierge policy, suite amenities and D4/D5 tiers declared as data, so that the auto-buyer and the new tiers plug into the generic engine._  Lays down all new declarative content.
- **E11-S1-T1** — Add the `CONCIERGE.*` config block — In `config.js` add `CONCIERGE={budgetFrac:0.25, intervalSec:5, reserveFloor:0, tipFrac:0.01, defaultOn:false, whitelist:['amenity']}` as the single source of concierge knobs.
- **E11-S1-T2** — Author the suite amenities — Add a `tag:'suite'` cluster (`turndown_service`,`pillow_menu`,`minibar`,`bathrobe`,`rainfall_shower`,`butler_call_button`) to `data/amenities.js`, each `{costBase,costGrowth:1.5,comfort,xMult}`.
- **E11-S1-T3** — Onboard D4 — In `data/generators.js` set D4 (`Media Deals`) `{base:1.2e4, growth:1.11, perUnit}` so the fourth income tier is ready to come online this epic.
- **E11-S1-T4** — Onboard D5 — Set D5 (`Brand`) `{base:1.3e5, growth:1.12, perUnit}` with tier chaining so D5 produces D4 units, extending the polynomial degree.
- **E11-S1-T5** — Define the whitelist categories — Declare the purchasable categories the concierge may touch (`amenity`, `generator`, `upgrade`) as data so the UI checkboxes and engine filter share one list.
- **E11-S1-T6** — Declare the concierge state block — Add `state.concierge={on, budgetFrac, reserveFloor, whitelist, lastActions:[]}` to the canonical state with sensible defaults.
- **E11-S1-T7** — Define the concierge unlock gate — Data-drive the concierge's unlock as "own accommodation tier 10", so it appears exactly when the suite does.
- **E11-S1-T8** — Add tier 9 & 10 accommodation entries — In `data/accommodation.js` add tier 9 (5-Star Hotel) and tier 10 (5-Star Suite) with `accScore = ACC.base·ACC.growth^t` steps and `ACC.unlock[9]`, `ACC.unlock[10]` thresholds.
- **E11-S1-T9** — Hook Beat 13 data — Add Beat 13 *Five-Star Frame of Mind* to `data/story.js` with `requires:{tier:10}` and a grant that reveals the concierge.
- **E11-S1-T10** — Write concierge flavor strings — Author the desk copy and action-log lines in the Dutch-abroad voice ("The concierge, sensing your indecision, has taken the liberty of buying you a pillow menu").

## E11-S2 — A Bounded Auto-Buyer (core logic / engine)
_As a player, I want an auto-buyer that spends only a slice of my cash on the best deals, so that automation helps without ever draining me dry._  The concierge policy engine.
- **E11-S2-T1** — Reuse `affordablePurchases` — Have the concierge call the same `affordablePurchases(state)` enumeration the harness uses, so auto and manual buying share one code path.
- **E11-S2-T2** — Rank by marginal ROI — Sort candidates by `marginalIncomeGain(state,opt)/opt.cost` descending, exactly the greedy metric from `docs/05 §3`.
- **E11-S2-T3** — Bound spend by budget — Each concierge tick, spend at most `CONCIERGE.budgetFrac·cash`, buying top-ROI items until the budget or affordability runs out.
- **E11-S2-T4** — Apply the whitelist filter — Skip any candidate whose category is not in `state.concierge.whitelist`, so the player controls *what* the concierge touches.
- **E11-S2-T5** — Run on a cadence — Fire the concierge policy every `CONCIERGE.intervalSec` (accumulated in `engine.tick`) rather than every tick, keeping it cheap and legible.
- **E11-S2-T6** — Respect unlock gating — Ensure the concierge never buys a locked item; it only sees what the player could currently buy manually.
- **E11-S2-T7** — Honor the reserve floor — Never let concierge spending drop cash below `state.concierge.reserveFloor`, so the player can protect a savings target.
- **E11-S2-T8** — Emit batched purchase events — Collect a tick's auto-buys into one `purchase{by:'concierge',items:[...]}` event so the UI updates once, not per item.
- **E11-S2-T9** — Add a pause/resume flag — Gate the whole policy behind `state.concierge.on` so the player can switch automation off instantly.
- **E11-S2-T10** — Wire D4/D5 tier chaining — Ensure `prod_5` increments `count_4` and `prod_4` increments `count_3` per `d(count_{k-1})/dt=prod_k`, so the new tiers accelerate the ladder.

## E11-S3 — The Concierge Desk (UI / buttons)
_As a player, I want a simple desk to configure the concierge, so that I can see and control exactly what it buys on my behalf._  Exposes the auto-buyer as plain controls.
- **E11-S3-T1** — Add the on/off toggle — A single prominent switch bound to `state.concierge.on` with a clear "Concierge is shopping / resting" label.
- **E11-S3-T2** — Add a budget slider — A slider for `budgetFrac` (0–50%) showing the live cash amount it represents per interval.
- **E11-S3-T3** — Add whitelist checkboxes — Checkboxes for each category (amenities/generators/upgrades) writing to `state.concierge.whitelist`.
- **E11-S3-T4** — Add a reserve-floor input — A numeric input for `reserveFloor` so players can protect cash toward a big purchase.
- **E11-S3-T5** — Show a "last actions" log — Render the recent `lastActions` (item, cost, when) so the concierge's behavior is transparent, not mysterious.
- **E11-S3-T6** — Add an ROI transparency tooltip — On hover, explain "buys the best cash-per-second-per-cost deal it's allowed to," demystifying the greedy policy.
- **E11-S3-T7** — Add the unlock reveal — Reveal the Concierge Desk card with a one-time highlight when tier 10 is owned.
- **E11-S3-T8** — Announce auto-buys quietly — Route concierge purchases to a muted `aria-live="polite"` line so they inform without spamming.
- **E11-S3-T9** — Disable when locked — Grey out and disable the desk until the concierge unlocks, with a "reach the Suite to unlock" hint.
- **E11-S3-T10** — Subscribe the desk to events — Re-render the desk on `purchase{by:'concierge'}`, `unlock` and `state:changed` only.

## E11-S4 — At the Ring of a Bell (the headline new thing)
_As a player tired of clicking the same cheap buttons, I want the concierge to handle the tedium, so that my attention moves up to the interesting decisions._  The signature automation seed — and the template for later staff.
- **E11-S4-T1** — Define a reusable policy interface — Shape the concierge as a generic `AutomationPolicy{shouldRun, pickPurchases, apply}` so E19's butler and E20's household reuse it, not fork it.
- **E11-S4-T2** — Ship a conservative default — Default the concierge to amenities-only, 25% budget, off — so it never surprises a new player with aggressive spending.
- **E11-S4-T3** — Add per-category priority — Let the policy prefer whitelisted categories in a configured order when budgets are tight, so the concierge shops sensibly.
- **E11-S4-T4** — Prove it reduces micromanagement — Instrument a "manual clicks saved" stat so the value of automation is visible and can be tuned.
- **E11-S4-T5** — Make it greedy, not clever — Keep the policy strictly cheapest-ROI-first (no lookahead) so behavior is predictable and matches the harness.
- **E11-S4-T6** — Guard forbidden actions — Hardcode that the concierge never buys accommodation tiers, never ascends, and never accepts story choices — those stay the player's.
- **E11-S4-T7** — Add a tip/fee sink — Deduct a small `CONCIERGE.tipFrac` on each auto-buy as a gentle payroll-lite sink, foreshadowing staff upkeep in E19.
- **E11-S4-T8** — Build the signature card — Give the concierge a distinctive desk card (bell icon, subtle activity indicator) so it reads as the epic's headline feature.
- **E11-S4-T9** — Balance ROI vs trivialization — Tune budget/interval so the concierge accelerates play but never fully replaces the player's own buying decisions.
- **E11-S4-T10** — QA the automation seed — Test that toggling, re-whitelisting and reserve changes take effect on the next interval with no stuck or runaway states.

## E11-S5 — Suite Perks (small-wins cluster)
_As a five-star guest, I want a suite full of small luxuries to unlock, so that there's a steady drip of Comfort-boosting toys the concierge can also grab for me._  A cheap, flavored amenity cluster.
- **E11-S5-T1** — Define the suite items — Confirm the `tag:'suite'` chain with `costGrowth:1.5`, ramping ~2× per step, each giving `comfort` + a small `xMult`.
- **E11-S5-T2** — Wire the purchase flow — Route every suite buy through the generic `engine.buyAmenity(id)`; no bespoke suite code.
- **E11-S5-T3** — Feed the Comfort contribution — Add suite `amenityScore` into `ComfortRaw`; confirm the saturating cap still behaves.
- **E11-S5-T4** — Add a targeted multiplier — Give suite items a small `xMult` scoped via tag/`L_path` so they nudge income modestly.
- **E11-S5-T5** — Tag items concierge-eligible — Mark suite amenities as `category:'amenity'` so the whitelisted concierge can buy them.
- **E11-S5-T6** — Gate the unlock reveals — Reveal each suite item behind the previous plus a Comfort threshold, emitting `unlock`.
- **E11-S5-T7** — Write the flavor copy — One-line Dutch-tourist descriptions (e.g. "Pillow menu: seven pillows, one head — finally, abundance").
- **E11-S5-T8** — Build the UI buttons — Show name, cost, owned level and next-Comfort delta per suite item.
- **E11-S5-T9** — Balance the cadence — Tune costs so a new suite perk is affordable roughly every 60–90s active; confirm via harness.
- **E11-S5-T10** — QA the suite cluster — Test zero-cash presses, rapid buys, Comfort recompute, and that concierge-bought suite items obey the budget.

## E11-S6 — Two Stars in One Epic (accommodation step)
_As a climber, I want to leave the boutique retreat for a 5-star hotel and then its suite, so that I feel two clear jumps and unlock the concierge and Beat 13._  The epic's double accommodation step.
- **E11-S6-T1** — Add tier 9 (5-Star Hotel) — Model tier 9 with `accScore = ACC.base·ACC.growth^9` and its unlock threshold `ACC.unlock[9]`.
- **E11-S6-T2** — Add tier 10 (5-Star Suite) — Model tier 10 with `accScore = ACC.base·ACC.growth^10` and `ACC.unlock[10]`, the bigger of the two steps.
- **E11-S6-T3** — Wire the unlock thresholds — Gate tiers 9 and 10 by Comfort per `ACC.unlock[]`, tying into `STORY_GATES` so the story and ladder stay in sync.
- **E11-S6-T4** — Unlock the concierge at tier 10 — On owning tier 10, fire the concierge unlock so the suite and its automation arrive together.
- **E11-S6-T5** — Confirm the big accScore steps — Verify both tiers produce a felt Comfort jump consistent with `ACC.growth≈2.6`.
- **E11-S6-T6** — Build reveal cards + Beat 13 — Add reveal cards for both tiers and trigger Beat 13 *Five-Star Frame of Mind* when tier 10 is owned.
- **E11-S6-T7** — Tie the story gate — Ensure Beat 13's `requires` reads `tier ≥ 10` in both `STORY_GATES` and `data/story.js`.
- **E11-S6-T8** — Write the ladder flavor — Author the step copy ("Two stars in one afternoon — your poncho has never felt so out of place").
- **E11-S6-T9** — Migrate default ownership — Default tiers 9/10 as not-owned for older saves so the steps present as new.
- **E11-S6-T10** — QA the gating — Verify both tiers gate correctly on Comfort, the concierge appears only at tier 10, and Beat 13 fires once.

## E11-S7 — Every Branch Gets a Butler-Lite (path flavor)
_As a path-focused player, I want the concierge to prioritize purchases that suit my build, so that automation feels personal rather than generic._  Serves all four paths without lock-in.
- **E11-S7-T1** — Add per-branch priority weights — Add `CONCIERGE.branchWeights` biasing the ROI ranking toward path-relevant categories for the active branch.
- **E11-S7-T2** — Vlogger priority — When `branch==='vlogger'`, nudge the concierge toward social tiers (D2/D3) and content-adjacent amenities.
- **E11-S7-T3** — Crypto priority — For `crypto`, bias toward savvy/passive-relevant purchases (respecting E13's future categories as data stubs).
- **E11-S7-T4** — Connoisseur priority — For `connoisseur`, bias toward high-Comfort luxury amenities over raw income tiers.
- **E11-S7-T5** — Traveler priority — For `traveler`, bias toward destinations/transport purchases once those categories are whitelisted.
- **E11-S7-T6** — Write branch-flavored desk copy — Vary the concierge's tone per branch (vlogger: "curated for the feed"; connoisseur: "in impeccable taste").
- **E11-S7-T7** — Keep the neutral default balanced — For `neutral`, keep pure cheapest-ROI with no bias, so unspecialized players get the plain, fair behavior.
- **E11-S7-T8** — Store weights in config — Keep all branch weights in `config.js` so they are tunable knobs, not code.
- **E11-S7-T9** — Guarantee no lock-in — Ensure the bias is a soft tiebreak, never a hard filter, so a re-specced player's concierge adapts immediately.
- **E11-S7-T10** — QA per-branch behavior — Test each branch to confirm the priority nudge and copy appear and that neutral remains unbiased.

## E11-S8 — Tuning D4/D5 and the Concierge (balance & tuning)
_As a balancer, I want D4/D5 and the concierge tuned to the Beat-13 target, so that the new tiers and automation keep pacing in the sweet spot._  Sets and validates the epic's numbers.
- **E11-S8-T1** — Set D4 constants — Confirm `GEN.base[3]=1.2e4`, `GEN.growth[3]=1.11` and its `perUnit` so D4 onboards without a wall.
- **E11-S8-T2** — Set D5 constants — Confirm `GEN.base[4]=1.3e5`, `GEN.growth[4]=1.12` and `perUnit` so D5 raises the polynomial degree at the right moment.
- **E11-S8-T3** — Set the concierge budget/interval — Tune `CONCIERGE.budgetFrac=0.25` and `intervalSec=5` so automation is helpful but bounded.
- **E11-S8-T4** — Run the harness to Beat 13 — Simulate and confirm `T(beat 13)` lands on the smooth curve (~2:10, between Beat 10 ~1:10 and Beat 15 ~3:00).
- **E11-S8-T5** — Keep purchases in the 30–120s band — Verify with concierge on that time-to-next-meaningful-purchase stays in the healthy band, not below ~15s.
- **E11-S8-T6** — Verify D4/D5 don't wall — Confirm the new tiers don't create a dead stretch with nothing affordable; adjust `base`/`growth` if they do.
- **E11-S8-T7** — Tune the tip sink — Set `CONCIERGE.tipFrac` so the fee is a felt-but-small drag that doesn't negate the automation's value.
- **E11-S8-T8** — Update the golden file — Commit the resulting milestone curve as the balance golden file.
- **E11-S8-T9** — Guard against pacing collapse — Assert the concierge never drops effective time-to-purchase below the clicker threshold, keeping the game an idler.
- **E11-S8-T10** — Document the constants — Comment each `CONCIERGE.*` and `GEN.base/growth[3..4]` knob in `config.js` with its pacing role.

## E11-S9 — The Concierge Never Sleeps (save / migration / offline)
_As a returning player, I want the concierge to have shopped sensibly while I was away and my config to persist, so that automation is reliable across sessions._  Save correctness for the auto-buyer.
- **E11-S9-T1** — Persist the concierge config — Serialize `state.concierge` (on, budgetFrac, reserveFloor, whitelist) so settings survive reloads.
- **E11-S9-T2** — Persist tiers, D4/D5 and suite — Save tiers 9/10 ownership, D4/D5 `count`/`bought`, and suite amenity levels.
- **E11-S9-T3** — Add a migration — Bump `state.version` and default the `concierge` block (off, 25%, amenities-only) plus new tiers/tiers for older saves.
- **E11-S9-T4** — Run the concierge offline — During offline macro-steps, execute the same bounded policy so returning players find sensible auto-buys, not a hoard of unspent cash.
- **E11-S9-T5** — Respect the reserve floor offline — Ensure offline auto-buying still honors `reserveFloor` and `budgetFrac` exactly as online.
- **E11-S9-T6** — Summarize concierge spend — Include "the concierge bought N items for X" in the "While you were away" modal.
- **E11-S9-T7** — Grant no unpoliced free items — Confirm offline never buys outside the whitelist/budget; the policy is the only spender.
- **E11-S9-T8** — Extend export/import — Add the concierge config and new tier/generator fields to the export string, guarding malformed imports.
- **E11-S9-T9** — Default config for old saves — Ensure pre-E11 saves load with the concierge safely off so no one returns to surprise spending.
- **E11-S9-T10** — QA old-save load — Load a pre-E11 fixture and assert a valid state with concierge off, tiers/generators defaulted, and no crash.

## E11-S10 — Do Not Disturb (QA / polish / juice)
_As a QA-minded developer, I want the concierge covered by tests and a touch of polish, so that automation is trustworthy and pleasant._  Hardening and juice.
- **E11-S10-T1** — Unit-test the ranking — Assert the concierge picks the true highest-ROI affordable, whitelisted candidate on crafted states.
- **E11-S10-T2** — Test the budget bound — Assert a tick never spends more than `budgetFrac·cash` regardless of how many deals exist.
- **E11-S10-T3** — Test the whitelist — Assert de-whitelisting a category immediately stops the concierge buying it next interval.
- **E11-S10-T4** — Test the reserve floor — Assert the concierge stops before crossing `reserveFloor`, even mid-shopping-list.
- **E11-S10-T5** — Test offline determinism — Assert online and offline concierge produce the same purchases for the same elapsed time and state.
- **E11-S10-T6** — Test rapid toggling — Toggle on/off repeatedly and assert no double-spend, stuck timers or duplicated log entries.
- **E11-S10-T7** — Test zero-cash no-op — Assert the concierge does nothing (and logs nothing) when cash is below the cheapest affordable item.
- **E11-S10-T8** — Juice the auto-buy — Add a subtle bell chime and a fading log line on auto-purchase, both gated by `prefers-reduced-motion`.
- **E11-S10-T9** — Format the desk numbers — Route budget, reserve and action-log costs through `util.format` for clean suffixes.
- **E11-S10-T10** — Regression: forbidden actions — Assert the concierge never buys accommodation, never ascends, and never touches story choices under any config.

## Definition of Done (epic)
- [ ] Tiers 9 (5-Star Hotel) and 10 (5-Star Suite) ship with `accScore`/`ACC.unlock[]` steps and satisfy Beat 13 *Five-Star Frame of Mind* at `tier ≥ 10`.
- [ ] The concierge is a bounded auto-purchase policy: cheapest-ROI-first, capped by `CONCIERGE.budgetFrac·cash`, whitelisted, with a reserve floor and a tip sink.
- [ ] The concierge never buys accommodation, ascends, or makes story choices, and reuses a generic `AutomationPolicy` interface for E19/E20.
- [ ] D4 (`base 1.2e4, growth 1.11`) and D5 (`base 1.3e5, growth 1.12`) come online with correct tier chaining.
- [ ] Suite amenity cluster ships with wry copy, is concierge-eligible, and hits the ~60–90s cadence.
- [ ] Path flavor biases the concierge softly per branch with no lock-in; neutral stays unbiased.
- [ ] Harness confirms Beat 13 pacing, keeps time-to-purchase in the 30–120s band, and prevents pacing collapse; golden file updated.
- [ ] Save/migration/offline persist concierge config, tiers, D4/D5 and suite; the concierge runs bounded offline and is off by default for old saves.
- [ ] Tests cover ranking, budget bound, whitelist, reserve floor, offline determinism and forbidden actions; desk numbers formatted and reduced-motion respected.
