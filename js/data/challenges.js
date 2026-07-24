// data/challenges.js — Ascension Challenges (Living-World W3, docs/08-living-world.md point 7).
// AD-style handicap runs, opt-in from ascension 1: prestige.ascend's optional { challengeId }
// validates against this roster and sets state.challenge.active POST-reset (run-scoped — run 1
// can never have one active, only selectable AT an ascension). Completing a challenge (reaching
// goalTier) mints a permanent Keepsake reward — a bounded flat × (math.keepsakeMultiplier),
// exactly the same safe class as the Souvenir Stand's L_souvenir (docs/math-proof.md §3/§4).
//
// Every `mods` key below is consumed by math.challengeMod(state, key) at exactly ONE choke point
// each (see the comment on challengeMod in math.js) — a FIXED, known vocabulary
// (validateChallenges enforces it), each key defaulting to the identity (1, except automationMult
// which gates a boolean-ish on/off) whenever no challenge is active, so a plain ascension (the
// harness, every existing scenario) is bit-identical to before this wave. Schema:
//
//   { id, name, emoji, desc, mods, goalTier, reward }
//     mods     — a sparse object over { comfortEffectMult, amenityCostMult, walletCapMult,
//                passiveMult, automationMult }; omitted keys read as the identity at their choke
//                point (math.challengeMod's default).
//       comfortEffectMult — scales L_comfort's EFFECT (the excess over 1), read in
//                           math.comfortMultiplier. 1 = untouched.
//       amenityCostMult   — scales every amenity's cash price, read in engine.amenityCost. 1 =
//                           untouched.
//       walletCapMult     — scales the wallet cap, read in math.walletCap (folds bankCapAt). 1 =
//                           untouched.
//       passiveMult       — scales BOTH Savvy's passive AND crypto coin yield (one key, two
//                           readers: math.savvyPassive/math.cryptoYieldPerSec). 1 = untouched, 0 =
//                           both fully disabled.
//       automationMult    — gates the concierge tick AND the staff auto-buy tick (engine.
//                           conciergeTick/staffTick): > 0 = automation runs as normal, 0 =
//                           disabled entirely (manual purchases are never blocked — only the
//                           AUTOMATION is off).
//     goalTier — the accommodation tier that completes the challenge (engine.buyAccommodation
//                detects the tier-up landing here). 20 = the Private Island rung for every row —
//                the same milestone the greedy harness's own "island" metric already measures.
//     reward   — { mult } — a flat Keepsake perk mult (≤ 0.06 each; 5 rows sum to EXACTLY
//                config.KEEPSAKE.xCap − 1 = 0.30 at full completion, W5 sizes the real numbers).
export const CHALLENGES = [
  { id: 'rainy_season', name: 'Rainy Season', emoji: '🌧️',
    desc: 'A whole season of drizzle. Comfort still helps — it just helps half as much.',
    mods: { comfortEffectMult: 0.5 }, goalTier: 20, reward: { mult: 0.06 } },

  { id: 'lost_luggage', name: 'Lost Luggage', emoji: '🧳',
    desc: 'The airline lost the bag with all your little luxuries. Replacing anything costs triple.',
    mods: { amenityCostMult: 3 }, goalTier: 20, reward: { mult: 0.06 } },

  { id: 'budget_airline', name: 'Budget Airline', emoji: '✈️',
    desc: 'One carry-on, no exceptions. Every wallet you open holds half of what it used to.',
    mods: { walletCapMult: 0.5 }, goalTier: 20, reward: { mult: 0.06 } },

  { id: 'cash_only', name: 'Cash Only', emoji: '💵',
    desc: 'No cards, no apps, no passive income of any kind. Savvy sits idle; the crypto ticker goes quiet.',
    mods: { passiveMult: 0 }, goalTier: 20, reward: { mult: 0.06 } },

  { id: 'skeleton_crew', name: 'Skeleton Crew', emoji: '🦴',
    desc: 'The concierge called in sick. So did the whole household. Every purchase, this run, is yours to make.',
    mods: { automationMult: 0 }, goalTier: 20, reward: { mult: 0.06 } },
];

// the fixed mods vocabulary (see the header comment) — validateChallenges rejects anything else.
const ALLOWED_MOD_KEYS = ['comfortEffectMult', 'amenityCostMult', 'walletCapMult', 'passiveMult', 'automationMult'];

// dev schema guard (mirrors validateBoosts/validateSplurges' style): ids unique, required keys
// present, mods uses ONLY the fixed vocabulary with genuinely-a-handicap values, goalTier sane,
// reward.mult bounded. Throws loudly on malformed data — called from dev/harness.mjs and
// dev/selftest.mjs.
export function validateChallenges() {
  const errors = [];
  const seen = new Set();
  let rewardSum = 0;
  for (const c of CHALLENGES) {
    if (seen.has(c.id)) errors.push(`duplicate challenge id: ${c.id}`);
    seen.add(c.id);
    for (const k of ['id', 'name', 'emoji', 'desc', 'mods', 'goalTier', 'reward']) {
      if (c[k] === undefined) errors.push(`${c.id}: missing required key "${k}"`);
    }
    for (const key of Object.keys(c.mods || {})) {
      if (!ALLOWED_MOD_KEYS.includes(key)) errors.push(`${c.id}: unknown mods key "${key}" (outside the fixed vocabulary)`);
    }
    if (c.mods) {
      if (c.mods.comfortEffectMult !== undefined && !(c.mods.comfortEffectMult >= 0 && c.mods.comfortEffectMult < 1))
        errors.push(`${c.id}: comfortEffectMult must be a genuine handicap, in [0,1)`);
      if (c.mods.amenityCostMult !== undefined && !(c.mods.amenityCostMult > 1))
        errors.push(`${c.id}: amenityCostMult must be a genuine handicap, > 1`);
      if (c.mods.walletCapMult !== undefined && !(c.mods.walletCapMult > 0 && c.mods.walletCapMult < 1))
        errors.push(`${c.id}: walletCapMult must be a genuine handicap, in (0,1)`);
      if (c.mods.passiveMult !== undefined && !(c.mods.passiveMult >= 0 && c.mods.passiveMult < 1))
        errors.push(`${c.id}: passiveMult must be a genuine handicap, in [0,1)`);
      if (c.mods.automationMult !== undefined && !(c.mods.automationMult >= 0 && c.mods.automationMult < 1))
        errors.push(`${c.id}: automationMult must be a genuine handicap, in [0,1)`);
    }
    if (!(Number.isInteger(c.goalTier) && c.goalTier > 0)) errors.push(`${c.id}: goalTier must be a positive integer`);
    if (!c.reward || !(c.reward.mult > 0 && c.reward.mult <= 0.06)) errors.push(`${c.id}: reward.mult must be in (0, 0.06]`);
    rewardSum += (c.reward && c.reward.mult) || 0;
  }
  if (rewardSum > 0.30 + 1e-9) errors.push(`Σ reward.mult (${rewardSum}) exceeds config.KEEPSAKE.xCap − 1 (0.30)`);
  if (errors.length) throw new Error('validateChallenges() failed:\n' + errors.join('\n'));
  return true;
}
