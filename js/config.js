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
    base:    [15, 6e4, 7e8, 8e11, 8e14, 8e17, 8e20, 8e23],
    growth:  [1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5],
    perUnit: [1, 0.007, 3e-5, 2e-9, 2e-13, 2e-17, 2e-21, 2e-25],
  },
  MILESTONE_STEP: 10,       // every N buys → tier ×2 (lowered by meta upgrades later)
  MILESTONE_MULT: 2,
  // Soft cap on the doubling stack: the first KNEE doublings are exponential (the fun,
  // visible ×2s), after which extra doublings add only LIN each (linear, not exponential).
  // This removes the cash^α power-law feedback that otherwise makes growth super-
  // exponential (finite-time blow-up + double overflow). See docs/math-proof.md.
  MILESTONE_SOFT_KNEE: 4,
  MILESTONE_SOFT_LIN: 0.5,

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
  AMENITY: { growthDefault: 1.5, comfortWeight: 1.0 },

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
  },
  // one-shot "Comfort now multiplies income" flash (E06-S2-T6/S4-T1): fires once
  // L_comfort first crosses this threshold. Display-only — never touches income math,
  // so it lives outside the COMFORT block (whose mult/C0 stay the multiplier's sole levers).
  COMFORT_ONLINE_MULT: 1.5,

  // ---- accommodation ladder ----
  ACC: {
    base: 50,               // accScore base
    growth: 2.6,            // each tier's comfort weight ~2.6× the previous
    cashMult: 25,           // cash cost of a tier = accScore(tier)·cashMult
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
  DEST: { costGrowth: 1.15, baseMult: 1.10, visitYield: 15, visitPathPoints: 0.2 },

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

  // ---- permanent skill tree ----
  TREE: { nodeBase: 5, nodeGrowth: 2.0 },

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
