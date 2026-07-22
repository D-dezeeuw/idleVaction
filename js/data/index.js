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
};
