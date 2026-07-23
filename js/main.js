// main.js — bootstrap: load save → offline catch-up → start loop → wire UI.
import { CONFIG as C } from './config.js';
import * as ST from './state.js';
import * as E from './engine.js';
import * as UI from './ui.js';
import { syncMilestoneStep } from './prestige.js';

let state = ST.load() || ST.newGame();

// re-apply Faster Metabolism (config knob is not persisted)
syncMilestoneStep(state);

// offline catch-up — guarded: a throw here must degrade to "no offline lump", never a dead page.
if (state.meta.lastSeen) {
  try {
    const elapsed = Date.now() - state.meta.lastSeen;
    const rep = E.applyOffline(state, elapsed);
    if (rep && rep.seconds > 30) {
      setTimeout(() => UI.showOfflineSummary(state, rep), 200);
    }
  } catch (e) { console.warn('offline catch-up failed', e); }
}

// hooks for UI controls — every state SWAP re-derives the milestone knob (the old code left it
// stale after import/hard-reset until a manual reload).
const hooks = {
  save: () => { flash(ST.save(state) ? 'Saved.' : '⚠️ Save failed — storage full?'); },
  exportSave: () => { const s = ST.exportSave(state); prompt('Copy your save:', s); },
  importSave: () => {
    const str = prompt('Paste a save string:');
    if (!str) return;
    const loaded = ST.importSave(str);
    if (loaded) { state = loaded; syncMilestoneStep(state); UI.setState(state); flash('Imported.'); } else alert('Invalid save.');
  },
  hardReset: () => { state = ST.hardReset(); syncMilestoneStep(state); UI.setState(state); flash('Reset.'); },
};

UI.bind(state, hooks);
UI.renderControls(state);
UI.render(state);

function flash(msg) { const n = document.getElementById('notifs'); const d = document.createElement('div'); d.className = 'iv-notif iv-info'; d.textContent = msg; n.prepend(d); setTimeout(() => d.remove(), 3000); }

// ---- fixed-step loop with real-time accumulator (docs/00 §3.1) ----
const TICK = 1000 / C.TICKS_PER_SEC;
let acc = 0, last = performance.now(), lastRender = 0, lastSave = performance.now();

// Error boundary: a throw inside tick/render used to end the rAF chain silently — a frozen page
// with no explanation and whatever progress since the last autosave lost. Now: save what we can,
// stop the loop deliberately, and show a themed banner with export + reload. Never silent.
let dead = false;
function fatal(e) {
  dead = true;
  console.error('idleVaction fatal', e);
  try { ST.save(state); } catch (_) {}
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:99;background:rgba(43,30,22,.55);display:flex;align-items:center;justify-content:center;padding:20px;';
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:16px;padding:20px;max-width:420px;text-align:center;';
  card.innerHTML = '<h3>☔ Rain delay</h3><p>Something broke mid-trip. Your progress was saved. Reload to continue — and if it repeats, export your save first.</p>';
  const ex = document.createElement('button'); ex.className = 'iv-btn'; ex.textContent = 'Export save';
  ex.onclick = () => prompt('Copy your save:', ST.exportSave(state));
  const rl = document.createElement('button'); rl.className = 'iv-btn'; rl.textContent = 'Reload';
  rl.onclick = () => location.reload();
  card.append(ex, rl); d.append(card); document.body.append(d);
}

function frame(now) {
  if (dead) return;
  try {
    let real = now - last; last = now;
    real = Math.min(real, C.MAX_FRAME_MS);
    acc += real * state.settings.gameSpeed;
    let steps = 0;
    while (acc >= TICK && steps < C.MAX_STEPS_PER_FRAME) { E.tick(state, TICK / 1000); acc -= TICK; steps++; }
    if (steps >= C.MAX_STEPS_PER_FRAME) acc = 0;   // hyperspeed: drop backlog, don't spiral

    if (now - lastRender > 1000 / C.RENDER_FPS) { UI.render(state); lastRender = now; }
    if (now - lastSave > C.AUTOSAVE_SEC * 1000) { ST.save(state); lastSave = now; }
  } catch (e) { fatal(e); return; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// save on unload / tab hide
addEventListener('beforeunload', () => ST.save(state));
addEventListener('visibilitychange', () => { if (document.hidden) ST.save(state); });

// expose for QA console
window.IV = { get state() { return state; }, C, E, UI };
