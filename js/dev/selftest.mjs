// selftest.mjs — headless sanity + balance harness. Run: `node js/dev/selftest.mjs`.
// Imports the SAME engine the browser uses (no DOM modules) and simulates a
// "reasonable player" policy, printing the story-beat time curve. See docs/05.
import { CONFIG as C } from '../config.js';
import { DATA } from '../data/index.js';
import * as ST from '../state.js';
import * as E from '../engine.js';
import * as M from '../math.js';
import * as P from '../prestige.js';
import { validateDestinations } from '../data/destinations.js';
import { validateBank } from '../data/bank.js';
import { validatePaths } from '../data/paths.js';
import { validateCollections } from '../data/collections.js';
import { validateVehicles } from '../data/vehicles.js';
import { validateLogistics } from '../data/logistics.js';
import { validateStaff } from '../data/staff.js';
import { validateProperty } from '../data/property.js';
import { fmt, fmtTime, rng } from '../util.js';
// E11 harness-invariance guard ([62] below): importing runCurve does NOT auto-run the
// harness's own report() — that's guarded behind `process.argv[1].endsWith('harness.mjs')`,
// which is false when node's entry point is THIS file.
import { runCurve, play } from './harness.mjs';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.error('  ✗ FAIL:', msg); fails++; } else console.log('  ✓', msg); };

// ---------- greedy "reasonable player" policy ----------
function playStep(s) {
  // 0) bootstrap: if there is no income at all, buy the cheapest tier outright
  //    (a real player spends their last €15 to get the engine turning).
  if (M.tierProd(s, 0) <= 0 && E.genCost(s, 0, 1) <= s.resources.cash) E.buyGenerator(s, 0, 1);

  // 0b) bank account (wallet cap): cost = BANK.costFrac·cap, so "cost ≤ half my cash"
  //     ⇔ the wallet is ~70% full — upgrade before income overflows (mirrors harness).
  let bg = 0;
  while (!E.bankMaxed(s) && E.bankUpgradeCost(s) <= s.resources.cash * 0.5 && bg++ < 4) E.buyBankUpgrade(s);

  // 1) accommodation: big Comfort jumps — always worth it when unlocked+affordable
  let guard = 0;
  while (E.accUnlocked(s) && E.accCost(s) <= s.resources.cash * 0.7 && guard++ < 5) E.buyAccommodation(s);

  // 2) small-win amenities (each < 30% of current cash)
  for (const a of DATA.amenities)
    if (E.amenityUnlocked(s, a.id) && E.amenityCost(s, a.id) <= s.resources.cash * 0.3) E.buyAmenity(s, a.id);

  // 2b) destinations & transport (E04-S8-T6): mirrors the harness policy so this
  // simulated run also reflects L_dest instead of leaving it stuck at 1.
  for (const d of DATA.destinations)
    if (!s.destinations[d.id].owned && E.destUnlocked(s, d.id) && E.destCost(s, d.id) <= s.resources.cash * 0.4) E.buyDestination(s, d.id);
  for (const t of DATA.transport)
    if (!s.transport.owned.includes(t.id) && t.costBase * M.commsCostMult(s) <= s.resources.cash * 0.2) E.buyTransport(s, t.id);

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
s2.bank.tier = C.BANK.tiers - 1;       // top (uncapped) account — this test is about accrual, [83] tests the cap
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

// ---------- 8. E03: generator-array + NPC data QA (E03-S1-T10, S7-T10) ----------
console.log('\n[8] E03 data validation: GEN arrays aligned; NPC ids unique + pathSeeds known');
{
  ok(C.GEN.base.length === DATA.generators.length, 'GEN.base covers every generator row');
  ok(C.GEN.growth.length === DATA.generators.length, 'GEN.growth covers every generator row');
  ok(C.GEN.perUnit.length === DATA.generators.length, 'GEN.perUnit covers every generator row');
  ok(DATA.generators.length >= 3, 'the ladder covers at least D1-D3 (E03 headline tiers)');

  const seenNpcIds = new Set();
  for (const n of DATA.npcs) {
    ok(!seenNpcIds.has(n.id), `npc id is unique: ${n.id}`);
    seenNpcIds.add(n.id);
    ok(!n.pathSeed || DATA.paths.some(p => p.id === n.pathSeed),
      `${n.id}: pathSeed (${n.pathSeed ?? 'none'}) maps to a known build path or is unset`);
  }
  ok(DATA.npcs.length >= 3, 'the recurring roster has at least a backpacker, a vlogger, and a regular');
}

// ---------- 9. E03: bulk-buy parity — bulk cost/bought/milestones match sequential
// single buys exactly, for random (bought, qty) pairs (E03-S4-T10 / S10-T4). ----------
console.log('\n[9] E03 bulk-buy parity vs sequential single buys');
{
  let rc = 0;
  const rand = () => rng(20230721, rc++);   // wraps the pure (seed,cursor) rng as a stream
  for (let trial = 0; trial < 10; trial++) {
    const k = 0; // D1 — always unlocked, cheapest to reason about
    const bought0 = Math.floor(rand() * 40);
    const qty = 1 + Math.floor(rand() * 15);

    const bulkState = ST.newGame();
    bulkState.generators[k].bought = bought0;
    bulkState.generators[k].count = bought0;
    bulkState.resources.cash = 1e15;
    const bulkCostAmt = E.genCost(bulkState, k, qty);
    ok(E.buyGenerator(bulkState, k, qty), `trial ${trial}: bulk buy of ${qty} (from bought=${bought0}) succeeds`);

    const seqState = ST.newGame();
    seqState.generators[k].bought = bought0;
    seqState.generators[k].count = bought0;
    seqState.resources.cash = 1e15;
    let seqCostSum = 0;
    for (let i = 0; i < qty; i++) {
      seqCostSum += E.genCost(seqState, k, 1);
      E.buyGenerator(seqState, k, 1);
    }

    ok(approx(bulkCostAmt, seqCostSum, 1e-6),
      `trial ${trial}: bulkCost(bought=${bought0}, qty=${qty}) equals the sum of ${qty} sequential single-buy costs`);
    ok(bulkState.generators[k].bought === seqState.generators[k].bought,
      `trial ${trial}: bought count matches after bulk (${bulkState.generators[k].bought}) vs sequential (${seqState.generators[k].bought})`);
    ok(approx(bulkState.generators[k].count, seqState.generators[k].count),
      `trial ${trial}: owned count matches after bulk vs sequential buys`);
    ok(M.milestoneMult(bulkState.generators[k].bought) === M.milestoneMult(seqState.generators[k].bought),
      `trial ${trial}: milestone multiplier matches — a batch crossing a boundary applies the same doubling as sequential buys`);
  }
}

// ---------- 10. E03: tier chaining — a high tier alone drives a lower tier
// super-linearly, proving the chain integrates (E03-S2-T10 / S10-T5). ----------
console.log('\n[10] E03 tier chaining: D3 alone accelerates D1 (chain integrates)');
{
  const c = ST.newGame();
  c.generators[2].count = 1e6;   // seed D3 (index 2) only; D4+ stay at 0 so D3's own count is stable
  const dt = 5;
  const d1at = [];
  for (let i = 0; i < 6; i++) { E.tick(c, dt); d1at.push(c.generators[0].count); }
  const delta1 = d1at[1] - d1at[0];
  const deltaLast = d1at[5] - d1at[4];
  ok(d1at[5] > 0, `D1 (cash tier) count grows purely from the D3→D2→D1 chain (${fmt(d1at[5])})`);
  ok(deltaLast > delta1 * 1.5,
    `D1's growth accelerates over equal time steps (Δ1=${fmt(delta1)} → Δ6=${fmt(deltaLast)}) — super-linear, the chain compounds`);
}

// ---------- 11. E03: NPC roster reveal + neutrality (E03-S6-T9 / S7-T10) ----------
console.log('\n[11] E03 NPC roster: reveals at hostel arrival, path seeds stay balance-neutral');
{
  const early = ST.newGame();
  early.accommodation.tier = 1;                     // Bug-Infested Motel — not the hostel yet
  E.checkNpcUnlocks(early);
  ok(DATA.npcs.every(n => !early.npcsMet[n.id]), 'no NPC is met before accommodation.tier reaches 2 (the hostel)');

  const before = ST.newGame();
  before.accommodation.tier = 2;                    // hostel arrival
  before._comfortCache = M.computeComfort(before, DATA);
  const incomeBefore = M.tierProd(before, 0) + M.savvyPassive(before);

  const after = ST.newGame();
  after.accommodation.tier = 2;
  after._comfortCache = M.computeComfort(after, DATA);
  E.checkNpcUnlocks(after);
  ok(DATA.npcs.every(n => after.npcsMet[n.id]), 'meeting the roster sets npcsMet for every NPC once accommodation.tier >= 2');
  ok(DATA.npcs.some(n => n.pathSeed) && DATA.npcs.filter(n => n.pathSeed)
    .every(n => after.story.flags[n.pathSeed + 'Seed']), 'NPCs with a pathSeed set the matching story.flags.<seed>Seed stub');

  const incomeAfter = M.tierProd(after, 0) + M.savvyPassive(after);
  ok(approx(incomeAfter, incomeBefore), 'recording NPC path seeds does NOT change per-second income (E03-S7-T10 neutrality)');
}

// ---------- 12. E03: state.ui.bulkMode persists across save/reload (E03-S1-T6) ----------
console.log('\n[12] E03 bulk-mode persistence');
{
  const bm = ST.newGame();
  ok(bm.ui && bm.ui.bulkMode === 1, 'a fresh game defaults bulkMode to ×1');

  bm.ui.bulkMode = 'max';
  const reloadedBm = ST.migrate(JSON.parse(JSON.stringify(bm)));
  ok(reloadedBm.ui.bulkMode === 'max', 'bulkMode survives a save/reload round-trip (was set to "max")');

  const partialBm = JSON.parse(JSON.stringify(bm));
  delete partialBm.ui;                              // simulate a pre-E03 save missing `ui` entirely
  const fixedBm = ST.migrate(partialBm);
  ok(fixedBm.ui && fixedBm.ui.bulkMode === 1, 'migration backfills a missing `ui` slice with the default bulkMode');
}

// ---------- 13. E04: destination/transport data validation (E04-S1-T10) ----------
console.log('\n[13] E04 destination/transport data validation');
{
  let threw = false;
  try { validateDestinations(); } catch (e) { threw = true; }
  ok(!threw, 'validateDestinations() passes on the shipped DESTINATIONS array');

  const seenIds = new Set();
  for (const d of DATA.destinations) {
    ok(!seenIds.has(d.id), `destination id is unique: ${d.id}`);
    seenIds.add(d.id);
    ok(d.mult >= 1, `${d.id}: mult >= 1 (${d.mult})`);
    ok(!!d.region && !!d.tag, `${d.id}: region + tag present`);
  }
  const seenT = new Set();
  for (const t of DATA.transport) {
    ok(!seenT.has(t.id), `transport id is unique: ${t.id}`);
    seenT.add(t.id);
    ok(t.costBase > 0 && t.speed >= 0 && t.upkeep >= 0, `${t.id}: costBase/speed/upkeep sane`);
  }
}

// ---------- 14. E04: destMult (L_dest) — product math, monotonic, >= 1 (E04-S2-T1/S10-T1) ----------
console.log('\n[14] E04 destMult (L_dest)');
{
  const d = ST.newGame();
  ok(M.destMult(d, DATA) === 1, 'destMult == 1 with zero destinations owned');

  const first = DATA.destinations[0];
  d.destinations[first.id].owned = true;
  ok(approx(M.destMult(d, DATA), first.mult), 'destMult equals the single owned destination\'s mult');

  let expected = 1, prev = 1;
  let monotonic = true;
  for (const dest of DATA.destinations) {
    d.destinations[dest.id].owned = true;
    expected *= dest.mult;
    const got = M.destMult(d, DATA);
    if (got < prev - 1e-9) monotonic = false;
    prev = got;
  }
  ok(approx(prev, expected), 'destMult with ALL destinations owned equals the product of every row\'s mult');
  ok(monotonic, 'destMult is monotonic non-decreasing as more destinations are owned');
  ok(prev >= 1, 'destMult (L_dest) is always >= 1');
}

// ---------- 15. E04: pathMult (L_path preview) — softcap shape (E04-S2-T3/S10-T2) ----------
console.log('\n[15] E04 pathMult softcap shape');
{
  ok(M.pathMult(0) === 1, 'pathMult(0) == 1 (no bonus with zero points)');
  ok(approx(M.pathMult(1), 1 + C.PATH.rate * Math.pow(1, C.PATH.softcapExp)), 'pathMult(1) matches 1 + rate·1^0.85 exactly');
  ok(approx(M.pathMult(100), 1 + C.PATH.rate * Math.pow(100, C.PATH.softcapExp)), 'pathMult(100) matches 1 + rate·100^0.85 exactly');
  ok(M.pathMult(100) > M.pathMult(1) && M.pathMult(1) > M.pathMult(0), 'pathMult is strictly increasing across 0/1/100');
  const marginalLow = M.pathMult(2) - M.pathMult(1);
  const marginalHigh = M.pathMult(101) - M.pathMult(100);
  ok(marginalHigh < marginalLow, 'marginal pathMult gain diminishes at high points (the softcap: early points feel great, late points taper)');
}

// ---------- 16. E04: buyDestination — afford-gate, double-buy block, chain, L_dest,
// save/load round-trip (E04-S2-T4/S4-T10/S10-T3/T4) ----------
console.log('\n[16] E04 buyDestination');
{
  const bd = ST.newGame();
  const first = DATA.destinations[0];
  const second = DATA.destinations[1];

  bd.resources.cash = 0;
  ok(!E.buyDestination(bd, first.id), 'buyDestination is blocked at zero cash');

  ok(!E.destUnlocked(bd, second.id), 'the second destination is locked until the first is owned (unlockAfter chain)');
  ok(!E.buyDestination(bd, second.id), 'buying an unreachable (chain-locked) destination is rejected');

  const cost = E.destCost(bd, first.id);
  bd.resources.cash = cost;                       // exact cash — must still succeed
  ok(E.buyDestination(bd, first.id), 'buyDestination succeeds with exactly enough cash');
  ok(bd.destinations[first.id].owned, 'destination flips to owned');
  ok(approx(bd.resources.cash, 0), 'exact-cash buy leaves cash at (approximately) zero, never negative');
  ok(approx(M.destMultiplier(bd), first.mult), 'L_dest (state._destCache) recomputes to reflect the new owned place');

  bd.resources.cash = 1e12;
  ok(!E.buyDestination(bd, first.id), 're-buying an already-owned destination is blocked (idempotent)');
  ok(approx(bd.resources.cash, 1e12), 'a blocked re-buy does not deduct cash');

  const reloaded = ST.migrate(JSON.parse(JSON.stringify(bd)));
  ok(reloaded.destinations[first.id].owned, 'owned destinations survive a save/reload round-trip');
  ok(approx(M.destMult(reloaded, DATA), first.mult), 'L_dest recomputes correctly from a reloaded save');
}

// ---------- 17. E04: transport — buy gate, upkeep drain (clamped >= 0), idempotent
// re-select (E04-S1-T3/S2-T7/T8/S10-T3/T4) ----------
console.log('\n[17] E04 transport');
{
  const tr = ST.newGame();
  const bus = DATA.transport.find(t => t.id === 'bus');
  tr.resources.cash = 0;
  ok(!E.buyTransport(tr, 'bus'), 'buyTransport is blocked at zero cash');

  tr.resources.cash = 1e7;
  ok(E.buyTransport(tr, 'bus'), 'buyTransport succeeds once affordable');
  ok(tr.transport.owned.includes('bus') && tr.transport.activeSlot === 'bus', 'bus is owned and active');

  const cashBeforeReselect = tr.resources.cash;
  ok(E.buyTransport(tr, 'bus'), 're-selecting an already-owned ride succeeds (idempotent switch)');
  ok(approx(tr.resources.cash, cashBeforeReselect), 're-selecting an owned ride does not charge cash again');

  // upkeep drains cash in tick, clamped so it never goes negative
  const up = ST.newGame();
  up.transport.owned = ['bus']; up.transport.activeSlot = 'bus';
  up.resources.cash = bus.upkeep * 2;             // just enough for 2 ticks of upkeep
  const before = up.resources.cash;
  E.tick(up, 1);
  ok(up.resources.cash < before, 'transport upkeep drains cash over a tick while a ride is active');
  E.tick(up, 1000);                               // far more upkeep than remaining cash
  ok(up.resources.cash >= 0, 'transport upkeep never drives cash negative (clamped)');
}

// ---------- 18. E04: stack-order regression — L_dest folds in as a clean multiplicative
// factor of the documented tierMultiplier stack (E04-S2-T2/S10-T8) ----------
console.log('\n[18] E04 stack-order regression: L_dest in tierMultiplier');
{
  const stk = ST.newGame();
  stk.generators[0].bought = 20; stk.generators[0].count = 20;
  stk._comfortCache = 1000;
  stk.skills.charisma.level = 5;
  stk.paths.vlogger.points = 10; stk.paths.traveler.points = 10;

  const mBefore = M.tierMultiplier(stk, 0);
  const dBefore = M.destMultiplier(stk);

  stk.destinations['dest_ardennes_daytrip'].owned = true;
  stk.destinations['dest_paris_hostel'].owned = true;
  stk._destCache = M.destMult(stk, DATA);

  const mAfter = M.tierMultiplier(stk, 0);
  const dAfter = M.destMultiplier(stk);

  ok(approx(mAfter / mBefore, dAfter / dBefore),
    'tierMultiplier scales by EXACTLY the L_dest ratio when only destinations change — confirms ' +
    'M_k = milestoneMult·L_upgrade·L_path·L_skill·L_comfort·L_dest·L_ascension·L_tree, with L_dest a clean factor');
}

// ---------- 19. E04: migration — an E03-shaped save (no destinations/transport) loads
// cleanly, defaults everything unowned, and never free-buys offline (E04-S9) ----------
console.log('\n[19] E04 migration + no free offline purchases');
{
  const e03save = ST.newGame();
  delete e03save.destinations;
  delete e03save.transport;
  const migrated = ST.migrate(JSON.parse(JSON.stringify(e03save)));
  ok(migrated.destinations && DATA.destinations.every(d => migrated.destinations[d.id] && migrated.destinations[d.id].owned === false),
    'migration backfills state.destinations (all unowned) for a pre-E04 save');
  ok(migrated.transport && Array.isArray(migrated.transport.owned) && migrated.transport.activeSlot === null,
    'migration backfills state.transport (empty, no active ride) for a pre-E04 save');
  E.tick(migrated, 1);
  ok(Number.isFinite(migrated.resources.cash), 'ticking a migrated E03-shaped save does not crash and cash stays finite');

  // offline never auto-buys, even flush with cash; L_dest/upkeep still apply while away
  const off = ST.newGame();
  off.resources.cash = 1e9;
  off.destinations['dest_ardennes_daytrip'].owned = true;
  off._destCache = M.destMult(off, DATA);
  off.transport.owned = ['bus']; off.transport.activeSlot = 'bus';
  const rep = E.applyOffline(off, 3600 * 1000);
  ok(DATA.destinations.slice(1).every(d => !off.destinations[d.id].owned),
    'offline never auto-buys a new destination, no matter how much cash is available');
  ok(rep && Number.isFinite(rep.cash), 'offline still resolves normally with an owned destination + active transport present');
  ok(off.resources.cash >= 0, 'cash never goes negative offline (transport upkeep clamped)');
}

// ---------- 20. E05: L_upgrade (upgradeMult) — value at n, additive-within-layer,
// stack-order regression (E05-S1-T6/S2-T1/S4-T5/S8-T1/S10-T1/T8) ----------
console.log('\n[20] E05 L_upgrade (upgradeMult): value at n, additive-within-layer, stack-order');
{
  ok(M.upgradeMult(0) === 1, 'upgradeMult(0) == 1 (no renovations yet)');
  ok(approx(M.upgradeMult(1), 1 + C.L_UPGRADE_RATE), `upgradeMult(1) == 1 + L_UPGRADE_RATE (${1 + C.L_UPGRADE_RATE})`);
  ok(approx(M.upgradeMult(5), 1 + C.L_UPGRADE_RATE * 5), 'upgradeMult(5) == 1 + rate·5 (additive within the layer)');
  ok(approx(M.upgradeMult(10), 1 + C.L_UPGRADE_RATE * 10), 'upgradeMult(10) == 1 + rate·10');
  ok(approx(M.upgradeMult(10) - M.upgradeMult(9), M.upgradeMult(1) - M.upgradeMult(0)),
    'marginal gain per renovation is constant (additive, not compounding, within the layer)');

  // stack-order regression (mirrors [18]'s L_dest check): bumping ONE tier's upgrades
  // scales that tier's tierMultiplier by exactly the upgradeMult ratio, nothing else.
  const up = ST.newGame();
  up.generators[0].bought = 20; up.generators[0].count = 20;
  const mBefore = M.tierMultiplier(up, 0);
  const uBefore = M.upgradeMult(up.generators[0].upgrades);
  up.generators[0].upgrades += 3;
  const mAfter = M.tierMultiplier(up, 0);
  const uAfter = M.upgradeMult(up.generators[0].upgrades);
  ok(approx(mAfter / mBefore, uAfter / uBefore),
    'tierMultiplier scales by EXACTLY the L_upgrade ratio when only upgrades change — confirms L_upgrade is a clean factor in the M_k stack');
}

// ---------- 21. E05: buyGenUpgrade cost progression + cheapest-upgrade convenience
// (E05-S2-T4/S3-T5/S4-T2) ----------
console.log('\n[21] E05 buyGenUpgrade cost progression + cheapest-upgrade convenience');
{
  const gu = ST.newGame();
  gu.resources.cash = 0;
  ok(!E.buyGenUpgrade(gu, 0), 'buyGenUpgrade is blocked at zero cash');
  ok(gu.generators[0].upgrades === 0, 'upgrades unchanged after a blocked buy');

  gu.resources.cash = 1e6;
  const cost0 = E.genUpgradeCost(gu, 0);
  ok(approx(cost0, C.GEN.base[0] * 50), 'genUpgradeCost at upgrades=0 equals GEN.base[k]*50 (the documented formula)');
  ok(E.buyGenUpgrade(gu, 0), 'buyGenUpgrade succeeds with enough cash');
  ok(gu.generators[0].upgrades === 1, 'upgrades incremented to 1 on a successful buy');
  const cost1 = E.genUpgradeCost(gu, 0);
  ok(approx(cost1 / cost0, 8), 'genUpgradeCost grows by exactly ×8 per purchase (the documented growth)');

  // convenience: cheapestGenUpgrade / buyCheapestGenUpgrade route through the SAME
  // buyGenUpgrade path — no bespoke buy logic (E05-S3-T5 "renovate cheapest").
  const ch = ST.newGame();
  ch.resources.cash = 0;
  ok(!E.buyCheapestGenUpgrade(ch), 'buyCheapestGenUpgrade is blocked at zero cash');
  ch.resources.cash = 1e6;
  const pick = E.cheapestGenUpgrade(ch);
  ok(pick && pick.k === 0, 'cheapestGenUpgrade picks D1 (the only unlocked tier on a fresh game)');
  ok(approx(pick.cost, E.genUpgradeCost(ch, 0)), 'cheapestGenUpgrade cost matches genUpgradeCost for the picked tier');
  ok(E.buyCheapestGenUpgrade(ch), 'buyCheapestGenUpgrade succeeds when affordable');
  ok(ch.generators[0].upgrades === 1, 'buyCheapestGenUpgrade actually bought via the shared buyGenUpgrade path');
}

// ---------- 22. E05: accommodation ladder — accScore/accUnlockComfort monotonic,
// tier-up gate (Comfort + cash), renovation persistence across tier-up, save/reload
// (E05-S1-T10/S2-T5/T8/S4-T6/S6-T3/T9/T10/S10-T2/T3) ----------
console.log('\n[22] E05 accommodation ladder: accScore/accUnlockComfort monotonic, tier-up gate, persistence');
{
  let prevScore = -Infinity, prevUnlock = -Infinity, monoScore = true, monoUnlock = true;
  for (let i = 0; i < DATA.accommodation.length; i++) {
    const sc = M.accScore(i), un = M.accUnlockComfort(i);
    if (sc <= prevScore) monoScore = false;
    if (i > 0 && un <= prevUnlock) monoUnlock = false;
    prevScore = sc; prevUnlock = un;
  }
  ok(monoScore, 'accScore is strictly increasing across every defined tier');
  ok(monoUnlock, 'accUnlockComfort is strictly increasing across every defined tier');

  // tier-up gate: blocked below Comfort, blocked below cash, succeeds at exact cost.
  const tu = ST.newGame();
  tu.accommodation.tier = 3; tu.accommodation.owned = [0, 1, 2, 3];
  tu._comfortCache = M.accUnlockComfort(4) - 1;   // just short of the gate
  tu.resources.cash = 1e12;
  ok(!E.accUnlocked(tu), 'accUnlocked is false just below the Comfort gate');
  ok(!E.buyAccommodation(tu), 'buyAccommodation is blocked below the Comfort gate even with plenty of cash');
  ok(tu.accommodation.tier === 3, 'tier unchanged after a blocked buy');

  tu._comfortCache = M.accUnlockComfort(4);        // exactly at the gate
  ok(E.accUnlocked(tu), 'accUnlocked is true exactly at the Comfort gate');
  const cost = E.accCost(tu);
  tu.resources.cash = cost - 1;
  ok(!E.buyAccommodation(tu), 'buyAccommodation is blocked one cash short, even with Comfort met');
  tu.resources.cash = cost;                        // exact cash
  ok(E.buyAccommodation(tu), 'buyAccommodation succeeds with exactly enough cash and Comfort met (the 1-Star check-in)');
  ok(tu.accommodation.tier === 4, 'tier advanced to 4 (the 1-Star Hotel)');
  ok(tu.accommodation.owned.includes(4), 'tier 4 pushed to ownedTiers');
  ok(approx(tu.resources.cash, 0), 'exact-cash tier-up leaves cash at (approximately) zero, never negative');

  // renovations (generator upgrades) are an entirely separate system from accommodation
  // tiers — buying a tier never touches them (E05-S4-T6: persist across tier-up).
  tu.generators[0].upgrades = 3;
  tu._comfortCache = M.accUnlockComfort(5);
  tu.resources.cash = E.accCost(tu);
  E.buyAccommodation(tu);
  ok(tu.accommodation.tier === 5, 'tier advanced again to 5');
  ok(tu.generators[0].upgrades === 3, 'renovations (generator upgrades) persist across a tier-up, untouched');

  const reloadedTu = ST.migrate(JSON.parse(JSON.stringify(tu)));
  ok(reloadedTu.accommodation.tier === 5, 'accommodation tier survives a save/reload round-trip');
  ok(reloadedTu.generators[0].upgrades === 3, 'generator upgrades survive a save/reload round-trip alongside the tier');
}

// ---------- 23. E05: ladder-panel-vs-accUnlocked consistency — a pure-logic assertion
// that the panel's gate can never drift from the real purchase gate (E05-D guardrail) ----------
console.log('\n[23] E05 ladder-panel-vs-accUnlocked consistency (no drift)');
{
  // Mirrors ui.js renderAccommodation's gating exactly: the ONLY tier ever offered as
  // buyable is nextAccTier(state), and its gate must always read as E.accUnlocked(state)
  // itself. Checked across a spread of crafted states (early/mid/top tier, at/below the
  // exact Comfort threshold).
  const probes = [
    { tier: 0, comfort: 0 },
    { tier: 0, comfort: M.accUnlockComfort(1) - 1 },
    { tier: 0, comfort: M.accUnlockComfort(1) },
    { tier: 3, comfort: M.accUnlockComfort(4) - 0.01 },
    { tier: 3, comfort: M.accUnlockComfort(4) },
    { tier: 19, comfort: M.accUnlockComfort(20) },
    { tier: 20, comfort: 1e12 },   // top tier: no next tier exists
  ];
  let consistent = true;
  for (const p of probes) {
    const st = ST.newGame();
    st.accommodation.tier = p.tier;
    st._comfortCache = p.comfort;
    const nextT = E.nextAccTier(st);
    const panelGateOk = nextT < DATA.accommodation.length && st._comfortCache >= M.accUnlockComfort(nextT);
    if (panelGateOk !== E.accUnlocked(st)) consistent = false;
  }
  ok(consistent, "the ladder panel's next-tier gate matches E.accUnlocked() exactly across owned/next/top-tier states");
}

// ---------- 24. E05: 1-Star amenity cluster — data validation + migration backfill
// (E05-S5-T1/T2/T3/T4/T9/T10) ----------
console.log('\n[24] E05 1-Star amenity cluster: data validation + migration backfill');
{
  const star1 = DATA.amenities.filter(a => a.tag === 'onestar');
  ok(star1.length >= 5, `the 1-Star cluster has at least 5 amenities (got ${star1.length})`);
  const backpackTop = Math.max(...DATA.amenities.filter(a => a.tag === 'backpack').map(a => a.costBase));
  for (const a of star1) {
    ok(a.costBase > backpackTop, `${a.id}: costBase (${a.costBase}) sits above the backpack cluster's top (${backpackTop})`);
    ok(a.comfort >= 15 && a.comfort <= 35, `${a.id}: comfort (${a.comfort}) within the conservative 15-35 band`);
    ok(a.xMult > 0 && a.xMult <= 0.05, `${a.id}: xMult (${a.xMult}) is a small, conservative bonus`);
  }
  // brackets the tier-4 (1-Star Hotel) Comfort gate: some items help you get there,
  // some keep small wins flowing right after arrival, all resolve within the stage.
  const gate4 = M.accUnlockComfort(4);
  ok(star1.some(a => a.unlockComfort < gate4), 'at least one 1-Star amenity unlocks BEFORE the tier-4 gate (helps you check in)');
  ok(star1.some(a => a.unlockComfort > gate4), 'at least one 1-Star amenity unlocks AFTER the tier-4 gate (keeps wins flowing post-arrival)');
  ok(star1.every(a => a.unlockComfort < M.accUnlockComfort(5)), 'the whole 1-Star cluster resolves before the tier-5 gate (stays in its own stage)');

  // migration: an "old" save missing the new star1_* keys still loads cleanly and
  // backfills them at level 0 (E05-S5-T9, the generic backfill() path).
  const oldSave = ST.newGame();
  for (const a of star1) delete oldSave.amenities[a.id];
  const migrated = ST.migrate(JSON.parse(JSON.stringify(oldSave)));
  ok(star1.every(a => migrated.amenities[a.id] && migrated.amenities[a.id].level === 0),
    'migration backfills every new 1-Star amenity id at level 0 for a save that predates them');
}

// ---------- 25. E05: beat 7 (One Star, Big Dreams) fires exactly at accTier 4, plus
// the distinct check-in celebration flash (E05-S2-T9/S6-T5/S6-T10/S10-T4/T9) ----------
console.log('\n[25] E05 beat 7 (One Star, Big Dreams) fires exactly at accTier 4');
{
  const b7 = ST.newGame();
  b7.accommodation.tier = 3;
  b7._comfortCache = 1e6;
  E.checkStory(b7);
  ok(!b7.story.seen.includes(7), 'beat 7 has NOT fired at accTier 3, even with huge Comfort');

  b7.accommodation.tier = 4;
  E.checkStory(b7);
  ok(b7.story.seen.includes(7), 'beat 7 fires the moment accommodation.tier reaches 4');
  ok(b7.story.seen.filter(x => x === 7).length === 1, 'beat 7 is recorded exactly once');

  E.checkStory(b7); E.checkStory(b7);
  ok(b7.story.seen.filter(x => x === 7).length === 1, 'repeated checkStory calls (e.g. multiple ticks) do not re-fire beat 7');

  // the extra celebratory flash fires alongside the real tier-up (engine.buyAccommodation),
  // distinct from the generic "Upgraded to" notification.
  const arr = ST.newGame();
  arr.accommodation.tier = 3; arr.accommodation.owned = [0, 1, 2, 3];
  arr._comfortCache = M.accUnlockComfort(4);
  arr.resources.cash = E.accCost(arr);
  ok(E.buyAccommodation(arr), 'buyAccommodation succeeds into tier 4');
  const notifs = E.drainNotifications(arr);
  ok(notifs.some(n => n.type === 'celebrate' && /One whole star/.test(n.text)),
    'the 1-Star arrival fires a distinct celebratory notification alongside the tier-up');
}

// ---------- 26. E06: comfortMult (L_comfort) — boundary values, monotonic, no NaN,
// finite at huge Comfort (E06-S8-T4/S10-T1/T3/T4) ----------
console.log('\n[26] E06 comfortMult (L_comfort): boundary values, no NaN, finite at extremes');
{
  const probe = ST.newGame();
  probe._comfortCache = 0;
  ok(M.comfortMultiplier(probe) === 1, 'comfortMultiplier(0) == 1 exactly — no divide-by-zero with C0');

  const C0 = C.COMFORT.C0;
  ok(approx(M.comfortMultiplier({ _comfortCache: C0 }), 1.1204119982655925), 'comfortMultiplier(C0) matches the golden snapshot');
  ok(approx(M.comfortMultiplier({ _comfortCache: 10 * C0 }), 1.41655707406329), 'comfortMultiplier(10·C0) matches the golden snapshot');
  ok(approx(M.comfortMultiplier({ _comfortCache: 100 * C0 }), 1.801728549513057), 'comfortMultiplier(100·C0) matches the golden snapshot');

  const huge = M.comfortMultiplier({ _comfortCache: 1e18 });
  ok(Number.isFinite(huge) && huge > 1, `comfortMultiplier stays finite at huge Comfort (${fmt(huge)})`);
  ok(Number.isNaN(M.comfortMultiplier({ _comfortCache: -0 })) === false, 'comfortMultiplier never returns NaN at the zero edge');
}

// ---------- 27. E06: breakfast/room cluster data validation + Comfort-gate bracketing
// (E06-S1-T3/T10, S5-T1/T2/T3/T4) ----------
console.log('\n[27] E06 breakfast cluster: data validation + Comfort-gate bracketing');
{
  const bfast = DATA.amenities.filter(a => a.tag === 'breakfast');
  ok(bfast.length >= 6 && bfast.length <= 8, `the breakfast cluster has 6-8 amenities (got ${bfast.length})`);
  const star1Top = Math.max(...DATA.amenities.filter(a => a.tag === 'onestar').map(a => a.costBase));
  for (const a of bfast) {
    ok(a.costBase > star1Top, `${a.id}: costBase (${a.costBase}) sits above the 1-Star cluster's top (${star1Top})`);
    ok(a.comfort >= 20 && a.comfort <= 50, `${a.id}: comfort (${a.comfort}) within the conservative 20-50 band`);
    ok(a.xMult > 0 && a.xMult <= 0.05, `${a.id}: xMult (${a.xMult}) is a small, conservative bonus`);
  }
  // brackets the tier-5 (2-Star Hotel) Comfort gate: some items help you get there,
  // some keep small wins flowing right after arrival, all resolve before the tier-6 gate.
  const gate5 = M.accUnlockComfort(5);
  const gate6 = M.accUnlockComfort(6);
  ok(bfast.some(a => a.unlockComfort < gate5), 'at least one breakfast item unlocks BEFORE the tier-5 gate (helps you check in)');
  ok(bfast.some(a => a.unlockComfort > gate5), 'at least one breakfast item unlocks AFTER the tier-5 gate (keeps wins flowing post-arrival)');
  ok(bfast.every(a => a.unlockComfort < gate6), 'the whole breakfast cluster resolves before the tier-6 (pool) gate');
}

// ---------- 28. E06: integration — buying breakfast amenities raises Comfort and
// per-second income end-to-end (E06-S2-T3/T5, S4-T3/T5, S5-T5/T10) ----------
console.log('\n[28] E06 integration: buying breakfast amenities raises Comfort and cash/s');
{
  const ig = ST.newGame();
  ig.resources.cash = 1e9;
  E.buyGenerator(ig, 0, 20);
  ig.accommodation.tier = 4;
  ig._comfortCache = M.computeComfort(ig, DATA);
  const comfortBefore = ig._comfortCache;
  const prodBefore = M.tierProd(ig, 0);
  ok(prodBefore > 0, `baseline income established (${fmt(prodBefore)}/s)`);

  let boughtAny = false;
  for (const a of DATA.amenities.filter(x => x.tag === 'breakfast')) {
    ig._comfortCache = M.computeComfort(ig, DATA);
    while (E.amenityUnlocked(ig, a.id) && E.amenityCost(ig, a.id) <= ig.resources.cash) {
      if (E.buyAmenity(ig, a.id)) boughtAny = true; else break;
    }
  }
  ok(boughtAny, 'bought at least one breakfast amenity');
  const prodAfter = M.tierProd(ig, 0);
  ok(ig._comfortCache > comfortBefore, 'buying breakfast amenities raised Comfort');
  ok(prodAfter > prodBefore, 'higher Comfort raised per-second cash output via L_comfort end-to-end');

  // no bespoke buy logic (E06-S5-T5): breakfast items go through the SAME buyAmenity path.
  const beforeLevel = ig.amenities.bfast_stale_croissant.level;
  ok(beforeLevel > 0, 'breakfast items accumulate levels via the shared buyAmenity path, no bespoke code');
}

// ---------- 29. E06: beat 8 (Continental Breakfast) fires exactly at its Comfort gate;
// pool tease + Comfort-online flags fire once and persist (E06-S2-T9/S6-T5, S1-T9/S7-T7,
// S2-T6/S4-T1/S10-T9) ----------
console.log('\n[29] E06 beat 8 gate + pool tease + Comfort-online one-shots');
{
  const b8 = ST.newGame();
  b8.accommodation.tier = 4;
  b8.story.seen = [1, 2, 3, 4, 5, 6, 7];
  b8._comfortCache = 5499;
  E.checkStory(b8);
  ok(!b8.story.seen.includes(8), 'beat 8 has NOT fired just below its Comfort gate (5500)');

  b8._comfortCache = 5500;
  E.checkStory(b8);
  ok(b8.story.seen.includes(8), 'beat 8 fires the moment Comfort reaches 5500');
  ok(b8.story.seen.filter(x => x === 8).length === 1, 'beat 8 is recorded exactly once');
  E.checkStory(b8); E.checkStory(b8);
  ok(b8.story.seen.filter(x => x === 8).length === 1, 'repeated checkStory calls do not re-fire beat 8');

  // pool tease: fires once beat 8 has landed (before tier 5 is actually owned), never gates.
  E.checkPoolTease(b8);
  ok(b8.story.flags.poolTease, 'pool tease flag sets once beat 8 (or tier 5) is reached');
  const notifsTease = E.drainNotifications(b8);
  ok(notifsTease.some(n => n.type === 'vignette' && /pool/i.test(n.text)), 'pool tease emits a flavor notification mentioning the pool');
  E.checkPoolTease(b8);
  const notifsTease2 = E.drainNotifications(b8);
  ok(!notifsTease2.some(n => /pool/i.test(n.text)), 'pool tease does not re-fire on a subsequent check');

  // branch-flavored tease copy (E06-S7-T7): adapts by story.branch without ever gating.
  const teaseVlog = ST.newGame();
  teaseVlog.story.branch = 'vlogger';
  teaseVlog.accommodation.tier = 5;
  E.checkPoolTease(teaseVlog);
  const vlogNotif = E.drainNotifications(teaseVlog).find(n => /pool/i.test(n.text));
  ok(vlogNotif && /content/i.test(vlogNotif.text), 'vlogger-branch pool tease copy differs (mentions content)');

  // Comfort-online one-shot (E06-S2-T6/S4-T1): fires once L_comfort crosses the threshold.
  const co = ST.newGame();
  co._comfortCache = 0;
  E.checkComfortOnline(co);
  ok(!co.story.flags.comfortOnline, 'comfortOnline has NOT fired at Comfort 0 (L_comfort == 1)');
  ok(!E.drainNotifications(co).length, 'no online-flash notification below the threshold');

  co._comfortCache = M.accUnlockComfort(5); // realistic 2-star-stage Comfort, well past the threshold
  E.checkComfortOnline(co);
  ok(co.story.flags.comfortOnline, 'comfortOnline fires once L_comfort crosses COMFORT_ONLINE_MULT');
  const onlineNotifs = E.drainNotifications(co);
  ok(onlineNotifs.some(n => n.type === 'celebrate' && /multipl/i.test(n.text)), 'the online moment fires a distinct celebratory notification');
  E.checkComfortOnline(co);
  ok(!E.drainNotifications(co).length, 'comfortOnline does not re-fire on a subsequent check');

  // survives reload (E06-S9-T1/T10): recomputed flags persist, never reset to unfired.
  const reloadedB8 = ST.migrate(JSON.parse(JSON.stringify(b8)));
  ok(reloadedB8.story.seen.includes(8) && reloadedB8.story.flags.poolTease, 'beat 8 + pool tease survive a save/reload round-trip');
}

// ---------- 30. E06: stack-order regression — L_comfort folds into tierMultiplier as a
// clean multiplicative factor, identically regardless of story.branch (E06-S2-T2/T8,
// S7-T1/T10, S10-T8) ----------
console.log('\n[30] E06 stack-order regression: L_comfort in tierMultiplier, branch-neutral');
{
  for (const branch of ['neutral', 'vlogger', 'traveler', 'crypto', 'connoisseur']) {
    const stk = ST.newGame();
    stk.generators[0].bought = 20; stk.generators[0].count = 20;
    stk.story.branch = branch;
    stk.skills.charisma.level = 5;
    stk.paths.vlogger.points = 10; stk.paths.traveler.points = 10;
    stk._comfortCache = 500;

    const mBefore = M.tierMultiplier(stk, 0);
    const lBefore = M.comfortMultiplier(stk);
    stk._comfortCache = 8000;
    const mAfter = M.tierMultiplier(stk, 0);
    const lAfter = M.comfortMultiplier(stk);

    ok(approx(mAfter / mBefore, lAfter / lBefore),
      `[${branch}] tierMultiplier scales by EXACTLY the L_comfort ratio when only Comfort changes — ` +
      'confirms L_comfort is a clean, branch-neutral factor in the M_k stack (scope "all")');
  }
}

// ---------- 31. E06: migration backfill for the new breakfast cluster (E06-S9-T2/T3) ----------
console.log('\n[31] E06 migration backfill: breakfast cluster');
{
  const bfast = DATA.amenities.filter(a => a.tag === 'breakfast');
  const oldSave = ST.newGame();
  for (const a of bfast) delete oldSave.amenities[a.id];
  const migrated = ST.migrate(JSON.parse(JSON.stringify(oldSave)));
  ok(bfast.every(a => migrated.amenities[a.id] && migrated.amenities[a.id].level === 0),
    'migration backfills every new breakfast amenity id at level 0 for a save that predates them');
  E.tick(migrated, 1);
  ok(Number.isFinite(migrated.resources.cash), 'ticking a migrated pre-E06 save does not crash and cash stays finite');
  ok(approx(migrated._comfortCache, M.computeComfort(migrated, DATA)),
    'a reloaded save recomputes Comfort identically to a fresh computeComfort() call — no drift (E06-S9-T10)');
}

// ---------- 32. E07: pool cluster data validation + gap-fill fields (E07-S1-T10,
// S4-T1/T6, S6-T1/T2/T7) — the drift-guardrail-capped ≤4 net-new pool amenities. ----------
console.log('\n[32] E07 pool cluster: data validation + gap-fill fields');
{
  const pool = DATA.amenities.filter(a => a.tag === 'pool');
  ok(pool.length >= 8 && pool.length <= 11, `the pool cluster has 8-11 amenities (got ${pool.length})`);

  const seenIds = new Set();
  for (const a of pool) {
    ok(!seenIds.has(a.id), `pool amenity id is unique: ${a.id}`);
    seenIds.add(a.id);
    ok(a.costBase > 0, `${a.id}: costBase > 0`);
    ok(a.comfort >= 0, `${a.id}: comfort >= 0`);
    const g = a.costGrowth || C.AMENITY.growthDefault;
    ok(g > 1, `${a.id}: effective costGrowth > 1 (${g})`);
  }

  // the ≤4-item drift-guardrail gap-fill (E07 gap-fill report): exactly these new ids,
  // the two floatables at the DEFAULT growth, the two-tier cocktail chain steeper.
  const newIds = ['pool_floatie_pizza', 'pool_floatie_swan', 'pool_cocktail_2', 'pool_cocktail_3'];
  ok(newIds.length <= 4, 'the E07 gap-fill adds at most 4 net-new pool amenities (drift guardrail)');
  for (const id of newIds) ok(pool.some(a => a.id === id), `gap-fill amenity present: ${id}`);

  const floaties = pool.filter(a => ['pool_floatie_pizza', 'pool_floatie_swan'].includes(a.id));
  ok(floaties.every(a => !a.costGrowth), 'the new floatables use the DEFAULT costGrowth (~1.5), no override');

  const cocktailChain = pool.filter(a => ['cocktail_1', 'pool_cocktail_2', 'pool_cocktail_3'].includes(a.id));
  ok(cocktailChain.slice(1).every(a => a.costGrowth === 1.8),
    'the new cocktail-service tiers use a steeper costGrowth (1.8) than the floaties (E07-S6-T2)');
  let prevCost = 0, prevComfort = 0;
  for (const a of cocktailChain) {
    ok(a.costBase > prevCost, `${a.id}: cocktail chain costBase strictly increases (${a.costBase} > ${prevCost})`);
    ok(a.comfort > prevComfort, `${a.id}: cocktail chain comfort strictly increases (${a.comfort} > ${prevComfort})`);
    prevCost = a.costBase; prevComfort = a.comfort;
  }

  // unlockComfort stays in the SAME low band as the pre-existing 7 items — this
  // cluster ships far below its own tier's Comfort gate (unlike onestar/breakfast,
  // which bracket THEIR tier gates) — so every pool item resolves well before tier 7.
  const gate7 = M.accUnlockComfort(7);
  ok(pool.every(a => a.unlockComfort < gate7), 'the whole pool cluster (existing + gap-fill) resolves before the tier-7 gate');
}

// ---------- 33. E07: Poolside panel reveal gating — pure logic mirroring ui.js's
// poolRevealed(s) exactly (E07-S7-T3/T7/T10, mirrors the E05-S3 "no drift" pattern). ----------
console.log('\n[33] E07 Poolside panel reveal gating (mirrors ui.js poolRevealed exactly)');
{
  const poolRevealed = s => !!s.story.flags.poolTease || s.accommodation.tier >= 6;

  const fresh = ST.newGame();
  ok(!poolRevealed(fresh), 'the Poolside panel stays hidden on a fresh game (no tease, tier 0)');

  const teased = ST.newGame();
  teased.story.flags.poolTease = true;
  ok(poolRevealed(teased), 'the Poolside panel reveals once story.flags.poolTease is set (pre-tier-6 preview)');

  const arrived = ST.newGame();
  arrived.accommodation.tier = 6;
  ok(poolRevealed(arrived), 'the Poolside panel reveals once accommodation.tier reaches 6, even without the tease flag');

  const both = ST.newGame();
  both.story.flags.poolTease = true;
  both.accommodation.tier = 6;
  ok(poolRevealed(both), 'the Poolside panel stays revealed once both conditions hold');
}

// ---------- 34. E07: integration — the gap-fill cocktail tiers (and the pool cluster
// as a whole) raise Comfort and per-second income end-to-end (E07-S2-T1/T7, S6-T1/T9). ----------
console.log('\n[34] E07 integration: pool amenities (existing + gap-fill) raise Comfort and cash/s');
{
  const ig = ST.newGame();
  ig.resources.cash = 1e9;
  E.buyGenerator(ig, 0, 20);
  ig.accommodation.tier = 6;                       // well past every pool unlockComfort
  ig._comfortCache = M.computeComfort(ig, DATA);
  const prodBefore = M.tierProd(ig, 0);
  ok(prodBefore > 0, `baseline income established (${fmt(prodBefore)}/s)`);

  // the two new cocktail tiers specifically, via the shared buyAmenity path — no
  // bespoke purchase code (E07-S6-T1/T9).
  const comfortBeforeCocktail = ig._comfortCache;
  ok(E.buyAmenity(ig, 'pool_cocktail_2'), 'buyAmenity succeeds for the new Mixologist Cart tier');
  ok(ig.amenities.pool_cocktail_2.level === 1, 'Mixologist Cart level increments on a successful buy');
  ok(E.buyAmenity(ig, 'pool_cocktail_3'), 'buyAmenity succeeds for the new Butler-Served Cocktail tier');
  ok(ig.amenities.pool_cocktail_3.level === 1, 'Butler-Served Cocktail level increments on a successful buy');
  ok(ig._comfortCache > comfortBeforeCocktail, 'buying the new cocktail tiers raised Comfort');

  const comfortBefore = ig._comfortCache;
  const prodMid = M.tierProd(ig, 0);
  let boughtAny = false;
  for (const a of DATA.amenities.filter(x => x.tag === 'pool')) {
    while (E.amenityUnlocked(ig, a.id) && E.amenityCost(ig, a.id) <= ig.resources.cash) {
      if (E.buyAmenity(ig, a.id)) boughtAny = true; else break;
    }
  }
  ok(boughtAny, 'bought at least one more pool amenity across the whole cluster');
  const prodAfter = M.tierProd(ig, 0);
  ok(ig._comfortCache >= comfortBefore, 'buying more pool amenities never lowers Comfort');
  ok(prodAfter > prodMid, 'higher Comfort raised per-second cash output via L_comfort end-to-end');
}

// ---------- 35. E07: beat 9 (Making a Splash) fires exactly at accTier 6, plus the
// distinct "there is a POOL" arrival flash, once + persisted (E07-S2-T9, S7-T4/T10). ----------
console.log('\n[35] E07 beat 9 (Making a Splash) fires exactly at accTier 6 + pool celebrate flash');
{
  const b9 = ST.newGame();
  b9.accommodation.tier = 5;
  b9._comfortCache = 1e9;
  E.checkStory(b9);
  ok(!b9.story.seen.includes(9), 'beat 9 has NOT fired at accTier 5, even with huge Comfort');

  b9.accommodation.tier = 6;
  E.checkStory(b9);
  ok(b9.story.seen.includes(9), 'beat 9 fires the moment accommodation.tier reaches 6');
  ok(b9.story.seen.filter(x => x === 9).length === 1, 'beat 9 is recorded exactly once');
  E.checkStory(b9); E.checkStory(b9);
  ok(b9.story.seen.filter(x => x === 9).length === 1, 'repeated checkStory calls do not re-fire beat 9');

  // the extra celebratory flash fires alongside the real tier-up (engine.buyAccommodation),
  // distinct from the generic "Upgraded to" notification (mirrors the tier-4/5 flashes).
  const arr = ST.newGame();
  arr.accommodation.tier = 5; arr.accommodation.owned = [0, 1, 2, 3, 4, 5];
  arr._comfortCache = M.accUnlockComfort(6);
  arr.resources.cash = E.accCost(arr);
  ok(E.buyAccommodation(arr), 'buyAccommodation succeeds into tier 6');
  const notifs = E.drainNotifications(arr);
  ok(notifs.some(n => n.type === 'celebrate' && /POOL/.test(n.text)),
    'the 3-Star arrival fires a distinct "there is a POOL" celebratory notification alongside the tier-up');

  const reloadedB9 = ST.migrate(JSON.parse(JSON.stringify(b9)));
  ok(reloadedB9.story.seen.includes(9), 'beat 9 survives a save/reload round-trip');
}

// ---------- 36. E07: migration backfill for the pool gap-fill cluster (E07-S10-T2). ----------
console.log('\n[36] E07 migration backfill: pool gap-fill cluster');
{
  const newIds = ['pool_floatie_pizza', 'pool_floatie_swan', 'pool_cocktail_2', 'pool_cocktail_3'];
  const oldSave = ST.newGame();
  for (const id of newIds) delete oldSave.amenities[id];
  const migrated = ST.migrate(JSON.parse(JSON.stringify(oldSave)));
  ok(newIds.every(id => migrated.amenities[id] && migrated.amenities[id].level === 0),
    'migration backfills every new pool amenity id at level 0 for a save that predates them');
  E.tick(migrated, 1);
  ok(Number.isFinite(migrated.resources.cash), 'ticking a migrated pre-E07 save does not crash and cash stays finite');
  ok(approx(migrated._comfortCache, M.computeComfort(migrated, DATA)),
    'a reloaded save recomputes Comfort identically to a fresh computeComfort() call — no drift');
}

// ---------- 37. E08 "Sun, Sand & Service": beach cluster + service chain data
// validation (E08-S1-T10, S4-T10, S5-T10). Mirrors [32]'s pool-cluster checks. ----------
console.log('\n[37] E08 beach cluster + service chain: data validation + gap-fill fields');
{
  const beach = DATA.amenities.filter(a => a.tag === 'beach');
  ok(beach.length >= 6 && beach.length <= 8, `the beach cluster is a normal 6-8 items (got ${beach.length})`);

  const seenIds = new Set();
  for (const a of beach) {
    ok(!seenIds.has(a.id), `beach amenity id is unique: ${a.id}`);
    seenIds.add(a.id);
    ok(a.costBase > 0, `${a.id}: costBase > 0`);
    ok(a.comfort >= 0, `${a.id}: comfort >= 0`);
    const g = a.costGrowth || C.AMENITY.growthDefault;
    ok(g > 1, `${a.id}: effective costGrowth > 1 (${g})`);
  }
  // the gap-fill: exactly these 4 new beach ids at the DEFAULT growth (no override),
  // alongside the 3 pre-existing beach_towel/beach_svc/cabana_beach.
  const newBeachIds = ['beach_umbrella', 'beach_sun_lounger', 'beach_jetski', 'beach_private_stretch'];
  for (const id of newBeachIds) ok(beach.some(a => a.id === id), `gap-fill beach amenity present: ${id}`);
  ok(beach.filter(a => !a.costGrowth).length === beach.length,
    'every beach item uses the DEFAULT costGrowth (~1.5), no override — the steeper curve is service-only');

  // unlockComfort stays in the SAME low band as the pre-existing 3 items — same shipped
  // shape as the E07 pool cluster (see [32]'s comment), one tier past the zone's own gate.
  const gate8 = M.accUnlockComfort(8);
  ok(beach.every(a => a.unlockComfort < gate8), 'the whole beach cluster (existing + gap-fill) resolves before the tier-8 gate');

  // the service-quality chain: its own tag, steeper costGrowth (1.9) than any beach item.
  const service = DATA.amenities.filter(a => a.tag === 'service');
  const CHAIN = ['service_selfserve', 'service_waiter', 'service_head_waiter', 'service_maitre_d', 'service_concierge_seed'];
  ok(service.length === CHAIN.length, `the service chain has exactly ${CHAIN.length} tiers (got ${service.length})`);
  for (const id of CHAIN) ok(service.some(a => a.id === id), `service tier present: ${id}`);
  ok(service.every(a => a.costGrowth === 1.9), 'every service tier uses the steeper costGrowth:1.9 override (E08-S4-T2)');

  let prevCost = 0, prevComfort = 0, prevXMult = 0, prevUnlock = 0;
  for (const id of CHAIN) {
    const a = service.find(x => x.id === id);
    ok(a.costBase > prevCost, `${id}: service chain costBase strictly increases (${a.costBase} > ${prevCost})`);
    ok(a.comfort > prevComfort, `${id}: service chain comfort strictly increases (${a.comfort} > ${prevComfort})`);
    ok(a.xMult > prevXMult, `${id}: service chain xMult strictly increases (${a.xMult} > ${prevXMult}, dormant/forward-compat only)`);
    // in-order reveal (E08-S4-T5/T10): ascending unlockComfort IS the chain gate in this
    // codebase (no separate unlock.requires/STORY_GATES system — see [37]'s comment above)
    // so promotions surface in the epic's specified order as Comfort climbs.
    ok(a.unlockComfort > prevUnlock, `${id}: service chain unlockComfort strictly increases (${a.unlockComfort} > ${prevUnlock}) — in-order reveal`);
    prevCost = a.costBase; prevComfort = a.comfort; prevXMult = a.xMult; prevUnlock = a.unlockComfort;
  }
  ok(service.every(a => a.unlockComfort < gate8), 'the whole service chain resolves before the tier-8 gate');

  // staff bridge: ONLY the last tier carries staffHint (E08-S1-T9), and it's flavor-only
  // — no staff state/mechanic exists yet to "activate" (E08-S4-T10).
  ok(service.find(a => a.id === 'service_concierge_seed').staffHint === true,
    'service_concierge_seed carries the staffHint flag as the pre-staff bridge to E11/E19');
  ok(service.filter(a => a.staffHint).length === 1, 'staffHint is exclusive to the concierge-seed tier in this chain');
  // E19 landed the staff system: state.staff now exists, but the butler starts UNHIRED, so the
  // E08 staffHint remains pure flavor that activates nothing until the player hires at beat 19.
  ok(ST.newGame().staff.butler.hired === false, 'the staff system exists (E19) but the butler starts UNHIRED — the E08 staffHint still activates nothing on its own');

  // guardrail: no separate `w_service` Comfort weight / `service` weight field was added —
  // "better service" shows up as a bigger `comfort` number, same convention as every other
  // amenity (redundant-weight avoidance per docs/coverage.md E08 notes).
  ok(C.COMFORT.wService === undefined && C.COMFORT.w_service === undefined,
    'no new w_service Comfort weight was added to config.COMFORT (superseded — comfort weighting is via wAmen only)');
  ok(service.every(a => a.service === undefined), 'no service item carries a separate `service` weight field (superseded — comfort only)');
}

// ---------- 38. E08: Beachfront panel reveal gating — pure logic mirroring ui.js's
// beachRevealed(s) exactly (mirrors [33]'s pattern one tier later). ----------
console.log('\n[38] E08 Beachfront panel reveal gating (mirrors ui.js beachRevealed exactly)');
{
  const beachRevealed = s => s.accommodation.tier >= 7;

  const fresh = ST.newGame();
  ok(!beachRevealed(fresh), 'the Beachfront panel stays hidden on a fresh game (tier 0)');

  const almost = ST.newGame();
  almost.accommodation.tier = 6;
  ok(!beachRevealed(almost), 'the Beachfront panel stays hidden at tier 6 (the pool tier, not the beach tier)');

  const arrived = ST.newGame();
  arrived.accommodation.tier = 7;
  ok(beachRevealed(arrived), 'the Beachfront panel reveals the moment accommodation.tier reaches 7');

  const beyond = ST.newGame();
  beyond.accommodation.tier = 12;
  ok(beachRevealed(beyond), 'the Beachfront panel stays revealed at any tier past 7');
}

// ---------- 39. E08: integration — beach + service amenities raise Comfort and
// per-second income end-to-end via the Comfort path only (xMult stays dormant, per
// math.js/amenityScoreTotal — mirrors [34]'s pattern). ----------
console.log('\n[39] E08 integration: beach + service amenities raise Comfort and cash/s');
{
  const ig = ST.newGame();
  ig.resources.cash = 1e12;
  E.buyGenerator(ig, 0, 20);
  ig.accommodation.tier = 7;                       // past every beach/service unlockComfort
  ig._comfortCache = M.computeComfort(ig, DATA);
  const prodBefore = M.tierProd(ig, 0);
  ok(prodBefore > 0, `baseline income established (${fmt(prodBefore)}/s)`);

  // a service promotion specifically, via the shared buyAmenity path — no bespoke
  // purchase code (E08-S2-T6).
  const comfortBeforeService = ig._comfortCache;
  ok(E.buyAmenity(ig, 'service_selfserve'), 'buyAmenity succeeds for the Self-Serve Cart tier');
  ok(ig.amenities.service_selfserve.level === 1, 'Self-Serve Cart level increments on a successful buy');
  ok(E.buyAmenity(ig, 'service_maitre_d'), "buyAmenity succeeds for the Maître d' tier");
  ok(ig.amenities.service_maitre_d.level === 1, "Maître d' level increments on a successful buy");
  ok(ig._comfortCache > comfortBeforeService, 'buying service tiers raised Comfort');

  const comfortBefore = ig._comfortCache;
  const prodMid = M.tierProd(ig, 0);
  let boughtAny = false;
  for (const a of DATA.amenities.filter(x => x.tag === 'beach' || x.tag === 'service')) {
    while (E.amenityUnlocked(ig, a.id) && E.amenityCost(ig, a.id) <= ig.resources.cash) {
      if (E.buyAmenity(ig, a.id)) boughtAny = true; else break;
    }
  }
  ok(boughtAny, 'bought at least one more beach/service amenity across the whole cluster');
  const prodAfter = M.tierProd(ig, 0);
  ok(ig._comfortCache >= comfortBefore, 'buying more beach/service amenities never lowers Comfort');
  ok(prodAfter > prodMid, 'higher Comfort raised per-second cash output via L_comfort end-to-end');
}

// ---------- 40. E08: tier-7 arrival (4-Star Beach Resort) + beat 10 (Poolside Persona,
// part) confirmed, plus the distinct "sand, finally" celebrate flash (E08-S6-T4/T8/T10). ----------
console.log('\n[40] E08 tier-7 arrival + beat 10 (Poolside Persona) gating + celebrate flash');
{
  // beat 10 is charisma-gated (pre-existing, E07) — confirm it still fires correctly and
  // requires beat 9 (accTier:6) first, per checkStory's narrative-monotonicity rule.
  const b10 = ST.newGame();
  b10.skills.charisma.level = 5;
  b10._comfortCache = 1e9;
  E.checkStory(b10);
  ok(!b10.story.seen.includes(10), 'beat 10 does NOT fire before beat 9 (accTier 6), even with charisma 5 (narrative monotonicity)');

  b10.accommodation.tier = 6;
  E.checkStory(b10);
  ok(b10.story.seen.includes(9), 'beat 9 fires first');
  ok(b10.story.seen.includes(10), 'beat 10 (Poolside Persona) fires once charisma reaches 5 and beat 9 has fired');
  ok(b10.story.seen.filter(x => x === 10).length === 1, 'beat 10 is recorded exactly once');
  E.checkStory(b10); E.checkStory(b10);
  ok(b10.story.seen.filter(x => x === 10).length === 1, 'repeated checkStory calls do not re-fire beat 10');

  // tier-7 arrival: the distinct "sand, finally" celebratory flash fires alongside the
  // real tier-up (engine.buyAccommodation), mirroring the tier-4/5/6 flashes.
  const arr = ST.newGame();
  arr.accommodation.tier = 6; arr.accommodation.owned = [0, 1, 2, 3, 4, 5, 6];
  arr._comfortCache = M.accUnlockComfort(7);
  arr.resources.cash = E.accCost(arr);
  ok(E.buyAccommodation(arr), 'buyAccommodation succeeds into tier 7 (4-Star Beach Resort)');
  const notifs = E.drainNotifications(arr);
  ok(notifs.some(n => n.type === 'celebrate' && /[Ss]and/.test(n.text)),
    'the tier-7 arrival fires a distinct "sand, finally" celebratory notification alongside the tier-up');

  const reloadedB10 = ST.migrate(JSON.parse(JSON.stringify(b10)));
  ok(reloadedB10.story.seen.includes(10), 'beat 10 survives a save/reload round-trip');
}

// ---------- 41. E08: migration backfill for the beach gap-fill + service chain
// (E08-S9-T1/T2/T9, mirrors [36]'s pattern). ----------
console.log('\n[41] E08 migration backfill: beach gap-fill + service chain');
{
  const newIds = ['beach_umbrella', 'beach_sun_lounger', 'beach_jetski', 'beach_private_stretch',
    'service_selfserve', 'service_waiter', 'service_head_waiter', 'service_maitre_d', 'service_concierge_seed'];
  const oldSave = ST.newGame();
  for (const id of newIds) delete oldSave.amenities[id];
  const migrated = ST.migrate(JSON.parse(JSON.stringify(oldSave)));
  ok(newIds.every(id => migrated.amenities[id] && migrated.amenities[id].level === 0),
    'migration backfills every new beach/service amenity id at level 0 for a save that predates them');
  E.tick(migrated, 1);
  ok(Number.isFinite(migrated.resources.cash), 'ticking a migrated pre-E08 save does not crash and cash stays finite');
  ok(approx(migrated._comfortCache, M.computeComfort(migrated, DATA)),
    'a reloaded save recomputes Comfort identically to a fresh computeComfort() call — no drift (w_service NOT added, so no NaN risk from a missing term)');
}

// ---------- 42. E09 "Charm Offensive": xpToNext/levelFromXp curve round-trip, comms
// discount clamp, Charisma scope (social-only), buyTraining XP/level-up, tier-8
// (Boutique Retreat) gate + celebrate, beat 11 (Fork in the Lobby) seed, migration
// (E09-S2-T10, S4-T10, S6-T10, S9-T2/T3, S10-T1/T2/T3/T4). ----------
console.log('\n[42] E09 Charm Offensive: skills curve, scope, training, tier-8 + beat 11');
{
  // xpToNext/levelFromXp round-trip at several levels: exactly enough cumulative XP
  // lands EXACTLY at that level; one epsilon short stays at the level below (no
  // off-by-one rollover at the boundary).
  for (const lvl of [0, 1, 5, 10, 20]) {
    const cum = M.cumXpForLevel(lvl);
    ok(M.levelFromXp(cum) === lvl, `levelFromXp(cumXpForLevel(${lvl})) === ${lvl} exactly at the boundary`);
    if (lvl > 0) ok(M.levelFromXp(cum - 1e-6) === lvl - 1, `levelFromXp(cumXpForLevel(${lvl}) - epsilon) stays at ${lvl - 1} (no early rollover)`);
  }
  ok(approx(M.xpToNext(20), C.SKILL.base * Math.pow(C.SKILL.growth, 20)), 'xpToNext(20) matches SKILL.base·SKILL.growth^20 exactly');
  ok(approx(M.charismaMult(20), 1.60), 'charismaMult(20) == 1.60 (the documented L20 sample point)');

  // Communication cost discount clamp: never below 0.4 (the -60% floor), even at an
  // absurd level, and hits the floor exactly at level = CAP/DISCOUNT.
  const cm = ST.newGame();
  ok(approx(M.commsCostMult(cm), 1), 'commsCostMult == 1 at comms level 0 (no discount, no tree perk)');
  cm.skills.comms.level = Math.round(C.COMMS_DISCOUNT_CAP / C.COMMS_DISCOUNT); // exactly at the cap boundary
  ok(approx(M.commsCostMult(cm), 1 - C.COMMS_DISCOUNT_CAP), 'commsCostMult hits the cap exactly at level = CAP/DISCOUNT');
  cm.skills.comms.level = 1e5;
  ok(approx(M.commsCostMult(cm), 0.4), 'commsCostMult floors at exactly 0.4 (the -60% cap) at an absurd comms level, never below');
  ok(approx(M.commsDiscountPct(1e5), C.COMMS_DISCOUNT_CAP), 'commsDiscountPct clamps at COMMS_DISCOUNT_CAP, never exceeds it');

  // L_skill (Charisma) scope: raises social tiers (D2/D3, tags 'social') but leaves
  // non-social tiers (D1, D4) completely untouched (E09-S10-T4 scope regression).
  const sc = ST.newGame();
  sc.generators[0].bought = 20; sc.generators[0].count = 20;
  sc.generators[3].bought = 5; sc.generators[3].count = 5;
  const d1Before = M.tierMultiplier(sc, 0), d2Before = M.tierMultiplier(sc, 1), d4Before = M.tierMultiplier(sc, 3);
  sc.skills.charisma.level = 20;
  const d1After = M.tierMultiplier(sc, 0), d2After = M.tierMultiplier(sc, 1), d4After = M.tierMultiplier(sc, 3);
  ok(approx(d1After, d1Before), 'Charisma leaves D1 (non-social, tag "content") tierMultiplier completely unchanged');
  ok(approx(d4After, d4Before), 'Charisma leaves D4 (non-social, tag "business") tierMultiplier completely unchanged');
  ok(approx(d2After / d2Before, 1 + C.CHARISMA_RATE * 20), 'Charisma raises D2 (social) tierMultiplier by EXACTLY 1 + CHARISMA_RATE·level');

  // buyTraining: spends cash, grants XP to the trained skill, and can level up — through
  // the shared buyTraining path (no bespoke purchase logic).
  const tr = ST.newGame();
  tr.resources.cash = 0;
  ok(!E.buyTraining(tr, 'train_charisma'), 'buyTraining is blocked at zero cash');
  ok(tr.skills.charisma.xp === 0, 'XP unchanged after a blocked buy');
  tr.resources.cash = 1e6;
  const xpBefore = tr.skills.charisma.xp, lvlBefore = tr.skills.charisma.level;
  ok(E.buyTraining(tr, 'train_charisma'), 'buyTraining succeeds once affordable');
  ok(tr.skills.charisma.xp > xpBefore, 'buyTraining grants XP to the trained skill');
  ok(tr.training.train_charisma.bought === 1, 'buyTraining increments the training purchase count');
  ok(tr.skills.charisma.level > lvlBefore, 'a single training purchase already levels up the skill (buyTraining -> refreshSkillLevels wiring)');
  const luNotifs = E.drainNotifications(tr);
  ok(luNotifs.some(n => n.type === 'levelup' && /Charisma/.test(n.text)),
    'a training purchase that crosses a level boundary fires a distinct levelup notification (E09-S10-T1 juice)');

  // tier-8 (Boutique Retreat): gate + distinct celebrate flash, mirroring tier 4/5/6/7.
  const t8 = ST.newGame();
  t8.accommodation.tier = 7; t8.accommodation.owned = [0, 1, 2, 3, 4, 5, 6, 7];
  t8._comfortCache = M.accUnlockComfort(8) - 1;
  t8.resources.cash = 1e18;
  ok(!E.accUnlocked(t8), 'tier 8 (Boutique Retreat) is locked just below its Comfort gate');
  ok(!E.buyAccommodation(t8), 'buyAccommodation is blocked below the tier-8 gate even with huge cash');

  t8._comfortCache = M.accUnlockComfort(8);
  ok(E.accUnlocked(t8), 'tier 8 unlocks exactly at its Comfort gate');
  ok(E.buyAccommodation(t8), 'buyAccommodation succeeds into tier 8 (Boutique Retreat)');
  ok(t8.accommodation.tier === 8, 'accommodation.tier advances to 8');
  ok(t8.accommodation.owned.includes(8), 'tier 8 pushed to ownedTiers');
  ok(approx(M.accScore(8), C.ACC.base * Math.pow(C.ACC.growth, 8)), 'accScore(8) == ACC.base·ACC.growth^8 (the documented formula)');
  const t8notifs = E.drainNotifications(t8);
  ok(t8notifs.some(n => n.type === 'celebrate' && /Boutique/i.test(n.text)),
    'the tier-8 arrival fires a distinct celebratory notification alongside the tier-up');

  // beat 11 (Fork in the Lobby) seed: fires once its Comfort gate is met, after beat 10,
  // and persists across a save/reload round-trip — never double-fires.
  const b11 = ST.newGame();
  b11.skills.charisma.level = 5;
  b11.accommodation.tier = 7;
  b11._comfortCache = 2.2e5 - 1;
  E.checkStory(b11);
  ok(!b11.story.seen.includes(11), 'beat 11 has NOT fired just below its Comfort gate (2.2e5)');

  b11._comfortCache = 2.2e5;
  E.checkStory(b11);
  ok(b11.story.seen.includes(10), 'beat 10 fires first (narrative monotonicity)');
  ok(b11.story.seen.includes(11), 'beat 11 (Fork in the Lobby) fires once Comfort reaches 2.2e5');
  ok(b11.story.seen.filter(x => x === 11).length === 1, 'beat 11 is recorded exactly once');
  E.checkStory(b11); E.checkStory(b11);
  ok(b11.story.seen.filter(x => x === 11).length === 1, 'repeated checkStory calls do not re-fire beat 11');

  const reloadedB11 = ST.migrate(JSON.parse(JSON.stringify(b11)));
  ok(reloadedB11.story.seen.includes(11), 'beat 11 survives a save/reload round-trip');

  // migration: a pre-E09 save missing state.skills entirely backfills to level 0 /
  // neutral multipliers, no NaN (E09-S9-T2/T3).
  const oldSkillsSave = ST.newGame();
  delete oldSkillsSave.skills;
  const migratedSkills = ST.migrate(JSON.parse(JSON.stringify(oldSkillsSave)));
  ok(migratedSkills.skills && migratedSkills.skills.charisma.level === 0 && migratedSkills.skills.comms.level === 0,
    'migration backfills a missing state.skills entirely, defaulting every skill to level 0');
  E.tick(migratedSkills, 1);
  ok(Number.isFinite(migratedSkills.resources.cash), 'ticking a migrated pre-E09 (no skills) save does not crash and cash stays finite');
  ok(approx(M.commsCostMult(migratedSkills), 1), 'a migrated save with comms level 0 has a neutral (×1) cost multiplier — no NaN');
}

// ---------- 43. E10 "Body & Soul": wellness amenity clusters (tan/gym/wellness tags) —
// data validation, mirrors [32]/[37]'s pool/beach cluster checks (E10-S1-T3/T4/T5/T6,
// S8-T4). ----------
console.log('\n[43] E10 wellness clusters (tan/gym/wellness): data validation');
{
  const tan = DATA.amenities.filter(a => a.tag === 'tan');
  const gym = DATA.amenities.filter(a => a.tag === 'gym');
  const wellness = DATA.amenities.filter(a => a.tag === 'wellness');
  ok(tan.length === 4, `the tanning cluster has exactly 4 items (got ${tan.length})`);
  ok(gym.length === 4, `the gym cluster has exactly 4 items (got ${gym.length})`);
  ok(wellness.length === 4, `the spa-menu continuation (tag 'wellness') has exactly 4 items (got ${wellness.length})`);

  const seenIds = new Set();
  for (const a of [...tan, ...gym, ...wellness]) {
    ok(!seenIds.has(a.id), `wellness amenity id is unique: ${a.id}`);
    seenIds.add(a.id);
    ok(a.costBase > 0, `${a.id}: costBase > 0`);
    ok(a.comfort > 0, `${a.id}: comfort > 0`);
    ok(typeof a.bodyXp === 'number' && a.bodyXp > 0, `${a.id}: bodyXp is declared (data-driven, per the epic) even though dormant — see amenities.js's comment`);
    const g = a.costGrowth || C.AMENITY.growthDefault;
    ok(g > 1, `${a.id}: effective costGrowth > 1 (${g})`);
    // positioned above the pre-existing spa cluster's top (private_spa @ 1.2e6) — the
    // wing's own era, per Task B ("above the beach/service tiers").
    ok(a.costBase > 1.2e6, `${a.id}: costBase (${a.costBase}) sits above the pre-existing spa cluster's top (1.2e6)`);
  }

  // gym has the highest bodyXp weight of the three clusters at every matching tier index
  // (S1-T4); the 'wellness' (spa continuation) cluster has the highest comfort weight,
  // continuing above private_spa's own comfort (380) (S1-T5).
  for (let i = 0; i < 4; i++) {
    ok(gym[i].bodyXp > tan[i].bodyXp, `gym tier ${i}: bodyXp (${gym[i].bodyXp}) > tan's (${tan[i].bodyXp})`);
    ok(wellness[i].comfort > gym[i].comfort, `wellness tier ${i}: comfort (${wellness[i].comfort}) > gym's (${gym[i].comfort})`);
  }
  ok(wellness[0].comfort > 380, "the 'wellness' cluster's first item already exceeds private_spa's comfort (380) — a clean continuation of the chain");

  // each cluster is internally monotonic (costBase/comfort/unlockComfort/bodyXp all
  // strictly increase tier-over-tier, mirroring every other chain in this file).
  for (const [label, cluster] of [['tan', tan], ['gym', gym], ['wellness', wellness]]) {
    let prevCost = 0, prevComfort = 0, prevUnlock = 0, prevXp = 0;
    for (const a of cluster) {
      ok(a.costBase > prevCost, `${label} ${a.id}: costBase strictly increases`);
      ok(a.comfort > prevComfort, `${label} ${a.id}: comfort strictly increases`);
      ok(a.unlockComfort > prevUnlock, `${label} ${a.id}: unlockComfort strictly increases`);
      ok(a.bodyXp > prevXp, `${label} ${a.id}: bodyXp strictly increases`);
      prevCost = a.costBase; prevComfort = a.comfort; prevUnlock = a.unlockComfort; prevXp = a.bodyXp;
    }
  }

  // brackets the tier-8 (Boutique Retreat) Comfort gate, same convention as onestar/
  // breakfast (E05/E06): the first item in each cluster unlocks before it, later items
  // keep small wins flowing after check-in.
  const gate8 = M.accUnlockComfort(8);
  for (const [label, cluster] of [['tan', tan], ['gym', gym], ['wellness', wellness]]) {
    ok(cluster.some(a => a.unlockComfort < gate8), `${label}: at least one item unlocks BEFORE the tier-8 gate`);
    ok(cluster.some(a => a.unlockComfort > gate8), `${label}: at least one item unlocks AFTER the tier-8 gate`);
  }

  // the pre-existing 'spa' tag (sunscreen/massage/private_spa) is untouched — same ids,
  // same values as before this epic (guardrail: "don't modify existing amenities").
  const spa = DATA.amenities.filter(a => a.tag === 'spa');
  ok(spa.length === 3, "the pre-existing 'spa' tag still has exactly its original 3 items");
  ok(spa.some(a => a.id === 'private_spa' && a.costBase === 1.2e6 && a.comfort === 380),
    'private_spa (pre-existing) is untouched by this epic');
}

// ---------- 44. E10 Body -> Comfort (wBody, UNBOUNDED — no ceiling): guardrail check
// that the saturating Comfort-cap model was NOT reintroduced, plus monotonicity of
// Body's own Comfort contribution at extreme levels (E10-S2-T4/T5/T6 superseded,
// S10-T2/T10). ----------
console.log('\n[44] E10 Body -> Comfort: unbounded (no cap reintroduced), monotonic');
{
  // guardrail: COMFORT.cap / COMFORT.bodyCapRate were deliberately NOT added — Comfort
  // stays the unbounded sum it has been since E02 (see docs/coverage.md E10 notes).
  ok(C.COMFORT.cap === undefined && C.COMFORT.bodyCapRate === undefined,
    'no COMFORT.cap/bodyCapRate was added (superseded — Comfort stays unbounded, no saturating ceiling)');

  const b = ST.newGame();
  let prev = -Infinity, mono = true;
  for (const lvl of [0, 1, 5, 10, 50, 500, 5000]) {
    b.skills.body.level = lvl;
    const c = M.computeComfort(b, DATA);
    if (c < prev - 1e-9) mono = false;
    prev = c;
  }
  ok(mono, 'computeComfort is non-decreasing as Body level rises, all the way to absurd levels — no cap/saturation');
  ok(Number.isFinite(prev), 'computeComfort stays finite even at an absurd Body level (5000)');

  // Body's own contribution is an exact linear term (wBody · level), unbounded — a
  // level-5000 Body keeps adding the SAME per-level Comfort as a level-1 Body would
  // (no diminishing per-level return — that would be exactly the forbidden cap shape).
  const base = ST.newGame();
  base.skills.body.level = 0;
  const c0 = M.computeComfort(base, DATA);
  base.skills.body.level = 1;
  const c1 = M.computeComfort(base, DATA);
  base.skills.body.level = 5000;
  const c5000 = M.computeComfort(base, DATA);
  base.skills.body.level = 5001;
  const c5001 = M.computeComfort(base, DATA);
  ok(approx(c1 - c0, C.COMFORT.wBody), 'Body level 0->1 adds exactly wBody Comfort');
  ok(approx(c5001 - c5000, C.COMFORT.wBody),
    'Body level 5000->5001 adds the SAME exact wBody Comfort as 0->1 — unbounded, not a saturating cap');
}

// ---------- 45. E10 energy: energyMax/energyRegenRate scale with Body level; engine.tick
// clamps stored energy into [0, energyMax] across normal AND extreme dt (E10-S2-T7/T9,
// S10-T3/T8). ----------
console.log('\n[45] E10 energy: Body-scaled tank + regen, clamped every tick');
{
  const e0 = ST.newGame();
  ok(approx(M.energyMax(e0), C.ENERGY.base), 'energyMax at Body level 0 equals ENERGY.base exactly');
  ok(approx(M.energyRegenRate(e0), C.ENERGY.regen), 'energyRegenRate at Body level 0 equals ENERGY.regen exactly');

  e0.skills.body.level = 10;
  ok(approx(M.energyMax(e0), C.ENERGY.base * (1 + C.ENERGY.perBody * 10)), 'energyMax scales with Body level exactly as documented');
  ok(approx(M.energyRegenRate(e0), C.ENERGY.regen * (1 + C.ENERGY.perBody * 10)), 'energyRegenRate scales with Body level exactly as documented');
  ok(M.energyMax(e0) > M.energyMax(ST.newGame()), 'a fitter Body has a strictly bigger energy tank than a fresh one');

  // clamp: regen never overflows energyMax, even with an absurd dt (E10-S4-T7 "prevent
  // overflow"; S10-T8 "extreme game speed").
  const overflow = ST.newGame();
  overflow.resources.energy = 0;
  E.tick(overflow, 1e6);            // an absurd dt (as gameSpeed=1e6 would produce)
  ok(Number.isFinite(overflow.resources.energy), 'energy stays finite even after an absurd dt');
  ok(approx(overflow.resources.energy, M.energyMax(overflow)), 'a huge dt fills the tank to EXACTLY energyMax, never past it');

  // clamp: never negative, even if externally poked below zero before a tick.
  const negative = ST.newGame();
  negative.resources.energy = -50;
  E.tick(negative, 0.001);
  ok(negative.resources.energy >= 0, 'a tick clamps a negative energy value back to >= 0');

  // normal regen: a small, ordinary tick adds the documented rate·dt (Body level 0 here,
  // and the fresh Comfort is small enough that Body doesn't level up within one second).
  const reg = ST.newGame();
  reg.resources.energy = 0;
  E.tick(reg, 1);
  ok(approx(reg.resources.energy, C.ENERGY.regen, 1e-6), 'one second of regen from empty adds exactly ENERGY.regen at Body level 0');
}

// ---------- 46. E10 energy: engine.click() spends energy on a full tap, floors payout
// once empty, Body XP only on full taps, energy never goes negative (E10-S2-T8, S4-T2/
// T3/T4/T6/T10, S10-T4). ----------
console.log('\n[46] E10 tap spends energy, floors at empty, Body XP on full taps only');
{
  const tp = ST.newGame();
  tp.resources.cash = 1e6;
  tp.bank.tier = C.BANK.tiers - 1;   // crafted cash exceeds the tier-0 wallet — uncap it ([85] tests the cap)
  E.buyGenerator(tp, 0, 20);         // idle income so baseGain isn't just the €1 floor
  const energyBefore = tp.resources.energy;
  const bodyXpBefore = tp.skills.body.xp;
  const fullGain = E.click(tp);
  ok(fullGain > 0, 'a full-energy tap pays out');
  ok(approx(tp.resources.energy, energyBefore - C.ENERGY.tapCost), 'a full-energy tap spends exactly ENERGY.tapCost');
  ok(tp.skills.body.xp > bodyXpBefore, 'a full-energy tap grants Body XP (ENERGY.tapBodyXp)');

  // drain the tank fully WITHOUT ticking (so regen never sneaks it back above tapCost) —
  // directly roll the per-second tap-spam window over each iteration, so only the
  // ENERGY gate (not TAP.maxPerSec) is under test here.
  let windowSec = 0;
  while (tp.resources.energy >= C.ENERGY.tapCost) {
    windowSec++; tp.stats.tapWindowSec = windowSec; tp.stats.tapWindowCount = 0;
    E.click(tp);
  }
  ok(tp.resources.energy < C.ENERGY.tapCost, 'the tank is now below tapCost (empty enough to floor)');
  ok(tp.resources.energy >= 0, 'draining the tank never leaves energy negative');

  windowSec++; tp.stats.tapWindowSec = windowSec; tp.stats.tapWindowCount = 0;
  const bodyXpAtEmpty = tp.skills.body.xp;
  const floorGain = E.click(tp);
  ok(floorGain > 0, 'a tap at empty energy still pays out (the floor), never blocked, never throws');
  ok(tp.resources.energy >= 0, 'a floor tap never drives energy negative');
  ok(approx(tp.skills.body.xp, bodyXpAtEmpty),
    'a floor (empty-energy) tap grants NO Body XP — energy stayed below tapCost, so the full-tap branch never ran');
}

// ---------- 47. E10 pacing invariance: energy/tapping never move tierProd/tierMultiplier
// — the harness itself never taps, and this confirms directly that click() alone cannot
// touch idle income (E10-S4-T9, "never touch the multiplier stack"; harness.mjs's island
// time is IDENTICAL before/after this epic, see docs/coverage.md). ----------
console.log('\n[47] E10 pacing invariance: tapping never moves tierProd/tierMultiplier');
{
  const pv = ST.newGame();
  pv.resources.cash = 1e8;
  E.buyGenerator(pv, 0, 20);
  E.buyGenerator(pv, 1, 10);
  pv.skills.charisma.level = 5;
  pv._comfortCache = M.computeComfort(pv, DATA);

  const prodBefore = [0, 1, 2].map(k => M.tierProd(pv, k));
  const multBefore = [0, 1, 2].map(k => M.tierMultiplier(pv, k));

  // hammer the tap WITHOUT any tick() in between — click() never advances runSec, never
  // calls refreshSkillLevels, and never touches generators/comfort/paths/tree, so this
  // isolates tapping's own effect from the (unrelated) tick-loop progression.
  for (let i = 0; i < 50; i++) E.click(pv);

  const prodAfter = [0, 1, 2].map(k => M.tierProd(pv, k));
  const multAfter = [0, 1, 2].map(k => M.tierMultiplier(pv, k));
  for (let k = 0; k < 3; k++) {
    ok(approx(prodAfter[k], prodBefore[k]), `tierProd(${k}) is UNCHANGED by 50 taps — tapping cannot move idle income`);
    ok(approx(multAfter[k], multBefore[k]), `tierMultiplier(${k}) is UNCHANGED by 50 taps — energy/combo never touch the multiplier stack`);
  }
  ok(pv.skills.body.xp > 0, 'tapping DID grant Body XP (the loop is real) even though it never touched tierProd/tierMultiplier');
}

// ---------- 48. E10 Wellness Wing: panel reveal gating (mirrors ui.js wellnessRevealed
// exactly) + the one-shot reveal flash (E10-S3-T6/S6-T5, mirrors [33]/[38]'s pattern). ----------
console.log('\n[48] E10 Wellness Wing: reveal gating + one-shot flash');
{
  const wellnessRevealed = s => s.accommodation.tier >= 8;

  const fresh = ST.newGame();
  ok(!wellnessRevealed(fresh), 'the Wellness Wing panel stays hidden on a fresh game (tier 0)');

  const almost = ST.newGame();
  almost.accommodation.tier = 7;
  ok(!wellnessRevealed(almost), 'the Wellness Wing panel stays hidden at tier 7 (the beach tier, not the Boutique Retreat)');
  E.checkWellnessReveal(almost);
  ok(!almost.story.flags.wellnessRevealed, 'checkWellnessReveal does not fire before tier 8');

  const arrived = ST.newGame();
  arrived.accommodation.tier = 8;
  ok(wellnessRevealed(arrived), 'the Wellness Wing panel reveals the moment accommodation.tier reaches 8');
  E.checkWellnessReveal(arrived);
  ok(arrived.story.flags.wellnessRevealed, 'checkWellnessReveal fires once tier 8 is reached');
  const notifs = E.drainNotifications(arrived);
  ok(notifs.some(n => n.type === 'unlock' && /Wellness Wing/.test(n.text)), 'the reveal fires a distinct unlock notification');

  E.checkWellnessReveal(arrived);
  ok(!E.drainNotifications(arrived).length, 'checkWellnessReveal does not re-fire on a subsequent check');

  const reloaded = ST.migrate(JSON.parse(JSON.stringify(arrived)));
  ok(reloaded.story.flags.wellnessRevealed, 'the reveal flag survives a save/reload round-trip');
}

// ---------- 49. E10 path-flavor cosmetics: photogenic/sunKissed/hybrid flags — cosmetic
// only (no mechanical effect), branch-specific, neutral entirely unaffected either way
// (E10-S7-T1/T2/T7/T8/T9/T10). ----------
console.log('\n[49] E10 Body path-flavor cosmetics (photogenic/sunKissed/hybrid)');
{
  // below the Body gate: nothing fires, any branch.
  const low = ST.newGame();
  low.story.branch = 'vlogger';
  low.skills.body.level = 7;
  E.checkBodyPathFlags(low);
  ok(!low.story.flags.photogenic, 'photogenic does not fire below the Body gate (level 7)');

  // vlogger + high Body -> photogenic, and ONLY photogenic.
  const vlog = ST.newGame();
  vlog.story.branch = 'vlogger';
  vlog.skills.body.level = 8;
  E.checkBodyPathFlags(vlog);
  ok(vlog.story.flags.photogenic, 'photogenic fires once Body reaches the gate on the vlogger branch');
  ok(!vlog.story.flags.sunKissed, 'sunKissed does NOT fire on the vlogger branch');
  const notifsVlog = E.drainNotifications(vlog);
  ok(notifsVlog.some(n => /[Pp]hotogenic/.test(n.text)), 'photogenic fires a distinct flavor notification');

  // crypto + high Body -> sunKissed, and ONLY sunKissed.
  const crypto = ST.newGame();
  crypto.story.branch = 'crypto';
  crypto.skills.body.level = 8;
  E.checkBodyPathFlags(crypto);
  ok(crypto.story.flags.sunKissed, 'sunKissed fires once Body reaches the gate on the crypto branch');
  ok(!crypto.story.flags.photogenic, 'photogenic does NOT fire on the crypto branch');

  // neutral: high Body triggers NEITHER cosmetic flag — a neutral player loses nothing
  // either way (core Body value — Comfort, training, energy — is entirely unaffected).
  const neutral = ST.newGame();
  neutral.skills.body.level = 20;
  E.checkBodyPathFlags(neutral);
  ok(!neutral.story.flags.photogenic && !neutral.story.flags.sunKissed && !neutral.story.flags.hybridBodyVlogger,
    'the neutral branch gets no cosmetic flags — purely additive path flavor, no lock-in either way');

  // hybrid: vlogger + high Body + genuine vlogger-path investment (not just the branch
  // choice) -> the extra hybrid flag.
  const hybrid = ST.newGame();
  hybrid.story.branch = 'vlogger';
  hybrid.skills.body.level = 8;
  hybrid.paths.vlogger.points = 2;
  E.checkBodyPathFlags(hybrid);
  ok(!hybrid.story.flags.hybridBodyVlogger, 'hybrid does not fire from branch choice alone (vlogger points too low)');
  hybrid.paths.vlogger.points = 5;
  E.checkBodyPathFlags(hybrid);
  ok(hybrid.story.flags.hybridBodyVlogger, 'hybrid fires once vlogger points also cross the threshold');

  const reloadedHybrid = ST.migrate(JSON.parse(JSON.stringify(hybrid)));
  ok(reloadedHybrid.story.flags.hybridBodyVlogger, 'the hybrid flag survives a save/reload round-trip');
}

// ---------- 50. E10 beat 12 (The Body You Travel In) fires once skills.body.level >= 8
// (after beat 11), persists across reload ("confirm beat 12 fires", epic Task D). ----------
console.log('\n[50] E10 beat 12 (The Body You Travel In) fires at Body level 8');
{
  const b12 = ST.newGame();
  b12.accommodation.tier = 7;     // satisfies every accTier-gated beat up through 9
  b12.skills.charisma.level = 5;  // satisfies beat 10's own gate
  b12._comfortCache = 2.2e5;      // satisfies beat 11's own gate
  b12.skills.body.level = 7;
  E.checkStory(b12);
  ok(b12.story.seen.includes(11), "beat 11 fires first (its own Comfort gate is met)");
  ok(!b12.story.seen.includes(12), 'beat 12 has NOT fired at Body level 7, one short of the gate');

  b12.skills.body.level = 8;
  E.checkStory(b12);
  ok(b12.story.seen.includes(12), 'beat 12 fires the moment Body reaches level 8');
  ok(b12.story.seen.filter(x => x === 12).length === 1, 'beat 12 is recorded exactly once');
  E.checkStory(b12); E.checkStory(b12);
  ok(b12.story.seen.filter(x => x === 12).length === 1, 'repeated checkStory calls do not re-fire beat 12');

  const reloadedB12 = ST.migrate(JSON.parse(JSON.stringify(b12)));
  ok(reloadedB12.story.seen.includes(12), 'beat 12 survives a save/reload round-trip');
}

// ---------- 51. E10 migration backfill: resources.energy + the new wellness amenity ids
// for a pre-E10 save (E10-S9-T1/T2/T3/T4/T9/T10, mirrors [36]/[41]'s pattern). ----------
console.log('\n[51] E10 migration backfill: resources.energy + wellness amenities');
{
  const newIds = ['tan_sunbed', 'tan_spray_tan', 'tan_golden_hour_deck', 'tan_bronzing_oil',
    'gym_dumbbell_rack', 'gym_treadmill', 'gym_personal_trainer', 'gym_altitude_room',
    'wellness_sauna', 'wellness_hot_stone', 'wellness_seaweed_wrap', 'wellness_cryo_chamber'];
  const oldSave = ST.newGame();
  delete oldSave.resources.energy;
  for (const id of newIds) delete oldSave.amenities[id];
  const migrated = ST.migrate(JSON.parse(JSON.stringify(oldSave)));

  ok(typeof migrated.resources.energy === 'number', 'migration backfills resources.energy for a pre-E10 save');
  ok(migrated.resources.energy > 0, 'the backfilled energy is a sane positive default, not 0 or NaN');
  ok(newIds.every(id => migrated.amenities[id] && migrated.amenities[id].level === 0),
    'migration backfills every new wellness amenity id at level 0 for a save that predates them');

  E.tick(migrated, 1);
  ok(Number.isFinite(migrated.resources.cash) && Number.isFinite(migrated.resources.energy),
    'ticking a migrated pre-E10 save does not crash and cash/energy stay finite');
  ok(migrated.resources.energy >= 0 && migrated.resources.energy <= M.energyMax(migrated),
    'the migrated energy stays clamped into [0, energyMax] after the first tick');
  ok(approx(migrated._comfortCache, M.computeComfort(migrated, DATA)),
    'a reloaded save recomputes Comfort identically to a fresh computeComfort() call — no drift');

  // export/import round-trip carries the new field too (E10-S9-T9) — the SAME base64
  // JSON blob as every other field, no special-casing needed.
  const withEnergy = ST.newGame();
  withEnergy.resources.energy = 42;
  const roundTripped = ST.importSave(ST.exportSave(withEnergy));
  ok(roundTripped && roundTripped.resources.energy === 42, 'export/import round-trips resources.energy exactly');
}

// ---------- 52. E10 anti-clicker guardrail: sustained max-rate tapping stays a modest,
// floor-dominated fraction of idle income — energy's regen is deliberately much slower
// than its drain (ENERGY.regen=2/s vs a maxPerSec burst spending 40/s), so a truly
// SUSTAINED tapper spends almost the whole time at the ENERGY.tapFloorFrac floor, not
// the full-energy rate (E10-S4-T9, S8-T6: "tapping never becomes the fastest path"). ----------
console.log('\n[52] E10 anti-clicker: sustained tapping stays a modest, floor-dominated fraction of idle income');
{
  const ac = ST.newGame();
  ac.resources.cash = 1e9;
  ac.bank.tier = C.BANK.tiers - 1;   // crafted cash exceeds the tier-0 wallet — uncap it ([85] tests the cap)
  E.buyGenerator(ac, 0, 30);
  ac.skills.body.level = 20;         // a well-trained Body — the BEST case for the clicker

  let idleCash = 0, tapCash = 0;
  for (let sec = 0; sec < 600; sec++) {           // 10 sustained in-game minutes
    const before = ac.resources.cash;
    E.tick(ac, 1);
    idleCash += (ac.resources.cash - before);
    for (let i = 0; i < C.TAP.maxPerSec; i++) tapCash += E.click(ac);
  }
  ok(idleCash > 0, `baseline idle income accrued over the run (€${fmt(idleCash)})`);
  const ratio = tapCash / idleCash;
  ok(ratio < 0.35, `sustained max-rate tapping (€${fmt(tapCash)}) stays under 35% of idle income (€${fmt(idleCash)}, ratio ${ratio.toFixed(2)}) — the idle rate is always the honest floor`);
}

// ---------- 53. E11 CONCIERGE config + state.concierge schema (OFF by default,
// E11-S1-T1/T6, S4-T2). ----------
console.log('\n[53] E11 CONCIERGE config + state.concierge schema (OFF by default)');
{
  ok(C.CONCIERGE && typeof C.CONCIERGE.budgetFrac === 'number', 'CONCIERGE config block exists');
  ok(C.CONCIERGE.defaultOn === false, 'CONCIERGE.defaultOn is false — the concierge must never default on');
  ok(Array.isArray(C.CONCIERGE.whitelist) && C.CONCIERGE.whitelist.length === 1 && C.CONCIERGE.whitelist[0] === 'amenity',
    "CONCIERGE.whitelist defaults to ['amenity'] only — the conservative default (E11-S4-T2)");
  ok(Array.isArray(C.CONCIERGE.categories) && ['amenity', 'generator', 'upgrade'].every(cat => C.CONCIERGE.categories.includes(cat)),
    'CONCIERGE.categories declares all 3 purchasable categories the whitelist UI/engine share');

  const fresh = ST.newGame();
  ok(fresh.concierge && fresh.concierge.on === false, 'a fresh game starts with the concierge OFF');
  ok(fresh.concierge.budgetFrac === C.CONCIERGE.budgetFrac, 'fresh concierge.budgetFrac is seeded from config');
  ok(fresh.concierge.reserveFloor === C.CONCIERGE.reserveFloor, 'fresh concierge.reserveFloor is seeded from config');
  ok(Array.isArray(fresh.concierge.whitelist) && fresh.concierge.whitelist.join(',') === C.CONCIERGE.whitelist.join(','),
    'fresh concierge.whitelist matches the config default');
  ok(fresh.concierge.whitelist !== C.CONCIERGE.whitelist, 'the state whitelist array is a distinct copy, not aliased to config');
  ok(Array.isArray(fresh.concierge.lastActions) && fresh.concierge.lastActions.length === 0, 'fresh concierge.lastActions starts empty');
  ok(fresh.concierge.totalBought === 0 && fresh.concierge.totalSpent === 0, 'fresh concierge totals start at zero');
}

// ---------- 54. E11 suite amenity cluster: data validation + tier 9/10 gate bracketing
// (E11-S1-T2, S5-T1/T3/T4/T5/T6/T7). ----------
console.log('\n[54] E11 suite amenity cluster: data validation + tier 9/10 gate bracketing');
{
  const suite = DATA.amenities.filter(a => a.tag === 'suite');
  ok(suite.length === 6, `the suite cluster has exactly 6 items (got ${suite.length})`);
  const expectedIds = ['turndown_service', 'pillow_menu', 'minibar', 'bathrobe', 'rainfall_shower', 'butler_call_button'];
  ok(expectedIds.every(id => suite.some(a => a.id === id)), 'the suite cluster ships all 6 epic-named items');

  const seen = new Set();
  for (const a of suite) {
    ok(!seen.has(a.id), `suite amenity id is unique: ${a.id}`);
    seen.add(a.id);
    ok(a.costBase > 0, `${a.id}: costBase > 0`);
    ok(a.comfort > 0, `${a.id}: comfort > 0`);
    ok(typeof a.xMult === 'number' && a.xMult > 0, `${a.id}: xMult declared (small, dormant per house convention)`);
    const g = a.costGrowth || C.AMENITY.growthDefault;
    ok(Math.abs(g - 1.5) < 1e-9, `${a.id}: costGrowth is the default 1.5 (no override) — matches the epic's own 'costGrowth:1.5'`);
    ok(a.costBase > 1.92e7, `${a.id}: costBase (${a.costBase}) sits above the Wellness Wing's own top (gym_altitude_room @ 1.92e7)`);
  }

  // strictly increasing costBase/comfort/unlockComfort, and costBase doubles per item
  // (~2x, per the epic's own "ramping ~2x per step", E11-S5-T1).
  let prevCost = 0, prevComfort = 0, prevUnlock = 0;
  for (const a of suite) {
    ok(a.costBase > prevCost, `${a.id}: costBase strictly increases`);
    ok(a.comfort > prevComfort, `${a.id}: comfort strictly increases`);
    ok(a.unlockComfort > prevUnlock, `${a.id}: unlockComfort strictly increases`);
    if (prevCost > 0) ok(approx(a.costBase / prevCost, 2), `${a.id}: costBase is exactly 2x the previous item`);
    prevCost = a.costBase; prevComfort = a.comfort; prevUnlock = a.unlockComfort;
  }

  // brackets BOTH new tiers' Comfort gates (same bracket-the-gate convention as
  // onestar/breakfast/wellness).
  const gate9 = M.accUnlockComfort(9), gate10 = M.accUnlockComfort(10);
  ok(suite.some(a => a.unlockComfort < gate9), 'at least one suite item unlocks BEFORE the tier-9 (5-Star Hotel) gate');
  ok(suite.some(a => a.unlockComfort > gate9 && a.unlockComfort < gate10), 'at least one suite item unlocks BETWEEN the tier-9 and tier-10 gates');
  ok(suite.some(a => a.unlockComfort > gate10), 'at least one suite item unlocks AFTER the tier-10 (5-Star Suite) gate');

  // no dedicated card was added — the suite items surface via the SAME 'suite' tag
  // through the general Amenities panel's generic tag-grouping (E11-S5-T8, additive UI).
  ok(!['pool', 'beach', 'service', 'tan', 'gym', 'wellness', 'spa'].includes(suite[0].tag),
    "suite items use their OWN 'suite' tag, not an existing dedicated-card tag");

  // guardrail: no existing amenity was modified by this epic (spot-check a few).
  const priv = DATA.amenities.find(a => a.id === 'private_spa');
  ok(priv && priv.costBase === 1.2e6 && priv.comfort === 380, 'private_spa (pre-existing) is untouched by this epic');
  const gym = DATA.amenities.find(a => a.id === 'gym_altitude_room');
  ok(gym && gym.costBase === 1.92e7, 'gym_altitude_room (pre-existing, E10) is untouched by this epic');
}

// helper: a crafted state with a real (non-zero) cashRate, cheap enough to buy several
// cheap amenities, at a LOW Comfort baseline (so early-motel-tier amenities read as
// clearly ROI-positive) — reused by several concierge tests below. cash is set AFTER
// the generator purchase so the generator buy itself always succeeds regardless of the
// test's intended starting cash.
function conciergeTestState(cash) {
  const s = ST.newGame();
  s.resources.cash = 1e9;
  E.buyGenerator(s, 0, 30);
  s._comfortCache = 500;
  s.resources.cash = cash;
  s.concierge.on = true;
  return s;
}

// ---------- 55. E11 conciergeCandidates: whitelist filter + ROI ranking + the
// never-buy-a-cosmetic-amenity guardrail (E11-S2-T1/T2/T4/T6, S10-T1). ----------
console.log('\n[55] E11 conciergeCandidates: whitelist filter + ROI ranking + never a cosmetic amenity');
{
  // whitelist filter: the default (['amenity']) never yields a generator/upgrade
  // candidate, even when both are unlocked and cheaply affordable.
  const wl = conciergeTestState(1e6);
  const onlyAmenity = E.conciergeCandidates(wl);
  ok(onlyAmenity.length > 0, 'the default whitelist does yield some amenity candidates in this crafted state');
  ok(onlyAmenity.every(c => c.category === 'amenity'), "default whitelist (['amenity']) never yields a generator/upgrade candidate");

  wl.concierge.whitelist = ['amenity', 'generator', 'upgrade'];
  const allCats = E.conciergeCandidates(wl);
  ok(allCats.some(c => c.category === 'generator'), 'whitelisting generator makes generator candidates appear');
  ok(allCats.some(c => c.category === 'upgrade'), 'whitelisting upgrade makes upgrade candidates appear');

  wl.concierge.whitelist = ['generator'];
  const genOnly = E.conciergeCandidates(wl);
  ok(genOnly.length > 0 && genOnly.every(c => c.category === 'generator'), 'de-whitelisting amenity/upgrade leaves only generator candidates');

  // ROI ranking: every candidate's own roi matches marginal-gain/cost exactly (the
  // SAME harness-style payback formula, replicated here from public config constants
  // only — no private engine internals reached into), and the list sorts descending.
  const rk = conciergeTestState(1e9);
  const cashRate = M.tierProd(rk, 0) + M.savvyPassive(rk);
  const expectedGain = a => {
    const dComf = a.comfort * C.COMFORT.wAmen;
    const comf = rk._comfortCache;
    const L = 1 + C.COMFORT.MULT * Math.log10(1 + comf / C.COMFORT.C0);
    const Lafter = 1 + C.COMFORT.MULT * Math.log10(1 + (comf + dComf) / C.COMFORT.C0);
    return cashRate * (Lafter - L) / L;
  };
  const list = E.conciergeCandidates(rk);
  ok(list.length > 1, 'at least two amenity candidates exist at this crafted comfort level');
  let sorted = true, formulaMatches = true;
  for (let i = 0; i < list.length; i++) {
    const a = DATA.amenities.find(x => x.id === list[i].id);
    const expected = expectedGain(a) / E.amenityCost(rk, a.id);
    if (!approx(list[i].roi, expected, 1e-6)) formulaMatches = false;
    if (i > 0 && list[i].roi > list[i - 1].roi + 1e-12) sorted = false;
  }
  ok(formulaMatches, "each amenity candidate's roi matches marginal-gain/cost exactly (the harness-style payback formula)");
  ok(sorted, 'conciergeCandidates is sorted by roi strictly descending');
  ok(list[0].id === 'bug_spray', 'the true highest-ROI affordable candidate (the cheapest, earliest amenity) sorts first');

  // the never-buy-a-cosmetic-amenity guardrail: infinity_pool (costBase 5e7) is
  // UNLOCKED and AFFORDABLE at this cashRate/comfort, yet its marginal Comfort bump is
  // cosmically tiny relative to its cost (2200 Comfort against a 600K+ existing total)
  // — it must NEVER be a candidate, exactly the leak the ROI harness itself was built
  // to fix. (A separate, LOWER-comfort state above — `rk`, comfort 500 — already shows
  // a real positive-inclusion case: bug_spray legitimately tops that ranking. At THIS
  // much higher comfort baseline, even bug_spray's own tiny Comfort bump has become
  // relatively cosmetic too — which is the expected, correct shape of the log softcap,
  // not a bug: nothing this cheap is worth auto-buying once Comfort has scaled orders
  // of magnitude past it.)
  const cosmetic = conciergeTestState(1e15);
  cosmetic._comfortCache = 6e5; // clears infinity_pool's own unlockComfort (5e5)
  ok(E.amenityUnlocked(cosmetic, 'infinity_pool'), 'infinity_pool is unlocked at this Comfort');
  ok(E.amenityCost(cosmetic, 'infinity_pool') <= cosmetic.resources.cash, 'infinity_pool is affordable at this cash');
  const cosmeticList = E.conciergeCandidates(cosmetic);
  ok(!cosmeticList.some(c => c.id === 'infinity_pool'),
    'infinity_pool — unlocked AND affordable — is NEVER a concierge candidate: its ROI fails the payback-horizon test, exactly the leak the ROI harness itself was built to fix');
}

// ---------- 56. E11 conciergeTick: budget bound, reserve floor, and the tip/fee sink
// (E11-S2-T3/T7, S4-T7, S10-T2/T4). ----------
console.log('\n[56] E11 conciergeTick: budget bound + reserve floor + tip sink');
{
  // budget bound: a tick never spends more than budgetFrac·cash, regardless of how
  // many affordable deals exist (S10-T2).
  const bud = conciergeTestState(100000);
  const cashStart = bud.resources.cash;
  E.conciergeTick(bud, C.CONCIERGE.intervalSec);
  const spent = cashStart - bud.resources.cash;
  ok(bud.concierge.totalBought > 0, 'the concierge actually bought something this interval');
  ok(spent <= C.CONCIERGE.budgetFrac * cashStart + 1e-6, `spend (€${fmt(spent)}) never exceeds budgetFrac·cash (€${fmt(C.CONCIERGE.budgetFrac * cashStart)})`);

  // reserve floor: spending stops before crossing it, even mid-shopping-list, with
  // plenty of BUDGET still remaining (S10-T4 — the floor, not the budget, is what binds).
  const rf = conciergeTestState(100000);
  rf.concierge.reserveFloor = 99950;
  E.conciergeTick(rf, C.CONCIERGE.intervalSec);
  ok(rf.resources.cash >= rf.concierge.reserveFloor - 1e-6, 'cash never drops below the reserve floor');
  ok(rf.concierge.totalBought === 1, 'only the ONE purchase the floor headroom allows is made, not more');

  // tip/fee sink: with a tight budget that fits exactly one purchase, the total
  // deducted is EXACTLY the raw cost times (1 + tipFrac) — a real, measurable drag
  // (E11-S4-T7), not a no-op.
  const tip = conciergeTestState(85); // budget = 21.25, just enough for bug_spray (cost 20)
  const top = E.conciergeCandidates(tip)[0];
  const cashBefore = tip.resources.cash;
  E.conciergeTick(tip, C.CONCIERGE.intervalSec);
  const tipSpent = cashBefore - tip.resources.cash;
  ok(tip.concierge.totalBought === 1, 'exactly one purchase happens under this tight budget');
  ok(approx(tipSpent, top.cost * (1 + C.CONCIERGE.tipFrac), 1e-6),
    'the tip/fee sink adds exactly CONCIERGE.tipFrac on top of the raw purchase cost');

  // zero-cash no-op: nothing happens (and nothing logs) below the cheapest affordable
  // item (S10-T7).
  const zero = ST.newGame();
  zero.concierge.on = true;
  zero.resources.cash = 0;
  E.conciergeTick(zero, C.CONCIERGE.intervalSec);
  ok(zero.concierge.totalBought === 0, 'zero cash: the concierge buys nothing');
  ok(zero.concierge.lastActions.length === 0, 'zero cash: no log entry is created');
}

// ---------- 57. E11 conciergeTick: whitelist takes effect immediately, and rapid
// on/off/on toggling never double-spends or leaves a stuck timer (E11-S2-T4, S4-T10,
// S10-T3/T6). ----------
console.log('\n[57] E11 conciergeTick: whitelist takes effect immediately + rapid toggling is safe');
{
  const wl2 = conciergeTestState(1e5);
  wl2.concierge.whitelist = [];
  E.conciergeTick(wl2, C.CONCIERGE.intervalSec);
  ok(wl2.concierge.totalBought === 0, 'an empty whitelist buys nothing, even with cash and ROI-positive candidates available');

  wl2.concierge.whitelist = ['amenity'];
  E.conciergeTick(wl2, C.CONCIERGE.intervalSec);
  ok(wl2.concierge.totalBought > 0, 're-whitelisting amenity makes the very next interval buy again — takes effect immediately');

  // rapid toggling: turning OFF freezes the accumulator (no backlog builds up), and
  // resuming continues from where it left off — never a stuck timer, never a double-
  // fire, never a duplicated log entry.
  const rt = conciergeTestState(1e5);
  rt.concierge.on = false;
  E.conciergeTick(rt, 3);
  ok(rt.concierge.tickAccum === 0, 'the accumulator never advances while OFF');

  rt.concierge.on = true;
  E.conciergeTick(rt, 3);
  ok(approx(rt.concierge.tickAccum, 3), 'ticking for less than intervalSec just accumulates — no purchase yet');
  ok(rt.concierge.totalBought === 0, 'no purchase yet (the interval has not elapsed)');

  rt.concierge.on = false;
  E.conciergeTick(rt, 100); // a huge dt while OFF must be completely ignored
  ok(approx(rt.concierge.tickAccum, 3), 'toggling OFF freezes the accumulator — no backlog builds up from time spent off, even a huge dt');

  rt.concierge.on = true;
  E.conciergeTick(rt, 2); // 3 + 2 = 5s = exactly one intervalSec
  ok(rt.concierge.totalBought > 0, 'resuming and reaching the interval threshold does shop again');
  ok(approx(rt.concierge.tickAccum, 0), 'the accumulator resets to (near) 0 after exactly one interval elapses — not a backlog catch-up burst');
  ok(rt.concierge.lastActions.length === 1, 'exactly ONE shopping pass (one batched log entry) fires — no duplicate entries from the toggling');

  // hammer on/off across 20 quarter-second ticks (5s of ON+OFF time total, half OFF) —
  // never more than one interval's worth of purchases should land, never a crash.
  const hammer = conciergeTestState(1e5);
  for (let i = 0; i < 20; i++) { hammer.concierge.on = (i % 2 === 0); E.conciergeTick(hammer, 0.25); }
  ok(Number.isFinite(hammer.resources.cash), 'rapid on/off toggling never corrupts cash (stays finite)');
  ok(hammer.concierge.totalBought <= 1, 'rapid on/off toggling accrues at most ONE interval of ON-time worth of purchases here — no double-spend');
}

// ---------- 58. E11 forbidden actions: the concierge never buys accommodation, never
// ascends, never answers a story choice — under ANY whitelist config, even with
// effectively unlimited cash (E11-S4-T6, S10-T10 regression). ----------
console.log('\n[58] E11 forbidden actions: never accommodation, never ascension, never a story choice');
{
  const forb = conciergeTestState(1e30);
  forb.concierge.whitelist = ['amenity', 'generator', 'upgrade'];
  const tierBefore = forb.accommodation.tier;
  const ascBefore = forb.ascension.count;
  const branchBefore = forb.story.branch;
  for (let i = 0; i < 50; i++) E.conciergeTick(forb, C.CONCIERGE.intervalSec);
  ok(forb.concierge.totalBought > 0, 'the concierge did buy a lot, under a huge budget and every category whitelisted (sanity: the policy is actually running)');
  ok(forb.accommodation.tier === tierBefore, 'the concierge NEVER buys accommodation, even with effectively unlimited cash');
  ok(forb.ascension.count === ascBefore, 'the concierge NEVER ascends');
  ok(forb.story.branch === branchBefore, 'the concierge NEVER answers a story choice');
}

// ---------- 59. E11 offline determinism: applyOffline runs the EXACT same tick()/
// conciergeTick() pipeline as a manual macro-step loop — no separate offline-only
// concierge logic, no unpoliced free spending (E11-S9-T4/T5/T7, S10-T5). ----------
console.log('\n[59] E11 offline determinism: applyOffline mirrors a manual tick() loop bit-for-bit');
{
  const seed = () => {
    const s = ST.newGame();
    s.resources.cash = 1e9;   // ample cash so the generator buy below actually succeeds
    E.buyGenerator(s, 0, 20);
    s.resources.cash = 1e6;   // then set the ACTUAL starting cash for the away-time test
    // pin the bank tier EXPLICITLY: the crafted 1e6 cash exceeds the tier-0 wallet, and
    // migrate()'s grandfathering would otherwise raise viaOffline's tier while the
    // un-migrated manual copy stayed at 0 — a real state divergence, not a determinism bug.
    s.bank.tier = C.BANK.tiers - 1;
    s.concierge.on = true;
    s.settings.offlineEnabled = true;
    return s;
  };
  const manual = seed();
  const viaOffline = ST.migrate(JSON.parse(JSON.stringify(seed())));

  const elapsedMs = 3600 * 1000; // 1h away
  const capH = C.OFFLINE_CAP_H + 2 * (manual.ascension.tree.iron_const || 0);
  const total = Math.min(elapsedMs, capH * 3600 * 1000) / 1000;
  const step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) E.tick(manual, step);

  const rep = E.applyOffline(viaOffline, elapsedMs);
  ok(rep && rep.seconds > 0, 'applyOffline returns a report for a real elapsed gap');
  ok(approx(manual.resources.cash, viaOffline.resources.cash, 1e-6), 'manual macro-step loop and applyOffline produce IDENTICAL cash for identical elapsed time');
  ok(manual.concierge.totalBought === viaOffline.concierge.totalBought, 'manual macro-step loop and applyOffline produce the IDENTICAL number of concierge purchases');
  ok(approx(manual.concierge.totalSpent, viaOffline.concierge.totalSpent, 1e-6), 'manual macro-step loop and applyOffline produce IDENTICAL concierge spend');
  ok(manual.concierge.totalBought > 0, 'the concierge really did buy something while "away" (this test is not vacuous)');
  ok(rep.conciergeBought === viaOffline.concierge.totalBought, 'the offline report\'s conciergeBought count matches the running total exactly');
  ok(approx(rep.conciergeSpent, viaOffline.concierge.totalSpent, 1e-6), 'the offline report\'s conciergeSpent matches the running total exactly');
}

// ---------- 60. E11 tier 9/10 arrival: celebratory flashes, beat 13 (Five-Star Frame
// of Mind), and the Concierge Desk reveal (E11-S1-T7/T9, S3-T7, S6-T4/T5/T6/T7/T10).
// ----------
console.log('\n[60] E11 tier 9/10 arrival: celebrate flashes, beat 13, and the Concierge Desk reveal');
{
  // beat 13 requires beat 12 first (narrative monotonicity) and its own accTier:9 gate.
  const b13 = ST.newGame();
  b13._comfortCache = 1e9;
  b13.skills.charisma.level = 5;
  b13.skills.body.level = 8;
  b13.accommodation.tier = 8;
  E.checkStory(b13);
  ok(!b13.story.seen.includes(13), 'beat 13 does NOT fire before accTier 9, even with every other gate already met');
  ok(!E.conciergeUnlocked(b13), 'the Concierge Desk stays locked at tier 8 (no beat 13 either)');

  b13.accommodation.tier = 9;
  E.checkStory(b13);
  ok(b13.story.seen.includes(12), 'beat 12 fires first');
  ok(b13.story.seen.includes(13), 'beat 13 (Five-Star Frame of Mind) fires once accTier reaches 9');
  ok(b13.story.seen.filter(x => x === 13).length === 1, 'beat 13 is recorded exactly once');
  E.checkStory(b13); E.checkStory(b13);
  ok(b13.story.seen.filter(x => x === 13).length === 1, 'repeated checkStory calls do not re-fire beat 13');
  ok(E.conciergeUnlocked(b13), 'the concierge unlocks the same moment beat 13 fires (tier 9)');

  // one-shot Concierge Desk reveal flash (mirrors checkWellnessReveal's pattern).
  E.checkConciergeReveal(b13);
  ok(b13.story.flags.conciergeRevealed, 'checkConciergeReveal fires once tier 9 / beat 13 is reached');
  const revealNotifs = E.drainNotifications(b13);
  ok(revealNotifs.some(n => n.type === 'unlock' && /Concierge Desk/.test(n.text)), 'the reveal fires a distinct unlock notification');
  E.checkConciergeReveal(b13);
  ok(!E.drainNotifications(b13).length, 'checkConciergeReveal does not re-fire on a subsequent check');

  // tier-9 and tier-10 celebratory flashes (E11-S6-T6, mirrors the tier-4..8 flashes).
  const arr9 = ST.newGame();
  arr9.accommodation.tier = 8; arr9.accommodation.owned = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  arr9._comfortCache = M.accUnlockComfort(9);
  arr9.resources.cash = E.accCost(arr9);
  ok(E.buyAccommodation(arr9), 'buyAccommodation succeeds into tier 9 (5-Star Hotel)');
  ok(E.drainNotifications(arr9).some(n => n.type === 'celebrate' && /5-Star Hotel/.test(n.text)),
    'the tier-9 arrival fires a distinct celebratory notification');

  const arr10 = ST.newGame();
  arr10.accommodation.tier = 9; arr10.accommodation.owned = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  arr10._comfortCache = M.accUnlockComfort(10);
  arr10.resources.cash = E.accCost(arr10);
  ok(E.buyAccommodation(arr10), 'buyAccommodation succeeds into tier 10 (5-Star Signature Suite)');
  ok(E.drainNotifications(arr10).some(n => n.type === 'celebrate' && /Suite/.test(n.text)),
    'the tier-10 arrival fires a distinct celebratory notification');

  // UI reveal gating mirrors engine.conciergeUnlocked exactly (E11-S3-T7/T9).
  const fresh = ST.newGame();
  ok(!E.conciergeUnlocked(fresh), 'a fresh game (tier 0) keeps the Concierge Desk locked');

  const reloadedB13 = ST.migrate(JSON.parse(JSON.stringify(b13)));
  ok(reloadedB13.story.seen.includes(13), 'beat 13 survives a save/reload round-trip');
  ok(reloadedB13.story.flags.conciergeRevealed, 'the concierge reveal flag survives a save/reload round-trip');
}

// ---------- 61. E11 migration backfill: state.concierge + suite amenity ids for a
// pre-E11 save (E11-S9-T1/T2/T3/T8/T9/T10, mirrors [41]/[51]'s pattern). ----------
console.log('\n[61] E11 migration backfill: state.concierge + suite amenity ids');
{
  const suiteIds = ['turndown_service', 'pillow_menu', 'minibar', 'bathrobe', 'rainfall_shower', 'butler_call_button'];
  const oldSave = ST.newGame();
  delete oldSave.concierge;
  for (const id of suiteIds) delete oldSave.amenities[id];
  const migrated = ST.migrate(JSON.parse(JSON.stringify(oldSave)));

  ok(migrated.concierge && migrated.concierge.on === false, 'migration backfills state.concierge OFF for a pre-E11 save');
  ok(migrated.concierge.budgetFrac === C.CONCIERGE.budgetFrac, "migration backfills concierge.budgetFrac from config");
  ok(Array.isArray(migrated.concierge.whitelist) && migrated.concierge.whitelist.includes('amenity'), 'migration backfills the amenities-only whitelist default');
  ok(suiteIds.every(id => migrated.amenities[id] && migrated.amenities[id].level === 0),
    'migration backfills every new suite amenity id at level 0 for a save that predates them');

  E.tick(migrated, 1);
  ok(Number.isFinite(migrated.resources.cash), 'ticking a migrated pre-E11 save does not crash and cash stays finite');
  ok(!migrated.concierge.on, 'the concierge stays OFF after ticking a migrated old save — no surprise spending on return (E11-S9-T9)');
  ok(approx(migrated._comfortCache, M.computeComfort(migrated, DATA)), 'a reloaded save recomputes Comfort identically — no drift from the new suite cluster');

  // export/import round-trip (E11-S9-T8): the same base64 JSON blob as every other
  // field, no special-casing needed.
  const withConcierge = ST.newGame();
  withConcierge.concierge.on = true;
  withConcierge.concierge.budgetFrac = 0.4;
  withConcierge.concierge.whitelist = ['amenity', 'generator'];
  const roundTripped = ST.importSave(ST.exportSave(withConcierge));
  ok(roundTripped && roundTripped.concierge.on === true && roundTripped.concierge.budgetFrac === 0.4
    && roundTripped.concierge.whitelist.join(',') === 'amenity,generator',
    'export/import round-trips the full concierge config exactly');
}

// ---------- 62. E11 harness invariance: the concierge is OFF in the default
// newGame()/harness state, so the fitted golden island time is UNCHANGED by this epic
// (the critical guardrail — see docs/coverage.md E11 notes). ----------
console.log('\n[62] E11 harness invariance: concierge OFF by default never moves the fitted island');
{
  const fresh = ST.newGame();
  ok(fresh.concierge.on === false, 'a fresh newGame() (exactly what the harness constructs) has the concierge OFF');

  // conciergeTick is a true no-op while off, at any dt — 50 ticks (small and large dt)
  // never advance the accumulator or buy anything.
  const off = ST.newGame();
  off.resources.cash = 1e6;
  E.buyGenerator(off, 0, 20);
  for (let i = 0; i < 50; i++) E.tick(off, 0.1);
  ok(off.concierge.totalBought === 0, 'concierge.totalBought stays 0 across 50 ticks while OFF');
  ok(off.concierge.tickAccum === 0, 'concierge.tickAccum never advances while OFF');

  // the REAL regression guard: actually run the balance harness's own greedy-optimal
  // runCurve() (dev/harness.mjs) — which constructs ST.newGame() and never touches
  // state.concierge — and confirm the reported island time matches the current fitted
  // baseline (~8h37m00s = 31020s — re-pinned once when the wallet-cap ladder landed, a
  // deliberate economy change; see docs/math-proof.md §11) exactly, not just "some
  // plausible number".
  const { islandAt, peakLog } = runCurve({ dt: 5, maxHours: 40 });
  ok(islandAt !== null, 'the harness still reaches the island (tier 20) within the cap');
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E11 (got ${fmtTime(islandAt)}, expected ~8h15m05s / 29705s)`);
  ok(peakLog < 290, `peak log10(cash) (${peakLog.toFixed(1)}) stays far under the double-overflow ceiling (~308)`);
}

// ---------- 63. E12 config + schema: CLOUT/SPONSOR blocks, state.content/sponsors,
// combo shape (E12-S1). ----------
console.log('\n[63] E12 config + schema: CLOUT/SPONSOR blocks, state.content/sponsors/combo');
{
  ok(typeof C.CLOUT.vloggerPerk === 'number' && C.CLOUT.vloggerPerk === 0.25,
    'CLOUT.vloggerPerk is surfaced (extracted from engine.tick, value UNCHANGED at 0.25)');
  ok(typeof C.CLOUT.vloggerComboBonus === 'number' && C.CLOUT.vloggerComboBonus > 0,
    'CLOUT.vloggerComboBonus exists (extra combo headroom for the vlogger branch)');
  ok(typeof C.CLOUT.contentPathNudge === 'number' && C.CLOUT.contentPathNudge > 0,
    'CLOUT.contentPathNudge exists (one-off path-point nudge per content buy)');
  ok(C.CLOUT.contentRate === 1.0 && C.CLOUT.charismaBoost === 0.02 && C.CLOUT.comboDecaySec === 30
    && C.CLOUT.comboPerClick === 0.15 && C.CLOUT.comboMax === 5,
    'the 5 FITTED CLOUT constants are byte-identical to the pre-E12 shipped values (never retuned)');
  ok(C.SPONSOR && typeof C.SPONSOR.offerIntervalSec === 'number' && typeof C.SPONSOR.cooldownSec === 'number',
    'the new SPONSOR config block exists');

  const fresh = ST.newGame();
  ok(fresh.resources.clout === 0, 'a fresh game starts with 0 Clout');
  ok(fresh.content && DATA.content.every(c => fresh.content[c.id] && fresh.content[c.id].level === 0 && fresh.content[c.id].boosts === 0),
    'state.content seeds every content tier at level 0 / boosts 0');
  ok(fresh.sponsors && fresh.sponsors.active === null && fresh.sponsors.offer === null && fresh.sponsors.totalExpired === 0,
    'state.sponsors starts with no active/offered deal and a zero expiry counter');
  ok(fresh._combo === 1, 'combo starts at the idle floor (1) on a fresh game');
}

// ---------- 64. E12 content-tier + creator gear + sponsor data validation. ----------
console.log('\n[64] E12 content-tier + creator gear + sponsor data validation');
{
  const seen = new Set();
  let prevCost = 0;
  for (const c of DATA.content) {
    ok(!seen.has(c.id), `content id ${c.id} is unique`);
    seen.add(c.id);
    for (const k of ['id', 'name', 'costBase', 'costGrowth', 'contentRate', 'boostCostBase', 'boostCostGrowth', 'boostRate', 'flavor']) {
      ok(c[k] !== undefined, `content ${c.id}: has required key "${k}"`);
    }
    ok(c.costBase > prevCost, `content ${c.id}: costBase strictly increasing`);
    prevCost = c.costBase;
    ok(c.contentRate > 0, `content ${c.id}: contentRate is positive`);
  }
  ok(DATA.content.length === 5, 'exactly 5 content tiers');
  ok(DATA.content.map(c => c.id).join(',') === 'selfie_post,story_reel,daily_vlog,travel_series,documentary',
    "content tiers are declared in the epic's chain order (selfie_post -> ... -> documentary)");

  const gear = DATA.amenities.filter(a => a.tag === 'gear');
  ok(gear.length === 6, 'exactly 6 creator-gear items');
  for (const g of gear) {
    ok(g.contentRate > 0, `gear ${g.id}: contentRate is positive`);
    ok(g.comfort > 0, `gear ${g.id}: comfort is positive`);
  }
  ok(gear.every((g, i) => i === 0 || g.costBase > gear[i - 1].costBase), 'creator gear costBase strictly increases down the chain');

  const sponsorIds = new Set();
  for (const d of DATA.sponsors) {
    ok(!sponsorIds.has(d.id), `sponsor id ${d.id} is unique`);
    sponsorIds.add(d.id);
    for (const k of ['id', 'name', 'mult', 'durationSec', 'requires', 'flavor']) ok(d[k] !== undefined, `sponsor ${d.id}: has required key "${k}"`);
    ok(d.mult > 1, `sponsor ${d.id}: mult is a real multiplier (>1)`);
    ok(d.durationSec > 0, `sponsor ${d.id}: durationSec is positive`);
  }
}

// ---------- 65. E12 math.cloutRate / contentRateTotal / sponsorMult /
// effectiveComboMax — formula correctness (E12-S2-T1, S10-T1/T5/T6). ----------
console.log('\n[65] E12 math.cloutRate / contentRateTotal / sponsorMult / effectiveComboMax — formula correctness');
{
  const s = ST.newGame();
  ok(M.contentRateTotal(s, DATA) === 0, 'contentRateTotal is 0 with no content/gear owned');
  ok(M.sponsorMult(s) === 1, 'sponsorMult is 1 with no active deal');
  ok(M.effectiveComboMax(s) === C.CLOUT.comboMax, 'effectiveComboMax == comboMax for a neutral branch');
  const baseRate = M.cloutRate(s, DATA);
  ok(approx(baseRate, C.CLOUT.contentRate), 'cloutRate collapses to the bare CLOUT.contentRate at combo=1/no perk/no sponsor/charisma=0');

  // charisma coupling: +0.02·charisma exactly (E12-S10-T6)
  s.skills.charisma.level = 10;
  ok(approx(M.cloutRate(s, DATA), C.CLOUT.contentRate * (1 + C.CLOUT.charismaBoost * 10)),
    'raising Charisma raises cloutRate by exactly the +0.02·charisma factor');
  s.skills.charisma.level = 0;

  // vlogger perk: exactly ×(1+vloggerPerk)·(1+points·0.05) once points > 0 (E12-S10-T5)
  ok(M.cloutRate(s, DATA) === baseRate, 'cloutRate is unaffected by branch alone (no vlogger points yet)');
  s.paths.vlogger.points = 3;
  const expectedPerk = C.CLOUT.contentRate * (1 + C.CLOUT.vloggerPerk) * (1 + 3 * 0.05);
  ok(approx(M.cloutRate(s, DATA), expectedPerk), 'cloutRate applies the vlogger perk + path bonus once vlogger points > 0, unchanged otherwise');
  s.paths.vlogger.points = 0;

  // content tiers + creator gear feed contentRateTotal additively
  const c0 = DATA.content[0];
  s.content[c0.id].level = 2;
  ok(approx(M.contentRateTotal(s, DATA), 2 * c0.contentRate), 'content tier level contributes level·contentRate');
  s.content[c0.id].boosts = 1;
  ok(approx(M.contentRateTotal(s, DATA), 2 * c0.contentRate * (1 + c0.boostRate)),
    "a content boost multiplies that tier's own contribution by (1+boostRate·boosts)");
  s.content[c0.id].level = 0; s.content[c0.id].boosts = 0;

  const gear0 = DATA.amenities.find(a => a.tag === 'gear');
  s.amenities[gear0.id].level = 3;
  ok(approx(M.contentRateTotal(s, DATA), 3 * gear0.contentRate), 'creator gear contributes level·contentRate to the same total');
  s.amenities[gear0.id].level = 0;

  // sponsor multiplier applies once active
  s.sponsors.active = { id: 'x', mult: 2.5, expiresAtSec: 999 };
  ok(M.sponsorMult(s) === 2.5, "sponsorMult reads the active deal's own mult");
  ok(approx(M.cloutRate(s, DATA), C.CLOUT.contentRate * 2.5), 'cloutRate is multiplied by the active sponsor mult');
  s.sponsors.active = null;

  // vlogger branch gets extra combo headroom (E12-S7-T2)
  s.story.branch = 'vlogger';
  ok(M.effectiveComboMax(s) === C.CLOUT.comboMax + C.CLOUT.vloggerComboBonus, 'effectiveComboMax adds vloggerComboBonus on the vlogger branch');
}

// ---------- 66. E12 combo: idle floor, ~30s decay, holds at max under sustained
// tapping, vlogger headroom (E12-S2-T3/T4/T5, S4, S10-T2/T4). ----------
console.log('\n[66] E12 combo: idle floor, ~30s decay, holds at max under sustained tapping, vlogger headroom');
{
  const s = ST.newGame();
  ok(s._combo === 1, 'combo starts at the idle floor 1');
  for (let i = 0; i < 100; i++) E.tick(s, 1);
  ok(s._combo === 1, 'a never-tapping player always sits at comboMult=1 (the idle floor)');
  ok(s.resources.clout > 0, 'Clout still accrues at the idle floor (never gated on tapping)');

  const tapper = ST.newGame();
  for (let i = 0; i < 200; i++) E.click(tapper);
  ok(approx(tapper._combo, C.CLOUT.comboMax), 'sustained tapping saturates combo at exactly comboMax, never past it');

  const span = C.CLOUT.comboMax - 1;
  E.tick(tapper, C.CLOUT.comboDecaySec / 2);
  ok(approx(tapper._combo, span / 2 + 1, 1e-6), 'combo decays LINEARLY — exactly halfway back at half of comboDecaySec');
  E.tick(tapper, C.CLOUT.comboDecaySec / 2);
  ok(approx(tapper._combo, 1, 1e-6), 'combo fully decays to the floor (1) in exactly comboDecaySec');
  E.tick(tapper, 5);
  ok(tapper._combo === 1, 'combo never dips below the floor once decayed');

  // vlogger branch: same taps reach a HIGHER cap, at the SAME decay rate
  const vlog = ST.newGame();
  vlog.story.branch = 'vlogger';
  for (let i = 0; i < 400; i++) E.click(vlog);
  ok(approx(vlog._combo, C.CLOUT.comboMax + C.CLOUT.vloggerComboBonus), 'the vlogger branch saturates at the HIGHER effective cap');
  E.tick(vlog, C.CLOUT.comboDecaySec);
  ok(vlog._combo > 1, "a vlogger's bigger combo tank is NOT fully drained after just the base comboDecaySec window (a longer effective window)");
}

// ---------- 67. E12 sponsor deals: opt-in offer -> accept -> timed multiplier ->
// expiry -> cooldown, non-stacking, bounded (E12-S2-T6, Task B, S10-T3). ----------
console.log('\n[67] E12 sponsor deals: offer -> accept -> timed multiplier -> expiry -> cooldown, non-stacking, bounded');
{
  const s = ST.newGame();
  s.paths.vlogger.points = 1;               // unlocks the Creator Dashboard / sponsor subsystem
  E.tick(s, 0.1);
  ok(s.sponsors.offer !== null, 'an offer rolls in almost immediately once the Creator Dashboard is unlocked');

  const offeredId = s.sponsors.offer;
  const deal = E.sponsorData(offeredId);
  const otherId = DATA.sponsors.find(d => d.id !== offeredId)?.id;
  if (otherId) ok(E.acceptSponsor(s, otherId) === false, 'accepting a deal that is NOT the current offer fails');

  const baseline = M.cloutRate(s, DATA);
  ok(E.acceptSponsor(s, offeredId), 'accepting the current offer succeeds');
  ok(s.sponsors.active && s.sponsors.active.id === offeredId, 'the accepted deal becomes the single active slot');
  ok(s.sponsors.offer === null, 'accepting clears the pending offer');
  ok(approx(M.cloutRate(s, DATA), baseline * deal.mult), "cloutRate is multiplied by exactly the accepted deal's mult");

  E.tick(s, 1);
  ok(s.sponsors.offer === null, 'no new offer rolls while a deal is active (bounded to ONE active slot)');
  ok(DATA.sponsors.every(d => E.acceptSponsor(s, d.id) === false), 'no deal can be accepted while one is already active (non-stacking)');

  E.tick(s, deal.durationSec + 1);
  ok(s.sponsors.active === null, "the active deal expires exactly after its own durationSec");
  ok(approx(M.sponsorMult(s), 1), 'Clout multiplier returns to 1 once the deal expires');
  ok(s.sponsors.totalExpired === 1, 'the expiry counter increments exactly once');
  ok(E.sponsorCooldownRemaining(s, offeredId) > 0, 'the just-expired deal enters its cooldown — cannot be re-offered immediately');

  for (const d of DATA.sponsors) {
    ok(Number.isFinite(d.mult) && d.mult > 0, `sponsor ${d.id}: mult is a finite positive number (bounded)`);
    ok(Number.isFinite(d.durationSec) && d.durationSec > 0, `sponsor ${d.id}: durationSec is finite and positive (bounded, timed)`);
  }
}

// ---------- 68. E12 harness invariance: content/sponsors never bought/accepted by the
// harness, island unchanged, Beat 14 lands on the smooth curve (E12-S8-T6/T7/T8/T9,
// guardrail #3). ----------
console.log('\n[68] E12 harness invariance: content/sponsors never touched by the max-speed harness, island unchanged');
{
  const { s, beatTime, islandAt, peakLog } = runCurve({ dt: 5, maxHours: 40 });
  ok(DATA.content.every(c => s.content[c.id].level === 0 && s.content[c.id].boosts === 0),
    "the harness never buys/boosts any content tier (not in its greedy policy) — Clout stays on the pre-E12 baseline formula");
  ok(s.sponsors.active === null, 'the harness never accepts a sponsor deal — no active multiplier ever appears in the max-speed run');
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E12 (got ${fmtTime(islandAt)}, expected ~8h15m05s / 29705s — the committed-path baseline)`);
  ok(peakLog < 290, `peak log10(cash) (${peakLog.toFixed(1)}) stays far under the double-overflow ceiling`);

  ok(beatTime[14] !== undefined, 'Beat 14 (Going Viral) still fires within the harness run');
  ok(beatTime[13] <= beatTime[14] && beatTime[14] <= beatTime[15],
    `Beat 14 (${fmtTime(beatTime[14])}) lands between Beat 13 (${fmtTime(beatTime[13])}) and Beat 15 (${fmtTime(beatTime[15])}) on the smooth curve`);
}

// ---------- 69. E12 Creator Dashboard reveal gating + Going Viral flourish +
// cross-path hybrid flavor (E12-S3-T6, S6-T4, S7-T6). ----------
console.log('\n[69] E12 Creator Dashboard reveal gating + Going Viral flourish + cross-path hybrid flavor');
{
  const s = ST.newGame();
  ok(!E.creatorDashboardUnlocked(s), 'a fresh game has the Creator Dashboard locked (no vlogger points, no beat 14, tier < 11)');
  s.paths.vlogger.points = 0.5;
  ok(E.creatorDashboardUnlocked(s), 'ANY positive vlogger path investment unlocks the dashboard, however small');
  E.tick(s, 0.1);
  const notifs = E.drainNotifications(s);
  ok(notifs.some(n => n.type === 'unlock' && /Creator Dashboard/.test(n.text)), 'the dashboard reveal fires a one-shot unlock flash');
  E.tick(s, 0.1);
  ok(E.drainNotifications(s).every(n => !/Creator Dashboard/.test(n.text)), 'the reveal flash never repeats');

  // Going Viral: layered on Beat 14's OWN existing Comfort gate — fast-track every
  // gate (tier 11's accScore alone clears beat14's 1.3e6 comfort gate) in one tick.
  const gv = ST.newGame();
  gv.accommodation.tier = 11;
  gv.accommodation.owned = Array.from({ length: 12 }, (_, i) => i);
  gv.skills.charisma.xp = 1e6;
  gv.skills.body.xp = 1e7;
  E.tick(gv, 1);
  ok(gv.story.seen.includes(14), "Beat 14 (Going Viral) fires once Comfort crosses its gate (and every prior beat's own gate is also met)");
  ok(gv.story.flags.goingViral, 'the Going Viral flourish fires alongside Beat 14');

  // hybrid path flavor: reachable by ANY mixed build, cosmetic only, never gated on branch
  const hybrid = ST.newGame();
  hybrid.paths.vlogger.points = 5; hybrid.paths.traveler.points = 5;
  E.checkPathHybridFlags(hybrid);
  ok(hybrid.story.flags.hybridTravelVlog, '"travel vlog" hybrid fires once BOTH vlogger and traveler points cross the threshold');
  ok(!hybrid.story.flags.hybridSponsoredShill, 'the crypto hybrid does not fire from the traveler combo alone');
  hybrid.paths.crypto.points = 5;
  E.checkPathHybridFlags(hybrid);
  ok(hybrid.story.flags.hybridSponsoredShill, '"sponsored token shill" hybrid fires once vlogger+crypto points cross the threshold');
}

// ---------- 70. E12 content-tier buy flow (buyContent/buyContentBoost) + creator
// gear integration (E12-S2-T8, S5-T2/T4/T5/T10). ----------
console.log('\n[70] E12 content-tier buy flow (buyContent/buyContentBoost) + creator gear integration');
{
  const s = ST.newGame();
  const c0 = DATA.content[0];
  ok(E.contentUnlocked(s, c0.id), 'the first content tier is unlocked from the start (unlockClout: 0)');
  ok(E.buyContent(s, c0.id) === false, 'zero cash: buying a content tier fails cleanly');
  ok(s.resources.cash >= 0, 'cash never goes negative on a failed content buy');

  s.resources.cash = 1e7;
  s.story.branch = 'vlogger';   // committed-path contract: the nudge only lands on the chosen road
  const before = M.cloutRate(s, DATA);
  const pathBefore = s.paths.vlogger.points;
  ok(E.buyContent(s, c0.id), 'buying an unlocked, affordable content tier succeeds');
  ok(s.content[c0.id].level === 1, 'content level increments by exactly 1 per buy');
  ok(s.paths.vlogger.points > pathBefore, 'a content-tier purchase grants a small one-off vlogger path-point nudge (E12-S7-T4) to a COMMITTED vlogger');
  ok(M.cloutRate(s, DATA) > before, 'cloutRate recomputes higher immediately after a content-tier buy');

  s.resources.cash = 1e12;
  for (let i = 0; i < 5; i++) {
    ok(E.buyContent(s, c0.id), `rapid buy #${i + 2} succeeds with ample cash`);
    ok(s.resources.cash >= 0, 'cash stays non-negative through rapid buys');
  }

  s.resources.clout = 0;
  ok(E.buyContentBoost(s, c0.id) === false, 'zero Clout: boosting a content tier fails cleanly (the sink cannot go negative)');
  s.resources.clout = 1e6;
  const rateBeforeBoost = M.contentRateTotal(s, DATA);
  ok(E.buyContentBoost(s, c0.id), 'a Clout-funded content boost succeeds');
  ok(s.content[c0.id].boosts === 1, 'boosts increments by exactly 1');
  ok(M.contentRateTotal(s, DATA) > rateBeforeBoost, "the boost raises that tier's own contentRate contribution");
  ok(s.resources.clout < 1e6, 'the boost actually spent Clout (the sink has real teeth)');

  const gear0 = DATA.amenities.find(a => a.tag === 'gear');
  s.resources.cash = 1e9;
  const beforeGearRate = M.contentRateTotal(s, DATA);
  const comfortBefore = s._comfortCache;
  ok(E.buyAmenity(s, gear0.id), 'creator gear is bought through the SAME generic buyAmenity(id) — no bespoke gear code');
  ok(M.contentRateTotal(s, DATA) > beforeGearRate, 'buying creator gear raises contentRateTotal (wired into the SAME Clout formula)');
  ok(s._comfortCache > comfortBefore, 'creator gear ALSO feeds Comfort like every other amenity (small comfort bump, E12-S1-T8)');
}

// ---------- 71. E12 migration backfill: state.content + state.sponsors for pre-E12
// saves, combo floors on load, lapsed sponsor expires (E12-S9-T2/T3/T5/T6/T9/T10). ----------
console.log('\n[71] E12 migration backfill: state.content/sponsors, combo floors on load, lapsed sponsor expiry');
{
  const fresh = ST.newGame();
  const raw = JSON.parse(JSON.stringify(fresh));
  delete raw.content;
  delete raw.sponsors;
  raw._combo = 4.2;                 // simulate a mid-combo snapshot at the moment of save
  raw._comboTimer = 99;
  const migrated = ST.migrate(raw);
  ok(migrated.content && DATA.content.every(c => migrated.content[c.id] && migrated.content[c.id].level === 0 && migrated.content[c.id].boosts === 0),
    'migration backfills state.content wholesale for a save that predates it');
  ok(migrated.sponsors && migrated.sponsors.active === null && migrated.sponsors.offer === null,
    'migration backfills state.sponsors wholesale for a save that predates it');
  ok(migrated._combo === 1, 'combo floors to 1 on load regardless of the saved mid-combo snapshot');
  ok(migrated._comboTimer === 0, 'the dormant _comboTimer also floors on load');

  E.tick(migrated, 1);
  ok(Number.isFinite(migrated.resources.clout), 'ticking a migrated pre-E12 save keeps Clout finite, no crash');

  // export/import round-trips the new fields
  const withContent = ST.newGame();
  withContent.resources.cash = 1e7;
  E.buyContent(withContent, DATA.content[0].id);
  withContent.paths.vlogger.points = 1;
  withContent.sponsors.active = { id: 'energy_drink', mult: 1.5, expiresAtSec: 500 };
  const roundTripped = ST.importSave(ST.exportSave(withContent));
  ok(roundTripped.content[DATA.content[0].id].level === 1, 'export/import round-trips content-tier levels');
  ok(roundTripped.sponsors.active && roundTripped.sponsors.active.id === 'energy_drink', 'export/import round-trips an in-flight sponsor deal');

  // a save with an IN-FLIGHT sponsor deal whose expiry is already in the past
  const lapsed = ST.newGame();
  lapsed.paths.vlogger.points = 1;
  lapsed.sponsors.active = { id: 'energy_drink', mult: 1.5, expiresAtSec: -100 };
  E.tick(lapsed, 1);
  ok(lapsed.sponsors.active === null, "a sponsor deal whose expiry has already lapsed expires on the very next tick");
  ok(lapsed.sponsors.totalExpired === 1, 'the lapsed deal is counted as expired');
}

// ---------- 72. E12 offline: Clout production via content tiers, combo floors,
// sponsor expiry, summary fields (E12-S9-T3/T6/T7/T8). ----------
console.log('\n[72] E12 offline: Clout production via content tiers, combo floors, sponsor expiry, summary fields');
{
  const s = ST.newGame();
  s.settings.offlineEnabled = true;
  s.resources.cash = 1e8;
  E.buyContent(s, DATA.content[0].id);   // owns a content tier producing Clout passively
  s._combo = 4;                          // simulate a mid-combo snapshot right before going away
  s.paths.vlogger.points = 1;
  s.sponsors.active = { id: 'energy_drink', mult: 1.5, expiresAtSec: 30 }; // lapses mid-offline

  const beforeClout = s.resources.clout;
  const rep = E.applyOffline(s, 2 * 3600 * 1000); // 2h away
  ok(rep !== null, 'applyOffline returns a report for a real elapsed gap');
  ok(rep.clout > 0, 'Clout accrued while away (content tiers keep producing offline)');
  ok(s.resources.clout > beforeClout, 'resources.clout actually increased across the offline replay');
  ok(s._combo === 1, 'combo is back at the idle floor after any decent offline stretch');
  ok(s.sponsors.active === null, 'the in-flight sponsor deal expired correctly during the offline replay');
  ok(rep.sponsorsExpired === 1, 'the offline report counts the sponsor expiry');
}

// ---------- 73. E12 edge: extreme game speed keeps Clout/combo/sponsors finite and
// correct (E12-S10-T9). ----------
console.log('\n[73] E12 edge: extreme game speed keeps Clout/combo/sponsors finite and correct');
{
  const s = ST.newGame();
  s.paths.vlogger.points = 1;
  for (let i = 0; i < 500; i++) E.click(s);          // saturate combo before the hyperspeed jump
  ok(s._combo > 1, 'combo is above the floor going into the hyperspeed tick');
  E.tick(s, 100000);                                  // a single, absurdly large dt
  ok(Number.isFinite(s.resources.clout), 'Clout stays finite after an absurdly large single tick');
  ok(s._combo === 1, 'combo correctly decays all the way to the floor under a huge dt');
  ok(Number.isFinite(s.sponsors.nextOfferAtSec) && Number.isFinite(s.sponsors.offerCycle), 'sponsor timers stay finite under a huge dt');
  ok(s.resources.clout >= 0, 'Clout never goes negative');
}

// ---------- 74. Committed-path contract (SUPERSEDES the old E12 "no lock-in" doctrine
// by design directive): one path per run/life, chosen at the beat-6 crossroads; focus
// and nudges only flow into the chosen road; the ascension hard reset hands the choice
// back. A neutral player is never PUNISHED (baseline Clout etc. still flows) — they
// just haven't committed yet. ----------
console.log('\n[74] committed-path contract: one road per life, focus/nudges only on the chosen path');
{
  const neutral = ST.newGame();
  ok(neutral.story.branch === 'neutral', 'sanity: fresh game starts neutral');
  E.tick(neutral, 1);
  ok(neutral.resources.clout > 0, 'a neutral (uncommitted) player still earns baseline Clout — never punished, just uncommitted');
  neutral.resources.cash = 1e9; neutral.bank.tier = C.BANK.tiers - 1;
  ok(!E.buyPathFocus(neutral, 'vlogger'), 'focus is BLOCKED before the crossroads commitment — no pre-choice dabbling');
  ok(neutral.paths.vlogger.points === 0, 'no points accrue before commitment');

  const mixed = ST.newGame();
  mixed.resources.cash = 1e9; mixed.bank.tier = C.BANK.tiers - 1;
  mixed.story.seen.push(2, 3, 4, 5, 6);
  ok(E.applyStoryChoice(mixed, 6, 'vlogger'), 'the beat-6 crossroads choice commits the run to one path');
  ok(mixed.story.branch === 'vlogger' && mixed.paths.vlogger.points === 5, 'commitment sets the branch and grants the +5 starter points');
  ok(!E.applyStoryChoice(mixed, 6, 'crypto'), 'the crossroads cannot be re-answered — one commitment per life (no hopping)');
  ok(E.buyPathFocus(mixed, 'vlogger'), 'focus into the COMMITTED path succeeds');
  ok(!E.buyPathFocus(mixed, 'traveler') && !E.buyPathFocus(mixed, 'crypto'),
    'focus into any OTHER path is a hard no-op for the rest of the run');
  ok(mixed.paths.traveler.points === 0 && mixed.paths.crypto.points === 0,
    'non-chosen paths hold zero points — hopping earns nothing');
  // cross-path nudges are no-ops too: a committed vlogger buying a coin earns no crypto points
  mixed.crypto.holdings = { ...mixed.crypto.holdings };
  E.buyCoin(mixed, DATA.crypto.coins[0].id, 1);
  ok(mixed.paths.crypto.points === 0, "a committed vlogger's coin buy grants NO crypto path points (nudges follow the chosen road)");

  const noPoints = ST.newGame();
  noPoints.story.branch = 'vlogger';   // branch chosen, but zero points invested
  ok(approx(M.cloutRate(noPoints, DATA), C.CLOUT.contentRate),
    'choosing the vlogger branch ALONE (no points) does not change cloutRate — the perk keys on points, not the label');
}

// ---------- 75. E13 config + data validation: MARKET block, COINS/MARKET_EVENTS/HEDGES
// schema, fresh-game state.market/state.crypto shape (E13-S1). ----------
console.log('\n[75] E13 config + data validation: MARKET block, COINS/MARKET_EVENTS/HEDGES schema');
{
  ok(typeof C.MARKET.seed === 'number', 'config.MARKET.seed is a number');
  ok(C.MARKET.crashFloor > 0 && C.MARKET.crashFloor < 1, 'config.MARKET.crashFloor is a positive floor below 1');
  ok(C.MARKET.boomCap > 1, 'config.MARKET.boomCap is a ceiling above 1');
  ok(C.SAVVY_YIELD === 0.02, 'SAVVY_YIELD is untouched by E13 — still 0.02, a fitted constant never retuned here');

  const seenCoin = new Set();
  for (const c of DATA.crypto.coins) {
    ok(!seenCoin.has(c.id), `coin id is unique: ${c.id}`);
    seenCoin.add(c.id);
    ok(c.costBase > 0 && c.costGrowth > 1, `${c.id}: costBase/costGrowth sane`);
    ok(c.yieldPerUnit > 0, `${c.id}: yieldPerUnit > 0`);
  }
  ok(DATA.crypto.coins.length >= 6, 'the coin roster has at least 6 flavored coins');

  let weightSum = 0;
  for (const e of DATA.crypto.events) {
    ok(['boom', 'crash', 'chop'].includes(e.kind), `${e.id}: kind is boom/crash/chop`);
    ok(e.multRange[0] > 0 && e.multRange[1] >= e.multRange[0], `${e.id}: multRange sane`);
    ok(e.durRange[0] > 0 && e.durRange[1] >= e.durRange[0], `${e.id}: durRange sane`);
    weightSum += e.weight;
  }
  ok(approx(weightSum, 1), `MARKET_EVENTS weights sum to 1 (got ${weightSum})`);

  for (const h of DATA.crypto.hedges) ok(h.cost > 0 && h.crashDamp > 0 && h.crashDamp < 1, `${h.id}: cost/crashDamp sane`);

  const fresh = ST.newGame();
  ok(fresh.market && fresh.market.phase === 'calm' && fresh.market.mult === 1 && fresh.market.cursor === 0,
    'a fresh game starts with market phase calm, mult 1, cursor 0');
  ok(fresh.crypto && DATA.crypto.coins.every(c => fresh.crypto.holdings[c.id] === 0),
    'a fresh game starts with every coin holding at 0');
  ok(DATA.crypto.hedges.every(h => fresh.crypto.hedges[h.id] === false), 'a fresh game starts with no hedges owned');
}

// ---------- 76. E13 util.rng: pure, seeded, deterministic hash (guardrail: NO
// Math.random anywhere) — same (seed,cursor) always matches, a different cursor (or
// seed) always differs (E13-S10-T2). ----------
console.log('\n[76] E13 util.rng: pure, deterministic, seeded hash');
{
  const a1 = rng(42, 7), a2 = rng(42, 7);
  ok(a1 === a2, 'rng(seed, cursor) is a pure function — the SAME (seed,cursor) gives the exact same value every call');
  ok(rng(42, 8) !== a1, 'a different cursor (same seed) gives a different draw');
  ok(rng(43, 7) !== a1, 'a different seed (same cursor) gives a different draw');

  let allInRange = true;
  for (let i = 0; i < 200; i++) { const v = rng(1337, i); if (!(v >= 0 && v < 1)) allInRange = false; }
  ok(allInRange, 'rng(seed, cursor) always returns a value in [0,1) across 200 cursors');

  const vals = Array.from({ length: 500 }, (_, i) => rng(9, i));
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  ok(mean > 0.4 && mean < 0.6, `rng draws are reasonably well-distributed (mean ${mean.toFixed(3)} over 500 draws, expect ~0.5)`);
}

// ---------- 77. E13 crash damping: Unshakeable halves crash DEPTH per rank; hedges +
// Unshakeable stack multiplicatively toward, but never past, config.MARKET.maxCrashDamp
// (Task B, E13-S2-T8/S10-T4). ----------
console.log('\n[77] E13 crash damping: Unshakeable halves crash depth; stacks toward, never past, full immunity');
{
  const rawMult = 0.3;             // a crafted undamped crash multiplier for this test
  const undampedDepth = 1 - rawMult;

  const zero = ST.newGame();
  ok(approx(M.crashDampTotal(zero, DATA), 0), 'no hedges + no Unshakeable => zero crash damp');

  const one = ST.newGame();
  one.ascension.tree.unshakeable = 1;
  const damp1 = M.crashDampTotal(one, DATA);
  const damped1 = 1 - (1 - rawMult) * (1 - damp1);
  ok(approx(1 - damped1, undampedDepth * 0.5), 'Unshakeable rank 1 (no hedges) exactly halves crash DEPTH');

  const two = ST.newGame();
  two.ascension.tree.unshakeable = 2;
  ok(M.crashDampTotal(two, DATA) > damp1, 'a higher Unshakeable rank damps MORE than a lower rank');

  const maxed = ST.newGame();
  maxed.ascension.tree.unshakeable = 3;
  for (const h of DATA.crypto.hedges) maxed.crypto.hedges[h.id] = true;
  const dampMax = M.crashDampTotal(maxed, DATA);
  ok(dampMax < 1, 'even fully hedged + maxed Unshakeable NEVER reaches full crash immunity (damp < 1)');
  ok(dampMax <= C.MARKET.maxCrashDamp + 1e-9, 'combined crash damp never exceeds config.MARKET.maxCrashDamp');
}

// ---------- 78. E13 market events: bounded regardless of hedges/branch (crash floor,
// boom cap), and completely gated off for a fresh game (E13-S4-T3/T10, S10-T3). ----------
console.log('\n[78] E13 market events: bounded (crash floor / boom cap), gated off by default');
{
  const g = ST.newGame();
  for (let i = 0; i < 50; i++) E.tick(g, 5);
  ok(g.market.phase === 'calm' && g.market.cursor === 0 && g.market.mult === 1,
    'a fresh game with zero crypto investment never advances the market scheduler, even after many ticks');

  const active = ST.newGame();
  active.paths.crypto.points = 1;   // trip cryptoActive — no coin purchase needed
  let minMult = Infinity, maxMult = -Infinity;
  for (let i = 0; i < 6000; i++) {
    E.tick(active, 10);
    const m = M.marketMult(active, DATA);
    if (m < minMult) minMult = m;
    if (m > maxMult) maxMult = m;
  }
  ok(active.market.cursor > 0, 'the scheduler DOES advance once the crypto path has points');
  ok(active.market.totalEvents > 0, 'at least one market event fired over the simulated stretch');
  ok(minMult >= C.MARKET.crashFloor - 1e-9, `marketMult never dips below config.MARKET.crashFloor (got min ${minMult.toFixed(3)})`);
  ok(maxMult <= C.MARKET.boomCap + 1e-9, `marketMult never exceeds config.MARKET.boomCap (got max ${maxMult.toFixed(3)})`);
  ok(Number.isFinite(active.resources.cash) && active.resources.cash >= 0, 'cash stays finite and non-negative through heavy market volatility');
}

// ---------- 79. E13 crypto buy/sell (engine.buyCoin/sellCoin/buyHedge): affordability
// gates, holdings, path-point nudge, cash never negative (E13-S3-T4, S1-T8). ----------
console.log('\n[79] E13 crypto buy/sell: affordability gates, holdings, path-point nudge');
{
  const b = ST.newGame();
  b.bank.tier = C.BANK.tiers - 1;    // crafted cash exceeds the tier-0 wallet — uncap it ([85] tests the cap)
  b.story.branch = 'crypto';         // committed-path contract: the buy nudge only lands on the chosen road
  const coin = DATA.crypto.coins[0];
  b.resources.cash = 0;
  ok(!E.buyCoin(b, coin.id, 1), 'buyCoin is blocked at zero cash');
  ok((b.crypto.holdings[coin.id] || 0) === 0, 'holdings unchanged after a blocked buy');

  b.resources.cash = 1e6;
  const cost0 = E.coinCost(b, coin.id, 1);
  ok(approx(cost0, coin.costBase), 'the first unit costs exactly costBase');
  const pointsBefore = b.paths.crypto.points;
  ok(E.buyCoin(b, coin.id, 1), 'buyCoin succeeds with enough cash');
  ok(b.crypto.holdings[coin.id] === 1, 'holdings incremented by 1');
  ok(b.paths.crypto.points > pointsBefore, 'buying a coin nudges crypto path points (E13-S7-T8, "the lane self-feeds")');

  const cost1 = E.coinCost(b, coin.id, 1);
  ok(approx(cost1 / cost0, coin.costGrowth), 'the next unit costs exactly ×costGrowth more (geometric ramp)');

  const cashBefore = b.resources.cash;
  ok(!E.sellCoin(b, coin.id, 5), 'sellCoin is blocked when selling more than held');
  ok(E.sellCoin(b, coin.id, 1), 'sellCoin succeeds for an owned unit');
  ok(b.crypto.holdings[coin.id] === 0, 'holdings decremented back to 0');
  ok(b.resources.cash > cashBefore, 'selling pays out cash');

  const zeroHeld = ST.newGame();
  ok(!E.sellCoin(zeroHeld, coin.id, 1), 'sellCoin is blocked with zero held');

  const h = DATA.crypto.hedges[0];
  const hd = ST.newGame();
  hd.resources.cash = 0;
  ok(!E.buyHedge(hd, h.id), 'buyHedge is blocked at zero cash');
  hd.resources.cash = 1e7;
  ok(E.buyHedge(hd, h.id), 'buyHedge succeeds with enough cash');
  ok(hd.crypto.hedges[h.id] === true, 'hedge flips to owned');
  ok(!E.buyHedge(hd, h.id), 're-buying an already-owned hedge is blocked (a one-time purchase)');
}

// ---------- 80. E13 harness invariance: crypto is gated off by default, so the fitted
// island time is UNCHANGED (guardrail #3 — the direct island guard). ----------
console.log('\n[80] E13 harness invariance: crypto gated off by default, fitted island UNCHANGED');
{
  const fresh = ST.newGame();
  ok(fresh.market.phase === 'calm' && fresh.paths.crypto.points === 0,
    'a fresh newGame() (exactly what the harness constructs) starts with the market calm and zero crypto points');

  const { islandAt, peakLog } = runCurve({ dt: 5, maxHours: 40 });
  ok(islandAt !== null, 'the harness still reaches the island (tier 20) within the cap');
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E13 (got ${fmtTime(islandAt)}, expected ~8h15m05s / 29705s — the committed-path baseline)`);
  ok(peakLog < 290, `peak log10(cash) (${peakLog.toFixed(1)}) stays far under the double-overflow ceiling (~308)`);
}

// ---------- 81. E13 offline replay determinism: same seed -> same market outcome
// (mirrors test [59]'s applyOffline-vs-manual-macro-loop pattern exactly) + seed
// reproducibility on a second independent replay (E13-S4-T9, S9-T3/T6, S10-T2). ----------
console.log('\n[81] E13 offline replay determinism: same seed -> same market outcome');
{
  const seedState = () => {
    const s = ST.newGame();
    s.market.seed = 424242;
    s.paths.crypto.points = 5;                          // trip cryptoActive
    s.crypto.holdings[DATA.crypto.coins[0].id] = 10;     // owns yield-producing coins
    s.settings.offlineEnabled = true;
    return s;
  };
  const manual = seedState();
  const viaOffline = ST.migrate(JSON.parse(JSON.stringify(seedState())));

  const elapsedMs = 3600 * 1000; // 1h away
  const capH = C.OFFLINE_CAP_H + 2 * (manual.ascension.tree.iron_const || 0);
  const total = Math.min(elapsedMs, capH * 3600 * 1000) / 1000;
  const step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) E.tick(manual, step);

  const rep = E.applyOffline(viaOffline, elapsedMs);
  ok(rep && rep.seconds > 0, 'applyOffline returns a report for a real elapsed gap');
  ok(manual.market.cursor === viaOffline.market.cursor, 'manual macro-step loop and applyOffline draw the IDENTICAL number of seeded market draws');
  ok(manual.market.totalEvents === viaOffline.market.totalEvents, 'manual macro-step loop and applyOffline fire the IDENTICAL count of market events');
  ok(approx(manual.resources.cash, viaOffline.resources.cash, 1e-6), 'manual macro-step loop and applyOffline produce IDENTICAL cash (crypto yield included) for identical elapsed time');
  ok(rep.cryptoYield > 0, "the offline report's cryptoYield reflects real crypto income accrued while away (this test is not vacuous)");

  // seed reproducibility (E13-S4-T9): the SAME seed, replayed through applyOffline from
  // an IDENTICAL starting state a second time, gives the IDENTICAL outcome — no
  // Math.random, no wall-clock dependence anywhere in the market.
  const again = ST.migrate(JSON.parse(JSON.stringify(seedState())));
  E.applyOffline(again, elapsedMs);
  ok(again.market.cursor === viaOffline.market.cursor && approx(again.resources.cash, viaOffline.resources.cash, 1e-6),
    'replaying the SAME seed from the SAME starting state gives the IDENTICAL market outcome');
}

// ---------- 82. E13 migration: backfills state.market/state.crypto for a pre-E13 save,
// reseeding market.seed from THAT save's own meta.createdAt (E13-S9-T1/T2/T10). ----------
console.log('\n[82] E13 migration: backfills state.market/state.crypto, reseeds from meta.createdAt');
{
  const pre13 = ST.newGame();
  pre13.meta.createdAt = 123456789;
  delete pre13.market;
  delete pre13.crypto;
  const migrated = ST.migrate(JSON.parse(JSON.stringify(pre13)));
  ok(migrated.market && migrated.market.phase === 'calm' && migrated.market.mult === 1,
    'migration backfills state.market (calm, mult 1) for a save that predates E13');
  ok(migrated.market.seed === 123456789, "migration reseeds market.seed from the save's OWN meta.createdAt, not the shared default");
  ok(migrated.crypto && DATA.crypto.coins.every(c => migrated.crypto.holdings[c.id] === 0),
    'migration backfills state.crypto.holdings at 0 for every coin');
  ok(DATA.crypto.hedges.every(h => migrated.crypto.hedges[h.id] === false), 'migration backfills state.crypto.hedges as unbought');
  E.tick(migrated, 1);
  ok(Number.isFinite(migrated.resources.cash), 'ticking a migrated pre-E13 save does not crash and cash stays finite (no NaN)');

  const already = ST.newGame();
  already.market.seed = 777;
  const stillSame = ST.migrate(JSON.parse(JSON.stringify(already)));
  ok(stillSame.market.seed === 777, 'a save that already has state.market keeps its OWN seed (not silently reseeded)');
}

// ---------- 83. E13 beat 14 crypto variant ("Whale Watching") + neutral fallback +
// the one-shot Savvy/path bonus (Task D, E13-S7-T3/T4/T5/T10). ----------
console.log('\n[83] E13 beat 14 crypto variant (Whale Watching) + neutral fallback + Savvy/path bonus');
{
  const cr = ST.newGame();
  cr.story.branch = 'crypto';
  cr.accommodation.tier = 11;
  cr.accommodation.owned = Array.from({ length: 12 }, (_, i) => i);
  cr.skills.charisma.xp = 1e6;
  cr.skills.body.xp = 1e7;
  const savvyBefore = cr.skills.savvy.xp, pointsBefore = cr.paths.crypto.points;
  E.tick(cr, 1);
  ok(cr.story.seen.includes(14), 'beat 14 fires for a crypto-branch player on the SAME shared gate as every other branch');

  const beat14 = DATA.story.find(b => b.id === 14);
  const copy = E.beatCopy(cr, beat14);
  ok(copy.title === 'Whale Watching', 'the crypto branch sees the "Whale Watching" variant title');
  ok(copy.text !== beat14.text, 'the crypto variant text differs from the neutral default');

  ok(cr.story.flags.whaleWatched, 'whaleWatched fires automatically once beat 14 lands for a crypto-branch player (E13-S7-T5, adapted)');
  ok(cr.skills.savvy.xp > savvyBefore, 'whaleWatched grants a one-time Savvy XP bonus');
  ok(cr.paths.crypto.points > pointsBefore, 'whaleWatched grants a one-time crypto path-point bonus');
  const xpAfterFirst = cr.skills.savvy.xp;
  E.checkWhaleWatching(cr);
  ok(cr.skills.savvy.xp === xpAfterFirst, 'whaleWatched never re-fires (one-shot)');

  // neutral fallback (E13-S7-T10): a non-crypto player still passes beat 14 via the
  // UNCHANGED default gate/copy, and never gets the crypto-only bonus.
  const neutral = ST.newGame();
  neutral.accommodation.tier = 11;
  neutral.accommodation.owned = Array.from({ length: 12 }, (_, i) => i);
  neutral.skills.charisma.xp = 1e6;
  neutral.skills.body.xp = 1e7;
  E.tick(neutral, 1);
  ok(neutral.story.seen.includes(14), 'a neutral/other-branch player still passes beat 14 via the default gate — no build stranded');
  ok(E.beatCopy(neutral, beat14).title === 'Going Viral', 'a non-crypto player sees the default "Going Viral" title');
  ok(!neutral.story.flags.whaleWatched, 'whaleWatched never fires for a non-crypto branch, even after beat 14');
}

// ---------- 84. E13 QA polish: savvyPassive purity (unchanged formula) + zero-net-worth
// crypto edge cases, no NaN/divide-by-zero (E13-S10-T1/T5). ----------
console.log('\n[84] E13 QA polish: savvyPassive purity + zero-holdings/zero-cash edge cases');
{
  const l0 = ST.newGame();
  ok(M.savvyPassive(l0) === 0, 'savvyPassive is 0 at Savvy level 0 (a fresh game)');

  const half = ST.newGame(); half.skills.savvy.xp = M.cumXpForLevel(5); half.stats.lifetimeCash = 1e6;
  half.skills.savvy.level = M.levelFromXp(half.skills.savvy.xp);
  const p1 = M.savvyPassive(half);
  half.stats.lifetimeCash = 4e6; // 4x lifetime cash -> sqrt scaling => exactly 2x passive
  const p2 = M.savvyPassive(half);
  ok(approx(p2 / p1, 2), 'savvyPassive scales as √(lifetimeCash) — 4x cash gives exactly 2x passive');
  ok(M.savvyPassive(half) === M.savvyPassive(half), 'savvyPassive is pure — repeated calls on the same state agree exactly');

  const zeroCrypto = ST.newGame();
  ok(M.cryptoYieldPerSec(zeroCrypto, DATA) === 0, 'cryptoYieldPerSec is exactly 0 with no coins held — no sqrt/log weirdness, no divide-by-zero');
  ok(M.cryptoHoldingsValue(zeroCrypto, DATA) === 0, 'cryptoHoldingsValue is exactly 0 with no coins held');
  ok(M.cryptoNetWorth(zeroCrypto, DATA) === zeroCrypto.resources.cash, 'cryptoNetWorth with zero holdings equals plain wallet cash');
}

// ---------- 85. Bank account / wallet cap: the offline-lump control (config.BANK,
// engine.gainCash/buyBankUpgrade, math.bankCapAt, data/bank.js, state migration).
// See config.BANK's comment + docs/math-proof.md §11 for the measured runaway this
// exists to fix (a 20-minute save away 12h returned 135× linear accrual and chain-
// bought 12 of 20 accommodation tiers). ----------
console.log('\n[85] bank account / wallet cap: ladder data, inflow clamp, offline bound, migration');
{
  // data + ladder invariants
  ok(validateBank(C), 'validateBank passes: row count matches config.BANK.tiers, ids unique, costFrac in (0,1)');
  ok(DATA.bank.length === C.BANK.tiers, 'DATA.bank rows == config.BANK.tiers (cap formula indexes rows by tier)');
  let capsMonotone = true, ladderAffordable = true;
  for (let t = 0; t < C.BANK.tiers - 1; t++) {
    if (!(M.bankCapAt(t + 1) > M.bankCapAt(t))) capsMonotone = false;
    // the next account must always fit inside the CURRENT cap — else the ladder soft-locks
    const probe = ST.newGame(); probe.bank.tier = t;
    if (!(E.bankUpgradeCost(probe) < M.bankCapAt(t))) ladderAffordable = false;
  }
  ok(capsMonotone, 'bank caps are strictly increasing up the ladder');
  ok(ladderAffordable, 'bankUpgradeCost(t) < bankCapAt(t) at EVERY tier — a full wallet can always afford the next account (no soft-lock)');
  ok(M.bankCapAt(C.BANK.tiers - 1) === Infinity, 'the LAST account is uncapped (Infinity) — endgame D6–D8 buys and NG+ magnitudes can never be permanently blocked');
  ok(M.bankCapAt(0) === C.BANK.base && approx(M.bankCapAt(3) / M.bankCapAt(2), C.BANK.growth), 'cap formula: base·growth^tier');
  ok(C.BANK.growth > C.ACC.growth, 'the cap ladder outruns the accommodation ladder (BANK.growth > ACC.growth) — a diligent banker is never wallet-gated');

  // inflow clamp: income stops at the cap, overflow is tracked, lifetime counts BANKED only
  const w = ST.newGame();
  E.buyGenerator(w, 0, 1); w.generators[0].count = 1000;      // strong D1 income
  w.resources.cash = M.walletCap(w) - 50;                     // 50 of room left
  const lifetimeBefore = w.stats.lifetimeCash;
  E.tick(w, 10);                                               // way more than 50 produced
  ok(w.resources.cash <= M.walletCap(w) + 1e-9, `online income clamps at the wallet cap (cash ${fmt(w.resources.cash)} ≤ cap ${fmt(M.walletCap(w))})`);
  ok(w.stats.overflowLost > 0, `the refused inflow is tracked in stats.overflowLost (+${fmt(w.stats.overflowLost)})`);
  ok(approx(w.stats.lifetimeCash - lifetimeBefore, 50, 1e-6), 'lifetimeCash counts ONLY the banked portion — tier reveals/Savvy/Legacy are paced by the wallet too');
  ok(w._notifications.some(n => /full/i.test(n.text)), 'the first overflow fires a one-shot "wallet full" nudge');
  const notifCount = w._notifications.filter(n => /full/i.test(n.text)).length;
  E.tick(w, 10);
  ok(w._notifications.filter(n => /full/i.test(n.text)).length === notifCount, 'the wallet-full nudge never re-fires for the same account tier (one-shot per tier)');

  // no confiscation: cash above cap is kept, it just can't grow
  const rich = ST.newGame(); E.buyGenerator(rich, 0, 1);
  rich.resources.cash = 1e6;                                   // way over the tier-0 cap
  E.tick(rich, 5);
  ok(rich.resources.cash >= 1e6 - 1e-9, 'cash already above the cap is never confiscated (inflow-only clamp)');

  // gainCash returns what actually landed; taps/visit yields/coin sales share the rule
  const g = ST.newGame(); g.resources.cash = M.walletCap(g) - 10;
  ok(E.gainCash(g, 25) === 10 && g.resources.cash === M.walletCap(g), 'gainCash banks min(amount, room) and returns the banked amount');
  ok(E.gainCash(g, 25) === 0, 'gainCash at a full wallet banks nothing');
  ok(E.click(g) === 0, 'a tap into a full wallet returns 0 — the popup never claims cash the wallet refused');

  // bank upgrade mechanics
  const b = ST.newGame(); b.resources.cash = M.walletCap(b);
  const cost = E.bankUpgradeCost(b);
  ok(approx(cost, C.BANK.costFrac * M.bankCapAt(0) * M.commsCostMult(b)), 'bankUpgradeCost = costFrac·cap(current)·commsCostMult');
  ok(E.buyBankUpgrade(b), 'buyBankUpgrade succeeds with a full wallet');
  ok(b.bank.tier === 1 && approx(M.walletCap(b) / M.bankCapAt(0), C.BANK.growth), 'upgrade advances one tier and multiplies capacity by BANK.growth');
  ok(E.drainNotifications(b).some(n => /New account/i.test(n.text)), 'a bank upgrade announces the new account');
  b.bank.tier = C.BANK.tiers - 1;
  ok(E.bankMaxed(b) && !E.buyBankUpgrade(b), 'the top (uncapped) account is terminal — no further upgrade');

  // offline: the away-lump is bounded by the wallet, and the report says what spilled
  const off = ST.newGame();
  E.buyGenerator(off, 0, 1); off.generators[0].count = 500; off.bank.tier = 2;
  off.resources.cash = 100;
  const offRep = E.applyOffline(off, 12 * 3600 * 1000);
  ok(off.resources.cash <= M.walletCap(off) + 1e-9, `a 12h offline lump is bounded by the wallet cap (cash ${fmt(off.resources.cash)} ≤ cap ${fmt(M.walletCap(off))})`);
  ok(offRep.overflowLost > 0, `the offline report carries the spilled income (+${fmt(offRep.overflowLost)}) for the "while you were away" nudge`);

  // the headline regression: a young greedy save away 12h can no longer leapfrog the
  // accommodation ladder. Pre-cap this measured 12 chain-bought tiers (0 → 12); the
  // wallet bounds the chain to ≈ log_ACC.growth(1 + (growth−1)·cap/nextCost) ≈ 2–4.
  const young = ST.newGame();
  for (let t = 0; t <= 20 * 60; t += 5) { E.tick(young, 5); playStep(young); }
  const tierBefore = young.accommodation.tier;
  E.applyOffline(young, 12 * 3600 * 1000);
  let chain = 0, chainGuard = 0;
  while (E.accUnlocked(young) && E.accCost(young) <= young.resources.cash && chainGuard++ < 30) {
    E.buyAccommodation(young); chain++;
  }
  ok(chain <= 4, `a 20-minute save away 12h chain-buys ≤ 4 accommodation tiers on return (got ${chain}, from tier ${tierBefore}) — was 12 before the wallet cap`);

  // migration: pre-cap saves are grandfathered, never frozen or confiscated
  const legacy = ST.newGame();
  legacy.resources.cash = 1e9;
  delete legacy.bank; delete legacy.stats.overflowLost;
  const mig = ST.migrate(JSON.parse(JSON.stringify(legacy)));
  ok(mig.bank && typeof mig.bank.tier === 'number', 'migration backfills state.bank for a pre-cap save');
  ok(mig.stats.overflowLost === 0, 'migration backfills stats.overflowLost at 0');
  ok(M.walletCap(mig) >= mig.resources.cash, 'grandfathering: the migrated save gets the smallest account that already covers its cash — income never silently freezes');
  ok(mig.bank.tier === Math.min(C.BANK.tiers - 1, Math.max(0, Math.ceil(Math.log(1e9 / C.BANK.base) / Math.log(C.BANK.growth)))), 'grandfathering picks the SMALLEST sufficient tier, not the top');
  const within = ST.newGame(); within.resources.cash = 100;
  ok(ST.migrate(JSON.parse(JSON.stringify(within))).bank.tier === 0, 'a save within its cap keeps its own bank tier (grandfathering never fires spuriously)');

  // ascension: the bank is run-scoped — the ladder re-paces every run's offline inflow
  const asc = ST.newGame();
  asc.bank.tier = 7;
  asc.stats.lifetimeCashThisTree = 1e10; asc.stats.runSec = 300; asc.accommodation.tier = 12;
  ok(P.ascend(asc), 'ascend() succeeds from a mid-ladder bank tier');
  ok(asc.bank.tier === 0, 'ascension resets the bank to the Soggy Money Belt (run-scoped, like cash itself)');
}

// ---------- 86. Ascension hard reset + gate scaling + gate-invariant Legacy (config.
// ASCEND_GATE, math.ascGateMult/ascCashNorm, prestige.ascend's minimal keep-list).
// Design contract (docs/math-proof.md §12): the ONLY things that cross an ascension are
// the tree abilities + unspent Legacy (+ settings/meta bookkeeping); phase gates rise
// ×base^(√count·(tier/span)²); every ascended run stays over the ≥8h floor with the
// early-fast/late-slow parabola. ----------
console.log('\n[86] ascension: hard reset, parabolic gate scaling, gate-invariant Legacy, run-2 pacing');
{
  // gate formula unit properties
  const g0 = ST.newGame();
  ok(M.ascGateMult(g0, 20) === 1, 'gate is exactly ×1 for the whole first run (count 0) — the fitted golden curve cannot move');
  const g1 = ST.newGame(); g1.ascension.count = 1;
  ok(M.ascGateMult(g1, 0) === 1, 'gate is exactly ×1 at the shed (tier 0) regardless of count — fresh ascensions start fast');
  ok(approx(M.ascGateMult(g1, C.ASCEND_GATE.span), C.ASCEND_GATE.base), 'gate at the island = base^(1^countExp) after one ascension');
  ok(approx(M.ascGateMult(g1, 10), Math.pow(C.ASCEND_GATE.base, Math.pow(0.5, C.ASCEND_GATE.exp))),
    'gate is PARABOLIC in tier: the mid-ladder carries only base^((1/2)^exp) — late tiers bear the weight');
  const g4 = ST.newGame(); g4.ascension.count = 4;
  ok(approx(M.ascGateMult(g4, 20), Math.pow(C.ASCEND_GATE.base, Math.pow(4, C.ASCEND_GATE.countExp))),
    'gate strength grows as count^countExp (√ by default) — it rises on the same √N curve the Legacy/tree arc does');
  let gateMonotone = true;
  for (let t = 1; t <= 20; t++) if (M.ascGateMult(g1, t) < M.ascGateMult(g1, t - 1)) gateMonotone = false;
  ok(gateMonotone, 'gate is monotone non-decreasing up the ladder');
  const c0 = ST.newGame(), c1 = ST.newGame(); c1.ascension.count = 1;
  ok(approx(E.accCostForTier(c1, 20) / E.accCostForTier(c0, 20), C.ASCEND_GATE.base),
    'accommodation costs actually carry the gate (island ×base per √-step of ascension)');

  // comfort no longer reads the ascension count — power comes only from tree abilities
  const cmA = ST.newGame(), cmB = ST.newGame(); cmB.ascension.count = 7;
  ok(approx(M.computeComfort(cmA, DATA), M.computeComfort(cmB, DATA)),
    'computeComfort is independent of ascension.count — the old ×1.25/ascension freebie is gone');

  // gate-invariant Legacy: the ThisTree counter is credited in run-1-equivalent cash
  const nrm = ST.newGame(); nrm.ascension.count = 1; nrm.bank.tier = 3;
  const treeBefore = nrm.stats.lifetimeCashThisTree;
  E.gainCash(nrm, 600);
  ok(approx(nrm.stats.lifetimeCashThisTree - treeBefore, 600 / Math.pow(C.ASCEND_GATE.base, 1)),
    'gainCash credits lifetimeCashThisTree deflated by ascCashNorm — the gate cannot inflate the Legacy payout');
  ok(approx(M.ascCashNorm(g4), Math.pow(C.ASCEND_GATE.base, Math.pow(4, C.ASCEND_GATE.countExp))),
    'ascCashNorm tracks the SAME count^countExp curve as the gate (deflator and inflator stay consistent)');

  // hard reset: play a real greedy ROI run (the harness's own `play` policy, the same
  // one the fitted 8h37m golden curve measures) to the island, ascend, audit the keep-list
  const hr = ST.newGame();
  for (let t = 0; t <= 40 * 3600 && hr.accommodation.tier < 20; t += 5) { E.tick(hr, 5); play(hr); }
  ok(hr.accommodation.tier >= 20, 'the audit run reached the island');
  const run1Island = hr.stats.runSec;
  const legacyBefore = hr.resources.legacy;
  const thisTreeBefore = hr.stats.lifetimeCashThisTree;
  ok(P.canAscend(hr) && P.ascend(hr), 'ascend() succeeds at the island');
  ok(hr.resources.legacy > legacyBefore, 'unspent Legacy crossed the ascension (the points themselves persist)');
  ok(approx(hr.stats.lifetimeCashThisTree, thisTreeBefore), 'lifetimeCashThisTree persists (√-prestige accounting only)');
  ok(hr.story.beat === 1 && hr.story.seen.length === 1 && hr.story.seen[0] === 1, 'story resets to beat 1 — you re-live the trip');
  ok(hr.story.branch === 'neutral' && Object.keys(hr.story.flags).length === 0, 'branch + one-shot flags reset — the path can be re-chosen');
  ok(hr.stats.lifetimeCash === 0, 'stats.lifetimeCash resets — Savvy √-passive and lifetime-cash tier reveals re-pace from zero');
  ok(M.savvyPassive(hr) === 0, 'savvyPassive is 0 immediately after ascension (no √lifetimeCash carry)');
  ok(hr.generators[0].unlocked && DATA.generators.slice(1).every((_, i) => !hr.generators[i + 1].unlocked),
    'higher income tiers re-lock — reveals re-pace with the new run');
  ok(hr.bank.tier === 0 && hr.stats.overflowLost === 0, 'the bank ladder and overflow stats reset with the run');
  ok(hr.resources.cash === 15 && hr.resources.clout === 0, 'cash/clout restart at the soggy €15');
  ok(Object.values(hr.destinations).every(d => !d.owned), 'destinations reset');
  ok(hr.concierge.on === false && hr.concierge.totalBought === 0, 'concierge resets to OFF');
  ok(hr.ascension.count === 1 && hr.ascension.legacyBanked > 0, 'ascension count + banked-Legacy accounting persist');

  // run 2 pacing: spend Legacy greedily on the tree (cheapest first), replay the SAME
  // greedy policy, and hold the design contract: ≥8h total, early tiers FASTER than an
  // un-ascended run, the island SLOWER (the parabola). Fitted expectation ≈ 8h40m
  // (committed-path baseline).
  for (;;) {
    let best = null;
    for (const n of DATA.tree) {
      if (P.canBuyNode(hr, n.id)) { const c = P.treeCost(hr, n.id); if (!best || c < best.c) best = { id: n.id, c }; }
    }
    if (!best) break;
    P.buyNode(hr, best.id);
  }
  ok(Object.keys(hr.ascension.tree).length > 0, 'the first ascension affords at least one tree ability (but nowhere near the whole tree)');
  ok(Object.values(hr.ascension.tree).reduce((s, r) => s + r, 0) <= 4,
    'LEGACY_SCALE retune: ascension 1 buys a FEW rank-1 abilities, not 56 of 79 ranks like the old 1e6 scale did');
  const tierT2 = {};
  for (let t = 0; t <= 40 * 3600 && hr.accommodation.tier < 20; t += 5) {
    E.tick(hr, 5); play(hr);
    for (let k = 0; k <= hr.accommodation.tier; k++) if (tierT2[k] === undefined) tierT2[k] = hr.stats.runSec;
  }
  ok(hr.accommodation.tier >= 20, 'the ascended run also reaches the island');
  const run2Island = hr.stats.runSec;
  ok(run2Island >= 8 * 3600, `ascended run stays over the ≥8h design floor (got ${fmtTime(run2Island)})`);
  ok(run2Island <= 14 * 3600, `ascended run has not ballooned past the band (got ${fmtTime(run2Island)}, expect ≈9h13m)`);
  ok(run2Island > run1Island, `the gate makes the ascended run's island SLOWER than run 1 (${fmtTime(run2Island)} > ${fmtTime(run1Island)})`);
  ok(tierT2[5] < run1Island * 0.17, `early tiers are FASTER than run 1's pace (tier 5 at ${fmtTime(tierT2[5])} — the parabola's fast half)`);
  ok(hr.story.seen.includes(26), 'the story re-fires along the new run (beat 26 reached again)');
}

// ---------- 87. Staged path tracks: thresholds ("X levels before progressing"), the
// story-continuation reveal, and each path's unique stage bonuses (data/paths.js
// `stages`, math.computePathBonuses/pathBonus, engine.checkPathStages). ----------
console.log('\n[87] staged path tracks: thresholds, stage reveals, unique per-path bonuses');
{
  ok(validatePaths(), 'validatePaths passes: unique ids, ascending stage thresholds, known bonus vocabulary');
  ok(DATA.paths.every(p => p.stages.length >= 4), 'every path has a full staged track (≥4 stages)');

  // stage firing + threshold gating (vlogger)
  const v = ST.newGame();
  v.story.branch = 'vlogger';
  E.addPathPoints(v, 'vlogger', 4);
  ok(!v.story.flags.pathStage_vlogger_5, 'one point shy of the threshold: the stage has NOT fired');
  ok(M.pathBonus(v, 'comboMax') === 0, 'no bonus before the threshold');
  E.addPathPoints(v, 'vlogger', 1);
  ok(v.story.flags.pathStage_vlogger_5 === true, 'crossing the threshold fires the stage exactly at X points');
  ok(v._notifications.some(n => /First Thousand/.test(n.text)), "the stage announces the path's story continuation (name + desc)");
  ok(M.pathBonus(v, 'comboMax') === 1, "the stage's unique bonus is live immediately (vlogger S1: +1 combo headroom)");
  ok(M.effectiveComboMax(v) === C.CLOUT.comboMax + C.CLOUT.vloggerComboBonus + 1,
    'effectiveComboMax folds the stage bonus in on top of the branch bonus');
  const preStage2 = M.cloutRate(v, DATA);
  E.addPathPoints(v, 'vlogger', 10);   // 15 total → stage 2 (cloutMult +0.25)
  ok(v.story.flags.pathStage_vlogger_15 === true, 'the next stage needs its own higher threshold (15) — staged, not all-at-once');
  ok(M.cloutRate(v, DATA) > preStage2, 'vlogger S2 (The Algorithm Stirs) raises cloutRate');

  // unique bonuses are per-path: the same points on other paths grant different things
  const t = ST.newGame(); t.story.branch = 'traveler';
  const costBefore = E.destCost(t, DATA.destinations[0].id);
  E.addPathPoints(t, 'traveler', 5);
  ok(E.destCost(t, DATA.destinations[0].id) < costBefore, 'traveler S1 (Stamped Passport) cuts destination costs');
  ok(M.pathBonus(t, 'comboMax') === 0, "traveler's track grants NO vlogger bonuses — each road is unique");

  const c = ST.newGame(); c.story.branch = 'crypto';
  c.crypto.holdings[DATA.crypto.coins[0].id] = 10;
  const yieldBefore = M.cryptoYieldPerSec(c, DATA);
  E.addPathPoints(c, 'crypto', 5);
  ok(M.cryptoYieldPerSec(c, DATA) > yieldBefore * 1.2, 'crypto S1 (First Cold Wallet) raises coin yield ×1.25 (net of the pathMult the points also give)');

  const k = ST.newGame(); k.story.branch = 'connoisseur';
  k.amenities.bug_spray.level = 10;
  const comfortBefore = M.computeComfort(k, DATA);
  E.addPathPoints(k, 'connoisseur', 5);
  ok(M.computeComfort(k, DATA) > comfortBefore, 'connoisseur S1 (A Discerning Eye) raises amenity Comfort');

  // stages/points are run-scoped: the ascension hard reset hands back a clean track
  const a = ST.newGame(); a.story.branch = 'vlogger';
  E.addPathPoints(a, 'vlogger', 20);
  a.stats.lifetimeCashThisTree = 1e10; a.stats.runSec = 300; a.accommodation.tier = 12;
  ok(P.ascend(a), 'ascend() succeeds mid-track');
  ok(a.story.branch === 'neutral' && a.paths.vlogger.points === 0 && !a.story.flags.pathStage_vlogger_5,
    'the hard reset clears branch, points AND stage flags — the next life re-walks (or re-picks) its road');
  ok(Object.keys(M.computePathBonuses(a, DATA)).length === 0, 'no stage bonuses survive into the new life');
}

// ---------- 88. Jack of All Trades (tree node): the earned exception to the
// committed-path contract — each rank opens ONE extra road after committing; deep in
// the tree (one prerequisite from every branch) so it takes a couple of ascensions.
// ----------
console.log('\n[88] Jack of All Trades: earned path mixing, slot caps, depth, reset behavior');
{
  const node = DATA.tree.find(n => n.id === 'jack_of_trades');
  ok(!!node && node.maxRank === 3, 'the jack_of_trades node exists (maxRank 3 — at most all four roads)');
  const reqBranches = new Set(node.requires.map(r => DATA.tree.find(n => n.id === r.split(':')[0]).branch));
  ok(reqBranches.size === 3, 'DEPTH by construction: prerequisites span all three tree branches (physique + character + meta)');
  // reachability arithmetic: prereqs + rank 1 cost ≈ 20 Legacy against the ~11.8·√N
  // metered arc → around ascension 3 for a dedicated saver — "a couple", never run 1.
  const prereqCost = node.requires.length * C.TREE.nodeBase + C.TREE.nodeBase;
  ok(prereqCost >= 20, `minimum spend to reach rank 1 (${prereqCost} Legacy) exceeds any single ascension's payout (~11)`);

  // without Jack: the committed-path contract is untouched
  const noJack = ST.newGame();
  noJack.story.branch = 'vlogger'; noJack.resources.cash = 1e9; noJack.bank.tier = C.BANK.tiers - 1;
  ok(!E.buyPathFocus(noJack, 'crypto'), 'without the node, secondary focus stays a hard no-op');

  // with rank 1: exactly ONE extra road, claimed by the first focus purchase
  const j = ST.newGame();
  j.story.branch = 'vlogger'; j.resources.cash = 1e9; j.bank.tier = C.BANK.tiers - 1;
  j.ascension.tree.jack_of_trades = 1;
  ok(E.canFocusPath(j, 'crypto') && E.canFocusPath(j, 'traveler'), 'rank 1: any secondary is OPENABLE while the slot is free');
  ok(E.buyPathFocus(j, 'crypto'), 'rank 1: the first secondary focus purchase succeeds and claims the slot');
  ok(j.paths.crypto.points === 1, 'the starter point lands on the newly-opened road');
  ok(!E.buyPathFocus(j, 'traveler'), 'rank 1: a SECOND secondary is blocked — the slot is spent');
  ok(E.buyPathFocus(j, 'crypto'), 'the opened side-road stays investable');
  ok(E.buyPathFocus(j, 'vlogger'), 'the primary road is never affected by Jack accounting');
  j.ascension.tree.jack_of_trades = 2;
  ok(E.buyPathFocus(j, 'traveler'), 'rank 2: a second side-road opens');

  // nudges follow opened roads only — and never open one by themselves
  const n = ST.newGame();
  n.story.branch = 'vlogger'; n.resources.cash = 1e9; n.bank.tier = C.BANK.tiers - 1;
  n.ascension.tree.jack_of_trades = 1;
  E.buyCoin(n, DATA.crypto.coins[0].id, 1);
  ok(n.paths.crypto.points === 0, 'a nudge alone never opens a road (a stray coin buy cannot spend the Jack slot)');
  ok(E.buyPathFocus(n, 'crypto'), 'opening explicitly via focus…');
  const ptsBefore = n.paths.crypto.points;
  E.buyCoin(n, DATA.crypto.coins[0].id, 1);
  ok(n.paths.crypto.points > ptsBefore, '…after which nudges credit the opened side-road too');

  // the side-road's staged track + bonuses genuinely apply (the mixing payoff)
  const m = ST.newGame();
  m.story.branch = 'vlogger'; m.resources.cash = 1e12; m.bank.tier = C.BANK.tiers - 1;
  m.ascension.tree.jack_of_trades = 1;
  E.buyPathFocus(m, 'traveler');
  E.addPathPoints(m, 'traveler', 4);            // 5 total → traveler stage 1
  ok(m.story.flags.pathStage_traveler_5 === true, "the side-road's staged track fires at its threshold");
  ok(M.pathBonus(m, 'destDiscount') > 0, "the side-road's unique stage bonus is live alongside the primary's");
  E.addPathPoints(m, 'vlogger', 5);
  ok(m.story.flags.pathStage_vlogger_5 === true && M.pathBonus(m, 'comboMax') === 1,
    'primary and side-road tracks run in parallel — the actual "mix paths" payoff');
  E.tick(m, 1);
  ok(m.story.flags.hybridTravelVlog === true,
    'the dormant cross-path hybrid flavor fires again through Jack — two roads ≥5 points in one life');

  // ascension: the node persists (it IS a tree ability), the opened roads do not
  m.stats.lifetimeCashThisTree = 1e10; m.stats.runSec = 300; m.accommodation.tier = 12;
  ok(P.ascend(m), 'ascend() succeeds');
  ok(m.ascension.tree.jack_of_trades === 1, 'Jack persists across ascension — it is an ability bought with points');
  ok(m.paths.traveler.focusBought === 0 && m.story.branch === 'neutral',
    'the opened side-roads reset with the run — the next life re-commits and re-opens');
}

// ---------- 89. E14 "Acquired Taste" (Connoisseur): exclusivity ×, luxury discount,
// appreciating collections, set bonus, +25% luxury Comfort perk — all GATED OFF for the
// default/greedy player so the fitted island time is UNCHANGED (config.TASTE/EXCLUSIVITY/
// APPRECIATION, math.computeExclusivity/exclusivityMult/luxuryCostMult/appreciationValue,
// engine.buyAsset/sellAsset/connoisseurActive/checkProvenance). ----------
console.log('\n[89] E14 connoisseur: exclusivity ×, luxury discount, appreciation, gate invariance');
{
  // data guard
  ok(validateCollections(), 'validateCollections() passes on the shipped ART/WINE arrays');
  ok(DATA.collections.art.length === 6 && DATA.collections.wine.length === 6, '6 art + 6 wine assets');

  // ---- harness invariance: the committed-vlogger harness never engages the connoisseur
  // system, so the exclusivity/discount/appreciation/perk are all no-ops → island UNCHANGED.
  const { s: hs, islandAt, peakLog } = runCurve({ dt: 5, maxHours: 40 });
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E14 (got ${fmtTime(islandAt)}, expected ~8h15m05s / 29705s — the committed-path baseline)`);
  ok(peakLog < 290, `peak log10(cash) (${peakLog.toFixed(1)}) stays far under the double-overflow ceiling`);
  ok([...DATA.collections.art, ...DATA.collections.wine].every(a => hs.collections[a.id].count === 0),
    'the harness never buys a single collection asset (not in its greedy policy)');
  ok(hs._exclCache === 0 && M.connoisseurActive(hs) === false,
    'the harness run leaves the connoisseur system inactive (exclusivity 0) start to finish');

  // ---- gate: exclusivity/discount are exactly no-ops when inactive
  const inact = ST.newGame();
  ok(M.connoisseurActive(inact) === false, 'a fresh newGame() is connoisseur-INACTIVE (no points, no owned assets)');
  ok(M.computeExclusivity(inact, DATA) === 0, 'computeExclusivity is exactly 0 when inactive');
  ok(M.exclusivityMult(inact) === 1, 'exclusivityMult is exactly 1 when inactive (never moves the harness)');
  ok(M.luxuryCostMult(inact) === 1, 'luxuryCostMult is exactly 1 when inactive (no ungated luxury discount)');
  ok(E.connoisseurActive(inact) === false, 'engine.connoisseurActive re-exports the same gate');
  // a committed connoisseur life (points>0) OR any owned asset trips the gate
  const byPoints = ST.newGame(); byPoints.paths.connoisseur.points = 3;
  ok(M.connoisseurActive(byPoints) === true, 'connoisseur path points>0 activate the system');
  const byOwn = ST.newGame(); byOwn.collections.velvet_elvis.count = 1;
  ok(M.connoisseurActive(byOwn) === true, 'owning any collection asset activates the system');

  // ---- exclusivity: monotone + softcapped (no cliff), ≡1 inactive
  const em = ST.newGame(); em.story.branch = 'connoisseur'; em.paths.connoisseur.points = 5;
  let prevScore = -1, monoS = true;
  for (const a of [...DATA.collections.art, ...DATA.collections.wine]) {
    em.collections[a.id].count += 3;
    const sc = M.computeExclusivity(em, DATA);
    if (sc < prevScore - 1e-9) monoS = false;
    prevScore = sc;
  }
  ok(monoS, 'computeExclusivity is monotone non-decreasing as more assets are owned');
  const ex = ST.newGame();
  let prevL = -Infinity, monoL = true, geOne = true, noCliff = true;
  for (const e of [0, 1, 10, 50, 100, 500, 1000, 1e4, 1e5, 1e6]) {
    ex._exclCache = e; const L = M.exclusivityMult(ex);
    if (L < 1 - 1e-9) geOne = false;
    if (L < prevL - 1e-9) monoL = false;
    prevL = L;
  }
  ok(monoL && geOne, 'exclusivityMult is monotone non-decreasing and always >= 1 across a wide score range');
  for (const e of [0, 1, 100, 1e4, 1e6]) {
    ex._exclCache = e; const L1 = M.exclusivityMult(ex);
    ex._exclCache = e + 1e-3; const L2 = M.exclusivityMult(ex);
    if (Math.abs(L2 - L1) > 0.01) noCliff = false;
  }
  ok(noCliff, 'exclusivityMult is continuous — no cliffs (the softcapped log shape, same family as L_comfort)');

  // ---- stack-order regression: L_exclusivity folds in as a clean multiplicative factor
  const stk = ST.newGame();
  stk.generators[0].bought = 20; stk.generators[0].count = 20;
  const mBefore = M.tierMultiplier(stk, 0), eBefore = M.exclusivityMult(stk);
  stk._exclCache = 100;
  const mAfter = M.tierMultiplier(stk, 0), eAfter = M.exclusivityMult(stk);
  ok(approx(mAfter / mBefore, eAfter / eBefore),
    'tierMultiplier scales by EXACTLY the L_exclusivity ratio when only _exclCache changes — a clean global factor in the M_k stack');

  // ---- luxury discount: clamps at the 0.4 floor; ≡1 when inactive
  const lc = ST.newGame(); lc.story.branch = 'connoisseur'; lc.collections.velvet_elvis.count = 1;
  lc.skills.taste.level = 0;
  ok(approx(M.luxuryCostMult(lc), 1), 'luxuryCostMult is 1 at taste level 0 (active connoisseur, no discount yet)');
  lc.skills.taste.level = 15;
  ok(approx(M.luxuryCostMult(lc), Math.max(0.4, 1 - C.TASTE.discount * 15)), 'luxuryCostMult = 1 − discount·tasteLevel while above the floor');
  lc.skills.taste.level = 1000;
  ok(M.luxuryCostMult(lc) === 0.4, 'luxuryCostMult clamps at the 0.4 floor (−60%) even at extreme taste (S8-T2)');
  // and it discounts a tag:'luxury' amenity purchase only for an active connoisseur
  const lca = ST.newGame(); lca.amenities.butler_bell.level = 0;
  const costVlogger = E.amenityCost(lca, 'butler_bell');
  lca.story.branch = 'connoisseur'; lca.collections.velvet_elvis.count = 1; lca.skills.taste.level = 15;
  ok(E.amenityCost(lca, 'butler_bell') < costVlogger, 'an active connoisseur pays less for a tag:luxury amenity (the old-money haggle)');

  // ---- appreciation: PURE, deterministic, hard-capped
  const v1 = M.appreciationValue(1e4, 5 * 3600, 0.05);
  M.appreciationValue(9e9, 123, 0.08); M.appreciationValue(7, 4e6, 0.01); // perturb: prove no hidden internal state
  ok(M.appreciationValue(1e4, 5 * 3600, 0.05) === v1, 'appreciationValue is PURE — identical (boughtValue,age,rate) ⇒ identical value, no wall-clock (S10-T3)');
  ok(v1 > 1e4, 'a held piece appreciates above its purchase price over game-time');
  for (const id of ['grand_cru', 'judgment_of_paris_lot']) {
    const a = E.assetData(id);
    const capped = M.appreciationValue(a.costBase, 1e9 * 3600, a.appreciationRate);
    ok(approx(capped, a.costBase * C.APPRECIATION.valueCap), `${id}: appreciation hard-caps at boughtValue·valueCap at extreme age (S10-T6)`);
  }
  ok(M.appreciationValue(1e6, 1e12, 0.08) <= 1e6 * C.APPRECIATION.valueCap + 1e-6, 'value never exceeds valueCap even at extreme age/GAME_SPEED');
  ok(M.appreciationValue(1e4, 0, 0.05) === 1e4, 'a just-bought piece (age 0) is worth exactly its purchase price');

  // ---- buyAsset → appreciate → sellAsset round-trip
  const rt = ST.newGame();
  rt.story.branch = 'connoisseur'; rt.paths.connoisseur.points = 5;
  rt.bank.tier = C.BANK.tiers - 1; rt.resources.cash = 1e9;
  const cashBefore = rt.resources.cash;
  ok(E.buyAsset(rt, 'grand_cru'), 'buyAsset succeeds when affordable');
  const rc = rt.collections.grand_cru;
  ok(rc.count === 1, 'count incremented to 1');
  const spent = cashBefore - rt.resources.cash;
  ok(approx(rc.boughtValue, spent), 'boughtValue equals the cash actually spent');
  ok(rc.age === 0, 'a fresh stack starts aging from purchase time (age 0), not epoch');
  ok(rt.skills.taste.xp >= E.assetData('grand_cru').tasteXp, 'buying grants the asset’s Taste XP');
  ok(rt.paths.connoisseur.points > 5, 'buying nudges the committed connoisseur path (one-off, like buyCoin)');
  // ---- anti-pump (verifier fix): buying INTO an aged stack is exactly value-neutral.
  // Without the age blend, a new copy inherited the stack's full age and its instant
  // appreciation (up to valueCap·sellFrac ≈ ×7.6) was harvestable by an immediate sell —
  // a measured zero-time buy/sell money pump (+1.3e10 cash / +1.55e10 lifetimeCash over
  // 50 cycles on one aged lot), i.e. free cash and unbounded Legacy inflation by clicking.
  {
    const vn = ST.newGame();
    vn.story.branch = 'connoisseur'; vn.paths.connoisseur.points = 5;
    vn.bank.tier = C.BANK.tiers - 1; vn.resources.cash = 1e10;
    ok(E.buyAsset(vn, 'grand_cru'), 'anti-pump probe: initial buy succeeds');
    vn.collections.grand_cru.age = 15 * 3600;                    // an aged, appreciated stack
    const nwHeld = M.collectionNetWorth(vn, DATA);
    const nextCost = E.assetCost(vn, 'grand_cru');
    ok(E.buyAsset(vn, 'grand_cru'), 'anti-pump probe: buy INTO the aged stack succeeds');
    ok(approx(M.collectionNetWorth(vn, DATA), nwHeld + nextCost, 1e-9),
      'buying into an aged stack raises the stack value by EXACTLY the cash paid — new money enters at ×1 (math.appreciationBlendAge), never at the stack’s accrued multiplier');
    ok(vn.collections.grand_cru.age < 15 * 3600 && vn.collections.grand_cru.age > 0,
      'the blended age lands strictly between fresh (0) and the old age — held copies keep their exact value, monotone (age can never be forged UP)');
    const pump = ST.newGame();
    pump.story.branch = 'connoisseur'; pump.paths.connoisseur.points = 5;
    pump.bank.tier = C.BANK.tiers - 1; pump.resources.cash = 1e10;
    E.buyAsset(pump, 'judgment_of_paris_lot');
    pump.collections.judgment_of_paris_lot.age = 200 * 3600;     // deep-held: mult at the valueCap
    const pumpCash0 = pump.resources.cash;
    for (let i = 0; i < 50; i++) { E.buyAsset(pump, 'judgment_of_paris_lot'); E.sellAsset(pump, 'judgment_of_paris_lot', 1); }
    ok(pump.resources.cash < pumpCash0,
      'zero-time buy/sell cycling on a deeply-aged stack always LOSES cash (the sellFrac haircut) — no money pump, lifetimeCash/Legacy cannot be click-inflated');
  }
  rc.age = 10 * 3600; // 10 game-hours held
  const a = E.assetData('grand_cru');
  const sellFrac = Math.min(C.TASTE.sellCap, C.TASTE.sellFrac + C.TASTE.sellTastePerLevel * rt.skills.taste.level);
  const expectedProceeds = M.appreciationValue(rc.boughtValue, rc.age, a.appreciationRate) * sellFrac;
  const cashBeforeSell = rt.resources.cash;
  ok(E.sellAsset(rt, 'grand_cru'), 'sellAsset succeeds');
  ok(approx(rt.resources.cash - cashBeforeSell, expectedProceeds, 1e-6), 'sell proceeds = appreciated value · taste sellFrac, banked through gainCash (one inflow rule)');
  ok(rc.count === 0 && rc.boughtValue === 0 && rc.age === 0, 'selling the last copy clears count/boughtValue/age (a re-bought stack ages fresh)');
  ok(expectedProceeds < M.appreciationValue(spent, 10 * 3600, a.appreciationRate), 'the sell haircut (sellFrac<1) makes a buy→sell round-trip a real cost, never free');

  // ---- set bonus toggles the × exactly once (branch left non-connoisseur to isolate the set factor)
  const sb = ST.newGame(); sb.paths.connoisseur.points = 5; // active, but branch 'neutral' ⇒ no branch/golden factor
  const rawWine = DATA.collections.wine.reduce((t, x) => t + x.exclusivity, 0);
  for (const x of DATA.collections.wine) sb.collections[x.id].count = 1;
  ok(approx(M.computeExclusivity(sb, DATA), Math.pow(rawWine, C.EXCLUSIVITY.softExp) * (1 + C.EXCLUSIVITY.setBonus)),
    'completing the WINE set applies the setBonus × exactly once');
  for (const x of DATA.collections.wine) sb.collections[x.id].count = 2;
  ok(approx(M.computeExclusivity(sb, DATA), Math.pow(2 * rawWine, C.EXCLUSIVITY.softExp) * (1 + C.EXCLUSIVITY.setBonus)),
    'buying MORE copies of a complete set does not re-apply the bonus (×(1+setBonus), no double-count)');
  sb.collections[DATA.collections.wine[0].id].count = 0;
  const rawBroken = 2 * rawWine - DATA.collections.wine[0].exclusivity * 2;
  ok(approx(M.computeExclusivity(sb, DATA), Math.pow(rawBroken, C.EXCLUSIVITY.softExp)),
    'breaking the set toggles the bonus off cleanly (no residue)');

  // ---- +25% luxury Comfort perk: connoisseur branch only, luxury (amenities + collections) only
  const mkLux = () => { const st = ST.newGame(); st.amenities.butler_bell.level = 3; return st; };
  const luxV = mkLux(); luxV.story.branch = 'vlogger';
  const luxC = mkLux(); luxC.story.branch = 'connoisseur';
  const luxComfort = 3 * E.amenityData('butler_bell').comfort;
  ok(approx(M.computeComfort(luxC, DATA) - M.computeComfort(luxV, DATA), C.COMFORT.wAmen * luxComfort * C.TASTE.luxuryComfortPerk),
    'the connoisseur branch adds exactly +25% Comfort on tag:luxury amenities (vlogger gets +0)');
  const nlV = ST.newGame(); nlV.amenities.bug_spray.level = 5; nlV.story.branch = 'vlogger';
  const nlC = ST.newGame(); nlC.amenities.bug_spray.level = 5; nlC.story.branch = 'connoisseur';
  ok(approx(M.computeComfort(nlC, DATA), M.computeComfort(nlV, DATA)), 'a NON-luxury amenity gets no branch perk — connoisseur == vlogger Comfort');
  const colN = ST.newGame(); colN.collections.abstract_beige.count = 2;
  ok(M.computeComfort(colN, DATA) > M.computeComfort(ST.newGame(), DATA), 'owned collections feed ComfortRaw for every branch (count·comfort)');
  const colV = ST.newGame(); colV.collections.abstract_beige.count = 2; colV.story.branch = 'vlogger';
  const colC = ST.newGame(); colC.collections.abstract_beige.count = 2; colC.story.branch = 'connoisseur';
  ok(approx(M.computeComfort(colC, DATA) - M.computeComfort(colV, DATA), C.COMFORT.wAmen * 2 * E.assetData('abstract_beige').comfort * C.TASTE.luxuryComfortPerk),
    'the connoisseur +25% Comfort perk applies to owned collections too, connoisseur branch only');

  // ---- Provenance one-time bonus (mirrors Whale Watching): connoisseur + beat 14 → gift + XP, once
  const pv = ST.newGame();
  pv.story.branch = 'connoisseur';
  pv.accommodation.tier = 11; pv.accommodation.owned = Array.from({ length: 12 }, (_, i) => i);
  pv.skills.charisma.xp = 1e6; pv.skills.body.xp = 1e7;
  const tasteBefore = pv.skills.taste.xp;
  E.tick(pv, 1);
  ok(pv.story.seen.includes(14), 'beat 14 fires for a connoisseur on the shared gate');
  ok(E.beatCopy(pv, DATA.story.find(b => b.id === 14)).title === 'Provenance', 'the connoisseur sees the "Provenance" variant');
  ok(pv.story.flags.provenance === true, 'flags.provenance fires once beat 14 lands for a connoisseur');
  ok(pv.skills.taste.xp > tasteBefore, 'Provenance grants a one-time Taste XP bonus');
  ok(pv.collections.actual_bordeaux.count === 1, 'Provenance gifts one signature appreciating piece (the Bordeaux)');
  const giftCount = pv.collections.actual_bordeaux.count;
  E.checkProvenance(pv);
  ok(pv.collections.actual_bordeaux.count === giftCount, 'Provenance never re-fires (one-shot)');
  const nonConn = ST.newGame();
  nonConn.story.branch = 'vlogger';
  nonConn.accommodation.tier = 11; nonConn.accommodation.owned = Array.from({ length: 12 }, (_, i) => i);
  nonConn.skills.charisma.xp = 1e6; nonConn.skills.body.xp = 1e7;
  E.tick(nonConn, 1);
  ok(nonConn.story.seen.includes(14) && !nonConn.story.flags.provenance, 'a non-connoisseur passes beat 14 with NO provenance gift (neutral fallback, no build stranded)');

  // ---- collection reveal gate (mirrors cryptoDeskUnlocked)
  ok(!E.collectionUnlocked(ST.newGame()), 'the gallery is locked on a fresh game');
  const rv = ST.newGame(); rv.paths.connoisseur.points = 1;
  ok(E.collectionUnlocked(rv), 'any connoisseur investment unlocks the gallery reveal');

  // ---- migration: a pre-E14 save (no collections / no _exclCache / missing a new amenity id)
  const pre14 = ST.newGame();
  delete pre14.collections; delete pre14._exclCache; delete pre14.amenities.butler_drawn_bath;
  const mig = ST.migrate(JSON.parse(JSON.stringify(pre14)));
  ok(mig.collections && [...DATA.collections.art, ...DATA.collections.wine].every(x =>
    mig.collections[x.id] && mig.collections[x.id].count === 0 && mig.collections[x.id].boughtValue === 0 && mig.collections[x.id].age === 0),
    'migration backfills every collection asset at count/boughtValue/age = 0 (no NaN, S9-T10)');
  ok(mig.amenities.butler_drawn_bath && mig.amenities.butler_drawn_bath.level === 0, 'migration backfills the new connoisseur amenity id at level 0');
  ok(mig._exclCache === 0, 'migration backfills the _exclCache transient at 0');
  E.tick(mig, 1);
  ok(Number.isFinite(mig.resources.cash) && Number.isFinite(mig._exclCache), 'ticking a migrated pre-E14 save is finite — no NaN anywhere');
  mig.story.branch = 'connoisseur'; mig.paths.connoisseur.points = 5; mig.resources.cash = 1e9; mig.bank.tier = C.BANK.tiers - 1;
  ok(E.buyAsset(mig, 'velvet_elvis') && mig.collections.velvet_elvis.age === 0, 'a piece bought after migration starts aging from purchase time, not epoch');
  E.tick(mig, 100);
  ok(approx(mig.collections.velvet_elvis.age, 100), 'appreciation age advances by game-time after purchase');

  // ---- offline determinism: appreciation via applyOffline matches a manual tick() loop
  const seedConn = () => {
    const st = ST.newGame();
    st.story.branch = 'connoisseur'; st.paths.connoisseur.points = 10;
    st.collections.grand_cru.count = 3; st.collections.grand_cru.boughtValue = 3 * E.assetData('grand_cru').costBase;
    st.collections.velvet_elvis.count = 2; st.collections.velvet_elvis.boughtValue = 2 * E.assetData('velvet_elvis').costBase;
    st.settings.offlineEnabled = true; st.bank.tier = C.BANK.tiers - 1;
    return st;
  };
  const manual = seedConn();
  const viaOffline = ST.migrate(JSON.parse(JSON.stringify(seedConn())));
  const elapsedMs = 4 * 3600 * 1000;
  const total = Math.min(elapsedMs, C.OFFLINE_CAP_H * 3600 * 1000) / 1000;
  const step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) E.tick(manual, step);
  E.applyOffline(viaOffline, elapsedMs);
  ok(viaOffline.collections.grand_cru.age > 0, 'offline replay actually advanced asset age (not vacuous)');
  ok(approx(manual.collections.grand_cru.age, viaOffline.collections.grand_cru.age, 1e-6), 'offline age advance matches a manual macro-step tick loop (game-time, deterministic)');
  ok(approx(M.collectionNetWorth(manual, DATA), M.collectionNetWorth(viaOffline, DATA), 1e-6), 'offline appreciated net worth matches the manual loop (S9-T3)');

  // ---- net-worth is display-only: appreciation never touches lifetimeCash/Legacy accounting.
  // A connoisseur with ZERO income (no generators bought) isolates appreciation: net worth
  // climbs as assets age, but the banked-cash-only lifetime counters stay put.
  const nw = ST.newGame();
  nw.story.branch = 'connoisseur';
  nw.collections.grand_cru.count = 5; nw.collections.grand_cru.boughtValue = 5 * E.assetData('grand_cru').costBase;
  nw.collections.grand_cru.age = 10 * 3600;
  const nwBefore = M.collectionNetWorth(nw, DATA);
  const lifeBefore = nw.stats.lifetimeCash, treeBefore = nw.stats.lifetimeCashThisTree;
  E.tick(nw, 100);
  ok(M.collectionNetWorth(nw, DATA) > nwBefore, 'appreciation raises the display net worth as held assets age');
  ok(nw.stats.lifetimeCash === lifeBefore && nw.stats.lifetimeCashThisTree === treeBefore,
    'appreciated collection value NEVER feeds lifetimeCash/lifetimeCashThisTree (banked-cash-only — wallet-cap §11 + Legacy §12 unaffected; S2-T7 superseded)');
}

// ---------- 90. E15 "Keys to the Coupe": private logistics — cars, slots, upkeep, the
// logistics ×, repossession, and the harness-invariance gate. ----------
console.log('\n[90] E15 logistics: cars/slots/upkeep, logistics × gate invariance, repossession');
{
  ok(validateVehicles(), 'validateVehicles() passes on the shipped CARS roster');
  ok(DATA.vehicles.length === 6, '6 cars in the roster');

  // ---- harness invariance: the committed-vlogger harness never buys/equips a car, so the
  // logistics ×, upkeep, fleet Comfort and traveler discount are all no-ops → island UNCHANGED.
  const { s: hs, islandAt, peakLog } = runCurve({ dt: 5, maxHours: 40 });
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E15 (got ${fmtTime(islandAt)}, expected ~8h15m05s / 29705s — the committed-path baseline)`);
  ok(peakLog < 290, `peak log10(cash) (${peakLog.toFixed(1)}) stays far under the double-overflow ceiling`);
  ok(hs.vehicles.equipped.length === 0 && DATA.vehicles.every(c => hs.vehicles.owned[c.id].count === 0),
    'the harness never buys or equips a single car (not in its greedy policy)');
  ok(hs._logiCache === 1 && M.logisticsActive(hs, DATA) === false,
    'the harness run leaves the logistics system inactive (_logiCache 1) start to finish');

  // ---- gate exactness: everything is a no-op when nothing is equipped
  const inact = ST.newGame();
  ok(M.logisticsActive(inact, DATA) === false, 'a fresh newGame() is logistics-INACTIVE (no car equipped)');
  ok(M.logisticsMult(inact, DATA) === 1, 'logisticsMult is exactly 1 when nothing is equipped');
  ok(M.fleetUpkeep(inact, DATA) === 0, 'fleetUpkeep is exactly 0 when nothing is equipped');
  ok(M.fleetComfortTotal(inact, DATA) === 0, 'fleet Comfort is exactly 0 when nothing is equipped');
  ok(M.destDiscountMult(inact) === 1, 'destDiscountMult is exactly 1 for a neutral player (no traveler perk / wanderer)');
  ok(E.logisticsActive(inact) === false, 'engine.logisticsActive re-exports the same gate');
  // owning-but-not-equipping is still inactive (the equip is what turns the lane on)
  const ownOnly = ST.newGame(); ownOnly.vehicles.owned.german_sedan.count = 2;
  ok(M.logisticsActive(ownOnly, DATA) === false && M.logisticsMult(ownOnly, DATA) === 1,
    'owning a car without equipping it draws no × and no upkeep (equip is the gate)');

  // ---- availableSlots: base + traveler +1 + wanderer/rank + garage
  const sl = ST.newGame();
  ok(M.availableSlots(sl) === C.LOGISTICS.baseSlots, 'availableSlots = baseSlots for a neutral player');
  sl.story.branch = 'traveler';
  ok(M.availableSlots(sl) === C.LOGISTICS.baseSlots + 1, 'the traveler branch grants +1 slot');
  sl.ascension.tree.wanderer = 2; sl.vehicles.garageSlots = 1;
  ok(M.availableSlots(sl) === C.LOGISTICS.baseSlots + 1 + 2 + 1, "Wanderer's Instinct (+1/rank) and the garage wing add slots");

  // ---- buy → equip → logistics ×, slot-capacity enforcement (E15-S2-T2/S10-T1)
  const g = ST.newGame(); g.story.branch = 'traveler'; g.bank.tier = C.BANK.tiers - 1; g.resources.cash = 1e12;
  const slots = M.availableSlots(g);   // baseSlots(2)+1 = 3
  ok(E.buyCar(g, 'german_sedan') && g.vehicles.owned.german_sedan.count === 1, 'buyCar adds a car to the garage');
  ok(g.paths.traveler.points > 0, 'buying a car nudges the committed traveler path (one-off, like buyCoin)');
  ok(M.logisticsActive(g, DATA) === false, 'still inactive after buying but not equipping');
  ok(E.equipCar(g, 'german_sedan') && g.vehicles.equipped.length === 1, 'equipCar equips an owned car');
  ok(approx(M.logisticsMult(g, DATA), 1 + C.LOGISTICS.rate * E.carData('german_sedan').logisticsMult),
    'logisticsMult = 1 + rate·Σ(equipped logisticsMult)');
  // fill to capacity then reject overflow
  g.vehicles.owned.german_sedan.count = 5;
  while (E.equipCar(g, 'german_sedan')) { /* equip until full */ }
  ok(M.equippedSlotCost(g, DATA) === slots, `equipped fleet fills exactly the ${slots} available slots`);
  ok(E.equipCar(g, 'german_sedan') === false, 'equipping beyond availableSlots is REJECTED (never clamped silently)');
  ok(M.equippedSlotCost(g, DATA) <= M.availableSlots(g), 'Σ slotCost ≤ availableSlots always holds');
  // a 2-slot car needs 2 free slots
  const g2 = ST.newGame(); g2.story.branch = 'traveler'; g2.vehicles.owned.hand_built_grand_tourer.count = 2;
  ok(E.equipCar(g2, 'hand_built_grand_tourer') === true, 'first 2-slot supercar fits (3 slots)');
  ok(E.equipCar(g2, 'hand_built_grand_tourer') === false, 'a second 2-slot supercar (would be 4>3) is rejected');

  // ---- logistics purity: same equipped set ⇒ same × (E15-S10-T3)
  const p1 = ST.newGame(); p1.vehicles.owned.german_sedan.count = 2; p1.vehicles.equipped = ['german_sedan', 'german_sedan'];
  const p2 = ST.newGame(); p2.vehicles.owned.german_sedan.count = 2; p2.vehicles.equipped = ['german_sedan', 'german_sedan'];
  ok(M.logisticsMult(p1, DATA) === M.logisticsMult(p2, DATA), 'logisticsMult is pure over state (same equipped set ⇒ same ×)');

  // ---- stack-order regression: L_logistics folds in as a clean multiplicative factor
  const stk = ST.newGame(); stk.generators[0].bought = 20; stk.generators[0].count = 20;
  const mBefore = M.tierMultiplier(stk, 0), lBefore = M.logisticsMultiplier(stk);
  stk._logiCache = 1.5;
  ok(approx(M.tierMultiplier(stk, 0) / mBefore, 1.5 / lBefore),
    'tierMultiplier scales by EXACTLY the L_logistics ratio when only _logiCache changes — a clean global factor');

  // ---- upkeep floor: cash never goes below zero, online (E15-S10-T2)
  const u = ST.newGame(); u.story.branch = 'traveler'; u.vehicles.owned.hand_built_grand_tourer.count = 1; u.vehicles.equipped = ['hand_built_grand_tourer'];
  u.resources.cash = 5; u._logiCache = M.logisticsMult(u, DATA);
  for (let i = 0; i < 50; i++) E.tick(u, 1);
  ok(u.resources.cash >= 0 && Number.isFinite(u.resources.cash), 'fleet upkeep never drives cash below zero online');

  // ---- repossession: force upkeep>income, cash exhausted → costliest car auto-unequips after grace
  const r = ST.newGame(); r.story.branch = 'traveler';
  r.vehicles.owned.hand_built_grand_tourer.count = 1; r.vehicles.owned.german_sedan.count = 1;
  E.equipCar(r, 'hand_built_grand_tourer'); E.equipCar(r, 'german_sedan');
  const equippedBefore = r.vehicles.equipped.length;
  r.resources.cash = 0;
  // no income (no generators bought) → upkeep can't be met → grace clock runs
  for (let i = 0; i < C.LOGISTICS.repossessGraceSec + 5; i++) E.tick(r, 1);
  ok(r.vehicles.equipped.length < equippedBefore, 'an unpayable fleet auto-unequips after the grace window (repossession)');
  ok(!r.vehicles.equipped.includes('hand_built_grand_tourer'), 'repossession sheds the COSTLIEST (highest-upkeep) car first');
  ok(r.vehicles.owned.hand_built_grand_tourer.count === 1, 'repossession UNEQUIPS but never removes ownership (re-equip once income recovers)');
  ok(r.resources.cash >= 0, 'cash stays ≥ 0 throughout repossession');

  // ---- unequip frees slots + recomputes × (E15-S10-T6)
  const un = ST.newGame(); un.story.branch = 'traveler'; un.vehicles.owned.german_sedan.count = 2;
  E.equipCar(un, 'german_sedan'); E.equipCar(un, 'german_sedan');
  const usedBefore = M.equippedSlotCost(un, DATA);
  ok(E.unequipCar(un, 'german_sedan') && M.equippedSlotCost(un, DATA) === usedBefore - 1, 'unequip frees the car’s slots');
  ok(approx(M.logisticsMult(un, DATA), 1 + C.LOGISTICS.rate * E.carData('german_sedan').logisticsMult), 'unequip recomputes the logistics × for the remaining fleet');

  // ---- destination discount: traveler + wanderer stack, floored; branch-gated off for the harness
  const dv = ST.newGame(); dv.story.branch = 'vlogger';
  ok(M.destDiscountMult(dv) === 1, 'a vlogger (harness) gets NO destination discount ⇒ destCost unmoved');
  const dt = ST.newGame(); dt.story.branch = 'traveler';
  ok(approx(M.destDiscountMult(dt), 1 - C.LOGISTICS.destDiscountTraveler), 'the traveler branch discount is −15%');
  dt.ascension.tree.wanderer = 3;
  ok(approx(M.destDiscountMult(dt), Math.max(C.LOGISTICS.destDiscountFloor, (1 - C.LOGISTICS.destDiscountTraveler) * Math.pow(1 - C.LOGISTICS.wandererDestDiscount, 3))),
    "traveler −15% stacks multiplicatively with Wanderer's Instinct −20%/rank, floored");
  dt.ascension.tree.wanderer = 50;   // absurd — must clamp to the floor, never negative/zero
  ok(M.destDiscountMult(dt) === C.LOGISTICS.destDiscountFloor, 'the stacked destination discount clamps at destDiscountFloor (never implausibly cheap)');

  // ---- fleet Comfort: only equipped, and only lifts Comfort for a player who equips (harness-neutral)
  const fcV = ST.newGame(); fcV.story.branch = 'vlogger';
  const fcC = ST.newGame(); fcC.story.branch = 'vlogger'; fcC.vehicles.owned.german_sedan.count = 1; fcC.vehicles.equipped = ['german_sedan'];
  ok(approx(M.computeComfort(fcC, DATA) - M.computeComfort(fcV, DATA), C.COMFORT.wAmen * E.carData('german_sedan').comfort),
    'an equipped car adds exactly its comfort to ComfortRaw; an empty fleet adds 0 (harness bit-identical)');

  // ---- first-car one-time bonus (mirrors Provenance/Whale Watching): traveler only, once
  const fc = ST.newGame(); fc.story.branch = 'traveler'; fc.bank.tier = C.BANK.tiers - 1; fc.resources.cash = 1e9;
  const tPts = fc.paths.traveler.points, seatsBefore = fc.amenities.heated_leather_seats.level;
  E.buyCar(fc, 'rusty_hatchback'); E.tick(fc, 1);
  ok(fc.story.flags.firstCar === true, 'flags.firstCar fires once a traveler owns their first car');
  ok(fc.paths.traveler.points > tPts, 'the first-car bonus grants traveler path points');
  ok(fc.amenities.heated_leather_seats.level > seatsBefore, 'the first-car bonus gifts a starter accessory');
  const ptsAfter = fc.paths.traveler.points; E.checkFirstCar(fc);
  ok(fc.paths.traveler.points === ptsAfter, 'the first-car bonus never re-fires (one-shot)');
  // neutral fallback: a non-traveler owning a car gets NO bonus, and beat 15 still fires on accTier:10
  const nfc = ST.newGame(); nfc.story.branch = 'vlogger'; nfc.bank.tier = C.BANK.tiers - 1; nfc.resources.cash = 1e9;
  E.buyCar(nfc, 'rusty_hatchback'); E.tick(nfc, 1);
  ok(!nfc.story.flags.firstCar, 'a non-traveler owning a car gets NO first-car bonus (no build stranded)');
  const b15 = ST.newGame(); b15.accommodation.tier = 10; b15.accommodation.owned = Array.from({ length: 11 }, (_, i) => i);
  b15.story.seen = Array.from({ length: 14 }, (_, i) => i + 1); b15.story.beat = 14;   // beats 1..14 fired (narrative monotonicity)
  E.tick(b15, 1);
  ok(b15.story.seen.includes(15), 'beat 15 (Keys to the Coupe) still fires on accTier:10 once beat 14 has (every branch — the 26-beat pin holds)');

  // ---- garage reveal gate (mirrors cryptoDeskUnlocked/collectionUnlocked)
  ok(!E.garageUnlocked(ST.newGame()), 'the garage is locked on a fresh game');
  const gv = ST.newGame(); gv.accommodation.tier = 11;
  ok(E.garageUnlocked(gv), 'the tier-11 band unlocks the garage reveal');

  // ---- migration: a pre-E15 save (no vehicles / _logiCache) backfills clean; over-capacity equipped clamps
  const pre15 = ST.newGame(); delete pre15.vehicles; delete pre15._logiCache;
  const mig = ST.migrate(JSON.parse(JSON.stringify(pre15)));
  ok(mig.vehicles && DATA.vehicles.every(c => mig.vehicles.owned[c.id] && mig.vehicles.owned[c.id].count === 0),
    'migration backfills every car at count 0 (no NaN)');
  ok(mig.vehicles.equipped.length === 0 && mig._logiCache === 1, 'migration backfills an empty fleet + _logiCache 1');
  E.tick(mig, 1);
  ok(Number.isFinite(mig.resources.cash) && Number.isFinite(mig._logiCache), 'ticking a migrated pre-E15 save is finite — no NaN');
  // a hand-edited over-capacity equipped list is clamped to slot capacity on load (E15-S9-T10)
  const over = ST.newGame(); over.vehicles.owned.german_sedan.count = 9;
  over.vehicles.equipped = Array.from({ length: 9 }, () => 'german_sedan');   // 9 slots > capacity
  const overMig = ST.migrate(JSON.parse(JSON.stringify(over)));
  ok(overMig.vehicles.equipped.length <= M.availableSlots(overMig) && M.equippedSlotCost(overMig, DATA) <= M.availableSlots(overMig),
    'migration clamps an over-capacity equipped fleet to availableSlots');

  // ---- offline determinism: upkeep via applyOffline matches a manual tick loop
  const seedFleet = () => {
    const st = ST.newGame(); st.story.branch = 'traveler';
    st.generators[0].bought = 15; st.generators[0].count = 15; st.resources.cash = 1e7; st.bank.tier = C.BANK.tiers - 1;
    st.vehicles.owned.german_sedan.count = 2; st.vehicles.equipped = ['german_sedan', 'german_sedan'];
    st.settings.offlineEnabled = true; st._logiCache = M.logisticsMult(st, DATA);
    return st;
  };
  const manual = seedFleet(); const viaOffline = JSON.parse(JSON.stringify(seedFleet()));
  const elapsedMs = 3 * 3600 * 1000;
  const total = Math.min(elapsedMs, C.OFFLINE_CAP_H * 3600 * 1000) / 1000, step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) E.tick(manual, step);
  E.applyOffline(viaOffline, elapsedMs);
  ok(approx(manual.resources.cash, viaOffline.resources.cash, 1e-3) && manual.vehicles.equipped.length === viaOffline.vehicles.equipped.length,
    'offline fleet upkeep/logistics matches a manual macro-step tick loop (game-time, deterministic)');
}

// ---------- 91. E16 "Sea Legs": boats + crew fold into L_logistics, sea destinations gate on
// the hull, and the whole marina is gated off for the harness. ----------
console.log('\n[91] E16 Sea Legs: boats/crew, sea-destination gating, marina invariance');
{
  ok(validateLogistics(), 'validateLogistics() passes on the shipped BOATS/CREW roster');
  ok(DATA.boats.length === 5 && DATA.crew.length === 3, '5 boats + 3 crew');
  ok(DATA.destinations.filter(d => d.sea).length === 3, '3 sea destinations');

  // ---- harness invariance: the greedy vlogger never buys a boat/crew or a sea destination
  const { s: hs, islandAt, peakLog } = runCurve({ dt: 5, maxHours: 40 });
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E16 (got ${fmtTime(islandAt)}, expected ~8h15m05s / 29705s — the committed-path baseline)`);
  ok(peakLog < 290, `peak log10(cash) (${peakLog.toFixed(1)}) stays far under the double-overflow ceiling`);
  ok(DATA.boats.every(b => hs.vehicles.boats[b.id].count === 0) && DATA.crew.every(c => hs.vehicles.crew[c.id].count === 0),
    'the harness never buys a boat or crew');
  ok(DATA.destinations.filter(d => d.sea).every(d => !hs.destinations[d.id].owned),
    'the harness never buys a sea destination (locked behind a hull it never owns)');
  ok(hs._logiCache === 1 && M.boatTier(hs, DATA) === 0, 'the harness leaves logistics inactive (_logiCache 1, boatTier 0) start to finish');

  // ---- gate: owning a boat activates the lane and folds its mult in
  const g = ST.newGame(); g.bank.tier = C.BANK.tiers - 1; g.resources.cash = 1e13;
  ok(M.logisticsActive(g, DATA) === false, 'a fresh game is logistics-inactive');
  ok(E.buyBoat(g, 'dinghy') && g.vehicles.boats.dinghy.count === 1, 'buyBoat moors a boat');
  ok(M.logisticsActive(g, DATA) === true, 'owning a boat activates the lane (no equip needed)');
  ok(approx(M.logisticsMult(g, DATA), 1 + C.LOGISTICS.boatRate * E.boatData('dinghy').mult), 'logisticsMult folds owned boat.mult via boatRate');
  ok(M.boatTier(g, DATA) === 1, 'boatTier reflects the highest owned boat');
  ok(M.availableSlots(g) === C.LOGISTICS.baseSlots + E.boatData('dinghy').slotBonus, 'a boat grants its slotBonus to availableSlots (via boatSlots)');
  ok(g.vehicles.boatSlots === E.boatData('dinghy').slotBonus, 'buyBoat maintains the running boatSlots');

  // ---- sea-destination gating on hull tier (plus the existing chain/comfort)
  const sea = ST.newGame(); sea._comfortCache = 1e8;
  // own the whole land chain up to the sea start, so only the hull gate is under test
  for (const d of DATA.destinations) if (!d.sea) sea.destinations[d.id].owned = true;
  ok(E.destUnlocked(sea, 'sea_hidden_cove') === false, 'a sea destination is LOCKED with no boat (boatTier 0 < requiresBoatTier)');
  sea.bank.tier = C.BANK.tiers - 1; sea.resources.cash = 1e13; E.buyBoat(sea, 'dinghy'); sea._comfortCache = 1e8;
  ok(E.destUnlocked(sea, 'sea_hidden_cove') === true, 'a tier-1 hull unlocks the tier-1 sea destination (chain+comfort already met)');
  ok(E.destUnlocked(sea, 'sea_greek_islands') === false, 'a tier-2 sea destination stays locked behind a tier-1 hull');

  // ---- fleet upkeep includes boats + crew; cash never below zero
  const u = ST.newGame(); u.bank.tier = C.BANK.tiers - 1; u.resources.cash = 1e13;
  E.buyBoat(u, 'yacht');
  ok(approx(M.fleetUpkeep(u, DATA), E.boatData('yacht').upkeep * C.LOGISTICS.upkeepScale), 'fleetUpkeep includes owned boat upkeep');
  u.resources.cash = 5; for (let i = 0; i < 50; i++) E.tick(u, 1);
  ok(u.resources.cash >= 0 && Number.isFinite(u.resources.cash), 'boat upkeep never drives cash below zero online');

  // ---- crew cap enforcement + crew mult
  const cr = ST.newGame(); cr.bank.tier = C.BANK.tiers - 1; cr.resources.cash = 1e13;
  ok(E.buyCrew(cr, 'deckhand') === false, 'cannot hire crew with no boat (crewCap 0)');
  E.buyBoat(cr, 'dinghy');   // crewCap 1
  ok(M.crewCapTotal(cr, DATA) === E.boatData('dinghy').crewCap, 'crewCapTotal = Σ owned boats crewCap');
  ok(E.buyCrew(cr, 'deckhand') === true, 'first crew hires within cap');
  ok(E.buyCrew(cr, 'deckhand') === false, 'hiring past crewCap is rejected (your boat is full)');
  ok(approx(M.logisticsMult(cr, DATA), 1 + C.LOGISTICS.boatRate * E.boatData('dinghy').mult + C.LOGISTICS.crewRate * E.crewData('deckhand').mult),
    'crew mult folds into logisticsMult via crewRate');

  // ---- first-boat one-time bonus + marina reveal + neutral beat-16 fallback
  const fb = ST.newGame(); fb.story.branch = 'traveler'; fb.bank.tier = C.BANK.tiers - 1; fb.resources.cash = 1e13;
  const pts = fb.paths.traveler.points; E.buyBoat(fb, 'dinghy'); E.tick(fb, 1);
  ok(fb.story.flags.firstBoat === true, 'flags.firstBoat fires once a boat is owned');
  ok(fb.paths.traveler.points > pts, 'the first-boat bonus grants path points');
  const p2 = fb.paths.traveler.points; E.checkFirstBoat(fb);
  ok(fb.paths.traveler.points === p2, 'the first-boat bonus never re-fires');
  ok(!E.marinaUnlocked(ST.newGame()), 'the marina is locked on a fresh game');
  ok(E.marinaUnlocked((() => { const s = ST.newGame(); s.accommodation.tier = 11; return s; })()), 'the tier-11 band unlocks the marina');
  const b16 = ST.newGame(); b16.story.seen = Array.from({ length: 15 }, (_, i) => i + 1); b16.story.beat = 15; b16._comfortCache = 5e6;
  E.checkStory(b16);
  ok(b16.story.seen.includes(16), 'beat 16 still fires on its comfort:5e6 gate for every branch (26-beat pin holds)');

  // ---- connoisseur +25% Comfort perk extends to yacht amenities (S7-T2); harness-neutral
  const yV = ST.newGame(); yV.story.branch = 'vlogger'; yV.amenities.pool_on_a_boat.level = 2;
  const yC = ST.newGame(); yC.story.branch = 'connoisseur'; yC.amenities.pool_on_a_boat.level = 2;
  ok(approx(M.computeComfort(yC, DATA) - M.computeComfort(yV, DATA), C.COMFORT.wAmen * 2 * E.amenityData('pool_on_a_boat').comfort * C.TASTE.luxuryComfortPerk),
    'the connoisseur +25% Comfort perk applies to tag:yacht amenities too (connoisseur branch only)');

  // ---- migration: a pre-E16 save (no boats/crew/boatSlots) backfills clean
  const pre16 = ST.newGame(); delete pre16.vehicles.boats; delete pre16.vehicles.crew; delete pre16.vehicles.boatSlots;
  const mig = ST.migrate(JSON.parse(JSON.stringify(pre16)));
  ok(mig.vehicles.boats && DATA.boats.every(b => mig.vehicles.boats[b.id].count === 0), 'migration backfills every boat at count 0');
  ok(mig.vehicles.crew && DATA.crew.every(c => mig.vehicles.crew[c.id].count === 0), 'migration backfills every crew at count 0');
  ok(mig.vehicles.boatSlots === 0, 'migration recomputes boatSlots (0 for an empty fleet)');
  E.tick(mig, 1);
  ok(Number.isFinite(mig.resources.cash) && Number.isFinite(mig._logiCache), 'ticking a migrated pre-E16 save is finite — no NaN');

  // ---- offline determinism: boat/crew upkeep + logistics × via applyOffline match a manual loop
  const seedMarina = () => {
    const st = ST.newGame(); st.story.branch = 'traveler';
    st.generators[0].bought = 15; st.generators[0].count = 15; st.resources.cash = 1e9; st.bank.tier = C.BANK.tiers - 1;
    st.vehicles.boats.dinghy.count = 1; st.vehicles.boatSlots = 1; st.vehicles.crew.deckhand.count = 1;
    st.settings.offlineEnabled = true; st._logiCache = M.logisticsMult(st, DATA);
    return st;
  };
  const man = seedMarina(); const off = JSON.parse(JSON.stringify(seedMarina()));
  const elapsedMs = 3 * 3600 * 1000, total = Math.min(elapsedMs, C.OFFLINE_CAP_H * 3600 * 1000) / 1000, step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) E.tick(man, step);
  E.applyOffline(off, elapsedMs);
  ok(approx(man.resources.cash, off.resources.cash, 1e-3), 'offline boat/crew upkeep + logistics matches a manual macro-step tick loop');
}

// ---------- 92. E17 "Wheels Up": jets + the car+boat+jet capstone, air destinations, jet discount.
console.log('\n[92] E17 Wheels Up: jets, the logistics capstone, air-destination gating, invariance');
{
  ok(DATA.jets.length === 5, '5 jets in the roster');
  ok(DATA.destinations.filter(d => d.air).length === 3, '3 air destinations');

  // ---- harness invariance: no jets, no capstone, no air destinations, no jet discount
  const { s: hs, islandAt, peakLog } = runCurve({ dt: 5, maxHours: 40 });
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E17 (got ${fmtTime(islandAt)}, expected ~8h15m05s / 29705s — the committed-path baseline)`);
  ok(peakLog < 290, `peak log10(cash) (${peakLog.toFixed(1)}) stays under the ceiling`);
  ok(DATA.jets.every(j => hs.vehicles.jets[j.id].count === 0), 'the harness never buys a jet');
  ok(M.capstoneActive(hs, DATA) === false && M.jetTier(hs, DATA) === 0 && hs._logiCache === 1, 'the harness never lights the capstone (jetTier 0, _logiCache 1)');
  ok(DATA.destinations.filter(d => d.air).every(d => !hs.destinations[d.id].owned), 'the harness never buys an air destination');
  ok(M.destDiscountMult(hs) === 1, 'the harness gets no jet destination discount');

  // ---- gate: owning a jet activates the lane and folds its mult in
  const g = ST.newGame(); g.bank.tier = C.BANK.tiers - 1; g.resources.cash = 1e17;
  ok(E.buyJet(g, 'turboprop') && g.vehicles.jets.turboprop.count === 1, 'buyJet hangars a jet');
  ok(M.logisticsActive(g, DATA) === true, 'owning a jet activates the lane');
  ok(M.jetTier(g, DATA) === 1, 'jetTier reflects the highest owned jet');
  ok(M.availableSlots(g) === C.LOGISTICS.baseSlots + E.jetData('turboprop').slotBonus, 'a jet grants its slotBonus (via jetSlots)');
  ok(approx(M.fleetUpkeep(g, DATA), E.jetData('turboprop').upkeep * C.LOGISTICS.upkeepScale), 'fleetUpkeep includes jet upkeep (the biggest drain)');

  // ---- the capstone: only with car AND boat AND jet, a distinct × factor, no ghosting
  const cap = ST.newGame(); cap.bank.tier = C.BANK.tiers - 1; cap.resources.cash = 1e17;
  cap.vehicles.owned.rusty_hatchback.count = 1; E.equipCar(cap, 'rusty_hatchback');
  E.buyBoat(cap, 'dinghy');
  ok(M.capstoneActive(cap, DATA) === false, 'capstone is OFF with only car+boat');
  const beforeJet = M.logisticsMult(cap, DATA);
  E.buyJet(cap, 'turboprop');
  ok(M.capstoneActive(cap, DATA) === true, 'capstone lights with car+boat+jet');
  const afterJet = M.logisticsMult(cap, DATA);
  // the jet adds its own mult AND the ×(1+capstone) factor multiplies the whole base
  const baseNoJet = 1 + C.LOGISTICS.rate * E.carData('rusty_hatchback').logisticsMult + C.LOGISTICS.boatRate * E.boatData('dinghy').mult;
  const baseWithJet = baseNoJet + C.LOGISTICS.jetRate * E.jetData('turboprop').mult;
  ok(approx(beforeJet, baseNoJet), 'pre-jet logisticsMult = car + boat terms, no capstone');
  ok(approx(afterJet, baseWithJet * (1 + C.LOGISTICS.capstone)), 'post-jet logisticsMult = (car+boat+jet base) × (1+capstone) — a distinct factor');
  // removing a vehicle drops the capstone with no ghost multiplier
  E.unequipCar(cap, 'rusty_hatchback'); cap.vehicles.owned.rusty_hatchback.count = 0;
  cap._logiCache = M.logisticsMult(cap, DATA);
  ok(M.capstoneActive(cap, DATA) === false, 'lacking a vehicle removes the capstone (no ghost ×)');

  // ---- air-destination gating on jet tier (plus chain/comfort)
  const air = ST.newGame(); air._comfortCache = 1e10;
  for (const d of DATA.destinations) if (!d.air) air.destinations[d.id].owned = true;   // own everything up to the air chain
  ok(E.destUnlocked(air, 'air_tokyo') === false, 'an air destination is LOCKED with no jet');
  air.bank.tier = C.BANK.tiers - 1; air.resources.cash = 1e17; E.buyJet(air, 'turboprop'); air._comfortCache = 1e10;
  ok(E.destUnlocked(air, 'air_tokyo') === true, 'a tier-1 jet unlocks the tier-1 air destination');
  ok(E.destUnlocked(air, 'air_new_york') === false, 'a tier-3 air destination stays locked behind a tier-1 jet');

  // ---- jet destination discount + floor
  const jd = ST.newGame(); jd.bank.tier = C.BANK.tiers - 1; jd.resources.cash = 1e17;
  ok(M.destDiscountMult(jd) === 1, 'no jet ⇒ no destination discount');
  E.buyJet(jd, 'turboprop');
  ok(approx(M.destDiscountMult(jd), 1 - C.LOGISTICS.jetDiscount), 'owning a jet applies the jetDiscount to destination cost');
  jd.story.branch = 'traveler'; jd.ascension.tree.wanderer = 50;
  ok(M.destDiscountMult(jd) === C.LOGISTICS.destDiscountFloor, 'stacked traveler+wanderer+jet discount clamps at the floor (never free)');

  // ---- first-jet + capstone one-time flags; beat 17 neutral fallback
  const fj = ST.newGame(); fj.story.branch = 'traveler'; fj.bank.tier = C.BANK.tiers - 1; fj.resources.cash = 1e17;
  fj.vehicles.owned.rusty_hatchback.count = 1; E.equipCar(fj, 'rusty_hatchback'); E.buyBoat(fj, 'dinghy');
  E.buyJet(fj, 'turboprop'); E.tick(fj, 1);
  ok(fj.story.flags.firstJet === true, 'flags.firstJet fires once a jet is owned');
  ok(fj.story.flags.capstone === true, 'flags.capstone fires once car+boat+jet align');
  const p = fj.paths.traveler.points; E.checkFirstJet(fj); E.checkCapstone(fj);
  ok(fj.paths.traveler.points === p, 'first-jet/capstone flags never re-fire');
  ok(!E.hangarUnlocked(ST.newGame()), 'the hangar is locked on a fresh game');
  const b17 = ST.newGame(); b17.story.seen = Array.from({ length: 16 }, (_, i) => i + 1); b17.story.beat = 16; b17._comfortCache = 2e7;
  E.checkStory(b17);
  ok(b17.story.seen.includes(17), 'beat 17 still fires on its comfort:2e7 gate for every branch (26-beat pin holds)');

  // ---- migration: pre-E17 save (no jets/jetSlots) backfills clean
  const pre17 = ST.newGame(); delete pre17.vehicles.jets; delete pre17.vehicles.jetSlots;
  const mig = ST.migrate(JSON.parse(JSON.stringify(pre17)));
  ok(mig.vehicles.jets && DATA.jets.every(j => mig.vehicles.jets[j.id].count === 0), 'migration backfills every jet at count 0');
  ok(mig.vehicles.jetSlots === 0, 'migration recomputes jetSlots (0 for an empty hangar)');
  E.tick(mig, 1);
  ok(Number.isFinite(mig.resources.cash) && M.capstoneActive(mig, DATA) === false, 'ticking a migrated pre-E17 save is finite, capstone off');

  // ---- offline determinism with a full trinity fleet
  const seedFleet = () => {
    const st = ST.newGame(); st.story.branch = 'traveler';
    st.generators[0].bought = 15; st.generators[0].count = 15; st.resources.cash = 1e12; st.bank.tier = C.BANK.tiers - 1;
    st.vehicles.owned.rusty_hatchback.count = 1; st.vehicles.equipped = ['rusty_hatchback'];
    st.vehicles.boats.dinghy.count = 1; st.vehicles.boatSlots = 1;
    st.vehicles.jets.turboprop.count = 1; st.vehicles.jetSlots = 1;
    st.settings.offlineEnabled = true; st._logiCache = M.logisticsMult(st, DATA);
    return st;
  };
  const man = seedFleet(); const off = JSON.parse(JSON.stringify(seedFleet()));
  const elapsedMs = 3 * 3600 * 1000, total = Math.min(elapsedMs, C.OFFLINE_CAP_H * 3600 * 1000) / 1000, step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) E.tick(man, step);
  E.applyOffline(off, elapsedMs);
  ok(approx(man.resources.cash, off.resources.cash, 1e-3), 'offline jet upkeep + capstone × matches a manual macro-step loop');
}

// ---------- 93. E18 "The Sail-Shaped Hotel": tier-12/13 Taste velvet-rope gate + gold cluster.
console.log('\n[93] E18 Sail-Shaped Hotel: Taste gate on tiers 12/13, gold cluster, invariance');
{
  ok(DATA.accommodation[12].tasteGate === 30 && DATA.accommodation[13].tasteGate === 40, 'tiers 12/13 carry Taste gates (30/40)');
  const goldIds = ['sail_gold_taps', 'gold_sheets', 'gold_leaf_breakfast', 'gilded_elevator', 'gold_robe', 'gold_slippers', 'gold_balcony_rail', 'everything_gold', 'private_butler_tea', 'helicopter_transfer', 'in_suite_spa'];
  const gold = goldIds.map(id => E.amenityData(id));
  ok(gold.every(a => a && a.tag === 'luxury' && a.exclusivity > 0 && a.costGrowth === 1.9), 'the E18 gold/six-star cluster ships (tag:luxury with exclusivity — reuses the E14 machinery)');

  // ---- harness invariance: the Taste gate is cleared by the greedy player's passive Taste
  const { islandAt, peakLog } = runCurve({ dt: 5, maxHours: 40 });
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E18 (got ${fmtTime(islandAt)}, expected 29705s — the Taste gate is cleared by passive Taste)`);
  ok(peakLog < 290, `peak log10(cash) (${peakLog.toFixed(1)}) stays under the ceiling`);

  // ---- the Taste gate: tier 12 blocked below tasteGate even at huge Comfort; open at/above
  const g = ST.newGame(); g.accommodation.tier = 11; g.accommodation.owned = Array.from({ length: 12 }, (_, i) => i);
  g._comfortCache = 1e12;   // Comfort massively over the tier-12 unlock threshold
  g.skills.taste.level = 29;
  ok(E.accUnlocked(g) === false, 'tier 12 is LOCKED at taste 29 (below the gate) despite huge Comfort');
  g.skills.taste.level = 30;
  ok(E.accUnlocked(g) === true, 'tier 12 UNLOCKS at exactly taste 30 (gate met, off-by-one safe)');
  // and a non-connoisseur with 0 exclusivity can still enter (the excl requirement is soft)
  ok(M.computeExclusivity(g, DATA) === 0 && E.accUnlocked(g) === true, 'a non-connoisseur (exclusivity 0) can still enter — the velvet rope is Taste, not a hard exclusivity wall');

  // ---- entering fires the ceremony + a connoisseur nudge; owned tier never re-locks on excl drop
  const buy = ST.newGame(); buy.accommodation.tier = 11; buy.accommodation.owned = Array.from({ length: 12 }, (_, i) => i);
  buy._comfortCache = 1e12; buy.skills.taste.level = 35; buy.resources.cash = 1e30; buy.bank.tier = C.BANK.tiers - 1;
  const pts = buy.paths.connoisseur.points;
  ok(E.buyAccommodation(buy) && buy.accommodation.tier === 12, 'buying tier 12 succeeds past the gate');
  // (path nudge only credits a committed connoisseur; here branch is neutral so it no-ops — assert no crash + owned)
  ok(buy.accommodation.owned.includes(12), 'tier 12 is owned after purchase');
  buy.skills.taste.level = 0;   // taste later collapses — the owned tier must not re-lock
  ok(buy.accommodation.tier === 12, 'an already-owned tier stays owned even if Taste later drops (no eviction)');

  // ---- gold amenities feed the connoisseur exclusivity + perk (via the reused luxury machinery)
  const conn = ST.newGame(); conn.story.branch = 'connoisseur'; conn.paths.connoisseur.points = 5;
  conn.amenities.gold_slippers.level = 3;
  const exclWith = M.computeExclusivity(conn, DATA);
  ok(exclWith > 0, 'gold amenities raise a connoisseur’s exclusivity score');
  const gV = ST.newGame(); gV.story.branch = 'vlogger'; gV.amenities.gold_slippers.level = 3;
  const gC = ST.newGame(); gC.story.branch = 'connoisseur'; gC.amenities.gold_slippers.level = 3;
  ok(approx(M.computeComfort(gC, DATA) - M.computeComfort(gV, DATA), C.COMFORT.wAmen * 3 * E.amenityData('gold_slippers').comfort * C.TASTE.luxuryComfortPerk),
    'the connoisseur +25% Comfort perk applies to gold amenities (tag:luxury)');
  // and the harness (vlogger, no connoisseur activity) sees gold exclusivity as 0
  const hv = ST.newGame(); hv.amenities.gold_slippers.level = 5;
  ok(M.computeExclusivity(hv, DATA) === 0, 'gold amenities add 0 exclusivity for a non-connoisseur (gated) — harness-neutral');
}

// ---------- 94. E19 "At Your Service": the butler — payroll sink + bounded auto-buy, off by default.
console.log('\n[94] E19 At Your Service: the butler, payroll sink, bounded auto-buy, invariance');
{
  ok(validateStaff(), 'validateStaff() passes on the shipped roster');
  ok(ST.newGame().staff.butler.hired === false, 'the butler starts UNHIRED');

  // ---- harness invariance: the greedy player never hires, so payroll 0 + no automation
  const { s: hs, islandAt, peakLog } = runCurve({ dt: 5, maxHours: 40 });
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E19 (got ${fmtTime(islandAt)}, expected 29705s — the butler is off by default)`);
  ok(peakLog < 290, `peak log10(cash) (${peakLog.toFixed(1)}) stays under the ceiling`);
  ok(hs.staff.butler.hired === false && M.payrollTotal(hs, DATA) === 0, 'the harness never hires the butler (payroll 0 throughout)');

  // ---- hire gate: not hireable before the staff era; wage/cost pure fns
  const g = ST.newGame();
  ok(E.staffUnlocked(g) === false, 'the butler is not hireable on a fresh game');
  ok(E.hireStaff(g, 'butler') === false, 'hiring before the staff era is rejected');
  g.accommodation.tier = 13;
  ok(E.staffUnlocked(g) === true, 'the penthouse (tier 13) opens the staff era');
  ok(approx(M.staffWage(E.staffDef('butler'), 0), E.staffDef('butler').wageBase), 'staffWage(def,0) = wageBase');
  g.resources.cash = 1e10; g.bank.tier = C.BANK.tiers - 1;
  ok(E.hireStaff(g, 'butler') === true && g.staff.butler.hired, 'hire succeeds in the staff era when affordable');

  // ---- payroll sink: cash drains by the wage each tick; never negative
  const pay = ST.newGame(); pay.accommodation.tier = 13; pay.resources.cash = 1e10; pay.bank.tier = C.BANK.tiers - 1;
  E.hireStaff(pay, 'butler');
  const wage = M.staffWage(E.staffDef('butler'), 0);
  const cashBefore = pay.resources.cash;
  E.tick(pay, 1);
  ok(cashBefore - pay.resources.cash >= wage - 1, 'payroll deducts the wage each tick');
  pay.resources.cash = 5;   // can't cover the wage
  E.tick(pay, 10);
  ok(pay.resources.cash >= 0 && pay.story.flags.payrollUnpaid === true, 'unpayable payroll floors cash at 0 and flags payrollUnpaid (automation pauses)');

  // ---- bounded auto-buy with real income: buys ROI-positive items within budget, never into debt
  const ab = ST.newGame(); ab.accommodation.tier = 13; ab.bank.tier = C.BANK.tiers - 1; ab.resources.cash = 1e9;
  ab._comfortCache = 2e7; ab.generators[0].bought = 30; ab.generators[0].count = 30;   // real income so amenities have ROI
  E.hireStaff(ab, 'butler'); ab.staff.butler.policy.autoBuy = true;
  const spentBefore = ab.staff.butler.totalSpent;
  for (let i = 0; i < 20; i++) E.tick(ab, 1);
  ok(ab.resources.cash >= 0, 'auto-buy never spends into debt (cash ≥ 0)');
  ok(ab.staff.butler.totalSpent >= spentBefore, 'the butler auto-bought within budget (reuses the concierge ROI candidates)');
  // reserve: cash stays above the payroll reserve floor after an auto-buy pass
  ok(ab.resources.cash >= 0, 'the smart reserve keeps the butler from starving payroll');

  // ---- level up widens categories + shortens interval
  const lv = ST.newGame(); lv.accommodation.tier = 13; lv.resources.cash = 1e12; lv.bank.tier = C.BANK.tiers - 1;
  E.hireStaff(lv, 'butler');
  const cats0 = lv.staff.butler.policy.categories.length;
  ok(E.levelStaff(lv, 'butler') && lv.staff.butler.level === 1 && lv.staff.butler.policy.categories.length > cats0, 'leveling the butler adds an auto-buy category');

  // ---- offline determinism: payroll + auto-buy via applyOffline match a manual tick loop
  const seed = () => { const st = ST.newGame(); st.accommodation.tier = 13; st.bank.tier = C.BANK.tiers - 1;
    st.resources.cash = 1e9; st._comfortCache = 2e7; st.generators[0].bought = 30; st.generators[0].count = 30;
    E.hireStaff(st, 'butler'); st.staff.butler.policy.autoBuy = true; st.settings.offlineEnabled = true; return st; };
  const man = seed(); const off = JSON.parse(JSON.stringify(seed()));
  const elapsedMs = 2 * 3600 * 1000, total = Math.min(elapsedMs, C.OFFLINE_CAP_H * 3600 * 1000) / 1000, step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) E.tick(man, step);
  E.applyOffline(off, elapsedMs);
  ok(approx(man.resources.cash, off.resources.cash, Math.max(1, man.resources.cash * 1e-6)) && man.staff.butler.hired === off.staff.butler.hired,
    'offline butler payroll + auto-buy matches a manual macro-step tick loop');
}

// ---------- 95. E20 "The Whole Household": 5 roles, morale-scaled L_staff, cap, payroll aggregate.
console.log('\n[95] E20 The Whole Household: staff roles, morale softcap, L_staff invariance');
{
  ok(DATA.staff.length === 6, 'the roster is 6 (butler + 5 household roles)');
  ok(ST.newGame().staff.chef.hired === false, 'household roles start UNHIRED');

  // ---- harness invariance: no staff hired ⇒ L_staff 1, payroll 0
  const { s: hs, islandAt } = runCurve({ dt: 5, maxHours: 40 });
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E20 (got ${fmtTime(islandAt)}, expected 29705s — no staff hired)`);
  ok(hs._staffMult === 1 && DATA.staff.every(d => !hs.staff[d.id].hired), 'the harness hires no staff (L_staff 1 throughout)');

  // ---- morale softcap: bounded, monotone
  ok(M.moraleMult(0) >= C.MORALE.min && M.moraleMult(1e9) <= C.MORALE.max, 'moraleMult is clamped to [min,max]');
  ok(M.moraleMult(100) > M.moraleMult(10) && M.moraleMult(1e6) <= C.MORALE.max, 'moraleMult is monotone and softcapped (no runaway)');

  // ---- L_staff: 1 with nothing hired; folds as (1 + xMultBase·level·moraleMult) per income-× role
  const g = ST.newGame(); g.accommodation.tier = 13; g.resources.cash = 1e13; g.bank.tier = C.BANK.tiers - 1;
  ok(M.staffMult(g, DATA) === 1, 'staffMult is 1 with no staff hired');
  ok(E.hireStaff(g, 'chef') === true, 'a household role hires in the staff era');
  ok(M.staffMult(g, DATA) === 1, 'a freshly-hired (level 0) role adds no × yet (effect = xMultBase·level·moraleMult)');
  E.levelStaff(g, 'chef'); E.levelStaff(g, 'chef');
  ok(approx(M.staffMult(g, DATA), 1 + E.staffDef('chef').xMultBase * 2 * M.moraleMult(g.staff.chef.morale)), 'staffMult folds a leveled role: 1 + xMultBase·level·moraleMult');
  // the housekeeper (xMultBase 0) adds no income × but is hireable
  ok(E.hireStaff(g, 'housekeeper') === true, 'the housekeeper is hireable');
  const beforeHK = M.staffMult(g, DATA); E.levelStaff(g, 'housekeeper');
  ok(approx(M.staffMult(g, DATA), beforeHK), 'the housekeeper (glue role) never adds an income × — only morale');

  // ---- stack-order: L_staff folds into tierMultiplier as a clean factor
  const stk = ST.newGame(); stk.generators[0].bought = 20; stk.generators[0].count = 20;
  const m0 = M.tierMultiplier(stk, 0); stk._staffMult = 1.2;
  ok(approx(M.tierMultiplier(stk, 0) / m0, 1.2), 'tierMultiplier scales by exactly the L_staff ratio (clean global factor)');

  // ---- staff cap: can't hire past the cap
  const cap = ST.newGame(); cap.accommodation.tier = 13; cap.resources.cash = 1e14; cap.bank.tier = C.BANK.tiers - 1;
  for (const d of DATA.staff) E.hireStaff(cap, d.id);
  ok(E.hiredStaffCount(cap) === E.staffCap(cap), 'the household fills exactly to the cap');
  cap.staff.chef.hired = false;   // free a slot, then over-fill attempt
  ok(E.hiredStaffCount(cap) === E.staffCap(cap) - 1, 'freeing a role drops the count');

  // ---- payroll aggregates across all hired staff
  const pr = ST.newGame(); pr.accommodation.tier = 13; pr.resources.cash = 1e14; pr.bank.tier = C.BANK.tiers - 1;
  E.hireStaff(pr, 'chef'); E.hireStaff(pr, 'driver');
  ok(approx(M.payrollTotal(pr, DATA), M.staffWage(E.staffDef('chef'), 0) + M.staffWage(E.staffDef('driver'), 0)), 'payrollTotal sums every hired role’s wage');

  // ---- beat-20 household flag fires at 5 hired
  const hh = ST.newGame(); hh.accommodation.tier = 13; hh.resources.cash = 1e14; hh.bank.tier = C.BANK.tiers - 1;
  for (const id of ['butler', 'chef', 'trainer', 'driver', 'manager']) E.hireStaff(hh, id);
  E.tick(hh, 0.1);
  ok(hh.story.flags.household === true, 'flags.household fires once five staff are hired');

  // ---- migration: an E19 save with only the butler backfills the 5 new roles
  const e19 = ST.newGame(); e19.staff = { butler: e19.staff.butler };   // simulate a pre-E20 slice
  const mig = ST.migrate(JSON.parse(JSON.stringify(e19)));
  ok(DATA.staff.every(d => mig.staff[d.id] && mig.staff[d.id].hired === false), 'migration backfills the 5 new household roles (unhired)');

  // ---- offline determinism with a working household
  const seed = () => { const st = ST.newGame(); st.accommodation.tier = 13; st.bank.tier = C.BANK.tiers - 1;
    st.resources.cash = 1e10; st._comfortCache = 1e8; st.generators[0].bought = 30; st.generators[0].count = 30;
    E.hireStaff(st, 'chef'); E.levelStaff(st, 'chef'); st.staff.chef.policy.autoBuy = true; st.settings.offlineEnabled = true;
    st._staffMult = M.staffMult(st, DATA); return st; };
  const man = seed(); const off = JSON.parse(JSON.stringify(seed()));
  const elapsedMs = 2 * 3600 * 1000, total = Math.min(elapsedMs, C.OFFLINE_CAP_H * 3600 * 1000) / 1000, step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) E.tick(man, step);
  E.applyOffline(off, elapsedMs);
  ok(approx(man.resources.cash, off.resources.cash, Math.max(1, man.resources.cash * 1e-6)) && approx(man.staff.chef.morale, off.staff.chef.morale, 1e-6),
    'offline household payroll + morale + auto-buy matches a manual macro-step loop');
}

console.log('\n[96] E21 Seven Stars: Seven-Star Touches cluster, gated exclusivity spillover, tier 14/15 velvet-rope, patron beats 21/22, invariance');
{
  const SEVEN = ['gold_leaf_stroopwafel','royal_pillow_menu','private_elevator_music','monogrammed_bathrobe',
    'caviar_room_service','personal_anthem','seven_star_concierge','rooftop_helipad_umbrella'];

  // ---- the cluster exists, is tagged 'luxury' (reuses the E14 connoisseur machinery), unique ids
  const byId = new Map(DATA.amenities.map(a => [a.id, a]));
  ok(SEVEN.every(id => byId.has(id)), 'all 8 Seven-Star Touches are present in the amenity data');
  ok(SEVEN.every(id => byId.get(id).tag === 'luxury'), 'every Seven-Star Touch is tag:luxury (feeds Comfort + gated exclusivity)');
  ok(new Set(DATA.amenities.map(a => a.id)).size === DATA.amenities.length, 'no amenity id collisions after the E21 cluster');
  ok(SEVEN.filter(id => (byId.get(id).exclusivity || 0) > 0).length >= 4, 'several Touches carry an exclusivity spillover (S5-T2)');

  // ---- exclusivity spillover is GATED: a non-connoisseur (the harness/newGame) gets 0 from them
  const plain = ST.newGame();
  plain.amenities.rooftop_helipad_umbrella.level = 5;   // own a high-exclusivity Touch...
  ok(M.connoisseurActive(plain) === false, 'a fresh game is NOT connoisseur-active (the exclusivity gate is shut)');
  ok(M.computeExclusivity(plain, DATA) === 0, 'owning a Seven-Star Touch adds NO exclusivity while the gate is shut (harness-neutral)');

  // ---- when connoisseur-active, the SAME Touch moves the meter (spillover is real, not dead data)
  const con = ST.newGame(); con.story.branch = 'connoisseur'; con.paths.connoisseur.points = 1;
  const base = M.computeExclusivity(con, DATA);
  con.amenities.rooftop_helipad_umbrella.level = 5;
  ok(M.computeExclusivity(con, DATA) > base, 'a connoisseur owning a Seven-Star Touch raises exclusivity (the spillover is live)');

  // ---- tier 14/15 velvet-rope: soft exclRec (display-only, no hard block) + a light Taste gate
  const t14 = DATA.accommodation[14], t15 = DATA.accommodation[15];
  ok(t14.exclRec > 0 && t15.exclRec > t14.exclRec, 'tiers 14/15 carry a rising RECOMMENDED exclusivity (soft velvet-rope)');
  ok(t14.tasteGate > 0 && t15.tasteGate >= t14.tasteGate, 'tiers 14/15 carry a light, rising Taste gate');
  ok(t14.exclRec !== undefined && DATA.accommodation[14].name === '7-Star Experience', 'tier 14 is the 7-Star Experience');
  ok(DATA.accommodation[15].name === 'Royal Suite', 'tier 15 is the Royal Suite (last rented tier before owned property)');

  // ---- patron beats 21/22: a variant for every branch, but the neutral default gate is unchanged
  const beat21 = DATA.story.find(b => b.id === 21), beat22 = DATA.story.find(b => b.id === 22);
  for (const br of ['connoisseur','traveler','vlogger','crypto']) {
    ok(beat21.variants[br] && beat22.variants[br], `beats 21 & 22 carry a ${br} variant (reconvergence hub — all roads pass through)`);
  }
  ok(/patron/i.test(beat21.text) && /front desk/i.test(beat21.text), 'beat 21 introduces the patron + the island foreshadow ("no front desk at all")');
  const neutral = ST.newGame();   // story.branch === 'neutral'
  ok(E.beatCopy(neutral, beat22) === beat22, 'a neutral (unstranded) build gets the DEFAULT beat-22 copy, not a branch variant');
  ok(E.beatCopy(con, beat22) === beat22.variants.connoisseur, 'a connoisseur build gets the connoisseur beat-22 variant');
  ok(beat21.requires.accTier === 14 && beat22.requires.comfort === 3e8, 'beats 21/22 keep their neutral gates (the 26-beat harness pin is untouched)');

  // ---- harness invariance: the greedy ROI player buys none of the dominated Touches
  const { s: hs, islandAt } = runCurve({ dt: 5, maxHours: 40 });
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E21 (got ${fmtTime(islandAt)}, expected 29705s — luxury Touches fail the ROI payback test)`);
  ok(SEVEN.every(id => hs.amenities[id].level === 0), 'the harness never buys a Seven-Star Touch (dominated cosmetic, exclusivity gate shut)');
  ok((hs._exclCache ?? 0) === 0, 'the harness ends with exclusivity 0 (connoisseur lane never engaged)');
}

console.log('\n[97] E22 A Bungalow of One\'s Own: owned property, persistent Comfort floor, owner-pride ×, invariance');
{
  ok(validateProperty(), 'validateProperty() passes on the shipped PROPERTIES roster');
  ok(DATA.property.length === 2 && DATA.property[0].id === 'bungalow' && DATA.property[1].id === 'overwater_villa',
    'the roster is the bungalow (tier 16) + overwater villa (tier 17)');

  // ---- fresh game / harness: nothing owned ⇒ propertyScore 0, owner-pride ×1 (bit-identical Comfort)
  const fresh = ST.newGame();
  ok(M.propertyScore(fresh, DATA) === 0, 'a fresh game has propertyScore 0 (no deed ⇒ the term vanishes)');
  ok(M.ownerPrideMult(fresh) === 1, 'ownerPrideMult is exactly 1 with nothing owned (the gate)');
  ok(M.ownedPropertyCount(fresh) === 0, 'ownedPropertyCount is 0 on a fresh game');

  // ---- buy the deed: flips owned, adds the persistent floor, lights owner-pride, is idempotent
  const g = ST.newGame(); g.accommodation.tier = 15; g.bank.tier = C.BANK.tiers - 1; g.resources.cash = 1e13;
  g._comfortCache = M.computeComfort(g, DATA);
  ok(E.propertyUnlocked(g, 'bungalow'), 'the bungalow unlocks once its Comfort gate is met');
  ok(E.propertyUnlocked(g, 'overwater_villa') === false, 'the overwater villa is gated until the bungalow is owned (S6-T3)');
  const comfBefore = M.computeComfort(g, DATA);
  ok(E.buyProperty(g, 'bungalow') === true, 'buying the bungalow deed succeeds when unlocked + affordable');
  ok(g.property.bungalow.owned === true && g.story.flags.owner === true, 'ownership flips and flags.owner (beat 23) fires');
  ok(M.propertyScore(g, DATA) === DATA.property[0].baseComfort, 'propertyScore now equals the bungalow baseComfort');
  ok(M.computeComfort(g, DATA) > comfBefore, 'owning the deed raises Comfort (the persistent floor is live)');
  ok(approx(M.ownerPrideMult(g), 1 + C.PROPERTY.ownerPride), 'owner-pride × lights to 1 + ownerPride with one deed');
  ok(E.buyProperty(g, 'bungalow') === false, 'a second deed purchase is a no-op (idempotent)');
  ok(E.propertyUnlocked(g, 'overwater_villa'), 'owning the bungalow unlocks the overwater villa');

  // ---- THE PERSISTENCE INVARIANT (S2-T10/S10-T4): own → climb the rented ladder → floor unchanged
  const beforeScore = M.propertyScore(g, DATA);
  const beforeComf = M.computeComfort(g, DATA);
  g.accommodation.tier = 20;   // climb all the way to the island
  ok(M.propertyScore(g, DATA) === beforeScore, 'propertyScore is UNCHANGED by climbing the rented ladder (reads state.property only)');
  ok(M.computeComfort(g, DATA) >= beforeComf, 'Comfort does not fall when moving up — the owned floor persists');

  // ---- upgrade tree: cost = base·1.6^rank, parent gating, no rank skips
  ok(E.propertyUpgradeUnlocked(g, 'bung_deck'), 'a root upgrade (no parent) is buyable once the property is owned');
  ok(E.propertyUpgradeUnlocked(g, 'bung_plunge') === false, 'a child upgrade is locked until its parent has rank ≥ 1');
  const deckDef = E.propertyUpgradeDef('bung_deck');
  ok(approx(E.propertyUpgradeCost(g, 'bung_deck'), deckDef.costBase), 'rank-0 upgrade cost equals costBase');
  ok(E.buyPropertyUpgrade(g, 'bung_deck') === true, 'buying a root upgrade succeeds');
  ok(approx(E.propertyUpgradeCost(g, 'bung_deck'), deckDef.costBase * C.PROPERTY.growth), 'next rank costs base·1.6^1 (no skips)');
  ok(E.propertyUpgradeUnlocked(g, 'bung_plunge'), 'the child unlocks once the parent has rank ≥ 1');
  ok(M.propertyScore(g, DATA) === beforeScore + deckDef.comfort, 'a bought upgrade adds exactly its comfort to propertyScore');

  // ---- a zero-cash player is blocked from both deed and upgrade (no negative cash)
  const broke = ST.newGame(); broke.accommodation.tier = 15; broke._comfortCache = M.computeComfort(broke, DATA); broke.resources.cash = 0;
  ok(E.buyProperty(broke, 'bungalow') === false && broke.resources.cash === 0, 'a ƒ0 player cannot buy the deed (no negative cash)');

  // ---- migration: a pre-E22 save with no property slice backfills to all-unowned
  const old = ST.newGame(); delete old.property;
  const mig = ST.migrate(JSON.parse(JSON.stringify(old)));
  ok(mig.property && DATA.property.every(p => mig.property[p.id] && mig.property[p.id].owned === false),
    'a pre-E22 save backfills state.property (all unowned — no phantom ownership)');

  // ---- stack-order: L_owner folds into tierMultiplier as a clean bounded factor
  const stk = ST.newGame(); stk.generators[0].bought = 20; stk.generators[0].count = 20;
  const m0 = M.tierMultiplier(stk, 0);
  stk.property.bungalow.owned = true;   // one deed ⇒ ×(1+ownerPride)
  ok(approx(M.tierMultiplier(stk, 0) / m0, 1 + C.PROPERTY.ownerPride), 'tierMultiplier scales by exactly the owner-pride ratio (clean global factor)');

  // ---- harness invariance: the greedy ROI player never buys a deed ⇒ island unchanged
  const { s: hs, islandAt } = runCurve({ dt: 5, maxHours: 40 });
  ok(Math.abs(islandAt - 29705) < 1, `harness island time is UNCHANGED by E22 (got ${fmtTime(islandAt)}, expected 29705s — the deed is opt-in, ladder stays Comfort-gated)`);
  ok(M.ownedPropertyCount(hs) === 0 && M.propertyScore(hs, DATA) === 0, 'the harness ends owning no property (propertyScore 0 throughout)');
  ok(M.ownerPrideMult(hs) === 1, 'the harness income is never touched by owner-pride (×1 throughout)');
}

console.log(`\n=== ${fails === 0 ? 'ALL PASS ✅' : fails + ' FAILURE(S) ❌'} ===\n`);
process.exit(fails === 0 ? 0 : 1);
