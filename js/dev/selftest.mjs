// selftest.mjs — headless sanity + balance harness. Run: `node js/dev/selftest.mjs`.
// Imports the SAME engine the browser uses (no DOM modules) and simulates a
// "reasonable player" policy, printing the story-beat time curve. See docs/05.
import { CONFIG as C } from '../config.js';
import { DATA } from '../data/index.js';
import * as ST from '../state.js';
import * as E from '../engine.js';
import * as M from '../math.js';
import * as P from '../prestige.js';
import { fmt, fmtTime } from '../util.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.error('  ✗ FAIL:', msg); fails++; } else console.log('  ✓', msg); };

// ---------- greedy "reasonable player" policy ----------
function playStep(s) {
  // 0) bootstrap: if there is no income at all, buy the cheapest tier outright
  //    (a real player spends their last €15 to get the engine turning).
  if (M.tierProd(s, 0) <= 0 && E.genCost(s, 0, 1) <= s.resources.cash) E.buyGenerator(s, 0, 1);

  // 1) accommodation: big Comfort jumps — always worth it when unlocked+affordable
  let guard = 0;
  while (E.accUnlocked(s) && E.accCost(s) <= s.resources.cash * 0.7 && guard++ < 5) E.buyAccommodation(s);

  // 2) small-win amenities (each < 30% of current cash)
  for (const a of DATA.amenities)
    if (E.amenityUnlocked(s, a.id) && E.amenityCost(s, a.id) <= s.resources.cash * 0.3) E.buyAmenity(s, a.id);

  // 3) personal growth (cheap fraction of cash)
  for (const t of DATA.training) if (E.trainingCost(s, t.id) <= s.resources.cash * 0.08) E.buyTraining(s, t.id);
  if (E.pathCost(s, 'vlogger') <= s.resources.cash * 0.08) E.buyPathFocus(s, 'vlogger');

  // 4) reinvest into income: buy the highest tier costing ≤70% of cash (leaves a
  //    reserve for comfort spending next step). 70% still lets the first D1 through.
  for (let iter = 0; iter < 40; iter++) {
    let k = -1;
    for (let i = DATA.generators.length - 1; i >= 0; i--) {
      if (s.generators[i].unlocked && E.genCost(s, i, 1) <= s.resources.cash * 0.7) { k = i; break; }
    }
    if (k < 0) break;
    E.buyGenerator(s, k, 1);
  }

  // 5) generator upgrades when very cheap
  for (let k = 0; k < DATA.generators.length; k++)
    if (s.generators[k].unlocked && E.genUpgradeCost(s, k) <= s.resources.cash * 0.1) E.buyGenUpgrade(s, k);

  // 6) pick a branch at the choice beat
  if (s.story.seen.includes(6) && s.story.branch === 'neutral') E.applyStoryChoice(s, 6, 'vlogger');
}

function approx(a, b, rel = 1e-9) { return Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)); }
function deepFreeze(o) {
  for (const k of Object.getOwnPropertyNames(o)) {
    const v = o[k];
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  }
  return Object.freeze(o);
}

console.log('\n=== idleVaction self-test ===\n');

// ---------- 0. the shed ledger — schema (E01-S1-T10) ----------
console.log('[0] state schema (frozen fresh newGame())');
const schema = deepFreeze(ST.newGame());
ok(typeof schema.version === 'number' && schema.version === C.SAVE_VERSION, 'schema: version stamped');
ok(typeof schema.resources.cash === 'number', 'schema: resources.cash is a number');
ok(schema.generators && schema.generators[0] && typeof schema.generators[0].bought === 'number', 'schema: generators has a D1 slot');
ok(schema.accommodation.tier === 0, 'schema: accommodation starts at tier 0 (the Soggy Shed)');
ok(schema.story && typeof schema.story.flags === 'object' && Array.isArray(schema.story.seen) && 'branch' in schema.story, 'schema: story slice (flags/seen/branch) reserved');
ok(typeof schema.meta.createdAt === 'number' && typeof schema.meta.lastSeen === 'number', 'schema: meta timestamps present');
ok(schema.stats && typeof schema.stats.totalClicks === 'number' && typeof schema.stats.runSec === 'number', 'schema: stats slice present');
try { schema.resources.cash = 999; } catch (e) { /* strict-mode frozen assignment throws — that's fine */ }
ok(schema.resources.cash === 15, 'schema: frozen fresh state resists mutation');

// ---------- 1. determinism / basics ----------
console.log('[1] basics');
let s = ST.newGame();
ok(s.resources.cash === 15, 'new game starts with €15');
ok(s.story.seen.includes(1) && DATA.story[0].id === 1 && DATA.story[0].title === 'Rain Check', 'beat 1 (Rain Check) has fired on a fresh game, setting the scene');
ok(E.genCost(s, 0, 1) <= s.resources.cash, 'the first Odd Job is affordable immediately (cold start solved)');
E.tick(s, 1);
ok(Number.isFinite(s.resources.cash), 'cash finite after tick');
ok(s.generators[0].unlocked, 'D1 unlocked at start');

// ---------- 2. purchases ----------
console.log('\n[2] purchases');
s.resources.cash = 1e5;                 // enough for 10× D1 at the fitted growth=1.8
const before = s.generators[0].count;
ok(E.buyGenerator(s, 0, 10), 'can buy 10× D1');
ok(s.generators[0].count === before + 10, 'count increased by 10');
ok(M.milestoneMult(10) === 2, 'first milestone doubling at 10 buys');
const boughtNotifs = E.drainNotifications(s);
ok(boughtNotifs.some(n => /milestone/i.test(n.text)), 'crossing a milestone (bought→10) fires a player-visible notification (E01-S4-T5)');

// ---------- 2b. golden curve snapshot (E01-S8-T9 / S10-T7): D1 cost + milestoneMult
// at boundary buy counts, pinned against config's current base/growth so a later
// refactor (not a deliberate retune) can't silently shift the early curve. ----------
console.log('\n[2b] golden D1 curve (cost + milestone boundaries)');
ok(M.unitCost(0, 0) === C.GEN.base[0], 'unitCost(0,0) == base cost');
ok(approx(M.unitCost(0, 9), 2975.3893555200007), 'unitCost(0,9) matches the golden snapshot');
ok(approx(M.unitCost(0, 10), 5355.700839936001), 'unitCost(0,10) matches the golden snapshot');
ok(approx(M.unitCost(0, 10) / M.unitCost(0, 9), C.GEN.growth[0]), 'cost grows by exactly growth[0] per unit');
ok(M.milestoneMult(0) === 1, 'milestoneMult(0) == 1 (no doublings yet)');
ok(M.milestoneMult(9) === 1, 'milestoneMult(9) == 1 (one buy shy of the first double)');
ok(M.milestoneMult(10) === 2, 'milestoneMult(10) == 2 (first ×2 lands exactly at buy 10)');
ok(M.milestoneMult(50) === 24, 'milestoneMult(50) == 24 (soft-capped tail past the knee)');

// ---------- 2c. optional tap — additive + soft-capped (E01-S5) ----------
console.log('\n[2c] tap: additive and soft-capped');
const tapState = ST.newGame();
tapState.resources.cash = 0;
const firstTap = E.click(tapState);
ok(firstTap >= 1, `a bare tap grants a small flat gain (+${fmt(firstTap)})`);
ok(tapState.stats.totalClicks === 1, 'tap increments stats.taps (totalClicks)');
let cappedAt = -1;
for (let i = 0; i < C.TAP.maxPerSec + 5; i++) { if (E.click(tapState) === 0) { cappedAt = i; break; } }
ok(cappedAt >= 0, `tap spam soft-caps at ${C.TAP.maxPerSec}/sec — an autoclicker can't trivialize the economy`);
E.tick(tapState, 1.1);                  // roll the 1-second window over
ok(E.click(tapState) > 0, 'tap registers again once the 1-second window rolls over');
ok(M.tierProd(ST.newGame(), 0) === 0 && E.click(ST.newGame()) >= 1, 'tap works even with zero idle income — never a gate on progress');

// ---------- 2d. number formatter edge cases (E01-S8-T10) ----------
console.log('\n[2d] number formatter edges');
ok(fmt(0) === '0.00', 'fmt(0) renders cleanly (no NaN/undefined)');
ok(fmt(999) === '999', 'fmt(999) stays a plain integer just under the K boundary');
ok(fmt(1000) === '1.00K', 'fmt(1000) crosses into the K suffix');
ok(fmt(1e6) === '1.00M', 'fmt(1e6) renders with the M suffix');
ok(fmt(1e-3) === '0.00', 'fmt(1e-3) degrades to 0.00, never scientific notation for tiny positives');
ok(fmt(NaN) === '0', 'fmt(NaN) is guarded, never displays "NaN"');
ok(fmt(-42).startsWith('-'), 'fmt(negative) shows a sign rather than breaking');

// ---------- 3. full run: story-beat curve ----------
console.log('\n[3] simulated run (greedy policy) — story beat unlock times');
s = ST.newGame();
const beatTime = {};
const dt = 2;                 // 2-second logical steps (fast harness; online uses 0.1s)
const maxHours = 24;
let peakTier = 0, climaxAt = null;
for (let t = 0; t < maxHours * 3600; t += dt) {
  E.tick(s, dt);
  playStep(s);
  peakTier = Math.max(peakTier, s.accommodation.tier);
  for (const b of s.story.seen) if (beatTime[b] === undefined) beatTime[b] = t;
  // stop at the pre-ascension climax: reaching the Villa era / Beat 26.
  // (Beats 27/28 need an ascension & Legacy — covered by the dedicated test below.)
  if (climaxAt === null && (peakTier >= 18 || s.story.seen.includes(26))) { climaxAt = t; break; }
}
const beats = Object.keys(beatTime).map(Number).sort((a, b) => a - b);
for (const b of beats) {
  const bd = DATA.story.find(x => x.id === b);
  console.log(`   Beat ${String(b).padStart(2)} @ ${fmtTime(beatTime[b]).padEnd(10)}  ${bd.title}`);
}
console.log(`   → peak accommodation: ${DATA.accommodation[peakTier].name} (tier ${peakTier}), lifetime €${fmt(s.stats.lifetimeCash)}, comfort ${fmt(s.resources.comfort)}`);
ok(beats.length >= 12, `reached ≥12 story beats (got ${beats.length}) within ${maxHours}h`);
ok(s.stats.lifetimeCash > 1e6, `economy grew (lifetime €${fmt(s.stats.lifetimeCash)})`);
ok(peakTier >= 6, `climbed the ladder to ≥ 3-star pool (tier ${peakTier})`);
ok(Number.isFinite(s.resources.comfort) && s.resources.comfort > 0, `comfort positive & finite (${fmt(s.resources.comfort)})`);

// ---------- 4. ascension + tree (deterministic, crafted state) ----------
console.log('\n[4] ascension + skill tree');
const a = ST.newGame();
a.stats.lifetimeCashThisTree = 1e10;   // a big run
a.stats.runSec = 300;
a.accommodation.tier = 12;
ok(P.canAscend(a), 'canAscend true after a big run');
const ascendLegacy = P.legacyPreview(a);
ok(ascendLegacy >= 1, `ascend preview ≥ 1 Legacy (+${ascendLegacy})`);
ok(P.ascend(a), 'ascend() succeeds');
ok(a.ascension.count === 1, 'ascension count incremented');
ok(a.accommodation.tier === 0, 'run reset to the shed (tier 0)');
ok(a.resources.legacy >= 1, `banked Legacy (${a.resources.legacy})`);
a.resources.legacy += 100;
ok(P.buyNode(a, 'sun_kissed'), 'can buy a tree node with Legacy');
ok((a.ascension.tree.sun_kissed || 0) === 1, 'sun_kissed rank = 1');
ok(Math.abs(M.treeIncomeMult(a) - 1.15) < 1e-9, 'sun_kissed gives ×1.15 income');
P.respec(a);
ok(!a.ascension.tree.sun_kissed, 'respec clears the tree');

// ---------- 5. save round-trip + migration ----------
console.log('\n[5] save / migrate');
const json = JSON.stringify(s);
const reloaded = ST.migrate(JSON.parse(json));
ok(reloaded.version === C.SAVE_VERSION, 'save version stamped');
ok(reloaded.accommodation.tier === s.accommodation.tier, 'accommodation survives round-trip');
// backfill: an old save missing a field still loads
const partial = JSON.parse(json); delete partial.paths;
const fixed = ST.migrate(partial);
ok(fixed.paths && fixed.paths.vlogger, 'migration backfills missing sections');

// ---------- 6. offline ----------
console.log('\n[6] offline progress');
const s2 = ST.newGame(); s2.resources.cash = 1e12; E.buyGenerator(s2, 0, 20); E.buyGenerator(s2, 1, 10);
ok(M.tierProd(s2, 0) > 0, `generators produce income pre-offline (${fmt(M.tierProd(s2, 0))}/s)`);
const cashPre = s2.resources.cash;
const rep = E.applyOffline(s2, 3600 * 1000); // 1h away
ok(rep && rep.cash > 0, `offline awarded cash (+${fmt(rep.cash)} in 1h)`);
ok(s2.resources.cash > cashPre, 'offline increased cash');

// ---------- 7. E02: amenity data QA (E02-S1-T10) ----------
console.log('\n[7] amenity data validation');
{
  const seenIds = new Set();
  for (const a of DATA.amenities) {
    ok(!seenIds.has(a.id), `amenity id is unique: ${a.id}`);
    seenIds.add(a.id);
    ok(a.costBase > 0, `${a.id}: costBase > 0`);
    const g = a.costGrowth || C.AMENITY.growthDefault;
    ok(g > 1, `${a.id}: effective costGrowth > 1 (${g})`);
    ok(a.comfort >= 0, `${a.id}: comfort >= 0`);
  }
}

// ---------- 7b. buyAmenity progression (E02-S2-T10 / S5-T10) ----------
console.log('\n[7b] buyAmenity progression');
{
  const am = ST.newGame();
  const bugSpray = DATA.amenities.find(x => x.id === 'bug_spray');
  am.resources.cash = 0;
  ok(!E.buyAmenity(am, 'bug_spray'), 'buyAmenity is blocked at zero cash');
  ok(am.amenities.bug_spray.level === 0, 'level unchanged after a blocked buy');

  am.resources.cash = 1e5;
  const cost0 = E.amenityCost(am, 'bug_spray');
  ok(approx(cost0, bugSpray.costBase), 'level-0 cost equals costBase');
  const comfortBefore = am._comfortCache;
  ok(E.buyAmenity(am, 'bug_spray'), 'buyAmenity succeeds with enough cash');
  ok(am.amenities.bug_spray.level === 1, 'level incremented to 1 on a successful buy');
  ok(am._comfortCache > comfortBefore, 'a successful buy recomputes state._comfortCache upward');

  const cost1 = E.amenityCost(am, 'bug_spray');
  ok(cost1 > cost0, 'cost rises with level');
  const growth = bugSpray.costGrowth || C.AMENITY.growthDefault;
  ok(approx(cost1 / cost0, growth), `cost grows by exactly costGrowth (${growth}) per level`);
}

// ---------- 7c. Comfort monotonicity + no cliffs (E02-S2-T10 / S8-T9/T10 / S10-T4) ----------
console.log('\n[7c] Comfort monotonicity and continuity');
{
  const mono = ST.newGame(); mono.resources.cash = 1e9;
  let prevComfort = -Infinity, monoComfort = true;
  for (let i = 0; i < 20; i++) {
    E.buyAmenity(mono, 'bug_spray');
    const c = M.computeComfort(mono, DATA);
    if (c < prevComfort - 1e-9) monoComfort = false;
    prevComfort = c;
  }
  ok(monoComfort, 'computeComfort is non-decreasing as amenity levels rise');

  const probe = ST.newGame();
  let prevL = -Infinity, monoL = true, geOne = true;
  for (const c of [0, 1, 10, 50, 100, 500, 1000, 1e4, 1e5, 1e6, 1e7, 1e9]) {
    probe._comfortCache = c;
    const L = M.comfortMultiplier(probe);
    if (L < 1 - 1e-9) geOne = false;
    if (L < prevL - 1e-9) monoL = false;
    prevL = L;
  }
  ok(monoL, 'comfortMultiplier is monotonic non-decreasing across a wide range of comfort values');
  ok(geOne, 'comfortMultiplier (L_comfort) is always >= 1');

  // continuity: a tiny bump in comfort should never produce a big jump in L_comfort
  // (the log has no cliffs) — checked at several magnitudes.
  let noCliffs = true;
  for (const c of [0, 1, 100, 1e4, 1e6, 1e8]) {
    probe._comfortCache = c;
    const L1 = M.comfortMultiplier(probe);
    probe._comfortCache = c + 1e-3;
    const L2 = M.comfortMultiplier(probe);
    if (Math.abs(L2 - L1) > 0.01) noCliffs = false;
  }
  ok(noCliffs, 'comfortMultiplier is continuous — no cliffs on tiny comfort deltas');
}

// ---------- 7d. integration: amenities → Comfort → cash/s (E02-S10-T5) ----------
console.log('\n[7d] integration: buying amenities raises Comfort and cash/s');
{
  const ig = ST.newGame();
  ig.resources.cash = 1e7;
  E.buyGenerator(ig, 0, 20);
  ig._comfortCache = M.computeComfort(ig, DATA);
  const comfortBefore = ig._comfortCache;
  const prodBefore = M.tierProd(ig, 0);
  ok(prodBefore > 0, `baseline income established (${fmt(prodBefore)}/s)`);

  let boughtAny = false;
  for (const a of DATA.amenities.filter(x => x.tag === 'motel')) {
    while (E.amenityUnlocked(ig, a.id) && E.amenityCost(ig, a.id) <= ig.resources.cash) {
      if (E.buyAmenity(ig, a.id)) boughtAny = true; else break;
    }
  }
  ok(boughtAny, 'bought at least one motel amenity');
  const prodAfter = M.tierProd(ig, 0);
  ok(ig._comfortCache > comfortBefore, 'buying motel amenities raised Comfort');
  ok(prodAfter > prodBefore, 'higher Comfort raised per-second cash output via L_comfort end-to-end');
}

// ---------- 7e. amenity-unlock flash fires once (E02-S3-T7 / S5-T5) ----------
console.log('\n[7e] amenity unlock flash: fires once, never repeats');
{
  const fl = ST.newGame();
  E.tick(fl, 0.01);
  const notifs1 = E.drainNotifications(fl);
  const flash1 = notifs1.filter(n => /New little luxury unlocked/.test(n.text));
  ok(flash1.length > 0, `amenity-unlock flash fires once threshold is met (got ${flash1.length})`);

  E.tick(fl, 0.01);
  const notifs2 = E.drainNotifications(fl);
  ok(!notifs2.some(n => /New little luxury unlocked/.test(n.text)), 'flash does not re-fire on a subsequent tick');

  const reloadedFl = ST.migrate(JSON.parse(JSON.stringify(fl)));
  E.tick(reloadedFl, 0.01);
  const notifs3 = E.drainNotifications(reloadedFl);
  ok(!notifs3.some(n => /New little luxury unlocked/.test(n.text)), 'flash does not re-fire after a save/reload round-trip');
}

console.log(`\n=== ${fails === 0 ? 'ALL PASS ✅' : fails + ' FAILURE(S) ❌'} ===\n`);
process.exit(fails === 0 ? 0 : 1);
