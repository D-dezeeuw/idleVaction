# E25 — Letting Go
> Act III meta-loop · Tier n/a (ascension, no accommodation step) · New systems: `prestige.js`, Legacy currency, run-reset · Story beat 26 (*Letting Go*) · Build-path emphasis: neutral (all branches ascend)

**Epic goal:** Ship the first prestige loop — let the weary tourist "shed the old self," wipe the run for permanent **Legacy**, and learn that resetting is progress, not loss.
**Player-visible outcome:** An **Ascend** panel with a live "ascend now → +N Legacy" readout, an ROI break-even hint, and a one-click reset that keeps meta and hands back a stronger fresh run.
**Systems touched:** `prestige.js` (new), `state.resources.legacy`, `state.ascension`, `state.stats.lifetimeCash`, `engine.js` unlock checks, `math.js` (`L_ascension`), `data/story.js` beat 26, `config.js` (`LEGACY_K`/`LEGACY_SCALE`/`LEGACY_EXP`), `ui.js`.
**Math/balance notes:** `legacyGain = floor(LEGACY_K·(stats.lifetimeCash/LEGACY_SCALE)^LEGACY_EXP) − legacyBanked` with `LEGACY_K=1, LEGACY_SCALE=1e6, LEGACY_EXP=0.5` (sqrt anti-runaway: 4× run → 2× reward); first unlock gated on ROI break-even + `ASCEND_AGE_FLOOR`; one seeded Legacy sink feeds `L_ascension = 1 + 0.10·rank`.

## E25-S1 — The Ledger of a Life Well-Lounged (data model)
_As a returning tourist, I want the game to know exactly what's "mine forever" versus "just this trip," so that ascending never eats the progress I earned to keep._  A clean run-vs-meta partition is the backbone of every prestige feature.
- **E25-S1-T1** — Add legacy resource — Add `legacy: 0` to `state.resources` and mark it in the state comment block as a meta currency that survives every ascension.
- **E25-S1-T2** — Define ascension state block — Formalize `state.ascension = { count, legacySpent, tree, legacyBanked }`; `legacyBanked` records Legacy already paid out this tree so re-ascending only grants the delta.
- **E25-S1-T3** — Author the reset manifest — In `prestige.js` declare `RUN_KEYS = ['resources.cash','resources.comfort','resources.clout','generators','amenities','accommodation','skills','paths']` and `META_KEYS = ['resources.legacy','ascension','story','settings','stats']` as the single source of truth for wipe vs persist.
- **E25-S1-T4** — lifetimeCash stat — Ensure `stats.lifetimeCash` accumulates every cash gain (online and offline) and is NEVER reset by ascension, since it is the sole input to `legacyGain`.
- **E25-S1-T5** — Config constants — Add `LEGACY_K=1`, `LEGACY_SCALE=1e6`, `LEGACY_EXP=0.5` to `config.js` with a comment citing the worked example (`1e9 cash → +31 Legacy`).
- **E25-S1-T6** — Seed spend-sink datum — Define `ASCEND_MULT_NODE = { id:'compounding', costBase:2, costGrowth:1.6, effect:'L_ascension +0.10/rank' }` so E25 has somewhere to spend Legacy before E26's full tree.
- **E25-S1-T7** — Story beat 26 data — Add beat 26 (*Letting Go*) to `data/story.js` with `requires:{ ascensionReady:true }`, wry Dutch text about "letting go of a motel you grew to hate," and `unlocks:['ui:ascendPanel']`.
- **E25-S1-T8** — Ascension-ready flag — Add derived `story.flags.ascensionReady`, set by the engine when ROI break-even is met, so the beat and the UI both gate off one boolean.
- **E25-S1-T9** — Reset-summary schema — Define the post-ascension summary shape `{ legacyGained, runDuration, lifetimeCash, bestComfort }` the UI will render on the `ascend` event.
- **E25-S1-T10** — Content pass — Write the wry Dutch-tourist microcopy for the currency ("Legacy — what the trip made of you") and hover-help strings, each ≤ 90 words per the tone guide.

## E25-S2 — The Great Unpacking (core logic / engine)
_As a player pressing Ascend, I want the reset to be exact, safe, and reversible-in-spirit, so that I trust the button that throws my whole run away._  The reset transaction is the riskiest code in the game and must be surgically correct.
- **E25-S2-T1** — Implement legacyGain() — In `prestige.js` write pure `legacyGain(state) = floor(LEGACY_K·(stats.lifetimeCash/LEGACY_SCALE)^LEGACY_EXP) − ascension.legacyBanked`, clamped to ≥ 0.
- **E25-S2-T2** — Implement ascend() transaction — Compute the gain, credit `resources.legacy += gain`, set `legacyBanked += gain`, then wipe `RUN_KEYS` to new-game defaults while leaving `META_KEYS` untouched.
- **E25-S2-T3** — Fresh-run reseed — After the wipe, call `state.newRunDefaults()` so generators/amenities/accommodation/skills/paths return to tier-0 starting values.
- **E25-S2-T4** — Order-of-operations guard — Apply meta effects (`L_ascension`, and later the E26 tree seeds) AFTER reseed so a fresh run starts pre-boosted rather than zeroed over the boost.
- **E25-S2-T5** — Break-even detector — Implement `ascensionROI(state)` returning the projected time to recover the current run's income at post-ascension power, and derive `readyToAscend = legacyGain ≥ 1 && runAgeSec ≥ ASCEND_AGE_FLOOR`.
- **E25-S2-T6** — Run-age floor — Add `ASCEND_AGE_FLOOR = 600` (seconds) to `config.js` so nobody ascends by accident in the first minutes; document the rationale in a comment.
- **E25-S2-T7** — Emit prestige events — Fire `engine.emit('ascend', summary)` and `state:changed` so UI, stats, and story all react from one signal.
- **E25-S2-T8** — Wire L_ascension into the stack — Feed `1 + 0.10·ranks(compounding)` into `M_k` as the `L_ascension` layer in `math.js`, verifying it multiplies across (not adds within) the other layers.
- **E25-S2-T9** — Idempotency & re-entrancy — Guard `ascend()` against double-fire (disable during the transaction) so a rapid double-click cannot double-wipe or double-credit.
- **E25-S2-T10** — Keep it pure — Keep `legacyGain` and `ascensionROI` pure functions of `state` with no globals, so the harness and unit tests can call them deterministically.

## E25-S3 — The Big Red Button (UI / buttons)
_As a tourist eyeing the exit, I want a clear panel that tells me exactly what I'll gain and lose, so that ascending is a confident decision, not a gamble._  The ascend panel converts scary math into a one-glance choice.
- **E25-S3-T1** — Ascend panel scaffold — Add an `#ascendPanel` card (Spectre.css) revealed by `ui:ascendPanel`, hidden entirely until beat 26 fires.
- **E25-S3-T2** — Live "+N Legacy" readout — Bind a readout to `legacyGain(state)` refreshed each render tick: "Ascend now → **+N Legacy**", formatted via `util.format`.
- **E25-S3-T3** — ROI hint line — Show the `ascensionROI` hint ("optimal ascension ≈ 45 min from now at current growth") as friendly, non-blocking guidance.
- **E25-S3-T4** — Keep/lose columns — Render two columns from `META_KEYS`/`RUN_KEYS` ("Kept: Legacy, who you've become, your story. Gone: cash, this trip's comforts.") in Dutch-tourist voice.
- **E25-S3-T5** — Confirm modal — Gate the button behind a confirmation modal ("Really let go of the 5-star suite for a soggy shed and some wisdom?") to prevent misclicks.
- **E25-S3-T6** — Disabled-state affordance — Grey the button with a reason tooltip when `!readyToAscend` ("Stay a while — ascending now would earn 0 Legacy").
- **E25-S3-T7** — Post-ascension summary modal — On the `ascend` event render the reset-summary ("You left with +31 Legacy and a tan you'll keep") with a "Start fresh" dismiss.
- **E25-S3-T8** — Legacy balance chip — Add a persistent Legacy chip to the top resource bar so players track their meta wallet at all times.
- **E25-S3-T9** — aria-live wiring — Announce the legacy gain and the summary via `aria-live` for screen readers, per the accessibility floor.
- **E25-S3-T10** — Copy polish — Write and place all button, tooltip, and modal strings in the wry tone, keeping the confirm copy honest about the wipe.

## E25-S4 — Knowing When to Fold (headline: ROI break-even + "ascend now")
_As a first-time ascender, I want the game to teach me the exact moment ascending pays off, so that my first reset feels smart instead of premature._  The signature feature is the break-even coach that turns a scary reset into an obvious win.
- **E25-S4-T1** — First-unlock trigger — Fire beat 26 the first time `readyToAscend` flips true, ensuring the option is fully hidden before then.
- **E25-S4-T2** — Break-even math — Implement the ROI comparison of the current run's marginal income versus projected fresh-run income (including the new `L_ascension`), returning a break-even ETA.
- **E25-S4-T3** — "Ascend now" spotlight — On first eligibility, highlight the ascend panel with a one-time coach-mark explaining the sqrt curve ("4× the trip = 2× the Legacy").
- **E25-S4-T4** — Diminishing-returns readout — Show a small "Legacy/hour is now falling" indicator once the run passes its ROI peak, nudging the player to fold.
- **E25-S4-T5** — Projection sparkline — Render a tiny CSS/text sparkline of `legacyGain` over recent minutes so the plateau is visible, not just asserted.
- **E25-S4-T6** — Premature-ascend warning — When unlocked, warn (not block) if ascending more than ~20% before the break-even ETA, respecting player agency.
- **E25-S4-T7** — Tutorialize once — Store `story.flags.ascendTutorialSeen` so the coaching only appears on the very first ascension.
- **E25-S4-T8** — Harness policy hook — Expose `ascensionROI` and `readyToAscend` to `js/dev/harness.js` so the greedy "ascend at break-even" policy can drive automated pacing runs.
- **E25-S4-T9** — Balance floor vs. ROI — Tune `ASCEND_AGE_FLOOR` and the break-even threshold together so the first ascension lands near the ~11h beat-26 target from `docs/05 §1`.
- **E25-S4-T10** — QA the coach — Test that the coach-mark shows exactly once, respects `prefers-reduced-motion`, and never appears for players who ascend via the debug panel.

## E25-S5 — The First Thing Wisdom Buys (meta spend cluster — repurposed amenity slot)
_As a player holding fresh Legacy, I want something meaningful to buy immediately, so that ascension pays off the very first time and I learn the meta economy before E26's full tree._  A single satisfying Legacy sink proves the loop before the tree deepens it.
- **E25-S5-T1** — Compounding Interest node — Implement the seeded `compounding` sink with `costLegacy(rank)=nodeBase·nodeGrowth^rank` and effect `L_ascension +0.10/rank` as the sole E25 spend.
- **E25-S5-T2** — Buy-rank flow — Wire a generic `prestige.buyNode('compounding')` that debits `resources.legacy`, increments `ascension.legacySpent`, and recomputes `L_ascension`.
- **E25-S5-T3** — Cost-curve constants — Set `nodeBase=2`, `nodeGrowth=1.6` so early ranks are cheap wins and later ranks pace with the sqrt payout.
- **E25-S5-T4** — Effect into the stack — Confirm `legacySpentInMultNode` drives `L_ascension = 1 + 0.10·rank` and that it multiplies every tier equally (global scope).
- **E25-S5-T5** — Preview-next-rank UI — Show "next rank: −X Legacy → income ×1.1" so the buy has a legible marginal value.
- **E25-S5-T6** — Cap & telemetry — Soft-cap E25 ranks (e.g. 10) so the pre-tree economy can't outrun the E26 design, and log rank purchases to `stats`.
- **E25-S5-T7** — Flavor copy — Name and describe the node in Dutch-tourist voice ("Compounding Interest — turns out lounging teaches you about money").
- **E25-S5-T8** — Respec stub — Leave a `respec()` hook that refunds `legacySpent`, so E26 can enable full respec without reworking this node.
- **E25-S5-T9** — Persist node rank — Store the rank under `ascension.tree.compounding`, the same structure E26 expands, so no migration is needed later.
- **E25-S5-T10** — QA the sink — Test zero-Legacy purchase blocking, exact-cost edge, and that the income multiplier applies immediately post-buy and post-ascension.

## E25-S6 — Waking Up in the Shed Again (fresh-run setup — repurposed progression slot)
_As a tourist starting trip #2, I want the reset run to feel like a stronger do-over rather than a punishment, so that going back to the shed is exciting, not deflating._  The post-reset opening must read as "wiser, faster," making ascension emotionally rewarding.
- **E25-S6-T1** — New-run defaults — Implement `state.newRunDefaults()` returning the canonical tier-0 starting state (shed, D1 unlocked, cash 0), shared by new-game and ascension.
- **E25-S6-T2** — Meta re-application order — After reseed, re-apply `L_ascension` (and later tree nodes) so the fresh run visibly out-earns the previous opening.
- **E25-S6-T3** — Ascension-count milestones — Add small rewards at `ascension.count` 1/3/5/10 (a tiny flat Legacy bonus or a cosmetic badge) to reward repetition.
- **E25-S6-T4** — Faster-opening check — Verify the early curve is meaningfully quicker post-ascension (target: reach beat 9 "pool" in a fraction of first-run time) and record it in the harness.
- **E25-S6-T5** — Carry-over readout — On new-run start, show "You kept: N Legacy, your tan, your story" so the player sees continuity through the reset.
- **E25-S6-T6** — Re-lock run content — Ensure run-only unlocks (accommodation tiers, run skills, path points) correctly re-lock so beats re-gate naturally.
- **E25-S6-T7** — Preserve story progress — Confirm `story.beat` and `story.branch` persist so narrative never rewinds even though the economy does.
- **E25-S6-T8** — Ascension-count UI — Surface "Trip #N" subtly (header or stats) so repeat runs have their own identity.
- **E25-S6-T9** — Soft-lock guard — Test that a fresh run is always completable back to ascension-ready even with zero tree investment.
- **E25-S6-T10** — Content pass — Write the wry "back to the shed, but this time you brought a better poncho" opening line for trip #2+.

## E25-S7 — Four Ways to Say Goodbye (path / branch flavor)
_As a player with a chosen branch, I want ascension to acknowledge my identity, so that letting go feels personal to the tourist I've been building._  Branch-aware ascension flavor keeps the four fantasies alive through the reset.
- **E25-S7-T1** — Branch-variant beat text — Add branch-specific lines to beat 26 for traveler/vlogger/crypto/connoisseur ("the vlogger films the goodbye; the connoisseur simply nods at the sommelier").
- **E25-S7-T2** — Branch persists, points reset — Confirm `story.branch` is meta (kept) while `paths.*.points` are run (wiped), and surface this clearly so players know their identity survives.
- **E25-S7-T3** — Traveler flavor — Frame ascension as "the ultimate trip: starting over somewhere new," nodding to the Wanderer's Instinct synergy coming in E26.
- **E25-S7-T4** — Vlogger flavor — Frame it as a "season finale / reboot" with a Clout-reset acknowledgement and a hook toward Magnetic (E26).
- **E25-S7-T5** — Crypto flavor — Frame it as "taking profits and re-entering," tying to Unshakeable and the sqrt "you can't time the top" joke.
- **E25-S7-T6** — Connoisseur flavor — Frame it as "curating a life, not hoarding a run," tying to the Golden Ratio taste synergy.
- **E25-S7-T7** — Hybrid nod — Add a bonus line when two paths were ≥ P1 this run ("a crypto-funded vlogging world traveler letting go — very on brand").
- **E25-S7-T8** — Branch badge continuity — Ensure the branch badge UI carries across ascension so the visual identity is unbroken.
- **E25-S7-T9** — No branch stranded — Verify all four branches reach `readyToAscend` at comparable times via the harness, so ascension isn't branch-biased.
- **E25-S7-T10** — Content QA — Proofread all branch variants for tone consistency and the ≤ 90-word limit; confirm neutral fallback text exists.

## E25-S8 — Tuning the Point of No Return (balance & tuning)
_As a designer, I want the ascension loop length and payout to land the ~11h beat-26 target, so that the first prestige feels earned but not grindy._  This story fits the `LEGACY_*` constants to the pacing contract.
- **E25-S8-T1** — Set LEGACY_K/SCALE — Fit `LEGACY_K` and `LEGACY_SCALE` so a first-ascension run (`lifetimeCash≈1e9`) yields ~30 Legacy, matching the `docs/04 §3` worked example.
- **E25-S8-T2** — Choose LEGACY_EXP — Confirm `LEGACY_EXP=0.5` gives the intended "4× run → 2× reward"; document the `0.55–0.6` faster-tail alternative in a comment.
- **E25-S8-T3** — Tune ASCEND_AGE_FLOOR — Set the run-age floor so the earliest sensible ascension aligns with the ~11h beat-26 target from `docs/05 §1`.
- **E25-S8-T4** — Break-even threshold — Tune the `ASCEND_THRESHOLD` used by the harness policy so "ascend at break-even" produces a smooth, non-oscillating cadence.
- **E25-S8-T5** — Second-ascension check — Verify the 2nd ascension is faster and more rewarding (compounding + fresh-run speed), keeping the loop motivating.
- **E25-S8-T6** — Harness run — Run `harness.js` with the greedy+ascend policy for 20h and export the beat curve; confirm beat 26 is within ±15% of target.
- **E25-S8-T7** — Legacy-per-hour audit — Chart Legacy/hour across a run to confirm a clear peak so the break-even coaching has a real signal.
- **E25-S8-T8** — Compounding sink pacing — Balance `compounding` cost vs. gain so a first Legacy haul buys ~2–4 ranks (a felt but not runaway boost).
- **E25-S8-T9** — Multiply-across sanity — Assert `L_ascension` multiplies with `L_comfort`/`L_upgrade` rather than inflating a single layer, keeping totals inside `double`.
- **E25-S8-T10** — Golden-file the curve — Commit the tuned beat-26 timing as a golden file so future content cannot silently regress ascension pacing.

## E25-S9 — Not Losing the Trip of a Lifetime (save / migration / offline)
_As a long-time player, I want ascension state to survive updates and offline gaps flawlessly, so that a bad load never eats my Legacy or double-credits it._  Prestige data is the highest-stakes save surface; migration must be bulletproof.
- **E25-S9-T1** — Bump save version — Increment `state.version` (e.g. 7→8) and register the ascension-fields migration in `state.js MIGRATIONS`.
- **E25-S9-T2** — Migration function — Write `MIGRATIONS[8]` to add `resources.legacy=0` and `ascension={count:0,legacySpent:0,tree:{},legacyBanked:0}` to pre-ascension saves without touching existing progress.
- **E25-S9-T3** — lifetimeCash backfill — For old saves lacking `stats.lifetimeCash`, initialize it conservatively (e.g. from current cash) so a legacy player's first ascension isn't wildly over- or under-paid.
- **E25-S9-T4** — Serialize new fields — Ensure `ascension` and `resources.legacy` are included in `JSON.stringify` save and the base64 export string.
- **E25-S9-T5** — Offline-then-ascend — Verify offline gains accumulate into `stats.lifetimeCash` so a player returning after 12h sees the correct higher `legacyGain`.
- **E25-S9-T6** — Ascend-then-close safety — Guarantee `ascend()` autosaves immediately after the transaction so a crash right after cannot lose the credit or replay the wipe.
- **E25-S9-T7** — Backup rotation — Confirm the rotating `...backup` slot captures pre-ascension state so a catastrophic bug is recoverable.
- **E25-S9-T8** — Import guard — Reject or safely default malformed `ascension` blocks on import (try/catch → keep current save) so a bad paste can't corrupt meta currency.
- **E25-S9-T9** — Fixture saves — Add save fixtures at versions before and after E25 and assert migration idempotency (running twice changes nothing).
- **E25-S9-T10** — Offline QA — Test that ascending, going offline, and returning never double-counts `legacyBanked` and that the fresh run's offline math is correct.

## E25-S10 — Shedding Gracefully (QA / polish / juice)
_As any player, I want ascension to feel momentous and bug-free, so that the emotional peak of "letting go" isn't undercut by a glitch or an ugly number._  Polish turns a state-wipe into a milestone the player remembers.
- **E25-S10-T1** — Zero-gain guard — Test that ascending with `legacyGain < 1` is impossible via the UI and returns a no-op from `prestige.ascend()`.
- **E25-S10-T2** — Double-click test — Confirm rapid Ascend clicks wipe and credit exactly once (re-entrancy guard from S2-T9).
- **E25-S10-T3** — Number formatting — Verify `legacyGain` and `lifetimeCash` render cleanly at all magnitudes (thousands → `1e12`) via `util.format`.
- **E25-S10-T4** — Reset-completeness audit — Assert every `RUN_KEYS` field is truly at default post-ascension and no stale generator/amenity state leaks into the new run.
- **E25-S10-T5** — Meta-integrity audit — Assert every `META_KEYS` field is byte-identical before/after the wipe except the intended Legacy credit.
- **E25-S10-T6** — "Letting go" juice — Add a short, reduced-motion-respecting transition (fade the old run out, fade the shed in) synced to the summary modal.
- **E25-S10-T7** — Ticker flourish — Flash the Legacy chip and play the aria-live "you kept your wisdom" line on ascend for a satisfying beat.
- **E25-S10-T8** — Debug-panel parity — Confirm the debug "trigger ascension" path calls the same `prestige.ascend()` so QA and real play cannot diverge.
- **E25-S10-T9** — Regression tests — Add tests for `legacyGain` monotonicity, `ascensionROI` sign, and the age-floor gate; wire them into the dev test set.
- **E25-S10-T10** — First-ascension playtest — Do a full manual first-ascension pass at `GAME_SPEED=100`, checking tone, clarity, and that the shed-again opening lands as "exciting, not sad."

## Definition of Done (epic)
- [ ] `prestige.js` exists with pure `legacyGain`, `ascensionROI`, `ascend`, and `buyNode` for the `compounding` sink.
- [ ] `RUN_KEYS`/`META_KEYS` fully partition state; ascension wipes run currencies and preserves Legacy, tree, story, settings, and stats.
- [ ] `legacyGain = floor(LEGACY_K·(lifetimeCash/LEGACY_SCALE)^LEGACY_EXP) − legacyBanked` matches the worked example (`1e9 → +31`).
- [ ] Ascend panel shows live "+N Legacy", ROI hint, keep/lose columns, confirm modal, and post-ascension summary; hidden before beat 26.
- [ ] First unlock fires on `readyToAscend` (ROI break-even + `ASCEND_AGE_FLOOR`); coach-mark shows once.
- [ ] `L_ascension` from `compounding` multiplies across the stack and applies immediately after buy and after ascension.
- [ ] Save version bumped, migration adds ascension fields idempotently, offline gains feed `lifetimeCash`, and autosave-after-ascend is verified.
- [ ] Harness confirms beat 26 within ±15% of the ~11h target; tuned curve committed as a golden file.
- [ ] Zero-gain, double-click, reset-completeness, and meta-integrity edge cases pass; branch-variant beat text proofread to tone.
