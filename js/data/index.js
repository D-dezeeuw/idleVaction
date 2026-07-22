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
  // namespace (mirrors how `transport`/`destinations` and `crypto`'s coins/events/hedges
  // share a namespace above). validateCollections lives in data/collections.js and is
  // imported directly from there by the dev harness/selftest — same convention as
  // validateBank/validatePaths/validateDestinations, none of which are re-exported here.
  collections: { art: ART, wine: WINE },
  // vehicles (E15 "Keys to the Coupe"): the garage car roster. validateVehicles lives in
  // data/vehicles.js and is imported directly from there by the dev harness/selftest —
  // same convention as validateCollections/validateBank/validateDestinations, none of
  // which are re-exported here.
  vehicles: CARS,
};
