# E01 — Soggy Departure
> Act I: Soggy Beginnings · Tier 0 (The Soggy Shed) · Core idle loop + `state` + save/load + first currency (cash) + tier D1 + number formatting · Beat 1 (*Rain Check*) · Neutral path

**Epic goal:** Stand up the entire core idle loop end-to-end — canonical `state`, a fixed-timestep tick engine, the first generator tier `D1`, cost/production/milestone math, save/load, and number formatting — so a drizzled-on Dutch tourist can earn cash at a bus stop and buy their way toward the worst "motel" on Earth.
**Player-visible outcome:** A running game: cash ticks up on its own, a single "Odd Jobs" buy-button grows income, numbers are readable, the first milestone `×2` lands, progress survives a reload, and beat 1 (*Rain Check*) sets the scene.
**Systems touched:** `js/state.js`, `js/config.js`, `js/engine.js` (tick/production/cost), `js/ui.js`, `js/save.js`, `js/util.js` (formatter), `js/data/story.js` (beat 1), `js/accommodation.js` (tier-0 stub), balance harness scaffold.
**Math/balance notes:** Establishes `GEN.base[0]=15`, `GEN.growth[0]=1.07`, `GEN.perUnit[0]=1`; `TICKS_PER_SEC=20`, `AUTOSAVE_SEC=15`, `MILESTONE_STEP=10` (⇒ `milestoneMult=2^floor(bought/10)`), `OFFLINE_CAP=12h`. Reproduces the worked example in `docs/01 §2` (at `bought=50`, `prod_1=1600` cash/s). Reserves `ACC.base`/`ACC.growth≈2.6` placeholders for the ladder that E02 activates.

## E01-S1 — The Shed Ledger (data model)
_As a developer, I want one typed `state` object plus a `config.js` of tunable constants, so that every later system reads and writes a single source of truth and balancing is data, not code._  The spine everything else hangs off.
- **E01-S1-T1** — Define the `state` root — Create `js/state.js` exporting `newGame()` returning `{version, resources:{cash:0}, generators:[], accommodation:{tier:0}, story:{flags:{},branch:null,seen:[]}, stats:{}, meta:{createdAt,lastSeen}}`; this canonical shape is the only object modules mutate.
- **E01-S1-T2** — Seed the D1 generator slot — Push a single `{id:'d1', bought:0, count:0}` entry into `state.generators` so the engine and buy-button have a tier to operate on before D2–D8 exist in E03.
- **E01-S1-T3** — Create the config skeleton — Add `js/config.js` with `GEN={base:[15],growth:[1.07],perUnit:[1]}`, `TICKS_PER_SEC=20`, `AUTOSAVE_SEC=15`, `MILESTONE_STEP=10`, `OFFLINE_CAP=12*3600`; only index 0 is populated now, arrays grow in later epics.
- **E01-S1-T4** — Register the cash currency — Add a `resources` helper (`addCash`, `spendCash`, `getCash`) so all currency mutation goes through one guarded path that forbids negative balances, keeping the ledger honest.
- **E01-S1-T5** — Stamp a save version — Set `state.version = 1` and centralize the number in config so the E02+ migration switchboard has a value to branch on.
- **E01-S1-T6** — Add meta timestamps — Initialize `meta.createdAt = meta.lastSeen = now` at `newGame()`; `lastSeen` is the anchor offline progress (S9) measures elapsed time against.
- **E01-S1-T7** — Reserve the story slice — Seed `story.flags={}`, `story.branch=null`, `story.seen=[]` so beat 1 (S7) and every later narrative gate have somewhere to record state without a schema change.
- **E01-S1-T8** — Reserve the accommodation stub — Seed `accommodation.tier=0` ("Soggy Shed") so the ladder module (S6) has a starting rung and later epics only add tiers, never reshape the field.
- **E01-S1-T9** — Add pure selectors — Write read-only accessors (`getGen(id)`, `getCashPerSec(state)`) that never mutate, so UI and the harness can query derived values without duplicating formulas.
- **E01-S1-T10** — QA the schema — Add a unit test that deep-freezes a fresh `newGame()` and asserts every required key/type is present, catching accidental shape drift as later epics extend `state`.

## E01-S2 — Rain Never Stops (core logic / tick engine)
_As a player, I want the game to advance by itself on a steady clock, so that cash accumulates whether I tap or just wait in the drizzle._  The heartbeat of the whole game.
- **E01-S2-T1** — Build the fixed-timestep loop — Implement `engine.run()` using `requestAnimationFrame` with a time accumulator that calls `tick(dt)` at exactly `TICKS_PER_SEC=20`, so simulation is framerate-independent and deterministic.
- **E01-S2-T2** — Implement production — Code `prod_1 = count_1 · perUnit_1 · M_1` (with `M_1` fully computed but currently only `milestoneMult`), the formula from `docs/01 §1.1` that turns owned units into output.
- **E01-S2-T3** — Integrate cash over dt — In `tick(dt)` add `dCash/dt = prod_1` as `resources.cash += prod_1 · dt`, so cash grows continuously rather than in visible jumps.
- **E01-S2-T4** — Implement the cost curve — Add `cost_1(n)=GEN.base[0]·GEN.growth[0]^n` per `docs/01 §1.2`, the geometric sink that paces how fast the player can buy the next unit.
- **E01-S2-T5** — Implement the buy action — Write `engine.buy('d1')` that checks affordability against `cost_1(bought)`, deducts cash, increments `bought` and `count`, so purchases are a single guarded transaction.
- **E01-S2-T6** — Add milestone doublings — Compute `milestoneMult=2^floor(bought/MILESTONE_STEP)` inside `M_1` so every 10th unit permanently doubles the tier, the game's core dopamine beat.
- **E01-S2-T7** — Expose the rate readout — Add `getCashPerSec()` returning current `prod_1` for the UI subline, so the player always sees the consequence of their last purchase.
- **E01-S2-T8** — Clamp and pause dt — Cap per-tick `dt` and pause accumulation on `document.hidden` (visibilitychange), preventing a giant catch-up spike when a backgrounded tab refocuses (offline handles that path instead).
- **E01-S2-T9** — Keep tick pure — Forbid `Date.now()` inside `tick`; time enters only as the `dt` argument, so the same function runs identically online, offline (S9), and in the harness (S8).
- **E01-S2-T10** — QA against the worked example — Add a test replaying `docs/01 §2`: at `bought=50`, `count=50`, `milestoneMult=32` ⇒ `prod_1=1600` cash/s; assert to confirm the math matches the spec.

## E01-S3 — One Sad Button (UI / buttons)
_As a player, I want to see my cash and click one button to earn more, so that the loop is legible from the very first second._  The minimal, honest interface.
- **E01-S3-T1** — Render the cash header — Show current cash top-of-screen, piped through `util.format` (S8) so even early integers read cleanly and large numbers won't overflow later.
- **E01-S3-T2** — Render the D1 buy-button — Draw the "Odd Jobs" button showing name, next cost, and owned count, the single interactive element of the epic.
- **E01-S3-T3** — Gate button state on affordability — Enable/disable the button by comparing cash to `cost_1(bought)` each paint, so the player never clicks a purchase they can't afford.
- **E01-S3-T4** — Show the cash/s subline — Display `getCashPerSec()` under the header so the effect of buying is immediately visible, reinforcing the loop.
- **E01-S3-T5** — Add the next-milestone hint — Render "next ×2 in N buys" from `MILESTONE_STEP − (bought%10)`, giving the player a constant, visible short-term target.
- **E01-S3-T6** — Lay out the rainy theme — Add minimal CSS: a grey, damp palette and single-column layout, establishing the wry Dutch-weather mood without heavy assets.
- **E01-S3-T7** — Wire the click handler — Bind the button to `engine.buy('d1')` and repaint, keeping UI a thin dispatcher over engine actions (no game logic in the DOM layer).
- **E01-S3-T8** — Decouple paint from tick — Run rendering on its own `rAF` at ~30fps reading state, separate from the 20Hz sim, so heavy repaint never slows the economy.
- **E01-S3-T9** — Make it keyboard-accessible — Ensure the button is focusable and fires on Enter/Space with an ARIA label, so the game is playable without a mouse.
- **E01-S3-T10** — QA click-spam integrity — Test rapid clicking to confirm `bought`, `count`, and `cash` never desync and no purchase happens below cost.

## E01-S4 — Odd Jobs in the Drizzle (headline: the first cash trickle)
_As a soggy tourist, I want to do odd jobs at the bus stop for a trickle of cash, so that the idle loop actually produces money and pulls me forward._  The signature moment: the game earns for you.
- **E01-S4-T1** — Theme D1 as "Odd Jobs" — Name and flavor the D1 generator ("hand out flyers under an umbrella") so the first mechanic has a wry, on-brand identity.
- **E01-S4-T2** — Wire the full loop end-to-end — Connect buy → produce → afford-next so a player can bootstrap from the first affordable unit into self-sustaining growth with no dead ends.
- **E01-S4-T3** — Lock in the D1 constants — Set `GEN.base[0]=15`, `GEN.growth[0]=1.07`, `GEN.perUnit[0]=1` exactly per `docs/01`, the tuned values the whole early curve depends on.
- **E01-S4-T4** — Solve the cold-start — Guarantee the first `15`-cash unit is reachable via the beat-1 grant (a small starting stipend) and/or the S5 tap, so a fresh game is never stuck at zero income.
- **E01-S4-T5** — Flash milestone feedback — Trigger a brief highlight when `bought` crosses a multiple of 10 and income doubles, making the free-power moment felt, not silent.
- **E01-S4-T6** — Prove idleness — Verify that leaving the game untouched grows cash as the degree-1 polynomial of `docs/01 §1.1`, confirming the "earns while away" promise holds even with one tier.
- **E01-S4-T7** — Format small-to-mid numbers — Ensure cash reads as integers, then `k`, then `M` cleanly across the D1 range so early progress never looks like a wall of digits.
- **E01-S4-T8** — Log time-to-next-unit — Emit a telemetry value for seconds-until-next-affordable-unit, the pacing signal the harness (S8) tunes against.
- **E01-S4-T9** — Add a generator tooltip — Write hover/tap flavor for Odd Jobs ("The rain files your taxes for you.") to seed the game's voice.
- **E01-S4-T10** — QA the onset — Test that from `newGame()` the first D1 unit becomes affordable within the target seconds window, catching regressions in `base`/grant tuning.

## E01-S5 — Tap for Warmth (small-wins cluster: the optional clicker)
_As an impatient player, I want to tap something to earn a little extra, so that active play feels rewarding without ever being required._  The optional active hook that respects the idle floor.
- **E01-S5-T1** — Add the tap action — Implement `engine.tap()` granting a small flat cash amount, giving players a way to nudge the very early game before income ramps.
- **E01-S5-T2** — Define the tap value — Set tap yield to a small multiple of `perUnit_1` (e.g. `1×`) that grows gently with current cash/s, so tapping stays relevant early but never dominates.
- **E01-S5-T3** — Render the tap target — Make the poncho/umbrella a large, satisfying click surface, distinct from the buy-button so the two actions never collide.
- **E01-S5-T4** — Add tap feedback — Show a rain-splash particle and a `+N` popup on each tap, providing the tactile juice that makes clicking feel worthwhile.
- **E01-S5-T5** — Guarantee the idle floor — Assert in code and test that tapping is strictly additive and never a gate; the game must be fully completable purely idle.
- **E01-S5-T6** — Soft-cap tap spam — Cap effective tap value per second so an autoclicker can't trivialize the economy, keeping active play a bonus, not an exploit.
- **E01-S5-T7** — Reserve the energy hook — Add an unused `stats.energy` field the tap can later consume (fuel for E10's clicker), wiring the seam now without spending it.
- **E01-S5-T8** — Track tap stats — Increment `stats.taps` per tap for later achievements and the stats screen, so lifetime engagement is measurable.
- **E01-S5-T9** — Write tap flavor — Add lines like "You shake the rain off your sleeves. +cash." to keep the tone wry and Dutch.
- **E01-S5-T10** — QA tap/idle coexistence — Test that taps and passive income never double-count into `cash` within the same tick and totals stay exact.

## E01-S6 — A Roof, Technically (accommodation / progression step)
_As a tourist, I want to leave the bus stop for an actual "motel," so that there's a first destination to earn toward and the ladder begins._  The first rung of the shed→island climb.
- **E01-S6-T1** — Add the tier-0 data — Create the `accommodation` ladder with tier 0 "The Soggy Shed" (a motel in name only) in `js/accommodation.js`, the ladder E02+ extends upward.
- **E01-S6-T2** — Stub `accScore` — Compute `accScore = ACC.base · ACC.growth^tier` (with `ACC.growth≈2.6` placeholder) returning the tier-0 value; the full Comfort consumer arrives in E02.
- **E01-S6-T3** — Seed the tier-up gate — Add a cash-cost gate to move off the bus stop into the shed as a temporary trigger (Comfort gating replaces it in E02), so progression has a first threshold.
- **E01-S6-T4** — Implement the one-time transition — Write a guarded "depart the bus stop" action that sets `accommodation.tier=0`→ occupied exactly once and can't be re-triggered.
- **E01-S6-T5** — Write the reveal copy — Author the shed arrival text (the leaking roof, the smell) in the Dutch-abroad voice to reward reaching the first tier.
- **E01-S6-T6** — Hook the story flag — On arrival, set a `story.flags.inShed` flag so beat 1/2 and later gates can key off accommodation state.
- **E01-S6-T7** — Add ACC config placeholders — Put `ACC={base, growth:2.6, unlock:[]}` in config so E02 tunes real values without introducing the constant later.
- **E01-S6-T8** — Show the current place — Render the current accommodation name in the UI header so the player always knows which rung they're on.
- **E01-S6-T9** — Keep the tier index forward-compatible — Ensure the integer `tier` is the single index driving the ladder table in `docs/03`, so no epic needs to rename tiers.
- **E01-S6-T10** — QA the transition — Test that the shed transition fires once, persists across reload, and can't be replayed to farm any grant.

## E01-S7 — Rain Check (story scaffold / beat 1)
_As a player, I want an opening scene that frames my sorry situation, so that the numbers have narrative stakes from the first minute._  The narrative skin over the math spine.
- **E01-S7-T1** — Create the story module — Add `js/data/story.js` holding beats as pure data, so all narrative is localizable and separated from logic per `docs/02`.
- **E01-S7-T2** — Define the beat schema — Establish `{id, requires, text, choices[], grants, unlocks}` and validate it, the shape every one of the 30 beats will use.
- **E01-S7-T3** — Write beat 1 text — Author *Rain Check* (≤90 words): a broke, drizzled-on Dutch tourist with a poncho and a stroopwafel, ending on a hook toward the shed.
- **E01-S7-T4** — Set beat 1's requires — Gate beat 1 on `requires: newGame`, so it fires immediately on a fresh save and nowhere else.
- **E01-S7-T5** — Define beat 1's grants — Grant a small starting cash stipend and unlock the D1 buy-button, solving the cold-start (S4-T4) narratively.
- **E01-S7-T6** — Build the story engine — Add a per-tick pass that checks unmet beats' `requires` against state and fires the first satisfied one, the mechanism all 30 beats run on.
- **E01-S7-T7** — Seed flags and branch — Confirm the engine reads/writes `story.flags` and leaves `story.branch=null` (branch choice isn't until E11), keeping Act I on the shared spine.
- **E01-S7-T8** — Build the beat modal — Create a dismissable modal that renders `text` and any `choices`, recording dismissal in `story.seen` so a beat never re-pops.
- **E01-S7-T9** — Keep text data-only — Ensure no beat prose is hardcoded in logic, so the whole storyline is later localizable by swapping the data file.
- **E01-S7-T10** — QA beat 1 firing — Test that beat 1 fires exactly once on new game, its grant applies once, and its "seen" state survives reload.

## E01-S8 — Counting Guilders (balance & tuning + number formatting)
_As a developer, I want readable numbers and a tuned early curve backed by the harness, so that the game is legible and paces correctly before any content piles on._  Making the economy honest and readable.
- **E01-S8-T1** — Build the formatter — Write `util.format(N)` with `k/M/B/T/…` suffixes, fixed significant digits, and small-integer passthrough, the single number-rendering path for the whole game.
- **E01-S8-T2** — Wire formatting everywhere — Route every UI readout (cash, rate, cost) through `util.format` so no raw floats ever reach the screen.
- **E01-S8-T3** — Finalize loop constants — Lock `TICKS_PER_SEC=20` and `AUTOSAVE_SEC=15` after confirming smooth simulation and acceptable save frequency.
- **E01-S8-T4** — Seed the harness policy — Implement the "buy cheapest positive-ROI upgrade" simulated player from `docs/01 §10` at `GAME_SPEED=∞`, reporting achieved beat times.
- **E01-S8-T5** — Verify curve shape — Run the D1-only harness and confirm cash grows monotonically with no cliffs, matching the polynomial expectation.
- **E01-S8-T6** — Tune the growth window — Keep `GEN.growth[0]` in the 1.06–1.08 "cheap, spammy" band and confirm the early spend cadence feels generous, not grindy.
- **E01-S8-T7** — Add the GAME_SPEED knob — Expose `GAME_SPEED` for QA/pacing only, documented as never a balance lever, so testers can fast-forward without changing tuning.
- **E01-S8-T8** — Sanity-check beat-1 timing — Confirm `T_target(beat 1)` is effectively immediate, since beat 1 fires on new game.
- **E01-S8-T9** — Capture a golden snapshot — Record the D1 cost/production curve as a regression golden file so later refactors can't silently shift early pacing.
- **E01-S8-T10** — QA formatter edges — Test `util.format` on 0, 999, 1000, 1e6, 1e-3, and guard against NaN/negative display, since these render constantly.

## E01-S9 — Don't Lose the Poncho (save / load / offline seed)
_As a player, I want my progress to persist and to earn a little while away, so that closing the tab doesn't wash away my sad little empire._  Durability from day one.
- **E01-S9-T1** — Serialize to localStorage — Write `save.write()` serializing `state` to JSON under key `idleVacation`, the persistence backbone.
- **E01-S9-T2** — Deserialize and validate on boot — Read and shape-check the save on load, falling back to `newGame()` if keys are missing, so a bad save never bricks the game.
- **E01-S9-T3** — Autosave on a timer and on hide — Save every `AUTOSAVE_SEC` and on `visibilitychange→hidden`, minimizing lost progress without thrashing storage.
- **E01-S9-T4** — Add the migration switchboard — Route loads through a `migrate(save)` keyed on `version` (a no-op at v1) so E02+ can upgrade old saves in one place.
- **E01-S9-T5** — Stamp lastSeen on save — Update `meta.lastSeen=now` on every write, the timestamp offline elapsed is measured from.
- **E01-S9-T6** — Compute offline elapsed — On load, `elapsed = clamp(now − lastSeen, 0, OFFLINE_CAP=12h)` per `docs/01 §7`, bounding away-time generously but finitely.
- **E01-S9-T7** — Apply offline progress — Advance the real `engine.tick(dt)` over `OFFLINE_STEPS` macro-steps so offline uses identical math to online (no bespoke offline economy).
- **E01-S9-T8** — Show a "while you were away" stub — Display a simple summary modal with cash earned since last seen, the seed E02 expands with amenities/Comfort.
- **E01-S9-T9** — Guard corrupt saves — Wrap parse in try/catch; on failure back up the raw string and start fresh, so a partial write never loops on error.
- **E01-S9-T10** — QA persistence and offline — Test that reload preserves cash/bought exactly and that offline progress is never negative and never awards free purchases.

## E01-S10 — Wringing It Out (QA / polish / juice)
_As a player, I want a solid, snappy first impression, so that even a game about a leaking shed feels intentional and cared-for._  Turning the skeleton into something that feels alive.
- **E01-S10-T1** — Add a dev hard-reset — Provide a guarded reset button that wipes the save and reloads, so QA and players can restart cleanly.
- **E01-S10-T2** — Tune number popups — Polish the `+N` popup timing, easing, and fade so feedback reads clearly without cluttering the screen.
- **E01-S10-T3** — Add rainy ambience — Layer a subtle drip/grey-gradient animation to sell the sodden Dutch mood on the cheap.
- **E01-S10-T4** — Add a first-run nudge — Show a one-time "tap or just wait — money comes either way" hint so new players grasp the idle premise instantly.
- **E01-S10-T5** — Budget tick performance — Profile `tick` to keep it well under one frame's time with no per-tick allocations, preventing GC hitches.
- **E01-S10-T6** — Verify storage cross-browser — Confirm localStorage save/load works in the target browsers and degrades gracefully if storage is disabled.
- **E01-S10-T7** — Unit-test the core formulas — Add tests for `cost_1`, `prod_1`, and `milestoneMult` covering boundary buys (0, 9, 10, 50).
- **E01-S10-T8** — Add an integration test — Simulate new game → buy 10 units → assert the first `×2` milestone applied and rate doubled.
- **E01-S10-T9** — Add an error boundary — Catch and surface engine/render errors without a blank screen, and keep the console clean in normal play.
- **E01-S10-T10** — Polish accessibility and mobile — Verify tap targets meet minimum size, focus order is sane, and text is legible on a phone.

## Definition of Done (epic)
- Core loop runs at a fixed 20Hz timestep; cash accrues idle and the "Odd Jobs" D1 generator can be bought, milestones double income at every 10th unit.
- `state`, `config.js`, `engine`, `ui`, `save`, and `util.format` exist and are wired; `state` schema is frozen-tested.
- The worked example from `docs/01 §2` reproduces exactly (`bought=50` ⇒ `prod_1=1600` cash/s) in a passing test.
- Save/load persists across reload; autosave runs on timer and on tab-hide; offline progress applies via the real tick, clamped to `OFFLINE_CAP` and never negative or free.
- Beat 1 (*Rain Check*) fires once on new game, grants the starting stipend, and sets the scene; the beat modal and story engine work off pure data.
- The optional tap is purely additive with an enforced idle floor and a spam soft-cap.
- Numbers render through `util.format` everywhere; formatter edge cases are tested.
- The balance harness scaffold runs the ROI policy at `GAME_SPEED=∞` and a golden file guards the D1 curve.
- Unit + integration tests pass; the game is keyboard-accessible and playable on mobile.
