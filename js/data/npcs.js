// data/npcs.js — the recurring NPC roster (E03-S1-T3, S6-T9, S7). Pure flavor cast
// that appears once you land in the hostel bunk (accommodation.tier >= 2).
// Shape: { id, name, emoji, tier, flavor, pathSeed }. `pathSeed` foreshadows E04's
// build paths (must map to a DATA.paths id, or be null for NPCs that don't seed one) —
// it is recorded (engine.checkNpcUnlocks -> state.npcsMet / story.flags.<seed>Seed)
// but NEVER wired into a multiplier: E03 keeps L_path neutral. See E03-S7-T10.

export const NPCS = [
  { id: 'backpacker', name: 'Backpacker Bram', emoji: '🎒', tier: 2, pathSeed: 'traveler',
    flavor: 'He has done six countries in nine days and has a spreadsheet to prove it. ' +
            '"You should really see Chiang Mai," he says, for the third time today.' },
  { id: 'vlogger', name: 'Vlogger Vera', emoji: '📸', tier: 2, pathSeed: 'vlogger',
    flavor: 'The vlogger films you eating a cold stroopwafel. "Content."' },
  { id: 'regular', name: 'Hostel Regular Henk', emoji: '🛏️', tier: 2, pathSeed: null,
    flavor: 'He has lived in bunk 4 for two years. Nobody asks why. He waters a plant ' +
            'that is definitely plastic, and it is thriving.' },
];
