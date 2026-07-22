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

> **Ascension-loop amendment (supersedes the compress-on-reset reading of this table):**
> each ascension is now a **full ≥8h run of its own** — a hard reset (only tree
> abilities + Legacy cross) with phase gates scaled `×base^(√count·(tier/span)²)`, so
> ascended runs land on a stable ~9–12h greedy-bot band (≈ run 1's own measuring
> stick) with early tiers *faster* than run 1 and late tiers *slower*. The ~20h
> figure is the FIRST summit; the ascension loop multiplies total game length per
> reset rather than compressing into the same 20h. Fitted table + rationale:
> `docs/math-proof.md §12`.

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
11. `OFFLINE_CAP`, `OFFLINE_STEPS` — away generosity (simulation length only — the
    *magnitude* of away income is bounded by lever 13, the wallet).
12. `GAME_SPEED` — **pace/QA only, never used to balance.**
13. `BANK.base/growth/costFrac` — the **wallet cap** (bank-account ladder): bounds how
    much cash can pile up while away/idle, and how many accommodation tiers a returning
    lump can chain-buy (`costFrac` sets the sink size + upgrade cadence, `growth` the
    chain-buy ceiling, `base` how soon a fresh save's first return is capped). See
    `docs/math-proof.md §11`.
14. `ASCEND_GATE.base/exp/countExp` — **ascension re-pacing**: phase gates cost
    `×base^(count^countExp·(tier/span)^exp)`, holding every ascended run over the ≥8h
    floor with the early-fast/late-slow parabola (`base` sets the floor's strength,
    `exp` how hard it leans on late tiers, `countExp` must track the Legacy √N arc —
    see `docs/math-proof.md §12`). Pairs with `LEGACY_SCALE` (retuned 1e6 → 1e10),
    which meters how much of the tree one ascension can buy.

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
- **Wallet cap (bank ladder):** all cash inflow clamps to `BANK.base·growth^tier` →
  away/idle lumps are bounded by *stored cash*, not elapsed time; only banked cash
  counts toward `lifetimeCash`, so the Savvy/Legacy/tier-reveal loops above are paced
  with it. (`docs/math-proof.md §11` — the measured offline-leapfrog fix.)

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

The **wallet cap** (`config.BANK`) is part of that economy curve, not a monetization
timer: offline still earns at the full 100% rate until the wallet is full, nothing is
ever confiscated, and the fix is always a purchase the player already wants (the next
bank account — itself a "small win" on the §5 cadence). What it removes is the
away-lump that let one overnight absence leapfrog half the accommodation ladder
(`docs/math-proof.md §11`) — and the concierge (E11)/staff (E19+) automation is the
designed way to keep *spending* through the cap while away.

## 9. Balance status & the golden curve (fitted to ~20h)

The economy is now **fitted to the ~20-hour target** and the shipped constants land it. The
journey to get here (told honestly): the first prototype had a **finite-time singularity**
(cash overflowed `double` in ~9 min — see `docs/math-proof.md`), caused by the milestone term
scaling as a *power of cash*. That was fixed at the mechanism level (soft-capped milestone,
`MILESTONE_SOFT_KNEE`/`LIN`), which made the curve monotone and bounded — so the harness-fit
loop **converges**. It was then fitted by suppressing the polynomial *degree* (steep `GEN.base`
spacing + small high-tier `GEN.perUnit`) so the run stretches across hours.

**Golden curve — `node js/dev/harness.mjs`** (greedy *optimal, max-speed* player, **ROI-aware**).
The harness measures a genuine **max-speed lower bound**: it reinvests into generators/tiers and
buys an amenity **only when that amenity pays for itself** (or is needed to clear a Comfort gate) —
see `amenityWorthBuying` in `js/dev/harness.mjs`. Current snapshot (**post-E07, ROI harness**);
beat rows are the compressed Act-I/II-era shape — run `npm run harness` for the exact live curve:

```
Beat  1–2   0s          (Netherlands / motel)
Beat  3–4   ~20m        (checkout / hostel)
Beat  5–6   ~42m        (first stamp / branch choice)
Beat  7–10  1h02m–1h45m (1★ → pool)
Beat 11–13  ~2h35m      (concierge / body / 5★)
Beat 14–15  ~3h18m      (vlogger / cars)
Beat 16–18  4h05m–4h28m (boats / jets / 6★)
Beat 19–21  4h55m–5h27m (butler / household / 7★)
Beat 22–26  6h20m–6h54m (bungalow → villa → ascension unlock)
ISLAND (tier 20)         8h 37m       peak log10(cash) = 11.3 (safe; double maxes ~308)
```

> **Baseline re-pin (wallet cap):** the island moved 8h26m55s → **8h37m00s (31 020 s)**
> when the bank-account wallet cap landed — a *deliberate* economy change (the ladder is
> a genuine new sink and the greedy policy now climbs it; `docs/math-proof.md §11.5`).
> The harness-invariance tests pin this new number; everything else in the snapshot
> (monotone beats, 26 reached, peak magnitude) is unchanged.

Because the harness plays *perfectly at infinite speed and never wastes a euro*, this is a **hard
lower bound** on active time — a real player (10 tps, sub-optimal buys, and, crucially, *mostly
idle/offline*) runs several× longer and still lands the **~20h+** arc that `config.js` is fitted
to (the economy is **unchanged**). The curve is monotone (a story-ordering guard forces beats to
fire in narrative order) and every beat is a genuine step apart.

> **Why the island dropped 19h11m → 8h27m at E07-and-a-half (harness fix, not an economy change).**
> The *previous* harness policy bought one level of **every** affordable amenity each step — a
> *completionist*, not the "max-speed" player the harness docstring claims to measure. In this
> economy an amenity's only income effect is via Comfort → `L_comfort`, which is (a) log-softcapped
> and (b) dominated at every tier by the accommodation ladder's own `accScore`; so amenity buying
> is almost pure **cash leak** that *delays* the island rather than hastening it. That leak — not
> the tier chain — was quietly doing ~10.7h of the old "pacing," and it grew with every amenity
> cluster. Making the buy **ROI-aware** removes the artifact and reveals the true speed-optimal
> lower bound (~8.5h). Casual play still lands ~20h+; that target lives in `config.js`, which we
> did **not** touch.

**Golden-drift note (now retired for amenities).** The whole reason the old snapshot drifted with
content was that completionist amenity buying leaked cash *regardless of unit price* — E03's hostel
cluster alone moved the island 17h54m → 19h29m, and with ~10 more amenity epics ahead (beach, spa,
yacht, jet, island…) the greedy island was on track to breach 20h purely from **cosmetic count**.
The ROI harness makes that impossible: a dominated/cosmetic amenity has a vanishing
`ΔL_comfort/L_comfort`, so its payback is effectively infinite and it is **skipped**. Measured
directly — dropping **five** throwaway cosmetic amenities (cheap-and-spammy through expensive) into
the data moved the ROI island by **15s (0.05%)**, versus **43m15s (3.76%)** on the old completionist
policy. So the **per-phase amenity-cluster drift-watch is retired**: adding amenities no longer
requires re-baselining this golden. **New guard (simpler):** the greedy ROI island should stay in
the **~6–12h band**, all **26 reachable beats** should fire monotonically, and **peak `log10(cash)`
must stay well under ~290** (the hard, non-negotiable magnitude ceiling). Escalate to
`@balance-tuner` for a `GEN`/`COMFORT`/`ACC` retune only if a *genuine economy* change (new
generator tiers, destination `L_dest`, comfort/cost curves — **not** new amenities) pushes the
island outside that band or the magnitude toward the ceiling; do the final consolidated fit at E30.
Note destination `mult` values were kept well below the E04 epic's suggested 1.08–1.20/row (to
1.025–1.04) — a legitimate `L_dest` lever that, unlike amenities, *does* move the ROI island and so
still warrants review when new destination epics land.

**Remaining polish (tracked in E30, not blocking):**
- A few beats still *cluster* (a single tier-unlock satisfies 2–3 gate thresholds at once);
  re-spacing the `STORY_GATES` thresholds smooths this.
- High tiers (D5–D8) are intentionally *late-relevance* under this fit (tiny `perUnit`); the
  cleaner long-term model is discrete finite upgrades per tier (`docs/math-proof.md` P1-alt).
- The meta-layer and precision items (P3/P5 in the math-proof) still apply for the ascension
  loop and the endgame/NG+ magnitude.
- Final numbers want **human playtest** data, not just the greedy bot.
