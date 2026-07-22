// data/achievements.js — achievements & collections (E30 "Legends of Leisure"). The endless
// completionist meta: a trophy for reaching milestones, and a small permanent income × for the
// meta/collection accomplishments.
//
// ACHIEVEMENT shape: { id, name, desc, metric, threshold, reward, meta }
//   · metric/threshold — unlocked when `stateMetric(state, metric) >= threshold` (engine, pure).
//   · reward — the income × bonus fed into L_achieve (1 + Σ rewards). SMALL (×1.01–1.05).
//   · meta — true iff the metric requires a META action (ascension / legend / island / NG+ /
//     collection). CRITICAL INVARIANT: reward > 0 is allowed ONLY on meta achievements, and every
//     in-run milestone (comfort/cash/tier — things the greedy harness reaches) has reward 0. The
//     harness never performs a meta action, so it unlocks only reward-0 trophies ⇒ L_achieve stays
//     exactly 1 ⇒ the fitted 29705s island time is unmoved. (validated in data + selftest.)
//
// In-run milestones are RECOGNITION (a trophy, a stat), not power; the completionist × comes from
// the meta layer — the players who prestige, collect, and go long.

export const ACHIEVEMENTS = [
  // --- in-run milestones (reward 0 — cosmetic trophies the harness can reach) ---
  { id: 'first_star',    name: 'One Whole Star',      desc: 'Reach a 1-star hotel.',           metric: 'accTier',     threshold: 4,     reward: 0, meta: false },
  { id: 'poolside',      name: 'Making a Splash',     desc: 'Reach a hotel with a pool.',       metric: 'accTier',     threshold: 6,     reward: 0, meta: false },
  { id: 'five_star',     name: 'Five-Star Frame',     desc: 'Reach a 5-star hotel.',            metric: 'accTier',     threshold: 9,     reward: 0, meta: false },
  { id: 'sail_hotel',    name: 'Shaped Like a Sail',  desc: 'Reach the sail-shaped hotel.',     metric: 'accTier',     threshold: 12,    reward: 0, meta: false },
  { id: 'the_island',    name: 'The Dot Is You',      desc: 'Reach the Private Island tier.',   metric: 'accTier',     threshold: 20,    reward: 0, meta: false },
  { id: 'comfy',         name: 'Genuinely Comfy',     desc: 'Reach Comfort 1,000,000.',         metric: 'bestComfort', threshold: 1e6,   reward: 0, meta: false },
  { id: 'very_comfy',    name: 'Absurdly Comfy',      desc: 'Reach Comfort 1,000,000,000.',     metric: 'bestComfort', threshold: 1e9,   reward: 0, meta: false },
  { id: 'first_million', name: 'First Million',       desc: 'Earn €1,000,000 lifetime.',        metric: 'lifetimeCash',threshold: 1e6,   reward: 0, meta: false },

  // --- meta accomplishments (reward > 0 — the completionist ×; the harness never reaches these) ---
  { id: 'first_ascend',  name: 'Letting Go',          desc: 'Ascend for the first time.',       metric: 'ascensionCount', threshold: 1,  reward: 0.02, meta: true },
  { id: 'seasoned',      name: 'Seasoned Traveller',  desc: 'Ascend 5 times.',                  metric: 'ascensionCount', threshold: 5,  reward: 0.03, meta: true },
  { id: 'homeowner',     name: 'You Own the Walls',   desc: 'Buy the private island.',          metric: 'islandOwned',    threshold: 1,  reward: 0.03, meta: true },
  { id: 'the_host',      name: 'You Host Now',        desc: 'Build your first resort building.',metric: 'buildingsBuilt', threshold: 1,  reward: 0.03, meta: true },
  { id: 'a_legend',      name: 'A Legend',            desc: 'Become a Legend (prestige-2).',    metric: 'legendCount',    threshold: 1,  reward: 0.05, meta: true },
  { id: 'legendary',     name: 'Legendary',           desc: 'Become a Legend 3 times.',         metric: 'legendCount',    threshold: 3,  reward: 0.05, meta: true },
  { id: 'new_game_plus', name: 'Again, But More',     desc: 'Start New Game+.',                 metric: 'ngPlus',         threshold: 1,  reward: 0.04, meta: true },
  { id: 'collector',     name: 'Where the Rich Hide', desc: 'Collect all 5 premium destinations.', metric: 'premiumDestOwned', threshold: 5, reward: 0.05, meta: true },
];

export function achievementDef(id) { return ACHIEVEMENTS.find(a => a.id === id); }

export function validateAchievements() {
  const errors = [];
  const seen = new Set();
  for (const a of ACHIEVEMENTS) {
    if (seen.has(a.id)) errors.push(`duplicate achievement id: ${a.id}`);
    seen.add(a.id);
    for (const k of ['id', 'name', 'desc', 'metric']) if (typeof a[k] !== 'string' || !a[k]) errors.push(`${a.id}: "${k}" must be a non-empty string`);
    if (typeof a.threshold !== 'number' || !Number.isFinite(a.threshold)) errors.push(`${a.id}: threshold must be a finite number`);
    if (typeof a.reward !== 'number' || a.reward < 0) errors.push(`${a.id}: reward must be a number >= 0`);
    if (typeof a.meta !== 'boolean') errors.push(`${a.id}: meta must be a boolean`);
    // THE INVARIANT: a positive reward is allowed ONLY on meta achievements (harness never reaches them).
    if (a.reward > 0 && !a.meta) errors.push(`${a.id}: a positive reward requires meta:true (in-run trophies must be reward 0 to keep the fitted run invariant)`);
  }
  if (errors.length) throw new Error('validateAchievements() failed:\n' + errors.join('\n'));
  return true;
}
