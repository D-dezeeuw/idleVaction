# E13 — Money Works While You Tan
> Act II · Tier 11 (crypto poolside cabana) · Savvy passive income + seeded market events · Beat 14 *Whale Watching* · **Crypto** path emphasis

**Epic goal:** Ship the Crypto Poolside Lounger economy — a Savvy-scaled passive income stream and a volatile, seeded market-event system (booms & crashes) that a lounging Dutchman rides from a pool bed while his money tans for him.
**Player-visible outcome:** Idle cash now earns a passive `dCash/dt` that grows with `sqrt(totalCash)`, a crypto portfolio of coin holdings, a live market ticker with booms and crashes, and risk-mitigation upgrades that tame the downside.
**Systems touched:** `js/data/crypto.js` (new), `config.MARKET` + `config.SAVVY_YIELD` (new blocks in `config.js`), `data/skills.js` (Savvy), `data/paths.js` (crypto), `engine.js` (market tick + passive integration), `math.js` (passive & event math), `util.js` (seeded `rng`), `state.js` (market sub-state + migration), `ui.js` (portfolio/ticker), `data/story.js` (beat 14 *Whale Watching*).
**Math/balance notes:** `dCash/dt += savvyL · SAVVY_YIELD · Math.pow(totalCash, 0.5)` (sqrt softcap → supports but never replaces active buys); `marketMult = baseVolatility · eventMult`, events drawn from `util.rng(state.market.seed, cursor)`; crypto branch perk Savvy `×1.3`; `Unshakeable` tree node halves crash depth; long-run `E[marketMult] ≈ 1.05`.

## E13-S1 — The Portfolio Ledger (data model)
_As a poolside speculator, I want a declarative catalogue of coins and market events, so that the whole crypto economy is retunable numbers, not hard-coded logic._  All crypto content is data; the engine stays generic.
- **E13-S1-T1** — Create crypto data module — Add `js/data/crypto.js` exporting a `COINS` array; each `{id,name,ticker,tag:'crypto',costBase,costGrowth:1.12,yieldPerUnit,volatility}` describing one holding the lounger can stack.
- **E13-S1-T2** — Seed the coin roster — Write 6 flavored coins (`StroopCoin`, `PonchoDAO`, `TanChain`, `GulderETF`, `WindmillSwap`, `WhaleToken`) with a ≈×10 `costBase` ramp mirroring the `GEN.base` staggering.
- **E13-S1-T3** — Define market-event table — Add a `MARKET_EVENTS` array of typed events `{id,kind:'boom'|'crash'|'chop',multRange:[lo,hi],durRange,weight}` so the seeded RNG can pick weighted event types.
- **E13-S1-T4** — Add `config.MARKET` block — In `config.js` add `MARKET = { seed, tickVolatility, eventEveryRange:[minS,maxS], boomWeight, crashWeight, variance }` as the single tuning surface for the whole lane.
- **E13-S1-T5** — Add `config.SAVVY_YIELD` — Introduce `SAVVY_YIELD` (passive scale) and `SAVVY_CASH_EXP = 0.5` so the sqrt softcap is a config knob, not a literal buried in `math.js`.
- **E13-S1-T6** — Tag coins for the stack — Give each coin `scope:'crypto'` so `L_path(crypto)` and Savvy `L_skill` flow through the generic multiplier stack (`M_k`) unchanged.
- **E13-S1-T7** — Write coin flavor copy — One wry Dutch-tourist line per coin ("StroopCoin: backed by the gold standard of waffles; PonchoDAO: rain-proof, allegedly").
- **E13-S1-T8** — Define risk-mitigation upgrades — Add a `HEDGES` array (`stablecoin`, `cold_storage`, `diversify`) each `{id,cost,crashDamp,varianceDamp}` for the downside-taming sub-tree.
- **E13-S1-T9** — Cross-reference the Savvy skill — Ensure the `skills.js` Savvy entry lists crypto holdings + market-survival as its XP sources so attribute and data agree.
- **E13-S1-T10** — Schema doc comment — Document the `COINS`/`MARKET_EVENTS`/`HEDGES` shapes at the top of `crypto.js` so E29 extends the same contract.

## E13-S2 — Money That Tans Itself (core passive + market tick)
_As an idler, I want my cash to earn passive income modulated by the market, so that lounging genuinely pays._  The Savvy passive + market loop runs every tick.
- **E13-S2-T1** — Implement Savvy passive — In `math.js` add `savvyPassive(state) = savvyLevel · SAVVY_YIELD · Math.pow(totalCash, SAVVY_CASH_EXP)` as a pure function of state.
- **E13-S2-T2** — Wire passive into the tick — In `engine.tick(dt)` add `state.resources.cash += savvyPassive(state) · marketMult(state) · dt` after generator production so it composes with the ladder.
- **E13-S2-T3** — Compute the `totalCash` input — Define `totalCash` as wallet cash + banked crypto-holding value so the sqrt scales on net worth, not just spendable cash.
- **E13-S2-T4** — Implement `marketMult` — Add `marketMult(state)` combining baseline `tickVolatility` jitter with the active event's multiplier; clamp to a positive floor so passive income never goes negative.
- **E13-S2-T5** — Seeded event scheduler — Advance `state.market.nextEventT`; when reached, draw the next event via `util.rng(state.market.seed, state.market.cursor++)` and set `phase/mult/expiry`.
- **E13-S2-T6** — Coin yield production — Each owned coin adds `count·yieldPerUnit·M_k` (through the stack) into a crypto-yield accumulator feeding Savvy XP and portfolio value.
- **E13-S2-T7** — Savvy XP trickle — Award Savvy XP proportional to crypto yield and to *surviving* crashes, so the attribute levels by playing the path (`xpToNext = SKILL.base · SKILL.growth^L`).
- **E13-S2-T8** — Apply crash damping — Fold `HEDGES` `crashDamp` and the `Unshakeable` tree rank into event math so crash multipliers pull toward 1 (`Unshakeable` halves depth).
- **E13-S2-T9** — Feed `L_path(crypto)` — Convert crypto path points into `L_path = 1 + PATH.rate · points^PATH.softcapExp` scoped to crypto tiers, matching the softcap rule.
- **E13-S2-T10** — Determinism guard — Ensure the market tick is a pure function of `(seed, cursor, dt)` so offline replay and the balance harness produce identical event streams.

## E13-S3 — The Poolside Trading Desk (UI)
_As a lounger with a laptop, I want a portfolio panel and a live ticker, so that I can watch the market without leaving my pool bed._  Crypto is visible, legible, and buyable.
- **E13-S3-T1** — Portfolio panel — Render a crypto card listing each owned coin: name, count, current value, and a buy button showing the next geometric cost.
- **E13-S3-T2** — Live market ticker — Add an `aria-live` ticker showing `marketMult` as a % with an up/down arrow, updated on the render throttle (not every sim tick).
- **E13-S3-T3** — Event banner — When a boom/crash is active, show a labelled banner ("WHALE PUMP +240% · 0:42 left") driven by `state.market.phase` and its expiry countdown.
- **E13-S3-T4** — Buy-coin flow — Wire buttons to a generic `engine.buyCoin(id)` reusing the geometric-cost purchase path; no bespoke per-coin code.
- **E13-S3-T5** — Savvy readout — Show current Savvy level, an XP-to-next bar, and the resulting passive `cash/s` figure so the player sees the lever.
- **E13-S3-T6** — Passive income line — Display "money while you tan: +X/s" separately from active generator income to make the fantasy legible.
- **E13-S3-T7** — Hedge purchase buttons — Expose `HEDGES` as one-time purchases with a "reduces crash pain" tooltip and an owned/disabled state.
- **E13-S3-T8** — Unlock reveal — Gate the whole desk behind the crypto-path seed + a Comfort threshold, emitting `unlock` with a "your money wants a job" reveal toast.
- **E13-S3-T9** — Colour & motion — Green/red ticker colouring that respects `prefers-reduced-motion` (no flashing during a crash).
- **E13-S3-T10** — Number formatting — Route all values through `util.format` so 1e12 shows in the tuned notation, never a raw double.

## E13-S4 — Booms, Crashes & Whale Watching (the market)
_As a risk-tolerant tanner, I want a volatile market of booms and crashes, so that idle income has drama and a high ceiling I can ride or hedge._  The signature high-variance crypto feature.
- **E13-S4-T1** — Event state machine — Implement `market.phase ∈ {calm,boom,crash,chop}` with entry/duration/exit transitions driven by the seeded scheduler.
- **E13-S4-T2** — Boom events — Booms multiply passive income ×2–×5 for a short window; weight and range read from `config.MARKET.boomWeight`.
- **E13-S4-T3** — Crash events — Crashes cut income to ×0.2–×0.5, damped by hedges and `Unshakeable`, but never to zero (floor so the player always trickles).
- **E13-S4-T4** — Chop / variance baseline — Between events apply small seeded jitter (`±tickVolatility`) so the ticker always wiggles, selling the "live market" feel.
- **E13-S4-T5** — Variance knob — Wire `config.MARKET.variance` to widen or narrow both event magnitudes and baseline jitter from a single constant.
- **E13-S4-T6** — Whale-watching moment — A rare high-weight "whale" boom with a bespoke banner and a Savvy XP bonus, tied to story beat 14 *Whale Watching*.
- **E13-S4-T7** — Event log — Keep a short ring buffer of recent events for the UI ("last 5 market moves") and for QA inspection via `window.IV`.
- **E13-S4-T8** — Upside perk hook — Crypto branch perk raises boom magnitude (the "market-event upside +"); implement as an `eventMult` bonus read from `story.branch==='crypto'`.
- **E13-S4-T9** — Seed reproducibility — Same `(seed, cursor)` yields the same lifetime event stream; expose `market.seed` in the debug panel so a run can be replayed exactly.
- **E13-S4-T10** — Balance sanity — Ensure the expected value of `marketMult` over time is ≈1.0–1.1 (slight positive drift) so the market is exciting but never free money.

## E13-S5 — Laptop-On-A-Lounger (crypto amenity cluster)
_As a Dutchman working from a pool bed, I want silly trader-lifestyle upgrades, so that there's a cheap new toy every minute plus a Comfort bump._  Small-wins cadence for the crypto stage.
- **E13-S5-T1** — Define crypto amenities — Add to `data/amenities.js`: `laptop_cooling_fan`, `waterproof_keyboard`, `mai_tai_iv_drip`, `spf_screen_hood`, `mechanical_keyboard`, `umbrella_second_monitor`, each `{costBase,costGrowth:1.5,comfort,xMult,tag:'crypto'}`.
- **E13-S5-T2** — Wire via generic buy — Reuse `engine.buyAmenity(id)`; no bespoke code, ramp ≈2× per step.
- **E13-S5-T3** — Comfort contribution — Feed their `amenityScore` into `ComfortRaw`; confirm the saturating Comfort cap still holds.
- **E13-S5-T4** — Targeted multiplier — Small `xMult` scoped to crypto tiers via `L_path` so the cluster nudges the path it belongs to.
- **E13-S5-T5** — Unlock reveals — Gate each behind the previous + a Comfort threshold; emit `unlock` toasts.
- **E13-S5-T6** — Flavor copy — Wry one-liners ("mai-tai IV drip: hydration is a hedge too").
- **E13-S5-T7** — UI buttons — Show name/cost/owned/next-Comfort delta per the standard amenity button.
- **E13-S5-T8** — Cadence check — Confirm one is affordable ~every 60–90s of active crypto play via the harness purchase log.
- **E13-S5-T9** — Save/migration — Persist amenity levels; default 0 for old saves.
- **E13-S5-T10** — QA — Zero-cash, rapid-buy spam, Comfort recompute, no free offline amenities.

## E13-S6 — The Crypto Cabana (accommodation step)
_As a newly-liquid lounger, I want to graduate to a premium poolside cabana, so that my rising net worth shows in where I lounge._  The tier-11-band cabana reveal for the crypto lane.
- **E13-S6-T1** — Cabana tier entry — Add the crypto-flavored cabana as an accommodation reveal in the tier-11 band of `accommodation.js` with `accScore = ACC.base · ACC.growth^t`.
- **E13-S6-T2** — Comfort gate — Set its `ACC.unlock[]` threshold to line up with `STORY_GATES` for the branch-era Comfort target.
- **E13-S6-T3** — Net-worth soft gate — Additionally require a `totalCash`/portfolio threshold so the cabana feels *earned by the market* — flavor-appropriate.
- **E13-S6-T4** — accScore jump — Verify the step is a felt ~2.6× Comfort bump and doesn't overshoot the ladder.
- **E13-S6-T5** — Reveal beat text — Wry copy: the concierge upgrades you the moment your portfolio pumps ("your money, it seems, has better manners than you do").
- **E13-S6-T6** — Hook to next tier — End the reveal teasing E14's Grand Luxury Wing so lanes stay aware of each other.
- **E13-S6-T7** — Unlock event — Emit `unlock` + `story:beat` wiring so the UI swaps the backdrop label.
- **E13-S6-T8** — `L_comfort` recompute — Confirm the new tier flows into `L_comfort = 1 + COMFORT_MULT · log10(1 + Comfort/C0)` correctly.
- **E13-S6-T9** — Save/migration — Persist `accommodation.tier`/`ownedTiers`; default old saves to their prior tier.
- **E13-S6-T10** — QA — Assert the gate can't be skipped and re-entering the tier doesn't double-count Comfort.

## E13-S7 — Whale Watching (crypto branch flavor)
_As a committed Poolside Lounger, I want branch-exclusive perks and a *Whale Watching* beat, so that choosing crypto feels distinct and rewarding._  Branch identity + the beat-14 variant.
- **E13-S7-T1** — Branch perk: Savvy ×1.3 — When `story.branch==='crypto'`, multiply the Savvy passive by 1.3 per the branch definition.
- **E13-S7-T2** — Branch perk: upside+ — Raise boom `eventMult` for the crypto branch (the "market-event upside +" perk).
- **E13-S7-T3** — Beat 14 *Whale Watching* — Author the crypto variant beat text (≤90 words, wry, ending on a hook toward logistics) in `story.js`.
- **E13-S7-T4** — Beat gate — Require `paths.crypto.points ≥ P1` (from `config.STORY_GATES`) to fire beat 14's crypto line.
- **E13-S7-T5** — Choice → flag — The beat's choice sets `flags.whaleWatched`, granting a one-time Savvy XP boost + crypto path points.
- **E13-S7-T6** — Hybrid line — Add a bonus line if crypto *and* vlogger ≥ P1 ("livestreaming a liquidation is content, technically").
- **E13-S7-T7** — Unshakeable synergy note — Surface in-beat that the `Unshakeable` tree node halves crash pain, teasing ascension synergy.
- **E13-S7-T8** — Path-points source — Award crypto path points from crypto spend + surviving crashes so the lane self-feeds.
- **E13-S7-T9** — Cosmetic badge — Grant a crypto branch badge (a tiny green candlestick) via `ui:branchBadge` on beat completion.
- **E13-S7-T10** — QA — Verify a non-crypto player still passes beat 14 via its neutral fallback (no build stranded).

## E13-S8 — Taming the Volatility (balance & tuning)
_As the balance owner, I want the crypto lane fit to the pacing curve, so that passive income supports the 20h arc without trivializing it._  Constants fit to targets.
- **E13-S8-T1** — Fit `SAVVY_YIELD` — Tune so mid-Act-II passive is ~15–30% of active income (supportive, not dominant).
- **E13-S8-T2** — Confirm the sqrt softcap — Verify `SAVVY_CASH_EXP = 0.5` keeps passive sub-linear versus net worth across a full harness run.
- **E13-S8-T3** — Event cadence — Set `MARKET.eventEveryRange` so a boom/crash lands every ~3–6 min of active play (drama without chaos).
- **E13-S8-T4** — EV calibration — Tune boom/crash weights + ranges so long-run `E[marketMult] ≈ 1.05`; assert via a 20h harness pass.
- **E13-S8-T5** — Variance feel — Tune `MARKET.variance` so the ticker is lively but a crash never erases more than a few minutes of gains after hedges.
- **E13-S8-T6** — Hedge value — Price `HEDGES` so buying them is a real ROI choice, not mandatory; check break-even versus unhedged variance.
- **E13-S8-T7** — Path softcap — Confirm `PATH.rate`/`PATH.softcapExp = 0.85` keeps crypto points from runaway scaling.
- **E13-S8-T8** — Harness beat time — Run the greedy-ROI harness; confirm beat 14 lands near its `T_target` from `docs/05 §1`.
- **E13-S8-T9** — Golden file — Commit the crypto-lane milestone curve as a golden fixture so future edits catch regressions.
- **E13-S8-T10** — Cross-lane parity — Compare crypto versus vlogger/connoisseur time-to-beat-14 so no branch is strictly best.

## E13-S9 — Money Tans While You Sleep (save & offline)
_As a player who closes the tab, I want the market to have run fairly while I was away, so that passive income and events are correct and deterministic offline._  Correct, generous, reproducible offline crypto.
- **E13-S9-T1** — Extend the state schema — Add `state.market = {seed,cursor,phase,mult,expiry,eventLog}` and `state.crypto.holdings{}`; bump `state.version`.
- **E13-S9-T2** — Migration function — Add `MIGRATIONS[N]` that seeds `market.seed` (from `meta.createdAt`), zeroes holdings, and sets `phase:'calm'` for old saves.
- **E13-S9-T3** — Offline market replay — In the offline macro-step loop, advance the *same* seeded scheduler so away-events match what live play would have produced.
- **E13-S9-T4** — Offline passive integration — Integrate `savvyPassive · marketMult` across `OFFLINE_STEPS` chunks; use the closed-form fast-path when no purchases occurred.
- **E13-S9-T5** — Cap fairness — Respect `OFFLINE_CAP` (12h) and round in the player's favour; never let an offline crash cost more than a live one would.
- **E13-S9-T6** — Cursor persistence — Persist `market.cursor` so reloading mid-run never re-rolls the same event (no seed-replay exploit).
- **E13-S9-T7** — Away summary — Add crypto lines to the "While you were away…" modal: "+cash from tanning money, N market events survived."
- **E13-S9-T8** — Export/import — Ensure market + holdings survive the base64 export-string round-trip.
- **E13-S9-T9** — Backup safety — Confirm the rotating `...backup` save also carries the new fields; malformed input keeps the current save.
- **E13-S9-T10** — Migration test — Load a v(previous) fixture; assert crypto fields initialise without NaN and passive income starts at 0 until Savvy > 0.

## E13-S10 — Diamond Hands, Clean Code (QA & polish)
_As a QA-minded builder, I want the crypto lane hardened and juicy, so that it never NaNs, never dupes cash, and feels satisfying._  Shipping-quality crypto.
- **E13-S10-T1** — Passive-income unit tests — Assert `savvyPassive` returns 0 at Savvy L0, scales as sqrt with cash, and is pure.
- **E13-S10-T2** — Market-determinism test — Same seed + cursor over 1000 events yields identical streams across two runs.
- **E13-S10-T3** — Crash-floor test — Assert no event, even undamped, drives `marketMult ≤ 0` or cash negative.
- **E13-S10-T4** — Hedge-math test — Verify `Unshakeable` + `stablecoin` stack toward but never past full crash immunity.
- **E13-S10-T5** — Edge: zero cash — Passive with `totalCash = 0` yields 0 (no `sqrt(0)` weirdness), no divide-by-zero in the EV calc.
- **E13-S10-T6** — Ticker juice — Add a subtle number roll + colour pulse on `marketMult` change, gated by `prefers-reduced-motion`.
- **E13-S10-T7** — Boom/crash feedback — Emit distinct `unlock`-style toasts for boom versus crash so the drama reads without audio.
- **E13-S10-T8** — Debug hooks — Add debug-panel buttons: force-boom, force-crash, set Savvy level, reseed market.
- **E13-S10-T9** — Console QA — Expose a `window.IV.market` snapshot + a `harness.crypto()` milestone dump.
- **E13-S10-T10** — Formatting pass — Verify large portfolio values format cleanly and the ticker never overflows its container.

## Definition of Done (epic)
- [ ] `data/crypto.js`, `config.MARKET`, and `config.SAVVY_YIELD` shipped; all crypto content is data.
- [ ] Savvy passive `dCash/dt += savvyL · SAVVY_YIELD · sqrt(totalCash)` live and sqrt-softcapped.
- [ ] Seeded market events (boom/crash/chop) fire deterministically from `util.rng(seed, cursor)`.
- [ ] Portfolio panel, live ticker, event banner, and hedge purchases render and buy via generic flows.
- [ ] Crypto amenity cluster hits the ~60–90s small-win cadence.
- [ ] Crypto Cabana tier reveal gated on Comfort + net worth.
- [ ] Crypto branch perks (Savvy ×1.3, upside+) and beat 14 *Whale Watching* land; neutral fallback verified.
- [ ] `Unshakeable` crash-damping synergy implemented.
- [ ] Constants tuned so `E[marketMult] ≈ 1.05` and beat 14 hits its `T_target`; golden file committed.
- [ ] Offline market replay deterministic; migration from the previous version passes with no NaN.
- [ ] Tests green: passive purity, event determinism, crash floor, hedge math, formatting.
