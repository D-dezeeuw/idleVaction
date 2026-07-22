// data/staff.js — the Staff Ledger (E19 "At Your Service", the staff/automation era). A
// declarative roster so hiring, wages, and automation policies are pure data; the engine stays
// generic and every future role (E20 household, E23 estate staff, E28 island crew) reuses this
// shape. The butler's auto-buy deliberately REUSES the E11 concierge's proven bounded-policy
// machinery (engine.conciergeCandidates — ROI-ranked, budget-capped, offline via tick-replay);
// E19's genuinely new mechanic is the PAYROLL WAGE (a continuous cash sink while hired).
//
//   STAFF_DATA: { id, name, role, subsystem, wageBase, wageGrowth, hireCost, levelCostBase,
//     levelCostGrowth, categories, desc }
//     — wage while hired = wageBase·wageGrowth^level (math.staffWage), drained per tick
//       (engine, clamped ≥0). categories = default auto-buy whitelist passed to
//       conciergeCandidates. The whole system is OFF until hired, so a fresh newGame() and the
//       greedy harness (which never hires) pay no wage and automate nothing — the fitted island
//       time cannot move (mirrors the E11 concierge's off-by-default invariance).
import { GROUNDS } from './property.js';

export const STAFF_DATA = [
  { id: 'butler', name: 'The Butler', role: 'butler', subsystem: 'automation',
    wageBase: 5e4, wageGrowth: 1.18, hireCost: 2.5e5, xMultBase: 0,
    levelCostBase: 5e5, levelCostGrowth: 2.0,
    categories: ['amenity'],   // default: amenities only — a gentle early butler
    desc: 'A stiff, unnervingly competent butler. He does not comment on the poncho still drying on the radiator. He simply, quietly, makes everything work.' },

  // E20 "The Whole Household": five roles, each mapped to a subsystem. The income-× roles
  // (chef/trainer/driver/manager) contribute a small, MORALE-scaled global × (xMultBase·level·
  // moraleMult) folded into one bounded L_staff layer (math.staffMult); the housekeeper is the
  // glue role (xMultBase 0 — it lifts household morale instead). All OFF until hired, so the
  // harness (never hires) sees L_staff 1, payroll 0 — the island cannot move.
  { id: 'chef', name: 'The Chef', role: 'chef', subsystem: 'comfort',
    wageBase: 8e4, wageGrowth: 1.18, hireCost: 4e5, xMultBase: 0.05,
    levelCostBase: 8e5, levelCostGrowth: 2.0, categories: ['amenity'],
    desc: 'A chef who makes stroopwafels that could end wars, and a consommé that could start them.' },
  { id: 'trainer', name: 'The Trainer', role: 'trainer', subsystem: 'body',
    wageBase: 7e4, wageGrowth: 1.18, hireCost: 4e5, xMultBase: 0.05,
    levelCostBase: 8e5, levelCostGrowth: 2.0, categories: ['upgrade'],
    desc: 'A trainer who counts your reps and, gently, your excuses. There are fewer excuses now.' },
  { id: 'driver', name: 'The Driver', role: 'driver', subsystem: 'logistics',
    wageBase: 9e4, wageGrowth: 1.18, hireCost: 5e5, xMultBase: 0.05,
    levelCostBase: 9e5, levelCostGrowth: 2.0, categories: ['generator'],
    desc: 'A driver with strong, unsolicited opinions about roundabouts. He is, infuriatingly, always right.' },
  { id: 'manager', name: 'The Social Manager', role: 'manager', subsystem: 'clout',
    wageBase: 1.1e5, wageGrowth: 1.18, hireCost: 6e5, xMultBase: 0.05,
    levelCostBase: 1e6, levelCostGrowth: 2.0, categories: ['amenity'],
    desc: 'A social manager who has learned to hold the ring light. She is not paid enough for the ring light. (She is paid quite a lot.)' },
  { id: 'housekeeper', name: 'The Housekeeper', role: 'housekeeper', subsystem: 'morale',
    wageBase: 6e4, wageGrowth: 1.18, hireCost: 3.5e5, xMultBase: 0,
    levelCostBase: 7e5, levelCostGrowth: 2.0, categories: [],
    desc: 'The housekeeper. Nothing is ever out of place; nobody has ever seen her hurry. Morale, mysteriously, is always up.' },

  // E23 "Villa Vita": the ESTATE WING. Four roles that maintain the grounds (garden/pool/court) and
  // light the property×staff synergy (L_estate). They are `estate:true` with xMultBase 0 — so they
  // stay OUT of L_staff (the synergy is their income effect, not a per-role ×) — and each `automates`
  // a grounds cluster kind (the estate manager takes the 'synergy' slot, amplifying synergyRate).
  // They sit in a SEPARATE wing: the cap only grows once a villa/estate deed is owned (engine
  // staffCap + estateStaffSlots), so the harness — no property, no hires — never engages them.
  { id: 'gardener', name: 'The Head Gardener', role: 'gardener', subsystem: 'grounds', estate: true, automates: 'garden',
    wageBase: 3e5, wageGrowth: 1.18, hireCost: 2e6, xMultBase: 0,
    levelCostBase: 4e6, levelCostGrowth: 2.0, categories: ['grounds'],
    desc: 'A head gardener who speaks to the topiary and, worryingly, gets answers. The maze has never looked better.' },
  { id: 'pool_tech', name: 'The Pool Technician', role: 'pool_tech', subsystem: 'grounds', estate: true, automates: 'pool',
    wageBase: 3.2e5, wageGrowth: 1.18, hireCost: 2.2e6, xMultBase: 0,
    levelCostBase: 4.2e6, levelCostGrowth: 2.0, categories: ['grounds'],
    desc: 'A pool technician who keeps the complex at a chemistry you could drink. Please do not drink it. He asks, every week, that you not drink it.' },
  { id: 'groundskeeper', name: 'The Groundskeeper', role: 'groundskeeper', subsystem: 'grounds', estate: true, automates: 'court',
    wageBase: 3.4e5, wageGrowth: 1.18, hireCost: 2.4e6, xMultBase: 0,
    levelCostBase: 4.4e6, levelCostGrowth: 2.0, categories: ['grounds'],
    desc: 'A groundskeeper who lines the courts to the millimetre and rakes the boules pit like it is sacred. To him, it is.' },
  { id: 'estate_manager', name: 'The Estate Manager', role: 'estate_manager', subsystem: 'grounds', estate: true, automates: 'synergy',
    wageBase: 5e5, wageGrowth: 1.18, hireCost: 4e6, xMultBase: 0,
    levelCostBase: 7e6, levelCostGrowth: 2.0, categories: [],
    desc: 'An estate manager who manages the managers. You have not made a decision about the grounds in months. This is, apparently, the point of her.' },
];

export function getStaffDef(id) { return STAFF_DATA.find(s => s.id === id); }

// dev schema guard (mirrors validateVehicles/validateLogistics): ids unique, fields present + of
// the right type/sign. Throws on failure — called from the harness/selftest.
export function validateStaff() {
  const errors = [];
  const seen = new Set();
  for (const s of STAFF_DATA) {
    if (seen.has(s.id)) errors.push(`duplicate staff id: ${s.id}`);
    seen.add(s.id);
    for (const k of ['id', 'name', 'role', 'subsystem', 'desc']) if (typeof s[k] !== 'string' || !s[k]) errors.push(`${s.id}: "${k}" must be a non-empty string`);
    for (const k of ['wageBase', 'wageGrowth', 'hireCost', 'levelCostBase', 'levelCostGrowth', 'xMultBase']) if (typeof s[k] !== 'number' || !Number.isFinite(s[k])) errors.push(`${s.id}: "${k}" must be a finite number`);
    if (!Array.isArray(s.categories)) errors.push(`${s.id}: categories must be an array`);   // E20: housekeeper has [] (glue role)
    if (!(s.xMultBase >= 0)) errors.push(`${s.id}: xMultBase must be >= 0`);
    // E23 estate roles: estate:true ⇒ must carry an `automates` key naming a grounds cluster kind or 'synergy'.
    if (s.estate) {
      if (typeof s.automates !== 'string' || !s.automates) errors.push(`${s.id}: estate role must have a non-empty "automates"`);
      else if (s.automates !== 'synergy' && !GROUNDS.some(g => g.kind === s.automates)) errors.push(`${s.id}: automates '${s.automates}' must be a GROUNDS kind or 'synergy'`);
      if (s.xMultBase !== 0) errors.push(`${s.id}: estate role xMultBase must be 0 (synergy is via L_estate, not L_staff)`);
    }
    if (!(s.wageBase > 0)) errors.push(`${s.id}: wageBase must be > 0`);
    if (!(s.wageGrowth > 1)) errors.push(`${s.id}: wageGrowth must be > 1`);
    if (!(s.hireCost > 0)) errors.push(`${s.id}: hireCost must be > 0`);
    if (!(s.levelCostGrowth > 1)) errors.push(`${s.id}: levelCostGrowth must be > 1`);
  }
  if (errors.length) throw new Error('validateStaff() failed:\n' + errors.join('\n'));
  return true;
}
