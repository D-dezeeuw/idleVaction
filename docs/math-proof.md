# Math-Proof — economy scale investigation

A rigorous, **measured** investigation of the idleVaction economy at scale. Every claim
below is backed by a numerical experiment run against the real engine (`js/*`), not
hand-waving. Two questions drive it:

1. **Does one active run hold up to ~20 hours?**
2. **Does the economy scale gracefully with ascensions and the permanent skill tree?**

> Reproduce: the experiment scripts live in the session scratchpad; the shipped harness is
> `node js/dev/selftest.mjs` (prints the story-beat curve). Numbers below are from a
> deterministic greedy "optimal, max-speed" player (buys the best affordable purchase every
> sim-second). **That policy is a *lower bound* on active time** — a real human idles, plays
> sub-optimally, and spends most of the game offline, so real playthroughs are much longer
> than the harness numbers. But a lower bound of *4 minutes* against a 20-hour target is, by
> itself, disqualifying — so that is where we start.

---

## 0. TL;DR verdict

| Question | Verdict | Evidence |
|---|---|---|
| Holds to 20h for one run? | ❌ **No, as originally shipped.** Optimal play reaches the Private Island in **~4 min** and cash **overflows `double` (>1e300) at 9m 26s**. | §2–§4 |
| Root cause identifiable & fixable? | ✅ **Yes.** The `2^(bought/step)` milestone term scales as **cash^α (α≈0.66)**, which compounds across the 8-tier chain into a **finite-time singularity**. | §3 |
| Fix verified? | ✅ **Applied.** A soft-capped milestone curve (config-driven) **removes the overflow** (peak 1e52 → no overflow) and **tames the collapse**. Remaining gap to 20h is now a *tractable constant-fit*, not a structural fight. | §5–§6 |
| Scales with ascensions? | ⚠️ **Mechanically correct** (banked-Legacy accounting is exact; √-prestige verified) but the meta-reward layer is **inconsistent** (additive vs multiplicative) and under-rewarding (~N^0.10). Fixable. | §7 |
| Scales with skill tree? | ✅ **Bounded & safe** (capped ranks; permanent mult ×~8–40). Pre-fix it *multiplied the runaway*; post-fix it's fine. One node (`faster_metab`) worsened the pre-fix singularity. | §8 |
| Precision plan sound? | ⚠️ The `{m,e}` BigNumber plan is correct, but the trigger must be **watched from mid-game**, not "endgame only," once any power-law feedback exists. | §9 |

---

## 1. Method & the two growth engines

The economy has **two independent growth engines**, and telling them apart is the whole game:

**Engine A — the tier chain (good, slow, wanted).** Higher tiers produce lower tiers; only
D1 produces cash (`docs/01 §1.1`). With constant multipliers and no purchases this is a
linear ODE system:

```
count_8' = 0
count_{k-1}' = count_k · perUnit_k · M_k       (k = 8..2)
Cash'      = count_1 · perUnit_1 · M_1
```

Solving top-down, `count_1(t)` is a **polynomial of degree (D−1)** where `D` = highest owned
tier, and `Cash(t)` is a **polynomial of degree D**. Owning a new tier raises the polynomial
**degree**; buying multipliers raises its **coefficients**. Polynomial-in-time growth is
naturally slow and *long* — exactly what a 20-hour game wants. **This engine is not the
problem.**

**Engine B — the milestone doubling (the problem).** `milestoneMult_k = 2^floor(bought_k/step)`.
This depends on how many units you've *bought*, and a greedy player keeps buying — so this
term feeds back on itself through the economy. §3 shows this feedback is a positive power of
cash, which is fatal.

Everything downstream (Comfort, paths, skills, ascension, tree) is a *multiplier layer* on
top; §3/§8 show which are safe (log/bounded) and which are not.

---

## 2. Measured evidence — the run is a hockey stick

**Time for cash to grow ×10 (Engine measured, greedy, original constants):**

| cash reaches | at | seconds for the previous ×10 |
|---|---|---|
| 1e2 | 1m 24s | — |
| 1e3 | 2m 23s | **+59s** |
| 1e4 | 3m 31s | **+68s** |
| 1e5 | 3m 49s | **+18s** |
| 1e6 | 4m 04s | **+15s** |
| 1e7 | 4m 05s | **+1s** |
| 1e8 | 4m 08s | **+3s** |

The seconds-per-decade **collapse toward zero**. That is the signature of a **finite-time
singularity**: the instantaneous growth rate `g(cash) = Cash′/Cash` *increases* with cash, so
the doubling time shrinks to nothing and the curve goes vertical. A well-paced idle game wants
`g` roughly **constant** (steady exponential ⇒ constant doubling time) or gently **decreasing**
(soft-capping). Ours does the opposite.

Consequences measured:
- **Private Island reached at ~4 min** (target: ~20 h → **~300× too fast**).
- **Cash exceeds 1e300 / goes `Infinity` at 9m 26s** — a single run overflows native doubles
  in under ten minutes (double maxes at ≈1.8e308).
- Ascension makes it worse, not better: a **90-second** post-ascension run produced a lifetime
  cash of **1.14e57** (and the next, **1.33e194**) — see §7.

---

## 3. Root cause — the milestone term is a *power of cash*

A greedy player buys tier `k` until the next unit is unaffordable. The n-th unit costs
`base_k · growth_k^n`, so at cash `X` the bought count satisfies `growth_k^bought ≈ X·(g−1)/base`,
i.e.

```
bought_k ≈ log_growth(X) = ln(X · (g−1)/base) / ln(growth_k)
```

Substituting into the milestone term:

```
milestoneMult_k = 2^(bought_k / step)
               = exp( (ln2/step) · bought_k )
               = ( X·(g−1)/base )^αk           with   αk = ln2 / (step · ln growth_k)
```

**The milestone multiplier is a positive power of cash, `X^αk`.** With `step = 10`:

| tier | growth | **αk = ln2/(10·ln growth)** |
|---|---|---|
| D1 | 1.11 | **0.664** |
| D2 | 1.14 | 0.529 |
| D3 | 1.17 | 0.442 |
| D4 | 1.20 | 0.380 |
| D5 | 1.23 | 0.335 |
| D6 | 1.26 | 0.300 |
| D7 | 1.29 | 0.272 |
| D8 | 1.32 | 0.250 |

Now feed that back. Even D1 in isolation gives `Cash′ ≈ count₁ · X^0.664 ≈ ln(X)·X^0.664`, which
integrates to `Cash ∝ t^{1/(1−0.664)} = t^2.98` — fast, but still only polynomial. **The
singularity comes from the chain**: `count₁` is *also* fed by D2, whose output carries `X^0.529`,
which is fed by D3 carrying `X^0.442`, … Each tier injects another `X^αk` factor into the
production of the tier below it, so the *aggregate* cash-exponent of `Cash′` climbs **past 1**.
Once `Cash′ ∝ X^p` with `p > 1`, the solution blows up in finite time. The measured collapse in
§2 (`g` rising with cash) is the direct fingerprint of `p > 1`.

**Decomposition confirms milestone is the culprit** (greedy, t = 120s):

```
D1 bought=29, comfort=102, cash=378
  milestone  ×4.00     ← 92% of the log-multiplier
  L_upgrade  ×1.00
  L_comfort  ×1.131    ← a healthy log term (safe)
  TOTAL M_1  ×4.52
```

By ~3m40s D1's milestone alone is **×128** and `M_1 ≈ 393`. Comfort's contribution (`L_comfort =
1 + 0.4·log10(1+Comfort/C0)`) is a **log** of cash-ish quantities — bounded and healthy. The
milestone is the only layer that scales as a *power* of cash, and it dominates.

---

## 4. Why you cannot fix this by scaling constants

Set `Cash′ = A·X^p` with `p>1`. The blow-up time is `t* = X0^{1−p} / (A·(p−1))`. Because `p`
is set by the α-structure (which depends on `ln growth`), and the prefactor `A` depends on
`base/perUnit`, **`t*` moves only logarithmically** when you scale `base`/`growth`. Empirically:
widening the tier base spacing from ×10 to ×250–1000 per tier and steepening every growth slope
moved the island from **~2 min to ~4 min** — a 2× shift for a 100–1000× change in constants. You
cannot buy 300× (2 min → 20 h) out of a singularity by scaling; you must **change `p` to ≤ 1**.
That means changing the *shape* of the milestone term, not its coefficients.

---

## 5. The fix (P0, **applied & verified**) — soft-cap the milestone

Keep the fun (visible early doublings), kill the power-law tail. The first `KNEE` doublings stay
exponential; after that each further doubling adds only a **linear** `LIN`:

```js
// js/math.js (shipped), knobs in js/config.js
milestoneMult(bought) {
  const m = floor(bought / MILESTONE_STEP);
  return m <= KNEE ? MILESTONE_MULT^m
                   : MILESTONE_MULT^KNEE · (1 + LIN·(m − KNEE));   // KNEE=4, LIN=0.5
}
```

**Why it works:** past the knee, `milestoneMult ∝ (m − KNEE) ∝ bought ∝ log(cash)`. A *log* of
cash, not a *power*. That drops the milestone's cash-exponent from `α≈0.66` to `0`, so the
aggregate `p` falls back to the polynomial regime (`p ≤ 1`). No singularity, bounded magnitude.

**Verified — same greedy harness, only the milestone shape changed:**

| metric | before (power-law) | after (soft-cap) |
|---|---|---|
| seconds/decade at 1e6→1e7 | **+1s** (collapsing) | **+27s** (steady) |
| seconds/decade at 1e7→1e8 | +3s | +12s |
| cash > 1e300 / Infinity | **yes, at 9m 26s** | **never** (peak log10 ≈ 52 over a 1-hour probe) |
| self-test | passes but overflows off-screen | **passes, peak lifetime €69B, comfort finite** |

The overflow crash is gone and the collapse is tamed. The early game is untouched (at t=120s
`bought=29 → m=2 ≤ KNEE`, still ×4 — the knee only bites later, preserving the dopamine).

> The knee-then-linear shape is the surgical fix. An even more genre-canonical alternative is
> to replace free doublings with a **finite set of discrete purchasable ×2 upgrades** per tier
> (the *AdVenture Capitalist* model): finite ⇒ provably no runaway, and each is a deliberate,
> tunable pacing beat. Recommended if you want maximum control (see P1-alt).

---

## 6. Pacing to 20 hours (P1) — now a tractable fit

With Engine B tamed, growth is dominated by **Engine A (the polynomial tier chain)**, and the
20-hour target becomes a *schedule-fitting* problem instead of a fight against a singularity:

**Design equation.** `Cash(t)` is polynomial of degree `D(t)` = highest owned tier at time `t`.
The degree only rises when the player can afford the **first unit** of the next tier, i.e. when
`Cash(t) ≥ base_{k}`. So the entire curve is controlled by the **base-cost schedule** `base_k`
(when each degree step happens) and the **coefficient multipliers** (comfort/skill/path/ascension,
all log/softcapped). Procedure:

1. Pick a target **unlock schedule** `T_k` for D1…D8 and for accommodation tiers 0…20 across
   20 h — e.g. degree stays 1–2 for the first ~30 min (constant small wins), reaching degree
   ~6 only in the final hours. A geometric-in-time schedule works: `T_k ≈ 20h · (k/8)^γ`.
2. Set `base_k` so that the cash produced by tiers `<k` first reaches `base_k` at `T_k`. Because
   `Cash ∝ t^D`, this is a closed-form back-solve, not guesswork.
3. Set the **coefficient** layers to hit the *within-tier* time-to-next-purchase band (30–120s
   active, `docs/05 §5`): tune `growth_k` and the (now bounded) milestone/`L_upgrade`.
4. Close with the harness: `node js/dev/selftest.mjs` prints `T(beat)`; nudge the biggest-miss
   lever; repeat. **This loop now converges** because the curve is monotone and non-singular.

**P2 — bound the chain coefficients.** Give higher tiers `perUnit_k < 1` (e.g. `[1, 0.7, 0.5,
0.4, 0.3, 0.25, 0.2, 0.15]`). This slows the polynomial *coefficient* explosion (each tier
injects fewer lower-tier units/s) without touching the degree schedule — a clean, orthogonal
pacing dial and a hedge against precision blow-up (§9).

This is the E30 "final 20h fit" task (`docs/epics/epic-30.md`), now unblocked.

---

## 7. Ascension scaling

**Accounting is correct (verified).** The banked-Legacy telescoping pays exactly the √-prestige
increment and never double- or under-pays:

```
cumCash 1e6 → +1 Legacy (total 1)
cumCash 4e6 → +1 Legacy (total 2)      ⇒ 4× lifetime cash yields 2× Legacy — √ scaling exact ✓
```

`legacyGain = floor(K·√(cumCash/scale)) − banked`, and `ascend()` increments `banked` by the raw
gain, so across many ascensions the totals telescope to `floor(K·√(cumCash/scale))`. Good.

**But the reward *curve* is weak and internally inconsistent.**

- **Diminishing by design (fine):** a fresh run re-earns ≈ its peak, so after `N` similar runs
  `cumCash ≈ N·peak` and `Legacy ≈ K·√(peak/scale)·√N`. Legacy grows as **√N** — intended
  anti-runaway.
- **But the *speed-up* per ascension is tiny.** The only thing that accelerates the next run is
  **tree nodes bought with Legacy**, whose ranks are geometric-cost (`nodeBase·2^rank`), so
  affordable rank `≈ log2(Legacy) ≈ ½log2(N)`. With `sun_kissed = ×1.15^rank`, the meta-mult
  scales as `1.15^{½log2 N} = N^{0.10}`. **Each ascension buys ~10% more reach per doubling of
  runs** — barely felt. Players may not perceive progress.
- **Inconsistency:** `sun_kissed` is **multiplicative** in rank (`1.15^rank`, in
  `math.treeIncomeMult`) while `compounding_interest` feeds an **additive** layer
  (`L_ascension = 1 + 0.10·rank`, in `math.tierMultiplier`). Two nodes that read as "permanent
  income ×" behave on different curves. Pick one model (recommend **multiplicative** for all
  permanent income nodes) and re-derive.
- **`faster_metab` was actively harmful pre-fix.** It lowers `MILESTONE_STEP` 10→6, and
  `α = ln2/(step·ln growth)` *rises* as step falls (`α_1: 0.664 → 1.106`), i.e. it **accelerated
  the singularity**. Post-P0 it's safe (it just grants more pre-knee doublings), but this shows
  how the pre-fix design coupled a "nice" meta-node to a blow-up.

**Recommendation (P3).** Make the meta layer explicitly **multiplicative with a target
per-ascension speed-up**. Define a desired curve, e.g. "each of the first ~10 ascensions should
cut optimal time-to-island by ~20–30%, tapering after." Concretely:

```
L_ascension = Π_nodes (1 + rate_node)^rank_node          // all multiplicative, one model
targetSpeedup(N) ≈ 1.25^min(N, 10) · 1.05^max(0, N−10)   // designer-chosen
```

then solve node `rate`/cost so that greedily-spent Legacy at ascension `N` yields
`L_ascension ≈ targetSpeedup(N)`. Validate by re-running Experiment 2 (per-run time-to-wall
should drop on the target curve). The harness already measures exactly this.

---

## 8. Skill-tree scaling

**Bounded — the tree itself cannot run away.** Every node has a `maxRank`, so the permanent
multipliers are capped. Worst-case permanent income factor:

```
sun_kissed  ×1.15^10 = ×4.05
L_ascension  1 + 0.10·10 = ×2.0       (compounding_interest maxed)
second_wind  ×5 (timed 5-min window, not permanent)
silver_tongue costs ×0.97^10 → floor 0.40 (−60% cost)
→ steady permanent income ≈ ×8; with the Second-Wind window ×≈40 transiently
```

That's a healthy prestige ceiling — big enough to matter, far from overflow.

**The danger was *interaction*, not the tree.** Pre-fix, this bounded ×8–40 multiplied a
*singular* base economy, so it simply reached `Infinity` sooner (the 9m26s overflow includes
tree effects in longer runs; Experiment 2 hit 1.33e194 within two ascensions). Post-P0 the base
is polynomial, so the tree is a clean constant multiplier — exactly what a skill tree should be.

**Recommendation (P4):** keep node effects **multiplicative and capped** (they are), and ensure
no node reduces `MILESTONE_STEP` below the point where `m > KNEE` is unreachable in a run (else
the soft cap never engages). With `KNEE=4` and `step` floored at 6 via `faster_metab`, a run
needs ≥ `6·(KNEE+1) = 30` bought to pass the knee — always true past early game. Safe.

---

## 9. Precision / BigNumber

- Native `double` overflows at ≈**1.8e308**. **Pre-fix, a single run hit that in 9.5 min** — the
  `docs/01 §8` claim of "~1e60 peak for a 20h run" was **false for the shipped constants** (they
  produce a singularity). Post-P0, a 1-hour optimal probe peaks at **~1e52** — inside `double`,
  but only because the run is still too fast; a properly-paced 20 h run must be re-measured.
- **Rule to adopt:** the `{m,e}` mantissa/exponent swap (`docs/05 §6`) should be triggered by a
  **monitored magnitude**, not a game-phase label. Add to the harness: assert
  `max log10(trackedValue) < 290` across a full simulated arc **including** max tree + `N`
  ascensions + NG+ gate scaling (`gateScale^ng`). The moment that assertion fails, route economy
  math through `{m,e}` (localized to `math.js` + `util.format`, already designed). Any residual
  power-law feedback anywhere re-introduces the risk, so keep the assertion in CI (the golden
  file).
- **P2 (`perUnit_k < 1`)** also lowers peak magnitude, buying precision headroom for free.

---

## 10. Prioritized recommendations

| # | Change | Type | Status | Effect |
|---|---|---|---|---|
| **P0** | Soft-cap the milestone multiplier (knee-then-linear) | 1 function + 2 config knobs | ✅ **applied** | Removes finite-time singularity **and** double overflow; keeps early doublings |
| **P1** | Fit `base_k`/`growth_k` to a 20 h unlock schedule via the harness loop | tuning (E30) | proposed | Lands the 20 h target; now converges (no singularity) |
| P1-alt | Replace free doublings with finite discrete ×2 upgrades (AdCap model) | data + small engine | optional | Maximum, provably-bounded pacing control |
| **P2** | `perUnit_k < 1` for higher tiers | 1 config array | proposed | Bounds polynomial coefficients + precision headroom |
| **P3** | Make the ascension meta layer multiplicative with a target speed-up curve | `math.js` + `config.TREE` | proposed | Ascensions *feel* rewarding; fixes additive/multiplicative split |
| **P4** | Keep tree nodes multiplicative & capped; guard `step` vs `KNEE` | audit | mostly done | Tree stays a clean bounded multiplier |
| **P5** | Magnitude-triggered `{m,e}` BigNumber + CI assertion `log10 < 290` | harness + `math.js` | proposed | No overflow across prestige layers + NG+ |

**Bottom line.** The *architecture* is sound and the prestige *accounting* is exact. The single
structural flaw was the milestone doubling behaving as a power of cash, which turned the whole
economy into a finite-time singularity and overflowed `double` in minutes. That is now fixed and
verified at the mechanism level; hitting the precise 20-hour curve is the remaining work, and it
is ordinary tuning (E30) rather than a redesign — because the curve is finally monotone,
bounded, and tweakable.

---

### Appendix — reproduce

```bash
node js/dev/selftest.mjs      # shipped harness: prints the story-beat curve + all asserts
# The §2–§8 experiments (growth shape, α decomposition, overflow probe, doubling-time
# collapse, ascension acceleration, banked-Legacy accounting) were run as standalone
# scripts importing js/{config,math,engine,prestige,state}.js against the same engine.
```

Key constants involved (all in `js/config.js`): `GEN.base`, `GEN.growth`, `GEN.perUnit`,
`MILESTONE_STEP`, `MILESTONE_MULT`, `MILESTONE_SOFT_KNEE`, `MILESTONE_SOFT_LIN`,
`COMFORT.MULT/C0`, `ACC.growth/cashMult/unlockFrac`, `LEGACY_K/SCALE/EXP`, `TREE.nodeBase/nodeGrowth`.
