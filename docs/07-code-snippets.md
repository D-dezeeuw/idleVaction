# 07 — Code Snippets (the complex parts, as implemented)

Concrete JS for every mathematically- or architecturally-tricky piece, mirrored from the
shipped `js/**` (a couple are lightly condensed for readability — the source file is the
authority). Each block names its source file. These are the "show me the hard bits"
examples; the *why* is in `docs/01` (math), `docs/00` (architecture), `docs/math-proof.md`
(scale) and `docs/04` (prestige).

---

## 1. The game loop — fixed-step accumulator + the pace modifier  · `js/main.js`

Framerate-independent, pausable, and hyper-speedable. `gameSpeed` multiplies simulated time;
`MAX_STEPS_PER_FRAME` caps how much a single frame can advance so a huge speed can't hang the tab.

```js
const TICK = 1000 / C.TICKS_PER_SEC;          // logical ms per tick (100ms → 10 tps)
let acc = 0, last = performance.now();

function frame(now) {
  let real = now - last; last = now;
  real = Math.min(real, C.MAX_FRAME_MS);       // clamp tab-stall spikes
  acc += real * state.settings.gameSpeed;      // ← the pace knob (1 = natural course)
  let steps = 0;
  while (acc >= TICK && steps < C.MAX_STEPS_PER_FRAME) {
    engine.tick(state, TICK / 1000); acc -= TICK; steps++;
  }
  if (steps >= C.MAX_STEPS_PER_FRAME) acc = 0;  // hyperspeed: drop backlog, don't spiral
  ui.render(state);                             // render throttled separately
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

**Pace control, two ways:**
- **In-game (`GAME_SPEED`):** presets `0.25 … 10000×` plus a **custom numeric input** (up to
  `GAME_SPEED_MAX = 1e6`) in the footer. `1×` runs the natural ~20h course; high values blitz
  the whole arc in seconds for testing. `set-speed` / `set-speed-custom` in `js/ui.js`.
- **Headless (`dt`):** the harness/self-test call `engine.tick(state, dt)` directly with a big
  `dt`, e.g. `node js/dev/harness.mjs` simulates the full ~18h curve in ~1s. Same math, no UI.

---

## 2. Cost curves & the soft-capped milestone  · `js/math.js`, `js/util.js`

```js
// geometric unit cost: base · growth^n   (THE idle-game cost curve)
export function unitCost(k, bought) { return C.GEN.base[k] * Math.pow(C.GEN.growth[k], bought); }

// buying q units from `bought` — closed-form geometric sum (no loop)  · util.js
export function bulkCost(base, growth, bought, qty) {
  if (qty <= 0) return 0;
  if (growth === 1) return base * qty;
  return base * Math.pow(growth, bought) * (Math.pow(growth, qty) - 1) / (growth - 1);
}

// max affordable qty for a budget — invert the geometric sum  · util.js
export function maxAffordable(base, growth, bought, budget) {
  if (budget < base * Math.pow(growth, bought)) return 0;
  const g = growth, left = budget * (g - 1) / (base * Math.pow(g, bought)) + 1;
  return Math.max(0, Math.floor(Math.log(left) / Math.log(g)));
}

// SOFT-CAPPED milestone: exponential for KNEE doublings, then LINEAR.
// Prevents the cash^α feedback that caused the finite-time singularity (docs/math-proof.md).
export function milestoneMult(bought) {
  const m = Math.floor(bought / C.MILESTONE_STEP);
  const knee = C.MILESTONE_SOFT_KNEE;
  if (m <= knee) return Math.pow(C.MILESTONE_MULT, m);
  return Math.pow(C.MILESTONE_MULT, knee) * (1 + C.MILESTONE_SOFT_LIN * (m - knee));
}
```

---

## 3. The multiplier stack — additive within a layer, multiplicative across  · `js/math.js`

The heart of "multi-layered upgrades." Each `L_*` is `1 + Σ(bonuses)`; the layers multiply.

```js
export function tierMultiplier(state, k) {
  const g = state.generators[k];
  const mMilestone  = milestoneMult(g.bought);                 // the 10-buy doublings (soft-capped)
  const L_upgrade   = 1 + 0.5 * (g.upgrades || 0);             // per-tier bought upgrades (LINEAR in-layer)
  const social      = (k === 1 || k === 2);
  const L_path      = 1 + (social ? C.PATH.rate * Math.pow(state.paths.vlogger.points, C.PATH.softcapExp) : 0)
                        + C.PATH.rate * Math.pow(state.paths.traveler.points, C.PATH.softcapExp) * 0.5;
  const L_skill     = 1 + (social ? C.CHARISMA_RATE * state.skills.charisma.level : 0);
  const L_comfort   = comfortMultiplier(state);               // log soft-cap
  const L_ascension = 1 + 0.10 * (state.ascension.tree.compounding_interest || 0);
  const L_tree      = treeIncomeMult(state);                  // permanent skill-tree
  return mMilestone * L_upgrade * L_path * L_skill * L_comfort * L_ascension * L_tree;
}

// production per second of tier k (units of tier k output)
export function tierProd(state, k) {
  return state.generators[k].count * C.GEN.perUnit[k] * tierMultiplier(state, k);
}
```

Applied each tick so higher tiers feed lower (snapshot to avoid intra-tick feedback)  · `js/engine.js`:

```js
const prod = [];
for (let k = 0; k < DATA.generators.length; k++) prod[k] = M.tierProd(state, k) * rt;
let cashGain = prod[0] * dt;                                  // D1 → cash
for (let k = 1; k < DATA.generators.length; k++)
  state.generators[k - 1].count += prod[k] * dt;             // D_k → D_{k-1}
```

---

## 4. Comfort — unbounded sum, log-softcapped effect  · `js/math.js`

```js
export function accScore(tier) { return C.ACC.base * Math.pow(C.ACC.growth, tier); }

// Comfort is an UNBOUNDED weighted sum (so it can gate billion-scale story beats);
// its EFFECT on income is softcapped by the log below.
export function computeComfort(state, DATA) {
  const ascBonus = 1 + 0.25 * state.ascension.count;
  return (C.COMFORT.wAcc * accScore(state.accommodation.tier)
        + C.COMFORT.wAmen * amenityScoreTotal(state, DATA)
        + C.COMFORT.wBody * state.skills.body.level) * ascBonus;
}
export function comfortMultiplier(state) {
  return 1 + C.COMFORT.MULT * Math.log10(1 + (state._comfortCache ?? 0) / C.COMFORT.C0);
}
// a tier unlocks when Comfort ≥ accScore(tier)·unlockFrac  (unlockFrac<1/growth ⇒ never stalls)
export function accUnlockComfort(tier) { return accScore(tier) * C.ACC.unlockFrac; }
```

---

## 5. Personal-growth skills  · `js/math.js`

```js
export function xpToNext(level) { return C.SKILL.base * Math.pow(C.SKILL.growth, level); } // geometric
export function levelFromXp(xp) {
  let lvl = 0, need = C.SKILL.base, spent = 0;
  while (spent + need <= xp) { spent += need; lvl++; need = xpToNext(lvl); }
  return lvl;
}
// Communication discount (clamped so cost never hits 0) × permanent Silver-Tongue node
export function commsCostMult(state) {
  return clamp(1 - C.COMMS_DISCOUNT * state.skills.comms.level, 1 - C.COMMS_DISCOUNT_CAP, 1)
       * treeCostMult(state);
}
// Savvy passive income — sqrt-scaled so it supports but never replaces active play
export function savvyPassive(state) {
  return state.skills.savvy.level * C.SAVVY_YIELD * Math.sqrt(Math.max(0, state.stats.lifetimeCash));
}
```

---

## 6. Prestige — √ payout, banked telescoping, and the reset  · `js/math.js`, `js/prestige.js`

```js
// Legacy earned on ascension (banked so re-ascends pay only the increment)  · math.js
export function legacyGain(state) {
  const raw = C.LEGACY_K * Math.pow(state.stats.lifetimeCashThisTree / C.LEGACY_SCALE, C.LEGACY_EXP);
  return Math.max(0, Math.floor(raw) - state.ascension.legacyBanked);
}

// Ascend: keep meta (legacy, tree, story, stats), wipe the run  · prestige.js
export function ascend(state) {
  if (!canAscend(state)) return false;
  const gained = legacyPreview(state);
  state.resources.legacy += gained;
  state.ascension.count++;
  state.ascension.legacyBanked += M.legacyGain(state);        // bank raw so next ascend telescopes
  const keep = { legacy: state.resources.legacy, ascension: state.ascension,
                 story: state.story, settings: state.settings, stats: state.stats };
  const fresh = newGame();
  Object.assign(fresh, { resources: { ...fresh.resources, legacy: keep.legacy },
    ascension: keep.ascension, story: keep.story, settings: keep.settings, stats: keep.stats });
  fresh.stats.runSec = 0;
  C.MILESTONE_STEP = 10 - (state.ascension.tree.faster_metab || 0);   // meta node re-applied
  Object.assign(state, fresh);                                 // mutate in place (ref stays valid)
  return true;
}

// permanent tree node cost — geometric in rank  · prestige.js
export function treeCost(state, id) {
  return Math.floor(C.TREE.nodeBase * Math.pow(C.TREE.nodeGrowth, treeRank(state, id)));
}
```

---

## 7. Offline / away progress — same tick, coarse macro-steps  · `js/engine.js`

```js
export function applyOffline(state, elapsedMs) {
  if (!state.settings.offlineEnabled || elapsedMs <= 0) return null;
  const capH = C.OFFLINE_CAP_H + 2 * (state.ascension.tree.iron_const || 0);   // node extends cap
  const cappedMs = Math.min(elapsedMs, capH * 3600 * 1000);
  const before = { cash: state.resources.cash, clout: state.resources.clout };
  const total = cappedMs / 1000, step = total / C.OFFLINE_STEPS;
  for (let i = 0; i < C.OFFLINE_STEPS; i++) tick(state, step);   // identical math online==offline
  return { seconds: total, cash: state.resources.cash - before.cash,
           clout: state.resources.clout - before.clout, capped: elapsedMs > cappedMs };
}
```

---

## 8. Save system — versioned migration + forward-compat backfill  · `js/state.js`

```js
const MIGRATIONS = { /* 2: s => { s.newField = default; return s; }, ... */ };

export function migrate(s) {
  while ((s.version || 1) < C.SAVE_VERSION) {
    const next = (s.version || 1) + 1;
    if (MIGRATIONS[next]) s = MIGRATIONS[next](s);
    s.version = next;
  }
  return backfill(s, newGame());       // fill any keys a newer build added — never break old saves
}

export function exportSave(state) { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
export function importSave(str) {
  try { return migrate(JSON.parse(decodeURIComponent(escape(atob(str.trim()))))); }
  catch (e) { return null; }           // malformed input → keep current save
}
```

---

## 9. BigNumber `{m,e}` (endgame precision) — drop-in for `math.js`

Only needed if any tracked value approaches `~1e290` (post-fit peak is ~1e11, so native `double`
is fine for the main arc — but prestige layers + NG+ can push higher). Full reference impl in
**`docs/05-balancing-and-pacing.md §6`**; swap policy in `docs/01 §8` / `docs/math-proof.md §9`.

---

## 10. Headless balance harness — the tuning tool  · `js/dev/harness.mjs`

```js
export function runCurve({ dt = 5, maxHours = 30 } = {}) {
  const s = ST.newGame();
  const beatTime = {}; let islandAt = null, peakLog = 0;
  for (let t = 0; t <= maxHours * 3600; t += dt) {
    E.tick(s, dt); play(s);                              // greedy optimal player
    for (const b of s.story.seen) if (beatTime[b] === undefined) beatTime[b] = t;
    if (Number.isFinite(s.resources.cash)) peakLog = Math.max(peakLog, Math.log10(s.resources.cash));
    if (islandAt === null && s.accommodation.tier >= 20) islandAt = t;
    if (islandAt !== null && t > islandAt + 60) break;
  }
  return { beatTime, islandAt, peakLog };
}
```

`node js/dev/harness.mjs` → the golden ~18h curve (see `docs/05 §9`). `node js/dev/selftest.mjs`
→ the assertion suite (basics, run, ascension, save round-trip, offline).
