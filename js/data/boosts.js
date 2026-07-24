// data/boosts.js — Sunscreen Boosts (Living-World W2, docs/08-living-world.md point 4).
// Player-FIRED timed multipliers on the shared effects registry (config.EFFECTS/
// math.effectsMult/engine.addEffect, Living-World W1) — the Trip Events precedent, but nothing
// here ever auto-fires: engine.activateBoost is the ONLY way in, gated on a reveal beat + a
// game-time cooldown, paid for UP FRONT (never an inflow — never gainCash). Pure declarative
// data; engine.js/math.js stay generic (the config→util→math→data chain — this file never
// imports config/engine, same convention as data/sponsors.js/data/events.js). Schema:
//
//   { id, name, emoji, desc, kind, mult, durationSec, cooldownSec, costWalletFrac }
//     kind          — which effectsMult() stream this boost multiplies while live:
//                       'income'  — folds into engine.runtimeMult (already wired for Trip Events).
//                       'clout'   — folded into math.cloutRate's own factor stack.
//                       'skillxp' — folded into engine.trickleXp + engine.buyTraining's XP grant
//                                   ONLY (never tierProd/comfort — see engine's comment).
//     mult          — the flat × while live; effectsMult still hard-caps the PRODUCT of every
//                     live entry of one kind at config.EFFECTS.maxMult (the same safe class as
//                     L_dest, docs/math-proof.md §3/§4).
//     durationSec   — how long the window lasts once activated.
//     cooldownSec   — game-seconds (state.stats.runSec) before this boost can fire again.
//     costWalletFrac— the up-front price, as a fraction of the WALLET CAP (math.walletCap, not
//                     current cash — a boost costs the same fraction of your account size
//                     regardless of how full it happens to be right now), debited as a plain
//                     cash subtract (engine.activateBoost — mirrors buyContentBoost's shape),
//                     never routed through gainCash (that path is inflow-only).
export const BOOSTS = [
  { id: 'splash_out', name: 'Splash Out', emoji: '🍾', kind: 'income', mult: 3, durationSec: 120,
    cooldownSec: 900, costWalletFrac: 0.10,
    desc: 'Pop the good bottle by the pool and let the whole resort know you can afford it — for the next two minutes, anyway.' },
  { id: 'camera_day', name: 'Camera Day', emoji: '🎥', kind: 'clout', mult: 3, durationSec: 180,
    cooldownSec: 900, costWalletFrac: 0.05,
    desc: 'Every angle, every hour, one relentless content day. The algorithm rewards commitment.' },
  { id: 'deep_focus', name: 'Deep Focus', emoji: '🧘', kind: 'skillxp', mult: 5, durationSec: 180,
    cooldownSec: 900, costWalletFrac: 0.05,
    desc: 'Noise-cancelling headphones, a strong coffee, zero notifications. For once, you actually study.' },
];

// dev schema guard (mirrors validateEvents/validateSponsors' style): ids unique, required keys
// present, kind known, mult/durations/cooldown/cost sane. Throws loudly on malformed data —
// called from dev/harness.mjs and dev/selftest.mjs.
export function validateBoosts() {
  const errors = [];
  const KINDS = ['income', 'clout', 'skillxp'];
  const seen = new Set();
  for (const b of BOOSTS) {
    if (seen.has(b.id)) errors.push(`duplicate boost id: ${b.id}`);
    seen.add(b.id);
    for (const k of ['id', 'name', 'emoji', 'desc', 'kind', 'mult', 'durationSec', 'cooldownSec', 'costWalletFrac']) {
      if (b[k] === undefined) errors.push(`${b.id}: missing required key "${k}"`);
    }
    if (!KINDS.includes(b.kind)) errors.push(`${b.id}: unknown kind "${b.kind}"`);
    if (!(b.mult > 1)) errors.push(`${b.id}: mult must be > 1 (got ${b.mult})`);
    if (!(b.durationSec > 0)) errors.push(`${b.id}: durationSec must be > 0`);
    if (!(b.cooldownSec > 0)) errors.push(`${b.id}: cooldownSec must be > 0`);
    if (!(b.costWalletFrac > 0 && b.costWalletFrac < 1)) errors.push(`${b.id}: costWalletFrac must be in (0,1)`);
  }
  if (errors.length) throw new Error('validateBoosts() failed:\n' + errors.join('\n'));
  return true;
}
