// math.js — pure economy formulas. Mirrors docs/01-math-foundation.md.
// All functions take (state, ...) and return numbers. No mutation, no globals.

import { CONFIG as C } from './config.js';
import { clamp } from './util.js';

// ---- tier ladder ----
export function milestoneMult(bought) {
  return Math.pow(C.MILESTONE_MULT, Math.floor(bought / C.MILESTONE_STEP));
}
export function unitCost(k, bought) {
  return C.GEN.base[k] * Math.pow(C.GEN.growth[k], bought);
}

// ---- multiplier stack: additive within a layer, multiplicative across ----
// scope tags let a bonus target 'all' or specific tiers/tags (e.g. 'social').
export function tierMultiplier(state, k) {
  const g = state.generators[k];
  const mMilestone = milestoneMult(g.bought);

  // L_upgrade: per-tier bought upgrades (kept simple here as +0.5·upgrades)
  const L_upgrade = 1 + 0.5 * (g.upgrades || 0);

  // L_path: paths that target social tiers (k=1,2 → followers/sponsors) get a boost
  const social = (k === 1 || k === 2);
  const vlog = state.paths.vlogger.points;
  const L_path = 1 + (social ? C.PATH.rate * Math.pow(vlog, C.PATH.softcapExp) : 0)
                   + C.PATH.rate * Math.pow(state.paths.traveler.points, C.PATH.softcapExp) * 0.5;

  // L_skill: charisma boosts social tiers
  const L_skill = 1 + (social ? C.CHARISMA_RATE * state.skills.charisma.level : 0);

  // global layers
  const L_comfort = comfortMultiplier(state);
  const L_ascension = 1 + 0.10 * (state.ascension.tree.compounding_interest || 0);
  const L_tree = treeIncomeMult(state);

  return mMilestone * L_upgrade * L_path * L_skill * L_comfort * L_ascension * L_tree;
}

// production per second of tier k (in units of tier k output)
export function tierProd(state, k) {
  const g = state.generators[k];
  return g.count * C.GEN.perUnit[k] * tierMultiplier(state, k);
}

// ---- comfort ----
export function accScore(tier) {
  return C.ACC.base * Math.pow(C.ACC.growth, tier);
}
export function amenityScoreTotal(state, DATA) {
  let s = 0;
  for (const a of DATA.amenities) {
    const lvl = state.amenities[a.id]?.level || 0;
    s += lvl * a.comfort;
  }
  return s;
}
// Comfort is an UNBOUNDED weighted sum (dominated by accScore at high tiers, so it
// tracks the accommodation ladder into the billions). Its *effect* on income is
// softcapped by the log in comfortMultiplier(), so growth stays sane. Ascension
// adds a flat comfort bonus so later runs feel plusher from the start.
export function computeComfort(state, DATA) {
  const ascBonus = 1 + 0.25 * state.ascension.count;
  return (C.COMFORT.wAcc * accScore(state.accommodation.tier)
        + C.COMFORT.wAmen * amenityScoreTotal(state, DATA)
        + C.COMFORT.wBody * state.skills.body.level) * ascBonus;
}
// Comfort required to unlock a given accommodation tier (see config.ACC.unlockFrac).
export function accUnlockComfort(tier) {
  return accScore(tier) * C.ACC.unlockFrac;
}
export function comfortMultiplier(state) {
  const comfort = state._comfortCache ?? 0;
  return 1 + C.COMFORT.MULT * Math.log10(1 + comfort / C.COMFORT.C0);
}

// ---- skills ----
export function xpToNext(level) { return C.SKILL.base * Math.pow(C.SKILL.growth, level); }
export function levelFromXp(xp) {
  let lvl = 0, need = C.SKILL.base, spent = 0;
  while (spent + need <= xp) { spent += need; lvl++; need = xpToNext(lvl); }
  return lvl;
}
export function commsCostMult(state) {
  return clamp(1 - C.COMMS_DISCOUNT * state.skills.comms.level, 1 - C.COMMS_DISCOUNT_CAP, 1)
       * treeCostMult(state);
}
export function savvyPassive(state) {
  return state.skills.savvy.level * C.SAVVY_YIELD * Math.sqrt(Math.max(0, state.stats.lifetimeCash));
}

// ---- permanent skill tree effects ----
export function treeIncomeMult(state) {
  const t = state.ascension.tree;
  // Sun-Kissed = permanent income multiplier. (Second Wind is a timed window,
  // applied in the engine, not here.)
  return Math.pow(1.15, t.sun_kissed || 0);
}
export function treeCostMult(state) {
  const t = state.ascension.tree;
  return Math.max(0.4, Math.pow(0.97, t.silver_tongue || 0)); // -3%/rank, floor 40%
}

// ---- prestige ----
export function legacyGain(state) {
  const raw = C.LEGACY_K * Math.pow(state.stats.lifetimeCashThisTree / C.LEGACY_SCALE, C.LEGACY_EXP);
  return Math.max(0, Math.floor(raw) - state.ascension.legacyBanked);
}
