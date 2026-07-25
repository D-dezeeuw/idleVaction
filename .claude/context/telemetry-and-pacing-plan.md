# Playtest telemetry & story-gate re-spacing — plan (live)

> Approved 2026-07-25, directly after the path-milestones feature landed. Closes two of the
> four tracked-but-not-blocking items in `docs/05 §9` ("Remaining polish"): **beats cluster**
> and **final numbers want human playtest data**. Update the checkboxes as work lands.

## Why these two, together

Every balance number in the game is fitted to **bots** (`harness.mjs` greedy + `scenarios.mjs`
personas). The docs say it plainly: *"Final numbers want human playtest data, not just the
greedy bot."* Track A makes a real human run produce the **same shape of data** the simulated
personas already emit (the Phase 0 `transitions` record), so the dashboard can plot a human
curve against the golden line. Track B then fixes the one pacing defect we already know about
— story beats firing in bursts — and Track A is how we'll confirm the fix on a human run,
not just a bot one.

## Binding rules

- **Privacy: local-only, player-owned.** No network calls, no third-party origins, ever (the
  repo's zero-third-party-origin rule is absolute). Telemetry lives in the player's own save/
  localStorage and leaves the machine ONLY when the player clicks export. No identifiers.
- **Zero balance impact.** The recorder observes; it must never read into `math.js`/`engine.js`
  income paths, never gate anything, and must be provably neutral (harness/selftest pins
  unmoved, a flag-off/empty-buffer state bit-identical).
- **Bounded storage.** A run emits a bounded number of records (tier-ups ≤ 21, stage fires ≤ 4,
  beats ≤ 30, ascensions); cap the buffer and document the cap. Saves must not balloon.
- **Story re-spacing is a DATA change** (`js/data/story.js` `requires`), never a mechanic
  change. The 26-monotone-beats guard and the island band hold; beats stay auto-satisfying
  from normal progression (docs/02's principle).

## Track A — playtest instrumentation, export & visualization

- [ ] **A1 — the recorder.** A run-scoped telemetry buffer in `state` recording the SAME
      vocabulary as `demo.mjs`'s `snapshotTransition` (kind: tier | stage | beat | ascend;
      t=runSec, accTier, stageIdx, branch, points, the 9 goal resources, plus beatId for
      beats). One hook at each existing fire point; pure observation.
- [ ] **A2 — export.** "Export playtest data" → a JSON download shaped like a `report.json`
      run record, so the dashboard can read it with no translation layer. Reuse the existing
      save-dialog download affordance (`download-save` pattern in ui.js).
- [ ] **A3 — dashboard import + human overlay.** `tools/dashboard/` gains a file-picker that
      loads an exported human run and plots it as a distinct series against the golden line /
      persona bands (the dashboard already renders progression vs golden + the Phase 0 path
      trajectories table).
- [ ] **A4 — neutrality proof.** Selftest: recorder produces records on a scripted run AND the
      harness pins are unmoved; buffer cap respected; save round-trips.

## Track B — story-gate re-spacing (the clustering fix)

> **Terminology correction (stale in docs/05 §9 / docs/02):** there is **no** central
> `STORY_GATES` constant. Beat gates live **inline** as `requires` per beat in
> `js/data/story.js` (keys: `comfort`, `accTier`, `charisma`, `body`, `taste`, `ascensions`,
> `legacy`, `flag`). The re-space is a pure edit of those inline `requires` values.

**Mechanics that shape the fix** (measured, `js/engine.js checkStory`/`math.js`):
- `checkStory` fires **at most one beat per `STORY_VALVE_SEC` (90s)** in strict narrative
  order (beat *N* needs *N−1* seen). So a beat's fire time = `max(own-gate-met, prev+90s)`;
  a "cluster" is several beats whose gates are all satisfied at the **same tier-arrival**,
  released 90s apart.
- The `comfort` gate reads **total** Comfort ≈ `accScore(tier)=50·2.6^tier` (earned Comfort is
  a negligible add from ~t7 on), so a comfort gate `V` fires at the **smallest tier with
  `accScore(tier) ≥ V`** — i.e. beats effectively fire at *tier arrivals*.
- The skill gates (`charisma:5`/`body:8`/`taste:25`) were **trivially pre-satisfied** (at t1
  already cha 13 / body 21 / taste 8), so those beats fired the instant their predecessor
  did — pure "free" clusters. Raising a skill gate to the level reached at a target tier
  places the beat there; because skills grow **continuously through a tier's dwell**, a skill
  gate also gives **sub-tier resolution** (e.g. `body:43` fires beat 12 ~14–25 min *after*
  beat 11 even though both land in the t7 window).
- `math.js` has **zero** reads of story state → re-spacing is **economically neutral**. The
  only economic coupling is beat 6 (the branch-commit ritual) — **left untouched**, so every
  island pin holds.

- [x] **B1 — measure the clustering.** Per-beat fire tables (quiet foundation, dt 10) for the
      casual-tourist (the ~20h reference) and cross-checked on casual-connoisseur /
      casual-traveler / greedy-vlogger. **Before** (casual-tourist):

      | beat | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 |
      |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
      | tier | 9 | 9 | 9 | 11 | 11 | 13 | 14 | 14 | 15 | 16 | 16 | 17 | 17 | 18 | 18 | 18 |
      | time | 9:00 | 9:01 | 9:03 | 11:40 | 11:41 | 16:20 | 17:00 | 17:01 | 18:00 | 18:20 | 18:21 | 19:00 | 19:01 | 20:00 | 20:01 | 20:03 |

      Findings: (a) **two triples** — 11-12-13 (fork/body/5-star, all at t9) and 24-25-26
      (villa/rich-hide/letting-go, all at t18) — plus doubles 14-15, 17-18, 20-21, 22-23;
      11 clusters (≤120s) total. (b) The **skill/comfort beat delayed the *following*
      tier-anchor**: beat 15 (t10) fired at t11 (+1h20m late), **beat 18 (t12) at t14
      (+3h21m late)**, beat 21 (t14) at t16, beat 23 (t16) at t17 — the "check into the
      6-star" beat firing 3h+ after the actual 6-star. (c) One **dead stretch**: beats
      15→16 = **4h38m** with no story (spanning tiers 11-13). Checkpoints t16/t19 carried a
      double/triple.

- [x] **B2 — re-space.** Nine inline `requires` edits in `js/data/story.js` (comfort/skill
      thresholds only — no new mechanics, no new gate types, every tier-anchored beat kept at
      its tier). Each comfort gate re-aimed at a distinct tier's `accScore` window; two skill
      gates raised to their target-tier level:

      | beat | title | old `requires` | new `requires` | target tier |
      |---|---|---|---|---|
      | 11 | Fork in the Lobby | `comfort: 2.2e5` | `comfort: 3.0e4` | t7 |
      | 12 | The Body You Travel In | `body: 8` | `body: 43` | t7 (mid-dwell) |
      | 14 | Going Viral | `comfort: 1.3e6` | `comfort: 2.0e5` | t9 |
      | 16 | Sea Legs | `comfort: 5e6` | `comfort: 1.2e6` | t11 |
      | 17 | Wheels Up | `comfort: 2e7` | `comfort: 1.5e6` | t11 |
      | 19 | At Your Service | `comfort: 4e7` | `comfort: 9.0e6` | t13 |
      | 20 | The Whole Household | `comfort: 1.2e8` | `comfort: 1.1e7` | t13 |
      | 22 | The Invitation | `comfort: 3e8` | `comfort: 6.0e7` | t15 |
      | 26 | Letting Go | `comfort: 1e9` | `comfort: 3.0e9` | t19 |

      Kept: beat 6 (`comfort:500`, branch-commit — economic coupling), beat 8 (`comfort:5500`),
      beat 10 (`charisma:5`), beat 25 (`taste:25`), every `accTier` anchor.

      **After** (casual-tourist):

      | beat | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 |
      |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
      | tier | 7 | 7 | 9 | 9 | 10 | 11 | 11 | 12 | 13 | 13 | 14 | 15 | 16 | 18 | 18 | 19 |
      | time | 6:20 | 6:34 | 9:00 | 9:01 | 10:20 | 11:40 | 11:41 | 13:40 | 16:20 | 16:21 | 17:00 | 18:00 | 18:20 | 20:00 | 20:01 | 21:00 |

      **Spacing target (stated):** (i) **zero triple-clusters**; (ii) at most 2 beats per
      tier-arrival, and every ≤2-min pair is a deliberate thematic beat-pair sharing one tier
      (13+14 5-star/viral, 16+17 boats/jets, 19+20 butler/household, 24+25 villa/rich-hide);
      (iii) every tier-anchored arrival beat fires **at its own tier** (no delay); (iv) no dead
      gap > ~3h on the casual arc (was 4h38m); (v) each path checkpoint (t8/t12/t16/t19)
      carries **≤ 1** beat. **Result vs target:** casual clusters 11 → **7** (all thematic
      pairs, **0 triples**); maxgap 4h38m → **2h40m** (the structural t12→t13 tier gap);
      anchor delays eliminated (beat 18 now 13h40m at its true t12, was 17h01m).

- [x] **B3 — verify & re-pin.** `npm run harness` (living default): island **36950s**
      (= `greedyLivingIslandSec` pin), **26 monotone beats**, peak log10 **12.9** (≪ 290);
      greedy curve de-clustered (no triples; beat 18 un-delayed 7h33m → 6h38m). Quiet island
      pins **all held**: greedy 37435 (d=0), casual-tourist 76800 (d=0), traveler 35455 (d=0);
      connoisseur 30860 (−40s) and crypto 41530 (+35s) drift slightly from beat-14's
      branch-coupled grants (crypto whale-watch / connoisseur provenance now fire a tier
      earlier) but stay **well inside the ±300s / [0.80,1.25]× parity band** ([109]) — no
      branch re-pin. **Checkpoint-interaction check (casual):** t8 clean (beat 12 lands mid-t7
      by the body-continuous gate), t12 = beat 18 solo, t16 = beat 23 solo, t19 = beat 26 solo
      — no checkpoint carries a burst. (Persona note: casual-**connoisseur** compresses t18/t19
      into the same minute at its endgame, so its 24-25-26 stay a rush at t19 — a tier-arrival
      artifact of the comfort branch, unreachable by any gate edit, not a spacing regression.)

      **Selftest re-pins the orchestrator must apply** (11 asserts, all cosmetic value-updates
      to match the moved gates — no logic/invariant change; balance-tuner does NOT own
      selftest.mjs):
      - **[42]** beat 11: `b11._comfortCache = 2.2e5 - 1` → `3.0e4 - 1`; `b11._comfortCache = 2.2e5`
        → `3.0e4`; message text `(2.2e5)`/`reaches 2.2e5` → `3.0e4`.
      - **[50]** beat 12: `b12.skills.body.level = 7` → `42`; `b12.skills.body.level = 8` → `43`;
        message text `Body level 7`/`Body reaches level 8` → `42`/`43`.
      - **[60]** beat 13 setup: `b13.skills.body.level = 8` → `43` (satisfies beat 12 first so
        beat 13 can fire).
      - **[4163]** `beat22.requires.comfort === 3e8` → `=== 6e7`.

## Status

- [ ] Track A landed
- [x] **Track B landed** — story re-spacing de-clustered (2 triples → 0, 11 clusters → 7,
      maxgap 4h38m → 2h40m, anchor delays fixed); island/parity pins held; 4 selftest asserts
      to re-pin (above). Handed to `@verifier`.
- [ ] Merged to main, docs/05 §9 "Remaining polish" updated (two items closed)
