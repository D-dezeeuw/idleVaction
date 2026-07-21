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

console.log(`\n=== ${fails === 0 ? 'ALL PASS ✅' : fails + ' FAILURE(S) ❌'} ===\n`);
process.exit(fails === 0 ? 0 : 1);
