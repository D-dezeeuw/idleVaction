# Path Milestones & Path-First UI — implementation plan (live)

> Working copy for the build. Design source of truth: `docs/10-path-milestones-and-ui.md`
> (approved 2026-07-25). This file adds the execution order, per-phase branch/merge flow,
> and a live status tracker — update the checkboxes as work lands.

## Ground rules (binding, from the design session)

- Path stage goals become a REAL gate layer on checkpoint accommodation tiers.
- Gates must NOT lengthen tiers: thresholds are fitted from measured scenario data
  (p35 of engaged personas at each transition), asserted within ±5% per-tier vs baseline.
- Clout/crypto/destination/amenity systems themselves are untouched — we only read them.
- Every goal is cash-purchasable anytime (bridgeable by construction); never gate on a
  rate or on RNG. Goals are run-scoped and re-earned each life.
- `PATH_GATE.enabled` master flag; off ⇒ bit-identical to pre-gate behavior (tested).
- UI: "Your Road" stage-goal progress bars (per-path skins) → Overview (income+amenities
  merged) → simplified Personal Growth (title + one-liner, ⓘ modal for numbers).
- Model routing per AGENTS.md §1: implementer (Sonnet 5) for data/UI/wiring,
  balance-tuner (Opus 4.8) for thresholds/gate math/harness policy, verifier (Fable 5)
  before every push. Git flow per AGENTS.md §3: feature branch → verify → local
  `--no-ff` merge to main → push → re-sync feature branch. No PRs, no rebase-merges.

## Status tracker

- [x] Plan written & pushed (`docs/10` + this file)
- [ ] **Phase 0 — Measure**: scenario/report instrumentation; calibration table
  - [ ] P0-T1 snapshot instrumentation (tier-ups + stage fires → report.json)
  - [ ] P0-T2 dashboard "path trajectories" panel (minimal is fine)
  - [ ] P0-T3 calibration run (4 paths × runs 1–3) → table appended below
- [ ] **Phase 1 — Data**: `goals` schema + vocabulary validation; `PATH_GATE` config; thresholds
- [ ] **Phase 2 — Engine**: `math.stageGoalProgress`; stage firing (points AND goals);
      `accUnlocked` checkpoint clause; migrate/grandfather
- [ ] **Phase 3 — Balance**: harness gate-satisfier step; re-pin baselines; ±5% suite pass
- [ ] **Phase 4 — UI**: Your Road panel; Overview merge; Personal Growth + ⓘ modal
- [ ] **Phase 5 — Verify & docs**: selftest additions (bridgeability sweep, neglect-only
      assertion, flag-off invariance, reset audit); docs 01/02/05 amendments; final /verify
- [ ] Merged to main (per phase; final phase closes the feature)

## Execution notes

- Branch: `claude/game-mechanics-explanation-87zlqw` (re-synced onto main after each merge).
- Baselines to protect (report.mjs GOLDEN / selftest pins at time of writing):
  greedy quiet 37445s ±120, casual quiet 76800s ±1200, greedy living 36960s,
  casual living median band 18–22h, greedy band 6–12h, peak log10 < 290.
  Phase 3 re-pins these deliberately (one commit, GOLDEN + selftest together).
- Checkpoint mapping (provisional, finalize in Phase 3): tier 8→S1, 12→S2, 16→S3, 19→S4.
- Goal vocabulary (fixed): d2Count, clout, contentFormats, portfolioValue, coinSpread,
  destinations, vehicleClass, luxAmenities, earnedComfort, collectionPieces.
- Uncommitted at a checkpoint ⇒ requirement reads "choose your road" (no exemption).
  Jack of All Trades reads the PRIMARY branch only.
- Harness doctrine amendment (deliberate): the greedy policy learns ONE new step — when
  the next tier is Comfort-unlocked but path-gated, buy the cheapest missing goal
  resource. This puts content/coins on the harness's critical path for the first time.

## Calibration table (Phase 0 output — fill in)

_(pending Phase 0 run)_
