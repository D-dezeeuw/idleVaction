// config.js — SINGLE SOURCE OF TRUTH for all balance knobs.
// Change numbers here, never in engine code. See docs/01 & docs/05.

export const CONFIG = {
  // ---- loop & saving ----
  TICKS_PER_SEC: 10,        // logical sim ticks per second
  MAX_FRAME_MS: 250,        // clamp tab-stall spikes
  AUTOSAVE_SEC: 15,
  RENDER_FPS: 20,

  // ---- offline / away ----
  OFFLINE_CAP_H: 12,        // generous: no monetization → no punitive cap
  OFFLINE_STEPS: 200,       // macro-steps for offline simulation

  // ---- bank account ladder: the wallet cap (offline-lump control) ----
  // The wallet can only HOLD bankCapAt(state.bank.tier) = base·growth^tier cash; every
  // cash INFLOW (tick income, taps, visit yields, coin sales) is clamped to the free
  // room via engine.gainCash, and ONLY the banked portion counts toward lifetimeCash
  // (so tier reveals, Savvy's sqrt(lifetimeCash) and Legacy are paced by the wallet
  // too). Cash already above the cap is never confiscated — the clamp is inflow-only.
  // WHY: offline runs the same tick() chain at full production with no spending outlet,
  // so the polynomial tier chain compounds into a super-linear lump (measured: a
  // 20-minute save away 12h returned +1.7e8 cash — 135× linear accrual — and chain-
  // bought 12 of the 20 accommodation tiers on return; docs/math-proof.md §11). The cap
  // bounds the returning player's purchasing power to ≈ one wallet, which bounds the
  // accommodation chain-buy depth to ≈ log_ACC.growth(1 + (growth−1)·cap/nextCost) ≈
  // 2–4 tiers worst-case instead of 12. It also closes the "leave the tab open
  // overnight" loophole OFFLINE_CAP_H never covered, because it caps STORED cash, not
  // elapsed time. Constraints (asserted in selftest [83] / data/bank.js validateBank):
  //   · costFrac < 1 — the next account is always affordable within the current cap
  //     (upgrade cost = costFrac·bankCapAt(tier), so the ladder can never soft-lock);
  //   · growth (×10/tier) > ACC.growth (×2.6/tier) — the cap ladder outruns the
  //     accommodation ladder, so a diligent banker is never gated by the wallet;
  //   · the LAST data row is uncapped (Infinity) so late-game D6–D8 purchases (base
  //     8e17…8e23) and NG+ magnitudes are never permanently blocked.
  // Named account rows (flavor only) live in js/data/bank.js and must match `tiers`.
  BANK: { base: 4000, growth: 10, costFrac: 0.35, tiers: 23 },

  // ---- income tier ladder D1..D8 (the multi-level backbone) ----
  // base cost, cost growth per unit, base output per unit
  GEN: {
    // Fitted for a ~20h main run (greedy-optimal harness → island ≈ 18h, robust across
    // buying cadence; casual/idle play lands ~20h+). See docs/math-proof.md §6 and the
    // golden curve in docs/05. The economy grows POLYNOMIALLY with the number of *active*
    // tiers ("degree"); to stretch the run we keep the degree low by (a) steep base spacing
    // so high tiers unlock late and (b) small perUnit on high tiers so they matter only in
    // the late game (they still feed the chain). Steep growth slopes stretch time-to-next
    // purchase and keep the soft-capped milestone tame. Tune with `node js/dev/harness.mjs`.
    base:    [15, 1.6e6, 1.8e10, 1e12, 4e13, 1.2e15, 4e16, 1.4e18],
    growth:  [1.7, 2.3, 2.4, 2.4, 2.5, 2.6, 2.7, 2.8],
    perUnit: [0.55, 0.007, 3e-5, 4e-9, 8e-12, 2e-15, 2e-18, 2e-21],
  },
  MILESTONE_STEP: 10,       // every N buys → tier ×2 (lowered by meta upgrades later)
  MILESTONE_MULT: 2,
  // Soft cap on the doubling stack: the first KNEE doublings are exponential (the fun,
  // visible ×2s), after which extra doublings add only LIN each (linear, not exponential).
  // This removes the cash^α power-law feedback that otherwise makes growth super-
  // exponential (finite-time blow-up + double overflow). See docs/math-proof.md.
  MILESTONE_SOFT_KNEE: 4,
  MILESTONE_SOFT_LIN: 0.5,
  // Mini-milestones (Phase-C refit): every `every` buys adds `bonus` ADDITIVELY inside the
  // milestone layer (a second linear-in-bought factor — ∝ log cash, same safe class as the
  // post-knee tail; see docs/math-proof.md §3/§4). bonus 0 ⇒ the factor is exactly 1 and the
  // pre-refit curve is bit-identical. Purpose: a felt milestone-family event every ~10-15 min
  // mid-game instead of one doubling per ~82 min (audit 2.2).
  MILESTONE_MINI: { every: 5, bonus: 0.05 },
  // Story spacing valve (Phase-C refit): when > 0, at most ONE story beat fires per this many
  // game-seconds — a ready cluster queues in monotone order instead of dumping 3 beats in one
  // tick (audit 2.5: 26 beats on 14 distinct timestamps). 0 ⇒ bit-identical legacy behavior.
  STORY_VALVE_SEC: 90,

  // ---- per-tier "renovation" upgrades: the L_upgrade income layer ----
  // L_upgrade = 1 + L_UPGRADE_RATE · (upgrades bought for that generator tier), additive
  // within this one layer (see math.upgradeMult / engine.buyGenUpgrade). This layer has
  // existed since E03 as an inline `1 + 0.5·n` in math.tierMultiplier; E05 (One Star, Big
  // Dreams) surfaces it as the headline "renovation" mechanic in the UI — pulling the
  // constant here (unchanged value) so it isn't a magic number in engine code, per house
  // style. NOT a second multiplier: accommodation itself has no separate upgrade layer
  // (that would double-count against this one — see docs/coverage.md E05 notes).
  L_UPGRADE_RATE: 0.5,

  // ---- amenities (the small-wins engine) ----
  // xRate/xCap (Phase-C refit): the L_amenity income layer. Every amenity row has carried
  // dormant xMult/xScope fields since E02; this activates them as a ONE-TIME ownership bonus
  // (level ≥ 1) joining ADDITIVELY inside the layer: L_amenity = 1 + min(xCap−1, xRate·Σ xMult
  // of owned amenities in scope). Bounded flat × (roster-capped + hard xCap), never a power of
  // cash — the same safe class as L_dest. xRate 0 ⇒ the layer is exactly 1 (1 + 0·Σ, IEEE-exact)
  // and the pre-refit curve is bit-identical. Scope 'all' hits every tier; 'social' hits the
  // social tiers (k=1,2), matching L_skill's charisma scope.
  AMENITY: { growthDefault: 1.5, comfortWeight: 1.0, xRate: 0.6, xCap: 5.0, costScale: 2.0 },

  // ---- concierge: the first automation seed (E11 "Five-Star Frame of Mind") ----
  // A bounded, OFF-BY-DEFAULT auto-purchaser (state.concierge.on, backfilled false for
  // every save) that spends through the SAME cost/unlock functions a manual click uses
  // (engine.buyAmenity/buyGenerator/buyGenUpgrade — see engine.conciergeTick/
  // conciergeCandidates), never bespoke purchase logic. It only ever considers a
  // whitelisted category, ranks candidates by marginal-gain/cost (mirroring dev/
  // harness.mjs's own ROI-aware amenity payback test for the 'amenity' category — see
  // engine.conciergeCandidates' payback-horizon gate — so it can never buy a cosmetic/
  // dominated amenity, the exact leak the ROI harness itself was built to fix), and
  // spends at most budgetFrac·cash per intervalSec-paced tick, never crossing reserveFloor.
  //   budgetFrac    — fraction of CURRENT cash it may spend, per interval (a 0-50% dial).
  //   intervalSec   — cadence of the policy tick (cheap + legible, not every frame).
  //   reserveFloor  — a cash floor state.concierge.reserveFloor defaults to; never crossed.
  //   tipFrac       — a tiny extra fee taken on top of each auto-buy (payroll-lite sink,
  //                   foreshadowing staff wages in E19's butler, docs/epics/epic-19.md).
  //   defaultOn     — MUST stay false: a fresh newGame() (and the harness, which never
  //                   flips it on) must be completely unaffected, so the fitted ~8h26m
  //                   island time can never move — see docs/coverage.md E11 notes.
  //   whitelist     — the player's STARTING category selection (state.concierge.whitelist
  //                   is seeded from this — amenities only, the conservative default).
  //   categories    — every category the concierge (and its UI checkboxes) may ever
  //                   touch; deliberately excludes accommodation/ascension/story choices
  //                   (E11-S4-T6: those stay hardcoded off-limits in engine.js, never
  //                   data/config-driven, so no config change could ever re-enable them).
  CONCIERGE: {
    budgetFrac: 0.25,
    intervalSec: 5,
    reserveFloor: 0,
    tipFrac: 0.01,
    defaultOn: false,
    whitelist: ['amenity'],
    categories: ['amenity', 'generator', 'upgrade'],
  },

  // ---- optional tap (E01-S5) ----
  // Tapping is purely additive, never a gate. maxPerSec caps how many taps register cash
  // within any rolling 1-second window (see engine.click), so an autoclicker can't
  // trivialize the economy — the idle rate is always the honest floor.
  TAP: { maxPerSec: 8 },

  // ---- energy: optional clicker fuel (E10 "Body & Soul") ----
  // A pure UI/clicker flourish — nothing in tierProd/tierMultiplier/computeComfort reads
  // energy, so it can never move the harness's max-speed island time (the harness never
  // taps; see math.energyMax/energyRegenRate and engine.click). base/perBody size the
  // tank AND its regen rate — a fitter Body means a bigger, faster-refilling tank.
  // tapCost is spent per full-energy tap; tapFloorFrac is what a tap still pays once the
  // tank is empty (never zero — the "idle floor" contract, docs/01 §5); tapBodyXp is the
  // small Body XP a full-energy tap grants, closing a gentle loop (tapping trains the
  // very Body that fuels tapping).
  ENERGY: { base: 100, perBody: 0.08, regen: 2, tapCost: 5, tapFloorFrac: 0.25, tapBodyXp: 3 },

  // ---- comfort (UNBOUNDED sum; the log multiplier softcaps its *effect*) ----
  COMFORT: {
    C0: 100,                // scale for the log multiplier
    MULT: 0.4,              // strength of L_comfort
    wAcc: 1.0, wAmen: 1.0, wBody: 8.0,
    // E22 owned property (a NEW ComfortRaw term, w_prop·propertyScore). propertyScore is 0 with
    // nothing owned, so `... + wProp·0` is bit-identical to the pre-E22 sum (x+0 exact in IEEE754)
    // and the fitted 29705s island cannot drift — the greedy harness never buys a deed.
    wProp: 1.0,
  },
  // one-shot "Comfort now multiplies income" flash (E06-S2-T6/S4-T1): fires once
  // L_comfort first crosses this threshold. Display-only — never touches income math,
  // so it lives outside the COMFORT block (whose mult/C0 stay the multiplier's sole levers).
  COMFORT_ONLINE_MULT: 1.5,

  // ---- owned property (E22 "A Bungalow of One's Own") ----
  // The rent→own flip: a one-time deed adds a PERSISTENT Comfort term (w_prop·propertyScore) that
  // reads state.property only — never accommodation.tier — so climbing the rented ladder never
  // zeroes it (the persistence guarantee, S2-T3). Every value here is opt-in: propertyScore is 0
  // and ownerPrideMult is 1 until a deed is bought, and the accommodation ladder stays purely
  // Comfort-gated (NOT property-gated), so the greedy harness reaches the island without ever
  // buying property → island unchanged at 29705s. ownCost/baseComfort are indexed by property
  // order [bungalow, overwater_villa]. Upgrade cost = base·growth^rank (growth 1.6). ownerPride is
  // a small BOUNDED flat × per owned property (max 2 owned ⇒ ≤ ×1.10) folded into the stack.
  PROPERTY: {
    // indexed [bungalow, overwater_villa, villa (E23), estate (E23)]
    ownCost:     [5e9, 6e10, 7e11, 8e12],       // deed price — a few minutes of income at each unlock
    baseComfort: [1.5e8, 4.5e8, 1.4e9, 4e9],    // persistent Comfort floor per property
    base: 4e8,                    // upgrade cost base
    growth: 1.6,                  // upgrade cost growth per rank
    ownerPride: 0.05,             // flat global × per owned property (bounded — max 4 ⇒ ≤ +20%)
  },

  // ---- accommodation ladder ----
  ACC: {
    base: 50,               // accScore base
    growth: 2.6,            // each tier's comfort weight ~2.6× the previous
    cashMult: 160,
    costExp: 1.08,          // late-anchored pricing: cost ∝ accScore^costExp (1 = legacy flat)           // cash cost of a tier = accScore(tier)·cashMult
    // Next tier unlocks when Comfort ≥ accScore(nextTier)·unlockFrac.
    // unlockFrac < 1/growth (0.385) guarantees owning a tier nearly unlocks the
    // next on its own — amenities/Body just bring it sooner. Never a hard stall.
    unlockFrac: 0.33,
  },

  // ---- personal-growth skills ----
  SKILL: { base: 50, growth: 1.25 },
  CHARISMA_RATE: 0.03,      // L_skill social = 1 + 0.03·level
  COMMS_DISCOUNT: 0.005,    // cost -0.5%/level
  COMMS_DISCOUNT_CAP: 0.60, // never below 40% of cost
  SAVVY_YIELD: 0.02,        // passive cash = savvy·YIELD·sqrt(totalCash)

  // ---- build paths ----
  PATH: { rate: 0.02, softcapExp: 0.85 },

  // ---- destinations & transport (World Traveler backbone; E04) ----
  // costGrowth: extra × per ADDITIONAL destination already owned (compounds with each
  //   row's own costBase spacing) — paces "collect them all" toward the ~10-20min/place
  //   cadence (docs/05 §5); a row may override with its own `costGrowth`.
  // baseMult: fallback global × for a destination row that omits its own `mult`.
  // visitYield: tiny flat cash from the repeatable, free `visitDestination` action.
  // visitPathPoints: the one-off traveler-point bonus a manual visit grants (deliberately
  //   NOT a per-tick trickle — L_dest already multiplies across every generator tier, so
  //   an UNBOUNDED per-second point source compounds into a runaway; see docs/05 golden-
  //   drift note / harness §9 and the E04 balance-tuner escalation note in math.js).
  DEST: { costGrowth: 1.15, baseMult: 1.10, visitYield: 15, visitPathPoints: 0.2,
    // E24 "Where the Rich Hide": the premium set-collection bonus. Owning N premium destinations
    // (Monaco/Dubai/Maldives/Aspen/St. Barths) grants an escalating GLOBAL × via math.destSetMult —
    // indexed by count, so [1]=own 1 (no bonus yet), [2..5] escalate. Folded into destMult (the
    // L_dest layer). 1 for 0–1 owned, so the greedy harness (owns 0 premium) is unmoved. The gate
    // (engine.destUnlocked) additionally needs the summit era (owned property OR exclusivity > 0),
    // which the harness never has — belt-and-suspenders on the 29705s invariant.
    setBonus: [1, 1, 1.15, 1.35, 1.6, 2.0] },   // index = premium count owned (0..5)

  // ---- vlogger clout ----
  // dClout/dt = (contentRate + content-tier/gear contentRate) · (1+charismaBoost·charisma) ·
  // comboMult · vloggerPerk · pathBoost · magnetic · sponsorMult (math.cloutRate — E12
  // "Lights, Camera, Clout" pulls the formula that used to live inline in engine.tick out
  // into a pure, testable function). contentRate/charismaBoost/comboDecaySec/comboPerClick/
  // comboMax are FITTED (shipped since E10) and stay exactly as they were — never retuned
  // here (see docs/coverage.md E12 notes). The three keys below are NEW, additive, and
  // clicker/branch/Clout-economy scoped only — none of them touch tierProd/tierMultiplier/
  // computeComfort, so none can move the harness's max-speed island time. (A "combo also
  // gives a small cash trickle" secondary reward — per the epic's S4-T5 — was tried and
  // DROPPED: at a sustained max-tap rate it broke E10's own anti-clicker ratio invariant
  // [52] (tap income must stay < 35% of idle income), so Clout stays the combo's ONLY
  // payoff, matching E10's established "clicker never meaningfully competes with idle
  // income" contract instead of loosening it. See docs/coverage.md E12 notes.)
  CLOUT: {
    contentRate: 1.0, charismaBoost: 0.02, comboDecaySec: 30, comboPerClick: 0.15, comboMax: 5,
    // vloggerPerk: the branch's signature Clout bonus (×1+vloggerPerk when
    // paths.vlogger.points>0) — previously an inline `0.25` in engine.tick; surfaced here
    // per house style (value UNCHANGED, see E12-S1-T6 / docs/coverage.md).
    vloggerPerk: 0.25,
    // vloggerComboBonus: extra combo HEADROOM (added to the fitted comboMax, never
    // replacing it) on the vlogger branch only — math.effectiveComboMax, used by
    // engine.click's cap. comboDecaySec/comboPerClick (the actual decay RATE) are
    // untouched, so a vlogger's bigger tank just takes proportionally longer to fully
    // drain at the SAME rate — an emergent "stronger combo window" (see the perk text
    // already shipped in data/paths.js) without retuning the shared fitted constant.
    vloggerComboBonus: 2,
    // contentPathNudge: a tiny ONE-OFF vlogger path-point nudge per content-tier
    // PURCHASE (mirrors DEST.visitPathPoints' "one-off on a discrete action, never a
    // per-tick trickle" pattern exactly) — so it can't compound into the runaway that
    // pattern was designed to avoid (see DEST's comment above).
    contentPathNudge: 0.1,
  },

  // ---- sponsor deals (E12 "Lights, Camera, Clout"): OPT-IN, TIMED Clout multipliers ----
  // A deal only ever applies once explicitly ACCEPTED (engine.acceptSponsor) — nothing
  // here auto-applies, so a fresh newGame() and the harness (which never calls
  // acceptSponsor) are completely unaffected; the fitted ~8h26m island time cannot move
  // (see docs/coverage.md E12 notes). Non-stacking by construction, not just by config:
  // state.sponsors.active is a SINGLE slot (never an array), so at most one deal's mult
  // is ever live at a time. offerIntervalSec paces how often a new offer is rolled once
  // nothing is active; cooldownSec is the DEFAULT per-deal cooldown after a deal's buff
  // expires (a deal's own data may override with a longer cooldownSec for a stronger
  // mult — see data/sponsors.js) — both are pacing/anti-runaway knobs for a currency
  // (Clout) that never feeds the cash multiplier stack, so neither can move the harness.
  SPONSOR: { offerIntervalSec: 90, cooldownSec: 180 },

  // ---- crypto market (E13 "Money Works While You Tan"): OPT-IN, crypto-holdings-ONLY
  // volatility. Everything read from this block only ever multiplies crypto coin-yield
  // cash (math.cryptoYieldPerSec) — it NEVER touches tierProd/tierMultiplier/
  // savvyPassive — and the whole scheduler is gated off (engine.marketTick's cryptoActive
  // check) until the crypto path has points or a coin is held. A fresh newGame() and the
  // harness (which never buys into crypto) therefore see phase:'calm', mult:1, zero
  // scheduler draws, ever — the fitted ~8h26m island time cannot move (see
  // docs/coverage.md E13 notes / the harness-invariance test).
  //   seed            — default seed; migrate() reseeds existing saves from meta.createdAt.
  //   tickVolatility  — ± baseline "chop" jitter always present while crypto is active,
  //                     damped per-hedge by HEDGES' varianceDamp (math.marketBaselineJitter).
  //   eventEveryRange — seconds of calm between one event ending and the next being
  //                     drawn (engine.marketTick) — a boom/crash/chop every ~3-6 min.
  //   crashFloor/boomCap — hard clamp on marketMult regardless of hedges/branch perk —
  //                     crashes never zero cash, booms never runaway (engine/math guard).
  //   sellFrac        — selling a coin back pays this fraction of its marginal buy price
  //                     (engine.sellCoin), modulated by the live marketMult.
  //   buyPathNudge    — one-off crypto path-point nudge per coin PURCHASE (mirrors
  //                     DEST.visitPathPoints/CLOUT.contentPathNudge's "one-off on a
  //                     discrete action, never a per-tick trickle" pattern exactly).
  //   branchBoomBonus — the crypto branch's "market-event upside+" perk: boom multipliers
  //                     are raised this fraction when story.branch==='crypto' (E13-S7-T2).
  //   maxCrashDamp    — hedges+Unshakeable combine multiplicatively toward, but never
  //                     past, this ceiling — bounded downside, never full immunity.
  // MARKET_EVENTS' weights (see data/crypto.js) were Monte-Carlo checked to land
  // long-run E[marketMult] ~= 1.05 (a slight positive drift, per the epic's "exciting but
  // never free money" target) — a first-pass fit, not a rigorously tuned constant; a
  // deeper balance pass belongs to @balance-tuner if the crypto lane ships as a headline.
  MARKET: {
    seed: 1337,
    tickVolatility: 0.03,
    eventEveryRange: [180, 360],
    crashFloor: 0.10,
    boomCap: 15,
    sellFrac: 0.6,
    buyPathNudge: 0.1,
    branchBoomBonus: 0.25,
    maxCrashDamp: 0.95,
  },

  // ---- connoisseur economy (E14 "Acquired Taste"): OPT-IN, gated-off-by-default ----
  // The whole Old-Money Aesthete lane (exclusivity ×, luxury discount, appreciation, the
  // +25% luxury-Comfort perk) stays a hard no-op until the connoisseur system is genuinely
  // engaged — engine.connoisseurActive is true only once state.paths.connoisseur.points>0
  // OR a collection asset is owned (count>0), EXACTLY mirroring engine.cryptoActive's gate.
  // A fresh newGame() and the harness/selftest playStep (a committed VLOGGER that never buys
  // collections and never earns connoisseur points) therefore see exclusivity 0, luxuryCostMult
  // 1, no appreciation advance, and no Comfort perk — so the fitted 29705s island time cannot
  // move (see the harness-invariance tests [62]/[68]/[80]/[89]). All three blocks below feed
  // ONLY log/bounded terms: exclusivity is a bounded log × (same shape as L_comfort), the
  // discount is clamped, and appreciation is display-only and hard-capped — none of them is a
  // positive power of cash (the finite-time-singularity class, docs/math-proof.md §3/§4).

  // TASTE: the luxury cost discount + connoisseur sell/comfort scalars. NOTE: the `taste`
  // skill LEVELS on the shared SKILL curve (base 50, growth 1.25) — deliberately NOT a
  // separate TASTE.base/growth (the epic's S2-T1 literal ask is SUPERSEDED: a second XP curve
  // would desync the beat-25 `taste:25` gate and risk the harness; one unified skill curve).
  //   discount            — luxury cost multiplier is clamp(1 − discount·tasteLevel, 0.4, 1),
  //                         the −60% floor at S8-T2 (reached at tasteLevel 30). GATED to
  //                         connoisseur-active — the "old-money haggle" only a committed
  //                         aesthete gets — so an ungated discount can't cheapen the luxury
  //                         amenities the greedy vlogger buys and move the island.
  //   luxuryComfortPerk   — the connoisseur branch's +25% Comfort on tag:'luxury' amenities
  //                         AND owned collections (E14-S2-T8/S7-T1), applied ONLY when
  //                         story.branch==='connoisseur' (math.computeComfort). +0 for the
  //                         vlogger harness ⇒ Comfort invariant.
  //   buyPathNudge        — one-off connoisseur path-point per asset PURCHASE (mirrors
  //                         MARKET.buyPathNudge/DEST.visitPathPoints exactly — a discrete
  //                         action, never a per-tick trickle), credited via addPathPoints so
  //                         it feeds ONLY a committed connoisseur life.
  //   sellFrac/sellTastePerLevel/sellCap — liquidating an appreciated piece pays
  //                         min(sellCap, sellFrac + sellTastePerLevel·tasteLevel) of its
  //                         current appreciated value (engine.sellAsset), so Taste sells
  //                         better but a round-trip is never free (cap < 1). Selling also
  //                         sheds the piece's exclusivity + Comfort — the real hold-vs-sell
  //                         tradeoff (E14-S4-T3/T4).
  TASTE: { discount: 0.02, luxuryComfortPerk: 0.25, buyPathNudge: 0.1,
    sellFrac: 0.6, sellTastePerLevel: 0.01, sellCap: 0.95 },

  // EXCLUSIVITY: refinement → a bounded GLOBAL × folded into the multiplier stack alongside
  // L_comfort. L_exclusivity = 1 + rate·log10(1 + exclScore/E0) — a LOG of a bounded score,
  // never a power of cash (the only safe multiplier shape, docs/math-proof.md §4). The score
  // is exclScore = (Σ owned collections' count·exclusivity + Σ owned luxury amenities'
  // level·(exclusivity||0))^softExp — softExp<1 tames the raw sum (E14-S2-T3) — then a
  // one-time ×(1+setBonus) per completed themed set (all ART and/or all WINE, E14-S4-T5) and
  // the connoisseur branch's own ×(1+branchBonus) exclusivity perk (E14-S7-T2). Zero (⇒ ×1)
  // whenever the connoisseur system is inactive, so the harness is unaffected.
  // Fitted (probe: a committed connoisseur mid-Act-II) to a ~1.5–3× global × — comparable to
  // the other lanes, never dominant (E14-S8-T1/S10-T10).
  EXCLUSIVITY: { rate: 0.8, E0: 7, softExp: 0.7, setBonus: 0.25, branchBonus: 0.25 },

  // APPRECIATION: art/wine quietly grow in stored value while held. value =
  // boughtValue·(1 + appreciationRate·globalRate)^ageYears, ageYears = age(game-seconds)/
  // yearSec, HARD-capped at boughtValue·valueCap so no single piece runs away (E14-S4-T8/
  // S10-T6). Deterministic + PURE (same boughtValue+age+rate ⇒ same value, no wall-clock —
  // E14-S10-T3): age advances in GAME-TIME inside engine.tick, so offline macro-step replay
  // is automatically identical (E14-S2-T6/S9-T3), exactly like the crypto scheduler.
  //   globalRate — a single dial scaling every asset's own appreciationRate (0.01–0.08).
  //   yearSec    — game-seconds per appreciation "year": 3600 ⇒ a full ~20h run ages a piece
  //                ~20 years, so a grand cru (rate 0.05) grows ~×2.6 and the fastest lot
  //                (0.08) ~×4.7 — FELT within a multi-hour session yet far SLOWER than active
  //                income, which outpaces it into the billions (E14-S4-T10/S8-T3).
  //   valueCap   — the hard ceiling as a MULTIPLE of purchase price (×8): even at extreme
  //                age/GAME_SPEED a piece is capped, never a runaway.
  // NET-WORTH DECISION (mandated): the appreciated value feeds a DISPLAY-ONLY
  // math.collectionNetWorth and does NOT feed stats.lifetimeCash / lifetimeCashThisTree —
  // the wallet cap (§11) and Legacy (§12) invariants depend on those being banked-cash-only,
  // so the epic's S2-T7 ("feed Savvy/prestige lifetimeCash") is SUPERSEDED by this
  // conservative choice; appreciated value never couples into Savvy or Legacy.
  APPRECIATION: { globalRate: 1.0, yearSec: 3600, valueCap: 8 },

  // ---- private logistics (E15 "Keys to the Coupe"): OPT-IN, gated-off-by-default ----
  // The whole garage lane (the logistics ×, the fleet-upkeep drain, the traveler −15%
  // destination discount) stays a hard no-op until a car is genuinely EQUIPPED —
  // math.logisticsActive is true only once state.vehicles.equipped is non-empty, EXACTLY
  // mirroring engine.cryptoActive / math.connoisseurActive. A fresh newGame() and the
  // committed-VLOGGER harness/selftest playStep (which never buys or equips a car, and
  // picks the vlogger branch — so the traveler discount is never in scope) therefore see
  // logisticsMult 1, fleetUpkeep 0, destDiscountMult 1, availableSlots unmoved, _logiCache
  // exactly 1 — so the fitted 29705s island time cannot move (harness-invariance tests
  // [62]/[68]/[80]/[89]/[90]). SAFETY CLASS: logisticsMult is a BOUNDED flat × — the
  // equipped fleet is capped by availableSlots (a small integer), so Σ(equipped
  // logisticsMult) is bounded and logisticsMult never depends on cash. It is the SAME safe
  // class as L_dest / the path-stage flat bonuses, NOT a positive power of cash (the
  // finite-time-singularity class, docs/math-proof.md §3/§4). Upkeep is a flat cash/s
  // drain (like transport upkeep), clamped so cash never goes negative online or offline.
  //   baseSlots           — transport slots before any perk. availableSlots(state) =
  //                         baseSlots + (traveler branch ? +1) + wanderer rank + garageSlots
  //                         (math.availableSlots). Small on purpose so fleet composition
  //                         (many small cars vs one supercar) is a live tradeoff (S8-T4).
  //   rate                — logisticsMult = 1 + rate·Σ(equipped car.logisticsMult). Fitted
  //                         (probe: a committed traveler mid-Act-II) so a mid-fleet lands a
  //                         ~1.3–2× destination × comparable to the other lanes (S8-T1).
  //   upkeepScale         — fleetUpkeep = Σ(equipped car.upkeep)·upkeepScale cash/s. Fitted
  //                         so at fleet-introduction income the biggest car's upkeep is a
  //                         real fraction of income (net still positive), making "run the
  //                         supercar or not" a genuine decision (S8-T2/T3), not an auto-buy.
  //                         A FLAT drain (like transport upkeep) — it bites hardest early,
  //                         then income outgrows it, exactly the intended graduation curve.
  //   destDiscountTraveler— the traveler branch's −15% destination-cost perk (S2-T7/S7-T2),
  //                         applied in engine.destCost ONLY when story.branch==='traveler'
  //                         (branch-gated ⇒ the vlogger harness never sees it).
  //   wandererDestDiscount— Wanderer's Instinct (data/skilltree.js) is "−20% destinations &
  //                         +1 slot per rank"; this is the −20%/rank cost figure, applied
  //                         multiplicatively (×(1−this)^rank) and stacked with the traveler
  //                         perk + the staged track's destDiscount, all in math.destDiscountMult.
  //   destDiscountFloor   — hard floor on the STACKED destination discount: destDiscountMult
  //                         never falls below this fraction (S8-T6/S10-T5), so traveler +
  //                         Wanderer + full track can never drive a destination implausibly
  //                         cheap. (Bounds cost from below; never affects the harness, whose
  //                         stack is exactly 1.)
  //   repossessGraceSec   — game-seconds of continuously-unmet upkeep before the costliest
  //                         equipped car is auto-unequipped (repossession, S2-T9/S8-T8).
  //                         Deterministic in game-time ⇒ offline replay matches online. Sized
  //                         so accidental over-equipping is recoverable, not punishing.
  //   buyPathNudge        — one-off traveler path-point per car PURCHASE (mirrors
  //                         MARKET.buyPathNudge / DEST.visitPathPoints — a discrete action,
  //                         never a per-tick trickle), credited via addPathPoints so it feeds
  //                         ONLY a committed traveler life (the anti-hopping contract).
  //   E16 "Sea Legs" extends the SAME gate/fold to boats + a pre-staff crew (data/logistics.js):
  //     boatRate/crewRate scale owned boats'/crew's `mult` into the same L_logistics × (a boat
  //     is OWNED, not equipped — owning it grants its mult + slotBonus + upkeep). Boats' slotBonus
  //     is tracked in state.vehicles.boatSlots (engine.buyBoat maintains it) and read by
  //     math.availableSlots; their upkeep folds into math.fleetUpkeep alongside cars/crew and is
  //     drained by the SAME applyFleetUpkeep. logisticsActive is true once a car is equipped OR a
  //     boat/crew is owned, so a fresh newGame() and the committed-vlogger harness (which buy
  //     none of it) still see logisticsMult 1, fleetUpkeep 0, availableSlots unmoved, boatTier 0
  //     ⇒ sea:true destinations never unlock ⇒ L_dest and the fitted 29705s island are unmoved.
  //     boatRate/crewRate are first-pass (a full boat fleet ≈ +2.5–3× logistics, bounded by the
  //     5-boat ladder — same safe bounded-flat class as L_dest); per-boat/crew mult/upkeep/
  //     slotBonus/crewCap live in data/logistics.js.
  LOGISTICS: {
    baseSlots: 2, rate: 0.5, upkeepScale: 320,
    destDiscountTraveler: 0.15, wandererDestDiscount: 0.20, destDiscountFloor: 0.15,
    repossessGraceSec: 60, buyPathNudge: 0.1,
    boatRate: 0.30, crewRate: 0.50,
    // E17 "Wheels Up" (logistics capstone): jetRate folds owned jets' mult into L_logistics like
    // boats; jetDiscount is a real destination-cost cut applied (clamped by destDiscountFloor,
    // never free) once ANY jet is owned; capstone is a distinct multiplicative × on L_logistics
    // when a car AND a boat AND a jet are all owned (the payoff for the whole logistics arc —
    // math.capstoneActive/logisticsMult). All opt-in/gated: the vlogger harness owns no jet ⇒
    // jetTier 0 (air destinations locked), no jetDiscount, no capstone ⇒ island unmoved. First-
    // pass (bounded: 5-jet ladder + a single capstone factor); tune with the connoisseur-lane probe.
    jetRate: 0.20, jetDiscount: 0.20, capstone: 0.50,
  },

  // ---- staff & automation (E19 "At Your Service"): the butler ----
  // A hireable butler with a continuous PAYROLL wage (the new sink) whose auto-buy reuses the E11
  // concierge's bounded ROI policy. OFF until hired: a fresh newGame() and the greedy harness
  // never hire, so payroll is 0 and nothing is automated — the fitted 29705s island cannot move
  // (same off-by-default invariance as the concierge). wageBase ~3-6% of income at the beat-19
  // hire point; wageGrowth 1.18 so leveling scales cost faster than benefit past a point.
  // autoBuyInterval/minInterval pace the policy; reserveSec keeps ≥ N seconds of wages in reserve
  // so the butler never bankrupts you (auto-buy never crosses that floor).
  STAFF: { autoBuyInterval: 2, minInterval: 0.5, reserveSec: 20, roiHintEnabled: true,
    // E20 "The Whole Household": staffCap (base hireable roles; +serviceWingSlots from the
    // Service Wing accommodation upgrade). Income-× roles (chef/trainer/driver/manager) each add
    // xMultBase·level·moraleMult to one bounded L_staff layer; the housekeeper lifts morale.
    staffCap: 6, serviceWingSlots: 3, housekeeperMoraleGain: 8 },
  // MORALE (E20): moraleMult(m) = clamp(1 + rate·log10(1+m/M0), min, max) — a softcap so a happy
  // household helps but never explodes; morale drifts toward 100 (or down when payroll is unpaid),
  // lifted by the housekeeper + Staff-Quarters amenities. 0 income effect when no income-× staff.
  MORALE: { rate: 0.25, M0: 30, min: 0.5, max: 1.5, decayPerHour: 6, target: 100 },

  // ---- lineage (E25-A "The Family Album"): retirement & the family album ----
  // A strictly COSMETIC layer over the shipped ascension. Retiring pushes the character onto an
  // album (capped, oldest compacted) and starts an heir a generation later. `state.lineage` joins
  // the ascension keep-list as BOOKKEEPING — NEVER read by any math.js/engine.js income path (docs/04
  // §1b rule 1), so it cannot affect balance and the harness (which never ascends) is untouched.
  LINEAGE: { albumCap: 100, nameMaxLen: 24 },

  // ---- estate: grounds + estate staff + property×staff synergy (E23 "Villa Vita") ----
  // The scale-both-together loop. Estate staff (gardener/pool tech/groundskeeper/estate manager,
  // data/staff.js `estate:true`, xMultBase 0 so they stay OUT of L_staff) get their OWN wing: the
  // cap only grows once a villa/estate deed is owned (staffSlots), so the greedy harness — which
  // owns no property and hires no one — keeps cap 6 and never engages the wing. Synergy:
  //   L_estate = 1 + synergyRate·sqrt(assignedEstateStaff · propertyLevel)      (sqrt-softened, §4)
  // with the estate manager on the 'synergy' slot multiplying synergyRate by (1+managerBoost).
  // L_estate is EXACTLY 1 whenever no estate staff are assigned (sqrt(0)=0), so it is harness-neutral
  // and the fitted 29705s island cannot move. GROUNDS clusters are ordinary tag:'grounds' amenities
  // (feed w_amen via amenityScoreTotal), gated on owning the villa/estate (unlockProperty).
  ESTATE: { synergyRate: 0.6, managerBoost: 0.5, staffSlots: 4 },

  // ---- ascension / legacy ----
  // LEGACY_SCALE was retuned 1e6 → 1e10 with the ascension hard reset (math-proof §12,
  // the §7/P3 item): at 1e6 a single fitted ~8.5h run paid ~1,183 Legacy — enough to
  // buy 56 of the tree's 79 total ranks IN ONE GO, which (with the old power
  // carry-overs) collapsed the next run to ~11 minutes. At 1e10 the first ascension
  // pays ~11 (a couple of rank-1 abilities), and the geometric node costs
  // (TREE.nodeBase·2^rank) meter the tree out across many ascensions — the √-telescoped
  // payout plus the gate-inflated cash of later runs keeps each ascension affording a
  // few more ranks, never the whole tree.
  LEGACY_K: 1.0,
  LEGACY_SCALE: 1e10,
  LEGACY_EXP: 0.5,
  ASCEND_MIN_RUN_SEC: 120,  // can't ascend in the first 2 min of a run
  // Ascension gate scaling: accommodation tier t (the game's phase gates) costs
  // ×base^(count^countExp · (t/span)^exp) — see math.ascGateMult / docs/math-proof.md
  // §12. Two curves, both deliberate:
  //   · PARABOLIC in tier (exp 2): early tiers barely scale — a fresh ascension FEELS
  //     powerful, the tree rips through them faster than run 1 — while the island
  //     itself carries the full ×base^(count^0.5), stretching every ascended run back
  //     over the ≥8h design floor after the hard reset removed the old power leaks.
  //   · √ in ascension count (countExp 0.5): tree power arrives on a √N Legacy arc
  //     (LEGACY_EXP + the gate-deflated payout, math.ascCashNorm), so a LINEAR count
  //     exponent outruns it forever (measured: +2h+ per ascension, unbounded) — the
  //     √-count gate rises on the same curve the tree does and the two settle into a
  //     stable band.
  // Fitted with the ascension probe (greedy-bot lower bounds; run 1 untouched, count=0
  // ⇒ ×1 everywhere; re-measured after the committed-path stage tracks landed): runs
  // 1..6 = 8h15m, 8h40m, 9h29m, 9h54m, 10h30m, 10h40m — every ascension ≥ 8h, early
  // tiers faster than run 1 (t5 ≈ 1h19-1h23 vs 1h27), late tiers slower, increments
  // decaying toward a ~10-11h plateau. The bank ladder absorbs the scaling untouched —
  // higher gates simply pull the wallet-cap tiers you must reach for each phase up
  // with them (probe: peak bank tier 9 → 10 across six ascensions; BANK.growth 10
  // outruns ACC.growth 2.6 × the gate's local slope).
  ASCEND_GATE: { base: 6, exp: 2, span: 20, countExp: 0.5 },

  // ---- the private island (E27 "The Island Listing") ----
  // The dream purchase: the single biggest sink in the game — a MULTI-CURRENCY mega-cost calibrated
  // to ~1–2 ascensions of saving. This is a SEPARATE opt-in acquisition on top of reaching the
  // accommodation tier-20 rung (which stays Comfort-gated so the greedy harness still reaches the
  // island rung at 29705s). The price includes `legacy`, and the listing only appears at beat 28
  // (legacy ≥ legacyGate) — the harness never ascends (legacy 0), so it can NEVER see the listing or
  // afford the island, and state.island.owned stays false ⇒ L_island stays 1 ⇒ the fitted island
  // time is unmoved. Comfort is a THRESHOLD (a derived stat recomputed each tick — it cannot be
  // debited), while cash/clout/legacy are debited (docs: S2-T3 decision). incomeMult is the bounded
  // relocation reward (owning the island ⇒ a flat global ×, permanent — it survives ascension as a
  // meta key), exactly 1 while unowned.
  ISLAND: {
    price: { cash: 1e12, comfort: 5e9, clout: 1e5, legacy: 25 },   // comfort = threshold; rest debited
    legacyGate: 20,        // the listing appears at beat 28 (legacy ≥ this) — matches beat 28's gate
    incomeMult: 1.5,       // relocation reward: a bounded flat × on all income while the island is owned
    relocate: ['logistics', 'staff', 'signatureAmenities'],
  },

  // ---- island resort economy (E28 "Building Paradise") ----
  // Buildings (data/island.js) host paying GUESTS — a new revenue tier where other people's money
  // finally flows TO the former shed-dweller. guestDemand = GUEST_K·log10(1+Comfort/GUEST_C0)·
  // exclusivityMult (log-softcapped, no runaway). guestIncome = guestDemand·Σ(count·guestBase),
  // then the full M_k stack applies via the runtime multiplier. Upkeep is a scaling cash sink so
  // "bigger" is a CHOICE, not a no-brainer. ALL of it is gated on state.island.owned (the engine
  // runs no island production until then), so the greedy harness — which never buys the island —
  // sees guest income 0, builds nothing, and the fitted 29705s island time cannot move.
  GUEST_K: 0.5, GUEST_C0: 1e8, GUEST_MILESTONE_STEP: 10, UPKEEP_SCALE: 1.0,

  // ---- permanent skill tree (E26 "Who You Become") ----
  // costLegacy(rank) = nodeBase·nodeGrowth^rank. respecFee is the Legacy cost of a full respec,
  // deducted from the refund (E26-S4/S8: "0 before the Legend layer" — free now, a lever E30 can
  // raise). 0 ⇒ respec refunds exactly legacySpent, so shipped behaviour is unchanged.
  TREE: { nodeBase: 5, nodeGrowth: 2.0, respecFee: 0 },

  // ---- Legend: the SECOND prestige layer + New Game+ (E29 "Empire of Leisure") ----
  // Legend is prestige-2: a reset that wipes Legacy AND the permanent tree (AND ascension.count) for
  // LEGEND points, spent in a meta-meta shop (data/legend.js) whose income perks feed a new L_legend
  // layer. legendGain = floor(LEGEND_K·sqrt(totalLegacyEverEarned/LEGEND_SCALE)) − banked (the same
  // √ anti-runaway template one layer up). Gated on minAscensions so it can't fire on run 1.
  // New Game+ hardens the whole world: story/accommodation CASH gates ×gateScale^ngPlus, destinations
  // reshuffle by seed, offset by a persistent income ×incomeMult^ngPlus so cycles compress.
  // ALL of it is neutral at zero state: the greedy harness never ascends (0 Legacy ⇒ 0 Legend, 0
  // NG+), so L_legend = 1, ngPlusGateMult = 1, ngPlusIncomeMult = 1 — the fitted 29705s is unmoved.
  LEGEND_K: 1, LEGEND_SCALE: 1e7, LEGEND_EXP: 0.5,
  LEGEND: { minAscensions: 3 },
  NGPLUS: { gateScale: 1.5, incomeMult: 3.0, destShuffleSeedBase: 40000 },

  // ---- achievements & live-ops (E30 "Legends of Leisure") ----
  // Achievement/collection rewards feed L_achieve = 1 + Σ rewards, curved by achieveRewardCap so
  // 100% completion never trivializes NG+. In-run milestone trophies carry reward 0 (harness-safe);
  // only meta/collection achievements carry the ×. seasonalMultCap bounds the live-ops nudge.
  ACHIEVE: { rewardCap: 0.75, seasonalMultCap: 1.1 },

  // ---- pacing / QA (NEVER used to balance — only to pace/test) ----
  // gameSpeed multiplies simulated time in the loop. 1 = natural course; the high presets +
  // the custom input let QA run the ~20h arc in seconds. The custom field accepts any value
  // up to GAME_SPEED_MAX (hyperspeed). Effective speed is also bounded by MAX_STEPS_PER_FRAME
  // (a per-frame tick budget so a huge speed can't hang the tab).
  GAME_SPEED_CHOICES: [0.25, 0.5, 1, 2, 5, 10, 100, 1000, 10000],
  DEFAULT_GAME_SPEED: 1,
  GAME_SPEED_MAX: 1e6,
  MAX_STEPS_PER_FRAME: 20000,   // at 10 tps → 2000 sim-sec/frame → a 20h run in ~0.3s real

  SAVE_KEY: 'idlevaction.save.v1',
  SAVE_VERSION: 1,
};
