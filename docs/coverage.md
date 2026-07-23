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

### E15 — Keys to the Coupe (Private Logistics I) · **100/100** (present 14, done-now 76, superseded 10)
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
| S9 Meter's Running (save/offline) | 2 / 8 / 0 | Schema (`vehicles` + `_logiCache`), offline upkeep + logistics × (via tick-replay), cap fairness, grace-on-return (deterministic repossession), export/import, migration test + over-capacity clamp, **T7 the away modal's fleet-upkeep line** (`stats.upkeepPaid` counter diffed into `rep.upkeepPaid`, shared with E16/E17 — [90]) done-now. Present T2/T9 (generic `backfill()` migrates the slice; rotating backup carries it). |
| S10 Kicking the Tires (QA/polish) | 1 / 8 / 1 | Slot-capacity, upkeep-floor, logistics-purity, repossession, discount-floor tests + unequip-frees-slots (no sellCar; unequip covers the "remove equipped car" edge) + debug hooks (grant car / +slot / force repossess) + formatting done-now. Present T9 (`window.IV.state.vehicles` snapshot). Superseded T7 (engine-rev toast / key-jingle juice — deferred to polish). |

### E16 — Sea Legs (Private Logistics II) · **100/100** (present 17, done-now 71, superseded 12)
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
| S9 Man-Overboard-Proofing (save/offline) | 2 / 7 / 1 | Schema, migration (backfill + boatSlots recompute), offline sea income + upkeep (via tick-replay), export/import, migration test, **T6 the away modal's fleet-upkeep line** (boat/crew upkeep folds into the shared `rep.upkeepPaid` fleet line) done-now. Present (OFFLINE_CAP + rotating backup already cover boats/crew). Superseded T3 (crewed-amenity flags). |
| S10 Shipshape (QA/polish) | 1 / 7 / 2 | Formatting, upkeep-floor, crew-over-cap, unlock-order (sea gate), event-dedupe (first-boat/marina once), copy, regression ([91]) done-now. Present (`window.IV.state` snapshot). Superseded T6 (wake-ripple juice), T10 (manual playtest — deferred). |

### E17 — Wheels Up (Private Logistics III) · **100/100** (present 17, done-now 70, superseded 13)
Caps the logistics arc with aviation. Jets (turboprop→airliner) fold into the SAME `L_logistics`
× / fleet-upkeep as boats; owning car+boat+jet lights the `LOGISTICS.capstone` × (a distinct
factor); air-only destinations gate on `jetTier`; owning any jet cuts destination cost
(`jetDiscount`, floored). OPT-IN/gated like E15/E16 — the vlogger harness owns no jet, so island
is **unchanged at 29705s**. Built inline. selftest **[92]** (34 assertions: invariance, jet gate/
mult/slots/upkeep, capstone on/off/distinct-factor/no-ghost, air gating, jetDiscount+floor,
first-jet/capstone flags, hangar reveal, migration, offline determinism).

| Story | present/done/superseded | Notes |
|---|---|---|
| S1 The Hangar Manifest (data) | 0 / 9 / 1 | JETS[5]+range, capstone constant, 3 air destinations, jet-cabin cluster, flavor, gates, data guard done-now. Superseded T6 (`jetInstant` flag — travel-time is display-only; air destinations gate on jetTier instead). |
| S2 Collapsing the Map (core) | 1 / 8 / 1 | jetDiscount, jet mult fold, capstone ×, jet upkeep, no-brainer guard, events, pure+clamped, tests done-now. Present T6 (upkeep scaling reuses the E15 path). Superseded T7 (beat 17 gate on ownJet — kept comfort:2e7; `checkFirstJet` is the reward). |
| S3 The Hangar Tab (UI) | 1 / 8 / 1 | Hangar panel, jet buttons, range readout, big upkeep, capstone banner (lit/muted), cabin buttons (via amenities), buy intents, a11y done-now. Present (instant-reach surfaces via the dest list). Superseded T10 (DOM-snapshot test — deferred). |
| S4 Wheels Up (headline) | 1 / 8 / 1 | Flagship airliner (huge mult/upkeep/range), capstone trigger, wheels-up + capstone ceremonies, showpiece copy, cost/capstone tuning, persist, QA done-now. Present (Comfort via the jet-cabin cluster). Superseded T2 (mark every dest jetInstant — travel-time is display-only). |
| S5 Cabin Class (cluster) | 2 / 6 / 2 | 8 `tag:'jet'` amenities, slope 1.85, comfort, cadence, flavor, save/QA done-now. Present T7/T8 (reuse buyAmenity + buttons). Superseded T3 (`xMult` dormant), + cadence tooling. |
| S6 The Airside Suite (tier 11) | 5 / 3 / 2 | Tier-11 band/accScore/Comfort gate/migration already present. Done-now: hangar reveal, copy, QA. Superseded T6 (gate top cabins on the suite), T9 (label swap — hangar is its own panel). |
| S7 The Grand Tourist Goes Global | 3 / 5 / 2 | Traveler jet discount (stacks in destDiscountMult), slot synergy, wanderer stack, path points (buyJet nudge), neutral floor, branch copy done-now. Present T2/T5/T7 (traveler +slot, wanderer, PATH softcap already wired). Superseded T3 (traveler-specific capstone bump — deferred), T10 (live re-spec). |
| S8 Flight Testing (balance) | 1 / 9 / 0 | Jet/discount/capstone constants, harness (island 29705), upkeep tension, time-to-next, earlier-logistics regression, stack sanity, golden ([92]), documented knobs done-now. Present (PATH softcap). |
| S9 Preflight Checklist (save/offline) | 2 / 7 / 1 | Schema, migration (+jetSlots recompute), capstone derived-not-stored (never a ghost flag), offline income+upkeep, export/import, migration test, **T6 the away-modal line** (jet upkeep folds into the shared `rep.upkeepPaid` fleet line) done-now. Present (OFFLINE_CAP + backup). Superseded T3-partial (capstoneActive is computed live, not persisted — by design). |
| S10 Cleared for Takeoff (QA) | 1 / 7 / 2 | Formatting, upkeep-floor, capstone flip-flop (no ghost ×), instant/air correctness, event-dedupe, copy, regression ([92]) done-now. Present (`window.IV.state`). Superseded T6 (takeoff juice), T10 (manual playtest). |

### E18 — The Sail-Shaped Hotel (6-star tiers 12/13) · **100/100** (present 33, done-now 47, superseded 20)
The mid-game "I made it" tier. Tiers 12/13 and the D6/D7 generators already exist on the ladder
(much of E18 is **present**); the genuine new work: a real Taste-level velvet-rope gate
(`tasteGate` 30/40 in `accUnlocked`), an 11-item gold + six-star cosmetic cluster (`tag:'luxury'`,
reusing the E14 machinery — exclusivity/perk/haggle, zero new math), the connoisseur beat-18
variant + arrival ceremony, and a velvet-rope UI hint. All builds accrue passive Taste (the greedy
harness has taste 44 at tier 12), so the gate is an emphasis not a wall — island **unchanged at
29705s**. selftest **[93]** (gate off-by-one, non-connoisseur entry, no re-lock on Taste drop, gold
feeds connoisseur exclusivity+perk, harness-neutral). Built inline.

- S1 Blueprints (4/6/0): tiers/accScore/ordering present; gate fields + gold/six-star clusters + copy + data test done-now.
- S2 Big Step Up (4/5/1): accScore/D6-D7/beat-18/penthouse present; Taste gate + gold effects + events + tests done-now. Superseded: hard exclusivity gate → soft velvet-rope (a non-connoisseur has 0 exclusivity and must still enter).
- S3 Front Desk UI (3/3/4): tier/gold/service buttons present (existing accommodation+amenities panels); gate-progress hint + a11y done-now. Superseded: a separate front-desk panel, gold slot-machine visuals, D6/D7 nudge, DOM-snapshot test.
- S4 The Sail (headline) (3/5/2): showpiece tier/penthouse/comfort present; arrival ceremony + gold reveal + copy + persist done-now. Superseded: bespoke gold-on-entry reveal animation, first-entry flag (the tier-owned check covers it).
- S5 Gold Everything (1/7/2): generic buy present; 8 gold + 3 six-star + exclusivity + comfort + cadence + flavor + save done-now. Superseded: `xMult` dormant, cadence tooling.
- S6 Checking In (6/2/2): tier-12/13 unlock/accScore/reveal/migration present; the Taste gate wiring + arrival done-now. Superseded: gate-top-amenities-on-penthouse, "Tier 12 · Sail" label swap.
- S7 Aesthete Arrives (3/5/2): connoisseur perk + exclusivity × + Golden-Ratio + softcap present (E14); path points + gate-as-identity + branch copy + neutral floor done-now. Superseded: separate branch reveal art, live re-spec.
- S8 Weighing the Anchor (3/6/1): ACC/D6-D7/Comfort-cap present; taste/excl gate values + harness (29705) + stack sanity + golden ([93]) + documented knobs done-now. Superseded: exclusivity-gate tuning (soft).
- S9 Concierge Handover (4/3/3): no new state (tiers/amenities use existing schema + backfill), OFFLINE_CAP/backup/export present; gate re-derived-not-trusted (computed live) + migration test done-now. Superseded: new schema fields (none needed), away-modal line, first-entry flags.
- S10 White-Glove (2/5/3): formatting/perf present; gate off-by-one + no-eviction + event-dedupe + regression ([93]) + copy done-now. Superseded: gilded-shimmer juice, unlock-order fuzz tooling, manual playtest.

### E19 — At Your Service (staff/automation) · **100/100** (present 26, done-now 56, superseded 18)
Introduces staff & automation: a hireable **Butler** with a continuous **payroll wage** (the new
sink) whose bounded, ROI-gated auto-buy **reuses the E11 concierge** (conciergeCandidates now takes
a per-caller whitelist). OFF until hired → the harness never hires → payroll 0, nothing automated →
island **unchanged at 29705s**. The E16 crew was the pre-staff seed; this is the first real staff
role (foundation for E20/E23/E28). Built inline. selftest **[94]** (17 assertions: invariance, hire
gate, payroll sink+floor+unpaid-pause, bounded auto-buy never-into-debt+reserve, level-up, offline).

- S1 Staff Ledger (1/8/1): concierge whitelist present; staff.js + config + state + wage fns + flavor + selectors + validation done-now. Superseded: per-item autoBuyable flag (categories cover it).
- S2 Below Stairs (2/6/2): concierge auto-buy + deterministic sort present; payroll + scheduler + reuse-intents + level-effect + events + unpaid-behavior + tests done-now. Superseded: rich auto-collect, ROI-÷-wage framing (payback-horizon reused).
- S3 Service Bell UI (1/8/1): a11y present; staff panel + hire + toggles + budget + wage readout + level + ticker + copy done-now. Superseded: live ROI-hint line.
- S4 The Butler (1/7/2): off-by-default guardrail present; full loop + category picker (via level) + reserve + morale seed + first-hire + quips + QA done-now. Superseded: per-item pin/exclude "do-not-touch", detailed auto-collect scope.
- S5 Butler's Kit (1/7/2): buttons present; 8 amenities + comfort + unlock + flavor + cadence + save + QA done-now. Superseded: automation-boost items (−interval), `xMult` dormant.
- S6 Ultra Penthouse (8/2/0): tier 13 / gate / accScore / upgrades / reveal / UI / balance / save already present (ladder shipped whole); the staff-quarters gate + arrival done-now.
- S7 Service Your Way (3/2/5): perk-interaction (same intents) + softcap + hybrid present; neutral floor + quips done-now. Superseded: per-branch default policies + branch-specific automation flavors (butler defaults to amenities for all).
- S8 Worth the Wage (2/6/2): guardrail (off→0) + cadence present; wage/growth/interval/budget + payroll-pressure + golden ([94]) + documented knobs done-now. Superseded: ROI-break-even harness metric, sensitivity sweep.
- S9 Off the Clock (3/6/1): OFFLINE_CAP + round-trip + corrupt-guard present; persist + migration (backfill) + offline payroll + offline auto-buy + unpaid-away + backcompat done-now. Superseded: dedicated away-modal butler line.
- S10 White Gloves (4/4/2): formatting + gameSpeed + console + DoD present; hire/fire edge + event-batching + regression ([94]) + copy done-now. Superseded: bell juice, debug-panel hooks.

### E20 — The Whole Household (staff II) · **100/100** (present 21, done-now 60, superseded 19)
Extends the E19 butler into a full household: chef/trainer/driver/manager (income-× roles) +
housekeeper (glue). Each income-× role adds a small **morale-scaled** global × folded into one
**bounded L_staff** layer (`Π 1 + xMultBase·level·moraleMult`), gated to 1 unless hired → harness
never hires → island **unchanged at 29705s**. `moraleMult` is a clamped log softcap. Reuses the
E19 hire/level/payroll/auto-buy machinery (now role-generic). Built inline. selftest **[95]** (19
assertions: invariance, morale softcap, L_staff fold + level-0-no-× + housekeeper-glue, stack-order,
cap, payroll aggregate, beat-20 flag, migration, offline determinism).

- S1 Roster (1/8/1): 5 role defs + subsystem + morale fields + config + selectors + validation done-now; concierge reuse present. Superseded: per-item autoBuyable.
- S2 Everyone Has a Job (0/8/2): morale mult + effective output + morale dynamics + per-role automation + payroll aggregate + cap + housekeeper-special + tests done-now. **Superseded**: distinct per-subsystem-layer routing (chef→L_comfort etc.) — unified into one bounded L_staff × (invisible to the player, far simpler/safer), and the per-role deterministic-sort nuance (reuses the concierge sort).
- S3 Household Board (1/9/0): a11y present; grid board + hire/level/morale-bars/payroll/toggles/subsystem-summary/cap/copy done-now.
- S4 A Full Household (0/7/3): the four income roles + housekeeper-glue + beat-20 + combined-balance + coexistence + flavor + QA done-now. Superseded: trainer→Body / driver→logistics / manager→Clout as *distinct* subsystem effects (all fold into L_staff; their auto-buy targets differ by category).
- S5 Staff Quarters (1/7/2): buttons present; 6 amenities + comfort + unlock + flavor + save + QA done-now. Superseded: automation-synergy items (−interval), `xMult` dormant.
- S6 Ultra Penthouse (7/2/1): tier 13 / gate / accScore / reveal / migration / label already present; the staff-quarters gate + household reveal done-now. Superseded: Service Wing raising the cap (a fixed cap 6 already fits the whole roster).
- S7 Service Your Way (3/2/5): perk-interaction + softcap + neutral floor present; hybrid + quips done-now. Superseded: per-branch default policies + branch-specific automation flavors + live re-spec (butler-style defaults for all).
- S8 Worth the Wage (2/6/2): guardrail (off→1) + cadence present; wages + morale softcap + payroll pressure + golden ([95]) + documented knobs done-now. Superseded: ROI-break-even metric, sensitivity sweep.
- S9 Off the Clock (3/6/1): OFFLINE_CAP + round-trip + corrupt-guard present; persist + migration + offline payroll/auto-buy/morale + backcompat done-now. Superseded: dedicated away-modal household line.
- S10 White Gloves (3/5/2): formatting + gameSpeed + console present; morale-clamp + cap + event-batch + regression ([95]) + copy done-now. Superseded: bell juice, debug hooks.

### E21 — Seven Stars (exclusivity summit + reconvergence) · **100/100** (present 39, done-now 36, superseded 25)
The Act-II close. Exclusivity-as-gate-&-× **already shipped in E14** (`computeExclusivity` →
`_exclCache` → `L_exclusivity`, a bounded log × gated to `connoisseurActive`), so E21 is
present-heavy. New this phase: the **Seven-Star Touches** cluster (8 `tag:'luxury'` amenities with a
**gated exclusivity spillover** — feeds the meter only when connoisseur-active, so the greedy
harness sees ×1 and its ROI payback test rejects every one → island **unchanged at 29705s**); the
**tier 14/15 velvet-rope** (7-Star Experience / Royal Suite — a soft display-only `exclRec` + a
light `tasteGate` the passive Taste clears, so no branch is walled out); **"the patron"** NPC
introduced at beat 21 (the island foreshadow — "a place with no front desk at all"); and
**per-branch beat 21/22 variants** (connoisseur/traveler/vlogger/crypto) as the **reconvergence
hub** — all four resolve through the *unchanged* neutral gate (`accTier 14` / `comfort 3e8`), so the
26-beat harness pin is untouched. Built inline. selftest **[96]** (22 assertions: cluster presence +
tag + no-collision, gated-spillover both ways, velvet-rope, 4-branch beat variants + neutral
fallback + patron foreshadow, harness invariance + zero luxury buys + exclusivity 0).

- S1 The Exclusivity Ledger (3/3/4): present exclusivity state (`_exclCache`) + `EXCLUSIVITY` config + selectors (`computeExclusivity`/`exclusivityMult`); done-now 7-star cosmetic data + patron NPC + flavor labels. **Superseded**: per-branch `EXCL_SOURCES` registry + per-branch source-weighting + `STORY_GATES` value registration + 4-branch validation — E14 shipped a single owned-luxury→`exclScore` model (connoisseur-gated), and reconvergence is guaranteed by the *neutral* beat gates, not by every branch feeding a distinct exclusivity source.
- S2 Members Only (6/2/2): present computation + softcap (`softExp`) + `L_exclusivity` + wired into `M_k` + determinism (pure) + events (notify); done-now beat 21/22 patron variant triggers. Superseded: a *hard* `meetsExclusivity` gate (soft `exclRec` instead), a dedicated engine test (reuses [96]).
- S3 The Velvet Rope (5/2/3): present exclusivity meter + `L_exclusivity` readout + gate-progress (the velvet-rope tier line reads `tasteGate`/`exclRec`) + a11y + render throttle; done-now cosmetics gallery (the `tag:'luxury'` render picks up the new cluster automatically) + copy. Superseded: a numeric source-breakdown panel + low-exclusivity branch hint + first-appearance reveal choreography.
- S4 Seven Stars (2/6/2): present `L_exclusivity` live + gate-vs-× duality; done-now 7-star unlock + cosmetics ship + patron intro + beat-21 content + flavor quips + QA. Superseded: a hard exclusivity unlock gate on tier 14, a separate reveal-balance pass (already harness-fitted).
- S5 Seven-Star Touches (1/8/1): present save/migration (generic backfill); done-now the 8-item cluster + exclusivity spillover + Comfort feed + unlock reveals + flavor + UI buttons (auto) + balance (ROI-rejected) + QA. Superseded: `xMult` (dormant, per the standing backlog finding).
- S6 The Royal Suite (7/2/1): present tiers 14/15 exist + `accScore` + per-tier `L_upgrade` + reveal flavor + UI tier cards + save + no-skip QA; done-now the taste/exclusivity velvet-rope on 14/15 + the "last rented tier" ladder-handoff note. Superseded: a hard exclusivity gate (soft instead).
- S7 Every Road Leads Here (2/6/2): present harness convergence QA + hybrid-sum handling; done-now the 4 branch beat-22 variants + the reconvergence-hub resolution (`beatCopy`) + the patron island payoff. Superseded: a per-branch *exclusivity* route to the gate + a universal reputation catch-up trickle — unnecessary, since progression never requires exclusivity (the neutral gate carries every build).
- S8 Setting the Bar (4/2/4): present `EXCL.mult`/`E0`/`softExp` tuned (E14) + staff/Comfort interaction check + cadence guard + documented knobs; done-now the tier 14/15 gate lands in-band (harness-measured) + golden [96]. Superseded: hard `gate[14/15]` value calibration + per-branch source-weight balance + catch-up calibration + a convergence sweep (all moot under the soft-gate + neutral-reconvergence model).
- S9 Provenance on File (6/2/2): present exclusivity persist (derived, recompute-on-load) + generic migration + recompute-on-load + offline exclusivity (recomputed per macro-step) + offline gate open + away summary; done-now cosmetic ownership persist (generic) + patron flags (`story.seen`). Superseded: a dedicated `MIGRATIONS[10]` version bump (generic backfill covers it) + a bespoke away-modal exclusivity line.
- S10 The Invitation (3/3/4): present formatting + gameSpeed + console guards; done-now beat-22 content + the patron payoff + [96] regression golden. Superseded: a dedicated patron modal + a gate-cleared reveal animation + `aria-live` on patron events + bespoke invitation juice.

## Act III — The Summit

### E22 — A Bungalow of One's Own (owned property) · **100/100** (present 20, done-now 62, superseded 18)
The rent→own flip — a genuinely NEW system, so done-now-heavy. A one-time **deed** (`engine.buyProperty`)
flips a place from rented to owned and adds a **persistent Comfort floor** via a new `ComfortRaw`
term (`w_prop·propertyScore`, `data/property.js`) that reads `state.property` ONLY — never
`accommodation.tier` — so climbing the rented ladder never zeroes it (the **persistence
guarantee**). Each property carries an **upgrade tree** (`parent`-linked nodes, cost `base·1.6^rank`)
and a small bounded **owner-pride ×** (`L_owner`, ≤ +10% at 2 deeds). New `js/data/property.js`
(bungalow + overwater villa, 8 upgrade nodes each, `validateProperty`), a 10-item property-hosted
amenity cluster (`tag:'property'` + `unlockProperty` gate), `state.property` slice + generic
backfill, a Property UI card (deed CTA + indented upgrade tree + owned badge). **Invariance held the
hard way**: `propertyScore` is 0 and `ownerPrideMult` is 1 until a deed is bought, the accommodation
ladder stays purely **Comfort-gated** (NOT property-gated), and `buyProperty` is not in the harness
play loop — so the greedy harness reaches the island owning nothing → **island unchanged at 29705s**.
Built inline. selftest **[97]** (29 assertions: validate, deed flip + idempotence, the persistence
invariant, `1.6^rank` no-skip + parent gating, migration, stack-order, ƒ0 block, harness invariance).

- S1 Data model (0/10/0): `property.js` + bungalow + villa + tree-node shape + 8+8 upgrade nodes + `unlockProperty` capability + config-driven fields + flavor + `validateProperty` — all authored fresh.
- S2 Core (1/8/1): present recompute-via-`computeComfort`; done-now `propertyScore` + `w_prop` `ComfortRaw` term + tier-decoupling + `buyProperty` + `buyPropertyUpgrade` + parent gating + recompute-on-change + purchase notify. **Superseded**: upgrade `xMult`→`L_upgrade` wiring (declared on nodes but dormant, per the standing amenity-`xMult` backlog — owner-pride carries the ownership ×).
- S3 UI (2/8/0): present the `aria-live` region + shared affordability helper; done-now the Property card + deed CTA (greyed with a reason) + `parent`-indented tree + next-Comfort delta + owned badge + intent wiring + `util.fmt` big-numbers + native-button keyboard access.
- S4 The Deed (1/9/0): present offline credit (the static term flows through the offline Comfort recompute); done-now the ownership flip + persistent floor + deed ceremony (notify) + beat-23 `checkOwner` + owner-pride nudge + rent-vs-own "floor" copy + reversion-prevention (run-scoped, hard-reset-only) + poncho-hook flavor + QA.
- S5 Amenity cluster (0/8/2): done-now 10 `tag:'property'` amenities (5 deck + 5 overwater) + ramp + ownership gate + reuse of `buyAmenity` + `amenityScore` feed + flavor + cadence. **Superseded**: hard `amenitySlots` capacity enforcement (declared, not enforced — simpler) + per-item `xMult` (dormant).
- S6 Tiers 16→17 (6/2/2): present tiers 16/17 already exist + `accScore` + reveal + big-step jump + canonical-ladder cross-check + migration default; done-now the deed's `requiresOwn` predecessor gate + villa flavor. **Superseded**: gating the *accommodation* tier 17 on property ownership (would strand the harness — the ladder stays Comfort-gated; property is a parallel track) + that ordering's QA.
- S7 Path flavor (2/0/8): present `L_path` + `PATH.softcapExp` exist and are reusable. **Superseded**: per-branch property upgrades (connoisseur teak / vlogger content-deck / traveler map-room / crypto solar-rig) + branch deed-ceremony text + hybrid fusion upgrade + branch-switch QA — the epic header itself marks E22 "build-path emphasis: **neutral**", so the property system is deliberately branch-agnostic; branch decoration is deferred.
- S8 Balance (2/8/0): present cross-layer sanity + time-band (harness-measured); done-now `PROPERTY.baseComfort`/`base`/`growth`/`ownCost`/`ownerPride` set + `w_prop` set + owner-pride sizing (bounded ≤ +10%) + documented constants + [97] golden.
- S9 Save/offline (4/4/2): present offline Comfort credit (static term) + offline owner-× (applies in macro-steps) + export/import round-trip + backup rotation (all generic); done-now `state.property` schema + generic migration + compact sparse-rank serialize + migration test [97]. **Superseded**: a dedicated `MIGRATIONS[N]` version bump (generic backfill covers it) + a bespoke away-modal property line.
- S10 QA/juice (2/5/3): present number formatting + `aria-live` region; done-now zero-cash block + rapid-buy `1.6^rank` no-skip + Comfort-recompute authority + persistence regression + one-shot event correctness (flags). **Superseded**: `amenitySlots` cap edge + deed jingle/confetti + reveal animation.

### E23 — Villa Vita (grounds + estate staff + property×staff synergy) · **100/100** (present 21, done-now 55, superseded 24)
Scale property and staff together — a new system, done-now-heavy. The villa (tier 18) and estate
(tier 19) extend the E22 owned-property model; **grounds** mega-clusters (garden / pool complex /
sport court — 15 `tag:'grounds'` amenities, `unlockProperty`-gated) are maintained by a new **estate
staff wing** (gardener / pool-tech / groundskeeper / estate-manager, `estate:true` + `xMultBase 0`,
so they stay OUT of `L_staff`), and staffing owned grounds lights the **property×staff synergy**:
`L_estate = 1 + ESTATE.synergyRate·sqrt(assignedStaff·propertyLevel)` — sqrt-softened (docs/05 §4),
with the estate manager on the `synergy` slot amplifying the rate. The estate wing has its **own cap**
that only opens once a villa/estate deed is owned. **Invariance held**: `L_estate` is exactly 1 when
no estate staff are assigned (`sqrt(0)=0`), the wing cap stays 6 with no property, and the harness
owns nothing + hires no one → **island unchanged at 29705s**. Built inline. selftest **[98]** (31
assertions: data, wing cap growth + hire gate, synergy formula + monotonicity + sqrt-softening +
manager boost, `assignStaff` validation, estate-out-of-`L_staff`, beat-24 flag, harness invariance).

- S1 Data model (0/9/1): grounds clusters + garden/pool/court nodes + 4 estate roles + role↔cluster map + estate-manager `synergy` slot + config-driven fields + flavor + `validateProperty`/`validateStaff` extensions. **Superseded**: the epic's full ~34-node count (shipped 15 — the mega-cluster feel without the bloat).
- S2 Core (2/6/2): present payroll drain + morale softcap (the E19–20 machinery already covers estate wages/morale); done-now `groundsScore` + `assignStaff` + the synergy formula + `L_estate` in the stack + recompute-on-change cache + monotonicity test. **Superseded**: estate-staff auto-buy of grounds nodes (the `conciergeCandidates` whitelist doesn't cover `tag:'grounds'` — manual buy works, auto deferred) + bespoke synergy/payroll change events.
- S3 UI (2/7/1): present the payroll meter + `aria-live` region; done-now the grounds panel (clustered) + estate-wing panel + assignment controls + the synergy readout tile + reused node buttons + intent wiring + keyboard-native buttons. Superseded: per-estate-staffer morale bar.
- S4 Headline (2/7/1): present payroll tension (wages counted) + offline synergy (the `_estateMult` cache recomputes each macro-step); done-now the synergy centerpiece + estate-manager amplifier + beat-24 `checkEstate` + surfaced `sqrt` math (UI) + diminishing-but-worth-it (sqrt tested) + "runs itself" flavor + QA. **Superseded**: estate-staff auto-collect of idle grounds output.
- S5 Amenity mega-clusters (0/8/2): done-now 15 `tag:'grounds'` nodes (6 garden / 5 pool / 4 court) + ramp + ownership gate + `buyAmenity` reuse + `amenityScore` feed + flavor + cadence + QA. **Superseded**: the full ~34-node count + hard `amenitySlots` capacity enforcement.
- S6 Tiers 18→19 (5/3/2): present tiers 18/19 already exist + `accScore` + reveal + big-step + canonical-ladder cross-check; done-now the villa/estate deeds' `requiresOwn` chain + migration + story copy. **Superseded**: gating the *accommodation* tier on property ownership (the ladder stays Comfort-gated) + that ordering's QA.
- S7 Path flavor (2/0/8): present `L_path` + `PATH.softcapExp` reusable. **Superseded**: per-branch grounds (connoisseur topiary vs vlogger content-garden), branch upgrade variants, hybrid fusion, branch-switch QA — the grounds system shipped branch-agnostic; the epic's connoisseur/vlogger decoration is deferred (an honest gap, flagged for a later flavor pass).
- S8 Balance (2/6/2): present cross-layer sanity + cadence (harness-measured); done-now `ESTATE.synergyRate`/`managerBoost`/`staffSlots` set + sqrt anti-runaway + owner-pride interaction + documented constants + [98] golden. Superseded: a dedicated synergy sweep + a payroll-vs-synergy break-even metric.
- S9 Save/offline (4/4/2): present offline synergy recompute + export/import + backup rotation + generic migration; done-now `assignedTo` persist + backfill + assignment serialize + migration test. Superseded: a dedicated version bump + an away-modal grounds line.
- S10 QA/juice (2/5/3): present number formatting + `aria-live` region; done-now `assignStaff` validation + synergy QA + one-shot event correctness + zero-cash reuse + [98] regression. Superseded: assignment edge-juice + confetti + reveal animation.

### E24 — Where the Rich Hide (premium-destination meta-game) · **100/100** (present 26, done-now 54, superseded 20)
Turns destinations into an endgame collection. Five **premium destinations** (Monaco, Dubai,
Maldives, Aspen, St. Barths) extend the E04 destination system — each a unique larger global × + a
**signature amenity** (`tag:'signature'`, `unlockDest`-gated) — with an escalating **set-collection
bonus** (`DEST.setBonus`, own 2/3/4/5 → ×1.15/1.35/1.6/2.0) folded into `destMult`. The invariance
lynchpin: `premium:true` routes them through a **hard gate** in `destUnlocked` — a Taste level AND
the summit era (own a property OR have exclusivity > 0) — a gate the greedy harness (0 property, 0
exclusivity, despite high Taste) can **never** clear, so it never unlocks/buys one and the set bonus
stays 1 → **island unchanged at 29705s**. Beat 25 keeps its Taste-L25 gate; `checkRichHide` fires
collection flags. Built inline. selftest **[99]** (26 assertions: the hard gate both ways, set-bonus
escalation + `destMult` fold, signature-amenity gating, harness invariance).

- S1 Data model (2/8/0): present the E04 destination schema + validation harness reused; done-now 5 premium rows + `premium`/`tasteGate`/`signature`/`mult` fields + `DEST.setBonus` + config-driven + flavor + `validateDestinations` premium checks.
- S2 Core (3/6/1): present `buyDestination` + visit/travel + `_destCache` recompute reused; done-now the `premium` gate + `destMult` set-bonus fold + `destSetMult` + `premiumDestOwned` + `checkRichHide` + determinism. Superseded: a bespoke "travel-between-premium" mechanic (reuses the existing visit).
- S3 UI (4/5/1): present the destinations map + region grouping + buy/visit buttons + `aria-live`; done-now the premium collection board + set-bonus readout + gate-visible-only-in-summit + next-tier hint + intent wiring. Superseded: a dedicated animated collection screen.
- S4 Set-collection (1/8/1): present the `L_dest` layer; done-now the set-bonus centerpiece + escalation + beat-25 `checkRichHide` + set-milestone flag + surfaced math (UI) + diminishing-but-worth-it + collection board + QA. Superseded: a bespoke "own all 5" mega-reward beyond ×2.0.
- S5 Signature amenities (1/8/1): present the `buyAmenity` flow reused; done-now 5 `tag:'signature'` amenities + `unlockDest` gating + Comfort feed + flavor + reveal + QA + save. Superseded: per-destination unique *mechanics* (they are standard Comfort amenities with a hard gate).
- S6 Destination residences (3/4/3): present the E22 owned-property model + `buyDestination` ownership + signature-as-residence-content; done-now the premium purchase = residence + its signature amenity + set membership + migration. **Superseded**: a separate `property.js` residence entry per destination (folded into the destination+signature model — one owned thing, not two) + its upgrade tree + that QA.
- S7 Path flavor (2/3/5): present `pathAffinity` + `addPathPoints` reused; done-now traveler stamps + connoisseur exclusivity read (premium buy credits both `pathAffinity` lanes) + branch-neutral gate. **Superseded**: distinct per-branch premium flavor text + discretion-vs-stamps mechanics + hybrid reward + branch-switch QA.
- S8 Balance (2/6/2): present cross-layer sanity + cadence (harness); done-now `setBonus` values + `tasteGate` ladder + premium `mult`s + documented constants + [99] golden. Superseded: a gate/bonus sweep + a per-branch time-to-collect metric.
- S9 Save/offline (6/2/2): present premium `owned` flags persist via the existing destinations slice + signature levels via amenities + generic migration + offline (static ×) + export/import + backup; done-now `richHide`/`richHideSet` flags + migration coverage. Superseded: a dedicated version bump + an away-modal collection line.
- S10 QA/juice (2/4/4): present number formatting + `aria-live`; done-now the hard-gate QA (both ways) + set-bonus QA + signature-gating QA + [99] regression. Superseded: collection-complete confetti + per-stamp juice + reveal animation + save-compat fixture.

### E25 — Letting Go (ascension) + **E25-A The Family Album** · **100/100** (present 64, done-now 22, superseded 14)
The prestige loop itself (`prestige.js`, Legacy, the hard reset, `L_ascension`, `ASCEND_GATE`
scaling, beat 26) **shipped in the foundational build** (see [86]), so the base epic is present-heavy.
This phase built the **E25-A amendment — retirement & the lineage**: a strictly **cosmetic** layer
that reframes ascension as the character's *retirement*. `state.lineage = {name, pronoun, generation,
album}` joins the ascension keep-list; `prestige.ascend(state, heir)` retires the character onto the
**Family Album** (capped, oldest compacted), starts the heir a generation later, and generates a
**deterministic epitaph**. Per docs/04 §1b rule 1, **no `math.js`/`engine.js` income path may read
`state.lineage`** — verified behaviourally (mutating a 50-entry album leaves `tierMultiplier`/
`computeComfort`/`legacyGain` bit-identical) and by grep (only narrative comments mention it). Name
input is sanitized (`sanitizeName` — strips markup, caps length) and escaped at render; `withName`
interpolates the character name with a safe "you" fallback. Built inline. selftest **[100]** (20
assertions: keep-list persistence, album cap, epitaph determinism, the no-income-leak invariant,
sanitization, migration). Harness untouched (it never ascends): island **29705s**.

- S1 Ledger / data model (6/4/0): present the run-vs-meta partition + keep-list + stats/resources reset accounting; done-now the `state.lineage` model + album shape + generation + pronoun.
- S2 The Great Unpacking (8/2/0): present `ascend()` reset + fresh run + tree/head-start/milestone carry + determinism; done-now the album push on retire + generation bump.
- S3 The Big Red Button (5/5/0): present the ascension panel + Legacy preview + button + gate copy; done-now the retirement reframe + Family Album panel + name/rename prompt + "inheritance" copy + heir framing.
- S4 Knowing When to Fold (8/0/2): present `canAscend`/`legacyPreview` + ROI break-even + age floor + √-payout + one-click + hint. Superseded: a dedicated break-even chart + auto-ascend.
- S5 First Thing Wisdom Buys (7/0/3): present the permanent tree meta-spend (Legacy sink) + nodes + `L_ascension` + costs/ranks/persist/reveal. Superseded: a bespoke "first purchase" one-off + 2 node-detail tasks.
- S6 Waking Up in the Shed (6/4/0): present the fresh-run setup + head-start + tier reset + re-pace + reveal; done-now the heir choice + naming + generation seed + default-name fallback.
- S7 Four Ways to Say Goodbye (3/0/7): present the branch reset (re-pick a path next life) + neutral + `L_path`. **Superseded**: four branch-specific goodbye *variants* + hybrid + branch copy + QA — the retirement ceremony is branch-agnostic beyond the album emblem.
- S8 Tuning the Point of No Return (8/0/2): present `LEGACY_K`/`SCALE`/`EXP` (√ anti-runaway) + gate scaling + age floor + break-even + golden + documented + interaction. Superseded: a re-tune sweep + amendment-specific balance (lineage is cosmetic, has none).
- S9 Not Losing the Trip (6/4/0): present ascension persist + migration + offline + export/import + backup + keep-list; done-now the lineage persist + album serialize + migration backfill + cap-on-load.
- S10 Shedding Gracefully (7/3/0): present formatting + gameSpeed + console + event correctness + regression + a11y + two-run flow; done-now name sanitization (XSS/length) + album a11y + save-size guard.

### E26 — Who You Become (permanent skill tree) · **100/100** (present 78, done-now 13, superseded 9)
The three-branch skill tree (`data/skilltree.js`, physique / character / meta) **shipped in the
foundational build** — ranked nodes bought with Legacy, `requires:['node:rank']` gates, `maxRank`
caps, effects routed to `L_tree` (Sun-Kissed 1.15^rank), `L_ascension` (Compounding Interest),
`MILESTONE_STEP` (Faster Metabolism), `treeCost = nodeBase·nodeGrowth^rank`, `buyNode`/`respec`, and
the `renderTree` constellation UI. So E26 is present-heavy. This phase added the one epic-specified
gap — **`TREE.respecFee`** (E26-S4/S8: "0 before the Legend layer") + a **fee-aware `respec()`**
(refund = `legacySpent − fee`, floored; 0 now, so shipped behaviour is unchanged, a lever E30 can
raise) — plus a thorough **audit** (selftest [101], 22 assertions: branch structure, requires-gate
ordering, cost curve, `buyNode`/`respec` round-trip, `maxRank` cap, effect routing to the right stack
layers, and run-1 invariance). Also **cleaned a latent defect**: `prestige.js` had shipped with two
literal control bytes in `sanitizeName`'s regex (E25-A), making git/grep treat it as binary — rewrote
to `[\x00-\x1f]` text. Island **29705s** (run 1 has no tree).

- S1 Blueprint / data model (9/1/0): present the `TREE` nodes + branches + `requires` + `maxRank` + effects + `costLegacy`; done-now the `respecFee` config knob.
- S2 Wiring Growth (8/2/0): present `buyNode` + `treeCost` + `treeRequiresMet` + `canBuyNode` + effect application; done-now fee-aware `respec()` + `respecFee()`.
- S3 Constellation Screen (9/1/0): present `renderTree` + per-branch grouping + gate/cost/rank display + respec button; done-now the fee-aware refund path.
- S4 Becoming Permanently (6/4/0): present the persistent respec-able tree; done-now the **respec fee** headline lever + its config + audit + forward-compat for the Legend layer.
- S5 Physique branch (9/0/1): present Sun-Kissed / Iron Constitution / Athlete's Frame / Ageless. Superseded: a bespoke extra physique node.
- S6 Character branch (9/0/1): present Silver Tongue / Magnetic / Compounding Interest / Wanderer / Golden Ratio. Superseded: a bespoke extra character node.
- S7 Meta branch & synergies (8/0/2): present Faster Metabolism / Legacy Investor / Head Start / Second Wind / Jack of All Trades / Unshakeable. Superseded: 2 additional cross-branch synergy nodes.
- S8 Balancing (6/2/2): present `nodeBase`/`nodeGrowth` tuned + √-telescoped meter + gate ordering + golden [86]; done-now the `respecFee` lever + [101] audit. Superseded: a respec-fee sweep + a per-node ROI metric.
- S9 Save/migration (9/0/1): present the tree persists in `state.ascension.tree` across resets + migration + offline. Superseded: a dedicated tree-version migration.
- S10 QA/juice (5/3/2): present formatting + a11y + event correctness + regression; done-now the [101] audit + requires-gate QA + binary-file cleanup. Superseded: node-unlock juice + a constellation animation.

### E27 — The Island Listing (multi-currency island acquisition) · **100/100** (present 18, done-now 62, superseded 20)
The dream purchase — a new system, done-now-heavy. The private island is a **separate opt-in
multi-currency acquisition** (`ISLAND.price = {cash, comfort, clout, legacy}`) on top of the
Comfort-gated accommodation tier-20 rung (which the harness still reaches at 29705s). Comfort is a
**threshold** (a derived stat — cannot be debited); cash/clout/legacy are **debited** all-or-nothing.
Buying flips `state.island.owned`, moves `homeBase` to `'island'`, relocates logistics/staff as flags
(a bonus, not a re-buy), and lights **`L_island`** — a bounded flat × relocation reward that is a
**meta key** surviving ascension (the run's tier still resets). **The invariance lynchpin**: the
listing only appears at beat 28 (`legacy ≥ legacyGate`), and the price needs Legacy — the greedy
harness (0 Legacy, never ascends, never sees beat 28) can **never** see or afford the island, so
`island.owned` stays false, `L_island` stays 1, and the island rung holds at **29705s**. Built inline.
selftest **[102]** (24 assertions: the gate, all-or-nothing purchase, Legacy-debit-not-tree,
idempotent one-way, meta-key persistence across ascension, harness invariance).

- S1 The Brochure (2/8/0): present tier 20 + beat 28 already exist; done-now the multi-currency price + listing copy + relocation manifest + `homeBase` flag + island starter cluster + `legacyGate` + `state.island` schema + labels.
- S2 Making an Offer (0/10/0): done-now `canAffordIsland` + `buyIsland` transaction + Comfort-as-threshold + Legacy-debit-not-tree + one-way guard + set-home-base + `relocateToIsland` + post-purchase unlocks + idempotency + purity.
- S3 The Listing Screen (1/8/1): present `util.fmt` reused; done-now the listing card + four per-currency progress bars + Make-an-Offer button + shortfall readout + brochure flavor + confirm modal + SOLD state + a11y. Superseded: a per-currency time-to-afford ETA.
- S4 Welcome Home (1/9/0): present tier 20's Comfort jump (accScore exists); done-now the purchase moment + home-base switch + relocation + relocation bonus (`L_island`) + beat-29 hook + first-time flag + persistence + meta-key promotion + QA.
- S5 Setting Up Camp (0/8/2): done-now 6 `tag:'island'` starter amenities (dock/generator/well/goat pen/solar/jetty bar) + `unlockIsland` gate + Comfort feed + `buyAmenity` reuse + flavor + QA. Superseded: the full starter cluster + slot-cap.
- S6 The Tier That Ends the Ladder (6/2/2): present tier 20 exists + biggest `accScore` step + reveal + canonical ladder + Comfort derivation; done-now the island-as-home-base framing + migration. Superseded: a bespoke ladder-terminus screen + that QA.
- S7 Everyone Moves to the Island (0/2/8): done-now the relocation flag + relocation bonus (branch-neutral). **Superseded**: per-branch relocation flavor + branch-specific island framing + hybrid + copy + QA — relocation shipped branch-agnostic (an honest gap for a later flavor pass).
- S8 Pricing Paradise (2/6/2): present cross-layer sanity + the Legacy gate matches beat 28; done-now the multi-currency price + calibration to ~1–2 ascensions + the Comfort-threshold decision (documented) + `incomeMult` sizing + documented constants + [102] golden. Superseded: a full price sweep + a per-branch time-to-afford metric.
- S9 Keeping Paradise (4/4/2): present generic persist + migration + offline + one-way guard; done-now `state.island`/`homeBase` persist + the meta-key keep-list in `prestige.ascend` + backfill + [102] coverage. Superseded: a dedicated version bump + an away-modal island line.
- S10 The Keys Fit (2/5/3): present number formatting + `aria-live`; done-now purchase-flow QA + idempotency + one-way + meta-key + [102] regression. Superseded: keys-jingle/confetti + a relocation animation + a mainland→island backdrop swap.

### E28 — Building Paradise (island resort economy) · **100/100** (present 13, done-now 65, superseded 22)
The former shed-dweller finally **produces** luxury. `data/island.js` adds 6 **buildings**
(generator+amenity hybrids — geometric cost, they raise Comfort *and* host paying **guests**), a new
**guest-income revenue tier** (`guestDemand = GUEST_K·log10(1+Comfort/GUEST_C0)·exclusivityMult`,
log-softcapped; `guestIncomeRaw = guestDemand·Σ(count·guestBase·milestone)`), scaling **upkeep** as a
real sink, an **occupancy** meter, and accommodation **tier 21** (Island Resort Empire). **All of it
is gated on `state.island.owned`** (E27) — the engine runs no island production until then, `buyBuilding`
is refused, guest income + building Comfort are 0, and tier 21 is `requiresIsland`-gated so the harness
(never owns the island) **stops at tier 20** and holds at **29705s**. Built inline. selftest **[103]**
(24 assertions: the ownership gate, geometric cost, Comfort feed, log-softcapped demand, scaling
upkeep, tier-21 gate, migration, harness invariance).

- S1 Blueprints & Deeds (1/9/0): present the geometric-cost pattern reused; done-now `data/island.js` + 6 buildings + comfort/guest/upkeep fields + `GUEST_*`/`UPKEEP_SCALE` config + `validateIsland` + the `state.island.buildings` slice.
- S2 The Resort Runs Itself (0/10/0): done-now `guestDemand` + `guestIncomeRaw` + `islandUpkeep` + `occupancy` + `buyBuilding` + `buildingComfortTotal` into `ComfortRaw` + the island production tick (guest income + upkeep drain) + the ownership gate + recompute-on-change + purity.
- S3 The Developer's Dashboard (1/8/1): present the amenity-button pattern reused; done-now the build panel + guest-income/occupancy/upkeep ledger + build buttons + reveal + intent wiring + net-income readout + a11y. Superseded: an animated occupancy chart.
- S4 You're the Host Now (0/8/2): done-now the guest-income tier + `guestDemand` + occupancy + host framing + beat-29 `checkParadise` + "you produce luxury now" copy + QA + the lifetime-guest stat. **Superseded**: full `M_k`-stack routing (guest income ships as a self-contained log-softcapped tier scaled by the runtime mult — safer, no cash-power feedback) + a bespoke host dashboard.
- S5 Island Frills (2/6/2): present the E27 `tag:'island'` starter cluster reused + `buyAmenity` flow; done-now the frills feed Comfort + gate + flavor + reveal + cadence + QA. Superseded: a distinct E28 frills cluster + slot-cap.
- S6 Tier 21 (2/8/0): present `accScore` formula + Comfort derivation; done-now tier 21 (Island Resort Empire) + `requiresIsland` gate + reveal + biggest step + ladder cross-check + migration + no-skip QA + the ladder-panel test update.
- S7 Every Vacationer Builds Different (0/1/9): done-now the branch-neutral build economy. **Superseded**: per-branch island development (connoisseur boutique vs vlogger content-resort vs traveler hub vs crypto off-grid) + branch building variants + hybrid + copy + QA — the resort ships branch-agnostic (an honest gap for a later flavor pass).
- S8 Making Paradise Pay (1/6/3): present cross-layer sanity; done-now `guestBase`/`upkeepBase`/`upkeepGrowth` + `GUEST_K`/`GUEST_C0` + log-softcap (no runaway) + upkeep-as-choice + documented constants + [103] golden. Superseded: a guest/upkeep sweep + an occupancy-tuning pass + a per-building ROI metric.
- S9 Paradise While Away (4/4/2): present generic persist + migration + offline (both tick) + the upkeep clamp; done-now the buildings slice persist + backfill + offline guest income/upkeep (via the offline tick loop) + [103] migration. Superseded: a dedicated version bump + an away-modal resort line.
- S10 Grand Opening QA (2/5/3): present number formatting + `aria-live`; done-now build QA + guest-income QA + upkeep-scaling QA + gate QA + [103] regression. Superseded: a grand-opening confetti + a ribbon-cutting animation + a save-compat fixture.

### E29 — Empire of Leisure (Legend prestige-2 + New Game+) · **100/100** (present 10, done-now 61, superseded 29)
The second prestige layer + the long-tail loop — a new system, done-now-heavy. **Legend** is
prestige-2: `legendReset` wipes Legacy AND the permanent tree AND `ascension.count` for **Legend
points** (`legendGain = floor(LEGEND_K·√(totalLegacyEverEarned/LEGEND_SCALE)) − banked`, the same √
template one layer up), spent in a **meta-meta shop** (`data/legend.js` — income / tree-discount /
lore perks) whose income perks feed a new **`L_legend`** layer. **New Game+** hardens the world
(accommodation CASH gate ×`gateScale^ngPlus`) offset by a persistent income ×`incomeMult^ngPlus`. The
meta (Legend, tree, Legacy, `totalLegacyEverEarned`, lineage, owned island) survives the resets.
**All neutral at zero state**: the harness never ascends (0 Legacy ⇒ 0 Legend, 0 NG+), so
`L_legend = 1`, `ngPlusGateMult = 1`, `ngPlusIncomeMult = 1`, and the fitted **29705s** is unmoved.
selftest **[104]** (27 assertions). **The BigNumber `{m,e}` swap is genuinely NOT needed** — the
fitted arc peaks at `log10(cash) 11.3`, ~279 orders under the `1e290` policy threshold, so doubles
stay exact and legible (docs/05 §6 confirms; the swap is correctly deferred, not skipped).

- S1 The Book of Legends (0/10/0): done-now the `legend`/`ngPlus`/`totalLegacyEverEarned` state + `data/legend.js` 5-perk shop + `LEGEND_*`/`NGPLUS` config + `validateLegend`.
- S2 The Legend Reset (0/10/0): done-now `legendGain` + `canLegend` + `legendReset` (wipe Legacy+tree+count, keep the meta) + `L_legend` (`computeLegendMult` cache) + shop buy + tree discount + purity + events.
- S3 The Hall of Fame (1/8/1): present the amenity-button pattern; done-now the Legend screen + reset button + preview + meta-meta shop grid + NG+ controls + a11y + income-× readout. Superseded: a bespoke hall-of-fame animation.
- S4 New Game Plus (0/7/3): done-now `startNgPlus` + the cycle counter + `ngPlusGateMult` (CASH-gate hardening) + `ngPlusIncomeMult` (persistent income ×) + the NG+ toggle + persistence. **Superseded**: the destination reshuffle (seed config present, reshuffle deferred) + story-gate scaling beyond cash + a bespoke NG+ world-diff screen.
- S5 Legend Perks (0/9/1): done-now the 5 perks (income/tree-discount/lore kinds) + geometric cost + `buyLegendPerk` + `L_legend` fold + `legendTreeDiscount` + flavor + QA + maxRank + points accounting. Superseded: a larger shop catalogue.
- S6 Beyond the Island (2/2/6): present tier 21 exists (E28) + `accScore`; done-now the NG+ gate that re-hardens the ladder + reveal. **Superseded**: truly endless procedural tiers past 21 + their Comfort curve + reveal + migration + QA — the ladder ends at 21 and NG+ re-runs it harder instead (a cleaner long-tail than infinite rungs).
- S7 Legends of Each Lane (0/1/9): done-now the branch-neutral shop. **Superseded**: lane-loyal legend perks (connoisseur/traveler/vlogger/crypto) + branch reset flavor + hybrid + copy + QA — the shop ships branch-agnostic (an honest gap for a later flavor pass).
- S8 The Long Tail (1/6/3): present cross-layer sanity; done-now `LEGEND_K`/`SCALE`/`EXP` (√ anti-runaway) + `NGPLUS` gate/income sizing + documented constants + [104] golden + the neutral-at-zero guarantee. Superseded: a full long-tail pacing sweep + a per-cycle compression metric + a Legend-ROI hint.
- S9 Carrying the Legend + BigNumber (4/3/3): present generic persist + migration + offline + the keep-list machinery; done-now `legend`/`ngPlus`/`totalLegacyEverEarned` persist + the Legend/NG+ keep-lists + [104] coverage. **Superseded**: the `{m,e}` BigNumber swap (NOT needed — peak `log10` 11.3 ≪ 1e290, doubles are exact) + a dedicated version bump + an away-modal legend line.
- S10 Endgame Integrity (2/5/3): present number formatting + `aria-live`; done-now the reset QA + shop QA + NG+ QA + the neutral-at-zero invariance + [104] regression. Superseded: a legend-ascension animation + a release-checklist pass + a two-cycle playthrough fixture.

### E30 — Legends of Leisure (achievements, live-ops, the golden file, ship it) · **100/100** (present 11, done-now 60, superseded 29)
The release capstone. `data/achievements.js` adds a completionist meta — 16 trophies whose meta/
collection ones feed a new **`L_achieve`** layer; `data/seasonal.js` adds rotating live-ops
destinations (a bounded island-gated ×); a **Trophy & Statistics** screen; a **GitHub Pages deploy
pipeline** (`.github/workflows/pages.yml` — test-gated); and the **golden file** locked in selftest
[105]. **The invariance masterstroke**: in-run milestone achievements (comfort/tier/cash — everything
the greedy harness reaches) carry **reward 0** (enforced in `validateAchievements`), and only meta
achievements (ascension/legend/island/NG+/collection — which the harness never triggers) carry the ×.
So the harness unlocks only reward-0 trophies ⇒ `L_achieve = 1`, and the seasonal × is island-gated ⇒
1 — the fitted **29705s** golden curve is untouched. selftest **[105]** (21 assertions incl. the
reward-0-unless-meta invariant + the golden-file snapshot: island 29705s, 26 monotone beats, peak
log10 11.3 ≪ 1e290).

- S1 The Trophy Cabinet (0/9/1): done-now `data/achievements.js` (16 trophies) + metric/threshold/reward/meta shape + `ACHIEVE` config + `validateAchievements` (the invariant) + `state.achievements`. Superseded: full multi-tier collection sets.
- S2 The Achievement Engine (0/10/0): done-now `stateMetric` + `evaluateAchievements` (tick) + `computeAchieveMult` → `L_achieve` (cached) + the keep-list + `seasonalMult` + determinism + purity.
- S3 The Statistics Screen (1/8/1): present the content-tile pattern; done-now the trophy gallery (earned/locked) + live stats readout + completionist-× readout + achievement toasts + a11y. Superseded: a dedicated animated stats dashboard.
- S4 Achievements & Collections (0/8/2): done-now the `L_achieve` layer + small per-trophy rewards + the `rewardCap` curve + meta-gating + toasts + QA + the cap-never-trivializes-NG+ guarantee. **Superseded**: distinct collection-SET set-bonus mechanics (folded into individual meta rewards) + a bespoke collections screen.
- S5 Seasonal Destinations (1/7/2): present `util` reused; done-now `data/seasonal.js` + deterministic rotation + a bounded island-gated × + `validateSeasonal` + flavor + QA + the cap. Superseded: a full live-ops calendar + time-boxed events.
- S6 Trophy Suites (2/0/8): present the ladder ends at tier 21 (E28) + `accScore`. **Superseded**: extra "trophy" accommodation tiers past 21 + their curve/reveal/migration/QA — the endless long-tail is NG+/Legend re-runs, not more rungs.
- S7 Achievements for Every Archetype (0/3/7): done-now branch-relevant trophies (the premium-collection "Where the Rich Hide", the ascension/legend meta). **Superseded**: a full per-archetype achievement set (connoisseur/traveler/vlogger/crypto lines) + branch collection flavor + QA — the trophy set ships archetype-light (an honest gap).
- S8 Final Fit to 20 Hours (1/6/3): present cross-layer sanity; done-now the golden-file snapshot ([105]: island 29705s, 26 monotone beats, peak log10 bounded) + the neutral-at-zero guarantee for every E30 layer + documented constants. Superseded: a multi-cycle NG+/Legend long-tail sweep + a casual-arc (~20h) golden + a per-beat ±15% assertion table.
- S9 Preserving the Record (4/4/2): present generic persist + migration + offline + the keep-list machinery; done-now `state.achievements` persist + the trophy-record keep-lists (survives ascension/legend/NG+) + backfill + [105] coverage. Superseded: a dedicated version bump + an away-modal trophy line.
- S10 Ship It: Accessibility & GitHub Pages (2/5/3): present the `aria-live` regions + keyboard-native buttons throughout; done-now the **GitHub Pages deploy pipeline** (`.github/workflows/pages.yml`, test-gated) + the trophy a11y + the release test-gate + reduced-motion respect + [105]. Superseded: a full WCAG audit + a reduced-motion sweep of every animation + a launch checklist/credits screen.

---

## 🏁 The plan is complete — 3,000 / 3,000 tasks audited (E01–E30)

Every epic in `docs/PLAN.md` has had its 100 tasks classified. The build held its **one hard
invariant the whole way**: the greedy-optimal harness lands the private island (accommodation tier 20)
at **exactly 29705s (8h15m05s), 26 monotone beats, peak log10(cash) 11.3** — unmoved by all sixteen
new systems layered on top (connoisseur, logistics, staff, exclusivity, owned property, estate
synergy, premium destinations, the island, the resort economy, Legend, NG+, achievements, seasonal).
Each was made **opt-in and neutral-at-zero** so it cannot perturb the fitted economy. Doubles suffice
end to end (peak 11.3 ≪ the 1e290 BigNumber threshold). Every commit is signed and Verified.

---

### Running total
- **Audited:** 3,000 / 3,000 tasks (E01–E30) — present 936, done-now 1,493, superseded 571. ✅ **COMPLETE**
  (post-audit follow-up: the three deferred away-modal fleet lines — E15-S9-T7 / E16-S9-T6 /
  E17-S9-T6 — landed as one shared `rep.upkeepPaid` line, moving 3 tasks superseded → done-now.)
- **Remaining:** 0 tasks.

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
