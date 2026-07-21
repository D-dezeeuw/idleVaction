---
name: balance-harness
description: >-
  Run and interpret idleVaction's balance-fit harness (npm run harness) and tune js/config.js
  toward the ~20-hour pacing target. Use whenever you change a GEN.*/COMFORT/MILESTONE/ACC/LEGACY
  constant, when the pacing feels off, or when asked to re-fit the economy. Trigger words:
  balance, pacing, tune the economy, 20 hours, harness, curve, island time.
model: claude-opus-4-8
effort: high
allowed-tools: Read, Edit, Bash
---

# /balance-harness — fit and interpret the pacing curve

The harness simulates a greedy, optimal, max-speed player and prints the story-beat curve,
island time, and peak magnitude. It is a **lower bound** on real active time (a real player
idles and plays sub-optimally), so aim the optimal curve near the target so casual play lands
around ~20h+. Read `docs/05-balancing-and-pacing.md §9` and `docs/math-proof.md` first.

## Run it
```bash
npm run harness      # node js/dev/harness.mjs
```
Read the output: per-beat times, `island (tier 20)`, `peak log10(cash)`.

## Interpret
- **Island time** should sit near the ~20h optimal target (currently ~18h).
- **Beat curve** should be monotone and spread across the run — not bunched.
- **peak `log10(cash)`** must stay well under ~290 (native `double` overflows ~308). A rising
  peak or collapsing time-per-decade means an income term is scaling as a *power of cash* — the
  finite-time singularity. Re-soft-cap, don't just rescale.

## The fit loop (levers, strongest first)
Growth is **polynomial in the number of active tiers (degree)**. Uniform cost scaling barely
moves a polynomial — control *degree*:
1. `GEN.base` spacing (steeper → high tiers unlock later → lower degree → longer, more-spread run).
2. `GEN.perUnit` for high tiers (smaller → they matter only late → lower effective degree).
3. `GEN.growth` slopes (steeper → each unit bites; also lowers the milestone soft-cap's bite).
4. `MILESTONE_SOFT_KNEE`/`LIN` — how many exponential doublings before the linear tail.
5. `COMFORT.MULT`/`C0`, `ACC.*`, `LEGACY_*` — secondary shaping.

Change one lever with a hypothesis → `npm run harness` → read the miss → nudge the biggest-miss
lever → repeat. Keep `npm test` green. When you hit a good curve, freeze it as the golden curve
in `docs/05 §9`. Hand off to `/verify` (Fable 5) for the final gate before pushing.
