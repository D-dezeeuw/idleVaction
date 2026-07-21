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
  // Unshakeable (E13 "Money Works While You Tan" — Task B risk mitigation): halves
  // crypto crash DEPTH per rank (not a flat reduction — see math.crashDampTotal), so
  // rank 1 alone cuts a crash's income loss in half; stacks with HEDGES multiplicatively
  // toward, but never past, config.MARKET.maxCrashDamp (bounded downside, never full
  // immunity). Purely a crypto-lane effect — never read by tierProd/tierMultiplier/
  // computeComfort, so it cannot move the harness's max-speed island time.
  { id: 'unshakeable',   branch: 'meta', name: 'Unshakeable', maxRank: 3,
    effect: 'Crypto crash depth −50% per rank (stacks toward, never past, full immunity).', requires: [] },
];
