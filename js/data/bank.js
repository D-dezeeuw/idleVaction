// data/bank.js — the bank-account ladder (wallet-cap tiers). FLAVOR ONLY: every
// balance number (cap base/growth, upgrade costFrac, row count) lives in
// config.BANK — see the long comment there for why the wallet cap exists at all
// (offline-lump control, docs/math-proof.md §11). Row index IS the bank tier:
// capacity = BANK.base·BANK.growth^index (math.bankCapAt), except the LAST row,
// which is deliberately uncapped (Infinity) so late-game D6–D8 purchases and NG+
// magnitudes can never be permanently soft-locked behind a finite top account.
export const BANK_ACCOUNTS = [
  { id: 'money_belt',    name: 'Soggy Money Belt',            flavor: 'Cash, rain, and one emergency stroopwafel share a single zip.' },
  { id: 'ziplock',       name: 'Zip-Lock of Cash',            flavor: 'Waterproof-ish. The notes have stopped smelling of bus.' },
  { id: 'hostel_locker', name: 'Hostel Locker Box',           flavor: 'A padlock you trust more than the guy in bunk three.' },
  { id: 'checking',      name: 'Basic Checking',              flavor: 'A real bank. The card is beige. So are the interest rates.' },
  { id: 'student_save',  name: 'Student Savings',             flavor: 'Technically you are a student of leisure.' },
  { id: 'holiday_plus',  name: 'Holiday Savings Plus',        flavor: '"Plus" here means a second beige card.' },
  { id: 'silver',        name: 'Silver Account',              flavor: 'Comes with a phone line where a human eventually answers.' },
  { id: 'gold',          name: 'Gold Account',                flavor: 'The card is heavier. You check. It is actually heavier.' },
  { id: 'platinum',      name: 'Platinum Account',            flavor: 'Airport lounges now nod at you. One even smiled.' },
  { id: 'platinum_plus', name: 'Platinum Plus',               flavor: 'Like Platinum, but the hold music is a string quartet.' },
  { id: 'plat_ultra',    name: 'Platinum Plus Ultra',         flavor: 'The bank invented a metal to describe you.' },
  { id: 'black_card',    name: 'Black Card Account',          flavor: 'It absorbs light and restaurant bills with equal ease.' },
  { id: 'obsidian',      name: 'Obsidian Card',               flavor: 'Volcanic glass. Cuts through velvet ropes, literally if needed.' },
  { id: 'private_jr',    name: 'Private Banking, Junior Tier',flavor: 'A banker named Willem now calls you on your birthday.' },
  { id: 'private_sr',    name: 'Private Banking, Senior Tier',flavor: 'Willem has an assistant. The assistant has an assistant.' },
  { id: 'wealth_suite',  name: 'Wealth Management Suite',     flavor: 'Your money has its own office with a sea view.' },
  { id: 'family_lite',   name: 'Family Office Lite',          flavor: 'An office for a family of one, plus Willem.' },
  { id: 'family_office', name: 'Family Office',               flavor: 'Your money now employs more people than your hometown bakery.' },
  { id: 'offshore',      name: 'Offshore Portfolio',          flavor: 'Structured entirely from deck chairs, allegedly.' },
  { id: 'sovereign_adj', name: 'Sovereign Wealth Adjacent',   flavor: 'Small nations ask YOU for a bridging loan.' },
  { id: 'matryoshka',    name: 'Shell Company Matryoshka',    flavor: 'Inside every holding, a smaller holding, holding.' },
  { id: 'central_bank',  name: 'Central Bank On Retainer',    flavor: 'They print. You nod. Everyone stays polite about it.' },
  { id: 'numberless',    name: 'The Numberless Account',      flavor: 'Past a certain point the ledger simply stops counting.' },
];

// dev schema guard (mirrors data/destinations.js validateDestinations): fail loudly on
// malformed rows AND on drift between this file's row count and config.BANK.tiers —
// the cap formula indexes rows by tier, so a mismatch would strand or skip capacities.
// Called from dev/harness.mjs and dev/selftest.mjs; takes CONFIG as a param so this
// data file never imports config (data stays leaf-level, same as every other data file).
export function validateBank(CONFIG) {
  const errors = [];
  const seen = new Set();
  for (const b of BANK_ACCOUNTS) {
    if (seen.has(b.id)) errors.push(`duplicate bank account id: ${b.id}`);
    seen.add(b.id);
    for (const k of ['id', 'name', 'flavor']) {
      if (b[k] === undefined) errors.push(`${b.id}: missing required key "${k}"`);
    }
  }
  if (BANK_ACCOUNTS.length !== CONFIG.BANK.tiers) {
    errors.push(`BANK_ACCOUNTS has ${BANK_ACCOUNTS.length} rows but config.BANK.tiers is ${CONFIG.BANK.tiers}`);
  }
  if (!(CONFIG.BANK.costFrac > 0 && CONFIG.BANK.costFrac < 1)) {
    errors.push(`BANK.costFrac must be in (0,1) so the next account is always affordable within the current cap (got ${CONFIG.BANK.costFrac})`);
  }
  if (errors.length) throw new Error('validateBank() failed:\n' + errors.join('\n'));
  return true;
}
