// engine.js — tick loop, purchases, unlocks, story, offline. Mutates state in place.
import { CONFIG as C } from './config.js';
import { DATA } from './data/index.js';
import * as M from './math.js';
import { bulkCost, maxAffordable, clamp } from './util.js';

// ---------- notifications (drained by UI) ----------
function notify(state, type, text) {
  (state._notifications ||= []).push({ type, text, t: state.stats.runSec });
  if (state._notifications.length > 40) state._notifications.shift();
}
export function drainNotifications(state) {
  const n = state._notifications || []; state._notifications = []; return n;
}

// ---------- runtime (non-pure) multiplier: Second Wind window ----------
function runtimeMult(state) {
  const rank = state.ascension.tree.second_wind || 0;
  if (rank > 0 && state.stats.runSec < 300 * rank) return 5;
  return 1;
}

// ---------- the tick ----------
export function tick(state, dt) {
  state.stats.runSec += dt;
  state.meta.playtimeMs += dt * 1000;

  // 1) refresh comfort + destination caches (feed the multiplier stack)
  state._comfortCache = M.computeComfort(state, DATA);
  state.resources.comfort = state._comfortCache;
  if (state._comfortCache > state.stats.bestComfort) state.stats.bestComfort = state._comfortCache;
  state._destCache = M.destMult(state, DATA);

  const rt = runtimeMult(state);

  // 2) snapshot tier production, then apply (no intra-tick feedback)
  const prod = [];
  for (let k = 0; k < DATA.generators.length; k++) prod[k] = M.tierProd(state, k) * rt;

  let cashGain = prod[0] * dt;                    // D1 → cash
  for (let k = 1; k < DATA.generators.length; k++) {
    state.generators[k - 1].count += prod[k] * dt; // D_k → D_{k-1}
  }

  // 3) savvy passive income (sqrt-scaled), crypto-path perk ×1.3 when invested
  const cryptoPerk = 1 + 0.3 * Math.sign(state.paths.crypto.points);
  cashGain += M.savvyPassive(state) * cryptoPerk * dt;

  state.resources.cash += cashGain;
  state.stats.lifetimeCash += cashGain;
  state.stats.lifetimeCashThisTree += cashGain;

  // 4) clout (vlogger) with combo decay
  decayCombo(state, dt);
  const vloggerPerk = 1 + 0.25 * Math.sign(state.paths.vlogger.points);
  const magnetic = 1 + 0.1 * (state.ascension.tree.magnetic || 0);
  const cloutRate = C.CLOUT.contentRate
    * (1 + C.CLOUT.charismaBoost * state.skills.charisma.level)
    * state._combo * vloggerPerk * magnetic
    * (1 + state.paths.vlogger.points * 0.05);
  state.resources.clout += cloutRate * dt;

  // 5) skill XP trickle (idle growth; training is the main driver)
  trickleXp(state, cashGain, dt);
  refreshSkillLevels(state);

  // 5b) Transport upkeep (E04-S2-T8) drains cash while a ride is active; clamped so it
  // never goes negative, offline included (both just call tick()). NOTE: the traveler
  // "head start" (E04-S7-T5) is granted as a ONE-OFF nudge in buyDestination/
  // visitDestination, deliberately NOT a per-tick trickle here — L_dest already
  // multiplies across every generator tier, so an unbounded per-second point source
  // into the same L_path term compounded into a harness-measured runaway (island time
  // collapsed from ~19h to ~6h in testing). See math.js's destMult comment.
  applyTransportUpkeep(state, dt);

  // 6) unlocks + story
  checkUnlocks(state);
  checkAmenityUnlocks(state);
  checkVignettes(state);
  checkNpcUnlocks(state);
  checkDestinationReveals(state);
  checkStory(state);
  checkComfortOnline(state);
  checkPoolTease(state);
}

function applyTransportUpkeep(state, dt) {
  const t = transportData(state.transport.activeSlot);
  if (!t) return;
  state.resources.cash = Math.max(0, state.resources.cash - t.upkeep * dt);
}

function decayCombo(state, dt) {
  const span = C.CLOUT.comboMax - 1;
  state._combo = Math.max(1, (state._combo ?? 1) - (span / C.CLOUT.comboDecaySec) * dt);
}

function trickleXp(state, cashGain, dt) {
  const s = state.skills;
  s.charisma.xp += cashGain * 0.02;
  s.comms.xp    += cashGain * 0.015;
  s.savvy.xp    += cashGain * 0.012;
  s.taste.xp    += cashGain * 0.006;
  s.body.xp     += state._comfortCache * dt * 0.02;
}

function refreshSkillLevels(state) {
  for (const s of DATA.skills) {
    const before = state.skills[s.id].level;
    const base = state.ascension.tree.ageless ? 5 * state.ascension.tree.ageless : 0;
    const magnetic = (s.id === 'charisma' && state.ascension.tree.magnetic) ? 2 * state.ascension.tree.magnetic : 0;
    const lvl = M.levelFromXp(state.skills[s.id].xp) + (s.id === 'body' ? base : 0) + magnetic;
    state.skills[s.id].level = lvl;
    // level-up juice (E09-S2-T4/S3-T6/S10-T1): a distinct, testable event the UI turns
    // into a toast + bar flash. Fires from BOTH the passive tick trickle and training
    // buys, since refreshSkillLevels is the one place both paths funnel through.
    if (lvl > before) notify(state, 'levelup', `✨ ${s.name} L${lvl}!`);
  }
}

// ---------- unlocks ----------
export function checkUnlocks(state) {
  // reveal higher income tiers by lifetime-cash threshold
  for (let k = 1; k < DATA.generators.length; k++) {
    if (!state.generators[k].unlocked && state.stats.lifetimeCash >= C.GEN.base[k] * 0.4) {
      state.generators[k].unlocked = true;
      notify(state, 'unlock', `New income tier unlocked: ${DATA.generators[k].name}`);
    }
  }
}

// one-time "new little luxury" flash (E02-S3-T7/T8, E02-S5-T5): fires the moment an
// amenity first crosses its unlockComfort threshold. Tracked in state.story.flags (a
// generic already-fired bag) so it's testable, deterministic, and survives reload
// without needing a bespoke state field / migration.
export function checkAmenityUnlocks(state) {
  for (const a of DATA.amenities) {
    const flagKey = 'amenityUnlocked_' + a.id;
    if (state.story.flags[flagKey]) continue;
    if (state._comfortCache >= (a.unlockComfort || 0)) {
      state.story.flags[flagKey] = true;
      notify(state, 'unlock', `✨ New little luxury unlocked: ${a.name}`);
    }
  }
}

// one-shot "Comfort now pays" signature moment (E06-S2-T6/S4-T1/S10-T9): the Comfort ×
// readout has existed since E02 (ui.js header/amenities card) — this just flags the
// first tick where L_comfort actually crosses a meaningful threshold, so the 2-star
// stage gets a clear "it clicked" beat instead of a number quietly creeping up.
export function checkComfortOnline(state) {
  if (state.story.flags.comfortOnline) return;
  const L = M.comfortMultiplier(state);
  if (L >= C.COMFORT_ONLINE_MULT) {
    state.story.flags.comfortOnline = true;
    notify(state, 'celebrate', `😌 Comfort now multiplies income — ×${L.toFixed(2)} and climbing.`);
  }
}

// dormant "next place has a pool" tease (E06-S1-T9/S2-T9/S6-T5/S7-T7): a one-shot flag
// for E07 to read (state.story.flags.poolTease) once the player reaches the 2-Star
// Hotel (tier 5) OR beat 8 (Continental Breakfast) fires, whichever comes first. Pure
// flavor — never gates anything here or in E07.
export function checkPoolTease(state) {
  if (state.story.flags.poolTease) return;
  if (state.accommodation.tier < 5 && !state.story.seen.includes(8)) return;
  state.story.flags.poolTease = true;
  const byBranch = {
    vlogger: '📸 A porter mentions, off-hand: the next place has a pool. Content goldmine.',
    connoisseur: '🍸 A porter mentions, off-hand: the next place has a pool. A tasteful lap pool, one imagines.',
    crypto: '📈 A porter mentions, off-hand: the next place has a pool. Diversify into liquidity — literally.',
    traveler: '🗺️ A porter mentions, off-hand: the next place has a pool. Add it to the itinerary.',
  };
  notify(state, 'vignette', byBranch[state.story.branch] || '💧 A porter mentions, off-hand: the next place has a pool. You pretend not to care.');
}

// ---------- NPCs (E03-S1/S6/S7): recurring cast revealed once you land in the hostel
// (accommodation.tier >= 2). Meeting an NPC only records a flag — state.npcsMet and,
// if the NPC carries one, story.flags.<pathSeed>Seed — it never touches
// state.paths.*.points or any multiplier layer, so L_path stays neutral (=1) here;
// E04 is what actually turns the path system on. See E03-S7-T10 (neutrality).
export function checkNpcUnlocks(state) {
  if (state.accommodation.tier < 2) return;
  for (const npc of DATA.npcs) {
    if (state.npcsMet[npc.id]) continue;
    state.npcsMet[npc.id] = true;
    if (npc.pathSeed) state.story.flags[npc.pathSeed + 'Seed'] = true;
    notify(state, 'vignette', `${npc.emoji} ${npc.name}: "${npc.flavor}"`);
  }
}

// ---------- destinations & transport (E04-S1/S2): the World Traveler map ----------
export function destData(id) { return DATA.destinations.find(d => d.id === id); }
export function transportData(id) { return DATA.transport.find(t => t.id === id); }

// the active ride's speed shortens the effective cost of reaching a destination
// (E04-S2-T5: effectiveCost = cost/(1+speed)).
export function transportSpeed(state) {
  const t = transportData(state.transport.activeSlot);
  return t ? t.speed : 0;
}

// a destination reveals once BOTH its unlockAfter prerequisite (the prior place,
// chaining reveal order) AND its unlockComfort threshold are met — Comfort paces the
// LATER places across the whole run (not just cash, which grows too fast to gate a
// permanent, all-8-tier multiplier on its own; see the data-file comment). The first
// place (unlockAfter: null, unlockComfort: 0) is visible as soon as the Destinations
// panel itself is revealed (see ui.js — gated on beat 5 / accTier>=3).
export function destUnlocked(state, id) {
  const d = destData(id);
  if (!d) return false;
  if (state.destinations[id].owned) return true;
  const chainOk = !d.unlockAfter || !!state.destinations[d.unlockAfter]?.owned;
  return chainOk && state._comfortCache >= (d.unlockComfort || 0);
}
export function destCost(state, id) {
  const d = destData(id);
  const ownedCount = Object.values(state.destinations).filter(x => x.owned).length;
  const g = d.costGrowth || C.DEST.costGrowth;
  const raw = d.costBase * Math.pow(g, ownedCount) * M.commsCostMult(state);
  return raw / (1 + transportSpeed(state));
}
// one-time unlock: permanent global × (L_dest), blocked on a repeat buy (E04-S2-T4/S4-T10).
export function buyDestination(state, id) {
  if (!destUnlocked(state, id)) return false;
  if (state.destinations[id].owned) return false;
  const cost = destCost(state, id);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.destinations[id].owned = true;
  state._destCache = M.destMult(state, DATA);
  const d = destData(id);
  // small traveler head start on first owning a place (E04-S4-T6/S7-T5) — adds to the
  // EXISTING state.paths.traveler.points read by tierMultiplier's L_path, no new layer.
  state.paths.traveler.points += (d.pathAffinity && d.pathAffinity.traveler) || 0;
  notify(state, 'unlock', `🌍 New destination unlocked: ${d.name} (×${d.mult} global)`);
  return true;
}
// repeatable, free: a tiny cash reward + a small path-point nudge — never the fastest
// path, just a flavor action for an already-owned place (E04-S4-T5).
export function visitDestination(state, id) {
  const d = destData(id);
  if (!d || !state.destinations[id].owned) return false;
  state.destinations[id].visits++;
  state.resources.cash += C.DEST.visitYield;
  state.stats.lifetimeCash += C.DEST.visitYield;
  state.stats.lifetimeCashThisTree += C.DEST.visitYield;
  state.paths.traveler.points += C.DEST.visitPathPoints;
  return true;
}
// tier-1 rides (bus/train): cash check + add to owned, then switch the active slot —
// re-selecting an already-owned ride is a free, idempotent switch (E04-S2-T7/S10-T4).
export function buyTransport(state, id) {
  const t = transportData(id);
  if (!t) return false;
  if (state.transport.owned.includes(id)) { state.transport.activeSlot = id; return true; }
  const cost = t.costBase * M.commsCostMult(state);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.transport.owned.push(id);
  state.transport.activeSlot = id;
  notify(state, 'unlock', `🚌 New ride unlocked: ${t.name}`);
  return true;
}
// one-shot "new place on the map" reveal flash (mirrors checkAmenityUnlocks): fires
// once per destination the moment its unlockAfter chain opens (E04-S2-T9).
export function checkDestinationReveals(state) {
  // the map itself only exists once beat 5 (First Passport Stamp) or the Budget
  // Guesthouse (tier 3) is reached — no point flashing individual place-reveals earlier.
  if (!(state.story.seen.includes(5) || state.accommodation.tier >= 3)) return;
  for (const d of DATA.destinations) {
    const flagKey = 'destRevealed_' + d.id;
    if (state.story.flags[flagKey]) continue;
    if (destUnlocked(state, d.id)) {
      state.story.flags[flagKey] = true;
      notify(state, 'unlock', `🗺️ New destination on the map: ${d.name}`);
    }
  }
}

// ---------- story ----------
function reqMet(state, r) {
  if (!r) return true;
  if (r.comfort !== undefined && state._comfortCache < r.comfort) return false;
  if (r.accTier !== undefined && state.accommodation.tier < r.accTier) return false;
  if (r.charisma !== undefined && state.skills.charisma.level < r.charisma) return false;
  if (r.body !== undefined && state.skills.body.level < r.body) return false;
  if (r.taste !== undefined && state.skills.taste.level < r.taste) return false;
  if (r.ascensions !== undefined && state.ascension.count < r.ascensions) return false;
  if (r.legacy !== undefined && state.resources.legacy < r.legacy) return false;
  return true;
}
export function checkStory(state) {
  for (const beat of DATA.story) {
    if (state.story.seen.includes(beat.id)) continue;
    // Narrative monotonicity: a beat can't fire until the previous beat has. Beats gate on
    // heterogeneous resources (comfort, tiers, skills), so without this a skill-gated beat
    // could unlock before an earlier tier-gated one. The gate becomes max(own, prior) time.
    if (beat.id > 1 && !state.story.seen.includes(beat.id - 1)) continue;
    if (reqMet(state, beat.requires)) {
      state.story.seen.push(beat.id);
      state.story.beat = Math.max(state.story.beat, beat.id);
      notify(state, 'story', `📖 Beat ${beat.id}: ${beat.title}`);
    }
  }
}
// recurring NPC flavor toasts (E02-S7): pure texture between the main story beats,
// never a progression gate. Each fires once at its Comfort threshold, tracked in
// state.story.flags alongside the amenity-unlock flags.
export function checkVignettes(state) {
  for (const v of DATA.vignettes) {
    const flagKey = 'vignette_' + v.id;
    if (state.story.flags[flagKey]) continue;
    if (state._comfortCache >= v.minComfort) {
      state.story.flags[flagKey] = true;
      notify(state, 'vignette', v.text);
    }
  }
}
export function applyStoryChoice(state, beatId, set) {
  const beat = DATA.story.find(b => b.id === beatId);
  if (!beat || !beat.choice) return false;
  state.story.branch = set;
  state.story.flags['branch_' + set] = true;
  if (state.paths[set]) state.paths[set].points += 5;
  notify(state, 'story', `Path chosen: ${set}`);
  return true;
}

// ---------- purchases ----------
export function genCost(state, k, qty) {
  return bulkCost(C.GEN.base[k], C.GEN.growth[k], state.generators[k].bought, qty) * M.commsCostMult(state);
}
export function genMaxQty(state, k) {
  const budget = state.resources.cash / M.commsCostMult(state);
  return maxAffordable(C.GEN.base[k], C.GEN.growth[k], state.generators[k].bought, budget);
}
export function buyGenerator(state, k, qty) {
  if (qty === 'max') qty = genMaxQty(state, k);
  qty = Math.max(0, Math.floor(qty));
  if (qty <= 0) return false;
  const cost = genCost(state, k, qty);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  const boughtBefore = state.generators[k].bought;
  state.generators[k].count += qty;
  state.generators[k].bought += qty;
  // flash feedback (E01-S4-T5): a purchase that crosses a milestone boundary doubles
  // (or soft-caps) the tier's output — surface that free-power moment, don't let it be silent.
  const stepBefore = Math.floor(boughtBefore / C.MILESTONE_STEP);
  const stepAfter = Math.floor(state.generators[k].bought / C.MILESTONE_STEP);
  if (stepAfter > stepBefore) {
    notify(state, 'milestone', `⚡ ${DATA.generators[k].name} milestone! Output ×${M.milestoneMult(state.generators[k].bought)}`);
  }
  return true;
}

export function genUpgradeCost(state, k) {
  return C.GEN.base[k] * 50 * Math.pow(8, state.generators[k].upgrades) * M.commsCostMult(state);
}
export function buyGenUpgrade(state, k) {
  const cost = genUpgradeCost(state, k);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.generators[k].upgrades++;
  return true;
}
// convenience: find the single cheapest affordable renovation (per-tier upgrade) across
// every unlocked income tier — a UI nicety over the existing buyGenUpgrade path, not a
// new mechanic (E05-S3-T5 "renovate cheapest"). Returns { k, cost } or null.
export function cheapestGenUpgrade(state) {
  let bestK = -1, bestCost = Infinity;
  for (let k = 0; k < DATA.generators.length; k++) {
    if (!state.generators[k].unlocked) continue;
    const cost = genUpgradeCost(state, k);
    if (cost < bestCost) { bestCost = cost; bestK = k; }
  }
  return bestK < 0 ? null : { k: bestK, cost: bestCost };
}
export function buyCheapestGenUpgrade(state) {
  const pick = cheapestGenUpgrade(state);
  if (!pick || state.resources.cash < pick.cost) return false;
  return buyGenUpgrade(state, pick.k);
}

export function amenityData(id) { return DATA.amenities.find(a => a.id === id); }
export function amenityCost(state, id) {
  const a = amenityData(id); const lvl = state.amenities[id].level;
  const g = a.costGrowth || C.AMENITY.growthDefault;
  return a.costBase * Math.pow(g, lvl) * M.commsCostMult(state);
}
export function amenityUnlocked(state, id) {
  return state._comfortCache >= (amenityData(id).unlockComfort || 0) || state.amenities[id].level > 0;
}
export function buyAmenity(state, id) {
  if (!amenityUnlocked(state, id)) return false;
  const cost = amenityCost(state, id);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.amenities[id].level++;
  state._comfortCache = M.computeComfort(state, DATA);
  return true;
}

export function trainingData(id) { return DATA.training.find(t => t.id === id); }
export function trainingCost(state, id) {
  const t = trainingData(id);
  return t.costBase * Math.pow(t.costGrowth, state.training[id].bought) * M.commsCostMult(state);
}
export function buyTraining(state, id) {
  const t = trainingData(id);
  const cost = trainingCost(state, id);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.training[id].bought++;
  state.skills[t.skill].xp += t.xp;
  refreshSkillLevels(state);
  return true;
}

export function pathData(id) { return DATA.paths.find(p => p.id === id); }
export function pathCost(state, id) {
  const p = pathData(id);
  return p.focusCostBase * Math.pow(p.focusCostGrowth, state.paths[id].focusBought) * M.commsCostMult(state);
}
export function buyPathFocus(state, id) {
  const cost = pathCost(state, id);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.paths[id].focusBought++;
  state.paths[id].points++;
  return true;
}

export function nextAccTier(state) { return state.accommodation.tier + 1; }
// cash cost for ANY tier (not just the next one) — used by the ladder panel to price a
// lookahead window of upcoming tiers, not only the immediately-purchasable one.
export function accCostForTier(state, tier) {
  return M.accScore(tier) * C.ACC.cashMult * M.commsCostMult(state);
}
export function accCost(state) {
  return accCostForTier(state, nextAccTier(state));
}
export function accUnlocked(state) {
  const t = nextAccTier(state);
  if (t >= DATA.accommodation.length) return false;
  return state._comfortCache >= M.accUnlockComfort(t);
}
export function buyAccommodation(state) {
  const t = nextAccTier(state);
  if (!accUnlocked(state)) return false;
  const cost = accCost(state);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.accommodation.tier = t;
  state.accommodation.owned.push(t);
  state._comfortCache = M.computeComfort(state, DATA);
  notify(state, 'unlock', `🏨 Upgraded to: ${DATA.accommodation[t].name}`);
  // the 1-Star moment (E05-S6-T5/T7): a bigger, distinct arrival flash the moment you
  // check into tier 4. Beat 7 (One Star, Big Dreams) itself fires from checkStory() on
  // the same accTier:4 gate — this is purely the extra celebratory juice on top.
  if (t === 4) {
    notify(state, 'celebrate', '⭐ One whole star. The receptionist even smiled — at the guest behind you.');
  }
  // the 2-Star moment (E06-S6-T5/T7): mirrors the 1-Star flash above. Beat 8 (Continental
  // Breakfast) itself fires from checkStory() on its own Comfort gate — this is purely
  // the extra celebratory juice tied to the tier-up specifically.
  if (t === 5) {
    notify(state, 'celebrate', '⭐⭐ Two whole stars — a breakfast buffet you will ration into lunch.');
  }
  // the pool moment (E07-S7-T7/T10): the 3-Star Hotel arrival IS the headline reveal —
  // beat 9 (Making a Splash) itself fires from checkStory() on the same accTier:6 gate
  // (docs/story.js); this is purely the extra "there's a POOL" celebratory flash tied to
  // the tier-up, mirroring the tier-4/tier-5 flashes above.
  if (t === 6) {
    notify(state, 'celebrate', '🏊 There is a POOL. An actual pool. You stand at the edge for a full minute.');
  }
  // the beach moment (E08-S6-T5/T7/T10 "Sun, Sand & Service"): the 4-Star Beach Resort
  // arrival IS the headline reveal — beat 10 (Poolside Persona) fires separately from
  // checkStory() on its own charisma gate (docs/story.js) — this is purely the extra
  // "sand, finally" celebratory flash tied to the tier-up, mirroring the flashes above.
  // It also doubles as the beach panel's mount cue: ui.js's beachRevealed() reads
  // accommodation.tier live on every render, so the Beachfront card appears the same
  // tick this flips, no separate mount event needed.
  if (t === 7) {
    notify(state, 'celebrate', '🏖️ Sand, finally. A waiter appears before you have finished sitting down.');
  }
  // the Boutique Retreat moment (E09-S6-T6/T8, "Charm Offensive" — the Act I → Act II
  // hinge): the tier-8 arrival IS the headline reveal for this epic — beat 10 (Poolside
  // Persona) fires separately from checkStory() on its own Charisma-L5 gate
  // (docs/story.js) — this is purely the extra celebratory flash tied to the tier-up
  // itself, mirroring the tier-4/5/6/7 flashes above.
  if (t === 8) {
    notify(state, 'celebrate', '🛎️ The Boutique Retreat. Small, tasteful, and quietly judging your poncho.');
  }
  return true;
}

// ---------- clicker (optional; never the fastest path) ----------
export function click(state) {
  state.stats.totalClicks++;
  const boost = C.CLOUT.comboPerClick * (1 + 0.15 * (state.ascension.tree.athletes_frame || 0));
  state._combo = Math.min(C.CLOUT.comboMax, (state._combo ?? 1) + boost);

  // soft-cap tap spam (E01-S5-T6): only C.TAP.maxPerSec taps register cash within any
  // rolling 1-second window (measured in sim time, so it holds under GAME_SPEED too).
  // An autoclicker beyond that still bumps combo/stats but earns no extra cash — tapping
  // stays a bonus, never the fastest path, and the idle rate is always the honest floor.
  const sec = Math.floor(state.stats.runSec);
  if (state.stats.tapWindowSec !== sec) { state.stats.tapWindowSec = sec; state.stats.tapWindowCount = 0; }
  if (state.stats.tapWindowCount >= C.TAP.maxPerSec) return 0;
  state.stats.tapWindowCount++;

  const perSec = M.tierProd(state, 0) + M.savvyPassive(state);
  const gain = Math.max(1, perSec * 0.10);
  state.resources.cash += gain;
  state.stats.lifetimeCash += gain;
  state.stats.lifetimeCashThisTree += gain;
  return gain;
}

// ---------- offline / away ----------
export function applyOffline(state, elapsedMs) {
  if (!state.settings.offlineEnabled || elapsedMs <= 0) return null;
  const capH = C.OFFLINE_CAP_H + 2 * (state.ascension.tree.iron_const || 0);
  const cappedMs = Math.min(elapsedMs, capH * 3600 * 1000);
  const before = { cash: state.resources.cash, clout: state.resources.clout };
  const total = cappedMs / 1000;
  const step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) tick(state, step);
  return {
    seconds: total,
    cash: state.resources.cash - before.cash,
    clout: state.resources.clout - before.clout,
    capped: elapsedMs > cappedMs,
  };
}
