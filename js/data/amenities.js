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
