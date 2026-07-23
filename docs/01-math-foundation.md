# 01 — Mathematical Foundation

The economy is the game. This document defines every formula, the layering rules,
worked numeric examples, and how each number is tuned to hit a **~20 active-hour**
main run without any monetization gates. Everything here maps 1:1 to `js/math.js`
+ `js/config.js` and is deliberately **tweakable**: change a constant, not code.

---

## 0. Notation & guarantees

- `N` = a non-negative number (native `double` in v1; swappable `{m,e}` later).
- All formulas are **pure functions** of state → no hidden globals → testable & deterministic.
- "additive within a layer, multiplicative across layers" is the master rule for multipliers.
- Every curve is **monotonic** and **continuous** in its inputs (no cliffs) unless a
  deliberate softcap is applied.

---

## 1. The multi-level tier ladder (the classic idle backbone)

This is the well-understood **"dimensional" model** used by *Adventure Capitalist* /
*Antimatter Dimensions*: a chain of generator tiers where **higher tiers produce lower
tiers**, and only tier 1 produces spendable currency. It is the standard, proven,
tunable foundation the brief asks for.

We have **8 income tiers** `D1..D8` (thematically: `D1 Content Posts → D2 Followers →
D3 Sponsors → D4 Media Deals → D5 Brand → D6 Agency → D7 Media Empire → D8 Cultural
Icon`; the *flavor* of each tier is re-skinned per build path, the *math is identical*).

### 1.1 Production
Let `count_k` = units owned of tier `k`, `perUnit_k` = base output per unit, `M_k` = the
tier's total multiplier (see §3). Then:

```
prod_k = count_k · perUnit_k · M_k            (units of tier k output per second)
```

- **D1** outputs **cash** directly:  `dCash/dt = prod_1`
- **Dk (k≥2)** outputs **D(k-1) units**:  `d(count_{k-1})/dt = prod_k`

So higher tiers accelerate the growth of lower tiers → cash grows **super-exponentially**
over time even at fixed purchases. This is what carries a 20-hour curve without the player
buying constantly.

> **Closed form for a static ladder** (no purchases, all `M_k=1`, `perUnit_k=1`):
> after time `t`, `count_1(t) = Σ_{j≥1} count_j(0) · t^{j-1}/(j-1)!` — i.e. cash ≈ a
> polynomial of degree = highest owned tier. Buying higher tiers raises the polynomial
> **degree**; buying multipliers raises its **coefficients**. Two orthogonal growth levers.

### 1.2 Purchase cost (geometric — the core sink)
The `n`-th unit (0-indexed) of tier `k` costs:

```
cost_k(n) = base_k · growth_k^n
```

Buying `q` units from current `bought=b`:

```
costBulk_k(b, q) = base_k · growth_k^b · (growth_k^q − 1) / (growth_k − 1)     (geometric sum)
```

`growth_k` is the **single most important balance knob**. Typical idle values:

| growth_k | feel |
|---|---|
| 1.06–1.08 | cheap, spammy, early tiers |
| 1.10–1.13 | standard mid tiers |
| 1.15–1.20 | expensive, high tiers / soft wall |

We stagger them so **early tiers feel generous, later tiers gate progress**:
`growth = [1.07, 1.09, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15]` for `D1..D8`.
`base = [15, 100, 1.1e3, 1.2e4, 1.3e5, 1.4e6, 1.5e7, 1.6e8]` (each ≈ ×10 the previous).

### 1.3 Milestone doublings (free power, the "10s")
Every time `bought_k` crosses a multiple of `MILESTONE_STEP` (default **10**), tier `k`
permanently **×2**. So:

```
milestoneMult_k = 2^floor(bought_k / 10)
```

Later "prestige" upgrades change `MILESTONE_STEP` to 8, then 6 — a classic accelerator.
This is the dopamine engine: a visible "next double in 3 buys" target at all times.

> **Soft cap (important — see `docs/math-proof.md`).** An *uncapped* `2^(bought/step)` equals
> `cash^(ln2/(step·ln growth))` for a greedy buyer — a positive power of cash that compounds
> across the tier chain into a **finite-time singularity** (measured: cash overflowed `double`
> in ~9 min). The shipped code therefore **soft-caps** the doublings: exponential for the first
> `MILESTONE_SOFT_KNEE` (=4) doublings, then **linear** (`+MILESTONE_SOFT_LIN` each). Past the
> knee the term grows ∝ `bought` (∝ `log cash`), which restores controlled growth while keeping
> the early visible ×2s. `milestoneMult_k = m≤KNEE ? 2^m : 2^KNEE·(1+LIN·(m−KNEE))`, `m=⌊bought/step⌋`.

---

## 2. Worked example — one tier, from zero

`D1`: `base=15, growth=1.07, perUnit=1`.

| n (bought) | cost of next | cumulative spent | milestoneMult |
|---|---|---|---|
| 0 | 15.0 | 0 | 1 |
| 1 | 16.05 | 15.0 | 1 |
| 9 | 27.6 | ~186 | 1 |
| 10 | 29.5 | ~214 | **2** (first double!) |
| 20 | 58.0 | ~640 | **4** |
| 50 | 442 | ~6.3k | 32 |

At `bought=50`, `count=50`, `M_1 = milestone(32) × (other layers)`:
`prod_1 = 50 · 1 · 32 = 1600 cash/s` from ~6.3k invested → payback in ~4s of production.
The geometric cost (`1.07^n`) eventually outruns linear `count`, creating the natural
"time to next unit" stretch that paces the game. **Tune `growth_k` to move that wall.**

---

## 3. The multiplier stack (multi-layered upgrades)

`M_k = milestoneMult_k · L_upgrade · L_path · L_skill · L_comfort · L_ascension · L_tree`

**Master rule:** each `L_x` is `1 + Σ(bonuses in that layer)` (**additive inside**),
and the layers **multiply together** (**multiplicative across**). This makes each system
feel impactful without any single one exploding.

| Layer | Source | Example value |
|---|---|---|
| `milestoneMult_k` | the 10-buy doublings | `2^floor(bought/10)` |
| `L_upgrade` | per-tier bought upgrades (data) | `1 + 0.5·(#upgrades bought for k)` |
| `L_path` | active build path bonuses (§5) | vlogger: `1 + 0.02·vloggerPoints` on social tiers |
| `L_skill` | personal-growth attributes (§4) | charisma L: `1 + 0.03·L` on income |
| `L_comfort` | Comfort meter (§6) | `1 + log10(1 + Comfort/C0)` |
| `L_ascension` | Legacy multiplier (§9) | `1 + 0.10·legacySpentInMultNode` |
| `L_tree` | permanent skill-tree nodes (§9) | flat e.g. `×1.5` physique node |

> **Global vs per-tier:** some layers are **global** (apply to every tier equally, e.g.
> `L_comfort`, `L_ascension`) and some are **targeted** (e.g. a path that only boosts
> "social" tiers `D2/D3`). Data marks each bonus with a `scope` (`all` | tier list | tag).

### 3.1 Worked example — stacking
`D3` with `bought=30` (milestone `2^3=8`), 4 tier-upgrades (`L_upgrade=1+0.5·4=3`),
vlogger path 40 pts targeting social (`L_path=1+0.02·40=1.8`), charisma L20 (`L_skill=1+0.03·20=1.6`),
Comfort=5,000 with `C0=100` (`L_comfort=1+log10(1+50)=1+1.71=2.71`), 2 ascensions worth
(`L_ascension=1.5`), one tree node (`L_tree=1.5`):

```
M_3 = 8 · 3 · 1.8 · 1.6 · 2.71 · 1.5 · 1.5 ≈ 8 · 3 · 1.8 · 1.6 · 2.71 · 2.25
    ≈ 421×  (rounded)  → prod_3 = count_3 · perUnit_3 · 421
```
Each system contributes a clean, legible slice. Turning off any one path still leaves a
playable economy (no single dependency) — this is what "balanced & tweakable" means.

---

## 4. Personal-growth skills (attributes)

Five attributes, each an **XP → level** curve; level feeds `L_skill` and unlocks.

```
xpToNext(level) = SKILL_BASE · SKILL_GROWTH^level        // e.g. 50 · 1.25^level
level = largest L with Σ_{i<L} xpToNext(i) ≤ xp
```

XP is earned passively (a trickle proportional to relevant activity) and via spend
("training" purchases). Attributes & their effects:

| Attribute | Earns XP from | Primary effect |
|---|---|---|
| **Charisma** | social income, story choices | `L_skill` on social tiers; better sponsor deals; unlock exclusive venues |
| **Communication** | vlogging, negotiations | reduces purchase `cost` (`cost·(1 − 0.005·L)`, capped 60%); unlocks dialogue branches |
| **Body** (Fitness/Tan/Wellness) | spa/pool/beach amenities | raises Comfort cap & `L_comfort`; energy for clicker; physique story flags |
| **Taste** | connoisseur spend, art/wine | luxury discounts; unlocks 6/7-star & villa tiers; exclusivity multiplier |
| **Savvy** | crypto/finance path | passive cash %/s; crypto tier yields; risk-event mitigation |

**Effect formulas (examples):**
- Charisma income mult: `1 + CHARISMA_RATE·level` (`CHARISMA_RATE=0.03`).
- Communication discount: `costMult = clamp(1 − 0.005·level, 0.4, 1)`.
- Body comfort cap: `comfortCap = COMFORT_CAP_BASE · (1 + 0.05·bodyLevel)`.
- Savvy passive: `dCash/dt += savvyLevel · SAVVY_YIELD · totalCash^0.5` (sqrt so it never dominates).

---

## 5. Build paths (branching strategy)

Four archetypes — **one committed road per run/life** (design directive, superseding the
original "any mix" model): the beat-6 crossroads choice sets `story.branch`, focus and
every path-point nudge flow ONLY into that path (`engine.buyPathFocus`/`addPathPoints`),
and the ascension hard reset hands the choice back — each generation of the lineage can
walk a different road. Variety across paths now lives *between lives*, not within one —
with ONE earned exception: the **Jack of All Trades** tree node (`docs/04 §4.3`, deep in
the tree, ~a couple of ascensions) opens +1 extra road per rank within a life:

| Path | Fantasy | Mechanical identity |
|---|---|---|
| **World Traveler** | breadth, logistics | unlocks destinations & transport; each destination = flat global `×`; cheap but slow |
| **Luxury Vlogging Backpacker** | clout/audience | `Clout` currency; social tiers boosted; sponsor "combo" bonus for active play |
| **Crypto Poolside Lounger** | passive wealth, risk | Savvy-scaled passive income + volatile "market events" (high variance, high ceiling) |
| **Connoisseur / Old-Money** | taste, exclusivity | expensive luxury tiers give outsized Comfort & exclusivity `×`; slow, steep, prestige-friendly |

Path points come from spending + story choices. Path bonus example (vlogger):
`L_path(social) = 1 + PATH_RATE·points` with diminishing softcap:
`= 1 + PATH_RATE·points^0.85` so early points feel great, whales don't runaway.

**Staged tracks (the anti-hopping ladder).** On top of the smooth softcap, each path is
a track of **stages** (`data/paths.js`): thresholds at 5/15/30/50 points — you must gain
at least X points before progressing to the next stage. Each stage fires once per run
(story-flagged, wiped by the ascension hard reset) with a **story continuation** of that
path and ONE **unique flat bonus** (vlogger: combo/Clout/social/sponsor-duration;
crypto: yield/crash-damp/sell-fraction; traveler: destination-cost/speed/global;
connoisseur: amenity-Comfort/discount/accommodation-Comfort/all-Comfort). Bonuses are
sums of flat data constants from a fixed, validated vocabulary
(`math.computePathBonuses`, cached as `state._pathBonus`), so the stage layer is
**bounded by construction** — it can never compound into a runaway.

**Clout (vlogger currency)** grows like a second economy:
`dClout/dt = contentRate · (1 + charisma·0.02) · comboMult`, where `comboMult` rewards
recent clicker taps (decays over ~30s) — this is the optional active-play hook that never
gates idle progress (idle floor `comboMult≥1`).

---

## 6. Comfort — the progression spine & global multiplier

Comfort is the "how nice is your vacation" meter. It is a **weighted, softcapped sum**
of accommodation tier + amenities + body wellness:

```
ComfortRaw = w_acc·accScore + w_amen·Σ amenityScore + w_body·bodyLevel
Comfort    = comfortCap · ComfortRaw / (ComfortRaw + comfortCap)      // saturating (soft cap)
```
The saturating form means Comfort asymptotically approaches `comfortCap` (raised by Body,
by ascension, by tier) — so amenities always help but never trivially max out. Comfort then:

1. **Gates story** (`beat` requires Comfort ≥ threshold, see `docs/02-storyline.md`).
2. Feeds `L_comfort = 1 + COMFORT_MULT·log10(1 + Comfort/C0)` (global income `×`).
3. Unlocks the next accommodation tier (`Comfort ≥ tierUnlock[t]`).

`accScore` for accommodation tier `t`: `ACC_BASE · ACC_GROWTH^t` (`ACC_GROWTH≈2.6`) so each
step up the shed→island ladder is a big, felt jump.

### 6.1 Amenities = the "small wins" engine
Amenities are cheap, frequent, flavored micro-upgrades (pool floatie → flamingo floatie →
heated pool bed → swim-up bar → private cabana → butler-served beach cocktails…). Each:
`cost(level)=aBase·aGrowth^level` (small `aGrowth≈1.5`), gives `+amenityScore` (Comfort) and
a tiny targeted `×`. Tuning: something new should be affordable **every ~45–90s** of active
early play. There are hundreds (see epics) so the "new thing every turn" feeling is constant.

---

## 7. Offline / away progress — and the wallet cap that bounds it

On load: `elapsed = clamp(now − lastSeen, 0, OFFLINE_CAP)` (`OFFLINE_CAP` default 12h).
We advance the **same** `engine.tick` in `OFFLINE_STEPS` macro-steps:

```
dt = elapsed / OFFLINE_STEPS
for i in 1..OFFLINE_STEPS: engine.tick(dt)     // identical math online==offline
```
Coarse-stepping keeps the polynomial coupling (higher tiers filling lower) accurate to a
few % — acceptable. Measured direction: forward-Euler at coarse macro-steps *under*-produces
the generator chain by ~3% over a 12h absence (coarse/fine ≈ 0.971) — the error runs *against*
the player, not in their favor as this note originally claimed. Bounded and small; the wallet
cap (not integration accuracy) is what actually bounds offline magnitude.
A closed-form fast-path exists for the common "no purchases while away" case:
integrate the tier polynomial (§1.1) directly. Show a summary modal:
`+cash, +clout, +XP, "you leveled up X"`.

**The wallet cap (bank-account ladder).** Because the tier chain is polynomial (§1.1),
an away-lump grows like `t^D` while nothing is spent — measured at **135× linear
accrual** over 12 h for a young save, enough to chain-buy 12 accommodation tiers on
return (the full derivation and before/after measurements are in
`docs/math-proof.md §11`). The time-cap alone can't fix that (it bounds *time*, not
*magnitude*, and never applies to an open tab), so the wallet itself is capped:

```
cap(bankTier)     = BANK.base · BANK.growth^bankTier      // 4e3 · 10^tier; top tier = ∞
upgradeCost(tier) = BANK.costFrac · cap(tier) · commsCostMult
banked            = min(inflow, cap − cash)               // engine.gainCash, the ONE clamp
```

Every cash inflow (tick income, taps, visit yields, coin sales) banks through
`engine.gainCash`; **only banked cash** counts toward `lifetimeCash` (so tier reveals,
Savvy's `√lifetimeCash` and Legacy are wallet-paced too), the spill lands in
`stats.overflowLost`, and cash already above the cap is never confiscated (inflow-only
clamp; `migrate()` grandfathers pre-cap saves to the smallest sufficient account).
Invariants: `costFrac < 1` (the next account always fits in the current cap — no
soft-lock), `BANK.growth > ACC.growth` (the cap ladder outruns the spend ladder), and
the last account is uncapped so endgame D6–D8/NG+ magnitudes stay reachable. Chain-buy
depth from a full wallet `W` against next-tier cost `c` is
`j ≤ log_g(1 + (g−1)·W/c)` with `g = ACC.growth` — ≈ 2–4 tiers worst-case. Account
names (Soggy Money Belt → Platinum Plus Ultra → … → The Numberless Account) live in
`js/data/bank.js`.

## 8. BigNumber abstraction (future-proof)

`math.js` never touches `+ - * /` on raw economy values directly; it calls
`N.add/mul/pow/cmp`. In v1 these wrap native `number`. If endgame prestige pushes past
`~1e300`, we drop in a `{m:mantissa, e:exponent}` implementation (normalized so
`1 ≤ m < 10`), all in-repo, no dependency. Because only `math.js` and `util.format`
consume `N`, the swap is ~1 file. Provided reference impl lives in
`docs/05-balancing-and-pacing.md`.

## 9. Ascension & the permanent skill tree (prestige math)

**When:** unlocked at story beat ~ "first 5-star" (Epic 25). Player may ascend anytime after.

**Reset:** a HARD reset — wipe `resources`, `generators`, `amenities`, `accommodation`,
run-`skills`, `paths`, the bank ladder, destinations, crypto, concierge, `story`
(beats/branch/flags), and all run stats **including `lifetimeCash`** (Savvy's √ passive
and the lifetime-cash tier reveals re-pace from zero). **Keep — only what ascension
points bought:** `ascension.tree` + unspent `legacy` (plus settings/meta bookkeeping and
the gate-deflated `lifetimeCashThisTree` accounting counter). Ascended runs are re-paced
by the phase-gate scaling `×base^(√count·(tier/span)²)` (`config.ASCEND_GATE`) so every
ascension lands ≥ 8h on a stable band — full derivation and fitted table in
`docs/math-proof.md §12`.

**Legacy earned on ascension** (square-root prestige — the standard anti-runaway curve):
```
legacyGain = floor( LEGACY_K · sqrt( stats.lifetimeCash / LEGACY_SCALE ) ) − legacyAlreadyBanked
```
Square-root means to **double** your Legacy you need **4×** the run — so each ascension is
worth it but never trivial. (Alt tunings: `^0.5` default; `^0.6` faster; log-based for very
long tails. All are one constant.)

**Spending Legacy — the permanent skill tree** (physique & character changes that persist):
tree nodes have `costLegacy(rank)=nodeBase·nodeGrowth^rank` and grant permanent effects, e.g.
- *Sun-Kissed* (physique): `L_tree` comfort `×1.15`/rank.
- *Silver Tongue* (character): permanent `−3%` costs/rank (stacks with Communication).
- *Iron Constitution* (physique): offline cap `+2h`/rank, energy regen `+`.
- *Magnetic* (character): start each run with `charisma` pre-leveled.
- *Compounding Interest* (character/savvy): `L_ascension` income `×1.10`/rank.

**Multiple prestige layers (Epic 29):** a second currency **`Prestige/Legend`** earned by
ascending many times, resetting *Legacy* itself for meta-multipliers — same sqrt template one
layer up. Kept optional and late so it never complicates the main 20h.

## 10. How the 20-hour target is enforced (the balancing contract)

Define milestone times `T_target(beat)` (see `docs/05`). The balance harness simulates a
"reasonable player" policy (buy cheapest positive-ROI upgrade; ascend at ROI break-even) at
`gameSpeed=∞` and reports actual `T(beat)`. We tune the ~12 global constants until
`|T(beat) − T_target(beat)|` is within tolerance for all 30 beats. Because every knob is in
`config.js`, this is a numeric fit, not a rewrite. Concretely the levers, in order of power:
1. `growth_k` (tier cost slopes) — coarse pacing.
2. `base_k`, `perUnit_k` — tier onboarding.
3. `MILESTONE_STEP` & doubling size — mid-game acceleration.
4. `COMFORT_MULT`, `C0` — global multiplier strength.
5. `LEGACY_K`, `LEGACY_SCALE` — prestige loop length.
6. `GAME_SPEED` — the player/QA time knob (never used to *balance*, only to *pace/test*).

---

## 11. Common progression curves (which curve, where — and the "parabola" question)

Short answer to *"isn't it a parabola instead of linear?"*: **it's definitely not linear —
and you're half-right.** There are two different axes and they use two different curves:

- **Cost vs. purchase count** is **geometric / exponential** (`base · growth^n`). This is *the*
  backbone of the genre.
- **Cash vs. time** is **polynomial** — and a polynomial of degree 2 *is a parabola*. Our tier
  chain makes `cash(t)` a polynomial whose **degree = the number of active income tiers**
  (`docs/01 §1.1`). Two active tiers → parabola; three → cubic; etc. The 20h fit deliberately
  keeps the degree low (~2–3), so for most of the run cash-over-time really is parabola-ish.

So "parabola" is the right instinct for the **production/time** curve; "exponential" is the
right answer for the **cost** curve. The one thing it is *not* is linear.

### The full toolbox (and where each is used)

| Curve | Formula | Shape | Where we use it |
|---|---|---|---|
| **Linear** | `y = a·n` | straight | *only* for small additive bonuses **inside** a multiplier layer (e.g. `L_upgrade = 1 + 0.5·n`). Never for costs — a linear cost is trivially outrun. |
| **Quadratic / parabola** | `y = a·n²` | ∪ | `cash(t)` when **2 tiers** are active — the natural early/mid pacing shape. |
| **Polynomial (degree D)** | `y ≈ a·tᴰ / D!` | steepening | `cash(t)` with **D active tiers**. Raising D (buying a new tier) is how the curve accelerates; the fit keeps D low to stretch the run. |
| **Geometric / exponential** | `y = base·rⁿ` | explosive | **every cost curve** (`cost_k(n)=base·growth^n`, `growth≈1.1–1.5`) and the *amenity/skill/training* costs. This is what guarantees "always a next goal, never trivial." |
| **Logarithmic** | `y = 1 + a·log₁₀(1+x/x₀)` | flattening | **soft global multipliers**: `L_comfort` (Comfort→income). Diminishing but never-ending — safe to stack. |
| **Square root (power < 1)** | `y = k·√x` | flattening | **prestige** payout: `legacyGain ∝ √(lifetimeCash)`. 4× the run → 2× the reward: worthwhile but self-limiting. Also `savvy passive ∝ √(cash)`. |
| **Sub-linear power** | `y = 1 + a·x^0.85` | gentle | **path** bonuses (`L_path`) — early points feel great, whales don't run away. |
| **Logistic / saturating** | `y = cap·x/(x+cap)` | S→plateau | a harder soft cap (approaches `cap`). Available for path/energy caps. *(Comfort itself was switched from this to unbounded so it can gate billion-scale story beats — see math-proof.)* |

### Why the *combination* is the whole trick

Pacing tension = **exponential costs racing polynomial/exponential income**. Because
`cost_k(n)=base·growth^n` outruns the linear `count` in production, the *time to afford the
next unit* naturally stretches — that's the self-correcting "idle" rhythm. The multiplier
layers (log/sqrt/sub-linear, all **softcapped**) then nudge the coefficients without turning
the whole thing into a runaway. The one curve we must **never** let sneak in is *income scaling
as a positive power of cash* — that's exactly the finite-time singularity the soft-capped
milestone prevents (see `docs/math-proof.md`).

### As code (each curve, one line — see also `docs/07-code-snippets.md`)

```js
const linear      = (a, n)            => a * n;                       // additive-in-layer only
const parabola    = (a, n)            => a * n * n;                   // cash(t), 2 active tiers
const geometric   = (base, r, n)      => base * Math.pow(r, n);      // EVERY cost curve
const logSoftcap  = (a, x, x0)        => 1 + a * Math.log10(1 + x / x0);   // L_comfort
const sqrtPrestige= (k, x)            => k * Math.sqrt(x);           // legacyGain
const subLinear   = (a, x, e = 0.85)  => 1 + a * Math.pow(x, e);     // L_path
const logistic    = (cap, x)          => cap * x / (x + cap);        // saturating soft cap
```
