// harness.mjs — balance-fit harness (the E30 tuning tool). Run: node js/dev/harness.mjs
// Simulates a greedy, optimal, max-speed player and reports the full pacing curve:
// time-to-each-story-beat, island time, peak magnitude, and the late-game doubling time.
//
// NOTE: greedy-optimal play is a LOWER BOUND on real active time (a casual player idles,
// buys sub-optimally, and plays mostly offline). We fit the optimal curve near the target
// so that casual play lands around / a bit past the ~20h goal. See docs/math-proof.md §6.
import { CONFIG as C } from '../config.js';
import { DATA } from '../data/index.js';
import * as ST from '../state.js';
import * as E from '../engine.js';
import * as M from '../math.js';
import * as P from '../prestige.js';
import { validateDestinations } from '../data/destinations.js';
import { validateBank } from '../data/bank.js';
import { validatePaths } from '../data/paths.js';
import { validateProperty } from '../data/property.js';
import { validateIsland } from '../data/island.js';
import { validateLegend } from '../data/legend.js';
import { validateAchievements } from '../data/achievements.js';
import { validateSeasonal } from '../data/seasonal.js';
import { validateEvents } from '../data/events.js';
import { validateBoosts } from '../data/boosts.js';
import { validateSplurges } from '../data/splurges.js';
import { validateSouvenirs } from '../data/souvenirs.js';
import { validateChallenges } from '../data/challenges.js';
import { validatePetra } from '../data/petra.js';
import { fmt, fmtTime } from '../util.js';

// ---- ROI-aware amenity buying (the max-speed player, not a completionist) ----
// A speed-optimal player buys an amenity ONLY when it earns its cost back, or when Comfort is
// the thing literally gating the next accommodation tier. An amenity's income effect is two
// bounded layers: it adds to the Comfort sum → the GLOBAL L_comfort, and (level ≥ 1) it joins
// the additive L_amenity layer via its xMult. Since the above-floor refit (config.COMFORT.
// floorFrac), L_comfort reads EFFECTIVE Comfort = max(0, Comfort − floorFrac·accScore·wAcc),
// so this ROI test must price amenities against the SAME effective base the shipped
// comfortMultiplier uses — otherwise the bot would read the (huge, accScore-dominated) TOTAL
// Comfort, see a vanishing ΔL, and skip every amenity, mis-measuring the economy as a stall.
// Under floorFrac=1 the effective base is the player-earned Comfort (amenTerm+bodyTerm), which
// an amenity moves by a MEANINGFUL fraction at every tier — so amenities are now a real, priced
// reinvestment lane, not the cosmetic cash-leak they were pre-refit. The OLD policy bought one
// level of EVERY affordable amenity each step (a completionist); the payback test below keeps the
// bot honest — it buys an amenity iff the marginal €/s from its effective-Comfort bump (plus its
// L_amenity share) repays its cost within the horizon. The horizon is deliberately generous (a
// Comfort boost is permanent, lasting the whole multi-hour run).
const AMENITY_PAYBACK_HORIZON_SEC = 1800;

// worth buying this level of amenity `a`? cashRate = current €/s cash income.
// EXPORTED as the single source of truth — scenarios.mjs imports this (a drifted local copy
// there once cost the branch bots the entire L_amenity ramp).
export function amenityWorthBuying(s, a, cashRate) {
  // 1) progression override: if Comfort is short of the NEXT accommodation tier's unlock gate,
  //    Comfort itself is gating the run — buy regardless of ROI. In the shipped economy accScore
  //    over-satisfies every gate (ACC.unlockFrac 0.33 < 1/ACC.growth 0.385), so this is a dormant
  //    safety net; it keeps the policy correct if unlockFrac is ever raised past that boundary.
  const nextTier = s.accommodation.tier + 1;
  if (nextTier < DATA.accommodation.length && s._comfortCache < M.accUnlockComfort(nextTier)) return true;
  // 2) ROI test: the marginal €/s from this level's Comfort bump must repay its cost within the
  //    horizon. income ∝ L_comfort, so ΔincomePerSec = cashRate · ΔL_comfort / L_comfort.
  if (cashRate <= 0) return false;
  const dComf = a.comfort * C.COMFORT.wAmen;   // this level's Comfort contribution
  if (dComf <= 0) return false;
  // Price the Comfort bump against the SAME above-floor effective base comfortMultiplier reads
  // (config.COMFORT.floorFrac) — total Comfort would be accScore-dominated and hide the gain.
  const comf = s._comfortCache;
  const floorSub = C.COMFORT.floorFrac * M.comfortFloor(s);
  const eff = Math.max(0, comf - floorSub);
  const effAfter = Math.max(0, comf + dComf - floorSub);
  const L = 1 + C.COMFORT.MULT * Math.log10(1 + eff / C.COMFORT.C0);
  const Lafter = 1 + C.COMFORT.MULT * Math.log10(1 + effAfter / C.COMFORT.C0);
  let gainPerSec = cashRate * (Lafter - L) / L;
  // L_amenity income layer (Phase-C refit): the FIRST level of an xMult amenity also joins the
  // additive income layer — include that marginal gain so the greedy bot prices activated
  // amenities honestly ('social' scoped at half weight: it boosts D2/D3 production, which
  // compounds into cash with a delay rather than multiplying it directly). 0 while xRate is 0.
  const xr = C.AMENITY.xRate || 0;
  if (xr > 0 && a.xMult && (s.amenities[a.id].level || 0) === 0) {
    const cache = s._amenCache || { all: 0, social: 0 };
    const cap = C.AMENITY.xCap - 1;
    const Lx = 1 + Math.min(cap, xr * cache.all);
    const LxAfter = 1 + Math.min(cap, xr * (cache.all + a.xMult * (a.xScope === 'social' ? 0.5 : 1)));
    gainPerSec += cashRate * (LxAfter - Lx) / Lx;
  }
  if (gainPerSec <= 0) return false;
  return E.amenityCost(s, a.id) / gainPerSec <= AMENITY_PAYBACK_HORIZON_SEC;
}

// ---- path-gate satisfier (docs/10 §1.3 / PATH_GATE, Phase 3) ----
// The one deliberate amendment to the "harness never touches clout/crypto" doctrine: with the
// path gate live, a committed branch's stage goals sit on the accommodation ladder's critical
// path. When the NEXT tier is Comfort-unlocked but blocked ONLY by the path gate
// (accGateStatus: comfortOk && !pathOk), convert that gate into a SHORT, cheapest-first cash
// spend toward the blocking (next-unfired) stage's still-missing goals — content/coins/
// destinations/vehicles/luxury amenities/collections. Bounded + ROI-sane by construction:
// - it fires ONLY when actually path-gated (never on the ~⅔ of engaged runs that sail through);
// - it buys ONLY the blocking stage's unmet goals, cheapest resource first;
// - every goal is a direct cash buy (clout is the sole exception — not purchasable, so it is
//   bridged by ONE content buy that raises dClout/dt, then left to accrue), so a gate is a
//   spend, never a wall.
// SINGLE-SOURCED here: scenarios.mjs (makeGreedyAct) and selftest.mjs (playStep) import this,
// exactly like amenityWorthBuying — one policy step, one definition, so the demo-baseline ≡
// harness lock (selftest [106]) holds by construction, not by copy.

// the single cheapest cash buy that advances goal `key` right now → { cost, do } | null.
function cheapestGoalBuy(s, key) {
  switch (key) {
    case 'd2Count':
      // d2Count (the primary "Followers" bar) is the CORE income backbone (D2 → D1 → cash),
      // which the greedy/personas already buy through the normal generator loop. It is the ONE
      // goal the satisfier must NOT force-buy: a single early D2 at a low count (2→3 is +50% of
      // the D2 production driving the whole tier chain) compounds into a large pacing swing (a
      // measured casual-tourist −15% before this carve-out). The calibration set the d2 ladder
      // (3/7/18/60) BELOW the engaged p35 precisely so it self-satisfies — so we return null and
      // let the tier gate wait, neutrally, for the natural economy to reach the count (bind only
      // if genuinely behind on the backbone, never a perturbation of the fitted curve).
      return null;
    case 'contentFormats': {   // a NEW content format (level 0), respecting its clout unlock
      let best = null, bestCost = Infinity;
      for (const c of DATA.content) {
        if ((s.content[c.id]?.level || 0) > 0 || !E.contentUnlocked(s, c.id)) continue;
        const cost = E.contentCost(s, c.id);
        if (cost < bestCost) { best = c.id; bestCost = cost; }
      }
      return best ? { cost: bestCost, do: () => E.buyContent(s, best) } : null;
    }
    case 'clout': {   // not purchasable — bridge by the cheapest UNLOCKED content tier (raises dClout/dt)
      let best = null, bestCost = Infinity;
      for (const c of DATA.content) {
        if (!E.contentUnlocked(s, c.id)) continue;
        const cost = E.contentCost(s, c.id);
        if (cost < bestCost) { best = c.id; bestCost = cost; }
      }
      return best ? { cost: bestCost, do: () => E.buyContent(s, best) } : null;
    }
    case 'portfolioValue': {   // any coin raises holdings value — cheapest next unit
      let best = null, bestCost = Infinity;
      for (const c of DATA.crypto.coins) {
        const cost = E.coinCost(s, c.id, 1);
        if (cost < bestCost) { best = c.id; bestCost = cost; }
      }
      return best ? { cost: bestCost, do: () => E.buyCoin(s, best, 1) } : null;
    }
    case 'coinSpread': {   // a NEW distinct coin (none held yet) — cheapest
      let best = null, bestCost = Infinity;
      for (const c of DATA.crypto.coins) {
        if ((s.crypto.holdings[c.id] || 0) > 0) continue;
        const cost = E.coinCost(s, c.id, 1);
        if (cost < bestCost) { best = c.id; bestCost = cost; }
      }
      return best ? { cost: bestCost, do: () => E.buyCoin(s, best, 1) } : null;
    }
    case 'destinations': {
      let best = null, bestCost = Infinity;
      for (const d of DATA.destinations) {
        if (s.destinations[d.id].owned || !E.destUnlocked(s, d.id)) continue;
        const cost = E.destCost(s, d.id);
        if (cost < bestCost) { best = d.id; bestCost = cost; }
      }
      return best ? { cost: bestCost, do: () => E.buyDestination(s, best) } : null;
    }
    case 'vehicleClass': {   // climb one class at a time: car (1) → boat (2); no goal needs a jet
      const cls = M.pathGoalResources(s, DATA).vehicleClass;
      if (cls < 1 && E.garageUnlocked(s)) {
        let best = null, bestCost = Infinity;
        for (const c of DATA.vehicles) {
          if ((s.vehicles.owned[c.id]?.count || 0) > 0) continue;
          const cost = E.carCost(s, c.id);
          if (cost < bestCost) { best = c.id; bestCost = cost; }
        }
        if (best) return { cost: bestCost, do: () => E.buyCar(s, best) };
      }
      if (cls < 2 && E.marinaUnlocked(s)) {
        let best = null, bestCost = Infinity;
        for (const b of DATA.boats) {
          if ((s.vehicles.boats[b.id]?.count || 0) > 0) continue;
          const cost = E.boatCost(s, b.id);
          if (cost < bestCost) { best = b.id; bestCost = cost; }
        }
        if (best) return { cost: bestCost, do: () => E.buyBoat(s, best) };
      }
      return null;
    }
    case 'luxAmenities': {   // a NEW luxury/yacht-tag amenity (the SAME set luxuryAmenityComfort reads)
      let best = null, bestCost = Infinity;
      for (const a of DATA.amenities) {
        if (!(a.tag === 'luxury' || a.tag === 'yacht')) continue;
        if ((s.amenities[a.id]?.level || 0) > 0 || !E.amenityUnlocked(s, a.id)) continue;
        const cost = E.amenityCost(s, a.id);
        if (cost < bestCost) { best = a.id; bestCost = cost; }
      }
      return best ? { cost: bestCost, do: () => E.buyAmenity(s, best) } : null;
    }
    case 'collectionPieces': {   // a NEW distinct art/wine piece (count 0) — cheapest
      let best = null, bestCost = Infinity;
      for (const arr of [DATA.collections.art, DATA.collections.wine])
        for (const a of arr) {
          if ((s.collections[a.id]?.count || 0) > 0) continue;
          const cost = E.assetCost(s, a.id);
          if (cost < bestCost) { best = a.id; bestCost = cost; }
        }
      return best ? { cost: bestCost, do: () => E.buyAsset(s, best) } : null;
    }
    default: return null;
  }
}

export function satisfyPathGate(s) {
  if (!C.PATH_GATE.enabled) return;
  const status = E.accGateStatus(s);
  if (!status.comfortOk || status.pathOk) return;      // not blocked by the path gate → nothing to do
  const branch = status.branch;
  if (!branch || branch === 'neutral') return;          // uncommitted: committing is the runner's job
  const path = DATA.paths.find(p => p.id === branch);
  if (!path) return;
  // blocking stage = the first not-yet-fired stage (stages fire strictly in order)
  const blockIdx = path.stages.findIndex(st => !s.story.flags[`pathStage_${branch}_${st.at}`]);
  if (blockIdx < 0) return;
  const progress = M.stageGoalProgress(s, DATA, branch);
  const unmet = progress[blockIdx].goals.filter(g => !g.met);
  // cheapest bridge first — convert the smallest gap before the larger ones
  unmet.sort((a, b) => (cheapestGoalBuy(s, a.key)?.cost ?? Infinity) - (cheapestGoalBuy(s, b.key)?.cost ?? Infinity));
  for (const g of unmet) {
    if (g.key === 'clout') {   // rate bridge: ONE content buy, then let clout accrue (never looped)
      const buy = cheapestGoalBuy(s, 'clout');
      if (buy && buy.cost <= s.resources.cash) buy.do();
      continue;
    }
    // every other goal is a direct cash buy — buy cheapest units until met (bounded)
    for (let guard = 0; guard < 500; guard++) {
      if ((M.pathGoalResources(s, DATA)[g.key] ?? 0) >= g.need) break;
      const buy = cheapestGoalBuy(s, g.key);
      if (!buy || buy.cost > s.resources.cash || !buy.do()) break;   // unaffordable/unbuyable → a later act converts it
    }
  }
}

// ---- greedy "reasonable, keen" player ----
export function play(s) {
  if (M.tierProd(s, 0) <= 0 && E.genCost(s, 0, 1) <= s.resources.cash) E.buyGenerator(s, 0, 1);
  // bank account first: cost = BANK.costFrac·cap, so "cost ≤ half my cash" ⇔ the wallet
  // is ≥ ~70% full — exactly when a keen player upgrades to keep income from
  // overflowing (the wallet cap clamps ALL inflow — see engine.gainCash). Highest
  // priority when it triggers: every other purchase below still fits in the new cap.
  let bg = 0;
  while (!E.bankMaxed(s) && E.bankUpgradeCost(s) <= s.resources.cash * 0.5 && bg++ < 4) E.buyBankUpgrade(s);
  // path gate: if the next tier is Comfort-ready but path-gated, buy the cheapest missing
  // goal resource so the blocking stage fires THIS act — the gate becomes a spend, not a wall
  // (docs/10 §1.3). No-op when PATH_GATE is off or the gate isn't binding.
  satisfyPathGate(s);
  let g = 0;
  while (E.accUnlocked(s) && E.accCost(s) <= s.resources.cash * 0.7 && g++ < 6) E.buyAccommodation(s);
  // amenities — ROI-aware (see amenityWorthBuying). cashRate is the current €/s cash income; the
  // 0.3·cash cap stays as a belt-and-suspenders against a single oversized buy (rarely binds
  // now that the payback test already rejects expensive-for-their-Comfort amenities).
  const cashRate = M.tierProd(s, 0) + M.savvyPassive(s);
  for (const a of DATA.amenities)
    if (E.amenityUnlocked(s, a.id) && E.amenityCost(s, a.id) <= s.resources.cash * 0.3
        && amenityWorthBuying(s, a, cashRate)) E.buyAmenity(s, a.id);
  // destinations (E04-S8-T6/harness accuracy): grab an affordable, unlocked place the
  // same way amenities are bought — otherwise L_dest stays 1 and mis-estimates pacing.
  for (const d of DATA.destinations)
    if (!s.destinations[d.id].owned && E.destUnlocked(s, d.id) && E.destCost(s, d.id) <= s.resources.cash * 0.4) E.buyDestination(s, d.id);
  // transport (optional-ROI): grab a cheap ride once, it shrinks destination costs.
  for (const t of DATA.transport)
    if (!s.transport.owned.includes(t.id) && t.costBase * M.commsCostMult(s) <= s.resources.cash * 0.2) E.buyTransport(s, t.id);
  for (const t of DATA.training) if (E.trainingCost(s, t.id) <= s.resources.cash * 0.08) E.buyTraining(s, t.id);
  if (E.pathCost(s, 'vlogger') <= s.resources.cash * 0.08) E.buyPathFocus(s, 'vlogger');
  for (let i = 0; i < 40; i++) {
    let k = -1;
    for (let j = DATA.generators.length - 1; j >= 0; j--)
      if (s.generators[j].unlocked && E.genCost(s, j, 1) <= s.resources.cash * 0.7) { k = j; break; }
    if (k < 0) break; E.buyGenerator(s, k, 1);
  }
  for (let k = 0; k < DATA.generators.length; k++)
    if (s.generators[k].unlocked && E.genUpgradeCost(s, k) <= s.resources.cash * 0.1) E.buyGenUpgrade(s, k);
  if (s.story.seen.includes(6) && s.story.branch === 'neutral') E.applyStoryChoice(s, 6, 'vlogger');
}

// ---- run one greedy playthrough, no ascension, until island or cap ----
export function runCurve({ dt = 5, maxHours = 30, ascend = false } = {}) {
  const s = ST.newGame();
  const beatTime = {};
  let islandAt = null, peakLog = 0, lastDblLife = 15, lastDblT = 0, dblAtIsland = null;
  for (let t = 0; t <= maxHours * 3600; t += dt) {
    E.tick(s, dt); play(s);
    if (ascend && P.canAscend(s) && s.accommodation.tier >= 20) P.ascend(s);
    for (const b of s.story.seen) if (beatTime[b] === undefined) beatTime[b] = t;
    const c = s.resources.cash;
    if (Number.isFinite(c) && c > 1) peakLog = Math.max(peakLog, Math.log10(c));
    if (islandAt === null && s.accommodation.tier >= 20) {
      islandAt = t;
      // measure local doubling time near the island from LIFETIME cash (monotone — the raw
      // wallet dips on the huge tier-20 purchase itself, which used to make this print n/a).
      const life = Math.max(1, s.stats.lifetimeCash);
      if (life > lastDblLife && t > lastDblT) dblAtIsland = (t - lastDblT) * Math.log10(2) / (Math.log10(life) - Math.log10(lastDblLife));
    }
    if (t % 600 === 0) { lastDblLife = Math.max(1, s.stats.lifetimeCash); lastDblT = t; }
    if (islandAt !== null && t > islandAt + 60) break;   // a little past island then stop
  }
  return { s, beatTime, islandAt, peakLog, dblAtIsland };
}

// ---- report ----
function report() {
  validateDestinations();   // dev schema guard (E04-S1-T10) — fail loudly on malformed data
  validateBank(C);          // dev schema guard: bank rows must match config.BANK.tiers
  validatePaths();          // dev schema guard: staged tracks (thresholds, bonus vocabulary)
  validateProperty();       // dev schema guard (E22): property tree ids/parents/costGrowth
  validateIsland();         // dev schema guard (E28): building ids/costs/upkeep
  validateLegend();         // dev schema guard (E29): legend perk ids/kinds/costs
  validateAchievements();   // dev schema guard (E30): achievement ids + reward-0-unless-meta invariant
  validateSeasonal();       // dev schema guard (E30): seasonal ids + bounded mults
  validateEvents();         // dev schema guard (Living-World W1): Trip Events + Vacation Weather rows
  validateBoosts();         // dev schema guard (Living-World W2): Sunscreen Boosts rows
  validateSplurges();       // dev schema guard (Living-World W2): Splurge Moments rows + effect vocabulary
  validateSouvenirs();      // dev schema guard (Living-World W3): Souvenir Stand shelf rows
  validateChallenges();     // dev schema guard (Living-World W3): Ascension Challenges roster
  validatePetra();          // dev schema guard (Living-World W4): Petra the Pace Ghost — pin-consistency
  const { beatTime, islandAt, peakLog, dblAtIsland } = runCurve({ dt: 5, maxHours: 40 });
  console.log('\n=== idleVaction balance-fit curve (greedy optimal, LOWER bound on real time) ===\n');
  const beats = Object.keys(beatTime).map(Number).sort((a, b) => a - b);
  for (const b of beats) {
    const bd = DATA.story.find(x => x.id === b);
    console.log(`  Beat ${String(b).padStart(2)}  ${fmtTime(beatTime[b]).padEnd(10)}  ${bd.title}`);
  }
  console.log('');
  console.log(`  island (tier 20):   ${islandAt === null ? 'not reached in cap' : fmtTime(islandAt)}`);
  console.log(`  peak log10(cash):   ${peakLog.toFixed(1)}  (double overflows ~308)`);
  console.log(`  doubling time @isl: ${dblAtIsland ? fmtTime(dblAtIsland) : 'n/a'}`);
  console.log(`  beats reached:      ${beats.length}/30`);
  console.log('\n  Max-speed ROI lower bound. Guard (docs/05 §9): island ~6-12h, 26 beats');
  console.log('  monotone, peak log10(cash) << 290. Casual (idle/offline) lands the ~20h arc.\n');
}

// Only auto-run the report when executed directly (not when imported for sweeps).
if (process.argv[1] && process.argv[1].endsWith('harness.mjs')) report();
