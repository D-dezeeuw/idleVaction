# 09 — Simulation dashboard (reports, progression charts, golden-curve deviations)

The visual instrument over the simulation stack (`js/dev/harness.mjs` → `scenarios.mjs` →
`demo.mjs`). The selftest pins are the **enforcement** of the fitted economy; the dashboard
is the **explanation** — where a human reviews what a change actually did to pacing before
(and after) any golden re-pin.

## Pipeline

```
npm run report                      # default suite → tools/dashboard/data/report.json
npm run report -- --seeds 1,2,3     # multi-seed sweep (market + Trip Events rng streams)
npm run report -- greedy-crypto --hours 24 --out /tmp/r.json
npm run serve                       # then open http://localhost:8080/tools/dashboard/
```

- **`js/dev/report.mjs`** runs a suite of scenarios (default: `greedy-vlogger` — the golden
  baseline — `casual-tourist`, the three branch bots, `ascension-loop`) through
  `demo.runScenario` and writes ONE JSON: `{ meta, golden, runs }`. Each run carries its
  time series, event stream, and first-arrival times per story beat / accommodation tier
  (the deviation views' raw material). Floats are rounded to 4 significant digits.
- **`demo.mjs` snapshots** carry the dashboard's extra columns (skill levels `sk_*`, path
  points `pp_*`, `bankTier`, `energy`, `goatsGreeted`) — flat scalars only, dynamically
  keyed off the data rosters — plus a `--seed` flag that overrides the seeded-RNG streams
  (`MARKET.seed`, `EVENTS.seed`) for sweep runs and restores them afterwards. With no
  `--seed`, the baseline stays bit-identical to `npm run harness` (selftest [106]).
- **`tools/dashboard/index.html`** is a single dependency-free file (repo rule: no CDN, no
  npm). It fetches `data/report.json` when served, accepts drag-drop of any report or
  `npm run demo -- --json` dump, and renders light + dark.

## The GOLDEN block (single source for the dashboard)

`report.mjs` exports `GOLDEN`: the selftest pins restated as data — greedy island
**39440s** (±120s display tolerance), casual-tourist **76800s** (±1200s), the docs/05 §9
greedy guard band (6–12h), the casual contract band (18–23h), and the `peakLog10 < 290`
policy ceiling. **When a coordinated re-pin lands (docs/08 W5), update the selftest pins
and `GOLDEN` in the same commit**, then regenerate the committed sample report.

## Views

| View | Question it answers |
|---|---|
| Run tiles + band chips | Did each run land inside its band? (✓/! chips — icon + label, never color alone) |
| Money growth (log₁₀ lifetime cash) | The shape of the whole economy per run |
| Income rate / Comfort small multiples | Where growth accelerates or stalls |
| Accommodation ladder vs golden line + casual band | Pacing against the fitted contract |
| Deviation vs golden baseline | Per-tier Δt against `greedy-vlogger` — ahead (left/blue) vs behind (right/red) |
| Trip timeline | Beats, tier-ups, branch commit, ascensions, Legend, island — every arrival as a marker |
| Physique & growth per run | All five skill levels over time |
| Paths taken per run | The four lanes; the beat-6 commitment reads as one lane pulling away |
| Run comparison table | The `demo.mjs` comparison columns + band verdicts, as the accessible table twin |

## Conventions

- Chart system follows the dataviz method: validated CVD-safe palette (checked light and
  dark), one axis per chart (never dual-axis), thin marks, crosshair + tooltip with
  keyboard parity (arrow keys), legends for ≥2 series, a table view under every chart.
- Run colors are assigned by report position, never by current filter selection —
  toggling runs never repaints the survivors. Shared charts cap at 8 runs (palette slots).
- The committed `tools/dashboard/data/report.json` is a working sample: regenerate it
  whenever the economy or the suite changes (it re-confirmed the goldens byte-exact —
  39440s / 76800s — when first generated); it is data, not a pin. The pins live in selftest.

## Role in the Living-World pass (docs/08)

W5 (the coordinated balance flip) is reviewed on this dashboard: quiet-vs-living runs
across seeds, deviation views against the pre-flip baseline, then the single re-pin.
After W5, the default suite should carry at least one events-ON sweep (`--seeds`) so the
committed sample shows the living layer, not just the quiet foundation.
