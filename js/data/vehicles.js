// data/vehicles.js — the Showroom Brochure (E15 "Keys to the Coupe", Private Logistics I).
// All vehicle content is data; engine.js/math.js stay generic (same leaf-data contract as
// data/crypto.js and data/collections.js) — a future epic (E16 boats, E17 jets) can extend
// the SAME shape without touching this file's callers. Schema:
//
//   CARS: { id, name, tier, costBase, costGrowth, slotCost, logisticsMult, upkeep, speed,
//     comfort, flavor }
//     — id: unique string, indexed flat (state.vehicles.owned[id]).
//     — name: display name.
//     — tier: an integer 1..6, the roster's rank order (rusty_hatchback=1 through
//       hand_built_grand_tourer=6). Purely descriptive/UI-sort — not a multiplier input.
//     — costBase/costGrowth: the buy cost of the Nth copy is costBase·costGrowth^owned — the
//       SAME geometric bulkCost shape every other purchase in the game uses (engine.buyCar
//       reuses util.bulkCost, same as engine.buyCoin/buyAsset/buyGenerator).
//     — slotCost: integer transport slots the car occupies once EQUIPPED. Small cars cost 1
//       slot, big ones cost more — the "Kombi versus supercar" tradeoff (E15-S1-T4): more
//       small cars fill more slots for a spread bonus, one big car eats the whole rack for a
//       single large bonus. At least one roster row is slotCost 1.
//     — logisticsMult: the car's contribution to the logistics `×` applied to destination
//       income, via `config.LOGISTICS.rate` — see math.logisticsMult(state) =
//       `1 + LOGISTICS.rate · Σ(equipped car.logisticsMult)`. First-pass values; the
//       balance-tuner retunes these against config.LOGISTICS.rate.
//     — upkeep: cash/s drained while EQUIPPED (`Σ(equipped car.upkeep) · LOGISTICS.upkeepScale`
//       per tick, never below zero cash) — the deliberate drain that keeps the `×` from being
//       a free lunch (E15-S1-T5); scales up with tier so bigger cars are a real cost, not just
//       a bigger number.
//     — speed: fractional cycling-time reduction the car grants on destinations (mirrors
//       transport's own `speed` field in data/destinations.js — e.g. 0.2 shortens a
//       destination's travelTime by ~20%). First-pass; the balance-tuner retunes pacing.
//     — comfort: a modest flat Comfort contribution while owned/equipped, feeding ComfortRaw
//       exactly like an amenity's comfort field.
//     — flavor: one wry one-liner per car.
//
//   SLOT / UPKEEP CONTRACT (for E15-S2's engine logic and for E16/E17 reuse):
//     Σ(equipped car.slotCost) ≤ availableSlots — enforced by the engine, never here (this
//     file never imports config/engine — data stays leaf-level, same convention as every
//     other data file, see data/collections.js's matching comment). Equipping over capacity
//     is rejected with a reason string, not clamped silently. `logisticsMult` feeds the
//     destination `×` through `config.LOGISTICS.rate`; `upkeep` is a live cash/s drain, not a
//     one-time cost. The engine reads this roster via `DATA.vehicles` (see data/index.js).
//     Public transport (`TRANSPORT` — bus/train in data/destinations.js) is NOT superseded or
//     removed by this file: it stays the slotCost:0 fallback for players who never buy a car,
//     so nobody is ever stranded without a way to travel (E15-S1-T9).
export const CARS = [
  { id: 'rusty_hatchback', name: 'Rusty Hatchback', tier: 1,
    costBase: 5e5, costGrowth: 1.5, slotCost: 1, logisticsMult: 0.15, upkeep: 2, speed: 0.10, comfort: 200,
    flavor: 'It starts, usually, if you ask nicely in Dutch.' },
  { id: 'secondhand_estate', name: 'Secondhand Estate Wagon', tier: 2,
    costBase: 2e6, costGrowth: 1.5, slotCost: 1, logisticsMult: 0.28, upkeep: 6, speed: 0.14, comfort: 420,
    flavor: 'Room for the whole family, none of whom came on this trip.' },
  { id: 'german_sedan', name: 'German Sedan (Grey Import)', tier: 3,
    costBase: 8e6, costGrowth: 1.5, slotCost: 1, logisticsMult: 0.45, upkeep: 16, speed: 0.20, comfort: 750,
    flavor: 'No speed limit feels fast enough once you own one of these.' },
  { id: 'convertible_coupe', name: 'Convertible Coupe', tier: 4,
    costBase: 3e7, costGrowth: 1.5, slotCost: 2, logisticsMult: 0.70, upkeep: 42, speed: 0.28, comfort: 1300,
    flavor: 'Impractical, low, and entirely the point.' },
  { id: 'vintage_roadster', name: 'Vintage Roadster', tier: 5,
    costBase: 1.2e8, costGrowth: 1.5, slotCost: 2, logisticsMult: 1.05, upkeep: 110, speed: 0.35, comfort: 2200,
    flavor: 'Breaks down photogenically, in front of a very good backdrop.' },
  { id: 'hand_built_grand_tourer', name: 'Hand-Built Grand Tourer', tier: 6,
    costBase: 5e8, costGrowth: 1.5, slotCost: 2, logisticsMult: 1.60, upkeep: 260, speed: 0.45, comfort: 3600,
    flavor: 'The factory built eleven of these. You now own one and the waiting list for the rest.' },
];

// Dev schema guard (mirrors validateCollections/validateBank): ids unique, every field
// present and of the right type/sign, tier a positive integer, slotCost a positive integer.
// Throws on failure so a malformed row is caught in CI, not in the garage. Takes no CONFIG
// param (this file never imports config, same as every other data file) — called from the
// dev harness/selftest by the balance-tuner, same convention as validateCollections/validateBank.
export function validateVehicles() {
  const errors = [];
  const seen = new Set();
  const strFields = ['id', 'name', 'flavor'];
  const numFields = ['costBase', 'costGrowth', 'slotCost', 'logisticsMult', 'upkeep', 'speed', 'comfort', 'tier'];
  for (const c of CARS) {
    if (seen.has(c.id)) errors.push(`duplicate vehicle id: ${c.id}`);
    seen.add(c.id);
    for (const k of strFields) {
      if (typeof c[k] !== 'string' || c[k].length === 0) errors.push(`${c.id}: "${k}" must be a non-empty string`);
    }
    for (const k of numFields) {
      if (typeof c[k] !== 'number' || !Number.isFinite(c[k])) errors.push(`${c.id}: "${k}" must be a finite number`);
    }
    if (!(c.tier > 0) || !Number.isInteger(c.tier)) errors.push(`${c.id}: tier must be a positive integer`);
    if (!(c.costBase > 0)) errors.push(`${c.id}: costBase must be > 0`);
    if (!(c.costGrowth > 1)) errors.push(`${c.id}: costGrowth must be > 1`);
    if (!(c.slotCost >= 1) || !Number.isInteger(c.slotCost)) errors.push(`${c.id}: slotCost must be a positive integer`);
    if (!(c.logisticsMult > 0)) errors.push(`${c.id}: logisticsMult must be > 0`);
    if (!(c.upkeep >= 0)) errors.push(`${c.id}: upkeep must be >= 0`);
    if (!(c.speed >= 0)) errors.push(`${c.id}: speed must be >= 0`);
    if (!(c.comfort >= 0)) errors.push(`${c.id}: comfort must be >= 0`);
  }
  if (!CARS.some(c => c.slotCost === 1)) errors.push('roster must include at least one slotCost:1 car');
  if (errors.length) throw new Error('validateVehicles() failed:\n' + errors.join('\n'));
  return true;
}
