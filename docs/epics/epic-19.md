# E19 — At Your Service
> Act II late (staff era) · Accommodation tier 13 (Ultra Penthouse) · New system: staff data model + butler automation (bounded auto-buy / auto-collect policies) + payroll sink · Story beat 19 (*At Your Service*) · Build-path emphasis: neutral (every build benefits from freed micro-management)

**Epic goal:** Introduce **staff & automation** by hiring a **butler** who automates chores — bounded auto-buy of amenities/generators and auto-collect — turning relentless tapping into a configurable, paid-for convenience.
**Player-visible outcome:** A hireable butler with a visible **payroll** cost and a policy panel; the game now buys the smart cheap upgrades and collects for you, within budgets *you* set — plus the **Ultra Penthouse** (tier 13) and the **Butler's Kit** amenity cluster.
**Systems touched:** new `js/data/staff.js`; `state.staff` slice + `MIGRATIONS[8]` in `state.js`; `engine.js` (payroll sink, automation scheduler, bounded policies reusing `engine.buyAmenity`/`engine.buyGenerator`); `config.js` `STAFF` block; `ui.js` staff panel; `accommodation.js` tier 13; `data/story.js` beat 19; `data/amenities.js` Butler's Kit.
**Math/balance notes:** `staffWage = wageBase·wageGrowth^level` (butler `wageGrowth=1.18`); payroll `dCash/dt −= Σ wage`; auto-buy is a **bounded policy** (spend ≤ `budgetFrac·cash`, only `roi ≥ minRoi`, every `STAFF.autoBuyInterval=2s`) mirroring the E11 concierge; ROI framing = incremental income ÷ wage; guardrail: butler-on ≤ perfect-manual + ~10%.

## E19-S1 — The Staff Ledger (data model)
_As the game engine, I want a declarative staff data model, so that hiring, wages, levels, and automation policies are pure data instead of bespoke code._  One schema powers every future role (E20, E23, E28).
- **E19-S1-T1** — Create `js/data/staff.js` — Add the module exporting `STAFF_DATA`; first entry `{id:'butler', name:'The Butler', role:'butler', subsystem:'automation', wageBase, wageGrowth:1.18, levelCostBase, levelCostGrowth}`, kept declarative so the engine stays generic.
- **E19-S1-T2** — Define the automation-policy schema — Give each staff entry a `policies[]` list (`{id:'autoBuyAmenities', kind, defaultOn:false, params}` and `{id:'autoCollect', …}`) that describes *what* the role can automate, not how.
- **E19-S1-T3** — Add the `state.staff` slice — Extend `state` in `state.js` with `staff:{ butler:{hired:false, level:0, morale:100, policy:{autoBuyAmenities:false, autoCollect:false, budgetFrac:0.25, minRoi:2}} }`; everything JSON-serializable.
- **E19-S1-T4** — Wage & hire-cost pure fns — In `math.js` add `staffWage(def,level)=def.wageBase·def.wageGrowth^level` and `staffHireCost(def)`; no magic numbers, all read from the def per `docs/00 §1`.
- **E19-S1-T5** — Config block — In `config.js` add `STAFF={ butler:{wageBase:5e4, wageGrowth:1.18, hireCost:2.5e5}, autoBuyInterval:2, minInterval:0.5, roiHintEnabled:true }` as the single tuning source.
- **E19-S1-T6** — Tag auto-buyable items — Add an `autoBuyable:true` flag (default true) to amenity/generator data so a policy can include/exclude categories without engine edits.
- **E19-S1-T7** — Butler flavor copy — Write the Dutch-tourist hire blurb: a stiff, unnervingly competent butler who "does not comment on the poncho still drying on the radiator." Store in `def.desc`.
- **E19-S1-T8** — Roster selectors — Export `getHiredStaff(state)` and `getStaffDef(id)` so engine/UI never hand-roll lookups.
- **E19-S1-T9** — Validation test — Unit-test that every `STAFF_DATA` entry has the required keys and every policy `id` is unique; fail loudly on malformed data.
- **E19-S1-T10** — Doc stub — Add a header comment mapping the staff schema to `docs/01 §3` (payroll sink) and the `docs/03` E19 row, so future roles follow the same shape.

## E19-S2 — Below Stairs (core logic / engine)
_As the simulation, I want payroll deducted and butler policies executed every tick, so that automation runs deterministically online and offline._  The butler actually *does* things, at a real cost.
- **E19-S2-T1** — Payroll deduction in `engine.tick` — Each tick subtract `Σ staffWage(def,level)·dt` from cash as a continuous sink; clamp cash at 0 (never negative) and set `payrollUnpaid` if it would go under.
- **E19-S2-T2** — Automation scheduler — Add an accumulator so butler policies fire every `STAFF.autoBuyInterval` seconds of *simulated* time (not every tick), keeping it cheap and framerate-independent like the main loop.
- **E19-S2-T3** — Auto-buy policy (bounded) — Implement `runAutoBuy(state)`: gather affordable `autoBuyable` items in enabled categories, compute marginal-income ROI (reuse harness `marginalIncomeGain`), buy the best while spend ≤ `budgetFrac·cash` and `roi ≥ minRoi`. Mirror the E11 concierge bounded-policy pattern.
- **E19-S2-T4** — Auto-collect policy — Implement `runAutoCollect(state)`: fold pending manual-collect buffers (clicker / combo trickle) into resources so the player never has to tap; convenience only, no free multipliers.
- **E19-S2-T5** — Reuse existing intents — Auto-buy must call the same `engine.buyAmenity(id)` / `engine.buyGenerator(id)` the buttons use, so automated and manual purchases share one code path (no divergence).
- **E19-S2-T6** — Butler level effect — Higher `butler.level` widens scope: `+1` category and `−10%` `autoBuyInterval` per level (floored at `STAFF.minInterval`), so leveling is a felt upgrade.
- **E19-S2-T7** — Emit events — After each automated action emit `purchase`/`autobuy` events so the UI ticker and stats can show "your butler bought Flamingo Floatie ×3."
- **E19-S2-T8** — Unpaid-payroll behavior — If `payrollUnpaid`, pause automation and drop morale (feeds E20); surface a "the butler clears his throat" warning rather than a crash.
- **E19-S2-T9** — Deterministic ordering — Fix a stable sort (ROI desc, then `id`) so automation is reproducible under the seeded RNG and the balance harness.
- **E19-S2-T10** — Engine unit tests — Test payroll math, budget cap respected, `minRoi` respected, and that auto-buy never spends into debt.

## E19-S3 — The Service Bell (UI / buttons)
_As a player, I want a simple staff panel with a hire button and policy toggles, so that I can turn automation on and see exactly what it costs._  Automation is legible and controllable, not a black box.
- **E19-S3-T1** — Staff panel scaffold — Add a "Staff" section to `ui.js` (Spectre card) revealed after beat 19; render the butler with name, level, wage/s, and status.
- **E19-S3-T2** — Hire button — A `<button>` showing hire cost, disabled until affordable, calling `engine.hireStaff('butler')`; emit `unlock` on first hire.
- **E19-S3-T3** — Policy toggles — Checkboxes for `autoBuyAmenities` and `autoCollect` wired to `state.staff.butler.policy`; changes take effect next scheduler tick.
- **E19-S3-T4** — Budget & ROI controls — A slider for `budgetFrac` (5–50%) and `minRoi` (1–10×) with live labels, so players tune how aggressively the butler spends.
- **E19-S3-T5** — Wage readout — Show live "payroll −ƒ/s" in the resource bar next to cash so the sink is always visible (honest UX, no hidden drain).
- **E19-S3-T6** — ROI hint line — When `STAFF.roiHintEnabled`, show "butler earns back its wage in ~Xs" from the recent auto-buy income delta — the epic's core ROI framing.
- **E19-S3-T7** — Level-up button — Show next-level cost and the "+1 category / faster cadence" preview; call `engine.levelStaff('butler')`.
- **E19-S3-T8** — Activity ticker — An `aria-live` line listing the butler's last few actions ("bought Poolside Cocktail Svc ×2") using the S2 events.
- **E19-S3-T9** — Copy & tooltips — Dutch-tourist microcopy on every control ("Let the man work. You are on holiday."); tooltips explain `budgetFrac`/`minRoi`.
- **E19-S3-T10** — Render throttle & a11y — Reuse the 15–30 fps render throttle; ensure toggles are keyboard-focusable and labelled for screen readers per `docs/00 §8`.

## E19-S4 — The Butler (headline new thing)
_As a player drowning in micro-purchases, I want a butler who auto-buys the smart stuff and collects for me, so that idle finally feels idle without giving up control._  The signature E19 feature — bounded, configurable automation.
- **E19-S4-T1** — Wire the full loop — Connect the S2 scheduler + S3 toggles into a single "butler on duty" flow; when hired and a policy is on, the butler acts within its bounds.
- **E19-S4-T2** — Category picker — Let the policy target subsets (amenities only / generators only / both) via `policy.categories[]`; default amenities-only so the early butler is gentle.
- **E19-S4-T3** — "Do not touch" list — Add per-item `pin`/`exclude` so players can reserve a save-up target (e.g. the next accommodation tier) from the butler's budget.
- **E19-S4-T4** — Smart reserve threshold — Auto-buy skips any purchase that would starve payroll (keep ≥ N seconds of wages in reserve), so the butler never bankrupts you.
- **E19-S4-T5** — Auto-collect scope — Define exactly what auto-collect folds in (combo trickle, offline catch-up buffer) and what it never touches (story-gated grants), documented in code.
- **E19-S4-T6** — Butler "mood" seed — Add a lightweight `morale` readout (full detail in E20) that gently modulates cadence, foreshadowing the household system.
- **E19-S4-T7** — First-hire moment — On first hire, fire story beat 19 (*At Your Service*) plus a one-time modal: the butler introduces himself and silently reorganizes your minibar.
- **E19-S4-T8** — Balance guardrail — Cap butler income contribution so it never beats a paying-attention player by more than ~10% (idle convenience, not a win button); assert in the harness.
- **E19-S4-T9** — Flavor content — Write 8–10 butler action quips reused by the ticker ("The Butler has acquired another inflatable. He did not smile.").
- **E19-S4-T10** — QA the loop — Test toggling policies mid-run, hire/refund, pinned items respected, and no double-spend across manual + auto.

## E19-S5 — The Butler's Kit (amenity / small-wins cluster)
_As a player, I want a cluster of butler-adjacent luxuries to unlock, so that there's a steady drip of small wins that also makes automation nicer._  Keeps the "new thing every ~60–90s" cadence alive in the staff era.
- **E19-S5-T1** — Define the kit — Add ~8 amenities to `amenities.js` (`silver_tray, pressed_livery, monogrammed_slippers, midnight_bell, humidor, shoe_shine, ironed_newspaper, standing_valet`), each `{costBase, costGrowth:1.5, comfort, xMult}`.
- **E19-S5-T2** — Automation synergy — Two kit items grant a tiny `−autoBuyInterval` or `+budgetFrac`, so the cluster feeds the headline system, not just Comfort.
- **E19-S5-T3** — Comfort contribution — Feed kit `amenityScore` into `ComfortRaw`; verify the saturating cap still holds at penthouse-scale Comfort.
- **E19-S5-T4** — Targeted multiplier — Small `xMult` via `L_path`/global as appropriate; keep each step ≈2× the last per `AMENITY.growth`.
- **E19-S5-T5** — Unlock reveals — Gate the kit behind beat 19 + a Comfort threshold; emit `unlock` so each appears with a little fanfare.
- **E19-S5-T6** — Flavor copy — One-line Dutch-tourist descriptions ("Monogrammed slippers. The monogram is slightly wrong. Nobody dares mention it.").
- **E19-S5-T7** — UI buttons — Standard amenity buttons: name/cost/owned/next-Comfort delta, plus a note when an item boosts automation.
- **E19-S5-T8** — Balance pass — Confirm one kit item is affordable every ~60–90s of active penthouse play via the harness purchase log.
- **E19-S5-T9** — Save/migration — Persist kit levels; default 0 for old saves; ensure they load into `ComfortRaw` on migrate.
- **E19-S5-T10** — QA — Zero-cash buys, rapid-buy spam, Comfort recompute, and that automation-boost items actually shorten `autoBuyInterval` in-sim.

## E19-S6 — The Ultra Penthouse (accommodation / progression step)
_As a climber, I want to move into the Ultra Penthouse, so that the staff era has a home that visibly outclasses the sail-shaped hotel._  The tier-13 jump that anchors beat 19.
- **E19-S6-T1** — Add tier 13 — In `accommodation.js` add `{tier:13, name:'Ultra Penthouse', accScore:ACC_BASE·ACC_GROWTH^13, unlockComfort, cost}`; a big felt step per `ACC_GROWTH≈2.6`.
- **E19-S6-T2** — Unlock gate — Require the previous tier owned + Comfort ≥ threshold; tie the threshold into `STORY_GATES` alongside beat 19.
- **E19-S6-T3** — Staff-quarters gate — The penthouse is what makes live-in staff plausible; gate the butler hire button behind owning tier 13 (or beat 19, whichever the story wires).
- **E19-S6-T4** — accScore into Comfort — Confirm the new tier feeds `w_acc·accScore` and pushes Comfort toward the next `comfortCap`.
- **E19-S6-T5** — Upgrade layer — Add 3–4 per-tier `L_upgrade` purchases (private lift, skyline glass, wine fridge) using the standard upgrade schema.
- **E19-S6-T6** — Reveal beat text — Write beat-19-adjacent flavor: arriving with a still-damp poncho into a penthouse "with a view of three countries, none of them dry."
- **E19-S6-T7** — UI tier card — Render the tier-up button with cost, Comfort requirement, and the "unlocks: staff" callout.
- **E19-S6-T8** — Balance the step — Tune `ACC.cost[13]` so the tier lands near the beat-19 target (~6:00–6:30 active per `docs/05 §1`); verify with the harness.
- **E19-S6-T9** — Save/migration — Persist `accommodation.tier=13` and `ownedTiers`; migrate old saves that never had tier 13 (default: keep current tier).
- **E19-S6-T10** — QA — Test that owning the penthouse gates staff correctly, Comfort recomputes, and tiers can't be skipped.

## E19-S7 — Service, Your Way (path / branch flavor)
_As a player of any build, I want the butler to automate the things my build cares about, so that automation reinforces my strategy instead of fighting it._  Neutral system that still respects all four branches.
- **E19-S7-T1** — Per-branch default policy — On first hire, seed `policy.categories` from `state.story.branch` (vlogger→content/social, crypto→savvy/generators, traveler→destinations/transport, connoisseur→luxury amenities).
- **E19-S7-T2** — Traveler flavor — Butler can auto-rebook the cheapest positive-ROI destination cycle; reuse the destination purchase intent and respect the traveler `−15%` cost perk.
- **E19-S7-T3** — Vlogger flavor — Butler auto-collects the combo/clout trickle so streamers keep passive Clout while filming; it never boosts `comboMult` itself (active play stays meaningful).
- **E19-S7-T4** — Crypto flavor — Butler auto-reinvests spare cash into the cheapest generator upgrade but honors `minRoi`, so it won't chase a crashing market (ties to E13 events).
- **E19-S7-T5** — Connoisseur flavor — Butler is configured to *pin* appreciating art/wine assets (never auto-sell) and buy only Comfort-positive luxuries, matching old-money taste.
- **E19-S7-T6** — Branch quip content — Write one butler line per branch ("He has learned to hold the ring light. He is not paid enough for the ring light.").
- **E19-S7-T7** — Hybrid handling — If two paths ≥ P1, offer a mixed default policy so combination builds aren't forced to re-toggle everything.
- **E19-S7-T8** — Perk interaction — Ensure branch perks (traveler transport slot, connoisseur exclusivity) flow through automated purchases identically to manual ones.
- **E19-S7-T9** — Balance per branch — Harness each branch with butler-on to confirm no branch gets an outsized automation advantage (stay within the ~10% guardrail).
- **E19-S7-T10** — QA — Switch branches via debug re-spec and confirm the default policy re-seeds sensibly without wiping player overrides.

## E19-S8 — Worth the Wage (balance & tuning)
_As a designer, I want the butler's wage tuned against the time it saves, so that hiring is a real ROI decision, not an obvious yes or an obvious no._  The epic's math contract — automation you weigh, not spam.
- **E19-S8-T1** — Set `STAFF.butler.wageBase` — Calibrate so payroll is ~3–6% of income at hire time; a felt cost that pays back through convenience, not a tax.
- **E19-S8-T2** — Tune `wageGrowth` — Set `1.18` so leveling scales cost faster than benefit past a point, giving a natural "good enough" level.
- **E19-S8-T3** — Set `autoBuyInterval` & `budgetFrac` — Default `2s` / `25%` so the butler is helpful but leaves save-up headroom; document the tradeoff.
- **E19-S8-T4** — ROI break-even model — Add a harness metric: hours-to-payback of hire cost + wages vs incremental income; target break-even within ~5–8 active minutes.
- **E19-S8-T5** — Guardrail assertion — Extend the harness to compare butler-on vs perfect-manual play; assert butler-on ≤ manual + ~10% (idle convenience only).
- **E19-S8-T6** — Cadence check — Confirm auto-buy doesn't collapse the 30–120s "time-to-next-purchase" band into clicker territory; if it does, raise `minRoi`.
- **E19-S8-T7** — Payroll pressure at scale — Simulate late-penthouse to ensure payroll stays a meaningful sink (not trivial), setting up E20's household economy.
- **E19-S8-T8** — Sensitivity sweep — Sweep `wageBase`, `budgetFrac`, `minRoi` in the harness and record the curve so E20 can reuse the calibration.
- **E19-S8-T9** — Golden-file update — Commit the new beat-19 milestone time to the balance golden file so regressions are caught.
- **E19-S8-T10** — Document the knobs — Note the chosen constants and their feel in a `config.js` comment block referencing the `docs/05 §2` levers.

## E19-S9 — Off the Clock (save / migration / offline)
_As a returning player, I want the butler to have worked correctly while I was away, so that offline automation matches online exactly and my save always loads._  Staff state survives; offline is honest.
- **E19-S9-T1** — Persist the staff slice — Ensure `state.staff` serializes in `JSON.stringify(state)` and add it to export/import blob coverage.
- **E19-S9-T2** — Migration function — Add `MIGRATIONS[8]` bumping `version` to 8, injecting a default `staff` slice for pre-staff saves (butler unhired, policies off).
- **E19-S9-T3** — Offline payroll — During offline macro-steps, deduct payroll per step so away-time also pays wages (no free automation); clamp at the cash floor.
- **E19-S9-T4** — Offline auto-buy — Run the butler's policy inside the offline `engine.tick` macro-steps so offline == online purchases (coarse-step accurate, always in the player's favor).
- **E19-S9-T5** — Offline summary line — Add butler activity to the "While you were away…" modal ("Your butler spent ƒ2.1M and paid himself ƒ0.4M").
- **E19-S9-T6** — Cap interaction — Verify offline auto-buy respects `OFFLINE_CAP` and doesn't over-purchase from coarse stepping; round in the player's favor.
- **E19-S9-T7** — Unpaid-away handling — If payroll would exceed away earnings, pause automation partway (as online) rather than going negative; reflect it in the summary.
- **E19-S9-T8** — Backward-compat test — Load fixture saves from versions 5–7, assert migration to 8 yields a valid unhired butler and an unchanged economy.
- **E19-S9-T9** — Round-trip test — Export → import a staff-heavy save; assert byte-stable state and identical post-load simulation.
- **E19-S9-T10** — Corrupt-input guard — A malformed `staff` slice on import falls back to the safe default without nuking the rest of the save (try/catch per `docs/00 §5`).

## E19-S10 — White Gloves (QA / polish / juice)
_As a player, I want the staff system to feel crisp and bug-free, so that automation is a delight rather than a source of doubt._  The trust layer — everything numeric checks out and feels good.
- **E19-S10-T1** — Number formatting — Ensure wages/payroll use `util.format` (scientific/suffix) and never render raw floats; test at 1e3–1e60 scale.
- **E19-S10-T2** — Edge: instant hire+fire — Handle hiring then immediately refunding (if allowed) without leaving orphaned policy state or a ghost wage.
- **E19-S10-T3** — Edge: gameSpeed extremes — Run at `gameSpeed` 0.25 and 1000 and confirm the automation scheduler stays correct (no skipped/duplicated fires).
- **E19-S10-T4** — Event spam control — Batch rapid auto-buy events so the ticker doesn't flood; collapse "bought ×N" within a scheduler tick.
- **E19-S10-T5** — Juice: the bell — A subtle sound/visual cue (respecting `prefers-reduced-motion`) when the butler completes a batch; a purely optional flourish.
- **E19-S10-T6** — Debug panel hooks — Add "grant butler / set level / toggle all policies / force unpaid" to the debug panel for QA per `docs/05 §7`.
- **E19-S10-T7** — Console coverage — Expose butler helpers on `window.IV` so QA can inspect/trigger automation from the console.
- **E19-S10-T8** — Regression suite — Add tests covering the S2–S9 acceptance points; wire them into the existing test runner.
- **E19-S10-T9** — Copy pass — Proofread all butler strings for tone consistency (wry, Dutch-abroad) and length; no `TODO`s shipped.
- **E19-S10-T10** — DoD sign-off — Walk the Definition of Done on a fresh save and a migrated save; file any misses as follow-ups.

## Definition of Done (epic)
- Butler hireable at beat 19 / tier 13; payroll sink live and always visible in the resource bar.
- Auto-buy (bounded, ROI-gated, budget-capped) and auto-collect work online and offline, sharing the manual `buyAmenity`/`buyGenerator` intents.
- Policies configurable (categories, `budgetFrac`, `minRoi`, pins) via a keyboard-accessible panel.
- ROI hint + guardrail: butler-on ≤ perfect-manual + ~10%, verified by the harness; beat-19 time within ±15% of target.
- Staff slice persists, migrates v7→v8, and survives export/import and corrupt input.
- Butler's Kit amenity cluster + Ultra Penthouse (tier 13) ship with reveals and Dutch-tourist copy.
- All staff numbers via `util.format`; debug + console hooks present; tests green.
