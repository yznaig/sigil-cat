// The audio bus. Every sound on the page goes through one master gain, so the sound control (mute and volume,
// remembered on the device) reaches all of it. Clips are fetched and decoded after the cat is on screen, then played
// on one AudioContext made inside the first gesture.
//   audio.play('sfx/ding')            a clip by its name in SITE.sounds (or a path / a [m4a, mp3] list)
//   audio.loop(src, { gain })         a seamless loop (two copies crossfading), returns { gain(v, seconds), stop() }
//   audio.setMuted(true)  audio.setVolume(0.6)  audio.level   the sound control
//   audio.impact(item, { material, size, strength, sleeping, restoring })  debounced world contacts (off: e1111-58)
//   audio.play(src, { radio: true }) / audio.loop(src, { radio: true })   through the old-radio voice (Butterman)
//   audio.tone({ ... })               optional synthesized notes on the same bus
// iPhone: the page asks for the 'ambient' session, so the ring/silent switch mutes it; Butterman switches to
// 'playback' for his song and back (decision e1107-37).
import { store } from './store.js';

const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
const decoder = Offline ? new Offline(1, 1, 44100) : null;
const buffers = new Map();     // key -> AudioBuffer | null (failed)
const loading = new Map();     // key -> Promise
let ctx = null, master = null, analyser = null, safety = null, finalMeter = null, names = {};
let restoreDepth = 0, impactGroups = {}, impactBags = new Map();
const lastImpact = new Map();
const counts = { clips: 0, loops: 0, tones: 0, impacts: 0, suppressedImpacts: 0, suppressedRestore: 0, silentContacts: 0, radioVoices: 0 };
const suspensions = new Set();
let suspensionReady = Promise.resolve();
const park = () => { if (ctx && ctx.state !== 'closed') suspensionReady = ctx.suspend().catch(() => {}); };
let muted = !!store.get('sound.muted', false), volume = store.get('sound.volume', 0.8);
const listeners = new Set();

const resolve = (src) => (typeof src === 'string' && names[src] ? names[src] : src);
const keyOf = (src) => { const s = resolve(src); return Array.isArray(s) ? s[0] : s; };
// impacts: the material/size file groups for world contacts; {} (Aaron, e1111-58: "just remove collision noises")
// makes every contact silent and nothing of the impact set is ever fetched.
export function setNames(map, impacts = {}) { names = map; impactGroups = impacts || {}; impactBags = new Map(); }

// Both the page and the montage reach this final safety stage. Linear below -5.2 dBFS;
// the soft knee reserves headroom when many items collide in the same frame.
// .14 also leaves room for 4x oversampling-filter ringing on the retained transients;
// the 32-voice stereo stress mix measures below -1 dBFS at 44.1 and 48 kHz.
export function safetyCurve() {
  return Float32Array.from({ length: 65537 }, (_, i) => {
    const x = i / 32768 - 1, a = Math.abs(x);
    return Math.sign(x) * (a <= .55 ? a : .55 + .14 * (1 - Math.exp(-(a - .55) / .14)));
  });
}
export const destination = () => safety;
export const diagnostics = () => ({ ...counts, restoring: restoreDepth > 0 });
export function silenceDuring(task) {
  restoreDepth++;
  let result;
  try { result = task(); } catch (e) { restoreDepth--; throw e; }
  if (result?.then) return Promise.resolve(result).finally(() => { restoreDepth--; });
  restoreDepth--; return result;
}

// Loads wait for this, if set: nothing competes with the cat for the network before he is on screen.
let gate = null;
export function holdUntil(promise) { gate = promise; }

export function load(src) {
  const key = keyOf(src);
  if (loading.has(key)) return loading.get(key);
  const p = (async () => {
    if (gate) await gate;
    const list = resolve(src);
    for (const path of Array.isArray(list) ? list : [list]) {
      try {
        const r = await fetch(new URL('../../' + path, import.meta.url));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const buf = await decoder.decodeAudioData(await r.arrayBuffer());
        buffers.set(key, buf);
        return buf;
      } catch { /* try the next format */ }
    }
    buffers.set(key, null);
    console.info('audio: could not load', key);
    return null;
  })();
  loading.set(key, p);
  return p;
}
export const loadAll = (list) => Promise.all(list.map(load));
export const buffer = (src) => buffers.get(keyOf(src)) || null;
export const status = (src) => (buffers.has(keyOf(src)) ? (buffers.get(keyOf(src)) ? 'loaded' : 'failed') : 'pending');

// The AudioContext, made only inside a user gesture (browsers warn otherwise). `force` skips that test (checks).
export function context(force = false) {
  const ua = navigator.userActivation;
  if (!ctx && !force && ua && !ua.isActive && !ua.hasBeenActive) return null;
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try { if (navigator.audioSession && navigator.audioSession.type === 'auto') navigator.audioSession.type = 'ambient'; } catch { /* Safari only */ }
    ctx = new Ctx();
    master = ctx.createGain(); master.gain.value = muted ? 0 : volume;
    analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
    safety = ctx.createWaveShaper(); safety.curve = safetyCurve(); safety.oversample = '4x';
    finalMeter = ctx.createAnalyser(); finalMeter.fftSize = 2048;
    master.connect(analyser); analyser.connect(safety); safety.connect(finalMeter); finalMeter.connect(ctx.destination);
  }
  if (suspensions.size && ctx.state === 'running') park();
  if (!suspensions.size && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {});
  return ctx;
}
// Freeze the audio clock, including scheduled source endings, without changing saved mute/volume.
// context() cannot undo this on a key or tap while the mock unload owns the suspension.
export function suspend(reason) {
  suspensions.add(reason);
  park();
  let released=false;
  return () => {
    if(released)return;released=true;suspensions.delete(reason);
    if (!suspensions.size && ctx && ctx.state !== 'closed') {
      // A mute/slider ramp can be frozen halfway through. Settle the control before
      // any resumed sample; wait for an in-flight suspend even on an immediate skip.
      const settleLevel = () => {
        master.gain.cancelScheduledValues(0);
        // Direct assignment also updates the intrinsic value while the clock is stopped.
        master.gain.value = muted ? 0 : volume;
      };
      settleLevel();
      suspensionReady.then(() => {
        if (!suspensions.size && ctx.state !== 'closed') { settleLevel(); ctx.resume().catch(() => {}); }
      });
    }
  };
}
export const output = () => master;

// ---- the sound control ----
function apply() {
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.015);
  for (const f of listeners) f({ muted, volume });
}
export function setMuted(v) { muted = !!v; store.set('sound.muted', muted); apply(); }
export function setVolume(v) { volume = Math.min(1, Math.max(0, v)); store.set('sound.volume', volume); if (volume > 0 && muted) { muted = false; store.set('sound.muted', false); } apply(); }
export const onChange = (f) => { listeners.add(f); f({ muted, volume }); };
export const state = () => ({ muted, volume });
// Page-bus RMS before final peak protection (0 = silence); the montage has its own mute meter.
export function level() {
  if (!analyser) return 0;
  const a = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(a);
  let s = 0;
  for (const v of a) s += v * v;
  return Math.sqrt(s / a.length);
}
export function peak() {
  if (!finalMeter) return 0;
  const a = new Float32Array(finalMeter.fftSize); finalMeter.getFloatTimeDomainData(a);
  return a.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
}

// Contact adapter for the world branch. Preload when a material enters the scene.
// Never queue a missed contact while decoding: a late impact is worse than silence.
export function loadImpacts(material) {
  return loadAll(Object.values(impactGroups[material] || {}).flat());
}
export function impact(item, { material = 'wood', size = 'small', strength = 1, sleeping = false, restoring = false } = {}) {
  if (!impactGroups[material]) { counts.silentContacts++; return null; }
  const id = item?.id ?? item;
  if (id == null || sleeping || restoring || item?.body?.isSleeping?.() || restoreDepth || muted || !(strength > 0)) {
    counts.suppressedImpacts++; return null;
  }
  const list = impactGroups[material]?.[size];
  if (!list?.length) return null;
  const now = performance.now();
  if (now - (lastImpact.get(id) ?? -Infinity) < 80) { counts.suppressedImpacts++; return null; }
  const key = material + '/' + size;
  if (!impactBags.has(key)) impactBags.set(key, bag(list));
  const src = impactBags.get(key)();
  if (!buffer(src)) { loadImpacts(material); return null; }
  const voice = play(src, { gain: .25 + .5 * Math.min(1, strength) });
  if (!voice) return null;
  lastImpact.set(id, now); counts.impacts++;
  // IDs may be temporary physics objects. Retain only the short debounce history.
  for (const [key, at] of lastImpact) if (now - at > 1000) lastImpact.delete(key);
  voice.soundName = src;
  return voice;
}

// Play a loaded clip now (or at `when` on the audio clock). Returns the source node (its gain node at .gain), or null.
export function play(src, { gain = 1, rate = 1, when = 0, offset = 0, duration, fade = 0, dest, radio = false } = {}) {
  if (restoreDepth) { counts.suppressedRestore++; return null; }
  const c = context();
  const buf = buffer(src);
  if (!c || !buf) return null;
  // Chrome can stop processing a silent, disconnected gain node. Its pending
  // mute ramp then starts on the next source, despite the audio clock advancing.
  // Settle saved mute before that source's first sample; unmute still ramps normally.
  if (muted) { master.gain.cancelScheduledValues(0); master.gain.value = 0; }
  const s = c.createBufferSource(), g = c.createGain();
  s.buffer = buf; s.playbackRate.value = rate; g.gain.value = gain;
  s.connect(g).connect(radio ? radioInput(c, dest || master) : dest || master);
  s.addEventListener('ended', () => { s.disconnect(); g.disconnect(); }, { once: true });
  const at = Math.max(when || 0, c.currentTime);
  const len = duration ?? Math.max(0.01, buf.duration - offset);
  s.start(at, Math.max(0, offset), len);
  counts.clips++;
  if (radio) s.radio = radioVoice(c, s, g, at, at + len / rate, rate);
  if (fade > 0 && duration !== undefined) {           // fade the cut, so a trimmed clip never clicks
    const end = at + len / rate;
    g.gain.setValueAtTime(gain, Math.max(at, end - fade));
    g.gain.linearRampToValueAtTime(0.0001, end);
  }
  s.gain = g;
  return s;
}

// A loop with no audible seam: the clip plays as overlapping copies, each fading in over the last one's tail, so
// neither the file's edges nor an mp3's padding can click. Starts silent unless `gain` is given.
export function loop(src, { gain = 0, cross = 0.6, trim = [0, 0], radio = false } = {}) {
  if (restoreDepth) { counts.suppressedRestore++; return null; }
  const c = context();
  const buf = buffer(src);
  if (!c || !buf) return null;
  const out = c.createGain(); out.gain.value = gain; out.connect(radio ? radioInput(c, master) : master);
  const bed = radio ? radioVoice(c, null, out, c.currentTime, Infinity, 1) : null;
  const from = trim[0], len = buf.duration - trim[0] - trim[1], period = len - cross;
  let next = c.currentTime + 0.02, timer = 0, alive = true;
  const live = new Set();
  function schedule() {
    if (!alive) return;
    while (next < c.currentTime + 1.5) {
      const s = c.createBufferSource(), g = c.createGain();
      s.buffer = buf; s.connect(g).connect(out); bed?.wow(s, 1);
      g.gain.setValueAtTime(0, next); g.gain.linearRampToValueAtTime(1, next + cross);
      g.gain.setValueAtTime(1, next + period); g.gain.linearRampToValueAtTime(0, next + len);
      s.start(next, from, len);
      live.add(s); s.onended = () => live.delete(s);
      next += period;
    }
    timer = setTimeout(schedule, 500);
  }
  schedule();
  counts.loops++;
  return {
    node: out,
    get value() { return out.gain.value; },
    gain(v, seconds = 0.2) { out.gain.setTargetAtTime(v, c.currentTime, Math.max(0.005, seconds / 3)); },
    stop(seconds = 0.2) {
      alive = false; clearTimeout(timer);
      out.gain.setTargetAtTime(0, c.currentTime, Math.max(0.005, seconds / 3));
      setTimeout(() => { for (const s of live) try { s.stop(); } catch { /* done */ } bed?.stop(); out.disconnect(); }, seconds * 1000 + 300);
    },
  };
}

// ---- the old radio (Aaron, e1111-58: "the buttaman audios should have an old radio effect on them") ----
// A 1930s-50s tabletop AM set, at runtime so Aaron's files stay untouched: the AM channel and a small paper cone pass
// roughly 300 Hz-3.4 kHz (4th-order Butterworth each side), the cabinet adds a little body near 600 Hz and the cone a
// resonant honk near 1.5 kHz; the output valve rounds the peaks with a mild, slightly asymmetric soft clip (even
// harmonics); a faint band-limited hiss with a few soft crackles rides under each voice at its own gain; a slow
// 0.55 Hz wow of +-0.12% in pitch (cosine phase, so the clip is never more than 0.35 ms ahead or behind). Nothing is
// delayed: sources start exactly when scheduled, and the filters' group delay is well under a millisecond
// (checks/sounds-radio.js measures it). One shared chain per destination; `buildRadio` also serves offline renders.
export const RADIO = {
  highpass: 300, lowpass: 3400, body: { hz: 600, db: 1.5, q: 0.9 }, cone: { hz: 1500, db: 4, q: 1.4 },
  // drive .55: about 5-6% distortion on his loudest 400 ms (residual -25 dB), none to speak of on quiet lines.
  // makeup .6: the same loudest-400 ms level as the dry recording (checks/sounds-radio.js), peaks about -3.7 dBFS.
  drive: 0.55, bias: 0.12, makeup: 0.6,
  // The bed sits about 40 dB under his singing (hiss) with soft ticks ~30 dB under his peaks, 1.5 a second.
  hiss: 0.0035, crackles: 1.5, crackle: [0.006, 0.025], bedSeconds: 7.3, wow: { hz: 0.55, depth: 0.0012 },
};
export function radioCurve(drive = RADIO.drive, bias = RADIO.bias) {
  // tanh around a small bias: unity slope at rest, a soft shoulder above ~0.5, and the bias leaves a little even order.
  const t0 = Math.tanh(bias), slope = drive * (1 - t0 * t0);
  return Float32Array.from({ length: 4097 }, (_, i) => { const x = i / 2048 - 1; return (Math.tanh(drive * x + bias) - t0) / slope; });
}
export function buildRadio(c, out) {
  const biquad = (type, frequency, Q, gain = 0) => {
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = frequency; f.Q.value = Q; f.gain.value = gain; return f;
  };
  const R = RADIO, input = c.createGain();
  const chain = [biquad('highpass', R.highpass, 0.5412), biquad('highpass', R.highpass, 1.3066),
    biquad('peaking', R.body.hz, R.body.q, R.body.db), biquad('peaking', R.cone.hz, R.cone.q, R.cone.db)];
  const valve = c.createWaveShaper(); valve.curve = radioCurve(); valve.oversample = '2x';
  // After the valve: the output transformer drops again what the bias makes below the band (DC and difference tones).
  chain.push(valve, biquad('highpass', R.highpass, 0.7071), biquad('lowpass', R.lowpass, 0.5412), biquad('lowpass', R.lowpass, 1.3066));
  const makeup = c.createGain(); makeup.gain.value = R.makeup; chain.push(makeup);
  input.connect(chain[0]); for (let i = 1; i < chain.length; i++) chain[i - 1].connect(chain[i]); makeup.connect(out);
  return input;
}
// The bed: hiss whose level drifts slowly, plus sparse soft crackles. Seeded, so every visit hears the same set.
export function radioBed(c) {
  const R = RADIO, n = Math.round(R.bedSeconds * c.sampleRate), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  let seed = 1112026; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let drift = 0.85;
  for (let i = 0; i < n; i++) {
    if (i % 480 === 0) drift = Math.min(1, Math.max(0.6, drift + (rnd() - 0.5) * 0.04));
    d[i] = (rnd() * 2 - 1) * R.hiss * drift;
  }
  for (let k = 0, count = Math.round(R.bedSeconds * R.crackles); k < count; k++) {
    const at = Math.floor(rnd() * (n - 400)), amp = (R.crackle[0] + rnd() * (R.crackle[1] - R.crackle[0])) * (rnd() < 0.5 ? -1 : 1);
    const tau = c.sampleRate * (0.0004 + rnd() * 0.0012);
    for (let j = 0; j < 6 * tau && at + j < n; j++) d[at + j] += amp * Math.exp(-j / tau) * (j % 2 && j < 3 ? -0.6 : 1);
  }
  return b;
}
const radios = new WeakMap();
let bedBuffer = null, cosine = null;
function radioInput(c, out) {
  if (!radios.has(out)) radios.set(out, buildRadio(c, out));
  return radios.get(out);
}
// Per voice: the bed into the voice's own gain (so it follows that voice's level, fades and mute), and the wow on
// its playback rate. Returns { wow(source, rate), stop() } for loops, whose copies are added later.
function radioVoice(c, source, gainNode, start, end, rate) {
  counts.radioVoices++;
  if (!bedBuffer || bedBuffer.sampleRate !== c.sampleRate) bedBuffer = radioBed(c);
  const bed = c.createBufferSource(), level = c.createGain();
  bed.buffer = bedBuffer; bed.loop = true;
  level.gain.setValueAtTime(0, start); level.gain.linearRampToValueAtTime(1, start + 0.03);
  bed.connect(level).connect(gainNode);
  bed.start(start, Math.random() * RADIO.bedSeconds);
  if (Number.isFinite(end)) bed.stop(end);
  if (!cosine) cosine = c.createPeriodicWave(new Float32Array([0, 1]), new Float32Array([0, 0]));
  const lfo = c.createOscillator(); lfo.setPeriodicWave(cosine); lfo.frequency.value = RADIO.wow.hz; lfo.start(start);
  if (Number.isFinite(end)) lfo.stop(end);
  const wow = (s, r) => {
    const depth = c.createGain(); depth.gain.value = RADIO.wow.depth * r; lfo.connect(depth).connect(s.playbackRate);
    s.addEventListener('ended', () => depth.disconnect(), { once: true });
  };
  if (source) wow(source, rate);
  bed.addEventListener('ended', () => { bed.disconnect(); level.disconnect(); lfo.disconnect(); }, { once: true });
  const stop = () => { try { bed.stop(); lfo.stop(); } catch { /* done */ } };
  // A clip cut short (a scene stopped or restarted) takes its hiss with it.
  if (source) source.addEventListener('ended', stop, { once: true });
  return { bed, lfo, wow, stop };
}

// A synthesized note on the bus: { freq, type, at (s from now), dur, gain, slide (Hz to glide to), attack, dest }.
export function tone({ freq = 440, type = 'sine', at = 0, dur = 0.2, gain = 0.2, slide = null, attack = 0.005, dest } = {}) {
  if (restoreDepth) { counts.suppressedRestore++; return null; }
  const c = context();
  if (!c) return null;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest || master);
  o.start(t); o.stop(t + dur + 0.05);
  counts.tones++;
  return o;
}

// A shuffle bag: every clip once before any repeats, never the same twice in a row.
export function bag(list) {
  let order = [], last = -1;
  return () => {
    if (!order.length) {
      order = list.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]];
      }
      if (order.length > 1 && order[order.length - 1] === last) order.unshift(order.pop());
    }
    last = order.pop();
    return list[last];
  };
}
