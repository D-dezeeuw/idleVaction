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
| U2 — component kit | ✅ done (staff/butler sliders landed 2026-07-23; icon sprite = hand-author-only, optional) |
| U3 — reveal choreography | ✅ done (engine-fired arrival modals + Crossroads polaroid modal landed 2026-07-23; only the optional one-goal shelves rule remains) |
| U4 — journey polish | ✅ done 2026-07-23 (passport spread, postcard flip, polaroid story/diary, patron silhouette, offline reskin, era skies; §5 stage screenshots via uxcheck) |
| U5 — QA sweep | ✅ done 2026-07-23 (`tools/uxcheck.mjs` committed, `npm run uxcheck`, 52/52 in ~6s; found+fixed the .iv-tap-pop reduced-motion gap) |
| Art pipeline (generated images) | ✅ **Waves 1–3 COMPLETE & WIRED** (~120 assets, ~3.2 MB: 22 postcards, icon set, passport+24 stamps, 30 polaroids, 21 stickers, patron, 3 deeds, 6 buildings, 4 era heroes) |
| Copy voice pass (de-AI) | ✅ done 2026-07-23 (story.js all 30 beats + 23 flavor strings across 7 data files; ORIGIN page-zero added) |

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
- [ ] Icon sprite: hand-authored original SVG sprite for chrome (gear/lock/close/diary) —
  emoji currently serve. Optional. The 2026-07-23 icon size-check CONFIRMS generated art
  can't serve these 16–24px glyphs (mush) — if ever done, it's hand-authored SVG.
- [x] ~~Staff/butler budget dials → sliders~~ DONE 2026-07-23: `staffTileHtml` renders an
  `.iv-slider` per hired auto-buy role (surfaces the previously UI-less `policy.budgetFrac`),
  concierge freeze-guard copied into `renderStaff`, `staff-budget:<id>` input branch in
  `wireEvents`.

### U3 leftovers — engine-FIRED arrival modals (T1 inventory, UX-plan §4)
- [x] ~~Arrival modals~~ DONE 2026-07-23: `checkArrivalModals` watcher in ui.js (called from
  `render`) — baseline-at-load (first render marks already-true conditions as fired; only
  live transitions celebrate), queue drains one modal per close via `modalIsOpen()` gate
  (era/diary/offline). Covers: Crossroads (beat 6) as a 4-polaroid branch-choice modal
  (`.iv-crossroads-grid`, same `E.applyStoryChoice` path, inline card kept as fallback,
  dismissable, never re-pops), first pool (tier 6) + Sail-Shaped (tier 12) using
  `postcardSceneHtml` (postcard art + emoji fallback), Seven Stars (21), The Invitation (22,
  mystery scene per §5 stage 7), first resort building (29). Zero engine changes.
- [ ] One-goal rule for the remaining shelves (pool/beach/wellness groups; destinations "one
  next stamp" if desired — currently all unlocked show).

### U4 — journey polish — ALL DONE 2026-07-23
- [x] Passport spread view (`renderPassport` + `#passportModal`): inside.webp spread, earned
  stamps at deterministic slots, dotted unlocked-unvisited, locked absent, gold premium page,
  paginated. Postcard-flip on tier-up (crossfade under reduced-motion, baseline-at-load).
  Polaroid framing on Story card + diary (POLAROID_ART all 30 beats). Patron silhouette
  (PATRON_ART) in Seven Stars modal + diary. Offline "While you were away" leads with the
  current-tier postcard. Era heroes (ERA_ART: sold/retirement/legend/ngplus), island building
  thumbs (ISLAND_ART), property deed thumbs (DEED_ART) — every image behind a manifest +
  onerror fallback. Diary opens with page zero = ORIGIN (js/data/story.js).
- [ ] (optional, unclaimed) deeper §5 stage-matrix metaphor audit beyond the uxcheck
  screenshots — nothing known broken.

### U5 — QA — DONE 2026-07-23
- [x] `tools/uxcheck.mjs` committed (`npm run uxcheck`): zero-dep CDP driver, 10 real-engine
  stages, 52 assertions — spoiler sweep (20 terms, zero exclusions needed), locked-stickers-
  are-???, debug-drawer-hidden, mystery-rungs, reduced-motion static check, per-stage
  screenshots to tmp, console-error capture. ~6s, deterministic. CDN hosts blocked per-page
  (sandbox proxy doesn't cover them); Chromium ≥130 needs PUT for /json/new.
- [x] Reduced-motion: uxcheck's static check found `.iv-tap-pop` unguarded; fixed. A11y:
  new components shipped with aria-labels/keyboard access; no dedicated audit beyond that.

## The images idea (generated art via OpenRouter)

**State: WAVE-1 POSTCARDS COMPLETE (2026-07-23) — all 22 tiers generated, compressed, committed
(839 KB total).** Generated with the tier-0 style-reference anchor (genart now sends the
approved tier-0 image as a reference on every call — commit 27f3ffb); consistency across the
set is visibly tight (same line weight, palette, flat shading, tourist-from-behind).
Accepted deviations, reviewed on the full contact sheet: tiers 1/6 have clean, correctly
spelled diegetic sign lettering ("MOTEL"/"HOTEL") — the no-text rule guarded against mushy
AI lettering, which didn't materialize; regenerating would risk style drift. Tier 7's beach
runs lighter/whiter than the set (white-sand scene) — fine in context. Remaining: wire
tiers 1–21 into `POSTCARD_ART` (one line, held back only because ui.js is mid-edit for U3).

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
- **Icon size-check (2026-07-23) — favicon DONE, chrome-icon ban confirmed.** Generated a
  palm-island-and-sun app icon (style bible + icon-mode prompt: "one bold centered motif,
  minimal detail, readable when shrunk"). Findings: the model adds its own rounded-square
  frame despite "no border, no frame" — the frame+margin eat ~23% of the canvas and turn
  16px into mush. **Tight-cropping to the inner art** (autocrop on the sky-blue span; was
  px 116–908 of 1024) fixes it: crisp at 64/48, clearly readable at 32, acceptable at 16.
  Shipped: `assets/img/icon-512.webp` (25.6 KB master for future PWA sizes — regeneration is
  non-deterministic, keep this), `icon-180.png` apple-touch (38 KB), `icon-32.png` (2.6 KB) +
  `icon-16.png` (0.8 KB) favicons, wired in `index.html` (game previously had NO favicon).
  Icons ship as PNG (safe favicon format, already tiny); postcards stay WebP. Verdict for
  future icon-ish waves: stamps/stickers/polaroids render ≥48px in-game → viable; tiny chrome
  glyphs stay hand-authored-or-emoji. Wave-1 "logo/favicon/og-image": favicon ✅, logo &
  og-image (landscape banner, different composition) still to do.
- Model: `google/gemini-2.5-flash-image` (override with `GENART_MODEL`).
- Style bible lives in the script — flat holiday illustration, palette-locked (#FFC800/#FF2E88/
  #45C4FF/#7ED957 on sand), thick soft outlines, **no text in images**, tourist seen from behind.
- **Waves** (extend the script's tables the same way):
  1. 22 tier postcards + 4 Crossroads branch polaroids + logo/favicon/og-image + the goat (~30).
  2. 30 story-beat polaroids (diary pages) + ~30 passport stamps (5 premium gold, 5 seasonal) +
     the patron silhouette.
     **Passport slice PULLED FORWARD & DONE (2026-07-23):** `assets/img/passport/` — cover.webp
     (14 KB), inside.webp (13 KB, blank spread for the stamp overlay), + `stamps/` 19 transparent
     ink-only WebPs (15–33 KB each; one per destination id in js/data/destinations.js; premium =
     gold ink; alpha-keyed by tools/artpost.py so paper shows through like real ink). Generated
     via `node tools/genart.mjs passport` / `... stamps` (stamps style-chain off the first stamp).
     Still to do from this line: 5 seasonal stamps, polaroids, patron silhouette. UI wiring for a
     passport-spread view (overlay stamps on inside.webp) is OPEN — current passport UI is the
     CSS-chip version; wire after the U3 ui.js work lands.
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

## Suggested order of attack — ALL COMPLETE 2026-07-23
Everything on the original list landed: Wave 1–3 art generated/reviewed/wired, U3 arrival
modals + Crossroads, U5 uxcheck committed and green (52/52), U4 polish incl. the passport
spread, plus the copy voice pass + ORIGIN. Gates at every step: npm test ALL PASS, harness
island exactly 8h 15m 5s, npm run uxcheck 52/52.

### What's genuinely left (all optional / next-phase)
- Hand-authored SVG chrome-icon sprite (gear/lock/close/diary) — emoji serve fine; generated
  art confirmed unusable at 16–24px.
- One-goal "next stamp" treatment for destinations (chips currently show all unlocked).
- Seasonal-stamp UI moment (assets committed in stamps/, no dedicated UI yet) and a
  Legend-perk sticker spot (renderLegend has no sticker-like slot; skipped deliberately).
- Wave-4 nice-to-haves: vehicles (~18), grounds clusters, era sky strips, og-image/logo.
- Deeper §5 metaphor audit; staff/butler dials for estate-wing roles (assignment-only today).
