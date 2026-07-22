// prestige.js — ascension (reset for Legacy) + the permanent skill tree.
import { CONFIG as C } from './config.js';
import { DATA } from './data/index.js';
import * as M from './math.js';
import { newGame } from './state.js';

export function canAscend(state) {
  return state.stats.runSec >= C.ASCEND_MIN_RUN_SEC && M.legacyGain(state) >= 1;
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
export function ascend(state) {
  if (!canAscend(state)) return false;
  const gained = legacyPreview(state);
  state.resources.legacy += gained;
  state.ascension.count++;
  state.ascension.legacyBanked += M.legacyGain(state); // bank raw so re-ascend doesn't double-pay

  const fresh = newGame();
  fresh.resources.legacy = state.resources.legacy;
  fresh.ascension = state.ascension;
  fresh.settings = state.settings;
  fresh.stats.lifetimeCashThisTree = state.stats.lifetimeCashThisTree; // √-prestige accounting only
  fresh.meta = state.meta;
  fresh.meta.runStartSec = 0;

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
  return Math.floor(C.TREE.nodeBase * Math.pow(C.TREE.nodeGrowth, treeRank(state, id)));
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

export function respec(state) {
  // refund all spent Legacy, clear tree (free before layer-2; a fee could apply later)
  state.resources.legacy += state.ascension.legacySpent;
  state.ascension.legacySpent = 0;
  state.ascension.tree = {};
  C.MILESTONE_STEP = 10;
  return true;
}
