// data/events.js — Trip Events (the serendipity deck) + Vacation Weather (Living-World W1,
// docs/08-living-world.md points 1/3). Pure declarative data; engine.js/math.js stay generic
// (the config→util→math→data chain — this file never imports config/engine, same convention as
// data/destinations.js/data/crypto.js). Schema:
//
//   EVENTS: { id, name, desc, weight, kind, ...kind-specific fields } — engine.eventsTick draws
//     one row, weighted (Σweight need not be 1 — the SAME weighted-draw shape data/crypto.js's
//     MARKET_EVENTS uses), via util.rng(state.events.seed, state.events.cursor++). Kinds:
//       'income_window' — a timed GLOBAL income × (mult, durationSec) through the shared
//         effects registry (kind:'income', folded into engine.runtimeMult). mult > 1.
//       'tap_window'    — a timed × on tap cash only (mult, durationSec), read in engine.click.
//         Never touches idle income (the harness never taps — E10's contract). mult > 1.
//       'dest_sale'     — a timed × < 1 on destination cost (mult, durationSec), read in
//         engine.destCost, floor-clamped by the existing destDiscountMult stack.
//       'windfall'      — an instant cash payout, SIZED by config.EVENTS (not by a per-row
//         field — every windfall row shares the one wallet/income-scaled formula, docs/08's
//         "bounded, timed, global flavor events" contract); flavor text is the only per-row
//         variance.
//       'goat'          — spawns state.goat (config.GOAT sizes it) — see engine.goatVisible/
//         tapGoat. Low weight by design (docs/08 point 2: "recurring", not "constant").
//
//   WEATHER_STATES: { id, name, weight, eventBias, tapMult, energyRegenMult } — engine.weatherTick
//     rolls one, weighted, into state.weather.id every config.WEATHER.everyRange game-seconds.
//     eventBias maps an EVENTS row id to a weight MULTIPLIER applied only while that weather is
//     live (engine.pickEventRow) — pure event-mix flavor, never an income effect itself.
//     tapMult/energyRegenMult are flavor scalars read ONLY in engine.click / the energy-regen
//     tick line — 'sunny' (the default, never-rolled-away-from-until-Trip-Events-fires state)
//     carries 1/1, so a fresh game's tap value and energy regen are completely unchanged even
//     though the lookup always runs (income-neutral BY CONSTRUCTION, docs/08 point 3).
export const EVENTS = [
  // W5 fit note: window sizes are deliberately small — the casual arc converts persistent
  // income uplift into arrival-time savings at ~2× (docs/05 §9's W5 entry), so the deck's
  // long-run E[uplift] is held near +2% and the FEEL comes from frequency + variety, not size.
  { id: 'happy_hour', name: '🍹 Happy Hour', weight: 30, kind: 'income_window', mult: 1.5, durationSec: 60,
    desc: 'The poolside bar declares two-for-one. Somehow this also applies to your income.' },
  { id: 'golden_hour', name: '🌅 Golden Hour', weight: 10, kind: 'income_window', mult: 2.5, durationSec: 30,
    desc: 'The light turns perfect, and so, briefly, does the exchange rate.' },
  { id: 'generous_tourist', name: '💶 A Generous Tip', weight: 22, kind: 'windfall',
    desc: 'A fellow tourist mistakes you for the concierge and tips lavishly. You do not correct them.' },
  { id: 'lost_wallet_returned', name: '👛 Finders Keepers', weight: 18, kind: 'windfall',
    desc: 'You return a lost wallet. The reward is, against all odds, worth it.' },
  { id: 'photo_op', name: '📸 Perfect Photo Op', weight: 20, kind: 'tap_window', mult: 2.5, durationSec: 60,
    desc: 'The light, the angle, the odd job itself — everything lines up for one great shot.' },
  { id: 'flash_sale', name: '🏷️ Flash Sale', weight: 16, kind: 'dest_sale', mult: 0.7, durationSec: 120,
    desc: 'A booking-site glitch prices every destination like it is off-season.' },
  { id: 'group_discount', name: '🎟️ Group Discount', weight: 14, kind: 'dest_sale', mult: 0.85, durationSec: 180,
    desc: 'You get folded into a tour group rate you never asked for, but will absolutely take.' },
  { id: 'golden_goat', name: '🐐 The Golden Goat', weight: 4, kind: 'goat',
    desc: 'A goat wanders onto the property, entirely unbothered by the concept of property.' },
];

export const WEATHER_STATES = [
  { id: 'sunny', name: '☀️ Sunny', weight: 40, eventBias: {}, tapMult: 1, energyRegenMult: 1 },
  { id: 'cloudy', name: '⛅ Cloudy', weight: 25, eventBias: {}, tapMult: 1, energyRegenMult: 1 },
  { id: 'showers', name: '🌦️ Showers', weight: 15,
    eventBias: { flash_sale: 1.5, group_discount: 1.5 }, tapMult: 0.9, energyRegenMult: 0.9 },
  { id: 'heatwave', name: '🔥 Heatwave', weight: 12,
    eventBias: { happy_hour: 1.5 }, tapMult: 1.1, energyRegenMult: 0.75 },
  { id: 'golden_hour', name: '🌅 Golden Hour', weight: 8,
    eventBias: { golden_hour: 2.5, photo_op: 1.8 }, tapMult: 1.15, energyRegenMult: 1.1 },
];

// dev schema guard (mirrors validateDestinations/validateCollections): ids unique within each
// table, required keys present, kind-specific fields sane, and every WEATHER_STATES.eventBias
// key actually names an EVENTS row (a typo'd bias would otherwise silently do nothing). Throws
// loudly on malformed data — called from dev/harness.mjs and dev/selftest.mjs.
export function validateEvents() {
  const errors = [];
  const KINDS = ['income_window', 'windfall', 'tap_window', 'dest_sale', 'goat'];
  const seenIds = new Set();
  for (const r of EVENTS) {
    if (seenIds.has(r.id)) errors.push(`duplicate event id: ${r.id}`);
    seenIds.add(r.id);
    for (const k of ['id', 'name', 'desc', 'weight', 'kind']) {
      if (r[k] === undefined) errors.push(`${r.id}: missing required key "${k}"`);
    }
    if (!(r.weight > 0)) errors.push(`${r.id}: weight must be > 0 (got ${r.weight})`);
    if (!KINDS.includes(r.kind)) errors.push(`${r.id}: unknown kind "${r.kind}"`);
    if (r.kind === 'income_window' || r.kind === 'tap_window') {
      if (!(r.mult > 1)) errors.push(`${r.id}: ${r.kind} mult must be > 1 (got ${r.mult})`);
      if (!(r.durationSec > 0)) errors.push(`${r.id}: ${r.kind} durationSec must be > 0`);
    }
    if (r.kind === 'dest_sale') {
      if (!(r.mult > 0 && r.mult < 1)) errors.push(`${r.id}: dest_sale mult must be in (0,1) (got ${r.mult})`);
      if (!(r.durationSec > 0)) errors.push(`${r.id}: dest_sale durationSec must be > 0`);
    }
  }
  const seenWeather = new Set();
  for (const w of WEATHER_STATES) {
    if (seenWeather.has(w.id)) errors.push(`duplicate weather id: ${w.id}`);
    seenWeather.add(w.id);
    for (const k of ['id', 'name', 'weight', 'tapMult', 'energyRegenMult']) {
      if (w[k] === undefined) errors.push(`${w.id}: missing required key "${k}"`);
    }
    if (!(w.weight > 0)) errors.push(`${w.id}: weight must be > 0 (got ${w.weight})`);
    if (!(w.tapMult > 0)) errors.push(`${w.id}: tapMult must be > 0 (got ${w.tapMult})`);
    if (!(w.energyRegenMult > 0)) errors.push(`${w.id}: energyRegenMult must be > 0 (got ${w.energyRegenMult})`);
    for (const key of Object.keys(w.eventBias || {})) {
      if (!seenIds.has(key)) errors.push(`${w.id}: eventBias references unknown event id "${key}"`);
      if (!(w.eventBias[key] > 0)) errors.push(`${w.id}: eventBias["${key}"] must be > 0`);
    }
  }
  if (errors.length) throw new Error('validateEvents() failed:\n' + errors.join('\n'));
  return true;
}
