// audio.js — The Sound of Summer (Living-World W4, docs/08-living-world.md point 12).
// Dependency-free WebAudio synth: oscillators + gain envelopes only, no assets, no bundler. INERT
// outside a browser — `hasAudio` is false whenever there's no `window`/AudioContext (Node/
// selftest), so EVERY exported cue below is a no-op then: importing this module never throws, and
// nothing here can affect selftest's determinism or any pinned golden (cosmetic, never read by
// engine.js/math.js). The AudioContext itself is created lazily on the FIRST user pointerdown/
// keydown — never on import/boot — so this never trips a browser autoplay-policy violation.
const hasAudio = typeof window !== 'undefined'
  && (typeof AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined');

let ctx = null;                 // the lazily-created AudioContext
let boundState = null;          // the live state ref — reads settings.sound for the master gain

// bindAudio(state): call once at boot (and again on any state swap — import/hard reset/ascend
// keeps the SAME object reference via prestige.js, so usually no re-bind is even needed) so cues
// can read the player's own sound settings. A no-op call before this (boundState null) just plays
// at the default volume — never throws.
export function bindAudio(state) { boundState = state; }

function ensureContext() {
  if (!hasAudio) return null;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
if (hasAudio) {
  const arm = () => ensureContext();
  window.addEventListener('pointerdown', arm, { once: true });
  window.addEventListener('keydown', arm, { once: true });
}

function masterVolume() {
  const snd = boundState && boundState.settings && boundState.settings.sound;
  if (snd && snd.on === false) return 0;
  const v = snd && typeof snd.volume === 'number' ? snd.volume : 0.35;
  return Math.max(0, Math.min(1, v));
}

// One short oscillator + a simple exponential attack/decay envelope — the shared primitive every
// cue below composes from. No-op instantly (never even touches the AudioContext) when audio is
// unavailable or muted, so a silent player pays zero cost for this module existing.
function tone({ freq = 440, dur = 0.15, type = 'sine', gain = 0.2, delay = 0 } = {}) {
  const vol = masterVolume();
  if (!hasAudio || vol <= 0) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * vol), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// C major pentatonic — chime() climbs it with magnitude (wrapping octaves) so bigger milestones
// feel like they're climbing higher without ever landing on a dissonant interval.
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0];

// ---- the six cues (each <= ~0.4s; quiet by default — seasoning, not a soundtrack) ----
export function blip() {
  tone({ freq: 660, dur: 0.08, type: 'square', gain: 0.12 });
}
export function chime(step = 0) {
  const s = Math.max(0, Math.floor(step));
  const idx = s % PENTATONIC.length;
  const octave = Math.floor(s / PENTATONIC.length) % 3;
  tone({ freq: PENTATONIC[idx] * Math.pow(2, octave), dur: 0.2, type: 'triangle', gain: 0.16 });
}
export function fanfare() {
  tone({ freq: 392.0, dur: 0.1, type: 'triangle', gain: 0.18 });
  tone({ freq: 523.25, dur: 0.1, type: 'triangle', gain: 0.18, delay: 0.09 });
  tone({ freq: 659.25, dur: 0.18, type: 'triangle', gain: 0.2, delay: 0.18 });
}
// the goat: a comic little wobble — two quick, slightly-detuned sawtooth blips.
export function bleat() {
  tone({ freq: 220, dur: 0.09, type: 'sawtooth', gain: 0.15 });
  tone({ freq: 180, dur: 0.12, type: 'sawtooth', gain: 0.15, delay: 0.07 });
}
export function jingle() {
  tone({ freq: 523.25, dur: 0.09, type: 'sine', gain: 0.14 });
  tone({ freq: 659.25, dur: 0.13, type: 'sine', gain: 0.14, delay: 0.08 });
}
export function swell() {
  tone({ freq: 220, dur: 0.35, type: 'sine', gain: 0.22 });
  tone({ freq: 330, dur: 0.32, type: 'sine', gain: 0.16, delay: 0.03 });
}
