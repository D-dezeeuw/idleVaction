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
  const rand = rng(20230721);
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

console.log(`\n=== ${fails === 0 ? 'ALL PASS ✅' : fails + ' FAILURE(S) ❌'} ===\n`);
process.exit(fails === 0 ? 0 : 1);
