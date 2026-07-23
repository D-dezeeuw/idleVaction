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

// ---- Wave 2-3 (ledger "images idea"): diary polaroids, seasonal stamps, trophy/legend
// stickers, and the one-off extras (patron silhouette, property deeds, island buildings,
// era-modal heroes). Stickers generate on a plain grey card so tools/artpost.py can
// flood-fill the background away WITHOUT eating their white die-cut borders.
const POLAROID_DIR = 'assets/img/polaroids';
// One candid snapshot per story beat (js/data/story.js ids 1-30) — diary page photos.
const POLAROIDS = {
  1: 'a tourist in a yellow rain poncho waiting at a grey Dutch bus stop in sideways rain, one warm ray of sun breaking through',
  2: 'two oversized friendly cartoon cockroaches waving cheerfully from a motel bed',
  3: 'a tourist walking out of a run-down motel at sunrise, backpack on, not looking back',
  4: 'a hostel bunk bed at night, a phone glowing on charge like a tiny shrine',
  5: 'a hand pressing a big rubber stamp onto the first blank page of an open passport',
  6: 'a tourist at a beach cafe table with a laptop, four dreamy thought bubbles above: a camera, a rising chart, a map, a cocktail',
  7: 'a tourist gazing up at a small hotel with one enormous glowing golden star on its facade',
  8: 'a sunny breakfast table with croissants, jam and orange juice on a checkered tablecloth',
  9: 'a tourist mid-cannonball over a sparkling hotel pool, splash frozen, rubber duck watching',
  10: 'a tourist lounging poolside in a sun hat, tiny sunglasses resting on a coconut drink beside them',
  11: 'a fancy hotel lobby with two grand corridors forking left and right, a tourist standing at the split',
  12: 'a tourist doing a sunrise stretch on a yoga mat on a hotel balcony over the sea',
  13: 'a marble hotel entrance with five golden stars arched above the revolving door',
  14: 'a phone on a tripod filming a beach sunset, hearts and confetti bursting from the screen',
  15: 'a hot pink convertible with the top down parked by the coast, a key fob resting on the seat',
  16: 'a tourist at the rail of a small white yacht, hair in the wind, gulls alongside',
  17: 'a tourist climbing the fold-down steps of a small private jet at golden hour',
  18: 'a sail-shaped glass hotel tower on the coast at sunset, gold light on the glass',
  19: 'a butler in a crisp suit presenting a towel folded into a perfect swan on a silver tray',
  20: 'a cheerful staff lineup — chef, gardener, housekeeper — in front of a villa at morning',
  21: 'a grand hotel terrace at night with seven bright stars arranged in the sky above it',
  22: 'a white-gloved hand holding out a sealed cream envelope, a faint island silhouette on the horizon behind',
  23: 'a cosy beach bungalow with its own little gate and a hammock, warm evening light',
  24: 'a villa garden at dusk with a stone fountain and string lights coming on',
  25: 'a hidden harbour full of elegant yachts at golden hour, seen from a hillside terrace',
  26: 'a tourist crouching at the shoreline releasing a little paper boat into a calm sunset sea',
  27: 'a tourist seen from behind facing a full-length mirror, the reflection standing a little taller',
  28: 'a brass spyglass on a tripod pointed at a small island across glittering water',
  29: 'a tiny island busy with friendly cranes and scaffolding, a tourist in a hard hat pointing at plans',
  30: 'a thriving island resort panorama at golden hour, flags up, boats arriving, tiny guests waving',
};
// Five seasonal stamps (js/data/seasonal.js) — same rubber-stamp class as destination stamps,
// output into the same stamps dir so artpost's stamp alpha-keying picks them up.
const SEASONAL_STAMPS = [
  { id: 'season_carnival', ink: 'hot pink',    shape: 'round',       motif: 'a feathered carnival mask above a tiny drum' },
  { id: 'season_aurora',   ink: 'sky blue',    shape: 'oval',        motif: 'wavy aurora ribbons above three pine trees' },
  { id: 'season_regatta',  ink: 'apple green', shape: 'shield',      motif: 'three racing sailboats heeling in formation' },
  { id: 'season_sakura',   ink: 'hot pink',    shape: 'round',       motif: 'a blossom branch over a little arched bridge' },
  { id: 'season_harvest',  ink: 'warm orange', shape: 'hexagonal',   motif: 'a grape bunch above rolling vineyard hills' },
];
const STICKER_DIR = 'assets/img/stickers';
// Trophy stickers (js/data/achievements.js) + 5 gold Legend-perk stickers (js/data/legend.js).
const STICKERS = [
  { id: 'first_star',    motif: 'one proud golden star with a small sunburst behind it' },
  { id: 'poolside',      motif: 'a cheerful splash of water with a rubber duck riding it' },
  { id: 'five_star',     motif: 'five golden stars in a rising arc' },
  { id: 'sail_hotel',    motif: 'a sail-shaped glass tower catching the sun' },
  { id: 'the_island',    motif: 'a tiny tropical island with a map pin planted in it' },
  { id: 'comfy',         motif: 'a plump cosy armchair with a tasseled cushion' },
  { id: 'very_comfy',    motif: 'a bed floating on a fluffy cloud' },
  { id: 'first_million', motif: 'a fat stack of golden coins with wings' },
  { id: 'first_ascend',  motif: 'a little paper boat riding a big friendly wave' },
  { id: 'seasoned',      motif: 'a globe wrapped in a travel ribbon with tiny stamps on it' },
  { id: 'homeowner',     motif: 'a sunny house with an oversized golden key leaning on it' },
  { id: 'the_host',      motif: 'a raised serving tray with two tropical cocktails' },
  { id: 'a_legend',      motif: 'a laurel wreath around a rising sun' },
  { id: 'legendary',     motif: 'a double laurel wreath around a star, tiny rays everywhere' },
  { id: 'new_game_plus', motif: 'a sun chasing its own rays around in a loop like an infinity sign' },
  { id: 'collector',     motif: 'an open treasure chest overflowing with passport stamps' },
  { id: 'legend_eternal_tan',   gold: true, motif: 'a serene sun with closed happy eyes' },
  { id: 'legend_old_money',     gold: true, motif: 'a classical column made of stacked coins' },
  { id: 'legend_quick_study',   gold: true, motif: 'an open book with a lightning bolt bookmark' },
  { id: 'legend_muscle_memory', gold: true, motif: 'a flexing arm made of a palm tree trunk' },
  { id: 'legend_the_chronicle', gold: true, motif: 'a quill writing a long scroll that trails into waves' },
];
function stickerPrompt(s) {
  const finish = s.gold
    ? 'rendered entirely in warm metallic gold tones like a premium foil sticker'
    : 'in the warm flat holiday palette: sunshine yellow #FFC800, hot pink #FF2E88, sky blue #45C4FF, apple green #7ED957';
  return `A single die-cut luggage sticker with a thick white border and a soft drop shadow, ` +
    `${finish}: ${s.motif}. Flat playful illustration, thick soft outlines, bold simple shapes, ` +
    `centered on a plain flat cool light grey background, nothing else in the image, no text, ` +
    `no letters, no numbers.`;
}
// One-offs: patron silhouette (story), property deeds, island buildings, era-modal heroes.
const EXTRAS = [
  { png: 'assets/img/story/patron.png', prompt:
    `${STYLE}A mysterious elegant patron seen only as a dark silhouette from behind, standing at ` +
    `a grand hotel balcony rail at golden hour in a panama hat, one hand raising a glass, warm ` +
    `gold sky, seven faint stars above. The figure stays a silhouette — no face, no identity.` },
  { png: 'assets/img/property/deed_garden.png', prompt:
    `${STYLE}An ornate property deed certificate as a framed illustration, no words: a decorative ` +
    `scrolled border, a wax seal, and a central vignette of manicured gardens with a fountain.` },
  { png: 'assets/img/property/deed_pool.png', prompt:
    `${STYLE}An ornate property deed certificate as a framed illustration, no words: a decorative ` +
    `scrolled border, a wax seal, and a central vignette of a turquoise pool complex with slides.` },
  { png: 'assets/img/property/deed_court.png', prompt:
    `${STYLE}An ornate property deed certificate as a framed illustration, no words: a decorative ` +
    `scrolled border, a wax seal, and a central vignette of sunny tennis and padel courts.` },
  { png: 'assets/img/island/guest_villa.png',   prompt: `${STYLE}A single charming guest villa with a red roof and a little terrace, on a small green rise, square vignette.` },
  { png: 'assets/img/island/beach_cabanas.png', prompt: `${STYLE}A row of three striped beach cabanas with fluttering pennants on white sand, square vignette.` },
  { png: 'assets/img/island/island_marina.png', prompt: `${STYLE}A small marina with white boats moored along a wooden pier, square vignette.` },
  { png: 'assets/img/island/heliport.png',      prompt: `${STYLE}A circular helipad on a clifftop with a cheerful little helicopter resting on it, square vignette.` },
  { png: 'assets/img/island/island_spa.png',    prompt: `${STYLE}A serene cliffside spa pavilion with steam curling from a warm pool, square vignette.` },
  { png: 'assets/img/island/grand_resort.png',  prompt: `${STYLE}A grand resort wing with arches and palms, golden hour, square vignette.` },
  { png: 'assets/img/era/sold.png',        prompt: `${STYLE}A tiny tropical island wrapped in a giant celebratory ribbon and bow, confetti falling, boats honking joyfully around it.` },
  { png: 'assets/img/era/retirement.png',  prompt: `${STYLE}Two empty deck chairs side by side facing a huge calm sunset over the sea, a folded panama hat resting on one.` },
  { png: 'assets/img/era/legend.png',      prompt: `${STYLE}A golden statue of a tourist with a backpack on a plinth in a palm courtyard, birds perched on it, warm light.` },
  { png: 'assets/img/era/ngplus.png',      prompt: `${STYLE}An airport departure gate at dawn with a little plane waiting outside the window, one suitcase standing alone, adventure light.` },
];

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
} else if (mode === 'polaroids') {
  mkdirSync(POLAROID_DIR, { recursive: true });
  items = Object.entries(POLAROIDS).map(([id, scene]) => ({
    png: `${POLAROID_DIR}/beat-${String(id).padStart(2, '0')}.png`,
    prompt: `${STYLE}A candid holiday snapshot, square composition, no frame, no border: ${scene}.`,
    ref: refPart,
  }));
} else if (mode === 'seasonal') {
  mkdirSync(ST_DIR, { recursive: true });
  const stampRef = () => existsSync(`${ST_DIR}/dest_ardennes_daytrip.webp`)
    ? dataUrl(`${ST_DIR}/dest_ardennes_daytrip.webp`) : null;   // anchor to the shipped stamp family
  items = SEASONAL_STAMPS.map(s => ({
    png: `${ST_DIR}/${s.id}.png`,
    prompt: `A single passport rubber stamp impression, ${s.shape} border, printed entirely in ` +
      `${s.ink} ink — one single ink color only, slightly distressed and unevenly inked like a ` +
      `real rubber stamp: ${s.motif}. Bold simplified flat shapes, thick lines, playful holiday ` +
      `energy, centered on a plain pure white background, nothing else in the image, no text, ` +
      `no letters, no numbers.`,
    ref: stampRef,
  }));
} else if (mode === 'stickers') {
  mkdirSync(STICKER_DIR, { recursive: true });
  // consistency chain like stamps: first sticker on disk anchors the rest
  const stickerRef = () => {
    for (const s of STICKERS) {
      for (const ext of ['webp', 'png']) {
        const f = `${STICKER_DIR}/${s.id}.${ext}`;
        if (existsSync(f)) return dataUrl(f);
      }
    }
    return null;
  };
  items = STICKERS.map(s => ({ png: `${STICKER_DIR}/${s.id}.png`, prompt: stickerPrompt(s), ref: stickerRef }));
} else if (mode === 'extras') {
  for (const d of ['assets/img/story', 'assets/img/property', 'assets/img/island', 'assets/img/era'])
    mkdirSync(d, { recursive: true });
  items = EXTRAS.map(e => ({ png: e.png, prompt: e.prompt, ref: refPart }));
} else {
  console.error(`unknown mode "${mode}" — use: test | postcards | passport | stamps | polaroids | seasonal | stickers | extras`);
  process.exit(1);
}

const done = await produce(items);
console.log(`\nGenerated/present: ${done.length}/${items.length}`);
if (mode === 'test' || mode === 'postcards')
  console.log(`Now compress (tools/artpost.py) and add the tier numbers to POSTCARD_ART in js/ui.js.`);
else
  console.log(`Now run tools/artpost.py to crop/alpha-key/compress into the shipped WebPs.`);
