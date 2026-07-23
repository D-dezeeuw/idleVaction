// tools/genart.mjs — generate the holiday art set via OpenRouter (UX-plan §3 imagery).
//
//   OPENROUTER_API_KEY=sk-or-...  node tools/genart.mjs test        # one image: the tier-0 postcard
//   OPENROUTER_API_KEY=sk-or-...  node tools/genart.mjs postcards   # the full Wave-1 tier set (22)
//
// The key is read from the environment ONLY — never hardcode it here, never commit it.
// Output: assets/img/postcards/tier-NN.png (skip-if-exists — a compressed tier-NN.webp also
// counts as done, so re-runs only fill gaps). The raw 1024px PNGs are gitignored; compress to
// the committed 760px WebP (the size the UI ships) with Pillow before wiring the manifest:
//   pip install pillow && python3 -c "from PIL import Image; import sys; \
//     [Image.open(f).resize((760,760), Image.LANCZOS).save(f[:-4]+'.webp','WEBP',quality=82,method=6) \
//      for f in sys.argv[1:]]" assets/img/postcards/tier-*.png
// After compressing, add the new tier numbers to POSTCARD_ART in js/ui.js (the manifest that
// tells the UI which tiers have art — everything else keeps its emoji-scene fallback).
//
// Node ≥ 18 (global fetch). No dependencies — in keeping with the repo rules; this is a dev
// tool like js/dev/harness.mjs, never loaded by the game.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';

const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error('Set OPENROUTER_API_KEY in the environment first (never hardcode it).');
  process.exit(1);
}

const MODEL = process.env.GENART_MODEL || 'google/gemini-2.5-flash-image';
const OUT = 'assets/img/postcards';

// The style bible (UX-plan §1.1): ONE prefix for every asset so the whole set feels like one
// artist. Palette-locked to the holiday theme; no text (AI lettering is mush); the tourist is
// always seen from behind (everyone can be them).
const STYLE =
  'Flat playful holiday illustration, warm flat colors: sunshine yellow #FFC800, hot pink ' +
  '#FF2E88, sky blue #45C4FF, apple green #7ED957 on a warm sand background. Thick soft ' +
  'outlines, travel-poster energy, cheerful and inviting. No text, no letters, no words. ' +
  'If a person appears they are a tourist seen only from behind. ';

// One scene per accommodation tier (matches data/accommodation.js order, tiers 0–21).
const POSTCARDS = [
  'a sad little wooden shed at a rainy grey bus stop, puddles everywhere, a lone tourist in a bright yellow rain poncho waiting under a drooping umbrella, grey drizzle sky with one tiny hopeful ray of sunshine breaking through',
  'a run-down roadside motel at dusk with a flickering sign, one door slightly ajar, two oversized friendly cartoon cockroaches peeking cheerfully from a window',
  'a cramped hostel dorm room stuffed with bunk beds, backpacks everywhere, one single power outlet lit like a shrine with phone chargers queued toward it',
  'a small cosy budget guesthouse with flower boxes and a crooked hand-painted sign, morning light, a bicycle leaning by the door',
  'a modest city hotel proudly displaying one single enormous golden star on its facade, the tourist in a poncho gazing up at it in awe',
  'a sunny hotel breakfast room with a continental breakfast spread of croissants and orange juice on a checkered tablecloth, morning light through the window',
  'a hotel swimming pool with sparkling turquoise water, a rubber duck floatie, and a tourist mid-cannonball seen from behind, splash frozen in the air',
  'a beach resort with palm trees, white sand, a row of sun loungers with striped umbrellas, gentle turquoise waves',
  'a small tasteful boutique hotel courtyard with lanterns, olive trees in terracotta pots, and quiet expensive calm',
  'a grand five-star hotel entrance with marble steps, a brass luggage trolley stacked with suitcases, and palm trees flanking the door',
  'a plush hotel suite living room with a champagne bottle on ice, floor-to-ceiling windows over a sunny bay',
  'a grand hotel corridor with golden chandeliers and a long warm carpet, doors receding to a bright window at the end',
  'a sail-shaped luxury hotel tower on the coast at golden sunset, gold light reflecting off the glass, small boats in the bay below',
  'a penthouse terrace at night above a glittering city skyline, a private telescope and two lounge chairs, warm string lights',
  'an impossibly lavish hotel lobby with a fountain, floating lanterns, and a grand staircase, everything glowing warmly',
  'a royal suite with an enormous four-poster bed, velvet drapes and gold trim, a crown motif above the headboard',
  'a cosy private beach bungalow with its own little gate, a hammock between two palms, warm evening light',
  'an overwater villa on stilts above a turquoise lagoon, colorful fish visible beneath the glass-clear water, a ladder into the sea',
  'a private villa with manicured gardens, topiary hedges, a stone fountain and a name gate, late afternoon sun',
  'a grand private estate at the end of a long tree-lined driveway, deer grazing in the parkland, golden light',
  'a small private island seen from the sea at golden hour, one elegant house, palm trees, a boat moored at a little jetty',
  'a thriving private island resort at golden hour with villas along the shore, a marina of white boats, a helipad, and tiny guests arriving',
];

// Style anchor: the approved tier-0 postcard rides along as a reference image on illustration
// calls, so each set matches ONE realized style, not N fresh interpretations of the bible.
// (Stamps chain off the FIRST generated stamp instead — a different asset class.)
function dataUrl(file) {
  const mime = file.endsWith('.webp') ? 'image/webp' : 'image/png';
  return { type: 'image_url', image_url: { url: `data:${mime};base64,${readFileSync(file).toString('base64')}` } };
}
const REF_FILE = `${OUT}/tier-00.webp`;
const refPart = () => existsSync(REF_FILE) ? dataUrl(REF_FILE) : null;
const matchRef = (text) =>
  `Match the illustration style of the reference image exactly — same palette, same thick soft ` +
  `outlines, same flat shading, same level of detail. Draw a completely NEW scene (do not copy ` +
  `the reference composition): ${text}`;

async function generate(text, outfile, ref) {
  const content = ref ? [ref, { type: 'text', text: matchRef(text) }] : text;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url || !url.startsWith('data:image/')) throw new Error('no image in response: ' + JSON.stringify(json).slice(0, 300));
  const b64 = url.slice(url.indexOf('base64,') + 7);
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(outfile, buf);
  return buf.length;
}

// ---- Passport set (Wave-2 pull-forward, UX-plan §3): the cover, the blank inside spread the
// stamp overlay sits on, and one rubber stamp per destination (matches js/data/destinations.js;
// premium = gold ink per the ledger). Stamps generate on pure white and are alpha-keyed +
// trimmed into overlay-ready transparent WebPs by tools/artpost.py.
const PP_DIR = 'assets/img/passport';
const ST_DIR = 'assets/img/passport/stamps';
const PASSPORT = [
  { name: 'cover', prompt:
    `${STYLE}A closed passport booklet seen straight on, one bold centered object: a sunshine ` +
    `yellow leather passport cover with a debossed rounded-rectangle border line and a round ` +
    `central emblem of a tiny tropical island with one palm tree and a big sun, small ` +
    `decorative suns in the corners, lying on the warm sand background with a soft shadow.` },
  { name: 'inside', prompt:
    `${STYLE}An open passport booklet lying flat, seen straight from above, filling the frame: ` +
    `two blank facing pages in soft warm cream, faint wavy security-pattern lines and very ` +
    `subtle pale watermarks of tiny palm trees and suns on the pages, a stitched seam down the ` +
    `center gutter, rounded page corners, a soft shadow on the warm sand background. The pages ` +
    `are completely blank — no stamps, no marks, no writing.` },
];
const INKS = ['sky blue', 'hot pink', 'apple green'];   // rotated across regular stamps
const STAMPS = [   // one per destination id; shapes varied like a real well-travelled passport
  { id: 'dest_ardennes_daytrip', shape: 'round',       motif: 'three pine trees above a winding road' },
  { id: 'dest_paris_hostel',     shape: 'oval',        motif: 'the Eiffel Tower with a tiny bunk bed at its base' },
  { id: 'dest_berlin',           shape: 'rectangular', motif: 'the Brandenburg Gate' },
  { id: 'dest_prague',           shape: 'hexagonal',   motif: 'a stone bridge with two pointed gothic towers' },
  { id: 'dest_amsterdam_return', shape: 'round',       motif: 'a tall narrow canal house beside a bicycle' },
  { id: 'dest_brussels',         shape: 'oval',        motif: 'a round waffle above two crossed fries' },
  { id: 'dest_cologne',          shape: 'rectangular', motif: 'a cathedral with two tall twin spires' },
  { id: 'dest_vienna',           shape: 'round',       motif: 'a giant ferris wheel' },
  { id: 'sea_hidden_cove',       shape: 'shield',      motif: 'an anchor inside a crescent-shaped cove' },
  { id: 'sea_greek_islands',     shape: 'oval',        motif: 'a domed island chapel above three wavy lines' },
  { id: 'sea_fjord_cruise',      shape: 'rectangular', motif: 'a small cruise ship between two steep fjord cliffs' },
  { id: 'air_tokyo',             shape: 'round',       motif: 'a torii gate in front of a snow-capped mountain' },
  { id: 'air_new_york',          shape: 'hexagonal',   motif: 'a liberty torch and a seven-pointed crown' },
  { id: 'air_sydney',            shape: 'oval',        motif: 'an opera house with sail-shaped shells' },
  { id: 'dest_monaco',    premium: true, shape: 'shield',    motif: 'a royal crown above a yacht' },
  { id: 'dest_dubai',     premium: true, shape: 'round',     motif: 'a sail-shaped skyscraper beside a crescent moon' },
  { id: 'dest_maldives',  premium: true, shape: 'oval',      motif: 'an overwater bungalow on stilts above wavy water' },
  { id: 'dest_aspen',     premium: true, shape: 'hexagonal', motif: 'a large snowflake above two mountain peaks' },
  { id: 'dest_st_barths', premium: true, shape: 'round',     motif: 'a star above a harbour with a moored sailboat' },
];
function stampPrompt(s, i) {
  const ink = s.premium ? 'warm metallic gold' : INKS[i % INKS.length];
  return `A single passport rubber stamp impression, ${s.shape} border, printed entirely in ` +
    `${ink} ink — one single ink color only, slightly distressed and unevenly inked like a ` +
    `real rubber stamp: ${s.motif}. Bold simplified flat shapes, thick lines, playful holiday ` +
    `energy, centered on a plain pure white background, nothing else in the image, no text, ` +
    `no letters, no numbers.`;
}

// items: [{ png, prompt, ref }] — ref is a thunk so stamp-chaining sees files made this run.
async function produce(items) {
  const done = [];
  for (const it of items) {
    const webp = it.png.slice(0, -4) + '.webp';
    if (existsSync(it.png) || existsSync(webp)) { console.log(`skip (exists): ${existsSync(webp) ? webp : it.png}`); done.push(it.png); continue; }
    process.stdout.write(`${it.png} … `);
    try {
      const bytes = await generate(it.prompt, it.png, it.ref?.());
      console.log(`ok (${(bytes / 1024).toFixed(0)} KB)`);
      done.push(it.png);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1200));   // gentle pacing between calls
  }
  return done;
}

const mode = process.argv[2] || 'test';
let items;
if (mode === 'test' || mode === 'postcards') {
  mkdirSync(OUT, { recursive: true });
  const targets = mode === 'test' ? [0] : POSTCARDS.map((_, i) => i);
  items = targets.map(i => ({
    png: `${OUT}/tier-${String(i).padStart(2, '0')}.png`,
    prompt: `${STYLE}A vintage travel postcard scene, landscape composition: ${POSTCARDS[i]}.`,
    ref: refPart,
  }));
} else if (mode === 'passport') {
  mkdirSync(PP_DIR, { recursive: true });
  items = PASSPORT.map(p => ({ png: `${PP_DIR}/${p.name}.png`, prompt: p.prompt, ref: refPart }));
} else if (mode === 'stamps') {
  mkdirSync(ST_DIR, { recursive: true });
  // consistency chain: the first stamp on disk anchors the style of every later stamp
  const stampRef = () => {
    for (const s of STAMPS) {
      for (const ext of ['webp', 'png']) {
        const f = `${ST_DIR}/${s.id}.${ext}`;
        if (existsSync(f)) return dataUrl(f);
      }
    }
    return null;
  };
  items = STAMPS.map((s, i) => ({ png: `${ST_DIR}/${s.id}.png`, prompt: stampPrompt(s, i), ref: stampRef }));
} else {
  console.error(`unknown mode "${mode}" — use: test | postcards | passport | stamps`);
  process.exit(1);
}

const done = await produce(items);
console.log(`\nGenerated/present: ${done.length}/${items.length}`);
if (mode === 'test' || mode === 'postcards')
  console.log(`Now compress (tools/artpost.py) and add the tier numbers to POSTCARD_ART in js/ui.js.`);
else
  console.log(`Now run tools/artpost.py to crop/alpha-key/compress into the shipped WebPs.`);
