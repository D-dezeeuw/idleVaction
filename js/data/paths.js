// data/paths.js — the four branching build archetypes, each a COMMITTED, staged track.
// One path per run/life: the beat-6 crossroads choice (engine.applyStoryChoice) sets
// story.branch, which is the single source of truth for the commitment — buyPathFocus
// only works for the chosen path, and every path-point nudge (destinations, content,
// coins, crashes) credits ONLY the chosen path (engine.addPathPoints). Ascension's hard
// reset clears the branch, so each generation of the lineage can walk a different road.
//
// Points feed L_path in math.js (softcapped: 1 + rate·points^0.85) as before, PLUS the
// staged track below: each stage unlocks at `at` points ("gain at least X before
// progressing" — no hopping), fires its `desc` as the story continuation of that path,
// and grants ONE unique, bounded, flat bonus (aggregated by math.computePathBonuses,
// cached per-tick as state._pathBonus, run-scoped — stages re-earn each life). Bonus
// keys are a small fixed vocabulary; every value is a flat constant, so the stage layer
// is provably bounded (≤ the sum of the four rows) and can never compound into runaway.
export const PATHS = [
  { id: 'traveler',    name: 'World Traveler',
    identity: 'Breadth & logistics. Destinations = flat global ×.',
    perk: 'Destinations −15% cost, +1 transport slot.',
    focusCostBase: 1000, focusCostGrowth: 1.5,
    stages: [
      { at: 5,  name: 'Stamped Passport',   bonus: { destDiscount: 0.10 },
        goals: { d2Count: 3, destinations: 4 },
        desc: '🗺️ The passport gains its first real crease. The guard barely glances at the photo now. Destinations cost 10% less.' },
      { at: 15, name: 'Rail Pass Royalty',  bonus: { speed: 0.25 },
        goals: { d2Count: 7, destinations: 6 },
        desc: '🚂 You know which carriage has the good seats. All transport runs +25% faster for you.' },
      { at: 30, name: 'Continental Fixture',bonus: { global: 0.25 },
        goals: { d2Count: 18, destinations: 7, vehicleClass: 1 },
        desc: '🌍 Hostel owners three countries apart ask about you by name. All income +25% (the road provides).' },
      { at: 50, name: 'The Atlas Personified', bonus: { destDiscount: 0.15 },
        goals: { d2Count: 60, destinations: 8, vehicleClass: 2 },
        desc: '🧭 You correct the guidebooks now, gently. Destinations another 15% off. They practically invite you.' },
    ] },
  { id: 'vlogger',     name: 'Luxury Vlogging Backpacker',
    identity: 'Clout currency; social tiers boosted; active-play combo.',
    perk: 'Clout gain ×1.25, stronger combo window.',
    focusCostBase: 1000, focusCostGrowth: 1.5,
    stages: [
      { at: 5,  name: 'First Thousand',     bonus: { comboMax: 1 },
        goals: { d2Count: 3, clout: 5e4 },
        desc: '📸 A thousand strangers now care about your breakfast. Combo window grows +1. The audience wants MORE.' },
      { at: 15, name: 'The Algorithm Stirs',bonus: { cloutMult: 0.25 },
        goals: { d2Count: 7, clout: 2e5, contentFormats: 2 },
        desc: '🎬 The algorithm has started recommending you to strangers who look just like you. Clout gain +25%.' },
      { at: 30, name: 'Verified Blue',      bonus: { social: 0.5 },
        goals: { d2Count: 18, clout: 3.5e5, contentFormats: 3 },
        desc: '✔️ The checkmark. Hotels answer faster. Followers and sponsors (social tiers) produce +50%.' },
      { at: 50, name: 'Main Character Energy', bonus: { sponsorDur: 0.5 },
        goals: { d2Count: 60, clout: 7.5e5, contentFormats: 4 },
        desc: '🌟 Brands pitch YOU now, nervously. Sponsor deals run 50% longer.' },
    ] },
  { id: 'crypto',      name: 'Crypto Poolside Lounger',
    identity: 'Savvy passive income + volatile market events.',
    perk: 'Savvy passive ×1.3, better market upside.',
    focusCostBase: 1000, focusCostGrowth: 1.5,
    stages: [
      { at: 5,  name: 'First Cold Wallet',  bonus: { yieldMult: 0.25 },
        goals: { d2Count: 3, portfolioValue: 1e8 },
        desc: '📈 The seed phrase lives in three places, one of them a sock. Coin yield +25%.' },
      // Phase-C refit: the crypto track gains 'global' components — the same bounded flat
      // class as the traveler's Continental Fixture — because coin YIELD is linear in
      // holdings while the core economy is polynomial: measured, yield fades to 0.02% of
      // income by tier 18, leaving crypto the only branch with no core-income coupling
      // (58% slower to the island than the vlogger). Portfolio confidence pays everywhere.
      { at: 15, name: 'Diamond Hands',      bonus: { crashDamp: 0.25, global: 0.25 },
        goals: { d2Count: 7, portfolioValue: 5e9, coinSpread: 2 },
        desc: '💎 You have watched a −40% candle while ordering a second smoothie. Crash depth −25% for you, and the calm is worth +25% income everywhere.' },
      { at: 30, name: 'Exit Liquidity (Theirs)', bonus: { sellBonus: 0.15 },
        goals: { d2Count: 18, portfolioValue: 1e11, coinSpread: 3 },
        desc: '🐊 You sell into strength now, not panic. Coin sales pay +15% of unit price.' },
      { at: 50, name: 'The Whale Nods Back',bonus: { yieldMult: 0.5, global: 0.45 },
        goals: { d2Count: 60, portfolioValue: 1e12, coinSpread: 4 },
        desc: '🐋 Your wallet address gets recognized. Politely. Coin yield another +50%, and doors open ahead of you: +45% income everywhere.' },
    ] },
  { id: 'connoisseur', name: 'Old-Money Aesthete',
    identity: 'Taste & exclusivity; luxury tiers give outsized Comfort.',
    perk: 'Luxury tiers +25% Comfort, exclusivity ×.',
    focusCostBase: 1000, focusCostGrowth: 1.5,
    stages: [
      { at: 5,  name: 'A Discerning Eye',   bonus: { amenityComfort: 0.25 },
        goals: { d2Count: 3, collectionPieces: 5 },
        desc: '🍸 You can tell the real linen from the blend, blindfolded. Amenities give +25% Comfort.' },
      { at: 15, name: 'On the List',        bonus: { amenityDiscount: 0.15 },
        goals: { d2Count: 7, collectionPieces: 9 },
        desc: '🎩 Certain doors open before you knock. Amenities cost 15% less: friends of the house.' },
      // Connoisseur S3/S4 use luxAmenities, not collectionPieces (INVERTED vs the docs/10
      // §1.1 provisional shape — data-backed, see the calibration table): collections cap
      // at 12 by tier 12 (useless as an S3/S4 differentiator) while luxAmenities is 0 until
      // ~tier 10 (the first luxury amenity needs 40k total Comfort), so it can't gate
      // S1/S2 but works cleanly for S3/S4.
      { at: 30, name: 'Rooms Remember You', bonus: { accComfort: 0.15 },
        goals: { d2Count: 18, luxAmenities: 1 },
        desc: '🏛️ Suites feel warmer where you have slept. Accommodation gives +15% Comfort.' },
      { at: 50, name: 'Quiet Institution',  bonus: { comfortAll: 0.25 },
        goals: { d2Count: 60, luxAmenities: 2 },
        desc: '🕰️ Your taste is cited, anonymously, in trade publications. ALL Comfort +25%.' },
    ] },
];

// dev schema guard (mirrors validateDestinations/validateBank): ids unique, stage
// thresholds strictly ascending, every stage carries a name/desc/bonus, and every bonus
// key is in the fixed vocabulary math.computePathBonuses aggregates — a typo'd key
// would silently grant nothing.
export const PATH_BONUS_KEYS = ['social', 'global', 'comboMax', 'cloutMult', 'sponsorDur',
  'yieldMult', 'crashDamp', 'sellBonus', 'destDiscount', 'speed',
  'amenityComfort', 'amenityDiscount', 'accComfort', 'comfortAll'];
// Path stage GOAL vocabulary (docs/10 §1.1, fixed — validated like PATH_BONUS_KEYS above):
// the concrete, diegetic, cash-bridgeable requirements math.stageGoalProgress reads
// alongside the `at` points threshold. `earnedComfort` is reserved but currently UNUSED
// by any stage (see the calibration table's rationale: it reads ~0 at every tier-up
// snapshot — a check-in resets comfortFloor the same instant Comfort is sampled — so it's
// a poor checkpoint-gate resource; kept in the vocabulary for a future mid-plateau sampler).
export const PATH_GOAL_KEYS = ['d2Count', 'clout', 'contentFormats', 'portfolioValue',
  'coinSpread', 'destinations', 'vehicleClass', 'luxAmenities', 'earnedComfort', 'collectionPieces'];
export function validatePaths() {
  const errors = [];
  const seen = new Set();
  for (const p of PATHS) {
    if (seen.has(p.id)) errors.push(`duplicate path id: ${p.id}`);
    seen.add(p.id);
    if (!Array.isArray(p.stages) || p.stages.length === 0) { errors.push(`${p.id}: no stages`); continue; }
    let prevAt = 0;
    const prevGoal = {};   // last stage's value per goal key — enforces non-decreasing progression
    for (const st of p.stages) {
      if (!(st.at > prevAt)) errors.push(`${p.id}: stage thresholds must be strictly ascending (${st.at} after ${prevAt})`);
      prevAt = st.at;
      for (const k of ['name', 'desc', 'bonus']) if (st[k] === undefined) errors.push(`${p.id}@${st.at}: missing "${k}"`);
      for (const bk of Object.keys(st.bonus || {})) {
        if (!PATH_BONUS_KEYS.includes(bk)) errors.push(`${p.id}@${st.at}: unknown bonus key "${bk}"`);
        if (!(st.bonus[bk] > 0)) errors.push(`${p.id}@${st.at}: bonus "${bk}" must be a positive flat constant`);
      }
      for (const [gk, gv] of Object.entries(st.goals || {})) {
        if (!PATH_GOAL_KEYS.includes(gk)) errors.push(`${p.id}@${st.at}: unknown goal key "${gk}"`);
        if (!(Number.isFinite(gv) && gv > 0)) errors.push(`${p.id}@${st.at}: goal "${gk}" must be a positive finite number`);
        if (gk in prevGoal && gv < prevGoal[gk]) errors.push(`${p.id}@${st.at}: goal "${gk}" (${gv}) is lower than the previous stage's (${prevGoal[gk]}) — progression may never require less`);
        prevGoal[gk] = gv;
      }
    }
  }
  if (errors.length) throw new Error('validatePaths() failed:\n' + errors.join('\n'));
  return true;
}
