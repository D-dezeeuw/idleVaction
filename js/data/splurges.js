// data/splurges.js — Splurge Moments (Living-World W2, docs/08-living-world.md point 5).
// Two-option choice cards scattered across the story/tier arc: option A is the SPLURGE (spend a
// wallet fraction for a timed edge), option B is the KEEPSAKE (a small permanent-ish nudge —
// skill XP, a path-point chunk, a modest cash payout, or a full energy tank). Both are modest by
// construction (the bounded vocabulary below). Ignoring the card (engine.checkSplurges' expiry
// branch) is ALWAYS a pure no-op — the harness never chooses, so every card it triggers just
// expires, and the fitted goldens cannot move. Pure declarative data; engine.js/math.js stay
// generic (the config→util→math→data chain — this file imports only data/skills.js, mirroring
// data/staff.js's import of data/property.js's GROUNDS for cross-reference). Schema:
//
//   { id, title, emoji, desc, trigger, expireSec, a: {label, effects}, b: {label, effects} }
//     trigger  — fires ONCE per run, the first tick its condition holds and nothing else is
//                pending: EXACTLY one of { beat: N } (state.story.beat >= N) or { tier: N }
//                (state.accommodation.tier >= N).
//     expireSec— game-seconds the card stays open before resolving 'expired' (a no-op) on its own.
//     effects  — ONLY this bounded vocabulary (validateSplurges enforces it), each optional:
//       costWalletFrac  — debits this fraction of the wallet CAP (math.walletCap), clamped so
//                         cash never goes negative — same up-front-spend shape as Sunscreen Boosts.
//       timedMult{kind,mult,durationSec} — mult ≤ 3, durationSec ≤ 300 — through the SAME capped
//                         effects registry every other timed × uses (engine.addEffect).
//       xp{skill,amount}— flat XP into one named skill (engine.refreshSkillLevels applies levels).
//       pathPoints      — ≤ 2, routed via engine.addPathPoints into the CURRENT committed branch —
//                         a no-op while story.branch is 'neutral' (no path to receive it yet).
//       cash{walletFrac}— walletFrac ≤ 0.15 of wallet ROOM, paid via engine.gainCash (the one
//                         inflow rule — never confiscates, never overflows the cap).
//       energyFull      — true ⇒ refill the energy tank to math.energyMax (no cost).
import { SKILLS } from './skills.js';

export const SPLURGES = [
  { id: 'first_pool_day', title: 'First Pool Day', emoji: '🏊',
    desc: 'The 3-Star Hotel has an actual pool. You stand at the edge for a full minute before getting in.',
    trigger: { tier: 6 }, expireSec: 600,
    a: { label: 'Order poolside bottle service', effects: { costWalletFrac: 0.08, timedMult: { kind: 'income', mult: 2, durationSec: 180 } } },
    b: { label: 'Just float quietly and enjoy it', effects: { xp: { skill: 'body', amount: 40 } } } },

  { id: 'minibar_temptation', title: 'Minibar Temptation', emoji: '🍫',
    desc: 'The minibar price list reads like a ransom note. You open the little fridge anyway.',
    trigger: { beat: 8 }, expireSec: 600,
    a: { label: 'Raid the minibar for content', effects: { costWalletFrac: 0.05, timedMult: { kind: 'clout', mult: 2, durationSec: 120 } } },
    b: { label: 'Leave a euro and a nice note', effects: { cash: { walletFrac: 0.03 } } } },

  { id: 'spa_splurge', title: 'Spa Splurge', emoji: '💆',
    desc: 'The Boutique Retreat spa menu is small, tasteful, and quietly expensive. So is everything here.',
    trigger: { tier: 8 }, expireSec: 600,
    a: { label: 'Book the full spa day', effects: { costWalletFrac: 0.10, timedMult: { kind: 'income', mult: 2.5, durationSec: 240 } } },
    b: { label: 'A quiet walk on the beach instead', effects: { energyFull: true } } },

  { id: 'sponsor_gala', title: 'Sponsor Gala', emoji: '🥂',
    desc: 'The brands that noticed your viral clip want a photo with you. There is an open bar involved.',
    trigger: { beat: 14 }, expireSec: 600,
    a: { label: 'Work the room all night', effects: { costWalletFrac: 0.08, timedMult: { kind: 'clout', mult: 3, durationSec: 150 } } },
    b: { label: 'Network quietly, collect cards', effects: { pathPoints: 2 } } },

  { id: 'yacht_week', title: 'Yacht Week', emoji: '🛥️',
    desc: 'A sail-shaped hotel makes a yacht feel like the logical next purchase. It is not. You consider it anyway.',
    trigger: { tier: 12 }, expireSec: 600,
    a: { label: 'Charter the yacht for a week', effects: { costWalletFrac: 0.12, timedMult: { kind: 'income', mult: 3, durationSec: 200 } } },
    b: { label: 'Rent a rowboat, keep the savings', effects: { cash: { walletFrac: 0.05 } } } },

  { id: 'art_auction', title: 'Art Auction', emoji: '🖼️',
    desc: 'A paddle is pressed into your hand before you can decline. Lot 12 is, apparently, "a mood."',
    trigger: { tier: 14 }, expireSec: 600,
    a: { label: 'Bid big on the mystery lot', effects: { costWalletFrac: 0.10, timedMult: { kind: 'clout', mult: 2.5, durationSec: 200 } } },
    b: { label: 'Admire it from the back row', effects: { xp: { skill: 'taste', amount: 60 } } } },

  { id: 'royal_upgrade', title: 'Royal Upgrade', emoji: '👑',
    desc: 'The Royal Suite is offered at a "friends and family" rate that is still, technically, a fortune.',
    trigger: { tier: 15 }, expireSec: 600,
    a: { label: 'Accept the royal suite upsell', effects: { costWalletFrac: 0.10, timedMult: { kind: 'income', mult: 3, durationSec: 180 } } },
    b: { label: 'Politely decline, bank the difference', effects: { pathPoints: 2 } } },

  { id: 'island_fever', title: 'Island Fever', emoji: '🏝️',
    desc: 'The invitation is real, it turns out. One more indulgence before everything changes.',
    trigger: { beat: 22 }, expireSec: 600,
    a: { label: 'Charter one more sunset cruise', effects: { costWalletFrac: 0.10, timedMult: { kind: 'income', mult: 2.5, durationSec: 240 } } },
    b: { label: 'Sit still. You live here now.', effects: { xp: { skill: 'body', amount: 80 } } } },
];

// dev schema guard (mirrors validateEvents/validateBoosts' style): ids unique, required keys
// present, trigger sets EXACTLY one of {beat, tier}, and every effect object uses ONLY the
// bounded vocabulary above with in-range values. Throws loudly on malformed data — called from
// dev/harness.mjs and dev/selftest.mjs.
const ALLOWED_EFFECT_KEYS = ['costWalletFrac', 'timedMult', 'xp', 'pathPoints', 'cash', 'energyFull'];
export function validateSplurges() {
  const errors = [];
  const seen = new Set();
  const skillIds = new Set(SKILLS.map(s => s.id));
  for (const m of SPLURGES) {
    if (seen.has(m.id)) errors.push(`duplicate splurge id: ${m.id}`);
    seen.add(m.id);
    for (const k of ['id', 'title', 'emoji', 'desc', 'trigger', 'expireSec', 'a', 'b']) {
      if (m[k] === undefined) errors.push(`${m.id}: missing required key "${k}"`);
    }
    if (!(m.expireSec > 0)) errors.push(`${m.id}: expireSec must be > 0`);
    const trig = m.trigger || {};
    const hasBeat = trig.beat !== undefined, hasTier = trig.tier !== undefined;
    if (hasBeat === hasTier) errors.push(`${m.id}: trigger must set EXACTLY ONE of {beat, tier} (got ${JSON.stringify(trig)})`);
    for (const side of ['a', 'b']) {
      const opt = m[side];
      if (!opt) continue;
      if (!opt.label) errors.push(`${m.id}.${side}: missing label`);
      const eff = opt.effects || {};
      for (const key of Object.keys(eff)) {
        if (!ALLOWED_EFFECT_KEYS.includes(key)) errors.push(`${m.id}.${side}: unknown effect key "${key}" (outside the bounded vocabulary)`);
      }
      if (eff.costWalletFrac !== undefined && !(eff.costWalletFrac > 0 && eff.costWalletFrac < 1))
        errors.push(`${m.id}.${side}: costWalletFrac must be in (0,1)`);
      if (eff.timedMult) {
        if (!(eff.timedMult.mult > 1 && eff.timedMult.mult <= 3)) errors.push(`${m.id}.${side}: timedMult.mult must be in (1,3]`);
        if (!(eff.timedMult.durationSec > 0 && eff.timedMult.durationSec <= 300)) errors.push(`${m.id}.${side}: timedMult.durationSec must be in (0,300]`);
        if (!eff.timedMult.kind) errors.push(`${m.id}.${side}: timedMult missing kind`);
      }
      if (eff.xp) {
        if (!skillIds.has(eff.xp.skill)) errors.push(`${m.id}.${side}: xp.skill references unknown skill "${eff.xp.skill}"`);
        if (!(eff.xp.amount > 0)) errors.push(`${m.id}.${side}: xp.amount must be > 0`);
      }
      if (eff.pathPoints !== undefined && !(eff.pathPoints > 0 && eff.pathPoints <= 2))
        errors.push(`${m.id}.${side}: pathPoints must be in (0,2]`);
      if (eff.cash && !(eff.cash.walletFrac > 0 && eff.cash.walletFrac <= 0.15))
        errors.push(`${m.id}.${side}: cash.walletFrac must be in (0,0.15]`);
      if (eff.energyFull !== undefined && eff.energyFull !== true)
        errors.push(`${m.id}.${side}: energyFull must be true if present`);
    }
  }
  if (errors.length) throw new Error('validateSplurges() failed:\n' + errors.join('\n'));
  return true;
}
