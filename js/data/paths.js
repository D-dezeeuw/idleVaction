// data/paths.js — the four branching build archetypes.
// Path points come from spending "focus" (cash) and story choices.
// Points feed L_path in math.js (softcapped: 1 + rate·points^0.85).

export const PATHS = [
  { id: 'traveler',    name: 'World Traveler',
    identity: 'Breadth & logistics. Destinations = flat global ×.',
    perk: 'Destinations −15% cost, +1 transport slot.',
    focusCostBase: 1000, focusCostGrowth: 1.5 },
  { id: 'vlogger',     name: 'Luxury Vlogging Backpacker',
    identity: 'Clout currency; social tiers boosted; active-play combo.',
    perk: 'Clout gain ×1.25, stronger combo window.',
    focusCostBase: 1000, focusCostGrowth: 1.5 },
  { id: 'crypto',      name: 'Crypto Poolside Lounger',
    identity: 'Savvy passive income + volatile market events.',
    perk: 'Savvy passive ×1.3, better market upside.',
    focusCostBase: 1000, focusCostGrowth: 1.5 },
  { id: 'connoisseur', name: 'Old-Money Aesthete',
    identity: 'Taste & exclusivity; luxury tiers give outsized Comfort.',
    perk: 'Luxury tiers +25% Comfort, exclusivity ×.',
    focusCostBase: 1000, focusCostGrowth: 1.5 },
];
