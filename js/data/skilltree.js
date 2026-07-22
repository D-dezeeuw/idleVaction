// data/skilltree.js — permanent nodes bought with Legacy (persist across resets).
// costLegacy(rank) = nodeBase·nodeGrowth^rank (config.TREE). Effects applied in math/engine.
// requires: node ids + min rank that must be owned first.

export const TREE = [
  // PHYSIQUE
  { id: 'sun_kissed',    branch: 'physique', name: 'Sun-Kissed', maxRank: 10,
    effect: 'Income ×1.15 per rank (permanent tan, photographs better).', requires: [] },
  { id: 'iron_const',    branch: 'physique', name: 'Iron Constitution', maxRank: 6,
    effect: 'Offline cap +2h & energy regen per rank.', requires: [] },
  { id: 'athletes_frame',branch: 'physique', name: "Athlete's Frame", maxRank: 5,
    effect: 'Body XP +25% & clicker +15% per rank.', requires: ['sun_kissed:1'] },
  { id: 'ageless',       branch: 'physique', name: 'Ageless', maxRank: 5,
    effect: 'Start each run with Body pre-leveled +5 per rank.', requires: ['iron_const:2'] },

  // CHARACTER
  { id: 'silver_tongue', branch: 'character', name: 'Silver Tongue', maxRank: 10,
    effect: 'All costs −3% per rank (floor 40%).', requires: [] },
  { id: 'magnetic',      branch: 'character', name: 'Magnetic', maxRank: 5,
    effect: 'Start with Charisma pre-leveled; Clout ×1.1 per rank.', requires: [] },
  { id: 'compounding_interest', branch: 'character', name: 'Compounding Interest', maxRank: 10,
    effect: 'Ascension income layer ×1.10 per rank.', requires: ['silver_tongue:2'] },
  { id: 'wanderer',      branch: 'character', name: "Wanderer's Instinct", maxRank: 5,
    effect: 'Destinations −20% cost, +1 transport slot per rank.', requires: [] },

  // META
  { id: 'faster_metab',  branch: 'meta', name: 'Faster Metabolism', maxRank: 4,
    effect: 'Milestone step 10→9→8… (doublings come sooner).', requires: ['compounding_interest:1'] },
  { id: 'legacy_investor',branch: 'meta', name: 'Legacy Investor', maxRank: 8,
    effect: 'Legacy gained ×1.15 per rank.', requires: [] },
  { id: 'head_start',    branch: 'meta', name: 'Head Start', maxRank: 5,
    effect: 'Begin each run at accommodation tier +1 per rank.', requires: ['legacy_investor:2'] },
  { id: 'second_wind',   branch: 'meta', name: 'Second Wind', maxRank: 3,
    effect: 'First 5 minutes of a run ×5 income per rank window.', requires: [] },
  // Jack of All Trades: re-opens path MIXING, deep in the tree — the committed-path
  // contract (one road per life, engine.buyPathFocus/addPathPoints) is deliberately
  // absolute for early lineages, and this node is the earned exception: each rank lets
  // a committed life OPEN one extra road (focus + nudges + its staged track/bonuses).
  // The primary crossroads choice stays single — Jack adds side-roads, never a second
  // "main" branch voice. Depth by construction: one prerequisite from EACH branch
  // (physique + character + meta = 15 Legacy) plus its own 5/10/20 rank costs, against
  // the metered ~11.8·√N Legacy arc → rank 1 lands around ascension 3 for a dedicated
  // saver, 4-5 for a spread build — "a couple of ascensions", never run 1. This is
  // also what makes the dormant cross-path hybrid flags (engine.checkPathHybridFlags)
  // legitimately reachable within a single life again.
  { id: 'jack_of_trades', branch: 'meta', name: 'Jack of All Trades', maxRank: 3,
    effect: 'Open +1 extra path per rank after committing — mix roads within one life.',
    requires: ['sun_kissed:1', 'silver_tongue:1', 'legacy_investor:1'] },
  // Unshakeable (E13 "Money Works While You Tan" — Task B risk mitigation): halves
  // crypto crash DEPTH per rank (not a flat reduction — see math.crashDampTotal), so
  // rank 1 alone cuts a crash's income loss in half; stacks with HEDGES multiplicatively
  // toward, but never past, config.MARKET.maxCrashDamp (bounded downside, never full
  // immunity). Purely a crypto-lane effect — never read by tierProd/tierMultiplier/
  // computeComfort, so it cannot move the harness's max-speed island time.
  { id: 'unshakeable',   branch: 'meta', name: 'Unshakeable', maxRank: 3,
    effect: 'Crypto crash depth −50% per rank (stacks toward, never past, full immunity).', requires: [] },
  // Golden Ratio (E14 "Acquired Taste" — Task S7-T8, the connoisseur-lane synergy node):
  // math.computeExclusivity already reads state.ascension.tree.golden_ratio as a
  // ×(1 + 0.1·rank) factor folded into the exclusivity SCORE (never the multiplier
  // directly) — this just adds the buyable node math.js was already reading (it reads 0,
  // a no-op ×1, until this node exists and is ranked). Purely a connoisseur-lane exclusivity
  // effect — never read by tierProd/tierMultiplier/computeComfort, so an UNRANKED node (the
  // harness never buys it) cannot move the harness's fitted island time.
  { id: 'golden_ratio',  branch: 'character', name: 'Golden Ratio', maxRank: 5,
    effect: 'Exclusivity score +10% per rank (connoisseur refinement compounds).', requires: [] },
];
