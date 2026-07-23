// postcard.js — Postcards Home (Living-World W4, docs/08-living-world.md point 11). A pure,
// copyable emoji text block summarizing the current trip. DISPLAY-ONLY — buildPostcard never
// mutates state and is never read by any engine.js/math.js income path. Kept as its own tiny
// module (rather than folded into the already-3000-line ui.js) so it's trivially unit-testable
// in Node without a DOM — ui.js imports buildPostcard() and owns the clipboard/toast plumbing.
import { DATA } from './data/index.js';

// Human-phrased order-of-magnitude for the wallet ("cash in the billions" reads like a postcard
// brag, not a debug readout) — the same "small fixed ladder, first match wins" shape as util.fmt's
// SUFFIX table, just phrased as words. Not a balance number (nothing here reads config.js) — this
// is copy, like STORY_SCENES/SIGNOFFS below.
const MAGNITUDE_WORDS = [
  [1e15, 'more money than sense'],
  [1e12, 'the trillions'],
  [1e9, 'the billions'],
  [1e6, 'the millions'],
  [1e3, 'the thousands'],
  [0, 'small change, honestly'],
];
function cashMagnitudePhrase(cash) {
  for (const [floor, phrase] of MAGNITUDE_WORDS) if (cash >= floor) return phrase;
  return MAGNITUDE_WORDS[MAGNITUDE_WORDS.length - 1][1];
}

// A few wry Dutch-tourist sign-offs — deterministic (no RNG in shipped logic), picked by a stable
// hash of playtime so re-opening the postcard mid-session doesn't reroll the line every render.
const SIGNOFFS = [
  'Wish you were here. Or at least somewhere with a working umbrella.',
  'The sun is doing its job today. So, mostly, am I.',
  'Send drizzle — this much sunshine is starting to feel suspicious.',
  'Still not entirely sure how I got here. Not complaining.',
  'Postmark says paradise. The postmark is not wrong.',
];
function signOff(state) {
  const idx = Math.floor((state.meta?.playtimeMs || 0) / 60000) % SIGNOFFS.length;
  return SIGNOFFS[idx];
}

function committedPathName(state) {
  const p = DATA.paths.find(x => x.id === state.story?.branch);
  return p ? p.name : null;
}
function trophyCount(state) {
  const u = state.achievements?.unlocked;
  if (!u) return 0;
  return DATA.achievements.filter(a => u[a.id]).length;
}

// buildPostcard(state): a copyable, emoji-forward text block — no URLs, no HTML (ui.js's clipboard
// copy/textarea-fallback handle the actual "send" action; this is pure text generation). Every
// field degrades gracefully on a fresh newGame() (nothing here can throw): trip day, current
// accommodation, a human-phrased cash magnitude, committed path (if any), trophies, souvenirs,
// goats greeted, ascensions/dynasty name (if any), the day-streak (only when it's actually a
// streak, count >= 2), and one sign-off line in the game's voice.
export function buildPostcard(state) {
  const day = Math.max(1, Math.floor((state.meta?.playtimeMs || 0) / 86400000) + 1);
  const accRow = DATA.accommodation[state.accommodation?.tier || 0] || DATA.accommodation[0];
  const cash = state.resources?.cash || 0;
  const pathName = committedPathName(state);
  const trophies = trophyCount(state);
  const souvenirs = state.souvenirs?.count || 0;
  const goats = state.stats?.goatsGreeted || 0;
  const ascensions = state.ascension?.count || 0;
  const dynastyName = state.lineage?.name || '';
  const streak = state.meta?.streak;

  const lines = [
    `📮 Postcard — Day ${day} of the trip`,
    `🏨 Staying at: ${accRow.name}`,
    `💶 Cash: in ${cashMagnitudePhrase(cash)}`,
  ];
  if (pathName) lines.push(`🧭 Path: ${pathName}`);
  lines.push(`🏆 Trophies earned: ${trophies}`);
  lines.push(`🎁 Souvenirs collected: ${souvenirs}`);
  lines.push(`🐐 Goats greeted: ${goats}`);
  if (ascensions > 0) lines.push(`🔄 Ascensions: ${ascensions}${dynastyName ? ` — the ${dynastyName} dynasty` : ''}`);
  if (streak && streak.count >= 2) lines.push(`Day-streak: ${streak.count} ☀️`);
  lines.push('');
  lines.push(signOff(state));
  return lines.join('\n');
}
