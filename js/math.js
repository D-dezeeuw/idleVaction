// math.js — pure economy formulas. Mirrors docs/01-math-foundation.md.
// All functions take (state, ...) and return numbers. No mutation, no globals.

import { CONFIG as C } from './config.js';
import { clamp, rng } from './util.js';

// ---- tier ladder ----
// Soft-capped milestone multiplier. The n-th unit's cost is base·growth^n, so a greedy
// player has bought ≈ log_growth(cash) units → an *un*capped 2^(bought/step) would equal
// cash^(ln2/(step·ln growth)) (a positive power of cash), which compounds across the 8-tier
// chain into super-exponential, finite-time blow-up (and double overflow in ~9 min — see
// docs/math-proof.md). Capping the exponential part at KNEE doublings, then going linear,
// keeps the early dopamine while making the tail scale ∝ bought (log in cash) → tame.
export function milestoneMult(bought) {
  const m = Math.floor(bought / C.MILESTONE_STEP);
  const knee = C.MILESTONE_SOFT_KNEE;
  if (m <= knee) return Math.pow(C.MILESTONE_MULT, m);
  return Math.pow(C.MILESTONE_MULT, knee) * (1 + C.MILESTONE_SOFT_LIN * (m - knee));
}
export function unitCost(k, bought) {
  return C.GEN.base[k] * Math.pow(C.GEN.growth[k], bought);
}

// L_upgrade: per-tier bought "renovation" upgrades (E05's headline layer, wired since
// E03 via engine.buyGenUpgrade / state.generators[k].upgrades). Additive within its own
// layer, per the master stacking rule — pure and testable in isolation.
export function upgradeMult(bought) {
  return 1 + C.L_UPGRADE_RATE * (bought || 0);
}

// ---- multiplier stack: additive within a layer, multiplicative across ----
// scope tags let a bonus target 'all' or specific tiers/tags (e.g. 'social').
export function tierMultiplier(state, k) {
  const g = state.generators[k];
  const mMilestone = milestoneMult(g.bought);

  const L_upgrade = upgradeMult(g.upgrades);

  // L_path: paths that target social tiers (k=1,2 → followers/sponsors) get a boost
  const social = (k === 1 || k === 2);
  const vlog = state.paths.vlogger.points;
  const L_path = 1 + (social ? C.PATH.rate * Math.pow(vlog, C.PATH.softcapExp) : 0)
                   + C.PATH.rate * Math.pow(state.paths.traveler.points, C.PATH.softcapExp) * 0.5;

  // L_skill: charisma boosts social tiers
  const L_skill = 1 + (social ? C.CHARISMA_RATE * state.skills.charisma.level : 0);

  // global layers
  const L_comfort = comfortMultiplier(state);
  const L_dest = destMultiplier(state);
  const L_ascension = 1 + 0.10 * (state.ascension.tree.compounding_interest || 0);
  const L_tree = treeIncomeMult(state);

  return mMilestone * L_upgrade * L_path * L_skill * L_comfort * L_dest * L_ascension * L_tree;
}

// production per second of tier k (in units of tier k output)
export function tierProd(state, k) {
  const g = state.generators[k];
  return g.count * C.GEN.perUnit[k] * tierMultiplier(state, k);
}

// ---- destinations (World Traveler backbone; E04) ----
// L_dest = Π(owned destinations' mult) — a flat, PERMANENT, GLOBAL × (never per-tier
// targeted), so it folds in alongside L_comfort in the stack above. `DATA` is passed
// explicitly (same pattern as computeComfort/amenityScoreTotal below) so math.js never
// imports data/ and the config→util→math→data chain stays acyclic.
export function destMult(state, DATA) {
  let m = 1;
  for (const d of DATA.destinations) {
    if (state.destinations[d.id]?.owned) m *= d.mult;
  }
  return m;
}
// tierMultiplier reads the per-tick cache (engine.tick sets state._destCache via
// destMult(state, DATA)) rather than DATA directly — mirrors comfortMultiplier()
// reading state._comfortCache just below.
export function destMultiplier(state) {
  return state._destCache ?? 1;
}

// ---- build paths: softcapped single-path preview (E04-S2-T3/S10-T2) ----
// Pure preview of one path's own softcap shape — `1 + rate·points^0.85` — used by the
// path-meter UI and tests. tierMultiplier's own L_path above stays the existing
// bespoke per-tier blend (vlogger/traveler mix on social tiers); this is a read-only
// "what would this path alone be worth" helper, not a second multiplier layer.
export function pathMult(points) {
  return 1 + C.PATH.rate * Math.pow(Math.max(0, points), C.PATH.softcapExp);
}

// ---- bank account ladder: the wallet cap (offline-lump control) ----
// Capacity of a given bank tier: base·growth^tier, except the LAST configured tier,
// which is uncapped (Infinity) so endgame D6–D8 purchases and NG+ magnitudes are never
// permanently soft-locked behind a finite top account. See config.BANK's comment for
// the full rationale (measured offline-lump runaway, docs/math-proof.md §11) and the
// ladder invariants; engine.gainCash is the single inflow clamp that reads this.
export function bankCapAt(tier) {
  if (tier >= C.BANK.tiers - 1) return Infinity;
  return C.BANK.base * Math.pow(C.BANK.growth, tier);
}
export function walletCap(state) {
  return bankCapAt(state.bank?.tier || 0);
}
// free room in the wallet right now — what engine.gainCash can actually bank.
export function walletRoom(state) {
  return Math.max(0, walletCap(state) - state.resources.cash);
}

// ---- comfort ----
export function accScore(tier) {
  return C.ACC.base * Math.pow(C.ACC.growth, tier);
}
export function amenityScoreTotal(state, DATA) {
  let s = 0;
  for (const a of DATA.amenities) {
    const lvl = state.amenities[a.id]?.level || 0;
    s += lvl * a.comfort;
  }
  return s;
}
// Comfort is an UNBOUNDED weighted sum (dominated by accScore at high tiers, so it
// tracks the accommodation ladder into the billions). Its *effect* on income is
// softcapped by the log in comfortMultiplier(), so growth stays sane. NOTE: the old
// `×(1+0.25·ascensions)` bonus was REMOVED with the ascension hard reset — post-reset
// power must come ONLY from tree abilities bought with Legacy, never from the ascension
// count itself (docs/math-proof.md §12; Ageless already covers "plusher later runs"
// through the same door as everything else: +Body levels → +Comfort).
export function computeComfort(state, DATA) {
  return C.COMFORT.wAcc * accScore(state.accommodation.tier)
       + C.COMFORT.wAmen * amenityScoreTotal(state, DATA)
       + C.COMFORT.wBody * state.skills.body.level;
}
// Comfort required to unlock a given accommodation tier (see config.ACC.unlockFrac).
export function accUnlockComfort(tier) {
  return accScore(tier) * C.ACC.unlockFrac;
}
// Ascension gate scaling (config.ASCEND_GATE, docs/math-proof.md §12): the CASH cost of
// accommodation tier t is multiplied by base^(ascensions·(t/span)^exp). Parabolic in
// tier — ×1 at the shed regardless of count (fresh ascensions feel fast early), ×base
// per ascension at the island — and exactly ×1 for the whole first run (count 0), so
// the fitted golden curve and the harness-invariance pins never move. Applies to the
// COST only, never the Comfort unlock gate (accUnlockComfort above stays count-free),
// so the wallet/bank ladder is what paces ascended runs, on-theme.
// The gate's strength grows as count^countExp (0.5 = √) rather than linearly in the
// ascension count: tree power arrives on a √N Legacy arc (see ascCashNorm below), so a
// linear gate exponent outruns it forever (measured: runs climbed ~2h+ per ascension
// without bound), while a √-count gate rises on the SAME curve the tree does — the two
// roughly balance into a stable ≥8h band (docs/math-proof.md §12).
function ascGateScale(count) {
  return Math.pow(Math.max(0, count), C.ASCEND_GATE.countExp);
}
export function ascGateMult(state, tier) {
  const a = state.ascension.count;
  if (a <= 0 || tier <= 0) return 1;
  const frac = Math.min(1, tier / C.ASCEND_GATE.span);
  return Math.pow(C.ASCEND_GATE.base, ascGateScale(a) * Math.pow(frac, C.ASCEND_GATE.exp));
}
// Legacy deflator: gate-scaled runs earn ≈ base^count MORE raw cash per run (measured —
// the gate inflates every price, so income inflates with it), and a CASH-based Legacy
// payout would feed that inflation straight back into tree power, collapsing later runs
// (the snowball measured in docs/math-proof.md §12). So the Legacy metric
// (stats.lifetimeCashThisTree) is credited with banked/ascCashNorm — run-1-equivalent
// cash — making the payout gate-invariant: every ascension contributes ~equal weight
// and total Legacy follows the designed √N arc no matter how inflated later runs'
// nominal prices get. The √-telescoping (legacyBanked) is untouched — it telescopes on
// the same deflated counter consistently.
export function ascCashNorm(state) {
  return Math.pow(C.ASCEND_GATE.base, ascGateScale(state.ascension.count));
}
export function comfortMultiplier(state) {
  const comfort = state._comfortCache ?? 0;
  return 1 + C.COMFORT.MULT * Math.log10(1 + comfort / C.COMFORT.C0);
}

// ---- skills ----
export function xpToNext(level) { return C.SKILL.base * Math.pow(C.SKILL.growth, level); }
// Cumulative XP required to REACH a given level (Σ_{i<level} xpToNext(i)) — a pure,
// independent helper for the Skills panel's progress bar (E09-S3-T2). Deliberately NOT
// shared with levelFromXp's own accumulate-as-you-go loop below (which stays untouched,
// already tested) — this just re-derives the same boundary for display.
export function cumXpForLevel(level) {
  let spent = 0;
  for (let i = 0; i < level; i++) spent += xpToNext(i);
  return spent;
}
export function levelFromXp(xp) {
  let lvl = 0, need = C.SKILL.base, spent = 0;
  while (spent + need <= xp) { spent += need; lvl++; need = xpToNext(lvl); }
  return lvl;
}
export function commsCostMult(state) {
  return clamp(1 - C.COMMS_DISCOUNT * state.skills.comms.level, 1 - C.COMMS_DISCOUNT_CAP, 1)
       * treeCostMult(state);
}
// Pure "what is this level worth right now" preview helpers for the Skills panel
// (E09-S3-T3/T5, mirrors pathMult()'s preview convention above): tierMultiplier's own
// L_skill blend and commsCostMult's own clamp (both above) stay the SOLE sources of
// truth for the real multiplier stack / purchase costs — these just expose the same
// formulas for display without duplicating (and risking drift from) that logic.
export function charismaMult(level) { return 1 + C.CHARISMA_RATE * level; }
export function commsDiscountPct(level) { return clamp(C.COMMS_DISCOUNT * level, 0, C.COMMS_DISCOUNT_CAP); }
export function savvyPassive(state) {
  return state.skills.savvy.level * C.SAVVY_YIELD * Math.sqrt(Math.max(0, state.stats.lifetimeCash));
}

// ---- energy: optional clicker fuel (E10 "Body & Soul") ----
// Pure functions of Body level only; engine.tick clamps the STORED energy into
// [0, energyMax(state)] every tick. Neither is ever read by tierProd/tierMultiplier/
// computeComfort, so energy can't affect idle income or pacing (see config.js's ENERGY
// comment) — a fitter Body just gets a bigger, faster-refilling clicker tank.
export function energyMax(state) {
  return C.ENERGY.base * (1 + C.ENERGY.perBody * state.skills.body.level);
}
export function energyRegenRate(state) {
  return C.ENERGY.regen * (1 + C.ENERGY.perBody * state.skills.body.level);
}

// ---- vlogger clout economy (E12 "Lights, Camera, Clout") ----
// Sum of every owned content tier's OWN contentRate (times its Clout-priced "boost"
// layer, engine.buyContentBoost) plus any creator-gear (tag:'gear') amenity's
// contentRate — additive, mirrors amenityScoreTotal's shape exactly. DATA is passed
// explicitly (same convention as amenityScoreTotal/destMult above) so math.js never
// imports data/ and the config→util→math→data chain stays acyclic.
export function contentRateTotal(state, DATA) {
  let s = 0;
  for (const c of DATA.content) {
    const st = state.content[c.id];
    if (!st) continue;
    s += st.level * c.contentRate * (1 + c.boostRate * st.boosts);
  }
  for (const a of DATA.amenities) {
    if (a.tag !== 'gear' || !a.contentRate) continue;
    s += (state.amenities[a.id]?.level || 0) * a.contentRate;
  }
  return s;
}

// the currently-active sponsor's Clout ×, or 1 if none — engine.tickSponsors owns
// expiry/rolling the offer; this is a pure read of the cached state (mirrors
// destMultiplier reading state._destCache just above).
export function sponsorMult(state) {
  return state.sponsors.active ? state.sponsors.active.mult : 1;
}

// Extra combo HEADROOM for the vlogger branch (E12-S7-T2, "stronger combo window" —
// the perk text already shipped in data/paths.js) — ADDED to the fitted
// CLOUT.comboMax, never replacing it; engine.click is the only reader (engine.
// decayCombo deliberately keeps using the base comboMax for its decay RATE, unchanged
// — see config.CLOUT's comment).
export function effectiveComboMax(state) {
  return C.CLOUT.comboMax + (state.story.branch === 'vlogger' ? C.CLOUT.vloggerComboBonus : 0);
}

// dClout/dt (E12-S2-T1): the single pure source of truth for Clout production —
// previously computed inline in engine.tick; pulled out here, UNCHANGED, so it's
// testable in isolation (E12-S10-T1). Folds in the base rate + content tiers/gear, the
// charisma feedback, the active-play combo, the vlogger branch perk + its existing
// path-point bonus (both preserved bit-for-bit from the original inline formula — see
// docs/coverage.md E12 notes, "already exist, don't rebuild"), the "Magnetic" ascension
// perk, and any accepted sponsor deal. Never mutates state, never touches tierProd/
// tierMultiplier/computeComfort — Clout is a second currency that does not feed the
// cash multiplier stack, so nothing here can move the harness's island time.
export function cloutRate(state, DATA) {
  const base = C.CLOUT.contentRate + contentRateTotal(state, DATA);
  const charisma = 1 + C.CLOUT.charismaBoost * state.skills.charisma.level;
  const combo = state._combo ?? 1;
  const vloggerPerk = 1 + C.CLOUT.vloggerPerk * Math.sign(state.paths.vlogger.points);
  const magnetic = 1 + 0.1 * (state.ascension.tree.magnetic || 0);
  const pathBoost = 1 + state.paths.vlogger.points * 0.05;
  const sponsor = sponsorMult(state);
  return base * charisma * combo * vloggerPerk * magnetic * pathBoost * sponsor;
}

// ---- permanent skill tree effects ----
export function treeIncomeMult(state) {
  const t = state.ascension.tree;
  // Sun-Kissed = permanent income multiplier. (Second Wind is a timed window,
  // applied in the engine, not here.)
  return Math.pow(1.15, t.sun_kissed || 0);
}
export function treeCostMult(state) {
  const t = state.ascension.tree;
  return Math.max(0.4, Math.pow(0.97, t.silver_tongue || 0)); // -3%/rank, floor 40%
}

// ---- crypto portfolio + seeded market (E13 "Money Works While You Tan") ----
// Everything below only ever scales crypto coin YIELD (a cash source that is exactly
// zero while no coin is held) — never tierProd/tierMultiplier/savvyPassive, so none of
// it can move the harness's max-speed island time (see engine.js's cryptoActive gate).

// current buy price of the NEXT unit at a given held-count (mirrors math.unitCost's
// shape for the D1..D8 ladder, scoped to one coin row).
export function coinUnitCost(coin, held) {
  return coin.costBase * Math.pow(coin.costGrowth, held);
}
// "what would it cost to rebuy this stack right now" — a simple, consistent portfolio
// value for the UI/tests (NOT fed into savvyPassive's sqrt(lifetimeCash) — that formula
// is untouched, see docs/coverage.md E13 notes: "already exists, don't rebuild").
export function cryptoHoldingsValue(state, DATA) {
  let v = 0;
  for (const c of DATA.crypto.coins) {
    const held = state.crypto.holdings[c.id] || 0;
    if (held <= 0) continue;
    v += held * coinUnitCost(c, Math.max(0, held - 1));
  }
  return v;
}
// wallet cash + portfolio value — a display-only "net worth" readout (E13-S2-T3's
// intent), kept entirely separate from savvyPassive's own lifetimeCash input.
export function cryptoNetWorth(state, DATA) {
  return state.resources.cash + cryptoHoldingsValue(state, DATA);
}

// one-time cash HEDGES (data/crypto.js) sum toward, but are capped short of, full crash
// immunity; combined multiplicatively with the Unshakeable ascension node (data/
// skilltree.js) so rank 1 alone exactly halves crash DEPTH (1 - rawMult) — see
// engine.marketTick, which applies this to a freshly-drawn crash event's magnitude.
export function crashDampTotal(state, DATA) {
  let hedgeDamp = 0;
  for (const h of DATA.crypto.hedges) if (state.crypto.hedges[h.id]) hedgeDamp += h.crashDamp;
  hedgeDamp = Math.min(hedgeDamp, 0.9);
  const rank = state.ascension.tree.unshakeable || 0;
  const unshakeableDamp = 1 - Math.pow(0.5, rank);
  const total = 1 - (1 - hedgeDamp) * (1 - unshakeableDamp);
  return Math.min(total, C.MARKET.maxCrashDamp);
}
// HEDGES' varianceDamp shrinks the baseline "chop" jitter (below) — additive, capped.
export function varianceDampTotal(state, DATA) {
  let d = 0;
  for (const h of DATA.crypto.hedges) if (state.crypto.hedges[h.id]) d += h.varianceDamp;
  return Math.min(d, 0.8);
}

// A slow, SEEDED wobble — always present while the market is active, so the ticker
// never sits dead flat between scheduled events (E13-S4-T4). Pure function of
// (state.market.seed, state.stats.runSec): a deterministic step index (not wall-clock),
// so online ticks and an offline macro-step replay draw the identical wobble for the
// same runSec. Uses a cursor namespace disjoint from engine.marketTick's own
// state.market.cursor counter (offset 1e6) so the two seeded streams never collide.
const MARKET_JITTER_PERIOD_SEC = 20;
export function marketBaselineJitter(state, DATA) {
  const idx = Math.floor((state.stats.runSec || 0) / MARKET_JITTER_PERIOD_SEC);
  const r = rng(state.market.seed, 1e6 + idx);
  const damp = 1 - varianceDampTotal(state, DATA);
  return 1 + (r * 2 - 1) * C.MARKET.tickVolatility * damp;
}
// marketMult = baseline jitter · the currently active event's (already-damped) mult —
// clamped to config.MARKET's floor/cap regardless, so a crash never zeroes income and a
// boom never runs away (E13-S4-T3/T10, "keep crashes bounded regardless").
export function marketMult(state, DATA) {
  const jitter = marketBaselineJitter(state, DATA);
  const eventMult = state.market.mult ?? 1;
  return clamp(jitter * eventMult, C.MARKET.crashFloor, C.MARKET.boomCap);
}

// dCash/dt from owned coins alone — EXACTLY zero with no holdings (no sqrt/log
// weirdness possible), scaled by the existing generic single-path softcap preview
// (pathMult, reused rather than forking a second L_path formula into tierMultiplier)
// and by the live marketMult. Feeds engine.tick's cashGain (and, via the existing
// trickleXp, ordinary Savvy XP) — never a second currency.
export function cryptoYieldPerSec(state, DATA) {
  let base = 0;
  for (const c of DATA.crypto.coins) base += (state.crypto.holdings[c.id] || 0) * c.yieldPerUnit;
  if (base <= 0) return 0;
  return base * pathMult(state.paths.crypto.points) * marketMult(state, DATA);
}

// ---- prestige ----
export function legacyGain(state) {
  const raw = C.LEGACY_K * Math.pow(state.stats.lifetimeCashThisTree / C.LEGACY_SCALE, C.LEGACY_EXP);
  return Math.max(0, Math.floor(raw) - state.ascension.legacyBanked);
}
