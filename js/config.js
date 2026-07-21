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

  // ---- optional tap (E01-S5) ----
  // Tapping is purely additive, never a gate. maxPerSec caps how many taps register cash
  // within any rolling 1-second window (see engine.click), so an autoclicker can't
  // trivialize the economy — the idle rate is always the honest floor.
  TAP: { maxPerSec: 8 },

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
  CLOUT: { contentRate: 1.0, charismaBoost: 0.02, comboDecaySec: 30, comboPerClick: 0.15, comboMax: 5 },

  // ---- ascension / legacy ----
  LEGACY_K: 1.0,
  LEGACY_SCALE: 1e6,
  LEGACY_EXP: 0.5,
  ASCEND_MIN_RUN_SEC: 120,  // can't ascend in the first 2 min of a run

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
