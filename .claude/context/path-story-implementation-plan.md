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
- [x] **Phase 1 — Data**: `goals` schema + vocabulary validation; `PATH_GATE` config; thresholds
- [x] **Phase 2 — Engine**: `math.stageGoalProgress`; stage firing (points AND goals);
      `accUnlocked` checkpoint clause; migrate/grandfather
- [x] **Phase 3 — Balance**: harness gate-satisfier step; re-pin baselines; ±5% suite pass
- [x] **Phase 4 — UI**: Your Road panel; Overview merge; Personal Growth + ⓘ modal
      (uxcheck 52/52; visuals pending user review per 2026-07-25 directive)
- [ ] **Phase 5 — Verify & docs**: selftest additions (bridgeability sweep, neglect-only
      assertion, flag-off invariance, reset audit); docs 01/02/05 amendments; final /verify
  - [ ] P5-T1 (verifier) selftest additions — in progress (concurrent agent, `js/dev/selftest.mjs`)
  - [x] P5-T2 (implementer) doc amendments — `docs/01 §5.1` (stage goals + brake framing),
        `docs/02` (principle amended: story never blocks; path gates checkpoints, calibrated,
        cash-bridgeable), `docs/05 §9.4` (already landed pre-task), `docs/10` (Status → shipped,
        §1.1 connoisseur table corrected with pointer to the calibration outcome) — landed
        2026-07-25, this entry
  - [ ] P5-T3 (verifier) full `/verify` pass + AGENTS.md §3 merge flow
- [ ] Merged to main (per phase; final phase closes the feature)
- [x] **Phase 6 — path-exclusive world content** (landed 2026-07-25: 6A/6B/6C all merged; harness bit-identical 10h15m50s; selftest [121])

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

## Phase 3 results (balance-tuner, flag flipped `PATH_GATE.enabled: true`)

**Satisfier design (`harness.satisfyPathGate`, single-sourced).** Lives in `js/dev/harness.mjs`,
imported by `scenarios.mjs` (`makeGreedyAct`) and `selftest.mjs` (`playStep`) — one policy step,
one definition (like `amenityWorthBuying`), so the demo-baseline ≡ harness lock ([106]) holds by
construction. Wired right after the bank-upgrade block, before the accommodation loop, so a fired
stage opens the tier the same act. It fires ONLY when `accGateStatus` reads `comfortOk && !pathOk`
for the committed branch (never on the ~⅔ that sail through), finds the first not-yet-fired stage,
and buys its unmet goals cheapest-bridge-first (bounded loop, each buy affordability-gated): a NEW
content format per `contentFormats`; a new content level as the cash→rate bridge for `clout`;
cheapest coin for `portfolioValue`, cheapest un-held coin for `coinSpread`; cheapest unlocked
unowned destination; cheapest car→boat for `vehicleClass`; cheapest unlocked new luxury/yacht
amenity for `luxAmenities`; cheapest new art/wine piece for `collectionPieces`.

**The one carve-out — `d2Count` is NOT force-bought (returns null).** The primary Followers bar
is the D2 core-income backbone; buying one early D2 at a low count (2→3 = +50% of the tier-chain
driver) compounded into a measured **casual-tourist −15%** (the gate accidentally *accelerating*
the engaged vlogger). The fix leaves d2Count to the natural economy — the tier gate simply waits
(neutrally) for the count the calibration already put below the engaged p35 (3/7/18/60), so it
self-satisfies at each checkpoint. `checkPathStages` runs every tick, so the stage fires the
instant d2Count catches up.

**Re-pinned baselines (old → new, selftest + report.mjs GOLDEN, one commit).**

| pin | old | new |
|---|--:|--:|
| greedy island (quiet, events off) — GOLDEN + E11–E29 invariance asserts + [105]/[106]/[109]/[111]/[115] | 37445s | **37435s** |
| greedy-living island (events on) — [115] | 36960s | **36950s** |
| casual-tourist island (quiet) — [109] | 76800s | **76800s** (unchanged) |
| greedy-traveler (quiet) — [109] | 36080s | **35455s** |
| greedy-connoisseur (quiet) — [109] | 30900s | **30900s** (unchanged) |
| greedy-crypto (quiet) — [109] | 41495s | **41495s** (unchanged) |
| GOLDEN.greedyIslandSec / greedyLivingIslandSec (report.mjs) | 37445 / 36960 | **37435 / 36950** |

**Per-tier ±5% no-lengthening (four engaged casual personas, flag-on vs flag-off).** Every delta
is ≥ 0 (the gate only lengthens on neglect, never speeds up — the −15% speedup is gone):

| persona | island Δ | worst per-tier Δ | stalls |
|---|--:|--:|---|
| casual-tourist | +0.0% | +1.6% @T19 | none |
| casual-traveler | +0.0% | +0.0% | none |
| casual-crypto | +2.3% | +2.9% @T15 | none |
| casual-connoisseur | +0.0% | +0.0% | none |

**vlogger-T19 watch item — resolved, no threshold/checkpoint change.** casual-tourist fires S4 at
~17h40m (well before the T19 checkpoint), so T19 lengthens only +1.6% (one 20-min check-in),
inside ±5%. The S4 goals (Followers 60, clout 750k, content 4) held; PATH_GATE.checkpoints
19→S4 unchanged.

**Test-fixture updates (gate went live, not engine bugs).** Unit tests that buy into a checkpoint
tier or fire a stage on points alone were made gate-aware: tier-8 and tier-12 (Taste-gate)
fixtures commit vlogger + set the checkpoint stage flags so they isolate the Comfort/Taste gate;
[87]/[88] stage-firing fixtures pre-satisfy the branch goals; [68]'s "harness never buys content"
became "buys ONLY the ≤4 gate content formats, never the Clout boost sink." No engine/math change
was needed — the gate logic (Phases 1+2) and the satisfier carried the whole feature.

**DoD status:** `npm test` green (0 fail); `npm run harness` island 10h15m50s (in 6–12h guard),
peak log10 12.9 (<< 290), 26 beats; `npm run report -- --quick` clean. Left uncommitted in the
working tree per instructions. (Note: a parallel Phase 4 UI change set — `ui.js`/`index.html`/
`css/game.css`/`data/skills.js` — is also present in the tree; it does not affect the node
harness/selftest and is out of scope for this Phase 3 balance pass.)

---

## Phase 6 — path-exclusive world content (approved 2026-07-25)

**Directive.** Each of the four committed paths gets EXCLUSIVE content: destinations and
amenities visible only to (or purchasable only by) the branch that committed to them. The
point is a *positive* reason to commit — carrots, not another gate. This phase is additive
content on top of the shipped Phase 0–5 gate; it does not touch the checkpoint mechanism
itself.

### Design rules (binding)

- **Exclusives pay in path-scoped currency only** — path points, Clout, Comfort, or a
  branch-tagged cost discount. They **never** add a new *global* income multiplier layer.
  `data/destinations.js`'s own mult-sensitivity warning is the reason why: "the harness
  showed this is far MORE sensitive than the epic anticipated... A product of ~1.29 (this
  file's values) keeps island in the 16-18h range with margin" — the *entire* destination
  map's global `×` product had to be squeezed to ~1.29 to hold the ~20h target. Twelve more
  destinations each carrying their own `L_dest` slice would blow that budget immediately.
  Exclusives sidestep this by design: they're worth having, but their reward lands in a
  system that's already bounded (path points feed the sub-linear, softcapped `L_path`;
  Clout is its own self-feeding, cash-multiplier-isolated economy per `docs/01 §5`; Comfort
  is log-softcapped; a branch discount is a cost-side multiplier, not an income one).
- **Exclusives are pure upside, never a new requirement.** The checkpoint gate (`docs/10
  §1.2`, `PATH_GATE.checkpoints`) keeps counting **only openly-available items** — no
  exclusive destination, amenity, or its resource contribution is ever required to clear a
  checkpoint. A player who never sees or buys a single exclusive still clears every gate on
  the existing calibrated thresholds (`.claude/context/path-story-implementation-plan.md`
  calibration table, above). Exclusives sit entirely outside the goal vocabulary's
  bridgeability contract — they don't need to be bridgeable because nothing requires them.
- **Harness pins get re-verified after content lands**, not before. New destinations/
  amenities are cash sinks/multiplier sources like any other data row — `npm run harness`
  and the selftest goldens get one coordinated re-pin pass once 6A data is in, per the usual
  `docs/05 §2` lever discipline (destinations are lever 6/`L_dest`, amenities lever 7).

### The destination roster (canonical, 3 per path)

| Path | id | Name |
|---|---|---|
| vlogger | `dest_bali_content_house` | The Content House, Bali |
| vlogger | `dest_santorini_goldenhour` | Santorini Golden Hour |
| vlogger | `dest_iceland_drone` | Iceland Drone Weekend |
| crypto | `dest_zug` | Zug, Very Quietly |
| crypto | `dest_miami_cryptoweek` | Miami Crypto Week |
| crypto | `dest_taxhaven_atoll` | Tax-Haven Atoll |
| traveler | `dest_transsiberian` | Trans-Siberian Stretch |
| traveler | `dest_kathmandu` | Kathmandu Basecamp |
| traveler | `dest_patagonia` | Patagonia End-to-End |
| connoisseur | `dest_bordeaux_chateau` | A Quiet Château, Bordeaux |
| connoisseur | `dest_kyoto_ryokan` | Kyoto Ryokan, Off the Record |
| connoisseur | `dest_como` | Lake Como, a Long Weekend |

12 rows total, 3 per branch, each gated to the committed path (visible/buyable only once
`story.branch` matches, per the existing commitment contract in `docs/02`/`docs/01 §5`).
Reward currency per row follows the design rules above — path points/Clout/Comfort/discount,
never a fresh global `×` term; exact per-row shape is a 6A (balance-tuner) task.

### Exclusive amenities

2–3 per path, branch-tagged with **new tags** so the existing `luxAmenities` goal vocabulary
(`docs/10 §1.1`, `data/paths.js`) stays untouched — an exclusive amenity must not silently
start counting toward a checkpoint goal it was never calibrated against. Same cost/comfort
discipline as their neighbors at the unlock band they land in (no special-cased curve).

### D2 identity

Per-branch deepening of the D2 tier's flavor (Followers / Wallet Watchers / Pen Pals /
Admirers, `data/generators.js` `names`) is **display-only**: skins, flavor text, upgrade
*names*. No new math, no new multiplier, no schema change — this is a copy/art pass on an
existing generic system.

### Art

- **Stamps** via `tools/genart.mjs` (the style bible, §"style bible" comment block) in
  `stamps` mode, keyed to the 12 new destination rows, then `python3 tools/artpost.py stamps`
  to ink-key them into transparent WebP (same pipeline the existing destination stamps use).
- **Icon set**: tab icons (home / income / growth / legacy), money, wallet, next, comfort,
  clout, story book; amenity icons at **category level** (not per-row — one icon per amenity
  category, matching the existing sprite economy).

### Sub-checklist

- [x] **6A** (implementer + balance-tuner) — data: 12 destination rows + 2–3 exclusive
      amenities per path in `data/destinations.js`/`data/amenities.js`; engine: branch-gated
      visibility/purchase wiring reusing the existing commitment check (no new bespoke gate
      logic); balance: reward-currency sizing per the design rules, harness/selftest re-pin.
- [x] **6B** (implementer, art) — stamp art: `genart.mjs stamps` for the 12 destinations +
      `artpost.py stamps` ink-keying. **Underway in parallel** with 6A/6C per the 2026-07-25
      directive.
- [x] **6C** (implementer, art) — icon set: tab icons (home/income/growth/legacy), money,
      wallet, next, comfort, clout, story book; amenity category icons.

**Exit criteria:** 12 exclusive destinations + 6–12 exclusive amenities shipped, each
branch-gated and visible only to its committed path; no exclusive counts toward any
checkpoint goal; `npm test` green with re-pinned goldens; `npm run harness` still lands the
~20h target with peak `log10(cash)` safely under ~290; art (stamps + icons) landed via the
existing style-bible pipeline.
