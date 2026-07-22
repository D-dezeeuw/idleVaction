// data/story.js — the 30-beat branching spine (abbreviated text for the prototype;
// full copy lives in docs/02-storyline.md). Each beat unlocks when `requires` is met.
// requires keys: comfort, accTier, charisma, body, taste, ascensions, legacy, flag.
// choices set story.branch and grant small bonuses.

export const STORY = [
  { id: 1,  title: 'Rain Check', requires: {}, branch: 'any',
    text: 'A Dutch bus stop. Sideways rain. You have €15 and a dream shaped like sunshine.' },
  { id: 2,  title: 'Guests With Six Legs', requires: { comfort: 20 },
    text: 'The motel roaches have a rota. You are not on it. Time to change that.' },
  { id: 3,  title: 'Checkout Time', requires: { accTier: 1 },
    text: 'You leave the shed. It does not wave goodbye. The road is open.' },
  { id: 4,  title: 'The Hostel Bunk', requires: { comfort: 200 },
    text: 'Eleven strangers, one dream, zero privacy. But the stories! The followers!' },
  { id: 5,  title: 'First Passport Stamp', requires: { accTier: 3 },
    text: 'A border. A stamp. A tiny ink-shaped promise that the world is bigger than drizzle.' },
  { id: 6,  title: 'Wi-Fi & Ambition', requires: { comfort: 500 }, choice: true,
    text: 'The lobby Wi-Fi is fast enough to become someone. Point the camera? Open the app? Book the world? Ask about the wine?',
    choices: [
      { label: 'Point the camera (Vlogger)', set: 'vlogger' },
      { label: 'Open the trading app (Crypto)', set: 'crypto' },
      { label: 'Book six countries (Traveler)', set: 'traveler' },
      { label: 'Ask about the wine (Connoisseur)', set: 'connoisseur' },
    ] },
  { id: 7,  title: 'One Star, Big Dreams', requires: { accTier: 4 },
    text: 'A star. One whole star. You frame the receipt.' },
  { id: 8,  title: 'Continental Breakfast', requires: { comfort: 5500 },
    text: 'Free breakfast until 9:00. You set three alarms. Worth it.' },
  { id: 9,  title: 'Making a Splash', requires: { accTier: 6 },
    text: 'A POOL. With floaties. The soggy Netherlands feels very far away.' },
  { id: 10, title: 'Poolside Persona', requires: { charisma: 5 },
    text: 'You have a poolside laugh now. It tests well.' },
  { id: 11, title: 'Fork in the Lobby', requires: { comfort: 2.2e5 },
    text: 'The concierge slides four brochures across the marble. Lean into your path.' },
  { id: 12, title: 'The Body You Travel In', requires: { body: 8 },
    text: 'Tan, gym, spa. Strangers assume you were always like this.' },
  { id: 13, title: 'Five-Star Frame of Mind', requires: { accTier: 9 },
    text: 'The concierge anticipates your needs. It is unsettling and wonderful.' },
  { id: 14, title: 'Going Viral', requires: { comfort: 1.3e6 },
    text: 'A clip explodes. Somewhere, an algorithm decides you are worth money.',
    // Branch-flavored variant (E13 "Money Works While You Tan" — Task D): the beat's
    // GATE/requires stay exactly as shipped (E12) so every branch — crypto included —
    // still fires beat 14 on the same Comfort threshold (E13-S7-T10: no build is ever
    // stranded); this only swaps the TITLE/TEXT shown when story.branch==='crypto' (see
    // engine.beatCopy / ui.js's renderStory, which read this the same way as the
    // default). Adapted from the epic's "beat gate on crypto path points ≥ P1" ask: a
    // second, points-gated beat would fork checkStory's one-beat-at-a-time narrative
    // spine, so instead this variant fires whenever a crypto-branch player reaches the
    // SAME beat 14 gate — a lighter, house-convention adaptation (see engine.js's
    // checkWhaleWatching for the points-gated one-time bonus that layers on top).
    variants: { crypto: { title: 'Whale Watching', text:
      'Poolside, laptop humming, you watch one wallet move an amount with its own zip ' +
      'code. The chart does something dramatic. You do not sell. You do not buy. You ' +
      'just watch, tanning, mildly transfixed — wisdom or paralysis, hard to say. Either ' +
      'way, the concierge has already booked the next flight. Someone should pack.' },
      // connoisseur variant (E14-S7-T3 "Provenance") — SAME beat-14 gate/requires as the
      // default (E14-S7-T10: no build is ever stranded; only the title/text swap when
      // story.branch==='connoisseur', mirroring the crypto variant just above). Also
      // plants the beat-25 "Where the Rich Hide" setup line (E14-S7-T6, exclusive
      // destinations — Monaco, St. Barths, an unlisted address) so beat 25's own reveal
      // and E24's set-collection payoff both land with the seed already sown.
      connoisseur: { title: 'Provenance', text:
        'An auction house calls, not the other way around — someone noticed the Bordeaux. ' +
        'You decline, mostly to hear how they take it. A courier mentions, off-hand, an ' +
        "address in Monaco with no listing, and a friend who \"summers unlisted\" near St. " +
        'Barths — the kind of place that does not appear on maps, only on invitations. You ' +
        'do not ask for the address. You suspect it will find you.' } } },
  { id: 15, title: 'Keys to the Coupe', requires: { accTier: 10 },
    text: 'No more buses. Something low, fast, and entirely impractical is yours.',
    // traveler variant (E15-S7-T3 "Keys to the Coupe" — the World Traveler's own read
    // of the garage reveal). SAME beat-15 gate/requires as the default (E15-S7-T10: no
    // build is ever stranded; the neutral text above still fires for every non-traveler
    // branch, and the harness's 26-beat pin is untouched) — only the title/text swap
    // when story.branch==='traveler', mirroring beat 14's crypto/connoisseur variants.
    // Also plants the hybrid line (E15-S7-T6: traveler+crypto) and ends on a hook toward
    // E16's boats/yachts.
    variants: { traveler: { title: 'Keys to the Coupe', text:
      'You hand over a fistful of guilders (converted, reluctantly) for a set of keys ' +
      'that finally do not smell of a hostel locker. The bus timetable, memorized out of ' +
      "necessity, becomes trivia. If you're also deep in StroopCoin, you financed the " +
      'coupe with StroopCoin gains, obviously — the chart went up while you were parking ' +
      'it badly outside a bakery. Somewhere south, a marina is already asking about your ' +
      'draft.' } } },
  { id: 16, title: 'Sea Legs', requires: { comfort: 5e6 },
    text: 'A boat. With a smaller pool on it. Pools within pools. Fractal luxury.' },
  { id: 17, title: 'Wheels Up', requires: { comfort: 2e7 },
    text: 'No terminals, no queues. The sky is a private hallway now.' },
  { id: 18, title: 'The Sail-Shaped Hotel', requires: { accTier: 12 },
    text: 'Six stars. It is shaped like a sail. Everything is gold. You feel fine about it.' },
  { id: 19, title: 'At Your Service', requires: { comfort: 4e7 },
    text: 'A butler. You ring a small bell and reality rearranges itself.' },
  { id: 20, title: 'The Whole Household', requires: { comfort: 1.2e8 },
    text: 'Chef, driver, trainer, social manager. You are now a small, tanned economy.' },
  { id: 21, title: 'Seven Stars', requires: { accTier: 14 },
    text: 'A rating that officially does not exist. They invented it for you.' },
  { id: 22, title: 'The Invitation', requires: { comfort: 3e8 },
    text: 'A card, no return address: "The island is ready when you are." Who ARE you now?' },
  { id: 23, title: "A Bungalow of One's Own", requires: { accTier: 16 },
    text: 'You stop renting rooms. You own walls. The walls are yours. Say it aloud.' },
  { id: 24, title: 'Villa Vita', requires: { accTier: 18 },
    text: 'Grounds. Gardens. A pool complex. You get lost on the way to your own kitchen.' },
  { id: 25, title: 'Where the Rich Hide', requires: { taste: 25 },
    text: 'Monaco. Dubai. The Maldives. Aspen. St. Barths. You collect them like stamps.' },
  { id: 26, title: 'Letting Go', requires: { comfort: 1e9 },
    text: 'To go further, you start over — wiser, more transformed. You can ASCEND now.' },
  { id: 27, title: 'Who You Become', requires: { ascensions: 1 },
    text: 'Some changes stick: the tan, the poise, the taste. Spend Legacy on who you are.' },
  { id: 28, title: 'The Island Listing', requires: { legacy: 20 },
    text: 'The dot on the map has a price. A very large, extremely worth-it price.' },
  { id: 29, title: 'Building Paradise', requires: { accTier: 20 },
    text: 'You stop buying luxury. You start making it. Guests arrive. You host now.' },
  { id: 30, title: 'Empire of Leisure', requires: { comfort: 3e9 },
    text: 'An empire of loungers, all yours. New horizons shimmer. New Game+ awaits.' },
];

// data/story.js — NPC vignette seeds (E02-S7): pure flavor toasts, never a progression
// gate. Each fires once at `minComfort`, between beats 2 (Comfort 20) and 3 (accTier 1),
// tracked in state.story.flags so it never repeats across a reload.
export const VIGNETTES = [
  { id: 'motel_manager_1', minComfort: 80,
    text: '📋 The manager taps his clipboard. "Rats are down two stars this week. Congratulations. ' +
          'There\'s a hostel down the road, you know. Cheaper. The rats there have union representation too."' },
];
