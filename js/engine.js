// engine.js — tick loop, purchases, unlocks, story, offline. Mutates state in place.
import { CONFIG as C } from './config.js';
import { DATA } from './data/index.js';
import * as M from './math.js';
import { bulkCost, maxAffordable, clamp } from './util.js';

// ---------- notifications (drained by UI) ----------
function notify(state, type, text) {
  (state._notifications ||= []).push({ type, text, t: state.stats.runSec });
  if (state._notifications.length > 40) state._notifications.shift();
}
export function drainNotifications(state) {
  const n = state._notifications || []; state._notifications = []; return n;
}

// ---------- runtime (non-pure) multiplier: Second Wind window ----------
function runtimeMult(state) {
  const rank = state.ascension.tree.second_wind || 0;
  if (rank > 0 && state.stats.runSec < 300 * rank) return 5;
  return 1;
}

// ---------- the tick ----------
export function tick(state, dt) {
  state.stats.runSec += dt;
  state.meta.playtimeMs += dt * 1000;

  // 1) refresh comfort cache (feeds the multiplier stack)
  state._comfortCache = M.computeComfort(state, DATA);
  state.resources.comfort = state._comfortCache;
  if (state._comfortCache > state.stats.bestComfort) state.stats.bestComfort = state._comfortCache;

  const rt = runtimeMult(state);

  // 2) snapshot tier production, then apply (no intra-tick feedback)
  const prod = [];
  for (let k = 0; k < DATA.generators.length; k++) prod[k] = M.tierProd(state, k) * rt;

  let cashGain = prod[0] * dt;                    // D1 → cash
  for (let k = 1; k < DATA.generators.length; k++) {
    state.generators[k - 1].count += prod[k] * dt; // D_k → D_{k-1}
  }

  // 3) savvy passive income (sqrt-scaled), crypto-path perk ×1.3 when invested
  const cryptoPerk = 1 + 0.3 * Math.sign(state.paths.crypto.points);
  cashGain += M.savvyPassive(state) * cryptoPerk * dt;

  state.resources.cash += cashGain;
  state.stats.lifetimeCash += cashGain;
  state.stats.lifetimeCashThisTree += cashGain;

  // 4) clout (vlogger) with combo decay
  decayCombo(state, dt);
  const vloggerPerk = 1 + 0.25 * Math.sign(state.paths.vlogger.points);
  const magnetic = 1 + 0.1 * (state.ascension.tree.magnetic || 0);
  const cloutRate = C.CLOUT.contentRate
    * (1 + C.CLOUT.charismaBoost * state.skills.charisma.level)
    * state._combo * vloggerPerk * magnetic
    * (1 + state.paths.vlogger.points * 0.05);
  state.resources.clout += cloutRate * dt;

  // 5) skill XP trickle (idle growth; training is the main driver)
  trickleXp(state, cashGain, dt);
  refreshSkillLevels(state);

  // 6) unlocks + story
  checkUnlocks(state);
  checkStory(state);
}

function decayCombo(state, dt) {
  const span = C.CLOUT.comboMax - 1;
  state._combo = Math.max(1, (state._combo ?? 1) - (span / C.CLOUT.comboDecaySec) * dt);
}

function trickleXp(state, cashGain, dt) {
  const s = state.skills;
  s.charisma.xp += cashGain * 0.02;
  s.comms.xp    += cashGain * 0.015;
  s.savvy.xp    += cashGain * 0.012;
  s.taste.xp    += cashGain * 0.006;
  s.body.xp     += state._comfortCache * dt * 0.02;
}

function refreshSkillLevels(state) {
  for (const s of DATA.skills) {
    const base = state.ascension.tree.ageless ? 5 * state.ascension.tree.ageless : 0;
    const magnetic = (s.id === 'charisma' && state.ascension.tree.magnetic) ? 2 * state.ascension.tree.magnetic : 0;
    state.skills[s.id].level = M.levelFromXp(state.skills[s.id].xp) + (s.id === 'body' ? base : 0) + magnetic;
  }
}

// ---------- unlocks ----------
export function checkUnlocks(state) {
  // reveal higher income tiers by lifetime-cash threshold
  for (let k = 1; k < DATA.generators.length; k++) {
    if (!state.generators[k].unlocked && state.stats.lifetimeCash >= C.GEN.base[k] * 0.4) {
      state.generators[k].unlocked = true;
      notify(state, 'unlock', `New income tier unlocked: ${DATA.generators[k].name}`);
    }
  }
}

// ---------- story ----------
function reqMet(state, r) {
  if (!r) return true;
  if (r.comfort !== undefined && state._comfortCache < r.comfort) return false;
  if (r.accTier !== undefined && state.accommodation.tier < r.accTier) return false;
  if (r.charisma !== undefined && state.skills.charisma.level < r.charisma) return false;
  if (r.body !== undefined && state.skills.body.level < r.body) return false;
  if (r.taste !== undefined && state.skills.taste.level < r.taste) return false;
  if (r.ascensions !== undefined && state.ascension.count < r.ascensions) return false;
  if (r.legacy !== undefined && state.resources.legacy < r.legacy) return false;
  return true;
}
export function checkStory(state) {
  for (const beat of DATA.story) {
    if (state.story.seen.includes(beat.id)) continue;
    if (reqMet(state, beat.requires)) {
      state.story.seen.push(beat.id);
      state.story.beat = Math.max(state.story.beat, beat.id);
      notify(state, 'story', `📖 Beat ${beat.id}: ${beat.title}`);
    }
  }
}
export function applyStoryChoice(state, beatId, set) {
  const beat = DATA.story.find(b => b.id === beatId);
  if (!beat || !beat.choice) return false;
  state.story.branch = set;
  state.story.flags['branch_' + set] = true;
  if (state.paths[set]) state.paths[set].points += 5;
  notify(state, 'story', `Path chosen: ${set}`);
  return true;
}

// ---------- purchases ----------
export function genCost(state, k, qty) {
  return bulkCost(C.GEN.base[k], C.GEN.growth[k], state.generators[k].bought, qty) * M.commsCostMult(state);
}
export function genMaxQty(state, k) {
  const budget = state.resources.cash / M.commsCostMult(state);
  return maxAffordable(C.GEN.base[k], C.GEN.growth[k], state.generators[k].bought, budget);
}
export function buyGenerator(state, k, qty) {
  if (qty === 'max') qty = genMaxQty(state, k);
  qty = Math.max(0, Math.floor(qty));
  if (qty <= 0) return false;
  const cost = genCost(state, k, qty);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.generators[k].count += qty;
  state.generators[k].bought += qty;
  return true;
}

export function genUpgradeCost(state, k) {
  return C.GEN.base[k] * 50 * Math.pow(8, state.generators[k].upgrades) * M.commsCostMult(state);
}
export function buyGenUpgrade(state, k) {
  const cost = genUpgradeCost(state, k);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.generators[k].upgrades++;
  return true;
}

export function amenityData(id) { return DATA.amenities.find(a => a.id === id); }
export function amenityCost(state, id) {
  const a = amenityData(id); const lvl = state.amenities[id].level;
  const g = a.costGrowth || C.AMENITY.growthDefault;
  return a.costBase * Math.pow(g, lvl) * M.commsCostMult(state);
}
export function amenityUnlocked(state, id) {
  return state._comfortCache >= (amenityData(id).unlockComfort || 0) || state.amenities[id].level > 0;
}
export function buyAmenity(state, id) {
  if (!amenityUnlocked(state, id)) return false;
  const cost = amenityCost(state, id);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.amenities[id].level++;
  state._comfortCache = M.computeComfort(state, DATA);
  return true;
}

export function trainingData(id) { return DATA.training.find(t => t.id === id); }
export function trainingCost(state, id) {
  const t = trainingData(id);
  return t.costBase * Math.pow(t.costGrowth, state.training[id].bought) * M.commsCostMult(state);
}
export function buyTraining(state, id) {
  const t = trainingData(id);
  const cost = trainingCost(state, id);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.training[id].bought++;
  state.skills[t.skill].xp += t.xp;
  refreshSkillLevels(state);
  return true;
}

export function pathData(id) { return DATA.paths.find(p => p.id === id); }
export function pathCost(state, id) {
  const p = pathData(id);
  return p.focusCostBase * Math.pow(p.focusCostGrowth, state.paths[id].focusBought) * M.commsCostMult(state);
}
export function buyPathFocus(state, id) {
  const cost = pathCost(state, id);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.paths[id].focusBought++;
  state.paths[id].points++;
  return true;
}

export function nextAccTier(state) { return state.accommodation.tier + 1; }
export function accCost(state) {
  const t = nextAccTier(state);
  return M.accScore(t) * C.ACC.cashMult * M.commsCostMult(state);
}
export function accUnlocked(state) {
  const t = nextAccTier(state);
  if (t >= DATA.accommodation.length) return false;
  return state._comfortCache >= M.accUnlockComfort(t);
}
export function buyAccommodation(state) {
  const t = nextAccTier(state);
  if (!accUnlocked(state)) return false;
  const cost = accCost(state);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.accommodation.tier = t;
  state.accommodation.owned.push(t);
  state._comfortCache = M.computeComfort(state, DATA);
  notify(state, 'unlock', `🏨 Upgraded to: ${DATA.accommodation[t].name}`);
  return true;
}

// ---------- clicker (optional; never the fastest path) ----------
export function click(state) {
  const perSec = M.tierProd(state, 0) + M.savvyPassive(state);
  const gain = Math.max(1, perSec * 0.10);
  state.resources.cash += gain;
  state.stats.lifetimeCash += gain;
  state.stats.lifetimeCashThisTree += gain;
  state.stats.totalClicks++;
  const boost = C.CLOUT.comboPerClick * (1 + 0.15 * (state.ascension.tree.athletes_frame || 0));
  state._combo = Math.min(C.CLOUT.comboMax, (state._combo ?? 1) + boost);
  return gain;
}

// ---------- offline / away ----------
export function applyOffline(state, elapsedMs) {
  if (!state.settings.offlineEnabled || elapsedMs <= 0) return null;
  const capH = C.OFFLINE_CAP_H + 2 * (state.ascension.tree.iron_const || 0);
  const cappedMs = Math.min(elapsedMs, capH * 3600 * 1000);
  const before = { cash: state.resources.cash, clout: state.resources.clout };
  const total = cappedMs / 1000;
  const step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) tick(state, step);
  return {
    seconds: total,
    cash: state.resources.cash - before.cash,
    clout: state.resources.clout - before.clout,
    capped: elapsedMs > cappedMs,
  };
}
