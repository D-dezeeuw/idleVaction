# 03 — The 30 Epics (canonical overview)

This is the **single source of truth** for the 30 phases. Every `docs/epics/epic-NN.md`
expands its row here into 10 stories × 10 tasks. The journey climbs the **accommodation
ladder** (shed → island) while layering in **systems** (amenities, travel, skills, paths,
logistics, staff, ascension, skill tree) and advancing the **story beats** from `docs/02`.

## Accommodation ladder (tier index → place)

| Tier | Place | Epic that unlocks it |
|---|---|---|
| 0 | The Soggy Shed (a "motel" in name only) | E01 |
| 1 | Bug-Infested Motel | E02 |
| 2 | Roadside Hostel (bunk) | E03 |
| 3 | Budget Guesthouse | E04 |
| 4 | 1-Star Hotel | E05 |
| 5 | 2-Star Hotel | E06 |
| 6 | 3-Star Hotel (**pool!**) | E07 |
| 7 | 4-Star Resort (beach) | E08 |
| 8 | Boutique Retreat | E09 |
| 9 | 5-Star Hotel | E11 |
| 10 | 5-Star Suite (concierge) | E11 |
| 11 | Grand Luxury Wing | E14 |
| 12 | 6-Star (sail-shaped) | E18 |
| 13 | Ultra Penthouse | E18 |
| 14 | 7-Star Experience | E21 |
| 15 | Royal Suite | E21 |
| 16 | Private Bungalow | E22 |
| 17 | Overwater Villa | E22 |
| 18 | Private Villa + grounds | E23 |
| 19 | Private Estate | E23 |
| 20 | **Private Island** | E27 |
| 21+ | Island Resort Empire | E28–E30 |

## Currencies & systems introduction map

| System | Introduced | Deepened |
|---|---|---|
| Cash + Tier ladder (D1..D8) | E01 | E03, E05, E11, E18 |
| Amenities (small wins) | E02 | every epic |
| Comfort meter | E02 | E06, E08, E21 |
| Travel / destinations | E03–E04 | E24 |
| Build paths (branching) | E04 seed | E12/13/14 |
| Personal-growth skills | E09 (Charisma/Comms) | E10 (Body), E14 (Taste), E13 (Savvy) |
| Clout currency (vlogger) | E12 | E24 |
| Savvy passive + market events (crypto) | E13 | E29 |
| Exclusivity (connoisseur) | E14 | E21, E24 |
| Private logistics (car/boat/jet) | E15/E16/E17 | E27 |
| Staff / automation | E19 | E20, E23, E28 |
| Ascension + Legacy | E25 | E29 |
| Permanent skill tree | E26 | E29 |
| Island / self-run resort economy | E27 | E28 |
| Prestige layer 2 (Legend) + NG+ | E29 | E30 |

---

## The 30 epics

Each row: **goal**, accommodation tier(s), **new system(s)**, story beats, path emphasis,
**math/balance notes**. Detail files expand each into 10 stories × 10 tasks.

### E01 — Soggy Departure
- **Goal:** Ship the core idle loop. From a rainy Dutch bus stop to the worst "motel" on Earth.
- **Tier:** 0 (Soggy Shed). **Beats:** 1 (*Rain Check*).
- **New systems:** game loop, `state`, save/load, first currency **cash**, tier **D1**, number formatting, first clicker tap (optional).
- **Path:** neutral. **Math:** establish `GEN.base[0]=15, growth[0]=1.07, perUnit[0]=1`; `TICKS_PER_SEC`, `AUTOSAVE_SEC`. First worked example from `docs/01 §2`.

### E02 — The Bug-Infested Motel
- **Goal:** Introduce **amenities** (the small-win engine) and the **Comfort** meter via cleaning up a roach-ridden room.
- **Tier:** 1. **Beats:** 2 (*Guests With Six Legs*), 3 (*Checkout Time*).
- **New systems:** amenities data+engine, Comfort formula, accommodation upgrade #1, "While you were away" offline v1.
- **Path:** neutral. **Math:** `AMENITY.base, growth≈1.5, comfort weight`; Comfort saturating cap; `ACC.base, growth≈2.6`.

### E03 — The Roadside Hostel
- **Goal:** Open **social income tiers** (D2–D3) and recurring NPCs; first taste of "people = money."
- **Tier:** 2. **Beats:** 3–4 (*The Hostel Bunk*).
- **New systems:** D2/D3 generators (tier chaining), NPC roster (data), bulk-buy (×1/×10/max), multiplier stack v1.
- **Path:** neutral (traveler/vlogger seeds). **Math:** tier chaining `d(count_{k-1})/dt=prod_k`; bulk geometric-sum cost.

### E04 — The Backpacker Circuit
- **Goal:** **Travel/destinations** + **transport tiers**, and plant the four **build-path seeds**.
- **Tier:** 3. **Beats:** 5 (*First Passport Stamp*), 6 (*Wi-Fi & Ambition*).
- **New systems:** destination system (each = global `×`), transport tier-1 (bus/train), path-points scaffold, branch-seed story choice.
- **Path:** **World Traveler** primary; seeds for all. **Math:** destination flat `×`; `PATH.rate`, softcap exp 0.85.

### E05 — One Star, Big Dreams
- **Goal:** Formalize the **accommodation ladder** & **per-tier upgrade layer**; reach the 1-star hotel.
- **Tier:** 4. **Beats:** 6–7 (*One Star, Big Dreams*).
- **New systems:** `accommodation.js` ladder, per-tier upgrade purchases (`L_upgrade`), unlock-gating by Comfort.
- **Path:** neutral. **Math:** `L_upgrade = 1 + 0.5·#upgrades`; `ACC.unlock[]` thresholds tie to `STORY_GATES`.

### E06 — Continental Comforts
- **Goal:** 2-star hotel; **amenities bloom** and the **Comfort global multiplier** comes online.
- **Tier:** 5. **Beats:** 8 (*Continental Breakfast*).
- **New systems:** breakfast/room amenity clusters, `L_comfort = 1 + COMFORT_MULT·log10(1+Comfort/C0)`.
- **Path:** neutral. **Math:** tune `COMFORT_MULT, C0` so Comfort contributes ~1.5–3× by mid-Act-I.

### E07 — Making a Splash  ⭐ (the "fun showcase")
- **Goal:** 3-star hotel with a **POOL**. The headline small-wins system: floatables, pool beds, poolside service.
- **Tier:** 6. **Beats:** 9 (*Making a Splash*).
- **New systems:** **Pool sub-system** — a dense cluster of cheap, flavored amenities (duck floatie → flamingo → unicorn; loungers → heated pool bed → cabana; tap water → poolside cocktail service tiers), each a tiny `×` + Comfort + unlock.
- **Path:** neutral (vlogger/crypto love the pool). **Math:** many small `AMENITY` entries; cadence target "new thing every ~45–90s" (see `docs/05 §5`).

### E08 — Sun, Sand & Service
- **Goal:** 4-star **beach resort**; upgraded service (better beach cocktail service, cabana staff seed).
- **Tier:** 7. **Beats:** 10 (*Poolside Persona*, part).
- **New systems:** beach amenity cluster, service-quality tiers (pre-staff), Comfort weighting for "service."
- **Path:** neutral. **Math:** service tiers as amenity chains with steeper `growth` for prestige feel.

### E09 — Charm Offensive (Personal Growth I)
- **Goal:** Open the **skills system**: **Charisma** & **Communication** (personal growth). Boutique retreat.
- **Tier:** 8. **Beats:** 10 (*Poolside Persona*), 11 seed.
- **New systems:** `skills.js` (XP→level curve), Charisma (`L_skill` social), Communication (cost discount), skill training purchases.
- **Path:** vlogger-leaning. **Math:** `xpToNext=SKILL_BASE·1.25^L`; Charisma `1+0.03·L`; Comms discount clamp −60%.

### E10 — Body & Soul (Personal Growth II)
- **Goal:** The **Body** attribute — tanning, fitness, spa, wellness — raising Comfort cap & energy.
- **Tier:** 8 (+wellness wing). **Beats:** 12 (*The Body You Travel In*).
- **New systems:** Body attribute, spa/gym/tan amenity clusters, energy (clicker fuel), Comfort-cap scaling.
- **Path:** neutral (crypto/vlogger cosmetic synergy). **Math:** `comfortCap·(1+0.05·bodyL)`; energy regen; body XP sources.

### E11 — Five-Star Frame of Mind
- **Goal:** 5-star hotel + **concierge** (first automation seed). Suite tier.
- **Tier:** 9–10. **Beats:** 13 (*Five-Star Frame of Mind*).
- **New systems:** concierge auto-buyer (cheap ROI purchases), suite amenities, higher tiers D4–D5 pressure.
- **Path:** neutral. **Math:** concierge as bounded auto-purchase policy; D4/D5 `base/growth` onboarding.

### E12 — Lights, Camera, Clout (Vlogger path)
- **Goal:** The **Luxury Vlogging Backpacker** economy: **Clout** currency, content generators, active-play **combo**.
- **Tier:** 11 (grand wing). **Beats:** 14 variant (*Going Viral*).
- **New systems:** Clout resource, content tiers, sponsor deals, `comboMult` (decays ~30s), branch perk (Clout ×1.25).
- **Path:** **Vlogger**. **Math:** `dClout/dt=contentRate·(1+charisma·0.02)·comboMult`; combo decay; sponsor multipliers.

### E13 — Money Works While You Tan (Crypto path)
- **Goal:** The **Crypto Poolside Lounger**: **Savvy** passive income + volatile **market events**.
- **Tier:** 11. **Beats:** 14 variant (*Whale Watching*).
- **New systems:** Savvy passive (`sqrt(totalCash)` scaled), crypto tiers, seeded market-event RNG (booms/crashes), risk mitigation.
- **Path:** **Crypto**. **Math:** `dCash/dt += savvyL·SAVVY_YIELD·sqrt(totalCash)`; event multipliers with variance; `Unshakeable` synergy.

### E14 — Acquired Taste (Connoisseur path)
- **Goal:** The **Old-Money Aesthete**: **Taste** attribute, **exclusivity** multiplier, luxury goods; unlocks Grand Luxury Wing.
- **Tier:** 11. **Beats:** 14 variant (*Provenance*), 25 setup.
- **New systems:** Taste attribute, art/wine collections (appreciating assets), exclusivity meter, luxury-tier discounts.
- **Path:** **Connoisseur**. **Math:** exclusivity `×`; Taste unlock-gates for 6/7-star & villas; appreciating-asset growth.

### E15 — Keys to the Coupe (Logistics I: Cars)
- **Goal:** **Private logistics** begins — cars replace public transport; faster destination cycling.
- **Tier:** 11 (+garage). **Beats:** 15 (*Keys to the Coupe*).
- **New systems:** vehicle ownership, transport slots, logistics `×` on travel/destinations, upkeep sink.
- **Path:** traveler-leaning. **Math:** transport slot bonus; upkeep as small cash drain balancing the `×`.

### E16 — Sea Legs (Logistics II: Boats)
- **Goal:** Boats & yachts; access to sea destinations; onboard amenities (a floating pool!).
- **Tier:** 11 (+marina). **Beats:** 16 (*Sea Legs*).
- **New systems:** boat tier, sea-only destinations, yacht amenity cluster, crew seed (pre-staff).
- **Path:** traveler/connoisseur. **Math:** yacht amenities as high-`growth` prestige chain; sea-destination `×`.

### E17 — Wheels Up (Logistics III: Jets)
- **Goal:** Private aviation; global reach; the logistics capstone.
- **Tier:** 11 (+hangar). **Beats:** 17 (*Wheels Up*).
- **New systems:** jet tier, instant destination unlocks, jet cabin amenities, logistics multiplier capstone.
- **Path:** traveler. **Math:** jets collapse destination cost/time; balance against upkeep so it's a choice not a no-brainer.

### E18 — The Sail-Shaped Hotel
- **Goal:** The **6-star** ultra-luxury hotel (Burj-style) + penthouse; a big Comfort & tier jump.
- **Tier:** 12–13. **Beats:** 18 (*The Sail-Shaped Hotel*).
- **New systems:** 6-star amenity tier, D6–D7 pressure, exclusivity gating (needs Taste), gold-everything cosmetics.
- **Path:** connoisseur-leaning. **Math:** big `ACC` step; D6/D7 onboarding; Taste gate.

### E19 — At Your Service (Staff I: Butler)
- **Goal:** **Staff & automation** — hire a **butler** who automates chores (auto-buy amenities, auto-collect).
- **Tier:** 13. **Beats:** 19 (*At Your Service*).
- **New systems:** staff data model, butler automation policies (configurable), payroll sink, automation UI.
- **Path:** neutral. **Math:** automation as bounded policies; payroll cost vs. time saved; ROI framing.

### E20 — The Whole Household (Staff II)
- **Goal:** A full **household**: chef, driver, trainer, social manager — each automates one subsystem.
- **Tier:** 13. **Beats:** 20 (*The Whole Household*).
- **New systems:** multiple staff roles mapped to subsystems (chef→Comfort, trainer→Body, manager→Clout…), staff levels, morale.
- **Path:** neutral. **Math:** each role = a small global `×` + automation; morale softcap; payroll scaling.

### E21 — Seven Stars
- **Goal:** The **7-star experience** + Royal Suite; the **exclusivity** meter matures; reconvergence approaches.
- **Tier:** 14–15. **Beats:** 21 (*Seven Stars*), 22 (*The Invitation*).
- **New systems:** exclusivity meter as a gate & `×`, 7-star cosmetics, "the patron" NPC (island foreshadow), branch reconvergence hub.
- **Path:** all reconverge. **Math:** exclusivity gate values; convergence guarantees each branch qualifies.

### E22 — A Bungalow of One's Own
- **Goal:** Stop renting rooms — own a **private bungalow / overwater villa**. Owned property mechanics begin.
- **Tier:** 16–17. **Beats:** 22–23 (*A Bungalow of One's Own*).
- **New systems:** owned-property model (property gives passive Comfort + hosts amenities), property upgrade tree.
- **Path:** neutral. **Math:** property as a big persistent Comfort source; upgrade tree `growth`.

### E23 — Villa Vita
- **Goal:** A **private villa** with grounds, staff wing, pool complex; scale staff + property together.
- **Tier:** 18–19. **Beats:** 24 (*Villa Vita*).
- **New systems:** grounds (gardens/pools/courts as amenity mega-clusters), estate staff, property+staff synergy.
- **Path:** connoisseur/vlogger. **Math:** mega-cluster Comfort; staff×property multiplier interaction.

### E24 — Where the Rich Hide (Exclusive Destinations)
- **Goal:** **Exclusive destinations** — Monaco, Dubai, Maldives, Aspen, St. Barths — as a destination meta-game.
- **Tier:** stays 18–19; travels among them. **Beats:** 25 (*Where the Rich Hide*).
- **New systems:** premium destinations (each: unique `×`, unique amenity, Taste/exclusivity gate), destination collection bonus.
- **Path:** traveler/connoisseur. **Math:** set-collection bonus for owning many; each destination a themed multiplier.

### E25 — Letting Go (Ascension I)
- **Goal:** Unlock **ascension**: reset the run for **Legacy**; teach the prestige loop — framed as the named character's **retirement**, continued by their named **son/daughter/heir** (the lineage; amendment `E25-A` in the epic file, design rules `docs/04 §1b`).
- **Tier:** n/a (meta). **Beats:** 26 (*Letting Go*).
- **New systems:** `prestige.js`, Legacy currency, HARD reset (only tree abilities + Legacy cross — `docs/math-proof.md §12`), ascension ROI hint, "ascend now" UI, character naming + Family Album (cosmetic).
- **Path:** neutral. **Math:** `legacyGain=floor(LEGACY_K·sqrt(lifetimeCashThisTree/LEGACY_SCALE))` on the gate-deflated counter; ROI break-even detection; phase gates `×base^(√count·(tier/span)²)`.

### E26 — Who You Become (Permanent Skill Tree)
- **Goal:** The **permanent skill tree** — physique & character nodes that persist across resets.
- **Tier:** n/a (meta). **Beats:** 27 (*Who You Become*).
- **New systems:** `skilltree.js` (Physique/Character/Meta branches), node ranks, requires-gates, respec, tree→story flags.
- **Path:** all (nodes synergize per branch). **Math:** `costLegacy=nodeBase·nodeGrowth^rank`; effects feed `L_tree`, `L_ascension`, milestone step.

### E27 — The Island Listing
- **Goal:** The dream purchase — a **private island**. The single biggest sink in the game.
- **Tier:** 20 (Private Island). **Beats:** 28 (*The Island Listing*).
- **New systems:** island acquisition (multi-currency mega-cost), island as new "home base," logistics/staff move to island.
- **Path:** all. **Math:** island cost calibrated to ~1–2 ascensions of saving; multi-resource price.

### E28 — Building Paradise (Island Development)
- **Goal:** **Develop the island** into your own resort — you now *produce* luxury instead of buying it.
- **Tier:** 21 (Island Empire). **Beats:** 29 (*Building Paradise*).
- **New systems:** island buildings (villas/marina/heliport/spa as production+Comfort combos), guest income (you host others!), self-run economy.
- **Path:** all. **Math:** buildings = generator+amenity hybrids; guest income as a new revenue tier; upkeep at scale.

### E29 — Empire of Leisure (Prestige Layer 2 + NG+)
- **Goal:** The **Legend** prestige layer and **New Game+**; meta-multipliers for the 200h crowd. In the lineage frame this is the **dynasty-level** reset — the family name itself is retired and a new house begins (the natural resolution of the per-ascension gate drift, `docs/math-proof.md §12.4`).
- **Tier:** 21+. **Beats:** 30 (*Empire of Leisure*).
- **New systems:** Legend currency (resets Legacy+tree), meta-meta shop, NG+ (raise all gates, reshuffle destinations), BigNumber swap if needed.
- **Path:** all. **Math:** `legendGain=floor(LEGEND_K·sqrt(totalLegacy/LEGEND_SCALE))`; NG+ gate scaling; endgame number-size audit.

### E30 — Legends of Leisure (Endgame, live-ops, release)
- **Goal:** Endless content, achievements, seasonal destinations, and **release readiness** for GitHub Pages.
- **Tier:** 21+ endless. **Beats:** 30+ (*Legends of Leisure*).
- **New systems:** achievements/collections, seasonal/rotating destinations, statistics screen, accessibility pass, deploy pipeline, balance golden-file.
- **Path:** all. **Math:** achievement `×` bonuses; final harness fit to the 20h target; long-tail curve validation.

---

## Story-slot template (how each epic's 10 stories are shaped)

To guarantee every epic covers engineering **and** content **and** balance **and** QA, detail
files distribute their 10 stories across these slots (adapting titles/flavor to the epic theme;
epics that don't need a slot repurpose it for extra content — e.g. more amenity clusters):

1. **Data model** — define the epic's new data (generators/amenities/skills/story entries).
2. **Core logic/engine** — the formulas & tick behavior for the new system.
3. **UI / buttons** — expose it as simple buttons + readouts + unlock reveals.
4. **The headline new thing** — the epic's signature player-facing feature (pool, jet, butler…).
5. **Amenity / small-wins cluster** — a batch of cheap flavored micro-upgrades for this stage.
6. **Accommodation / progression step** — the tier up + its gate + reveal.
7. **Path / branch flavor** — how this epic serves the emphasized build path(s).
8. **Balance & tuning** — set/tune the epic's constants; run the harness; hit pacing targets.
9. **Save / migration / offline** — persist new state; migrate old saves; offline correctness.
10. **QA / polish / juice** — tests, edge cases, number formatting, small feedback flourishes.

Every task (T1–T10 within a story) is a concrete step with a *what* and a *why/how*, mixing
engineering, content, balance, and QA as appropriate — see `docs/06-plan-format.md`.
