# Coverage ledger — all 3,000 plan tasks accounted for

This is the running audit of every task in the 30 epics (`docs/epics/epic-NN.md`), 100 tasks
each = **3,000 total**. Each phase's build pass classifies all 100 of its epic's tasks into one
of three buckets, so nothing is silently skipped:

- **Present** — the fitted prototype already satisfies the task; confirmed in code (many epics'
  *mechanics* were built up-front, so their later-epic tasks are already live).
- **Done-now** — a genuine gap; implemented in that phase's pass.
- **Superseded / N-A** — deliberately not done as literally written, with a one-line reason
  (e.g. an epic's literal balance constant is overridden by the fitted ~20h economy; a
  mechanism was replaced by a better design; a task is pure cosmetic juice deferred to polish).

Every story below lists its 10-task disposition as `present / done-now / superseded`. The three
always sum to 10. "Superseded" tasks are enumerated by T-number so the reasoning is auditable.

> **Balance guardrail applies throughout:** no phase changes a fitted balance constant without
> the `@balance-tuner`; the harness must keep the greedy ROI island in the **6–12h band** with
> peak `log10(cash)` under ~290 (see `docs/05` §9 and the golden-drift policy — the band
> replaced this note's original 15–20h wording when the ROI harness landed at E07½).

---

## Act I

### E01 — Soggy Departure · **100/100** (present 58, done-now 34, superseded 8)
The prototype shipped well past a literal E01 slice (full ladder, 8 tiers, comfort, ascension).
The E01 *mechanics* are all real; the pass filled the missing juice/QA.

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Shed Ledger (data model) | 8 / 1 / 1 | Done-now: T10 frozen-schema QA test. Superseded T?: dedicated `addCash/spendCash` helper — equivalent guards already exist at every call site. |
| S2 Rain Never Stops (tick) | 9 / 0 / 1 | Superseded: `docs/01 §2` literal `base=15,growth=1.07` worked example — post-retune constants differ; milestone formula golden-tested instead. |
| S3 One Sad Button (UI) | 10 / 0 / 0 | Header, buy button, afford-gate, cash/s, milestone hint — all present. |
| S4 Odd Jobs in the Drizzle | 8 / 2 / 0 | Done-now: T5 milestone flash, T9 hover/tap flavor tooltip. |
| S5 Tap for Warmth | 8 / 2 / 0 | Done-now: T4 tap-popup feedback, T6 per-second tap soft-cap (`TAP.maxPerSec`). |
| S6 A Roof, Technically (accom.) | 9 / 0 / 1 | Superseded: tier-0-only stub — full 21-tier ladder shipped instead. |
| S7 Rain Check (beat 1) | 7 / 1 / 2 | Beat 1 baked into `newGame().seen=[1]`; grants cold-start stipend directly. Superseded: blocking modal (persistent panel + toast instead), separate `grants` field. |
| S8 Counting Guilders (format) | 8 / 2 / 0 | Done-now: `util.fmt` edge-case tests, golden cost/milestone snapshot. |
| S9 Don't Lose the Poncho (save) | 8 / 1 / 1 | Serialize/migrate/offline/autosave present. Superseded T9: corrupt-save backup — no localStorage shim in the Node harness to test; not in DoD. Done-now: offline assertions. |
| S10 Wringing It Out (QA) | 8 / 1 / 1 | Done-now: T4 first-run onboarding banner. Superseded: sound juice — deferred to later polish. |

### E02 — The Bug-Infested Motel · **100/100** (present 61, done-now 31, superseded 8)

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Room Inventory (amenity data) | 9 / 1 / 0 | Amenity schema/state/config present. Done-now: amenity data validation test. |
| S2 Making It Habitable (engine) | 10 / 0 / 0 | `buyAmenity`, ComfortRaw, `L_comfort` all present. |
| S3 The Comfort Meter (UI) | 2 / 8 / 0 | Done-now: Comfort meter widget, live `L_comfort` readout, tooltips, delta preview, group-by-tag confirm, unlock flash, animation, QA. |
| S4 Guests With Six Legs | 6 / 3 / 1 | Beat 2 gate + fumigation present. Done-now: unlock flash, meter reveal, threshold QA. Superseded: departing-roach cosmetic (emoji toast instead of sprite anim). |
| S5 Small Comforts (cluster) | 8 / 0 / 2 | Motel cluster present. Superseded: literal ids (`motel_fumigation`…) — shipped ids (`bug_spray`…) keep saves stable; cadence numbers are the fitted values. |
| S6 Checkout Time (accom.) | 10 / 0 / 0 | Tier-1 ladder + beat 3 + gate all present. |
| S7 The Manager's Clipboard | 3 / 6 / 1 | Done-now: `motel_manager` vignette + `checkVignettes` + flags + toast + persistence + QA. Superseded: portrait art. |
| S8 Balance & tuning | 8 / 0 / 2 | Comfort/`ACC` constants fitted. Superseded: saturating-cap law (replaced by unbounded sum + log-softcap — `docs/math-proof.md`), re-tune (untouched, already fit). |
| S9 While You Were Away (offline) | 6 / 3 / 1 | Offline-v1 via real tick present. Done-now: styled modal, Comfort context, summary. Superseded T4: degree-1 closed-form fast path (stepped tick already accurate & fast). |
| S10 QA / polish / juice | 4 / 4 / 2 | Done-now: Comfort math tests, integration test, div-by-zero guards, format. Superseded: sound/particle juice. |

### E03 — The Roadside Hostel · **100/100** (present 62, done-now 28, superseded 10)

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 The Guest Book (D2/D3 + NPCs) | 6 / 3 / 1 | GEN arrays / slots / multiplier registry / `social` tag present. Done-now: `js/data/npcs.js`, `state.npcsMet`, `state.ui.bulkMode`. Superseded T7: separate `data/upgrades.js` — existing `generators[k].upgrades` + `genUpgradeCost` already implement `L_upgrade`. |
| S2 People Make Money (chaining) | 9 / 1 / 0 | `tick` chains `count[k-1]+=prod[k]·dt`. Done-now: super-linearity test. |
| S3 Bunks and Buttons (UI) | 9 / 1 / 0 | Rows + ×1/×10/max present. Done-now: persisted `state.ui.bulkMode` (was a module var). |
| S4 The People Ladder (bulk) | 8 / 2 / 0 | `util.bulkCost`/`maxAffordable` + D2/D3 flavor present. Done-now: chain-readout legend, bulk-parity confirm. |
| S5 Hostel Comforts (cluster) | 0 / 9 / 1 | Done-now: 6 `tag:'hostel'` amenities (conservative weights), flavor, grouping, unlocks, persistence, QA. Superseded: sound juice. |
| S6 The Hostel Bunk (accom.) | 8 / 2 / 0 | Tier-2 + beat 4 present. Done-now: NPC-roster reveal at tier≥2, content reveal. |
| S7 Fellow Travelers (path seeds) | 5 / 2 / 3 | Roster UI + `social` tags present. Done-now: `checkNpcUnlocks` sets boolean seeds + flags; neutrality test. Superseded T3 (numeric pathPoints trickle — would break neutrality, `paths.*.points` is read live by `L_path`), T8 (branch-badge stub), T5 partial. |
| S8 Balance & tuning | 6 / 0 / 4 | Constants fitted/untouched. Superseded: literal `GEN.base[1]=100/growth=1.09`, re-tune, golden re-fit (accepted in-band drift 17h54m→19h29m — see docs/05 §9), sweep (harness verified). |
| S9 Save / migration / offline | 8 / 2 / 0 | New fields via generic `backfill()`. Done-now: `npcsMet`/`bulkMode` persistence + reload test. |
| S10 QA / polish / juice | 3 / 6 / 1 | Done-now: bulk-math, chaining, NPC, persistence tests + validation. Superseded: cosmetic juice (per-row milestone flash, ripple). |

### E04 — The Backpacker Circuit · **100/100** (present 20, done-now 68, superseded 12)
A real build (destinations, transport, and the `L_dest` global multiplier are net-new). Notable
balance discipline: destination `mult` was set **below** the epic's 1.08–1.20 range (to
1.025–1.04, product ≈1.29) because the harness showed the epic range collapses island time to
~12h; documented as a `@balance-tuner` note. Island **19h29m → 16h42m** — destinations (now
bought by the harness) sped income back toward mid-band, offsetting E03's amenity drift.

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Pack the Rucksack (data) | 2 / 7 / 1 | Done-now: `destinations.js` (8 stops + `TRANSPORT`), `DEST` config, `state.destinations`/`transport`, `validateDestinations()`. Present: `paths.js`, tier-3 row. Superseded: literal costBase/mult numbers (retuned conservative). |
| S2 The Timetable (engine) | 1 / 9 / 0 | Done-now: `destMult`/`L_dest` fold, `buyDestination`, transport `speed`/`upkeep`, `destUnlocked`, one-off traveler nudge. Present: tick determinism (already pure). |
| S3 Departures Board (UI) | 0 / 9 / 1 | Done-now: destinations panel (region-grouped), path meter, `L_dest` header readout, tooltips, afford-gating. Superseded: passport-stamp motion flourish (kept minimal). |
| S4 First Passport Stamp | 4 / 5 / 1 | Present: beat 5, tier-3 onboarding. Done-now: `buyDestination`/`visitDestination`, first-place price, reveal. Superseded: separate passport artifact (folded into panel). |
| S5 Backpacker Kit (amenities) | 0 / 9 / 1 | Done-now: 6 `tag:'backpack'` amenities (conservative), flavor, unlocks, persistence, QA. Superseded: sound juice. |
| S6 Guesthouse (tier 3) | 7 / 3 / 0 | Present: tier-3 ladder + gate. Done-now: reveal wiring, arrival copy, harness beat-time check. |
| S7 Wi-Fi & Ambition (paths) | 4 / 3 / 3 | Present: 4-path data, beat-6 choice, `applyStoryChoice`. Done-now: path meter, traveler head-start (one-off). Superseded: per-tick path trickle (**would runaway** — L_dest compounds all tiers), hybrid-beat stub, branch-badge. |
| S8 Fitting the Curve (balance) | 1 / 6 / 3 | Done-now: `DEST`/mult tuned conservative, harness buys destinations, `validateDestinations`, in-band confirm. Superseded: epic's 1.08–1.20 mult range (collapses to ~12h), re-tune of fitted GEN/COMFORT, some golden churn. |
| S9 Save the Itinerary (offline) | 1 / 9 / 0 | Done-now: persist destinations/transport, generic-`backfill` migration (smoke-tested no-crash), offline applies `L_dest` + upkeep, no free unlocks. |
| S10 Smooth the Trip (QA) | 0 / 8 / 2 | Done-now: `destMult`/`pathMult`/transport-upkeep tests, stack-order regression, edge cases. Superseded: ka-ching sound, reduced-motion animation. |

### E05 — One Star, Big Dreams · **100/100** (present 35, done-now 35, superseded 30)
A gap-fill. The high superseded count is *correct*: the epic's separate "accommodation
renovation" upgrade layer is **superseded by the existing generator-tier `L_upgrade`** — a
parallel income multiplier would double-count and force a retune. Instead the implementer
extracted the existing inline `0.5` into `CONFIG.L_UPGRADE_RATE` + a pure `math.upgradeMult()`
(value unchanged, behavior-identical) and surfaced it in a new windowed **ladder panel**.
Island 16h42m → **17h41m** (1-star amenity cluster; in-band drift).

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Blueprints (data) | 3 / 3 / 4 | Superseded: separate accommodation-upgrade array (would double `L_upgrade`); `ACC.unlock[]` array superseded by the existing continuous `accUnlockComfort` formula. |
| S2 Renovation Crew (engine) | 7 / 2 / 1 | Done-now: `upgradeMult` extraction, `accCostForTier`. Superseded: multi-scope upgrade array (scope is inherently "which tier"). |
| S3 The Front Desk (UI) | 2 / 6 / 2 | Done-now: windowed ladder panel (owned/current/next/locked), live Comfort gate, renovation legend + readouts. Superseded: bespoke per-render unlock animation; forking the whole-tree re-render pattern. |
| S4 Renovations (headline) | 1 / 5 / 4 | Done-now: "Renovate cheapest" button, 1-star celebrate flash. Superseded: discrete named reno rows (don't exist in this model). |
| S5 One-Star Amenities | 4 / 5 / 1 | Done-now: 6 `tag:'onestar'` amenities (conservative), validation, migration. Superseded: `xMult` wiring (schema-only across the whole codebase; wiring touches the forbidden multiplier stack). |
| S6 Check-in, One Star | 5 / 4 / 1 | Present: tier-4 gate. Done-now: beat-7 celebrate, cosmetic swap, harness beat-time check. Superseded: retune of the fitted tier-4 cash cost. |
| S7 Big Dreams, Any Build | 1 / 0 / 9 | Superseded: the whole story premise (path-scoped accommodation-reno bonuses) is the forbidden parallel layer; each synergy is already served by existing systems (`L_path`/`L_skill`, `savvyPassive`/crypto perk, Comfort clusters). |
| S8 Tuning the Ladder | 3 / 3 / 4 | Done-now: harness in-band confirm, amenity cadence, celebrate-flash test. Superseded: tuning of nonexistent reno rows / `ACC.unlock[]`. |
| S9 Guest Records (save) | 5 / 1 / 4 | Done-now: 1-star migration backfill. Superseded/flagged: corrupt-save **backup rotation** (T9) and accommodation **tier-clamp on downgrade** (T10) are real *pre-existing, prototype-wide* gaps — flagged for the E30 release-readiness pass, not silently patched. |
| S10 Polish the Lobby (QA) | 4 / 6 / 0 | Done-now: `upgradeMult`/ladder/gate/beat-7 tests (6 new sections), reduced-motion-guarded glow. |

> **Deferred pre-existing gaps** (surfaced by E05, not E05-specific): corrupt-save backup
> rotation + accommodation tier-clamp on downgrade → scheduled for **E30** (release readiness).

### E06 — Continental Comforts · **100/100** (present 41, done-now 39, superseded 20)
Gap-fill; **`math.js` untouched** (economy unchanged — `L_comfort`, the Comfort readout,
tier-5, beat 8 all pre-existing since E02). Added: 8-item `tag:'breakfast'` cluster, a
branch-flavored **pool tease** flag, a tier-5 celebrate flash, and a one-shot "Comfort now
pays" flash (`COMFORT_ONLINE_MULT` — **display-only**, never in the income math). Island
17h41m → **18h42m** (breakfast cluster; in-band).

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Breakfast Menu (data) | 4 / 5 / 1 | Done-now: 8 `bfast_*` ids, weights, tease hook, validation. Superseded: parallel room cluster (one conservative cluster/stage). |
| S2 Comfort Pays Off (engine) | 6 / 3 / 1 | Present: `comfortMult`/fold/recompute/purity (E02). Done-now: `checkComfortOnline`, tease. Superseded: saturating cap (removed by design). |
| S3 Comfort Dial (UI) | 3 / 1 / 6 | Present: ×readout, tag-grouped section, tooltips. Superseded: per-button ×preview, room section, saturating-bar viz, aria-live ticker (no aria-live region app-wide — pre-existing gap), redundant "Pool?" card, event-sub re-render (whole-app render is the pattern). |
| S4 Comfort Starts Paying | 4 / 5 / 1 | Done-now: signature moment + global-scope proof + tease copy + QA. Superseded: in-app formula "help" (no help system; ×N readout suffices). |
| S5 All-You-Can-Eat (cluster) | 3 / 7 / 0 | Done-now: bloom size/ramp/comfort/xMult/flavor/migration. Present: generic unlock-flash + grouping. |
| S6 Two Whole Stars (tier 5) | 7 / 2 / 1 | Present: tier-5 ladder/gate/flow/persistence. Done-now: pool foreshadow + celebrate. Superseded: retune of fitted tier-5 cash cost. |
| S7 Comfort for Everyone (paths) | 3 / 3 / 4 | Done-now: social-tagged items, branch tease, cross-branch QA. **Superseded T4: `savvyPassive()` is NOT ×`L_comfort` today (additive term outside the stack) — balance-tuner call, left alone.** Superseded: connoisseur premium item, per-buy path trickle (runaway risk), hybrid hook. |
| S8 Calibrating Comfort (balance) | 2 / 4 / 4 | Done-now: golden tests, interaction audit (peak unchanged), snapshot. Superseded: `COMFORT.MULT`/`C0` retune + saturating cap (forbidden/fitted); literal "~1:10" figure (golden-drift accepted). |
| S9 Comfort on the Books (save) | 6 / 2 / 2 | Present: recompute-on-load, offline `L_comfort`, away summary, export/import. Done-now: fixture + no-drift tests. Superseded: version bump (generic backfill), backup rotation (deferred to E30). |
| S10 Final Touches (QA) | 3 / 7 / 0 | Done-now: 7 test sections, reduced-motion-safe flash. Present: `fmt()`, button semantics, cleanup. |

### E07 — Making a Splash (pool showcase) · **100/100** (present 32, done-now 30, superseded 38)
Gap-fill; **`config.js` untouched**. The 7-item pool cluster already existed — E07 adds a
dedicated **Poolside panel** (grouped Floatables / Loungers & Cabana / Cocktail Service) plus
**4 new amenities** (2 floaties + Mixologist/Butler-Served cocktail tiers) at the drift cap.
The high superseded count reflects the orchestrator's **≤4-item budget** to hold the 19.5h line
— seating (S5), path flavor (S8), pacing tooling (S9) deliberately deferred. Island 18h42m →
**19h11m** (+30min from 4 items; under threshold). Fixed a splash-popup re-render lifecycle bug.
Accepted flags: `pool_cocktail_3` comfort (170) > `cabana` (110) — premium-pool flavor, `cabana`
forbidden to touch; all pool items unlock below `accUnlockComfort(6)` — pre-existing quirk.

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Pool Data | 4 / 3 / 3 | Superseded: `zones` registry / id-chain unlock / `zone` field (tag + flat `unlockComfort` suffices). |
| S2 Pool Engine/Comfort | 6 / 1 / 3 | Superseded: saturating cap (removed by design), `xMult`→`L_path` (schema-only), per-buy dirty-flag cache. |
| S3 Poolside Panel | 0 / 8 / 2 | Done-now: the panel + reveal-gating + splash juice + aria-live. Superseded: bespoke reveal animation, DOM snapshot test. |
| S4 Floatables | 4 / 4 / 2 | Done-now: 2 new floaties + integration. Superseded: saturating cap, id-chain gating. |
| S5 Loungers/Beds/Cabanas | 5 / 0 / 5 | Superseded: **≤4 budget spent on the cocktail chain** (orchestrator guardrail) — no new seating; existing items forbidden to retune. |
| S6 Cocktail Service Tiers | 1 / 7 / 2 | Done-now: Mixologist + Butler-Served chain (growth 1.8). Superseded: `xMult`→`L_path` wiring, swim-up-bar tier. |
| S7 3-Star Pool Tier | 5 / 3 / 2 | Present: tier-6 + beat 9. Done-now: Poolside reveal, celebrate. Superseded: "not before tier-up" (panel mounts on poolTease per this phase's spec), stale beat timing. |
| S8 Poolside Persona (path) | 2 / 0 / 8 | Superseded: whole story — ≤4 budget spent; per-buy path trickle is the rejected runaway pattern. |
| S9 Balance/Cadence Tuning | 0 / 2 / 8 | Done-now: harness re-run + in-band confirm. Superseded: automated cadence/purchase-log/golden tooling (no prior epic built it either). |
| S10 Save/Migration/QA | 5 / 2 / 3 | Done-now: migration test, validation. Superseded: version bump (generic backfill), backup rotation (E30). |

### E08 — Sun, Sand & Service · **100/100** (present 25, done-now 35, superseded 40)
Gap-fill; **`config.js`/`math.js` untouched**, first phase on the **stable ROI harness** — added
9 amenities (4 beach → 7-item cluster + 5-item `service` chain), island stayed **8h26m** (proof
the drift is gone). Service chain (self-serve → maître d' → concierge-seed, `costGrowth 1.9`)
foreshadows staff (E19). The high superseded count is the now-familiar pattern: `w_service`
Comfort weight (forbidden — used higher `comfort` data values instead), service `xMult`→income
(dormant — task #20), and tooling tasks no prior epic built.

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Beach/Service Data | 1 / 6 / 3 | Done-now: 4 beach + 5 service ids, weights, staff bridge. Superseded: `w_service` field, `unlock.requires` chain, service `xMult` scope. |
| S2 Service-Quality Engine | 5 / 2 / 3 | Present: generic `buyAmenity`, unbounded Comfort. Done-now: steep `costGrowth 1.9`, unit test. Superseded: `Σ serviceScore`, `w_service` term, `xMult`→× (dormant/forbidden). |
| S3 Beachfront UI | 1 / 6 / 3 | Done-now: Beachfront card, meter, sand/service split, aria-live, subtotal. Superseded: "+global ×" preview (misleading while dormant), slide animation, DOM snapshot test. |
| S4 Service Tiers | 1 / 5 / 4 | Done-now: 5 tiers + copy + `costGrowth 1.9` + staff-hint + QA. Superseded: global × grant, `serviceScore` double-reward, `STORY_GATES`, ×-payback tuning. |
| S5 Sun & Sand Cluster | 1 / 5 / 4 | Done-now: 4 items + capstone + flavor. Superseded: jet-ski novelty × (dormant), chain gating, cadence tooling. |
| S6 4-Star Beach Resort | 6 / 3 / 1 | Present: tier-7 + gate + beat 10 (pre-existing). Done-now: panel mount, tier-7 celebrate, QA. Superseded: harness arrival-timing tuning. |
| S7 Beach Club Persona (path) | 1 / 0 / 9 | Superseded: no persona-scoped × authored (per-buy trickle = rejected runaway); trivially reconvergent. |
| S8 Balance & Tuning | 0 / 2 / 8 | Done-now: harness in-band confirm, inline docs. Superseded: golden/cadence tooling, fit procedure, moot `w_service`/× tuning. |
| S9 Save/Migration/Offline | 6 / 1 / 3 | Present: generic offline/export/guards. Done-now: pre-E08 fixture migration test. Superseded: version bump, stacked-migration idempotency. |
| S10 QA/Polish/Juice | 3 / 5 / 2 | Present: formatting, reduced-motion, beat-10 text. Done-now: promotion juice, finiteness, drift check, regression suite. Superseded: unlock-fuzz, path-scope regression. |

### E09 — Charm Offensive · **100/100** (est. present 57, done-now 18, superseded 25)
Gap-fill; skills system pre-existed. `config.js` untouched; `math.js` additions are pure preview
helpers (`cumXpForLevel`/`charismaMult`/`commsDiscountPct`) — `tierMultiplier`/`commsCostMult`
unchanged. Island **8h26m unchanged**. Notable: fixed a **real XP-bar display bug** (was `xp %
need`, wrong once per-level costs differ) and added the missing **level-up detection + toast**.
(Task tallies below estimated from the implementer's story-level audit; task-level gaps noted.)

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Skills Data Model | 10 / 0 / 0 | `skills.js`/`TRAINING` pre-existed, matches intent. |
| S2 XP→Level Engine | 8 / 2 / 0 | Done-now: level-up detection/emit (S2-T4 was genuinely missing). |
| S3 Skills Panel UI | 3 / 7 / 0 | Done-now: live ×/discount readouts, next-level preview, XP-bar fix, level-up flash+toast, aria-live, maxed badge. |
| S4 Charisma & Communication | 6 / 1 / 3 | Present: formulas, XP sources, copy, persistence. Superseded: story-choice XP grants (T4), exclusive-venue unlock (T5), dialogue-branch unlock (T6) — no story-choice-XP mechanic exists. |
| S5 Training/Charm-School Cluster | 3 / 0 / 7 | Present: `TRAINING` delivers the XP-nudge goal. Superseded: the literal charm-school *amenity* cluster (would add Comfort items → balance-tuner review; deferred). |
| S6 Boutique Retreat | 6 / 3 / 1 | Present: tier-8 + beats 10/11. Done-now: tier-8 celebrate + gate/beat-11 tests. Superseded: "salon" social-venue amenity (T3). |
| S7 Vlogger Lean (path) | 3 / 0 / 7 | Present: compounding/availability/softcap are structurally free. Superseded: vlogger flavor extras (camera-confidence item, persona-beat variant, charm→path trickle = rejected runaway). |
| S8 Balance & Tuning | 6 / 0 / 4 | Present: constants fitted (untouched). Superseded: golden/cadence tooling, fit procedure. |
| S9 Save/Migration/Offline | 8 / 1 / 1 | Present: generic backfill + offline replay (tested: deleting `state.skills` still backfills, no NaN). Superseded: skill gains in away-summary (T6, minor). |
| S10 QA/Polish/Juice | 4 / 4 / 2 | Done-now: level-up juice, cap/boundary/scope tests, fmt, aria-live. Superseded: preview-vs-charged-cost test, story-choice-XP test (mechanic absent). |

### E10 — Body & Soul · **100/100** (present 20, done-now 50, superseded 30)
Gap-fill + one new **optional** mechanic (Energy). `config.js` adds only an `ENERGY` block
(never read by the income path — provably pacing-neutral; island **8h26m unchanged**);
`math.js` additive; Comfort still unbounded. **No `COMFORT.cap`/saturating model** (superseded —
Body already feeds unbounded `ComfortRaw` via `wBody`). The implementer caught its own harness
drift (Body→Charisma / Body→path trickles → 8h21m) and **reverted both**; kept `bodyXp` dormant
(same convention as `xMult`). 12 new tan/gym/wellness amenities.

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Body/Wellness Data | 1 / 6 / 3 | Done-now: `ENERGY` block, tan+gym+spa clusters. Superseded: `BODY.*` block (reuses `SKILL`), `COMFORT.cap`/`bodyCapRate` (forbidden). |
| S2 Comfort Ceiling | 3 / 4 / 3 | Done-now: energy regen/drain/clamp. Superseded: comfortCap tasks, passive amenity→bodyXp (dormant). |
| S3 Wellness Wing Panel | 3 / 5 / 2 | Done-now: panel, energy meter, tooltips, reduced-motion. Superseded: Comfort-cap delta preview (replaced w/ honest unbounded readout), per-event subscription (no such arch). |
| S4 Energy: Clicker Fuel | 0 / 8 / 2 | Done-now: energy-gated `click()`, idle floor, Body XP, overflow guard, anti-clicker test. Superseded: separate `tap()` payload, `emit('tap')` bus (reused `click()`; no pub/sub). |
| S5 Spa Menu cluster | 3 / 5 / 2 | Done-now: 4 `wellness_*` items. Superseded: bodyXp trickle (dormant), precise 60–90s cadence tuning. |
| S6 Wellness Wing step | 1 / 3 / 6 | Scoped to a UI panel (per brief), NOT a purchasable accScore sub-tier (would touch `ACC`/Comfort math — forbidden). |
| S7 Path flavor | 1 / 6 / 3 | Done-now: cosmetic branch flags + copy. Superseded: Body→Charisma XP + Body-training→path trickles (**implemented then reverted** — drifted the harness). |
| S8 Balance & tuning | 1 / 4 / 5 | Done-now: ENERGY-feel constants, anti-clicker verification. Superseded: multiplier-stack tuning (balance-tuner territory). |
| S9 Persistence/Offline | 5 / 3 / 2 | Done-now: energy + new-amenity persist/backfill/export. Superseded: `MIGRATIONS` entry (generic backfill), stacked idempotency. |
| S10 QA/Polish/Juice | 2 / 6 / 2 | Done-now: energy clamp/tap/format/pulse/regression tests (10 sections). Superseded: Comfort-cap monotonicity test (no cap), Body-specific toast (reused generic). |

### E11 — Five-Star Frame of Mind · **100/100** (present 24, done-now 67, superseded 9)
High done-now — the **concierge auto-buyer** is genuinely new. `config.js` adds only a
`CONCIERGE` block; **`GEN.*` untouched** (epic's D4/D5 retune superseded). Concierge is **OFF by
default** (config + state, so the harness is unaffected — island **8h26m unchanged**), bounded
(`budgetFrac 0.25` + reserve floor), ROI-positive (excludes cosmetic amenities), and routes
through existing buy functions. Best part: selftest now carries a **direct harness-island
regression guard** (imports `runCurve`, asserts 30415s). 6-item `suite` cluster; tier 9/10
celebrate flashes.

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Concierge Ledger | 4 / 6 / 0 | Done-now: `CONCIERGE` config, suite items, `state.concierge`, gate. Present: tiers 9/10, D4/D5, beat 13. |
| S2 Bounded Auto-Buyer | 0 / 10 / 0 | Done-now: `conciergeCandidates`/`conciergeTick` (ROI-ranked, routed through existing buys). |
| S3 Concierge Desk UI | 0 / 10 / 0 | Done-now: desk card, toggle/budget/whitelist/reserve, aria-live log, reveal gating. |
| S4 Automation seed | 0 / 9 / 1 | Done-now: forbidden-actions hardcoded, tip sink, greedy ranking, transparency log. Superseded: "clicks saved" stat (no click-analog). |
| S5 Suite Perks | 2 / 8 / 0 | Done-now: 6-item `suite` cluster via generic buy. |
| S6 Two Stars in One Epic | 6 / 4 / 0 | Present: tiers 9/10 + beat 13. Done-now: tier-9/10 celebrate flashes, concierge-unlock wiring. |
| S7 Branch flavor | 2 / 5 / 3 | Done-now: branch-flavored concierge log copy. Superseded: `branchWeights` ROI biasing (keeps ranking provably unbiased / no lock-in). |
| S8 Tuning D4/D5 & concierge | 3 / 2 / 5 | Present: concierge literals per spec, harness re-verified. Superseded: `GEN[3..4]` retune (fitted). |
| S9 Save/migration/offline | 5 / 5 / 0 | Done-now: `state.concierge` backfill, offline determinism, offline spend summary. |
| S10 QA/polish/juice | 2 / 8 / 0 | Done-now: 10 selftest sections incl. ROI ranking, budget/reserve, forbidden-actions, offline determinism, **direct harness-island guard**. |

### E12 — Lights, Camera, Clout (Vlogger path) · **100/100** (present 30, done-now 55, superseded 15)
Gap-fill on pre-existing Clout/combo/perk. `config.js`: extended `CLOUT` (5 fitted keys
byte-identical; added `vloggerPerk 0.25`=old hardcoded value, `vloggerComboBonus`,
`contentPathNudge`) + new `SPONSOR` block. Island **8h26m unchanged**. **Twice reverted its own
invariant violations** (a charisma-XP-from-content trickle vs the island guard; a combo-cash
trickle vs E10's anti-clicker ratio test) — the regression guards did their job.

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Content Calendar (data) | 4 / 5 / 1 | Done-now: `content.js` (5 tiers), `sponsors.js` (3 deals), `gear` cluster, CLOUT keys. Superseded: `STORY_GATES.P1` (no such axis; beat 14 stays comfort-gated). |
| S2 Clout Economy (engine) | 4 / 4 / 2 | Done-now: `cloutRate` extraction, sponsor fold-in, Clout sink (`buyContentBoost`). Superseded: charisma-XP-from-content trickle (**reverted** — breaks island guard), pub/sub. |
| S3 Creator Dashboard (UI) | 0 / 9 / 1 | Done-now: dashboard, Clout+rate readout, combo meter, content/sponsor cards, reveal, aria-live, badge. Superseded: event-subscription render. |
| S4 Combo Meter | 6 / 2 / 2 | Present: `_combo` model, tap/decay/floor/energy coupling. Done-now: cold→warm→viral bar + burst. Superseded: combo-cash trickle (**reverted** — anti-clicker test), constants (fitted). |
| S5 Creator Gear | 3 / 6 / 1 | Done-now: 6 `gear` items (contentRate-wired, never cash), tests. Present: generic buy + reveal. Superseded: cadence tooling. |
| S6 Creator Loft | 0 / 4 / 6 | Done-now: Going-Viral flourish on beat 14. Superseded: literal `creator_loft` accommodation sub-tier (touches `ACC` math — forbidden; deferred to the shared tier-11 hub in E14). |
| S7 Vlogger Perk (path) | 3 / 6 / 1 | Present: ×1.25 perk, `L_path`, neutral baseline. Done-now: combo headroom, one-off path nudge, hybrid flags, sponsor `requires` scaling. Superseded: respec UI (paths never exclusive). |
| S8 Balance & Tuning | 4 / 5 / 1 | Present: `PATH`/combo/perk untouched. Done-now: `SPONSOR`/gear/content numbers (harness-invisible), beat-14 timing, bounded-upside tests. Superseded: separate `contentBase` (uses fitted `contentRate`). |
| S9 Save/Migration/Offline | 5 / 5 / 0 | Present: generic backfill + offline replay. Done-now: combo floor-on-load, offline sponsor-expiry summary, tests. |
| S10 QA/Polish/Juice | 1 / 9 / 0 | Done-now: formula/decay/expiry/floor/perk unit tests, viral burst, extreme-speed edge, no-lock-in regression. |

### E13 — Money Works While You Tan (Crypto path) · **100/100** (est. present 28, done-now 61, superseded 11)
Real new system — the crypto market. `config.js`: new `MARKET` block only (fitted constants,
incl. `SAVVY_YIELD`, untouched). Island **8h26m unchanged** (market is opt-in: `state.market`
defaults to `calm`/no-op, so the harness never engages it — the 30415s guard passes). **Zero
`Math.random`** — a cursor-based Mulberry32 seeded rng in `util.js` (offline==online). 6 coins,
seeded boom/crash events, **Unshakeable** tree node (halves crash depth/rank, bounded by
`maxCrashDamp 0.95`), portfolio + live ticker UI, crypto cabana amenities. *(Per-story tallies
estimated — the implementer's report was lost to the container restart; work verified by me.)*

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Crypto data model | 2 / 7 / 1 | Done-now: `crypto.js` (6 coins + event types), `MARKET` config. Superseded: literal coin numbers pre-Monte-Carlo. |
| S2 Market engine | 3 / 6 / 1 | Done-now: `marketTick`, seeded `util.rng`, `marketMult`, bounded events. Present: Savvy passive already in tick. Superseded: saturating references. |
| S3 Portfolio/Ticker UI | 1 / 8 / 1 | Done-now: portfolio panel, live ticker, boom/crash display, buy/sell. Superseded: event-subscription render. |
| S4 Market events (headline) | 1 / 8 / 1 | Done-now: seeded boom/crash phases (crashFloor 0.10, boomCap 15), bounded. Superseded: unbounded event magnitudes. |
| S5 Crypto Cabana cluster | 2 / 7 / 1 | Done-now: crypto-themed amenities. Superseded: cadence tooling. |
| S6 Tier-11 Crypto Cabana | 6 / 3 / 1 | Present: tier-11 band + gate. Done-now: crypto-flavor + celebrate. Superseded: literal sub-tier (ACC forbidden). |
| S7 Crypto path flavor | 4 / 5 / 1 | Present: `cryptoPerk`, Savvy, `L_path`, no lock-in. Done-now: market/portfolio as the path payoff, buy-path nudge, Whale-Watching flavor. Superseded: respec UI. |
| S8 Balance & Tuning | 3 / 5 / 2 | Present: `SAVVY_YIELD`/perk fitted (untouched). Done-now: `MARKET` Monte-Carlo tuned (`E[mult]≈1.05` on holdings only), harness-invariant. Superseded: golden tooling, base-income event fold. |
| S9 Save/Migration/Offline | 4 / 5 / 1 | Done-now: `state.market` backfill, seeded offline==online replay, offline event summary. Superseded: version bump (generic backfill). |
| S10 QA/Polish/Juice | 2 / 7 / 1 | Done-now: rng determinism, bounded-event, Unshakeable-halves-crash, offline-determinism, harness-invariance tests. Superseded: fuzz tooling. |

---

## Cross-cutting pass — the bank-account wallet cap (offline-lump control)

Not an epic task-audit but a measured **economy correction** landed between E13 and E14,
after playtesting surfaced that away-time income was unbounded: `applyOffline` replays the
full production chain with no spending outlet, so the polynomial tier chain compounded a
20-minute save's 12h absence into **+1.7e8 cash (135× linear accrual)** — enough to
chain-buy **12 of the 20 accommodation tiers** on return, collapsing the entire Act I/II
pacing into one click session. Full derivation, before/after measurements, and ladder
invariants: **`docs/math-proof.md §11`** (P6, applied & verified).

What shipped (mirrors the house patterns exactly):
- `config.BANK` (base/growth/costFrac/tiers) + `data/bank.js` (23 named accounts, Soggy
  Money Belt → Platinum Plus Ultra → the uncapped Numberless Account; `validateBank`
  mirrors `validateDestinations`).
- `engine.gainCash` — the ONE inflow clamp (tick income, taps, visit yields, coin sales);
  banked-only lifetime stats; `stats.overflowLost`; one-shot wallet-full nudge per tier.
- `engine.buyBankUpgrade` + Bank card in the UI (fill meter, next-account button), header
  `cash / cap` readout, offline-summary overflow row.
- `state.bank` (run-scoped; ascension resets it), migration grandfathering (a pre-cap
  save gets the smallest account covering its cash — never frozen, never confiscated).
- selftest **[85]** (ladder invariants, clamp, offline bound, chain-buy regression ≤ 4,
  migration, ascension reset) + harness/`playStep` policies now climb the ladder.
- **Baseline re-pin:** greedy island 8h26m55s → **8h37m00s (31 020 s)** — a deliberate
  economy change (the ladder is a real sink); peak `log10` 11.3 and beat monotonicity
  unchanged; harness-invariance tests updated to the new pin.

## Cross-cutting pass — ascension hard reset + gate scaling (per-ascension pacing)

Follow-up economy correction in the same series (design directive: *every ascension
restarts at 0, only tree abilities cross, phase caps rise with an ascension formula,
every ascension ≥ 8h on an early-fast/late-slow parabola*). Measured baseline: one
ascension collapsed the next run to **11m30s** — the fitted economy paid ~1,183 Legacy
(56/79 tree ranks at once) and Savvy/`checkUnlocks`/Comfort all carried power outside
the tree. Full investigation, feedback-loop measurements, and the fitted table:
**`docs/math-proof.md §12`** (P7, applied & verified; supersedes P3).

What shipped:
- `prestige.ascend` → **hard reset**: keep-list shrunk to `ascension` (tree + count +
  banked accounting), unspent Legacy, settings/meta, and the deflated
  `lifetimeCashThisTree` counter. Story, all run stats (incl. `lifetimeCash`), bank,
  destinations, crypto, concierge — reset. Comfort's `×(1+0.25·count)` bonus removed
  (harness/concierge ROI mirrors updated to match).
- `config.ASCEND_GATE { base 6, exp 2, span 20, countExp 0.5 }` + `math.ascGateMult`:
  accommodation tier `t` costs `×base^(count^0.5·(t/20)²)` — parabolic in tier, √ in
  count, ×1 for the whole first run (golden pins unmoved).
- `LEGACY_SCALE 1e6 → 1e10` + `math.ascCashNorm`: the Legacy metric is credited in
  gate-deflated (run-1-equivalent) cash so gate inflation can't snowball the payout —
  ascension 1 pays ~11 Legacy (2-3 rank-1 abilities), the tree unfolds across dozens
  of ascensions on the designed √N arc.
- Fitted result (probe, greedy-bot lower bounds): runs 1–6 = 8h37m, 9h13m, 10h08m,
  10h37m, 11h18m, 11h30m — every ascension ≥ 8h, early tiers faster than run 1, late
  tiers slower, increments decaying toward a ~11-12h plateau.
- selftest **[86]**: gate/deflator formula properties, complete hard-reset keep-list
  audit, and a full simulated ascended run held in the 8–14h band.

## Cross-cutting pass — committed paths & staged tracks (one road per life)

Third correction in the series (design directive: *exclusive branching paths — commit,
no hopping; ≥X points per stage before progressing; a story continuation + a unique
bonus per stage; re-pick each ascension*). Supersedes the E12-era "no lock-in" doctrine
by explicit design decision. Full reasoning + boundedness argument + measurements:
**`docs/math-proof.md §13`**.

What shipped:
- **Commitment:** the beat-6 crossroads (`applyStoryChoice`, now neutral-only — no
  re-answering) is the ONE ritual per run/life; `buyPathFocus` works only for
  `story.branch`; ALL path-point nudges route through `engine.addPathPoints`, which
  no-ops for non-chosen paths (destination affinities, content buys, coin buys, crash
  survivals). The ascension hard reset hands the choice back — variety across paths
  lives between lineage generations.
- **Staged tracks** (`data/paths.js` `stages` + `validatePaths`): thresholds 5/15/30/50
  points per path; each stage fires once per run with its story-continuation `desc` and
  ONE unique flat bonus from a fixed 14-key vocabulary, aggregated by
  `math.computePathBonuses` into the per-tick `state._pathBonus` cache (the
  `_comfortCache` pattern). Consumption: `L_path` additive terms, cloutRate,
  effectiveComboMax, sponsor duration, crypto yield/crash-damp/sell-frac, destination
  cost, transport speed, amenity cost/Comfort, total Comfort. Bounded by construction —
  flat data constants, ≤4 stages, one path.
- **UI:** the Build Paths card is now a compare view pre-commitment and the chosen
  path's staged track after (reached stages + next-threshold progress + its
  continuation text + name-only teasers).
- Hybrid flavor flags (E10/E12) are now dormant within a run — kept for debug/legacy
  saves and earmarked for lineage-hybrids (E25-A: a vlogger parent + traveler child).
- Tests: **[74]** rewritten to the committed-path contract, **[87]** new (thresholds,
  per-path bonus uniqueness, hard-reset track clearing); nudge tests updated to commit
  first. **Baseline re-pin:** greedy island 8h37m00s → **8h15m05s (29 705 s)** (the
  bot's committed vlogger earns the stage bonuses); ascension band re-fit 8h40m–10h40m
  across five ascensions, all ≥ 8h with the early-fast/late-slow parabola intact.
- **Jack of All Trades** (follow-up directive): the earned exception, as a META-tree
  node — +1 openable side-road per rank (max 3), claimed only by an explicit Focus
  purchase; side-roads earn points, walk their tracks, stack their bonuses; prereqs
  span all three tree branches (~20 Legacy minimum ⇒ ~ascension 3+); hybrids become
  its cosmetic payoff; harness pins unmoved (bots never buy tree nodes). Tests **[88]**.

## Act II

### E14 — Acquired Taste (Connoisseur path) · **100/100** (present 15, done-now 72, superseded 13)
Real new system — the Old-Money Aesthete lane: a bounded exclusivity `×`, appreciating art/wine
collections, a Taste luxury-discount, and a +25% luxury-Comfort branch perk. OPT-IN and gated
off exactly like crypto (`engine.connoisseurActive`: committed connoisseur points OR an owned
collection asset), so the greedy-vlogger harness never engages it and the fitted island time is
**unchanged at 29705s** (peak log10 11.3, 26 beats monotone). `L_exclusivity = 1 + 0.8·log10(1 +
score/7)` folds into `tierMultiplier` as a new global layer — a bounded log (same safe family as
`L_comfort`, never a power of cash, `docs/math-proof.md` §3/§4); the score is a softcapped sum
`raw^0.7` × set/branch/Golden-Ratio factors. Appreciation is game-time, pure, and hard-capped at
`boughtValue·valueCap` (offline replay identical, exactly like the crypto scheduler); its value
is display-only (`collectionNetWorth`) and never feeds `lifetimeCash`/Legacy — the wallet-cap §11
/ Legacy §12 invariants stay banked-cash-only. Adversarial verification (Fable 5) found and fixed
a real **buy-into-aged-stack money pump** (`math.appreciationBlendAge` — new money always enters
at ×1, so an instant re-sell can never harvest a held stack's appreciation) with 5 anti-pump
regressions. selftest **[89]** (~55 assertions: harness invariance, exclusivity monotone+softcap,
discount clamp, appreciation purity+cap, sell round-trip, set-bonus once, branch perk, migration,
offline determinism, lifetimeCash isolation, anti-pump).

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 The Collector's Catalogue (data) | 0 / 9 / 1 | `data/collections.js` (ART[6]+WINE[6]+`validateCollections`), config TASTE/EXCLUSIVITY/APPRECIATION, provenance/flavor, schema doc. Superseded T7: retroactively tagging existing generators/amenities `luxury` — only NEW content is tagged, so the discount/perk can't touch what the harness buys (island-invariance). |
| S2 Taste, Time & Appreciation (core) | 1 / 6 / 3 | Luxury discount, exclusivity accumulator+`×`, appreciation tick, game-time age, connoisseur Comfort perk done-now. Present T10: `L_path(connoisseur)` already feeds via the committed-path stage bonuses. Superseded T1 (separate Taste XP curve — kept the shared SKILL curve so the beat-25 `taste:25` gate/harness don't drift), T7 (net-worth→`lifetimeCash` — display-only instead, §11/§12), T9 (per-tier Taste unlock-gates — tiers stay Comfort-gated). |
| S3 The Gallery & the Cellar (UI) | 0 / 10 / 0 | Gallery+cellar cards, exclusivity meter, appraisal display, buy/sell flow, Taste readout+XP bar, discount strike-through, reveal gate, provenance tooltips, `fmt` formatting — all done-now (mirrors the crypto card). |
| S4 Provenance (appreciating collections) | 0 / 8 / 2 | Appreciation formula, per-asset rates, sell/liquidate, hold-vs-sell tradeoff, set bonus, Provenance beat tie-in, `valueCap` anti-runaway, balance note done-now. Superseded T6 (seeded appraisal event — skipped to keep the lane RNG-free ⇒ trivially offline-deterministic), T9 (value sparkline — the +Z% appraisal line ships; sparkline deferred to polish). |
| S5 Quiet Luxury (amenity cluster) | 2 / 7 / 1 | 6 `tag:'luxury'` amenities + exclusivity weight, Comfort, flavor, cadence, save/migration, QA done-now. Present T2/T7 (reuse `buyAmenity` + the standard amenity buttons). Superseded T4 (targeted `xMult` — dormant schema-only across E02–E07, deferred to the consolidated `xMult` pass). |
| S6 The Grand Luxury Wing (tier 11) | 7 / 1 / 2 | Tier-11 entry/accScore/`L_comfort`/cross-lane-reach/unlock/persistence/QA already present (the ladder shipped whole early). Done-now T5: the Gallery reveal at the wing. Superseded T2 (blocking Taste/exclusivity gate — kept the neutral Comfort gate so all branches reach the island; island-invariant), T3 (luxury discount on the wing's cash cost — accommodation isn't `luxury`-tagged). |
| S7 Provenance (branch flavor) | 1 / 7 / 2 | +25% luxury Comfort perk, exclusivity `×` branch perk, beat-14 Provenance variant, choice→flag+gift, beat-25 setup, Golden Ratio node+synergy, neutral-fallback QA done-now. Present T4 (beat gate — fires on the shared beat-14 gate, Whale-Watching-style). Superseded T7 (connoisseur×traveler hybrid line — near-unreachable under committed paths), T9 (monocle badge — cosmetic, deferred). |
| S8 The Price of Taste (balance) | 1 / 9 / 0 | Fitted EXCL_RATE/E0 (×1.89 mid-Act-II, ×2.31 maxed — in the 1.5–3× band, non-dominant), discount clamp 0.4 floor, appreciation rate, Comfort-perk cap check, set-bonus value, harness beat time, slowness feel, golden regression ([89]), cross-lane parity done-now. Present T6 (`PATH.softcapExp` 0.85 already tames connoisseur points). |
| S9 Aging in the Cellar (save/offline) | 2 / 7 / 1 | Schema (`collections` flat-by-id + `_exclCache`), offline appreciation/exclusivity, cap fairness, away summary, export/import, migration test done-now. Present T2/T9 (generic `backfill()` migrates the new keys; the rotating backup carries them). Superseded T6 (appraisal-event determinism — no appraisal event exists). |
| S10 White Gloves (QA/polish) | 1 / 8 / 1 | Taste clamp, exclusivity monotonic, appreciation purity, sell round-trip, set-bonus, cap-edge tests + debug hooks (grant Taste, gift asset) + formatting done-now. Present T9 (`window.IV.state` exposes collections). Superseded T7 (gallery shimmer/count-up juice — deferred to polish). |

### E15 — Keys to the Coupe (Private Logistics I) · **100/100** (present 14, done-now 75, superseded 11)
Real new system — the garage: ownable/equippable cars, transport slots, a bounded logistics `×`
on income, an upkeep drain, and repossession. OPT-IN and gated off exactly like crypto/connoisseur
(`math.logisticsActive`: any car EQUIPPED). The greedy-vlogger harness never buys or equips a car,
so `logisticsMult` 1, `fleetUpkeep` 0, fleet Comfort 0, and the traveler −15% discount (branch-
gated) never apply — the fitted island is **unchanged at 29705s** (peak log10 11.3, 26 beats).
`L_logistics = 1 + rate·Σ(equipped logisticsMult)` folds into `tierMultiplier` as a new BOUNDED
flat global layer (the fleet is capped by `availableSlots`, a small integer — same safe class as
`L_dest`, never a power of cash). Note: the lane has **no cash-out surface** (there is no
`sellCar` — cars only cost cash and drain upkeep; the × amplifies existing bounded income), so the
E14-class buy→sell pump structurally cannot exist. Balance-tuner subagent stalled mid-core; the
orchestrator finished the buy/equip/reveal/first-car functions + wiring + the `[90]` tests + the
fit. selftest **[90]** (~55 assertions: harness invariance, gate exactness, slots, capacity
rejection, logistics purity, stack-order, upkeep floor, repossession costliest-first+ownership-
kept, unequip, discount stacking+floor+branch-gating, fleet Comfort, first-car bonus + neutral
beat-15 fallback, reveal, migration+over-capacity clamp, offline determinism).

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 The Showroom Brochure (data) | 0 / 9 / 1 | `data/vehicles.js` (CARS[6]+`validateVehicles`), `config.LOGISTICS`, car-accessory cluster, `travelTime`, schema doc, public-transport slotCost:0 fallback documented. Superseded T6 (`scope:'destination'` tag — the × is a bounded GLOBAL layer like L_dest, not a per-tier scoped tag). |
| S2 Slots, Speed & Upkeep (core) | 1 / 9 / 0 | buyCar, slot allocation, logisticsMult, upkeep drain, fleetSpeed→destCost, availableSlots, traveler −15% discount, repossession guard, determinism done-now. Present T8 (`L_path(traveler)` already feeds via the existing tierMultiplier traveler term + committed-path stages). |
| S3 The Garage (UI) | 0 / 9 / 1 | Garage panel, slot pips, upkeep readout (red), logistics × display, buy/equip/unequip flow, reveal gate, repossession warning (amber), formatting done-now. Superseded T7 (exact per-destination "40s→22s" before/after — per-car cycling % ships instead). |
| S4 Keys to the Coupe (garage & slots) | 0 / 8 / 2 | Slot system, car-vs-transport speed, faster cycling, logistics × on income, the upkeep tradeoff (verified: 3 sedans ≈ supercar × at 1/5 the upkeep — no auto-buy, S8-T3), many-small-vs-one-big, owned/equipped display, harness balance hooks done-now. Superseded T7 (beat 15 fires on first car — kept its accTier:10 gate for the 26-beat pin; first-car fires the `checkFirstCar` reward instead), T8 (purchasable garage-expansion sink — `garageSlots` plumbing ships via the wing; the buyable expansion deferred). |
| S5 Fully Loaded (amenity cluster) | 2 / 6 / 2 | 6 `tag:'destination'` car accessories + Comfort + flavor + cadence + save/migration + QA done-now. Present T2/T7 (reuse `buyAmenity` + the standard amenity buttons). Superseded T4 (`xMult` dormant — the E02–E07 convention), T5 (`dashcam_vlog_mount` carries a `contentRate` data field, but wiring it into Clout is deferred — it's a `tag:'destination'`, not `'gear'`). |
| S6 A Garage of One's Own (tier 11) | 6 / 3 / 1 | Tier-11 band / Comfort gate / accScore / cross-lane reach / unlock / persistence already present (the ladder shipped whole). Done-now: `garageSlots`→`availableSlots` synergy, the garage reveal, and the no-double-count QA ([90] fleet-Comfort test). Superseded: a standalone purchasable garage-wing feature (folded into the neutral tier-11 + the `garageSlots` field). |
| S7 The Grand Tourist's Coupe (branch flavor) | 1 / 7 / 2 | +1 slot, −15% destinations, beat-15 traveler variant, first-car flag+points+starter accessory, traveler×crypto hybrid line, path-points source (car buys + destinations), neutral-fallback QA done-now. Present T7 (Wanderer's Instinct −20%/+slot already wired into destDiscountMult/availableSlots). Superseded T4 (beat gate on owning a car — stays accTier:10), T9 (steering-wheel badge — cosmetic, deferred). |
| S8 Upkeep vs Upside (balance) | 1 / 9 / 0 | Fitted LOGISTICS.rate (mid-fleet ~1.3–2×), upkeep sizing, no-brainer check, slot economy, travel-time tuning, discount floor, harness beat time (island 29705), repossession grace, golden regression ([90]) done-now. Present T10 (`PATH.softcapExp` 0.85 already tames traveler point scaling). |
| S9 Meter's Running (save/offline) | 2 / 7 / 1 | Schema (`vehicles` + `_logiCache`), offline upkeep + logistics × (via tick-replay), cap fairness, grace-on-return (deterministic repossession), export/import, migration test + over-capacity clamp done-now. Present T2/T9 (generic `backfill()` migrates the slice; rotating backup carries it). Superseded T7 (a dedicated logistics line in the away modal — deferred). |
| S10 Kicking the Tires (QA/polish) | 1 / 8 / 1 | Slot-capacity, upkeep-floor, logistics-purity, repossession, discount-floor tests + unequip-frees-slots (no sellCar; unequip covers the "remove equipped car" edge) + debug hooks (grant car / +slot / force repossess) + formatting done-now. Present T9 (`window.IV.state.vehicles` snapshot). Superseded T7 (engine-rev toast / key-jingle juice — deferred to polish). |

### E16 — Sea Legs (Private Logistics II) · **100/100** (present 17, done-now 70, superseded 13)
Extends the E15 garage from land to water: boats (dinghy→superyacht) fold their `mult` into the
SAME `L_logistics` × and fleet-upkeep drain the cars use (a boat is OWNED, not equipped — owning
grants mult + slotBonus + upkeep); a pre-staff crew seed adds a tiny × + upkeep capped by the
fleet's `crewCap`; sea-only destinations gate on `boatTier`; an 8-item `tag:'yacht'` deck-toy
cluster (incl. the floating pool) and beat-16 boat variants round it out. OPT-IN and gated exactly
like E15 — the greedy-vlogger harness buys no boats/crew (boatTier 0 ⇒ sea destinations never
unlock), so the fitted island is **unchanged at 29705s** (peak log10 11.3, 26 beats). Built inline
(no sub-agents). selftest **[91]** (37 assertions: harness invariance, gate, boat mult/slots/
upkeep, sea gating, crew cap, first-boat bonus, marina reveal, connoisseur yacht perk, migration,
offline determinism).

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 Charting the Marina (data) | 0 / 9 / 1 | `data/logistics.js` (BOATS[5]+CREW[3]+validateLogistics), cost ramp, 3 sea destinations, crew roster, flavor, unlock gates, index register, data guard done-now. Superseded T4 (`scope:'all'` tag — the boat × is a bounded GLOBAL layer like L_dest, not a per-row scoped tag). |
| S2 How Boats Pay (core) | 1 / 8 / 1 | logisticsMult fold, +slot, boat upkeep, sea gate on boatTier, crew contribution, events, pure math, engine tests done-now. Present T8 (reuses E15's applyFleetUpkeep clamp path). Superseded T7 (beat 16 gate on ownBoat — kept comfort:5e6 for the 26-beat pin; `checkFirstBoat` is the reward instead). |
| S3 The Marina Tab (UI) | 1 / 8 / 1 | Marina panel, boat/crew buttons, upkeep line, buy intents, affordability, aria-live done-now. Present T5 (sea destinations surface in the existing destinations list). Superseded T10 (DOM-snapshot contract test — deferred, ui is DOM-only). |
| S4 A Yacht, Obviously (headline) | 1 / 8 / 1 | Yacht rung (headline mult/crewCap jump), floating-pool amenity, deck-toy escalation (via unlockComfort), Comfort payoff, showpiece copy, first-boat/marina ceremony, cost, visual fleet, QA done-now. Present T3 (staggered unlockComfort serves as the chain). Superseded T4 (crew-operation gating of the top amenities — deferred; crew stays a × + upkeep placeholder). |
| S5 Deck Toys (cluster) | 2 / 6 / 2 | 8 `tag:'yacht'` amenities, prestige slope 1.8, comfort, cadence, flavor, save/QA done-now. Present T7/T8 (reuse `buyAmenity` + standard buttons). Superseded T3 (`xMult` dormant — E02–E07 convention), + cadence tooling. |
| S6 The Marina Suite (tier 11) | 5 / 3 / 2 | Tier-11 band / accScore / Comfort gate / migration-default already present. Done-now: the marina reveal (`marinaUnlocked`/`checkMarinaReveal`), reveal copy, QA. Superseded T6 (gate top toys on the suite), T9 ("Tier 11 · Marina Suite" label swap — the marina is its own panel). |
| S7 Coastal branch flavor | 3 / 6 / 1 | Traveler sea-dest discount (via destDiscountMult), connoisseur yacht Comfort perk (luxuryAmenityComfort covers `yacht`), path-point sources (buyBoat nudges both lanes), hybrid beat variants, neutral floor, branch flavor copy done-now. Present T3/T7 (traveler +1 slot + PATH softcap already wired). Superseded T10 (live re-spec recompute — deferred). |
| S8 Sea Trials (balance) | 1 / 9 / 0 | Boat/crew constants, sea-dest ×, harness (island 29705), upkeep tension, time-to-next, slot value, stack cross-check ([91]), golden ([91]), documented knobs (config comment) done-now. Present (PATH softcap already tames coastal points). |
| S9 Man-Overboard-Proofing (save/offline) | 2 / 6 / 2 | Schema, migration (backfill + boatSlots recompute), offline sea income + upkeep (via tick-replay), export/import, migration test done-now. Present (OFFLINE_CAP + rotating backup already cover boats/crew). Superseded T3 (crewed-amenity flags), T6 (a dedicated marina line in the away modal — deferred). |
| S10 Shipshape (QA/polish) | 1 / 7 / 2 | Formatting, upkeep-floor, crew-over-cap, unlock-order (sea gate), event-dedupe (first-boat/marina once), copy, regression ([91]) done-now. Present (`window.IV.state` snapshot). Superseded T6 (wake-ripple juice), T10 (manual playtest — deferred). |

## Act II–VI — E17–E30

_Pending — appended as each phase's build pass audits its 100 tasks. Each row will carry the
same `present / done-now / superseded` disposition and a per-phase tally in the commit + report._

| Epic | Status |
|---|---|
| E17 Wheels Up | pending |
| E18 The Sail-Shaped Hotel | pending |
| E19 At Your Service | pending |
| E20 The Whole Household | pending |
| E21 Seven Stars | pending |
| E22 A Bungalow of One's Own | pending |
| E23 Villa Vita | pending |
| E24 Where the Rich Hide | pending |
| E25 Letting Go | pending — mechanics largely shipped early (prestige.js + hard reset + gate scaling, math-proof §12); **amendment E25-A (retirement & lineage)** added to the epic file, unbuilt |
| E26 Who You Become | pending |
| E27 The Island Listing | pending |
| E28 Building Paradise | pending |
| E29 Empire of Leisure | pending |
| E30 Legends of Leisure | pending |

---

### Running total
- **Audited:** 1,600 / 3,000 tasks (E01–E16) — present 539, done-now 768, superseded 293.
- **Remaining:** 1,400 tasks (E17–E30).

### Deferred balance-tuner backlog (for a consolidated retune, latest at E30)
- **`savvyPassive()` not ×`L_comfort`** (E06-S7-T4) — a flat sqrt-scaled additive term outside
  the multiplier stack; whether Comfort should boost it is a design call.
- **`genUpgradeCost` `50`/`8` constants** (E05) — pre-existing renovation cost curve, never revisited.
- **Amenity `xMult`/`xScope` fields are schema-only** — declared on every cluster but never read
  by `math.js`; wiring them in is a multiplier-stack change (deferred).
- **~~Drift watch~~ → RESOLVED (post-E07): harness is now ROI-aware.** The old harness bought
  *every* amenity (completionist), so cosmetic amenities inflated the "optimal" island and it
  crept 17h54m→19h11m. The balance-tuner switched it to ROI-aware buying: true speed-optimal
  island is **8h27m**, and it's now **insensitive to amenity count** (5 throwaway cosmetics moved
  it 15s / 0.05% vs 43m on the old policy). New guard (`docs/05` §9): island **~6–12h**, 26 beats
  monotone, peak `log10` ≪ 290. Escalate `@balance-tuner` only for a *genuine economy* change
  (new generator tiers, destination `L_dest`, comfort/cost curves) — **not** for amenities.
- **⭐ HIGH-PRIORITY finding — amenity `xMult`/`xScope` are DORMANT** (never read by `math.js`/
  `engine.js`). Amenities' only income effect is their `comfort` weight (log-softcapped, and
  dominated by `accScore`), so "small wins" are currently a mild *net drag* on a speed-run. The
  epics repeatedly spec `xMult` (E02–E07 all mark it "superseded: schema-only"). **Planned:** a
  dedicated balance pass to **wire `xMult` in so small wins are genuinely rewarding** (target
  roughly ROI-neutral — indulge in floaties without falling behind — never mandatory min-max,
  never runaway, casual arc stays ~20h). This converts many currently-"superseded" `xMult`
  tasks across E02–E07 into "done."
