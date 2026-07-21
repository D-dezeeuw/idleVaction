// state.js — canonical game state + save/load/migrate/export. Plain JSON only.
import { CONFIG as C } from './config.js';
import { DATA } from './data/index.js';

export function newGame() {
  const generators = {};
  DATA.generators.forEach((g, k) => { generators[k] = { count: 0, bought: 0, upgrades: 0, unlocked: k === 0 }; });
  const amenities = {};
  DATA.amenities.forEach(a => { amenities[a.id] = { level: 0 }; });
  const skills = {};
  DATA.skills.forEach(s => { skills[s.id] = { xp: 0, level: 0 }; });
  const training = {};
  DATA.training.forEach(t => { training[t.id] = { bought: 0 }; });
  const paths = {};
  DATA.paths.forEach(p => { paths[p.id] = { points: 0, focusBought: 0 }; });
  // npcsMet (E03-S1/S7): one flag per recurring NPC, flipped once on hostel arrival
  // (accommodation.tier >= 2). Pure flavor bookkeeping — never read by math.js.
  const npcsMet = {};
  DATA.npcs.forEach(n => { npcsMet[n.id] = false; });
  // destinations (E04-S1): the World Traveler map — every place starts unowned/unvisited.
  const destinations = {};
  DATA.destinations.forEach(d => { destinations[d.id] = { owned: false, visits: 0 }; });

  return {
    version: C.SAVE_VERSION,
    meta: { createdAt: 0, lastSaved: 0, lastSeen: 0, playtimeMs: 0, runStartSec: 0 },
    // energy (E10 "Body & Soul"): starts at a full tank (base energyMax at Body level 0)
    // — an optional clicker-fuel resource, see config.ENERGY / math.energyMax.
    resources: { cash: 15, comfort: 0, clout: 0, legacy: 0, energy: C.ENERGY.base },
    generators, amenities, skills, training, paths, npcsMet, destinations,
    accommodation: { tier: 0, owned: [0] },
    // transport (E04-S1): no ride bought yet — a null activeSlot means no speed bonus
    // and no upkeep drain (engine.tick/engine.destCost both check for it).
    transport: { owned: [], activeSlot: null },
    ascension: { count: 0, legacyBanked: 0, legacySpent: 0, tree: {} },
    story: { beat: 1, seen: [1], branch: 'neutral', flags: {} },
    // ui.bulkMode (E03-S1-T6): the ×1/×10/max buy-quantity toggle, persisted so the
    // choice survives reload instead of living in a transient ui.js module var.
    ui: { bulkMode: 1 },
    settings: { gameSpeed: C.DEFAULT_GAME_SPEED, offlineEnabled: true, debug: false },
    stats: { lifetimeCash: 0, lifetimeCashThisTree: 0, bestComfort: 0, totalClicks: 0, runSec: 0,
      tapWindowSec: 0, tapWindowCount: 0 },
    // transient caches (not strictly needed in save, recomputed each tick)
    _comfortCache: 0, _destCache: 1, _combo: 1, _comboTimer: 0,
  };
}

// --- migrations: version N-1 -> N. Applied in order. ---
const MIGRATIONS = {
  // 2: (s) => { s.someNewField = default; return s; },
};

export function migrate(s) {
  while ((s.version || 1) < C.SAVE_VERSION) {
    const next = (s.version || 1) + 1;
    const fn = MIGRATIONS[next];
    if (fn) s = fn(s);
    s.version = next;
  }
  // fill any missing keys from a fresh game (forward-compat safety net)
  return backfill(s, newGame());
}

function backfill(save, fresh) {
  for (const k of Object.keys(fresh)) {
    if (save[k] === undefined) { save[k] = fresh[k]; continue; }
    if (fresh[k] && typeof fresh[k] === 'object' && !Array.isArray(fresh[k])) {
      for (const kk of Object.keys(fresh[k])) {
        if (save[k][kk] === undefined) save[k][kk] = fresh[k][kk];
      }
    }
  }
  return save;
}

export function save(state) {
  state.meta.lastSaved = Date.now();
  state.meta.lastSeen = Date.now();
  try {
    localStorage.setItem(C.SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) { console.warn('save failed', e); return false; }
}

export function load() {
  try {
    const raw = localStorage.getItem(C.SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch (e) { console.warn('load failed', e); return null; }
}

export function exportSave(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}
export function importSave(str) {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    return migrate(obj);
  } catch (e) { return null; }
}

export function hardReset() {
  try { localStorage.removeItem(C.SAVE_KEY); } catch (e) {}
  return newGame();
}
