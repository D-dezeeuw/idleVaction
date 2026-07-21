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
import { fmt, fmtTime } from '../util.js';

// ---- greedy "reasonable, keen" player ----
export function play(s) {
  if (M.tierProd(s, 0) <= 0 && E.genCost(s, 0, 1) <= s.resources.cash) E.buyGenerator(s, 0, 1);
  let g = 0;
  while (E.accUnlocked(s) && E.accCost(s) <= s.resources.cash * 0.7 && g++ < 6) E.buyAccommodation(s);
  for (const a of DATA.amenities)
    if (E.amenityUnlocked(s, a.id) && E.amenityCost(s, a.id) <= s.resources.cash * 0.3) E.buyAmenity(s, a.id);
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
  let islandAt = null, peakLog = 0, lastDblCash = 15, lastDblT = 0, dblAtIsland = null;
  for (let t = 0; t <= maxHours * 3600; t += dt) {
    E.tick(s, dt); play(s);
    if (ascend && P.canAscend(s) && s.accommodation.tier >= 20) P.ascend(s);
    for (const b of s.story.seen) if (beatTime[b] === undefined) beatTime[b] = t;
    const c = s.resources.cash;
    if (Number.isFinite(c) && c > 1) peakLog = Math.max(peakLog, Math.log10(c));
    if (islandAt === null && s.accommodation.tier >= 20) {
      islandAt = t;
      // measure local doubling time near the island
      if (c > lastDblCash && t > lastDblT) dblAtIsland = (t - lastDblT) * Math.log10(2) / (Math.log10(c) - Math.log10(lastDblCash));
    }
    if (t % 600 === 0) { lastDblCash = Math.max(1, c); lastDblT = t; }
    if (islandAt !== null && t > islandAt + 60) break;   // a little past island then stop
  }
  return { s, beatTime, islandAt, peakLog, dblAtIsland };
}

// ---- report ----
function report() {
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
  console.log('\n  Target (docs/05 §1): island ~15-20h optimal so casual play lands ~20h+.\n');
}

// Only auto-run the report when executed directly (not when imported for sweeps).
if (process.argv[1] && process.argv[1].endsWith('harness.mjs')) report();
