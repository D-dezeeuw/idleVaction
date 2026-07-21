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
  // content (E12 "Lights, Camera, Clout"): the content-tier chain — level (bought with
  // cash, produces Clout/sec) + boosts (bought with Clout, the Clout sink). See data/
  // content.js / engine.buyContent / engine.buyContentBoost.
  const content = {};
  DATA.content.forEach(c => { content[c.id] = { level: 0, boosts: 0 }; });

  return {
    version: C.SAVE_VERSION,
    meta: { createdAt: 0, lastSaved: 0, lastSeen: 0, playtimeMs: 0, runStartSec: 0 },
    // energy (E10 "Body & Soul"): starts at a full tank (base energyMax at Body level 0)
    // — an optional clicker-fuel resource, see config.ENERGY / math.energyMax.
    resources: { cash: 15, comfort: 0, clout: 0, legacy: 0, energy: C.ENERGY.base },
    generators, amenities, skills, training, paths, npcsMet, destinations, content,
    accommodation: { tier: 0, owned: [0] },
    // transport (E04-S1): no ride bought yet — a null activeSlot means no speed bonus
    // and no upkeep drain (engine.tick/engine.destCost both check for it).
    transport: { owned: [], activeSlot: null },
    // concierge (E11 "Five-Star Frame of Mind" — the first automation seed): OFF by
    // default (on: C.CONCIERGE.defaultOn === false) so a fresh game — and the harness,
    // which never flips it on — are completely unaffected; see config.CONCIERGE's
    // comment and engine.conciergeTick/checkConciergeReveal. budgetFrac/reserveFloor/
    // whitelist are the player's own live-editable copies of the config defaults (the
    // Concierge Desk's dial/checkboxes write here, never to config.js). tickAccum paces
    // the policy at CONCIERGE.intervalSec regardless of tick granularity (online small
    // dt or offline macro-step dt) — see engine.conciergeTick. lastActions/totalBought/
    // totalSpent are the transparency log the desk renders (E11-S3-T5).
    concierge: {
      on: C.CONCIERGE.defaultOn,
      budgetFrac: C.CONCIERGE.budgetFrac,
      reserveFloor: C.CONCIERGE.reserveFloor,
      whitelist: [...C.CONCIERGE.whitelist],
      lastActions: [],
      totalBought: 0,
      totalSpent: 0,
      tickAccum: 0,
    },
    // sponsors (E12 "Lights, Camera, Clout"): OPT-IN, timed Clout multipliers. `active`
    // is a SINGLE slot (never an array) — that's what makes deals non-stacking by
    // construction, not just by convention. `offer` is the current pending deal id (or
    // null); `cooldowns` maps a deal id to the runSec it becomes offerable again.
    // Nothing here auto-applies (see engine.tickSponsors/acceptSponsor) — a fresh
    // newGame() (and the harness, which never calls acceptSponsor) always has
    // active:null, so the fitted island time cannot move.
    sponsors: { active: null, offer: null, offerCycle: 0, nextOfferAtSec: 0, cooldowns: {}, totalExpired: 0 },
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
  // fill any missing keys from a fresh game (forward-compat safety net) — this alone
  // already backfills pre-E12 saves' missing `content`/`sponsors` sections wholesale
  // (E12-S9-T5), the same generic mechanism every prior epic's new fields relied on.
  s = backfill(s, newGame());
  // combo floors to the idle baseline on every load (E12-S9-T2/T6): there are no
  // active taps while away, so a mid-combo snapshot from the moment of the last save
  // would otherwise hand back an unearned temporary boost.
  s._combo = 1; s._comboTimer = 0;
  return s;
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
