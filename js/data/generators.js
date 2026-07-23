// data/generators.js — the 8 income tiers (D1..D8). Higher tiers produce lower.
// Math (base/growth/perUnit) lives in config.GEN; this file is flavor + wiring.
// index 0 = D1 (produces cash). index k>0 produces tier k-1 units.

// `names` (Phase E / audit 3.1): optional per-branch skin — the SAME economy wearing the
// committed road's clothes, so an Old-Money Aesthete doesn't earn a living from "Followers."
// Display-only (ui.genName); ids/math never change, saves and the harness are untouched.
export const GENERATORS = [
  { id: 'd1', name: 'Postcard Snapshots', tags: ['content'],
    names: { crypto: 'Spare-Change Rounding', connoisseur: 'Sketches, Sold Shyly', traveler: 'Trail Notes' },
    flavor: 'You sell grainy holiday photos. It is not much. It is a start.' },
  { id: 'd2', name: 'Followers', tags: ['social'],
    names: { crypto: 'Wallet Watchers', connoisseur: 'Admirers', traveler: 'Pen Pals' },
    flavor: 'People who watched one video and never left.' },
  { id: 'd3', name: 'Sponsor Slides', tags: ['social'],
    names: { crypto: 'Referral Codes', connoisseur: 'Introductions', traveler: 'Guidebook Credits' },
    flavor: '"This poncho brought to you by..."' },
  { id: 'd4', name: 'Suitcase Royalties', tags: ['business'],
    names: { crypto: 'Yield Farms (Actual Farms?)', connoisseur: 'Consulting, Reluctantly', traveler: 'Route Licensing' },
    flavor: 'Your face is on a suitcase now. The suitcase pays rent.' },
  { id: 'd5', name: 'The Lounge Label', tags: ['business'],
    names: { crypto: 'The Poolside Fund', connoisseur: 'The Private Cellar Club', traveler: 'The Wayfarer Line' },
    flavor: 'A brand about doing nothing, beautifully. It sells out everywhere it rains.' },
  { id: 'd6', name: 'The Leisure Agency', tags: ['business'],
    names: { crypto: 'The Family Office', connoisseur: 'The Salon', traveler: 'The Expedition House' },
    flavor: 'You represent other people who lounge. Ten percent of a nap is still a nap.' },
  { id: 'd7', name: 'The Sunshine Group', tags: ['empire'],
    names: { crypto: 'The Exchange Floor', connoisseur: 'The Auction House', traveler: 'The Atlas Consortium' },
    flavor: 'An entire floor of interns book your massages. There is an org chart. You are the sun.' },
  { id: 'd8', name: 'Cultural Icon', tags: ['empire'],
    flavor: 'They named a cocktail after you. Then a beach. The rain, out of respect, now asks first.' },
];
