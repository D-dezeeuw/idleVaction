// data/crypto.js — the Crypto Poolside Lounger's portfolio (E13 "Money Works While You
// Tan"). All crypto content is data; engine.js/math.js stay generic (E13-S1's contract,
// so E29 or any future path can extend the same shape). Schema:
//
//   COINS: { id, name, ticker, tag:'crypto', costBase, costGrowth, yieldPerUnit, flavor }
//     — a coin held (state.crypto.holdings[id], bought via engine.buyCoin) produces
//     count·yieldPerUnit cash/sec, scaled by the generic single-path softcap preview
//     M.pathMult(paths.crypto.points) and by the live M.marketMult(state) — see
//     math.cryptoYieldPerSec. costBase/costGrowth follow the SAME geometric bulkCost
//     shape every other purchase uses (engine.buyCoin reuses util.bulkCost).
//
//   MARKET_EVENTS: { id, kind:'boom'|'crash'|'chop', multRange:[lo,hi], durRange:[lo,hi],
//     weight } — the seeded scheduler (engine.marketTick) draws one of these, weighted,
//     via util.rng(state.market.seed, state.market.cursor++). Weights sum to 1 and were
//     Monte-Carlo checked to land long-run E[marketMult] ~= 1.05 (see config.MARKET's
//     comment) — a first-pass balance fit, not a precision constant.
//
//   HEDGES: { id, name, cost, crashDamp, varianceDamp, flavor } — one-time cash
//     purchases (engine.buyHedge) that pull crash multipliers toward 1 and shrink the
//     baseline jitter. Combine multiplicatively with the Unshakeable ascension node
//     toward, but never past, config.MARKET.maxCrashDamp — see math.crashDampTotal.
export const COINS = [
  { id: 'stroopcoin', name: 'StroopCoin', ticker: 'STROOP', tag: 'crypto',
    costBase: 500, costGrowth: 1.12, yieldPerUnit: 0.05,
    flavor: 'Backed by the gold standard of waffles.' },
  { id: 'ponchodao', name: 'PonchoDAO', ticker: 'PONCH', tag: 'crypto',
    costBase: 5000, costGrowth: 1.12, yieldPerUnit: 0.42,
    flavor: 'Rain-proof, allegedly.' },
  { id: 'tanchain', name: 'TanChain', ticker: 'TAN', tag: 'crypto',
    costBase: 50000, costGrowth: 1.12, yieldPerUnit: 3.6,
    flavor: 'Mined poolside, one SPF at a time.' },
  { id: 'gulderetf', name: 'GulderETF', ticker: 'GLDR', tag: 'crypto',
    costBase: 5e5, costGrowth: 1.12, yieldPerUnit: 31,
    flavor: 'An index fund of Golden Age nostalgia.' },
  { id: 'windmillswap', name: 'WindmillSwap', ticker: 'WNDL', tag: 'crypto',
    costBase: 5e6, costGrowth: 1.12, yieldPerUnit: 270,
    flavor: 'Decentralized, and somehow also tilting.' },
  { id: 'whaletoken', name: 'WhaleToken', ticker: 'WHALE', tag: 'crypto',
    costBase: 5e7, costGrowth: 1.12, yieldPerUnit: 2300,
    flavor: 'One holder owns 40% of it. That holder is a mood.' },
];

export const MARKET_EVENTS = [
  { id: 'chop',        kind: 'chop',  multRange: [0.85, 1.15], durRange: [10, 20], weight: 0.45 },
  { id: 'boom_minor',  kind: 'boom',  multRange: [2, 3.5],     durRange: [20, 40], weight: 0.18 },
  { id: 'boom_major',  kind: 'boom',  multRange: [3.5, 5],     durRange: [20, 40], weight: 0.09 },
  // the rare "whale watching" boom (E13-S4-T6 / beat 14's crypto variant) — highest
  // magnitude, lowest weight, its own banner label in the UI.
  { id: 'whale_boom',  kind: 'boom',  multRange: [6, 9],       durRange: [15, 30], weight: 0.02 },
  { id: 'crash_minor', kind: 'crash', multRange: [0.35, 0.5],  durRange: [20, 40], weight: 0.16 },
  { id: 'crash_major', kind: 'crash', multRange: [0.2, 0.35],  durRange: [20, 40], weight: 0.10 },
];

export const HEDGES = [
  { id: 'stablecoin', name: 'Stablecoin Reserve', cost: 2000, crashDamp: 0.15, varianceDamp: 0.10,
    flavor: 'Pegged to something. Hopefully reality.' },
  { id: 'cold_storage', name: 'Cold Storage Wallet', cost: 20000, crashDamp: 0.20, varianceDamp: 0.05,
    flavor: 'Offline, unhackable, and mildly paranoid.' },
  { id: 'diversify', name: 'Diversify the Bag', cost: 200000, crashDamp: 0.25, varianceDamp: 0.15,
    flavor: 'Never all-in on the waffle coin.' },
];
