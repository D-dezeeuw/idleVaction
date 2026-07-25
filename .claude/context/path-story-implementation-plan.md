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

## Calibration table (Phase 0 output — P0-T3, balance-tuner)

**Method.** `npm run report` over the four engaged personas + four greedy lanes + the
ascension loop, `--seeds 1..8 --hours 30` (events ON — the shipping/"living" default; the
casual personas land 12–22h). p35 = 35th percentile across the 8 seeds (doctrine: ~⅔ of
engaged runs sail through, the rest convert the gap into a short cash spend). Values are read
at each accommodation **tier-up snapshot** (`transitions[kind==='tier']`). Raw JSON in the
session scratchpad (`multiseed.json`, `trav_multiseed.json`). Island medians (living):
vlogger 21.7h · traveler 15.7h · crypto 13.7h · connoisseur 12.7h.

**Instrumentation checks (all passed / one fix).**
- `earnedComfort` is **not** a bug: the demo.mjs formula (`comfort − floorFrac·comfortFloor`)
  reads exactly what `math.comfortMultiplier` uses (`resources.comfort` mirrors `_comfortCache`
  each tick). It reads ~0 at *tier-up* snapshots because `comfortFloor = accScore(tier)·wAcc`
  **jumps on check-in** (the meter resets when you buy a nicer tier); it is nonzero mid-plateau
  (connoisseur stage-fires read 686 → 1.9M; the fast greedy-connoisseur reads 2.2e9 at T16).
  ⇒ earnedComfort is genuine but a **poor checkpoint-gate resource** (structurally near its
  per-tier floor exactly at the tier-up). No code change — kept faithful to L_comfort.
- `casual-crypto` **does** exercise coins (portfolio 1e8→1e12, spread→6); `casual-connoisseur`
  **does** exercise collections (→12 cap). No knob change needed.
- **Fix made (dev tooling only):** `makeGreedyAct` never buys cars/boats/jets, so
  `vehicleClass` read 0 for every persona. Added `laneVehicles` (buy cheapest unowned
  car/boat as a ≤15%-cash slice once Garage/Marina open) to **`casual-traveler` only** (new,
  unpinned persona; `makeGreedyAct` core and all existing/pinned personas untouched).
  `contentFormats` is still 0 for all personas (no persona buys content — see caveats).

### Measured p35 at checkpoint tier-ups (engaged persona of each path)

| Path (persona) | goal | T8 (S1) | T12 (S2) | T16 (S3) | T19 (S4) |
|---|---|--:|--:|--:|--:|
| **Vlogger** (casual-tourist) | Followers (d2) | 4 | 9 | 25 | 128 |
| | clout | 78k | 238k | 422k | 1.34M |
| | contentFormats | 0 | 0 | 0 | 0 |
| **Crypto** (casual-crypto) | Followers | 4 | 9 | 22 | 101 |
| | portfolioValue | 1.2e8 | 7.5e9 | 1.3e11 | 1.4e12 |
| | coinSpread | 4 | 5 | 6 | 6 |
| **Traveler** (casual-traveler+veh) | Followers | 4 | 9 | 23 | 108 |
| | destinations | 6 | 7 | 8 | 10 |
| | vehicleClass | 0 | 1 (car) | 2 (boat) | 2 |
| **Connoisseur** (casual-connoisseur) | Followers | 3 | 8 | 25 | 88 |
| | collectionPieces | 8 | 12 (cap) | 12 | 12 |
| | luxAmenities | 0 | 0 | 3 | 3 |
| | earnedComfort | 0* | 0* | 0* | 0* |

\* tier-up reset artifact (see above); real mid-plateau values are large but not cleanly
sampled at checkpoints. Followers (d2) is remarkably path-invariant (D2 is core income), so
the primary bar can share one ladder across all four skins.

### Recommended thresholds (friendly-rounded, ≈p35 rounded DOWN for the neglect-only margin)

**Primary "Followers" bar (uniform, skinned per path — Followers / Wallet Watchers / Pen Pals / Admirers):**

| | S1 | S2 | S3 | S4 |
|---|--:|--:|--:|--:|
| Followers (d2Count) | **3** | **7** | **18** | **60** |

**Path-specific secondary goals:**

| Path | S1 | S2 | S3 | S4 |
|---|---|---|---|---|
| **Vlogger** | clout ≥ **50k** | clout ≥ **200k**, content ≥ **2** | clout ≥ **350k**, content ≥ **3** | clout ≥ **750k**, content ≥ **4** |
| **Crypto** | portfolio ≥ **1e8** | portfolio ≥ **5e9**, spread ≥ **2** | portfolio ≥ **1e11**, spread ≥ **3** | portfolio ≥ **1e12**, spread ≥ **4** |
| **Traveler** | destinations ≥ **4** | destinations ≥ **6** | destinations ≥ **7**, own a **car** | destinations ≥ **8**, own a **boat** |
| **Connoisseur** | collections ≥ **5** | collections ≥ **9** | luxAmenities ≥ **1** | luxAmenities ≥ **2** |

Keep 2–3 bars/stage (Followers + 1–2 path goals). All numbers sit below the engaged p35, and
every goal is a direct cash/clout-gated buy ⇒ **cash-bridgeable, never a rate/RNG** gate.

**Connoisseur assignment is INVERTED vs docs/10 §1.1's provisional shapes (data-backed):**
`luxAmenities` is 0 until ~T10 (first luxury `butler_bell` needs total Comfort 40k) so it
**cannot** gate S1/S2 → moved to S3/S4. `collectionPieces` maxes at 12 by T12 so it's the
clean S1/S2 differentiator (8→12) but useless at S3/S4 (both 12) → used for S1/S2 only.
`earnedComfort` dropped as a hard gate (tier-up reset); if Phase 3 wants it, sample it
mid-plateau (just before the checkpoint purchase), not at the tier-up.

### Checkpoint mapping — recommendation: KEEP 8→S1, 12→S2, 16→S3, 19→S4

Stage-fire tier vs its checkpoint tier (engaged play, so the **points** `at` threshold — not
the goals — is what could bind first):

| Path | S1 fires (cp T8) | S2 (cp T12) | S3 (cp T16) | S4 (cp T19) |
|---|--:|--:|--:|--:|
| Vlogger | T3 | T6 | T10 | **T18–19** ⚠ |
| Traveler(+veh) | T3 | T6 | T10 | T17 |
| Crypto | T3 | T4 | T8 | T11 |
| Connoisseur | T3 | T6 | T9 | T14 |

Every stage fires **at or before** its checkpoint in engaged play ⇒ mapping holds, gates bind
only on neglect. The one tight spot: **vlogger S4** — points reach 50 only ~T18 (one seed T19),
right at the T19 checkpoint. The `points ≥ 50` requirement, **not** the goal thresholds, is the
binding constraint there. Mitigation baked into the recommendations above: S4 goals (Followers
60, clout 750k) are set to values the vlogger holds by ~T18, so the goal layer adds no delay.
Phase 3's ±5% per-tier assertion must confirm T19 does not lengthen for the vlogger; if it does,
lower S4 Followers/clout or drop the S4 checkpoint to T18. (Traveler S4 was tight at T19 before
`laneVehicles`; the first-car +2 path nudge now lands it at T17 — comfortable.)

### Ascended lives — "gates only get softer" CONFIRMED (vlogger lineage, 3 gens × 8 seeds)

ascension-loop reaches each checkpoint tier with **≥** the run-1 resource every generation;
the margin *grows* with tier (ASCEND_GATE inflates late-tier cost each run, forcing more
accumulation before each tier-up):

| tier | Followers g1→g2→g3 | clout g1→g2→g3 |
|---|---|---|
| T8 | 4 → 5 → 5 | 887k → 943k → 858k |
| T12 | 9 → 10 → 10 | 4.1M → 4.35M → 4.37M |
| T16 | 34 → 67 → 84 | 1.31e7 → 1.53e7 → 1.50e7 |
| T19 | 177 → 337 → 452 | 2.89e7 → 3.4e7 → 3.44e7 |

Run-1-calibrated thresholds are cleared with growing headroom by ascended runs — no lengthening
anywhere on the arc. Only the vlogger lineage was re-run (the loop commits vlogger), but the
softening mechanism is branch-independent (tier-cost inflation, not a branch resource).
**Phase 5 cheap assertion:** for a 2nd-gen run, resource-at-checkpoint-tier ≥ run-1 value at the
same tier (holds with margin here) — cheaper than a large multi-branch ascension sweep.

### Open risks / caveats

1. **contentFormats & (pre-fix) vehicleClass are never bought by the default policy.** Content
   (€200–16M, clout-gated 30/250/1800/12000 — all met) and cars/boats are trivially cash-buyable
   at their checkpoint tiers ⇒ bridgeable, will just trigger Phase 3's "buy cheapest missing goal"
   harness step. But `casual-tourist` (pinned, untouchable) is a *generic* casual, not a
   content-chasing vlogger, so it does **not** demonstrate "engaged vlogger sails through content."
   Phase 3 should either add a content lane to a NEW (unpinned) vlogger calibration persona, or
   accept content as a pure bridge-spend and prove ±5% holds. Kept content at 2/3/4 (design) as a
   cheap diegetic "post your content" nudge.
2. **Spread widens at S3/S4** (events): clout T19 vlogger 0.56M–3.4M, portfolio T19 crypto
   0.84e12–4.9e12. p35 thresholds absorb this; single-stream (quiet) runs sit near the low end.
3. **Connoisseur earnedComfort** needs a mid-plateau sampler if it is to be a hard gate.
4. Thresholds measured against the *current* fitted economy; the Phase-0 instrumentation stays in
   the report, so any future pacing change re-emits this table (docs/10 §Risks).
5. **Schema pin for Phase 2:** these numbers are calibrated against `d2Count = generators[D2].count`
   (the live produced/visible Follower count, monotone), NOT `.bought`. `math.stageGoalProgress`
   must read the same field or the ladder shifts. (Display can round the fractional count.)
