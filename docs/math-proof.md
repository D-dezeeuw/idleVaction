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
| Holds to 20h for one run? | ⚠️→✅ **Now yes (fitted).** As *originally shipped* it did not — optimal play hit the island in **~4 min** and cash **overflowed `double` at 9m 26s**. After the P0 fix + a degree-suppression fit, the greedy-optimal harness lands the **island at ~18h** (robust across buy-cadence), peak `1e11` — so casual play is ~20h+. | §2–§6, §10 |
| Root cause identifiable & fixable? | ✅ **Yes.** The `2^(bought/step)` milestone term scales as **cash^α (α≈0.66)**, which compounds across the 8-tier chain into a **finite-time singularity**. | §3 |
| Fix verified? | ✅ **Applied.** A soft-capped milestone curve (config-driven) **removes the overflow** (peak 1e52 → no overflow) and **tames the collapse**. Remaining gap to 20h is now a *tractable constant-fit*, not a structural fight. | §5–§6 |
| Scales with ascensions? | ⚠️→✅ **Now yes (designed & fitted).** The accounting was always exact, but the fitted economy's Legacy payout was a firehose (run 1 → ~1,183 Legacy → 56/79 tree ranks → the next run collapsed to **11 minutes**). The hard reset + metered Legacy (scale 1e10, gate-deflated) + √-count parabolic gate scaling land every ascended run **≥ 8h** on a stable ~9–12h band. | §7, §12 |
| Scales with skill tree? | ✅ **Bounded & safe** (capped ranks; permanent mult ×~8–40). Pre-fix it *multiplied the runaway*; post-fix it's fine. One node (`faster_metab`) worsened the pre-fix singularity. | §8 |
| Precision plan sound? | ⚠️ The `{m,e}` BigNumber plan is correct, but the trigger must be **watched from mid-game**, not "endgame only," once any power-law feedback exists. | §9 |
| Offline income bounded? | ⚠️→✅ **Now yes (wallet cap).** As shipped through E13 it was not — a 20-minute save left offline 12 h returned **+1.7e8 cash (135× linear accrual)** and chain-bought **12 of the 20 accommodation tiers** on return. The bank-account wallet cap bounds the returning lump to one wallet (measured: +3.8e4, 3 tiers) and makes it invariant to away-length. | §11 |

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

> **⚠️ 2026-07 addendum — this section's *verdict* inverted under the fitted constants, and
> §12 supersedes its recommendation.** The analysis below (√N Legacy, exact banked
> accounting) still holds, but "the speed-up per ascension is tiny" was true only for the
> pre-fit economy: the *fitted* run banks ~1.4e12 cash, so `LEGACY_SCALE=1e6` paid ~1,183
> Legacy at the first ascension — the whole tree at once, collapsing run 2 to ~11 minutes
> (measured, §12.1). The shipped design now meters Legacy (`LEGACY_SCALE=1e10`,
> gate-deflated payout) and adds ascension-scaled phase gates; P3's "target per-ascension
> curve" goal is realized by §12's fitted band rather than by retuning node rates.

**Recommendation (P3, superseded by §12).** Make the meta layer explicitly **multiplicative with a target
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
| **P1** | Fit `base_k`/`growth_k`/`perUnit_k` to the 20 h schedule via the harness loop | tuning | ✅ **landed (coarse)** | Greedy-optimal island **~18h** (`node js/dev/harness.mjs`), monotone beats; polish (even gate spacing, playtest) remains E30 |
| P1-alt | Replace free doublings with finite discrete ×2 upgrades (AdCap model) | data + small engine | optional | Maximum, provably-bounded pacing control |
| **P2** | `perUnit_k < 1` for higher tiers | 1 config array | proposed | Bounds polynomial coefficients + precision headroom |
| **P3** | Make the ascension meta layer multiplicative with a target speed-up curve | `math.js` + `config.TREE` | proposed | Ascensions *feel* rewarding; fixes additive/multiplicative split |
| **P4** | Keep tree nodes multiplicative & capped; guard `step` vs `KNEE` | audit | mostly done | Tree stays a clean bounded multiplier |
| **P5** | Magnitude-triggered `{m,e}` BigNumber + CI assertion `log10 < 290` | harness + `math.js` | proposed | No overflow across prestige layers + NG+ |
| **P6** | Bank-account wallet cap (`config.BANK` + `engine.gainCash` clamp) | config + data + 1 clamp point | ✅ **applied** | Bounds the offline/idle-away lump to one wallet; chain-buy leapfrog 12 tiers → ≤ 4 worst-case; closes the open-tab loophole (§11) |
| **P7** | Ascension hard reset + `LEGACY_SCALE` retune + √-count parabolic gate (`config.ASCEND_GATE`) | prestige + config + 2 math fns | ✅ **applied** | Only tree abilities cross an ascension; every ascended run ≥ 8h on a stable band, early-fast/late-slow parabola per run; subsumes P3's goal (§12) |

**Bottom line.** The *architecture* is sound and the prestige *accounting* is exact. The single
structural flaw was the milestone doubling behaving as a power of cash, which turned the whole
economy into a finite-time singularity and overflowed `double` in minutes. That is now fixed and
verified at the mechanism level; hitting the precise 20-hour curve is the remaining work, and it
is ordinary tuning (E30) rather than a redesign — because the curve is finally monotone,
bounded, and tweakable. The second structural finding — unbounded offline/away lumps
leapfrogging the accommodation ladder — is likewise fixed and measured (§11): stored cash,
not elapsed time, is what the wallet cap bounds.

---

## 11. Offline lumps & the wallet cap (P6, **applied & verified**)

### 11.1 The problem — offline accrual is super-linear and spend-free

`applyOffline` replays the **same** `tick()` in `OFFLINE_STEPS` macro-steps (good: no
separate math to drift). But while away, nothing is *spent* — the whole multiplier stack
runs at full rate with no reinvestment outlet, and Engine A (the tier chain, §1) keeps
compounding: with `D` active tiers, `count₁` grows like `t^{D−1}` and the away-lump like
`t^D`. So the lump is **super-linear in away-time** — and `OFFLINE_CAP_H` bounds the
*time*, not the *magnitude*, and never applies at all to a tab left open overnight.

**Measured** (greedy player for `T_active`, then `applyOffline`, then chain-buying
accommodation on return — pre-cap engine):

| active | away | lump | ×linear accrual | acc tiers chain-bought on return |
|---|---|---|---|---|
| 20 m (tier 0) | 1 h | +3.1e5 | 3.0× | **5** (0 → 5) |
| 20 m (tier 0) | 12 h | +1.7e8 | **135×** | **12** (0 → 12) |
| 45 m (tier 3) | 12 h | +2.1e8 | 38× | 9 (3 → 12) |
| 90 m (tier 5) | 12 h | +1.2e9 | 29× | 9 (5 → 14) |
| 3 h (tier 10) | 12 h | +7.1e10 | 21× | 8 (10 → 18) |

The `×linear` column is the polynomial fingerprint (`t^D / (rate·t)` grows with `t` and
with `D`). The last column is the design failure: the Comfort gate self-satisfies once a
tier is owned (`ACC.unlockFrac 0.33 < 1/ACC.growth 0.385` — deliberately "never a hard
stall"), so a lump of cash converts **directly** into a chain of tier-ups. One overnight
absence let a 20-minute-old save skip more than half the accommodation ladder — the
entire Act I/II pacing (amenity reveals, story beats, path seeds) collapsed into one
click session.

### 11.2 Why not scale `OFFLINE_CAP_H` or an efficiency knob

- A shorter time-cap punishes sleep (against the no-monetization stance, `docs/05 §8`)
  and still leaves the lump super-linear inside the window.
- An offline-efficiency multiplier (`×0.5` etc.) rescales the lump but keeps it
  **unbounded** — the same leapfrog, one night later. §4's lesson applies unchanged:
  you cannot fix a shape problem by scaling a constant.
- Neither touches the **open-tab loophole**: idling online overnight was already an
  uncapped lump with no "offline" involved at all.

The correct control is a bound on the **stored quantity** — a wallet cap.

### 11.3 The mechanism — a bank-account ladder capping the wallet

Shipped (all knobs in `config.BANK`, flavor rows in `data/bank.js`):

```
cap(tier)      = BANK.base · BANK.growth^tier          // 4e3 · 10^tier
cap(TOP)       = ∞                                     // last row uncapped, by design
upgradeCost(t) = BANK.costFrac · cap(t) · commsCostMult   // 0.35 · current capacity
```

- **One clamp point**: every cash inflow (tick income, taps, visit yields, coin sales)
  banks through `engine.gainCash`, which credits `min(amount, cap − cash)` and counts
  the spill in `stats.overflowLost`. Purchases subtract directly — spending is never
  gated.
- **Inflow-only**: cash already above the cap (old saves, debug grants) is never
  confiscated; it just can't grow. `migrate()` grandfathers pre-cap saves to the
  smallest sufficient account so their income never silently freezes.
- **Lifetime stats count banked cash only** — so `checkUnlocks`' lifetime-cash tier
  reveals, `savvyPassive`'s `√lifetimeCash`, and Legacy's `√cumCash` are all paced by
  the wallet too. The cap bounds the whole income-coupled loop, not just the readout.
- **Run-scoped**: ascension resets the bank with the rest of the run, so every run's
  offline inflow re-paces from the bottom of the ladder. (A future tree node may relax
  this — it must never grant the ∞ account outright.)

**Safety invariants** (asserted in `selftest [85]` / `data/bank.js validateBank`):

1. **No soft-lock:** `costFrac < 1` ⇒ `upgradeCost(t) < cap(t)` at every tier — a full
   wallet can always afford the next account.
2. **The cap ladder outruns the spend ladder:** `BANK.growth (10) > ACC.growth (2.6)`,
   so a diligent banker always has room for the next accommodation tier; the wallet
   paces *lumps*, never blocks *progression*.
3. **No permanent block on endgame content:** the top account is uncapped (∞), so D6–D8
   (`base 8e17…8e23`), their upgrades, and NG+ magnitudes stay reachable; the §9
   magnitude assertion (`log10 < 290`) still owns that regime.

### 11.4 The bound — chain-buy depth is now a small constant

With a full wallet `W` and the next accommodation tier costing `c`, the chain of
affordable consecutive tiers `j` satisfies the geometric sum
`c·(g^j − 1)/(g − 1) ≤ W` with `g = ACC.growth = 2.6`, i.e.

```
j ≤ log_g(1 + (g−1)·W/c)
```

Between bank upgrades, `W/c` sweeps ≈ 1.6…40 (caps step ×10, acc costs step ×2.6), so
`j ≤ log₂.₆(1 + 1.6·40) ≈ 4` **worst-case**, 1–3 typical — instead of 12. The lump is
also **invariant to away-length** once the wallet fills, which is the actual "control
the inflow" requirement.

**Measured** (same probe, post-cap engine — compare §11.1):

| active | away | lump | acc tiers chain-bought on return |
|---|---|---|---|
| 20 m (tier 0) | 1 h / 4 h / 12 h | +3.8e4 (constant) | **3** (0 → 3) |
| 45 m (tier 2) | 1 h / 4 h / 12 h | +3.7e5 (constant) | 3 (2 → 5) |
| 90 m (tier 5) | 1 h / 4 h / 12 h | +2.0e5 (constant) | 1 (5 → 6) |
| 3 h (tier 10) | 1 h / 4 h / 12 h | +2.1e7 (constant) | 1 (10 → 11) |

An automation-minded player can still beat the bound the honest way: the concierge
(E11), left on with a budget, keeps *spending* while away — reinvesting income under the
cap exactly like an active player. That is intended: automation is the designed answer
to the wallet, foreshadowing E19/E20 staff.

### 11.5 Pacing impact (re-fit)

The greedy harness policy now climbs the bank ladder (upgrade when the wallet is ~70%
full — `cost = 0.35·cap ≤ 0.5·cash`). The ladder is a genuine new sink (~1.6e11
cumulative to the island-band account, comparable to the island's own 2.5e11), and the
measured effect is mild and healthy:

| metric | pre-cap | post-cap |
|---|---|---|
| greedy island | 8 h 26 m 55 s | **8 h 37 m 00 s** (in the 6–12 h guard band) |
| peak log10(cash) | 11.3 | 11.3 (unchanged) |
| beats reached / monotone | 26 / yes | 26 / yes |

The harness-invariance tests re-pin the island baseline at **31 020 s** (a deliberate
economy change — the one legitimate reason that constant ever moves). Tuning levers if
the wallet ever feels too tight/loose: `BANK.costFrac` (sink size & upgrade cadence),
`BANK.growth` (chain-buy bound ceiling), `BANK.base` (how soon the first offline return
is capped).

---

## 12. Ascension pacing — hard reset + parabolic gate scaling (P7, **applied & verified**)

### 12.1 The problem — one ascension collapsed the next run to 11 minutes

Measured with the ascension probe (greedy ROI bot, run to island → ascend → spend Legacy
greedily → run again): run 1 = 8h37m, **run 2 = 11m30s, run 3 = 9m05s**. Three separate
carry-overs stacked:

1. **The Legacy firehose.** `LEGACY_SCALE = 1e6` predates the 20h fit; the fitted run 1
   banks ~1.4e12 lifetime cash → **~1,183 Legacy → 56 of the tree's 79 total ranks
   bought in one sitting** (Head Start 4, Second Wind ×5, Sun-Kissed ×2, milestone step
   6, …). §7's old "under-rewarding ~N^0.10" verdict was derived from pre-fit
   constants; the fitted reality was the exact opposite failure.
2. **Power outside the tree.** `stats.lifetimeCash` persisted, so Savvy's
   `√lifetimeCash` passive restarted at full strength and `checkUnlocks`' lifetime-cash
   thresholds re-revealed every income tier instantly; Comfort silently carried a
   `×(1+0.25·count)` bonus; story flags kept every reveal pre-satisfied.
3. **No counter-pressure.** Costs were identical every run, so any net power carry
   compresses the run with nothing pushing back.

### 12.2 The design contract (three requirements)

1. **Hard reset:** the ONLY things that cross an ascension are the abilities bought with
   ascension points (the tree), the unspent Legacy itself, and non-power bookkeeping
   (settings, meta, and the deflated `lifetimeCashThisTree` accounting counter).
   Story, stats (incl. `lifetimeCash`), bank ladder, destinations, crypto, concierge —
   all restart at zero. The Comfort ascension bonus is **removed** (Ageless covers
   "plusher later runs" through the tree, the one legitimate door).
2. **Phase gates scale with ascension:** accommodation tier `t` costs
   `× base^(count^countExp · (t/span)^exp)` — the caps you must reach for each phase
   rise each ascension, and the bank-ladder tiers you must climb rise with them.
3. **Every ascension ≥ 8 h**, with a **parabolic** shape per run: early tiers *faster*
   than run 1 (the ascension feels powerful), late tiers *slower* (the gate bites).

### 12.3 What the fitting revealed (two measured failure modes)

- **Gates alone saturate.** With the hard reset but the full old tree, stretching runs
  via cost alone is ~logarithmic: base 10 → 53m, base 100 → 1h19m, base 1000 → 1h48m
  (the bot just compounds more income while it waits). Reaching 8h that way needs
  ~1e16 gates — ~16 decades of magnitude *per ascension*, breaching the §9 ceiling
  within ~15 ascensions. **The Legacy payout had to be metered first**
  (`LEGACY_SCALE 1e6 → 1e10`: ascension 1 now pays ~11 → a couple of rank-1 abilities;
  the geometric node costs meter the tree across dozens of ascensions).
- **A cash-based payout feeds back through the gate.** Gated runs earn ≈ `base^count`
  more raw cash, so Legacy grew exponentially in `count` and the tree snowballed —
  measured at base 60: runs went 11h55m → 15h10m → **6h34m (below the floor)** by run
  4. Fix: credit the Legacy metric in **run-1-equivalent cash** — `gainCash` adds
  `banked / base^(count^countExp)` (`math.ascCashNorm`) to `lifetimeCashThisTree` — so
  every run contributes ~equal weight and total Legacy follows the designed **√N** arc
  regardless of nominal inflation. The `legacyBanked` telescoping is untouched (it
  telescopes on the same deflated counter).
- With Legacy on a √N arc, a gate exponent **linear** in count outruns the tree forever
  (measured: +2h+ per ascension, unbounded). Setting `countExp = 0.5` puts the gate on
  the **same √-curve** the tree arrives on — the two settle into a stable band.

### 12.4 Fitted result (`ASCEND_GATE = { base 6, exp 2, span 20, countExp 0.5 }`)

| run | ascension | island | tier 5 | tier 18 |
|---|---|---|---|---|
| 1 | 0 | **8h 37m** (unchanged — count 0 ⇒ gate ×1) | 1h 26m | 7h 03m |
| 2 | 1 | **9h 13m** | 1h 19m | 7h 32m |
| 3 | 2 | **10h 08m** | 1h 19m | 7h 59m |
| 4 | 3 | **10h 37m** | 1h 19m | 8h 19m |
| 5 | 4 | **11h 18m** | 1h 22m | 8h 37m |
| 6 | 5 | **11h 30m** | 1h 22m | 8h 57m |

Every ascension ≥ 8h ✓; early tiers consistently *faster* than run 1 and late tiers
*slower* (the requested parabola) ✓; increments decay toward a ~11–12h plateau instead
of climbing without bound ✓; magnitude grows only ~½–1 decade per ascension (peak bank
tier 9 → 10 across six runs), far from the §9 ceiling ✓. The long-run pressure that
*does* remain (a slow upward drift as √N Legacy thins out) is exactly the incentive the
E29 **Legend** layer is designed to resolve — it resets Legacy/tree and can reset the
gate count alongside.

Asserted in `selftest [86]`: gate ×1 for the whole first run (the golden pins cannot
move), parabola + √-count formula properties, the deflated Legacy credit, the complete
hard-reset keep-list audit, and a full simulated ascended run held inside the 8–14h
band with early tiers faster than run 1.

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
`COMFORT.MULT/C0`, `ACC.growth/cashMult/unlockFrac`, `LEGACY_K/SCALE/EXP`, `TREE.nodeBase/nodeGrowth`,
`BANK.base/growth/costFrac/tiers` (§11 — the wallet cap; named account rows in `js/data/bank.js`).
