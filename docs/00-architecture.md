# 00 — Architecture

**Project:** idleVaction — *From soggy Dutch motel to private-island mogul.*
**Type:** Player-directed **idle game** (not a clicker; a clicker button exists only as an optional between-tick micro-activity).
**Target:** Static site on **GitHub Pages**, **no build step**, **no runtime dependencies**, saves to **`localStorage`**. The only external asset is one CSS framework from CDN (**Spectre.css** — see note).

---

## 1. Design goals that drive the architecture

| Goal | Architectural consequence |
|---|---|
| Runs on GitHub Pages | Pure static files; everything client-side; no server, no cookies, no backend. |
| No dependencies | Vanilla ES modules. No npm at runtime. No bundler required. |
| Only CDN "Spektrum" | Load **Spectre.css** (`spectre.min.css`) via `<link>` for buttons/cards/layout. Zero JS from the CDN. Framework is cosmetic only and swappable — the game logic never depends on it. |
| Player decides direction | Data-driven content (upgrades/paths/story as plain data objects) so the *engine* is generic and *content* is declarative. |
| Solid, tweakable math | All balance numbers live in **one config module** (`config.js`) + per-item data. No magic numbers in engine code. |
| 20h of play, no monetization | Generous offline progress, a global `GAME_SPEED` knob, and a debug panel. No forced timers, no ad-gates. |
| Save safety | Versioned, migratable save schema; autosave; export/import string. |

> **Note on "Spektrum":** The brief says *"only CDN Spektrum."* We read this as a request for a single lightweight CSS framework delivered by CDN with **no JS dependency**. We recommend **Spectre.css** (5KB gz, flexbox grid, buttons, cards — perfect for "simple buttons"). It is trivially swappable for Adobe **Spectrum CSS** or Pico.css by changing one `<link>`; the game does not couple to any framework class beyond a thin CSS layer we own. This is documented so the choice is explicit and reversible.

---

## 2. File / module layout

```
/                         # served as GitHub Pages root
├── index.html            # single entry; loads Spectre CDN + our ES modules
├── css/
│   └── game.css          # our own styles (framework-agnostic); overrides Spectre
├── js/
│   ├── config.js         # ALL balance knobs & tunables (single source of truth)
│   ├── util.js           # number formatting, math helpers, clamp, RNG (seeded)
│   ├── math.js           # cost/production/prestige formulas (pure functions)
│   ├── data/
│   │   ├── generators.js # income "dimensions" (the multi-level tier ladder)
│   │   ├── amenities.js  # small fun upgrades (floatables, cocktails, pool beds…)
│   │   ├── accommodation.js # the shed→island ladder (30 tiers)
│   │   ├── skills.js     # personal-growth attributes (charisma/body/…)
│   │   ├── paths.js      # branching build archetypes (vlogger/crypto/…)
│   │   ├── skilltree.js  # permanent ascension nodes (physique/character)
│   │   ├── bank.js       # bank-account ladder rows (the wallet-cap tiers; caps from config.BANK)
│   │   └── story.js      # branching storyline beats (>=30 levels)
│   ├── state.js          # canonical game state + save/load/migrate + export
│   ├── engine.js         # tick loop, offline calc, purchase logic, unlock checks
│   ├── prestige.js       # ascension: reset, Legacy currency, skill-tree apply
│   ├── ui.js             # render "simple buttons"; subscribes to engine events
│   └── main.js           # bootstrap: load save → start loop → wire UI
└── docs/                 # this plan
```

**Dependency direction (no cycles):**
`config → util → math → data/* → state → engine/prestige → ui → main`
Lower layers never import higher ones. `data/*` are declarative (numbers + strings + tiny pure functions). Engine reads data + state, mutates state, emits events. UI only reads state and calls engine intents.

---

## 3. Core runtime model

### 3.1 The game loop (fixed-step accumulator)
Idle games must be **framerate-independent and pausable/accelerable**. We use a fixed logical tick with a real-time accumulator:

```js
const TICK = 1000 / config.TICKS_PER_SEC;   // logical ms per tick (e.g. 100ms → 10 tps)
let acc = 0, last = performance.now();

function frame(now) {
  let real = now - last; last = now;
  real = Math.min(real, config.MAX_FRAME_MS);        // clamp tab-stall spikes
  acc += real * state.settings.gameSpeed;            // GAME_SPEED pacing knob
  while (acc >= TICK) { engine.tick(TICK / 1000); acc -= TICK; }
  ui.render();                                        // render decoupled from sim
  requestAnimationFrame(frame);
}
```

- `engine.tick(dt)` advances the economy by `dt` seconds. Purely deterministic given state.
- `gameSpeed` (default `1.0`) multiplies simulated time → the single lever for pacing & testing (`0.25` slow, `10`, `100`, `1000` for QA).
- Rendering is throttled separately (e.g. 15–30 fps) so simulation stays cheap.

### 3.2 State shape (canonical, serializable)
```js
state = {
  version: 7,                         // save schema version (see §5)
  meta: { createdAt, lastSaved, lastSeen, playtimeMs },
  resources: { cash: 0, comfort: 0, clout: 0, legacy: 0 },
  generators: { d1: {count, bought, unlocked}, ... d8: {...} },
  amenities:  { pool_floatie_duck: {level}, cocktail_svc: {level}, ... },
  accommodation: { tier: 0, ownedTiers: [0] },
  skills: { charisma: {xp, level}, body: {...}, comms: {...}, taste: {...}, savvy: {...} },
  paths: { vlogger: {points}, crypto: {points}, connoisseur: {points}, traveler: {points} },
  ascension: { count: 0, legacySpent: 0, tree: { node_id: rank, ... } },
  story: { beat: 0, flags: {...}, branch: 'neutral' },
  settings: { gameSpeed: 1, offlineEnabled: true, notation: 'scientific' },
  stats: { lifetimeCash: 0, bestComfort: 0, totalClicks: 0 }
}
```
Everything is plain JSON — trivially `JSON.stringify`-able for save/export.

### 3.3 Events (tiny pub/sub, no framework)
`engine.emit('purchase', payload)`, `state:changed`, `story:beat`, `unlock`. UI subscribes and re-renders affected sections. This keeps UI dumb and swappable (buttons today, anything later).

---

## 4. Numbers: BigNumber policy
Idle economies overflow `double` (≈1.8e308) in long runs. Strategy:
- **Phase 1 (ship first):** use native `number`. With our tuned curve the intended 20h run peaks around **~1e60**, comfortably inside `double`. Custom notation (scientific / engineering / letter suffixes) via `util.format`.
- **Phase 2 (endgame / heavy prestige):** if any layer approaches `~1e300`, swap `math.js` numeric primitives for a tiny **mantissa+exponent** struct (`{m, e}`) implemented in-repo (still no external dep). `math.js` is written as pure functions over an abstract `N` so this swap is localized. (See `docs/01-math-foundation.md §8`.)

## 5. Save system
- **Autosave** every `config.AUTOSAVE_SEC` (default 15s) and on `visibilitychange`/`beforeunload`.
- **Key:** `localStorage['idlevaction.save.v1']` (single slot) + `...backup` rotating.
- **Serialize:** `JSON.stringify(state)` → optional LZ-ish RLE (in-repo, optional) → base64 for the export string.
- **Migration:** `state.js` holds `MIGRATIONS = { 2:(s)=>..., 3:(s)=>... }`, applied in order when `save.version < CURRENT`. Never break old saves.
- **Export/Import:** textarea with base64 blob; guards against malformed input (try/catch → keep current save).
- **Reset:** hard reset (wipe) and soft reset (= ascension) are different code paths.

## 6. Offline / away progress
On load compute `elapsed = now - meta.lastSeen`. Simulate in **coarse macro-steps** (e.g. `min(elapsed, cap)` split into ≤ `config.OFFLINE_STEPS` chunks) through the *same* `engine.tick` so offline == online math exactly. No monetization ⇒ offline is **generous** (default cap 12h, configurable, can be disabled). Show an "While you were away…" summary. Details & closed-form fast-path in `docs/01-math-foundation.md §7`.

**The away-lump is bounded by the wallet, not the clock:** all cash inflow banks through `engine.gainCash`, clamped to the bank-account wallet cap (`config.BANK`, `state.bank.tier`, named rows in `js/data/bank.js`) — so a returning player's purchasing power is ≈ one wallet regardless of time away, and the same clamp covers a tab left open overnight. Rationale + measurements: `docs/math-proof.md §11`.

## 7. Testing hooks (built in, shipped, hidden behind a toggle)
- Debug panel: set `gameSpeed`, grant resources, jump story beat, force-unlock, trigger ascension, dump/replace state.
- `window.IV = { state, engine, config, prestige }` exposed for console QA.
- Deterministic RNG (`util.rng` seeded) so tests are reproducible.
- A headless balance harness (`docs/05-balancing-and-pacing.md`) simulates N hours at `gameSpeed=∞` and prints the time-to-milestone curve — used to keep the 20h target on rails.

## 8. Accessibility & UX floor (buttons-only is fine)
Semantic `<button>`s, keyboard focus, `aria-live` for the "you earned" ticker, `prefers-reduced-motion` respected. No UI/UX polish is in scope now (per brief) — but the DOM contract is clean so polish later needs no engine change.

## 9. Deployment
- GitHub Pages from `main` (or `/docs`), root = repo. No CI needed.
- Everything is relative-path so it works at `user.github.io/idleVaction/`.
- `index.html` uses `<script type="module">` — served over HTTPS by Pages, so ES modules load fine.
