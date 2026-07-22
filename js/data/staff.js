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
    if (!(s.wageBase > 0)) errors.push(`${s.id}: wageBase must be > 0`);
    if (!(s.wageGrowth > 1)) errors.push(`${s.id}: wageGrowth must be > 1`);
    if (!(s.hireCost > 0)) errors.push(`${s.id}: hireCost must be > 0`);
    if (!(s.levelCostGrowth > 1)) errors.push(`${s.id}: levelCostGrowth must be > 1`);
  }
  if (errors.length) throw new Error('validateStaff() failed:\n' + errors.join('\n'));
  return true;
}
