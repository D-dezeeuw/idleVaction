# idleVaction — Full Project Audit (Fable 5)

**Date:** 2026-07-23 · **Auditor:** Claude (verifier-tier model), orchestrating six parallel
specialist audit passes · **Scope:** the shipped prototype at repo root (post-E30, plan
"complete 3000/3000", post-UX-overhaul), audited from actual code/data with docs cross-checked.

**Method.** Six umbrella themes, 10 weighted categories each (weights sum to 100% per theme).
Every category was investigated against the shipped code, not the docs' claims; suspicions were
verified by running the code (probe scripts, live Chromium rendering with screenshots, hand
re-derivation of formulas). Baseline reproduced fresh for this audit: `npm test` **ALL PASS**
(1,304 assertions, 106 groups) and `npm run harness` → island (tier 20) at **8h 15m 05s**
greedy lower bound, 26/30 beats monotone, peak log10(cash) **11.3**. Calibration: **5 =
average shipped indie idle game, 8+ = genuinely excellent, 9–10 near-flawless.**

**Verdict up front: 6.6 / 10** — an exceptionally engineered, genuinely funny idle game whose
safety-critical core (math, tests, determinism, tone) is far above genre standard, pulled down
by the *felt* experience layers: pacing contracts the design wrote for itself and currently
breaks, two dead endgame layers, and a UI shipped at prototype fidelity.

> **Empirical addendum (2026-07-23, added after the audit):** the repo gained a
> `/demo-playthrough` simulator (`npm run demo`) that plays scripted strategies over the real
> engine. It was used to test the four audit claims that were previously *asserted/extrapolated*
> rather than measured. **All four confirmed; none refuted.** Full measured tables and the
> claim-by-claim mapping are in the **Empirical addendum** section at the end of this document.
> Headlines: branch parity is broken (greedy island spans **6h03m connoisseur → 13h46m crypto**,
> a 2.3× spread); Legend is **organically unreachable** (0 points after 4 ascensions / 40h of
> simulated play); the ~20h casual target lands in a gap (focused-casual islands ~**7–12h**,
> amenity-completionist **~31h**); and each ascension run is **longer** than the last
> (8h15m → 8h24m → 9h11m → 9h28m) for **declining** Legacy (11 → 5 → 4 → 2).

| Umbrella theme | Weight | Score |
|---|---:|---:|
| Concept & Game Design | 20% | 6.4 |
| Balance & Pacing | 20% | 5.0 |
| Theme & Narrative | 15% | 7.7 |
| Mathematical Foundation | 15% | 7.6 |
| Technical | 15% | 7.1 |
| UX / UI & Presentation | 15% | 6.3 |
| **Final weighted score** | **100%** | **6.6** |

---

## Confirmed defects (cross-cutting, highest priority)

These were **verified by execution**, several independently by two audit passes:

1. **Ascend-with-island crash** — `ascend()` rebuilds `state.island` *without* the
   `buildings` key (`js/prestige.js:129`; compare `legendReset` at `prestige.js:225` and
   `startNgPlus` at `prestige.js:278`, which both carry it). The next `buyBuilding` click
   throws `TypeError` (`js/engine.js:1657`). Reproduced live; only a reload (migrate backfill)
   heals it. Sits exactly between selftest groups [102] and [103].
2. **Legend (prestige-2) is organically unreachable** — `LEGEND_SCALE: 1e7`
   (`js/config.js`) vs a designed Legacy arc of ~11.8·√N (first ascension pays ~11).
   The `minAscensions: 3` gate implies reachability around ascension 3–5; at shipped constants
   the first Legend point needs ~1e7 total Legacy ≈ 20+ NG+ compounding cycles (order
   100–200 hours). Tests cover it only with synthetic state (`selftest.mjs:4504`). Looks like a
   scale constant templated from the pre-refit `LEGACY_SCALE` era and never re-fitted.
3. **NG+ difficulty is inverted** — gates harden ×1.5^n but income grows ×3^n
   (`js/config.js:549`): each cycle is net ×2 *easier* while the copy says "the world hardens."
4. **Bulk-sell underpays** — `sellCoin` prices a bulk sale at the lowest rung × qty instead
   of the geometric sum (`js/engine.js:1032-1037`); measured: bulk-selling 10 coins pays
   **57%** of selling one-at-a-time. Not exploitable (underpays), but "sell all" is strictly
   dominated by click-spam.
5. **The "Legacy investor dance"** — free respec (`respecFee: 0`) + `legacy_investor`
   (×1.15⁸ ≈ ×3.06 on Legacy payout) makes respec-in → ascend → respec-out the always-optimal
   ritual before every ascension. Bounded, but degenerate.
6. **Story beats cluster structurally** — 10 of 16 distinct beat timestamps are shared
   ({11,12,13} land in one tick at 2h43m, {24,25,26} at 6h52m). Cause: Comfort ≈
   `wAcc·accScore(tier)` at every scale, so comfort gates collapse onto the adjacent tier
   purchase. The planned E30 remedy (re-space `STORY_GATES`) won't fix it for ROI players.
7. **Import-save XSS surface** — `esc()` exists but is applied to ~4 of the dozens of
   `innerHTML` interpolation sites; imported saves control `story.branch` (`js/ui.js:225`),
   concierge `lastActions[].items[].name` (`ui.js:817`), market `eventLog[].kind`
   (`ui.js:1024`), staff `assignedTo` (`ui.js:1320`). A pasted "try my save" string is a
   stored-XSS vector (mitigated by origin isolation; still can poison saves).
8. **Mobile: the cash HUD disappears on scroll** — `#tabbar` (z-index 8) paints over
   `#topbar` (z-index 5), both `sticky; top:0` (`css/game.css:41,75`); measured 83px overlap
   at 390px — the game's most important number is hidden while scrolling.
9. **Broken first instruction** — onboarding says "Buy your first Postcard Snapshots
   *below*" but the generator card lives on a hidden Income tab (`js/ui.js:153-162`); a new
   player's first task requires discovering tab navigation the text never mentions.
10. **Offline under-produces ~3% and docs claim the opposite** — forward-Euler at 216s
    macro-steps yields coarse/fine ≈ 0.971 over 12h; `docs/01 §7` says the error is "always in
    the player's favor."

---

# 1. Concept & Game Design — **6.4 / 10** (weight 20%)

| # | Category | Weight | Score |
|---|---|---:|---:|
| 1 | Core loop clarity | 15% | 7 |
| 2 | Genre-convention fit | 10% | 6.5 |
| 3 | Progression-system depth | 12% | 6 |
| 4 | Prestige/ascension design | 12% | 7 |
| 5 | Meta-progression (tree, Legend, NG+) | 8% | 5 |
| 6 | Content variety & breadth | 10% | 6.5 |
| 7 | Player agency & meaningful choices | 12% | 6.5 |
| 8 | Idle/offline design | 10% | 6.5 |
| 9 | Long-term retention hooks | 6% | 5 |
| 10 | Originality | 5% | 8 |
| | **Weighted theme score** | 100% | **6.4** |

### 1.1 Core loop clarity — 7
A clean 8-tier chain (higher tiers produce lower, `js/config.js:41-52`) with renovations,
milestone ×2 every 10 buys (soft-capped after 4 doublings, `js/math.js:14-19`), feeding
Comfort → the 22-rung accommodation ladder (`js/engine.js:1862-1876`) — accommodation is the
visible progress bar of the whole game. A wallet cap (`BANK`) clamps all cash inflow.
**Pros:** thematically legible loop; harness-enforced purchase cadence early; the soft-knee
milestone preserves early dopamine while provably killing the blow-up. **Cons:** a full wallet
silently stops income *and* XP with one thin toast — reads as a bug; the 23-step bank ladder is
a mandatory chore no automation covers; past the fourth milestone the headline "×2!" quietly
degrades to +0.5 linear exactly when players have learned to chase it.

### 1.2 Genre-convention fit — 6.5
Nearly every AdCap-lineage convention is present and mostly done properly (managers via
concierge/butler reuse player purchase functions; √-payout prestige; bulk-buy; capped tapping;
a Realm-Grinder-style committed path choice). **Pros:** near-complete checklist; disciplined
multiplier-stack architecture. **Cons:** numbers never go big — peak log10(cash) 11.3 means the
genre's escalating-magnitude fantasy is deliberately absent; wallet caps and ascended runs that
get *slower* both invert core genre expectations; first prestige pays ~11 Legacy ≈ two rank-1
nodes, far below the transformative-first-prestige norm.

### 1.3 Progression-system depth — 6
8 generators, 22 accommodation tiers, 186 amenity ids, 23 bank tiers, 5 skills, 4 paths × 4
stages. **Pros:** the accommodation ladder is a deep, flavorful spine; interlocks are real
(Comfort gates tiers, tiers dominate Comfort). **Cons:** amenities are mostly a trap — their
only income effect is log-softcapped Comfort dominated by accommodation score; the project's
own docs call amenity buying "almost pure cash leak" (docs/05 §9). All 186 amenity rows carry
dormant `xMult`/`xScope` fields never read by the engine (admitted at `js/data/amenities.js`
~line 118) — schema promising income effects that don't exist. The generator ladder itself is
shallow (one generic upgrade type; differentiation lives in flavor text).

### 1.4 Prestige/ascension design — 7
Hard reset with √-telescoped Legacy and a genuinely novel gate-deflated payout (`ascCashNorm`,
`js/math.js:521-523`) so later runs' inflated cash normalizes to run-1-equivalent. **Pros:**
anti-snowball math more rigorous than almost any shipped idle (the 11-minute-collapse failure
mode was measured and fixed); the retirement/heir/epitaph framing makes the reset diegetic —
a standout move; real tension between tree spending and saving 25 Legacy for the island.
**Cons:** incentive inversion — each run is *longer* (8h15m → ~10h40m plateau) for ~2 new tree
nodes; the full 30-beat story re-fires every run with no skip affordance; the docs/04 §2
promised ascension-ROI hint was never implemented.

### 1.5 Meta-progression — 5
15 tree nodes (~79 ranks), free respec; Legend wipes Legacy+tree for a 5-perk shop; NG+
hardens gates ×1.5^n, grants ×3^n income. **Pros:** Jack of All Trades is genuinely
build-defining; NG+ keeping tree+Legacy while re-hardening the world is a clean third loop.
**Cons:** Legend is unreachable as tuned (confirmed defect #2); the tree is small and mostly
numeric (+X%/rank — only 3-4 of 15 nodes change how you play); the Legend shop is skeletal;
NG+ is net-easier while its copy sells hardening (defect #3).

### 1.6 Content variety & breadth — 6.5
Bank, crypto (6 coins, seeded market), collections, vehicles/boats/jets, property, staff (10
roles), content tiers, sponsors, 17 destinations, island buildings, seasonal, achievements,
NPCs. **Pros:** enormous system count for a dependency-free vanilla-JS game, each wired to real
gates (boats→sea, jets→air, Taste→6-star); consistent data-driven architecture keeps breadth
maintainable. **Cons:** the Clout economy is a near-closed loop (clout buys content boosts
that produce more clout, plus one 1e5 island line-item); several systems are token-depth (3
sponsors, 3 NPCs, 1 vignette, 5 seasonal entries, 5 Legend perks); the invariance-first
doctrine means most post-midgame systems are opt-in sidecars a rational player can entirely
ignore; island guest income bypasses the 18-layer multiplier stack despite config claiming
"the full M_k stack applies" (`js/config.js:525-527` vs `js/engine.js:126`).

### 1.7 Player agency & meaningful choices — 6.5
**Pros:** branch commitment is real agency with mechanical identity, and the ascension reset
hands the choice back each generation; upkeep drains make "bigger" an actual decision; the
Legacy-for-island vs Legacy-for-tree tension is the best single decision in the game.
**Cons:** the dominant strategy is documented by the project itself — greedy
generator+accommodation reinvestment with amenities only-for-gates is provably optimal, so the
"correct" line is narrow; branch parity is asserted from comments but only the vlogger line is
harness-verified; free respec makes tree choices stakeless; automation defaults are already
near-optimal, removing decisions rather than executing yours.

### 1.8 Idle/offline design — 6.5
Offline replays the *same* `tick()` in 200 macro-steps, capped at 12h (+2h/rank); wallet cap
bounds returning lumps. **Pros:** best-in-class offline fidelity (no separate formula to
desync; seeded RNG; itemized away-summary); the wallet cap is a principled fix to a *measured*
exploit (135× lump). **Cons:** long idles are mostly wasted — once the wallet fills, income is
discarded, and the concierge can't buy the bank upgrades that would raise the cap (the one
purchase that matters while away is the one automation can't make); the design rewards frequent
short check-ins over the overnight pattern the genre courts, and never says so.

### 1.9 Long-term retention hooks — 5
**Pros:** the family album/epitaph system is a lovely memento (play history becomes content);
the premium-destination set is a well-built endgame chase; the meta-only achievement-reward
invariant is disciplined. **Cons:** 16 achievements is a fraction of genre norm; "seasonal" is
live-ops in name only (deterministic playtime rotation of 5 entries, island-gated, ×1.1 cap —
no calendar events); the long tail depends on Legend/NG+, and Legend is unreachable;
collections re-grind every ascension.

### 1.10 Originality — 8
Comfort as second currency gating a 22-rung accommodation ladder makes the *vacation fantasy
itself* the progression spine — no direct AdCap/RG analogue. Gate-deflated prestige accounting,
the anti-hopping commitment contract, the lineage frame, and a fully deterministic seeded
market are uncommon-to-novel. **Cons:** the limbs around the spine (crypto, collections,
staff) are genre-standard; the most original mechanic (wallet cap) is also the most
player-hostile-feeling; deliberately small numbers keep the original systems from spectacle.

**Theme summary.** A design of unusual mathematical discipline wrapped around one genuinely
original idea — the vacation ladder as progression spine — with prestige engineering better
than nearly any shipped indie idle. But the same invariance-first culture that made it correct
made it conservative: a rational player can skip most of the game's breadth, the biggest
content class (amenities) is a documented trap, the Clout economy is closed, retention content
is skeletal, and the meta layer's capstone is unreachable. Excellent first-summit experience;
thin long tail.

---

# 2. Balance & Pacing — **5.0 / 10** (weight 20%)

| # | Category | Weight | Score |
|---|---|---:|---:|
| 1 | Early-game pacing (first hour) | 10% | 6 |
| 2 | Mid-game pacing (hours 1–5) | 12% | 6 |
| 3 | Late-game / endgame pacing | 12% | 4 |
| 4 | Curve fit vs the ~20h target | 15% | 6 |
| 5 | Beat spacing & clustering | 8% | 3 |
| 6 | Prestige timing & incentives | 10% | 5 |
| 7 | Upgrade/amenity ROI balance | 12% | 4 |
| 8 | Walls & dead zones | 8% | 5 |
| 9 | Harness quality as a measuring tool | 8% | 7 |
| 10 | NG+/post-game scaling | 5% | 3 |
| | **Weighted theme score** | 100% | **5.0** |

Fresh instrumentation for this audit (re-using the shipped `play()` policy): generator buys
across the full greedy run **D1..D8 = 41, 24, 9, 0, 0, 0, 0, 0**; **5 of 186** amenities ever
purchased; 134 purchase events total; longest gap 11m50s; **84.7%** of the run inside >180s
purchase gaps; island time at 60s action cadence identical (8h15m), at 300s cadence +5%.

### 2.1 Early-game pacing — 6
**Pros:** strong opening burst (8 purchases in 5 min, first milestone inside ~10 min); 7
narrative moments in 65 minutes; no gap over ~4 min in the first 20. **Cons:** beat 2's
`comfort: 20` gate is dead (below starting Comfort 50 — fires at t=0 with beat 1); the 0–22m
stretch has only D1 units and amenities to buy (D2 base 6e4 ≈ 15× cash at 21m); the docs/05 §1
target table (beat 5 ≈ 20m casual) is missed even by the optimal bot (45m25s) and was never
re-pinned; the "small win every ~1 min" contract is only met by buying purchases the game's own
harness classifies as cash leaks.

### 2.2 Mid-game pacing — 6
**Pros:** the tier/bank/destination unlock layer genuinely delivers a meaningful unlock every
~12 minutes; story beats stay inside the "every 40–90 min" band; no hard stall (the Comfort
gate never binds). **Cons:** the milestone-doubling layer collapses — §5 promises a doubling
every ~5–8 min; the whole 8h15m run produces **six** (one per ~82 min), so the advertised
always-on countdown is effectively static after hour one; sensible-player purchase cadence
degrades to one ROI-positive buy per 6–8 min; the worst beat gap (10→11, 52m45s) extrapolates
to ~2h casual.

### 2.3 Late-game / endgame pacing — 4
**Pros:** the pre-summit wall is arguably a deliberate tension beat; magnitude superbly
controlled; tier 21/E28 give the ladder a true post-metric summit. **Cons:** beat 26 fires at
6h52m and the run ends with a **1h22m story-free grind** containing the three worst purchase
gaps — the emptiest stretch lands right before the payoff; five of eight generators are dead
content in run 1 (D4 base 8e11 vs peak cash 2.1e11) and for ~10+ ascensions after (magnitude
grows ~½–1 decade per ascension); the island deed (25 Legacy + 1e12 cash) is realistically ~5
full ascension runs (~45–55 greedy hours) away, which the config's "~1–2 ascensions of saving"
comment materially understates.

### 2.4 Curve fit vs ~20h — 6
**Pros:** the optimal bound is robust (cadence-invariant: 60s cadence = identical island;
ROI-aware; drift-proofed); the completionist/optimal pair (19h11m–19h29m / 8h15m) genuinely
brackets ~20h; the wallet cap makes "20 *active* hours" defensible. **Cons:** the ×2.4
greedy→casual extrapolation is asserted, not simulated — no casual-policy bot exists despite
being a ~30-line variant of `play()`; the per-beat target table is internally contradicted
(early beats land slower than casual targets, late beats far faster — the fitted curve is
tilted late); the completionist figure is 8 epics stale, so today's casual bound is unknown,
plausibly 22h+.

### 2.5 Beat spacing & clustering — 3
**10 of 16 distinct beat timestamps are shared** — 26 beats deliver only 16 narrative moments,
including triple-clusters {11,12,13}@2h43m and the emotionally weighted {24,25,26}@6h52m dumped
in single ticks. The cause is structural (defect #6): Comfort is an accommodation-score proxy,
so comfort gates collapse onto adjacent tier purchases. **Pros:** monotone order enforced; no
branch is stranded; the issue is acknowledged in E30 notes. **Cons:** the game's scarcest
content (authored story) arrives three-at-once; the planned re-spacing remedy won't work for
ROI players since amenities can't bridge accScore steps; beat 2 is strictly dead.

### 2.6 Prestige timing & incentives — 5
**Pros:** the degenerate loop is provably dead (pre-fix run 2 was 11 minutes; now every run
≥8h on a stable band); accounting telescopes exactly; the lineage framing gives resets
narrative cover; ascended runs open faster (t5: 1h28m → 1h20m). **Cons:** the loop inverts the
genre's prestige promise — each reset buys +15–30% power for a run that is *longer* and
re-treads the same 26 beats with the same 3 usable tiers, ~5 times before the island changes
anything; ~11 Legacy ≈ two rank-1 nodes is a thin payload for 8 hours; Head Start (the node
that would shorten re-runs) is locked behind ascension 2–3; no measurement of *when* ascending
is optimal exists.

### 2.7 Upgrade/amenity ROI balance — 4
**Pros:** no runaway dominant multiplier (the math-proof §4 discipline is enforced);
destinations engage meaningfully (8 bought); automation's ROI gate prevents buying dead stock.
**Cons:** the purchase economy is sharply polarized — the optimal player buys 5 of 186
amenities, 0 of the top 5 generator tiers, and climbs the bank ladder as a mandatory
no-decision tax; the "small-wins engine" is strictly a progression trap (measured ~10.7h delay
under completionist play); dormant `xMult`/`xScope`/`bodyXp` fields mislead; cross-branch
parity is unmeasured beyond the vlogger.

### 2.8 Walls & dead zones — 5
**Pros:** no gap ever exceeds ~12 minutes at the optimal bound (many shipped idles wall for
hours); waits are skippable via the speed control; casual players can always spend. **Cons:**
"something to buy" and "something *worth* buying" diverge for ~85% of the run (the 30–120s
meaningful-purchase band holds only in the opening minutes); the pre-summit hour is the longest
dead zone exactly where tension should peak; nothing in CI measures the cadence contract, so
these regressions are invisible to the guard band.

### 2.9 Harness quality — 7
**Pros:** deterministic, fast, schema-validating, golden-pinned to the second (29,705s ±1);
every new system ships with a harness-invariance test; the amenity-fix was validated by
falsification experiments; cadence-robustness is real. **Cons:** the harness never simulates
the one thing the game is fitted *to* (~20h casual play) — no casual/completionist policy is
maintained; tapping (up to +35% income) is ignored, so "hard lower bound" is technically false;
3 of 4 branches are end-to-end unmeasured; the shipped `play()` is a hand-tuned threshold
cascade, not the documented marginal-ROI ranking; the "doubling time @isl" output prints `n/a`.

### 2.10 NG+/post-game scaling — 3
**Pros:** everything is bounded and overflow-safe for hundreds of cycles; resetting
`ascension.count` on Legend elegantly answers gate-drift; NG+'s access gate is sensible.
**Cons:** the entire prestige-2 layer is dead content at shipped constants (defect #2, a ~1e5
scale misfit); NG+ difficulty is numerically backwards (defect #3); post-game adds no new
decisions — same beats, same dead D6–D8, bigger exponents.

**Theme summary.** Exceptional *safety* engineering wrapped around an unfinished *experience*
fit. The catastrophic failure modes (milestone singularity, offline leapfrog, prestige
collapse) are diagnosed, mechanism-fixed, and regression-pinned to the second — better analysis
than most shipped idles ever get. But nearly every felt-pacing contract the design wrote for
itself is broken or unverified: the purchase-cadence band fails for ~85% of the optimal run,
promised milestone cadence fires 6 times in 8 hours, ten of sixteen beat arrivals are
simultaneous, 97% of amenities and 5 of 8 generators are dead-or-trap purchases, the ~20h
casual figure rests on a stale measurement, and the endgame layers are unreachable or inverted.
Most fixes are cheap (casual-policy bot, cadence assertion in CI, gates driven off
non-accommodation currencies, Legend re-scale to ~1e2) and would raise this theme ~2 points.

---

# 3. Theme & Narrative — **7.7 / 10** (weight 15%)

| # | Category | Weight | Score |
|---|---|---:|---:|
| 1 | Theme coherence | 15% | 9 |
| 2 | Story arc & structure | 12% | 7 |
| 3 | Writing quality & tone | 15% | 8 |
| 4 | Naming & flavor | 10% | 8 |
| 5 | Theme-mechanics integration | 12% | 8 |
| 6 | Character/NPC presence | 6% | 5 |
| 7 | Emotional arc & payoff | 10% | 7 |
| 8 | World-building | 8% | 7 |
| 9 | Visual theming & art direction | 7% | 7 |
| 10 | Consistency across content packs | 5% | 9 |
| | **Weighted theme score** | 100% | **7.7** |

### 3.1 Theme coherence — 9
The "soggy Dutch tourist claws from shed to private island" premise is executed with unusual
discipline across every layer — story, ~130+ amenities, banks, boats, jets, staff, crypto, even
validator comments. Rain/poncho/stroopwafel motifs recur from tier 0 ("A Dutch bus stop.
Sideways rain. You have €15 and a dream shaped like sunshine.") to the endgame Private Airliner
("From a bus stop in the drizzle to this. The stroopwafel made it too."). **Cons:** the D1–D8
generator chain is an influencer-fame economy imposed on every branch (an Old-Money Aesthete
still earns via "Followers"); the late bank/legend tiers shade from vacation fantasy into
generic wealth fantasy.

### 3.2 Story arc & structure — 7
All 30 beats ship with the documented three-act shape, a beat-6 crossroads, reconvergence via
"the patron" (beats 21–22, the structural high point), and the lineage frame elegantly
justifying the genre's reset. **Cons:** copy density is inverted — mid-game beats got the full
rewrite while the finale (23–30) remains one-line prototype stubs (beat 30 is 14 words);
several beats assert things their gates don't check (a boat beat without a boat, a butler beat
without a butler); promised beat-14 traveler/vlogger variants are missing; the VIGNETTES system
contains exactly one entry.

### 3.3 Writing quality & tone — 8
The flavor copy is the game's best asset — "€6 for water you could get from the tap. You buy it
anyway. Growth."; "The bottle is a spreadsheet with a cork."; "It reclines. Fully. Into a
different tax bracket." Professional-grade rhythm; jokes escalate from survival humor to
absurdity-of-wealth with wistful undertones. **Cons:** formula fatigue at scale (the "sun you
flew a continent to find" irony ×4, "thirty years of one cold trickle" ×4); genuine duplicate
amenities (two bathrobes, two earplugs, two gold taps — only the taps lampshaded); the
bookends' story-card copy is thinner than the amenity copy surrounding it.

### 3.4 Naming & flavor — 8
StroopCoin, PonchoDAO, WindmillSwap, GulderETF; "Dogs Playing Klaverjas" (provenance:
"Sothebeach's, Lot 12, 2011"); bank tiers ending in "Shell Company Matryoshka" and "The
Numberless Account"; invented-never-real houses per the data file's own rule. **Cons:** the
most-viewed panel holds the weakest names (Media Deals, Brand Partners, Talent Agency);
skill-tree nodes are stock idle vocabulary; TRAINING rows ship with raw ids and no flavor in a
game where the goat has a backstory.

### 3.5 Theme-mechanics integration — 8
Mostly the mechanics *are* the theme: Comfort is the progression currency; wallet caps are
literal money belts; hull tier gates sea destinations; "a yacht is a money pit" is implemented
as upkeep; ascension is diegetic retirement with epitaphs; the island flips the verb from
buying luxury to *producing* it. **Cons:** widespread dormant fields (`xMult`/`xScope`,
`bodyXp`) are flavored numbers that are scenery, not mechanics; the harness-invariance doctrine
quarantines most late themed systems from the economy they decorate; beats fire on Comfort
proxies rather than the themed action itself.

### 3.6 Character/NPC presence — 5
**Pros:** staff descriptions give the household genuine character; the patron's four
branch-aware beat-21/22 variants are excellent; the goat is a legitimately effective running
character with a full arc. **Cons:** the "recurring NPC roster" never recurs — Bram/Vera/Henk
fire one toast each and vanish; the vignette delivery channel exists and is empty; the patron
disappears at his own climax — the invitation's sender never appears on the island he seeded.

### 3.7 Emotional arc & payoff — 7
The retirement ceremony (deterministic epitaphs — "Gen 2 · Saskia · chased the lens, reached
5-Star Hotel. Never once missed the rain."), the poncho folded into a swan, the boules pit, the
jetty bar ("You pour one, sit, and understand you have arrived. Actually arrived.") all land.
**Cons:** the named flagship beats are underwritten — "Letting Go" (beat 26) is one sentence of
mechanics explanation that never says what is being let go; the pathos hides in amenity flavor
a player may never read; the UX-plan's story-beat modals for the climaxes were never wired, so
the patron's invitation renders as an ordinary story-card update.

### 3.8 World-building — 7
A credible backpacker-to-billionaire geography (Paris hostel "Wi-Fi password: 'baguette123'" →
"Amsterdam (Return Trip)" — going home *as a tourist* — → premium hideouts: "This is where the
rich hide. You found it. You ARE it."). **Cons:** 16 ordinary destinations is thin for a
"World Traveler" fantasy (Europe-heavy; no Africa or South America); places have no life after
purchase (a destination is a stamp and a multiplier); the island itself — the destination of
the whole game — has no sense of layout or place.

### 3.9 Visual theming & art direction — 7
`docs/UX-plan.md` is a real art bible ("Poolside at Golden Hour," postcard/stamp/sticker
metaphor kit, Reveal Doctrine) and the CSS implements most of it; the genart pipeline is
palette-locked to the CSS tokens with a style bible ("the tourist is always seen from behind").
**Cons:** the flagship promise is unshipped — `POSTCARD_ART = new Set([])`, zero generated
images exist, every postcard is an emoji composition; era skies only tint the topbar gradient;
several planned era modals aren't implemented; CDN fonts sit oddly against the "static,
dependency-free" identity.

### 3.10 Consistency across content packs — 9
Where most multi-phase idle games fall apart, idleVaction doesn't: 20+ content packs of
different provenance read as one author — crypto keeps the national joke (StroopCoin "Backed by
the gold standard of waffles"), sponsors stay in-voice ("Definitely-Not-A-Scam Exchange… They
pay extremely well. Nobody asks in what."), the endgame legend shop still writes like the
opening. Cross-pack callbacks are bidirectional. **Cons:** the vlogger pack's influencer parody
is generic-internet rather than Dutch-tourist; purely mechanical packs carry no flavor at all.

**Theme summary.** Well above the shipped-indie baseline: one disciplined comic voice sustained
across ~200 flavor strings, mechanics that frequently *are* the fiction, and rare cross-pack
consistency. Its weaknesses are weaknesses of finishing, not conception: the story's bookends
are prototype one-liners, "Letting Go" is 14 words, the NPC layer is three one-shot toasts plus
a patron who vanishes at his own climax, and the postcard art pipeline has shipped zero images.
The theme needs the second pass the mid-game already received — applied to the opening, the
ending, and the people.

---

# 4. Mathematical Foundation — **7.6 / 10** (weight 15%)

| # | Category | Weight | Score |
|---|---|---:|---:|
| 1 | Number representation & precision | 10% | 8 |
| 2 | Growth-model correctness | 12% | 8 |
| 3 | Multiplier-stack architecture | 14% | 7.5 |
| 4 | Soft-cap / milestone math | 12% | 8 |
| 5 | Ascension/Legacy soundness | 12% | 7 |
| 6 | Overflow safety & bounds | 10% | 8 |
| 7 | Offline-progress math | 10% | 7.5 |
| 8 | Bulk-buy & cost-sum closed forms | 6% | 7.5 |
| 9 | Determinism & numerical stability | 8% | 8 |
| 10 | Math documentation parity | 6% | 6.5 |
| | **Weighted theme score** | 100% | **7.6** |

All formula claims were re-derived by hand and/or verified with numeric probes against the real
modules.

### 4.1 Number representation & precision — 8
No BigNumber layer ships; the strategy is magnitude *suppression* (soft-capped milestone + a
taxonomy forbidding cash-power multipliers) with a monitored swap trigger: `peakLog < 290`
asserted in 8 selftest groups, the golden test tightening to `< 12`; measured peak 11.3 vs
overflow ~308 — doubles are unambiguously sufficient. **Cons:** `docs/01 §8` claims an
`N.add/mul` abstraction that does not exist (a future swap is a full `math.js` rewrite, not the
advertised drop-in); the multi-ascension/NG+ magnitude arc is measured manually, not in CI; no
runtime guard against a hand-edited `cash = 1e305` save.

### 4.2 Growth-model correctness — 8
Geometric `base·growth^n` costs, snapshot-then-apply tick semantics (production computed for
all tiers before any counts apply — no intra-tick feedback). Hand-checks passed exactly; the
polynomial-degree analysis in `math-proof §1` is genuinely correct mathematics. **Cons:**
forward-Euler under-integrates at coarse dt (−0.24% between 0.5s and 5s ticks over 2h; ~3%
over 12h offline) so the golden pin embeds the dt=5 scheme bias; docs/01 still teaches pre-fit
constants off by up to 5 orders of magnitude.

### 4.3 Multiplier-stack architecture — 7.5
`tierMultiplier` composes 18 factors, every post-launch layer hard-gated to exactly 1 when
untouched (~15 invariance tests), every layer annotated with a safety class
(bounded-flat/log/sub-linear) — none falsified. Feedback loops all damped (√ or log).
**Cons:** the declared "additive within a layer, multiplicative across" rule is violated inside
two layers (`L_dest` and `L_staff` are products over rosters); the flagged
`sun_kissed`-vs-`compounding_interest` curve inconsistency was never resolved; balance
constants leak outside config (`0.10` compounding at `math.js:81`, `1.15` sun_kissed at
`math.js:635`, `50·8^n` gen-upgrade cost at `engine.js:772`); nothing asserts the joint
worst-case product across all bounded layers.

### 4.4 Soft-cap / milestone math — 8
The knee formula (`2^m` to KNEE=4, then linear) is continuous, monotone, reduces the
milestone's cash-exponent to exactly 0 past the knee; the finite-time-singularity derivation is
correct and the fix was verified with measurements. Bulk buys can't skip milestone boundaries
(fuzzed). **Cons:** the island guest economy ships an **uncapped** `2^floor(n/10)` milestone
(`math.js:325`) — the exact shape §3 outlawed — surviving only on underived secondary grounds
(no chain compounding, exponential upkeep counter-pressure); `C.MILESTONE_STEP` is *mutable
global config* re-derived only at boot — a standing footgun (and the source of the stale-step
bug after import/reset, see 5.9).

### 4.5 Ascension/Legacy soundness — 7
√-telescoped, banked Legacy verified exactly (splitting 4e12 across two ascensions pays the
same 20 as one); ascend-spam provably closed; the gate-deflator elegantly kills the measured
Legacy-inflation loop. **Cons:** the confirmed ascend-with-island crash (defect #1) lives
here; the "investor dance" (defect #5) makes the §7 telescoping claim no longer exactly true
once investor ranks exist.

### 4.6 Overflow safety & bounds — 8
Four independent nets: shape fix (milestone), magnitude clamp (wallet), CI ceiling (290),
per-layer boundedness classes. The chain-buy bound `j ≤ log_g(1+(g−1)W/c)` is correct algebra;
every cash inflow routes through the single clamp (grep-verified, no side doors). **Cons:**
`math-proof.md §0/§10` still headline "~18h island" and "peak ~1e52," contradicted by the same
document's appendices (8h15m, peak 11.3); the recommended full-arc magnitude sweep (max tree +
N ascensions + NG+) is not in CI.

### 4.7 Offline-progress math — 7.5
"Same tick, coarser steps" is the strongest anti-drift architecture available; wallet cap makes
offline *magnitude* exact-by-construction; accumulator patterns prevent catch-up bursts.
**Cons:** offline is not income-equivalent to online (coarse/fine ≈ 0.971 over 12h — ~3%
against the player, while docs claim player-favoring; defect #10); offline market events
sample at macro-step granularity (a 20–40s boom applies to a full 216s step — up to ~7×
over-weighting per event), so the engine comment "exactly as they would online" overclaims; the
documented closed-form fast-path was never built.

### 4.8 Bulk-buy & cost-sum closed forms — 7.5
Exact geometric sums with the g=1 branch; `maxAffordable` verified over 20,000 boundary trials:
zero overspends (FP failure mode engineered to the safe side); all purchasing systems reuse one
`bulkCost`. **Cons:** the bulk-sell asymmetry (defect #4); exact-budget buy-max can leave one
affordable unit unbought; the `genMaxQty`/`genCost` discount pairing is correct today but
unasserted.

### 4.9 Determinism & numerical stability — 8
One seeded `(seed, cursor)` RNG for all shipped logic (zero `Math.random`); market scheduler a
pure function of `(seed, cursor, runSec)`; the ±1s golden pin over a 29,705-simulated-second
run is an unusually tight full-system determinism regression; deterministic-by-construction
choices everywhere randomness was tempting (epitaphs, seasonal, heir names). **Cons:**
tick-rate independence is approximate, not exact (Euler drift −0.24%/2h); market determinism is
schedule-relative, not time-relative (event sequence depends on tick granularity); the mutable
`MILESTONE_STEP` is the one determinism-adjacent landmine.

### 4.10 Math documentation parity — 6.5
`math-proof.md` is exemplary — claims measured against the real engine, failed designs
documented with numbers, supersessions marked with addenda; config comments cite proof sections
and test IDs; doc invariants are executable assertions. **Cons:** accumulated drift, each
verified: docs/01 teaches pre-fit GEN constants (up to 5 orders off), a saturating Comfort
formula and `COMFORT.cap` lever that no longer exist, a BigNumber layer that was never built, a
`lifetimeCash` legacy formula where code uses `lifetimeCashThisTree` (load-bearing), and a
7-layer stack where 18 shipped; the proof doc's own TL;DR contradicts its appendices; config's
guest-income "full M_k stack" claim is false.

**Theme summary.** A mathematically serious economy most shipped idle games don't approach: the
singularity diagnosis and fix are correct and *measured*, the 18-layer stack keeps a disciplined
bounded taxonomy pinned by invariance tests, prestige accounting is exact, and a ±1s golden pin
locks it all in CI. The found defects (ascend crash, bulk-sell, investor dance, uncapped guest
milestone, offline error direction) are all bounded — the safety architecture has genuine
redundancy — but the documentation layer has drifted badly enough to mislead a new contributor,
and it is the weakest link in an otherwise excellent chain.

---

# 5. Technical — **7.1 / 10** (weight 15%)

| # | Category | Weight | Score |
|---|---|---:|---:|
| 1 | Architecture & modularity | 14% | 8 |
| 2 | Code quality & readability | 10% | 7 |
| 3 | State management & save/load | 12% | 7 |
| 4 | Save migration & versioning | 8% | 7 |
| 5 | Performance | 10% | 6 |
| 6 | Testing depth | 14% | 8 |
| 7 | Dev tooling & workflow | 8% | 8 |
| 8 | Dependency-free & deployability | 8% | 7 |
| 9 | Error handling & edge cases | 8% | 6 |
| 10 | Security & robustness | 8% | 6 |
| | **Weighted theme score** | 100% | **7.1** |

### 5.1 Architecture & modularity — 8
Cleanly layered and acyclic: config → util → math (pure, `DATA` passed explicitly) → data
(24 declarative files) → engine (mutation) → state (persistence) → ui (render) → main (63-line
bootstrap); one composition point for the entire income stack; per-tick caches under a
consistent `_` convention. **Cons:** `engine.js` hand-enumerates ~35 per-epic `check*Reveal`
one-shots inside `tick()` (order-fragile, grows linearly with content); the `_cache` contract
quietly couples "pure" math to engine tick ordering; some business logic leaks into UI handlers
(`ui.js:1960-1971` mutates concierge state directly).

### 5.2 Code quality & readability — 7
Idiom is remarkably consistent (`check*`/`render*`/`buy*`/`validate*`/`L_*` naming shared
between code, tests, and docs); real invariant documentation at load-bearing sites. **Cons:**
long functions (`tick()` ~165 lines; `buyAccommodation` ~75, mostly copy-flash `if` blocks that
should be data); stringly-typed tree/perk IDs hardcoded across modules (renaming a node
silently breaks effects); ~15 near-identical reveal-template copies; comment volume so high
that real signal gets buried — the unguarded `buyBuilding` write was missed exactly this way.

### 5.3 State management & save/load — 7
Every load path funnels through one `migrate()` with sanity clamps; corrupt JSON → fresh game;
exploit-relevant transients floored on load. **Cons:** no *type* validation — an imported save
with `cash: "1e50"` (string) sails through and NaN-poisons or crashes render; two open tabs
autosave every 15s with no storage-event listener or tab lock (last writer silently wins);
transient `_caches` are serialized into every save; the save-hook flashes "Saved." even when
`save()` returned false on quota failure.

### 5.4 Save migration & versioning — 7
Across 30 epics of schema growth, old saves genuinely load (backfill + hand-written fixups,
regression-tested per epic; grandfathering never confiscates). **Cons:** `SAVE_VERSION` is
still 1 and the `MIGRATIONS` ladder is dead, untested machinery — the first real migration will
run code that has never executed; `backfill` is only two levels deep (a key added inside an
existing depth-2 slice is not backfilled — verified: older saves' staff entries lack
`assignedTo`, rendering "→ undefined"); no downgrade guard for a `version: 99` save.

### 5.5 Performance — 6
Textbook sim loop: fixed-step accumulator (10 tps) on rAF, frame clamp, spiral-of-death guard,
rendering decoupled at 20 FPS, offline O(200) regardless of absence. **Cons:** the DOM
strategy is the weak half — ~30 card renderers rebuild via `innerHTML` from scratch 20×/s (57
assignment sites), including hidden tabs: continuous node churn, broken text selection, and the
verified reserve-input focus bug; a hidden tab earns nothing (rAF stops; elapsed clamps to
250ms; no visibilitychange catch-up) — "leave the tab open overnight" yields ~zero until a
manual reload recovers it via the offline path.

### 5.6 Testing depth — 8
4,619 lines / 1,304 assertions / 106 groups: golden pins to the second, per-epic
harness-invariance, offline-vs-online bit-for-bit determinism, bulk-buy fuzzing, frozen-schema
mutation resistance, exploit-class tests (anti-clicker ratio, money-pump neutrality, XSS
strip) — and it gates the Pages deploy. **Cons:** `ui.js` (2,238 lines) has *zero* tests, and
every user-visible defect this audit found lives in untested UI/glue; `main.js` is untested
(the stale `MILESTONE_STEP` bug lives there); the greedy policy is duplicated between selftest
and harness (drift would silently invalidate the mirror claims); the seam between groups [102]
and [103] is exactly where the ascend-island crash hides.

### 5.7 Dev tooling & workflow — 8
Test-gated deploy (a red suite cannot ship); an interpretable pacing harness with documented
guard bands; loud data validators; a safe-by-default art pipeline (env-key-only, idempotent);
committed `.claude/` agents and skills encoding a real verification workflow. **Cons:** no
linter or formatter anywhere; the Pages artifact uploads the *entire repo root* — `docs/`
(including the full plan and math proofs), `.claude/`, and `js/dev/` all become public site
content with no exclusion filter; the harness/selftest policy duplication is a maintenance
trap; genart has apparently never been run to completion (empty manifest).

### 5.8 Dependency-free & deployability — 7
The JS is genuinely dependency-free: zero deps, all 34 shipped files pass `node --check`,
native ES modules, clean acyclic import graph, no build step — the repo root *is* the site.
**Cons:** `index.html` pulls Spectre.css from unpkg **version-unpinned** and two Google Fonts —
runtime third-party dependencies contradicting the stated constraint; no SRI integrity
attributes; adblockers/offline/CDN outages silently degrade the presentation (verified in the
sandboxed render: both CDNs failed and typography fell back to system fonts).

### 5.9 Error handling & edge cases — 6
Good defensive habits in the engine: NaN-blocking single-point inflow clamp, drains clamp at 0,
negative offline elapsed rejected, forward clock-skew capped, all growable logs bounded.
**Cons:** the verified ascend-island crash (defect #1); no error boundary around the loop — a
throw inside `tick()` ends the rAF chain permanently (game freezes, no recovery prompt);
`C.MILESTONE_STEP` is re-derived only at boot, so importing a save with different
`faster_metab` ranks (or hard-resetting) leaves the milestone cadence stale until reload; the
concierge reserve input is destroyed 20×/s (focus-wipe — typing a value is effectively
impossible).

### 5.10 Security & robustness — 6
Player-entered names get defense-in-depth (sanitize at input + escape at render, tested);
prototype pollution is effectively closed; no eval; toasts use `textContent`; API keys stay
env-only. **Cons:** the import-save XSS surface (defect #7) — `esc()` applied to ~4 of dozens
of interpolation sites; no structural validation of imported saves (type-confusion garbage can
crash render — a DoS-by-save-string recoverable only by hand-clearing localStorage); the
unpinned, un-SRI'd CDN stylesheet is a supply-chain door.

**Theme summary.** An 8-grade engine wrapped in a 6-grade shell. Where the project decided to
care — layered architecture, pure math core, deterministic simulation, a 1,304-assertion
deploy-gating test net — it is unusually strong. Everything outside the headless loop is
under-engineered relative to it: an untested 2,238-line UI monolith rebuilding the DOM at
20 FPS, bootstrap glue harboring real state bugs, and exactly the class of defect the
engine-only test net cannot see. A first hardening pass on ui.js/main.js/prestige keep-lists
would close most of the gap.

---

# 6. UX / UI & Presentation — **6.3 / 10** (weight 15%)

| # | Category | Weight | Score |
|---|---|---:|---:|
| 1 | Layout & information hierarchy | 12% | 7 |
| 2 | Progressive disclosure | 12% | 8 |
| 3 | Visual design & aesthetics | 10% | 6 |
| 4 | Feedback & juice | 12% | 7 |
| 5 | Onboarding & first-time experience | 12% | 5 |
| 6 | Number formatting & readability | 8% | 6.5 |
| 7 | Navigation & discoverability | 10% | 7 |
| 8 | Accessibility | 8% | 5 |
| 9 | Responsive & mobile | 10% | 5 |
| 10 | Settings & QoL | 6% | 5 |
| | **Weighted theme score** | 100% | **6.3** |

Audited by code reading *plus* live Chromium rendering at 1280/390/320px with screenshots,
measured WCAG contrast ratios, keyboard probes, and reduced-motion checks.

### 6.1 Layout & information hierarchy — 7
Clear "one next goal" hierarchy on Home (current-tier postcard → single buyable rung with meter
→ one pink CTA); persistent Story strip above all mechanics; consistent card anatomy makes 25+
panels scannable by shape. **Cons:** the core buy loop lives on a hidden tab separate from the
Home screen that talks about it; the sticky tab bar paints over the sticky header once scrolled
(defect #8); generator rows leak internal math into primary layout ("L_upgrade = 1 + 0.5·n") —
spreadsheet voice in a game that promised postcards; late-game Home stacks 9 cards with no
in-tab navigation.

### 6.2 Progressive disclosure — 8
The codebase's flagship UX achievement, genuinely enforced in code and verified live: tabs are
born only when content exists, 20+ cards gate on real engine predicates, `🔒 ???` mystery
rungs, spoiler-free `???` trophies, a future-blind diary, amenity shelves collapsing to
3 + "+N more." A fresh save shows only 4 cards with no mention of Marina/Butler/Ascension
anywhere in the DOM. **Cons:** the plan's Stage 0 ("a lone Home") is not shipped — minute 0
shows three tabs; the HUD chip diet lasts seconds (passive clout pushes a "future" currency
chip into the header within ~2s); ~40% of the era-modal inventory still fires as ordinary
toasts; the paths card names late-path content before commitment, against the plan's own R1.

### 6.3 Visual design & aesthetics — 6
The "Poolside at Golden Hour" theme is real: a disciplined token set with usage rules encoded
as comments, sand/shell surfaces, rotated passport stamps, boarding-pass gradients, era-warming
skies, and a 22-scene emoji postcard system at zero asset weight. **Cons:** the presentation
layer is not dependency-free — Spectre.css and Google Fonts load from CDNs and the signature
typography silently degrades when they fail (verified); zero generated art shipped; the plan's
own ≥12px type floor is violated widely (`.iv-tag` ≈ 10.9px); disabled tiles at 45% opacity
make the fresh amenities shelf near-illegible.

### 6.4 Feedback & juice — 7
A broad hand-rolled juice layer: batched toasts with celebration priority and overflow
coalescing, floating tap popups that survive the innerHTML wipe, combo pulses with a one-shot
"going viral" latch, and era modals (island SOLD, retirement ceremony with epitaph + heir
naming, NG+ boarding pass) that turn prestige into theater — far above genre average.
**Cons:** the biggest *arrival* moments (first pool, Sail-Shaped Hotel, Seven Stars, the
Invitation) land as 4-second toasts — the game celebrates what you *click*, not what you
*reach*; the plan's two hero animations (confetti, postcard flip) don't exist; no count-up
easing on cash (numbers jump at 20fps rather than roll); buying a generator — the game's most
common action — produces no local feedback at all.

### 6.5 Onboarding & first-time experience — 5
One wry sentence establishes fantasy, state, and both verbs; the first check-in gate is already
satisfied at spawn so the first upgrade lands within minutes; the nudge auto-retires.
**Cons:** the instruction is *wrong* (defect #9 — "below" points at a hidden tab); the first
~10 seconds fire 3 unlock toasts + an overflow line — the "declutter" game opens with
notification spam; "Tap (small gain + combo)" is meaningless jargon at minute 0; no coach-mark
ties the text to the Income tab.

### 6.6 Number formatting & readability — 6.5
One formatter for everything with K/M/B/T…Dc suffixes to 1e36 then scientific; global
`tabular-nums` keeps the ticking HUD stable; progress-first presentation with aria-labels
expanding shorthand. Since the fitted economy peaks at log10(cash) ≈ 11.3 (golden-pinned
< 12), the suffix ladder covers the entire real curve with ~25 decades of headroom — an
earlier-draft concern about scientific notation in the "back half" does not apply to the
shipped curve. **Cons:** cent-precision noise on a currency treated as whole euros ("€15.0");
convention soup on one screen (×1.07, +50%, −60%, "L_upgrade = 1 + 0.5·n", pts) with internal
math notation leaking verbatim into player-facing strings; no thousands separators and no
long-form tooltip to decode "35.00B" for suffix-unfamiliar players.

### 6.7 Navigation & discoverability — 7
Tab-birth as reward ("the map grows, never shrinks") works, verified from 3 tabs at start to
Legacy appearing on the First Million trophy; pulsing new-content dots; signature-guarded tab
rebuilds prevent flicker. **Cons:** `activeTab`/`seenTabs` are transient module state — every
reload dumps the player on Home and re-lights *every* tab's "new" pulse, training players to
ignore the game's main discovery affordance; export/import/speed hide behind an unlabeled ⚙️
titled "Developer tools"; no keyboard shortcuts or URL hash; the mobile tab bar scrolls with no
overflow indicator.

### 6.8 Accessibility — 5
The bones are unusually good: always-mounted per-subsystem `aria-live` regions, progressbars
with values/labels, `:focus-visible` never removed, real `<button>`s, an `.iv-sr-only` utility.
**Cons:** zero `keydown` handlers in the codebase — the tablist isn't arrow-navigable, modals
ignore Escape, and `showEra` neither traps nor restores focus (a keyboard/SR user can be left
behind an `aria-modal` overlay); measured contrast failures (Dune #8A7360 secondary text
4.47:1 at 11–12px; white-on-pink CTAs 3.50:1 at 12.5px bold; #3E9B2E green 3.54:1);
reduced-motion coverage has holes (tap popup and toast slide-in still animate under `reduce`,
verified via `document.getAnimations()`).

### 6.9 Responsive & mobile — 5
Clean single-column reflow with zero horizontal overflow down to 320px; thumb-reachable tap
footer; toasts scale to viewport. **Cons:** the cash HUD disappears while scrolling on mobile
(defect #8) — an idle game hiding its most important number; touch targets far under guideline
(tabs 31px, buttons 29px measured at 390px); the footer wraps to two rows at phone widths and
occludes content, with no `env(safe-area-inset-bottom)`; one breakpoint total.

### 6.10 Settings & QoL — 5
QoL substance is strong: autosave + save-on-hide + manual save + export string; a best-in-class
itemized "While You Were Away" modal (every passive subsystem reports its own line, in-voice);
persisted bulk-buy. **Cons:** export/import still run through blocking browser
`prompt()`/`confirm()` — directly contradicting the shipped ledger's "ALL browser
confirm()/prompt() replaced" claim, and clipboard-via-prompt is broken on mobile; there is no
settings panel at all (no notation choice, no toast/motion toggle, no player-facing pause);
hard reset — the game's only irreversible action — is one `confirm()` away with no
export-first prompt.

**Theme summary.** One doctrine executed superbly and everything downstream of it left at ~70%.
The progressive-disclosure core is the best thing about the presentation layer and, with the
era-modal ceremonies and the voice, gives the game a personality most shipped web idles lack.
But the 332-line CSS / 2,238-line ui.js imbalance shows exactly where investment stopped:
CDN-dependent typography, zero shipped artwork, hero animations missing, plan guardrails
violated by the shipped product (three tabs at minute 0, sub-12px text, 3.5:1 CTAs), and three
cheap high-impact defects (broken first instruction, hidden mobile HUD, no keyboard support) at
the front door. An ambitious, well-documented design system shipped at prototype fidelity.

---

# Final verdict

| Umbrella theme | Weight | Score | Weighted |
|---|---:|---:|---:|
| Concept & Game Design | 20% | 6.4 | 1.28 |
| Balance & Pacing | 20% | 5.0 | 1.00 |
| Theme & Narrative | 15% | 7.7 | 1.16 |
| Mathematical Foundation | 15% | 7.6 | 1.14 |
| Technical | 15% | 7.1 | 1.07 |
| UX / UI & Presentation | 15% | 6.3 | 0.95 |
| **FINAL SCORE** | **100%** | | **6.6 / 10** |

Concept and Balance carry the heaviest weights because they *are* the product in this genre —
an idle game is its loop and its curve; the other four themes are how well that product is
expressed and built.

## Summary

**idleVaction is a 6.6/10 today, with an unusually high ceiling.** Its foundations are the
strongest part of the project and comfortably above what shipped indie idle games achieve: a
mathematically proven, regression-pinned economy (a real finite-time-singularity diagnosis and
fix, exact prestige accounting, four independent overflow nets, a ±1-second golden pin over an
8¼-hour simulated run); a cleanly layered, genuinely data-driven, dependency-light architecture
gated by a 1,304-assertion test suite; one disciplined and genuinely funny authorial voice
sustained across ~30 epics of content; and a handful of real design inventions — Comfort/
accommodation as the progression spine, gate-deflated √-Legacy, retirement-as-prestige with a
deterministic family album, and a progressive-disclosure doctrine that is actually enforced in
code.

What holds it back is consistent across all six themes: **the last mile toward the player was
never walked.** The felt-pacing contracts the design wrote for itself are broken or unmeasured
(85% of the optimal run outside the meaningful-purchase band, six milestone doublings in eight
hours, ten of sixteen story-beat arrivals simultaneous, a story-free final hour); two endgame
layers are dead on arrival (Legend unreachable at a ~1e5 scale misfit, NG+ numerically easier
while claiming to harden); the largest content class (186 amenities) is a documented
progression trap carrying dormant stat fields; the story's opening, finale, and cast are
prototype stubs around an excellent middle; the UI ships real bugs at the front door (a wrong
first instruction, a vanishing mobile cash HUD, a post-ascension island crash, no keyboard
support); and the documentation layer has drifted far enough from the shipped code to mislead.

The encouraging part of this audit is how cheap most of the fixes are relative to what has
already been built. Roughly ordered by impact-per-effort: (1) fix the four verified code
defects (ascend keep-list, bulk-sell sum, investor-dance pricing, escape-all-save-strings);
(2) re-scale `LEGEND_SCALE` (~1e2) and flip the NG+ net so the two endgame layers exist;
(3) drive story gates off non-accommodation signals and give beats 23–30 the mid-game's second
writing pass; (4) add a casual-policy bot and a cadence assertion so the ~20h claim and the
felt-pacing contract are *measured* in CI like everything else; (5) fix the three front-door
UX defects and self-host the CSS/fonts; (6) run the docs parity pass. None of these threaten
the fitted curve the project has so carefully protected — and together they would plausibly
move the project from a 6.6 to an 8: from an exceptional engine wearing a prototype's clothes
to the game its own documents describe.

*Scores calibrated to: 5 = average shipped indie idle; 8+ = genuinely excellent; 9–10
reserved for near-flawless. Full per-category evidence above; verified defects listed at top.*

---

# Empirical addendum — `/demo-playthrough` simulations (2026-07-23)

After the audit was written, the repo gained a hyper-speed scripted-run simulator
(`.claude/skills/demo-playthrough`, `npm run demo`) that plays real-engine playthroughs under
scripted strategies. It is dt-invariant (selftest [59]/[81]), so continuous active-play
game-time replays faithfully; only *decision* timing coarsens with `--cadence`. I used it to
put numbers on the audit's four biggest **unmeasured** claims. `npm test` green at the merged
baseline (sections [106]/[107] cover the runner). **Every claim below was confirmed; none was
refuted.**

### Measured: branch parity — **CONFIRMED broken and quantified**
Audit said (1.7, 2.7): "branch parity is asserted from comments; only the vlogger line is
harness-verified." Measured, island (tier-20 accommodation) time per branch:

| Branch | Greedy island | Casual island (15-min cadence) | peak log10$ (40h) |
|---|---|---|---|
| connoisseur | **6h 03m** (fastest) | 7h 15m | 22.9 (highest) |
| traveler | 7h 46m | 9h 30m | 17.9 |
| vlogger (baseline) | 8h 15m | 10h 00m | 17.7 |
| crypto | **13h 46m** (slowest) | 11h 45m | 15.5 (lowest) |

Greedy spread is **2.28×** (connoisseur ~27% faster than vlogger, crypto ~67% slower) — far
outside any reasonable parity band. Connoisseur (appreciating art/wine collections) is the
dominant branch; crypto is a genuine laggard. This directly supports improvement targets 1.7 /
2.7 (per-branch CI probes) and makes crypto a specific Phase-C retune target.

### Measured: Legend (prestige-2) reachability — **CONFIRMED unreachable** (upgrades P0 #2 from "suspected" to "proven")
Audit flagged Legend as organically unreachable (`LEGEND_SCALE 1e7` vs an ~11.8·√N Legacy arc),
tested only with synthetic state. Simulated three ascension-loop scenarios over **40h each**:
all reach **0 Legend points** after **4 ascensions**, with per-ascension Legacy payouts
**declining 11 → 5 → 4 → 2** (√-telescoping). Total Legacy ever earned after 4 ascensions ≈ 22
against the 1e7 the first Legend point needs — the entire prestige-2 layer (5 perks, L_legend,
the "Empire of Leisure" fantasy) is confirmed dead content at shipped constants. The P0 fix
(re-scale to ~1e2–1e3 + an organic-reachability test) stands.

### Measured: the ~20h casual target — **REFINED** (target lands in a play-pattern gap)
Audit said the ~20h figure rested on a stale E07 completionist measurement, "plausibly 22h+."
Measured, three play patterns bracket it — and few land near 20h:
- **Focused casual** (15-min check-ins, still ROI-aware): islands **7h15m–11h45m** by branch.
- **Generators-only** (`vlogger-genrush`, zero amenities/destinations/training): **8h 53m** —
  only ~8% slower than greedy, confirming amenities are near-pure leak and the dominant line is
  narrow (supports 1.7 / 2.7).
- **Amenity-completionist** (`vlogger-comfort-max`, buys every affordable amenity): **~31h 38m**.

So the design's "~20h" is not a typical outcome: a focused player islands in ~10h, a
completionist in ~31h, and the 20h number sits in the gap between them. The Phase-B casual bot
+ CI band (target: casual island **18–22h**) is exactly the instrument needed to close this,
and Phase C must move the *focused-casual* curve up toward the target (not just rely on
completionist spending to reach it).

### Measured: ascension-loop incentive inversion — **CONFIRMED**
Audit said (1.4, 2.6) each ascended run is *longer* than the last for a thin payload. Measured
island times across the loop: **8h15m → 16h39m → 1d1h50m → 1d11h18m**, i.e. per-run lengths
**~8h15m, 8h24m, 9h11m, 9h28m** — monotonically longer — while Legacy payouts decline
(11→5→4→2) and the whole 40h yields just **~4 tree ranks**. Confirms the loop trades more time
for less reward each generation (the "chore" risk), and motivates the frontier-compression +
flat-run-plateau + richer-payload fixes (1.2 / 1.4 / 2.6).

### Bonus finding: the "obvious" meta-tree spend is a trap
`ascend-meta-tree` (all Legacy → Legacy Investor / Head Start / Second Wind) is at **tier 4,
log10 4.9 after 40h**, versus `ascend-income-tree` at **tier 15, log10 10.3** — meta-only
spending is dramatically, actively worse. This sharpens audit 1.5 (the tree is mostly numeric
with few play-changers) into a concrete hazard: a new player who reasonably pours early Legacy
into the meta nodes *kneecaps* their run. The tree-redesign (1.5: ≥8 play-changers, clearer
node signposting) should treat this as a first-order onboarding problem, not just depth.

### Terminology note (no refutation)
The demo's "Tier 20 — Private Island" is the **accommodation tier** (cash-gated, reached ~8h in
run 1 with 0 Legacy). The E28 **island deed** (`ISLAND.price.legacy 25` + 1e12 cash) that
unlocks the guest/building economy is a *separate* gate; the loops above spend Legacy on the
tree and never bank 25, so the guest economy never activates in any simulated run — consistent
with the audit's 1.6 / 2.3 finding that the post-island layer is many ascensions out.

**Net effect on the verdict:** the simulator did not move the 6.6 — it *hardened* it. Four of
the audit's most consequential and least-certain findings are now measured facts, and Phase B
of the improvement plan ("measure what you promise") is partially executed: the branch, casual,
and ascension-loop instruments now exist and print the (currently failing) numbers above.
