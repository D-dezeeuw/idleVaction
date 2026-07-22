// state.js — canonical game state + save/load/migrate/export. Plain JSON only.
import { CONFIG as C } from './config.js';
import { DATA } from './data/index.js';
import { bankCapAt, availableSlots } from './math.js';

// staff slice (E19 butler + E20 household): one entry per DATA.staff role, all UNHIRED so the
// harness (which never hires) sees payroll 0 and L_staff 1 — the fitted island cannot move.
function newStaffSlice() {
  const staff = {};
  DATA.staff.forEach(def => {
    staff[def.id] = { hired: false, level: 0, morale: 100, tickAccum: 0, totalSpent: 0, totalWages: 0,
      // E23: assignedTo binds an estate role to a grounds cluster kind (or 'synergy'); null for
      // household roles and for any unhired estate role until hireStaff seeds it from def.automates.
      assignedTo: null,
      lastActions: [], policy: { autoBuy: false, autoCollect: false, budgetFrac: 0.25, minRoi: 2,
        categories: def.categories.slice() } };
  });
  return staff;
}

// property slice (E22 owned property): one entry per DATA.property, all UNOWNED so the harness
// (which never buys a deed) sees propertyScore 0 and ownerPrideMult 1 — the fitted island cannot
// move. `upgrades` is a sparse rank map (omit rank-0 to keep the save small, S9-T4).
function newPropertySlice() {
  const property = {};
  DATA.property.forEach(def => { property[def.id] = { owned: false, upgrades: {} }; });
  return property;
}

// lineage slice (E25-A "The Family Album"): the current character + the album of retired ancestors.
// Purely cosmetic bookkeeping (name/pronoun/generation/album) — NEVER read by any income path. name
// starts empty (copy falls back to "you" until the player names the character at the bus stop).
export function newLineage() {
  return { name: '', pronoun: 'they', generation: 1, album: [] };
}

// island buildings slice (E28): one entry per DATA.buildings, count 0. Guest income + upkeep only
// run once the island is owned, so a fresh game and the harness (never buys the island) are unmoved.
function newBuildingSlice() {
  const b = {};
  DATA.buildings.forEach(def => { b[def.id] = { count: 0 }; });
  return b;
}

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
  // crypto (E13 "Money Works While You Tan"): holdings/hedges start empty/unbought.
  // buyCoin/buyHedge (engine.js) are the ONLY way in, so a fresh game — and the
  // harness/selftest playStep, which never call either — are completely unaffected.
  const cryptoHoldings = {};
  DATA.crypto.coins.forEach(c => { cryptoHoldings[c.id] = 0; });
  const cryptoHedges = {};
  DATA.crypto.hedges.forEach(h => { cryptoHedges[h.id] = false; });
  // collections (E14 "Acquired Taste"): flat-by-id (the doc-comment in data/collections.js
  // mandates flat indexing — the epic's nested art/wine shape is SUPERSEDED by flat-by-id).
  // Every art+wine asset starts unowned: count 0, boughtValue 0 (total cash paid, accumulated),
  // age 0 (game-seconds held, advanced in engine.tick). buyAsset/sellAsset (engine.js) are the
  // ONLY way in — a fresh game and the committed-vlogger harness never touch them, so
  // connoisseurActive stays false and the fitted island time cannot move. RUN-SCOPED: the
  // ascension hard reset (prestige.ascend's Object.assign(state, newGame())) wipes them with
  // the rest of the run — the keep-list needs no change (they are not in it).
  const collections = {};
  for (const arr of [DATA.collections.art, DATA.collections.wine]) {
    for (const a of arr) collections[a.id] = { count: 0, boughtValue: 0, age: 0 };
  }
  // vehicles (E15 "Keys to the Coupe"): the garage. owned[id]={count} for every car id;
  // equipped is the list of equipped ids (Σ slotCost ≤ availableSlots, enforced by
  // engine.equipCar — never here); garageSlots is the tier-11 garage-wing bonus;
  // upkeepAccrued is the repossession grace timer (game-seconds of continuously-unmet
  // upkeep). buyCar/equipCar (engine.js) are the ONLY way in — a fresh game and the
  // committed-vlogger harness never touch them, so logisticsActive stays false, fleetUpkeep
  // 0, _logiCache 1, and the fitted island time cannot move. RUN-SCOPED: the ascension hard
  // reset (prestige.ascend's Object.assign(state, newGame())) wipes them with the rest of
  // the run — the keep-list deliberately excludes it, so every life re-buys its fleet.
  const vehiclesOwned = {};
  DATA.vehicles.forEach(c => { vehiclesOwned[c.id] = { count: 0 }; });
  // boats + pre-staff crew (E16 "Sea Legs"): owned counts by id; boatSlots is the running sum
  // of owned boats' slotBonus (engine.buyBoat maintains it, read by math.availableSlots).
  const boatsOwned = {};
  DATA.boats.forEach(b => { boatsOwned[b.id] = { count: 0 }; });
  const crewOwned = {};
  DATA.crew.forEach(c => { crewOwned[c.id] = { count: 0 }; });
  const jetsOwned = {};
  DATA.jets.forEach(j => { jetsOwned[j.id] = { count: 0 }; });

  return {
    version: C.SAVE_VERSION,
    meta: { createdAt: 0, lastSaved: 0, lastSeen: 0, playtimeMs: 0, runStartSec: 0 },
    // energy (E10 "Body & Soul"): starts at a full tank (base energyMax at Body level 0)
    // — an optional clicker-fuel resource, see config.ENERGY / math.energyMax.
    resources: { cash: 15, comfort: 0, clout: 0, legacy: 0, energy: C.ENERGY.base },
    generators, amenities, skills, training, paths, npcsMet, destinations, content, collections,
    vehicles: { owned: vehiclesOwned, equipped: [], garageSlots: 0, upkeepAccrued: 0,
      boats: boatsOwned, crew: crewOwned, boatSlots: 0,
      jets: jetsOwned, jetSlots: 0 },
    // crypto portfolio (E13): holdings/hedges own state; market is the seeded scheduler's
    // own state — phase starts 'calm', mult 1, cursor 0. engine.marketTick is a no-op
    // until crypto path points are spent or a coin is held (see config.MARKET's comment
    // and engine's cryptoActive gate), so neither section ever advances for a fresh game
    // or the harness — the fitted ~8h26m island time cannot move.
    crypto: { holdings: cryptoHoldings, hedges: cryptoHedges, lifetimeYield: 0 },
    // bank account (wallet cap): tier indexes data/bank.js rows; capacity comes from
    // config.BANK via math.bankCapAt. Starts at the Soggy Money Belt. Run-scoped —
    // ascension resets it with the rest of the run (prestige.ascend's keep-list
    // deliberately excludes it), so every run's offline inflow is paced from the
    // bottom of the ladder again. See config.BANK's comment / docs/math-proof.md §11.
    bank: { tier: 0 },
    market: { seed: C.MARKET.seed, cursor: 0, phase: 'calm', eventId: null, mult: 1,
      nextEventT: 0, expiresAtSec: 0, eventLog: [], totalEvents: 0 },
    // homeBase (E27): 'mainland' until the private island is bought, then 'island' — a permanent
    // meta fact (carried across ascension by prestige.ascend) even as the run's tier resets.
    accommodation: { tier: 0, owned: [0], homeBase: 'mainland' },
    // island (E27 "The Island Listing"): the one-way mega-purchase. owned/relocated survive ascension
    // (meta keys); L_island reads island.owned. false ⇒ ×1, so the harness (never buys it) is unmoved.
    // buildings (E28 "Building Paradise"): the resort you erect on the island — a { <id>: {count} } map
    // seeded per DATA.buildings, all 0. Guest income + upkeep only run when island.owned (harness-neutral).
    island: { owned: false, purchasedAt: null, relocated: false, buildings: newBuildingSlice() },
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
    // staff (E19 "At Your Service"): the butler starts UNHIRED, so payroll is 0 and nothing is
    // automated — a fresh game and the harness (which never hires) are unaffected, the fitted
    // island time cannot move. policy mirrors the concierge's dials (budgetFrac/minRoi) + the
    // butler's own toggles. morale is a seed for E20 (the household). Run-scoped? NO — staff is a
    // meta convenience like settings; but to stay safe with ascension it's rebuilt by newGame()
    // and NOT in the keep-list, so each life re-hires (consistent with the run-scoped concierge).
    staff: newStaffSlice(),
    // owned property (E22): the rent→own flip. Run-scoped like staff — rebuilt by newGame(), NOT in
    // the ascension keep-list, so each life re-buys deeds (a hard reset zeroes ownership, S4-T7).
    property: newPropertySlice(),
    ascension: { count: 0, legacyBanked: 0, legacySpent: 0, tree: {} },
    // lineage (E25-A): cosmetic retirement/album bookkeeping. Carried across ascension by
    // prestige.ascend (the keep-list) — never read by any income path.
    lineage: newLineage(),
    story: { beat: 1, seen: [1], branch: 'neutral', flags: {} },
    // ui.bulkMode (E03-S1-T6): the ×1/×10/max buy-quantity toggle, persisted so the
    // choice survives reload instead of living in a transient ui.js module var.
    ui: { bulkMode: 1 },
    settings: { gameSpeed: C.DEFAULT_GAME_SPEED, offlineEnabled: true, debug: false },
    stats: { lifetimeCash: 0, lifetimeCashThisTree: 0, bestComfort: 0, totalClicks: 0, runSec: 0,
      tapWindowSec: 0, tapWindowCount: 0, overflowLost: 0 },
    // transient caches (not strictly needed in save, recomputed each tick). _exclCache is
    // the connoisseur exclusivity score (E14) — a derived cache like _comfortCache, so no
    // persisted state.exclusivity is needed (S9-T1 satisfied by the cache); backfill adds it
    // to old saves at 0, and engine.tick recomputes it every tick (0 while inactive).
    // _logiCache (E15) is the per-tick logistics × (like _destCache, a flat global multiplier),
    // so its NEUTRAL value is 1 — engine.tick recomputes it every tick via logisticsMult
    // (exactly 1 while nothing is equipped). Seeded to 1 (NOT 0) so any tierMultiplier read
    // before the first tick multiplies by the identity, never zeroes income.
    _comfortCache: 0, _destCache: 1, _combo: 1, _comboTimer: 0, _pathBonus: {}, _exclCache: 0, _logiCache: 1, _staffMult: 1,
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
  // a save that predates the crypto market entirely (no `market` key at all) — captured
  // BEFORE backfill() below fills it in with the shared default seed (E13-S9-T2).
  const hadMarket = s.market !== undefined;
  // fill any missing keys from a fresh game (forward-compat safety net) — this alone
  // already backfills pre-E12 saves' missing `content`/`sponsors` sections wholesale
  // (E12-S9-T5), the same generic mechanism every prior epic's new fields relied on —
  // and now backfills `crypto`/`market` (E13-S9-T1/T10) the same way, at level
  // 0/unbought/calm, no NaN possible.
  s = backfill(s, newGame());
  // combo floors to the idle baseline on every load (E12-S9-T2/T6): there are no
  // active taps while away, so a mid-combo snapshot from the moment of the last save
  // would otherwise hand back an unearned temporary boost.
  s._combo = 1; s._comboTimer = 0;
  // reseed the market from THIS save's own creation time (E13-S9-T2) rather than
  // leaving every migrated save on the same shared default seed — the first (and so
  // far only) seeded-RNG state the codebase ships, so no other field has this pattern.
  if (!hadMarket) s.market.seed = (s.meta.createdAt || Date.now()) >>> 0;
  // bank grandfathering: a save from before the wallet cap existed (backfilled to
  // tier 0 above) may already hold far more cash than the Soggy Money Belt allows.
  // The inflow clamp (engine.gainCash) never confiscates, but it WOULD silently
  // freeze that save's income until it spent back under the cap — so instead grant
  // the smallest account whose capacity covers the cash they already legitimately
  // earned. Never lowers a tier, never touches saves already within their cap.
  while (s.bank.tier < C.BANK.tiers - 1 && s.resources.cash > bankCapAt(s.bank.tier)) s.bank.tier++;
  // vehicles (E15-S9-T10/S10-T1): backfill above already added the whole `vehicles` slice to
  // a pre-E15 save, but a same-version save that predates a newly-added car row would be
  // missing that id — add any missing owned slot at count 0 (no NaN) — and a hand-edited or
  // cross-version save could carry an over-capacity / not-owned equipped list, so clamp it to
  // the current slot capacity on load (the equipped list can NEVER exceed availableSlots after
  // a migrate). upkeepAccrued (the repossession grace timer) is coerced to a finite ≥0.
  if (s.vehicles) {
    s.vehicles.owned ||= {};
    for (const c of DATA.vehicles) if (!s.vehicles.owned[c.id]) s.vehicles.owned[c.id] = { count: 0 };
    if (!(s.vehicles.garageSlots >= 0)) s.vehicles.garageSlots = 0;
    if (!(s.vehicles.upkeepAccrued >= 0)) s.vehicles.upkeepAccrued = 0;
    s.vehicles.equipped = clampEquippedVehicles(s);
    // boats + crew (E16): backfill missing owned slots at count 0; recompute boatSlots from the
    // owned fleet so a pre-E16 (or hand-edited) save can't carry a stale/absent slot bonus.
    s.vehicles.boats ||= {};
    for (const b of DATA.boats) if (!s.vehicles.boats[b.id]) s.vehicles.boats[b.id] = { count: 0 };
    s.vehicles.crew ||= {};
    for (const c of DATA.crew) if (!s.vehicles.crew[c.id]) s.vehicles.crew[c.id] = { count: 0 };
    s.vehicles.boatSlots = DATA.boats.reduce((n, b) => n + (s.vehicles.boats[b.id]?.count || 0) * b.slotBonus, 0);
    // jets (E17): backfill + recompute jetSlots from the owned fleet.
    s.vehicles.jets ||= {};
    for (const j of DATA.jets) if (!s.vehicles.jets[j.id]) s.vehicles.jets[j.id] = { count: 0 };
    s.vehicles.jetSlots = DATA.jets.reduce((n, j) => n + (s.vehicles.jets[j.id]?.count || 0) * j.slotBonus, 0);
  }
  return s;
}

// Drop any equipped car that isn't actually owned, then keep equipping (in list order) only
// while Σ slotCost stays within availableSlots — so a loaded save's equipped fleet can never
// exceed capacity (E15-S9-T10). Pure over the passed state.
function clampEquippedVehicles(s) {
  const eq = Array.isArray(s.vehicles.equipped) ? s.vehicles.equipped : [];
  const carById = id => DATA.vehicles.find(c => c.id === id);
  const slots = availableSlots(s);
  let used = 0;
  const kept = [];
  for (const id of eq) {
    const car = carById(id);
    if (!car || (s.vehicles.owned[id]?.count || 0) <= 0) continue;
    if (used + car.slotCost <= slots) { used += car.slotCost; kept.push(id); }
  }
  return kept;
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
