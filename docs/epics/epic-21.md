# E21 — Seven Stars
> Act II close (reconvergence) · Accommodation tiers 14–15 (7-Star Experience → Royal Suite) · New system: exclusivity meter as gate & `×` + 7-star cosmetics + "the patron" NPC + branch reconvergence hub · Story beats 21 (*Seven Stars*), 22 (*The Invitation*) · Build-path emphasis: all four branches reconverge

**Epic goal:** Mature the **exclusivity** meter (seeded in E14) into a first-class layer that acts simultaneously as an **unlock gate** and a **global `×`**, deliver the **7-Star Experience** + **Royal Suite**, introduce **"the patron"** NPC (island foreshadow), and run every build through the **beat-22 reconvergence hub** so no branch is stranded.
**Player-visible outcome:** An exclusivity meter with a source breakdown and gate progress; the 7-Star Experience (tier 14) and Royal Suite (tier 15) unlocked behind exclusivity gates; the **Seven-Star Touches** cosmetic amenity cluster; and the patron who appears at beat 21 and formally invites you at beat 22 — a hook toward the private island.
**Systems touched:** new exclusivity data/source registry (`data/exclusivity.js` or `paths.js`); `math.js` (`L_exclusivity` layer + `meetsExclusivity` gate); `config.js` `EXCL` block + `STORY_GATES.C20`; `accommodation.js` tiers 14–15; `data/story.js` beats 21–22 + patron NPC; `ui.js` exclusivity meter + patron modal; `data/amenities.js` Seven-Star Touches.
**Math/balance notes:** `exclusivityRaw = Σ source.weight·source.read(state)` over per-branch sources; `Exclusivity = softcap(exclusivityRaw)` (exp `EXCL.softcapExp`); `L_exclusivity = 1 + EXCL.mult·log10(1 + Exclusivity/EXCL.E0)` inserted into `M_k`; gates `EXCL.gate[14]`, `EXCL.gate[15]`, and the `C20` reconvergence gate; convergence guarantee = every branch's primary source alone clears `gate[14]` within the pacing band, with a universal catch-up trickle preventing stalls.

## E21-S1 — The Exclusivity Ledger (data model)
_As the engine, I want exclusivity defined as a meter fed by named per-branch sources, so that "how exclusive are you" is computed from data that every build can reach._  One meter, four on-ramps, matured from E14.
- **E21-S1-T1** — Exclusivity state — Add `state.exclusivity = { value:0, sources:{} }` (or extend `resources`); keep it serializable and recomputed from sources each tick.
- **E21-S1-T2** — Source registry — Declare `EXCL_SOURCES[]` in a data module: `{id, branch, weight, read(state)}` for Taste, exclusive-destinations, high-tier Clout/fame, net-worth/Savvy, staff prestige, and luxury assets.
- **E21-S1-T3** — Per-branch weighting — Give each branch at least one strong source so `connoisseur→Taste`, `traveler→destinations`, `vlogger→fame`, `crypto→net worth` each independently build exclusivity.
- **E21-S1-T4** — Config `EXCL` block — In `config.js` add `EXCL={ mult, E0, gate:{14:…, 15:…}, sourceWeights:{…}, softcapExp }` as the single tuning source.
- **E21-S1-T5** — Register gates into `STORY_GATES` — Record the exclusivity value for beat 21 and the `C20` reconvergence gate for beat 22 so story and economy agree.
- **E21-S1-T6** — 7-star cosmetic data — Add a `cosmetics` list (gold trim, monogrammed everything, personalized anthem) flagged as exclusivity-cosmetic (visual + tiny prestige), separate from Comfort amenities.
- **E21-S1-T7** — Patron NPC data — Add "the patron" to the `story.js` NPC roster: a recurring, unnervingly wealthy figure who "owns an island you haven't heard of yet" — the island foreshadow seed.
- **E21-S1-T8** — Selectors — Export `exclusivityValue(state)` and `exclusivityBreakdown(state)` (per-source contributions) for UI and gate checks.
- **E21-S1-T9** — Flavor copy — Write exclusivity-tier labels ("Notable" → "Sought-After" → "By Invitation Only") in Dutch-tourist tone.
- **E21-S1-T10** — Validation test — Assert every source has a branch and a `read` fn, and that all four branches are represented (the convergence guarantee starts here).

## E21-S2 — Members Only (core logic / engine)
_As the simulation, I want exclusivity computed, softcapped, and used as both a gate and a global multiplier, so that being exclusive both unlocks and accelerates._  Exclusivity matures into a first-class layer.
- **E21-S2-T1** — Exclusivity computation — Each tick compute `exclusivityRaw = Σ source.weight·source.read(state)`; store per-source contributions for the breakdown UI.
- **E21-S2-T2** — Softcap — Apply `Exclusivity = softcap(exclusivityRaw)` (saturating or `^EXCL.softcapExp`) so no single branch source runs away, per `docs/05 §4`.
- **E21-S2-T3** — `L_exclusivity` multiplier — Add `L_exclusivity = 1 + EXCL.mult·log10(1 + Exclusivity/EXCL.E0)` to the `math.js` multiplier stack as a new global layer (matures the E14 `×`).
- **E21-S2-T4** — Gate check — Implement `meetsExclusivity(state, gate)` used by accommodation unlocks (tiers 14/15) and story beats 21/22.
- **E21-S2-T5** — Wire into `M_k` — Insert `L_exclusivity` into `M_k = … · L_comfort · L_exclusivity · L_ascension · …`, respecting the additive-within / multiplicative-across master rule.
- **E21-S2-T6** — Beat-21 trigger — Fire beat 21 (*Seven Stars*) when tier ≥ 14 (which itself needs the exclusivity gate), so the narrative and the gate align.
- **E21-S2-T7** — Beat-22 trigger — Fire beat 22 (*The Invitation*) when `Comfort ≥ C20` and the exclusivity gate is met — the reconvergence + patron invite.
- **E21-S2-T8** — Events — Emit `exclusivity:changed`, `exclusivity:tierUp`, and `patron:appears` so UI/story react.
- **E21-S2-T9** — Determinism — Ensure exclusivity is a pure function of state (no RNG) so gates are reproducible in the harness.
- **E21-S2-T10** — Engine tests — Test computation, softcap bounds, `L_exclusivity` in `M_k`, and that gates open at the intended values.

## E21-S3 — The Velvet Rope (UI / buttons)
_As a player, I want to see my exclusivity, what feeds it, and how close I am to the next gate, so that reaching 7-star feels like a clear goal._  Makes an abstract meter legible and motivating.
- **E21-S3-T1** — Exclusivity meter — Add a meter to `ui.js` (Spectre progress + label) showing the current value and tier label ("By Invitation Only").
- **E21-S3-T2** — Source breakdown — A small panel listing each source's contribution ("Taste 40%, Destinations 25%, Fame 20%, Net worth 15%") from `exclusivityBreakdown`.
- **E21-S3-T3** — Gate progress — Show progress bars toward the tier-14 and tier-15 exclusivity gates with "need X more" copy.
- **E21-S3-T4** — Multiplier readout — Display the current `L_exclusivity` `×` in the multiplier-stack tooltip so players see exclusivity's income impact.
- **E21-S3-T5** — Branch hint — For low-exclusivity players, show which source their branch can push ("your fastest route: exclusive destinations") — supports convergence.
- **E21-S3-T6** — Cosmetics gallery — A cosmetics section where earned 7-star touches display (gold trim, anthem) with buy buttons.
- **E21-S3-T7** — Patron card — A subtle "the patron is watching" UI element that appears at beat 21 and blooms into the beat-22 invitation.
- **E21-S3-T8** — Copy & tone — Wry labels ("Exclusivity: the front desk now pretends not to recognize you, which is a compliment.").
- **E21-S3-T9** — Reveal choreography — Animate the meter's first appearance and the gate-cleared moment (respect `prefers-reduced-motion`).
- **E21-S3-T10** — A11y & throttle — `aria-live` on gate-cleared and patron events; keyboard-accessible cosmetics buttons; reuse the render throttle.

## E21-S4 — Seven Stars (headline new thing)
_As a player, I want to unlock the 7-star experience where exclusivity gates entry and multiplies my income, so that reaching the top of the hotel ladder feels earned and powerful._  The signature E21 feature — exclusivity as gate & `×`, plus 7-star spectacle.
- **E21-S4-T1** — 7-star unlock — Gate tier 14 (7-Star Experience) behind `meetsExclusivity(state, EXCL.gate[14])` + the prior tier owned; the meter is now a real gate.
- **E21-S4-T2** — Exclusivity `×` live — Turn on `L_exclusivity` as a felt global multiplier at 7-star scale; the payoff for building the meter.
- **E21-S4-T3** — 7-star cosmetics — Ship the cosmetic cluster (gold everything, monogrammed everything, a personal anthem the lobby plays) as buyable prestige touches.
- **E21-S4-T4** — Patron introduction — At beat 21, "the patron" first appears — impossibly at ease, mentioning "a place with no front desk at all" (island foreshadow).
- **E21-S4-T5** — Beat-21 content — Write beat 21 (*Seven Stars*): the still-Dutch tourist realizing the robe costs more than the first motel, and somehow it's fine.
- **E21-S4-T6** — Gate-vs-× duality — Ensure exclusivity works simultaneously as a hard gate (unlock) and a soft multiplier (income) — the epic's core mechanic.
- **E21-S4-T7** — Cosmetic prestige — Give cosmetics a tiny exclusivity feedback (owning them nudges the meter) so spectacle and mechanics reinforce.
- **E21-S4-T8** — Balance the reveal — Tune `EXCL.gate[14]` so 7-star lands near the beat-21 target time (~7:30–8:00 active) for a paying-attention player of any branch.
- **E21-S4-T9** — Flavor content — Write 6–8 exclusivity/patron quips reused across UI and beats.
- **E21-S4-T10** — QA the headline — Test that no branch is hard-blocked from tier 14, `L_exclusivity` applies in `M_k`, and beat 21 + patron fire once.

## E21-S5 — Seven-Star Touches (amenity / small-wins cluster)
_As a player, I want a cluster of absurd ultra-luxury touches to buy, so that the 7-star era keeps its small-win cadence with maximal Dutch-tourist irony._  Cadence + Comfort + a trickle of exclusivity.
- **E21-S5-T1** — Define the cluster — Add ~8 amenities (`gold_leaf_stroopwafel, butler_drawn_bath, pillow_menu, private_elevator_music, monogrammed_bathrobe, caviar_room_service, personal_anthem, rooftop_helipad_umbrella`), each `{costBase, costGrowth:1.5, comfort, xMult, excl?}`.
- **E21-S5-T2** — Exclusivity spillover — A few items add a tiny exclusivity source, so the cluster feeds both Comfort and the meter.
- **E21-S5-T3** — Comfort contribution — Feed `amenityScore` into `ComfortRaw`; verify the saturating cap holds at 7-star Comfort magnitudes.
- **E21-S5-T4** — Targeted multiplier — Small `xMult` via `L_comfort`/global; keep each step ≈2× the last per `AMENITY.growth`.
- **E21-S5-T5** — Unlock reveals — Gate behind tier 14 + exclusivity; emit `unlock` so each ridiculous touch lands as a small win.
- **E21-S5-T6** — Flavor copy — Dutch-tourist one-liners ("Gold-leaf stroopwafel. It tastes exactly like a normal stroopwafel. This is the point.").
- **E21-S5-T7** — UI buttons — Standard amenity buttons with cost/owned/next-Comfort delta, marking items that also raise exclusivity.
- **E21-S5-T8** — Balance pass — Confirm a 7-star touch is affordable every ~90–120s of active late play via the harness log.
- **E21-S5-T9** — Save/migration — Persist levels; default 0 for old saves; recompute Comfort + exclusivity spillover on load.
- **E21-S5-T10** — QA — Zero-cash buys, Comfort recompute, verify exclusivity-spillover items actually move the meter and none grant free offline items.

## E21-S6 — The Royal Suite (accommodation / progression step)
_As a climber, I want the 7-Star Experience and the Royal Suite as tiers 14 and 15, so that the hotel ladder reaches its summit before the private-property era._  The tier-14/15 double-step that caps hotels.
- **E21-S6-T1** — Add tiers 14 & 15 — In `accommodation.js` add `{tier:14,'7-Star Experience'}` and `{tier:15,'Royal Suite'}` with `accScore=ACC_BASE·ACC_GROWTH^t` and exclusivity + Comfort gates.
- **E21-S6-T2** — Exclusivity gates — Tier 14 needs `EXCL.gate[14]`, tier 15 needs `EXCL.gate[15]`; wire both through `meetsExclusivity`.
- **E21-S6-T3** — accScore into Comfort — Confirm both tiers feed `w_acc·accScore` and push Comfort toward a raised `comfortCap`.
- **E21-S6-T4** — Per-tier upgrades — Add `L_upgrade` purchases for each tier (butler-drawn everything, private floor, royal balcony) using the standard schema.
- **E21-S6-T5** — Reveal beats — Write tier-reveal flavor bridging beat 21→22 ("the Royal Suite has a room for your other rooms").
- **E21-S6-T6** — UI tier cards — Render both tier-up buttons with cost, exclusivity requirement, and Comfort requirement.
- **E21-S6-T7** — Ladder handoff — Note in data that tier 16+ (bungalow/villa) shifts to *owned* property (E22), so the Royal Suite is the last *rented* tier.
- **E21-S6-T8** — Balance the steps — Tune `ACC.cost[14..15]` so the double-step paces with beats 21–22 (~8:00–8:30 active) per `docs/05 §1`.
- **E21-S6-T9** — Save/migration — Persist tiers 14/15 and `ownedTiers`; migrate old saves (default: keep current tier); recompute gates on load.
- **E21-S6-T10** — QA — Verify exclusivity gates block/allow correctly, Comfort recomputes, and tiers can't be skipped.

## E21-S7 — Every Road Leads Here (path / branch flavor — reconvergence hub)
_As a player on any branch, I want a guaranteed route to the exclusivity gate and a reconvergence beat, so that no build gets stranded before the summit._  The E21 convergence promise — all four branches qualify and meet the patron.
- **E21-S7-T1** — Per-branch exclusivity route — Verify each branch's primary source (Taste / destinations / fame / net worth) alone can clear `EXCL.gate[14]` within the pacing target — the convergence guarantee.
- **E21-S7-T2** — Convergence assist — If a branch is short, provide a catch-up source (e.g. a universal "reputation" trickle from Comfort/tier) so every build reaches the gate.
- **E21-S7-T3** — Traveler variant — Beat-22 flavor for the grand tourist: the patron's invitation arrives as "a stamp in a passport you didn't hand over."
- **E21-S7-T4** — Vlogger variant — Beat-22 flavor: the patron "does not appear on camera, and asks you, just once, to put it down."
- **E21-S7-T5** — Crypto variant — Beat-22 flavor: the invitation is "an unsolicited transfer with a memo field that just says 'come.'"
- **E21-S7-T6** — Connoisseur variant — Beat-22 flavor: the patron recognizes your wine before you do; old money nods to older money.
- **E21-S7-T7** — Reconvergence hub logic — Implement beat 22 (*The Invitation*) as a hub that all `story.branch` values pass through, setting a shared `flags.invited` regardless of route.
- **E21-S7-T8** — Hybrid handling — For combination builds, let multiple sources sum toward the gate and show a richer patron line (reward for mixing, per `docs/02` hybrid beats).
- **E21-S7-T9** — Patron payoff — The patron's beat-22 line seeds the island (E27) explicitly enough to intrigue, vaguely enough to withhold — the foreshadow contract.
- **E21-S7-T10** — QA convergence — Harness all four pure branches + two hybrids; assert each reaches beat 22 within ±15% of target and `flags.invited` is set.

## E21-S8 — Setting the Bar (balance & tuning)
_As a designer, I want exclusivity gates and the multiplier tuned so every branch qualifies on time and none dominates, so that reconvergence is fair and the summit paces right._  The epic's math contract — a fair gate and a bounded `×`.
- **E21-S8-T1** — Set `EXCL.gate[14/15]` — Calibrate the two gates to land tiers 14/15 near the beats 21–22 targets for the *slowest* qualifying branch.
- **E21-S8-T2** — Tune `EXCL.mult` & `E0` — Set the multiplier so exclusivity contributes ~1.5–3× by the 7-star era without overshadowing the Comfort/path layers.
- **E21-S8-T3** — Tune `softcapExp` — Pick the exclusivity softcap exponent so a whale in one branch can't trivially blow past the gate, per anti-runaway rules.
- **E21-S8-T4** — Source-weight balance — Tune per-branch source weights so all four clear the gate within a tight time band (the convergence fairness target).
- **E21-S8-T5** — Catch-up calibration — Size the universal reputation trickle (S7-T2) so a neglected branch still qualifies but focused play is faster.
- **E21-S8-T6** — Cadence guard — Confirm the 7-star era keeps the 30–120s purchase band and 90–120s amenity cadence; adjust cluster costs if needed.
- **E21-S8-T7** — Interaction check — Verify `L_exclusivity` stacks cleanly with staff (E20) and Comfort layers without a combined runaway.
- **E21-S8-T8** — Harness convergence sweep — Sweep gate values and source weights across all branches; record the spread and pick values minimizing branch-time variance.
- **E21-S8-T9** — Golden-file update — Commit beats 21 & 22 milestone times and the exclusivity curve to the balance golden file.
- **E21-S8-T10** — Document knobs — Comment the `EXCL` constants and the convergence rationale in `config.js`, referencing `docs/05 §2` and the `docs/02` reconvergence.

## E21-S9 — Provenance on File (save / migration / offline)
_As a returning player, I want my exclusivity, cosmetics, and patron progress preserved, so that the summit state is durable and offline-correct._  The new meter and NPC state survive.
- **E21-S9-T1** — Persist exclusivity — Ensure `state.exclusivity` (and cosmetic ownership, patron flags) serialize and export; recompute value from sources on load.
- **E21-S9-T2** — Migration `MIGRATIONS[10]` — Bump `version` to 10; add default `exclusivity`, `cosmetics`, and patron flags to v9 saves (value 0, patron unseen).
- **E21-S9-T3** — Recompute-on-load — Since exclusivity is derived, recompute it from sources at load rather than trusting the stored number (avoids drift/exploits).
- **E21-S9-T4** — Offline exclusivity — During offline macro-steps, recompute exclusivity each step so gates can open offline exactly as online.
- **E21-S9-T5** — Offline gate opens — If exclusivity crosses a gate while away, queue the tier-14/15 unlock and beats 21/22 for the return summary (no silent skips).
- **E21-S9-T6** — Away summary — Add exclusivity movement and any patron appearance to the "While you were away…" modal.
- **E21-S9-T7** — Cosmetic persistence — Ensure purchased 7-star cosmetics persist and their tiny exclusivity spillover reapplies on load.
- **E21-S9-T8** — Backward-compat test — Load v7/v8/v9 fixtures; assert migration to v10 yields exclusivity=recomputed, patron unseen, tiers intact.
- **E21-S9-T9** — Round-trip test — Export/import a summit save; assert identical exclusivity, cosmetics, and post-load simulation.
- **E21-S9-T10** — Corrupt-input guard — Malformed exclusivity/patron data falls back to safe defaults (recompute value, patron unseen) without losing the rest of the save.

## E21-S10 — The Invitation (QA / polish / juice)
_As a player, I want the 7-star summit and the patron's invitation to feel like a landmark moment, so that reconvergence reads as a payoff, not a menu event._  The trust-and-spectacle layer capping Act II.
- **E21-S10-T1** — Number formatting — Exclusivity, gates, and `L_exclusivity` via `util.format`; test across a 1e0–1e6 meter and 1e60 income scales.
- **E21-S10-T2** — Edge: gate boundary — Test exactly-at-gate and just-below values to confirm no off-by-one lets an under-qualified build in (or wrongly blocks one).
- **E21-S10-T3** — Edge: branch starvation — Verify a deliberately mono-source, low build still eventually clears via catch-up (no permanent stall).
- **E21-S10-T4** — Edge: gameSpeed extremes — Run at `gameSpeed` 0.25 and 1000; confirm exclusivity recompute and gate/beat firing stay correct.
- **E21-S10-T5** — Patron modal — Build the beat-22 invitation modal: the patron, the island foreshadow, and one choice that sets `flags.invited` regardless (reconvergence).
- **E21-S10-T6** — Juice: gate-cleared moment — A restrained flourish when a 7-star gate clears and when the patron appears (respect `prefers-reduced-motion`).
- **E21-S10-T7** — Debug hooks — Add "grant exclusivity / open gate 14/15 / summon patron / jump to beat 22" to the debug panel.
- **E21-S10-T8** — Console coverage — Expose the exclusivity value/breakdown and patron flags on `window.IV`.
- **E21-S10-T9** — Copy pass — Proofread all exclusivity, cosmetic, patron, and beat 21/22 strings for tone (wry, absurd-luxury) and the ≤90-word beat limit.
- **E21-S10-T10** — DoD sign-off — Run the epic DoD on fresh, migrated, and each-branch saves; confirm beats 21/22 fire, the patron appears, and every branch qualifies; log misses.

## Definition of Done (epic)
- Exclusivity meter computed from per-branch sources, softcapped, working simultaneously as a **gate** (tiers 14/15, beats 21/22) and a **global `×`** (`L_exclusivity` in `M_k`).
- 7-Star Experience (tier 14) and Royal Suite (tier 15) unlock behind exclusivity gates; the 7-star cosmetic cluster + Seven-Star Touches amenities ship with reveals.
- "The patron" NPC introduced at beat 21 and delivers beat 22 (*The Invitation*), foreshadowing the island (E27).
- Branch reconvergence hub guarantees all four branches (and hybrids) qualify within the pacing band; the catch-up source prevents stalls; the harness confirms low branch-time variance.
- Exclusivity gates/multiplier tuned; beats 21 & 22 within ±15% of target; golden file updated.
- Exclusivity/cosmetic/patron state persists, migrates v9→v10 (recompute-on-load), survives offline (offline gate opens + summary), export/import, and corrupt input.
- All numbers via `util.format`; debug + console hooks; keyboard-accessible meter and patron modal; tests green.
