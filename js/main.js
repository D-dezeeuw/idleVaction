// main.js — bootstrap: load save → offline catch-up → start loop → wire UI.
import { CONFIG as C } from './config.js';
import * as ST from './state.js';
import * as E from './engine.js';
import * as UI from './ui.js';
import { fmt, fmtTime } from './util.js';

let state = ST.load() || ST.newGame();

// re-apply Faster Metabolism (config knob is not persisted)
C.MILESTONE_STEP = 10 - (state.ascension.tree.faster_metab || 0);

// offline catch-up
if (state.meta.lastSeen) {
  const elapsed = Date.now() - state.meta.lastSeen;
  const rep = E.applyOffline(state, elapsed);
  if (rep && rep.seconds > 30) {
    setTimeout(() => alert(
      `While you were away (${fmtTime(rep.seconds)}${rep.capped ? ', capped' : ''}):\n` +
      `+${fmt(rep.cash)} 💶  +${fmt(rep.clout)} 📣`), 200);
  }
}

// hooks for UI controls
const hooks = {
  save: () => { ST.save(state); flash('Saved.'); },
  exportSave: () => { const s = ST.exportSave(state); prompt('Copy your save:', s); },
  importSave: () => {
    const str = prompt('Paste a save string:');
    if (!str) return;
    const loaded = ST.importSave(str);
    if (loaded) { state = loaded; UI.setState(state); flash('Imported.'); } else alert('Invalid save.');
  },
  hardReset: () => { state = ST.hardReset(); UI.setState(state); flash('Reset.'); },
};

UI.bind(state, hooks);
UI.renderControls(state);
UI.render(state);

function flash(msg) { const n = document.getElementById('notifs'); const d = document.createElement('div'); d.className = 'iv-notif iv-info'; d.textContent = msg; n.prepend(d); setTimeout(() => d.remove(), 3000); }

// ---- fixed-step loop with real-time accumulator (docs/00 §3.1) ----
const TICK = 1000 / C.TICKS_PER_SEC;
let acc = 0, last = performance.now(), lastRender = 0, lastSave = performance.now();

function frame(now) {
  let real = now - last; last = now;
  real = Math.min(real, C.MAX_FRAME_MS);
  acc += real * state.settings.gameSpeed;
  let steps = 0;
  while (acc >= TICK && steps < 10000) { E.tick(state, TICK / 1000); acc -= TICK; steps++; }

  if (now - lastRender > 1000 / C.RENDER_FPS) { UI.render(state); lastRender = now; }
  if (now - lastSave > C.AUTOSAVE_SEC * 1000) { ST.save(state); lastSave = now; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// save on unload / tab hide
addEventListener('beforeunload', () => ST.save(state));
addEventListener('visibilitychange', () => { if (document.hidden) ST.save(state); });

// expose for QA console
window.IV = { get state() { return state; }, C, E, UI };
