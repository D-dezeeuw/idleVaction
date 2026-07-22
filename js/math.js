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

  // L_path: paths that target social tiers (k=1,2 → followers/sponsors) get a boost.
  // The committed path's stage bonuses join ADDITIVELY within this layer (house rule):
  // 'social' (vlogger's Verified Blue) on social tiers, 'global' (traveler's
  // Continental Fixture) on all tiers — flat data constants, see computePathBonuses.
  const social = (k === 1 || k === 2);
  const vlog = state.paths.vlogger.points;
  const L_path = 1 + (social ? C.PATH.rate * Math.pow(vlog, C.PATH.softcapExp) : 0)
                   + C.PATH.rate * Math.pow(state.paths.traveler.points, C.PATH.softcapExp) * 0.5
                   + (social ? pathBonus(state, 'social') : 0)
                   + pathBonus(state, 'global');

  // L_skill: charisma boosts social tiers
  const L_skill = 1 + (social ? C.CHARISMA_RATE * state.skills.charisma.level : 0);

  // global layers
  const L_comfort = comfortMultiplier(state);
  const L_dest = destMultiplier(state);
  // L_exclusivity (E14 "Acquired Taste"): a NEW global layer, same bounded-log shape as
  // L_comfort, reading the per-tick state._exclCache (engine.tick sets it before this snapshot,
  // mirroring _comfortCache/_destCache). It is EXACTLY 1 whenever the connoisseur system is
  // inactive (exclCache 0), so the greedy-vlogger harness is unmoved — see exclusivityMult.
  const L_exclusivity = exclusivityMult(state);
  // L_logistics (E15 "Keys to the Coupe"): a NEW global layer, a BOUNDED flat × (the equipped
  // fleet is capped by availableSlots, a small integer — never a power of cash), same safe
  // class as L_dest. Reads the per-tick state._logiCache (engine.tick sets it via
  // logisticsMult(state, DATA) before this snapshot, mirroring _exclCache/_destCache). It is
  // EXACTLY 1 whenever no car is equipped (the gate), so the greedy-vlogger harness is
  // unmoved — see logisticsMult / logisticsMultiplier.
  const L_logistics = logisticsMultiplier(state);
  // L_staff (E20 household): a bounded flat × from hired income-× roles, morale-scaled. Exactly 1
  // when no such role is hired (the gate) — the harness never hires, so the island is unmoved.
  const L_staff = staffMultiplier(state);
  // L_owner (E22 owner-pride): a small bounded flat × per owned property. Exactly 1 with no deed
  // bought (the gate) — the harness never buys property, so the island is unmoved. Read directly
  // off state.property (owned count ≤ 2), no per-tick cache needed (docs/math-proof §3 bounded-flat).
  const L_owner = ownerPrideMult(state);
  // L_estate (E23 property×staff synergy): sqrt-softened, exactly 1 when no estate staff are
  // assigned or no property is owned — the harness never engages it, so the island is unmoved.
  const L_estate = estateMultiplier(state);
  // L_island (E27 relocation reward): a bounded flat × once the private island is bought. Exactly 1
  // while unowned — the harness never buys the island (0 legacy, never sees beat 28), so it's unmoved.
  const L_island = islandMult(state);
  const L_ascension = 1 + 0.10 * (state.ascension.tree.compounding_interest || 0);
  const L_tree = treeIncomeMult(state);
  // L_legend (E29 meta-meta income perks) + L_ngplus (NG+ persistent income ×). Both exactly 1 at
  // zero state — the harness never Legends or NG+s, so the fitted island time is unmoved.
  const L_legend = legendMultiplier(state);
  const L_ngplus = ngPlusIncomeMult(state);
  // L_achieve (E30 completionist ×, meta-gated) + L_seasonal (live-ops, island-gated). Both exactly
  // 1 for the harness (unlocks only reward-0 trophies, never owns the island) — the island is unmoved.
  const L_achieve = achieveMultiplier(state);
  const L_seasonal = seasonalMultiplier(state);

  return mMilestone * L_upgrade * L_path * L_skill * L_comfort * L_dest * L_exclusivity * L_logistics * L_staff * L_owner * L_estate * L_island * L_ascension * L_tree * L_legend * L_ngplus * L_achieve * L_seasonal;
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
  let premiumOwned = 0;
  for (const d of DATA.destinations) {
    if (state.destinations[d.id]?.owned) { m *= d.mult; if (d.premium) premiumOwned++; }
  }
  // E24 premium set-collection bonus: an escalating GLOBAL × for owning many of the rich's hiding
  // spots. 1 for 0–1 owned (the harness owns 0 ⇒ this is exactly 1 and the island is unmoved).
  m *= destSetMult(premiumOwned);
  return m;
}
// The premium set bonus for owning `n` premium destinations, from config.DEST.setBonus (clamped to
// the table's last entry above 5). Exactly 1 for n ≤ 1 — the gate is baked into the table.
export function destSetMult(n) {
  const t = C.DEST.setBonus;
  return t[Math.min(n, t.length - 1)] ?? 1;
}
// how many premium destinations are currently owned (UI + set-bonus readout). 0 for the harness.
export function premiumDestOwned(state, DATA) {
  let n = 0;
  for (const d of DATA.destinations) if (d.premium && state.destinations[d.id]?.owned) n++;
  return n;
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

// ---- committed-path stage bonuses (the branching-track layer) ----
// Aggregates every OPENED road's reached stages (data/paths.js `stages`, thresholds in
// points) into one flat {key: sum} bag: the committed branch always, plus — with the
// Jack of All Trades tree node — any secondary path explicitly opened via a focus
// purchase (focusBought > 0; mirrors engine.pathReceives, which is what gates the
// points themselves). Points can't accrue on unopened roads (engine.addPathPoints), so
// path-hopping earns nothing. Every value is a sum of flat data constants
// (validatePaths enforces the vocabulary) over at most the four data tracks, so this
// layer is bounded by construction even at Jack rank 3. DATA passed explicitly (house
// convention); engine.tick caches the result as state._pathBonus (recomputed after any
// point/branch change), and pathBonus() below is the cheap accessor the hot paths read
// — mirroring the _comfortCache/_destCache pattern exactly.
export function computePathBonuses(state, DATA) {
  const out = {};
  const jack = state.ascension.tree.jack_of_trades || 0;
  for (const p of DATA.paths) {
    const primary = p.id === state.story.branch;
    if (!primary && !(jack > 0 && state.paths[p.id].focusBought > 0)) continue;
    const pts = state.paths[p.id].points;
    for (const st of p.stages) {
      if (pts < st.at) break;
      for (const [k, v] of Object.entries(st.bonus)) out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}
export function pathBonus(state, key) {
  return (state._pathBonus && state._pathBonus[key]) || 0;
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
  // connoisseur stage bonuses (data/paths.js): flat, additive-within-source scalars on
  // the amenity/accommodation terms and one on the total — zero for every other path.
  //
  // E14 additions — BOTH are provably 0 for the non-connoisseur / no-collection case, so
  // computeComfort is BIT-IDENTICAL to before (x+0 and x·1 are exact in IEEE754) and the
  // fitted 29705s island cannot drift. amenityScoreTotal is left UNCHANGED (same array
  // accumulation order) so no summation-order re-association can perturb it:
  //   · connoisseur branch +25% luxury Comfort perk (E14-S2-T8/S7-T1): amenityScoreTotal
  //     already counts luxury amenities at 100%, so the perk adds a further luxPerk· of their
  //     comfort (and the same on owned collections). Applied ONLY on story.branch==='connoisseur'.
  //   · owned collection assets feed ComfortRaw at count·comfort for EVERY branch (E14 brief),
  //     via collectionComfortTotal — 0 with nothing owned.
  const conn = state.story.branch === 'connoisseur';
  const collComfort = collectionComfortTotal(state, DATA);
  const luxBonus = conn
    ? (luxuryAmenityComfort(state, DATA) + collComfort) * C.TASTE.luxuryComfortPerk
    : 0;
  // E15 addition — equipped cars' flat Comfort (fleetComfortTotal), added exactly like the
  // E14 collection Comfort term. Provably 0 for the non-logistics case (nothing equipped),
  // so computeComfort stays BIT-IDENTICAL for the greedy vlogger (x+0 is exact in IEEE754)
  // and the fitted 29705s island cannot drift. amenityScoreTotal's own accumulation order is
  // left UNCHANGED so no summation re-association can perturb it.
  const fleetComfort = fleetComfortTotal(state, DATA);
  const amenTerm = amenityScoreTotal(state, DATA) + collComfort + luxBonus + fleetComfort;
  // E22 owned property — the PERSISTENT term. propertyScore reads state.property ONLY (never
  // accommodation.tier), so climbing the rented ladder never zeroes it. It is 0 with nothing
  // owned, so `... + wProp·0` is bit-identical to the pre-E22 sum (x+0 exact in IEEE754) and the
  // greedy harness (which never buys a deed) leaves the fitted 29705s island unmoved.
  const propScore = propertyScore(state, DATA);
  // E28 island buildings raise Comfort like amenities (via w_prop, the persistent-property weight —
  // they are permanent island structures). 0 unless the island is owned, so this is bit-identical
  // for a fresh game and the harness (never owns the island) — the 29705s island cannot drift.
  const buildComfort = buildingComfortTotal(state, DATA);
  return (C.COMFORT.wAcc * accScore(state.accommodation.tier) * (1 + pathBonus(state, 'accComfort'))
        + C.COMFORT.wAmen * amenTerm * (1 + pathBonus(state, 'amenityComfort'))
        + C.COMFORT.wProp * (propScore + buildComfort)
        + C.COMFORT.wBody * state.skills.body.level) * (1 + pathBonus(state, 'comfortAll'));
}
// E22 owned-property Comfort (the persistence guarantee): Σ owned properties' baseComfort +
// Σ their bought upgrades' comfort·rank. Reads state.property ONLY — never accommodation.tier — so
// climbing the rented ladder can never zero it. 0 when no property is owned (the gate), so the
// term vanishes for the harness and the pre-E22 economy is untouched. DATA passed explicitly
// (house convention). A pure function of state ⇒ deterministic, offline-replayable.
export function propertyScore(state, DATA) {
  const P = state.property;
  if (!P) return 0;
  let s = 0;
  for (const p of DATA.property) {
    const slot = P[p.id];
    if (!slot || !slot.owned) continue;
    s += p.baseComfort;
    for (const u of p.upgrades) s += (slot.upgrades?.[u.id] || 0) * u.comfort;
  }
  return s;
}
// Cost of the NEXT rank of a property upgrade: costBase · costGrowth^rank (geometric, growth 1.6).
export function propertyUpgradeCost(u, rank) {
  return u.costBase * Math.pow(u.costGrowth, rank);
}
// How many properties are owned (0, 1, or 2). Pure, tiny — read directly off state.property.
export function ownedPropertyCount(state) {
  const P = state.property;
  if (!P) return 0;
  let n = 0;
  for (const id in P) if (P[id]?.owned) n++;
  return n;
}
// Owner-pride global × (E22-S4-T5): a small BOUNDED flat × per owned property (docs/math-proof §3
// class: bounded-flat, safe to fold into the stack — NOT a power of cash). Exactly 1 with nothing
// owned (the gate), so the harness is unmoved; max ×(1 + ownerPride·4) with all deeds ⇒ ≤ +20%.
export function ownerPrideMult(state) {
  return 1 + C.PROPERTY.ownerPride * ownedPropertyCount(state);
}

// L_island (E27 relocation reward): a bounded flat × once the private island is owned (docs/math-proof
// §3 class: bounded-flat, safe — NOT a power of cash). Exactly 1 while unowned (the gate), so the
// harness — which never buys the island — is unmoved. Permanent: island.owned is a meta key that
// survives ascension, so the reward persists across runs (an earned, one-time endgame purchase).
export function islandMult(state) {
  return state.island?.owned ? C.ISLAND.incomeMult : 1;
}

// ---- island resort economy (E28 "Building Paradise") ----
// Building count / geometric cost (mirrors generators): costBase·costGrowth^count.
export function buildingCount(state, id) { return state.island?.buildings?.[id]?.count || 0; }
export function buildingCost(state, id, DATA) {
  const b = DATA.buildings.find(x => x.id === id);
  return b ? b.costBase * Math.pow(b.costGrowth, buildingCount(state, id)) : Infinity;
}
// Σ built comfort (feeds ComfortRaw like an amenity). 0 unless the island is owned — so a fresh game
// and the harness (never owns the island) leave computeComfort bit-identical (x+0 exact in IEEE754).
export function buildingComfortTotal(state, DATA) {
  if (!state.island?.owned) return 0;
  let s = 0;
  for (const b of DATA.buildings) s += buildingCount(state, b.id) * b.comfort;
  return s;
}
// guestDemand = GUEST_K·log10(1 + Comfort/GUEST_C0)·exclusivityMult — LOG-softcapped (no runaway),
// nudged by the exclusivity × (connoisseurs draw a richer crowd). A pure 0..∞ demand factor.
export function guestDemand(state) {
  const comfort = state._comfortCache ?? state.resources.comfort ?? 0;
  return C.GUEST_K * Math.log10(1 + comfort / C.GUEST_C0) * exclusivityMult(state);
}
// Raw guest income (before the M_k runtime stack): guestDemand·Σ(count·guestBase), milestone-doubled
// per building like a generator tier. EXACTLY 0 unless the island is owned (the gate) — the harness
// never owns it, so guest income never enters dCash and the fitted 29705s island cannot move.
export function guestIncomeRaw(state, DATA) {
  if (!state.island?.owned) return 0;
  let s = 0;
  for (const b of DATA.buildings) {
    const n = buildingCount(state, b.id);
    if (n <= 0) continue;
    const milestone = Math.pow(2, Math.floor(n / C.GUEST_MILESTONE_STEP));
    s += n * b.guestBase * milestone;
  }
  return s * guestDemand(state);
}
// Island upkeep — a scaling cash sink so "bigger" is a choice. Σ count·upkeepBase·upkeepGrowth^i.
// 0 unless owned. Subtracted from cash each tick (clamped ≥ 0 in the engine).
export function islandUpkeep(state, DATA) {
  if (!state.island?.owned) return 0;
  let s = 0;
  for (const b of DATA.buildings) {
    const n = buildingCount(state, b.id);
    if (n <= 0) continue;
    s += n * b.upkeepBase * Math.pow(b.upkeepGrowth, n) * C.UPKEEP_SCALE;
  }
  return s;
}
// Occupancy (0..1, a display metric): a saturating function of guestDemand — "how full is paradise".
export function occupancy(state) {
  const d = guestDemand(state);
  return d / (d + 1);
}

// ---- Legend + New Game+ (E29 "Empire of Leisure") ----
// L_legend: the meta-meta income × from the shop's 'income' perks. 1 with no perks bought (the
// harness never Legends), so it is exactly neutral. DATA passed explicitly (house convention);
// engine.tick caches the result as state._legendMult, which legendMultiplier() reads (like _staffMult).
export function computeLegendMult(state, DATA) {
  if (!state.legend?.perks) return 1;
  let m = 1;
  for (const p of DATA.legendPerks) {
    if (p.kind !== 'income') continue;
    const rank = state.legend.perks[p.id] || 0;
    if (rank > 0) m += p.value * rank;
  }
  return m;
}
export function legendMultiplier(state) { return state._legendMult ?? 1; }
// NG+ persistent income × = incomeMult^ngPlus (offsets the harder gates so cycles compress). Exactly
// 1 at ngPlus 0 (the harness), so it is neutral.
export function ngPlusIncomeMult(state) {
  const n = state.ngPlus || 0;
  return n <= 0 ? 1 : Math.pow(C.NGPLUS.incomeMult, n);
}
// NG+ CASH-gate hardening = gateScale^ngPlus (raises accommodation/story CASH gates). 1 at ngPlus 0.
// Applied in engine.accCostForTier — NOT to the Comfort unlock gate, so the harness (ngPlus 0) is
// bit-identical.
export function ngPlusGateMult(state) {
  const n = state.ngPlus || 0;
  return n <= 0 ? 1 : Math.pow(C.NGPLUS.gateScale, n);
}

// ---- achievements & live-ops (E30 "Legends of Leisure") ----
// L_achieve = 1 + Σ (unlocked achievements' reward), curved by ACHIEVE.rewardCap. Only meta/collection
// achievements carry reward > 0 (in-run trophies are reward 0), and the harness unlocks only reward-0
// trophies, so this is EXACTLY 1 for the fitted run. DATA passed explicitly; engine.tick caches it as
// state._achieveMult (achieveMultiplier reads it, like _legendMult).
export function computeAchieveMult(state, DATA) {
  const u = state.achievements?.unlocked;
  if (!u) return 1;
  let sum = 0;
  for (const a of DATA.achievements) if (u[a.id]) sum += a.reward || 0;
  return 1 + Math.min(C.ACHIEVE.rewardCap, sum);
}
export function achieveMultiplier(state) { return state._achieveMult ?? 1; }
// Seasonal live-ops ×: the active rotating destination's bounded mult, GATED on owning the island
// (a summit-era feature). 1 for the harness (never owns the island). cycleIndex drives rotation
// (days of playtime), a pure function so it is reload-stable.
export function seasonalMult(state, DATA) {
  if (!state.island?.owned) return 1;
  const days = Math.floor((state.meta?.playtimeMs || 0) / 86400000);
  const list = DATA.seasonal;
  if (!list || !list.length) return 1;
  const s = list[((days % list.length) + list.length) % list.length];
  return Math.min(C.ACHIEVE.seasonalMultCap, s.mult);
}
export function seasonalMultiplier(state) { return state._seasonalMult ?? 1; }

// ---- estate: grounds Comfort + property×staff synergy (E23 "Villa Vita") ----
// groundsScore: Σ bought tag:'grounds' amenities' comfort — a UI-facing selector (the nodes ALREADY
// feed ComfortRaw via amenityScoreTotal's w_amen, so this must NOT be added again — no double-count).
export function groundsScore(state, DATA) {
  let s = 0;
  for (const a of DATA.amenities) {
    if (a.tag !== 'grounds') continue;
    s += (state.amenities[a.id]?.level || 0) * a.comfort;
  }
  return s;
}
// propertyLevel: Σ owned properties' (1 + Σ their bought upgrade ranks) — grows with breadth AND
// depth. 0 when nothing is owned. The "scale" half of the synergy's sqrt(staff·property) term.
export function propertyLevel(state, DATA) {
  const P = state.property;
  if (!P) return 0;
  let lvl = 0;
  for (const p of DATA.property) {
    const slot = P[p.id];
    if (!slot?.owned) continue;
    lvl += 1;
    for (const u of p.upgrades) lvl += (slot.upgrades?.[u.id] || 0);
  }
  return lvl;
}
// assignedEstateStaff: count of hired estate roles bound to a grounds CLUSTER (garden/pool/court —
// the estate manager's 'synergy' slot is excluded here; it boosts the RATE instead). The "staff"
// half of the synergy term. 0 for the harness (never hires) ⇒ synergy stays 1.
export function assignedEstateStaff(state, DATA) {
  const staff = state.staff; if (!staff) return 0;
  let n = 0;
  for (const def of DATA.staff) {
    if (!def.estate || def.automates === 'synergy') continue;
    const st = staff[def.id];
    if (st?.hired && st.assignedTo && st.assignedTo !== 'synergy') n++;
  }
  return n;
}
// estateSynergyRate: the base ESTATE.synergyRate, amplified by (1+managerBoost) when the estate
// manager is hired and on the 'synergy' slot (the manager-of-managers effect, S4-T2).
export function estateSynergyRate(state, DATA) {
  let rate = C.ESTATE.synergyRate;
  const staff = state.staff;
  if (staff) {
    const mgr = DATA.staff.find(d => d.estate && d.automates === 'synergy');
    if (mgr && staff[mgr.id]?.hired && staff[mgr.id].assignedTo === 'synergy') rate *= (1 + C.ESTATE.managerBoost);
  }
  return rate;
}
// L_estate (E23-S2-T3): the property×staff synergy. 1 + rate·sqrt(assignedStaff·propertyLevel) —
// sqrt-SOFTENED (docs/05 §4 anti-runaway: the exponent on the interaction is ½, never a power of
// cash). EXACTLY 1 whenever no estate staff are assigned OR no property is owned (sqrt(0)=0), so a
// fresh newGame() and the greedy harness leave it at 1 and the fitted 29705s island cannot move.
export function estateSynergy(state, DATA) {
  const staff = assignedEstateStaff(state, DATA);
  if (staff <= 0) return 1;
  const lvl = propertyLevel(state, DATA);
  if (lvl <= 0) return 1;
  return 1 + estateSynergyRate(state, DATA) * Math.sqrt(staff * lvl);
}
// per-tick cache reader (engine.tick sets state._estateMult before the tierProd snapshot, mirroring
// _staffMult). Exactly 1 when the synergy system is inactive.
export function estateMultiplier(state) { return state._estateMult ?? 1; }
// sum of owned collection assets' flat Comfort (count·comfort) — feeds ComfortRaw for every
// branch (the connoisseur +25% perk in computeComfort adds on top). 0 with nothing owned.
export function collectionComfortTotal(state, DATA) {
  let s = 0;
  for (const arr of [DATA.collections.art, DATA.collections.wine]) {
    for (const a of arr) s += (state.collections[a.id]?.count || 0) * a.comfort;
  }
  return s;
}
// sum of owned tag:'luxury' (and, E16-S7-T2, tag:'yacht') amenities' Comfort (level·comfort) —
// the base the connoisseur +25% perk is a fraction OF (amenityScoreTotal already counts these at
// 100%). Connoisseur-gated in computeComfort ⇒ adding 'yacht' here is bit-identical for the
// vlogger harness (luxBonus stays 0 for a non-connoisseur).
export function luxuryAmenityComfort(state, DATA) {
  let s = 0;
  for (const a of DATA.amenities) {
    if (a.tag !== 'luxury' && a.tag !== 'yacht') continue;
    s += (state.amenities[a.id]?.level || 0) * a.comfort;
  }
  return s;
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
  return C.CLOUT.comboMax + (state.story.branch === 'vlogger' ? C.CLOUT.vloggerComboBonus : 0)
       + pathBonus(state, 'comboMax');   // vlogger stage 1 (First Thousand)
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
  const stage = 1 + pathBonus(state, 'cloutMult');   // vlogger stage 2 (The Algorithm Stirs)
  return base * charisma * combo * vloggerPerk * magnetic * pathBoost * sponsor * stage;
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
  // crypto stage 2 (Diamond Hands) folds in multiplicatively like the other sources;
  // the config.MARKET.maxCrashDamp clamp below still owns the never-full-immunity cap.
  const stageDamp = pathBonus(state, 'crashDamp');
  const total = 1 - (1 - hedgeDamp) * (1 - unshakeableDamp) * (1 - stageDamp);
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
  // crypto stages 1+4 (First Cold Wallet / The Whale Nods Back): flat +75% total at
  // full track — bounded by data, still exactly zero with no holdings.
  return base * pathMult(state.paths.crypto.points) * (1 + pathBonus(state, 'yieldMult'))
       * marketMult(state, DATA);
}

// ---- connoisseur economy (E14 "Acquired Taste") ----
// Everything below is a hard no-op until the connoisseur system is genuinely engaged — the
// gate below (points OR an owned collection asset) mirrors engine.cryptoActive EXACTLY, so a
// fresh newGame() and the committed-vlogger harness see exclusivity 0, luxuryCostMult 1, no
// appreciation — the fitted 29705s island cannot move. The multiplier folded into the stack
// is a bounded LOG (never a power of cash — docs/math-proof.md §3/§4).

// The gate (pure — math owns it so there's no engine↔math import cycle; engine.connoisseurActive
// re-exports it for API symmetry with cryptoActive). True iff a committed connoisseur life
// (path points>0) OR any collection asset is actually held (count>0).
export function connoisseurActive(state) {
  if ((state.paths.connoisseur?.points || 0) > 0) return true;
  const col = state.collections;
  if (col) for (const id in col) if ((col[id].count || 0) > 0) return true;
  return false;
}
// Bounded exclusivity SCORE. 0 when inactive (the gate). When active:
//   raw = Σ owned collections' count·exclusivity + Σ owned luxury amenities' level·(excl||0)
//   score = raw^softExp                                   (softExp<1 tames the sum, E14-S2-T3)
//         · (1 + setBonus per completed themed set)       (all ART and/or all WINE, E14-S4-T5)
//         · (1 + branchBonus  when branch==='connoisseur')(the branch × perk, E14-S7-T2)
//         · (1 + 0.1·goldenRatioRank)                     (Golden Ratio tree synergy, E14-S7-T8:
//            the data-side node is deferred to the skilltree owner; reads 0 today ⇒ ×1 no-op)
// Monotone in every owned quantity and softcapped (no cliff). DATA passed explicitly (house
// convention); engine.tick caches the result as state._exclCache (like _comfortCache).
export function computeExclusivity(state, DATA) {
  if (!connoisseurActive(state)) return 0;
  let raw = 0;
  for (const arr of [DATA.collections.art, DATA.collections.wine]) {
    for (const a of arr) raw += (state.collections[a.id]?.count || 0) * a.exclusivity;
  }
  for (const a of DATA.amenities) {
    if (a.tag !== 'luxury') continue;
    raw += (state.amenities[a.id]?.level || 0) * (a.exclusivity || 0);
  }
  if (raw <= 0) return 0;
  let score = Math.pow(raw, C.EXCLUSIVITY.softExp);
  const fullSet = arr => arr.every(a => (state.collections[a.id]?.count || 0) > 0);
  let setMult = 1;
  if (fullSet(DATA.collections.art)) setMult += C.EXCLUSIVITY.setBonus;
  if (fullSet(DATA.collections.wine)) setMult += C.EXCLUSIVITY.setBonus;
  score *= setMult;
  if (state.story.branch === 'connoisseur') score *= (1 + C.EXCLUSIVITY.branchBonus);
  score *= (1 + 0.1 * (state.ascension.tree.golden_ratio || 0));
  return score;
}
// L_exclusivity = 1 + rate·log10(1 + exclCache/E0) — reads the per-tick cache (like
// comfortMultiplier reads _comfortCache). Exactly 1 when the cache is 0 (system inactive).
export function exclusivityMult(state) {
  const e = state._exclCache ?? 0;
  return 1 + C.EXCLUSIVITY.rate * Math.log10(1 + e / C.EXCLUSIVITY.E0);
}
// Luxury purchase discount (E14-S2-T2): clamp(1 − discount·tasteLevel, 0.4, 1), the −60%
// floor at S8-T2. GATED to connoisseur-active — returns 1 otherwise — so the discount is the
// committed aesthete's "old-money haggle" and can NEVER cheapen the luxury amenities the
// greedy vlogger buys (which would move the fitted island). Applied to every tag:'luxury'
// purchase (engine.amenityCost / engine.assetCost).
export function luxuryCostMult(state) {
  if (!connoisseurActive(state)) return 1;
  return clamp(1 - C.TASTE.discount * state.skills.taste.level, 0.4, 1);
}
// PURE appreciation (E14-S4-T1): value = boughtValue·(1 + rate·globalRate)^ageYears, hard-
// capped at boughtValue·valueCap. Same (boughtValue, ageSec, rate) ⇒ same value, no
// wall-clock — age is game-time advanced in engine.tick, so offline replay is identical.
export function appreciationValue(boughtValue, ageSec, appreciationRate) {
  if (!(boughtValue > 0)) return 0;
  const years = Math.max(0, ageSec) / C.APPRECIATION.yearSec;
  const grown = boughtValue * Math.pow(1 + appreciationRate * C.APPRECIATION.globalRate, years);
  return Math.min(grown, boughtValue * C.APPRECIATION.valueCap);
}
// Value-preserving age blend for adding money INTO an already-aged stack (anti-pump —
// verifier fix). A stack stores ONE (boughtValue, age) pair, so a newly-bought copy would
// otherwise inherit the stack's full age — and its instant appreciation (up to
// valueCap·sellFrac ≈ ×7.6) was harvestable by an immediate sellAsset: a measured ZERO-TIME
// buy/sell money pump paying ~cost·(valueCap·sellFrac − 1) per cycle, forever (the cycle
// price is constant because count returns to 1, and age never reset because count never hit
// 0) — free cash AND unbounded lifetimeCash/Legacy inflation from clicking. The fix picks
// the new stack age so the stack's appreciated value is EXACTLY oldValue + addedValue (new
// money enters at ×1; held copies keep their exact current, capped value):
//   (B+P)·m(age') = B·min(m(age), cap) + P,   m(x) = (1 + rate·globalRate)^(x/yearSec)
// ⇒ age' = yearSec · ln(target)/ln(1+rate·globalRate), target = (B·mEff + P)/(B+P) ∈ [1,cap].
// EXACT value-neutrality (not a linear age dilution, which stays pump-able while the diluted
// age remains above the cap knee): buys can never mint value, sells extract at most the
// sellFrac haircut of value already earned by holding, so no buy/sell sequence profits.
// Pure (same inputs ⇒ same age'), age' ∈ [0, age] (monotone — age can never be forged UP),
// and the hard invariant value ≤ totalPaid·valueCap is untouched. Fresh stacks (B=0) and
// rate-0 assets (age is value-irrelevant, and ln(1)=0 would 0/0) return 0 = "ages from now".
export function appreciationBlendAge(boughtValue, ageSec, addedValue, appreciationRate) {
  if (!(boughtValue > 0)) return 0;
  const r = 1 + appreciationRate * C.APPRECIATION.globalRate;
  if (!(r > 1)) return 0;
  const mEff = appreciationValue(boughtValue, ageSec, appreciationRate) / boughtValue;
  const target = (boughtValue * mEff + addedValue) / (boughtValue + addedValue);
  return Math.log(target) / Math.log(r) * C.APPRECIATION.yearSec;
}
// display-only net worth of the whole collection (appreciated). Deliberately NOT fed into
// stats.lifetimeCash/lifetimeCashThisTree (the wallet-cap §11 / Legacy §12 invariants depend
// on those being banked-cash-only) — the mandated conservative choice, superseding S2-T7.
export function collectionNetWorth(state, DATA) {
  let v = 0;
  for (const arr of [DATA.collections.art, DATA.collections.wine]) {
    for (const a of arr) {
      const c = state.collections[a.id];
      if (!c || c.count <= 0) continue;
      v += appreciationValue(c.boughtValue, c.age, a.appreciationRate);
    }
  }
  return v;
}

// ---- private logistics: owned/equipped cars (E15 "Keys to the Coupe") ----
// GATED OFF like E14's connoisseur / E13's crypto: logisticsActive is true only once a car is
// EQUIPPED. A fresh newGame() and the committed-vlogger harness (which never buys or equips a
// car, and picks the vlogger branch — so the traveler discount is never in scope) see
// logisticsMult 1, fleetUpkeep 0, and no fleet Comfort — the fitted 29705s island cannot move.
// logisticsMult is a BOUNDED flat × (the equipped fleet is capped by availableSlots, a small
// integer), the SAME safe class as L_dest — never a positive power of cash (docs/math-proof.md
// §3/§4). DATA is passed explicitly (house convention) so math.js never imports data/.

// helper: look up a car row by id (linear scan over the small roster).
function carRow(DATA, id) { return DATA.vehicles.find(c => c.id === id); }

// available transport slots (E15-S2-T6): baseSlots + traveler branch perk (+1) + Wanderer's
// Instinct rank (+1/rank, data/skilltree.js) + the tier-11 garage-wing bonus (state.vehicles
// .garageSlots). A small number by design so fleet composition is a live tradeoff (S8-T4).
export function availableSlots(state) {
  return C.LOGISTICS.baseSlots
    + (state.story.branch === 'traveler' ? 1 : 0)
    + (state.ascension.tree.wanderer || 0)
    + (state.vehicles?.garageSlots || 0)
    + (state.vehicles?.boatSlots || 0)    // E16: owned boats grant transport slots (buyBoat maintains boatSlots)
    + (state.vehicles?.jetSlots || 0);    // E17: owned jets grant slots too (buyJet maintains jetSlots)
}
// highest owned boat tier — gates sea:true destinations (engine.destUnlocked). 0 with no boats.
export function boatTier(state, DATA) {
  let t = 0;
  for (const b of DATA.boats) if ((state.vehicles?.boats?.[b.id]?.count || 0) > 0) t = Math.max(t, b.tier);
  return t;
}
// highest owned jet tier — gates air:true destinations (E17). 0 with no jets.
export function jetTier(state, DATA) {
  let t = 0;
  for (const j of DATA.jets) if ((state.vehicles?.jets?.[j.id]?.count || 0) > 0) t = Math.max(t, j.tier);
  return t;
}
// the logistics capstone (E17-S2-T4): a car AND a boat AND a jet all owned. A distinct
// multiplicative × on L_logistics (config.LOGISTICS.capstone). False for the harness (no vehicles).
export function capstoneActive(state, DATA) {
  const v = state.vehicles;
  if (!v) return false;
  const anyCar = DATA.vehicles.some(c => (v.owned?.[c.id]?.count || 0) > 0);
  const anyBoat = DATA.boats.some(b => (v.boats?.[b.id]?.count || 0) > 0);
  const anyJet = DATA.jets.some(j => (v.jets?.[j.id]?.count || 0) > 0);
  return anyCar && anyBoat && anyJet;
}
// total crew capacity = Σ owned boats' crewCap; and current crew count = Σ owned crew.
export function crewCapTotal(state, DATA) {
  let cap = 0;
  for (const b of DATA.boats) cap += (state.vehicles?.boats?.[b.id]?.count || 0) * b.crewCap;
  return cap;
}
export function crewCount(state, DATA) {
  let n = 0;
  for (const c of DATA.crew) n += (state.vehicles?.crew?.[c.id]?.count || 0);
  return n;
}
// Σ slotCost of the currently-equipped fleet — engine.equipCar enforces this stays ≤
// availableSlots (never clamped silently, S2-T2/S10-T1).
export function equippedSlotCost(state, DATA) {
  let s = 0;
  for (const id of (state.vehicles?.equipped || [])) { const c = carRow(DATA, id); if (c) s += c.slotCost; }
  return s;
}
// the gate (pure — math owns it so there's no engine↔math import cycle; engine.logisticsActive
// re-exports it for API symmetry with cryptoActive/connoisseurActive). True iff any car is
// equipped (an OWNED-but-un-equipped car draws no upkeep and grants no ×, by design).
export function logisticsActive(state, DATA) {
  const v = state.vehicles;
  if ((v?.equipped || []).length > 0) return true;
  // E16: an OWNED boat or crew also turns the lane on (boats aren't "equipped" — owning is enough).
  if (v?.boats) for (const b of DATA.boats) if ((v.boats[b.id]?.count || 0) > 0) return true;
  if (v?.crew) for (const c of DATA.crew) if ((v.crew[c.id]?.count || 0) > 0) return true;
  if (v?.jets) for (const j of DATA.jets) if ((v.jets[j.id]?.count || 0) > 0) return true;   // E17
  return false;
}
// logisticsMult = 1 + rate·Σ(equipped car.mult) + boatRate·Σ(owned boat.mult) + crewRate·Σ(owned
// crew.mult) — a BOUNDED flat × (equipped fleet ≤ availableSlots; the boat ladder is 5 rungs;
// crew ≤ crewCapTotal), exactly 1 when nothing is equipped/owned (the gate). Additive within the
// one L_logistics layer, then multiplied across the stack (E16-S2-T1). engine.tick caches this as
// state._logiCache before the tier snapshot; tierMultiplier reads it via logisticsMultiplier().
export function logisticsMult(state, DATA) {
  if (!logisticsActive(state, DATA)) return 1;
  const v = state.vehicles;
  let carSum = 0;
  for (const id of v.equipped) { const c = carRow(DATA, id); if (c) carSum += c.logisticsMult; }
  let boatSum = 0;
  for (const b of DATA.boats) boatSum += (v.boats?.[b.id]?.count || 0) * b.mult;
  let crewSum = 0;
  for (const c of DATA.crew) crewSum += (v.crew?.[c.id]?.count || 0) * c.mult;
  let jetSum = 0;   // E17
  for (const j of DATA.jets) jetSum += (v.jets?.[j.id]?.count || 0) * j.mult;
  const base = 1 + C.LOGISTICS.rate * carSum + C.LOGISTICS.boatRate * boatSum
    + C.LOGISTICS.crewRate * crewSum + C.LOGISTICS.jetRate * jetSum;
  // E17 capstone: a DISTINCT × when car+boat+jet are all owned (the arc's payoff). ×1 otherwise.
  return base * (capstoneActive(state, DATA) ? (1 + C.LOGISTICS.capstone) : 1);
}
// the per-tick cache reader tierMultiplier uses (mirrors destMultiplier reading _destCache /
// exclusivityMult reading _exclCache). Exactly 1 when the cache is 1 (system inactive).
export function logisticsMultiplier(state) {
  return state._logiCache ?? 1;
}
// fleetUpkeep = Σ(equipped car.upkeep)·upkeepScale cash/s — 0 when nothing is equipped. A flat
// drain applied in engine.tick (clamped so cash never goes negative, online or offline).
export function fleetUpkeep(state, DATA) {
  const v = state.vehicles;
  if (!v) return 0;
  let up = 0;
  for (const id of (v.equipped || [])) { const c = carRow(DATA, id); if (c) up += c.upkeep; }
  // E16: owned boats + crew also draw upkeep (a hull is a money pit even at anchor).
  for (const b of DATA.boats) up += (v.boats?.[b.id]?.count || 0) * b.upkeep;
  for (const c of DATA.crew) up += (v.crew?.[c.id]?.count || 0) * c.upkeep;
  for (const j of DATA.jets) up += (v.jets?.[j.id]?.count || 0) * j.upkeep;   // E17: jets are the biggest drain
  return up * C.LOGISTICS.upkeepScale;
}
// equipped cars' flat Comfort (Σ comfort) — feeds computeComfort exactly like collection
// Comfort. 0 when nothing is equipped (⇒ computeComfort bit-identical for the harness).
export function fleetComfortTotal(state, DATA) {
  let s = 0;
  for (const id of (state.vehicles?.equipped || [])) { const c = carRow(DATA, id); if (c) s += c.comfort; }
  return s;
}
// combined destination-cost discount multiplier (E15-S2-T7/S7-T7, S8-T6): the committed
// traveler staged track's flat destDiscount, the traveler BRANCH −15% perk (branch-gated), and
// Wanderer's Instinct −20%/rank (tree node), all stacked MULTIPLICATIVELY, then clamped to a
// hard floor so the stack can never drive a destination implausibly cheap. Returns EXACTLY 1
// for a non-traveler with no wanderer rank and no destDiscount stage bonus (the greedy vlogger
// harness) ⇒ destCost — and the island — are unmoved.
export function destDiscountMult(state) {
  let m = 1 - pathBonus(state, 'destDiscount');                 // committed traveler staged track
  if (state.story.branch === 'traveler') m *= (1 - C.LOGISTICS.destDiscountTraveler);   // branch perk
  const wander = state.ascension.tree.wanderer || 0;
  if (wander > 0) m *= Math.pow(1 - C.LOGISTICS.wandererDestDiscount, wander);            // tree node
  // E17: owning ANY jet cuts destination cost (the jet collapses the cost side). No DATA needed —
  // a plain scan of the owned map. The vlogger harness owns no jet ⇒ no discount ⇒ island unmoved.
  const anyJet = state.vehicles?.jets && Object.values(state.vehicles.jets).some(j => (j.count || 0) > 0);
  if (anyJet) m *= (1 - C.LOGISTICS.jetDiscount);
  return Math.max(C.LOGISTICS.destDiscountFloor, m);   // floored — destinations never hit zero
}
// equipped cars' total speed (Σ speed) — engine.transportSpeed adds this to the active ride's
// speed, so a car shortens destCost exactly like transport does (E15-S2-T5). 0 with nothing
// equipped, so the harness's destCost is unchanged. Bounded (fleet ≤ slots).
export function fleetSpeed(state, DATA) {
  let s = 0;
  for (const id of (state.vehicles?.equipped || [])) { const c = carRow(DATA, id); if (c) s += c.speed; }
  return s;
}
// felt/UI travel time for a destination after the active ride + equipped fleet speed (E15-S2-T5,
// the "Rome: 40s → 22s" readout). Display-only — travelTime never feeds the income loop (the
// mechanical speed effect is the destCost shortening above), so this is a pure helper for the
// garage UI wave and cannot move the harness. totalSpeed is passed in by the caller (engine
// owns transportSpeed, which sums ride + pathBonus + fleetSpeed).
export function destTravelTime(baseTravelTime, totalSpeed) {
  return (baseTravelTime || 0) / (1 + Math.max(0, totalSpeed || 0));
}

// ---- staff & automation (E19 "At Your Service") ----
// Pure wage/cost functions — no magic numbers, all read from the staff def (data/staff.js).
// staffWage is the continuous payroll sink while hired; 0 for the harness (never hires).
export function staffWage(def, level) { return def.wageBase * Math.pow(def.wageGrowth, level || 0); }
export function staffHireCost(def) { return def.hireCost; }
export function staffLevelCost(def, level) { return def.levelCostBase * Math.pow(def.levelCostGrowth, level || 0); }
// total payroll cash/s across all HIRED staff — 0 when nobody is hired (harness-neutral).
export function payrollTotal(state, DATA) {
  let w = 0;
  for (const def of DATA.staff) {
    const st = state.staff?.[def.id];
    if (st?.hired) w += staffWage(def, st.level);
  }
  return w;
}
// E20 morale softcap: clamp(1 + rate·log10(1+morale/M0), min, max) — bounded, so a happy
// household helps but never runs away (docs/05 §4). Pure.
export function moraleMult(morale) {
  return clamp(1 + C.MORALE.rate * Math.log10(1 + Math.max(0, morale || 0) / C.MORALE.M0), C.MORALE.min, C.MORALE.max);
}
// E20 household income ×: a BOUNDED flat product over HIRED income-× roles (chef/trainer/driver/
// manager) of (1 + xMultBase·level·moraleMult(role.morale)). Exactly 1 when no such role is hired
// (the gate) — so the greedy harness (never hires) sees L_staff 1 and the fitted island is
// unmoved. Bounded by construction: ≤ ~6 roles, each a small morale-capped flat term. Housekeeper
// (xMultBase 0) contributes nothing here — it lifts morale in engine.staffTick instead.
export function staffMult(state, DATA) {
  const staff = state.staff; if (!staff) return 1;
  let m = 1;
  for (const def of DATA.staff) {
    if (!(def.xMultBase > 0)) continue;
    const st = staff[def.id];
    if (!st?.hired) continue;
    m *= 1 + def.xMultBase * st.level * moraleMult(st.morale);
  }
  return m;
}
// per-tick cache reader (like logisticsMultiplier). 1 when no income-× staff hired.
export function staffMultiplier(state) { return state._staffMult ?? 1; }

// ---- prestige ----
export function legacyGain(state) {
  const raw = C.LEGACY_K * Math.pow(state.stats.lifetimeCashThisTree / C.LEGACY_SCALE, C.LEGACY_EXP);
  return Math.max(0, Math.floor(raw) - state.ascension.legacyBanked);
}
