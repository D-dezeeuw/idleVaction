# E09 — Charm Offensive
> Act I → Act II hinge · Tier 8 (Boutique Retreat) · Skills system (`skills.js`): Charisma & Communication · Beats 10 (*Poolside Persona*) + 11 seed (*Fork in the Lobby*) · Path: vlogger-leaning

**Epic goal:** Open the personal-growth **skills** system with its first two attributes — **Charisma** (social income `×`) and **Communication** (purchase-cost discount) — driven by an XP→level curve, and reach the Boutique Retreat.
**Player-visible outcome:** A Skills panel with two leveling attributes, XP bars, and training purchases; charm now multiplies social income and communication shaves costs (down to −60%).
**Systems touched:** `data/skills.js` (new), `math.js` (`xpToNext`, level solver, discount clamp), `engine.js` (XP/level tick + `L_skill` wiring), `ui.js` (skills panel), `data/accommodation.js` (tier 8), `data/story.js` (beats 10 / 11 seed), `config.js` (`SKILL.*`, `CHARISMA_RATE`), `state.js` (skills migration).
**Math/balance notes:** `xpToNext(level) = SKILL_BASE·SKILL_GROWTH^level` (e.g. `50·1.25^L`); `level = largest L with Σ_{i<L} xpToNext(i) ≤ xp`; Charisma income `L_skill = 1 + CHARISMA_RATE·L` (`CHARISMA_RATE=0.03`) on social tiers; Communication `costMult = clamp(1 − 0.005·level, 0.4, 1)` (discount clamped to −60%); passive XP via `SKILL.rate`.

## E09-S1 — Skills Data Model
_As a systems engineer, I want skills defined as data with their XP curves and effects, so that adding future attributes (Body, Taste, Savvy) stays declarative._  The blueprint for the whole attribute system.
- **E09-S1-T1** — Create `js/data/skills.js` — Add the module with a canonical skills array, exported for `state`/`engine`, following the `data/*` declarative convention.
- **E09-S1-T2** — Define the Charisma entry — `{id:'charisma', name:'Charisma', xpSources:['social','story'], effect:{type:'incomeMult', scope:'social', rate:CHARISMA_RATE}}`.
- **E09-S1-T3** — Define the Communication entry — `{id:'comms', name:'Communication', xpSources:['vlog','negotiation'], effect:{type:'costDiscount', per:0.005, clamp:0.4}}` (the −60% floor).
- **E09-S1-T4** — Reference `SKILL_BASE`/`SKILL_GROWTH` — Point each skill's curve at `config.SKILL.base` (50) and `config.SKILL.growth` (1.25) rather than inlining numbers.
- **E09-S1-T5** — Define training-purchase data — Add `train_charisma`/`train_comms` items granting XP bursts for cash, each with its own `costBase`/`costGrowth` so spend buys progress.
- **E09-S1-T6** — Add passive XP-rate fields — Give each skill a `passiveRate` tied to `SKILL.rate` so XP trickles from relevant activity (social income for Charisma, purchases for Comms).
- **E09-S1-T7** — Author skill flavor copy — Wry `desc` lines ("Charisma: convincing a maître d' your poncho is vintage") as data.
- **E09-S1-T8** — Declare unlock gates — Mark the skills unlocked at beat 10 / tier 8 so the panel appears at the right story moment.
- **E09-S1-T9** — Add effect-preview metadata — Include human-readable effect templates ("+3% social income per level"; "−0.5% costs per level, max −60%") for the UI.
- **E09-S1-T10** — Data-integrity test — Assert unique IDs, valid `effect.type`, curve params resolving to `config.SKILL.*`, and the Comms `clamp` = 0.4.

## E09-S2 — The XP→Level Engine
_As the engine, I want a correct, testable XP→level curve and effect application, so that skills feed the multiplier stack exactly as `docs/01 §4` specifies._  The mathematical heart of personal growth.
- **E09-S2-T1** — Implement `xpToNext(level)` — In `math.js`, `xpToNext(level) = SKILL_BASE·SKILL_GROWTH^level` as a pure function.
- **E09-S2-T2** — Implement the level solver — `level = largest L with Σ_{i<L} xpToNext(i) ≤ xp`; use the cumulative loop, returning level plus progress-to-next.
- **E09-S2-T3** — Accumulate passive XP per tick — In `engine.tick`, add `passiveRate·(relevant activity)·dt·SKILL.rate` to each skill's `xp`, scaled by its driving quantity (social income for Charisma).
- **E09-S2-T4** — Detect level-ups & emit `levelup` — After XP accrual, recompute level; if it rose, emit a `levelup` event for UI juice and unlock checks.
- **E09-S2-T5** — Wire Charisma into `L_skill` — Compute `L_skill(social) = 1 + CHARISMA_RATE·charismaLevel` and apply it to social tiers (D2/D3) in the multiplier stack.
- **E09-S2-T6** — Wire the Communication discount — Compute `costMult = clamp(1 − 0.005·commsLevel, 0.4, 1)` and apply it to every purchase cost in `engine.buyAmenity` and generator buys.
- **E09-S2-T7** — Implement training purchases — Add `engine.trainSkill(id)` that spends cash and grants an XP burst, respecting the Comms discount on its own cost.
- **E09-S2-T8** — Ensure discount ordering — Apply `costMult` after base `cost(n)=base·growth^n` and before affordability checks so previews and buys agree.
- **E09-S2-T9** — Keep XP math finite & monotonic — Guard against negative XP, ensure level is monotonic non-decreasing, and cap per-tick XP to avoid speed-induced overflow.
- **E09-S2-T10** — Unit-test the curve & effects — Test `xpToNext` values, cumulative level boundaries, Charisma `×` at sample levels (L20 → 1.60), and the discount clamp flooring at 0.4.

## E09-S3 — The Skills Panel UI
_As a player, I want a Skills panel with XP bars and training buttons, so that leveling my charm and communication is legible and satisfying._  Makes an invisible system tangible.
- **E09-S3-T1** — Build the Skills card — Render a Spectre card in `ui.js` listing Charisma and Communication, hidden until beat 10 / tier 8.
- **E09-S3-T2** — Render XP progress bars — Show each skill's level, current XP, and `xpToNext(level)` as a filling bar via `util.format`.
- **E09-S3-T3** — Show live effect readouts — Display "Social income ×1.60 (L20)" for Charisma and "Costs −10% (max −60%)" for Communication.
- **E09-S3-T4** — Render training buttons — Buy-buttons for `train_charisma`/`train_comms` showing cost (post-Comms-discount) and XP granted, wired to the train intent.
- **E09-S3-T5** — Preview the next-level effect — Show the delta the next level grants ("+3% social income") so training feels purposeful.
- **E09-S3-T6** — Add level-up flourish — On `levelup`, flash the bar and pop a small "Charisma L21!" toast (motion-query gated).
- **E09-S3-T7** — `aria-live` skill announcements — Announce level-ups and effect changes through the live region.
- **E09-S3-T8** — Add a discount-cap indicator — When Communication hits −60%, show a "maxed" badge so players know further levels stop discounting (but still earn other unlocks).
- **E09-S3-T9** — Disable training on low cash — Grey buttons when unaffordable; re-enable on `state:changed`.
- **E09-S3-T10** — Snapshot-test the card — Render from a fixture asserting bars, effect readouts, the discount-cap badge, and locked/revealed state.

## E09-S4 — Charisma & Communication (headline new thing)
_As a self-improving tourist, I want two attributes that make me richer and thriftier, so that "personal growth" becomes a real economic lever alongside amenities._  The signature systems of the epic.
- **E09-S4-T1** — Finalize Charisma's effect — Confirm `L_skill = 1 + 0.03·L` applies to social tiers (D2/D3) and stacks multiplicatively across layers per the master rule.
- **E09-S4-T2** — Finalize Communication's effect — Confirm `costMult = clamp(1 − 0.005·L, 0.4, 1)` applies globally to purchase costs, clamped to −60%.
- **E09-S4-T3** — Define XP sources concretely — Charisma earns from social-income throughput and story choices; Communication from purchases/negotiations — wire each source into the tick.
- **E09-S4-T4** — Add story-choice XP grants — Let beat choices grant XP bursts (`charismaXp`/`commsXp`) per the storyline data example, so narrative feeds skills.
- **E09-S4-T5** — Add an exclusive-venue unlock — Give Charisma a level gate that unlocks a boutique-retreat social venue amenity, per `docs/01 §4` ("unlock exclusive venues").
- **E09-S4-T6** — Add a dialogue-branch unlock — Give Communication a level gate that unlocks an extra dialogue line in an upcoming beat, per `docs/01 §4`.
- **E09-S4-T7** — Write the attribute copy — Wry descriptions of what each attribute means for a soggy Dutch tourist climbing the ladder.
- **E09-S4-T8** — Balance the two curves' feel — Ensure Charisma feels rewarding early (3%/level) and Communication ramps sensibly to its −60% floor by mid-Act-II; verify in harness.
- **E09-S4-T9** — Persist skill state — Store `{xp,level}` per skill in `state.skills`; migrate old saves with the attributes at level 0.
- **E09-S4-T10** — QA the two attributes — Test social-only Charisma scope, global Comms discount, the clamp at −60%, and that story-granted XP lands correctly.

## E09-S5 — Training Purchases & Charm-School Cluster
_As a player between level-ups, I want cheap charm-flavored buys that nudge my XP, so that personal growth has the same steady small-win cadence as the pool._  The amenity cluster of the epic.
- **E09-S5-T1** — Define the charm-school cluster — Add `charm_{mirror_practice,small_talk_deck,firm_handshake,eye_contact_course,thankyou_notes}` amenities granting Charisma/Comms XP bursts + tiny Comfort.
- **E09-S5-T2** — Use `AMENITY.growth≈1.5` — Keep these cheap and frequent so they interleave with skill leveling.
- **E09-S5-T3** — Split XP between the two skills — Some items feed Charisma, some Communication, so players can steer their emphasis.
- **E09-S5-T4** — Gate the cluster reveals — Chain unlocks behind prior items + Comfort so charm school fills in over the session.
- **E09-S5-T5** — Write charm-school flavor — "Firm Handshake: practiced on a hotel pillow until it respected you." One wry line each.
- **E09-S5-T6** — Respect the Comms discount — Ensure these buys also benefit from `costMult`, so leveling Communication visibly makes them cheaper.
- **E09-S5-T7** — Balance training vs. passive — Tune training bursts against the passive trickle so both active spend and idle play advance skills, per `docs/01 §4`.
- **E09-S5-T8** — Balance cluster cadence — Confirm via harness a charm small-win every ~60–90s in the beat-10 window; nudge `costBase`.
- **E09-S5-T9** — Persist & migrate — Store levels; default new IDs to 0 for old saves.
- **E09-S5-T10** — QA the cluster — Zero-cash spam, XP-burst correctness, discount interaction, no offline auto-buy.

## E09-S6 — Accommodation Step: The Boutique Retreat
_As a climber, I want to check into the Boutique Retreat, so that reaching the tasteful tier-8 hideaway rewards my Comfort climb and frames the persona choice ahead._  The tier-up that closes Act I.
- **E09-S6-T1** — Define accommodation tier 8 — Add the Boutique Retreat to `data/accommodation.js` with `accScore = ACC.base·ACC.growth^8`.
- **E09-S6-T2** — Set the tier-8 unlock gate — Populate `ACC.unlock[8]` with the Comfort threshold aligned to the beat 10/11 gates in `STORY_GATES`.
- **E09-S6-T3** — Reveal a boutique social venue — On tier 8, unlock a small "salon" amenity that pairs with Charisma (the exclusive venue from S4-T5).
- **E09-S6-T4** — Author beat 10 (*Poolside Persona*) completion — Write the Charisma-L≥5-gated beat 10 that closes Act I in `data/story.js` (≤90 words, wry, "pick your emphasis" hook).
- **E09-S6-T5** — Seed beat 11 (*Fork in the Lobby*) — Add the branch-choice setup line/data referencing `story.branch`, per the storyline choice example, ready for the epic's close.
- **E09-S6-T6** — Add the tier-8 buy-button — Show the upgrade with its Comfort gate and an arrival flourish.
- **E09-S6-T7** — Feed the tier baseline Comfort — Ensure tier-8 `accScore` lifts `ComfortRaw` immediately, easing the Charisma-L5 gate.
- **E09-S6-T8** — Balance arrival vs. skill gate — Tune so players reach tier 8 and Charisma L5 around the beat-10 target (~1:10) together, not far apart; verify in harness.
- **E09-S6-T9** — Persist tier & ownedTiers — Record tier 8, push to `ownedTiers`; migrate old saves safely.
- **E09-S6-T10** — QA the reveal & gates — Retreat hidden pre-tier-8, beat 10 requires Charisma L5, the beat-11 seed appears once, no double-fire.

## E09-S7 — Vlogger Lean (path flavor)
_As a budding influencer, I want Charisma and Communication to visibly feed the vlogger dream, so that the charm offensive points toward the camera I'll pick up in E12._  Serves the emphasized branch.
- **E09-S7-T1** — Link Charisma to sponsor foreshadow — Add copy/flags so higher Charisma teases "better sponsor deals" (the Clout economy arrives E12), per `docs/01 §4`.
- **E09-S7-T2** — Compound Charisma with `L_path` — Ensure Charisma's social `×` compounds with vlogger `L_path` points (`1 + PATH.rate·points^0.85`) so charm + clout synergize.
- **E09-S7-T3** — Add a vlogger training item — `train_camera_confidence` charm-school item granting Charisma XP with vlogger-voiced copy.
- **E09-S7-T4** — Foreshadow the combo mechanic — Add a flag/hint that Communication will later strengthen the active-play `comboMult` (E12), keeping the thread visible.
- **E09-S7-T5** — Complete the persona beat variant — Resolve the beat-10 persona line with a vlogger-flavored variant when `story.branch` leans vlogger.
- **E09-S7-T6** — Trickle path points from charm spend — Charm-school purchases grant a few vlogger-leaning path points per `PATH.rate`.
- **E09-S7-T7** — Keep it reconvergent — Ensure Charisma/Comms help every branch (Comms discount is universal; Charisma helps all social income), so the lean is emphasis, not lock-in.
- **E09-S7-T8** — Balance the lean small — Keep vlogger-flavored bonuses modest; verify `PATH.softcapExp=0.85` bounds them.
- **E09-S7-T9** — Persist vlogger-flavor items — Store the vlogger training item; default 0 for old saves.
- **E09-S7-T10** — QA the lean — Test Charisma × `L_path` stacking on social tiers and that non-vlogger builds still benefit fully from both skills.

## E09-S8 — Balance & Tuning
_As the balance owner, I want the skills curve to matter without dominating, so that Charisma and Communication feel powerful yet the 20-hour arc holds._  Fits `SKILL.*` to the pacing contract.
- **E09-S8-T1** — Set `SKILL.base`/`SKILL.growth` — Confirm `SKILL_BASE=50`, `SKILL_GROWTH=1.25` give a satisfying early-level cadence and a sensible long tail.
- **E09-S8-T2** — Set `SKILL.rate` (passive XP) — Tune the passive trickle so idle play reaches Charisma L5 near the beat-10 target without active training.
- **E09-S8-T3** — Tune `CHARISMA_RATE` impact — Verify `0.03`/level lifts social income enough to feel like a build lever but not enough to break tier pacing.
- **E09-S8-T4** — Tune the Communication ramp — Ensure the −0.5%/level discount reaches meaningful territory by mid-Act-II and floors at −60% late, never trivializing costs.
- **E09-S8-T5** — Balance training vs. passive — Set training-burst sizes so spending accelerates but never replaces play; confirm both paths viable.
- **E09-S8-T6** — Run the greedy-ROI harness — Simulate beat-8→beat-11 including skill leveling; read the beat-10/11 timing and the skill-level curve.
- **E09-S8-T7** — Apply the fit procedure — Nudge the single most-off of `SKILL.*`/`CHARISMA_RATE`, re-run, repeat until beats 10/11 are within ±15%.
- **E09-S8-T8** — Check multiplier-stack interaction — Confirm `L_skill × L_comfort × L_path ×` milestone stays legible and within the `docs/01 §3.1` worked-example scale.
- **E09-S8-T9** — Commit a golden file — Snapshot the tuned skills/timing curve to catch regressions.
- **E09-S8-T10** — Extreme-speed sanity — Run `GAME_SPEED=1000` and confirm XP accrual, level solving, and the discount clamp stay correct under acceleration.

## E09-S9 — Save, Migration & Offline
_As a returning player, I want my hard-won skill levels to survive reloads and offline, so that a nap never resets my charm to zero — nor gifts free levels._  Persistence correctness for skills.
- **E09-S9-T1** — Bump the save version — Increment `state.version` and register the `skills` sub-tree (charisma/comms `{xp,level}`) for serialization.
- **E09-S9-T2** — Add the E09 migration — `MIGRATIONS[n]` seeds `state.skills.charisma`/`comms` at `{xp:0,level:0}` and new charm items at 0 for pre-E09 saves.
- **E09-S9-T3** — Migrate multiplier consumers — Ensure code reading `L_skill`/`costMult` handles pre-E09 saves (skills absent → level 0 → neutral multipliers, no NaN).
- **E09-S9-T4** — Offline XP correctness — Advance passive XP in `OFFLINE_STEPS` macro-steps through the same tick so offline == online skill math (`docs/01 §7`), capped at `OFFLINE_CAP`.
- **E09-S9-T5** — Cap offline XP fairly — Confirm offline XP uses the same `SKILL.rate` and can level skills, but only from genuine offline income activity (no free bursts).
- **E09-S9-T6** — Show skill gains in the away summary — Include "+X Charisma XP, leveled up N" in the "While you were away…" modal per `docs/01 §7`.
- **E09-S9-T7** — Export/import round-trip — Encode a skilled-up state to base64 and re-import; assert identical xp/level.
- **E09-S9-T8** — Backward-compat fixtures — Load a pre-E09 fixture and assert clean migration with skills at level 0.
- **E09-S9-T9** — Guard malformed skill data — Ensure a corrupt xp value falls back safely (try/catch keeps the current save).
- **E09-S9-T10** — Migration unit tests — Assert the E09 migration is idempotent and order-independent among stacked migrations.

## E09-S10 — QA, Polish & Juice
_As a player, I want leveling up to feel like a genuine little triumph, so that the first skills land as the emotional core of "personal growth."_  Final polish gating the epic.
- **E09-S10-T1** — Level-up juice — Add a satisfying `levelup` flourish (bar flash + toast + soft chime), motion / `prefers-reduced-motion` gated.
- **E09-S10-T2** — Discount-cap edge case — Test Communication at very high level stays exactly at `costMult = 0.4` (−60%) and never goes below.
- **E09-S10-T3** — XP-boundary edge cases — Test level transitions at exact cumulative-XP boundaries (off-by-one safety in the level solver).
- **E09-S10-T4** — Charisma-scope regression — Assert Charisma `×` touches only social tiers (D2/D3), not D1 or D4+.
- **E09-S10-T5** — Discount-consistency test — Assert previewed and charged costs match after `costMult`, including on the training purchases themselves.
- **E09-S10-T6** — Number-format audit — Ensure XP, `xpToNext`, and effect readouts use `util.format` and don't overflow at high levels.
- **E09-S10-T7** — Screen-reader pass — Verify `aria-live` reads level-ups and the discount-cap badge clearly.
- **E09-S10-T8** — Story-XP integration test — Assert beat choices granting `charismaXp`/`commsXp` correctly bump XP and can trigger a level-up.
- **E09-S10-T9** — Beat-10/11 text QA — Proofread beat 10 and the 11-seed for tone, ≤90 words, and hooks toward the branch choice.
- **E09-S10-T10** — DoD regression suite — Bundle the S1–S10 tests into an E09 suite gating the epic as done.

## Definition of Done (epic)
- `js/data/skills.js` is live with Charisma and Communication as declarative data; `SKILL_BASE=50`, `SKILL_GROWTH=1.25`, `CHARISMA_RATE=0.03` set in `config.js`.
- `xpToNext(level) = SKILL_BASE·SKILL_GROWTH^level` and the cumulative level solver are implemented and unit-tested in `math.js`.
- Charisma applies `L_skill = 1 + 0.03·L` to social tiers; Communication applies `costMult = clamp(1 − 0.005·L, 0.4, 1)`, clamped to −60%.
- Skills panel shows XP bars, effect readouts, training buttons, level-up juice, the discount-cap badge, `aria-live`, and reduced-motion.
- Boutique Retreat (tier 8) purchasable; `accScore = ACC.base·ACC.growth^8`; beat 10 (*Poolside Persona*) fires at Charisma L≥5; beat 11 (*Fork in the Lobby*) seeded.
- Passive and training XP are both viable; harness confirms beats 10/11 near target; a golden file is committed.
- Saves migrate from pre-E09 (skills at level 0, neutral multipliers); offline advances XP identically; the away summary shows gains; export/import round-trips; all S1–S10 tests are green.
