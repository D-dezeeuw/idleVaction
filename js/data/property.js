// data/property.js — owned property (E22 "A Bungalow of One's Own"). The rent→own flip.
//
// A one-time DEED purchase flips a place from rented to owned; each owned property contributes a
// PERSISTENT Comfort floor (baseComfort + Σ bought-upgrade comfort) via a new ComfortRaw term
// (w_prop·propertyScore, see math.propertyScore/computeComfort) that reads state.property ONLY —
// never accommodation.tier — so climbing the rented ladder never zeroes it (the persistence
// guarantee). Each property carries an UPGRADE TREE: nodes with a `parent` (a real tree, not a
// flat list), cost base·growth^rank (growth = PROPERTY.growth = 1.6). All numeric fields read from
// config.PROPERTY so balancing is a config edit (S1-T8). Pure data — the engine stays generic.
//
// Invariance: nothing here is bought by the greedy harness (buyProperty is never called from the
// harness play loop, and the accommodation ladder stays Comfort-gated, NOT property-gated), so
// propertyScore is 0 throughout the harness run and the fitted 29705s island cannot move.

import { CONFIG as C } from '../config.js';

// Upgrade-tree node shape: {id, name, parent, costBase, costGrowth, comfort, xMult?, tag}.
// `parent: null` = a root node (buyable once the property is owned); a child needs its parent at
// rank ≥ 1. costBase is a MULTIPLE of PROPERTY.base so the whole tree scales from one config knob.
const B = C.PROPERTY.base;

export const PROPERTIES = [
  {
    id: 'bungalow', tier: 16, name: 'Private Bungalow',
    ownCost: C.PROPERTY.ownCost[0], baseComfort: C.PROPERTY.baseComfort[0], amenitySlots: 6,
    flavor: 'You stop renting rooms. You own walls. The seagulls are trespassers now.',
    upgrades: [
      { id: 'bung_deck',        name: 'Wraparound Deck',      parent: null,          costBase: B * 1.0, costGrowth: C.PROPERTY.growth, comfort: 3.0e7, tag: 'property', flavor: 'A deck. Yours. The seagulls file no paperwork.' },
      { id: 'bung_plunge',      name: 'Plunge Pool',          parent: 'bung_deck',   costBase: B * 1.8, costGrowth: C.PROPERTY.growth, comfort: 4.2e7, tag: 'property', flavor: 'Small, cold, entirely yours. You get in twice a year and love it each time.' },
      { id: 'bung_glassfloor',  name: 'Glass Floor Section',  parent: 'bung_deck',   costBase: B * 2.6, costGrowth: C.PROPERTY.growth, comfort: 5.5e7, tag: 'property', flavor: 'You watch fish through the floor. The fish, unbothered, watch you back.' },
      { id: 'bung_sunshade',    name: 'Motorised Sun-Shade',  parent: 'bung_plunge', costBase: B * 3.6, costGrowth: C.PROPERTY.growth, comfort: 7.0e7, xMult: 0.03, tag: 'property', flavor: 'Shade at the press of a button, against a sun you crossed a continent to find.' },
      { id: 'bung_kitchen',     name: 'Outdoor Kitchen',      parent: 'bung_glassfloor', costBase: B * 4.8, costGrowth: C.PROPERTY.growth, comfort: 8.8e7, tag: 'property', flavor: 'You grill outdoors now, in weather that permits it, which, miraculously, it does.' },
      { id: 'bung_firepit',     name: 'Sunken Fire Pit',      parent: 'bung_kitchen', costBase: B * 6.4, costGrowth: C.PROPERTY.growth, comfort: 1.1e8, tag: 'property', flavor: 'A fire, sunk into your own ground. Thirty years of bus stops, and now this.' },
      { id: 'bung_hottub',      name: 'Cedar Hot Tub',        parent: 'bung_sunshade', costBase: B * 8.5, costGrowth: C.PROPERTY.growth, comfort: 1.4e8, xMult: 0.035, tag: 'property', flavor: 'Cedar, steam, stars. You bought a hole full of hot water and it was the right call.' },
      { id: 'bung_wing',        name: 'Guest Wing',           parent: 'bung_firepit', costBase: B * 11.0, costGrowth: C.PROPERTY.growth, comfort: 1.8e8, xMult: 0.04, tag: 'property', flavor: 'A whole wing for guests who visit once. It waits, immaculate, for almost no one.' },
    ],
  },
  {
    id: 'overwater_villa', tier: 17, name: 'Overwater Villa',
    ownCost: C.PROPERTY.ownCost[1], baseComfort: C.PROPERTY.baseComfort[1], amenitySlots: 8,
    requiresOwn: 'bungalow',
    flavor: 'On stilts, over turquoise water. Fish commute beneath your bed. Suspicious, even.',
    upgrades: [
      { id: 'ow_hammocknet',    name: 'Hammock Net Over Water', parent: null,        costBase: B * 14.0, costGrowth: C.PROPERTY.growth, comfort: 2.4e8, tag: 'property', flavor: 'A net strung over the sea. You lie on the ocean without getting wet. This is new.' },
      { id: 'ow_glasslounge',   name: 'Glass-Bottom Lounge',  parent: 'ow_hammocknet', costBase: B * 20.0, costGrowth: C.PROPERTY.growth, comfort: 3.0e8, tag: 'property', flavor: 'A lounge with a glass floor over the reef. The reef is more interesting than most television.' },
      { id: 'ow_jetty',         name: 'Private Jetty',        parent: 'ow_hammocknet', costBase: B * 27.0, costGrowth: C.PROPERTY.growth, comfort: 3.8e8, xMult: 0.04, tag: 'property', flavor: 'Your own jetty. Boats arrive because of you now, not despite you.' },
      { id: 'ow_starlights',    name: 'Sea-Star Deck Lights',  parent: 'ow_glasslounge', costBase: B * 35.0, costGrowth: C.PROPERTY.growth, comfort: 4.6e8, tag: 'property', flavor: 'Lights in the deck like stars fallen the short way. You did not need them. You have them.' },
      { id: 'ow_infinitypool',  name: 'Infinity Edge Pool',   parent: 'ow_jetty',    costBase: B * 45.0, costGrowth: C.PROPERTY.growth, comfort: 5.6e8, xMult: 0.045, tag: 'property', flavor: 'A pool that appears to spill into the sea. It does not. The illusion cost extra. Worth it.' },
      { id: 'ow_underwater',    name: 'Underwater Bedroom',   parent: 'ow_starlights', costBase: B * 58.0, costGrowth: C.PROPERTY.growth, comfort: 7.0e8, xMult: 0.05, tag: 'property', flavor: 'You sleep below the waterline, watching rays glide past. You tell no one back home. They would not believe it.' },
      { id: 'ow_reefdeck',      name: 'Private Reef Deck',    parent: 'ow_infinitypool', costBase: B * 74.0, costGrowth: C.PROPERTY.growth, comfort: 8.8e8, xMult: 0.055, tag: 'property', flavor: 'A stretch of reef, roped and lit, effectively yours. No marine biologist will ever get a permit here.' },
      { id: 'ow_skybridge',     name: 'Villa Sky-Bridge',     parent: 'ow_underwater', costBase: B * 95.0, costGrowth: C.PROPERTY.growth, comfort: 1.1e9, xMult: 0.06, tag: 'property', flavor: 'A bridge between wings, over open water. You cross it for no reason, often, just because you can.' },
    ],
  },
  // E23 "Villa Vita" — the grounds era. The villa (18) and estate (19) extend the E22 owned-property
  // model; their grounds (garden/pool/court mega-clusters, see GROUNDS + amenities.js tag:'grounds')
  // are maintained by estate staff, and staffing them lights the property×staff synergy (L_estate).
  {
    id: 'villa', tier: 18, name: 'Private Villa & Grounds',
    ownCost: C.PROPERTY.ownCost[2] ?? 7e11, baseComfort: C.PROPERTY.baseComfort[2] ?? 1.4e9, amenitySlots: 12,
    requiresOwn: 'overwater_villa',
    flavor: 'A gate. Your gate. With your name. And grounds you get lost in on the way to the kitchen.',
    upgrades: [
      { id: 'villa_gatehouse',  name: 'Gatehouse & Drive',    parent: null,             costBase: B * 120.0, costGrowth: C.PROPERTY.growth, comfort: 1.4e9, tag: 'property', flavor: 'A gate with your name on it. You slow down each time you pass it, on purpose.' },
      { id: 'villa_orangery',   name: 'The Orangery',         parent: 'villa_gatehouse', costBase: B * 150.0, costGrowth: C.PROPERTY.growth, comfort: 1.7e9, tag: 'property', flavor: 'A glass house for growing oranges in a climate that already grows oranges. This is the point.' },
      { id: 'villa_wine_cave',  name: 'Wine Cave',            parent: 'villa_gatehouse', costBase: B * 190.0, costGrowth: C.PROPERTY.growth, comfort: 2.1e9, tag: 'property', flavor: 'A cave, cut into your own hill, full of wine you will outlive. Someone else will enjoy it. You are fine with this.' },
      { id: 'villa_ballroom',   name: 'Ballroom',             parent: 'villa_orangery',  costBase: B * 240.0, costGrowth: C.PROPERTY.growth, comfort: 2.6e9, xMult: 0.05, tag: 'property', flavor: 'A room for balls. You have held none. It waits, parquet gleaming, for a party you keep meaning to throw.' },
      { id: 'villa_library',    name: 'Two-Storey Library',   parent: 'villa_wine_cave', costBase: B * 300.0, costGrowth: C.PROPERTY.growth, comfort: 3.2e9, xMult: 0.05, tag: 'property', flavor: 'Books to the ceiling, a ladder on rails. You have read four of them. You own all of them.' },
      { id: 'villa_east_wing',  name: 'The East Wing',        parent: 'villa_ballroom',  costBase: B * 380.0, costGrowth: C.PROPERTY.growth, comfort: 4.0e9, xMult: 0.055, tag: 'property', flavor: 'An entire wing you visit rarely. The staff keep it perfect regardless. It smells faintly of a life you almost lead.' },
    ],
  },
  {
    id: 'estate', tier: 19, name: 'Private Estate',
    ownCost: C.PROPERTY.ownCost[3] ?? 8e12, baseComfort: C.PROPERTY.baseComfort[3] ?? 4e9, amenitySlots: 16,
    requiresOwn: 'villa',
    flavor: 'You get lost in your own hallways. There is a map. Staff drew it. For you.',
    upgrades: [
      { id: 'est_parkland',     name: 'Private Parkland',     parent: null,             costBase: B * 480.0, costGrowth: C.PROPERTY.growth, comfort: 4.6e9, tag: 'property', flavor: 'Acres of your own park. Deer wander it. You did not buy the deer. The deer came with the acres.' },
      { id: 'est_lake',         name: 'Ornamental Lake',      parent: 'est_parkland',   costBase: B * 600.0, costGrowth: C.PROPERTY.growth, comfort: 5.4e9, tag: 'property', flavor: 'A lake, dug to look accidental. It fooled a swan, which moved in. The swan is now, technically, yours.' },
      { id: 'est_stables',      name: 'The Stables',          parent: 'est_parkland',   costBase: B * 760.0, costGrowth: C.PROPERTY.growth, comfort: 6.4e9, tag: 'property', flavor: 'Horses. You do not ride. They are magnificent and they cost a fortune and you keep them anyway.' },
      { id: 'est_chapel',       name: 'Estate Chapel',        parent: 'est_lake',       costBase: B * 960.0, costGrowth: C.PROPERTY.growth, comfort: 7.6e9, xMult: 0.06, tag: 'property', flavor: 'A tiny chapel on the grounds. You are not religious. It is very beautiful. Both things are true.' },
      { id: 'est_observatory',  name: 'Observatory Dome',     parent: 'est_stables',    costBase: B * 1200.0, costGrowth: C.PROPERTY.growth, comfort: 9.0e9, xMult: 0.06, tag: 'property', flavor: 'A dome with a real telescope. You look at the moon once, are moved, and never come back. It waits, patiently, aimed at everything.' },
      { id: 'est_grand_hall',   name: 'The Grand Hall',       parent: 'est_chapel',     costBase: B * 1500.0, costGrowth: C.PROPERTY.growth, comfort: 1.1e10, xMult: 0.07, tag: 'property', flavor: 'A hall for standing in, dwarfed, remembering a damp car park in Utrecht. You stand in it often.' },
    ],
  },
];

// GROUNDS mega-clusters (E23-S1): garden / pool complex / sport court. Each is a batch of ordinary
// tag:'grounds' amenities (defined in data/amenities.js, gated on owning the villa/estate via
// unlockProperty), grouped here so the UI can render them as clusters and estate staff can be
// assigned to a cluster `kind`. They feed Comfort through the generic amenityScoreTotal (w_amen),
// NOT a new ComfortRaw term (so no double-count). `automates` is the staff-role↔cluster key.
export const GROUNDS = [
  { id: 'garden', name: 'The Gardens',       kind: 'garden', unlockProperty: 'villa',  flavor: 'Topiary, roses, a koi pond that judges you.' },
  { id: 'pool',   name: 'The Pool Complex',  kind: 'pool',   unlockProperty: 'villa',  flavor: 'Not a pool. A complex. There is a difference and it is roughly a decade of your old salary.' },
  { id: 'court',  name: 'The Sport Courts',  kind: 'court',  unlockProperty: 'estate', flavor: 'Tennis, padel, and, for the soul, a boules pit.' },
];

// Flatten every upgrade with its property id, for generic engine/UI iteration.
export const PROPERTY_UPGRADES = PROPERTIES.flatMap(p => p.upgrades.map(u => ({ ...u, property: p.id })));

// Validation (S1-T10): unique ids, valid parent refs (within the same property), monotone
// baseComfort across properties, and every upgrade's costGrowth === PROPERTY.growth.
export function validateProperty() {
  const errors = [];
  const seenP = new Set();
  let prevBase = 0;
  const allUpgradeIds = new Set();
  for (const p of PROPERTIES) {
    if (seenP.has(p.id)) errors.push(`duplicate property id: ${p.id}`);
    seenP.add(p.id);
    for (const k of ['id', 'name', 'flavor']) if (typeof p[k] !== 'string' || !p[k]) errors.push(`${p.id}: "${k}" must be a non-empty string`);
    for (const k of ['ownCost', 'baseComfort', 'tier', 'amenitySlots']) if (typeof p[k] !== 'number' || !Number.isFinite(p[k])) errors.push(`${p.id}: "${k}" must be a finite number`);
    if (!Number.isInteger(p.tier) || p.tier <= 0) errors.push(`${p.id}: tier must be a positive integer`);
    if (!Number.isInteger(p.amenitySlots) || p.amenitySlots <= 0) errors.push(`${p.id}: amenitySlots must be a positive integer`);
    if (!(p.ownCost > 0)) errors.push(`${p.id}: ownCost must be > 0`);
    if (!(p.baseComfort > prevBase)) errors.push(`${p.id}: baseComfort (${p.baseComfort}) not strictly increasing (prev ${prevBase})`);
    prevBase = p.baseComfort;
    if (p.requiresOwn !== undefined && !seenP.has(p.requiresOwn)) errors.push(`${p.id}: requiresOwn '${p.requiresOwn}' must reference an EARLIER property`);
    // upgrade tree
    const seenU = new Set();
    for (const u of p.upgrades) {
      if (seenU.has(u.id) || allUpgradeIds.has(u.id)) errors.push(`duplicate upgrade id: ${u.id}`);
      seenU.add(u.id); allUpgradeIds.add(u.id);
      for (const k of ['id', 'name', 'flavor', 'tag']) if (typeof u[k] !== 'string' || !u[k]) errors.push(`${u.id}: "${k}" must be a non-empty string`);
      for (const k of ['costBase', 'costGrowth', 'comfort']) if (typeof u[k] !== 'number' || !Number.isFinite(u[k])) errors.push(`${u.id}: "${k}" must be a finite number`);
      if (!(u.costBase > 0)) errors.push(`${u.id}: costBase must be > 0`);
      if (u.costGrowth !== C.PROPERTY.growth) errors.push(`${u.id}: costGrowth (${u.costGrowth}) must equal PROPERTY.growth (${C.PROPERTY.growth})`);
      if (!(u.comfort > 0)) errors.push(`${u.id}: comfort must be > 0`);
      if (u.xMult !== undefined && !(u.xMult > 0)) errors.push(`${u.id}: xMult, if present, must be > 0`);
      if (u.parent !== null && !seenU.has(u.parent)) errors.push(`${u.id}: parent '${u.parent}' must reference an EARLIER node in the same property`);
    }
  }
  // E23 grounds clusters: unique ids, a valid `kind`, and an `unlockProperty` that names a real property.
  const seenG = new Set();
  for (const g of GROUNDS) {
    if (seenG.has(g.id)) errors.push(`duplicate grounds cluster id: ${g.id}`);
    seenG.add(g.id);
    for (const k of ['id', 'name', 'kind', 'unlockProperty', 'flavor']) if (typeof g[k] !== 'string' || !g[k]) errors.push(`grounds ${g.id}: "${k}" must be a non-empty string`);
    if (!seenP.has(g.unlockProperty)) errors.push(`grounds ${g.id}: unlockProperty '${g.unlockProperty}' must reference a property`);
  }
  if (errors.length) throw new Error('validateProperty() failed:\n' + errors.join('\n'));
  return true;
}
