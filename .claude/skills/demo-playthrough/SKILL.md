---
name: demo-playthrough
description: >-
  Run idleVaction's hyper-speed demo playthroughs (npm run demo): scripted player strategies
  over the real engine with progress recorded at time intervals. Parameterize by path/branch
  (vlogger/crypto/traveler/connoisseur), strategy (budget fractions, lanes, casual cadence),
  and ascension/Legend policy (when to prestige, which tree nodes/perks soak the Legacy).
  Use to answer "is strategy A faster than B", "does every branch carry a run", "is the goal
  reachable", or to simulate a playthrough after a content/economy change. Trigger words:
  demo, playthrough, simulate a run, scenario, strategy test, A/B, ascension loop, stall.
model: claude-sonnet-5
effort: medium
allowed-tools: Read, Edit, Bash
---

# /demo-playthrough — simulate scripted runs at hyper speed

`js/dev/demo.mjs` plays the game headlessly with a scripted "user" making strategic choices
and records a snapshot every N game-seconds (cash, log10, income/s, tier, passport stamps,
beats, comfort, clout, legacy, ascensions, Legend). A 40h game simulates in ~10s. The engine
tick is dt-invariant (selftest [59]/[81]), so coarse steps replay real play faithfully —
only *decision* timing coarsens with `--dt`/`--cadence`.

## Run it
```bash
npm run demo                            # all scenarios, 40h
npm run demo -- --list                  # scenario ids + descriptions
npm run demo -- greedy-crypto ascension-loop --hours 20
npm run demo -- --cadence 900           # casual player: acts once per 15 game-min
npm run demo -- --stall 6               # abort after 6h with zero pre-island progression
npm run demo -- --json out.json         # full time-series + event log for analysis
npm run demo -- --quick                 # 2h smoke
```
Output: per-scenario checkpoint tables (1h/2h/5h/10h/20h/40h), key events (branch commit,
tier-20 island, each ascension with its spend breakdown, Legend resets, stalls), final
tree/perks, and a cross-scenario comparison table.

## Scenario anatomy (js/dev/scenarios.mjs)
A scenario is one registry entry — add new experiments there, never in the runner:
```js
{
  id, name, desc,
  branch: 'vlogger'|'crypto'|'traveler'|'connoisseur'|null,  // PATH: committed at beat 6 by the runner
  cadenceSec: 0,                        // STRATEGY tempo: 0 = greedy, N = casual check-ins
  act: makeGreedyAct({                  // STRATEGY: budget fractions of current cash
    branch, genFrac: 0.7, accFrac: 0.7, amenFrac: 0.3, destFrac: 0.4, upFrac: 0.1,
    trainFrac: 0.08, focusFrac: 0.08, bankFrac: 0.5, transportFrac: 0.2,
    amenityROI: true,                   // false = completionist (buys ANY affordable amenity)
    lanes: [laneCrypto|laneCollections|laneVisits],  // opt-in branch economies
  }),
  ascension: {                          // optional PRESTIGE-1 policy
    when: makeAscendWhen(),             // island-first, then preview-doubling anti-thrash
    spend: ['sun_kissed', 'silver_tongue', ...],   // ALL Legacy poured here, priority order
  },
  legend: { when: () => true, perks: ['eternal_tan', ...] },  // optional PRESTIGE-2 policy
}
```
- **A/B a spend path**: clone a scenario, change only `spend` (or the fractions) — the
  exhaustive spenders (`spendLegacy`/`spendLegendPoints`) respect tree prereqs, so a list
  missing a prerequisite provably never unlocks its dependents (that's a finding, not a bug).
- Node ids: `js/data/skilltree.js`; perk ids: `js/data/legend.js`; per-branch stage bonuses
  that motivate lane policies: `js/data/paths.js`.
- Zero-out fractions to test "all money on A instead of B" (see `vlogger-genrush` vs
  `vlogger-comfort-max`).

## Interpret
- **Reference points**: baseline `greedy-vlogger` island = 8h15m05s (bit-identical to the
  golden harness curve, pinned by selftest [106]); casual ~20h is the design target.
- **Stall marker** (`✗ stall …` in the comparison table) = no tier/beat/prestige progress
  for `--stall` hours pre-island → the goal is unreachable under that strategy.
- Declining Legacy per re-ascension (√-telescoping) and low late-gen tiers are real economy
  signals — report them, don't tune around them here.

## Guardrails
- **Never edit `js/dev/harness.mjs`** (selftest pins its exports and the golden curve), and
  keep the `greedy-vlogger` baseline as `play()` verbatim so [106] stays bit-identical.
- Keep `npm test` green (sections [106]/[107] cover the runner). New scenarios need no new
  tests unless they add runner mechanics.
- This is a measurement tool: if a run exposes a pacing/economy problem, hand the tuning to
  `/balance-harness` (Opus 4.8) and gate any push with `/verify` (Fable 5).
