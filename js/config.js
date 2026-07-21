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
    // STEEP base spacing (~×250–1000 per tier): keeps the player on 2–3 income tiers
    // for a long time (like classic idle games) instead of unlocking all 8 at once,
    // so the polynomial "degree" (and thus time-growth) rises slowly. Steep growth
    // slopes make each extra unit bite, stretching time-to-next-purchase.
    base:    [15, 2000, 6e5, 3e8, 2e11, 1.5e14, 1.2e17, 1e20],
    growth:  [1.11, 1.14, 1.17, 1.20, 1.23, 1.26, 1.29, 1.32],
    perUnit: [1, 1, 1, 1, 1, 1, 1, 1],
  },
  MILESTONE_STEP: 10,       // every N buys → tier ×2 (lowered by meta upgrades later)
  MILESTONE_MULT: 2,
  // Soft cap on the doubling stack: the first KNEE doublings are exponential (the fun,
  // visible ×2s), after which extra doublings add only LIN each (linear, not exponential).
  // This removes the cash^α power-law feedback that otherwise makes growth super-
  // exponential (finite-time blow-up + double overflow). See docs/math-proof.md.
  MILESTONE_SOFT_KNEE: 4,
  MILESTONE_SOFT_LIN: 0.5,

  // ---- amenities (the small-wins engine) ----
  AMENITY: { growthDefault: 1.5, comfortWeight: 1.0 },

  // ---- comfort (UNBOUNDED sum; the log multiplier softcaps its *effect*) ----
  COMFORT: {
    C0: 100,                // scale for the log multiplier
    MULT: 0.4,              // strength of L_comfort
    wAcc: 1.0, wAmen: 1.0, wBody: 8.0,
  },

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
  GAME_SPEED_CHOICES: [0.25, 0.5, 1, 2, 5, 10, 100, 1000],
  DEFAULT_GAME_SPEED: 1,

  SAVE_KEY: 'idlevaction.save.v1',
  SAVE_VERSION: 1,
};
