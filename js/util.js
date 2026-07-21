// util.js — number formatting, seeded RNG, small helpers. No deps.

export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Compact number formatting: 1.23K, 4.56M, ... then scientific.
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export function fmt(x) {
  if (x === undefined || x === null || Number.isNaN(x)) return '0';
  if (!Number.isFinite(x)) return '∞';
  const neg = x < 0; x = Math.abs(x);
  if (x < 1000) return (neg ? '-' : '') + (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : Math.floor(x).toString());
  const tier = Math.floor(Math.log10(x) / 3);
  if (tier < SUFFIX.length) {
    const scaled = x / Math.pow(10, tier * 3);
    return (neg ? '-' : '') + scaled.toFixed(2) + SUFFIX[tier];
  }
  const e = Math.floor(Math.log10(x));
  return (neg ? '-' : '') + (x / Math.pow(10, e)).toFixed(2) + 'e' + e;
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400); sec -= d * 86400;
  const h = Math.floor(sec / 3600); sec -= h * 3600;
  const m = Math.floor(sec / 60); sec -= m * 60;
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${sec}s`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// Mulberry32 seeded RNG — deterministic for reproducible market events/tests.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// geometric-sum bulk cost: base·g^b·(g^q−1)/(g−1)
export function bulkCost(base, growth, bought, qty) {
  if (qty <= 0) return 0;
  if (growth === 1) return base * qty;
  return base * Math.pow(growth, bought) * (Math.pow(growth, qty) - 1) / (growth - 1);
}

// max affordable qty for a geometric cost given a budget
export function maxAffordable(base, growth, bought, budget) {
  if (budget < base * Math.pow(growth, bought)) return 0;
  // solve base·g^b·(g^q−1)/(g−1) <= budget for q
  const g = growth, left = budget * (g - 1) / (base * Math.pow(g, bought)) + 1;
  return Math.max(0, Math.floor(Math.log(left) / Math.log(g)));
}

export function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
