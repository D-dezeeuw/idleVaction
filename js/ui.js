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
  renderWellness(state);
  renderConcierge(state);
  renderCreator(state);
  renderCrypto(state);
  renderSkills(state);
  renderPaths(state);
  renderAscension(state);
  renderTree(state);
  renderEnergyMini(state);
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
    // concierge auto-buys (E11-S3-T8 "announce quietly"): route to the muted aria-live
    // line + a brief log-pulse ONLY — no toast, so a busy concierge never spams the
    // notification corner the way a manual purchase never would either.
    if (item.type === 'concierge') { announceConcierge(item.text); pulseConcierge(); continue; }
    // sponsor accept/expire (E12-S3-T7 "announce Clout gains"): gets BOTH the aria-live
    // line AND the normal toast below (unlike concierge's muted convention) — these are
    // rarer, player-initiated/affecting moments, not a busy auto-buyer's chatter.
    if (item.type === 'sponsor') announceCreator(item.text);
    // market boom/crash announcements (E13-S3-T2/S10-T7): gets BOTH the aria-live line
    // AND the normal toast below, mirroring sponsor's convention exactly — rare,
    // exciting, market-moving events, not a busy auto-buyer's chatter.
    if (item.type === 'boom' || item.type === 'crash') announceCrypto(item.text);
    const d = document.createElement('div');
    d.className = 'iv-notif iv-' + item.type;
    d.textContent = item.text;
    box.prepend(d);
    setTimeout(() => d.remove(), 6000);
  }
  while (box.children.length > 6) box.lastChild.remove();
}

function renderStory(s) {
  const latestBeat = DATA.story.filter(b => s.story.seen.includes(b.id)).slice(-1)[0] || DATA.story[0];
  // branch-flavored copy (E13 Task D, "Whale Watching"): swaps in latestBeat.variants[branch]
  // when one exists — see engine.beatCopy.
  const latest = E.beatCopy(s, latestBeat);
  let choiceHtml = '';
  const choiceBeat = DATA.story.find(b => b.choice && s.story.seen.includes(b.id) && s.story.branch === 'neutral');
  if (choiceBeat) {
    choiceHtml = '<div class="iv-choices">' +
      choiceBeat.choices.map(c => btn('story-choice', `${choiceBeat.id}|${c.set}`, c.label)).join(' ') +
      '</div>';
  }
  el('story').innerHTML = `
    <div class="iv-beatnum">Beat ${latestBeat.id} / 30 — Branch: <b>${s.story.branch}</b></div>
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
    // the dedicated Wellness Wing card (E10) owns these tags. Note: the pre-existing
    // 'spa' tag (sunscreen/massage/private_spa) deliberately stays HERE, unmoved — those
    // three shipped in the general Amenities card long before the Wellness Wing existed,
    // so relocating them would delay an already-unlocked purchase's visibility for
    // players mid-run (a real behavior change, not just a data addition). The new
    // tan/gym/wellness tags ship straight into their own card instead, same as pool did.
    if (a.tag === 'tan' || a.tag === 'gym' || a.tag === 'wellness') continue;
    if (a.tag === 'gear') continue; // the dedicated Creator Dashboard (E12) owns this tag
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

// ---------- Wellness Wing panel (E10 "Body & Soul" — Personal Growth II) ----------
// Reveals on the Boutique Retreat arrival (tier 8) — the tier-up IS the reveal, mirroring
// beachRevealed's pattern one tier later (see engine.checkWellnessReveal for the
// one-shot celebratory flash tied to the same gate).
function wellnessRevealed(s) { return s.accommodation.tier >= 8; }

// Sub-cluster grouping (mirrors POOL_GROUPS/SERVICE_CHAIN): tan (casual), gym (highest
// bodyXp weight), and the wellness-tagged spa continuation (highest comfort weight) —
// the pre-existing 'spa' tag (sunscreen/massage/private_spa) is intentionally NOT
// duplicated here, see the renderAmenities exclusion-list comment.
const WELLNESS_GROUPS = [
  { label: 'Tanning Deck', ids: ['tan_sunbed', 'tan_spray_tan', 'tan_golden_hour_deck', 'tan_bronzing_oil'] },
  { label: 'Gym', ids: ['gym_dumbbell_rack', 'gym_treadmill', 'gym_personal_trainer', 'gym_altitude_room'] },
  { label: 'Spa Menu', ids: ['wellness_sauna', 'wellness_hot_stone', 'wellness_seaweed_wrap', 'wellness_cryo_chamber'] },
];

// live energy readout (E10-S3-T2): current/max + regen rate, reusing the .iv-comfort-
// meter bar shell. A brief pulse (energyPulseUntil, set from a tap) is reduced-motion
// gated in CSS.
let energyPulseUntil = 0;
function pulseEnergy() { energyPulseUntil = Date.now() + 500; }
function energyMeterHtml(s) {
  const max = M.energyMax(s);
  const cur = clamp(s.resources.energy, 0, max);
  const pct = clamp(100 * cur / max, 0, 100);
  const regen = M.energyRegenRate(s);
  const low = cur < C.ENERGY.tapCost;
  const pulsing = Date.now() < energyPulseUntil;
  return `<div class="iv-comfort-meter iv-energy-meter${low ? ' iv-energy-low' : ''}${pulsing ? ' iv-energy-pulse' : ''}"
      role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(0)}"
      aria-label="Energy ${fmt(cur)} of ${fmt(max)}"><i style="width:${pct.toFixed(1)}%"></i></div>
    <div class="iv-sub">⚡ Energy <b>${fmt(cur)} / ${fmt(max)}</b> <small>(regen +${fmt(regen)}/s)</small>
      ${low ? '<small> — low tank, taps pay the floor</small>' : ''}</div>`;
}

const WELLNESS_BRANCH_COPY = {
  vlogger: '📸 Great lighting on those delts. The algorithm approves.',
  crypto: '📈 Poolside tan, portfolio compounding — money works while you tan, literally now.',
  connoisseur: 'A discreet, tasteful sort of fitness. Nothing so vulgar as a "gains" photo.',
  traveler: 'Fit enough for any itinerary, however punishing the connecting flight.',
};

function renderWellness(s) {
  const card = el('wellnessCard');
  const reveal = wellnessRevealed(s);
  if (card) card.hidden = !reveal;
  if (!reveal) { if (el('wellness')) el('wellness').innerHTML = ''; return; }

  const bodyLvl = s.skills.body.level;
  const contrib = C.COMFORT.wBody * bodyLvl;
  let html = `<div class="iv-sub" title="Body raises Comfort directly — Comfort is unbounded, no ceiling — and fills the Energy tank that fuels tapping.">
    💪 Body L${bodyLvl} — Comfort contribution <b>${fmt(contrib)}</b></div>`;
  html += energyMeterHtml(s);
  html += `<div class="iv-flavor">${WELLNESS_BRANCH_COPY[s.story.branch] || 'Tan, fit, spa-buffed. The soggy is finally gone.'}</div>`;

  let anyVisible = false;
  for (const grp of WELLNESS_GROUPS) {
    const visible = DATA.amenities.filter(a => grp.ids.includes(a.id) && E.amenityUnlocked(s, a.id));
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
  if (!anyVisible) html += '<em>The wing just opened. Keep building Comfort — the first sunbed is close.</em>';
  el('wellness').innerHTML = html;
}

// ---------- Concierge Desk (E11 "Five-Star Frame of Mind" — the first automation seed) ----------
// Reveals the moment tier 9 (5-Star Hotel) is owned, or Beat 13 has fired — mirrors
// engine.conciergeUnlocked exactly (E11-S3-T7/T9: disabled/hidden until then, "reach the
// Suite to unlock").
function conciergeRevealed(s) { return E.conciergeUnlocked(s); }

const CONCIERGE_CATEGORY_LABEL = { amenity: 'Amenities', generator: 'Generators', upgrade: 'Upgrades' };
const CONCIERGE_BUDGET_PRESETS = [0.05, 0.10, 0.25, 0.50];

// subtle activity indicator (E11-S4-T8 "signature card", S10-T8 "juice"): a brief pulse
// on the recent-purchases log when a batch lands, gated by prefers-reduced-motion in CSS
// (mirrors energyPulseUntil/skillFlash's convention exactly).
let conciergePulseUntil = 0;
function pulseConcierge() { conciergePulseUntil = Date.now() + 900; }
function announceConcierge(text) {
  const live = el('conciergeAnnounce');
  if (live) live.textContent = text;
}

function renderConcierge(s) {
  const card = el('conciergeCard');
  const reveal = conciergeRevealed(s);
  if (card) card.hidden = !reveal;
  if (!reveal) { if (el('concierge')) el('concierge').innerHTML = ''; return; }

  const cfg = s.concierge;
  const budgetCash = s.resources.cash * cfg.budgetFrac;
  const pulsing = Date.now() < conciergePulseUntil;

  let html = `<div class="iv-sub" title="ROI transparency: buys the best cash-per-second-per-cost deal it's allowed to, every ${C.CONCIERGE.intervalSec}s — never accommodation, never ascension, never a story choice.">
    🛎️ <b>${cfg.on ? 'Concierge is shopping' : 'Concierge is resting'}</b>
    ${btn('concierge-toggle', '', cfg.on ? 'Pause' : 'Start shopping', true, cfg.on ? 'btn-primary' : '')}
  </div>`;
  html += `<div class="iv-sub">Budget: up to <b>${fmt(budgetCash)}</b> (${(cfg.budgetFrac * 100).toFixed(0)}% of cash) every ${C.CONCIERGE.intervalSec}s —
    ${CONCIERGE_BUDGET_PRESETS.map(f => `<button class="btn btn-sm ${Math.abs(cfg.budgetFrac - f) < 1e-9 ? 'btn-primary' : ''}" data-action="concierge-budget" data-arg="${f}">${(f * 100).toFixed(0)}%</button>`).join(' ')}
  </div>`;
  html += `<div class="iv-sub">Reserve floor (never spend below): <b>${fmt(cfg.reserveFloor)}</b>
    <input id="conciergeReserveInput" type="number" min="0" step="1" value="${cfg.reserveFloor}" style="width:100px">
    ${btn('concierge-reserve', '', 'Set reserve')}
  </div>`;
  html += `<div class="iv-sub">Shops for: ${C.CONCIERGE.categories.map(cat =>
    btn('concierge-category', cat, `${cfg.whitelist.includes(cat) ? '✅' : '⬜'} ${CONCIERGE_CATEGORY_LABEL[cat]}`,
      true, cfg.whitelist.includes(cat) ? 'btn-primary' : '')).join(' ')}</div>`;

  if (cfg.lastActions.length) {
    html += `<div class="iv-tag">recent purchases <small>(${cfg.totalBought} total, ${fmt(cfg.totalSpent)} spent)</small></div>
      <div class="iv-concierge-log${pulsing ? ' iv-concierge-flash' : ''}">`;
    for (const a of cfg.lastActions) {
      html += `<div class="iv-sub">${fmtTime(a.t)} — ${a.items.map(i => i.name).join(', ')} <small>(${fmt(a.cost)})</small></div>`;
    }
    html += '</div>';
  } else {
    html += '<div class="iv-sub"><em>No purchases yet — turn the concierge on and it will start shopping within its whitelist.</em></div>';
  }
  el('concierge').innerHTML = html;
}

// ---------- Creator Dashboard (E12 "Lights, Camera, Clout" — the Clout economy's home) ----------
// Reveals once the vlogger economy is genuinely in play — path points invested, Beat 14
// has fired, or the tier-11 band is reached — whichever comes first (mirrors
// engine.creatorDashboardUnlocked exactly, E12-S3-T6).
function creatorRevealed(s) { return E.creatorDashboardUnlocked(s); }

function announceCreator(text) {
  const live = el('creatorAnnounce');
  if (live) live.textContent = text;
}

// combo meter juice (E12-S3-T2/T5/T8, S4-T8, S10-T7): a brief pulse on every tap (tying
// E10's tap button to the combo, mirroring energyPulseUntil's convention exactly), plus
// a ONE-SHOT "going viral" burst the moment combo first reaches its (branch-scoped)
// effective max — a latch that re-arms once combo drops back under half of that max, so
// sustained tapping doesn't spam the burst every render.
let comboPulseUntil = 0;
function pulseCombo() { comboPulseUntil = Date.now() + 400; }
let comboBurstUntil = 0;
let comboWasMaxed = false;
function checkComboViralBurst(s) {
  const max = M.effectiveComboMax(s);
  const combo = s._combo ?? 1;
  if (combo >= max - 1e-6) {
    if (!comboWasMaxed) { comboWasMaxed = true; comboBurstUntil = Date.now() + 900; announceCreator('🚀 Combo maxed — going viral!'); }
  } else if (combo < 1 + (max - 1) * 0.5) {
    comboWasMaxed = false;
  }
}
// cold -> warm -> viral color states (E12-S4-T8), reusing .iv-comfort-meter's bar shell.
function comboMeterHtml(s) {
  const combo = s._combo ?? 1;
  const max = M.effectiveComboMax(s);
  const pct = clamp(100 * (combo - 1) / (max - 1), 0, 100);
  const heat = pct >= 90 ? 'iv-combo-viral' : pct >= 40 ? 'iv-combo-warm' : 'iv-combo-cold';
  const pulsing = Date.now() < comboPulseUntil;
  const bursting = Date.now() < comboBurstUntil;
  return `<div class="iv-comfort-meter iv-combo-meter ${heat}${pulsing ? ' iv-combo-pulse' : ''}${bursting ? ' iv-combo-burst' : ''}"
      role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(0)}"
      aria-label="Combo ${combo.toFixed(2)} of max ${max.toFixed(2)}"><i style="width:${pct.toFixed(1)}%"></i></div>
    <div class="iv-sub">🔥 Combo <b>×${combo.toFixed(2)}</b> / ×${max.toFixed(2)} — tap the footer button to build it, decays over ~${C.CLOUT.comboDecaySec}s idle</div>`;
}

function renderCreator(s) {
  const card = el('creatorCard');
  const reveal = creatorRevealed(s);
  if (card) card.hidden = !reveal;
  if (!reveal) { if (el('creator')) el('creator').innerHTML = ''; return; }

  checkComboViralBurst(s);
  const rate = M.cloutRate(s, DATA);
  const branch = s.story.branch;

  let html = `<div class="iv-sub">📣 Clout <b>${fmt(s.resources.clout)}</b> <small>(+${fmt(rate)}/s)</small>
    ${branch === 'vlogger' ? `<span class="iv-badge-maxed" title="Applies whenever you have vlogger path points">Vlogger perk ×${fmt(1 + C.CLOUT.vloggerPerk)} Clout</span>` : ''}</div>`;
  html += comboMeterHtml(s);

  const pathCost = E.pathCost(s, 'vlogger');
  html += `<div class="iv-sub">🧭 Vlogger path: <b>${fmt(s.paths.vlogger.points)} pts</b>
    <small>(social tiers preview ×${fmt(M.pathMult(s.paths.vlogger.points))})</small>
    ${btn('buy-path', 'vlogger', `Focus<br><small>${fmt(pathCost)}</small>`, afford(pathCost))}</div>`;

  // content tiers: cash in, Clout out — plus a Clout-priced "Boost" (the Clout sink).
  html += '<div class="iv-tag">content tiers</div><div class="iv-amenities">';
  for (const c of DATA.content) {
    if (!E.contentUnlocked(s, c.id)) continue;
    const cost = E.contentCost(s, c.id);
    const st = s.content[c.id];
    const ownRate = st.level * c.contentRate * (1 + c.boostRate * st.boosts);
    const boostCost = E.contentBoostCost(s, c.id);
    html += `<div class="iv-btn iv-content-item" title="${c.flavor}">
      <b>${c.name}</b> <small>Lv${st.level}${st.boosts ? ` · boost ${st.boosts}` : ''}</small>
      <div class="iv-sub">+${fmt(ownRate)} clout/s</div>
      <div class="iv-row-buy">
        ${btn('buy-content', c.id, `Buy<br><small>${fmt(cost)}</small>`, afford(cost))}
        ${btn('buy-content-boost', c.id, `Boost<br><small>📣${fmt(boostCost)}</small>`, s.resources.clout >= boostCost)}
      </div>
    </div>`;
  }
  html += '</div>';

  // creator gear (tag:'gear' amenities — same generic buyAmenity flow as every other cluster).
  const gearVisible = DATA.amenities.filter(a => a.tag === 'gear' && E.amenityUnlocked(s, a.id));
  if (gearVisible.length) {
    html += '<div class="iv-tag">creator gear</div><div class="iv-amenities">';
    for (const a of gearVisible) {
      const cost = E.amenityCost(s, a.id);
      const lvl = s.amenities[a.id].level;
      html += btn('buy-amenity', a.id,
        `${a.name} <small>Lv${lvl}</small><br><small>${fmt(cost)} · +${fmt(a.comfort)}😌 +${fmt(a.contentRate)}📣/s</small>`,
        afford(cost), '', a.flavor);
    }
    html += '</div>';
  }

  // sponsor deals: the currently active buff (if any), then every deal card — greyed
  // out on cooldown, "not offered yet" until it cycles into the offer slot.
  html += '<div class="iv-tag">sponsor deals</div><div class="iv-amenities">';
  if (s.sponsors.active) {
    const d = E.sponsorData(s.sponsors.active.id);
    const remain = Math.max(0, s.sponsors.active.expiresAtSec - s.stats.runSec);
    html += `<div class="iv-btn iv-sponsor-active">🤝 <b>${d.name}</b> active — Clout ×${d.mult}
      <div class="iv-sub">${fmtTime(remain)} left</div></div>`;
  }
  for (const d of DATA.sponsors) {
    if (s.sponsors.active && s.sponsors.active.id === d.id) continue;
    const isOffer = s.sponsors.offer === d.id;
    const cooldown = E.sponsorCooldownRemaining(s, d.id);
    const eligible = isOffer && cooldown <= 0 && !s.sponsors.active;
    const label = cooldown > 0
      ? `${d.name} <small>cooldown ${fmtTime(cooldown)}</small>`
      : isOffer
        ? `${d.name} <small>×${d.mult} for ${d.durationSec}s</small>`
        : `${d.name} <small>not offered yet</small>`;
    html += btn('accept-sponsor', d.id, label, eligible, '', d.flavor);
  }
  html += '</div>';

  el('creator').innerHTML = html;
}

// ---------- Crypto Poolside Lounge (E13 "Money Works While You Tan") ----------
// Reveals once the crypto economy is genuinely in play — mirrors engine.cryptoDeskUnlocked
// exactly (path points, Beat 14, or the tier-11 band, whichever comes first — the SAME
// OR contract as creatorRevealed one section above).
function cryptoRevealed(s) { return E.cryptoDeskUnlocked(s); }

function announceCrypto(text) {
  const live = el('cryptoAnnounce');
  if (live) live.textContent = text;
}

const MARKET_PHASE_LABEL = { boom: '📈 BOOM', crash: '📉 CRASH', chop: '📊 CHOP' };
// live ticker + event banner (E13-S3-T2/T3, S10-T6): reads state.market directly (no
// bespoke recompute) — colour/heat only, no flashing text during a crash (the banner
// itself is a plain labeled div; any motion is CSS-gated behind prefers-reduced-motion,
// same convention as every other pulse/flash in this file).
function marketTickerHtml(s) {
  const mult = M.marketMult(s, DATA);
  const pct = (mult - 1) * 100;
  const arrow = pct > 0.5 ? '▲' : pct < -0.5 ? '▼' : '►';
  const heat = pct > 0.5 ? 'iv-ticker-up' : pct < -0.5 ? 'iv-ticker-down' : 'iv-ticker-flat';
  let banner = '';
  const mkt = s.market;
  if (mkt.phase !== 'calm') {
    const remain = Math.max(0, mkt.expiresAtSec - s.stats.runSec);
    const label = mkt.eventId === 'whale_boom' ? '🐋 WHALE PUMP' : (MARKET_PHASE_LABEL[mkt.phase] || mkt.phase);
    banner = `<div class="iv-market-banner iv-market-${mkt.phase}">${label} — market ×${fmt(mkt.mult)} · ${fmtTime(remain)} left</div>`;
  }
  return `<div class="iv-market-ticker ${heat}">
      <span aria-label="Market multiplier ${mult.toFixed(2)} times">${arrow} market ×${mult.toFixed(2)}</span>
    </div>${banner}`;
}

function renderCrypto(s) {
  const card = el('cryptoCard');
  const reveal = cryptoRevealed(s);
  if (card) card.hidden = !reveal;
  if (!reveal) { if (el('crypto')) el('crypto').innerHTML = ''; return; }

  const netWorth = M.cryptoNetWorth(s, DATA);
  const yieldPerSec = M.cryptoYieldPerSec(s, DATA);
  let html = marketTickerHtml(s);
  html += `<div class="iv-sub">💼 Portfolio value: <b>${fmt(M.cryptoHoldingsValue(s, DATA))}</b> · net worth (cash + portfolio): <b>${fmt(netWorth)}</b></div>`;
  html += `<div class="iv-sub">📈 Money while you tan (coin yield): <b>+${fmt(yieldPerSec)}/s</b>
    <small>(path preview ×${fmt(M.pathMult(s.paths.crypto.points))})</small></div>`;

  html += '<div class="iv-tag">holdings</div><div class="iv-amenities">';
  for (const c of DATA.crypto.coins) {
    const held = s.crypto.holdings[c.id] || 0;
    const cost = E.coinCost(s, c.id, 1);
    html += `<div class="iv-btn iv-content-item" title="${c.flavor}">
      <b>${c.name}</b> <small>${c.ticker}</small> — held <b>${fmt(held)}</b>
      <div class="iv-sub">+${fmt(c.yieldPerUnit)}/unit/s</div>
      <div class="iv-row-buy">
        ${btn('buy-coin', c.id, `Buy 1<br><small>${fmt(cost)}</small>`, afford(cost))}
        ${btn('sell-coin', c.id, 'Sell 1', held > 0)}
      </div>
    </div>`;
  }
  html += '</div>';

  html += '<div class="iv-tag">hedges (Task B: bound the downside)</div><div class="iv-amenities">';
  for (const h of DATA.crypto.hedges) {
    const owned = !!s.crypto.hedges[h.id];
    html += btn('buy-hedge', h.id,
      `${h.name} ${owned ? '✅' : ''}<br><small>${owned ? 'owned' : fmt(h.cost)} · crash damp +${(h.crashDamp * 100).toFixed(0)}%</small>`,
      owned || afford(h.cost), owned ? 'btn-primary' : '', h.flavor);
  }
  const unshakeableRank = s.ascension.tree.unshakeable || 0;
  if (unshakeableRank > 0) {
    html += `<div class="iv-sub">🛡️ Unshakeable (tree, rank ${unshakeableRank}) is already halving crash depth per rank.</div>`;
  }
  html += '</div>';

  if (s.market.eventLog && s.market.eventLog.length) {
    html += '<div class="iv-tag">recent market moves</div>';
    for (const e of s.market.eventLog) {
      html += `<div class="iv-sub">${fmtTime(e.t)} — ${e.id === 'whale_boom' ? '🐋 whale pump' : e.kind} ×${e.mult.toFixed(2)} (${e.dur}s)</div>`;
    }
  }
  el('crypto').innerHTML = html;
}

// live footer energy readout, "near the tap button" (E10-S4-T8): #energyMini is a
// persistent node created once by renderControls's template (like the aria-live
// regions above) and refreshed here on every render() cycle, since renderControls
// itself only re-renders on a speed change.
function renderEnergyMini(s) {
  const mini = el('energyMini');
  if (!mini) return;
  const max = M.energyMax(s);
  const cur = clamp(s.resources.energy, 0, max);
  const low = cur < C.ENERGY.tapCost;
  mini.textContent = `⚡ ${fmt(cur)}/${fmt(max)}`;
  mini.classList.toggle('iv-energy-low', low);
  mini.classList.toggle('iv-energy-pulse', Date.now() < energyPulseUntil);
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
function announceWellness(text) {
  const live = el('wellnessAnnounce');
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
function skillEffectReadout(s, sk, st) {
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
  if (sk.id === 'body') {
    // Body's live Comfort contribution (E10 "Body & Soul" — Task A): Comfort is an
    // UNBOUNDED sum (math.computeComfort), so there is no "ceiling" to preview here —
    // Body simply adds wBody per level, permanently, same convention as every other
    // skillEffectReadout above.
    const contrib = C.COMFORT.wBody * st.level;
    const nextContrib = C.COMFORT.wBody * (st.level + 1);
    return `<div class="iv-sub iv-skill-effect" title="Body adds directly to Comfort (unbounded — no ceiling) and fills the Energy tank that fuels tapping.">
      😌 Comfort contribution <b>+${fmt(contrib)}</b>
      <br><small>next level: +${fmt(nextContrib - contrib)} more Comfort</small></div>`;
  }
  if (sk.id === 'savvy') {
    // Savvy surfacing (E13 Task C): the live passive dCash/dt (math.savvyPassive,
    // UNCHANGED formula — see docs/coverage.md "already exists, don't rebuild") and the
    // crypto branch's perk on top of it (engine.cryptoSavvyPerk, same extracted-not-
    // retuned 0.3 the tick loop itself uses).
    const perk = E.cryptoSavvyPerk(s);
    const passive = M.savvyPassive(s) * perk;
    return `<div class="iv-sub iv-skill-effect" title="Passive cash trickle: savvy level × SAVVY_YIELD × √(lifetime cash) — sub-linear, never replaces active buys.">
      💤 Money while you tan: <b>+${fmt(passive)}/s</b> passive
      ${s.paths.crypto.points > 0 ? `<span class="iv-badge-maxed" title="Applies whenever you have crypto path points">Crypto perk ×${perk.toFixed(1)}</span>` : ''}
      <br><small>scales with √(lifetime cash) — climbs slower than active income, always supportive</small></div>`;
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
      ${skillEffectReadout(s, sk, st)}
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
      } else if (bought && (a.tag === 'tan' || a.tag === 'gym' || a.tag === 'wellness')) {
        announceWellness(`Bought ${a.name} (+${fmt(a.comfort)} Comfort)`);
        showSplashPopup(btnEl, '💪');
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
    case 'buy-coin': E.buyCoin(S, arg, 1); break;
    case 'sell-coin': E.sellCoin(S, arg, 1); break;
    case 'buy-hedge': E.buyHedge(S, arg); break;
    case 'buy-content': E.buyContent(S, arg); break;
    case 'buy-content-boost': E.buyContentBoost(S, arg); break;
    case 'accept-sponsor': {
      const ok = E.acceptSponsor(S, arg);
      if (ok) { const d = E.sponsorData(arg); announceCreator(`Sponsor deal accepted: ${d.name} — Clout ×${d.mult} for ${d.durationSec}s.`); }
      break;
    }
    case 'concierge-toggle': S.concierge.on = !S.concierge.on; break;
    case 'concierge-budget': S.concierge.budgetFrac = Number(arg); break;
    case 'concierge-reserve': {
      const v = Number(document.getElementById('conciergeReserveInput')?.value);
      if (Number.isFinite(v) && v >= 0) S.concierge.reserveFloor = v;
      break;
    }
    case 'concierge-category': {
      const wl = S.concierge.whitelist;
      const i = wl.indexOf(arg);
      if (i >= 0) wl.splice(i, 1); else wl.push(arg);
      break;
    }
    case 'buy-acc': E.buyAccommodation(S); break;
    case 'buy-dest': E.buyDestination(S, arg); break;
    case 'visit-dest': E.visitDestination(S, arg); break;
    case 'buy-transport': E.buyTransport(S, arg); break;
    case 'story-choice': { const [id, set] = arg.split('|'); E.applyStoryChoice(S, Number(id), set); break; }
    case 'ascend': if (P.ascend(S)) { setState(S); } break;
    case 'buy-node': P.buyNode(S, arg); break;
    case 'respec': if (confirm('Refund all Legacy and clear the tree?')) P.respec(S); break;
    case 'click': { const gain = E.click(S); showTapPopup(gain); if (gain > 0) { pulseEnergy(); pulseCombo(); } break; }
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
    // crypto debug hooks (E13-S10-T8): force-boom/crash, reseed, +Savvy XP — QA-only,
    // bypassing the seeded scheduler on purpose so downstream testing doesn't need to
    // grind the market's own cadence for real.
    case 'dbg-crypto-boom':
      S.market.phase = 'boom'; S.market.eventId = 'debug_boom'; S.market.mult = 4;
      S.market.expiresAtSec = S.stats.runSec + 30; break;
    case 'dbg-crypto-crash':
      S.market.phase = 'crash'; S.market.eventId = 'debug_crash'; S.market.mult = 0.35;
      S.market.expiresAtSec = S.stats.runSec + 30; break;
    case 'dbg-crypto-reseed':
      S.market.seed = Date.now() >>> 0; S.market.cursor = 0;
      S.market.phase = 'calm'; S.market.mult = 1; S.market.nextEventT = S.stats.runSec; break;
    case 'dbg-savvy': S.skills.savvy.xp += 5000; break;
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
    ${rep.conciergeBought ? `<div class="iv-offline-row">🛎️ The concierge bought <b>${rep.conciergeBought}</b> item${rep.conciergeBought > 1 ? 's' : ''} for <b>${fmt(rep.conciergeSpent)}</b></div>` : ''}
    ${rep.sponsorsExpired ? `<div class="iv-offline-row">📴 <b>${rep.sponsorsExpired}</b> sponsor deal${rep.sponsorsExpired > 1 ? 's' : ''} wrapped up while you were away</div>` : ''}
    ${rep.cryptoYield ? `<div class="iv-offline-row">📈 <b>+${fmt(rep.cryptoYield)}</b> from your portfolio tanning without you${rep.marketEvents ? ` — ${rep.marketEvents} market event${rep.marketEvents > 1 ? 's' : ''} survived` : ''}</div>` : ''}
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
    <span id="energyMini" class="iv-sub iv-energy-inline"
      title="Energy fuels a bigger tap — Body raises the tank size and its regen rate. Never required to progress."></span>
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
    ${btn('dbg-path', '', '+10 path pts (all)')}
    ${btn('dbg-crypto-boom', '', 'force boom')}
    ${btn('dbg-crypto-crash', '', 'force crash')}
    ${btn('dbg-crypto-reseed', '', 'reseed market')}
    ${btn('dbg-savvy', '', '+5000 savvy xp')}`;
}
