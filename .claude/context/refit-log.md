# Phase-C refit log (2026-07-23)

Executed by the orchestrating session directly (sub-agents disabled mid-phase). ~18 measured
iterations via a scratchpad fit probe over `runCurve` + `runScenario`. Method: every mechanism
landed neutral-by-default behind a config knob (goldens bit-identical, committed green), then
one coordinated retune flipped the knobs and re-pinned all pins.

## Fitted outcome (all asserted in selftest [109]/[86]/[105])
| Metric | Before | After | Gate |
|---|---|---|---|
| Greedy island | 8h15m05s | **10h56m45s** | 6–12h ✓ |
| Casual-tourist island | (n/a — instrument built this phase) | **21h20m** | 18–22h ✓ |
| Branch spread | ×2.28 | **×1.37** | ±20-25% ✓ |
| Beat timestamps distinct | 14/26 | **26/26** (min gap 85s) | ≥24 ✓ |
| First ascension Legacy | 11 | **24** | build-defining ✓ |
| Ascended run lengths | +30% by run 6 | **10h56→10h13→9h34** | 0.85–1.10× ✓ |
| First Legend point | ~7e11 ascensions | **ascension 5** | ≤6 ✓ |
| NG+ net difficulty | ×2 easier/cycle | **harder (2.2 vs 2.0)** | >1 ✓ |
| Peak log10(cash) | 11.3 | **12.9** | <290 (golden <13.5) ✓ |

## Key decisions
1. **Casual instrument**: an ROI-optimal bot on a 15-min timer plateaus at ×1.2–1.5 vs greedy
   no matter the constants (act-based catch-up has bounded lag). The design's "~20h casual"
   was always about a median player, so the contract persona is `casual-tourist` (20-min
   cadence + 10% flavor budget, amenityROI off). Persona frozen BEFORE fitting — the economy
   was tuned to it, never the reverse.
2. **Stretch via density, not walls**: lengthening through chunky costs dilutes the
   casual/greedy ratio (waits are cadence-blind); lengthening through the small-purchase
   stream (amenity layer + minis + amenity costScale 2) preserves it (~×1.95).
3. **Late-anchored pricing** (`ACC.costExp`) splits early snap from late length with one knob.
4. **Crypto parity is structural, not numeric**: yield is linear in holdings vs a polynomial
   economy — no yieldScale fixes that; the track needed bounded `global` stage bonuses (the
   same class as the traveler's Continental Fixture).
5. **Cosmetic contract**: the 8 Seven-Star Touches keep `xMult 0` — prestige flavor stays
   flavor, preserving the "harness never buys a Touch" invariant.

## Defects found & fixed mid-refit
- `bulkCost(base, g, b, 1)` returned `base·g^b·(1+ε)` at fractional growth (FP in the
  closed form) — the €15 bootstrap buy failed at growth 1.7 and the whole economy stalled.
  qty-1 now uses the exact power form (`js/util.js`).
- `scenarios.mjs` carried a drifted local copy of `amenityWorthBuying` — the branch bots
  silently missed the L_amenity ramp and ran a 2.2× slower economy. Single-sourced from
  harness.mjs (the audit's §2.9 warning, realized and closed).
- `makeGreedyAct`'s `amenFrac` caps each ITEM at frac·cash — across 186 rows that's a fire
  hose, not a budget. Added `amenBudgetFrac` (true per-act budget) for the persona.

## Levers deliberately NOT pulled
- No punitive anti-catch-up mechanics (overflow-farming, decay timers) to fake a casual gap.
- No persona re-tuning to hit the band (instrument stays fixed; economy moves).
- Amenity data rows untouched except zeroing 8 cosmetic touches (one costScale knob instead).
