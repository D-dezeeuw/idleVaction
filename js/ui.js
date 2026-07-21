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
  renderPoolside(state);
  renderBeachfront(state);
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
    // skill level-up juice (E09-S3-T6/T7/S10-T1): turn the engine's 'levelup' event into
    // a bar-flash trigger + an aria-live announcement, on top of the toast every notif
    // type already gets below.
    if (item.type === 'levelup') { noteSkillLevelUp(item.text); announceSkill(item.text); }
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

// The shed→island ladder panel (E05-S3-T1..T4): rather than dumping all 21 rows, this
// shows the owned climb collapsed to a count, the CURRENT tier, and a small lookahead
// window of upcoming tiers with their Comfort gate + cash cost — so the whole ladder
// stays legible at a glance without scrolling through tiers decades away. The gating
// shown here is always E.accUnlocked(s) itself (never a re-derived copy), so the panel
// can never drift from the real purchase gate (E05-D guardrail).
const ACC_LOOKAHEAD = 5;
function renderAccommodation(s) {
  const t = s.accommodation.tier;
  const maxTier = DATA.accommodation.length - 1;
  const cur = DATA.accommodation[t];
  const titleEl = el('accTitle');
  if (titleEl) titleEl.textContent = `🏨 ${cur.name}`;

  let html = `<div class="iv-flavor">${cur.flavor}</div>`;
  html += '<div class="iv-acc-ladder">';
  if (t > 0) {
    html += `<div class="iv-acc-row iv-acc-owned">✅ ${t} earlier stop${t > 1 ? 's' : ''} — from ${DATA.accommodation[0].name}</div>`;
  }
  html += `<div class="iv-acc-row iv-acc-current">🏨 <b>${cur.name}</b> <small>tier ${t} · accScore ${fmt(M.accScore(t))}</small></div>`;

  const lastShown = Math.min(maxTier, t + ACC_LOOKAHEAD);
  for (let i = t + 1; i <= lastShown; i++) {
    const acc = DATA.accommodation[i];
    const cost = E.accCostForTier(s, i);
    const need = M.accUnlockComfort(i);
    const isNext = i === t + 1;
    if (isNext) {
      // the ONLY tier that can ever be bought right now — gate is E.accUnlocked(s)
      // itself, so this can never disagree with engine.buyAccommodation's own check.
      const gateOk = E.accUnlocked(s);
      const pct = clamp(100 * s.resources.comfort / need, 0, 100);
      html += `<div class="iv-acc-row iv-acc-next" title="${acc.flavor}">
        <div>➡️ Next: <b>${acc.name}</b> <small>${fmt(cost)}</small></div>
        <div class="iv-comfort-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100"
          aria-valuenow="${pct.toFixed(0)}" aria-label="Comfort progress toward ${acc.name}">
          <i style="width:${pct.toFixed(1)}%"></i>
        </div>
        <div class="iv-sub">needs Comfort ≥ ${fmt(need)} — you: ${fmt(s.resources.comfort)}${gateOk ? ' ✅' : ''}</div>
        ${gateOk ? btn('buy-acc', '', `Check in — ${fmt(cost)}`, afford(cost), 'btn-primary') : ''}
      </div>`;
    } else {
      html += `<div class="iv-acc-row iv-acc-locked" title="${acc.flavor}">
        🔒 ${acc.name} <small>needs Comfort ≥ ${fmt(need)} · ${fmt(cost)}</small>
      </div>`;
    }
  }
  const remaining = maxTier - lastShown;
  if (remaining > 0) {
    html += `<div class="iv-acc-row iv-acc-more">…and ${remaining} more stop${remaining > 1 ? 's' : ''} up to ${DATA.accommodation[maxTier].name}</div>`;
  } else if (t >= maxTier) {
    html += '<div class="iv-acc-row"><em>You own the dot on the map. There is nowhere higher.</em></div>';
  }
  html += '</div>';
  el('accommodation').innerHTML = html;
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
  // renovation legend (E05-S3-T4/S4-T1/T5): L_upgrade already exists as the per-tier
  // "Upg" purchase — this just names it and shows the flat +N% so the layer is legible,
  // plus a convenience "renovate cheapest" button over the SAME buyGenUpgrade path.
  const cheapest = E.cheapestGenUpgrade(s);
  const renoPct = (C.L_UPGRADE_RATE * 100).toFixed(0);
  let rows = `<div class="iv-qty">Buy ${qtyBtns}</div>
    <div class="iv-sub iv-chain-legend">🔗 higher tiers feed lower ones → D1 pays out cash</div>
    <div class="iv-sub iv-upg-legend">🔧 Renovations ("Upg"): +${renoPct}% to that tier's own output per purchase, permanently
      (L_upgrade = 1 + ${C.L_UPGRADE_RATE}·n) ${cheapest ? btn('buy-cheapest-upg', '', `Renovate cheapest <small>${fmt(cheapest.cost)}</small>`, afford(cheapest.cost)) : ''}</div>`;
  DATA.generators.forEach((g, k) => {
    if (!s.generators[k].unlocked) return;
    const st = s.generators[k];
    const qty = buyQty === 'max' ? E.genMaxQty(s, k) : buyQty;
    const cost = E.genCost(s, k, buyQty === 'max' ? Math.max(1, qty) : qty);
    const mult = M.tierMultiplier(s, k);
    const toDouble = C.MILESTONE_STEP - (st.bought % C.MILESTONE_STEP);
    const upgCost = E.genUpgradeCost(s, k);
    const upgMult = M.upgradeMult(st.upgrades);
    rows += `<div class="iv-row">
      <div class="iv-row-main" title="${g.flavor}">
        <b>${g.name}</b> <small>×${st.count | 0}</small>
        <div class="iv-sub">out ×${fmt(mult)} · next double in ${toDouble} · bought ${st.bought}</div>
        <div class="iv-sub" aria-label="renovation layer: ${st.upgrades} bought, times ${fmt(upgMult)}">
          🔧 L_upgrade ×${fmt(upgMult)} (${st.upgrades} reno${st.upgrades === 1 ? '' : 's'}) · next +${renoPct}%</div>
        <div class="iv-flavor iv-gen-flavor">${g.flavor}</div>
      </div>
      <div class="iv-row-buy">
        ${btn('buy-gen', `${k}|${buyQty}`, `Buy${buyQty === 'max' ? ` ×${qty}` : ''}<br><small>${fmt(cost)}</small>`, afford(cost) && qty > 0)}
        ${btn('buy-gen-upg', k, `Upg<br><small>${fmt(upgCost)}</small>`, afford(upgCost), '', `+${renoPct}% to ${g.name}'s output — L_upgrade`)}
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
    if (a.tag === 'pool') continue; // the dedicated Poolside card (E07) owns this tag
    if (a.tag === 'beach' || a.tag === 'service') continue; // the dedicated Beachfront card (E08) owns these tags
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

// ---------- Poolside panel (E07 "Making a Splash" — the fun showcase) ----------
// Reveals once the pool has been teased (checkPoolTease, E06) or the 3-Star Hotel
// (tier 6) is actually reached — whichever comes first, so the tease-era preview and
// the tier-6 arrival both land inside the same card. Mirrors mapRevealed()'s pattern.
function poolRevealed(s) { return !!s.story.flags.poolTease || s.accommodation.tier >= 6; }

// Sub-cluster grouping (E07-S3-T6): every pool item shares tag:'pool' (one Comfort
// zone for amenityScore/L_comfort purposes), but the panel reads better split into the
// three themed chains the epic describes. Pure UI grouping — no data-shape change, no
// new fork of the render/buy pattern (still the same buyAmenity(id) flow as every
// other amenity card).
const POOL_GROUPS = [
  { label: 'Floatables', ids: ['floatie_duck', 'floatie_flamingo', 'floatie_unicorn', 'pool_floatie_pizza', 'pool_floatie_swan'] },
  { label: 'Loungers & Cabana', ids: ['pool_lounger', 'heated_bed', 'cabana'] },
  { label: 'Cocktail Service', ids: ['cocktail_1', 'pool_cocktail_2', 'pool_cocktail_3'] },
];

function renderPoolside(s) {
  const card = el('poolCard');
  const reveal = poolRevealed(s);
  if (card) card.hidden = !reveal;
  if (!reveal) { if (el('poolside')) el('poolside').innerHTML = ''; return; }

  const poolItems = DATA.amenities.filter(a => a.tag === 'pool');
  // zone Comfort subtotal (E07-S3-T9): the pool's own raw contribution to Comfort and
  // its share of the player's current total — legible without a bespoke partial-log
  // decomposition of L_comfort (Comfort itself is the unbounded sum; see math.js).
  const poolComfort = poolItems.reduce((sum, a) => sum + (s.amenities[a.id]?.level || 0) * a.comfort, 0);
  const share = s.resources.comfort > 0 ? 100 * poolComfort / s.resources.comfort : 0;
  let html = `<div class="iv-sub">💧 Pool Comfort: <b>${fmt(poolComfort)}</b> (${share.toFixed(0)}% of your total Comfort)</div>`;

  let anyVisible = false;
  for (const grp of POOL_GROUPS) {
    const visible = poolItems.filter(a => grp.ids.includes(a.id) && E.amenityUnlocked(s, a.id));
    if (!visible.length) continue;
    anyVisible = true;
    html += `<div class="iv-tag">${grp.label}</div><div class="iv-amenities">`;
    for (const a of visible) {
      const cost = E.amenityCost(s, a.id);
      const lvl = s.amenities[a.id].level;
      html += btn('buy-amenity', a.id,
        `${a.name} <small>Lv${lvl}</small><br><small>${fmt(cost)} · +${fmt(a.comfort)}😌</small>`,
        afford(cost), '', a.flavor);
    }
    html += '</div>';
  }
  if (!anyVisible) html += '<em>The pool is right there. Keep building Comfort — the first floatie is close.</em>';
  el('poolside').innerHTML = html;
}

// ---------- Beachfront panel (E08 "Sun, Sand & Service") ----------
// Reveals on the 4-Star Beach Resort tier-up (tier 7) — the resort arrival IS the reveal
// (see engine.buyAccommodation's t===7 celebrate flash); mirrors poolRevealed()'s pattern
// one tier later, no separate tease flag needed for this epic's DoD ("the beach zone
// reveals on tier-up").
function beachRevealed(s) { return s.accommodation.tier >= 7; }

// the service-quality chain in ladder order (E08-S1-T3/S4-T1): self-serve cart → waiter
// → head waiter → maître d' → concierge (seed). Pure UI ordering constant, mirrors
// POOL_GROUPS just above — no data-shape change, same buyAmenity(id) flow as every
// other amenity card.
const SERVICE_CHAIN = ['service_selfserve', 'service_waiter', 'service_head_waiter', 'service_maitre_d', 'service_concierge_seed'];

// service-quality meter (E08-S3-T2): a labeled bar showing how far up the ladder the
// player has climbed. Reads levels directly (no bespoke "current tier" state) — the
// highest-ranked OWNED chain link wins regardless of purchase order, since nothing
// besides Comfort gates buying a later tier out of sequence.
function serviceMeterHtml(s) {
  const owned = SERVICE_CHAIN.filter(id => (s.amenities[id]?.level || 0) > 0);
  const pct = 100 * owned.length / SERVICE_CHAIN.length;
  const highestId = owned[owned.length - 1];
  const highest = highestId ? E.amenityData(highestId) : null;
  const label = highest ? `${highest.name} (Lv${s.amenities[highestId].level})` : 'Self-serve, for now';
  return `<div class="iv-comfort-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100"
      aria-valuenow="${pct.toFixed(0)}" aria-label="Service quality ladder progress">
      <i style="width:${pct.toFixed(1)}%"></i>
    </div>
    <div class="iv-sub">🎩 Service quality: <b>${label}</b></div>`;
}

function renderBeachfront(s) {
  const card = el('beachCard');
  const reveal = beachRevealed(s);
  if (card) card.hidden = !reveal;
  if (!reveal) { if (el('beachfront')) el('beachfront').innerHTML = ''; return; }

  const sandItems = DATA.amenities.filter(a => a.tag === 'beach');
  const serviceItems = DATA.amenities.filter(a => a.tag === 'service');
  // zone Comfort subtotal (E08-S3-T8, mirrors the pool card's poolComfort line): beach +
  // service combined, since both feed the same wAmen Comfort term (no separate weight).
  const zoneComfort = [...sandItems, ...serviceItems]
    .reduce((sum, a) => sum + (s.amenities[a.id]?.level || 0) * a.comfort, 0);
  const share = s.resources.comfort > 0 ? 100 * zoneComfort / s.resources.comfort : 0;
  let html = `<div class="iv-sub">🏖️ Beach + Service Comfort: <b>${fmt(zoneComfort)}</b> (${share.toFixed(0)}% of your total Comfort)</div>`;
  html += serviceMeterHtml(s);

  const renderGroup = (label, items) => {
    const visible = items.filter(a => E.amenityUnlocked(s, a.id));
    if (!visible.length) return '';
    let h = `<div class="iv-tag">${label}</div><div class="iv-amenities">`;
    for (const a of visible) {
      const cost = E.amenityCost(s, a.id);
      const lvl = s.amenities[a.id].level;
      h += btn('buy-amenity', a.id,
        `${a.name} <small>Lv${lvl}</small><br><small>${fmt(cost)} · +${fmt(a.comfort)}😌</small>`,
        afford(cost), '', a.flavor);
    }
    return h + '</div>';
  };
  // separate sand vs. service sections (E08-S3-T6), same buyAmenity(id) buy-flow for both.
  const sandHtml = renderGroup('Sun & Sand', sandItems);
  const serviceHtml = renderGroup('Service', serviceItems);
  html += sandHtml + serviceHtml;
  if (!sandHtml && !serviceHtml) html += '<em>The beach just opened. Keep building Comfort — the first towel is close.</em>';
  el('beachfront').innerHTML = html;
}

// splash juice (E07-S10-T9): a tiny popup on a pool/beach/service purchase. Unlike
// showTapPopup (whose button lives in the footer, never touched by the main render
// cycle), these buy buttons sit INSIDE #poolside/#beachfront, which the very same
// click's render(S) call re-renders right after this fires — so the popup is appended
// to document.body at the button's page coordinates (captured before that wipe) rather
// than as a child of the button, surviving the innerHTML replace. CSS gates the
// motion behind prefers-reduced-motion (game.css). `emoji` defaults to the original
// pool water-droplet; the beach panel (E08) reuses the same popup with its own icon
// rather than forking a second implementation.
function showSplashPopup(btnEl, emoji = '💦') {
  if (!btnEl) return;
  const rect = btnEl.getBoundingClientRect();
  const pop = document.createElement('span');
  pop.className = 'iv-splash-pop';
  pop.textContent = emoji;
  pop.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
  pop.style.top = `${rect.top + window.scrollY}px`;
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 700);
}

// training XP-gain popup (E09-S10-T1 "training feel"): mirrors showSplashPopup's
// body-anchored floating-text trick exactly — the training button's own container
// (#skills) re-renders in this very same click, so the popup is appended to <body> at
// the button's captured coordinates rather than as its child.
function showXpPopup(btnEl, text) {
  if (!btnEl) return;
  const rect = btnEl.getBoundingClientRect();
  const pop = document.createElement('span');
  pop.className = 'iv-xp-pop';
  pop.textContent = text;
  pop.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
  pop.style.top = `${rect.top + window.scrollY}px`;
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 700);
}

// aria-live purchase tickers (E07-S3-T8, extended E08-S3-T7): genuinely persistent live
// regions (declared once in index.html, never wiped by the panel's innerHTML replace) so
// a text-only content change is what screen readers actually announce.
function announcePool(text) {
  const live = el('poolAnnounce');
  if (live) live.textContent = text;
}
function announceBeach(text) {
  const live = el('beachAnnounce');
  if (live) live.textContent = text;
}

// skill level-up flash (E09-S3-T6/S10-T1): a brief bar pulse on the skill that just
// leveled, detected from the drained 'levelup' notification text itself (no new state
// field — same category as the transient module state above showTapPopup/showSplashPopup
// use). Motion is entirely gated in CSS (prefers-reduced-motion).
const skillFlash = {};
function noteSkillLevelUp(text) {
  const m = /^✨ (.+) L(\d+)!$/.exec(text);
  if (m) skillFlash[m[1]] = Date.now() + 900;
}
let commsMaxedAnnounced = false; // one-shot aria-live nudge (E09-S3-T8/S10-T7), see renderSkills
function announceSkill(text) {
  const live = el('skillAnnounce');
  if (live) live.textContent = text;
}

// live effect readouts + next-level preview (E09-S3-T3/T5/T8): makes the "charm → money,
// comms → cheaper" link explicit at the point of training. tierMultiplier's own L_skill
// blend and commsCostMult's own clamp stay the real math (math.js) — this just reads the
// SAME preview helpers (M.charismaMult / M.commsDiscountPct) the panel and the tests share.
function skillEffectReadout(sk, st) {
  if (sk.id === 'charisma') {
    const mult = M.charismaMult(st.level);
    const next = M.charismaMult(st.level + 1);
    return `<div class="iv-sub iv-skill-effect">📣 Social income <b>×${fmt(mult)}</b> (L${st.level}) on Followers &amp; Sponsor Slides
      <br><small>next level: +${((next - mult) * 100).toFixed(0)}% social income</small></div>`;
  }
  if (sk.id === 'comms') {
    const pct = M.commsDiscountPct(st.level);
    const nextPct = M.commsDiscountPct(st.level + 1);
    const maxed = pct >= C.COMMS_DISCOUNT_CAP - 1e-9;
    if (maxed && !commsMaxedAnnounced) { commsMaxedAnnounced = true; announceSkill('Communication discount maxed at −60%.'); }
    return `<div class="iv-sub iv-skill-effect">💸 All purchases <b>−${(pct * 100).toFixed(1)}%</b>
      ${maxed ? '<span class="iv-badge-maxed">MAXED −60%</span>'
              : `<br><small>next level: −${((nextPct - pct) * 100).toFixed(2)}% more (cap −${(C.COMMS_DISCOUNT_CAP * 100).toFixed(0)}%)</small>`}</div>`;
  }
  return '';
}

function renderSkills(s) {
  let html = '<div class="iv-skills">';
  for (const sk of DATA.skills) {
    const st = s.skills[sk.id];
    const need = M.xpToNext(st.level);
    const intoLevel = Math.max(0, st.xp - M.cumXpForLevel(st.level));
    const pct = clamp(100 * intoLevel / need, 0, 100);
    const justLeveled = skillFlash[sk.name] && Date.now() < skillFlash[sk.name];
    html += `<div class="iv-skill${justLeveled ? ' iv-skill-flash' : ''}">
      <b>${sk.name}</b> <span class="label">Lv ${st.level}</span>
      <div class="iv-sub">${sk.effect}</div>
      ${skillEffectReadout(sk, st)}
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(0)}"
        aria-label="${sk.name} progress: ${fmt(intoLevel)} of ${fmt(need)} XP to level ${st.level + 1}">
        <i style="width:${pct.toFixed(1)}%"></i>
      </div>
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
    handle(action, arg, b);
    render(S);
  });
}

function handle(action, arg, btnEl) {
  switch (action) {
    case 'set-qty': S.ui.bulkMode = arg === 'max' ? 'max' : Number(arg); break;
    case 'buy-gen': { const [k, q] = arg.split('|'); E.buyGenerator(S, Number(k), q === 'max' ? 'max' : Number(q)); break; }
    case 'buy-gen-upg': E.buyGenUpgrade(S, Number(arg)); break;
    case 'buy-cheapest-upg': E.buyCheapestGenUpgrade(S); break;
    case 'buy-amenity': {
      const a = E.amenityData(arg);
      const bought = E.buyAmenity(S, arg);
      if (bought && a.tag === 'pool') {
        announcePool(`Bought ${a.name} (+${fmt(a.comfort)} Comfort)`);
        showSplashPopup(btnEl);
      } else if (bought && a.tag === 'beach') {
        announceBeach(`Bought ${a.name} (+${fmt(a.comfort)} Comfort)`);
        showSplashPopup(btnEl, '🏖️');
      } else if (bought && a.tag === 'service') {
        announceBeach(`Promoted to ${a.name} service (+${fmt(a.comfort)} Comfort)`);
        showSplashPopup(btnEl, '🎩');
      }
      break;
    }
    case 'buy-training': {
      // XP-gain feedback (E09-S10-T1 "training feel"): a floating "+Nxp" popup on a
      // successful buy, on top of the level-up flash/toast a crossed boundary already
      // triggers via engine.refreshSkillLevels's 'levelup' notification.
      const t = E.trainingData(arg);
      if (E.buyTraining(S, arg)) showXpPopup(btnEl, `+${fmt(t.xp)}xp`);
      break;
    }
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
