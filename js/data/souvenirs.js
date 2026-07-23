// data/souvenirs.js — the Souvenir Stand (Living-World W3, docs/08-living-world.md point 6).
// A shelf of ~10 items bought with the souvenir currency (state.souvenirs.count — minted from
// wallet overflow + first destination visits, engine.gainCash/visitDestination; see config.SOUVENIR
// for the minting rules). Roughly half are pure flavor (kind:'pride', no mechanical effect at all);
// the other half are tiny perks (kind:'perk') feeding ONE bounded income layer, L_souvenir —
// math.souvenirMultiplier, folded into math.tierMultiplier alongside the other bounded flat layers
// (L_amenity/L_owner/…). Escalating souvenir costs (a small integer currency, never cash) pace the
// shelf across a run. Pure declarative data; engine.js/math.js stay generic (the config→util→math→
// data chain — this file imports nothing, mirroring data/boosts.js). Schema:
//
//   { id, name, emoji, desc, kind, cost, mult? }
//     kind — 'pride' (cosmetic only — the UI shows it on the shelf, nothing else reads it) or
//            'perk' (mult joins L_souvenir additively; validateSouvenirs enforces mult ≤ 0.05).
//     cost — souvenir-currency price (an integer; state.souvenirs.count is debited on purchase).
//     mult — 'perk' rows only: the flat addend into L_souvenir (bounded, ≤ 0.05 each — 5 perk rows
//            below sum to EXACTLY config.SOUVENIR.xCap − 1 = 0.25 at full completion).
export const SOUVENIRS = [
  { id: 'shot_glass', name: 'Commemorative Shot Glass', emoji: '🥃', kind: 'pride', cost: 2,
    desc: 'Says the name of a country you have definitely visited. Chipped within a week. Priceless anyway.' },
  { id: 'fridge_magnet', name: 'Fridge Magnet', emoji: '🧲', kind: 'pride', cost: 3,
    desc: 'Joins forty others on a fridge you no longer own. The fridge, wherever it is, is very well-traveled.' },
  { id: 'keychain_photo', name: 'Keychain with Your Own Photo On It', emoji: '🔑', kind: 'perk', cost: 4, mult: 0.05,
    desc: 'A tiny, undeniable proof that you were, in fact, here. Fishing it out of your pocket is a small, permanent confidence boost.' },
  { id: 'postcard_rack', name: 'Postcard Rack Raid', emoji: '📮', kind: 'pride', cost: 5,
    desc: 'Eleven postcards, none mailed. They live in a drawer, a small museum of good intentions.' },
  { id: 'snow_globe', name: 'Snow Globe (No Snow, Ever, Here)', emoji: '🔮', kind: 'pride', cost: 6,
    desc: 'It snows, gently, over a beach. Nobody asked questions at the gift shop. Neither will you.' },
  { id: 'lucky_seashell', name: 'Lucky Seashell', emoji: '🐚', kind: 'perk', cost: 8, mult: 0.05,
    desc: 'Picked up off a beach you will never find again. You keep it in the bag with the passports, for luck.' },
  { id: 'mini_windmill', name: 'Miniature Windmill', emoji: '🎡', kind: 'pride', cost: 10,
    desc: 'It does not turn. It was never going to turn. You bought it anyway, obviously.' },
  { id: 'engraved_lighter', name: 'Engraved Lighter (You Do Not Smoke)', emoji: '🔥', kind: 'perk', cost: 12, mult: 0.05,
    desc: 'Bought for the engraving alone. It sits in a drawer, quietly making you feel like someone who has been places.' },
  { id: 'tiny_wooden_clogs', name: 'Tiny Wooden Clogs', emoji: '👞', kind: 'perk', cost: 15, mult: 0.05,
    desc: 'Too small for anyone\'s feet, exactly the right size for a shelf. Somehow this always pays for itself.' },
  { id: 'golden_luggage_tag', name: 'Golden Luggage Tag', emoji: '🏷️', kind: 'perk', cost: 18, mult: 0.05,
    desc: 'Your bag is now unmistakable on every carousel on Earth. Confidence, it turns out, is also luggage-shaped.' },
];

// dev schema guard (mirrors validateBoosts/validateSplurges' style): ids unique, required keys
// present, kind known, cost a positive integer, 'perk' rows carry a bounded mult and 'pride' rows
// carry none. Throws loudly on malformed data — called from dev/harness.mjs and dev/selftest.mjs.
export function validateSouvenirs() {
  const errors = [];
  const KINDS = ['pride', 'perk'];
  const seen = new Set();
  for (const s of SOUVENIRS) {
    if (seen.has(s.id)) errors.push(`duplicate souvenir id: ${s.id}`);
    seen.add(s.id);
    for (const k of ['id', 'name', 'emoji', 'desc', 'kind', 'cost']) {
      if (s[k] === undefined) errors.push(`${s.id}: missing required key "${k}"`);
    }
    if (!KINDS.includes(s.kind)) errors.push(`${s.id}: unknown kind "${s.kind}"`);
    if (!(Number.isInteger(s.cost) && s.cost > 0)) errors.push(`${s.id}: cost must be a positive integer (got ${s.cost})`);
    if (s.kind === 'perk') {
      if (!(s.mult > 0 && s.mult <= 0.05)) errors.push(`${s.id}: perk mult must be in (0, 0.05] (got ${s.mult})`);
    } else if (s.mult !== undefined) {
      errors.push(`${s.id}: pride items must not carry a mult`);
    }
  }
  if (errors.length) throw new Error('validateSouvenirs() failed:\n' + errors.join('\n'));
  return true;
}
