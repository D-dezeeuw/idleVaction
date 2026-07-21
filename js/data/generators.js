// data/generators.js — the 8 income tiers (D1..D8). Higher tiers produce lower.
// Math (base/growth/perUnit) lives in config.GEN; this file is flavor + wiring.
// index 0 = D1 (produces cash). index k>0 produces tier k-1 units.

export const GENERATORS = [
  { id: 'd1', name: 'Postcard Snapshots', tags: ['content'],
    flavor: 'You sell grainy holiday photos. It is not much. It is a start.' },
  { id: 'd2', name: 'Followers', tags: ['social'],
    flavor: 'People who watched one video and never left.' },
  { id: 'd3', name: 'Sponsor Slides', tags: ['social'],
    flavor: '"This poncho brought to you by..."' },
  { id: 'd4', name: 'Media Deals', tags: ['business'],
    flavor: 'Someone in a suit signed something.' },
  { id: 'd5', name: 'Brand Partners', tags: ['business'],
    flavor: 'Your face is on a suitcase now.' },
  { id: 'd6', name: 'Talent Agency', tags: ['business'],
    flavor: 'You represent other people who lounge.' },
  { id: 'd7', name: 'Media Empire', tags: ['empire'],
    flavor: 'An entire floor of interns book your massages.' },
  { id: 'd8', name: 'Cultural Icon', tags: ['empire'],
    flavor: 'They named a cocktail after you. Then a beach.' },
];
