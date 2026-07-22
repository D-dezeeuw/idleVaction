// data/collections.js — the Old-Money Aesthete's catalogue (E14 "Acquired Taste", the
// Connoisseur path). All collection content is data; engine.js/math.js stay generic (same
// leaf-data contract as data/crypto.js and data/bank.js) — a future epic (E21 art/investment
// wing, E24 exclusive-destination set bonuses) can extend the same shape without touching
// this file's callers. Schema, shared by BOTH exported arrays:
//
//   { id, name, tag:'luxury', costBase, costGrowth, appreciationRate, exclusivity, comfort,
//     tasteXp, provenance, flavor }
//     — id: unique across ART and WINE combined (state.collections indexes by id, flat).
//     — tag: always 'luxury' — the SAME tag the pre-existing luxury amenity cluster and the
//       E14-S5 "Quiet Luxury" cluster use, so the connoisseur branch's +25% Comfort perk and
//       the exclusivity meter both target one tag vocabulary across amenities AND collections.
//     — costBase/costGrowth: the buy cost of the Nth copy is costBase·costGrowth^owned — the
//       SAME geometric bulkCost shape every other purchase in the game uses (engine.buyAsset
//       reuses util.bulkCost, same as engine.buyCoin/buyGenerator).
//     — appreciationRate: fractional per-game-year growth of the asset's STORED value while
//       held. Rarer/more serious pieces carry a higher rate (a supermarket bottle barely
//       moves; a grand cru or the judgment-of-paris lot compounds meaningfully). First-pass
//       values for the balance-tuner to retune against config.APPRECIATION.
//     — exclusivity: a small positive weight summed (with luxury amenities' own exclusivity)
//       into state.exclusivity, which feeds the softcapped L_exclusivity global multiplier.
//     — comfort: modest, flat Comfort contribution per copy owned, feeding ComfortRaw exactly
//       like an amenity's comfort field.
//     — tasteXp: flat Taste-skill XP granted on purchase (feeds the Taste skill's
//       xpToNext = TASTE.base·TASTE.growth^L curve — see config.TASTE).
//     — provenance: a fake auction-house-and-year string (flavor + the beat-14 "Provenance"
//       callback) — always invented, never a real house or person.
//     — flavor: one wry one-liner per asset, shown alongside provenance in the gallery/cellar.
//
//   APPRECIATION CONTRACT (for E14-S2/S4/S9's engine logic and for E21/E24 reuse):
//     value = cost · (1 + appreciationRate)^ageYears
//   where `cost` is the price actually paid for that copy, `ageYears` is GAME-TIME held
//   (playtime, not wall-clock — fair under GAME_SPEED and offline replay), and the result is
//   softcapped by config.APPRECIATION.valueCap so no single piece can run away. The engine
//   reads these arrays via DATA.collections.art / DATA.collections.wine (see data/index.js);
//   this file never imports config or engine — data stays leaf-level, same as every other
//   data file (see data/bank.js's validateBank comment for the same convention).
export const ART = [
  { id: 'velvet_elvis', name: 'Velvet Elvis', tag: 'luxury',
    costBase: 1e4, costGrowth: 1.5, appreciationRate: 0.015, exclusivity: 1, comfort: 5, tasteXp: 40,
    provenance: "Sothebeach's, Lot 12, 2011",
    flavor: 'Purchased ironically. Displayed sincerely.' },
  { id: 'dogs_playing_klaverjas', name: 'Dogs Playing Klaverjas', tag: 'luxury',
    costBase: 4e4, costGrowth: 1.5, appreciationRate: 0.025, exclusivity: 2, comfort: 12, tasteXp: 80,
    provenance: 'Klaverjas & Daughters, Lot 7, 2014',
    flavor: 'The Dutch answer to poker dogs.' },
  { id: 'minor_dutch_master', name: 'Minor Dutch Master (Unattributed)', tag: 'luxury',
    costBase: 2e5, costGrowth: 1.5, appreciationRate: 0.035, exclusivity: 5, comfort: 25, tasteXp: 150,
    provenance: 'Uitgeveild.nl, Lot 203, 2016',
    flavor: 'Probably a Vermeer. Definitely not a Vermeer. The receipt says "school of."' },
  { id: 'abstract_beige', name: 'Abstract Beige', tag: 'luxury',
    costBase: 1e6, costGrowth: 1.5, appreciationRate: 0.045, exclusivity: 10, comfort: 50, tasteXp: 250,
    provenance: 'De Bonafide Auction Room, Lot 91, 2018',
    flavor: "It matches everything. That's the point." },
  { id: 'bronze_stroopwafel', name: 'Bronze Stroopwafel (Monumental)', tag: 'luxury',
    costBase: 6e6, costGrowth: 1.5, appreciationRate: 0.055, exclusivity: 20, comfort: 85, tasteXp: 350,
    provenance: 'Drizzle & Drought Auctioneers, Lot 3, 2021',
    flavor: 'Life-sized. Inedible. Insured for more than the original recipe.' },
  { id: 'nft_of_a_windmill', name: 'NFT of a Windmill', tag: 'luxury',
    costBase: 3e7, costGrowth: 1.5, appreciationRate: 0.065, exclusivity: 40, comfort: 120, tasteXp: 400,
    provenance: 'Van Uitverkoop House, Lot 1, 2022',
    flavor: 'You own the receipt for a JPEG of a national symbol. The windmill does not know. The windmill does not care.' },
];

export const WINE = [
  { id: 'supermarket_red', name: "Supermarket Red (Whatever's Nearest)", tag: 'luxury',
    costBase: 2e4, costGrowth: 1.5, appreciationRate: 0.01, exclusivity: 1, comfort: 4, tasteXp: 35,
    provenance: 'Cellar Door Exchange, Lot 1, 2020',
    flavor: 'Screw cap. No shame. It pairs with everything, including regret.' },
  { id: 'duty_free_champagne', name: 'Duty-Free Champagne', tag: 'luxury',
    costBase: 8e4, costGrowth: 1.5, appreciationRate: 0.02, exclusivity: 2, comfort: 10, tasteXp: 75,
    provenance: 'Cork & Ledger Auctions, Lot 18, 2017',
    flavor: 'Bought at the gate, gone before the seatbelt sign turns off.' },
  { id: 'actual_bordeaux', name: 'Actual Bordeaux', tag: 'luxury',
    costBase: 4e5, costGrowth: 1.5, appreciationRate: 0.035, exclusivity: 5, comfort: 22, tasteXp: 140,
    provenance: 'The Vinted Vine, Lot 55, 2013',
    flavor: 'You say the name correctly now. Practice, mostly in the mirror.' },
  { id: 'grand_cru', name: 'Grand Cru', tag: 'luxury',
    costBase: 2e6, costGrowth: 1.5, appreciationRate: 0.05, exclusivity: 10, comfort: 45, tasteXp: 240,
    provenance: 'Burgundy & Associates, Lot 6, 2009',
    flavor: 'The label alone requires a translator and a small bow.' },
  { id: 'investment_burgundy', name: 'Investment Burgundy', tag: 'luxury',
    costBase: 1e7, costGrowth: 1.5, appreciationRate: 0.065, exclusivity: 20, comfort: 80, tasteXp: 340,
    provenance: 'Cellar Door Exchange, Lot 2, 2006',
    flavor: 'Never opened. Never will be. The bottle is a spreadsheet with a cork.' },
  { id: 'judgment_of_paris_lot', name: 'Judgment of Paris, Lot', tag: 'luxury',
    costBase: 5e7, costGrowth: 1.5, appreciationRate: 0.08, exclusivity: 40, comfort: 115, tasteXp: 390,
    provenance: "Paris '76 Redux Auctions, Lot 1, 2005",
    flavor: 'The tasting that embarrassed a nation. You own a footnote of it.' },
];

// dev schema guard (mirrors validateBank/validatePaths): ids unique across BOTH arrays,
// every field present and of the right type/sign. Throws on failure (matching the house
// convention) so a malformed row is caught in CI, not in the gallery. Takes no CONFIG param
// (unlike validateBank) since nothing here is checked against a config constant — this file
// never imports config, same as every other data file.
export function validateCollections() {
  const errors = [];
  const seen = new Set();
  const strFields = ['id', 'name', 'tag', 'provenance', 'flavor'];
  const numFields = ['costBase', 'costGrowth', 'appreciationRate', 'exclusivity', 'comfort', 'tasteXp'];
  for (const arr of [ART, WINE]) {
    for (const a of arr) {
      if (seen.has(a.id)) errors.push(`duplicate collection asset id: ${a.id}`);
      seen.add(a.id);
      for (const k of strFields) {
        if (typeof a[k] !== 'string' || a[k].length === 0) errors.push(`${a.id}: "${k}" must be a non-empty string`);
      }
      for (const k of numFields) {
        if (typeof a[k] !== 'number' || !Number.isFinite(a[k])) errors.push(`${a.id}: "${k}" must be a finite number`);
      }
      if (a.tag !== 'luxury') errors.push(`${a.id}: tag must be 'luxury' (got "${a.tag}")`);
      if (!(a.costBase > 0)) errors.push(`${a.id}: costBase must be > 0`);
      if (!(a.costGrowth > 1)) errors.push(`${a.id}: costGrowth must be > 1`);
      if (!(a.appreciationRate >= 0)) errors.push(`${a.id}: appreciationRate must be >= 0`);
      if (!(a.exclusivity > 0)) errors.push(`${a.id}: exclusivity must be > 0`);
      if (!(a.comfort >= 0)) errors.push(`${a.id}: comfort must be >= 0`);
      if (!(a.tasteXp >= 0)) errors.push(`${a.id}: tasteXp must be >= 0`);
    }
  }
  if (errors.length) throw new Error('validateCollections() failed:\n' + errors.join('\n'));
  return true;
}
