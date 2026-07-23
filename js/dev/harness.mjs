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
import { fmt, fmtTime } from '../util.js';

// ---- ROI-aware amenity buying (the max-speed player, not a completionist) ----
// A speed-optimal player buys an amenity ONLY when it earns its cost back, or when Comfort is
// the thing literally gating the next accommodation tier. Amenities have exactly one income
// effect: they add to the (unbounded) Comfort sum, which raises the GLOBAL multiplier
// L_comfort = 1 + COMFORT.MULT·log10(1 + Comfort/C0). (The `xMult`/`xScope` fields in the
// amenity data are dormant — never read by math.js/engine.js — so Comfort is the whole story.)
// That effect is (a) logarithmic in Comfort and (b) swamped by the accommodation ladder's own
// accScore, which dominates Comfort at every tier — so most amenities are effectively cosmetic
// for income. The OLD policy bought one level of EVERY affordable amenity each step: a
// completionist, not the "max-speed, LOWER-bound" player this harness claims to measure. That
// both OVERSTATED optimal island time and, worse, made it drift with amenity COUNT — every new
// cluster leaked more reinvestment cash into low-ROI Comfort regardless of unit price (E03→E07:
// island crept 17h54m→19h11m). The payback test below fixes both: a dominated/cosmetic amenity
// has a vanishing ΔL_comfort/L_comfort, hence an effectively infinite payback, so it is skipped
// — which means ADDING such an amenity to the data cannot move the reported island. The horizon
// is deliberately generous (a Comfort boost is permanent, lasting the whole multi-hour run), yet
// the measured island is insensitive to it: ROI-good amenities are cheap (bought at any horizon)
// and ROI-bad ones fail at every horizon (island ≈ constant for horizons 30s–30min in testing).
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
  const comf = s._comfortCache;
  const L = 1 + C.COMFORT.MULT * Math.log10(1 + comf / C.COMFORT.C0);
  const Lafter = 1 + C.COMFORT.MULT * Math.log10(1 + (comf + dComf) / C.COMFORT.C0);
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

// ---- greedy "reasonable, keen" player ----
export function play(s) {
  if (M.tierProd(s, 0) <= 0 && E.genCost(s, 0, 1) <= s.resources.cash) E.buyGenerator(s, 0, 1);
  // bank account first: cost = BANK.costFrac·cap, so "cost ≤ half my cash" ⇔ the wallet
  // is ≥ ~70% full — exactly when a keen player upgrades to keep income from
  // overflowing (the wallet cap clamps ALL inflow — see engine.gainCash). Highest
  // priority when it triggers: every other purchase below still fits in the new cap.
  let bg = 0;
  while (!E.bankMaxed(s) && E.bankUpgradeCost(s) <= s.resources.cash * 0.5 && bg++ < 4) E.buyBankUpgrade(s);
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
