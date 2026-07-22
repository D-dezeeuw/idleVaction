// prestige.js — ascension (reset for Legacy) + the permanent skill tree.
import { CONFIG as C } from './config.js';
import { DATA } from './data/index.js';
import * as M from './math.js';
import { newGame } from './state.js';

export function canAscend(state) {
  return state.stats.runSec >= C.ASCEND_MIN_RUN_SEC && M.legacyGain(state) >= 1;
}

// ---------- lineage (E25-A "The Family Album") ----------
// A wry Dutch name pool for the skippable name prompt (E25-A-T2). Purely cosmetic.
export const DUTCH_NAMES = ['Willem', 'Saskia', 'Joost', 'Femke', 'Bram', 'Anouk', 'Sven', 'Marieke', 'Daan', 'Lieke'];
// pick a default name deterministically from the generation (no RNG — reload never rewrites it).
export function defaultName(generation) { return DUTCH_NAMES[(Math.max(1, generation) - 1) % DUTCH_NAMES.length]; }
// Sanitize a player-entered name: strip markup/control chars, collapse whitespace, cap length. Never
// trust raw input in HTML — the UI still escapes, but this is the first line of defence (E25-A-T2/T10).
export function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[<>&"'`]/g, '').replace(/[\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, C.LINEAGE.nameMaxLen);
}
// Name interpolation (E25-A-T8): replace {name} with the character's name, or a safe "you" fallback
// so every beat/notification reads correctly whether or not the player ever named anyone.
export function withName(text, lineage) {
  const name = (lineage && lineage.name) ? lineage.name : 'you';
  return String(text).replace(/\{name\}/g, name);
}
// Epitaph generator (E25-A-T6): a PURE function from a retiree's run facts to one wry line.
// Deterministic — seeded by generation, never RNG — so a reload never rewrites family history.
export function epitaph(r) {
  const branchLine = {
    neutral:     'kept it simple',
    traveler:    'chased every horizon',
    vlogger:     'chased the lens',
    crypto:      'rode the market',
    connoisseur: 'acquired the taste',
  }[r.branch] || 'chased the sun';
  const place = (DATA.accommodation[r.peakTier] && DATA.accommodation[r.peakTier].name) || 'the road';
  const flourish = [
    'Retired warm, and dry, at last.',
    'Never once missed the rain.',
    'Left the poncho to the next one.',
    'Died as they lounged: unbothered.',
    'The tan outlived the doubts.',
  ][Math.max(0, r.generation) % 5];
  const nm = r.name || 'A tourist';
  return `Gen ${r.generation} · ${nm} · ${branchLine}, reached ${place}. ${flourish}`;
}
// Name (or rename) the current character at the bus stop (E25-A-T2). Sanitizes the raw input; an
// empty result leaves the name unset (copy falls back to "you"). Cosmetic — touches no income path.
export function setLineageName(state, raw) {
  if (!state.lineage) state.lineage = { name: '', pronoun: 'they', generation: 1, album: [] };
  state.lineage.name = sanitizeName(raw);
  return state.lineage.name;
}
// Build the retirement record for the character being retired (pure snapshot of run facts).
export function makeRetiree(state) {
  const L = state.lineage || {};
  const r = {
    name: L.name || '',
    pronoun: L.pronoun || 'they',
    generation: L.generation || 1,
    branch: state.story.branch,
    peakTier: state.accommodation.tier,
    peakComfort: Math.round(state.stats.bestComfort || 0),
    runSec: Math.round(state.stats.runSec || 0),
  };
  r.epitaph = epitaph(r);
  return r;
}

export function legacyPreview(state) {
  const investorMult = Math.pow(1.15, state.ascension.tree.legacy_investor || 0);
  return Math.floor(M.legacyGain(state) * investorMult);
}

// HARD reset: the ONLY things that cross an ascension are the abilities bought with
// ascension points — state.ascension (the tree + count + banked-Legacy accounting) and
// the unspent Legacy itself — plus non-power bookkeeping (settings, meta timestamps,
// and stats.lifetimeCashThisTree, which the √-prestige payout telescopes on and which
// grants no in-run power by itself). EVERYTHING else restarts at zero, deliberately
// (docs/math-proof.md §12): story (beats/branch/flags — you re-live the trip and may
// pick a different path), run stats INCLUDING stats.lifetimeCash (so Savvy's
// √lifetimeCash passive and checkUnlocks' lifetime-cash tier reveals re-pace from
// nothing — persisting it was measured to collapse an ascended run to ~11 minutes),
// the bank ladder, destinations, crypto, concierge. "Later runs feel plusher" now
// flows ONLY through tree abilities (Ageless/Magnetic/Head Start…), never through
// the ascension count itself.
export function ascend(state, heir) {
  if (!canAscend(state)) return false;
  // E25-A: retire the current character onto the family album BEFORE the reset (a pure snapshot).
  const retiree = makeRetiree(state);
  const gained = legacyPreview(state);
  state.resources.legacy += gained;
  // E29: record cumulative Legacy ever earned (the √-base for the Legend layer). Survives ascension.
  state.stats.totalLegacyEverEarned = (state.stats.totalLegacyEverEarned || 0) + gained;
  state.ascension.count++;
  state.ascension.legacyBanked += M.legacyGain(state); // bank raw so re-ascend doesn't double-pay

  const fresh = newGame();
  fresh.resources.legacy = state.resources.legacy;
  fresh.ascension = state.ascension;
  fresh.settings = state.settings;
  fresh.stats.lifetimeCashThisTree = state.stats.lifetimeCashThisTree; // √-prestige accounting only
  fresh.stats.totalLegacyEverEarned = state.stats.totalLegacyEverEarned; // E29: the Legend √-base survives
  fresh.legend = state.legend;      // E29: the Legend layer is meta — it survives ascension untouched
  fresh.ngPlus = state.ngPlus;      // E29: the NG+ cycle counter is meta
  fresh.achievements = state.achievements; // E30: the trophy record is permanent (survives every reset)
  fresh.meta = state.meta;
  fresh.meta.runStartSec = 0;
  // E25-A lineage keep-list: carry the album forward (append the retiree, oldest compacted past the
  // cap) and start the heir one generation later. Cosmetic bookkeeping only — no income path reads
  // it, so it cannot affect balance. `heir` is the optional {name, pronoun} from the UI's post-ascend
  // "choose your heir" step; absent (e.g. the tests / a skipped prompt) ⇒ a wry default name.
  const album = ((state.lineage && state.lineage.album) || []).slice();
  album.push(retiree);
  while (album.length > C.LINEAGE.albumCap) album.shift();   // oldest compacted (S9/A-T1)
  const nextGen = ((state.lineage && state.lineage.generation) || 1) + 1;
  fresh.lineage = {
    name: sanitizeName((heir && heir.name) || '') || defaultName(nextGen),
    pronoun: (heir && heir.pronoun) || 'they',
    generation: nextGen,
    album,
  };
  // E27 island META keys: the private island is a permanent achievement — its ownership + the
  // 'island' home base survive ascension (the run's accommodation.tier still resets to the shed).
  // So the L_island relocation reward persists across runs; the harness never owns it (0 legacy).
  if (state.island && state.island.owned) {
    fresh.island = { owned: true, purchasedAt: state.island.purchasedAt, relocated: state.island.relocated };
    fresh.accommodation.homeBase = 'island';
  }

  // apply "Head Start": begin at higher accommodation tier
  const head = state.ascension.tree.head_start || 0;
  if (head > 0) {
    fresh.accommodation.tier = Math.min(head, DATA.accommodation.length - 1);
    fresh.accommodation.owned = Array.from({ length: fresh.accommodation.tier + 1 }, (_, i) => i);
  }

  // milestone step from Faster Metabolism (mutates the live config knob)
  C.MILESTONE_STEP = 10 - (state.ascension.tree.faster_metab || 0);

  Object.assign(state, fresh);
  state._notifications = [{ type: 'ascend', text: `✨ Ascended! +${gained} Legacy (total ${state.resources.legacy}).` }];
  return true;
}

// ---------- skill tree ----------
export function treeNode(id) { return DATA.tree.find(n => n.id === id); }
export function treeRank(state, id) { return state.ascension.tree[id] || 0; }
export function treeCost(state, id) {
  // E29: the Legend 'treeDiscount' perks cheapen the tree (Quick Study / Muscle Memory). Discount is
  // 0 with no perks bought (the harness/tests), so treeCost is bit-identical to before.
  const disc = legendTreeDiscount(state);
  return Math.floor(C.TREE.nodeBase * Math.pow(C.TREE.nodeGrowth, treeRank(state, id)) * (1 - disc));
}
export function treeRequiresMet(state, id) {
  const n = treeNode(id);
  return (n.requires || []).every(req => {
    const [rid, rank] = req.split(':');
    return treeRank(state, rid) >= Number(rank);
  });
}
export function canBuyNode(state, id) {
  const n = treeNode(id);
  return treeRank(state, id) < n.maxRank
      && treeRequiresMet(state, id)
      && state.resources.legacy >= treeCost(state, id);
}
export function buyNode(state, id) {
  if (!canBuyNode(state, id)) return false;
  const cost = treeCost(state, id);
  state.resources.legacy -= cost;
  state.ascension.legacySpent += cost;
  state.ascension.tree[id] = treeRank(state, id) + 1;
  // some nodes take effect immediately this run
  if (id === 'faster_metab') C.MILESTONE_STEP = 10 - state.ascension.tree.faster_metab;
  return true;
}

// The Legacy cost of a full respec (E26-S4/S8). 0 before the Legend layer (E30) — a config lever,
// so shipped behaviour (a free respec that refunds exactly legacySpent) is unchanged until raised.
export function respecFee(state) { return C.TREE.respecFee || 0; }
export function respec(state) {
  // refund spent Legacy minus the respec fee (floored at 0), clear the tree, reset transient knobs.
  const refund = Math.max(0, state.ascension.legacySpent - respecFee(state));
  state.resources.legacy += refund;
  state.ascension.legacySpent = 0;
  state.ascension.tree = {};
  C.MILESTONE_STEP = 10;
  return true;
}

// ---------- Legend: the SECOND prestige layer (E29 "Empire of Leisure") ----------
// legendGain = floor(LEGEND_K·(totalLegacyEverEarned/LEGEND_SCALE)^LEGEND_EXP) − banked — the same √
// anti-runaway template one layer up. 0 for the harness (never ascends ⇒ totalLegacyEverEarned 0).
export function legendGain(state) {
  const raw = C.LEGEND_K * Math.pow((state.stats.totalLegacyEverEarned || 0) / C.LEGEND_SCALE, C.LEGEND_EXP);
  return Math.max(0, Math.floor(raw) - (state.legend?.banked || 0));
}
export function legendPreview(state) { return legendGain(state); }
export function canLegend(state) {
  return (state.ascension?.count || 0) >= C.LEGEND.minAscensions && legendGain(state) >= 1;
}
// The Legend reset (prestige-2): award Legend points, then WIPE Legacy + the permanent tree + the
// ascension accounting — a fresh climb from the shed. Legend points/perks, NG+, settings, lineage,
// the owned island, and the √-base (totalLegacyEverEarned) all SURVIVE (they are the meta layer).
export function legendReset(state) {
  if (!canLegend(state)) return false;
  const gained = legendGain(state);
  const legend = state.legend || { count: 0, points: 0, banked: 0, perks: {} };
  legend.points += gained;
  legend.banked += gained;
  legend.count += 1;

  const fresh = newGame();
  fresh.legend = legend;
  fresh.ngPlus = state.ngPlus || 0;
  fresh.settings = state.settings;
  fresh.meta = state.meta; fresh.meta.runStartSec = 0;
  fresh.stats.totalLegacyEverEarned = state.stats.totalLegacyEverEarned;   // the √-base persists
  fresh.lineage = state.lineage;                                           // family album persists
  fresh.achievements = state.achievements;                                 // E30: trophy record persists
  if (state.island && state.island.owned) {                               // the island stays owned
    fresh.island = { owned: true, purchasedAt: state.island.purchasedAt, relocated: state.island.relocated, buildings: fresh.island.buildings };
    fresh.accommodation.homeBase = 'island';
  }
  C.MILESTONE_STEP = 10;   // Legacy tree wiped ⇒ Faster Metabolism gone
  Object.assign(state, fresh);
  state._notifications = [{ type: 'ascend', text: `👑 You are a LEGEND. +${gained} Legend points — Legacy and the tree begin again, stronger.` }];
  return true;
}

// ---------- the meta-meta shop ----------
export function legendPerkDef(id) { return DATA.legendPerks.find(p => p.id === id); }
export function legendRank(state, id) { return state.legend?.perks?.[id] || 0; }
export function legendPerkCost(state, id) {
  const p = legendPerkDef(id);
  return p ? Math.floor(p.cost * Math.pow(p.growth, legendRank(state, id))) : Infinity;
}
export function canBuyLegendPerk(state, id) {
  const p = legendPerkDef(id);
  return !!p && legendRank(state, id) < p.maxRank && (state.legend?.points || 0) >= legendPerkCost(state, id);
}
export function buyLegendPerk(state, id) {
  if (!canBuyLegendPerk(state, id)) return false;
  const cost = legendPerkCost(state, id);
  state.legend.points -= cost;
  (state.legend.perks ||= {})[id] = legendRank(state, id) + 1;
  return true;
}
// Σ 'treeDiscount' perk value·rank, capped at 0.6 (never a free tree). 0 with no perks bought.
export function legendTreeDiscount(state) {
  if (!state.legend?.perks) return 0;
  let d = 0;
  for (const p of DATA.legendPerks) if (p.kind === 'treeDiscount') d += p.value * legendRank(state, p.id);
  return Math.min(0.6, d);
}

// ---------- New Game+ ----------
// Start a NG+ cycle: bump the counter, wipe the RUN (a hard reset like ascension) but keep the meta
// (legend, tree, legacy, lineage, island). The world hardens: CASH gates ×gateScale^ngPlus (see
// engine.accCostForTier via math.ngPlusGateMult), destinations reshuffle by seed, offset by a
// persistent income ×incomeMult^ngPlus (math.ngPlusIncomeMult). All neutral at ngPlus 0 (the harness).
export function startNgPlus(state) {
  if ((state.ascension?.count || 0) < 1 && !(state.island && state.island.owned)) return false;  // must be an established player
  const fresh = newGame();
  fresh.ngPlus = (state.ngPlus || 0) + 1;
  fresh.legend = state.legend;
  fresh.ascension = state.ascension;   // NG+ keeps the tree + Legacy (it hardens the world, not a prestige wipe)
  fresh.resources.legacy = state.resources.legacy;
  fresh.settings = state.settings;
  fresh.meta = state.meta; fresh.meta.runStartSec = 0;
  fresh.stats.totalLegacyEverEarned = state.stats.totalLegacyEverEarned;
  fresh.lineage = state.lineage;
  fresh.achievements = state.achievements;   // E30: trophy record persists across NG+
  if (state.island && state.island.owned) {
    fresh.island = { owned: true, purchasedAt: state.island.purchasedAt, relocated: state.island.relocated, buildings: fresh.island.buildings };
    fresh.accommodation.homeBase = 'island';
  }
  Object.assign(state, fresh);
  state._notifications = [{ type: 'ascend', text: `🔄 New Game+${state.ngPlus}. The world is harder, the rewards richer. Again — but more.` }];
  return true;
}
