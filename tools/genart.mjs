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

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';

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

async function generate(prompt, outfile) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: `${STYLE}A vintage travel postcard scene, landscape composition: ${prompt}.` }],
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

const mode = process.argv[2] || 'test';
mkdirSync(OUT, { recursive: true });
const targets = mode === 'test' ? [0] : POSTCARDS.map((_, i) => i);

const done = [];
for (const i of targets) {
  const file = `${OUT}/tier-${String(i).padStart(2, '0')}.png`;
  const webp = file.slice(0, -4) + '.webp';
  if (existsSync(file) || existsSync(webp)) { console.log(`skip (exists): ${existsSync(webp) ? webp : file}`); done.push(i); continue; }
  process.stdout.write(`tier ${i} … `);
  try {
    const bytes = await generate(POSTCARDS[i], file);
    console.log(`ok (${(bytes / 1024).toFixed(0)} KB) → ${file}`);
    done.push(i);
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 1200));   // gentle pacing between calls
}
console.log(`\nGenerated/present: [${done.join(', ')}]`);
console.log(`Now add these tier numbers to POSTCARD_ART in js/ui.js so the game shows them.`);
