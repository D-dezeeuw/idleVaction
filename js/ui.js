// ui.js — "simple buttons" renderer. No framework logic; reads state, calls engine.
import { CONFIG as C } from './config.js';
import { DATA } from './data/index.js';
import * as M from './math.js';
import * as E from './engine.js';
import * as P from './prestige.js';
import { fmt, fmtTime, clamp } from './util.js';

let S = null;                 // live state ref (stable across ascension)
let hooks = {};               // { save, exportSave, importSave, hardReset }
// buy quantity (1 | 10 | 'max') now lives in state.ui.bulkMode (E03-S1-T6) so the
// toggle survives reload instead of being lost as a transient module var.

export function bind(state, h) { S = state; hooks = h; wireEvents(); }
export function setState(state) { S = state; }

const $ = sel => document.querySelector(sel);
const el = id => document.getElementById(id);

// ---------- top-level render ----------
export function render(state) {
  S = state;
  renderHeader(state);
  renderOnboarding(state);
  renderNotifications(state);
  renderStory(state);
  renderAccommodation(state);
  renderDestinations(state);
  renderTransport(state);
  renderGenerators(state);
  renderAmenities(state);
  renderSkills(state);
  renderPaths(state);
  renderAscension(state);
  renderTree(state);
}

function afford(cost) { return S.resources.cash >= cost; }
function btn(action, arg, label, enabled = true, cls = '', title = '') {
  return `<button class="btn btn-sm iv-btn ${cls}" data-action="${action}" data-arg="${arg ?? ''}" ${enabled ? '' : 'disabled'} ${title ? `title="${title}"` : ''}>${label}</button>`;
}

function renderHeader(s) {
  const perSec = M.tierProd(s, 0) + M.savvyPassive(s);
  const lComfort = M.comfortMultiplier(s);
  const lDest = M.destMultiplier(s);
  el('hdr').innerHTML = `
    <span class="iv-res">💶 <b>${fmt(s.resources.cash)}</b> <small>(+${fmt(perSec)}/s)</small></span>
    <span class="iv-res">😌 Comfort <b>${fmt(s.resources.comfort)}</b> <small>(bonus ×${fmt(lComfort)})</small></span>
    <span class="iv-res">📣 Clout <b>${fmt(s.resources.clout)}</b></span>
    <span class="iv-res">🏆 Legacy <b>${fmt(s.resources.legacy)}</b></span>
    <span class="iv-res">🏨 <b>${DATA.accommodation[s.accommodation.tier].name}</b></span>
    <span class="iv-res" aria-label="World Traveler destination bonus, times ${fmt(lDest)}">🌍 <b>×${fmt(lDest)}</b></span>
    <span class="iv-res">🔥 Combo ×${(s._combo ?? 1).toFixed(2)}</span>
  `;
}

// First-run nudge (E01-S10-T4 / first-purchase guidance): a subtle hint that a fresh,
// soggy player should buy the first Odd Job or just tap while they wait. Disappears the
// moment the player acts (buys D1 or taps), never shown again after that.
function renderOnboarding(s) {
  const box = el('onboarding');
  if (!box) return;
  const acted = s.generators[0].bought > 0 || s.stats.totalClicks > 0;
  if (acted) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = `☔ <b>Rain Check:</b> you're soggy, broke, and stuck at a bus stop with
    €${fmt(s.resources.cash)}. Buy your first <b>${DATA.generators[0].name}</b> below to start
    the cash trickle — or just tap the umbrella in the footer while you wait. Money comes either way.`;
}

function renderNotifications(s) {
  const n = E.drainNotifications(s);
  if (!n.length) return;
  const box = el('notifs');
  for (const item of n) {
    const d = document.createElement('div');
    d.className = 'iv-notif iv-' + item.type;
    d.textContent = item.text;
    box.prepend(d);
    setTimeout(() => d.remove(), 6000);
  }
  while (box.children.length > 6) box.lastChild.remove();
}

function renderStory(s) {
  const latest = DATA.story.filter(b => s.story.seen.includes(b.id)).slice(-1)[0] || DATA.story[0];
  let choiceHtml = '';
  const choiceBeat = DATA.story.find(b => b.choice && s.story.seen.includes(b.id) && s.story.branch === 'neutral');
  if (choiceBeat) {
    choiceHtml = '<div class="iv-choices">' +
      choiceBeat.choices.map(c => btn('story-choice', `${choiceBeat.id}|${c.set}`, c.label)).join(' ') +
      '</div>';
  }
  el('story').innerHTML = `
    <div class="iv-beatnum">Beat ${latest.id} / 30 — Branch: <b>${s.story.branch}</b></div>
    <div class="iv-beattitle">${latest.title}</div>
    <div class="iv-beattext">${latest.text}</div>
    ${choiceHtml}`;
}

function renderAccommodation(s) {
  const t = s.accommodation.tier;
  const nextExists = t + 1 < DATA.accommodation.length;
  const cost = E.accCost(s);
  const unlocked = E.accUnlocked(s);
  const nextName = nextExists ? DATA.accommodation[t + 1].name : '— (top tier)';
  let line;
  if (!nextExists) line = '<em>You own the dot on the map. There is nowhere higher.</em>';
  else if (!unlocked) line = `Next: <b>${nextName}</b> — needs Comfort ${fmt(M.accUnlockComfort(t + 1))} (you: ${fmt(s.resources.comfort)})`;
  else line = `Next: <b>${nextName}</b> — ${fmt(cost)} ` + btn('buy-acc', '', 'Upgrade', afford(cost));
  el('accommodation').innerHTML =
    `<div class="iv-flavor">${DATA.accommodation[t].flavor}</div><div>${line}</div>`;
}

// Destinations panel + Getting Around row reveal together once the map exists —
// beat 5 (First Passport Stamp) has fired, or the Budget Guesthouse (tier 3) is already
// reached (E04-S4-T8). Hidden before that to avoid early clutter.
function mapRevealed(s) { return s.story.seen.includes(5) || s.accommodation.tier >= 3; }

function renderDestinations(s) {
  const card = el('destCard');
  const reveal = mapRevealed(s);
  if (card) card.hidden = !reveal;
  if (!reveal) { if (el('destinations')) el('destinations').innerHTML = ''; return; }

  const lDest = M.destMultiplier(s);
  const byRegion = {};
  for (const d of DATA.destinations) (byRegion[d.region] ||= []).push(d);

  let html = `<div class="iv-sub">🌍 Combined bonus: <b>×${fmt(lDest)}</b> on all income</div>`;
  for (const region of Object.keys(byRegion)) {
    const visible = byRegion[region].filter(d => s.destinations[d.id].owned || E.destUnlocked(s, d.id));
    if (!visible.length) continue;
    html += `<div class="iv-tag">${region}</div><div class="iv-amenities">`;
    // owned places first (a little passport of stamps), then what's next to reach
    for (const d of visible.sort((a, b) => s.destinations[b.id].owned - s.destinations[a.id].owned)) {
      const owned = s.destinations[d.id].owned;
      if (owned) {
        const v = s.destinations[d.id].visits;
        html += `<div class="iv-btn iv-dest-owned" title="${d.flavor}">
          ✅ <b>${d.name}</b> <small aria-label="permanent ×${fmt(d.mult)} bonus">×${fmt(d.mult)}</small>
          <br>${btn('visit-dest', d.id, `Visit <small>(+💶${fmt(C.DEST.visitYield)})</small>`)}
          <div class="iv-sub">visited ${v}×</div>
        </div>`;
      } else {
        const cost = E.destCost(s, d.id);
        html += btn('buy-dest', d.id,
          `${d.name} <small aria-label="grants ×${fmt(d.mult)}">×${fmt(d.mult)}</small><br><small>${fmt(cost)}</small>`,
          afford(cost), '', d.flavor);
      }
    }
    html += '</div>';
  }
  el('destinations').innerHTML = html;
}

function renderTransport(s) {
  const card = el('transportCard');
  const reveal = mapRevealed(s);
  if (card) card.hidden = !reveal;
  if (!reveal) { if (el('transport')) el('transport').innerHTML = ''; return; }

  let html = '';
  for (const t of DATA.transport) {
    const owned = s.transport.owned.includes(t.id);
    const active = s.transport.activeSlot === t.id;
    const cost = t.costBase * M.commsCostMult(s);
    const label = `${t.name} ${active ? '🟢' : ''}<br><small>${owned ? 'owned' : fmt(cost)} · +${Math.round(t.speed * 100)}% speed · −${fmt(t.upkeep)}/s</small>`;
    html += btn('buy-transport', t.id, label, owned || afford(cost), active ? 'btn-primary' : '', t.flavor);
  }
  el('transport').innerHTML = html;
}

function renderGenerators(s) {
  const buyQty = s.ui.bulkMode;
  const qtyBtns = [1, 10, 'max'].map(q =>
    `<button class="btn btn-sm ${buyQty === q ? 'btn-primary' : ''}" data-action="set-qty" data-arg="${q}">×${q}</button>`).join(' ');
  // chain readout (E03-S4-T8): make the "higher tiers feed lower ones" compounding
  // legible in one line, without restructuring the rows themselves.
  let rows = `<div class="iv-qty">Buy ${qtyBtns}</div>
    <div class="iv-sub iv-chain-legend">🔗 higher tiers feed lower ones → D1 pays out cash</div>`;
  DATA.generators.forEach((g, k) => {
    if (!s.generators[k].unlocked) return;
    const st = s.generators[k];
    const qty = buyQty === 'max' ? E.genMaxQty(s, k) : buyQty;
    const cost = E.genCost(s, k, buyQty === 'max' ? Math.max(1, qty) : qty);
    const mult = M.tierMultiplier(s, k);
    const toDouble = C.MILESTONE_STEP - (st.bought % C.MILESTONE_STEP);
    const upgCost = E.genUpgradeCost(s, k);
    rows += `<div class="iv-row">
      <div class="iv-row-main" title="${g.flavor}">
        <b>${g.name}</b> <small>×${st.count | 0}</small>
        <div class="iv-sub">out ×${fmt(mult)} · next double in ${toDouble} · bought ${st.bought}</div>
        <div class="iv-flavor iv-gen-flavor">${g.flavor}</div>
      </div>
      <div class="iv-row-buy">
        ${btn('buy-gen', `${k}|${buyQty}`, `Buy${buyQty === 'max' ? ` ×${qty}` : ''}<br><small>${fmt(cost)}</small>`, afford(cost) && qty > 0)}
        ${btn('buy-gen-upg', k, `Upg<br><small>${fmt(upgCost)}</small>`, afford(upgCost))}
      </div></div>`;
  });
  el('generators').innerHTML = rows;
}

// Comfort is unbounded (see math.js), so the meter fills toward something honest and
// meaningful instead of a hard cap: the next accommodation tier's unlock threshold
// (E02-S3-T1, adapted). Also surfaces the live L_comfort income bonus (E02-S3-T5).
function comfortMeterHtml(s) {
  const t = E.nextAccTier(s);
  const bonus = `<div class="iv-comfort-bonus">😌 Comfort bonus <b>×${fmt(M.comfortMultiplier(s))}</b> on all income</div>`;
  if (t >= DATA.accommodation.length) {
    return `${bonus}<div class="iv-sub">Comfort ${fmt(s.resources.comfort)} — top tier owned, you're among the clouds ☁️</div>`;
  }
  const target = M.accUnlockComfort(t);
  const pct = clamp(100 * s.resources.comfort / target, 0, 100);
  const nextName = DATA.accommodation[t].name;
  return `${bonus}
    <div class="iv-comfort-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100"
      aria-valuenow="${pct.toFixed(0)}" aria-label="Comfort progress toward ${nextName}">
      <i style="width:${pct.toFixed(1)}%"></i>
    </div>
    <div class="iv-sub">Comfort ${fmt(s.resources.comfort)} / ${fmt(target)} → next: ${nextName}</div>`;
}

function renderAmenities(s) {
  const byTag = {};
  for (const a of DATA.amenities) {
    if (!E.amenityUnlocked(s, a.id)) continue;
    (byTag[a.tag] ||= []).push(a);
  }
  let html = comfortMeterHtml(s);
  for (const tag of Object.keys(byTag)) {
    html += `<div class="iv-tag">${tag}</div><div class="iv-amenities">`;
    for (const a of byTag[tag]) {
      const cost = E.amenityCost(s, a.id);
      const lvl = s.amenities[a.id].level;
      html += btn('buy-amenity', a.id,
        `${a.name} <small>Lv${lvl}</small><br><small>${fmt(cost)} · +${fmt(a.comfort)}😌</small>`,
        afford(cost), '', a.flavor);
    }
    html += '</div>';
  }
  if (!Object.keys(byTag).length) html += '<em>Get some Comfort to unlock little luxuries…</em>';
  el('amenities').innerHTML = html;
}

function renderSkills(s) {
  let html = '<div class="iv-skills">';
  for (const sk of DATA.skills) {
    const st = s.skills[sk.id];
    const need = M.xpToNext(st.level);
    const into = st.xp; // rough display
    html += `<div class="iv-skill">
      <b>${sk.name}</b> <span class="label">Lv ${st.level}</span>
      <div class="iv-sub">${sk.effect}</div>
      <div class="bar"><i style="width:${Math.min(100, 100 * (into % need) / need)}%"></i></div>
    </div>`;
  }
  html += '</div><div class="iv-tag">training</div><div class="iv-amenities">';
  for (const t of DATA.training) {
    const cost = E.trainingCost(s, t.id);
    html += btn('buy-training', t.id, `Train ${t.skill}<br><small>${fmt(cost)} → +${t.xp}xp</small>`, afford(cost));
  }
  html += '</div>';
  el('skills').innerHTML = html;
}

// Recurring NPC roster (E03-S1-T3/S6-T9/S7-T1): revealed once you're in the hostel
// bunk (accommodation.tier >= 2). Pure flavor — path seeds are neutral in E03, see
// engine.checkNpcUnlocks.
function npcRosterHtml(s) {
  let html = '<div class="iv-tag">fellow travelers</div><div class="iv-npcs">';
  for (const npc of DATA.npcs) {
    html += `<div class="iv-npc" title="${npc.flavor}">
      <span class="iv-npc-emoji">${npc.emoji}</span> <b>${npc.name}</b>
      <div class="iv-sub">${npc.flavor}</div>
    </div>`;
  }
  html += '</div>';
  return html;
}

// Path meter (E04-S3-T5/S7-T7): four thin bars, one per archetype, showing current
// points and a live preview of that path's own softcapped × (M.pathMult). Pure display
// — the real per-tier L_path blend stays in math.tierMultiplier; this is a legible
// "what would this path be worth" readout, not a second multiplier source.
function pathMeterHtml(s) {
  let html = '<div class="iv-pathmeter">';
  for (const p of DATA.paths) {
    const pts = s.paths[p.id].points;
    const preview = M.pathMult(pts);
    const pct = clamp(100 * pts / (pts + 20), 0, 100); // saturating visual fill, Comfort is unbounded so no hard cap
    html += `<div class="iv-pmeter-row">
      <span class="iv-pmeter-label">${p.name}</span>
      <div class="iv-pmeter-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
        aria-valuenow="${pct.toFixed(0)}" aria-label="${p.name} progress"><i style="width:${pct.toFixed(1)}%"></i></div>
      <span class="iv-pmeter-val" aria-label="${fmt(pts)} points, times ${fmt(preview)} bonus">${fmt(pts)} pts · ×${fmt(preview)}</span>
    </div>`;
  }
  html += '</div>';
  return html;
}

function renderPaths(s) {
  let html = s.accommodation.tier >= 2 ? npcRosterHtml(s) : '';
  html += pathMeterHtml(s);
  html += '<div class="iv-amenities">';
  for (const p of DATA.paths) {
    const cost = E.pathCost(s, p.id);
    const pts = s.paths[p.id].points;
    html += `<div class="iv-path">
      <b>${p.name}</b> <span class="label">${pts} pts</span>
      <div class="iv-sub">${p.identity}<br><i>Perk:</i> ${p.perk}</div>
      ${btn('buy-path', p.id, `Focus<br><small>${fmt(cost)}</small>`, afford(cost))}
    </div>`;
  }
  html += '</div>';
  el('paths').innerHTML = html;
}

function renderAscension(s) {
  const preview = P.legacyPreview(s);
  const can = P.canAscend(s);
  const nextBeat = DATA.story.find(b => b.id === 26);
  const unlocked = s.story.seen.includes(26) || s.ascension.count > 0;
  if (!unlocked) {
    el('ascension').innerHTML = `<em>Ascension unlocks at Beat 26 (Comfort ≥ ${fmt(1e9)}). Keep climbing.</em>`;
    return;
  }
  el('ascension').innerHTML = `
    <div>Ascend to reset this run for permanent <b>Legacy</b>.</div>
    <div class="iv-sub">Run time: ${fmtTime(s.stats.runSec)} · Ascensions: ${s.ascension.count}</div>
    <div>Ascend now → <b>+${fmt(preview)} Legacy</b> ${btn('ascend', '', 'Ascend ✨', can)}</div>
    ${!can ? `<div class="iv-sub">(need ≥1 Legacy and ≥${C.ASCEND_MIN_RUN_SEC}s run time)</div>` : ''}`;
}

function renderTree(s) {
  if (s.ascension.count === 0) { el('tree').innerHTML = '<em>The permanent skill tree opens after your first ascension.</em>'; return; }
  const branches = { physique: [], character: [], meta: [] };
  for (const n of DATA.tree) branches[n.branch].push(n);
  let html = `<div class="iv-sub">Legacy to spend: <b>${fmt(s.resources.legacy)}</b> ${btn('respec', '', 'Respec', true, 'btn-link')}</div>`;
  for (const br of Object.keys(branches)) {
    html += `<div class="iv-tag">${br}</div><div class="iv-amenities">`;
    for (const n of branches[br]) {
      const rank = P.treeRank(s, n.id);
      const cost = P.treeCost(s, n.id);
      const can = P.canBuyNode(s, n.id);
      const maxed = rank >= n.maxRank;
      const reqOk = P.treeRequiresMet(s, n.id);
      html += btn('buy-node', n.id,
        `${n.name} <small>${rank}/${n.maxRank}</small><br><small>${maxed ? 'MAX' : reqOk ? fmt(cost) + '🏆' : 'locked'}</small>`,
        can, maxed ? 'iv-maxed' : '');
    }
    html += '</div>';
  }
  el('tree').innerHTML = html;
}

// ---------- events (delegated) ----------
function wireEvents() {
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-action]');
    if (!b) return;
    const action = b.dataset.action;
    const arg = b.dataset.arg;
    handle(action, arg);
    render(S);
  });
}

function handle(action, arg) {
  switch (action) {
    case 'set-qty': S.ui.bulkMode = arg === 'max' ? 'max' : Number(arg); break;
    case 'buy-gen': { const [k, q] = arg.split('|'); E.buyGenerator(S, Number(k), q === 'max' ? 'max' : Number(q)); break; }
    case 'buy-gen-upg': E.buyGenUpgrade(S, Number(arg)); break;
    case 'buy-amenity': E.buyAmenity(S, arg); break;
    case 'buy-training': E.buyTraining(S, arg); break;
    case 'buy-path': E.buyPathFocus(S, arg); break;
    case 'buy-acc': E.buyAccommodation(S); break;
    case 'buy-dest': E.buyDestination(S, arg); break;
    case 'visit-dest': E.visitDestination(S, arg); break;
    case 'buy-transport': E.buyTransport(S, arg); break;
    case 'story-choice': { const [id, set] = arg.split('|'); E.applyStoryChoice(S, Number(id), set); break; }
    case 'ascend': if (P.ascend(S)) { setState(S); } break;
    case 'buy-node': P.buyNode(S, arg); break;
    case 'respec': if (confirm('Refund all Legacy and clear the tree?')) P.respec(S); break;
    case 'click': showTapPopup(E.click(S)); break;
    case 'set-speed': S.settings.gameSpeed = Number(arg); renderControls(S); break;
    case 'set-speed-custom': {
      const v = Number(document.getElementById('speedInput')?.value);
      if (Number.isFinite(v) && v >= 0) S.settings.gameSpeed = Math.min(v, C.GAME_SPEED_MAX);
      renderControls(S); break;
    }
    case 'toggle-debug': S.settings.debug = !S.settings.debug; renderDebug(); break;
    case 'dbg-cash': S.resources.cash += 1e6 * Math.pow(1000, Number(arg)); break;
    case 'dbg-comfort': S.stats.lifetimeCash += 1e9; S.skills.body.xp += 5000; break;
    case 'dbg-legacy': S.resources.legacy += 100; break;
    case 'dbg-dest': {
      // QA-only (E04-S8-T10): force-own the next place on the map, bypassing cost/chain,
      // so downstream epics can test L_dest without grinding the map for real.
      const next = DATA.destinations.find(d => !S.destinations[d.id].owned);
      if (next) { S.destinations[next.id].owned = true; S._destCache = M.destMult(S, DATA); }
      break;
    }
    case 'dbg-path': for (const p of DATA.paths) S.paths[p.id].points += 10; break;
    case 'export': hooks.exportSave(); break;
    case 'import': hooks.importSave(); break;
    case 'reset': if (confirm('Hard reset? This wipes everything.')) hooks.hardReset(); break;
    case 'save': hooks.save(); break;
    case 'dismiss-offline': hideOfflineSummary(); break;
  }
}

// ---------- "While you were away" summary (E02-S9-T5) ----------
// A dismissible in-page modal replacing the old alert() stub. Purely presentational —
// applyOffline() already did the math; this just reads its returned summary plus the
// post-offline state for Comfort context.
export function showOfflineSummary(state, rep) {
  const overlay = el('offlineModal');
  const body = el('offlineModalBody');
  if (!overlay || !body) return;
  const lComfort = M.comfortMultiplier(state);
  body.innerHTML = `
    <div class="iv-offline-row">You were away for <b>${fmtTime(rep.seconds)}</b>${rep.capped ? ' <span class="iv-sub">(capped)</span>' : ''}.</div>
    <div class="iv-offline-row">💶 <b>+${fmt(rep.cash)}</b> cash</div>
    <div class="iv-offline-row">📣 <b>+${fmt(rep.clout)}</b> clout</div>
    <div class="iv-sub">😌 Comfort is now ${fmt(state.resources.comfort)} — a bonus of ×${fmt(lComfort)} on income while you were gone.</div>`;
  overlay.hidden = false;
}
function hideOfflineSummary() {
  const overlay = el('offlineModal');
  if (overlay) overlay.hidden = true;
}

// tap feedback (E01-S5-T4): a floating "+N" (or a cooldown glyph when soft-capped)
// over the tap button — pure juice, no game logic.
function showTapPopup(gain) {
  const btnEl = document.querySelector('[data-action="click"]');
  if (!btnEl) return;
  const pop = document.createElement('span');
  pop.className = 'iv-tap-pop';
  pop.textContent = gain > 0 ? `+${fmt(gain)}` : '⏳';
  pop.style.left = `${btnEl.offsetLeft + btnEl.offsetWidth / 2}px`;
  btnEl.parentElement.appendChild(pop);
  setTimeout(() => pop.remove(), 700);
}

// speed + debug controls live in a fixed footer rendered once
export function renderControls(state) {
  S = state;
  const speeds = C.GAME_SPEED_CHOICES.map(v =>
    `<button class="btn btn-sm ${state.settings.gameSpeed === v ? 'btn-primary' : ''}" data-action="set-speed" data-arg="${v}">${v}×</button>`).join('');
  el('controls').innerHTML = `
    <button class="btn btn-lg btn-primary" data-action="click">👆 Tap (small gain + combo)</button>
    <span class="iv-speed">Speed <b>${state.settings.gameSpeed}×</b>: ${speeds}
      <input id="speedInput" type="number" min="0" step="1" value="${state.settings.gameSpeed}"
        style="width:74px" title="Custom pace — 1 = natural course, high = hyperspeed for testing">
      ${btn('set-speed-custom', '', 'Set×')}</span>
    ${btn('save', '', '💾 Save')}
    ${btn('export', '', 'Export')}
    ${btn('import', '', 'Import')}
    ${btn('toggle-debug', '', '🐞 Debug')}
    ${btn('reset', '', 'Reset', true, 'btn-error')}
    <span id="debugpanel"></span>`;
}

function renderDebug() {
  const p = el('debugpanel');
  if (!S.settings.debug) { p.innerHTML = ''; return; }
  p.innerHTML = ` | DBG:
    ${btn('dbg-cash', 1, '+1M')}
    ${btn('dbg-cash', 2, '+1B')}
    ${btn('dbg-comfort', '', '+comfort/body')}
    ${btn('dbg-legacy', '', '+100 Legacy')}
    ${btn('dbg-dest', '', '+dest (E04 QA)')}
    ${btn('dbg-path', '', '+10 path pts (all)')}`;
}
