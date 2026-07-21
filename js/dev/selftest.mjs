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
import { fmt, fmtTime, rng } from '../util.js';
// E11 harness-invariance guard ([62] below): importing runCurve does NOT auto-run the
// harness's own report() — that's guarded behind `process.argv[1].endsWith('harness.mjs')`,
// which is false when node's entry point is THIS file.
import { runCurve } from './harness.mjs';

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
  ok(!('staff' in ST.newGame()), 'no staff state exists yet — the staffHint is pure flavor, it activates nothing (E08-S4-T10)');

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
    const ascBonus = 1 + 0.25 * rk.ascension.count;
    const dComf = a.comfort * C.COMFORT.wAmen * ascBonus;
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
  // state.concierge — and confirm the reported island time matches this epic's
  // baseline (~8h26m55s = 30415s) exactly, not just "some plausible number".
  const { islandAt, peakLog } = runCurve({ dt: 5, maxHours: 40 });
  ok(islandAt !== null, 'the harness still reaches the island (tier 20) within the cap');
  ok(Math.abs(islandAt - 30415) < 1, `harness island time is UNCHANGED by E11 (got ${fmtTime(islandAt)}, expected ~8h26m55s / 30415s)`);
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
  ok(Math.abs(islandAt - 30415) < 1, `harness island time is UNCHANGED by E12 (got ${fmtTime(islandAt)}, expected ~8h26m55s / 30415s)`);
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
  const before = M.cloutRate(s, DATA);
  const pathBefore = s.paths.vlogger.points;
  ok(E.buyContent(s, c0.id), 'buying an unlocked, affordable content tier succeeds');
  ok(s.content[c0.id].level === 1, 'content level increments by exactly 1 per buy');
  ok(s.paths.vlogger.points > pathBefore, 'a content-tier purchase grants a small one-off vlogger path-point nudge (E12-S7-T4)');
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

// ---------- 74. E12 regression: no lock-in — neutral branch still earns Clout, mixed
// builds never punished (E12-S7-T8/T9, S10-T10). ----------
console.log('\n[74] E12 regression: no lock-in — neutral branch still earns Clout, mixed builds never punished');
{
  const neutral = ST.newGame();
  ok(neutral.story.branch === 'neutral', 'sanity: fresh game starts neutral');
  E.tick(neutral, 1);
  ok(neutral.resources.clout > 0, 'a neutral-branch player still earns baseline Clout');

  const mixed = ST.newGame();
  mixed.resources.cash = 1e9;
  ok(E.buyPathFocus(mixed, 'vlogger'), 'buying vlogger path focus succeeds');
  ok(E.buyPathFocus(mixed, 'traveler'), 'buying traveler path focus ALSO succeeds — paths are never mutually exclusive');
  ok(E.buyPathFocus(mixed, 'crypto'), 'buying crypto path focus ALSO succeeds — a mixed build is never punished or stranded');
  ok(mixed.paths.vlogger.points > 0 && mixed.paths.traveler.points > 0 && mixed.paths.crypto.points > 0,
    'all three paths carry independent, simultaneous point totals');

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
  ok(Math.abs(islandAt - 30415) < 1, `harness island time is UNCHANGED by E13 (got ${fmtTime(islandAt)}, expected ~8h26m55s / 30415s)`);
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

console.log(`\n=== ${fails === 0 ? 'ALL PASS ✅' : fails + ' FAILURE(S) ❌'} ===\n`);
process.exit(fails === 0 ? 0 : 1);
