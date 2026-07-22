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
  state.ascension.count++;
  state.ascension.legacyBanked += M.legacyGain(state); // bank raw so re-ascend doesn't double-pay

  const fresh = newGame();
  fresh.resources.legacy = state.resources.legacy;
  fresh.ascension = state.ascension;
  fresh.settings = state.settings;
  fresh.stats.lifetimeCashThisTree = state.stats.lifetimeCashThisTree; // √-prestige accounting only
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
