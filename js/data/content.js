// data/content.js — the content-tier chain (E12 "Lights, Camera, Clout"): a small,
// self-contained "second economy" cluster, bought with CASH, producing CLOUT/sec.
// Row shape: { id, name, costBase, costGrowth, contentRate, unlockClout, boostCostBase,
// boostCostGrowth, boostRate, flavor }. Mirrors the amenity cluster convention (per-item
// costBase/costGrowth/unlock threshold, no shared config default needed) rather than the
// GEN ladder's array-of-arrays shape, since this is a flavored "small wins" cluster, not
// a second copy of the core D1..D8 chain. `unlockClout` gates reveal the same way
// `unlockComfort` gates amenities (E12-S5-T6 reuses the SAME checkAmenityUnlocks-style
// one-shot flash pattern — see engine.checkContentUnlocks).
//
// NOT bought by dev/harness.mjs's greedy-optimal policy (nor js/dev/selftest.mjs's
// playStep) — a deliberate omission, not an oversight: content tiers are a cash SINK
// competing with the fitted D1..D8 reinvestment, and Clout never feeds the cash
// multiplier stack, so wiring them into the harness would only add risk for zero
// pacing benefit. This keeps every content-tier purchase (and the Clout it produces)
// fully invisible to the max-speed island-time guard by construction.
//
// boostCostBase/boostCostGrowth/boostRate describe the Clout-priced "boost" sink for
// THIS tier (engine.buyContentBoost) — reinvesting Clout into itself, mirroring
// L_upgrade's shape (1 + boostRate·boosts) but scoped entirely to the Clout economy.
export const CONTENT = [
  { id: 'selfie_post', name: 'Selfie Post', costBase: 200, costGrowth: 1.5, contentRate: 0.4,
    unlockClout: 0, boostCostBase: 15, boostCostGrowth: 2.0, boostRate: 0.5,
    flavor: 'Duck face, bad lighting, a caption about "wanderlust." It works.' },
  { id: 'story_reel', name: 'Story Reel', costBase: 3000, costGrowth: 1.55, contentRate: 2.5,
    unlockClout: 30, boostCostBase: 80, boostCostGrowth: 2.0, boostRate: 0.5,
    flavor: 'Fifteen seconds, a trending song, and a boomerang of the poncho.' },
  { id: 'daily_vlog', name: 'Daily Vlog', costBase: 50000, costGrowth: 1.6, contentRate: 15,
    unlockClout: 250, boostCostBase: 500, boostCostGrowth: 2.1, boostRate: 0.5,
    flavor: '"Hey guys, welcome back." You have never once said this to your actual friends.' },
  { id: 'travel_series', name: 'Travel Series', costBase: 900000, costGrowth: 1.65, contentRate: 90,
    unlockClout: 1800, boostCostBase: 3000, boostCostGrowth: 2.1, boostRate: 0.5,
    flavor: 'Six episodes, a drone intro, and a sponsor card nobody reads.' },
  { id: 'documentary', name: 'Documentary', costBase: 1.6e7, costGrowth: 1.7, contentRate: 550,
    unlockClout: 12000, boostCostBase: 20000, boostCostGrowth: 2.2, boostRate: 0.5,
    flavor: 'A streaming platform calls it "an unflinching look." You just filmed brunch.' },
];
