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

  // --- pool cluster (E07) — the fun showcase ---
  { id: 'floatie_duck',   name: 'Rubber Duck Floatie',  tag: 'pool', costBase: 800,   comfort: 12, xMult: 0.02, xScope: 'social', unlockComfort: 200,  flavor: 'Quack. Iconic.' },
  { id: 'floatie_flamingo',name:'Flamingo Floatie',     tag: 'pool', costBase: 1600,  comfort: 18, xMult: 0.03, xScope: 'social', unlockComfort: 300,  flavor: 'Pink. Judgmental. Photogenic.' },
  { id: 'floatie_unicorn',name: 'Unicorn Floatie',      tag: 'pool', costBase: 3200,  comfort: 26, xMult: 0.04, xScope: 'social', unlockComfort: 450,  flavor: 'It judges your backstroke.' },
  { id: 'pool_lounger',   name: 'Poolside Lounger',     tag: 'pool', costBase: 5000,  comfort: 30, xMult: 0.03, xScope: 'all',    unlockComfort: 500,  flavor: 'Reclines to exactly one angle. It is the correct angle.' },
  { id: 'heated_bed',     name: 'Heated Pool Bed',      tag: 'pool', costBase: 12000, comfort: 48, xMult: 0.05, xScope: 'all',    unlockComfort: 800,  flavor: 'Warm. In a pool. Decadent.' },
  { id: 'cocktail_1',     name: 'Poolside Cocktail Cart',tag:'pool', costBase: 20000, comfort: 60, xMult: 0.06, xScope: 'all',    unlockComfort: 1200, flavor: 'The umbrella is bigger than the drink.' },
  { id: 'cabana',         name: 'Private Cabana',       tag: 'pool', costBase: 60000, comfort: 110,xMult: 0.08, xScope: 'all',    unlockComfort: 2000, flavor: 'Shade you own. A first.' },

  // --- beach cluster (E08) ---
  { id: 'beach_towel',  name: 'Monogrammed Towel',    tag: 'beach', costBase: 4e4,  comfort: 40,  xMult: 0.03, xScope: 'all', unlockComfort: 1500, flavor: 'Your initials, in the sand of your soul.' },
  { id: 'beach_svc',    name: 'Beach Cocktail Service',tag:'beach', costBase: 9e4,  comfort: 90,  xMult: 0.07, xScope: 'all', unlockComfort: 2600, flavor: 'They find you. You never move.' },
  { id: 'cabana_beach', name: 'Beachfront Cabana',    tag: 'beach', costBase: 2.4e5,comfort: 180, xMult: 0.10, xScope: 'all', unlockComfort: 5000, flavor: 'Ocean view. Owned view.' },

  // --- spa/wellness cluster (E10) ---
  { id: 'sunscreen',    name: 'Proper Sunscreen',     tag: 'spa', costBase: 1.5e5,comfort: 70,  xMult: 0.04, xScope: 'all', unlockComfort: 4000,  flavor: 'The Dutch skin thanks you.' },
  { id: 'massage',      name: 'Daily Massage',        tag: 'spa', costBase: 4e5,  comfort: 160, xMult: 0.08, xScope: 'all', unlockComfort: 8000,  flavor: 'Knots you did not know were nations.' },
  { id: 'private_spa',  name: 'Private Spa Wing',     tag: 'spa', costBase: 1.2e6,comfort: 380, xMult: 0.12, xScope: 'all', unlockComfort: 18000, flavor: 'Steam, stone, and silence you paid for.' },

  // --- luxury cluster (mid/late) ---
  { id: 'butler_bell',  name: 'A Little Silver Bell', tag: 'luxury', costBase: 3e6, comfort: 500, xMult: 0.15, xScope: 'all', unlockComfort: 4e4, flavor: 'You ring. Things happen.' },
  { id: 'gold_taps',    name: 'Gold Bathroom Taps',   tag: 'luxury', costBase: 1e7, comfort: 900, xMult: 0.18, xScope: 'all', unlockComfort: 1.2e5, flavor: 'Tasteless? Yes. Yours? Also yes.' },
  { id: 'infinity_pool',name: 'Private Infinity Pool',tag: 'luxury', costBase: 5e7, comfort: 2200,xMult: 0.25, xScope: 'all', unlockComfort: 5e5, flavor: 'The edge of the pool is the edge of the world.' },
];
