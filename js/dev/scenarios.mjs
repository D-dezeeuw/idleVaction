// scenarios.mjs — scripted-player strategies for the demo playthrough runner (demo.mjs).
// List them: node js/dev/demo.mjs --list
//
// A scenario is a plain object:
//   { id, name, desc, branch, cadenceSec, act(s, ctx) }
// - branch: the beat-6 crossroads choice, committed by the RUNNER (demo.mjs) right after
//   the act pass — mirroring where the harness's play() commits. The baseline scenario
//   reuses play() verbatim (it commits 'vlogger' itself), so branch stays null there and
//   the run is bit-identical to `npm run harness` (locked by selftest [106]).
// - cadenceSec: how often the simulated player "checks in" and acts. 0 = every macro-step
//   (the greedy lower bound). The engine still ticks continuously either way — cadence
//   gates DECISIONS only, which is what separates a casual player from a speedrunner.
// - act(s, ctx): one action pass over the engine's buy* surface; ctx = { t, dt, mem }.
//   ctx.mem is per-run scratch (scenario objects are shared module singletons — never
//   store run state on them).
// - ascension (optional): { when(s, ctx), spend: [nodeIds…] } — the runner ascends when
//   `when` and P.canAscend agree, then pours ALL Legacy into `spend` (priority order,
//   repeated passes until nothing is affordable). Different spend lists = the A-vs-B
//   tree experiments.
// - legend (optional): { when(s, ctx), perks: [perkIds…] } — same shape one prestige
//   layer up: legendReset + exhaustive perk spending.
import { CONFIG as C } from '../config.js';
import { DATA } from '../data/index.js';
import * as E from '../engine.js';
import * as M from '../math.js';
import * as P from '../prestige.js';
import { play } from './harness.mjs';

// ---- ROI-aware amenity test — copied from harness.mjs (private there; harness must stay
// untouched because selftest pins its exports). See the long rationale comment there.
const AMENITY_PAYBACK_HORIZON_SEC = 1800;
function amenityWorthBuying(s, a, cashRate) {
  const nextTier = s.accommodation.tier + 1;
  if (nextTier < DATA.accommodation.length && s._comfortCache < M.accUnlockComfort(nextTier)) return true;
  if (cashRate <= 0) return false;
  const dComf = a.comfort * C.COMFORT.wAmen;
  if (dComf <= 0) return false;
  const comf = s._comfortCache;
  const L = 1 + C.COMFORT.MULT * Math.log10(1 + comf / C.COMFORT.C0);
  const Lafter = 1 + C.COMFORT.MULT * Math.log10(1 + (comf + dComf) / C.COMFORT.C0);
  const gainPerSec = cashRate * (Lafter - L) / L;
  if (gainPerSec <= 0) return false;
  return E.amenityCost(s, a.id) / gainPerSec <= AMENITY_PAYBACK_HORIZON_SEC;
}

// ---- parameterized greedy core: the harness's play() ordering with budget-fraction
// knobs, a configurable path-focus target, and optional branch lanes appended. The
// branch COMMIT is deliberately absent — the runner owns it (see header).
export function makeGreedyAct({
  branch = null,
  bankFrac = 0.5, accFrac = 0.7, amenFrac = 0.3, destFrac = 0.4, transportFrac = 0.2,
  trainFrac = 0.08, focusFrac = 0.08, genFrac = 0.7, upFrac = 0.1,
  amenityROI = true,   // false = completionist: buy ANY affordable amenity, ignore payback
  lanes = [],
} = {}) {
  return function act(s, ctx) {
    if (M.tierProd(s, 0) <= 0 && E.genCost(s, 0, 1) <= s.resources.cash) E.buyGenerator(s, 0, 1);
    let bg = 0;
    while (!E.bankMaxed(s) && E.bankUpgradeCost(s) <= s.resources.cash * bankFrac && bg++ < 4) E.buyBankUpgrade(s);
    let g = 0;
    while (E.accUnlocked(s) && E.accCost(s) <= s.resources.cash * accFrac && g++ < 6) E.buyAccommodation(s);
    const cashRate = M.tierProd(s, 0) + M.savvyPassive(s);
    for (const a of DATA.amenities)
      if (E.amenityUnlocked(s, a.id) && E.amenityCost(s, a.id) <= s.resources.cash * amenFrac
          && (!amenityROI || amenityWorthBuying(s, a, cashRate))) E.buyAmenity(s, a.id);
    for (const d of DATA.destinations)
      if (!s.destinations[d.id].owned && E.destUnlocked(s, d.id) && E.destCost(s, d.id) <= s.resources.cash * destFrac) E.buyDestination(s, d.id);
    for (const t of DATA.transport)
      if (!s.transport.owned.includes(t.id) && t.costBase * M.commsCostMult(s) <= s.resources.cash * transportFrac) E.buyTransport(s, t.id);
    for (const t of DATA.training) if (E.trainingCost(s, t.id) <= s.resources.cash * trainFrac) E.buyTraining(s, t.id);
    if (branch && E.pathCost(s, branch) <= s.resources.cash * focusFrac) E.buyPathFocus(s, branch);
    for (let i = 0; i < 40; i++) {
      let k = -1;
      for (let j = DATA.generators.length - 1; j >= 0; j--)
        if (s.generators[j].unlocked && E.genCost(s, j, 1) <= s.resources.cash * genFrac) { k = j; break; }
      if (k < 0) break;
      E.buyGenerator(s, k, 1);
    }
    for (let k = 0; k < DATA.generators.length; k++)
      if (s.generators[k].unlocked && E.genUpgradeCost(s, k) <= s.resources.cash * upFrac) E.buyGenUpgrade(s, k);
    for (const lane of lanes) lane(s, ctx);
  };
}

// ---- branch lanes: the opt-in economies the harness deliberately never touches.
// Each is a small bounded pass; budget fractions keep them from starving the core.

// traveler: one free revisit per owned destination — the one-off path-point nudge
// (DEST.visitPathPoints) that walks the staged track toward its dest-discount/global ×.
export function laneVisits(s) {
  for (const d of DATA.destinations) {
    const st = s.destinations[d.id];
    if (st.owned && st.visits === 0) E.visitDestination(s, d.id);
  }
}

// crypto: buy-and-hold. Hedges first (one-time crash insurance), then the cheapest coin
// while it stays a small slice of cash. No selling — drift + the branch's yieldMult
// stages make holding the sane baseline strategy.
export function laneCrypto(s) {
  if (!E.cryptoDeskUnlocked(s)) return;
  for (const h of DATA.crypto.hedges)
    if (!s.crypto.hedges[h.id] && h.cost <= s.resources.cash * 0.05) E.buyHedge(s, h.id);
  for (let i = 0; i < 20; i++) {
    let best = null, bestCost = Infinity;
    for (const c of DATA.crypto.coins) {
      const cost = E.coinCost(s, c.id, 1);
      if (cost < bestCost) { best = c; bestCost = cost; }
    }
    if (!best || bestCost > s.resources.cash * 0.15) break;
    E.buyCoin(s, best.id, 1);
  }
}

// connoisseur: acquire appreciating art/wine while each copy is a small slice of cash —
// Taste XP, exclusivity and Comfort all ride on holdings; never sells.
const ASSETS = [...DATA.collections.art, ...DATA.collections.wine];
export function laneCollections(s) {
  for (const a of ASSETS)
    if (E.assetCost(s, a.id) <= s.resources.cash * 0.1) E.buyAsset(s, a.id);
}

// ---- prestige spending: "ALL money on A instead of B" for the Legacy/Legend layers ----
// Repeated priority-order passes until nothing on the list is affordable — earlier ids
// soak ranks first (their cost grows ×TREE.nodeGrowth per rank, so later ids still get
// theirs). Prereqs (canBuyNode) gate naturally: a list that omits a prerequisite simply
// never unlocks its dependents — a real consequence the A/B runs are meant to expose.
export function spendLegacy(s, order) {
  const bought = {};
  let purchased = true;
  while (purchased) {
    purchased = false;
    for (const id of order)
      if (P.canBuyNode(s, id)) { P.buyNode(s, id); bought[id] = (bought[id] || 0) + 1; purchased = true; }
  }
  return bought;
}

export function spendLegendPoints(s, order) {
  const bought = {};
  let purchased = true;
  while (purchased) {
    purchased = false;
    for (const id of order)
      if (P.canBuyLegendPerk(s, id)) { P.buyLegendPerk(s, id); bought[id] = (bought[id] || 0) + 1; purchased = true; }
  }
  return bought;
}

// Ascend timing: generation 1 climbs to the island (tier 20); later generations re-ascend
// once the preview doubles the previous haul (anti-thrash — ASCEND_GATE hardens tier
// costs ×6^√count, so forcing tier 20 every life would drag). ctx.mem.lastGain is set by
// the runner on each ascension.
export function makeAscendWhen({ firstAtTier = 20, previewFactor = 2 } = {}) {
  return (s, ctx) =>
    s.accommodation.tier >= firstAtTier
    || (s.ascension.count > 0 && P.legacyPreview(s) >= previewFactor * (ctx.mem.lastGain || 1));
}

// ---- the registry ----
export const SCENARIOS = [
  {
    id: 'greedy-vlogger',
    name: 'Greedy vlogger (harness baseline)',
    desc: 'The balance harness bot verbatim — greedy-optimal, commits vlogger at beat 6.',
    branch: null, cadenceSec: 0,
    act: (s) => play(s),
  },
  {
    id: 'greedy-traveler',
    name: 'Greedy world traveler',
    desc: 'Destination-heavy budget + revisits; walks the traveler stage track.',
    branch: 'traveler', cadenceSec: 0,
    act: makeGreedyAct({ branch: 'traveler', destFrac: 0.6, transportFrac: 0.3, lanes: [laneVisits] }),
  },
  {
    id: 'greedy-crypto',
    name: 'Greedy crypto lounger',
    desc: 'Greedy core + hedged buy-and-hold coin stacking once the desk opens.',
    branch: 'crypto', cadenceSec: 0,
    act: makeGreedyAct({ branch: 'crypto', lanes: [laneCrypto] }),
  },
  {
    id: 'greedy-connoisseur',
    name: 'Greedy old-money aesthete',
    desc: 'Amenity-leaning budget + appreciating art/wine collections.',
    branch: 'connoisseur', cadenceSec: 0,
    act: makeGreedyAct({ branch: 'connoisseur', amenFrac: 0.35, lanes: [laneCollections] }),
  },

  // ---- prestige loop: ascension + Legend, balanced tree ----
  {
    id: 'ascension-loop',
    name: 'Ascension loop (balanced tree + Legend)',
    desc: 'Multi-generation run: island → ascend → balanced Legacy spread; Legend-resets when possible.',
    branch: 'vlogger', cadenceSec: 0,
    act: makeGreedyAct({ branch: 'vlogger' }),
    ascension: {
      when: makeAscendWhen(),
      spend: ['sun_kissed', 'silver_tongue', 'legacy_investor', 'compounding_interest', 'head_start', 'faster_metab', 'second_wind'],
    },
    legend: { when: () => true, perks: ['eternal_tan', 'old_money', 'quick_study'] },
  },

  // ---- tree A/B: all Legacy on income vs. all Legacy on meta ----
  {
    id: 'ascend-income-tree',
    name: 'Ascension A: all Legacy on income',
    desc: 'Same run, but Legacy goes ONLY to income/cost nodes (Sun-Kissed, Silver Tongue, Compounding).',
    branch: 'vlogger', cadenceSec: 0,
    act: makeGreedyAct({ branch: 'vlogger' }),
    ascension: { when: makeAscendWhen(), spend: ['sun_kissed', 'silver_tongue', 'compounding_interest'] },
  },
  {
    id: 'ascend-meta-tree',
    name: 'Ascension B: all Legacy on meta',
    desc: 'Same run, but Legacy goes ONLY to meta nodes (Legacy Investor, Head Start, Second Wind).',
    branch: 'vlogger', cadenceSec: 0,
    act: makeGreedyAct({ branch: 'vlogger' }),
    ascension: { when: makeAscendWhen(), spend: ['legacy_investor', 'head_start', 'second_wind'] },
  },

  // ---- cash A/B: all reinvestment into generators vs. into Comfort ----
  {
    id: 'vlogger-genrush',
    name: 'Cash A: generators only',
    desc: 'No amenities/destinations/training — every euro into generators, upgrades and the tier ladder.',
    branch: 'vlogger', cadenceSec: 0,
    act: makeGreedyAct({ branch: 'vlogger', amenFrac: 0, destFrac: 0, transportFrac: 0, trainFrac: 0, genFrac: 0.9, upFrac: 0.2 }),
  },
  {
    id: 'vlogger-comfort-max',
    name: 'Cash B: Comfort completionist',
    desc: 'Buys EVERY affordable amenity (ROI ignored) with a fat budget; generators get the rest.',
    branch: 'vlogger', cadenceSec: 0,
    act: makeGreedyAct({ branch: 'vlogger', amenityROI: false, amenFrac: 0.5, genFrac: 0.5, upFrac: 0.05 }),
  },
];

export function getScenario(id) { return SCENARIOS.find(x => x.id === id); }
