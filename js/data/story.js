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
    text: 'You leave the shed. It does not wave goodbye. Sheds never do.' },
  // An arrival beat, so it gates on the tier actually being OWNED (like beats 3/5/7) — the
  // old comfort:200 gate fired mid-motel while still saving for the bunk, narrating a
  // check-in that hadn't happened. accTier:2 also lands it the same tick the NPC roster
  // reveals (engine.checkNpcUnlocks, tier ≥ 2) — the cast beat 4 exists to introduce.
  { id: 4,  title: 'The Hostel Bunk', requires: { accTier: 2 },
    text: 'Eleven strangers snore in shifts and one of them sleep-talks in German. You would pay double for a door. One day you will.' },
  { id: 5,  title: 'First Passport Stamp', requires: { accTier: 3 },
    text: 'The border guard stamps your passport without looking up. You admire the ink for the whole train ride.' },
  { id: 6,  title: 'Wi-Fi & Ambition', requires: { comfort: 500 }, choice: true,
    text: 'The lobby Wi-Fi is suspiciously excellent, and you have plans. The question is which one.',
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
    text: 'The concierge slides four brochures across the marble and waits. Apparently you look like someone with a direction now.' },
  { id: 12, title: 'The Body You Travel In', requires: { body: 8 },
    text: 'Tan, gym, spa. Strangers assume you were always like this.' },
  { id: 13, title: 'Five-Star Frame of Mind', requires: { accTier: 9 },
    text: 'Your towel arrives before you think to ask for it. You could get used to this, and that worries you for about a second.' },
  { id: 14, title: 'Going Viral', requires: { comfort: 1.3e6 },
    text: 'One of your holiday clips takes off overnight. The internet has decided you are worth money. You do not argue.',
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
      'From a lounger you watch one wallet move an amount with its own zip code. The ' +
      'chart does something dramatic. You sip your drink and do nothing, which turns ' +
      'out to be a strategy. By the time the chart calms down, the concierge has ' +
      'already booked your next flight.' },
      // connoisseur variant (E14-S7-T3 "Provenance") — SAME beat-14 gate/requires as the
      // default (E14-S7-T10: no build is ever stranded; only the title/text swap when
      // story.branch==='connoisseur', mirroring the crypto variant just above). Also
      // plants the beat-25 "Where the Rich Hide" setup line (E14-S7-T6, exclusive
      // destinations — Monaco, St. Barths, an unlisted address) so beat 25's own reveal
      // and E24's set-collection payoff both land with the seed already sown.
      traveler: { title: 'Grand Tour', text:
        'Somewhere between the sixth country and the seventh, the trip stops being a trip. A ' +
        'magazine wants your route. A stranger in a station recognizes your backpack before ' +
        'your face. You have become a direction other people point at. The internet has ' +
        'decided you are worth money, and you were not even filming.' },
      vlogger: { title: 'Going Viral', text:
        'One of your holiday clips takes off overnight — the one you almost deleted, the one ' +
        'where the umbrella loses. By morning there are duets, remixes, a sea shanty. The ' +
        'internet has decided you are worth money. You film your breakfast. It also does numbers.' },
      connoisseur: { title: 'Provenance', text:
        'An auction house calls about your Bordeaux, not the other way around. You ' +
        'decline, mostly to hear how they take it. Before hanging up, the man mentions ' +
        'an unlisted address in Monaco and a friend who summers near St. Barths, in the ' +
        'sort of place you only find by being invited. You do not ask for the address. ' +
        'You suspect it will find you.' } } },
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
      'that finally do not smell of a hostel locker. The bus timetable you memorized ' +
      "out of necessity becomes trivia. If you're also deep in StroopCoin, the chart " +
      'paid for the coupe while you were parking it badly outside a bakery. There was ' +
      'a marina brochure in the glovebox. It stays there. For now.' } } },
  { id: 16, title: 'Sea Legs', requires: { comfort: 5e6 },
    text: 'The boat has a small pool on the deck. You swim in the pool, on the sea. Nobody on board finds this as funny as you do.',
    // Branch-flavored variants (E16 "Sea Legs" — S1/S7-T8). The gate/requires stay comfort:5e6
    // for EVERY branch (incl. the harness — the 26-beat pin); this only swaps the shown text
    // for a traveler/connoisseur, mirroring beats 14/15. engine.checkFirstBoat layers the
    // one-time boat bonus on top, gated on actually owning a hull.
    variants: {
      traveler: { title: 'Sea Legs', text:
        'You buy a boat, then a bigger boat. The sea turns out to be a road with no lanes, and the ' +
        'coves the guidebooks skip are suddenly reachable. The yard building your next hull has ' +
        'misspelled your name on the order form. You let it stand. The sky is next.' },
      connoisseur: { title: 'Sea Legs', text:
        'One does not own a yacht. One is briefly permitted to steward it. The teak is correct, the ' +
        'cellar holds its temperature, and there is a pool on the sea, which should be ridiculous ' +
        'and somehow is not. You catch yourself wondering how it all looks from the air.' },
    } },
  { id: 17, title: 'Wheels Up', requires: { comfort: 2e7 },
    variants: {
      traveler: { title: 'Wheels Up', text:
        'Car, boat, and now the sky. You buy a jet and every city becomes a nap away. Ten years ' +
        'of bus timetables end at your own runway. The stroopwafels fly with you now, in a tin, ' +
        'up front where you can see them.' },
    },
    text: 'No terminals, no queues. The sky is a private hallway now.' },
  { id: 18, title: 'The Sail-Shaped Hotel', requires: { accTier: 12 },
    text: 'Six stars. It is shaped like a sail. Everything is gold. You feel fine about it.',
    variants: {
      connoisseur: { title: 'The Sail-Shaped Hotel', text:
        'A hotel shaped like a sail, for someone who once arrived by poncho. The doorman reads ' +
        'your taste like a wine list and unhooks the rope before you reach it. Gold on the taps, ' +
        'sea under the glass, and the shed is a story you tell at dinner now. You made it.' },
    } },
  { id: 19, title: 'At Your Service', requires: { comfort: 4e7 },
    text: 'A butler. You ring a small bell and reality rearranges itself.' },
  { id: 20, title: 'The Whole Household', requires: { comfort: 1.2e8 },
    text: 'Chef, driver, trainer, social manager. You are now a small, tanned economy.' },
  // Beats 21/22 (E21 "Seven Stars"): the Act-II close and reconvergence hub. Beat 21 introduces
  // "the patron" — an unnervingly at-ease figure who owns "a place with no front desk at all"
  // (the island foreshadow, E27). Beat 22 is the reconvergence HUB: every branch's variant text
  // differs, but all pass through the same neutral default gate (comfort:3e8) so no build is ever
  // stranded (the 26-beat harness pin / neutral fallback). The patron's invitation seeds the
  // island explicitly enough to intrigue, vaguely enough to withhold.
  { id: 21, title: 'Seven Stars', requires: { accTier: 14 },
    text: 'A rating that officially does not exist. They invented it for you. Across the lobby, ' +
      'a figure entirely at ease, the one the staff call the patron, mentions to nobody in ' +
      'particular: "a place with no front desk at all."',
    variants: {
      connoisseur: { title: 'Seven Stars', text:
        'Seven stars, a rating that officially does not exist. They invented it quietly, for you. ' +
        'The patron finds you at the cellar door and names your wine before you pour it. Old ' +
        'money nods to older money. "There is a place," he adds, "with no front desk at all."' },
      traveler: { title: 'Seven Stars', text:
        'Seven stars. No guidebook lists the rating, because no guidebook has been here. The ' +
        'patron, who has been everywhere and mentions none of it, watches you count your passport ' +
        'stamps and smiles. "There is one more place. It has no border, no terminal, no front ' +
        'desk at all."' },
      vlogger: { title: 'Seven Stars', text:
        'Seven stars, and the clip of you arriving does numbers. The patron stays off camera and ' +
        'asks you, just once and very gently, to put it down. "The next place," he says, "has no ' +
        'front desk, and no signal. You will like it more than you expect."' },
      crypto: { title: 'Seven Stars', text:
        'Seven stars, settled instantly, no questions about the wallet. The patron reads your net ' +
        'worth like a weather report: mildly interesting, changes nothing. "Numbers get you the ' +
        'suite," he says. "There is a place numbers cannot get you into. It has no front desk at all."' },
    } },
  { id: 22, title: 'The Invitation', requires: { comfort: 3e8 },
    text: 'A card with no return address: "The island is ready when you are." You recognise the ' +
      'handwriting. You read it twice and pack nothing. Yet.',
    variants: {
      connoisseur: { title: 'The Invitation', text:
        'No card, no address. The patron simply recognises your wine before you do, and leaves a ' +
        'key that fits a door you have never seen. "The island is ready when you are." You are.' },
      traveler: { title: 'The Invitation', text:
        'The invitation arrives as a stamp in a passport you never handed over. No country claims ' +
        'the ink. "The island is ready when you are," the patron writes. It is the one place left.' },
      vlogger: { title: 'The Invitation', text:
        'The patron does not appear on camera. The invitation does: a single card, no return ' +
        'address, "The island is ready when you are." You film it, then put the camera down. ' +
        'For once.' },
      crypto: { title: 'The Invitation', text:
        'An unsolicited transfer lands, memo field just one word: "come." Attached, a deed with no ' +
        'coordinates. "The island is ready when you are," signs the patron. You already know it is.' },
    } },
  { id: 23, title: "A Bungalow of One's Own", requires: { accTier: 16 },
    text: 'You stop renting rooms. The walls are yours, and so is the hammock, and so is the ' +
      'little gate that squeaks. A decade of checkout times ends with a key that has no tag, ' +
      'because it does not belong to a desk. You say it out loud to nobody: my gate. Then, ' +
      'quieter, because it is somehow bigger: my squeak.' },
  { id: 24, title: 'Villa Vita', requires: { accTier: 18 },
    text: 'The villa has grounds, the grounds have staff, and the staff have opinions about ' +
      'hedges you did not know could be held. On day three you get lost on the way to your own ' +
      'kitchen and are escorted back by a gardener who pretends this happens to everyone. It ' +
      'is the nicest lie anyone has told you since the poncho was "a look."' },
  { id: 25, title: 'Where the Rich Hide', requires: { taste: 25 },
    text: 'Monaco. Dubai. The Maldives. Aspen. St. Barths. Places that do not advertise, ' +
      'because advertising implies they want to be found. You collect them the way you once ' +
      'collected hostel stamps, and notice the stamps have stopped impressing you. Somewhere ' +
      'behind all five doors, you suspect, is a sixth door. The patron has never mentioned it. ' +
      'That is how you know it exists.' },
  { id: 26, title: 'Letting Go', requires: { comfort: 1e9 },
    text: 'One evening, on the best balcony you have ever rented, you understand what has to ' +
      'go: not the money — the money was never the point — but the going itself. The next ' +
      'traveler in your family will start where you started, bus stop and all, carrying only ' +
      'what the trip made of you: the poise, the taste, the tan that outlived the doubts. ' +
      'You fold the poncho one last time, leave it where the next one will find it, and let ' +
      'go of the ladder so someone you love can climb it. You can ASCEND now.' },
  { id: 27, title: 'Who You Become', requires: { ascensions: 1 },
    text: 'A new passport, an old family. Some changes stick between generations: the tan, ' +
      'the poise, the way you now read a lobby like a weather report. At the bus stop — the ' +
      'same bus stop, the same sideways rain — a figure with no luggage nods as if you had ' +
      'never left. "The family resemblance," the patron says, "is not in the face." Spend ' +
      'Legacy on who you are.' },
  { id: 28, title: 'The Island Listing', requires: { legacy: 20 },
    text: 'It arrives without an envelope: a listing for a dot on a map no ferry serves. No ' +
      'agent is named. None is needed — you recognize the handwriting in the margin, the same ' +
      'hand that once wrote "ready when you are." The dot has a price. Generations of a ' +
      'family could look at that price and laugh, and yours is the generation that does not ' +
      'have to. A very large, extremely worth-it price.' },
  { id: 29, title: 'Building Paradise', requires: { accTier: 20 },
    text: 'The first guests arrive by boat, overdressed and under-sunscreened, and you catch ' +
      'yourself checking their rooms twice — the towels, the water pressure, the earplugs in ' +
      'the drawer, because you remember bunk 4. You stop buying luxury the day you start ' +
      'making it. Somewhere a front desk does not exist, and you are it. You host now.' },
  { id: 30, title: 'Empire of Leisure', requires: { comfort: 3e9 },
    text: 'An empire of loungers, all yours, and still the sea keeps going. On the jetty you ' +
      'find a last note, no address, weighted down with a stroopwafel tin: "You were never ' +
      'buying rooms. You were buying the distance from the rain. There is no front desk ' +
      'anywhere now — so build one, and be kind to whoever arrives soggy." You pour one at ' +
      'the jetty bar, sit, and watch the horizon not end. You could do the whole trip again, ' +
      'bigger, with the sky a shade harder. New Game+ awaits.' },
];

// The origin story (diary page zero): who this tourist was before Entry 1. Display-only —
// the diary modal shows it as the opening page, before the first dated entry. Never a gate.
export const ORIGIN = {
  title: 'Before Page One',
  text: 'Four years at VanderVeen Logistics, third desk from the window, filing invoices for ' +
    'crates that got to travel more than you did. Every spring you said next year. Every ' +
    'autumn the rain came back like it had a season ticket. This year you handed in a ' +
    'sabbatical request instead of a holiday form, emptied a savings account that held €15 ' +
    'and change after the ferry ticket, and left a note taped to your monitor: gone to see ' +
    'the world. Back when it stops raining.',
};

// data/story.js — NPC vignette seeds (E02-S7): pure flavor toasts, never a progression
// gate. Each fires once at `minComfort`, between beats 2 (Comfort 20) and 3 (accTier 1),
// tracked in state.story.flags so it never repeats across a reload.
export const VIGNETTES = [
  { id: 'motel_manager_1', minComfort: 80,
    text: '📋 The manager taps his clipboard. "Rats are down two stars this week. Congratulations. ' +
          'There\'s a hostel down the road, you know. Cheaper. The rats there have union representation too."' },
  { id: 'bram_map', minComfort: 900,
    text: '🎒 Backpacker Bram unfolds a map with more tape than paper. "Everywhere worth going is ' +
          'off it," he says, pointing at a hole. You write that down. He asks you not to.' },
  { id: 'vera_tripod', minComfort: 4000,
    text: '🎥 Vlogger Vera is filming the sunset, the sunset is not cooperating, and she narrates ' +
          'it anyway: "authentic." She glances at you. "You should point a camera at all this. Or don\'t. ' +
          'More sunset for me."' },
  { id: 'henk_upgrade', minComfort: 22000,
    text: '🍺 Hostel Regular Henk surveys your hotel lobby from the good chair, unimpressed and ' +
          'impressed at once. "Free breakfast until NINE?" he says. "Decadence." He takes four croissants for the road.' },
  { id: 'sven_usual', minComfort: 120000,
    text: '🍹 Sven the mixologist slides one across before you order. "The usual." You have never ' +
          'been here. You have, apparently, a usual that travels ahead of you now.' },
  { id: 'goat_rumor', minComfort: 9e5,
    text: '🐐 A goat is asleep on a lounger it has no business reaching. Staff deny owning a goat. ' +
          'The goat, waking briefly, denies nothing.' },
  { id: 'willem_interest', minComfort: 6e6,
    text: '🏦 Willem, private banker, calls to say your money made more money while you were in the ' +
          'pool. "Do nothing," he advises, professionally. You were already doing that. You are so good at it now.' },
  { id: 'vera_return', minComfort: 4e7,
    text: '🎥 Vera again, festival lanyard, three cameras. "Remember the hostel Wi-Fi?" she says. ' +
          '"baguette123." You both stand quietly, like veterans.' },
  { id: 'bram_postcard', minComfort: 3e8,
    text: '🎒 A postcard from Bram, postmarked from the hole in his map: "Found it. You would hate ' +
          'it. No pool. — B." You frame it next to the receipt with the one star.' },
  { id: 'patron_echo', minComfort: 9e8,
    text: '🕴️ At the seven-star bar, the barman polishes a glass that is already clean. "The patron ' +
          'asked after you," he says. You did not mention the patron. Nobody ever mentions the patron first.' },
  { id: 'henk_visit', minComfort: 2e9,
    text: '🍺 Henk arrives at your island unannounced, which is impressive, given the sea. He naps on ' +
          'the good lounger next to the goat, and leaves a five-euro note "for the room." You frame that too.' },
  { id: 'staff_quiet', minComfort: 4e9,
    text: '🤵 Late, the estate quiet, the butler sets out two glasses instead of one and says nothing ' +
          'about it. Some service anticipates needs. Some just keeps you company.' },
];
