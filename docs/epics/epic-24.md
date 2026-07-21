# E24 — Where the Rich Hide
> Act III (The Summit) · Accommodation stays tier 18–19 (you travel among places) · New system: **premium destinations** meta-game (each = unique `×` + unique amenity + Taste/exclusivity gate) + **set-collection bonus** · Story beat 25 (*Where the Rich Hide*) · Build-path emphasis: traveler / connoisseur

**Epic goal:** Turn destinations into an endgame meta-game. Add five **exclusive destinations** — **Monaco, Dubai, Maldives, Aspen, St. Barths** — each unlocked behind a **Taste/exclusivity gate**, each granting a **unique global `×`** and a **unique signature amenity**, with an escalating **set-collection bonus** for owning many.
**Player-visible outcome:** The player unlocks, travels between, and collects the world's most exclusive destinations; the more they own, the bigger a global multiplier — a legible "collect the rich people's hiding spots" board.
**Systems touched:** `data/destinations.js` (extends the E04 destination system), `state.destinations`; `engine` unlock/gate/travel/set-bonus logic; `skills.js` (Taste gate) + the E14/E21 exclusivity meter; `config.DEST`; `data/amenities.js` (signature amenities); `data/story.js` (beat 25); reuses the E22 owned-property model for destination residences.
**Math/balance notes:** each destination = flat global `×` (per `docs/01 §5` "destination = global `×`"); set bonus `destSetMult` from `DEST.setBonus` thresholds (own 2/3/4/5 → escalating global `×`) folded into the global multiplier layer; Taste gate `Taste L ≥ DEST.tasteGate[d]` (culminating at L25 for beat 25); exclusivity `×` synergy for connoisseur. Total global from this system = `Π(owned xMult) · destSetMult`.

## E24-S1 — Premium-destination data model (data model)
_As a systems dev, I want the five exclusive destinations as pure data, so that each `×`, amenity, and gate is editable content._  Five hiding spots, all declarative.
- **E24-S1-T1** — Extend `data/destinations.js` — Add a `PREMIUM` list; each entry `{id,name,xMult,signatureAmenity,tasteGate,exclGate,unlockCost}`.
- **E24-S1-T2** — Author Monaco — `{id:'monaco', signature:'harbor superyacht berth', tasteGate:...}`, casino/harbor flavor, income-leaning `xMult`.
- **E24-S1-T3** — Author Dubai — Gold-everything; signature "indoor ski slope + Burj suite"; a Comfort-leaning `xMult`.
- **E24-S1-T4** — Author Maldives — Overwater-everything (ties to E22); signature "private house reef"; a Body/wellness-leaning `xMult`.
- **E24-S1-T5** — Author Aspen — Snow and chalets; signature "private black run"; a Savvy/après-leaning `xMult`.
- **E24-S1-T6** — Author St. Barths — Discreet ultra-wealth; signature "unmarked beach club"; an exclusivity-leaning `xMult`.
- **E24-S1-T7** — Define the set-bonus data — Add `DEST.setBonus` thresholds (own 2/3/4/5 → escalating global `×`) to config.
- **E24-S1-T8** — Reference config, not literals — All `xMult`, gates, and costs read from `config.DEST`.
- **E24-S1-T9** — Flavor copy — Wry Dutch descriptions ("Monaco: where a parking spot costs more than your childhood home in Almere.").
- **E24-S1-T10** — Validation test — Assert 5 unique premium ids, ascending `tasteGate`, a signature amenity on each, and monotone set thresholds.

## E24-S2 — Premium unlock, travel, and set-collection engine (core logic)
_As the engine, I want gated unlocks, an active-destination `×`, and a set bonus, so that collecting destinations drives a clean global multiplier._  Collecting = compounding.
- **E24-S2-T1** — Gate checks — `canUnlock(dest)` requires `Taste L ≥ tasteGate` AND exclusivity ≥ `exclGate` AND cash ≥ `unlockCost`.
- **E24-S2-T2** — Implement `engine.unlockDestination(id)` — Deduct cost, push id to `state.destinations.owned[]`, emit `unlock`; idempotent (no double charge or double `×`).
- **E24-S2-T3** — Register per-destination `×` — Each owned destination adds a flat global-scope `×` to the master stack, per `docs/01`'s "destination = global `×`."
- **E24-S2-T4** — Implement `engine.travelTo(id)` — Set `state.destinations.active`; the active destination grants a bonus on its signature amenity/theme (active vs merely-owned distinction).
- **E24-S2-T5** — Set-collection bonus — Compute `destSetMult` from owned count against `DEST.setBonus` thresholds and register it as a separate global `×`.
- **E24-S2-T6** — Signature-amenity unlock — Owning a destination unlocks its signature amenity in `data/amenities.js`, enforced by the generic gate.
- **E24-S2-T7** — Exclusivity feedback loop — Owning premium destinations raises the E21 exclusivity meter, which in turn helps gate the next — a virtuous ladder.
- **E24-S2-T8** — Recompute discipline — Cache `destSetMult` and the owned-`×` product; recompute on unlock/travel, not per tick.
- **E24-S2-T9** — Emit collection events — Emit owned-count and current set tier so the UI can show "3/5 — next bonus at 4."
- **E24-S2-T10** — Unit-test the math — Assert total global `×` = `Π(owned xMult)·destSetMult` and that gates block correctly.

## E24-S3 — Destination map and collection UI (UI)
_As a player, I want a map board of exclusive spots to collect, so that unlocking and traveling is satisfying at a glance._  A board, not a menu.
- **E24-S3-T1** — Map/collection board — A card grid of the 5 destinations showing locked/unlocked/active state and each `×`.
- **E24-S3-T2** — Unlock buttons — Per-destination "Unlock — ƒ<cost>" with gate reasons ("needs Taste L25", "needs exclusivity X").
- **E24-S3-T3** — Travel controls — A "Travel here" button that sets `active`, with an active-destination highlight and its signature amenity surfaced.
- **E24-S3-T4** — Collection tracker — A prominent "Collected 3/5 · next set bonus at 4 (×N)" readout driven by `destSetMult`.
- **E24-S3-T5** — Gate hints — Show progress toward each gate (a Taste-level bar, an exclusivity bar) so locked destinations feel attainable.
- **E24-S3-T6** — Signature-amenity surfacing — When a destination is owned, reveal its unique amenity button in the amenities panel.
- **E24-S3-T7** — Wire to intents — Buttons call `engine.unlockDestination` / `engine.travelTo`; the UI stays read-only over state.
- **E24-S3-T8** — Number formatting — Route `unlockCost` and `×` values through `util.format`.
- **E24-S3-T9** — Unlock juice — On unlock, animate the card flipping to "owned" with an `aria-live` announcement.
- **E24-S3-T10** — Reduced-motion + keyboard — The board is fully keyboard-navigable; the flip animation respects `prefers-reduced-motion`.

## E24-S4 — The set-collection bonus (headline new thing)
_As a collector, I want owning more exclusive destinations to compound into a big global bonus, so that "collect them all" becomes the epic's driving goal._  N/5 → ×M is the star.
- **E24-S4-T1** — Thresholded set tiers — Implement `DEST.setBonus` as escalating tiers (own 2 → ×A, 3 → ×B, 4 → ×C, 5 → ×D) folded into the global stack.
- **E24-S4-T2** — Headline readout — Make the "collected N/5 → ×M" tile the epic's signature UI element.
- **E24-S4-T3** — Beat 25 hook — Trigger beat 25 *Where the Rich Hide* on the first premium unlock; set `story.flags.jetset=true`.
- **E24-S4-T4** — "Complete the set" chase — The final (5/5) tier grants an outsized capstone `×` plus a cosmetic "member of the club" badge.
- **E24-S4-T5** — Clarify the interaction — Via UI + tooltip, show that total = `Π(individual ×)·setMult` so both individual and set matter.
- **E24-S4-T6** — Anti-runaway sizing — Keep set tiers escalating but bounded (`docs/05 §4`) so 5/5 is exciting, not economy-breaking.
- **E24-S4-T7** — Connoisseur synergy — Let the connoisseur exclusivity `×` stack multiplicatively with the set bonus, per the epic's emphasis.
- **E24-S4-T8** — Offline correctness — Apply set `×` and per-destination `×` identically in offline macro-steps.
- **E24-S4-T9** — Flavor: the club — Copy for hitting 5/5 ("You now own a place in every spot the rich hide. They're going to need a new spot.").
- **E24-S4-T10** — QA the set math — Test the bonus at each owned count (0..5) and assert the exact tier `×` and its correct fold into the global multiplier.

## E24-S5 — Per-destination signature amenities (amenity / small-wins)
_As an idler, I want each destination to bring its own unique upgrade line, so that unlocking a place opens a fresh little cluster of luxuries._  Five themed small-win lines.
- **E24-S5-T1** — Monaco line — Superyacht-berth amenities (tender, helipad, deckhand round) with `costGrowth:1.5`, income-leaning.
- **E24-S5-T2** — Dubai line — Gold-leaf suite amenities (indoor ski pass, falcon perch, gold water), Comfort-leaning.
- **E24-S5-T3** — Maldives line — Private-reef amenities (house reef, seaplane, sandbank dinner), wellness/Body-leaning.
- **E24-S5-T4** — Aspen line — Chalet amenities (private lift, ski-in fireplace, après cart), Savvy/après flavor.
- **E24-S5-T5** — St. Barths line — Discreet beach-club amenities (unmarked cabana, rosé cellar, no-photo policy), exclusivity-leaning.
- **E24-S5-T6** — Gate to ownership — Each signature line appears only when its destination is owned, via generic unlock gating.
- **E24-S5-T7** — Feed Comfort + `×` — Confirm signature amenities feed `ComfortRaw` (`w_amen`) and their tiny `xMult` into `L_upgrade`/global as tagged.
- **E24-S5-T8** — Active-destination bonus — Signature amenities of the *active* destination get a small extra kick — a reason to travel, not just own.
- **E24-S5-T9** — Cadence + flavor — Tune each line to drip a new item every ~90–120s while there; write wry one-liners per node.
- **E24-S5-T10** — QA — Buy signature lines with/without ownership and while active/inactive; assert gating, Comfort recompute, and no free offline items.

## E24-S6 — Destination residences (progression step, repurposed)
_As a collector, I want a little owned place at each destination, so that this "no new tier" epic still delivers an ownership-progression step._  Reuses the E22 owned-property model; per the Story-slot template this slot is repurposed for extra content since accommodation stays at tier 18–19.
- **E24-S6-T1** — Model destination residences — Reuse the E22 owned-property model: each premium destination offers an optional `residence` `{ownCost,baseComfort}`.
- **E24-S6-T2** — Persistent Comfort per residence — Owned residences add persistent property Comfort (like E22), so collecting deepens the Comfort floor.
- **E24-S6-T3** — Residence micro-tree — Give each residence a short 3–4 node upgrade tree (`costGrowth:1.6`) for a bit of depth.
- **E24-S6-T4** — Gate on destination ownership — A residence is purchasable only once its destination is unlocked.
- **E24-S6-T5** — Residence set nudge — Owning all 5 residences grants a small extra Comfort/`×` — a second, gentler set-collection layer.
- **E24-S6-T6** — Reuse the buy flow — Residences use `engine.buyProperty`/`buyPropertyUpgrade` from E22; no new engine code.
- **E24-S6-T7** — Reveal on unlock — Reveal a residence CTA when its destination is unlocked, emitting an `unlock` event.
- **E24-S6-T8** — Flavor copy — Wry descriptions ("A studio in Monaco. 14 square metres. ƒ40 million. A steal, apparently.").
- **E24-S6-T9** — Balance the sinks — Price residence `ownCost` as optional prestige sinks, not required for progression.
- **E24-S6-T10** — QA — Assert residences gate on destination ownership, persist like E22 property, and the 5/5 residence bonus fires exactly once.

## E24-S7 — Path flavor: stamps and discretion (path / branch flavor)
_As a branch player, I want destinations to reward my identity, so that a traveler collects breadth while a connoisseur savors exclusivity._  Traveler and connoisseur lead here.
- **E24-S7-T1** — Traveler discount — Apply the traveler branch's `−15%` destination cost and `+1` transport slot perk to premium unlocks (faster collecting).
- **E24-S7-T2** — Traveler visit bonus — Give traveler a bonus for *traveling to* all 5, rewarding breadth and motion, not just ownership.
- **E24-S7-T3** — Connoisseur exclusivity `×` — Stack the connoisseur exclusivity `×` with the premium destinations' exclusivity-leaning bonuses.
- **E24-S7-T4** — Connoisseur "quiet luxury" line — Connoisseur unlocks discreet variants of signature amenities (St. Barths no-photo, unmarked) with extra Comfort.
- **E24-S7-T5** — Vlogger content-destinations — Vlogger earns `Clout` bursts for "posting" from each destination, synergizing with the active-play combo.
- **E24-S7-T6** — Crypto après-desk — Crypto gets a Savvy passive nudge while active at Aspen/Dubai (laptop-on-the-slopes flavor).
- **E24-S7-T7** — Route through `L_path` — All branch bonuses register via `L_path` with `PATH.softcapExp=0.85`; no new layer.
- **E24-S7-T8** — Emphasis weighting — Per the epic's emphasis, give traveler and connoisseur slightly deeper destination content.
- **E24-S7-T9** — Copy pass — Branch-flavored unlock lines keyed on `story.branch`.
- **E24-S7-T10** — QA branch bonuses — Re-spec paths; assert destination bonuses recompute and don't double-count with the set/exclusivity `×`.

## E24-S8 — Balance destination `×`, set bonus, and gates (balance & tuning)
_As a balancer, I want collecting destinations paced right, so that beat 25 and the Taste L25 gate land on the pacing curve._  Big jumps, bounded ceilings.
- **E24-S8-T1** — Set per-destination `xMult` — Size each destination's flat global `×` so one unlock is a felt jump but five don't break the economy.
- **E24-S8-T2** — Set `DEST.setBonus` tiers — Tune the escalating set `×` so 5/5 is a strong-but-bounded capstone.
- **E24-S8-T3** — Set Taste gates — Set `DEST.tasteGate[]` ascending, culminating at Taste L25 for the hardest (beat 25's gate).
- **E24-S8-T4** — Set exclusivity gates — Tune `exclGate` values against the E21 exclusivity meter so gates feel earned, not arbitrary.
- **E24-S8-T5** — Price unlock costs — Set `unlockCost` per destination as escalating late-game sinks (~tens of minutes of income each).
- **E24-S8-T6** — Run the harness — Simulate to beat 25 and confirm cumulative time within ±15% of `docs/05 §1`.
- **E24-S8-T7** — Cadence framing — Keep smaller collecting steps (signature amenities) in the 30–120s band; treat destination unlocks as the ~10–20 min "major" beats.
- **E24-S8-T8** — Cross-layer ceiling — Verify destination global `×` × set `×` × connoisseur exclusivity `×` don't compound past intended ceilings.
- **E24-S8-T9** — Golden-file update — Commit the beat-25 milestone-curve segment.
- **E24-S8-T10** — Document constants — Add `DEST.*` to config comments and the `docs/05` lever list; note this deepens the E04 destination system.

## E24-S9 — Persist collection, active, set bonus; migrate; offline (save / migration / offline)
_As a returning player, I want my collection and current location remembered, so that reloading and being away keep every `×` intact._  The passport persists.
- **E24-S9-T1** — Extend state — Add `state.destinations = { owned:[], active:null, residences:{} }` and bump `version`.
- **E24-S9-T2** — Write migration — Add `MIGRATIONS[N]` initializing an empty premium collection for pre-E24 saves.
- **E24-S9-T3** — Preserve E04 destinations — Ensure existing (non-premium) destination state merges without clobbering.
- **E24-S9-T4** — Serialize compactly — Store owned ids + active + residence ranks; recompute `×`/set on load rather than persisting derived values.
- **E24-S9-T5** — Offline global `×` — Apply owned per-destination `×` and `destSetMult` in offline macro-steps identically to online.
- **E24-S9-T6** — Offline active bonus — Credit the active-destination signature bonus during offline (active is static while away).
- **E24-S9-T7** — Export/import round-trip — Confirm collection + residences survive base64 export/import, try/catch-guarded.
- **E24-S9-T8** — Backup rotation — Verify the rotating backup captures destination state before an overwrite.
- **E24-S9-T9** — Migration unit test — Load a v(N-1) fixture; assert the premium collection inits empty and E04 destinations are preserved.
- **E24-S9-T10** — Offline summary — Away-modal line: "Your ×N destination bonuses kept earning while you were in the departures lounge."

## E24-S10 — QA, edge cases, and juice (QA / polish)
_As QA, I want the destination meta-game exploit-free and delightful, so that collecting the world's hiding spots ships clean._  Collect, verify, celebrate.
- **E24-S10-T1** — Gate-bypass edge — Attempt an unlock below the Taste/exclusivity gate or below cost; assert it's blocked with clear reasons.
- **E24-S10-T2** — Double-unlock edge — Re-unlock an owned destination; assert idempotence (no double `×`, no double charge).
- **E24-S10-T3** — Set-math audit — For every owned subset (0..5), assert `destSetMult` matches the config tier exactly.
- **E24-S10-T4** — Global-`×` recompute audit — Assert total global multiplier = `Π(owned ×)·setMult` after arbitrary unlock/travel orders.
- **E24-S10-T5** — Travel integrity — Fuzz `travelTo`; assert exactly one active destination and the active-bonus applied once.
- **E24-S10-T6** — Exclusivity-loop test — Assert owning destinations raises exclusivity and that this can legitimately open the next gate (no soft-lock).
- **E24-S10-T7** — Number formatting — Verify unlock costs, `×` values, and the "N/5" readout format across notations.
- **E24-S10-T8** — Collection juice — Add a "passport stamp" flourish per unlock and a fanfare at 5/5, respecting reduced-motion and mute.
- **E24-S10-T9** — Save-compat test — Run the fixture suite including the new version and E04 destination saves; assert clean migration.
- **E24-S10-T10** — Accessibility pass — Board buttons labeled with state + gate; `aria-live` announces unlocks and set-tier changes; keyboard-navigable.

## Definition of Done (epic)
- [ ] The five premium destinations (Monaco/Dubai/Maldives/Aspen/St. Barths) exist as validated data, each with a unique `xMult`, signature amenity, and Taste/exclusivity gate.
- [ ] `engine.unlockDestination`/`travelTo` enforce gates, are idempotent, and register per-destination global `×` + active-destination bonus.
- [ ] The set-collection bonus (`destSetMult` from `DEST.setBonus`) is the visible headline, triggers beat 25, sets `story.flags.jetset`, and 5/5 grants a bounded capstone `×` + badge.
- [ ] Total global from this system equals `Π(owned xMult)·destSetMult`, verified by audit at every owned subset.
- [ ] Five signature amenity lines drip at the ~90–120s cadence, gate on ownership, and reward the active destination.
- [ ] Destination residences reuse the E22 owned-property model, gate on destination ownership, and carry a 5/5 residence bonus.
- [ ] Traveler/connoisseur get emphasized bonuses; all branches route through softcapped `L_path`; exclusivity feedback loop has no soft-lock.
- [ ] `DEST.*` tuned to Taste L25 at beat 25; harness within ±15%; cross-layer ceilings respected; golden file committed.
- [ ] `state.destinations` persists, migrates (preserving E04 destinations), round-trips, and is offline-correct for all `×`.
- [ ] QA green: gate-bypass, double-unlock, set-math + global-`×` audits, travel integrity, exclusivity loop, formatting, accessibility.
