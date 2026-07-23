// data/index.js — composes all declarative content into one DATA object.
import { GENERATORS } from './generators.js';
import { AMENITIES } from './amenities.js';
import { ACCOMMODATION } from './accommodation.js';
import { SKILLS, TRAINING } from './skills.js';
import { PATHS } from './paths.js';
import { TREE } from './skilltree.js';
import { STORY, VIGNETTES } from './story.js';
import { NPCS } from './npcs.js';
import { DESTINATIONS, TRANSPORT } from './destinations.js';
import { CONTENT } from './content.js';
import { SPONSORS } from './sponsors.js';
import { COINS, MARKET_EVENTS, HEDGES } from './crypto.js';
import { BANK_ACCOUNTS } from './bank.js';
import { ART, WINE } from './collections.js';
import { CARS } from './vehicles.js';
import { BOATS, CREW, JETS } from './logistics.js';
import { STAFF_DATA } from './staff.js';
import { PROPERTIES, PROPERTY_UPGRADES, GROUNDS } from './property.js';
import { BUILDINGS } from './island.js';
import { LEGEND_PERKS } from './legend.js';
import { ACHIEVEMENTS } from './achievements.js';
import { SEASONAL } from './seasonal.js';
import { EVENTS, WEATHER_STATES } from './events.js';
import { BOOSTS } from './boosts.js';
import { SPLURGES } from './splurges.js';
import { SOUVENIRS } from './souvenirs.js';
import { CHALLENGES } from './challenges.js';
import { PETRA } from './petra.js';

export const DATA = {
  generators: GENERATORS,
  amenities: AMENITIES,
  accommodation: ACCOMMODATION,
  skills: SKILLS,
  training: TRAINING,
  paths: PATHS,
  tree: TREE,
  story: STORY,
  vignettes: VIGNETTES,
  npcs: NPCS,
  destinations: DESTINATIONS,
  transport: TRANSPORT,
  content: CONTENT,
  sponsors: SPONSORS,
  // crypto (E13 "Money Works While You Tan"): coins/events/hedges grouped under one
  // namespace (mirrors how `transport`/`destinations` share the World Traveler epic).
  crypto: { coins: COINS, events: MARKET_EVENTS, hedges: HEDGES },
  // bank-account ladder (wallet cap): flavor rows indexed by state.bank.tier — the
  // capacity numbers themselves come from config.BANK via math.bankCapAt.
  bank: BANK_ACCOUNTS,
  // collections (E14 "Acquired Taste"): art/wine appreciating assets grouped under one
  // namespace. validateCollections lives in data/collections.js and is imported directly
  // from there by the dev harness/selftest — same convention as validateBank/validatePaths/
  // validateDestinations, none of which are re-exported here.
  collections: { art: ART, wine: WINE },
  // vehicles (E15 "Keys to the Coupe"): the garage car roster. validateVehicles lives in
  // data/vehicles.js, imported directly by the dev harness/selftest.
  vehicles: CARS,
  // logistics-II (E16 "Sea Legs"): the marina — boats + a pre-staff crew seed. validateLogistics
  // lives in data/logistics.js, imported directly by the dev harness/selftest. Sea destinations
  // live in DATA.destinations (flagged sea:true); the yacht amenity cluster is tag:'yacht'.
  boats: BOATS,
  crew: CREW,
  // logistics-III (E17 "Wheels Up"): jets + the car+boat+jet capstone. Air destinations live in
  // DATA.destinations (air:true); the jet-cabin cluster is tag:'jet'.
  jets: JETS,
  // staff (E19 "At Your Service"): the butler + future roles. validateStaff lives in data/staff.js,
  // imported directly by the dev harness/selftest. The butler's auto-buy reuses the E11 concierge.
  staff: STAFF_DATA,
  // owned property (E22 "A Bungalow of One's Own"): the rent→own flip. Persistent Comfort floor +
  // per-property upgrade tree; validateProperty lives in data/property.js, imported directly by
  // the dev harness/selftest. Opt-in — the harness never buys a deed, so the island is unmoved.
  property: PROPERTIES,
  propertyUpgrades: PROPERTY_UPGRADES,
  // grounds (E23 "Villa Vita"): garden/pool/court mega-cluster metadata; the nodes themselves are
  // tag:'grounds' amenities in data/amenities.js. Estate staff assign to a cluster kind.
  grounds: GROUNDS,
  // island buildings (E28 "Building Paradise"): generator+amenity hybrids that host paying guests.
  // validateIsland lives in data/island.js. All gated on owning the island (E27) — harness-neutral.
  buildings: BUILDINGS,
  // legend perks (E29 "Empire of Leisure"): the meta-meta shop bought with Legend points. Neutral
  // until a perk is bought; validateLegend lives in data/legend.js. Harness never Legends → L_legend 1.
  legendPerks: LEGEND_PERKS,
  // achievements (E30 "Legends of Leisure"): completionist trophies. In-run milestones are cosmetic
  // (reward 0); meta/collection achievements carry the L_achieve × — the harness reaches only the
  // reward-0 ones, so L_achieve stays 1. validateAchievements lives in data/achievements.js.
  achievements: ACHIEVEMENTS,
  // seasonal (E30): rotating live-ops destinations, a small bounded × gated on owning the island.
  seasonal: SEASONAL,
  // Trip Events + Vacation Weather (Living-World W1, docs/08 points 1/3): the seeded serendipity
  // deck + ambient weather. validateEvents lives in data/events.js, imported directly by the dev
  // harness/selftest (same convention as validateBank/validatePaths/…). Neutral by default —
  // config.EVENTS.enabled ships false this wave, so engine.eventsTick never draws either table.
  events: EVENTS,
  weatherStates: WEATHER_STATES,
  // Sunscreen Boosts + Splurge Moments (Living-World W2, docs/08 points 4/5): player-fired timed
  // multipliers + two-option choice cards, both on the SAME shared effects registry Trip Events
  // uses. validateBoosts/validateSplurges live in their own data files, imported directly by the
  // dev harness/selftest (same convention as validateBank/validatePaths/validateEvents/…).
  boosts: BOOSTS,
  splurges: SPLURGES,
  // Souvenir Stand + Ascension Challenges (Living-World W3, docs/08 points 6/7): the shelf roster
  // spent with the souvenirs currency, and the 5-row handicap-run roster prestige.ascend validates
  // against. validateSouvenirs/validateChallenges live in their own data files, imported directly
  // by the dev harness/selftest (same convention as validateBoosts/validateSplurges/…).
  souvenirs: SOUVENIRS,
  challenges: CHALLENGES,
  // Petra, the Pace Ghost (Living-World W4, docs/08 point 10): the casual-tourist golden curve,
  // baked as flat data by js/dev/petra-gen.mjs (GENERATED — do not hand-edit data/petra.js).
  // DISPLAY-ONLY, never read by any income path. validatePetra lives in data/petra.js, imported
  // directly by the dev harness/selftest (same convention as validateBoosts/validateSouvenirs/…).
  petra: PETRA,
};
