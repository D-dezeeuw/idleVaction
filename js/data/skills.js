// data/skills.js — personal-growth attributes. XP→level via config.SKILL.
// Effects are applied in math.js; this file is identity + flavor + training data.

export const SKILLS = [
  { id: 'charisma', name: 'Charisma',
    effect: 'Boosts social-tier income (+3%/level).',
    flavor: 'You make eye contact now. On purpose.' },
  { id: 'comms', name: 'Communication',
    effect: 'Reduces all purchase costs (−0.5%/level, floor 40%).',
    flavor: 'You can haggle in four languages and one mime.' },
  { id: 'body', name: 'Body',
    effect: 'Adds directly to Comfort (weight ×8/level) and fuels clicker combo.',
    flavor: 'Tan, fit, spa-buffed. The soggy is gone.' },
  { id: 'taste', name: 'Taste',
    effect: 'Unlocks luxury tiers and adds exclusivity multipliers.',
    flavor: 'You send back the wine now. Correctly.' },
  { id: 'savvy', name: 'Savvy',
    effect: 'Passive cash trickle scaling with your wealth (√). XP also trickles in from ' +
      'crypto coin yield and from surviving market crashes (E13 "Money Works While You Tan").',
    flavor: 'Money works while you tan.' },
];

// "Training" purchases grant flat XP for cash (a spend-to-grow loop).
export const TRAINING = [
  { id: 'train_charisma', skill: 'charisma', costBase: 500,  costGrowth: 1.6, xp: 120 },
  { id: 'train_comms',    skill: 'comms',    costBase: 500,  costGrowth: 1.6, xp: 120 },
  { id: 'train_body',     skill: 'body',     costBase: 800,  costGrowth: 1.6, xp: 120 },
  { id: 'train_taste',    skill: 'taste',    costBase: 5000, costGrowth: 1.7, xp: 120 },
  { id: 'train_savvy',    skill: 'savvy',    costBase: 5000, costGrowth: 1.7, xp: 120 },
];
