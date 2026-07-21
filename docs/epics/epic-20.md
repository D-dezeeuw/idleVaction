# E20 — The Whole Household
> Act II late (staff era) · Accommodation tier 13 (Ultra Penthouse + Service Wing) · New system: multiple staff roles mapped to subsystems + morale softcap + payroll scaling · Story beat 20 (*The Whole Household*) · Build-path emphasis: neutral (each build weights the household differently)

**Epic goal:** Build a full **household** — chef, trainer, driver, social manager, and housekeeper — where **each role automates one subsystem** and applies a small global `×`, gated by **morale** and paid for by a **scaling payroll**.
**Player-visible outcome:** Five hireable roles (chef→Comfort, trainer→Body, driver→logistics, manager→Clout, housekeeper→morale/upkeep), a household board with morale bars, the **Service Wing** that raises the staff cap, and the **Staff Quarters** amenity cluster — beat 20 fires at staff ≥ 5.
**Systems touched:** `data/staff.js` (more roles) reusing the E19 schema; `engine.js` (per-role subsystem `×`, morale dynamics, payroll aggregation, staff cap); `math.js` (`moraleMult`, subsystem routing); `config.js` (`STAFF.roles`, `MORALE`); `ui.js` household board; `accommodation.js` Service Wing; `data/story.js` beat 20; `data/amenities.js` Staff Quarters.
**Math/balance notes:** each role feeds its subsystem's existing layer (chef→`L_comfort`, trainer→Body/`L_skill`, driver→logistics `×`, manager→Clout gain); `moraleMult(m)=clamp(1+MORALE.rate·log10(1+m/MORALE.M0), MORALE.min, MORALE.max)` — a softcap; role effect `= xMultBase·level·moraleMult`; total payroll `= Σ staffWage` scales with headcount and level as a real sink (~8–15% of income at a full leveled household).

## E20-S1 — The Roster (data model)
_As the engine, I want every household role defined as data with a subsystem, wage curve, morale, and automation policy, so that adding roles never touches engine code._  Five roles (and future ones) from one schema.
- **E20-S1-T1** — Extend `STAFF_DATA` — Add `chef, trainer, driver, manager, housekeeper` entries, each `{id, role, subsystem, wageBase, wageGrowth, xMultBase, levelCostBase, levelCostGrowth, policies[]}`, reusing the E19 staff schema.
- **E20-S1-T2** — Map roles to subsystems — Set `subsystem`: chef→`comfort`, trainer→`body`, driver→`logistics`, manager→`clout`, housekeeper→`morale`; this field drives which layer the role's `×` feeds.
- **E20-S1-T3** — Per-role automation policies — Chef auto-buys Comfort amenities, trainer auto-spends on Body training, driver auto-cycles destinations/transport, manager auto-collects Clout/sponsors; declare each as data policies.
- **E20-S1-T4** — Role multiplier data — Give each role `xMultBase` (~`0.05`/level) marking a small global `×` on its subsystem, per the "each role = a small global `×`" note.
- **E20-S1-T5** — Morale fields — Add `morale` (0–100) plus `moraleDecay`/`moraleGain` params to each role's state; default 100 on hire.
- **E20-S1-T6** — Wage curves per role — Set distinct `wageBase`/`wageGrowth` so roles have different economics (a chef is cheaper than a social manager).
- **E20-S1-T7** — Role flavor copy — Write hire blurbs: the chef "makes stroopwafels that could end wars," the driver "has strong opinions about roundabouts."
- **E20-S1-T8** — Config roles table — In `config.js` add `STAFF.roles={chef:{…}, trainer:{…}, driver:{…}, manager:{…}, housekeeper:{…}}` and `MORALE={rate, M0, min, max, decayPerHour}`.
- **E20-S1-T9** — Selectors — Extend `getHiredStaff`/`getStaffDef` and add `getStaffBySubsystem(subsystem)` so the engine can sum a subsystem's staff `×`.
- **E20-S1-T10** — Validation test — Assert every role maps to a known subsystem and has a policy; extend the E19 data-validation test.

## E20-S2 — Everyone Has a Job (core logic / engine)
_As the simulation, I want each role to apply its subsystem multiplier, run its automation, and be modulated by morale, so that a household meaningfully accelerates the whole economy._  Staff become the mid-game engine multiplier.
- **E20-S2-T1** — Subsystem multiplier application — In `math.js`, sum hired-staff `×` per subsystem into the right layer: chef→`L_comfort`, trainer→Body level/`L_skill`, driver→logistics `×` on travel/destinations, manager→Clout gain.
- **E20-S2-T2** — Morale multiplier — Implement `moraleMult(m)=clamp(1+MORALE.rate·log10(1+m/MORALE.M0), MORALE.min, MORALE.max)`; a softcap so morale helps but never explodes, per `docs/05 §4`.
- **E20-S2-T3** — Effective role output — Role effect `= xMultBase·level·moraleMult`; low morale visibly weakens a role, high morale gives diminishing returns (the softcap).
- **E20-S2-T4** — Morale dynamics — Each tick drift morale toward a target set by pay status (unpaid → down), Staff-Quarters amenities (up), and overwork (many active policies → slow decay).
- **E20-S2-T5** — Per-role automation — Route each role's policies through the E19 scheduler; chef/trainer/driver/manager each act on their own subsystem using the shared purchase intents.
- **E20-S2-T6** — Payroll aggregation — Sum wages across all hired staff into the single payroll sink; expose `totalPayroll(state)` for UI and harness.
- **E20-S2-T7** — Staff cap — Enforce a `staffCap` (raised by the Service Wing, S6); block hiring past cap with a clear reason.
- **E20-S2-T8** — Housekeeper special-case — The housekeeper's `×` targets morale/upkeep: it reduces other roles' morale decay and trims amenity upkeep — a force-multiplier role.
- **E20-S2-T9** — Events — Emit `staff:hired`, `staff:morale`, and `staff:subsystem` events so UI/story (beat 20 at staff ≥ 5) can react.
- **E20-S2-T10** — Engine tests — Test subsystem routing (chef raises Comfort, not Clout), morale clamp bounds, payroll aggregation, and cap enforcement.

## E20-S3 — The Household Board (UI / buttons)
_As a player, I want one board showing every role's level, morale, wage, and automation, so that managing five staff is glanceable, not fiddly._  Scales the E19 panel to a household without clutter.
- **E20-S3-T1** — Board layout — Extend the Staff card into a grid of role tiles (Spectre cards), each with name, subsystem icon, level, morale bar, and wage/s.
- **E20-S3-T2** — Hire buttons — Per-role hire button with cost and subsystem-benefit preview; disabled until affordable or over `staffCap`.
- **E20-S3-T3** — Level buttons — Per-role level-up with next-cost and "+×/subsystem, faster automation" preview.
- **E20-S3-T4** — Morale bars — Color-coded morale bar with a tooltip breaking down decay/gain sources (pay, quarters, overwork).
- **E20-S3-T5** — Total payroll readout — Show aggregate "household payroll −ƒ/s" prominently; the honest cost of the whole staff.
- **E20-S3-T6** — Per-role policy toggles — Compact toggles for each role's automation, reusing the E19 policy controls.
- **E20-S3-T7** — Subsystem summary — A small "your staff currently multiply: Comfort ×A, Body ×B, Clout ×C, logistics ×D" panel so players see the combined effect.
- **E20-S3-T8** — Cap indicator — Show `hired/staffCap` and what raises the cap (Service Wing), tying into beat 20's "staff ≥ 5."
- **E20-S3-T9** — Copy & tone — Wry labels and tooltips ("Morale: the chef has not seen the sun since Tuesday."); keep it warm and self-deprecating.
- **E20-S3-T10** — A11y & throttle — Keyboard-navigable tiles, `aria-live` morale warnings, reuse the render throttle; verify no layout thrash at 5+ roles.

## E20-S4 — A Full Household (headline new thing)
_As a player, I want to hire a chef, trainer, driver, and social manager who each run one subsystem for me, so that the whole game idles intelligently and beat 20 fires._  The signature E20 feature — a self-running household.
- **E20-S4-T1** — Chef → Comfort — Chef auto-buys the highest-ROI Comfort amenities and applies a Comfort `×`; the kitchen finally runs itself.
- **E20-S4-T2** — Trainer → Body — Trainer auto-spends energy/cash on Body training and adds a Body `×`, keeping the wellness loop ticking (ties to E10).
- **E20-S4-T3** — Driver → logistics — Driver auto-cycles destinations/transport for the best travel `×`, honoring the upkeep sinks from E15–E17.
- **E20-S4-T4** — Manager → Clout — Social manager auto-collects content/sponsor income and boosts Clout gain (ties to E12), so vloggers idle their audience.
- **E20-S4-T5** — Housekeeper → glue — Housekeeper raises household morale and cuts upkeep, making the other four more effective — the "hire this to fix everything" role.
- **E20-S4-T6** — Beat-20 trigger — When `hired ≥ 5`, fire story beat 20 (*The Whole Household*) with a modal: five staff, one still-damp poncho, "the help now outnumbers the luggage."
- **E20-S4-T7** — Combined-effect balance — Ensure the stacked subsystem `×`s multiply cleanly across layers (per `docs/01 §3` master rule) without any single role dominating.
- **E20-S4-T8** — Automation coexistence — Multiple roles' policies share the scheduler and budget without fighting (no two roles buying the same item twice in a tick).
- **E20-S4-T9** — Household flavor — Write ensemble quips ("The driver and the chef are not speaking. The Comfort rating is, somehow, up.").
- **E20-S4-T10** — QA the ensemble — Test hiring all five, verify each subsystem `×` applies, beat 20 fires exactly once, and no double-purchases occur.

## E20-S5 — Staff Quarters (amenity / small-wins cluster)
_As a player, I want amenities that keep my staff happy and sharp, so that there's a small-win cluster that also lifts the whole household's output via morale._  Cadence + a lever on the morale softcap.
- **E20-S5-T1** — Define the cluster — Add ~8 amenities (`staff_kitchen, bunk_upgrade, day_off_rota, proper_uniforms, coffee_machine, staff_lounge, holiday_bonus, birthday_cake`), each `{costBase, costGrowth:1.5, comfort?, moraleGain}`.
- **E20-S5-T2** — Morale contribution — Each item raises the household `moraleTarget` or slows decay, feeding `moraleMult`; the cluster's real payoff.
- **E20-S5-T3** — Comfort spillover — A couple of items also add a small `amenityScore` (nice quarters make a nicer home), keeping them dual-purpose.
- **E20-S5-T4** — Diminishing design — Tune so stacking quarters hits the morale softcap gracefully (no infinite morale), per `docs/05 §4`.
- **E20-S5-T5** — Unlock reveals — Gate behind beat 20 + staff count; emit `unlock` so each staff perk lands as a small win.
- **E20-S5-T6** — Flavor copy — Dutch-tourist one-liners ("Holiday bonus: everyone gets a stroopwafel and a firm handshake.").
- **E20-S5-T7** — UI buttons — Standard amenity buttons showing cost/owned and the morale delta (not just Comfort).
- **E20-S5-T8** — Balance pass — Confirm a quarters item is affordable every ~60–120s in the staff era and that morale gain matches the softcap targets.
- **E20-S5-T9** — Save/migration — Persist quarters levels; default 0 for old saves; recompute the morale target on load.
- **E20-S5-T10** — QA — Zero-cash buys, morale recompute, verify morale can't exceed `MORALE.max` and quarters actually slow decay in-sim.

## E20-S6 — The Service Wing (accommodation / progression step)
_As a player, I want to add a staff wing to the penthouse, so that I can house more staff and raise the staff cap and morale ceiling._  The epic's progression step — property that scales the household.
- **E20-S6-T1** — Service Wing upgrade — Add a penthouse property upgrade in `accommodation.js` that raises `staffCap` (e.g. +3/level) and the morale ceiling; costs scale on `ACC`-style growth.
- **E20-S6-T2** — Gate — Require tier 13 owned + a Comfort/beat-20 threshold; reveal after the household board exists.
- **E20-S6-T3** — staffCap wiring — Connect the wing's `staffCap` bonus into the S2 cap check so hiring past 5 requires the wing.
- **E20-S6-T4** — Morale ceiling — The wing raises `MORALE.max` locally (better lodging = happier staff), a second lever on the softcap.
- **E20-S6-T5** — Comfort contribution — Wing adds `accScore`/`amenityScore` so it also nudges the player's own Comfort.
- **E20-S6-T6** — Reveal copy — Beat-20-adjacent flavor: converting the panic room into a staff wing, "because a happy chef is a loyal chef."
- **E20-S6-T7** — UI — Render the wing upgrade with cost, `staffCap` delta, and morale-ceiling delta.
- **E20-S6-T8** — Balance — Tune wing cost/effect so growing the household stays a deliberate investment, not a runaway; check payroll pressure keeps pace.
- **E20-S6-T9** — Save/migration — Persist wing level; default 0 for old saves; recompute `staffCap`/`MORALE.max` on load.
- **E20-S6-T10** — QA — Verify hiring gates on wing level, the morale ceiling raises correctly, and Comfort recomputes.

## E20-S7 — Household to Taste (path / branch flavor)
_As a player of any build, I want my household weighted toward the roles my branch needs, so that staffing reinforces my strategy._  Neutral system with branch-aware defaults.
- **E20-S7-T1** — Branch hiring hints — Suggest a role priority per branch (vlogger→manager first, traveler→driver, crypto→manager+trainer for uptime, connoisseur→chef+housekeeper).
- **E20-S7-T2** — Traveler flavor — Driver gets extra travel `×` under the traveler perk and auto-uses the `+1` transport slot; "he knows a shortcut through every border."
- **E20-S7-T3** — Vlogger flavor — Manager amplifies Clout gain (stacks with the `×1.25` perk) and auto-collects sponsor combos; "your manager reads the comments so you don't have to."
- **E20-S7-T4** — Crypto flavor — Trainer/housekeeper keep uptime so the Savvy passive runs untended; manager can auto-reinvest within `minRoi`, dodging crash-chasing.
- **E20-S7-T5** — Connoisseur flavor — Chef's Comfort `×` stacks with the luxury `+25%` Comfort perk; housekeeper protects appreciating assets (never auto-sells).
- **E20-S7-T6** — Branch quip content — One ensemble line per branch tying the staff to the fantasy.
- **E20-S7-T7** — Hybrid households — For combination builds, allow a balanced default weighting so no branch's roles are starved.
- **E20-S7-T8** — Perk pass-through — Verify branch perks apply to staff-driven subsystem `×`s identically to manual play.
- **E20-S7-T9** — Balance per branch — Harness each branch with a full household; assert subsystem stacking stays within the anti-runaway softcaps.
- **E20-S7-T10** — QA — Re-spec the branch in debug and confirm hiring hints and role `×`s update correctly.

## E20-S8 — Payroll at Scale (balance & tuning)
_As a designer, I want morale, per-role `×`, and payroll scaling tuned together, so that a big household is powerful but self-limiting._  The epic's math contract — staff accelerate without breaking the 20h curve.
- **E20-S8-T1** — Set `MORALE` constants — Tune `rate`, `M0`, `min`, `max` so morale swings ~0.7×–1.3× effectiveness; a real but bounded lever.
- **E20-S8-T2** — Per-role `xMultBase` — Calibrate each role's `×` (~+5%/level) so five roles combine to a meaningful but not runaway multiplier across layers.
- **E20-S8-T3** — Payroll scaling — Tune wage curves so total payroll grows to ~8–15% of income at a full leveled household — a genuine sink per the `docs/01` payroll design.
- **E20-S8-T4** — Morale-vs-pay coupling — Balance decay so neglecting pay/quarters visibly costs output, making morale management a real choice.
- **E20-S8-T5** — Cap-vs-cost — Tune Service Wing cost against `staffCap` so scaling the household paces with beat 20 (~6:30 active) and the pre-reconvergence pressure.
- **E20-S8-T6** — Cadence guard — Confirm household automation keeps the 30–120s purchase band and doesn't collapse into no-input play; raise per-role `minRoi` if needed.
- **E20-S8-T7** — Anti-runaway check — Verify stacked subsystem `×`s obey the softcaps (Comfort saturating, path `^0.85`), so no single subsystem explodes.
- **E20-S8-T8** — Harness sweep — Sweep morale and payroll constants; record the curve and pick values hitting beat 20 within ±15% of target.
- **E20-S8-T9** — Golden-file update — Commit the beat-20 milestone and the household-on curve to the balance golden file.
- **E20-S8-T10** — Document knobs — Comment the chosen `MORALE`/role/payroll constants in `config.js` with `docs/05 §2` lever references.

## E20-S9 — The Night Shift (save / migration / offline)
_As a returning player, I want my whole household to have worked and been paid correctly while away, so that offline multi-role automation matches online and my save always loads._  Multi-role state is durable and offline-honest.
- **E20-S9-T1** — Persist all roles — Ensure the expanded `state.staff` (5+ roles, morale, levels, policies) serializes and exports fully.
- **E20-S9-T2** — Migration `MIGRATIONS[9]` — Bump `version` to 9; add default entries for the new roles to v8 (butler-only) saves, unhired with full morale.
- **E20-S9-T3** — Offline payroll aggregate — Deduct total household payroll across offline macro-steps; clamp at the cash floor; pause automation if unpayable (mirrors online).
- **E20-S9-T4** — Offline per-role automation — Run every role's policy inside the offline `engine.tick` steps so offline == online for the whole household.
- **E20-S9-T5** — Offline morale drift — Advance morale over away-time (pay status, no quarters interaction) so you can return to grumpy staff if you left them unpaid.
- **E20-S9-T6** — Away summary — Extend the "While you were away…" modal with per-subsystem gains and total wages paid ("chef spent ƒX, morale dipped to 78%").
- **E20-S9-T7** — Cap/coarse-step safety — Ensure offline hiring never happens and coarse stepping doesn't over-apply role `×`s; round in the player's favor.
- **E20-S9-T8** — Backward-compat test — Load v7 (pre-staff) and v8 (butler-only) fixtures; assert clean migration to v9 with a valid household.
- **E20-S9-T9** — Round-trip test — Export/import a full-household save; assert identical state and post-load simulation.
- **E20-S9-T10** — Corrupt-input guard — Malformed role entries fall back to defaults per-role without discarding the rest of the save.

## E20-S10 — Downstairs Harmony (QA / polish / juice)
_As a player, I want the household to run smoothly and feel characterful, so that managing five staff is satisfying, not stressful._  The trust-and-delight layer for the household.
- **E20-S10-T1** — Number formatting — All wages, payroll totals, and role `×`s via `util.format`; test across 1e3–1e60.
- **E20-S10-T2** — Edge: mass hire/level — Hire and level all roles in one frame; assert no event storm, no NaN morale, no double-charge.
- **E20-S10-T3** — Edge: morale floor/ceiling — Drive morale to 0 and to max; confirm `moraleMult` clamps and roles still behave sanely.
- **E20-S10-T4** — Edge: gameSpeed extremes — Run household automation at `gameSpeed` 0.25 and 1000; confirm the scheduler and morale drift stay correct.
- **E20-S10-T5** — Event batching — Collapse per-role auto-buy spam in the ticker so five active roles don't flood the log.
- **E20-S10-T6** — Juice: morale reactions — Small visual/text reactions when morale crosses thresholds (respect `prefers-reduced-motion`).
- **E20-S10-T7** — Debug hooks — Add "hire full household / set morale / max levels / force unpaid" to the debug panel for QA.
- **E20-S10-T8** — Console coverage — Expose household selectors and morale on `window.IV` for console inspection.
- **E20-S10-T9** — Copy pass — Proofread all role/morale/quarters strings for tone and length; no placeholders shipped.
- **E20-S10-T10** — DoD sign-off — Run the epic DoD on fresh and migrated saves; confirm beat 20 and the staff ≥ 5 gate; log any misses.

## Definition of Done (epic)
- Five household roles (chef→Comfort, trainer→Body, driver→logistics, manager→Clout, housekeeper→morale/upkeep) hireable, each applying a subsystem `×` + automation.
- Morale softcap (`moraleMult` clamped) modulates role output; pay / quarters / overwork drive morale.
- Payroll scales with headcount and level as a meaningful sink; the Service Wing raises `staffCap` + morale ceiling.
- Beat 20 (*The Whole Household*) fires at staff ≥ 5; the household board is glanceable and keyboard-accessible.
- Staff Quarters amenity cluster ships with morale-focused small wins and reveals.
- Branch-aware hiring hints; the harness confirms each branch stays within anti-runaway softcaps; beat-20 time within ±15%.
- Multi-role state persists, migrates v8→v9, survives offline (payroll + per-role automation + morale drift), export/import, and corrupt input.
- All numbers via `util.format`; debug + console hooks; tests green.
