// tools/uxcheck.mjs — the committed QA sweep (U5, docs/UX-plan.md). Zero deps, Node ≥22.
// Boots the game at a handful of representative save-state checkpoints (built by driving the
// REAL engine, the same way js/dev/selftest.mjs and js/dev/harness.mjs do), loads each one in
// headless Chromium over the DevTools Protocol, and asserts the Reveal Doctrine (R1–R8) holds:
// no future-system spoilers, locked stickers are "???", the debug drawer stays behind the gear,
// mystery ladder rungs never leak a name, and nothing throws a console error. Run: `npm run uxcheck`.
//
// This tool only READS the game (js/*, css/game.css) — it never edits it. Findings about the
// game itself are reported at the end, not "fixed" here (that's ui.js/game.css's owner's job).
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

import { CONFIG as C } from '../js/config.js';
import { DATA } from '../js/data/index.js';
import * as ST from '../js/state.js';
import * as E from '../js/engine.js';
import * as P from '../js/prestige.js';
import { fmtTime } from '../js/util.js';
import { play } from '../js/dev/harness.mjs';   // the same vetted greedy policy the balance harness uses

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CHROMIUM = '/opt/pw-browsers/chromium';
const SHOT_DIR = process.env.SCRATCH_DIR
  ? path.join(process.env.SCRATCH_DIR, 'uxcheck')
  : path.join(os.tmpdir(), 'uxcheck');

let fails = 0;
const results = [];   // { check, stage, pass, detail }
function record(check, stage, pass, detail) {
  results.push({ check, stage, pass, detail });
  if (!pass) fails++;
  console.log(`  ${pass ? '✓' : '✗ FAIL'} [${check}]${stage ? ` (${stage})` : ''} ${detail}`);
}

// =====================================================================================
// 1. a tiny static file server (no python, no framework) — serves the repo root so
//    index.html's relative js/css/assets references all resolve.
// =====================================================================================
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
function startStaticServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent(req.url.split('?')[0]);
        let rel = urlPath === '/' ? '/index.html' : urlPath;
        const full = path.normalize(path.join(REPO_ROOT, rel));
        if (!full.startsWith(REPO_ROOT)) { res.writeHead(403); res.end(); return; }   // no path traversal
        const buf = await readFile(full);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
        res.end(buf);
      } catch (e) { res.writeHead(404); res.end('not found'); }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// =====================================================================================
// 2. launch headless Chromium with a remote-debugging port, wait for it to answer.
// =====================================================================================
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)); });
    srv.on('error', reject);
  });
}
async function launchChromium(port) {
  const child = spawn(CHROMIUM, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1',
    '--window-size=1280,900', 'about:blank',
  ], { stdio: 'ignore' });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); return child; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
  child.kill('SIGKILL');
  throw new Error('Chromium never opened its DevTools port');
}

// =====================================================================================
// 3. a minimal CDP client over the native WebSocket — one connection per page target.
// =====================================================================================
async function openPage(port) {
  // Chromium ≥ ~130 rejects GET on /json/new (and /json/close) as an XSS hardening
  // measure — "Using unsafe HTTP verb GET… supports only PUT verb." PUT is required.
  const created = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(created.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve(), { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined) {
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map(a => a.value ?? a.description ?? String(a)).join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      consoleErrors.push(`${d.text}: ${d.exception?.description || d.exception?.value || ''}`);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  // index.html pulls Spectre.css + Google Fonts from public CDNs (unrelated to the game logic
  // this tool checks). This sandbox's outbound network goes through an allowlisted proxy that
  // doesn't cover those hosts, so left alone those requests just hang/retry and make every
  // navigation slow and flaky. Block them outright — the game reads no data from them.
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['*unpkg.com*', '*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  return {
    send, consoleErrors,
    async close() { try { ws.close(); } catch {} try { await fetch(`http://127.0.0.1:${port}/json/close/${created.id}`, { method: 'PUT' }); } catch {} },
  };
}

// wait for a few render ticks: poll a known DOM element until it (and the footer controls, which
// render last in main.js's bootstrap) are non-empty, or give up after ~5s.
async function waitForRender(page) {
  for (let i = 0; i < 50; i++) {
    const r = await page.send('Runtime.evaluate', {
      expression: `!!(document.getElementById('accommodation') && document.getElementById('accommodation').innerHTML.length > 0 && document.getElementById('controls') && document.getElementById('controls').innerHTML.length > 0)`,
      returnByValue: true,
    });
    if (r.result?.value) return true;
    await new Promise(res => setTimeout(res, 100));
  }
  return false;
}

// The in-page collector: visible text (checkVisibility-aware, so position:fixed chrome like the
// footer/toasts is correctly counted as visible — offsetParent alone would wrongly hide it),
// locked-sticker contents, and which debug-drawer controls exist in the DOM at all.
function collectPageData() {
  function isVisible(elm) {
    if (elm.hasAttribute('hidden')) return false;
    if (typeof elm.checkVisibility === 'function') return elm.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
    return elm.offsetParent !== null || getComputedStyle(elm).position === 'fixed';
  }
  function ancestorsVisible(elm) {
    let cur = elm;
    while (cur && cur !== document.body) { if (!isVisible(cur)) return false; cur = cur.parentElement; }
    return true;
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) { const p = n.parentElement; return p && ancestorsVisible(p) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; },
  });
  const chunks = [];
  let n;
  while ((n = walker.nextNode())) chunks.push(n.textContent);
  const visibleText = chunks.join(' ').replace(/\s+/g, ' ').trim();

  const lockedStickers = Array.from(document.querySelectorAll('.iv-sticker-locked')).map(elm => ({
    boldText: (elm.querySelector('b')?.textContent || '').trim(),
    fullText: elm.textContent.replace(/\s+/g, ' ').trim(),
    title: elm.getAttribute('title') || '',
    ariaLabel: elm.getAttribute('aria-label') || '',
  }));
  const accLockedRows = Array.from(document.querySelectorAll('.iv-acc-locked')).map(elm => elm.textContent.replace(/\s+/g, ' ').trim());

  const debugActions = ['export', 'import', 'reset', 'set-speed', 'set-speed-custom', 'toggle-debug'];
  const debugControlsPresent = debugActions.filter(a => document.querySelector(`[data-action="${a}"]`));
  const gearPresent = !!document.querySelector('[data-action="toggle-devtools"]');

  return { visibleText, lockedStickers, accLockedRows, debugControlsPresent, gearPresent };
}
async function collectStage(page) {
  const r = await page.send('Runtime.evaluate', { expression: `(${collectPageData.toString()})()`, returnByValue: true });
  return r.result.value;
}

// =====================================================================================
// 4. the spoiler-term list (Reveal Doctrine R1, docs/UX-plan.md §2) — whole-word,
//    case-insensitive. Terms ending in a non-word char (NG+) skip the trailing boundary,
//    since \b can never match right after a symbol.
// =====================================================================================
const SPOILER_TERMS = [
  'Monaco', 'Dubai', 'Maldives', 'Aspen', 'St. Barths', 'Legend', 'Legacy', 'Ascension', 'Ascend',
  'Butler', 'Marina', 'Heliport', 'Patron', 'Crypto', 'NG+', 'Island', 'Resort', 'Concierge', 'Yacht', 'Jet',
];
function termRegex(term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const trailingBoundary = /\w$/.test(term) ? '\\b' : '';
  return new RegExp(`\\b${esc}${trailingBoundary}`, 'i');
}

// =====================================================================================
// 5. reduced-motion static check on css/game.css — simple grep-level heuristic (per task):
//    every `animation:` (non-"none") declaration, and every MOTION transition (transform/
//    left/top/right/bottom — the properties that actually trigger vestibular discomfort;
//    color/width/background fades are conventionally exempt, and that's the pattern the
//    file already follows for its guarded rules), must have a same-selector override
//    inside a `@media (prefers-reduced-motion: reduce)` block.
// =====================================================================================
function extractReducedMotionBlocks(css) {
  const blocks = [];
  let idx = 0;
  while (true) {
    const start = css.indexOf('@media', idx);
    if (start === -1) break;
    const header = /^@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/.exec(css.slice(start));
    if (!header) { idx = start + 6; continue; }
    const braceStart = start + header[0].length - 1;
    let depth = 1, i = braceStart + 1;
    while (i < css.length && depth > 0) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    blocks.push(css.slice(start, i));
    idx = i;
  }
  return blocks;
}
function checkReducedMotion(rawCss) {
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, ' ');   // strip comments before parsing selectors
  const reducedBlocks = extractReducedMotionBlocks(css);
  const reducedText = reducedBlocks.join('\n');
  let base = css;
  for (const b of reducedBlocks) base = base.replace(b, '');
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  const misses = [];
  let m;
  while ((m = ruleRe.exec(base))) {
    const selector = m[1].trim();
    const body = m[2];
    const anim = /animation:\s*([^;]+);/.exec(body);
    const trans = /transition:\s*([^;]+);/.exec(body);
    const hasMotionAnim = anim && !/^none\b/.test(anim[1].trim());
    const hasMotionTrans = trans && /\b(transform|left|top|right|bottom)\b/.test(trans[1]);
    if (!hasMotionAnim && !hasMotionTrans) continue;
    if (!reducedText.includes(selector)) {
      misses.push({ selector, rule: (anim || trans)[1].trim(), kind: hasMotionAnim ? 'animation' : 'transition' });
    }
  }
  return misses;
}

// =====================================================================================
// 6. build the stage checkpoints by driving the REAL engine (like selftest/harness) —
//    no hand-forged fields. One continuous greedy playthrough (harness's own `play()`
//    policy), snapshotting state the moment each checkpoint's condition first holds.
//    Predicates are checked AFTER tick() but BEFORE play() each step, so "crossroads
//    pending" catches beat 6 the instant it fires — before play() auto-picks a branch.
// =====================================================================================
function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

function buildStages() {
  const stages = [];
  const s = ST.newGame();
  stages.push({ id: 'fresh', label: 'Fresh start — the bus stop', tier: s.accommodation.tier,
    note: 'ST.newGame(), untouched (no localStorage save at all — a real first visit)', state: null });

  const checkpoints = [
    { id: 'first-motel', label: 'First motel (accommodation tier 1)', test: st => st.accommodation.tier >= 1 },
    { id: 'hostel-crossroads-pending', label: 'Hostel + Crossroads pending (beat 6 seen, branch unchosen)',
      test: st => st.story.seen.includes(6) && st.story.branch === 'neutral' },
    { id: 'post-branch', label: 'Post-branch (a path chosen, Growth tab born)', test: st => st.story.branch !== 'neutral' },
    { id: 'first-pool', label: 'First pool (accommodation tier 6)', test: st => st.accommodation.tier >= 6 },
    { id: 'beach-destinations', label: 'Beach resort + destinations active (tier 7+, ≥1 destination owned)',
      test: st => st.accommodation.tier >= 7 && DATA.destinations.some(d => st.destinations[d.id].owned) },
    { id: 'sail-staff', label: 'Sail-shaped hotel + staff hired (tier 12+)',
      test: st => st.accommodation.tier >= 12 && E.hiredStaffCount(st) > 0 },
    { id: 'seven-stars', label: 'Seven Stars era (tier 14+, beat 21)', test: st => st.accommodation.tier >= 14 },
  ];
  let cpIdx = 0;
  const dt = 5;
  const CHECKPOINT_CAP_SEC = 12 * 3600;
  const butler = DATA.staff.find(d => d.id === 'butler');
  let t = 0;
  for (; t <= CHECKPOINT_CAP_SEC && cpIdx < checkpoints.length; t += dt) {
    E.tick(s, dt);
    // play() (harness's vetted greedy policy) never hires staff — state.js documents that as
    // deliberate (it must not move the fitted harness curve). Reaching the "sail-staff" stage
    // for real needs one extra, real engine call: hire the butler once unlocked+affordable.
    if (E.staffUnlocked(s) && E.hiredStaffCount(s) === 0 && s.resources.cash >= butler.hireCost) E.hireStaff(s, 'butler');
    while (cpIdx < checkpoints.length && checkpoints[cpIdx].test(s)) {
      const cp = checkpoints[cpIdx];
      stages.push({ id: cp.id, label: cp.label, tier: s.accommodation.tier, note: `t=${fmtTime(t)}`, state: cloneState(s) });
      cpIdx++;
    }
    play(s);
  }
  for (let i = cpIdx; i < checkpoints.length; i++)
    console.warn(`  ⚠ stage "${checkpoints[i].id}" not reached within ${fmtTime(CHECKPOINT_CAP_SEC)} of sim — skipping (not fabricated).`);

  // Post-ascension / NG+ — reached via the real prestige API once the run genuinely qualifies.
  let ascSec = 0;
  const ASCEND_CAP_SEC = 20 * 3600;
  while (!P.canAscend(s) && ascSec < ASCEND_CAP_SEC) { E.tick(s, dt); play(s); ascSec += dt; }
  if (P.canAscend(s)) {
    P.ascend(s);
    stages.push({ id: 'post-ascension', label: 'Post-ascension (Legacy earned, run reset to the shed)',
      tier: s.accommodation.tier, note: `via P.ascend() at t=${fmtTime(t + ascSec)}`, state: cloneState(s) });
    if (P.startNgPlus(s)) {
      stages.push({ id: 'new-game-plus', label: 'New Game+ (world hardened)', tier: s.accommodation.tier,
        note: 'via P.startNgPlus() immediately after the first ascension', state: cloneState(s) });
    } else {
      console.warn('  ⚠ stage "new-game-plus" not reachable via P.startNgPlus() right after ascension — skipping.');
    }
  } else {
    console.warn(`  ⚠ stage "post-ascension"/"new-game-plus" not reached within ${fmtTime(ASCEND_CAP_SEC)} extra sim — skipping.`);
  }
  return stages;
}

// =====================================================================================
// main
// =====================================================================================
async function main() {
  console.log('\n=== idleVaction uxcheck — the no-spoiler QA sweep ===\n');
  await mkdir(SHOT_DIR, { recursive: true });

  console.log('[stages] simulating checkpoints with the real engine (harness.play() policy)…');
  const stages = buildStages();
  for (const st of stages) console.log(`  · ${st.id.padEnd(26)} tier ${st.tier}  ${st.note}`);

  console.log('\n[css] reduced-motion static check on css/game.css…');
  const cssText = await readFile(path.join(REPO_ROOT, 'css', 'game.css'), 'utf8');
  const rmMisses = checkReducedMotion(cssText);
  if (rmMisses.length === 0) {
    record('reduced-motion', null, true, 'every motion animation/transition has a same-selector prefers-reduced-motion override');
  } else {
    for (const miss of rmMisses)
      record('reduced-motion', null, false, `${miss.selector} — ${miss.kind}: ${miss.rule} — no prefers-reduced-motion override found`);
  }

  const port = await getFreePort();
  const server = await startStaticServer();
  const serverPort = server.address().port;
  console.log(`\n[server] serving ${REPO_ROOT} on http://127.0.0.1:${serverPort}`);
  const chromium = await launchChromium(port);
  console.log(`[chromium] headless, DevTools on ${port}`);
  const shotPaths = [];

  try {
    for (const stage of stages) {
      const page = await openPage(port);
      try {
        if (stage.state) {
          const source = `localStorage.setItem(${JSON.stringify(C.SAVE_KEY)}, ${JSON.stringify(JSON.stringify(stage.state))});`;
          await page.send('Page.addScriptToEvaluateOnNewDocument', { source });
        }
        await page.send('Page.navigate', { url: `http://127.0.0.1:${serverPort}/index.html` });
        const rendered = await waitForRender(page);
        record('render', stage.id, rendered, rendered ? 'game rendered within 5s' : 'timed out waiting for #accommodation/#controls to populate');
        if (!rendered) continue;

        const data = await collectStage(page);
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        const shotPath = path.join(SHOT_DIR, `${stage.id}.png`);
        await writeFile(shotPath, Buffer.from(shot.data, 'base64'));
        shotPaths.push(shotPath);

        // ---- check 2: locked stickers render exactly "???" — no real name in text/title/aria ----
        let stickerFail = false;
        for (const sk of data.lockedStickers) {
          const leak = DATA.achievements.find(a => sk.fullText.includes(a.name) || sk.title.includes(a.name) || sk.ariaLabel.includes(a.name));
          if (sk.boldText !== '???' || leak) {
            stickerFail = true;
            record('locked-stickers', stage.id, false, `sticker headline "${sk.boldText}" (title="${sk.title}" aria="${sk.ariaLabel}")${leak ? ` leaks achievement name "${leak.name}"` : ' is not exactly "???"'}`);
          }
        }
        if (!stickerFail) record('locked-stickers', stage.id, true, `${data.lockedStickers.length} locked sticker(s), all "???"`);

        // ---- check 3: debug drawer (R8) — absent from the DOM entirely until the gear is clicked ----
        if (data.debugControlsPresent.length === 0) {
          record('debug-drawer', stage.id, true, `no debug controls in DOM (gear present: ${data.gearPresent})`);
        } else {
          record('debug-drawer', stage.id, false, `debug controls present without opening the gear: ${data.debugControlsPresent.join(', ')}`);
        }

        // ---- check 4: mystery rungs — no accommodation-tier name beyond (tier+1) leaks anywhere ----
        const allowedIdx = stage.tier + 1;
        const leakedNames = DATA.accommodation.filter((a, i) => i > allowedIdx && termRegex(a.name).test(data.visibleText));
        if (leakedNames.length === 0) {
          record('mystery-rungs', stage.id, true, `no tier name beyond #${allowedIdx} (${DATA.accommodation[allowedIdx]?.name || 'n/a'}) leaks`);
        } else {
          record('mystery-rungs', stage.id, false, `future tier name(s) visible: ${leakedNames.map(a => a.name).join(', ')}`);
        }

        // ---- check 1: the spoiler sweep — FRESH stage only ----
        if (stage.id === 'fresh') {
          const hits = SPOILER_TERMS.filter(term => termRegex(term).test(data.visibleText));
          if (hits.length === 0) record('spoiler-sweep', stage.id, true, 'no future-system term found in visible text at fresh start');
          else record('spoiler-sweep', stage.id, false, `spoiler term(s) visible at fresh start: ${hits.join(', ')}`);
        }

        // ---- console errors at every stage ----
        if (page.consoleErrors.length === 0) record('console', stage.id, true, 'no console errors/exceptions');
        else for (const err of page.consoleErrors) record('console', stage.id, false, err);
      } finally {
        await page.close();
      }
    }
  } finally {
    chromium.kill('SIGTERM');
    server.close();
  }

  console.log(`\n[screenshots] ${shotPaths.length} saved under ${SHOT_DIR}`);
  for (const p of shotPaths) console.log(`  · ${p}`);

  // ---- machine-readable summary ----
  console.log('\n=== uxcheck summary ===');
  const byCheck = {};
  for (const r of results) (byCheck[r.check] ||= { pass: 0, fail: 0 }), (r.pass ? byCheck[r.check].pass++ : byCheck[r.check].fail++);
  for (const [check, n] of Object.entries(byCheck)) console.log(`  ${n.fail === 0 ? 'PASS' : 'FAIL'}  ${check}: ${n.pass} pass / ${n.fail} fail`);
  console.log(`\n  TOTAL: ${results.length - fails}/${results.length} checks passed.`);
  console.log(JSON.stringify({ total: results.length, failed: fails, results }, null, 0));

  process.exit(fails > 0 ? 1 : 0);
}

main().catch(e => { console.error('uxcheck crashed:', e); process.exit(1); });
