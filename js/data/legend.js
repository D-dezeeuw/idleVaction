// data/legend.js — the meta-meta shop (E29 "Empire of Leisure"). Legend points (from the second
// prestige layer, prestige.legendReset) buy PERMANENT perks that survive even the Legend reset.
//
// PERK shape: { id, name, kind:'income'|'treeDiscount'|'lore', cost, growth, maxRank, value, flavor }
//   · kind 'income'       — each rank adds `value` to the L_legend global × (1 + Σ value·rank).
//   · kind 'treeDiscount' — each rank cheapens the E26 tree (read by prestige.treeCost via legendTreeDiscount).
//   · kind 'lore'         — a cosmetic unlock (no mechanical effect), the reward for the long haul.
// cost of the next rank = cost·growth^rank (Legend points).
//
// Everything is 0/neutral until a perk is bought, and buying needs Legend points, which need a
// Legend reset, which needs ascensions — the greedy harness never ascends, so L_legend stays 1 and
// the fitted 29705s island time is unmoved.

export const LEGEND_PERKS = [
  { id: 'eternal_tan',   name: 'Eternal Tan',      kind: 'income',       cost: 1, growth: 2.0, maxRank: 10, value: 0.25,
    flavor: 'A tan so permanent it survives being a different person. Income ×1.25 per rank, forever, across every legend.' },
  { id: 'old_money',     name: 'Old Money',        kind: 'income',       cost: 3, growth: 2.2, maxRank: 8,  value: 0.4,
    flavor: 'Wealth that predates you and will outlast you. The biggest permanent global ×, one legend at a time.' },
  { id: 'quick_study',   name: 'Quick Study',      kind: 'treeDiscount', cost: 2, growth: 2.0, maxRank: 5,  value: 0.1,
    flavor: 'Every lifetime you learn faster. The permanent skill tree costs 10% less Legacy per rank.' },
  { id: 'muscle_memory', name: 'Muscle Memory',    kind: 'treeDiscount', cost: 4, growth: 2.2, maxRank: 4,  value: 0.08,
    flavor: 'The hands remember what the mind forgot. A further tree discount, stacking with Quick Study.' },
  { id: 'the_chronicle', name: 'The Chronicle',    kind: 'lore',         cost: 5, growth: 3.0, maxRank: 3,  value: 0,
    flavor: 'A ghost-written memoir of a life that began at a rainy bus stop. Purely for the record. Purely because you can.' },
];

export function legendPerkDef(id) { return LEGEND_PERKS.find(p => p.id === id); }

export function validateLegend() {
  const errors = [];
  const seen = new Set();
  for (const p of LEGEND_PERKS) {
    if (seen.has(p.id)) errors.push(`duplicate legend perk id: ${p.id}`);
    seen.add(p.id);
    for (const k of ['id', 'name', 'kind', 'flavor']) if (typeof p[k] !== 'string' || (k !== 'flavor' && !p[k])) errors.push(`${p.id}: "${k}" must be a string`);
    if (!['income', 'treeDiscount', 'lore'].includes(p.kind)) errors.push(`${p.id}: kind must be income/treeDiscount/lore`);
    for (const k of ['cost', 'growth', 'maxRank', 'value']) if (typeof p[k] !== 'number' || !Number.isFinite(p[k])) errors.push(`${p.id}: "${k}" must be a finite number`);
    if (!(p.cost > 0)) errors.push(`${p.id}: cost must be > 0`);
    if (!(p.growth > 1)) errors.push(`${p.id}: growth must be > 1`);
    if (!Number.isInteger(p.maxRank) || p.maxRank <= 0) errors.push(`${p.id}: maxRank must be a positive integer`);
    if (p.value < 0) errors.push(`${p.id}: value must be >= 0`);
    if (p.kind === 'lore' && p.value !== 0) errors.push(`${p.id}: lore perks must have value 0 (cosmetic)`);
  }
  if (errors.length) throw new Error('validateLegend() failed:\n' + errors.join('\n'));
  return true;
}
