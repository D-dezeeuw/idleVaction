# E16 — Sea Legs
> Act II climb · Accommodation tier 11 (+marina) · Boat/yacht tier, sea-only destinations, yacht amenity cluster, crew seed · Beat 16 (*Sea Legs*) · Traveler/Connoisseur emphasis

**Epic goal:** Extend private logistics from land to water — buy boats up to a full yacht, unlock a class of sea-only destinations you literally couldn't reach before, and hang a prestige chain of ridiculous yacht amenities (yes, a floating pool) off the marina.
**Player-visible outcome:** A marina panel with a boat slot, new "sea" destinations, a yacht deck full of expensive toys, and a first "crew" line that hints at the staff system to come.
**Systems touched:** `data/logistics.js` (boat tier + crew), `data/destinations.js` (sea flag), `data/amenities.js` (yacht cluster), `data/accommodation.js` (marina suite), `config.js` (`LOGISTICS.boat`, `CREW`, `DEST.sea*`), `engine.js`, `ui.js`, `state.js`.
**Math/balance notes:** Boat tiers reuse the geometric `LOGISTICS` cost/upkeep model from E15 with a steeper `costGrowth`; yacht amenities use a high `AMENITY.growth≈1.8` prestige slope; sea destinations grant a flat global `×` gated behind hull ownership; crew adds a tiny `×` and upkeep as a pre-staff placeholder for E19.

## E16-S1 — Charting the Marina (data model)
_As a landlocked idler who just bought a car, I want boats defined as real data, so that the sea becomes a place I can actually spend money on._  One clean data table drives every boat, crewman, and dock.
- **E16-S1-T1** — Add boat tier table — In `data/logistics.js` add a `boats[]` array of `{id,name,class:'boat',costBase,costGrowth,upkeep,mult,slotBonus,crewCap}` from dinghy → speedboat → cabin cruiser → yacht → superyacht.
- **E16-S1-T2** — Set the cost ramp — Give boats `costBase` starting ~10× the top car and `costGrowth:1.9` so each rung is a deliberate decision, not an impulse buy.
- **E16-S1-T3** — Define sea destinations — In `data/destinations.js` add `sea:true` entries (a hidden cove, a Greek island-hop, a fjord cruise) each with a flat `xMult` and `requires:{boatTier>=n}`.
- **E16-S1-T4** — Tag the multiplier scope — Mark boat `mult` and sea-destination `xMult` with `scope:'all'` so they land in the global logistics/destination layer of the stack, not a per-tier one.
- **E16-S1-T5** — Seed the crew roster — Add a `crew[]` stub (deckhand, first mate, captain) as `{id,name,costBase,costGrowth,mult,upkeep,role,preStaff:true}` so E19 can later absorb it.
- **E16-S1-T6** — Author boat flavor copy — One wry Dutch-tourist line per boat ("A dinghy. It leaks, but it's *your* leak now.").
- **E16-S1-T7** — Author sea-destination copy — Short smug-postcard blurbs ("Turns out the fjords don't care that it also rains in Rotterdam.").
- **E16-S1-T8** — Wire unlock gates — Set each boat/destination `unlockAt` referencing the prior boat tier + Comfort so they reveal in order, not all at once.
- **E16-S1-T9** — Register data in the index — Export `boats`, `crew`, and the sea-destination set so `engine.js`/`ui.js` can enumerate them generically.
- **E16-S1-T10** — Data-shape unit test — A tiny test asserting every boat/crew row has all required fields and monotonically increasing `costBase`, catching typos before balance work.

## E16-S2 — How Boats Pay for Themselves (core logic/engine)
_As a player, I want owning a boat to actually move my income and my upkeep, so that the marina isn't just decoration._  Boats plug into the existing logistics multiplier and upkeep sink.
- **E16-S2-T1** — Extend the logistics multiplier — In `engine.js`, fold boat `mult` into the same `L_logistics` global factor E15 built, additive within the layer then multiplied across the stack.
- **E16-S2-T2** — Add the transport slot — Have boats grant `slotBonus` to the transport-slot count so a boat lets you run an extra destination `×` concurrently.
- **E16-S2-T3** — Wire boat upkeep — Add each owned boat's `upkeep` to the per-second cash drain, reusing E15's `applyUpkeep(dt)` so the drain stays one code path.
- **E16-S2-T4** — Gate sea destinations on hull — In the destination-unlock check, require `state.logistics.boatTier >= n` before a `sea:true` destination can be purchased or produce.
- **E16-S2-T5** — Compute crew contribution — Sum owned crew `mult` into `L_logistics` and crew `upkeep` into the drain; clamp crew count to the current boat's `crewCap`.
- **E16-S2-T6** — Emit purchase/unlock events — Fire `emit('purchase',{kind:'boat'})` and `emit('unlock',{dest})` so UI and story gates react without polling.
- **E16-S2-T7** — Hook the story gate — Satisfy beat 16 (*Sea Legs*) `requires:{ownBoat:true}` the moment `boatTier>=1`, advancing `story.beat`.
- **E16-S2-T8** — Enforce upkeep affordability — If cash can't cover total upkeep this tick, apply E15's "grace then throttle" rule instead of going negative.
- **E16-S2-T9** — Keep it pure — Route all new cash/mult math through `math.js` `N.*` helpers so the eventual BigNumber swap needs no engine change.
- **E16-S2-T10** — Engine unit tests — Test that buying a boat raises `L_logistics`, adds upkeep, unlocks the right destinations, and fires beat 16 exactly once.

## E16-S3 — The Marina Tab (UI/buttons)
_As a player, I want a simple marina panel, so that buying boats and crew is as easy as buying floaties._  Buttons, costs, and an honest upkeep readout.
- **E16-S3-T1** — Add the marina panel — New collapsible Spectre card in `ui.js` that appears once beat 15 (cars) is done and a boat is affordable-soon.
- **E16-S3-T2** — Render boat buttons — For each boat: name, next cost, owned tier, and the resulting `+mult`/`+slot` delta on the button face.
- **E16-S3-T3** — Show live upkeep line — A running "upkeep: −X/s" readout that turns amber when total logistics drain exceeds a share of current income.
- **E16-S3-T4** — Render crew buttons — Deckhand/mate/captain buy buttons with cost, owned, the tiny `×` each adds, and a "crew: n/cap" counter.
- **E16-S3-T5** — Sea-destination reveals — When a boat unlocks a sea destination, pop an `unlock` toast and slot it into the existing destinations list with an anchor/wave icon.
- **E16-S3-T6** — Wire buy intents — Buttons call generic `engine.buyLogistics(id)` / `engine.buyCrew(id)`; no bespoke handler per boat.
- **E16-S3-T7** — Disabled/affordability states — Grey out unaffordable buttons and show "needs Dinghy"-style gating hints on locked rungs.
- **E16-S3-T8** — Respect reduced-motion — Gate the wave/anchor flourish behind `prefers-reduced-motion` so the panel stays calm for those who want it.
- **E16-S3-T9** — aria-live for unlocks — Announce new boats/destinations via the existing `aria-live` ticker for keyboard/screen-reader players.
- **E16-S3-T10** — Snapshot the DOM contract — Add a render test asserting the panel exposes stable `data-id` hooks so later polish needs no engine change.

## E16-S4 — A Yacht, Obviously (the headline new thing)
_As a Dutchman who once shared a hostel bunk, I want a yacht with a genuinely absurd floating pool, so that the sea leg has one unforgettable showpiece._  The signature moment of the epic.
- **E16-S4-T1** — Define the yacht rung — Make the top boat tier "the Yacht" with a headline `mult`, a big `costBase`, and a `crewCap` jump so it feels like arriving.
- **E16-S4-T2** — Add the floating pool amenity — A `tag:'yacht'` amenity "Pool On A Boat (On The Sea)" with outsized `comfort` and a wink that you now have a pool floating on water.
- **E16-S4-T3** — Chain deck toys off it — Gate a short escalating chain (sun deck → jacuzzi → floating pool → sea-water infinity edge), each requiring the previous.
- **E16-S4-T4** — Wire the crew requirement — Require a minimum crew count to "operate" the yacht's top amenities, making the crew seed matter mechanically, not just cosmetically.
- **E16-S4-T5** — Comfort payoff — Feed yacht amenities into `ComfortRaw` with a weight that gives a satisfying Comfort jump toward the next accommodation gate.
- **E16-S4-T6** — Author the showpiece copy — Beat-adjacent flavor ("A pool. On a boat. On the sea. Somewhere a hostel receptionist feels a chill.").
- **E16-S4-T7** — Yacht unlock ceremony — A one-time stronger toast/line when the Yacht is first bought, respecting reduced-motion.
- **E16-S4-T8** — Balance the showpiece cost — Tune Yacht `costBase` so it lands ~1 accommodation-step of saving after the first boats, per the S8 harness targets.
- **E16-S4-T9** — Persist operation state — Save which yacht amenities are "crewed" so offline income reflects whether the crew was aboard.
- **E16-S4-T10** — QA the showpiece — Verify buying the Yacht with too little crew locks the top amenities gracefully and the floating pool's Comfort recomputes correctly.

## E16-S5 — Deck Toys (amenity / small-wins cluster)
_As a poolside-turned-deckside idler, I want a steady drip of silly nautical toys, so that there's a new little unlock every few minutes on the water._  The small-win engine, now in swimwear at sea.
- **E16-S5-T1** — Define the deck-toy cluster — Add ~8 `tag:'yacht'` amenities (inflatable orca, banana boat, jet-ski, seabob, paddleboard, floating bar, sun-deck bed, tender dinghy) to `data/amenities.js`.
- **E16-S5-T2** — Set the prestige slope — Give the cluster `costGrowth:1.8` (steeper than pool floaties' 1.5) so it reads a rung above E07's kiddie-pool toys.
- **E16-S5-T3** — Small targeted multipliers — Each toy adds a tiny `xMult` via `L_path`/logistics scope so the cluster nudges income as well as Comfort.
- **E16-S5-T4** — Comfort contributions — Feed each `comfort` value into `amenityScore`; confirm the saturating cap still bites so they help without trivializing Comfort.
- **E16-S5-T5** — Unlock cadence — Gate toys behind escalating Comfort + prior toy so one becomes affordable roughly every 60–90s of active play.
- **E16-S5-T6** — Flavor copy pass — One dry Dutch line each ("The banana boat seats six. You have no friends here, which is the point.").
- **E16-S5-T7** — Reuse the generic buy flow — Confirm `engine.buyAmenity(id)` handles the whole cluster with zero bespoke code.
- **E16-S5-T8** — Button readouts — Show name/cost/owned and next-Comfort delta on each toy button, matching the E07 floatables pattern.
- **E16-S5-T9** — Save the toy levels — Persist per-toy `level`, defaulting to 0 for pre-E16 saves so migration is a no-op for old players.
- **E16-S5-T10** — QA rapid buys — Zero-cash spam, buy-max, Comfort recompute, and verify no toy is granted free during offline.

## E16-S6 — The Marina Suite (accommodation / progression step)
_As a climber, I want the marina to come with a step up in where I sleep, so that the sea leg advances the ladder, not just the toys._  Tier 11 gains its marina-facing character.
- **E16-S6-T1** — Attach the marina wing — In `data/accommodation.js`, give tier 11 a "marina suite" variant/flag unlocked by owning a boat, reusing the existing `accScore`.
- **E16-S6-T2** — Set the unlock gate — Tie the reveal to `ACC.unlock[11]` Comfort plus `boatTier>=1`, wiring both into `STORY_GATES`.
- **E16-S6-T3** — Reflect in accScore — Ensure the marina variant contributes its `ACC_BASE·ACC_GROWTH^11` term so the Comfort spine steps up as intended.
- **E16-S6-T4** — Reveal copy — Write the "you upgraded to the room that faces *your* boat" line, wry and slightly smug.
- **E16-S6-T5** — Wire the reveal event — Emit `unlock` + `story:beat` hooks so UI swaps the accommodation art/label on entry.
- **E16-S6-T6** — Gate later toys on the suite — Make the top yacht amenities also check the marina suite so progression stays ordered.
- **E16-S6-T7** — Balance the step size — Confirm the tier-11 marina step doesn't overshoot the beat-16 Comfort target in the harness.
- **E16-S6-T8** — Migration default — Old saves at tier 11 without a boat keep the plain tier-11 label until they buy a boat; no forced state change.
- **E16-S6-T9** — UI label swap — Update the readout to show "Tier 11 · Marina Suite" cleanly, including in the stats screen.
- **E16-S6-T10** — QA the gate — Verify you can't see the marina suite without both Comfort and a boat, and that meeting both reveals it exactly once.

## E16-S7 — The Grand Tourist Goes Coastal (path / branch flavor)
_As a Traveler or Connoisseur, I want the sea leg to reward my chosen identity, so that boats feel like *my* kind of luxury._  Branch-aware bonuses without stranding other builds.
- **E16-S7-T1** — Traveler boat discount — Apply the `traveler` perk (destinations −15%) to sea destinations and add a small boat-upkeep discount for traveler.
- **E16-S7-T2** — Connoisseur yacht Comfort — Apply the `connoisseur` +25% Comfort perk to yacht amenities so the aesthete's floating pool feels richer.
- **E16-S7-T3** — Extra transport slot synergy — Honor the traveler `+1 transport slot` so a traveler can run one more sea-destination `×` than others.
- **E16-S7-T4** — Path-point sources — Grant `traveler`/`connoisseur` path points for first boat, first sea destination, and the Yacht, feeding `L_path`.
- **E16-S7-T5** — Hybrid beat line — Add an extra beat-16 flavor line that only shows if both traveler and connoisseur points ≥ P1 (a "tasteful world-cruiser" nod).
- **E16-S7-T6** — Neutral-safe floor — Confirm a vlogger/crypto player still fully completes beat 16 and buys every boat, just without the branch bonus.
- **E16-S7-T7** — Softcap respected — Route path bonuses through `1 + PATH.rate·points^PATH.softcapExp` so coastal points don't runaway.
- **E16-S7-T8** — Branch flavor copy — Two alternate boat blurbs keyed on `story.branch` (traveler = logistics brag, connoisseur = provenance sniff).
- **E16-S7-T9** — Balance the perks — Harness-check that neither branch perk pushes beat 16 more than ±15% off target versus neutral.
- **E16-S7-T10** — QA branch switching — Re-spec between branches and verify sea bonuses recompute live with no stale multipliers.

## E16-S8 — Sea Trials (balance & tuning)
_As the balancer, I want boats, crew, and sea destinations tuned to the pacing curve, so that logistics-II is a real choice against upkeep, not a no-brainer._  Numbers meet the harness.
- **E16-S8-T1** — Set boat constants — Fill `LOGISTICS.boat.base/growth/upkeep/mult/slotBonus` with first-pass values scaled off the E15 car curve.
- **E16-S8-T2** — Set crew constants — Fill `CREW.base/growth/mult/upkeep` so a full crew is a modest, ongoing `×` for a modest, ongoing cost.
- **E16-S8-T3** — Set sea-destination `×` — Choose each sea destination's flat `xMult` so the set is worth the hull that unlocks it.
- **E16-S8-T4** — Run the harness — Simulate the beat-15→16 stretch at `GAME_SPEED=∞`; read `T(beat 16)` against the ~3:00-era target.
- **E16-S8-T5** — Tune the upkeep tension — Adjust `upkeep` until total logistics drain sits at a deliberate share of income (a choice), not trivial.
- **E16-S8-T6** — Check time-to-next-purchase — Confirm boat/crew/toy buys keep the 30–120s active-play band through the sea leg.
- **E16-S8-T7** — Verify slot value — Ensure the extra transport slot is worth roughly one mid sea-destination so slots stay a meaningful reward.
- **E16-S8-T8** — Cross-check the stack — Confirm boat `mult` multiplies (not adds) across `L_comfort`/`L_path` and no layer double-counts.
- **E16-S8-T9** — Commit a golden curve — Snapshot the tuned beat-16 milestone into the balance golden file so regressions are caught.
- **E16-S8-T10** — Document the knobs — Note the final `LOGISTICS.boat`/`CREW`/sea-`×` values and their rationale inline in `config.js`.

## E16-S9 — Man-Overboard-Proofing (save / migration / offline)
_As a returning player, I want my boats, crew, and sea income to survive reloads and away-time, so that nothing sinks while I'm gone._  Persistence and offline correctness for the whole marina.
- **E16-S9-T1** — Extend the save schema — Add `logistics.boatTier`, `logistics.boatsOwned`, `crew{}`, and sea-destination ownership to `state.js`; bump `version`.
- **E16-S9-T2** — Write the migration — Add a `MIGRATIONS[n]` that seeds the new fields (boatTier 0, empty crew) for pre-E16 saves without touching other state.
- **E16-S9-T3** — Persist crewed-amenity flags — Save which yacht amenities are crew-operated so offline reflects real operating state.
- **E16-S9-T4** — Offline sea income — Ensure `sea:true` destination `×` and boat `mult` are applied during the coarse offline macro-steps, identical to online.
- **E16-S9-T5** — Offline upkeep — Apply boat/crew upkeep across offline steps too, so away-time is honest and not a free ride.
- **E16-S9-T6** — Away summary line — Add "+X from the yacht (−Y upkeep)" to the "While you were away" modal so the net is transparent.
- **E16-S9-T7** — Cap interaction — Confirm `OFFLINE_CAP` clamps sea income and upkeep together so long absences stay in the player's favor but bounded.
- **E16-S9-T8** — Export/import round-trip — Verify the base64 export string carries boats/crew/sea state and re-imports byte-identically.
- **E16-S9-T9** — Backup-slot safety — Ensure a mid-migration crash falls back to the rotating backup save without losing the boat.
- **E16-S9-T10** — Migration fixture test — Add a pre-E16 fixture save and assert it loads, migrates, and shows a plausible marina with no errors.

## E16-S10 — Shipshape (QA / polish / juice)
_As a player, I want the sea leg to feel finished, so that the whole marina reads clean, funny, and bug-free._  Tests, formatting, and a little salt spray.
- **E16-S10-T1** — Number formatting — Verify boat costs, upkeep, and sea-`×` all render through `util.format` (scientific/suffix) with no raw floats.
- **E16-S10-T2** — Edge-case: negative cash — Confirm upkeep can never drive cash below zero; the throttle engages and the UI explains why.
- **E16-S10-T3** — Edge-case: crew over cap — Buying past `crewCap` is blocked cleanly with a helpful "your boat's full" message.
- **E16-S10-T4** — Unlock-order fuzz — Randomized buy sequences never reveal a sea destination before its hull or a toy before its predecessor.
- **E16-S10-T5** — Event dedupe — Beat 16 and each first-unlock fire exactly once across save/reload, no duplicate toasts.
- **E16-S10-T6** — Juice: wake ripple — A subtle, reduced-motion-safe ripple on the marina card when a boat is bought.
- **E16-S10-T7** — Copy proofread — Pass every boat/crew/toy/destination string for tone (wry, Dutch, no "etc.") and length.
- **E16-S10-T8** — Performance check — Confirm enumerating boats/crew/sea destinations each render stays cheap at 1000 owned toys.
- **E16-S10-T9** — Regression suite — Add the S2/S8/S9 tests to the local test runner so the marina is covered going forward.
- **E16-S10-T10** — Manual playtest pass — Play beat 15→16 at `GAME_SPEED=5`, log any pacing or clarity snags, and file follow-ups.

## Definition of Done (epic)
- [ ] Boat tier (dinghy→superyacht incl. the Yacht) buyable via the generic logistics flow, with cost/upkeep/mult/slot from `config.LOGISTICS.boat`.
- [ ] Sea-only destinations unlock behind hull tiers and grant their flat global `×`.
- [ ] Yacht amenity cluster (incl. the floating pool) ships with `costGrowth≈1.8`, Comfort weights, and crew-operation gating.
- [ ] Crew seed hireable as a pre-staff placeholder (tiny `×` + upkeep), flagged for E19 absorption.
- [ ] Tier-11 marina suite reveal gated on Comfort + boat.
- [ ] Traveler/Connoisseur branch bonuses applied; neutral builds still complete beat 16.
- [ ] Harness shows beat 16 within ±15% of target; golden curve committed.
- [ ] Boats/crew/sea state persist, migrate from pre-E16 saves, and behave correctly offline (income and upkeep).
- [ ] All new strings proofed for tone; numbers formatted; unlock/beat events fire exactly once.
