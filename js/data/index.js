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
};
