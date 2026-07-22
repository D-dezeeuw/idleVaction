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
};
