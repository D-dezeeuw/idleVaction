// data/index.js — composes all declarative content into one DATA object.
import { GENERATORS } from './generators.js';
import { AMENITIES } from './amenities.js';
import { ACCOMMODATION } from './accommodation.js';
import { SKILLS, TRAINING } from './skills.js';
import { PATHS } from './paths.js';
import { TREE } from './skilltree.js';
import { STORY, VIGNETTES } from './story.js';

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
};
