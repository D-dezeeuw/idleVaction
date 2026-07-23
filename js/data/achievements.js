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

  // --- Phase E expansion (audit 1.9: 16 trophies was a fraction of genre norm). In-run rows
  // are RECOGNITION (reward 0 — the harness may reach them); meta rows use harness-unreachable
  // systems and carry the small completionist ×, still curved by ACHIEVE.rewardCap. ---
  // the ladder
  { id: 'checkout',      name: 'Checkout Time',       desc: 'Leave the shed behind.',            metric: 'accTier',     threshold: 1,   reward: 0, meta: false },
  { id: 'own_door',      name: 'A Door of One\'s Own', desc: 'Reach the private room.',          metric: 'accTier',     threshold: 3,   reward: 0, meta: false },
  { id: 'boutique',      name: 'Boutique & Bougie',   desc: 'Reach the boutique retreat.',       metric: 'accTier',     threshold: 8,   reward: 0, meta: false },
  { id: 'seven_stars',   name: 'Off the Scale',       desc: 'Reach the seven-star tier.',        metric: 'accTier',     threshold: 14,  reward: 0, meta: false },
  { id: 'own_walls',     name: 'My Gate. My Squeak.', desc: 'Own the bungalow.',                 metric: 'accTier',     threshold: 16,  reward: 0, meta: false },
  { id: 'villa_vita',    name: 'Villa Vita',          desc: 'Reach the private villa.',          metric: 'accTier',     threshold: 18,  reward: 0, meta: false },
  // money
  { id: 'first_grand',   name: 'The First Thousand',  desc: 'Earn €1,000 lifetime.',             metric: 'lifetimeCash', threshold: 1e3,  reward: 0, meta: false },
  { id: 'billionaire',   name: 'A Thousand Millions', desc: 'Earn €1B lifetime.',                metric: 'lifetimeCash', threshold: 1e9,  reward: 0, meta: false },
  { id: 'trillionaire',  name: 'Guilders Were Smaller', desc: 'Earn €1T lifetime.',              metric: 'lifetimeCash', threshold: 1e12, reward: 0, meta: false },
  { id: 'money_belt',    name: 'Beyond the Money Belt', desc: 'Reach bank tier 5.',              metric: 'bankTier',    threshold: 5,   reward: 0, meta: false },
  { id: 'numberless',    name: 'Nearly Numberless',   desc: 'Reach bank tier 15.',               metric: 'bankTier',    threshold: 15,  reward: 0, meta: false },
  // the trip
  { id: 'four_stamps',   name: 'Four Brochures',      desc: 'Own 4 destinations.',               metric: 'destOwned',   threshold: 4,   reward: 0, meta: false },
  { id: 'well_stamped',  name: 'A Well-Stamped Book', desc: 'Own 8 destinations.',               metric: 'destOwned',   threshold: 8,   reward: 0, meta: false },
  { id: 'act_one',       name: 'Act One, Survived',   desc: 'Live 10 story beats.',              metric: 'beatsSeen',   threshold: 10,  reward: 0, meta: false },
  { id: 'the_long_road', name: 'The Long Road',       desc: 'Live 22 story beats.',              metric: 'beatsSeen',   threshold: 22,  reward: 0, meta: false },
  // comfort & things
  { id: 'small_wins',    name: 'It\'s the Little Things', desc: 'Own 25 amenities.',            metric: 'amenOwned',   threshold: 25,  reward: 0, meta: false },
  { id: 'many_things',   name: 'Fully Amenitized',    desc: 'Own 75 amenities.',                 metric: 'amenOwned',   threshold: 75,  reward: 0, meta: false },
  { id: 'all_things',    name: 'The Catalog, Cleared', desc: 'Own 150 amenities.',               metric: 'amenOwned',   threshold: 150, reward: 0, meta: false },
  { id: 'komfort',       name: 'Comfort, With a K',   desc: 'Reach Comfort 1,000.',              metric: 'bestComfort', threshold: 1e3, reward: 0, meta: false },
  { id: 'cloud_soft',    name: 'Professionally Relaxed', desc: 'Reach Comfort 1,000,000,000,000.', metric: 'bestComfort', threshold: 1e12, reward: 0, meta: false },
  // the grind
  { id: 'hundred_buys',  name: 'A Hundred Purchases', desc: 'Buy 100 income units.',             metric: 'genBought',   threshold: 100, reward: 0, meta: false },
  { id: 'well_rounded',  name: 'Well-Rounded Tourist', desc: 'Reach 25 total skill levels.',     metric: 'skillLevels', threshold: 25,  reward: 0, meta: false },
  { id: 'renaissance',   name: 'Renaissance Lounger', desc: 'Reach 60 total skill levels.',      metric: 'skillLevels', threshold: 60,  reward: 0, meta: false },
  { id: 'tap_tap',       name: 'Odd Jobs, Odder Hours', desc: 'Tap 500 times.',                  metric: 'clicks',      threshold: 500, reward: 0, meta: false },
  { id: 'carpal_sunnel', name: 'Umbrella Elbow',      desc: 'Tap 5,000 times.',                  metric: 'clicks',      threshold: 5000, reward: 0, meta: false },
  // wheels, hulls, wings (harness never buys — honest meta, tiny rewards)
  { id: 'first_keys',    name: 'Keys to Something',   desc: 'Own your first vehicle.',           metric: 'fleetOwned',  threshold: 1,   reward: 0.01, meta: true },
  { id: 'a_fleet',       name: 'A Modest Armada',     desc: 'Own 10 vehicles, hulls or wings.',  metric: 'fleetOwned',  threshold: 10,  reward: 0.02, meta: true },
  // people
  { id: 'first_hire',    name: 'At Your Service',     desc: 'Hire your first staff member.',     metric: 'staffHired',  threshold: 1,   reward: 0.01, meta: true },
  { id: 'household',     name: 'The Whole Household', desc: 'Hire 6 staff.',                     metric: 'staffHired',  threshold: 6,   reward: 0.02, meta: true },
  // the lanes
  { id: 'hodler',        name: 'Cold Wallet, Warm Sand', desc: 'Hold 50 coins.',                 metric: 'coinsHeld',   threshold: 50,  reward: 0.02, meta: true },
  { id: 'curator',       name: 'The Good Wall',       desc: 'Own 6 collection pieces.',          metric: 'collectionOwned', threshold: 6, reward: 0.02, meta: true },
  { id: 'deed_holder',   name: 'Ink On the Deed',     desc: 'Own property.',                     metric: 'propertyOwned', threshold: 1, reward: 0.01, meta: true },
  // generations
  { id: 'gen_three',     name: 'A Family Tradition',  desc: 'Reach generation 3.',               metric: 'generation',  threshold: 3,   reward: 0.02, meta: true },
  { id: 'gen_seven',     name: 'The Dynasty of Drizzle', desc: 'Reach generation 7.',            metric: 'generation',  threshold: 7,   reward: 0.03, meta: true },
  { id: 'ascend_ten',    name: 'Ten Lifetimes of Sun', desc: 'Ascend 10 times.',                 metric: 'ascensionCount', threshold: 10, reward: 0.04, meta: true },
  { id: 'tree_deep',     name: 'Deep Roots',          desc: 'Hold 12 skill-tree ranks.',         metric: 'treeRanks',   threshold: 12,  reward: 0.03, meta: true },
  { id: 'tree_wide',     name: 'The Whole Person',    desc: 'Hold 25 skill-tree ranks.',         metric: 'treeRanks',   threshold: 25,  reward: 0.04, meta: true },
  // the island era
  { id: 'resort_row',    name: 'Paradise, Zoned',     desc: 'Build 10 resort buildings.',        metric: 'buildingsBuilt', threshold: 10, reward: 0.03, meta: true },
  { id: 'resort_town',   name: 'The Town With No Desk', desc: 'Build 25 resort buildings.',      metric: 'buildingsBuilt', threshold: 25, reward: 0.04, meta: true },
  { id: 'ng_deep',       name: 'Again. AGAIN.',       desc: 'Reach New Game+ 3.',                metric: 'ngPlus',      threshold: 3,   reward: 0.05, meta: true },
  { id: 'ng_absurd',     name: 'The Sky Is a Ladder', desc: 'Reach New Game+ 5.',                metric: 'ngPlus',      threshold: 5,   reward: 0.05, meta: true },
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
