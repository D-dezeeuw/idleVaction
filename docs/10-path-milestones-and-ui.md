# 10 — Path Milestones & the Path-First UI (design + delivery plan)

**Status:** approved design, not yet built. This doc is the final plan agreed in the
2026-07-25 design session; it supersedes the "soft gate only" caution in earlier drafts.
Phases below are delivery-ordered; every number marked `fit` is set by measurement
(Phase 0/3), never by hand.

---

## 0. Decision record (what was decided, and why)

1. **Paths gate progression.** Path milestones become a real requirement layer on the
   accommodation climb — "just another layered gate," deliberately. The point is that a
   committed player's path actions must visibly matter; without this, the paths are
   flavor plus a side-multiplier and "why even bother."
2. **Balance by simulation, not by lengthening.** Gates must NOT stretch tier times. We
   measure where each path's resources naturally sit at each transition in engaged
   playthroughs (the scenario personas), then set thresholds so the median engaged
   player meets each gate **at or before** the existing Comfort gate. The gate binds
   only when the player neglects their chosen road.
3. **Clout stays as-is.** The Clout economy is self-feeding and already bounded (it
   never touches the cash multiplier stack); we don't complicate it. We only need to
   *know* where it generally is when stages switch — that's instrumentation, not
   redesign. Same for the crypto portfolio, destinations, and amenity collections.
4. **The UI becomes path-first.** The committed road gets a top panel showing the
   current stage's goals as progression bars (D2 and friends wearing their per-path
   skins, which already exist in `data/generators.js` `names`). Income + amenities
   merge into one Overview section beneath it. Personal Growth keeps its five skills
   but shows title + one-line description only, with the technicalities behind an ⓘ
   info modal.

---

## 1. Design — stage goals & checkpoint gates

### 1.1 Stage goals (the new player-facing requirement)

Each path stage (`data/paths.js`, thresholds 5/15/30/50 points today) gains a `goals`
array of **concrete, diegetic requirements** alongside its existing `at` points
threshold. A stage now fires when `points ≥ at` **AND every goal is met**. Points keep
feeding `L_path` exactly as today (the smooth softcap bonus is untouched); goals are
what the player *sees and chases*.

Goal vocabulary (fixed, validated like `PATH_BONUS_KEYS` — a typo'd key must throw):

| Key | Reads | Used by |
|---|---|---|
| `d2Count` | `state.generators` D2 owned (skinned: Followers / Wallet Watchers / Admirers / Pen Pals) | all paths (primary bar) |
| `clout` | `state.resources.clout` | vlogger |
| `contentFormats` | # content tiers owned ≥ 1 | vlogger |
| `portfolioValue` | `math.cryptoHoldingsValue` | crypto |
| `coinSpread` | # distinct coins held | crypto |
| `destinations` | # destinations owned | traveler |
| `vehicleClass` | highest logistics class owned (car/boat/jet) | traveler (stages 3–4) |
| `luxAmenities` | # amenities owned with a luxury tag | connoisseur |
| `earnedComfort` | above-floor Comfort (the same quantity `L_comfort` reads) | connoisseur |
| `collectionPieces` | Gallery & Cellar pieces owned | connoisseur (stages 3–4) |

Rules for the vocabulary (binding):
- **Every goal is purchasable with cash at any time.** Content formats, coins,
  destinations, amenities, and collection pieces are all direct cash buys, so a gate
  can never hard-strand a run — worst case it converts into a spend, never a wall.
- **Never gate on a rate or on RNG.** Portfolio *value*, not coin *yield* (yield fades
  to ~0.02% of income by tier 18 — measured, see `data/paths.js`); owned counts, not
  sponsor-deal luck.
- Goals are **run-scoped** and re-earned each life, exactly like stages today (the
  ascension hard-reset contract is unchanged).

Provisional goal shapes (thresholds all `fit` from Phase 0 measurement):

| Stage | Vlogger | Crypto | Traveler | Connoisseur |
|---|---|---|---|---|
| S1 (at 5) | Followers ≥ fit, Clout ≥ fit | portfolio ≥ fit | destinations ≥ fit | luxAmenities ≥ fit |
| S2 (at 15) | Followers ≥ fit, Clout ≥ fit, 2 content formats | portfolio ≥ fit, spread ≥ 2 | destinations ≥ fit | luxAmenities ≥ fit, earnedComfort ≥ fit |
| S3 (at 30) | Followers ≥ fit, Clout ≥ fit, 3 content formats | portfolio ≥ fit, spread ≥ 3 | destinations ≥ fit, own a car | collectionPieces ≥ fit |
| S4 (at 50) | Followers ≥ fit, Clout ≥ fit, 4 content formats | portfolio ≥ fit, spread ≥ 4 | destinations ≥ fit, own a boat | collectionPieces ≥ fit, earnedComfort ≥ fit |

Keep it to **2–3 goals per stage** — the checklist must read at a glance as "your
road's next challenge," not homework.

### 1.2 Checkpoint tiers (where the gate bites the main climb)

A small set of **checkpoint accommodation tiers** additionally requires the
corresponding path stage to be complete. `engine.accUnlocked` gains one clause
(alongside the existing Comfort check and the tier-21 island ownership gate):

```
checkpoint[t] = stage k  ⇒  accUnlocked(t) also requires stageComplete(k)
```

Provisional mapping (finalized in Phase 3 from measurement):

| Checkpoint tier | Requires stage | Narrative anchor |
|---|---|---|
| 8 | S1 | the 2-star / "Continental Breakfast" band |
| 12 | S2 | the 5-star band (beat 13) |
| 16 | S3 | the 7-star band (beat 21) |
| 19 | S4 | pre-island, the villa band (beat 24) |

Because story beats already key off accommodation tier and Comfort, completing a stage
is what *lets the story advance* through each checkpoint — the storyline is literally
pushed forward by the path, which is the requested feel. Beats 14/18/22 (the
branch-flavored variants) sit just past checkpoints and inherit the pacing for free.

Edge cases (decided):
- **Uncommitted player at a checkpoint:** the requirement reads "choose your road" —
  commitment itself is the first goal. No exemption for refusing the crossroads
  (an exemption would make *not* engaging the optimal line).
- **Jack of All Trades** (multi-path lives): checkpoints read the **primary committed
  branch's** stages only; extra roads opened by the node are bonus, never a second gate.
- **Ascended lives:** thresholds are constant per life. Ascended runs grow faster, so
  gates only get *softer* with generations; Phase 0 measures runs 1–3 to confirm no
  lengthening anywhere on the arc.

### 1.3 The balance contract (how "doesn't make tiers longer" is enforced)

- **Calibration rule:** for each checkpoint, take the engaged personas of that path
  (`js/dev/scenarios.mjs`, 20-min-cadence class, not the greedy bound), read the p35 of
  each goal resource at the moment the Comfort gate for that tier opens, round to a
  friendly number, and that is the threshold. p35 means roughly two-thirds of engaged
  runs sail through without noticing; the rest convert the gap into a short, agent-y
  spend ("push two more content formats") rather than a wait.
- **Acceptance bar (asserted, not eyeballed):** per-tier time deltas vs the pre-gate
  baseline within ±5% for every path persona, island time within the existing band,
  and the casual-tourist reference run unchanged within tolerance.
- **The harness must learn the gates.** `harness.mjs`'s greedy `play()` (and
  `makeGreedyAct`) currently never buy content/coins/collections — with gates live,
  the policy gains one step: *when the next tier is Comfort-unlocked but path-gated,
  buy the cheapest missing goal resource.* The fitted island time and every pinned
  selftest baseline get re-measured and re-pinned in the same change (selftest [106]'s
  harness-parity lock included). This is the one place the "harness untouched by
  clout/crypto" doctrine is deliberately amended — the gate makes those systems part
  of the main economy's critical path, which is the entire point.

### 1.4 What deliberately does NOT change

- Clout production/spend math, the combo, sponsors, the Clout shop — untouched.
- `L_path`, `L_comfort`, the multiplier stack, `accUnlockComfort` — untouched.
- The ascension hard-reset keep-list and the anti-hopping commitment contract.
- The 30-beat spine and its gates (beats still auto-satisfy from progression; the
  checkpoint gate lives on the accommodation ladder, not on story beats).
- `docs/02`'s principle is **amended, not repealed**: "story never blocks the economy"
  becomes "story never blocks the economy; the *path* gates checkpoint tiers —
  calibrated to bind only on neglect, always cash-bridgeable."

---

## 2. Design — the path-first UI

### 2.1 "Your Road" panel (new, top of the main column once committed)

- Header: path name + current stage name (e.g. *Luxury Vlogging Backpacker — The
  Algorithm Stirs*), with the stage's story `desc` as flavor on completion (existing
  stage-fire toast/story continuation reused).
- One **progress bar per goal** of the *next* stage: label uses the per-path skin
  (`ui.genName` — a connoisseur sees "Admirers 210 / 400", never "Followers"), fill =
  `current / required`, complete bars get a check + settle to the top.
- The stage's `at` points threshold renders as one more bar ("Path focus"), so the
  whole requirement is visible in one place; when a checkpoint tier is Comfort-ready
  but stage-gated, the Accommodation panel deep-links here ("Your road isn't ready —
  see what's missing").
- Before commitment: the panel shows the crossroads teaser instead ("choose your road"
  — the beat-6/11 choice), making §1.2's uncommitted rule legible.

### 2.2 Overview section (merge income + amenities)

- `renderGenerators` + `renderAmenities` combine under one **Overview** section
  directly beneath Your Road: income ladder first (skinned names), amenities below,
  one shared header. Existing per-system sub-panels (Poolside, Beachfront, …) keep
  their sections; this merge is about the two everyday panels reading as one home
  screen: *road → overview → everything else*.
- No mechanics change — this is layout + section chrome only.

### 2.3 Personal Growth, simplified surface

- Each of the five skills shows: **title, level, one-line description** (what it does
  for you in words — "Charisma: better deals, warmer welcomes"), and its train button.
- All technicalities — XP numbers, curves, rates, per-level percentages, cost formulas
  — move behind an **ⓘ button opening a modal** (reuse the era-modal/save-dialog
  pattern already in `ui.js`; one shared modal, content per skill from data).
- Nothing mechanical changes; the XP trickle, training costs, and effects stay
  identical.

---

## 3. Delivery plan (phases, model routing per AGENTS.md)

> Routing: `@implementer` (Sonnet 5) for data/UI/wiring; `@balance-tuner` (Opus 4.8)
> for thresholds, gate math, and the harness policy; `@verifier` (Fable 5) as the
> final gate before every push. Git flow per AGENTS.md §3 (feature branch → local
> merge to main, Verified committer).

### Phase 0 — Measure (instrumentation before any mechanic)
- **P0-T1** (implementer) — scenario runner: snapshot `{d2Count, clout, contentFormats,
  portfolioValue, coinSpread, destinations, vehicleClass, luxAmenities, earnedComfort,
  collectionPieces, points}` at every accommodation tier-up and stage fire; write into
  `report.json` per persona.
- **P0-T2** (implementer) — dashboard: a "path trajectories" panel plotting each
  resource vs tier with persona bands (the eyeball view for §1.3's calibration).
- **P0-T3** (balance-tuner) — run the suite across all four paths × runs 1–3; produce
  the calibration table (p35 per goal per checkpoint) checked in as a doc appendix.
- **Exit:** thresholds exist as data-backed numbers; no game code touched yet.

### Phase 1 — Data & schema
- **P1-T1** (implementer) — `data/paths.js`: add `goals` arrays (schema + the fixed
  vocabulary); extend `validatePaths` to reject unknown keys/non-positive thresholds.
- **P1-T2** (implementer) — checkpoint map in `config.js` (`PATH_GATE.checkpoints`),
  plus a `PATH_GATE.enabled` master flag (ships on; the flag is the rollback lever and
  the harness A/B switch).
- **P1-T3** (balance-tuner) — fill thresholds from the Phase 0 table.

### Phase 2 — Engine
- **P2-T1** (implementer) — `math.stageGoalProgress(state, DATA)`: pure evaluation of
  every goal (current/required/met) for the committed path; cached per tick like
  `_pathBonus`.
- **P2-T2** (implementer) — stage firing reads goals AND points; stage-complete
  bookkeeping is run-scoped (reset audit extends to it).
- **P2-T3** (implementer + balance-tuner review) — `engine.accUnlocked`: the checkpoint
  clause; `engine.buyAccommodation` untouched otherwise. Uncommitted + Jack-of-All-
  Trades rules per §1.2.
- **P2-T4** (implementer) — save/migrate: goals need no new save fields beyond stage
  bookkeeping; `migrate()` grandfathers mid-run saves already past a checkpoint.

### Phase 3 — Balance (the gate earns its "doesn't lengthen" claim)
- **P3-T1** (balance-tuner) — harness policy: the cheapest-missing-goal step in
  `play()`/`makeGreedyAct` (§1.3); re-measure and re-pin fitted times and pinned
  selftest baselines.
- **P3-T2** (balance-tuner) — full scenario suite, all paths × runs 1–3, vs baseline:
  per-tier deltas within ±5%, island band held, casual-tourist reference unchanged.
  Tune thresholds/checkpoint mapping until true.
- **P3-T3** (balance-tuner) — dashboard before/after eyeball per AGENTS.md §2.

### Phase 4 — UI
- **P4-T1** (implementer) — Your Road panel (§2.1) incl. the Accommodation deep-link.
- **P4-T2** (implementer) — Overview merge (§2.2).
- **P4-T3** (implementer) — Personal Growth surface + ⓘ modal (§2.3).
- **P4-T4** (implementer) — copy pass: goal labels in path voice, four skins × goals.

### Phase 5 — Verify & docs
- **P5-T1** (verifier) — selftest additions: (a) every path completes every checkpoint
  from cash alone (bridgeability sweep); (b) engaged persona meets each gate at or
  before its Comfort gate (the binds-only-on-neglect assertion); (c) vocabulary
  validation throws on bad data; (d) ascension re-earns stages/goals; (e) with
  `PATH_GATE.enabled=false` the whole feature is bit-identical to pre-gate behavior.
- **P5-T2** (implementer) — doc amendments: `docs/01 §5`, `docs/02` (principle
  amendment §1.4), `docs/05` (calibration procedure), this doc flipped to "shipped".
- **P5-T3** (verifier) — full `/verify` pass; then the AGENTS.md §3 merge flow.

## Definition of Done
- All four paths reach the island with per-tier times within ±5% of baseline; island
  time inside the existing band; `npm test` green with the new pins.
- A neglected path visibly bites at each checkpoint and converts into a short spend,
  never a wall (bridgeability sweep green).
- Your Road, Overview, and the simplified Personal Growth panels shipped; no formula
  visible outside the ⓘ modal.
- Docs amended; commits Verified; dashboard before/after archived with the PR-less
  merge per AGENTS.md.

## Risks & mitigations
- **Harness doctrine change** (clout/crypto now on the critical path): contained by
  the `PATH_GATE.enabled` flag — the off-state invariance test keeps a bit-identical
  escape hatch.
- **Threshold drift after future content**: thresholds are data next to the stage rows;
  the Phase 0 instrumentation stays in the report forever, so any pacing change
  re-emits the calibration table and `docs/05` says to re-check it.
- **Crypto's late-game quiet zone**: gates read portfolio value (purchasable), and the
  S3/S4 crypto thresholds are calibrated on crypto personas specifically — the branch
  with the weakest core coupling gets measured, not assumed.
