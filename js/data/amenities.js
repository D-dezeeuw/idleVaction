// data/amenities.js — the "small wins" engine. Cheap, frequent, flavored upgrades.
// Each: { id, name, tag, costBase, costGrowth, comfort, xMult, xScope, unlockComfort, flavor }
// costGrowth defaults to CONFIG.AMENITY.growthDefault (~1.5). comfort feeds Comfort meter.
// This is a representative slice — the full plan (docs/epics) defines hundreds more.

export const AMENITIES = [
  // --- motel / early (E02) ---
  { id: 'bug_spray',   name: 'Can of Bug Spray',     tag: 'motel', costBase: 20,   comfort: 3,  xMult: 0.01, xScope: 'all', unlockComfort: 0,   flavor: 'The roaches file a formal complaint.' },
  { id: 'clean_sheets',name: 'Actually-Clean Sheets',tag: 'motel', costBase: 60,   comfort: 6,  xMult: 0.02, xScope: 'all', unlockComfort: 20,  flavor: 'They match! Sort of.' },
  { id: 'space_heater',name: 'Space Heater',         tag: 'motel', costBase: 150,  comfort: 10, xMult: 0.02, xScope: 'all', unlockComfort: 40,  flavor: 'Finally, warmth. A Dutch dream.' },
  { id: 'mini_fridge', name: 'Humming Mini-Fridge',  tag: 'motel', costBase: 400,  comfort: 14, xMult: 0.03, xScope: 'all', unlockComfort: 80,  flavor: 'It hums the national anthem at 3am.' },

  // --- hostel cluster (E03-S5) — the small-wins engine at the hostel bunk stage.
  // Kept at the low end of the epic's suggested costBase/comfort ranges (deliberately
  // conservative — see the harness note in the E03 gap-fill report) so the extra cash
  // sink doesn't meaningfully stretch the fitted ~18h golden curve. ---
  { id: 'hostel_bunkpad',       name: 'Padded Bunk Mat',        tag: 'hostel', costBase: 600,  comfort: 8,  xMult: 0.01, xScope: 'all',    unlockComfort: 90,  flavor: 'One inch of foam between you and the slats. Luxury.' },
  { id: 'hostel_earplugs',      name: 'Industrial Earplugs',    tag: 'hostel', costBase: 800,  comfort: 9,  xMult: 0.01, xScope: 'all',    unlockComfort: 110, flavor: 'For the snorer in bunk 4, and the rain on the roof.' },
  { id: 'hostel_locker',        name: 'A Locker That Locks',    tag: 'hostel', costBase: 1050, comfort: 11, xMult: 0.02, xScope: 'all',    unlockComfort: 130, flavor: 'Your passport sleeps soundly now. So, mostly, do you.' },
  { id: 'hostel_shared_kitchen',name: 'Shared Kitchen Shelf',   tag: 'hostel', costBase: 1350, comfort: 13, xMult: 0.02, xScope: 'social', unlockComfort: 150, flavor: 'Labeled "DO NOT TOUCH" in four languages. Nobody touches it.' },
  { id: 'hostel_hot_shower',    name: 'Reliably Hot Shower',    tag: 'hostel', costBase: 1700, comfort: 15, xMult: 0.02, xScope: 'all',    unlockComfort: 170, flavor: 'Hot water, on demand. You almost cry. Fine — you do cry.' },
  { id: 'hostel_wifi',          name: 'Wi-Fi That Reaches Bunk 7', tag: 'hostel', costBase: 2100, comfort: 17, xMult: 0.03, xScope: 'social', unlockComfort: 190, flavor: 'One bar. Just enough to like a photo. A society runs on less.' },

  // --- backpack cluster (E04-S5) — the small-wins engine at the guesthouse stage.
  // costBase sits just above the hostel cluster's range; comfort/staggering kept at
  // the conservative end of the epic's suggested bands (see the E03 hostel-cluster note
  // on golden-drift) so this doesn't meaningfully stretch the fitted ~20h curve. ---
  { id: 'kit_poncho',             name: 'Emergency Poncho',        tag: 'backpack', costBase: 2400, comfort: 12, xMult: 0.02, xScope: 'all',    unlockComfort: 210, flavor: 'Neon yellow, waterproof, your national colors basically.' },
  { id: 'kit_stroopwafel_stash',  name: 'Stroopwafel Stash',       tag: 'backpack', costBase: 3100, comfort: 14, xMult: 0.02, xScope: 'social', unlockComfort: 250, flavor: 'Emergency rations and social currency, both. Never offer the last one.' },
  { id: 'kit_earplugs',           name: 'Backpacker Earplugs',     tag: 'backpack', costBase: 4000, comfort: 16, xMult: 0.03, xScope: 'all',    unlockComfort: 300, flavor: 'For the bunkmate who snores in three languages.' },
  { id: 'kit_padlock',            name: 'Combination Padlock',     tag: 'backpack', costBase: 5200, comfort: 18, xMult: 0.03, xScope: 'all',    unlockComfort: 350, flavor: 'You changed the code from 0000. Growth.' },
  { id: 'kit_microfiber_towel',   name: 'Microfiber Towel',        tag: 'backpack', costBase: 6800, comfort: 21, xMult: 0.04, xScope: 'social', unlockComfort: 410, flavor: 'Dries in an hour, smells like regret in two.' },
  { id: 'kit_travel_pillow',      name: 'Inflatable Travel Pillow',tag: 'backpack', costBase: 8800, comfort: 24, xMult: 0.05, xScope: 'all',    unlockComfort: 470, flavor: 'It squeaks. It saves your neck. Worth it.' },

  // --- 1-Star Hotel cluster (E05-S5) — the small-wins engine at the 1-Star Hotel stage.
  // costBase picks up just above the backpack cluster's range; comfort/unlockComfort
  // staggering brackets the tier-4 Comfort gate (accUnlockComfort(4) ≈ 754) so the first
  // couple of items help you CHECK IN, and the rest keep small wins flowing right after,
  // toward tier 5 (accUnlockComfort(5) ≈ 1960) — kept conservative (~1.3× costBase ramp,
  // matching the E03/E04 clusters) so this doesn't meaningfully stretch the fitted curve. ---
  { id: 'star1_key_card',       name: 'An Actual Key Card',              tag: 'onestar', costBase: 11000, comfort: 16, xMult: 0.02, xScope: 'all',    unlockComfort: 520,  flavor: 'No more borrowed padlock. A card. That beeps. You feel important.' },
  { id: 'star1_minibar_water',  name: 'Minibar (Water Only)',            tag: 'onestar', costBase: 14000, comfort: 19, xMult: 0.02, xScope: 'all',    unlockComfort: 620,  flavor: '€6 for water you could get from the tap. You buy it anyway. Growth.' },
  { id: 'star1_tv_remote',      name: 'TV Remote That Works',            tag: 'onestar', costBase: 18500, comfort: 22, xMult: 0.03, xScope: 'social', unlockComfort: 750,  flavor: 'The TV gets two channels, both in a language you do not speak.' },
  { id: 'star1_do_not_disturb', name: 'Do Not Disturb Sign',             tag: 'onestar', costBase: 24000, comfort: 26, xMult: 0.03, xScope: 'all',    unlockComfort: 900,  flavor: 'You hang it on the handle like a tiny flag of a nation of one.' },
  { id: 'star1_shower_cap',     name: 'Individually Wrapped Shower Cap', tag: 'onestar', costBase: 31000, comfort: 30, xMult: 0.04, xScope: 'social', unlockComfort: 1080, flavor: 'Plastic. Crinkly. Yours to keep. You will never use it and never throw it away.' },
  { id: 'star1_wakeup_call',    name: 'Wake-Up Call Service',            tag: 'onestar', costBase: 40000, comfort: 35, xMult: 0.05, xScope: 'all',    unlockComfort: 1300, flavor: 'The front desk rings at 7:00 sharp. You were already awake, dreading it.' },

  // --- Continental Breakfast cluster (E06-S5) — the small-wins engine at the 2-Star
  // Hotel stage. costBase picks up just above the 1-Star cluster's top (star1_wakeup_call
  // at 40000); comfort/unlockComfort staggering brackets the tier-5 Comfort gate
  // (accUnlockComfort(5) ≈ 1960) so the early items help you check into the 2-Star, and
  // the rest push Comfort on toward beat 8's gate (comfort:5500) — kept conservative
  // (comfort 20-50, small xMult, ~1.3x costBase ramp matching the E03/E04/E05 clusters)
  // so this doesn't meaningfully stretch the fitted curve. ---
  { id: 'bfast_stale_croissant', name: 'Yesterday\'s Croissant',         tag: 'breakfast', costBase: 45000,  comfort: 22, xMult: 0.02, xScope: 'all',    unlockComfort: 900,  flavor: 'Possibly the day before\'s. You dunk it in coffee and call it fresh.' },
  { id: 'bfast_boiled_egg',      name: 'The Regulation Boiled Egg',      tag: 'breakfast', costBase: 58000,  comfort: 26, xMult: 0.02, xScope: 'all',    unlockComfort: 1100, flavor: 'One per guest. The sign about it is laminated and very serious.' },
  { id: 'bfast_cheese_slice',    name: 'Individually Wrapped Cheese',    tag: 'breakfast', costBase: 75000,  comfort: 30, xMult: 0.03, xScope: 'all',    unlockComfort: 1400, flavor: 'Orange, rectangular, indestructible. A Dutch breakfast staple, allegedly.' },
  { id: 'bfast_hagelslag',       name: 'Bowl of Hagelslag',              tag: 'breakfast', costBase: 95000,  comfort: 34, xMult: 0.03, xScope: 'social', unlockComfort: 1800, flavor: 'Chocolate sprinkles on buttered bread — a Dutch human right, photographed accordingly.' },
  { id: 'bfast_orange_juice',    name: 'Orange Juice (From Concentrate)',tag: 'breakfast', costBase: 125000, comfort: 38, xMult: 0.04, xScope: 'all',    unlockComfort: 2300, flavor: 'Technically orange. Technically juice. Vitamin C is vitamin C.' },
  { id: 'bfast_filter_coffee',   name: 'Bottomless Filter Coffee',       tag: 'breakfast', costBase: 160000, comfort: 42, xMult: 0.04, xScope: 'all',    unlockComfort: 2900, flavor: 'Filter coffee: technically hot, technically coffee.' },
  { id: 'bfast_waffle_iron',     name: 'Make-Your-Own Waffle Iron',      tag: 'breakfast', costBase: 205000, comfort: 46, xMult: 0.05, xScope: 'social', unlockComfort: 3600, flavor: 'The queue is long. The waffle is worth it. Everyone photographs theirs.' },
  { id: 'bfast_fresh_fruit',     name: 'Fresh Fruit Platter (Mostly Melon)', tag: 'breakfast', costBase: 260000, comfort: 50, xMult: 0.05, xScope: 'all', unlockComfort: 4400, flavor: 'Cantaloupe: nature\'s way of saying "we ran out of budget."' },

  // --- pool cluster (E07) — the fun showcase ---
  { id: 'floatie_duck',   name: 'Rubber Duck Floatie',  tag: 'pool', costBase: 800,   comfort: 12, xMult: 0.02, xScope: 'social', unlockComfort: 200,  flavor: 'Quack. Iconic.' },
  { id: 'floatie_flamingo',name:'Flamingo Floatie',     tag: 'pool', costBase: 1600,  comfort: 18, xMult: 0.03, xScope: 'social', unlockComfort: 300,  flavor: 'Pink. Judgmental. Photogenic.' },
  { id: 'floatie_unicorn',name: 'Unicorn Floatie',      tag: 'pool', costBase: 3200,  comfort: 26, xMult: 0.04, xScope: 'social', unlockComfort: 450,  flavor: 'It judges your backstroke.' },
  { id: 'pool_lounger',   name: 'Poolside Lounger',     tag: 'pool', costBase: 5000,  comfort: 30, xMult: 0.03, xScope: 'all',    unlockComfort: 500,  flavor: 'Reclines to exactly one angle. It is the correct angle.' },
  { id: 'heated_bed',     name: 'Heated Pool Bed',      tag: 'pool', costBase: 12000, comfort: 48, xMult: 0.05, xScope: 'all',    unlockComfort: 800,  flavor: 'Warm. In a pool. Decadent.' },
  { id: 'cocktail_1',     name: 'Poolside Cocktail Cart',tag:'pool', costBase: 20000, comfort: 60, xMult: 0.06, xScope: 'all',    unlockComfort: 1200, flavor: 'The umbrella is bigger than the drink.' },
  { id: 'cabana',         name: 'Private Cabana',       tag: 'pool', costBase: 60000, comfort: 110,xMult: 0.08, xScope: 'all',    unlockComfort: 2000, flavor: 'Shade you own. A first.' },

  // --- pool cluster gap-fill (E07 "Making a Splash", headline poolside cocktail
  // service tiers) — the DRIFT GUARDRAIL caps this phase at 4 net-new pool amenities
  // (see docs/coverage.md E07 notes), so this is the whole S4/S6 addition: two more
  // floatables at the SAME conservative growthDefault (~1.5, no override) continuing
  // the existing 800→60000 costBase ramp, plus the two-tier cocktail-service chain
  // ("tap water → mixologist → butler-served") continuing cocktail_1 with a steeper
  // costGrowth:1.8 (E07-S6-T2) so repeat-buys wall faster than the floaties — a
  // "premium" cadence. unlockComfort is kept in the SAME low band as the pre-existing
  // 7 items (200-2000) rather than rebracketed to the tier-6 gate (accUnlockComfort(6)
  // ≈ 5097) — this cluster already ships that way (unlike onestar/breakfast, which
  // bracket THEIR tier gates), so new items match the shipped shape, not the epic's
  // literal (unwritten) intent. comfort-per-costBase continues the existing cluster's
  // decreasing ratio (see the E07 gap-fill report) — conservative, in-band with the
  // harness drift threshold (~19.5h). ---
  { id: 'pool_floatie_pizza', name: 'Pizza Slice Floatie',   tag: 'pool', costBase: 4200,   comfort: 29,  xMult: 0.045, xScope: 'social', unlockComfort: 480,  flavor: 'You are the topping. Mozzarella-adjacent, mostly.' },
  { id: 'pool_floatie_swan',  name: 'Swan Floatie',          tag: 'pool', costBase: 9000,   comfort: 38,  xMult: 0.05,  xScope: 'social', unlockComfort: 650,  flavor: 'Elegant. Serene. Already deflating on one side.' },
  { id: 'pool_cocktail_2',    name: 'Mixologist Cart',       tag: 'pool', costBase: 40000,  comfort: 85,  costGrowth: 1.8, xMult: 0.07, xScope: 'social', unlockComfort: 1600, flavor: 'A cart, a shaker, and a man named Sven who takes this very seriously.' },
  { id: 'pool_cocktail_3',    name: 'Butler-Served Cocktail',tag: 'pool', costBase: 110000, comfort: 170, costGrowth: 1.8, xMult: 0.09, xScope: 'all', unlockComfort: 2800, flavor: 'Butler-served, poolside. Nobody asks how you afford this. You wonder too.', staffHint: true },

  // --- beach cluster (E08 "Sun, Sand & Service") ---
  { id: 'beach_towel',  name: 'Monogrammed Towel',    tag: 'beach', costBase: 4e4,  comfort: 40,  xMult: 0.03, xScope: 'all', unlockComfort: 1500, flavor: 'Your initials, in the sand of your soul.' },
  { id: 'beach_svc',    name: 'Beach Cocktail Service',tag:'beach', costBase: 9e4,  comfort: 90,  xMult: 0.07, xScope: 'all', unlockComfort: 2600, flavor: 'They find you. You never move.' },
  { id: 'cabana_beach', name: 'Beachfront Cabana',    tag: 'beach', costBase: 2.4e5,comfort: 180, xMult: 0.10, xScope: 'all', unlockComfort: 5000, flavor: 'Ocean view. Owned view.' },

  // --- beach gap-fill (E08-S1-T4/S5, "Sun, Sand & Service" — the beach was ROI-capacity-
  // constrained under E07's amenity-count-inflates-pacing harness; that harness is now
  // ROI-aware (E07 gap-fill), so the ≤4-item drift guardrail is LIFTED here — this is a
  // normal-size cluster (7 items total incl. the 3 above). Interleaved by costBase between
  // the 3 existing items (4e4/9e4/2.4e5) with the same gentle ~1.5-1.7x ramp and the DEFAULT
  // AMENITY.growthDefault (~1.5, no override) matching the existing three. unlockComfort
  // stays in the SAME low band as the existing items (well under accUnlockComfort(8)≈34456,
  // in fact under accUnlockComfort(7)≈13252 too) — same shipped shape as the E07 pool
  // cluster, not rebracketed to the zone's own gate (see the E07 gap-fill note just above
  // in this file's history / docs/coverage.md). ---
  { id: 'beach_umbrella',       name: 'Beach Umbrella',         tag: 'beach', costBase: 6e4,  comfort: 60,  xMult: 0.05, xScope: 'all',    unlockComfort: 2000,  flavor: 'An umbrella against a sun you flew 2,000km to find, having complained about its absence your whole life.' },
  { id: 'beach_sun_lounger',    name: 'Beachfront Sun Lounger', tag: 'beach', costBase: 1.5e5,comfort: 130, xMult: 0.08, xScope: 'all',    unlockComfort: 3800,  flavor: 'Reclines to eleven angles. You find the correct one. You do not move again.' },
  { id: 'beach_jetski',         name: 'Rented Jet Ski',         tag: 'beach', costBase: 4.2e5,comfort: 240, xMult: 0.06, xScope: 'social', unlockComfort: 7000,  flavor: 'Driven like it is stolen. The waiver was thorough. Your commitment to it was not.' },
  { id: 'beach_private_stretch',name: 'Private Stretch of Sand',tag:'beach', costBase: 7.5e5,comfort: 420, xMult: 0.12, xScope: 'all',    unlockComfort: 10000, flavor: 'A hundred roped-off meters, just for you. A Dutch tour guide explains to her group, at length, why they do not get a rope.' },

  // --- service-quality chain (E08-S1-T3/S4, the epic's headline pre-staff ladder):
  // self-serve cart → waiter → head waiter → maître d' → concierge (seed). tag:'service'
  // (its OWN cross-zone tag, distinct from 'beach' — pool service items keep tag:'pool').
  // costGrowth:1.9 overrides AMENITY.growthDefault (~1.5) for a steeper per-level repeat-buy
  // curve, per row (no new config knob — matches the pool cocktail chain's costGrowth:1.8
  // precedent, just steeper for more "prestige"). costBase ramps a clean ×3/tier; comfort
  // and (dormant, forward-compat) xMult both climb tier-over-tier. NOTE: xMult/xScope are
  // NOT read by math.js/engine.js (dormant since E02, see amenityScoreTotal) — the ONLY
  // income effect here is `comfort` feeding the existing wAmen Comfort term. The epic's
  // proposed separate `w_service` Comfort weight / `service` field is deliberately NOT
  // added (redundant with wAmen, an economy change) — "better service" instead shows up
  // as a bigger `comfort` number on each tier, same convention as every other amenity.
  // service_concierge_seed carries staffHint (mirrors pool_cocktail_3) as the pre-staff
  // bridge toward hiring real staff (E11/E19) — flavor-only, does not activate anything. ---
  { id: 'service_selfserve',     name: 'Self-Serve Cart',        tag: 'service', costBase: 1.2e5, comfort: 110, costGrowth: 1.9, xMult: 0.03, xScope: 'all', unlockComfort: 3000,  flavor: 'A cart, a stack of napkins, and the honor system. You take two extra hagelslag packets. It is fine. It is included.' },
  { id: 'service_waiter',        name: 'Beach Waiter',           tag: 'service', costBase: 3.6e5, comfort: 220, costGrowth: 1.9, xMult: 0.05, xScope: 'all', unlockComfort: 6000,  flavor: 'He remembers "the usual" by day three. You did not know you had a usual.' },
  { id: 'service_head_waiter',   name: 'Head Waiter',            tag: 'service', costBase: 1.08e6,comfort: 380, costGrowth: 1.9, xMult: 0.07, xScope: 'all', unlockComfort: 9000,  flavor: 'He seats you at the good table without being asked. Nobody explains how he knows which table is good.' },
  { id: 'service_maitre_d',      name: "Maître d'",              tag: 'service', costBase: 3.24e6,comfort: 600, costGrowth: 1.9, xMult: 0.09, xScope: 'all', unlockComfort: 12000, flavor: 'He pretends your poncho is "a look." You believe him, just for one holiday.' },
  { id: 'service_concierge_seed',name: 'Resort Concierge (seed)',tag: 'service', costBase: 9.72e6,comfort: 900, costGrowth: 1.9, xMult: 0.12, xScope: 'all', unlockComfort: 16000, staffHint: true, flavor: 'He hands you a card with a number, no name. "For anything," he says. You suspect "anything" will one day mean staff of your own.' },

  // --- spa/wellness cluster (E10) ---
  { id: 'sunscreen',    name: 'Proper Sunscreen',     tag: 'spa', costBase: 1.5e5,comfort: 70,  xMult: 0.04, xScope: 'all', unlockComfort: 4000,  flavor: 'The Dutch skin thanks you.' },
  { id: 'massage',      name: 'Daily Massage',        tag: 'spa', costBase: 4e5,  comfort: 160, xMult: 0.08, xScope: 'all', unlockComfort: 8000,  flavor: 'Knots you did not know were nations.' },
  { id: 'private_spa',  name: 'Private Spa Wing',     tag: 'spa', costBase: 1.2e6,comfort: 380, xMult: 0.12, xScope: 'all', unlockComfort: 18000, flavor: 'Steam, stone, and silence you paid for.' },

  // --- Wellness Wing gap-fill (E10 "Body & Soul" — tan/gym/spa clusters, revealed
  // alongside the Wellness Wing panel at accommodation.tier >= 8 / Boutique Retreat).
  // Positioned above the beach/service tiers (whose top costBase is 7.5e5/9.72e6) and
  // interleaved with the low end of the luxury cluster below — conservative comfort
  // weights (the ROI-aware harness already skips Comfort-only amenities on payback, see
  // harness.mjs's amenityWorthBuying, so this cluster cannot move the fitted pacing
  // curve). Each unlockComfort band brackets the tier-8 Comfort gate
  // (accUnlockComfort(8) ≈ 34456, matching the onestar/breakfast cluster convention):
  // the first item in every cluster unlocks just before it, the rest keep small wins
  // flowing after the Boutique Retreat check-in. `bodyXp` is declared per-item (data-
  // driven, per the epic) but stays DORMANT — never read by math.js/engine.js — same
  // house convention as every amenity's `xMult`/`xScope` (see the service-chain comment
  // above): Body already levels plenty fast from the existing Comfort-based trickle
  // (engine.trickleXp) and from training (state.training.train_body, pre-existing), so
  // wiring a second passive source would be inaudible noise, not a felt mechanic — see
  // docs/coverage.md E10 notes.
  //
  // --- tanning deck: comfort + a small bodyXp hint, the "casual" third of the wing ---
  { id: 'tan_sunbed',           name: 'Sunbed Session',        tag: 'tan', costBase: 2.0e6, comfort: 260, bodyXp: 4, xMult: 0.05, xScope: 'all', unlockComfort: 25000,  flavor: 'Fifteen artificial minutes of Mediterranean. The real sun is next door, free. You already paid for this one.' },
  { id: 'tan_spray_tan',        name: 'Spray Tan',             tag: 'tan', costBase: 4.0e6, comfort: 340, bodyXp: 5, xMult: 0.06, xScope: 'all', unlockComfort: 45000,  flavor: 'You leave slightly orange. You leave anyway. Confidence is a colour now.' },
  { id: 'tan_golden_hour_deck', name: 'Golden Hour Deck',      tag: 'tan', costBase: 8.0e6, comfort: 440, bodyXp: 6, xMult: 0.08, xScope: 'all', unlockComfort: 70000,  flavor: 'Angled precisely for the one good photo you take per day.' },
  { id: 'tan_bronzing_oil',     name: 'Bronzing Oil',          tag: 'tan', costBase: 1.6e7, comfort: 570, bodyXp: 8, xMult: 0.10, xScope: 'all', unlockComfort: 110000, flavor: 'Smells like coconut and questionable decisions. Reapplied hourly, out of principle.' },

  // --- gym: the highest bodyXp weight of the three (training feels like training) ---
  { id: 'gym_dumbbell_rack',    name: 'Dumbbell Rack',         tag: 'gym', costBase: 2.4e6,  comfort: 280, bodyXp: 8,  xMult: 0.05, xScope: 'all', unlockComfort: 28000,  flavor: 'You start with the small ones. Nobody is watching. Someone is always watching.' },
  { id: 'gym_treadmill',        name: 'Ocean-View Treadmill',  tag: 'gym', costBase: 4.8e6,  comfort: 360, bodyXp: 10, xMult: 0.07, xScope: 'all', unlockComfort: 50000,  flavor: 'Running nowhere, scenically. The Dutch flatlands never offered a view like this.' },
  { id: 'gym_personal_trainer', name: 'Personal Trainer',     tag: 'gym', costBase: 9.6e6,  comfort: 470, bodyXp: 13, xMult: 0.09, xScope: 'all', unlockComfort: 80000,  flavor: 'He counts your reps out loud. You count the minutes until brunch.' },
  { id: 'gym_altitude_room',    name: 'Altitude Simulation Room', tag: 'gym', costBase: 1.92e7, comfort: 610, bodyXp: 16, xMult: 0.11, xScope: 'all', unlockComfort: 130000, flavor: 'Thinner air, for a fitness gain you cannot quite pronounce. You breathe harder. You feel important.' },

  // --- spa menu continuation (own tag: 'wellness' — distinct from the pre-existing
  // 'spa' tag above, so the general Amenities card's existing sunscreen/massage/
  // private_spa display is left completely untouched; these new tiers live only in the
  // Wellness Wing panel, per house convention for a cluster that ships alongside its own
  // dedicated card, mirroring pool/beach/service). Highest comfort weight of the three
  // clusters, per the epic; continues private_spa's costBase (1.2e6) upward. ---
  { id: 'wellness_sauna',         name: 'Sauna',           tag: 'wellness', costBase: 1.8e6,  comfort: 460,  bodyXp: 3, xMult: 0.06, xScope: 'all', unlockComfort: 22000,  flavor: 'Hotter than a Delft attic in July, and you paid extra for it.' },
  { id: 'wellness_hot_stone',     name: 'Hot Stone Massage', tag: 'wellness', costBase: 3.6e6, comfort: 600,  bodyXp: 4, xMult: 0.08, xScope: 'all', unlockComfort: 40000,  flavor: 'Rocks, warmed, placed on your back by someone who trained for this. You trained for nothing.' },
  { id: 'wellness_seaweed_wrap',  name: 'Seaweed Wrap',    tag: 'wellness', costBase: 7.2e6,  comfort: 780,  bodyXp: 5, xMult: 0.10, xScope: 'all', unlockComfort: 65000,  flavor: 'You are, technically, already at a beach, and now wrapped in more beach. The irony is complimentary.' },
  { id: 'wellness_cryo_chamber',  name: 'Cryo Chamber',    tag: 'wellness', costBase: 1.44e7, comfort: 1020, bodyXp: 6, xMult: 0.13, xScope: 'all', unlockComfort: 100000, flavor: 'Colder than a Rotterdam tram platform in February, but on purpose this time.' },

  // --- luxury cluster (mid/late) ---
  { id: 'butler_bell',  name: 'A Little Silver Bell', tag: 'luxury', costBase: 3e6, comfort: 500, xMult: 0.15, xScope: 'all', unlockComfort: 4e4, flavor: 'You ring. Things happen.' },
  { id: 'gold_taps',    name: 'Gold Bathroom Taps',   tag: 'luxury', costBase: 1e7, comfort: 900, xMult: 0.18, xScope: 'all', unlockComfort: 1.2e5, flavor: 'Tasteless? Yes. Yours? Also yes.' },
  { id: 'infinity_pool',name: 'Private Infinity Pool',tag: 'luxury', costBase: 5e7, comfort: 2200,xMult: 0.25, xScope: 'all', unlockComfort: 5e5, flavor: 'The edge of the pool is the edge of the world.' },

  // --- Signature Suite cluster (E11 "Five-Star Frame of Mind" — the epic's small-wins
  // cluster, gated to the 5-Star Hotel/Suite era). tag:'suite'. Positioned above the
  // Wellness Wing's own top (gym_altitude_room @ costBase 1.92e7) — conservative comfort
  // weights, matching every gap-fill cluster's convention (the ROI-aware harness already
  // skips Comfort-only amenities on payback — see harness.mjs's amenityWorthBuying and
  // this epic's engine.conciergeCandidates — so this cluster cannot move the fitted
  // pacing curve). costBase doubles per item (~2x, per the epic's own "ramping ~2x per
  // step"), using the DEFAULT AMENITY.growthDefault (~1.5, no override) — same
  // convention as the tan/gym/wellness clusters. unlockComfort brackets BOTH new tiers'
  // Comfort gates (accUnlockComfort(9)≈89.6K, accUnlockComfort(10)≈232.9K), the same
  // bracket-the-gate convention as onestar/breakfast: the first two items help you check
  // into the 5-Star Hotel, the rest keep small wins flowing on through the Suite
  // check-in and beyond. Each is a plain amenity — buyAmenity(id), no bespoke suite code
  // (E11-S5-T2) — and therefore automatically concierge-eligible under the 'amenity'
  // whitelist category (E11-S5-T5; no extra per-item field needed — every amenity IS
  // category 'amenity' to the concierge, see engine.conciergeCandidates). No dedicated
  // card either: the general Amenities panel already groups unrecognized tags by name
  // (renderAmenities), so 'suite' surfaces there automatically, same as onestar/
  // breakfast/hostel/backpack/motel before it — additive UI, no new subsystem. ---
  { id: 'turndown_service',   name: 'Turndown Service',       tag: 'suite', costBase: 2.4e7,  comfort: 1300, xMult: 0.06, xScope: 'all', unlockComfort: 60000,  flavor: 'They fold your poncho into a swan. You did not know it could do that.' },
  { id: 'pillow_menu',        name: 'Pillow Menu',            tag: 'suite', costBase: 4.8e7,  comfort: 1700, xMult: 0.08, xScope: 'all', unlockComfort: 90000,  flavor: 'Seven pillows, one head — finally, abundance.' },
  { id: 'minibar',            name: 'Fully Stocked Minibar',  tag: 'suite', costBase: 9.6e7,  comfort: 2200, xMult: 0.10, xScope: 'all', unlockComfort: 130000, flavor: 'The Toblerone alone costs more than your old motel room.' },
  { id: 'bathrobe',           name: 'Monogrammed Bathrobe',   tag: 'suite', costBase: 1.92e8, comfort: 2900, xMult: 0.12, xScope: 'all', unlockComfort: 180000, flavor: 'Your initials, embroidered, on a robe you will absolutely try to take home.' },
  { id: 'rainfall_shower',    name: 'Rainfall Shower',        tag: 'suite', costBase: 3.84e8, comfort: 3800, xMult: 0.14, xScope: 'all', unlockComfort: 240000, flavor: 'Actual Dutch rain, but warm, and entirely by choice.' },
  { id: 'butler_call_button', name: 'Butler Call Button',     tag: 'suite', costBase: 7.68e8, comfort: 4900, xMult: 0.16, xScope: 'all', unlockComfort: 320000, flavor: 'One press. He already knew.' },
];
