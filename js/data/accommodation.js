// data/accommodation.js — the shed→island ladder (flavor + tier index).
// A tier unlocks when Comfort ≥ accScore(tier)·config.ACC.unlockFrac (see math.accUnlockComfort).
// Buying a tier costs cash = accScore(tier) * ACC_CASH_MULT (see engine).

export const ACCOMMODATION = [
  { tier: 0,  name: 'The Soggy Shed',            flavor: 'A "motel" the way a puddle is a "lake".' },
  { tier: 1,  name: 'Bug-Infested Motel',        flavor: 'Now with a door that closes. Mostly.' },
  { tier: 2,  name: 'Roadside Hostel Bunk',      flavor: 'Eleven roommates. One outlet.' },
  { tier: 3,  name: 'Budget Guesthouse',         flavor: 'The owner remembers your name. Alarming.' },
  { tier: 4,  name: '1-Star Hotel',              flavor: 'A star! One whole star!' },
  { tier: 5,  name: '2-Star Hotel',              flavor: 'Continental breakfast until 9:00 sharp.' },
  { tier: 6,  name: '3-Star Hotel',              flavor: 'There is a POOL. You have arrived.' },
  { tier: 7,  name: '4-Star Beach Resort',       flavor: 'Sand delivered directly to your feet.' },
  { tier: 8,  name: 'Boutique Retreat',          flavor: 'Small, tasteful, quietly expensive.' },
  { tier: 9,  name: '5-Star Hotel',              flavor: 'The concierge knows things you do not.' },
  { tier: 10, name: '5-Star Signature Suite',    flavor: 'A living room. In a hotel. For you.' },
  { tier: 11, name: 'Grand Luxury Wing',         flavor: 'They close the wing when you arrive.' },
  // tiers 12/13 (E18 "The Sail-Shaped Hotel"): the velvet-rope tiers — a real Taste level is
  // required to check in (tasteGate, enforced in engine.accUnlocked), on top of the Comfort gate.
  // exclRec is the RECOMMENDED exclusivity (a soft, display-only velvet-rope in the UI — NOT a
  // hard block, since a non-connoisseur has exclusivity 0 and every build must be able to enter;
  // the connoisseur clears it naturally). All builds accumulate passive Taste, so the gate is an
  // emphasis, not a wall (the greedy harness has taste 44 at tier 12 — island stays 29705s).
  { tier: 12, name: '6-Star Sail-Shaped Hotel',  flavor: 'It is shaped like a sail. Naturally.', tasteGate: 30, exclRec: 40 },
  { tier: 13, name: 'Ultra Penthouse',           flavor: 'The elevator needs your fingerprint.', tasteGate: 40, exclRec: 120 },
  // tiers 14/15 (E21 "Seven Stars"): the exclusivity velvet-rope matures. exclRec is a soft,
  // display-only recommendation (like tiers 12/13) — NOT a hard block, so every branch reconverges
  // here and the harness (exclusivity 0) is never stranded. A light Taste gate keeps the connoisseur
  // flavour without delaying the greedy player (who has taste ~53 by tier 14).
  { tier: 14, name: '7-Star Experience',         flavor: 'A rating that officially does not exist.', tasteGate: 45, exclRec: 200 },
  { tier: 15, name: 'Royal Suite',               flavor: 'Someone actual-royal slept here. Once.', tasteGate: 50, exclRec: 320 },
  { tier: 16, name: 'Private Bungalow',          flavor: 'You OWN the walls now.' },
  { tier: 17, name: 'Overwater Villa',           flavor: 'Fish commute beneath your bed.' },
  { tier: 18, name: 'Private Villa & Grounds',   flavor: 'A gate. Your gate. With your name.' },
  { tier: 19, name: 'Private Estate',            flavor: 'You get lost in your own hallways.' },
  { tier: 20, name: 'Private Island',            flavor: 'The dot on the map is you.' },
];
