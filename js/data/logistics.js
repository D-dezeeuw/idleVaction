// data/logistics.js — the Marina: boats + a pre-staff crew (E16 "Sea Legs", Private
// Logistics II). Extends the E15 garage (data/vehicles.js) from land to water; engine.js/
// math.js stay generic, folding these into the SAME L_logistics multiplier / fleet-upkeep
// drain the cars already use. Schema:
//
//   BOATS: { id, name, class:'boat', tier, costBase, costGrowth, upkeep, mult, slotBonus,
//     crewCap, flavor }
//     — tier: 1..5 (dinghy → superyacht); the highest owned tier is state.vehicles' boatTier,
//       which gates sea:true destinations (engine.boatTier / destUnlocked).
//     — costBase/costGrowth: geometric buy cost (costBase·costGrowth^owned), costGrowth 1.9 —
//       steeper than cars (1.5) so each rung is a deliberate decision, not an impulse (S1-T2).
//       costBase starts ~10× the top car (vehicles.js hand_built_grand_tourer 5e8 → dinghy 5e9).
//     — upkeep: cash/s while OWNED, folded into math.fleetUpkeep alongside car/crew upkeep and
//       drained (clamped ≥0) by engine.applyFleetUpkeep — a yacht is a money pit (S8-T5).
//     — mult: the boat's contribution to L_logistics via config.LOGISTICS.boatRate (owned
//       boats add their mult; the fold is math.logisticsMult). First-pass; tune boatRate.
//     — slotBonus: transport slots the boat GRANTS (a boat is a bigger platform, S2-T2) —
//       added to math.availableSlots via state.vehicles.boatSlots (engine.buyBoat maintains it).
//     — crewCap: max crew this boat supports; total cap = Σ owned boats' crewCap (engine.crewCap).
//     — flavor: one wry Dutch-tourist line. The `yacht` rung is the showpiece (S4-T1) — a big
//       mult/costBase/crewCap jump so it feels like arriving.
//
//   CREW: { id, name, costBase, costGrowth, mult, upkeep, role, preStaff:true, flavor }
//     — a PRE-STAFF placeholder (S1-T5): a tiny L_logistics × (config.LOGISTICS.crewRate) plus
//       upkeep, capped by crewCap. preStaff:true flags it for E19 (the butler/household) to
//       absorb. Owned crew count lives in state.vehicles.crew[id].count.
//
// The engine reads these via DATA.boats / DATA.crew (see data/index.js); this file never
// imports config/engine — data stays leaf-level (same convention as vehicles.js/collections.js).
export const BOATS = [
  { id: 'dinghy',        name: 'Rubber Dinghy',       class: 'boat', tier: 1,
    costBase: 5e9,  costGrowth: 1.9, upkeep: 400,    mult: 0.30, slotBonus: 1, crewCap: 1,
    flavor: 'It leaks, but it is *your* leak now.' },
  { id: 'speedboat',     name: 'Secondhand Speedboat', class: 'boat', tier: 2,
    costBase: 2.5e10, costGrowth: 1.9, upkeep: 1500,  mult: 0.60, slotBonus: 1, crewCap: 2,
    flavor: 'Fast enough to outrun the harbourmaster’s paperwork.' },
  { id: 'cabin_cruiser', name: 'Cabin Cruiser',        class: 'boat', tier: 3,
    costBase: 1.2e11, costGrowth: 1.9, upkeep: 6000,  mult: 1.10, slotBonus: 1, crewCap: 3,
    flavor: 'A bed, a fridge, and a horizon. You stop checking your email. Mostly.' },
  { id: 'yacht',         name: 'The Yacht',            class: 'boat', tier: 4,
    costBase: 6e11,  costGrowth: 1.9, upkeep: 30000,  mult: 2.50, slotBonus: 2, crewCap: 6,
    flavor: 'A pool, on a boat, on the sea. The hostel receptionist would not believe this.' },
  { id: 'superyacht',    name: 'Superyacht',           class: 'boat', tier: 5,
    costBase: 3e12,  costGrowth: 1.9, upkeep: 150000, mult: 4.50, slotBonus: 2, crewCap: 10,
    flavor: 'It has a smaller boat inside it, for reaching the shore you will never visit.' },
];

export const CREW = [
  { id: 'deckhand',   name: 'Deckhand',   costBase: 1e9,  costGrowth: 1.6, mult: 0.05, upkeep: 200,  role: 'deckhand', preStaff: true,
    flavor: 'Coils rope, avoids eye contact, knows where everything is.' },
  { id: 'first_mate', name: 'First Mate', costBase: 5e9,  costGrowth: 1.6, mult: 0.10, upkeep: 600,  role: 'mate',     preStaff: true,
    flavor: 'Second-in-command of a boat you barely command yourself.' },
  { id: 'captain',    name: 'Captain',    costBase: 2e10, costGrowth: 1.6, mult: 0.20, upkeep: 2000, role: 'captain',  preStaff: true,
    flavor: 'Wears the hat unironically. Has earned the hat.' },
];

// JETS (E17 "Wheels Up", Private Logistics III — the capstone): the same OWNED-vehicle contract
// as boats (owning grants mult + slotBonus + upkeep, folded into L_logistics via
// config.LOGISTICS.jetRate; jetSlots tracked in state.vehicles.jetSlots). Extra fields:
//   — range: how far the jet reaches; the highest owned jet's tier gates air:true destinations
//     (engine.jetTier / destUnlocked), and owning ANY jet applies config.LOGISTICS.jetDiscount
//     to destination cost (destDiscountMult, clamped above zero — never free).
//   — the flagship (airliner) is the arc's showpiece (S4): huge mult, top upkeep, range 5.
// Owning a car AND a boat AND a jet lights the LOGISTICS.capstone × (math.capstoneActive) — the
// payoff for the whole logistics arc. costBase ~10× the Yacht (6e11 → turboprop 6e12),
// costGrowth 2.0 (the most expensive rung). First-pass; tune jetRate/capstone/jetDiscount.
export const JETS = [
  { id: 'turboprop',  name: 'Turboprop',   class: 'jet', tier: 1, costBase: 6e12, costGrowth: 2.0, upkeep: 5e5,   mult: 0.80, slotBonus: 1, range: 1,
    flavor: 'It is technically flying. Your ears file a formal dissent.' },
  { id: 'light_jet',  name: 'Light Jet',   class: 'jet', tier: 2, costBase: 3e13, costGrowth: 2.0, upkeep: 2e6,   mult: 1.50, slotBonus: 1, range: 2,
    flavor: 'Four seats, one of which is for the ice bucket. Priorities.' },
  { id: 'midsize_jet',name: 'Midsize Jet', class: 'jet', tier: 3, costBase: 1.5e14, costGrowth: 2.0, upkeep: 8e6, mult: 2.80, slotBonus: 2, range: 3,
    flavor: 'You can stand up in it. You do, constantly, just because you can.' },
  { id: 'heavy_jet',  name: 'Heavy Jet',   class: 'jet', tier: 4, costBase: 8e14, costGrowth: 2.0, upkeep: 3e7,   mult: 5.00, slotBonus: 2, range: 4,
    flavor: 'Intercontinental, and there is a bed. A real one. In the sky.' },
  { id: 'airliner',   name: 'Private Airliner', class: 'jet', tier: 5, costBase: 4e15, costGrowth: 2.0, upkeep: 1.2e8, mult: 9.00, slotBonus: 3, range: 5,
    flavor: 'A commercial airliner, for one passenger. From a bus stop in the drizzle to this. The stroopwafel made it too.' },
];

// Dev schema guard (mirrors validateVehicles): boat ids unique + strictly-increasing costBase,
// crew ids unique, every field present + right type/sign, tier/slotBonus/crewCap non-negative
// integers, costGrowth>1, mult>0, upkeep≥0. Throws on failure. No CONFIG param (this file never
// imports config) — called from the harness/selftest, same convention as validateVehicles.
export function validateLogistics() {
  const errors = [];
  const seenB = new Set();
  let prevCost = 0;
  for (const b of BOATS) {
    if (seenB.has(b.id)) errors.push(`duplicate boat id: ${b.id}`);
    seenB.add(b.id);
    for (const k of ['id', 'name', 'flavor']) if (typeof b[k] !== 'string' || !b[k]) errors.push(`${b.id}: "${k}" must be a non-empty string`);
    for (const k of ['costBase', 'costGrowth', 'upkeep', 'mult', 'tier', 'slotBonus', 'crewCap']) if (typeof b[k] !== 'number' || !Number.isFinite(b[k])) errors.push(`${b.id}: "${k}" must be a finite number`);
    if (b.class !== 'boat') errors.push(`${b.id}: class must be 'boat'`);
    if (!Number.isInteger(b.tier) || b.tier <= 0) errors.push(`${b.id}: tier must be a positive integer`);
    if (!Number.isInteger(b.slotBonus) || b.slotBonus < 0) errors.push(`${b.id}: slotBonus must be a non-negative integer`);
    if (!Number.isInteger(b.crewCap) || b.crewCap < 0) errors.push(`${b.id}: crewCap must be a non-negative integer`);
    if (!(b.costBase > prevCost)) errors.push(`${b.id}: costBase (${b.costBase}) not strictly increasing (prev ${prevCost})`);
    prevCost = b.costBase;
    if (!(b.costGrowth > 1)) errors.push(`${b.id}: costGrowth must be > 1`);
    if (!(b.mult > 0)) errors.push(`${b.id}: mult must be > 0`);
    if (!(b.upkeep >= 0)) errors.push(`${b.id}: upkeep must be >= 0`);
  }
  const seenC = new Set();
  for (const c of CREW) {
    if (seenC.has(c.id)) errors.push(`duplicate crew id: ${c.id}`);
    seenC.add(c.id);
    for (const k of ['id', 'name', 'role', 'flavor']) if (typeof c[k] !== 'string' || !c[k]) errors.push(`${c.id}: "${k}" must be a non-empty string`);
    for (const k of ['costBase', 'costGrowth', 'mult', 'upkeep']) if (typeof c[k] !== 'number' || !Number.isFinite(c[k])) errors.push(`${c.id}: "${k}" must be a finite number`);
    if (!(c.costBase > 0)) errors.push(`${c.id}: costBase must be > 0`);
    if (!(c.costGrowth > 1)) errors.push(`${c.id}: costGrowth must be > 1`);
    if (!(c.mult > 0)) errors.push(`${c.id}: mult must be > 0`);
    if (!(c.upkeep >= 0)) errors.push(`${c.id}: upkeep must be >= 0`);
    if (c.preStaff !== true) errors.push(`${c.id}: preStaff must be true (flags E19 absorption)`);
  }
  const seenJ = new Set();
  let prevJ = 0;
  for (const j of JETS) {
    if (seenJ.has(j.id)) errors.push(`duplicate jet id: ${j.id}`);
    seenJ.add(j.id);
    for (const k of ['id', 'name', 'flavor']) if (typeof j[k] !== 'string' || !j[k]) errors.push(`${j.id}: "${k}" must be a non-empty string`);
    for (const k of ['costBase', 'costGrowth', 'upkeep', 'mult', 'tier', 'slotBonus', 'range']) if (typeof j[k] !== 'number' || !Number.isFinite(j[k])) errors.push(`${j.id}: "${k}" must be a finite number`);
    if (j.class !== 'jet') errors.push(`${j.id}: class must be 'jet'`);
    if (!Number.isInteger(j.tier) || j.tier <= 0) errors.push(`${j.id}: tier must be a positive integer`);
    if (!Number.isInteger(j.slotBonus) || j.slotBonus < 0) errors.push(`${j.id}: slotBonus must be a non-negative integer`);
    if (!Number.isInteger(j.range) || j.range <= 0) errors.push(`${j.id}: range must be a positive integer`);
    if (!(j.costBase > prevJ)) errors.push(`${j.id}: costBase (${j.costBase}) not strictly increasing (prev ${prevJ})`);
    prevJ = j.costBase;
    if (!(j.costGrowth > 1)) errors.push(`${j.id}: costGrowth must be > 1`);
    if (!(j.mult > 0)) errors.push(`${j.id}: mult must be > 0`);
    if (!(j.upkeep >= 0)) errors.push(`${j.id}: upkeep must be >= 0`);
  }
  if (errors.length) throw new Error('validateLogistics() failed:\n' + errors.join('\n'));
  return true;
}
