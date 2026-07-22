// data/seasonal.js — seasonal rotating destinations (E30 "Legends of Leisure"). Live-ops freshness:
// a small pool of limited-time destinations, one "in season" at a time (deterministic rotation by a
// cycle index, no RNG at read time). Visiting the active one grants a small BOUNDED flat global ×.
//
// Invariance: the seasonal × is gated on OWNING the island (a summit-era live-ops feature) — the
// greedy harness never owns the island, so it never gets a seasonal bonus and the fitted 29705s
// island time is unmoved. Rotation is a pure function of a cycle index (passed in), so it is
// deterministic and reload-stable (no Date.now at read time).

export const SEASONAL = [
  { id: 'season_carnival', name: 'Rio Carnival',       mult: 1.04, flavor: 'Feathers, drums, and a crowd that does not care who you were. In season now.' },
  { id: 'season_aurora',   name: 'Lapland Aurora',     mult: 1.04, flavor: 'The sky performs, for free, for everyone — even for a former shed-dweller.' },
  { id: 'season_regatta',  name: 'Monaco Regatta',     mult: 1.05, flavor: 'Boats you recognise from your own marina, racing. You wave. They wave back.' },
  { id: 'season_sakura',   name: 'Kyoto Sakura',       mult: 1.04, flavor: 'Blossoms for two weeks a year. You flew across the planet for the exact right fortnight.' },
  { id: 'season_harvest',  name: 'Tuscan Harvest',     mult: 1.05, flavor: 'The wine you cellared, at its source. Old money nods; older vines nod back.' },
];

export function seasonalDef(id) { return SEASONAL.find(s => s.id === id); }

// Which seasonal destination is active for a given cycle index (deterministic rotation). The cycle
// index is passed in (e.g. days-since-start), so this stays pure and reload-stable.
export function activeSeasonal(cycleIndex) {
  const i = ((Math.floor(cycleIndex) % SEASONAL.length) + SEASONAL.length) % SEASONAL.length;
  return SEASONAL[i];
}

export function validateSeasonal() {
  const errors = [];
  const seen = new Set();
  for (const s of SEASONAL) {
    if (seen.has(s.id)) errors.push(`duplicate seasonal id: ${s.id}`);
    seen.add(s.id);
    for (const k of ['id', 'name', 'flavor']) if (typeof s[k] !== 'string' || !s[k]) errors.push(`${s.id}: "${k}" must be a non-empty string`);
    if (typeof s.mult !== 'number' || !(s.mult > 1)) errors.push(`${s.id}: mult must be a number > 1`);
    if (s.mult > 1.1) errors.push(`${s.id}: mult must stay bounded (≤ 1.1, a small live-ops nudge)`);
  }
  if (errors.length) throw new Error('validateSeasonal() failed:\n' + errors.join('\n'));
  return true;
}
