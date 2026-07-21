# E28 — Building Paradise
> Journey stage: Act III summit · Accommodation tier 21 (Island Resort Empire) · New systems: island buildings (generator+amenity hybrids), guest income as a new revenue tier, self-run resort economy, upkeep at scale · Story beat 29 (*Building Paradise*) · Build-path emphasis: all four (each develops the island differently)

**Epic goal:** Turn the bare private island bought in E27 into a working resort. For the first time the player *produces* luxury instead of buying it — erecting villas, a marina, a heliport and a spa that generate income, host paying guests, and cost upkeep at scale.
**Player-visible outcome:** An "Island" build panel where buildings are placed like generators but also raise Comfort like amenities; a new **guest income** revenue tier where other people's money finally flows *to* the former shed-dweller; an occupancy meter and an upkeep ledger showing paradise paying for itself.
**Systems touched:** `data/island.js` (new), `data/amenities.js` (island frills), `data/accommodation.js` (tier 21), `math.js` (guest-income tier, upkeep, occupancy), `engine.js` (island production/tick), `state.js` (island state + migration), `ui.js` (build panel/ledger), `config.js` (`ISLAND.*`, `GUEST_*`).
**Math/balance notes:** Buildings reuse geometric cost `costBase·costGrowth^n` and milestone doublings `2^floor(count/MILESTONE_STEP)`; guest income plugs into `dCash/dt` as a parallel D-tier so the full `M_k` stack applies; `guestDemand = GUEST_K·log10(1+Comfort/GUEST_C0)·exclusivityMult` (log-softcapped); upkeep `Σ count·upkeepBase·upkeepGrowth^tier` as a scaling cash sink calibrated so bigger is a *choice*, not a no-brainer. Beat 29 targets the ~15h mark in the pacing curve.

## E28-S1 — Blueprints & Deeds (data model)
_As a fresh island owner, I want a catalog of buildings I can erect on my sandbar, so that developing paradise is data-driven, not hardcoded._  Declares the whole resort as declarative data so the engine stays generic.
- **E28-S1-T1** — Create the registry — Add `data/island.js` with a building registry; each entry `{id,name,tag,costBase,costGrowth,produces,comfort,guestCap,upkeepBase,unlock}` so buildings are pure data the generic engine reads.
- **E28-S1-T2** — Seed the four anchors — Author `villa_cluster`, `marina`, `heliport`, `spa_pavilion` with distinct tags (`stay`/`transport`/`transport`/`wellness`), each a generator+amenity hybrid producing income *and* Comfort.
- **E28-S1-T3** — Multi-currency build costs — Give buildings a `cost:{cash,comfort,legacy}` shape reading from `config.ISLAND` so the mega-sink can demand more than cash and stay the biggest ongoing spend in the game.
- **E28-S1-T4** — `produces` descriptors — Tag each building's output: villas → guest income, marina/heliport → transport-slot + destination `×`, spa → Comfort; mark each with a `scope` so the multiplier stack targets it correctly.
- **E28-S1-T5** — Per-building `guestCap` — Give each stay building a `guestCap` that raises the island's total hosting capacity; this is the number the S4 hosting system reads.
- **E28-S1-T6** — Per-building `upkeepBase` — Give every building a per-second cash upkeep constant (in `config.ISLAND.upkeep`) so running a resort has a felt operating cost.
- **E28-S1-T7** — Flavor copy — Write wry Dutch-tourist names/descriptions ("Heliport — so guests don't drip seawater on the marble", "Marina — a jetty is just a wet queue").
- **E28-S1-T8** — Unlock gates — Set each building's `unlock` to require the island owned (beat 29) plus a Comfort/tier step referencing the C29-region value in `STORY_GATES`.
- **E28-S1-T9** — Register tags in the scope map — Add the island tags to `math.js`'s scope resolution so building multipliers land in the right `L_*` layer and nothing is silently ignored.
- **E28-S1-T10** — Data validation — Add a dev assert that every island entry has all required keys and monotonic cost, so a typo can't ship a soft-locked building.

## E28-S2 — The Resort Runs Itself (core logic/engine)
_As a hands-off mogul, I want my buildings to produce luxury, host guests, and bill me for upkeep every tick, so that the island is a living economy, not a static trophy._  Makes the island a first-class part of the tick loop.
- **E28-S2-T1** — Island production in `tick` — On each `engine.tick`, sum every building's `produces` into its target (guest income → cash tier, Comfort → ComfortRaw) via the existing generic production path.
- **E28-S2-T2** — Guest income as a revenue tier — Add `guestIncome` to `dCash/dt` alongside `prod_1`, treated as a parallel D-tier so `L_comfort·L_ascension·L_tree` and friends all apply.
- **E28-S2-T3** — Building cost function — Reuse geometric `cost_k(n)=costBase·costGrowth^n` per building count behind a generic `engine.buildIsland(id)` intent, mirroring `buyAmenity`.
- **E28-S2-T4** — Upkeep drain — Each tick subtract `Σ count·upkeepBase·upkeepGrowth^tier` from cash, clamp cash at zero, and emit `upkeep:short` when income can't cover it.
- **E28-S2-T5** — Occupancy model — Compute `occupied = min(guestDemand, guestCap)`; only occupied guests pay, so overbuilding stays yields diminishing returns until Comfort catches up.
- **E28-S2-T6** — Guest-demand formula — Implement `guestDemand = GUEST_K·log10(1+Comfort/GUEST_C0)·exclusivityMult`, a log-softcapped curve so demand grows steadily but never runs away.
- **E28-S2-T7** — Net-income accounting — Track `net = grossGuestIncome − upkeep` and expose it via an engine event for the UI ledger and for per-building ROI hints.
- **E28-S2-T8** — Milestone doublings for buildings — Apply `2^floor(count/MILESTONE_STEP)` to building output so island buildings share the same dopamine "next double in 3 buys" curve as generators.
- **E28-S2-T9** — Emit events — Fire `island:build`, `guest:checkin`, and `upkeep:short` through the existing pub/sub so UI, stats, and story all react.
- **E28-S2-T10** — Unit tests — Test production, upkeep, occupancy, and the zero-cash clamp against hand-computed expectations for fixed states.

## E28-S3 — The Developer's Dashboard (UI / buttons)
_As a player standing on my new sandbar, I want simple build buttons and a clear ledger, so that I can see paradise pay for itself at a glance._  Exposes the whole system as buttons + readouts.
- **E28-S3-T1** — Island panel — Add an "Island" section to `ui.js` rendering one build button per building with name, count, next cost, and what it produces.
- **E28-S3-T2** — Occupancy meter — Render occupied/`guestCap` as a bar with a live guest count, subscribing to `guest:checkin`.
- **E28-S3-T3** — Upkeep ledger — Show gross income, upkeep, and net-per-second with green/red coloring so a money-losing building is obvious.
- **E28-S3-T4** — Multi-currency cost display — Buttons show cash+comfort+legacy costs via `util.format` and grey out when any currency is short.
- **E28-S3-T5** — Next-delta hints — On hover/aria, show what the next building adds to Comfort and guest capacity, so purchases are informed.
- **E28-S3-T6** — Unlock reveals — When a building unlocks, emit `unlock` and flash the new button; keep still-locked buildings behind a teaser card.
- **E28-S3-T7** — Bulk build — Reuse the existing ×1/×10/max control for buildings via the geometric-sum cost `costBulk`.
- **E28-S3-T8** — Net-negative banner — If island `net` goes negative, show a wry banner ("Your resort is losing money faster than a Dutchman parts with it").
- **E28-S3-T9** — Aria-live wiring — Route build-success and guest-arrival announcements through the existing `aria-live` ticker for the accessibility floor.
- **E28-S3-T10** — Snapshot test — Render the island panel from a fixture state and assert buttons/ledger values, guarding against layout regressions.

## E28-S4 — You're the Host Now (the headline new thing)
_As a former shed-dweller, I want to host paying guests on my island, so that for the first time other people's money flows to me instead of the reverse._  The signature "you now produce luxury" feature.
- **E28-S4-T1** — Guest roster data — Add guest archetypes (`backpacker`, `influencer`, `crypto_bro`, `old_money`) to `data/island.js`, each with a nightly `rate` and a Comfort/exclusivity requirement.
- **E28-S4-T2** — Check-in scheduler — Each tick, admit guests up to `guestCap` weighted by demand, with higher-tier guests requiring higher Comfort/exclusivity.
- **E28-S4-T3** — Nightly-rate income — Occupied guests add `Σ rate` to guest income, routed through the S2 revenue tier so the whole `M_k` stack multiplies it.
- **E28-S4-T4** — Exclusivity → guest quality — Higher exclusivity (the E21 meter) admits richer guests (`old_money` pays ~100× a `backpacker`); wire the exclusivity `×` in.
- **E28-S4-T5** — Guest satisfaction — Amenities (S5) raise a satisfaction score that boosts rate and demand; dissatisfied guests check out early.
- **E28-S4-T6** — Island rating — Roll satisfaction into a rolling "island rating" that feeds demand, with wry one-star/five-star review flavor lines.
- **E28-S4-T7** — Story hook — Fire beat 29 "Building Paradise" on the first guest check-in; the mysterious patron from beat 22 books the first suite.
- **E28-S4-T8** — Guest-cap scaling — Tune villas/bungalows raising `guestCap` so early hosting is a trickle and late hosting becomes the dominant income tier.
- **E28-S4-T9** — Flavor copy — Write guest-arrival lines ("An influencer arrives, films the sunset, tags nobody"), wry and Dutch-abroad.
- **E28-S4-T10** — QA hosting — Test the overbooking clamp, zero-Comfort (no guests), exclusivity gating, and that guest income actually routes through the multiplier stack.

## E28-S5 — Island Frills (amenity / small-wins cluster)
_As a host chasing five-star reviews, I want a stream of cheap island touches to unlock, so that there's a new silly upgrade every couple of minutes plus a guest-satisfaction bump._  Keeps the small-wins cadence alive on the island.
- **E28-S5-T1** — Define island frills — Add island amenities to `data/amenities.js` with `tag:'island'` (tiki torches, welcome-cocktail cart, beach cabanas, coconut drone delivery), `costGrowth:1.5`, ramp ≈2×/step.
- **E28-S5-T2** — Wire purchase flow — Reuse generic `engine.buyAmenity(id)`; no bespoke code per frill.
- **E28-S5-T3** — Comfort + satisfaction — Feed each frill's `amenityScore` into ComfortRaw *and* the S4 satisfaction score; verify the saturating Comfort cap still holds.
- **E28-S5-T4** — Targeted multipliers — Give each frill a small `xMult` scoped to guest income via `L_path`, so decorating nudges the new revenue tier.
- **E28-S5-T5** — Unlock cadence — Gate each frill behind the previous + a Comfort step and emit `unlock`, so one pops roughly every ~2 min of active play.
- **E28-S5-T6** — Flavor copy — One-line Dutch-tourist descriptions ("Coconut drone — because walking to the bar is for the mainland").
- **E28-S5-T7** — UI buttons — Show name/cost/owned/next-satisfaction delta on each frill button.
- **E28-S5-T8** — Themed sub-clusters — Group frills by zone (beach/pool/lobby) so completing a theme feels like decorating an area.
- **E28-S5-T9** — Save/migration — Persist frill levels; default 0 for old saves; grant no free frills offline.
- **E28-S5-T10** — QA — Zero-cash, rapid buys, satisfaction recompute, Comfort recompute, and cap behavior.

## E28-S6 — Tier 21: Island Resort Empire (accommodation / progression step)
_As a mogul who bought a bare island, I want it to formally become accommodation tier 21, so that the shed→island ladder gains its final home-base rung and the reveal lands._  The big-step progression beat of the epic.
- **E28-S6-T1** — Add tier 21 — Extend `data/accommodation.js` with "Island Resort Empire" at tier 21; `accScore = ACC_BASE·ACC_GROWTH^21`.
- **E28-S6-T2** — Gate the tier — Set `ACC.unlock[21]` to require the island owned (beat 28→29) plus Comfort ≥ the C29-region threshold in `STORY_GATES`.
- **E28-S6-T3** — Home-base migration — Relocate logistics/staff (from E27) to the island on tier-up by setting a `homeBase = 'island'` flag the relevant systems read.
- **E28-S6-T4** — Big Comfort jump — Tune the `ACC_GROWTH` step so tier 21 feels like *arriving*, delivering a large persistent `accScore`, not a rounding error.
- **E28-S6-T5** — Reveal sequence — On tier-up, play the "Building Paradise" reveal and unlock the S3 build panel.
- **E28-S6-T6** — Cosmetic swap — Swap the backdrop/theme to an island palette via a framework-agnostic CSS class only.
- **E28-S6-T7** — Story wiring — Set `story.flags.islandDeveloped` and unlock the beat-30 prerequisite path (Comfort ≥ C30).
- **E28-S6-T8** — Tier upgrade layer — Add per-tier `L_upgrade` island upgrades (dock extension, private beach) purchasable at tier 21.
- **E28-S6-T9** — Save/migration — Persist tier 21 and `ownedTiers`; migrate saves that predate the island tier.
- **E28-S6-T10** — QA — Verify the gate can't be skipped, the reveal fires once, and the backdrop swap respects `prefers-reduced-motion`.

## E28-S7 — Every Vacationer Builds Different (path / branch flavor)
_As a player who chose an identity ten hours ago, I want my island to reflect my build path, so that the vlogger's content resort feels nothing like the connoisseur's hushed retreat._  Serves all four branches on the island.
- **E28-S7-T1** — Branch-flavored variants — Add `branchFlavor` text/`×` tweaks so villas re-skin per `story.branch` (content villa / trading lounge / wine-cellar villa / expedition lodge).
- **E28-S7-T2** — Vlogger perk — Guest influencers generate Clout as well as cash; wire a `dClout/dt` bonus scoped to island guests.
- **E28-S7-T3** — Crypto perk — A beachside "server farm cooled by the sea" building feeds Savvy passive so island reserves earn while you tan.
- **E28-S7-T4** — Connoisseur perk — Raise on-island exclusivity `×` and over-represent `old_money` guests; offer a boutique low-`guestCap`/high-rate mode.
- **E28-S7-T5** — Traveler perk — Marina/heliport grant extra transport slots + destination `×`, turning the island into a hub to the E24 exclusive destinations.
- **E28-S7-T6** — Hybrid bonus — If two paths ≥ P1, unlock a combo building ("influencer-funded trading yacht"), mirroring the beat-14 hybrid pattern.
- **E28-S7-T7** — Branch flavor copy — Write per-branch descriptions for the anchor buildings; wry and identity-specific.
- **E28-S7-T8** — Path-point sink — Let players spend path points on island `L_path` bonuses so branches stay relevant after the beat-22 reconvergence.
- **E28-S7-T9** — Balance the perks — Ensure no branch's island out-earns another by more than ~10% at equal investment; verify via the harness.
- **E28-S7-T10** — QA branch paths — Load a save per branch and assert the correct flavor + perk applies with no cross-branch leakage.

## E28-S8 — Making Paradise Pay (balance & tuning)
_As the balancer, I want island income, upkeep, and guest demand tuned to the pacing curve, so that beat 29 lands near the ~15h mark and the island feels like a payoff, not a chore._  Fits the epic's constants to the contract.
- **E28-S8-T1** — Set `config.ISLAND` — Define first-pass `costBase`, `costGrowth`, `upkeepBase`, `upkeepGrowth`, `GUEST_K`, `GUEST_C0`.
- **E28-S8-T2** — Calibrate guest-income scale — Tune nightly rates so hosted guests become the dominant revenue tier by beat 30, but not before.
- **E28-S8-T3** — Upkeep knife-edge — Set `upkeepGrowth` so scaling buildings stays a *choice* (upkeep bites), echoing the logistics-upkeep philosophy from E15–E17.
- **E28-S8-T4** — Run the harness — Simulate to beat 29 with the greedy-ROI policy and read `T(beat 29)` against the ~15h target.
- **E28-S8-T5** — Fit the biggest miss — Nudge the single largest-miss lever (likely `costGrowth` or `GUEST_K`) and re-run until within ±15%.
- **E28-S8-T6** — Cadence check — Confirm island builds/frills keep the 30–120s active-play time-to-next-purchase band; adjust frill cadence if it drops below.
- **E28-S8-T7** — Multi-currency calibration — Balance the cash/comfort/legacy cost split so the island isn't gated on a single-resource wall.
- **E28-S8-T8** — Softcap audit — Verify the guest-demand log softcap and Comfort saturation together prevent island-income runaway.
- **E28-S8-T9** — Golden-file update — Commit the updated milestone-curve snapshot so island tuning regressions are caught.
- **E28-S8-T10** — Document the levers — Add `config.js` comments noting which knob moves which island symptom, matching the docs/05 lever table.

## E28-S9 — Paradise While You're Away (save / migration / offline)
_As a player who logs off mid-development, I want my island to keep hosting and billing correctly while I'm gone, so that offline paradise matches online math to the cent._  Guarantees offline == online for the new systems.
- **E28-S9-T1** — Extend state — Add `state.island = {buildings:{id:{count}}, guests, rating, netHistory}` as plain JSON.
- **E28-S9-T2** — Bump save version — Increment `state.version` and register a new migration slot.
- **E28-S9-T3** — Migration function — Add a `MIGRATIONS[n]` that seeds `state.island` defaults (no buildings, zero guests) on old saves without breaking them.
- **E28-S9-T4** — Offline production — Run island production through the same `engine.tick` macro-steps so offline guest income equals online exactly.
- **E28-S9-T5** — Offline upkeep — Accrue upkeep offline too, so an over-builder can log in to a net loss — fair, because it's always their choice.
- **E28-S9-T6** — Offline occupancy — Recompute occupancy per macro-step so demand tracks Comfort changes across the away window.
- **E28-S9-T7** — Away summary — Add island lines (+guest income, −upkeep, guests hosted) to the "While you were away…" modal.
- **E28-S9-T8** — Offline-cap interaction — Respect `OFFLINE_CAP`; verify the island doesn't exploit coarse-step rounding beyond the few-% tolerance.
- **E28-S9-T9** — Round-trip test — Save→stringify→parse→load and assert island state plus derived income are identical.
- **E28-S9-T10** — Migration fixture test — Load a pre-island fixture save from each historical `version` and assert it migrates and plays.

## E28-S10 — Grand Opening QA (QA / polish / juice)
_As a player cutting the ribbon on my resort, I want the opening to feel polished and bug-free, so that the biggest payoff yet doesn't stumble on a divide-by-zero._  Ships the epic clean and juicy.
- **E28-S10-T1** — Edge-case sweep — Test negative net income, zero guests, `guestCap=0`, and the upkeep-driven cash clamp at zero.
- **E28-S10-T2** — Number formatting — Verify guest income, upkeep, and net all render through `util.format` with correct notation at 1e15+.
- **E28-S10-T3** — Guest-arrival juice — Add a subtle check-in animation + count-up on the occupancy meter, gated behind `prefers-reduced-motion`.
- **E28-S10-T4** — Net-income sparkline — Render a tiny `netHistory` sparkline so players see paradise trending profitable.
- **E28-S10-T5** — Bankruptcy guard — Cap upkeep so cash never goes negative and surface a wry warning instead of a soft-lock.
- **E28-S10-T6** — Accessibility pass — Make build buttons keyboard-navigable and mark occupancy/net readouts `aria-live` polite.
- **E28-S10-T7** — Reduced-motion path — Confirm all island juice degrades to instant updates when reduced-motion is set.
- **E28-S10-T8** — Console QA hooks — Extend `window.IV` to grant guests/buildings and force a check-in for manual testing.
- **E28-S10-T9** — Regression tests — Add the S2 economy, S4 hosting, and S9 offline tests to the dev suite and wire them into the harness run.
- **E28-S10-T10** — Polish flourish — Add the "Grand Opening" toast and a motion-gated first-guest confetti; ship the beat-29 celebratory copy.

## Definition of Done (epic)
- [ ] `data/island.js` defines villas/marina/heliport/spa as generator+amenity hybrids with multi-currency cost, `guestCap`, and `upkeepBase`; data validation passes.
- [ ] Guest income works as a new revenue tier flowing into `dCash/dt` with the full `M_k` multiplier stack applied.
- [ ] Occupancy, guest demand (`GUEST_K·log10(1+Comfort/GUEST_C0)·exclusivityMult`), and upkeep-at-scale all compute correctly online and offline.
- [ ] Accommodation tier 21 "Island Resort Empire" unlocks behind its gate with reveal, home-base migration, and a per-tier upgrade layer.
- [ ] Island frills cluster delivers a new small-win roughly every ~2 min of active play.
- [ ] All four branches develop the island distinctly, within ~10% power parity (harness-verified).
- [ ] Harness places beat 29 within ±15% of the ~15h target; golden file updated.
- [ ] Save migrates from pre-island versions; offline math matches online; away summary shows island results.
- [ ] Accessibility (keyboard, `aria-live`) and reduced-motion paths verified; no soft-lock on upkeep/bankruptcy.
