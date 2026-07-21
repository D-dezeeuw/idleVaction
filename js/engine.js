// engine.js — tick loop, purchases, unlocks, story, offline. Mutates state in place.
import { CONFIG as C } from './config.js';
import { DATA } from './data/index.js';
import * as M from './math.js';
import { bulkCost, maxAffordable, clamp, rng } from './util.js';

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
  cashGain += M.savvyPassive(state) * cryptoSavvyPerk(state) * dt;

  // 3b) crypto portfolio: seeded market events + owned-coin yield (E13 "Money Works
  // While You Tan") — GATED behind actually holding crypto path points or coins (see
  // cryptoActive below), so a fresh newGame() and the harness/selftest playStep (which
  // only ever invest in the vlogger path) see zero scheduler activity and zero yield;
  // the fitted ~8h26m island time cannot move. marketMult scales ONLY this yield, never
  // savvyPassive/tierProd above (opt-in volatility, never a base-income effect).
  marketTick(state);
  const cryptoYield = M.cryptoYieldPerSec(state, DATA) * dt;
  cashGain += cryptoYield;
  state.crypto.lifetimeYield += cryptoYield;

  state.resources.cash += cashGain;
  state.stats.lifetimeCash += cashGain;
  state.stats.lifetimeCashThisTree += cashGain;

  // 4) clout (vlogger economy, E12 "Lights, Camera, Clout"): combo decay + the sponsor
  // offer/expiry clock first, then the single pure M.cloutRate() (math.js) is the whole
  // formula now — nothing here re-derives it inline (see math.cloutRate's comment for
  // why this is bit-for-bit the same formula as before the extraction).
  decayCombo(state, dt);
  tickSponsors(state, dt);
  state.resources.clout += M.cloutRate(state, DATA) * dt;

  // 5) skill XP trickle (idle growth; training is the main driver)
  trickleXp(state, cashGain, dt);
  refreshSkillLevels(state);

  // 5a) energy regen (E10 "Body & Soul"): optional clicker fuel, Body-scaled tank +
  // regen — never read by tierProd/tierMultiplier, so it cannot affect idle income or
  // pacing (the harness never taps; see math.energyMax/energyRegenRate).
  state.resources.energy = clamp(
    (state.resources.energy || 0) + M.energyRegenRate(state) * dt, 0, M.energyMax(state));

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
  checkWellnessReveal(state);
  checkBodyPathFlags(state);
  checkConciergeReveal(state);
  checkCreatorDashboardReveal(state);
  checkGoingViral(state);
  checkPathHybridFlags(state);
  checkContentUnlocks(state);
  checkCryptoDeskReveal(state);
  checkWhaleWatching(state);

  // 7) concierge: bounded, off-by-default auto-purchase policy (E11 "Five-Star Frame of
  // Mind") — a no-op instant boolean check whenever state.concierge.on is false, so a
  // fresh game (and the harness, which never flips it on) pay no cost and never buy.
  conciergeTick(state, dt);
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

// one-shot Wellness Wing reveal flash (E10-S3-T6/S6-T5/D-T4): the Boutique Retreat
// (tier 8) arrival IS the reveal — mirrors beachRevealed's "the tier-up IS the reveal"
// pattern one epic later (ui.js's wellnessRevealed(s) reads accommodation.tier live, so
// the card appears the same tick this flips, no separate mount event needed). Beat 12
// (The Body You Travel In) itself already fires from checkStory() on skills.body.level
// >= 8 (pre-existing, see data/story.js) — this is purely the extra celebratory flash
// tied to the wing's arrival.
export function checkWellnessReveal(state) {
  if (state.story.flags.wellnessRevealed) return;
  if (state.accommodation.tier < 8) return;
  state.story.flags.wellnessRevealed = true;
  notify(state, 'unlock', '💪🧖 The Wellness Wing opens: tan, gym, spa — under one quietly judgmental roof.');
}

// Path-flavor cosmetics (E10-S7): cosmetic-only flags with no mechanical lock-in — a
// vlogger with a fit Body reads as "photogenic," a crypto tourist as "sun-kissed," and a
// vlogger who has ALSO genuinely invested in that path gets a small "hybrid" flag on
// top. Pure flavor for later epics (E12's Clout combo) to read; never touches income
// math. Reuses beat 12's own Body gate (8) as the shared "high Body" threshold — no new
// balance constant needed, matching how narrative gates already live in data/story.js
// rather than config.js.
const BODY_FLAVOR_GATE = 8;
const HYBRID_VLOGGER_POINTS = 5;
export function checkBodyPathFlags(state) {
  if (state.skills.body.level < BODY_FLAVOR_GATE) return;
  if (state.story.branch === 'vlogger' && !state.story.flags.photogenic) {
    state.story.flags.photogenic = true;
    notify(state, 'vignette', '📸 Photogenic. The lighting on those delts is doing half your engagement now.');
  }
  if (state.story.branch === 'crypto' && !state.story.flags.sunKissed) {
    state.story.flags.sunKissed = true;
    notify(state, 'vignette', '📈 Sun-kissed. Money works while you tan — literally, now.');
  }
  if (state.story.branch === 'vlogger' && state.paths.vlogger.points >= HYBRID_VLOGGER_POINTS
      && !state.story.flags.hybridBodyVlogger) {
    state.story.flags.hybridBodyVlogger = true;
    notify(state, 'vignette', '🎬🏋️ The fit-and-photogenic combo. Sponsors take notice.');
  }
}

// ---------- vlogger clout economy (E12 "Lights, Camera, Clout") ----------
// Small cross-path hybrid flavor flags (E12-S7-T6), mirroring checkBodyPathFlags's
// pattern exactly one section above — cosmetic only, never touches income math. Any
// two paths can be invested in independently (buyPathFocus has no exclusivity), so
// these are genuinely reachable by a mixed build, not gated on a branch choice.
const HYBRID_PATH_POINTS = 5;
export function checkPathHybridFlags(state) {
  if (state.paths.vlogger.points >= HYBRID_PATH_POINTS && state.paths.traveler.points >= HYBRID_PATH_POINTS
      && !state.story.flags.hybridTravelVlog) {
    state.story.flags.hybridTravelVlog = true;
    notify(state, 'vignette', '🎬🗺️ The "travel vlog" hybrid. Footage of every border crossing, tastefully monetized.');
  }
  if (state.paths.vlogger.points >= HYBRID_PATH_POINTS && state.paths.crypto.points >= HYBRID_PATH_POINTS
      && !state.story.flags.hybridSponsoredShill) {
    state.story.flags.hybridSponsoredShill = true;
    notify(state, 'vignette', '📉📸 The "sponsored token shill" hybrid. Your bio grows a suspicious number of rocket emojis.');
  }
}

// Creator Dashboard reveal gate (E12-S3-T6): the vlogger path has points, OR Beat 14
// (Going Viral) has fired, OR the tier-11 band is reached — whichever comes first.
// buyPathFocus has no Comfort gate, so this can trigger very early for a player who
// dabbles in the vlogger path before ever picking a branch — intentional, mirrors
// conciergeUnlocked's "OR" pattern (E11) exactly.
export function creatorDashboardUnlocked(state) {
  return state.paths.vlogger.points > 0 || state.story.seen.includes(14) || state.accommodation.tier >= 11;
}
// one-shot reveal flash (mirrors checkWellnessReveal/checkConciergeReveal's pattern).
export function checkCreatorDashboardReveal(state) {
  if (state.story.flags.creatorDashboardRevealed) return;
  if (!creatorDashboardUnlocked(state)) return;
  state.story.flags.creatorDashboardRevealed = true;
  notify(state, 'unlock', '📸 The Creator Dashboard opens: Clout, combo, content, and sponsors circling like gulls.');
}

// one-shot "Going Viral" flourish (E12-S6-T4/T6, S7-T5): layered on top of Beat 14's
// OWN existing Comfort gate (data/story.js, unchanged) — mirrors checkPoolTease/
// checkWellnessReveal's "tie a celebratory flash to an existing gate" convention
// rather than inventing a new pathPoints-based story gate (no such axis exists
// anywhere else in data/story.js's requires — see docs/coverage.md E12 notes).
export function checkGoingViral(state) {
  if (state.story.flags.goingViral) return;
  if (!state.story.seen.includes(14)) return;
  state.story.flags.goingViral = true;
  const byBranch = {
    vlogger: '🚀 GOING VIRAL. Somewhere, an algorithm has made a terrible, wonderful decision about you.',
    crypto: '🚀 A clip of you poolside goes viral for reasons unrelated to your portfolio. You take the exposure anyway.',
    connoisseur: '🚀 Someone films your wine order. It goes viral. You are, unfortunately, correct about the wine.',
    traveler: '🚀 A stranger\'s video of your itinerary goes viral. You never even see the clip.',
  };
  notify(state, 'celebrate', byBranch[state.story.branch] || '🚀 Somewhere, a clip of you goes viral. You do not fully understand why.');
}

// one-shot "new content format" flash (mirrors checkAmenityUnlocks exactly, one tier
// down — content tiers aren't amenities, so they need their own loop over DATA.content).
export function checkContentUnlocks(state) {
  for (const c of DATA.content) {
    const flagKey = 'contentUnlocked_' + c.id;
    if (state.story.flags[flagKey]) continue;
    if (contentUnlocked(state, c.id)) {
      state.story.flags[flagKey] = true;
      notify(state, 'unlock', `🎥 New content format unlocked: ${c.name}`);
    }
  }
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
// Branch-flavored beat copy (E13 Task D, "Whale Watching"): a beat's `requires`/gate and
// default title/text are UNCHANGED for every branch (E13-S7-T10, no build ever
// stranded) — this just swaps in a `variants[branch]` override for display/notify when
// one exists, matching the DATA-driven precedent set by amenities'/vignettes' flavor
// fields rather than restructuring the linear beat spine. Used by both checkStory's
// notify text below and ui.js's renderStory.
export function beatCopy(state, beat) {
  return (beat.variants && beat.variants[state.story.branch]) || beat;
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
      notify(state, 'story', `📖 Beat ${beat.id}: ${beatCopy(state, beat).title}`);
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

// ---------- content tiers + the Clout sink (E12 "Lights, Camera, Clout") ----------
// A small, cash-in/Clout-out cluster, bought through its own generic buy flow (mirrors
// buyAmenity's shape) — never wired into dev/harness.mjs's greedy policy (see data/
// content.js's comment), so it cannot move the fitted island time no matter how it's
// priced.
export function contentData(id) { return DATA.content.find(c => c.id === id); }
export function contentUnlocked(state, id) {
  const c = contentData(id);
  return state.resources.clout >= (c.unlockClout || 0) || state.content[id].level > 0;
}
export function contentCost(state, id) {
  const c = contentData(id);
  return c.costBase * Math.pow(c.costGrowth, state.content[id].level) * M.commsCostMult(state);
}
export function buyContent(state, id) {
  if (!contentUnlocked(state, id)) return false;
  const cost = contentCost(state, id);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.content[id].level++;
  // one-off vlogger path-point nudge (E12-S7-T4) — mirrors DEST.visitPathPoints'
  // "one-off on a discrete purchase, never a per-tick trickle" pattern exactly, so it
  // can't compound into a runaway the way a continuous trickle would.
  state.paths.vlogger.points += C.CLOUT.contentPathNudge;
  return true;
}
export function contentBoostCost(state, id) {
  const c = contentData(id);
  return c.boostCostBase * Math.pow(c.boostCostGrowth, state.content[id].boosts);
}
// the Clout SINK (E12-S2-T8): spend Clout itself to permanently boost one content
// tier's own contentRate — Clout reinvested into itself, mirroring L_upgrade's shape
// (1 + boostRate·boosts) but scoped entirely to the Clout economy (never touches cash).
export function buyContentBoost(state, id) {
  const cost = contentBoostCost(state, id);
  if (state.resources.clout < cost) return false;
  state.resources.clout -= cost;
  state.content[id].boosts++;
  return true;
}

// ---------- sponsor deals: opt-in, timed Clout multipliers (E12 "Lights, Camera,
// Clout") ----------
// A deal must be explicitly ACCEPTED via acceptSponsor() — tickSponsors (called from
// engine.tick) only rolls a new offer and expires an already-active one, it NEVER
// auto-accepts, so a fresh newGame() (and the harness/selftest playStep, which never
// call acceptSponsor) never see an active multiplier — see config.SPONSOR's comment.
export function sponsorData(id) { return DATA.sponsors.find(d => d.id === id); }
function sponsorRequiresMet(state, req) {
  if (!req) return true;
  if (req.clout !== undefined && state.resources.clout < req.clout) return false;
  if (req.charisma !== undefined && state.skills.charisma.level < req.charisma) return false;
  return true;
}
export function sponsorCooldownRemaining(state, id) {
  return Math.max(0, (state.sponsors.cooldowns[id] || 0) - state.stats.runSec);
}
// paced by config.SPONSOR (E12-S8-T3) — gated behind the Creator Dashboard itself being
// unlocked, so the whole subsystem stays dormant (no offer ever rolls, no cooldown ever
// ticks) until the vlogger economy is actually in play, mirroring conciergeTick's
// off-by-default early-return convention.
function tickSponsors(state, dt) {
  if (!creatorDashboardUnlocked(state)) return;
  const sp = state.sponsors;
  // expire the active deal once its window is up
  if (sp.active && state.stats.runSec >= sp.active.expiresAtSec) {
    const d = sponsorData(sp.active.id);
    sp.cooldowns[sp.active.id] = state.stats.runSec + (d?.cooldownSec ?? C.SPONSOR.cooldownSec);
    sp.totalExpired++;
    notify(state, 'sponsor', `📴 The ${d ? d.name : 'sponsor'} deal wrapped up — Clout back to normal.`);
    sp.active = null;
  }
  // roll (or replace) the pending offer on the config cadence, only while nothing is
  // currently active — cycles round-robin through whichever deals are off cooldown and
  // meet their `requires` (E12-S7-T7: better deals gate on higher Clout/Charisma).
  if (!sp.active && state.stats.runSec >= sp.nextOfferAtSec) {
    const eligible = DATA.sponsors.filter(d =>
      (sp.cooldowns[d.id] || 0) <= state.stats.runSec && sponsorRequiresMet(state, d.requires));
    sp.offer = eligible.length ? eligible[sp.offerCycle % eligible.length].id : null;
    sp.offerCycle++;
    sp.nextOfferAtSec = state.stats.runSec + C.SPONSOR.offerIntervalSec;
  }
}
// player-facing accept action (E12-S3-T4/Task B): bounded (a single active slot means
// non-stacking by construction) and timed (durationSec from the deal's own data),
// gated on the SAME requires/cooldown checks tickSponsors used to offer it in the
// first place.
export function acceptSponsor(state, id) {
  const d = sponsorData(id);
  if (!d || state.sponsors.offer !== id || state.sponsors.active) return false;
  if (!sponsorRequiresMet(state, d.requires)) return false;
  if ((state.sponsors.cooldowns[id] || 0) > state.stats.runSec) return false;
  state.sponsors.active = { id, mult: d.mult, expiresAtSec: state.stats.runSec + d.durationSec };
  state.sponsors.offer = null;
  notify(state, 'sponsor', `🤝 Deal accepted: ${d.name} — Clout ×${d.mult} for ${d.durationSec}s.`);
  return true;
}

// ---------- crypto portfolio + seeded market events (E13 "Money Works While You Tan") ----------
// The crypto branch's Savvy passive perk (E13 Task C "surface Savvy... and the crypto
// perk", already-shipped since before this epic per docs/coverage.md's "already exist,
// don't rebuild" list) — pulled out of engine.tick's inline expression into a NAMED,
// reusable function so ui.js's Savvy readout can display the SAME live value instead of
// duplicating the "0.3" constant in a second file. Value UNCHANGED (still exactly
// `1 + 0.3·sign(points)`) — a pure extraction, not a retune, mirrors E12's vloggerPerk
// extraction (docs/coverage.md E12 notes, "value UNCHANGED").
export function cryptoSavvyPerk(state) {
  return 1 + 0.3 * Math.sign(state.paths.crypto.points);
}
// GATE: the whole market scheduler + coin yield stay dormant until the crypto path has
// points or a coin is actually held — a fresh newGame() (and the harness/selftest
// playStep, which only ever invest in the vlogger path) never trip this, so
// state.market.phase stays 'calm', mult 1, cursor 0 forever; the fitted ~8h26m island
// time cannot move (see config.MARKET's comment / the harness-invariance test).
function cryptoActive(state) {
  if (state.paths.crypto.points > 0) return true;
  for (const c of DATA.crypto.coins) if ((state.crypto.holdings[c.id] || 0) > 0) return true;
  return false;
}

export function coinData(id) { return DATA.crypto.coins.find(c => c.id === id); }
export function coinCost(state, id, qty = 1) {
  const c = coinData(id);
  const held = state.crypto.holdings[id] || 0;
  return bulkCost(c.costBase, c.costGrowth, held, qty) * M.commsCostMult(state);
}
// buying a coin is a player action; holdings ride the market from the NEXT tick on
// (engine.tick's step 3b), never retroactively.
export function buyCoin(state, id, qty = 1) {
  const c = coinData(id);
  if (!c) return false;
  qty = Math.max(0, Math.floor(qty));
  if (qty <= 0) return false;
  const cost = coinCost(state, id, qty);
  if (state.resources.cash < cost) return false;
  state.resources.cash -= cost;
  state.crypto.holdings[id] = (state.crypto.holdings[id] || 0) + qty;
  // one-off crypto path-point nudge per purchase (E13-S7-T8 "the lane self-feeds"),
  // mirrors DEST.visitPathPoints/CLOUT.contentPathNudge's established "one-off on a
  // discrete action, never a per-tick trickle" pattern exactly.
  state.paths.crypto.points += C.MARKET.buyPathNudge * qty;
  return true;
}
// sells at MARKET.sellFrac of the marginal unit's buy price, modulated by the LIVE
// marketMult — selling into a crash pays worse, riding a boom pays better. No
// commsCostMult here: that discount is purchase-only, not a sale-price bonus.
export function sellCoin(state, id, qty = 1) {
  const c = coinData(id);
  if (!c) return false;
  qty = Math.max(0, Math.floor(qty));
  const held = state.crypto.holdings[id] || 0;
  if (qty <= 0 || qty > held) return false;
  const unitPrice = M.coinUnitCost(c, Math.max(0, held - qty)) * C.MARKET.sellFrac * M.marketMult(state, DATA);
  state.crypto.holdings[id] = held - qty;
  const proceeds = unitPrice * qty;
  state.resources.cash += proceeds;
  state.stats.lifetimeCash += proceeds;
  state.stats.lifetimeCashThisTree += proceeds;
  return true;
}

// one-time risk-mitigation purchases (Task B): halves-crash-depth-adjacent, never
// leveled — see math.crashDampTotal for how they combine with the Unshakeable node.
export function hedgeData(id) { return DATA.crypto.hedges.find(h => h.id === id); }
export function buyHedge(state, id) {
  const h = hedgeData(id);
  if (!h || state.crypto.hedges[id]) return false;
  if (state.resources.cash < h.cost) return false;
  state.resources.cash -= h.cost;
  state.crypto.hedges[id] = true;
  notify(state, 'unlock', `🛡️ Hedge bought: ${h.name} — crash pain dulled.`);
  return true;
}

// weighted draw over DATA.crypto.events via the seeded, pure util.rng — consumes
// exactly one cursor slot.
function pickMarketEvent(state) {
  const events = DATA.crypto.events;
  const totalWeight = events.reduce((s, e) => s + e.weight, 0);
  const roll = rng(state.market.seed, state.market.cursor++) * totalWeight;
  let acc = 0;
  for (const e of events) { acc += e.weight; if (roll <= acc) return e; }
  return events[events.length - 1];
}

const SAVVY_CRASH_SURVIVE_XP = 40; // small Savvy XP nudge for "surviving" a drawn crash
const SAVVY_WHALE_XP = 60;         // a touch more for the rare whale boom
const MARKET_EVENT_LOG_MAX = 5;

// The seeded event scheduler (E13-S2-T5/S4-T1..T9): a pure function of
// (state.market.seed, state.market.cursor, state.stats.runSec), so it is trivially
// reproducible online or replayed offline through the SAME tick() loop
// engine.applyOffline already drives — no separate offline code path exists to drift.
function marketTick(state) {
  if (!cryptoActive(state)) return;
  const mkt = state.market;
  // an active phase expires back to calm, then a fresh gap is rolled before the next draw.
  if (mkt.phase !== 'calm' && state.stats.runSec >= mkt.expiresAtSec) {
    mkt.phase = 'calm'; mkt.mult = 1; mkt.eventId = null;
    const gapRoll = rng(mkt.seed, mkt.cursor++);
    const [lo, hi] = C.MARKET.eventEveryRange;
    mkt.nextEventT = state.stats.runSec + lo + gapRoll * (hi - lo);
  }
  if (mkt.phase === 'calm' && state.stats.runSec >= mkt.nextEventT) {
    const ev = pickMarketEvent(state);
    const magRoll = rng(mkt.seed, mkt.cursor++);
    const durRoll = rng(mkt.seed, mkt.cursor++);
    let mult = ev.multRange[0] + magRoll * (ev.multRange[1] - ev.multRange[0]);
    const dur = ev.durRange[0] + durRoll * (ev.durRange[1] - ev.durRange[0]);
    // crypto branch perk: raises boom magnitude, the "market-event upside+" (E13-S4-T8/S7-T2).
    if (ev.kind === 'boom' && state.story.branch === 'crypto') mult *= (1 + C.MARKET.branchBoomBonus);
    // crash damping: HEDGES + Unshakeable pull the depth toward 1 (E13-S2-T8/S4-T3) —
    // crashes stay bounded regardless (the clamp below is the hard floor either way).
    if (ev.kind === 'crash') {
      const damp = M.crashDampTotal(state, DATA);
      mult = 1 - (1 - mult) * (1 - damp);
    }
    mult = clamp(mult, C.MARKET.crashFloor, C.MARKET.boomCap);
    mkt.phase = ev.kind; mkt.eventId = ev.id; mkt.mult = mult;
    mkt.expiresAtSec = state.stats.runSec + dur;
    (mkt.eventLog ||= []).unshift({ id: ev.id, kind: ev.kind, mult, dur: Math.round(dur), t: state.stats.runSec });
    if (mkt.eventLog.length > MARKET_EVENT_LOG_MAX) mkt.eventLog.length = MARKET_EVENT_LOG_MAX;
    mkt.totalEvents = (mkt.totalEvents || 0) + 1;
    // Savvy XP for surviving volatility (E13-S2-T7): a crash always pays a little,
    // the rare whale boom pays a little more (S4-T6 "Whale-watching moment").
    if (ev.kind === 'crash') state.skills.savvy.xp += SAVVY_CRASH_SURVIVE_XP;
    if (ev.id === 'whale_boom') state.skills.savvy.xp += SAVVY_WHALE_XP;
    refreshSkillLevels(state);
    const label = ev.id === 'whale_boom' ? '🐋 WHALE PUMP' : ev.kind === 'boom' ? '📈 Market boom' : ev.kind === 'crash' ? '📉 Market crash' : '📊 Choppy market';
    notify(state, ev.kind === 'crash' ? 'crash' : 'boom', `${label}: market ×${mult.toFixed(2)} for ${Math.round(dur)}s`);
  }
}

// Reveal gate (E13-S3-T8): mirrors creatorDashboardUnlocked's exact OR contract — the
// crypto path has points (buyPathFocus has no Comfort gate, so this can trigger early
// for a dabbler before any branch is chosen), OR beat 14 has fired, OR the tier-11 band
// is reached, whichever comes first.
export function cryptoDeskUnlocked(state) {
  return state.paths.crypto.points > 0 || state.story.seen.includes(14) || state.accommodation.tier >= 11;
}
// one-shot reveal flash (mirrors checkCreatorDashboardReveal/checkConciergeReveal).
export function checkCryptoDeskReveal(state) {
  if (state.story.flags.cryptoDeskRevealed) return;
  if (!cryptoDeskUnlocked(state)) return;
  state.story.flags.cryptoDeskRevealed = true;
  notify(state, 'unlock', '📈 The Crypto Desk opens: your money wants a job. Buy a coin, watch the ticker.');
}

// "Whale Watching" one-time bonus (E13-S7-T3..T5, Task D): adapts the epic's "beat
// choice sets a flag" ask to the house convention already used by checkGoingViral/
// checkBodyPathFlags/checkPathHybridFlags (an automatic one-shot flag tied to an
// EXISTING beat gate, never a second interactive choice beat forking checkStory's
// one-beat-at-a-time spine) — fires once beat 14 has fired for a crypto-branch player.
const WHALE_WATCH_XP_BONUS = 200;
const WHALE_WATCH_PATH_BONUS = 2;
export function checkWhaleWatching(state) {
  if (state.story.flags.whaleWatched) return;
  if (state.story.branch !== 'crypto' || !state.story.seen.includes(14)) return;
  state.story.flags.whaleWatched = true;
  state.skills.savvy.xp += WHALE_WATCH_XP_BONUS;
  state.paths.crypto.points += WHALE_WATCH_PATH_BONUS;
  refreshSkillLevels(state);
  notify(state, 'celebrate', '🐋 Whale Watching: you clocked the pattern before the chart did. Savvy sharpens — the market, ever so slightly, notices you noticing.');
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
  // the 5-Star Hotel moment (E11-S6-T5/T6/T8 "Five-Star Frame of Mind"): the tier-9
  // arrival IS the headline reveal for the concierge itself — beat 13 fires separately
  // from checkStory() on the same accTier:9 gate (docs/story.js) — this is purely the
  // extra celebratory flash tied to the tier-up, mirroring the tier-4..8 flashes above.
  // The Concierge Desk's own one-shot reveal (checkConciergeReveal, below) fires the
  // same tick, since conciergeUnlocked() reads accommodation.tier live.
  if (t === 9) {
    notify(state, 'celebrate', '🛎️ The 5-Star Hotel. A concierge appears before you have finished your sentence.');
  }
  // the 5-Star Suite moment (E11-S6-T2/T5/T6/T8): the epic's SECOND accommodation step
  // — "two stars in one epic" — mirrors the tier-9 flash immediately above, one tier
  // later.
  if (t === 10) {
    notify(state, 'celebrate', '🥂 The 5-Star Signature Suite. A living room. In a hotel. For you. Your poncho has never felt so out of place.');
  }
  return true;
}

// ---------- concierge: bounded auto-purchase policy (E11 "Five-Star Frame of Mind") ----------
// The game's first automation seed. Shaped as a plain AutomationPolicy so later staff
// (E19's butler, E20's household) reuse this exact pattern rather than forking it
// (E11-S4-T1): "shouldRun" = state.concierge.on + conciergeUnlocked, "pickPurchases" =
// conciergeCandidates, "apply" = applyConciergeCandidate. OFF by default
// (state.concierge.on=false, CONFIG.CONCIERGE.defaultOn=false) — a fresh newGame() and
// the harness (which never flips it on) are therefore untouched; the fitted ~8h26m
// island time cannot move (see docs/coverage.md E11 notes / the harness-invariance
// test). Hardcoded-forbidden, never data/config-driven (E11-S4-T6, S10-T10): the
// concierge NEVER buys accommodation, NEVER ascends, NEVER answers a story choice —
// those simply have no candidate category below, by construction, not by a guard that
// could be misconfigured away.

// mirrors dev/harness.mjs's amenityWorthBuying ROI test (kept LOCAL — dev/harness.mjs is
// a dev-only script, never imported by shipped runtime code): the marginal €/s an
// amenity's Comfort bump is worth, at the CURRENT cash rate. A near-zero/cosmetic
// amenity yields a near-zero gain here and is filtered by the payback-horizon check in
// conciergeCandidates below — this is what stops the concierge from ever leaking cash
// into a dominated/cosmetic purchase, the exact anti-pattern the ROI harness itself
// exists to prevent.
function conciergeAmenityGainPerSec(state, a, cashRate) {
  if (cashRate <= 0) return 0;
  const ascBonus = 1 + 0.25 * state.ascension.count;
  const dComf = a.comfort * C.COMFORT.wAmen * ascBonus;
  if (dComf <= 0) return 0;
  const comf = state._comfortCache;
  const L = 1 + C.COMFORT.MULT * Math.log10(1 + comf / C.COMFORT.C0);
  const Lafter = 1 + C.COMFORT.MULT * Math.log10(1 + (comf + dComf) / C.COMFORT.C0);
  return cashRate * (Lafter - L) / L;
}
const CONCIERGE_AMENITY_HORIZON_SEC = 1800; // same payback horizon dev/harness.mjs uses

// Every candidate a MANUAL player could buy RIGHT NOW, filtered to state.concierge.
// whitelist, ranked by marginal-gain/cost descending (E11-S2-T1/T2/T4/T6) — the SAME
// gates (unlocked/affordable) as the UI buttons, via the SAME cost/unlock functions
// above; no bespoke purchase logic. Amenities additionally require a positive gain AND
// payback within CONCIERGE_AMENITY_HORIZON_SEC — the guardrail against ever auto-buying
// a cosmetic amenity. Generator/upgrade candidates use a scale-free "relative output (or
// L_upgrade) gain per cost" — always positive (there is no cosmetic generator/upgrade in
// this economy), matching "greedy, not clever, no lookahead" (E11-S4-T5).
export function conciergeCandidates(state) {
  const wl = state.concierge.whitelist;
  const out = [];
  if (wl.includes('amenity')) {
    const cashRate = M.tierProd(state, 0) + M.savvyPassive(state);
    for (const a of DATA.amenities) {
      if (!amenityUnlocked(state, a.id)) continue;
      const cost = amenityCost(state, a.id);
      if (cost <= 0) continue;
      const gain = conciergeAmenityGainPerSec(state, a, cashRate);
      if (gain <= 0 || cost / gain > CONCIERGE_AMENITY_HORIZON_SEC) continue;
      out.push({ category: 'amenity', id: a.id, cost, roi: gain / cost });
    }
  }
  if (wl.includes('generator')) {
    for (let k = 0; k < DATA.generators.length; k++) {
      if (!state.generators[k].unlocked) continue;
      const cost = genCost(state, k, 1);
      if (cost <= 0) continue;
      const roi = (1 / (state.generators[k].bought + 1)) / cost;
      out.push({ category: 'generator', k, cost, roi });
    }
  }
  if (wl.includes('upgrade')) {
    for (let k = 0; k < DATA.generators.length; k++) {
      if (!state.generators[k].unlocked) continue;
      const cost = genUpgradeCost(state, k);
      if (cost <= 0) continue;
      const upgrades = state.generators[k].upgrades;
      const roi = (C.L_UPGRADE_RATE / (1 + C.L_UPGRADE_RATE * upgrades)) / cost;
      out.push({ category: 'upgrade', k, cost, roi });
    }
  }
  return out.sort((x, y) => y.roi - x.roi);
}

function conciergeCandidateName(cand) {
  if (cand.category === 'amenity') return amenityData(cand.id).name;
  if (cand.category === 'generator') return DATA.generators[cand.k].name;
  return `${DATA.generators[cand.k].name} renovation`;
}
function applyConciergeCandidate(state, cand) {
  if (cand.category === 'amenity') return buyAmenity(state, cand.id);
  if (cand.category === 'generator') return buyGenerator(state, cand.k, 1);
  return buyGenUpgrade(state, cand.k);
}

// Dutch-tourist flavor for the desk log (E11-S1-T10), lightly branch-flavored
// (E11-S7-T6) — cosmetic text only, no ranking bias, so a re-specced player's concierge
// still shops identically (E11-S7-T7/T9: neutral stays plain, no lock-in either way).
const CONCIERGE_FLAVOR_BY_BRANCH = {
  vlogger: label => `📸 The concierge, curating your feed, quietly bought you ${label}.`,
  crypto: label => `📈 The concierge diversified a sliver of your position into ${label}.`,
  connoisseur: label => `🍸 The concierge, in impeccable taste, arranged for ${label}.`,
  traveler: label => `🗺️ The concierge, ever the fixer, added ${label} to the itinerary.`,
};
function conciergeFlavor(state, names) {
  const label = names.length > 1
    ? `${names[0]} and ${names.length - 1} other thing${names.length > 2 ? 's' : ''}`
    : names[0];
  const byBranch = CONCIERGE_FLAVOR_BY_BRANCH[state.story.branch];
  if (byBranch) return byBranch(label);
  return `🛎️ The concierge, sensing your indecision, has taken the liberty of buying you ${label}.`;
}

// One bounded shopping pass (E11-S2-T3/T7/T8): budget freezes at CONCIERGE.budgetFrac·
// cash at the START of the interval; the reserve floor is honored on every single
// purchase, not just at the end of the batch. All buys in one interval are batched into
// ONE notification (S2-T8), not one per item.
function conciergeInterval(state) {
  const floor = state.concierge.reserveFloor;
  let budget = C.CONCIERGE.budgetFrac * state.resources.cash;
  const bought = [];
  for (let guard = 0; guard < 20; guard++) {
    const pick = conciergeCandidates(state)
      .find(c => c.cost <= budget && state.resources.cash - c.cost >= floor);
    if (!pick) break;
    const cashBefore = state.resources.cash;
    if (!applyConciergeCandidate(state, pick)) break;
    const spent = cashBefore - state.resources.cash;
    // tip/fee sink (E11-S4-T7): a small extra payroll-lite drag on top of the purchase
    // itself, clamped so it can never cross the reserve floor either.
    const tip = Math.min(Math.max(0, state.resources.cash - floor), spent * C.CONCIERGE.tipFrac);
    state.resources.cash -= tip;
    budget -= (spent + tip);
    bought.push({ name: conciergeCandidateName(pick), cost: spent + tip });
  }
  if (bought.length) {
    state.concierge.totalBought += bought.length;
    const total = bought.reduce((s, b) => s + b.cost, 0);
    state.concierge.totalSpent += total;
    state.concierge.lastActions.unshift({ t: state.stats.runSec, items: bought, cost: total });
    if (state.concierge.lastActions.length > 8) state.concierge.lastActions.length = 8;
    notify(state, 'concierge', conciergeFlavor(state, bought.map(b => b.name)));
  }
}

// Paced by CONFIG.CONCIERGE.intervalSec, accumulated (not gated on dt itself) so a
// single large offline macro-step runs EXACTLY as many intervals as the same elapsed
// real time would online (E11-S9-T4/T5, S10-T5 "offline determinism"). While
// state.concierge.on is false, tickAccum is simply not advanced — no backlog builds up,
// so toggling off then back on later can never trigger a stuck-timer catch-up burst
// (E11-S10-T6).
export function conciergeTick(state, dt) {
  if (!state.concierge.on) return;
  state.concierge.tickAccum += dt;
  let iters = 0;
  while (state.concierge.tickAccum >= C.CONCIERGE.intervalSec && iters++ < 2000) {
    state.concierge.tickAccum -= C.CONCIERGE.intervalSec;
    conciergeInterval(state);
  }
}

// Reveal gate (E11-S1-T7/S6-T4/S3-T7/T9): the concierge (and its desk card) appear the
// moment tier 9 (5-Star Hotel) is owned, or Beat 13 has fired — whichever comes first.
// Beat 13 itself gates on accTier:9 but ALSO requires beat 12 first via checkStory's
// narrative-monotonicity rule, so the OR keeps the desk from waiting on an unrelated
// earlier beat once tier 9 is genuinely owned.
export function conciergeUnlocked(state) {
  return state.accommodation.tier >= 9 || state.story.seen.includes(13);
}
// one-shot reveal flash (mirrors checkWellnessReveal/checkPoolTease's pattern).
export function checkConciergeReveal(state) {
  if (state.story.flags.conciergeRevealed) return;
  if (!conciergeUnlocked(state)) return;
  state.story.flags.conciergeRevealed = true;
  notify(state, 'unlock', '🛎️ The Concierge Desk opens: dial in a budget, and let the hotel do some of the shopping.');
}

// ---------- clicker (optional; never the fastest path) ----------
export function click(state) {
  state.stats.totalClicks++;
  const boost = C.CLOUT.comboPerClick * (1 + 0.15 * (state.ascension.tree.athletes_frame || 0));
  // vlogger branch gets extra combo headroom (E12-S7-T2/S4-T2) — see M.effectiveComboMax.
  state._combo = Math.min(M.effectiveComboMax(state), (state._combo ?? 1) + boost);

  // soft-cap tap spam (E01-S5-T6): only C.TAP.maxPerSec taps register cash within any
  // rolling 1-second window (measured in sim time, so it holds under GAME_SPEED too).
  // An autoclicker beyond that still bumps combo/stats but earns no extra cash — tapping
  // stays a bonus, never the fastest path, and the idle rate is always the honest floor.
  const sec = Math.floor(state.stats.runSec);
  if (state.stats.tapWindowSec !== sec) { state.stats.tapWindowSec = sec; state.stats.tapWindowCount = 0; }
  if (state.stats.tapWindowCount >= C.TAP.maxPerSec) return 0;
  state.stats.tapWindowCount++;

  const perSec = M.tierProd(state, 0) + M.savvyPassive(state);
  const baseGain = Math.max(1, perSec * 0.10);

  // energy (E10 "Body & Soul"): a full-energy tap pays a touch more — Body makes the
  // burst bigger — and spends ENERGY.tapCost plus a sliver of Body XP, closing a gentle
  // loop (tapping trains the very Body that fuels tapping). An empty tank still pays the
  // honest ENERGY.tapFloorFrac floor — tapping never blocks, it just tapers (the "idle
  // floor" contract, docs/01 §5). Purely a clicker flourish: nothing here feeds
  // tierProd/tierMultiplier, so it can never move pacing (the harness never taps).
  const bodyLvl = state.skills.body.level;
  const fullEnergy = state.resources.energy >= C.ENERGY.tapCost;
  let gain;
  if (fullEnergy) {
    gain = baseGain * (1 + 0.02 * bodyLvl);
    state.resources.energy = Math.max(0, state.resources.energy - C.ENERGY.tapCost);
    state.skills.body.xp += C.ENERGY.tapBodyXp;
  } else {
    gain = baseGain * C.ENERGY.tapFloorFrac;
  }
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
  // concierge deltas (E11-S9-T4/T5/T6): the offline macro-loop below calls the SAME
  // tick() the online loop does, so a concierge left on runs its SAME bounded, budget/
  // reserve-respecting policy while away — this just diffs its own running totals so the
  // "While you were away" summary can report what it bought (nothing extra to compute).
  const before = { cash: state.resources.cash, clout: state.resources.clout,
    conciergeBought: state.concierge.totalBought, conciergeSpent: state.concierge.totalSpent,
    sponsorsExpired: state.sponsors.totalExpired,
    cryptoYield: state.crypto.lifetimeYield, marketEvents: state.market.totalEvents };
  const total = cappedMs / 1000;
  const step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) tick(state, step);
  return {
    seconds: total,
    cash: state.resources.cash - before.cash,
    clout: state.resources.clout - before.clout,
    capped: elapsedMs > cappedMs,
    conciergeBought: state.concierge.totalBought - before.conciergeBought,
    conciergeSpent: state.concierge.totalSpent - before.conciergeSpent,
    // sponsor deals that lapsed while away (E12-S9-T3/T8): the offline macro-loop calls
    // the SAME tick() the online loop does, so tickSponsors expires any in-flight deal
    // exactly as it would online — this just diffs the running counter for the summary.
    sponsorsExpired: state.sponsors.totalExpired - before.sponsorsExpired,
    // crypto portfolio while away (E13-S9-T3/T4/T7): the SAME tick() the online loop
    // uses drives marketTick + coin yield here too, so a crypto-active player's market
    // events fire (and their coins earn) exactly as they would online — this just diffs
    // the running totals for the "While you were away" summary.
    cryptoYield: state.crypto.lifetimeYield - before.cryptoYield,
    marketEvents: state.market.totalEvents - before.marketEvents,
  };
}
