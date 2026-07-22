// data/destinations.js — the World Traveler map (E04): destinations (each a flat,
// PERMANENT global ×, folded into L_dest) and tier-1 transport (bus/train — speeds
// destination cost, small upkeep sink). Pure declarative data; math lives in math.js,
// wiring in engine.js. No import of math/engine here (data sits above math in the
// config→util→math→data chain — see AGENTS.md §4).
//
// DESTINATIONS row shape: { id, name, region, costBase, mult, unlockAfter, unlockComfort,
//   tag, pathAffinity, travelTime, flavor }. `travelTime` (E15-S1-T7) is the felt "cycling
//   time" in seconds a destination takes to complete a round trip before it can be re-bought
//   at its next tier of income — a car's `speed` field (data/vehicles.js) shortens this,
//   the same way transport's own `speed` shortens destCost. Small for near places, larger
//   for far ones; this file never imports config/engine, so the actual cycling-time formula
//   lives in math.js/engine.js — this is leaf data only. `unlockAfter` chains reveal order (null = always visible
// once the map itself is revealed); costBase escalates ~×3 per row so early breadth is
// cheap and felt (E04-S1-T2/S4-T2). `unlockComfort` is the OTHER unlock half (S2-T9:
// "prior place owned OR Comfort threshold") — it keeps the FULL 8-place set completable
// within the backpacker-circuit era (Act I-III, well before "island"), matching the
// narrative, rather than gating on cash alone (which — being fed by the very multiplier
// destinations grant — grows fast enough to buy the whole map within an hour or two).
//
// mult: *** BALANCE NOTE FOR @balance-tuner — deliberately BELOW the epic's suggested
// 1.08-1.20/row range ***. L_dest is folded into tierMultiplier globally, across ALL 8
// generator tiers (per spec). The harness (`node js/dev/harness.mjs`) showed this is far
// MORE sensitive than the epic anticipated: because the tier chain compounds over many
// hours, even the epic's own low end (all rows at 1.08, product ~1.85) collapsed the
// ~20h island time to ~12h — well outside the 15-20h band — regardless of how late the
// full set is gated to complete. A product of ~1.29 (this file's values) keeps island in
// the 16-18h range with margin. If the full 1.08-1.20/row flavor is wanted later, it
// needs a coordinated retune (GEN/COMFORT), not just a destinations-file edit — see the
// sweep data referenced in the phase-4 build report.
export const DESTINATIONS = [
  { id: 'dest_ardennes_daytrip', name: 'Ardennes Day Trip', region: 'Benelux',
    costBase: 800, mult: 1.025, unlockAfter: null, unlockComfort: 0, tag: 'daytrip',
    pathAffinity: { traveler: 1.0 }, travelTime: 20,
    flavor: 'A day trip to the Ardennes. Hills! Actual hills! The Netherlands does not have these.' },
  { id: 'dest_paris_hostel', name: 'Paris (Hostel Bunk)', region: 'Western Europe',
    costBase: 2400, mult: 1.025, unlockAfter: 'dest_ardennes_daytrip', unlockComfort: 300, tag: 'capital',
    pathAffinity: { traveler: 1.0 }, travelTime: 25,
    flavor: 'A bunk under the Eiffel Tower\'s shadow, roughly. Wi-Fi password: "baguette123".' },
  { id: 'dest_berlin', name: 'Berlin', region: 'DACH',
    costBase: 7200, mult: 1.03, unlockAfter: 'dest_paris_hostel', unlockComfort: 1000, tag: 'capital',
    pathAffinity: { traveler: 1.0 }, travelTime: 35,
    flavor: 'Techno until sunrise, currywurst until regret. You fit right in.' },
  { id: 'dest_prague', name: 'Prague', region: 'Central Europe',
    costBase: 21600, mult: 1.03, unlockAfter: 'dest_berlin', unlockComfort: 3000, tag: 'capital',
    pathAffinity: { traveler: 1.0 }, travelTime: 40,
    flavor: 'Beer cheaper than water. You do the responsible thing and drink both, constantly.' },
  { id: 'dest_amsterdam_return', name: 'Amsterdam (Return Trip)', region: 'Benelux',
    costBase: 64800, mult: 1.035, unlockAfter: 'dest_prague', unlockComfort: 8000, tag: 'return',
    pathAffinity: { traveler: 1.0 }, travelTime: 15,
    flavor: 'You go home to Amsterdam — as a tourist, this time. The locals give you a knowing nod.' },
  { id: 'dest_brussels', name: 'Brussels', region: 'Benelux',
    costBase: 194400, mult: 1.035, unlockAfter: 'dest_amsterdam_return', unlockComfort: 5e4, tag: 'capital',
    pathAffinity: { traveler: 1.0 }, travelTime: 20,
    flavor: 'Waffles, fries, and a diplomatic quarter you accidentally wander into twice.' },
  { id: 'dest_cologne', name: 'Cologne', region: 'DACH',
    costBase: 583200, mult: 1.04, unlockAfter: 'dest_brussels', unlockComfort: 5e5, tag: 'city',
    pathAffinity: { traveler: 1.0 }, travelTime: 25,
    flavor: 'A cathedral so tall you get a neck cramp. Worth it. Probably.' },
  { id: 'dest_vienna', name: 'Vienna', region: 'Central Europe',
    costBase: 1749600, mult: 1.04, unlockAfter: 'dest_cologne', unlockComfort: 5e6, tag: 'capital',
    pathAffinity: { traveler: 1.0 }, travelTime: 60,
    flavor: 'Coffee house etiquette has seventeen unwritten rules. You break twelve by lunch.' },
  // --- sea destinations (E16 "Sea Legs"): sea:true + requiresBoatTier — engine.destUnlocked
  // blocks them until the marina owns a boat of the needed tier, so a hull literally opens
  // places you couldn't reach. Same conservative mult range as the land rows (see the BALANCE
  // NOTE above — L_dest is global + pacing-sensitive); costBase strictly-increasing past Vienna. ---
  { id: 'sea_hidden_cove', name: 'A Hidden Cove', region: 'Mediterranean',
    costBase: 5.2e6, mult: 1.045, unlockAfter: 'dest_vienna', unlockComfort: 6e6, tag: 'sea',
    pathAffinity: { traveler: 1.0, connoisseur: 0.5 }, travelTime: 90, sea: true, requiresBoatTier: 1,
    flavor: 'No road reaches it. That is, of course, the entire point.' },
  { id: 'sea_greek_islands', name: 'A Greek Island-Hop', region: 'Aegean',
    costBase: 1.6e7, mult: 1.045, unlockAfter: 'sea_hidden_cove', unlockComfort: 2e7, tag: 'sea',
    pathAffinity: { traveler: 1.0, connoisseur: 0.5 }, travelTime: 120, sea: true, requiresBoatTier: 2,
    flavor: 'Blue roofs, white walls, a different anchorage each night. You lose track of the days, gladly.' },
  { id: 'sea_fjord_cruise', name: 'A Fjord Cruise', region: 'Norway',
    costBase: 4.8e7, mult: 1.05, unlockAfter: 'sea_greek_islands', unlockComfort: 6e7, tag: 'sea',
    pathAffinity: { traveler: 1.0, connoisseur: 0.5 }, travelTime: 150, sea: true, requiresBoatTier: 3,
    flavor: 'Turns out the fjords do not care that it also rains in Rotterdam.' },
  // --- air destinations (E17 "Wheels Up"): air:true + requiresJetTier — intercontinental places a
  // jet collapses to a tap. engine.destUnlocked blocks them until the hangar owns a jet of the
  // needed tier; owning ANY jet also cuts destination cost (config.LOGISTICS.jetDiscount). Same
  // conservative mult range as the land/sea rows. costBase strictly-increasing past the fjord. ---
  { id: 'air_tokyo', name: 'Tokyo', region: 'Japan',
    costBase: 1.4e8, mult: 1.05, unlockAfter: 'sea_fjord_cruise', unlockComfort: 1.4e8, tag: 'air',
    pathAffinity: { traveler: 1.0 }, travelTime: 200, air: true, requiresJetTier: 1,
    flavor: 'Eleven time zones from the drizzle. You order the set menu and understand none of it, blissfully.' },
  { id: 'air_new_york', name: 'New York', region: 'USA',
    costBase: 4.2e8, mult: 1.05, unlockAfter: 'air_tokyo', unlockComfort: 4e8, tag: 'air',
    pathAffinity: { traveler: 1.0 }, travelTime: 220, air: true, requiresJetTier: 3,
    flavor: 'You land, you conquer, you complain about the bagels being wrong. Naturally.' },
  { id: 'air_sydney', name: 'Sydney', region: 'Australia',
    costBase: 1.3e9, mult: 1.055, unlockAfter: 'air_new_york', unlockComfort: 1.2e9, tag: 'air',
    pathAffinity: { traveler: 1.0 }, travelTime: 240, air: true, requiresJetTier: 5,
    flavor: 'The far side of the planet, reached before lunch. The jet lag files a complaint you ignore.' },
];

// TRANSPORT row shape: { id, name, speed, costBase, upkeep, flavor }. `speed` shortens
// the effective cost of reaching a destination (cost/(1+speed) — engine.destCost);
// `upkeep` is a small cash/s drain while active (engine.tick) so a ride is a real,
// positive-but-not-free choice (E04-S1-T3/S2-T5/T8).
export const TRANSPORT = [
  { id: 'bus', name: 'Overnight Bus', speed: 0.12, costBase: 500, upkeep: 0.20,
    flavor: 'Legroom optional. Dreams: fully reclined.' },
  { id: 'train', name: 'Eurail Pass', speed: 0.30, costBase: 3000, upkeep: 0.60,
    flavor: 'A window seat and main-character energy, guaranteed.' },
];

// Dev schema guard (E04-S1-T10): every row has its required keys, costBase strictly
// increases (the intended "cheap first, pricier later" onboarding order), and mult is
// never a downgrade. Throws loudly on malformed data — called from dev/harness.mjs.
export function validateDestinations() {
  const errors = [];
  const seen = new Set();
  let prevCost = 0;
  for (const d of DESTINATIONS) {
    if (seen.has(d.id)) errors.push(`duplicate destination id: ${d.id}`);
    seen.add(d.id);
    for (const k of ['id', 'name', 'region', 'costBase', 'mult', 'tag', 'travelTime']) {
      if (d[k] === undefined) errors.push(`${d.id}: missing required key "${k}"`);
    }
    if (!(d.costBase > prevCost)) errors.push(`${d.id}: costBase (${d.costBase}) not strictly increasing (prev ${prevCost})`);
    prevCost = d.costBase;
    if (!(d.mult >= 1)) errors.push(`${d.id}: mult must be >= 1 (got ${d.mult})`);
    if (!(d.unlockComfort >= 0)) errors.push(`${d.id}: unlockComfort must be >= 0 (got ${d.unlockComfort})`);
    if (typeof d.travelTime !== 'number' || !(d.travelTime > 0)) errors.push(`${d.id}: travelTime must be a positive number (got ${d.travelTime})`);
    // sea destinations (E16): sea:true rows must carry a positive-integer requiresBoatTier gate.
    if (d.sea !== undefined) {
      if (d.sea !== true) errors.push(`${d.id}: sea must be true when present (got ${d.sea})`);
      if (!Number.isInteger(d.requiresBoatTier) || d.requiresBoatTier <= 0) errors.push(`${d.id}: sea destination needs a positive-integer requiresBoatTier`);
    }
    // air destinations (E17): air:true rows must carry a positive-integer requiresJetTier gate.
    if (d.air !== undefined) {
      if (d.air !== true) errors.push(`${d.id}: air must be true when present (got ${d.air})`);
      if (!Number.isInteger(d.requiresJetTier) || d.requiresJetTier <= 0) errors.push(`${d.id}: air destination needs a positive-integer requiresJetTier`);
    }
  }
  if (errors.length) throw new Error('validateDestinations() failed:\n' + errors.join('\n'));
  return true;
}
