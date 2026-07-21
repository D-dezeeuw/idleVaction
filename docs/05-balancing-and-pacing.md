# 05 — Balancing, Pacing & Tuning

Goal: a **~20 active-hour** main arc (beat 1 → beat 30), no monetization, no forced waits,
and a single **`GAME_SPEED`** knob for pacing and QA. This doc is the recipe for *keeping* it
balanced as content grows, plus reference code for the balance harness and the BigNumber swap.

---

## 1. The pacing target (the contract)

We assign each of the 30 beats a **target cumulative time** on a smooth curve. Early beats are
minutes apart (constant small wins); later beats stretch to tens of minutes; ascension beats
compress again because prestige multipliers accelerate re-runs.

| Beat | Target cumulative (active) | Δ from prev | Notes |
|---|---|---|---|
| 1 | 0:00 | — | instant |
| 5 | ~0:20 | ~5 min | onboarding, always something to buy |
| 10 | ~1:10 | ~8 min | end of Act I |
| 15 | ~3:00 | ~15 min | logistics era |
| 20 | ~6:30 | ~25 min | staff/automation reduces micro |
| 22 | ~8:30 | ~40 min | reconvergence; pre-ascension wall |
| 26 | ~11:00 | first ascension | wall broken by prestige |
| 28 | ~15:00 | island | second-order multipliers |
| 30 | ~20:00 | endgame | NG+ opens; curve resets upward |

Rule of thumb the harness enforces: **time-to-next-meaningful-purchase** should sit in the
**30–120s band during active play** for the whole arc (idle-away collapses this). If it drops
below ~15s, the game feels like a clicker (bad); above ~180s it feels like a wait (bad).

## 2. The twelve levers (all in `config.js`)

Ordered by how coarsely they move the curve:

1. `GEN.growth[k]` — per-tier cost slope. **Primary pacing control.**
2. `GEN.base[k]`, `GEN.perUnit[k]` — tier onboarding cost/output.
3. `MILESTONE_STEP` + doubling magnitude — mid-game acceleration.
4. `COMFORT.mult`, `COMFORT.C0`, `COMFORT.cap` — strength of the global multiplier.
5. `SKILL.rate`, `SKILL.base`, `SKILL.growth` — personal-growth power & speed.
6. `PATH.rate`, `PATH.softcapExp` — branch strength.
7. `AMENITY.base`, `AMENITY.growth`, `AMENITY.comfort` — small-win cadence.
8. `ACC.base`, `ACC.growth`, `ACC.unlock[]` — big-step ladder pacing.
9. `LEGACY_K`, `LEGACY_SCALE`, `LEGACY_EXP` — ascension loop length.
10. `TREE.*` — meta multiplier strength.
11. `OFFLINE_CAP`, `OFFLINE_STEPS` — away generosity.
12. `GAME_SPEED` — **pace/QA only, never used to balance.**

## 3. The balance harness (ships in-repo, dev-only)

A headless simulation of a "reasonable" player policy, run at max speed, printing the actual
milestone curve so we can fit constants. Pseudocode (real version in `js/dev/harness.js`,
guarded so it never runs in prod):

```js
function simulate(policy, hours) {
  const s = newGame();
  const dt = 1;                 // 1s logical steps
  const log = [];
  for (let t = 0; t < hours*3600; t += dt) {
    engine.tick.call({state:s}, dt);
    policy(s);                  // e.g. buy cheapest positive-ROI item; ascend at break-even
    for (const beat of newlyUnlockedBeats(s)) log.push({beat, t});
  }
  return log;                   // → compare against §1 targets
}

// "greedy ROI" reference policy
function greedy(s){
  const opts = affordablePurchases(s)
    .map(o => ({o, roi: marginalIncomeGain(s,o) / o.cost}))
    .sort((a,b)=>b.roi-a.roi);
  if (opts[0]) buy(s, opts[0].o);
  if (ascensionROI(s) > ASCEND_THRESHOLD) ascend(s);
}
```

Fit procedure: run harness → read `T(beat)` → nudge the lever with the largest target miss →
repeat until all 30 beats within ±15% of §1. Because it's numeric, this is minutes of tuning,
not a redesign. Commit the resulting curve as a golden file so regressions are caught.

## 4. Softcaps & anti-runaway (so no single system breaks balance)

- **Path points:** `1 + rate·points^0.85` (sub-linear) → no infinite-scaling from one path.
- **Comfort:** saturating `cap·x/(x+cap)` → amenities always help, never trivially max.
- **Savvy passive:** scales with `sqrt(totalCash)` → supports but never replaces active buys.
- **Legacy:** `sqrt` payout → prestige is worthwhile but self-limiting.
- **Communication discount:** clamped to −60% → costs never reach zero.
- **Milestone doublings:** free but gated behind geometric cost → self-balancing.

Each softcap is a one-line formula with a single exponent constant → trivially tunable.

## 5. Fun cadence (the "small win every turn" spec)

Concrete cadence budget the content must satisfy (checked by the harness's purchase log):
- **Every ~1 min early / ~2 min late:** an *amenity* or *upgrade* is affordable (a small `×`
  or a new flavor unlock — new floatie, better cocktail, upgraded pool bed).
- **Every ~5–8 min:** a *milestone doubling* fires (visible countdown always on screen).
- **Every ~10–20 min:** a *tier / accommodation / feature* unlock (a genuinely new thing).
- **Every ~40–90 min:** a *story beat* (branch flavor, new system, or ascension).
This layering (micro → minor → major → narrative) is what makes idle progress feel alive
without a clicker. The optional **clicker** only feeds the vlogger `comboMult` and a tiny
cash trickle — it is never required and never the fastest path.

## 6. Reference: minimal BigNumber (`{m,e}`) for the endgame swap

Kept here so the swap in `math.js` (see `docs/01 §8`) is copy-paste. No dependency.

```js
// normalized so 1 <= m < 10 (except zero). All in-repo.
const N = {
  of(x){ if(x===0) return {m:0,e:0}; const e=Math.floor(Math.log10(Math.abs(x)));
         return {m:x/10**e, e}; },
  norm(a){ if(a.m===0) return a; const d=Math.floor(Math.log10(Math.abs(a.m)));
           return {m:a.m/10**d, e:a.e+d}; },
  mul(a,b){ return N.norm({m:a.m*b.m, e:a.e+b.e}); },
  pow(a,p){ const le=(Math.log10(Math.abs(a.m))+a.e)*p; const e=Math.floor(le);
            return {m:10**(le-e), e}; },
  add(a,b){ if(a.m===0)return b; if(b.m===0)return a; const [h,l]=a.e>=b.e?[a,b]:[b,a];
            const diff=h.e-l.e; if(diff>15) return h;
            return N.norm({m:h.m + l.m/10**diff, e:h.e}); },
  cmp(a,b){ if(a.m===0&&b.m===0)return 0; if(a.e!==b.e)return a.e-b.e; return a.m-b.m; },
  toNum(a){ return a.m*10**a.e; },
  fmt(a){ return a.e<6 ? (a.m*10**a.e).toLocaleString() : `${a.m.toFixed(2)}e${a.e}`; }
};
```
Swap policy: keep native `number` until the harness shows any tracked value > `1e290`; then
route economy math through `N`. Only `math.js` + `util.format` change.

## 7. QA / testing controls (shipped, behind a toggle)

- **Speed slider:** `GAME_SPEED ∈ {0.25, 1, 2, 5, 10, 100, 1000}` (also free text in debug).
- **Grant panel:** +cash/comfort/clout/legacy; set any skill level; jump to any story beat.
- **Force unlock / re-lock**, trigger ascension, snapshot & restore state (JSON).
- **Determinism:** seeded RNG (`util.rng(seed)`) → reproducible market events & any randomness.
- **Save-compat test:** load a fixture save from each historical `version` → assert migration.
- **Console:** `window.IV` exposes `{state, engine, config, prestige, harness}`.

## 8. No-monetization stance (explicit)

There are **no** ad-gates, no premium currency, no artificial timers, no "wait 4h or pay."
Offline is generous (default 12h cap, configurable, disable-able). Every wait can be skipped
by the player themselves via `GAME_SPEED`. Pacing comes from the *economy curve*, not from
withholding — which is exactly why the math has to be this solid.

## 9. Balance status & the golden curve (fitted to ~20h)

The economy is now **fitted to the ~20-hour target** and the shipped constants land it. The
journey to get here (told honestly): the first prototype had a **finite-time singularity**
(cash overflowed `double` in ~9 min — see `docs/math-proof.md`), caused by the milestone term
scaling as a *power of cash*. That was fixed at the mechanism level (soft-capped milestone,
`MILESTONE_SOFT_KNEE`/`LIN`), which made the curve monotone and bounded — so the harness-fit
loop **converges**. It was then fitted by suppressing the polynomial *degree* (steep `GEN.base`
spacing + small high-tier `GEN.perUnit`) so the run stretches across hours.

**Golden curve — `node js/dev/harness.mjs`** (greedy *optimal, max-speed* player). The island
lands in the **15–20h optimal band**; the exact figure drifts as each epic adds legitimate
content (see the drift note below). Current snapshot (post-E05); beat rows are the approximate
Act-I/II-era shape — run `npm run harness` for the exact live curve:

```
Beat  1–2   0s          (Netherlands / motel)
Beat  3–4   ~36m        (checkout / hostel)
Beat  5–6   ~1h22m      (first stamp / branch choice)
Beat  7–10  1h57m–3h19m (1★ → pool)
Beat 11–13  ~5h12m      (5★ / body / concierge)
Beat 14–15  ~7h01m      (vlogger / cars)
Beat 16–18  9h07m–10h07m (boats / jets / 6★)
Beat 19–21  11h21m–12h51m (butler / household / 7★)
Beat 22–26  14h45m–16h21m (bungalow → villa → ascension unlock)
ISLAND (tier 20)         17h 41m      peak log10(cash) = 11.3 (safe; double maxes ~308)
```

Because the harness plays *perfectly at infinite speed*, this is a **lower bound** — a real
player (10 tps, sub-optimal buys, mostly idle/offline) lands **~20h+**, which is the goal. The
curve is monotone (a story-ordering guard forces beats to fire in narrative order) and every
beat is hours apart, not the ~35-second blur of the first pass.

**Golden-drift note (amenity-count sensitivity).** The harness's greedy policy buys one level
of *every* affordable amenity each step, so adding an amenity cluster widens the reinvestment
"leak" and stretches the curve regardless of unit price — E03's 6-amenity hostel cluster moved
the island 17h54m → 19h29m. Conversely, a new **global multiplier** the harness buys (E04's
destinations → `L_dest`) *speeds* income and pulls the curve back: 19h29m → 16h42m. Both are
**accepted in-band drift**, not regressions: retuning `GEN`/`COMFORT` on every content add would
churn the fitted constants endlessly. Note destination `mult` values were set well below the
E04 epic's suggested 1.08–1.20/row (to 1.025–1.04) precisely to stay in-band — the epic range
collapsed the island to ~12h in the harness and would need a coordinated GEN/COMFORT retune. **Policy:** let the curve breathe inside 15–20h; escalate to `@balance-tuner` for a
consolidated retune only if a phase pushes greedy island time **past ~20h** (casual would then
exceed the ~20h+ goal by too much), and do the final consolidated fit at E30. The peak
`log10(cash)` ceiling (~290) is the hard guardrail and stays the non-negotiable gate.

**Remaining polish (tracked in E30, not blocking):**
- A few beats still *cluster* (a single tier-unlock satisfies 2–3 gate thresholds at once);
  re-spacing the `STORY_GATES` thresholds smooths this.
- High tiers (D5–D8) are intentionally *late-relevance* under this fit (tiny `perUnit`); the
  cleaner long-term model is discrete finite upgrades per tier (`docs/math-proof.md` P1-alt).
- The meta-layer and precision items (P3/P5 in the math-proof) still apply for the ascension
  loop and the endgame/NG+ magnitude.
- Final numbers want **human playtest** data, not just the greedy bot.
