# idleVaction — Improvement Plan to 8+ (companion to `audit-fable.md`)

**Date:** 2026-07-23 · **Companion to:** `.claude/context/audit-fable.md` (full audit, final
score **6.6/10**) · **Goal:** concrete, per-category actions that lift every audited category
to **8+**, and a phased roadmap that makes the game production-worthy, balanced, and fun enough
to deserve tens of hours of a player's time.

**How to read.** Each category shows `current → target` and 2–5 concrete actions. Tags:
- **Effort:** `[S]` hours, `[M]` a day-ish, `[L]` multi-day.
- **Owner** (per AGENTS.md routing): `impl` = @implementer (Sonnet 5), `bal` = @balance-tuner
  (Opus 4.8, anything touching a fitted constant), `ver` = @verifier (Fable 5, gates & tests).
- **P0** marks the ten verified defects from the audit's top section — fix these first,
  every one of them, before any balance or content work.
- Any action marked `bal` moves through the harness and re-pins goldens **once, in one
  coordinated refit** (Phase C below) — never piecemeal, or the golden churn will eat the
  schedule.

**Projected outcome if executed:** ~**8.3 / 10** (projection table at the end).

---

# 1. Concept & Game Design — 6.4 → target 8.2

### 1.1 Core loop clarity — 7 → 8.5
- Make the wallet-full state loud and actionable: persistent HUD banner ("Wallet full — income
  paused"), the bank card pulses, and the away-summary explains the cap and names the next bank
  tier. `[S, impl]`
- Add `bank` to the concierge/butler purchase categories (`js/config.js:106` whitelist +
  `conciergeTick`) so automation can raise the cap — this single change fixes the loop's worst
  silent stall *and* the offline dead-end (see 1.8). `[S, impl]` **(high leverage)**
- Keep the milestone fantasy alive past the knee: every post-knee milestone still fires a
  celebration (toast + button flash) and every 5th grants a themed cosmetic sticker, so the
  "×2!" habit players learn early keeps paying attention-rewards late. `[S, impl]`

### 1.2 Genre-convention fit — 6.5 → 8
- Restore the prestige promise without breaking the anti-collapse fit: give each ascension an
  innate **frontier compression** — tiers the lineage has already reached cost/gate ~5%·√count
  less, so run N is *faster to your old frontier* and the added length is all new territory.
  Re-fit so total run length plateaus ~flat (8h–9h) instead of growing to 10h40m.
  `[M, bal]` **(the single biggest "is looping fun" fix, with 2.6)**
- Raise the first-ascension payload from ~11 to ~25 Legacy and re-space `TREE` costs so the
  first reset buys one build-defining node plus ranks — a transformative first prestige, genre
  standard. `[S, bal]`
- Surface magnitude where it does exist: a "lineage net worth" stat (sum of lifetime cash
  across generations, NG+-inflated) on the Legacy tab gives the big-number fantasy a home
  without touching the fitted curve. `[S, impl]`

### 1.3 Progression-system depth — 6 → 8
- **Activate the dormant amenity `xMult`/`xScope` fields** as a real 19th stack layer:
  additive-within (per the master rule), hard-capped (e.g. `L_amenity ≤ 2.0` per tier), exactly
  1.0 with no amenities — then re-fit. This converts 186 trap SKUs into the "small wins engine"
  docs/05 promised, and it is the load-bearing fix for categories 1.7, 2.1, 2.2, 2.7 and 2.8.
  `[L, bal]` **(the plan's keystone — most other pacing fixes assume it)**
- Also wire `bodyXp` on wellness amenities (tiny bounded body-skill XP grants) or delete the
  field — no more scenery stats. `[S, impl after bal signs the bound]`
- Give renovations one choice: at reno 5 each tier picks one of two specializations (e.g.
  +production vs −cost); data-driven, bounded, additive within L_upgrade. `[M, bal]`

### 1.4 Prestige/ascension design — 7 → 8.5
- **P0** Fix the ascend keep-list: carry/rebuild `island.buildings` in `ascend()`
  (`js/prestige.js:129`), mirroring `legendReset`/`startNgPlus`, + a regression test that
  ascends-then-builds (the [102]/[103] seam). `[S, impl + ver]`
- Implement the docs/04 §2 ascension-ROI hint on the Legacy card: "Ascend now: +N Legacy ·
  next node at +M". `[S, impl]`
- Story skip on re-runs: beats the lineage has seen land as diary entries + one compact toast;
  era modals fire only for never-seen content. Kills the run-5 toast-spam chore. `[M, impl]`
- **P0** Close the investor dance: `legacy_investor`'s payout bonus applies only at the rank
  held at **run start** (snapshot in `newGame`/`ascend`), so respec-in-before-ascending does
  nothing. Keep respec itself free. `[S, bal]`

### 1.5 Meta-progression — 5 → 8
- **P0** Re-fit `LEGEND_SCALE` from `1e7` to **~1e2–1e3** so the first Legend point lands
  organically around ascension 4–6, and add a selftest that *simulates the organic arc*
  (metered ~11.8·√N Legacy, no synthetic state) to prove reachability forever. `[M, bal + ver]`
- **P0** Flip NG+ to net-harder: gates `×2.2^n` vs income `×2.0^n` (or equivalent), and add one
  qualitative **mutator per cycle** chosen from 2 options (e.g. "Monsoon: Comfort −20%",
  "Overbooked: costs +30%, milestones every 8") — post-game difficulty becomes a decision, not
  an exponent. `[M, bal]`
- Grow the tree 15 → ~25 nodes with ≥8 play-changers (examples: concierge-buys-bank-tiers,
  start-committed-at-stage-2, offline market fine-resolution, amenity-cap +0.5, second concierge
  slot). `[M, bal for numbers, impl for wiring]`
- Grow the Legend shop 5 → ~12 perks, weighted toward QoL/meta (auto-buy unlocks, story-remix
  modifiers, heirloom slots — see 1.9). `[M, impl + bal]`

### 1.6 Content variety & breadth — 6.5 → 8
- Open the Clout loop: clout becomes spendable cross-system — destination discounts, sponsor
  slot unlocks, staff wage rebates, cosmetic postcard frames — so the vlogger's headline
  currency buys things outside its own feedback loop. `[M, bal]`
- Wire island guest income through the real multiplier stack with a bounded coupling (e.g.
  `(L_total)^0.25`), making the endgame economy respond to everything the player built — and
  making config's "full M_k stack" comment true. `[M, bal]`
- Deepen the token systems: sponsors 3 → 9 (three per branch flavor), seasonal 5 → 10 entries.
  `[S, impl]`

### 1.7 Player agency — 6.5 → 8
- With amenities live (1.3) and D4–D8 reachable (2.3), multiple viable spending lines exist;
  **prove** branch parity with per-branch harness probes in CI asserting island time within
  ±20% across all four branches. `[M, ver]`
- Concierge strategy presets the player chooses (Saver / Balanced / Aggressive) instead of one
  near-optimal default — automation executes *your* policy. `[S, impl]`
- Respec stays free the first time each run, then costs 10% of ranks — tree choices get stakes
  without punishing experimentation. `[S, bal]`

### 1.8 Idle/offline design — 6.5 → 8
- Concierge bank-tier purchases while away (same change as 1.1) — the one purchase that matters
  offline becomes automatable. `[S, impl]`
- Overflow stops being pure loss: convert lost overflow into a **Travel Fund** voucher worth up
  to the next bank tier's cost (bounded, non-compounding — it can only ever accelerate the cap
  chase, never the economy), surfaced in the away summary. `[M, bal]`
- The away summary teaches the system: "€X overflowed — a bigger account would have caught it
  → [Upgrade]" with a one-click buy. `[S, impl]`

### 1.9 Long-term retention hooks — 5 → 8
- Achievements 16 → **60+**: purely data-driven expansion across all systems (fleet, staff,
  collections, destinations, NG+, lineage), preserving the reward-0-unless-meta invariant so
  the harness stays untouched. `[M, impl]`
- Collections become **heirlooms**: a Legend perk lets 1–3 collection pieces survive ascension
  with a tiny bounded meta bonus — the collector fantasy stops re-grinding. `[M, bal]`
- Honest light live-ops within the determinism doctrine: local-date **cosmetic** events
  (postcard frames, sky tints, one seasonal amenity skin) — visual only, zero economy effect,
  zero FOMO mechanics, so harness invariance holds by construction. `[M, impl]`
- Move the seasonal destination rotation's gate from island-ownership to first-ascension so it
  exists during the hours players actually play. `[S, bal]`

### 1.10 Originality — 8 → 9
- Ship the postcard art (see 3.9/6.3) and the island-as-producer layer polish (guest economy
  coupling, 1.6) — the original systems finally get their spectacle. `[—, covered elsewhere]`
- Write a short "design notes" page in-game (unlockable lore) about the wallet cap and the
  lineage — turning the most player-hostile-feeling mechanic into a understood signature.
  `[S, impl]`

---

# 2. Balance & Pacing — 5.0 → target 8.0

> Everything here funnels through **one coordinated Phase C refit** owned by `bal`, with the
> new measurement rig (2.4/2.9) built **first** so the refit is fitted against casual play, not
> extrapolation. Re-pin all goldens exactly once at the end of the phase.

### 2.1 Early-game pacing — 6 → 8
- Give beat 2 a real gate (e.g. first amenity purchased) so no beat is dead at t=0. `[S, impl]`
- Break the 0–22m single-axis stretch: lower D2's base (6e4 → ~2e4 band) or add an early-game
  D2 intro discount, so a second generator decision exists inside the first 15 minutes.
  `[M, bal]`
- With amenity `xMult` live, seed 4–6 cheap early amenities with honest small returns — the
  "small win every ~1 min" contract becomes true instead of a trap. `[part of 1.3, bal]`
- Re-pin the docs/05 §1 per-beat target table against the new casual bot (2.4) and assert the
  first-hour row in CI. `[S, ver]`

### 2.2 Mid-game pacing — 6 → 8
- Mini-milestones every 5 buys (+10% bounded, additive within the milestone layer) restore a
  doubling-family event every ~10–15 min instead of one per ~82 min. `[M, bal]`
- Amenity ROI (1.3) fills the 6–8 min purchase gaps with genuinely worthwhile buys — target:
  median meaningful-purchase gap ≤ 3 min in the greedy run, asserted in CI. `[bal + ver]`
- Bridge the worst story gap (beat 10→11, 52m45s greedy) by re-gating beat 11 on a
  non-accommodation signal that lands mid-gap (see 2.5). `[S, bal]`

### 2.3 Late-game / endgame pacing — 4 → 8
- **Make D4–D8 alive in run 1:** compress `GEN.base` spacing for the top half (D4 8e11 → ~6e10
  band, descending proportionally) so the greedy run buys into at least D5, with D6–D8 landing
  across ascensions 1–3 instead of 10+. Re-fit island time back into the 6–12h band. `[L, bal]`
- Fill the 6h52m→8h15m story vacuum with a **final-approach mini-arc**: the island purchase
  becomes three escrow installments, each with an authored beat (survey the island, meet the
  notary, the goat inspection), spreading beats 24–26 + island across the last 90 minutes.
  `[M, bal + impl]`
- Fix the island-deed honesty gap: with the raised first-prestige payload (1.2/1.4) the deed
  lands at ~2–3 ascensions; update the config comment to match measured reality. `[S, bal]`

### 2.4 Curve fit vs ~20h — 6 → 8
- **Build the casual-policy bot** (~30-line `play()` variant: acts every 3–5 min, buys
  flavor-first, taps occasionally) and a refreshed completionist bot; print both curves in
  `npm run harness` and **pin casual island time to 18–22h in CI**. The 20h claim becomes a
  measured contract, not a ×2.4 assertion. `[M, ver]` **(build BEFORE the Phase C refit)**
- Re-pin the per-beat table for all three policies; retire the stale E07 completionist figure
  from docs/05. `[S, ver]`

### 2.5 Beat spacing & clustering — 3 → 8
- **Re-gate beats on diverse signals** instead of the Comfort/accScore proxy: amenities owned,
  destinations visited, skill levels, staff hired, clout, Legacy — so beats land *between* tier
  purchases instead of on top of them. Where the fiction names an action (boat, butler), gate
  on that action. `[M, bal + impl]`
- Add an engine **spacing valve**: at most one story beat fires per 90 game-seconds; a ready
  cluster queues in monotone order. Even a re-clustered economy can never dump three beats in
  one tick again. `[S, impl]`
- CI assertions: greedy run has ≥24 *distinct* beat timestamps and no two beats within 60s.
  `[S, ver]`

### 2.6 Prestige timing & incentives — 5 → 8
- Frontier compression + flat run-length plateau (1.2) and the ~25-Legacy first payload (1.2).
  `[bal]`
- Ascension-ROI hint (1.4) plus a harness probe that *sweeps* ascension timing (ascend at tier
  16/18/20) and prints the optimal window — design data the docs promised. `[M, ver]`
- Story-skip on re-runs (1.4) removes the re-tread chore. `[impl]`

### 2.7 Upgrade/amenity ROI balance — 4 → 8
- Amenity activation with per-cluster ROI targets: early clusters pay back in 2–5 min, late
  clusters in 10–20 min, cosmetic-only items clearly marked with a 🎀 tag (honest flavor, not
  trap). `[part of 1.3, bal]`
- The bank ladder de-chored: one-click upgrade surfaced on the wallet chip when affordable +
  concierge automation (1.1). `[S, impl]`
- Per-branch CI probes (1.7) close the "crypto might dominate unmeasured" hole. `[ver]`
- Delete or activate every dormant data field (`xMult`/`xScope`/`bodyXp`) — zero scenery stats
  ship. `[S, impl]`

### 2.8 Walls & dead zones — 5 → 8
- The combination of 2.1–2.3 targets: **no >8 min purchase gap** and **≤40% of the greedy run
  inside >180s gaps** (from 84.7%), both asserted in CI as new guard-band lines next to the
  island-time band. `[ver]`
- Keep the pre-summit *tension* but give it content: the final-approach mini-arc (2.3) plus one
  late renovation choice (1.3) make the last hour the densest, not the emptiest. `[bal + impl]`

### 2.9 Harness quality — 7 → 8.5
- Single-source the greedy policy: extract `play()` into `js/dev/policy.mjs`, imported by both
  `harness.mjs` and `selftest.mjs` — drift between them becomes impossible. `[S, impl]`
- Add the casual + completionist + per-branch policies (2.4/1.7) and cadence metrics (median /
  p90 purchase gap, milestone events per hour, distinct beat timestamps) to the harness output
  and the CI assertions. `[M, ver]`
- Fix the broken "doubling time @isl" metric (currently prints `n/a`). `[S, impl]`
- Either implement the documented marginal-ROI ranking policy or update docs/05 §3 to describe
  the shipped threshold cascade — code and spec must agree. `[S, ver]`

### 2.10 NG+/post-game scaling — 3 → 8
- Legend re-scale + organic-reachability test (1.5). `[bal + ver]`
- NG+ net-hardening flip + per-cycle mutator choice (1.5). `[bal]`
- A post-game harness probe: simulate NG+1–3 and assert each cycle's island time stays within a
  designed band (the "hardens but stays fair" contract, measured). `[M, ver]`

---

# 3. Theme & Narrative — 7.7 → target 8.6

### 3.1 Theme coherence — 9 → 9 (hold)
- Branch-skinned generator names: a data-driven name/desc override per branch (the Connoisseur
  earns via "Patrons" and "Provenance Fees," not "Followers") — fixes the influencer-economy
  dilution with zero engine change. `[M, impl]`

### 3.2 Story arc & structure — 7 → 8.5
- Give beats 23–30 the full mid-game treatment (the file's own header admits they're
  prototype stubs); beat 30 deserves more than 14 words. `[M, impl (writing)]`
- Add the missing beat-14 traveler/vlogger variants promised by docs/02. `[S, impl]`
- Align gates with fiction (part of 2.5): the boat beat requires a hull, the butler beat a
  hire. `[bal + impl]`
- Populate VIGNETTES from 1 entry to 15–20 (the delivery channel already works). `[M, impl]`

### 3.3 Writing quality & tone — 8 → 9
- Dedupe the duplicate amenities (two bathrobes, two earplugs — merge or lampshade like the
  gold taps). `[S, impl]`
- Vary the two over-used ironies ("sun you flew a continent to find" ×4, "thirty years of one
  cold trickle" ×4) — rewrite two instances of each. `[S, impl]`
- Second pass on the bookend story-card copy so it matches the amenity copy around it.
  `[part of 3.2]`

### 3.4 Naming & flavor — 8 → 9
- Rename the flavorless mid generators (Media Deals / Brand Partners / Talent Agency) with
  vacation-voiced names — the most-viewed panel should carry the best names, not the worst.
  `[S, impl]`
- Name and flavor the TRAINING rows; give 5–8 skill-tree nodes vacation-inflected names.
  `[S, impl]`

### 3.5 Theme-mechanics integration — 8 → 9
- Amenity activation (1.3) turns flavored numbers into mechanics; action-gated beats (2.5)
  close the reskin seams; guest-income coupling (1.6) lets the late themed systems drive the
  economy they decorate. `[—, covered]`

### 3.6 Character/NPC presence — 5 → 8
- **A recurring-cast arc** (~30 short strings, cheap, high-impact): Vera reappears as a rival
  then collab at content tiers 3/5; Henk turns up asleep at a premium destination; Bram is
  hireable as staff at the resort ("he finally found the hostel with no checkout time").
  `[M, impl]`
- **Resolve the patron:** one beat-27/28 appearance on the island he seeded, and a final letter
  in the beat-30 rewrite. The invitation's sender must exist at the destination. `[S, impl]`
- Fill the vignette channel (3.2) with the cast, and let one NPC per branch acknowledge the
  branch choice (the `pathSeed` flag the engine records and never uses). `[M, impl]`

### 3.7 Emotional arc & payoff — 7 → 8.5
- Rewrite "Letting Go" (beat 26) as the wistful flagship the docs describe — name what is being
  let go; move the retirement fiction's heart from the ascension UI into the beat itself.
  `[S, impl]`
- Wire the six missing engine-fired era modals (Crossroads polaroids, first pool, tier 12,
  Seven Stars, The Invitation, first resort building) — the UX-plan's own inventory, ~60% of
  which already has the modal system built. `[M, impl]`
- An island-arrival montage: the SOLD modal chains into a 3-frame diary flashback (bus stop →
  bunk → island) — the 20-hour arc paid off in one screen. `[S, impl]`

### 3.8 World-building — 7 → 8
- Add 6–8 destinations covering the missing world (Marrakech, Cape Town, Rio, Buenos Aires,
  Kyoto, Queenstown…) with the existing gate vocabulary — data-only. `[M, impl + bal for
  mults]`
- Post-purchase destination life: each destination gets one rare revisit vignette so places
  aren't dead after the stamp. `[M, impl]`
- An island map card: the E28 buildings rendered as a small emoji/art grid — the game's
  destination finally has geography. `[M, impl]`

### 3.9 Visual theming & art direction — 7 → 8.5
- **Run the genart pipeline to completion** for the 22 tier postcards + 5 premium destinations
  + island buildings; populate `POSTCARD_ART`; commit the assets. The style bible and fallback
  chain already exist — this is execution, not design. `[M, impl + human review of outputs]`
- Extend era skies beyond the topbar: page background tint + card border warmth per era
  (CSS-variable swap, reduced-motion safe). `[S, impl]`
- Self-host fonts/CSS (see 5.8) so the theme's typography can't silently vanish. `[S, impl]`

### 3.10 Consistency across content packs — 9 → 9 (hold)
- Give the flavorless mechanical packs one line each (market-event one-liners, training rows,
  skill-tree node flavor) so no UI surface drops out of voice. `[S, impl]`

---

# 4. Mathematical Foundation — 7.6 → target 8.5

### 4.1 Number representation & precision — 8 → 8.5
- Delete the false `N.add/mul` abstraction claim from docs/01 §8 and replace it with the honest
  contract ("raw doubles; swap plan = rewrite `math.js` arithmetic; trigger: measured
  peakLog ≥ 290"). `[S, ver]`
- Add the CI **full-arc magnitude sweep** math-proof §9 prescribes: max tree + 10 ascensions +
  10 NG+ cycles, assert peakLog < 290. `[M, ver]`
- `migrate()` clamps absurd magnitudes (cash/lifetime > 1e300 → clamp + toast) so a hand-edited
  save can't propagate `Infinity`. `[S, impl]`

### 4.2 Growth-model correctness — 8 → 8.5
- Document the integration contract: goldens certify the dt=5 scheme; client dt=0.1 diverges
  −0.24%/2h (accepted, in the player's favor online). One paragraph in math-proof. `[S, ver]`
- Fix docs/01 §1.2/§2's pre-fit constants (see 4.10). `[ver]`

### 4.3 Multiplier-stack architecture — 7.5 → 8.5
- Resolve the flagged curve inconsistency: move `sun_kissed` from `1.15^rank` into the additive
  ascension layer (or move `compounding_interest` out) — one curve family for permanent income
  nodes, re-fit. `[S, bal]`
- **Repatriate stray constants to config:** compounding `0.10` (`math.js:81`), sun_kissed
  `1.15` (`math.js:635`), pathBoost `0.05` (`math.js:624`), golden_ratio `0.1` (`math.js:773`),
  gen-upgrade `50·8^n` (`engine.js:772`). Add a `js/dev/lint.mjs` rule that greps for numeric
  literals in multiplier code (see 5.2). `[S, impl + ver]`
- Amend the stated master rule for the two roster-product layers (L_dest, L_staff) — either
  convert to additive or document the bounded-product exception. `[S, bal]`
- Add a joint worst-case assertion: product of every layer's documented cap < a budget
  constant. `[S, ver]`

### 4.4 Soft-cap / milestone math — 8 → 8.5
- Soft-knee the island guest milestone (`math.js:325`) with the same KNEE-4 shape, **or** write
  the formal boundedness derivation (α≈0.42, no chain compounding, exponential upkeep) into
  math-proof §14 with a CI bound on `L_guest`. Either closes the "outlawed shape, undocumented
  exception" hole. `[M, bal]`
- **P0-adjacent:** make `MILESTONE_STEP` derived, not mutated: replace the global-config
  mutation with a pure `milestoneStep(state)` read — kills the stale-after-import/reset bug
  class (5.9) and the determinism landmine (4.9) in one move. `[M, impl + ver]`

### 4.5 Ascension/Legacy soundness — 7 → 8.5
- **P0** ascend keep-list fix + regression test (1.4). `[impl + ver]`
- **P0** investor-dance snapshot fix (1.4) and re-document the telescoping semantics with
  investor ranks in math-proof §7. `[bal + ver]`

### 4.6 Overflow safety & bounds — 8 → 8.5
- Fix math-proof §0/§10's stale headline ("~18h island", "peak ~1e52") to match its own
  appendices (8h15m, peak 11.3). `[S, ver]`
- The full-arc CI sweep (4.1) closes the "measured, not asserted" gap. `[ver]`

### 4.7 Offline-progress math — 7.5 → 8.5
- **P0** Fix the docs/01 §7 claim direction (offline under-produces ~3%; it is *not*
  player-favoring). `[S, ver]`
- Weight offline market events by actual overlap duration within the macro-step (deterministic:
  event start/length are already seeded) instead of applying a 20–40s event to a full 216s
  step — removes the ~7× over-weighting and most of the online/offline event divergence.
  `[M, bal]`
- Either implement the documented closed-form no-purchase fast path or delete its description.
  `[S, ver]`

### 4.8 Bulk-buy & cost-sum closed forms — 7.5 → 8.5
- **P0** Fix `sellCoin` to the geometric sum (`js/engine.js:1032-1037`) — bulk-sell must equal
  sequential sells; add the parity fuzz test mirroring the buy side. `[S, impl + ver]`
- Epsilon-pad `maxAffordable`'s log inversion so an exactly-affordable boundary unit is bought
  (keep the engine re-check as the overspend net). `[S, impl]`
- Assert the `genMaxQty`/`genCost` comms-discount pairing in a test. `[S, ver]`

### 4.9 Determinism & numerical stability — 8 → 8.5
- `MILESTONE_STEP` derived-not-mutated (4.4) removes the last determinism landmine. `[impl]`
- Index market phase-transition draws by game-time bucket rather than per-tick so event
  *sequences* are tick-granularity-independent (the offline fix in 4.7 gets you most of this).
  `[M, bal]`

### 4.10 Math documentation parity — 6.5 → 8.5
- One dedicated **docs parity pass** over docs/01 against shipped code: GEN constants, the
  unbounded Comfort formula (delete `comfortCap`/saturating version), the 18-layer stack list,
  `lifetimeCashThisTree` in the legacy formula, delete the BigNumber layer claim; fix the
  config guest-income comment; update docs/04's stale run-length table; fix math-proof's TL;DR.
  `[M, ver]`
- Add "docs drift check" to the `/verify` skill checklist so parity is re-audited at every
  phase gate, like commit verification is. `[S, ver]`

---

# 5. Technical — 7.1 → target 8.4

### 5.1 Architecture & modularity — 8 → 8.5
- Registry-driven reveals: replace the ~35 hand-enumerated `check*Reveal` calls in `tick()`
  with a data table `[{id, predicate, message, once}]` iterated generically — new content adds
  a row, not a function + call-site. `[M, impl]`
- Route the UI's direct state mutations (`ui.js:1960-1971` concierge writes) through engine
  actions. `[S, impl]`

### 5.2 Code quality & readability — 7 → 8
- Extract accommodation arrival-flash copy (the ~75-line `if (t === N)` chain) into
  `DATA.accommodation[t].arrivalFlash` — the house style already is data-driven. `[S, impl]`
- Central ID constants (or a validator asserting every tree/perk id referenced in
  `math.js`/`prestige.js`/`main.js` exists in the data) — stringly-typed renames stop breaking
  effects silently. `[S, impl + ver]`
- Write `js/dev/lint.mjs` (zero-dep, fits the culture) with project-specific checks: numeric
  literals in multiplier code paths, `innerHTML` interpolations without `esc(`, ids not in
  data, `Math.random` anywhere. Wire it into `npm test`. `[M, ver]`

### 5.3 State management & save/load — 7 → 8
- **P0-adjacent** Type-validation pass in `migrate()`: coerce/reject non-numeric numbers,
  whitelist known keys, validate enum fields (`branch`, event `kind`, staff `assignedTo`)
  against data vocabularies — closes the NaN-poisoning *and* most of the XSS surface at one
  choke point. `[M, impl + ver]` **(shared with 5.10)**
- Strip `_`-prefixed transients on save; multi-tab guard via a `storage`-event listener
  ("Another tab is playing — this tab paused"). `[M, impl]`
- Honest save-failure toast when `save()` returns false. `[S, impl]`

### 5.4 Save migration & versioning — 7 → 8
- Bump `SAVE_VERSION` to 2 with a real (even trivial) migration so the ladder machinery runs in
  production and in a test. `[S, impl + ver]`
- Deepen `backfill` (schema-driven or recursive to depth 4) and add the `staff.assignedTo`
  fixup the audit verified missing. `[M, impl]`
- Downgrade guard: `version > SAVE_VERSION` → offer export, refuse to load destructively.
  `[S, impl]`

### 5.5 Performance — 6 → 8
- **Dirty-flag rendering:** render only the active tab + HUD; per-card state signatures skip
  untouched cards; hot numbers update via `textContent` on keyed nodes instead of innerHTML
  rebuild. This systemically fixes the focus-wipe bug, the churn, and text selection. `[L,
  impl]` **(the big technical lift of the plan)**
- `visibilitychange` catch-up: on tab return, treat the hidden span as offline
  (`applyOffline`) — "leave the tab open overnight" finally works. `[S, impl]`

### 5.6 Testing depth — 8 → 8.5
- Playwright UI smoke suite in CI (the browser is pre-installed): boot fresh, buy, tab-switch,
  ascend-with-island-then-build, import garbage save, import type-confused save — every seam
  this audit's defects lived in. `[M, ver]`
- Shared policy module (2.9); cadence + casual assertions (2.4/2.8); organic Legend test
  (1.5). `[ver]`

### 5.7 Dev tooling & workflow — 8 → 8.5
- Pages deploy allow-list: publish only `index.html`, `css/`, `js/` (minus `js/dev/`),
  `assets/`, `.nojekyll` — stop shipping `docs/` (the whole plan + proofs), `.claude/`, and dev
  tools as public site content. `[S, impl]`
- `js/dev/lint.mjs` in the test gate (5.2). `[ver]`
- Run genart to completion and commit the manifest (3.9). `[impl]`

### 5.8 Dependency-free & deployability — 7 → 8.5
- **Self-host everything:** vendor Spectre.css into `css/vendor/spectre.min.css` (one file) and
  the two fonts as woff2 in `assets/fonts/` with `font-display: swap` — kills the unpinned-CDN
  supply-chain door, the offline degradation, and makes the "dependency-free, GitHub-Pages-
  static" identity true. `[S, impl]`
- Update README/PLAN's "one CDN stylesheet" wording to match. `[S, ver]`

### 5.9 Error handling & edge cases — 6 → 8
- **P0** ascend crash fix (1.4). `[impl]`
- Error boundary: wrap `tick()`/`render()` in the rAF loop; on throw, freeze into a themed
  "Rain delay" banner with export-save + reload buttons instead of a silent dead page. `[M,
  impl]`
- `MILESTONE_STEP` derived (4.4) fixes the stale-after-import/reset bug. `[impl]`
- The dirty-flag renderer (5.5) fixes the reserve-input focus wipe; until it lands, extend the
  freeze guard to `input[type=number]`. `[S, impl]`

### 5.10 Security & robustness — 6 → 8
- **P0** Close the import-XSS surface with defense in depth: (a) vocabulary-validate
  enum-like fields at `migrate()` (5.3); (b) introduce an escaping template helper
  (`h\`...\``) and convert the interpolation sites — enforced by the lint rule (5.2). `[M,
  impl + ver]`
- Structural save validation (5.3) turns DoS-by-save-string into a rejected import with a
  polite message. `[impl]`
- Self-hosting (5.8) retires the SRI/CDN issue entirely. `[impl]`

---

# 6. UX / UI & Presentation — 6.3 → target 8.2

### 6.1 Layout & information hierarchy — 7 → 8
- **P0** Fix the sticky stacking: one combined sticky header (HUD row + tab row) or `#topbar`
  z-index above `#tabbar` — the cash readout must never disappear. `[S, impl]`
- Put the core loop on Home at minute 0: host the generator card on Home until the Income tab
  is born at D2 unlock (also fixes onboarding's broken pointer). `[S, impl]`
- Move `L_upgrade` math and multiplier formulas behind a details/tooltip layer; primary rows
  speak postcard, not spreadsheet. `[S, impl]`

### 6.2 Progressive disclosure — 8 → 9
- Ship true Stage 0: with generators on Home (6.1), hide the Income and Growth tabs until
  their real unlock moments — one lone Home at minute 0, as the plan specced. `[S, impl]`
- Gate the Clout HUD chip on the vlogger path seed (or clout ≥ 25) so a "future" currency
  doesn't appear 2 seconds into a fresh game. `[S, impl]`
- Blur unreached path stages in `renderPaths` (show stage names only up to current+1). `[S,
  impl]`
- Wire the remaining engine-fired era modals (3.7). `[impl]`

### 6.3 Visual design & aesthetics — 6 → 8
- Self-host fonts/CSS (5.8); ship the postcard art (3.9). `[impl]`
- Enforce the plan's own 12px floor (`.iv-tag`, `.iv-sub`, `.iv-diary-when` up to 0.75rem+);
  raise disabled-tile opacity to ~0.6 with a lock glyph instead of fading to illegibility.
  `[S, impl]`
- Fix the contrast tokens: Dune secondary text → `#7A6350`, CTA pink on white → `#D9186E` (the
  plan's own fallback), green → darker `#2E7D24`. Re-measure to AA. `[S, impl]`

### 6.4 Feedback & juice — 7 → 8.5
- Arrival choreography for reach-moments: first pool, Sail-Shaped Hotel, Seven Stars, the
  Invitation, tier 12, first resort building get the era-modal/postcard treatment (3.7). `[M,
  impl]`
- The two hero animations, CSS-only and reduced-motion-gated: confetti burst on tier arrivals,
  postcard-flip on new tier scenes. `[M, impl]`
- Cash count-up easing (lerp displayed value toward actual over ~400ms) — numbers roll, not
  jump. `[S, impl]`
- Local purchase feedback on the most common action: buy-button pulse + floating "+prod/s" on
  generator/renovation buys. `[S, impl]`

### 6.5 Onboarding & first-time experience — 5 → 8
- **P0** Fix the first instruction: with generators on Home (6.1) "below" becomes true;
  otherwise auto-open the Income tab with a coach-mark. `[S, impl]`
- Quiet first minute: suppress unlock toasts for 60s, batch into one "The trip has started ✈️"
  after the first purchase. `[S, impl]`
- Replace "Tap (small gain + combo)" with "☔ Odd jobs (+€)" — jargon-free, and finally the
  promised umbrella. `[S, impl]`
- Three contextual coach-marks max (buy → check-in → tabs), each firing once at its moment,
  dismissed forever. `[M, impl]`

### 6.6 Number formatting & readability — 6.5 → 8
- Whole-euro display under 1000 (no "€15.0"); thousands separators in the 1k–10k band. `[S,
  impl]`
- One multiplier convention (`×1.07`) across all cards; formulas live in tooltips only (6.1).
  `[S, impl]`
- Long-form on demand: title/tooltip on every suffixed number ("35.00B = 35,000,000,000").
  `[S, impl]`

### 6.7 Navigation & discoverability — 7 → 8
- Persist `activeTab`/`seenTabs` in the save — reloads return you where you were, and "new"
  pulses stay honest. `[S, impl]`
- Rename the ⚙️ drawer to "Menu" with sections (Save · Options · Speed (dev)); export/import
  become first-class citizens. `[S, impl]`
- Keyboard: `1–5` switch tabs, `Escape` closes modals (with 6.8). `[S, impl]`

### 6.8 Accessibility — 5 → 8
- **Keyboard pass** (the plumbing already exists): roving tabindex + arrow keys on the tablist,
  Escape + overlay-click close on all modals, focus trap + focus restore in `showEra`. `[M,
  impl]`
- Contrast token fixes (6.3) re-measured to AA at shipped sizes. `[impl]`
- Complete reduced-motion coverage (tap popup, toast slide-in — the two verified holes) and
  gate the new confetti/flip behind the same media query. `[S, impl]`
- `aria-labelledby` pairing on tab panels; move title-only flavor text to a tap-reveal detail
  line. `[S, impl]`

### 6.9 Responsive & mobile — 5 → 8
- HUD overlap fix (6.1). `[impl]`
- 44px touch targets at the mobile breakpoint (tabs, check-in, buy buttons, bulk toggles) and a
  no-wrap footer with `env(safe-area-inset-bottom)`. `[M, impl]`
- A second breakpoint (~1000px) for tablets; wider tap targets for coarse pointers via
  `@media (pointer: coarse)`. `[S, impl]`

### 6.10 Settings & QoL — 5 → 8
- A real Options panel: notation (suffix/scientific), motion (full/reduced), toast density,
  colorblind-safe accent option, player-facing pause. `[M, impl]`
- Replace `prompt()`/`confirm()` with the in-game modal system; save export = file download +
  clipboard button; import = file picker + paste field (mobile-workable). `[M, impl]`
- Hard reset guarded properly: auto-export the current save first, typed "GOODBYE" confirmation
  in-modal. `[S, impl]`

---

# The road to production — phased plan

Run phases in order; each has a hard gate. `npm test` green + harness in band at every gate
(per AGENTS.md §2); goldens re-pin **only** at the Phase C gate.

### Phase A — Correctness (the P0 ten) `[~1 week]`
Fix, in this order: ascend keep-list crash · bulk-sell geometric sum · investor-dance snapshot
· import-save validation + escape-everything (XSS) · sticky HUD z-index · onboarding first
instruction · `MILESTONE_STEP` derived · offline docs claim direction · tick/render error
boundary · Legend/NG+ constants flagged for Phase C (the two balance P0s are *fixed* in C,
*specced* here).
**Gate:** each defect has a regression test that failed before the fix; suite green; goldens
untouched.

### Phase B — Measure what you promise `[~1 week]`
Casual + completionist + per-branch harness policies · shared `policy.mjs` · cadence metrics
(purchase-gap median/p90, milestones/hour, distinct beat timestamps) · full-arc magnitude sweep
· organic-Legend simulation · ascension-timing sweep · fix the `n/a` metric · Playwright smoke
suite · `js/dev/lint.mjs` in the test gate.
**Gate:** the new instruments print today's (bad) numbers in CI *before* anything is retuned —
the refit gets a fitted baseline, and regressions become visible forever after.

> **Partially done (2026-07-23):** the `/demo-playthrough` simulator (`npm run demo`,
> scenarios in `js/dev/scenarios.mjs`) now provides the branch, casual-cadence, and
> ascension-loop policies this phase needs — the remaining work is folding their metrics into
> **CI assertions**, not building the runner. It has already produced the fitted baseline the
> Phase-C refit must beat (see the Empirical addendum in `audit-fable.md`):
> - **Branch parity (measured, greedy island):** connoisseur 6h03m · traveler 7h46m · vlogger
>   8h15m · crypto 13h46m — a 2.28× spread. **Phase-C target: all four within ±20%** (crypto
>   is the primary laggard; connoisseur the dominant branch to rein in).
> - **Casual (measured):** focused 15-min-cadence islands 7h15m–11h45m; completionist ~31h38m;
>   genrush 8h53m. **Phase-C target: focused-casual island 18–22h** (today's ~10h is the number
>   to move — don't rely on completionist spending to reach 20h).
> - **Legend (measured):** 0 points after 4 ascensions / 40h. **Post-fix target: first Legend
>   point organically by ascension ≤6**, asserted by the organic-arc simulation, not synthetic
>   state.
> - **Ascension loop (measured):** run lengths 8h15m→8h24m→9h11m→9h28m for Legacy 11→5→4→2.
>   **Post-fix target: run length flat (≤ +10% across generations) with a first payload ~25.**
> - **New hazard surfaced:** meta-only Legacy spend is tier 4 / log10 4.9 at 40h vs income-tree
>   tier 15 / log10 10.3 — treat "obvious meta nodes kneecap the run" as a Phase-E onboarding
>   fix (1.5), not just tree depth.

### Phase C — The coordinated balance refit `[~2–3 weeks, @balance-tuner owns]`
One integrated retune against the Phase B instruments: amenity `xMult` activation (the
keystone) · D2 early entry + D4–D8 alive · mini-milestones · beat re-gating on diverse signals
+ spacing valve · final-approach island mini-arc · first-prestige payload ~25 + frontier
compression + flat run plateau · `LEGEND_SCALE` ~1e2–1e3 · NG+ net-harder + mutators · guest
income through the stack · Clout loop opened · seasonal gate moved · Travel Fund · stray
constants into config · guest-milestone soft-knee.
**Gate:** greedy island 6–12h **and casual island 18–22h**, ≥24 distinct beat timestamps, no
gap >8 min, ≤40% of run in >180s gaps, branch parity ±20%, Legend organically by ascension ≤6,
NG+1–3 in band, peakLog <290 across the full arc. Re-pin all goldens **once**. This gate *is*
the "balanced and fun" bar, expressed as CI assertions.

### Phase D — Feel: UX, performance, juice `[~2 weeks]`
Dirty-flag renderer + visibilitychange catch-up · Stage-0 disclosure + Home-hosted generators ·
arrival era modals + confetti/flip + count-up + buy feedback · onboarding quiet-minute +
coach-marks · Options panel + save UX (no prompt/confirm) · keyboard/a11y pass + contrast/type
floor + touch targets/safe-area · number-formatting cleanup · tab persistence.
**Gate:** Playwright smoke green at 1280/390/320; axe-style contrast checks pass; a keyboard-
only playthrough of minute 0 → first check-in → first modal works.

### Phase E — Content finishing `[~2 weeks]`
Beats 23–30 full treatment + "Letting Go" + patron resolution · missing beat-14 variants ·
vignettes ×15–20 · recurring NPC arc · branch-skinned generators + mid-generator renames +
TRAINING flavor · destinations +6–8 + island map card · achievements 60+ · heirlooms · dedupe
amenities · run genart, ship the postcards.
**Gate:** zero raw-id or flavorless player-facing surfaces; every promised-by-docs narrative
device exists or the doc is amended; art manifest non-empty.

### Phase F — Production hardening & honest docs `[~1 week]`
Self-host CSS/fonts · Pages deploy allow-list · SAVE_VERSION 2 + deep backfill + downgrade
guard + multi-tab guard · docs parity pass (docs/01, docs/04, math-proof TL;DR, config
comments, README/PLAN wording) · `/verify` skill gains the docs-drift check · a small
**playtest round** (the "human playtest" docs/05 §9 has asked for since E07) with 3–5 real
players logging first-hour friction; fold findings into a final polish list.
**Gate:** a fresh clone deploys to Pages serving *only* the game; a 2-year-old save loads; docs
describe the shipped game; playtest notes triaged.

**Total: ~9–10 weeks of focused work**, most of it `impl`-parallelizable except Phase C, which
is deliberately serialized under the balance-tuner.

---

# What "production-worthy, balanced, and fun for many hours" means here

The checklist version of the verdict — the game is ready when every line is true:

**Production-worthy**
- [ ] No known crash, no dead-end state, no data-destroying path without a guarded confirm +
      auto-export (Phases A, D, F).
- [ ] Imported saves are validated, escaped, and versioned; a hostile save string is an error
      message, not a scripting vector (A, F).
- [ ] The site is self-contained (no CDN), deploys only the game, and works offline after
      first load (F).
- [ ] The UI is tested (smoke suite), keyboard-operable, AA-contrast, and usable on a phone —
      including the cash HUD always being visible (B, D).

**Balanced**
- [ ] Every pacing promise is a CI assertion, measured under greedy **and** casual play — the
      20h contract, the cadence band, beat spacing, branch parity, prestige/NG+ bands (B, C).
- [ ] No dead content classes: amenities pay, D4–D8 arrive, Legend is reachable, NG+ hardens
      (C).
- [ ] No degenerate line: investor dance closed, bulk-sell fair, no dominant single strategy
      the harness can find (A, C).

**Fun for many hours**
- [ ] The first minute teaches itself; the first hour delivers a small win every few minutes;
      no stretch of the run is emptier than the one before it (C, D).
- [ ] Reaching things feels like arriving: era choreography on the moments the story builds
      toward, art on the postcards, numbers that roll (D, E).
- [ ] Looping is a choice players *want*: faster-to-frontier re-runs, a transformative first
      prestige, story that doesn't re-tread, an endgame (Legend, NG+ mutators, heirlooms,
      60+ achievements) that exists and escalates (C, E).
- [ ] The people and places of the fiction pay off: the patron appears, the cast recurs, the
      finale is written, "Letting Go" says what is being let go (E).

# Projected scores after execution

| Umbrella theme | Weight | Today | Projected |
|---|---:|---:|---:|
| Concept & Game Design | 20% | 6.4 | **8.2** |
| Balance & Pacing | 20% | 5.0 | **8.0** |
| Theme & Narrative | 15% | 7.7 | **8.6** |
| Mathematical Foundation | 15% | 7.6 | **8.5** |
| Technical | 15% | 7.1 | **8.4** |
| UX / UI & Presentation | 15% | 6.3 | **8.2** |
| **FINAL** | **100%** | **6.6** | **≈ 8.3** |

The projection assumes the phase gates hold — in particular the Phase C gate, which converts
"balanced and fun" from taste into assertions. The audit's core finding was that this project
already knows how to hit a measured target to the second; the whole plan above is, at heart,
one instruction: **point that same discipline at the player's experience, and finish the last
mile the engine already earned.**
