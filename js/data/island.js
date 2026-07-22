// data/island.js — island buildings (E28 "Building Paradise"). Generator+amenity hybrids: you now
// PRODUCE luxury instead of buying it. Each building is placed like a generator (geometric cost,
// milestone doublings) but ALSO raises Comfort like an amenity, hosts paying guests (a new guest-
// income revenue tier), and costs upkeep at scale.
//
// BUILDING shape: { id, name, costBase, costGrowth, comfort, guestBase, upkeepBase, upkeepGrowth, flavor }
//   · comfort    — flat Comfort per building (feeds ComfortRaw's island term, like an amenity).
//   · guestBase  — base guest income per building (scaled by guestDemand + the M_k stack in math.js).
//   · upkeepBase/upkeepGrowth — the per-building cash sink (Σ count·upkeepBase·upkeepGrowth^index).
//
// EVERYTHING here is gated behind OWNING the island (E27): the engine only runs island production
// and only lets you build once state.island.owned is true. The greedy harness never buys the island
// (0 Legacy), so it never builds, guest income is 0, and the fitted 29705s island time is unmoved.

export const BUILDINGS = [
  { id: 'guest_villa', name: 'Guest Villa',      costBase: 5e12,  costGrowth: 1.18, comfort: 4.0e8, guestBase: 2e10, upkeepBase: 1e9,  upkeepGrowth: 1.12,
    flavor: 'A villa for guests who pay to sleep where you live. The former shed-dweller is now, improbably, a landlord.' },
  { id: 'beach_cabanas', name: 'Beach Cabanas',  costBase: 1.2e13, costGrowth: 1.18, comfort: 5.2e8, guestBase: 3.4e10, upkeepBase: 1.6e9, upkeepGrowth: 1.12,
    flavor: 'A row of cabanas on your own sand. Guests tip the staff you pay. The economics are yours to enjoy and not examine.' },
  { id: 'island_marina', name: 'Island Marina',  costBase: 3e13,  costGrowth: 1.18, comfort: 6.8e8, guestBase: 5.6e10, upkeepBase: 2.6e9, upkeepGrowth: 1.13,
    flavor: 'Berths for boats that cost more than towns. Their owners pay you for the privilege of mooring near you.' },
  { id: 'heliport', name: 'Heliport',            costBase: 7.5e13, costGrowth: 1.18, comfort: 8.4e8, guestBase: 9e10,   upkeepBase: 4.2e9, upkeepGrowth: 1.13,
    flavor: 'Guests arrive by air now. You watch the rotor wash flatten the grass and remember a rainy bus stop, once.' },
  { id: 'island_spa', name: 'Cliffside Spa',     costBase: 1.8e14, costGrowth: 1.18, comfort: 1.05e9, guestBase: 1.5e11, upkeepBase: 6.8e9, upkeepGrowth: 1.14,
    flavor: 'A spa cut into the cliff, booked months out. People fly across the planet for the calm you live inside daily.' },
  { id: 'grand_resort', name: 'Grand Resort Wing', costBase: 4.5e14, costGrowth: 1.18, comfort: 1.35e9, guestBase: 2.6e11, upkeepBase: 1.1e10, upkeepGrowth: 1.14,
    flavor: 'The wing that turns an island into an empire. A hundred rooms, all yours, all full, all paying. You host now.' },
];

export function buildingDef(id) { return BUILDINGS.find(b => b.id === id); }

// dev schema guard (mirrors validateLogistics/validateStaff/validateProperty).
export function validateIsland() {
  const errors = [];
  const seen = new Set();
  let prevCost = 0;
  for (const b of BUILDINGS) {
    if (seen.has(b.id)) errors.push(`duplicate building id: ${b.id}`);
    seen.add(b.id);
    for (const k of ['id', 'name', 'flavor']) if (typeof b[k] !== 'string' || !b[k]) errors.push(`${b.id}: "${k}" must be a non-empty string`);
    for (const k of ['costBase', 'costGrowth', 'comfort', 'guestBase', 'upkeepBase', 'upkeepGrowth']) if (typeof b[k] !== 'number' || !Number.isFinite(b[k])) errors.push(`${b.id}: "${k}" must be a finite number`);
    if (!(b.costBase > prevCost)) errors.push(`${b.id}: costBase (${b.costBase}) not strictly increasing (prev ${prevCost})`);
    prevCost = b.costBase;
    if (!(b.costGrowth > 1)) errors.push(`${b.id}: costGrowth must be > 1`);
    if (!(b.comfort > 0)) errors.push(`${b.id}: comfort must be > 0`);
    if (!(b.guestBase > 0)) errors.push(`${b.id}: guestBase must be > 0`);
    if (!(b.upkeepBase >= 0)) errors.push(`${b.id}: upkeepBase must be >= 0`);
    if (!(b.upkeepGrowth >= 1)) errors.push(`${b.id}: upkeepGrowth must be >= 1`);
  }
  if (errors.length) throw new Error('validateIsland() failed:\n' + errors.join('\n'));
  return true;
}
