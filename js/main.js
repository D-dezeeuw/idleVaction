// main.js — bootstrap: load save → offline catch-up → start loop → wire UI.
import { CONFIG as C } from './config.js';
import * as ST from './state.js';
import * as E from './engine.js';
import * as UI from './ui.js';
import { syncMilestoneStep } from './prestige.js';

let state = ST.load() || ST.newGame();

// re-apply Faster Metabolism (config knob is not persisted)
syncMilestoneStep(state);

// Postcards Home's day-streak (Living-World W4, docs/08 point 11): a gentle, no-penalty stamp —
// updated once per load (never in the tick loop, so it can't be gamed by an open tab past
// midnight). Same-day reloads are idempotent; a missed day just silently restarts the count.
ST.updateStreak(state);

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
  // Phase D (audit 6.10): the browser prompt()/confirm() flows are gone — ui.js owns the
  // export/import/reset dialogs and calls these data hooks instead.
  exportSaveString: () => ST.exportSave(state),
  importSaveString: (str) => {
    const loaded = ST.importSave(str);
    if (loaded) { state = loaded; syncMilestoneStep(state); UI.setState(state); flash('Imported.'); }
    else flash('⚠️ That save string didn\'t parse.');
  },
  hardReset: () => { state = ST.hardReset(); syncMilestoneStep(state); UI.setState(state); flash('Reset. Fresh drizzle.'); },
};

// apply persisted display options before the first paint
import('./util.js').then(u => u.setNotation(state.settings.notation));
document.documentElement.dataset.motion = state.settings.motion === 'reduced' ? 'reduced' : '';

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

// save on unload / tab hide — and CATCH UP on return (Phase D / audit 5.5): rAF stops in a
// hidden tab, so "leave the tab open overnight" used to earn ~nothing until a manual reload.
// Now the hidden span replays through the same offline path the boot uses (wallet-capped,
// deterministic), with the away summary for long absences.
let hiddenAt = 0;
addEventListener('beforeunload', () => ST.save(state));
addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); ST.save(state); return; }
  if (hiddenAt && Date.now() - hiddenAt > 5000) {
    try {
      const rep = E.applyOffline(state, Date.now() - hiddenAt);
      if (rep && rep.seconds > 30) UI.showOfflineSummary(state, rep);
    } catch (e) { console.warn('hidden-tab catch-up failed', e); }
    last = performance.now(); acc = 0;   // don't double-count the gap in the rAF accumulator
  }
  hiddenAt = 0;
});

// Multi-tab guard (Phase F / audit 5.3): two open tabs used to autosave over each other every
// 15s, last writer silently winning. When ANOTHER tab writes our save key, this tab yields —
// deliberately, visibly — instead of clobbering.
addEventListener('storage', ev => {
  if (ev.key !== C.SAVE_KEY || dead || document.hasFocus()) return;
  dead = true;
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:99;background:rgba(43,30,22,.55);display:flex;align-items:center;justify-content:center;padding:20px;';
  d.innerHTML = '<div style="background:#fff;border-radius:16px;padding:20px;max-width:420px;text-align:center;"><h3>🧳 The trip moved tabs</h3><p>Another tab is playing this save now. This one stepped aside so nothing gets overwritten.</p><button class="btn btn-primary" onclick="location.reload()">Play here instead</button></div>';
  document.body.append(d);
});

// expose for QA console
window.IV = { get state() { return state; }, C, E, UI };
