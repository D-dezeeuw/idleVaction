// data/destinations.js — the World Traveler map (E04): destinations (each a flat,
// PERMANENT global ×, folded into L_dest) and tier-1 transport (bus/train — speeds
// destination cost, small upkeep sink). Pure declarative data; math lives in math.js,
// wiring in engine.js. No import of math/engine here (data sits above math in the
// config→util→math→data chain — see AGENTS.md §4). The one sibling import below (PATHS)
// mirrors the existing data→data precedent (data/splurges.js imports SKILLS, data/staff.js
// imports GROUNDS) — used ONLY by validateDestinations to check `branch` against real path ids.
//
import { PATHS } from './paths.js';
const PATH_IDS = PATHS.map(p => p.id);
//
// DESTINATIONS row shape: { id, name, region, costBase, mult, unlockAfter, unlockComfort,
//   tag, pathAffinity, travelTime, flavor, branch? }. `travelTime` (E15-S1-T7) is the felt "cycling
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
//
// PHASE 6A — path-exclusive destinations (docs/10, .claude/context/path-story-
// implementation-plan.md "Phase 6"): 12 rows, 3 per path (`branch: 'vlogger'|'crypto'|
// 'traveler'|'connoisseur'`), interleaved below by costBase (validateDestinations enforces
// strict ascending costBase across the WHOLE array, so these sit at the array position
// matching their price band, not grouped as a block). Binding design rule: `mult` is
// EXACTLY 1.0 — ZERO new global multiplier (see the BALANCE NOTE above: the destination
// map's x-product budget is already spent). The reward is entirely path-scoped: pathAffinity
// toward the OWNING branch only (a flat +3 points on purchase via the same addPathPoints/
// pathReceives machinery every other destination uses — engine.buyDestination), plus
// flavor. No Comfort-hook: this row shape has no field computeComfort reads (unlike
// signature/property/collection rows, which hook Comfort through their OWN dedicated terms
// in math.js) — adding one would mean a new math.js term, which is a balance-tuner change,
// not a data-file one, so these rows carry pathAffinity + flavor only, matching the design
// rule's "if the existing row schema supports one" clause. Visibility AND purchase are
// gated to a life whose road includes the row's branch (engine.pathReceives — the SAME
// commitment check used everywhere else, wired into destUnlocked so both the reveal/listing
// layer and buyDestination inherit it for free — no bespoke gate). Costs are spread across
// each path's arc, priced off the neighboring OPEN rows at the same unlockComfort band:
// early (~S1/S2 era, between dest_brussels/dest_cologne), mid (~S3 era, between
// sea_fjord_cruise/air_tokyo), late (~S4 era, between air_new_york/air_sydney). The greedy/
// scenario dev bots deliberately skip `branch`-tagged rows (js/dev/harness.mjs, scenarios.mjs,
// selftest.mjs — mirrors the existing amenityWorthBuying ROI philosophy: a mult:1.0 row is
// zero-ROI for a max-speed policy, so a rational bot never buys one), so these rows never
// move any pinned harness/selftest baseline; a real committed player sees/buys them via the UI.
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
    flavor: 'You go home to Amsterdam, as a tourist this time. The locals give you a knowing nod.' },
  { id: 'dest_brussels', name: 'Brussels', region: 'Benelux',
    costBase: 194400, mult: 1.035, unlockAfter: 'dest_amsterdam_return', unlockComfort: 5e4, tag: 'capital',
    pathAffinity: { traveler: 1.0 }, travelTime: 20,
    flavor: 'Waffles, fries, and a diplomatic quarter you accidentally wander into twice.' },
  // --- Phase 6A path-exclusive destinations, early slot (~S1/S2 era) — see the PHASE 6A
  // comment above the array for the full design contract. mult: 1.0, branch-gated. ---
  { id: 'dest_transsiberian', name: 'Trans-Siberian Stretch', region: 'Russia', branch: 'traveler',
    costBase: 260000, mult: 1.0, unlockAfter: null, unlockComfort: 90000, tag: 'exclusive',
    pathAffinity: { traveler: 3 }, travelTime: 45,
    flavor: 'Seven days, one train, a thousand identical pine trees. You run out of things to say to your cabin-mate by hour twelve and start explaining stroopwafels instead.' },
  { id: 'dest_bali_content_house', name: 'The Content House, Bali', region: 'Indonesia', branch: 'vlogger',
    costBase: 320000, mult: 1.0, unlockAfter: null, unlockComfort: 110000, tag: 'exclusive',
    pathAffinity: { vlogger: 3 }, travelTime: 40,
    flavor: 'A literal house, rented by the month, with three ring lights bolted to the ceiling and a rice-paddy view that exists purely for the thumbnail. You have never once eaten there. You have filmed there four hundred times.' },
  { id: 'dest_zug', name: 'Zug, Very Quietly', region: 'Switzerland', branch: 'crypto',
    costBase: 380000, mult: 1.0, unlockAfter: null, unlockComfort: 130000, tag: 'exclusive',
    pathAffinity: { crypto: 3 }, travelTime: 35,
    flavor: 'A town so quiet the Swiss themselves forget it exists, which is precisely why your entire portfolio is domiciled here. Nobody asks questions. Nobody says much of anything.' },
  { id: 'dest_bordeaux_chateau', name: 'A Quiet Château, Bordeaux', region: 'France', branch: 'connoisseur',
    costBase: 440000, mult: 1.0, unlockAfter: null, unlockComfort: 150000, tag: 'exclusive',
    pathAffinity: { connoisseur: 3 }, travelTime: 40,
    flavor: 'A quiet château, three rooms, one very patient sommelier who has stopped correcting your pronunciation. You have started noticing tannins. This alarms everyone who knew you before.' },
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
  // --- Phase 6A path-exclusive destinations, mid slot (~S3 era) — see the PHASE 6A
  // comment above the array. mult: 1.0, branch-gated. ---
  { id: 'dest_kathmandu', name: 'Kathmandu Basecamp', region: 'Himalaya', branch: 'traveler',
    costBase: 56000000, mult: 1.0, unlockAfter: null, unlockComfort: 55000000, tag: 'exclusive',
    pathAffinity: { traveler: 3 }, travelTime: 140,
    flavor: 'Basecamp for something much taller than you will ever climb. You buy the fleece. The fleece is the summit.' },
  { id: 'dest_santorini_goldenhour', name: 'Santorini Golden Hour', region: 'Aegean', branch: 'vlogger',
    costBase: 68000000, mult: 1.0, unlockAfter: null, unlockComfort: 65000000, tag: 'exclusive',
    pathAffinity: { vlogger: 3 }, travelTime: 120,
    flavor: 'Golden hour lasts eleven minutes. You have learned to sprint in flowing linen. The other forty content houses on the same cliff know your sprint by name.' },
  { id: 'dest_miami_cryptoweek', name: 'Miami Crypto Week', region: 'USA', branch: 'crypto',
    costBase: 82000000, mult: 1.0, unlockAfter: null, unlockComfort: 75000000, tag: 'exclusive',
    pathAffinity: { crypto: 3 }, travelTime: 130,
    flavor: 'A week of panels, yachts, and men in linen suits explaining tokenomics to each other, loudly, over a DJ nobody asked for. You network. You mean you stand near the shrimp.' },
  { id: 'dest_kyoto_ryokan', name: 'Kyoto Ryokan, Off the Record', region: 'Japan', branch: 'connoisseur',
    costBase: 98000000, mult: 1.0, unlockAfter: null, unlockComfort: 85000000, tag: 'exclusive',
    pathAffinity: { connoisseur: 3 }, travelTime: 150,
    flavor: 'Off the record, off the main street, off almost every map — the owner takes six guests a season and decided, inexplicably, you were one of them.' },
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
  // --- Phase 6A path-exclusive destinations, late slot (~S4 era) — see the PHASE 6A
  // comment above the array. mult: 1.0, branch-gated. ---
  { id: 'dest_patagonia', name: 'Patagonia End-to-End', region: 'Patagonia', branch: 'traveler',
    costBase: 550000000, mult: 1.0, unlockAfter: null, unlockComfort: 500000000, tag: 'exclusive',
    pathAffinity: { traveler: 3 }, travelTime: 220,
    flavor: 'End to end, by bus, boat, and one deeply regretted hitchhike. The wind never stops. Neither, by now, do you.' },
  { id: 'dest_iceland_drone', name: 'Iceland Drone Weekend', region: 'Nordic', branch: 'vlogger',
    costBase: 700000000, mult: 1.0, unlockAfter: null, unlockComfort: 700000000, tag: 'exclusive',
    pathAffinity: { vlogger: 3 }, travelTime: 210,
    flavor: 'A long weekend, mostly airborne footage. The drone has seen more of Iceland than you have. It also has more followers.' },
  { id: 'dest_taxhaven_atoll', name: 'Tax-Haven Atoll', region: 'Offshore', branch: 'crypto',
    costBase: 900000000, mult: 1.0, unlockAfter: null, unlockComfort: 900000000, tag: 'exclusive',
    pathAffinity: { crypto: 3 }, travelTime: 230,
    flavor: 'A ring of sand with a very good lawyer and a very bad Wi-Fi signal. The paperwork took longer than the flight. Both were worth it, allegedly.' },
  { id: 'dest_como', name: 'Lake Como, a Long Weekend', region: 'Italy', branch: 'connoisseur',
    costBase: 1100000000, mult: 1.0, unlockAfter: null, unlockComfort: 1100000000, tag: 'exclusive',
    pathAffinity: { connoisseur: 3 }, travelTime: 225,
    flavor: 'A long weekend on water so still it looks staged. It is not staged. You are simply, finally, somewhere that photographs itself.' },
  { id: 'air_sydney', name: 'Sydney', region: 'Australia',
    costBase: 1.3e9, mult: 1.055, unlockAfter: 'air_new_york', unlockComfort: 1.2e9, tag: 'air',
    pathAffinity: { traveler: 1.0 }, travelTime: 240, air: true, requiresJetTier: 5,
    flavor: 'The far side of the planet, reached before lunch. The jet lag files a complaint you ignore.' },

  // --- Premium destinations (E24 "Where the Rich Hide"): the endgame collection meta-game. Five
  // places the rich actually hide, each a UNIQUE, larger global × + a signature amenity, and an
  // escalating SET bonus for owning many (math.destSetMult). `premium:true` routes them through a
  // HARD gate in engine.destUnlocked — a Taste level AND being in the summit era (owning a property
  // OR having any exclusivity) — a gate the greedy harness (0 property, 0 exclusivity) can NEVER
  // clear, so it never unlocks/buys one ⇒ destMult stays put ⇒ the fitted 29705s island is unmoved.
  // `signature` names the tag:'signature' amenity that unlocks with the place. costBase strictly
  // increasing past Sydney; tasteGate culminates at L25 (beat 25, "Where the Rich Hide"). ---
  { id: 'dest_monaco', name: 'Monaco', region: 'Riviera', premium: true, tasteGate: 15, signature: 'sig_casino_suite',
    costBase: 3e9, mult: 1.15, unlockComfort: 0, tag: 'premium', pathAffinity: { traveler: 1.5, connoisseur: 1.0 }, travelTime: 200,
    flavor: 'A country the size of a car park, entirely full of money. You fit right in, which is the alarming part.' },
  { id: 'dest_dubai', name: 'Dubai', region: 'Gulf', premium: true, tasteGate: 18, signature: 'sig_burj_floor',
    costBase: 8e9, mult: 1.18, unlockComfort: 0, tag: 'premium', pathAffinity: { traveler: 1.5, connoisseur: 1.0 }, travelTime: 210,
    flavor: 'They built a city where there was sand, then air-conditioned the outdoors. You do not ask what it cost. You know what it cost.' },
  { id: 'dest_maldives', name: 'The Maldives', region: 'Indian Ocean', premium: true, tasteGate: 20, signature: 'sig_private_atoll',
    costBase: 2e10, mult: 1.20, unlockComfort: 0, tag: 'premium', pathAffinity: { traveler: 1.5, connoisseur: 1.0 }, travelTime: 230,
    flavor: 'A ring of sand around a lagoon, rented by the night for the price of a house. The house had rain. This does not.' },
  { id: 'dest_aspen', name: 'Aspen', region: 'Rockies', premium: true, tasteGate: 22, signature: 'sig_ski_chalet',
    costBase: 5e10, mult: 1.22, unlockComfort: 0, tag: 'premium', pathAffinity: { traveler: 1.5, connoisseur: 1.0 }, travelTime: 220,
    flavor: 'You do not ski. You own the après-ski, the chalet, and the fur nobody in Utrecht would have believed. You still cannot ski.' },
  { id: 'dest_st_barths', name: 'St. Barths', region: 'Caribbean', premium: true, tasteGate: 25, signature: 'sig_harbour_villa',
    costBase: 1.2e11, mult: 1.25, unlockComfort: 0, tag: 'premium', pathAffinity: { traveler: 1.5, connoisseur: 1.0 }, travelTime: 235,
    flavor: 'The last one. A harbour full of boats that cost more than nations, and yours moored among them. This is where the rich hide. You found it. You ARE it.' },
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
    // premium destinations (E24): premium:true rows carry a positive-integer tasteGate + a signature
    // amenity id (cross-referenced against DATA.amenities in the selftest, not here — no import cycle).
    if (d.premium !== undefined) {
      if (d.premium !== true) errors.push(`${d.id}: premium must be true when present (got ${d.premium})`);
      if (!Number.isInteger(d.tasteGate) || d.tasteGate <= 0) errors.push(`${d.id}: premium destination needs a positive-integer tasteGate`);
      if (typeof d.signature !== 'string' || !d.signature) errors.push(`${d.id}: premium destination needs a signature amenity id`);
      if (!(d.mult > 1)) errors.push(`${d.id}: premium destination mult must be > 1 (got ${d.mult})`);
    }
    // Phase 6A path-exclusive destinations: branch, when present, must be a real path id
    // (validatePaths' own vocabulary — checked against PATHS directly, no engine import), and
    // the row's mult must be EXACTLY 1.0 — the binding "zero new global multiplier" rule, kept
    // structural here so a future edit can't sneak a real × onto an exclusive row.
    if (d.branch !== undefined) {
      if (!PATH_IDS.includes(d.branch)) errors.push(`${d.id}: unknown branch "${d.branch}" (must be one of ${PATH_IDS.join(', ')})`);
      if (d.mult !== 1.0) errors.push(`${d.id}: path-exclusive destination mult must be exactly 1.0 (got ${d.mult})`);
    }
  }
  if (errors.length) throw new Error('validateDestinations() failed:\n' + errors.join('\n'));
  return true;
}
