// report.mjs — simulation report generator for the dashboard (tools/dashboard/).
// Runs a suite of scenario playthroughs (js/dev/scenarios.mjs via demo.runScenario),
// distills each into a dashboard-ready record (series + events + per-milestone times),
// and writes ONE JSON the dashboard renders. Run:
//
//   npm run report                          default suite → tools/dashboard/data/report.json
//   npm run report -- greedy-crypto         only the named scenario(s)
//   npm run report -- --seeds 1,2,3         multi-seed sweep (market + Trip Events streams)
//   npm run report -- --hours 24 --every 300 --out /tmp/r.json
//   npm run report -- --quick               2h smoke (sanity-check the pipeline itself)
//
// The GOLDEN block below is the dashboard's reference: the selftest pins ([105]/[109])
// restated as data. It is deliberately duplicated here as the ONE place the dashboard
// reads — when a coordinated re-pin lands (docs/08 W5), update BOTH the selftest pins
// and this block in the same commit.
import { SCENARIOS, getScenario } from './scenarios.mjs';
import { runScenario } from './demo.mjs';
import { fmtTime } from '../util.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const GOLDEN = {
  // QUIET foundation pins (events off — the deterministic fitted economy, selftest [105]/[109]).
  // W5 outcome: these never moved through the whole Living-World pass.
  greedyIslandSec: 39440, greedyTolSec: 120,
  casualIslandSec: 76800, casualTolSec: 1200,
  // LIVING pins/bands (events on — the shipping default; selftest [115]): greedy is exactly
  // pinnable per stream (cadence-0 play is smooth); casual is DISTRIBUTIONAL — the persona's
  // 20-min cadence turns stream luck into ±1.5-3h of arrival spread, so its contract is a
  // seed-panel median band, never a single-stream pin.
  greedyLivingIslandSec: 38970,
  casualLivingMedianBandSec: [18 * 3600, 22 * 3600],
  casualLivingRailsSec: [15.5 * 3600, 23.5 * 3600],
  // the docs/05 §9 guard band for a greedy island under any accepted retune
  greedyBandSec: [6 * 3600, 12 * 3600],
  // the casual contract band (docs/08 W5): 18h–23h — applies to the quiet pin and the
  // living seed-panel MEDIAN (individual living streams are judged by the rails above)
  casualBandSec: [18 * 3600, 23 * 3600],
  // which run id anchors the deviation views (must be in the suite)
  baselineId: 'greedy-vlogger',
  // peak log10(cash) policy ceiling (docs/math-proof.md — BigNumber threshold)
  peakLog10Max: 290,
};

// default suite: baseline + the ~20h persona + the boost persona (the living layer's A/B) +
// the three branch lanes + the prestige loop
const DEFAULT_SUITE = ['greedy-vlogger', 'casual-tourist', 'casual-booster', 'greedy-traveler',
  'greedy-crypto', 'greedy-connoisseur', 'ascension-loop'];

// 4-significant-digit rounding keeps the committed sample JSON small without losing
// anything a chart can show. Times (t) stay exact.
function sig4(x) {
  if (!Number.isFinite(x) || x === 0) return x;
  const m = Math.pow(10, 3 - Math.floor(Math.log10(Math.abs(x))));
  return Math.round(x * m) / m;
}

function compactSeries(series) {
  return series.map(r => {
    const out = {};
    for (const [k, v] of Object.entries(r)) out[k] = k === 't' ? v : (typeof v === 'number' ? sig4(v) : v);
    return out;
  });
}

// per-milestone arrival times — the deviation view's raw material. First arrival only
// (a prestige rerun's second pass at tier 3 is not "when the run first got there").
function milestoneTimes(events) {
  const beatTimes = {}, tierTimes = {};
  for (const e of events) {
    if (e.type === 'beat' && !(e.beat in beatTimes)) beatTimes[e.beat] = e.t;
    if (e.type === 'tier' && !(e.tier in tierTimes)) tierTimes[e.tier] = e.t;
  }
  return { beatTimes, tierTimes };
}

function summarize(r, seed) {
  const peak = r.series.reduce((m, row) => Math.max(m, row.log10Cash || 0), 0);
  return {
    id: r.id, seed, key: seed === null ? r.id : `${r.id}#${seed}`,
    name: r.name, params: r.params,
    islandAt: r.islandAt, stalled: r.stalled, peakLog10: sig4(peak),
    acts: r.acts, wallMs: r.wallMs,
    ...milestoneTimes(r.events),
    final: r.final ? Object.fromEntries(Object.entries(r.final).map(([k, v]) => [k, typeof v === 'number' ? sig4(v) : v])) : null,
    tree: r.tree, legendPerks: r.legendPerks,
    events: r.events,
    series: compactSeries(r.series),
  };
}

function parseArgs(argv) {
  const opts = { out: 'tools/dashboard/data/report.json', hours: 40, dt: 5, every: 600, seeds: [null], quick: false, ids: [] };
  const num = (flag, v, min = Number.MIN_VALUE) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min) { console.error(`${flag} needs a number >= ${min}, got "${v}"`); process.exit(1); }
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quick') opts.quick = true;
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--hours') opts.hours = num(a, argv[++i]);
    else if (a === '--dt') opts.dt = num(a, argv[++i]);
    else if (a === '--every') opts.every = num(a, argv[++i]);
    else if (a === '--seeds') opts.seeds = argv[++i].split(',').map(s => num('--seeds', s.trim(), 0));
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a} (see the header of js/dev/report.mjs)`); process.exit(1); }
    else opts.ids.push(a);
  }
  if (opts.quick) { opts.hours = Math.min(opts.hours, 2); opts.every = Math.min(opts.every, 300); }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const ids = opts.ids.length ? opts.ids : DEFAULT_SUITE;
  const chosen = ids.map(id => {
    const sc = getScenario(id);
    if (!sc) { console.error(`unknown scenario "${id}" — available: ${SCENARIOS.map(x => x.id).join(', ')}`); process.exit(1); }
    return sc;
  });
  const runs = [];
  for (const sc of chosen) {
    for (const seed of opts.seeds) {
      const label = seed === null ? sc.id : `${sc.id}#${seed}`;
      process.stdout.write(`  running ${label} …`);
      const r = runScenario(sc, { dt: opts.dt, maxHours: opts.hours, snapshotSec: opts.every, seed });
      runs.push(summarize(r, seed));
      console.log(` island ${r.islandAt !== null ? fmtTime(r.islandAt) : (r.stalled ? 'STALLED' : '—')} (${r.wallMs}ms)`);
    }
  }
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      hours: opts.hours, dt: opts.dt, snapshotSec: opts.every,
      seeds: opts.seeds, suite: ids,
    },
    golden: GOLDEN,
    runs,
  };
  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, JSON.stringify(report));
  const kb = Math.round(Buffer.byteLength(JSON.stringify(report)) / 1024);
  console.log(`\n  wrote ${opts.out} (${runs.length} runs, ${kb} KB)`);
  console.log(`  view: npm run serve → http://localhost:8080/tools/dashboard/`);
}

if (process.argv[1] && process.argv[1].endsWith('report.mjs')) main();
