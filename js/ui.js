// ui.js — "simple buttons" renderer. No framework logic; reads state, calls engine.
import { CONFIG as C } from './config.js';
import { DATA } from './data/index.js';
import * as M from './math.js';
import * as E from './engine.js';
import * as P from './prestige.js';
import { fmt, fmtTime } from './util.js';

let S = null;                 // live state ref (stable across ascension)
let hooks = {};               // { save, exportSave, importSave, hardReset }
let buyQty = 1;               // 1 | 10 | 'max'

export function bind(state, h) { S = state; hooks = h; wireEvents(); }
export function setState(state) { S = state; }

const $ = sel => document.querySelector(sel);
const el = id => document.getElementById(id);

// ---------- top-level render ----------
export function render(state) {
  S = state;
  renderHeader(state);
  renderNotifications(state);
  renderStory(state);
  renderAccommodation(state);
  renderGenerators(state);
  renderAmenities(state);
  renderSkills(state);
  renderPaths(state);
  renderAscension(state);
  renderTree(state);
}

function afford(cost) { return S.resources.cash >= cost; }
function btn(action, arg, label, enabled = true, cls = '') {
  return `<button class="btn btn-sm iv-btn ${cls}" data-action="${action}" data-arg="${arg ?? ''}" ${enabled ? '' : 'disabled'}>${label}</button>`;
}

function renderHeader(s) {
  const perSec = M.tierProd(s, 0) + M.savvyPassive(s);
  el('hdr').innerHTML = `
    <span class="iv-res">💶 <b>${fmt(s.resources.cash)}</b> <small>(+${fmt(perSec)}/s)</small></span>
    <span class="iv-res">😌 Comfort <b>${fmt(s.resources.comfort)}</b></span>
    <span class="iv-res">📣 Clout <b>${fmt(s.resources.clout)}</b></span>
    <span class="iv-res">🏆 Legacy <b>${fmt(s.resources.legacy)}</b></span>
    <span class="iv-res">🏨 <b>${DATA.accommodation[s.accommodation.tier].name}</b></span>
    <span class="iv-res">🔥 Combo ×${(s._combo ?? 1).toFixed(2)}</span>
  `;
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

function renderGenerators(s) {
  const qtyBtns = [1, 10, 'max'].map(q =>
    `<button class="btn btn-sm ${buyQty === q ? 'btn-primary' : ''}" data-action="set-qty" data-arg="${q}">×${q}</button>`).join(' ');
  let rows = `<div class="iv-qty">Buy ${qtyBtns}</div>`;
  DATA.generators.forEach((g, k) => {
    if (!s.generators[k].unlocked) return;
    const st = s.generators[k];
    const qty = buyQty === 'max' ? E.genMaxQty(s, k) : buyQty;
    const cost = E.genCost(s, k, buyQty === 'max' ? Math.max(1, qty) : qty);
    const mult = M.tierMultiplier(s, k);
    const toDouble = C.MILESTONE_STEP - (st.bought % C.MILESTONE_STEP);
    const upgCost = E.genUpgradeCost(s, k);
    rows += `<div class="iv-row">
      <div class="iv-row-main">
        <b>${g.name}</b> <small>×${st.count | 0}</small>
        <div class="iv-sub">out ×${fmt(mult)} · next double in ${toDouble} · bought ${st.bought}</div>
      </div>
      <div class="iv-row-buy">
        ${btn('buy-gen', `${k}|${buyQty}`, `Buy${buyQty === 'max' ? ` ×${qty}` : ''}<br><small>${fmt(cost)}</small>`, afford(cost) && qty > 0)}
        ${btn('buy-gen-upg', k, `Upg<br><small>${fmt(upgCost)}</small>`, afford(upgCost))}
      </div></div>`;
  });
  el('generators').innerHTML = rows;
}

function renderAmenities(s) {
  const byTag = {};
  for (const a of DATA.amenities) {
    if (!E.amenityUnlocked(s, a.id)) continue;
    (byTag[a.tag] ||= []).push(a);
  }
  let html = '';
  for (const tag of Object.keys(byTag)) {
    html += `<div class="iv-tag">${tag}</div><div class="iv-amenities">`;
    for (const a of byTag[tag]) {
      const cost = E.amenityCost(s, a.id);
      const lvl = s.amenities[a.id].level;
      html += btn('buy-amenity', a.id,
        `${a.name} <small>Lv${lvl}</small><br><small>${fmt(cost)} · +${fmt(a.comfort)}😌</small>`,
        afford(cost));
    }
    html += '</div>';
  }
  el('amenities').innerHTML = html || '<em>Get some Comfort to unlock little luxuries…</em>';
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

function renderPaths(s) {
  let html = '<div class="iv-amenities">';
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
    case 'set-qty': buyQty = arg === 'max' ? 'max' : Number(arg); break;
    case 'buy-gen': { const [k, q] = arg.split('|'); E.buyGenerator(S, Number(k), q === 'max' ? 'max' : Number(q)); break; }
    case 'buy-gen-upg': E.buyGenUpgrade(S, Number(arg)); break;
    case 'buy-amenity': E.buyAmenity(S, arg); break;
    case 'buy-training': E.buyTraining(S, arg); break;
    case 'buy-path': E.buyPathFocus(S, arg); break;
    case 'buy-acc': E.buyAccommodation(S); break;
    case 'story-choice': { const [id, set] = arg.split('|'); E.applyStoryChoice(S, Number(id), set); break; }
    case 'ascend': if (P.ascend(S)) { setState(S); } break;
    case 'buy-node': P.buyNode(S, arg); break;
    case 'respec': if (confirm('Refund all Legacy and clear the tree?')) P.respec(S); break;
    case 'click': E.click(S); break;
    case 'set-speed': S.settings.gameSpeed = Number(arg); break;
    case 'toggle-debug': S.settings.debug = !S.settings.debug; renderDebug(); break;
    case 'dbg-cash': S.resources.cash += 1e6 * Math.pow(1000, Number(arg)); break;
    case 'dbg-comfort': S.stats.lifetimeCash += 1e9; S.skills.body.xp += 5000; break;
    case 'dbg-legacy': S.resources.legacy += 100; break;
    case 'export': hooks.exportSave(); break;
    case 'import': hooks.importSave(); break;
    case 'reset': if (confirm('Hard reset? This wipes everything.')) hooks.hardReset(); break;
    case 'save': hooks.save(); break;
  }
}

// speed + debug controls live in a fixed footer rendered once
export function renderControls(state) {
  S = state;
  const speeds = C.GAME_SPEED_CHOICES.map(v =>
    `<button class="btn btn-sm ${state.settings.gameSpeed === v ? 'btn-primary' : ''}" data-action="set-speed" data-arg="${v}">${v}×</button>`).join('');
  el('controls').innerHTML = `
    <button class="btn btn-lg btn-primary" data-action="click">👆 Tap (small gain + combo)</button>
    <span class="iv-speed">Speed: ${speeds}</span>
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
    ${btn('dbg-legacy', '', '+100 Legacy')}`;
}
