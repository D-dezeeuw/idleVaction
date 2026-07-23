// demo.mjs — hyper-speed demo playthroughs: scripted strategies over the REAL engine,
// recording progress at fixed game-time intervals. Run: npm run demo [-- options]
//
//   npm run demo                          all scenarios, 40h of game time
//   npm run demo -- greedy-crypto         only the named scenario(s)
//   npm run demo -- --hours 20 --dt 10    shorter horizon, coarser macro-step
//   npm run demo -- --cadence 900         casual player: act once per 15 game-min
//   npm run demo -- --every 300           snapshot every 5 game-min
//   npm run demo -- --stall 6             abort a run after 6h with zero progression
//                                         (pre-island only; 0 disables; default 10)
//   npm run demo -- --json out.json       dump the full time-series for analysis
//   npm run demo -- --quick               2h smoke run
//   npm run demo -- --list                print scenario ids
//
// The engine tick is dt-decomposition-invariant (selftest [59]/[81]), so coarse macro-
// steps replay real play faithfully; only POLICY timing coarsens with --dt/--cadence.
import { CONFIG as C } from '../config.js';
import { DATA } from '../data/index.js';
import * as ST from '../state.js';
import * as E from '../engine.js';
import * as P from '../prestige.js';
import { fmt, fmtTime } from '../util.js';
import { SCENARIOS, getScenario, spendLegacy, spendLegendPoints } from './scenarios.mjs';
import { writeFileSync } from 'node:fs';

const CHECKPOINT_HOURS = [1, 2, 5, 10, 20, 40];

// ---- one scenario, one full run ----
// Loop shape (tick → act → commit) mirrors harness.runCurve exactly so the baseline
// scenario stays bit-identical to `npm run harness` (locked by selftest [106]).
export function runScenario(sc, { dt = 5, maxHours = 40, snapshotSec = 600, cadenceSec = null, stallHours = 10 } = {}) {
  const cadence = cadenceSec !== null ? cadenceSec : (sc.cadenceSec || 0);
  C.MILESTONE_STEP = 10;   // config singleton — prestige mutates it; keep runs independent
  const wall0 = Date.now();
  const s = ST.newGame();
  const series = [], events = [];
  const prev = { beats: 0, tier: s.accommodation.tier, branch: s.story.branch, asc: 0, legend: 0, islandOwned: false, lifetime: s.stats.lifetimeCash };
  let earned = 0, lastSnapT = 0, lastSnapEarned = 0, nextSnapAt = 0, acts = 0;
  let lastProgressT = 0, lastEventCount = 0, stalled = null, islandSeen = false;
  const stallSec = stallHours > 0 ? stallHours * 3600 : Infinity;
  const ctx = { t: 0, dt, mem: {} };
  const horizon = maxHours * 3600;
  for (let t = 0; t <= horizon; t += dt) {
    ctx.t = t;
    E.tick(s, dt);
    const due = cadence <= 0 || Math.floor(t / cadence) > Math.floor((t - dt) / cadence);
    if (due) { sc.act(s, ctx); acts++; }
    if (sc.branch && s.story.seen.includes(6) && s.story.branch === 'neutral') E.applyStoryChoice(s, 6, sc.branch);
    // measured income: lifetimeCash counts BANKED inflow only (wallet-cap-honest); a
    // negative delta would mean a prestige hard-reset — re-baseline, don't count it.
    const lt = s.stats.lifetimeCash;
    if (lt >= prev.lifetime) earned += lt - prev.lifetime;
    prev.lifetime = lt;
    // detect BEFORE the prestige decisions below: an ascension on the very step tier 20
    // is bought would otherwise wipe the tier-20 event (and the island time) unseen.
    detectEvents(s, prev, events, t);
    // prestige is a decision too — it rides the same cadence gate as buying.
    if (due && sc.ascension && P.canAscend(s) && sc.ascension.when(s, ctx)) {
      const gained = P.legacyPreview(s);
      const gen = s.ascension.count + 1;
      P.ascend(s);
      ctx.mem.lastGain = gained;
      const bought = spendLegacy(s, sc.ascension.spend);
      events.push({ t, type: 'ascend', detail: `Ascension #${gen}: +${gained} Legacy → ${fmtSpend(bought)}` });
      syncPrev(prev, s);
    }
    if (due && sc.legend && P.canLegend(s) && sc.legend.when(s, ctx)) {
      const pts = P.legendPreview(s);
      P.legendReset(s);
      const bought = spendLegendPoints(s, sc.legend.perks);
      events.push({ t, type: 'legend', detail: `Legend #${s.legend.count}: +${pts} points → ${fmtSpend(bought)}` });
      syncPrev(prev, s);
    }
    // stall = goal-unreachable detection: pre-island only (post-island, flat stretches
    // are normal — cash keeps compounding and the checkpoints capture it).
    if (events.length > lastEventCount) {
      for (let i = lastEventCount; i < events.length; i++)
        if (events[i].type === 'tier' && events[i].tier >= 20) islandSeen = true;
      lastEventCount = events.length; lastProgressT = t;
    }
    if (!islandSeen && t - lastProgressT >= stallSec) {
      stalled = { t, sinceT: lastProgressT, tier: s.accommodation.tier };
      events.push({ t, type: 'stall', detail: `STALLED — no progression for ${fmtTime(t - lastProgressT)} (tier ${s.accommodation.tier}); goal unreachable, aborting run` });
      series.push(snapshot(s, t, 0));
      break;
    }
    if (t >= nextSnapAt) {
      const incomePerSec = t > lastSnapT ? (earned - lastSnapEarned) / (t - lastSnapT) : 0;
      series.push(snapshot(s, t, incomePerSec));
      lastSnapT = t; lastSnapEarned = earned;
      nextSnapAt += snapshotSec;
    }
  }
  C.MILESTONE_STEP = 10;
  const island = events.find(e => e.type === 'tier' && e.tier >= 20);
  return {
    id: sc.id, name: sc.name,
    params: { dt, maxHours, snapshotSec, cadenceSec: cadence, stallHours },
    series, events, final: series[series.length - 1],
    islandAt: island ? island.t : null,
    stalled,
    tree: { ...s.ascension.tree }, legendPerks: { ...(s.legend.perks || {}) },
    acts, wallMs: Date.now() - wall0,
  };
}

function fmtSpend(bought) {
  const parts = Object.entries(bought).map(([id, n]) => `${id}+${n}`);
  return parts.length ? parts.join(' ') : 'nothing affordable';
}

// A prestige hard-reset rewinds beats/tier/branch — re-baseline the trackers so the
// next generation's progress is detected (and logged) again instead of stalling.
function syncPrev(prev, s) {
  prev.beats = s.story.seen.length;
  prev.tier = s.accommodation.tier;
  prev.branch = s.story.branch;
  prev.asc = s.ascension.count;
  prev.legend = s.legend.count;
}

// flat scalars only — never clone state into the series (240 rows for a 40h run @600s).
function snapshot(s, t, incomePerSec) {
  const c = s.resources.cash;
  let stamps = 0;
  for (const d of DATA.destinations) if (s.destinations[d.id].owned) stamps++;
  let gens = 0;
  for (let k = 0; k < DATA.generators.length; k++) gens += s.generators[k].bought;
  return {
    t, cash: c, log10Cash: c > 1 ? Math.log10(c) : 0, incomePerSec,
    comfort: s.resources.comfort, clout: s.resources.clout, legacy: s.resources.legacy,
    ascensions: s.ascension.count, legendCount: s.legend.count, legendPoints: s.legend.points,
    accTier: s.accommodation.tier, stamps, beats: s.story.seen.length,
    gensBought: gens, lifetimeCash: s.stats.lifetimeCash,
  };
}

// cheap scalar diffing per step — full log lands in --json; the reporter prints the big
// ones. Counters that REWIND (a prestige hard-reset outside the runner's own ascend/
// legend handling) re-baseline silently instead of wedging the < comparisons.
function detectEvents(s, prev, events, t) {
  const seen = s.story.seen;
  if (seen.length < prev.beats) prev.beats = seen.length;
  while (prev.beats < seen.length) {
    const id = seen[prev.beats++];
    const bd = DATA.story.find(x => x.id === id);
    events.push({ t, type: 'beat', beat: id, detail: `Beat ${id} — ${bd ? bd.title : '?'}` });
  }
  if (s.accommodation.tier < prev.tier) prev.tier = s.accommodation.tier;
  while (prev.tier < s.accommodation.tier) {
    const n = ++prev.tier;
    const row = DATA.accommodation[n];
    events.push({ t, type: 'tier', tier: n, detail: `Tier ${n} — ${row ? row.name : '?'}` });
  }
  if (s.story.branch !== prev.branch) {
    prev.branch = s.story.branch;
    if (s.story.branch !== 'neutral') events.push({ t, type: 'branch', detail: `Committed branch: ${s.story.branch}` });
  }
  if (s.ascension.count !== prev.asc) {   // fallback — the runner logs its own richer event first
    if (s.ascension.count > prev.asc) events.push({ t, type: 'ascend', detail: `Ascension #${s.ascension.count} (legacy ${fmt(s.resources.legacy)})` });
    prev.asc = s.ascension.count;
  }
  if (s.legend.count !== prev.legend) {
    if (s.legend.count > prev.legend) events.push({ t, type: 'legend', detail: `Legend #${s.legend.count} (${s.legend.points} points)` });
    prev.legend = s.legend.count;
  }
  if (s.island.owned && !prev.islandOwned) {
    prev.islandOwned = true;
    events.push({ t, type: 'island', detail: 'Bought the private island' });
  }
}

// ---- reporting ----
function rowAt(series, tSec) {
  let best = series[0];
  for (const r of series) { if (r.t <= tSec) best = r; else break; }
  return best;
}

const COLS = [
  ['time', 8, r => fmtTime(r.t)],
  ['cash', 10, r => fmt(r.cash)],
  ['log10', 6, r => r.log10Cash.toFixed(1)],
  ['inc/s', 10, r => fmt(r.incomePerSec)],
  ['tier', 5, r => String(r.accTier)],
  ['stamps', 6, r => String(r.stamps)],
  ['beats', 5, r => String(r.beats)],
  ['comfort', 10, r => fmt(r.comfort)],
  ['clout', 10, r => fmt(r.clout)],
  ['legacy', 7, r => fmt(r.legacy)],
];

function printScenario(r) {
  const cad = r.params.cadenceSec > 0 ? `acts every ${fmtTime(r.params.cadenceSec)}` : 'acts every step';
  console.log(`\n--- ${r.name}  [${r.id}]  (${cad}, ${r.acts} passes, ${r.wallMs}ms wall) ---`);
  console.log('  ' + COLS.map(([h, w]) => h.padStart(w)).join(' '));
  for (const h of CHECKPOINT_HOURS) {
    if (h > r.params.maxHours) break;
    const row = rowAt(r.series, h * 3600);
    console.log('  ' + COLS.map(([, w, f]) => f(row).padStart(w)).join(' '));
  }
  const keyEvents = r.events.filter(e => e.type === 'branch' || e.type === 'ascend' || e.type === 'legend'
    || e.type === 'island' || e.type === 'stall' || (e.type === 'tier' && e.tier === 20));
  const shown = keyEvents.slice(0, 30);
  for (const e of shown) console.log(`  ${fmtTime(e.t).padEnd(10)} ${e.detail}`);
  if (keyEvents.length > shown.length) console.log(`  … ${keyEvents.length - shown.length} more key events (see --json)`);
  const tree = Object.entries(r.tree);
  if (tree.length) console.log(`  final tree: ${tree.map(([id, n]) => `${id}:${n}`).join(' ')}`);
  const perks = Object.entries(r.legendPerks);
  if (perks.length) console.log(`  legend perks: ${perks.map(([id, n]) => `${id}:${n}`).join(' ')}`);
}

function printComparison(results) {
  console.log('\n=== scenario comparison ===\n');
  const head = ['scenario'.padEnd(20), 'tier@5h'.padStart(8), 'tier@20h'.padStart(9), 'island'.padStart(11),
    'asc'.padStart(4), 'lgnd'.padStart(5), 'stamps'.padStart(7), 'beats'.padStart(6), 'log10$'.padStart(7), 'wall'.padStart(8)];
  console.log('  ' + head.join(' '));
  const tierAt = (r, h) => h <= r.params.maxHours ? String(rowAt(r.series, h * 3600).accTier) : '—';
  for (const r of results) {
    const island = r.islandAt !== null ? fmtTime(r.islandAt) : (r.stalled ? `✗ stall ${fmtTime(r.stalled.t)}` : '—');
    console.log('  ' + [
      r.id.padEnd(20),
      tierAt(r, 5).padStart(8),
      tierAt(r, 20).padStart(9),
      island.padStart(11),
      String(r.final.ascensions).padStart(4),
      String(r.final.legendCount).padStart(5),
      String(r.final.stamps).padStart(7),
      String(r.final.beats).padStart(6),
      r.final.log10Cash.toFixed(1).padStart(7),
      `${r.wallMs}ms`.padStart(8),
    ].join(' '));
  }
}

// ---- CLI ----
function parseArgs(argv) {
  const opts = { hours: 40, dt: 5, every: 600, cadence: null, stall: 10, json: null, list: false, quick: false, ids: [] };
  const num = (flag, v, min = Number.MIN_VALUE) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min) { console.error(`${flag} needs a number >= ${min}, got "${v}"`); process.exit(1); }
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') opts.list = true;
    else if (a === '--quick') opts.quick = true;
    else if (a === '--hours') opts.hours = num(a, argv[++i]);
    else if (a === '--dt') opts.dt = num(a, argv[++i]);
    else if (a === '--every') opts.every = num(a, argv[++i]);
    else if (a === '--cadence') opts.cadence = num(a, argv[++i]);
    else if (a === '--stall') opts.stall = num(a, argv[++i], 0);
    else if (a === '--json') opts.json = argv[++i];
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a} (see the header of js/dev/demo.mjs)`); process.exit(1); }
    else opts.ids.push(a);
  }
  if (opts.quick) opts.hours = Math.min(opts.hours, 2);
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.list) {
    for (const sc of SCENARIOS) console.log(`  ${sc.id.padEnd(20)} ${sc.desc}`);
    return;
  }
  const chosen = opts.ids.length ? opts.ids.map(id => {
    const sc = getScenario(id);
    if (!sc) { console.error(`unknown scenario "${id}" — available: ${SCENARIOS.map(x => x.id).join(', ')}`); process.exit(1); }
    return sc;
  }) : SCENARIOS;
  const cad = opts.cadence !== null ? `, cadence ${fmtTime(opts.cadence)}` : '';
  console.log(`\n=== idleVaction demo playthroughs — ${opts.hours}h game time, dt ${opts.dt}s, snapshot every ${fmtTime(opts.every)}${cad} ===`);
  const results = [];
  for (const sc of chosen) {
    const r = runScenario(sc, { dt: opts.dt, maxHours: opts.hours, snapshotSec: opts.every, cadenceSec: opts.cadence, stallHours: opts.stall });
    results.push(r);
    printScenario(r);
  }
  if (results.length > 1) printComparison(results);
  if (opts.json) {
    const meta = { generatedAt: new Date().toISOString(), hours: opts.hours, dt: opts.dt, snapshotSec: opts.every, cadenceSec: opts.cadence, stallHours: opts.stall };
    writeFileSync(opts.json, JSON.stringify({ meta, results }, null, 1));
    console.log(`\n  wrote ${opts.json} (${results.length} scenario time-series)`);
  }
  console.log('');
}

// Only auto-run when executed directly (not when imported by selftest).
if (process.argv[1] && process.argv[1].endsWith('demo.mjs')) main();
