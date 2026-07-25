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

- [ ] **B1 — measure the clustering.** From the sim (beat events already recorded in
      `demo.mjs`), produce the per-beat fire-time table for the casual persona (the ~20h
      reference arc) and identify clusters (beats firing within a short window of each other
      / satisfied by a single tier purchase).
- [ ] **B2 — re-space.** Adjust the `requires` thresholds in `js/data/story.js` so beats
      spread monotonically across the arc — no new mechanics, no new gate types, keep every
      beat's narrative anchor sane (a beat about checking into the 5-star must still fire at
      the 5-star).
- [ ] **B3 — verify & re-pin.** 26 monotone beats held, island in the 6–12h guard, casual arc
      in the 18–22h band; re-pin any beat-time baselines in the same commit (the repo's
      coordinated-re-pin convention). Interaction check: beats sit near the path checkpoints
      (tiers 8/12/16/19) — re-spacing must not stack a beat burst onto a checkpoint.

## Status

- [ ] Track A landed
- [ ] Track B landed
- [ ] Merged to main, docs/05 §9 "Remaining polish" updated (two items closed)
