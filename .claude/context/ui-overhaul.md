# UI Overhaul — status ledger & roadmap

> Working context for the Holiday UX overhaul. The design bible is `docs/UX-plan.md` (§ refs below
> point there). This file tracks what is DONE vs REMAINING, plus the generated-imagery plan.
> Hard gate for every step: `npm test` ALL PASS (~2600 checks), `npm run harness` island at
> **exactly 8h 15m 5s (29705s)** — the UI never touches the economy.

## TL;DR

| Phase | Status |
|---|---|
| Pre-plan: tabs + progressive disclosure | ✅ done |
| UX-plan.md (design bible) | ✅ done |
| U1 — holiday theme + Travel Diary | ✅ done |
| U2 — component kit | ✅ ~90% (icon sprite deferred) |
| U3 — reveal choreography | ✅ ~80% (engine-fired arrival modals remain) |
| U4 — journey polish | 🟡 started (era skies only) |
| U5 — QA sweep | 🟡 script exists in scratchpad, not committed |
| Art pipeline (generated images) | 🟡 **test image done & wired** (tier 0, in-game); Wave 1 remaining 21 postcards not yet run |

## Done (with merge commits)

- **Tabbed navigation + progressive disclosure** (`a7cc436`): 5 tabs (Home/Income/Travel/Growth/
  Legacy) built from `TABS` in `ui.js`; a tab only appears once ≥1 of its cards is unlocked;
  pulsing "new" dot until visited. Spoiler fixes: amenity-unlock toasts use the FULL
  `amenityUnlocked` gate; accommodation ladder shows next rung + `??? needs Comfort ≥ X` mystery
  rungs ("…the road keeps climbing"); `cryptogear` amenities gated on `cryptoActive`.
- **UX-plan.md** (`ffe02ec`): palette, type, icon policy, Reveal Doctrine R1–R8, component kit,
  T1–T4 presentation tiers + 10-modal inventory, the 12-stage journey matrix, roadmap U1–U5.
- **U1 theme + Travel Diary** (`0b2d870`): light "Poolside at Golden Hour" palette in `game.css`
  (sand/white, Sunshine fills never-text, Hot Pink CTAs, text-safe darks), Fredoka+Nunito via one
  Google-Fonts link, pill meters/buttons, focus rings. Diary: `story.seenAt` stamped in
  `engine.checkStory` (display-only), Story card shows "Entry N" (total count hidden per R1) +
  📔 button, diary modal with dated branch-flavored pages ending "…the next page is still blank ✍️".
- **U2 kit + U3 choreography (+U4 skies)** (`a4afcf8`):
  - Postcards: `TIER_SCENES` (22 emoji scenes) + `tierPostcardHtml` atop the Home ladder.
  - Passport stamps (owned inked/rotated, unowned dotted); luggage stickers for trophies with
    locked = **"???" only** (old locked names leaked future systems); boarding-pass skin on
    transport (CSS); ☀️ sun-dot riding the comfort meter; concierge budget **slider**
    (beach-ball thumb, freeze-while-dragging guard + input/change listeners).
  - HUD diet (R7): Clout/Legacy/🌍×/Combo chips appear only once earned; tier name lives on the
    postcard. Debug drawer (R8): footer = Tap · energy · Save · ⚙️; speed/export/import/debug/
    reset behind the gear. Toast batching: max 3/flush, celebrations jump the queue, overflow →
    "…and N more little things ✨". One-goal shelves: amenity tags collapse to 3 + "+N more ▾"
    (`expandedAmenTags`).
  - Era modals (`showEra`/`closeEra`, `#eraModal`): ALL browser `confirm()`/`prompt()` replaced —
    island offer → SOLD celebration, **retirement ceremony** (retiree+epitaph+heir-name input →
    `P.ascend(S, {name})`), Legend, NG+ boarding pass, respec, name-the-tourist.
  - Engine spoiler gate: content-format toasts ("Selfie Post") wait for `creatorDashboardUnlocked`.
  - U4 partial: `body[data-era]` topbar sky warms drizzle→bright→warm→golden (`eraFor(tier)`).
- **Art pipeline** (`b32c63f`): `tools/genart.mjs` (zero-dep dev tool; style bible + all 22
  postcard prompts; `test` = tier-0 only; `postcards` = all; skip-if-exists; key from
  `OPENROUTER_API_KEY` env ONLY). UI hook: `POSTCARD_ART` manifest in `ui.js` + `<img>` with
  hard emoji fallback (`onerror` swap); `.iv-postcard-img` CSS.

## Remaining

### U2 leftovers
- [ ] Icon sprite: hand-authored original SVG sprite for chrome (gear/lock/close/diary) — was
  deferred (network blocked fetching Phosphor); emoji currently serve. Optional.
- [ ] Staff/butler budget dials → sliders (concierge pattern exists to copy).

### U3 leftovers — engine-FIRED arrival modals (T1 inventory, UX-plan §4)
The era-modal system exists but only wraps player-initiated actions. Still toasts today:
- [ ] The Crossroads (beat 6) — 4-polaroid branch-choice modal (currently inline card).
- [ ] First pool (tier 6), Sail-Shaped Hotel (tier 12), Seven Stars + patron (beat 21),
  The Invitation (beat 22), first resort building (beat 29).
  Mechanism suggestion: a UI-side watcher diffing one-shot story flags per render, firing
  `showEra` once per flag (never engine changes).
- [ ] One-goal rule for the remaining shelves (pool/beach/wellness groups; destinations "one
  next stamp" if desired — currently all unlocked show).

### U4 — journey polish
- [ ] §5 stage-matrix audit pass: walk all 12 stages, verify each unlock's tier & metaphor.
- [ ] Postcard-flip animation on tier-up (reduced-motion: crossfade).
- [ ] Patron silhouette moments; premium-destination "gold passport page"; polaroid framing on
  the Story card; "While you were away…" postcard reskin.

### U5 — QA
- [ ] Commit the Playwright sweep (now only in scratchpad `pw/shot3.mjs`) as `tools/uxcheck.mjs`:
  screenshots per stage + the automated spoiler check (fresh-start visible text vs
  Monaco/Legend/Ascension/Butler/Marina/… list) + locked-stickers-are-??? + devtools-hidden.
- [ ] A11y + reduced-motion audit pass.

## The images idea (generated art via OpenRouter)

**State: TEST IMAGE DONE (2026-07-23) — style approved-quality, wired in-game for tier 0.**
Wave 1 = the remaining 21 tier postcards, one `node tools/genart.mjs postcards` run away.

- **Test verdict (tier 0, The Soggy Shed):** on-bible — palette-locked (yellow poncho, pink
  shoes, sky-blue umbrella/rain on warm sand), thick soft outlines, no text, tourist from
  behind, the one hopeful sun ray present. One deviation: the model returns **square 1024²**
  despite the "landscape composition" prompt wording; square looks fine in the card, so accept
  square as the format (or tune wording later — don't block Wave 1 on it).
- **Format decision:** commit **760px WebP q82** (display is max-width 380px, so 760 covers
  2×). Sizes measured: raw PNG 965 KB → 760px WebP **26 KB**. Full 22-tier wave ≈ 600 KB,
  comfortably inside the ~2 MB Wave-1 budget. Raw PNGs are now **gitignored**
  (`assets/img/postcards/*.png`); genart's skip-if-exists also counts the `.webp` as done, and
  the Pillow compress one-liner lives in the genart header comment (`pip install pillow`).
- Run: `node tools/genart.mjs test` (tier-0 postcard) or `... postcards` (all 22) — the key
  now comes from the environment (see below). Then compress to WebP and add the tier numbers
  to `POSTCARD_ART` in `js/ui.js` (tier 0 already listed; hook src is `.webp` now).
- Model: `google/gemini-2.5-flash-image` (override with `GENART_MODEL`).
- Style bible lives in the script — flat holiday illustration, palette-locked (#FFC800/#FF2E88/
  #45C4FF/#7ED957 on sand), thick soft outlines, **no text in images**, tourist seen from behind.
- **Waves** (extend the script's tables the same way):
  1. 22 tier postcards + 4 Crossroads branch polaroids + logo/favicon/og-image + the goat (~30).
  2. 30 story-beat polaroids (diary pages) + ~30 passport stamps (5 premium gold, 5 seasonal) +
     the patron silhouette.
  3. 16 trophy stickers + 5 Legend-perk gold stickers + 4 property deeds + 6 island buildings +
     remaining era-modal heroes.
  4. Nice-to-have: vehicles (~18), grounds clusters (3), era sky strips (4).
  - NOT generating: tiny chrome icons (mushy at 16–24px) and 300+ amenity thumbnails.
- Weight budget: WebP/compressed, ~2 MB Wave 1, ~6 MB total. Keep repo light.
- **Network status (RESOLVED 2026-07-23):** in the current environment the sandbox reaches
  `openrouter.ai` and plain `node tools/genart.mjs test` works first try — no curl workaround
  needed. (Historical gotchas, kept in case the environment changes: policy applies only to
  sessions started AFTER a network-access change; `node fetch` ignored `HTTPS_PROXY` in the old
  sandbox while curl honored it; a trigger-spawned unattended session produced nothing — prefer
  an attended session.)
- **Key hygiene:** `OPENROUTER_API_KEY` is now set as an environment variable in the
  environment settings (confirmed working 2026-07-23) — never in any file or commit. The old
  key shared in the 2026-07-22 chat transcript / trigger prompt **should still be revoked on
  OpenRouter** if it wasn't already.

## Suggested order of attack
1. ~~Generate Wave-1 test image → judge style~~ ✅ → run full Wave 1 (`node tools/genart.mjs
   postcards`) → compress to WebP → wire the remaining tiers into `POSTCARD_ART`.
2. U3 engine-fired arrival modals (Crossroads first — biggest narrative moment).
3. U5 committed `tools/uxcheck.mjs` (locks the no-spoiler guarantee into a runnable check).
4. U4 polish pass, then Waves 2–3 art.
