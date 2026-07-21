# E17 — Wheels Up
> Act II climb · Accommodation tier 11 (+hangar) · Jet tier, instant destination unlocks, jet-cabin amenities, logistics capstone · Beat 17 (*Wheels Up*) · Traveler emphasis

**Epic goal:** Cap the private-logistics arc with aviation — buy jets that collapse destination cost and time, put the whole map one tap away, and award a car+boat+jet "capstone" multiplier as the payoff for the entire logistics investment.
**Player-visible outcome:** A hangar panel with a jet slot and range readout, destinations that become *instant*, a jet-cabin full of ridiculous toys, and a headline capstone bonus that lights up when you own all three vehicle classes.
**Systems touched:** `data/logistics.js` (jet tier + capstone), `data/destinations.js` (instant flags), `data/amenities.js` (jet cabin), `data/accommodation.js` (airside suite), `config.js` (`LOGISTICS.jet`, `LOGISTICS.capstone`, `DEST.jetDiscount`), `engine.js`, `ui.js`, `state.js`.
**Math/balance notes:** Jets are the most expensive logistics rung (`costGrowth:2.0`); they apply a real `DEST.jetDiscount` (clamped above zero) and remove travel-time gates for in-range destinations; the `LOGISTICS.capstone` set-bonus is tuned exciting-but-not-runaway; jet `upkeep` is the game's largest drain so far, deliberately keeping the fleet a choice rather than a no-brainer.

## E17-S1 — The Hangar Manifest (data model)
_As a player who's conquered road and sea, I want jets defined as data, so that the sky becomes the next thing to buy._  One manifest drives every aircraft, cabin, and the capstone.
- **E17-S1-T1** — Add jet tier table — In `data/logistics.js` add `jets[]` of `{id,name,class:'jet',costBase,costGrowth,upkeep,mult,slotBonus,range}` from turboprop → light → midsize → heavy → airliner.
- **E17-S1-T2** — Set the top-of-ladder cost ramp — Give jets `costBase` ~10× the Yacht and `costGrowth:2.0` so aircraft are the most expensive logistics rung by far.
- **E17-S1-T3** — Define range tiers — Add a `range` field per jet that determines how many/which destinations it can reach instantly (short-haul → global).
- **E17-S1-T4** — Add the capstone entry — Define a `LOGISTICS.capstone` set-bonus record awarded for owning car + boat + jet simultaneously (a headline global `×`).
- **E17-S1-T5** — Define jet-cabin amenities — Add `tag:'jet'` amenities (leather recliner, in-flight chef, sky-bar, bedroom cabin, shower suite) as data rows.
- **E17-S1-T6** — Mark instant-unlock eligibility — Tag destinations with `jetInstant:true` so the engine knows which collapse to instant when a jet's range covers them.
- **E17-S1-T7** — Author jet flavor copy — One dry line per aircraft ("A turboprop. It's technically flying. Your ears disagree.").
- **E17-S1-T8** — Author capstone copy — A smug "car, boat, jet — the holy trinity of not taking the bus" unlock blurb.
- **E17-S1-T9** — Wire unlock gates — Set each jet's `unlockAt` to require the prior jet + Comfort + a jet cabin or two, keeping the order.
- **E17-S1-T10** — Data-shape test — Assert every jet has `range`, monotonic `costBase`, and that the capstone references three valid vehicle classes.

## E17-S2 — Collapsing the Map (core logic/engine)
_As a player, I want a jet to make far destinations instant and cheap, so that global reach is the payoff for the whole logistics arc._  The engine turns range into collapsed cost and time.
- **E17-S2-T1** — Implement instant-reach — In `engine.js`, when a jet's `range` covers a `jetInstant` destination, remove its travel-time gate and mark it instantly ownable.
- **E17-S2-T2** — Apply the destination discount — Reduce eligible destination costs by `DEST.jetDiscount` (a real cut) so the jet visibly collapses the cost side too.
- **E17-S2-T3** — Fold jet mult into logistics — Add jet `mult` into `L_logistics` alongside car/boat, additive-within-layer.
- **E17-S2-T4** — Award the capstone bonus — When car+boat+jet are all owned, multiply in `LOGISTICS.capstone` as its own clearly-labeled factor.
- **E17-S2-T5** — Wire jet upkeep — Add jet `upkeep` (the largest drain in the game so far) to `applyUpkeep(dt)` so the jet is a genuine ongoing commitment.
- **E17-S2-T6** — Balance-guard the no-brainer — Ensure the upkeep scales so flying everywhere raises income *and* drain proportionally, making the jet a choice per the epic's math note.
- **E17-S2-T7** — Satisfy beat 17 — Trigger beat 17 (*Wheels Up*) `requires:{ownJet:true}` on first jet purchase, advancing `story.beat`.
- **E17-S2-T8** — Emit events — Fire `purchase`/`unlock` for jets, instant-reached destinations, and the capstone so UI/story react.
- **E17-S2-T9** — Keep it pure & capped — Route through `math.js` `N.*`; clamp `DEST.jetDiscount` so destination costs never hit zero.
- **E17-S2-T10** — Engine tests — Assert a jet collapses the right destinations, applies discount + mult, awards the capstone only with all three vehicles, and fires beat 17 once.

## E17-S3 — The Hangar Tab (UI/buttons)
_As a player, I want a clean hangar panel, so that buying jets, cabins, and seeing the capstone is obvious._  Buttons, ranges, and a big honest upkeep number.
- **E17-S3-T1** — Add the hangar panel — New `ui.js` section revealed once beat 16 (boats) is done and a jet is on the horizon.
- **E17-S3-T2** — Render jet buttons — Show name, next cost, owned, `range`, and the `+mult`/`+slot` delta per aircraft.
- **E17-S3-T3** — Show the range map — A simple readout of which destinations a jet reaches instantly ("this jet: 8 of 12 destinations instant").
- **E17-S3-T4** — Big upkeep readout — Display the jet's dominant upkeep prominently and colour it when it eats too much income.
- **E17-S3-T5** — Capstone banner — A distinct "Logistics Capstone: car + boat + jet → ×N" card that lights up when the set completes.
- **E17-S3-T6** — Cabin amenity buttons — Buy buttons for jet-cabin toys with cost/owned/Comfort delta, matching the deck-toy pattern.
- **E17-S3-T7** — Wire generic intents — Buttons call `engine.buyLogistics(id)` / `engine.buyAmenity(id)`; the capstone is automatic, no button.
- **E17-S3-T8** — Instant-reach feedback — When a destination becomes instant, show a "no wait" badge in the destinations list.
- **E17-S3-T9** — a11y + reduced-motion — aria-live announcements for jet/capstone unlocks; gate any takeoff flourish behind `prefers-reduced-motion`.
- **E17-S3-T10** — Render test — Assert the hangar panel and capstone banner expose stable `data-id` hooks and update on purchase events.

## E17-S4 — Wheels Up (the headline new thing)
_As a Dutch tourist who started at a rainy bus stop, I want my own private jet that puts the whole world one tap away, so that logistics climaxes with genuine flex._  The capstone moment of the logistics arc.
- **E17-S4-T1** — Define the flagship jet — Make the top aircraft (the airliner-as-private-jet) the headline with a huge `mult`, global `range`, and the game's biggest upkeep.
- **E17-S4-T2** — Deliver instant global reach — On owning the flagship, mark every current destination `jetInstant` so travel time effectively disappears worldwide.
- **E17-S4-T3** — Trigger the capstone — Ensure the flagship completes car+boat+jet and lights the `LOGISTICS.capstone` bonus as the arc's payoff.
- **E17-S4-T4** — Wheels-up ceremony — A one-time stronger unlock moment/line when the first jet (and again the flagship) is bought, reduced-motion-safe.
- **E17-S4-T5** — Comfort + flex payoff — Give the flagship a Comfort contribution so it also nudges the ladder toward E18's 6-star gate.
- **E17-S4-T6** — Author the showpiece copy — "From a bus stop in the drizzle to your own jet. The stroopwafel made it too." — the arc's emotional beat.
- **E17-S4-T7** — Balance the flagship — Tune flagship `costBase`/`upkeep` so it's a saved-for milestone, not an impulse, and its upkeep keeps it a choice.
- **E17-S4-T8** — Capstone value tuning — Set `LOGISTICS.capstone` so completing the trinity is exciting but not curve-breaking (harness-checked in S8).
- **E17-S4-T9** — Persist flagship + capstone — Save flagship ownership and capstone-active state so reloads/offline keep the reach and the bonus.
- **E17-S4-T10** — QA the showpiece — Verify buying the flagship makes all destinations instant, awards the capstone once, and never double-counts the bonus.

## E17-S5 — Cabin Class (amenity / small-wins cluster)
_As an idler at 40,000 feet, I want a drip of ridiculous cabin upgrades, so that even the flight has small wins._  The small-win engine, now pressurized.
- **E17-S5-T1** — Define the cabin cluster — Add ~8 `tag:'jet'` amenities (reclining seat → lie-flat → cabin bed → in-flight chef → sky-bar → shower suite → cinema → private office).
- **E17-S5-T2** — Set the prestige slope — Give the cluster `costGrowth:1.85` so cabin toys sit a notch above yacht deck toys.
- **E17-S5-T3** — Targeted multipliers — Each cabin toy adds a small logistics-scoped `xMult` so the cluster feeds income as well as Comfort.
- **E17-S5-T4** — Comfort contributions — Feed each `comfort` into `amenityScore`; confirm the saturating cap still applies at this altitude of numbers.
- **E17-S5-T5** — Unlock cadence — Gate toys behind Comfort + prior toy so one lands roughly every 60–90s of active play during the jet leg.
- **E17-S5-T6** — Flavor copy — One dry line each ("An in-flight chef. He has also never heard of a stroopwafel. You are educating him.").
- **E17-S5-T7** — Generic buy flow — Confirm `engine.buyAmenity(id)` covers the whole cluster with no bespoke code.
- **E17-S5-T8** — Button readouts — Show name/cost/owned/next-Comfort delta per cabin toy, consistent with prior clusters.
- **E17-S5-T9** — Save the levels — Persist per-toy `level`, default 0 for old saves; migration is a no-op.
- **E17-S5-T10** — QA rapid buys — Zero-cash spam, buy-max, Comfort recompute, and no free offline cabin toys.

## E17-S6 — The Airside Suite (accommodation / progression step)
_As a climber, I want the hangar to come with a step up in where I stay, so that aviation advances the ladder too._  Tier 11 gains its airside character before the 6-star jump.
- **E17-S6-T1** — Attach the hangar suite — In `data/accommodation.js`, add a tier-11 "airside/hangar suite" variant unlocked by owning a jet.
- **E17-S6-T2** — Set the gate — Tie the reveal to `ACC.unlock[11]` Comfort + `jetTier>=1`, wired through `STORY_GATES`.
- **E17-S6-T3** — Reflect in accScore — Ensure the variant adds its `ACC_BASE·ACC_GROWTH^11` term so Comfort steps toward E18's gate.
- **E17-S6-T4** — Reveal copy — "The suite where the runway is basically your driveway" — wry, aspirational.
- **E17-S6-T5** — Reveal event — Emit `unlock` + `story:beat` hooks so UI swaps the label/art.
- **E17-S6-T6** — Gate top cabins on the suite — Make the top cabin toys check the airside suite to keep progression ordered.
- **E17-S6-T7** — Balance the step — Harness-confirm the tier-11 airside step doesn't overshoot the pre-E18 Comfort target.
- **E17-S6-T8** — Migration default — Old tier-11 saves without a jet keep the plain label until they buy one; no forced change.
- **E17-S6-T9** — UI label swap — Show "Tier 11 · Airside Suite" in the accommodation readout and stats screen.
- **E17-S6-T10** — QA the gate — Verify the airside suite needs both Comfort and a jet, and reveals exactly once when both are met.

## E17-S7 — The Grand Tourist Goes Global (path / branch flavor)
_As a Traveler, I want jets to be the ultimate expression of my breadth build, so that the logistics capstone feels like my victory lap._  Branch-aware payoff that never strands other builds.
- **E17-S7-T1** — Traveler jet discount — Stack the `traveler` destination −15% with `DEST.jetDiscount` (respecting the zero-cost clamp) for the deepest collapse.
- **E17-S7-T2** — Traveler slot synergy — Honor traveler `+1 transport slot` so a traveler runs the most simultaneous destination `×`.
- **E17-S7-T3** — Traveler capstone bump — Give traveler a small extra `LOGISTICS.capstone` multiplier so the trinity rewards the breadth identity most.
- **E17-S7-T4** — Path-point sources — Grant traveler path points for first jet, first instant-global reach, and completing the capstone.
- **E17-S7-T5** — Wanderer's Instinct synergy — Ensure the tree node (destinations −20%, +1 slot) stacks correctly with jet discounts within the clamp.
- **E17-S7-T6** — Neutral-safe floor — Confirm vlogger/crypto/connoisseur players still buy every jet and finish beat 17 without the traveler perk.
- **E17-S7-T7** — Softcap respected — Route path bonuses through `1 + PATH.rate·points^PATH.softcapExp` so global-travel points don't runaway.
- **E17-S7-T8** — Branch flavor copy — Alternate jet blurbs keyed on `story.branch` (traveler = "collect the map", others = a lighter one-liner).
- **E17-S7-T9** — Balance the perk — Harness-check the traveler jet/capstone stack keeps beat 17 within ±15% of neutral.
- **E17-S7-T10** — QA re-spec — Switch branches and verify jet discounts, slots, and the capstone bump recompute live.

## E17-S8 — Flight Testing (balance & tuning)
_As the balancer, I want jets tuned so the map-collapse is thrilling but the upkeep keeps it a decision, so that logistics-III lands as a choice, not an auto-win._  The epic's central tension, tuned.
- **E17-S8-T1** — Set jet constants — Fill `LOGISTICS.jet.base/growth/upkeep/mult/slotBonus/range` scaled off the boat curve.
- **E17-S8-T2** — Set the discount/instant knobs — Choose `DEST.jetDiscount` and instant-reach thresholds so the collapse is felt without trivializing destinations.
- **E17-S8-T3** — Set the capstone value — Pick `LOGISTICS.capstone` so the trinity is a highlight, not a curve-breaker.
- **E17-S8-T4** — Run the harness — Simulate the beat-16→17 stretch at `GAME_SPEED=∞`; read `T(beat 17)` against the logistics-era target.
- **E17-S8-T5** — Tune the upkeep tension — Adjust jet `upkeep` until owning the fleet is deliberately a meaningful cash share — the "choice not no-brainer" contract.
- **E17-S8-T6** — Time-to-next-purchase — Confirm jet/cabin buys keep the 30–120s active band through the jet leg.
- **E17-S8-T7** — Regression on earlier logistics — Verify car/boat upkeep + jets together don't over-drain and stall beat progress.
- **E17-S8-T8** — Stack sanity — Confirm jet `mult`, capstone, discounts, and traveler perks compose correctly with no double-count.
- **E17-S8-T9** — Commit the golden curve — Snapshot the beat-17 milestone into the balance golden file.
- **E17-S8-T10** — Document the knobs — Inline-comment final `LOGISTICS.jet`, `DEST.jetDiscount`, and `capstone` values with rationale in `config.js`.

## E17-S9 — Preflight Checklist (save / migration / offline)
_As a returning player, I want my jets, cabins, capstone, and instant-reach to survive reloads and away-time, so that nothing falls out of the sky._  Persistence and offline correctness for aviation.
- **E17-S9-T1** — Extend the save schema — Add `logistics.jetTier`, `jetsOwned`, cabin levels, `capstoneActive`, and instant-reached destination flags; bump `version`.
- **E17-S9-T2** — Write the migration — `MIGRATIONS[n]` seeds jet fields (jetTier 0, capstoneActive false) for pre-E17 saves without touching other state.
- **E17-S9-T3** — Persist capstone state — Save `capstoneActive` derived from vehicle ownership and re-verify it on load (never trust a stale flag).
- **E17-S9-T4** — Offline jet income — Apply jet `mult`, capstone, and instant destinations in the coarse offline macro-steps identically to online.
- **E17-S9-T5** — Offline jet upkeep — Apply the large jet upkeep across offline steps so away-time stays honest.
- **E17-S9-T6** — Away summary line — Add "+X from the fleet (−Y upkeep)" to the "While you were away" modal, including the capstone's share.
- **E17-S9-T7** — Cap interaction — Confirm `OFFLINE_CAP` bounds jet income and upkeep together, staying in the player's favor but limited.
- **E17-S9-T8** — Export/import round-trip — Verify the export string carries jets/cabins/capstone and re-imports identically.
- **E17-S9-T9** — Backup safety — Ensure a crash mid-migration falls back to the rotating backup without losing the jet or capstone.
- **E17-S9-T10** — Migration fixture test — Add a pre-E17 fixture save; assert it loads, migrates, and derives the capstone correctly with no errors.

## E17-S10 — Cleared for Takeoff (QA / polish / juice)
_As a player, I want the jet leg to feel finished, so that the logistics finale reads clean, funny, and stable._  Tests, formatting, and a touch of runway.
- **E17-S10-T1** — Number formatting — Verify jet costs, the big upkeep, and the capstone `×` render through `util.format` with no raw floats.
- **E17-S10-T2** — Edge-case: upkeep vs cash — Confirm jet upkeep can't drive cash negative; the throttle engages and the UI explains it.
- **E17-S10-T3** — Edge-case: capstone flip-flop — Losing/lacking a vehicle correctly removes the capstone with no ghost multiplier.
- **E17-S10-T4** — Instant-reach correctness — Fuzz destination sets to confirm only in-range destinations go instant, never others.
- **E17-S10-T5** — Event dedupe — Beat 17, first-jet, flagship, and capstone events each fire exactly once across save/reload.
- **E17-S10-T6** — Juice: takeoff cue — A subtle, reduced-motion-safe cue on the hangar card when a jet is bought.
- **E17-S10-T7** — Copy proofread — Pass every jet/cabin/capstone/destination string for tone and length; no "etc.".
- **E17-S10-T8** — Performance check — Confirm capstone/range recomputation each render stays cheap with a full fleet and many destinations.
- **E17-S10-T9** — Regression suite — Add the S2/S8/S9 tests to the local runner so aviation stays covered.
- **E17-S10-T10** — Manual playtest — Play beat 16→17 at `GAME_SPEED=5`, note pacing/clarity snags around the capstone, and file follow-ups.

## Definition of Done (epic)
- [ ] Jet tier (turboprop→flagship) buyable via the generic logistics flow with cost/upkeep/mult/slot/range from `config.LOGISTICS.jet`.
- [ ] Jets collapse eligible destinations to instant and apply `DEST.jetDiscount` (clamped above zero).
- [ ] Logistics capstone (car+boat+jet) awards `LOGISTICS.capstone` as a distinct, correctly-composed factor.
- [ ] Jet-cabin amenity cluster ships with `costGrowth≈1.85`, Comfort weights, and ordered gating.
- [ ] Tier-11 airside suite reveal gated on Comfort + jet.
- [ ] Traveler branch bonuses applied; neutral builds still complete beat 17.
- [ ] Upkeep tuned so the fleet is a deliberate choice; harness shows beat 17 within ±15% of target; golden curve committed.
- [ ] Jets/cabins/capstone/instant-reach persist, migrate from pre-E17 saves, and behave correctly offline (income and upkeep).
- [ ] All new strings proofed; numbers formatted; unlock/beat/capstone events fire exactly once.
