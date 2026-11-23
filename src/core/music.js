// Background music (music round, 2026-11-15). Aaron (decisions e1115-12, e1115-13): "I want all those 4 to be ones that
// randomly cycle throughout gameplay, never the same one twice in a row", "C418s approach of 1-3 minutes between is
// fine", "Glass garden should be always be the very first song to play", orbit-loaf "playable in normal game only after
// the galaxy loaf scene has played". Tracks: assets/audio/music/ (assets/audio/SOURCES.md).
//
// How it plays: one <audio> element, its src swapped from song to song, streamed through a MediaElementAudioSourceNode,
// a gain of its own and the sound control (mute x volume, mirrored from src/core/audio.js onChange) on an AudioContext
// of its own, made in the same first gesture as the page's. Its own context because Aaron (e1116-02): "the music
// shouldnt stop when you open the achievements panel or the grimoire": an open book holds the page's clock still
// (src/core/freeze.js -> audio.suspend), which stops every room loop and scheduled scene sound, as it should; the music
// is not on that clock, so it plays on. Streaming, not decoding: a 2-3.5 minute song decoded into an AudioBuffer costs 40-80 MB on a phone; the
// element holds a few seconds, and pausing it keeps its place, so a scene that takes the stage and gives it back
// resumes the song exactly where it stopped. Short clips with a moment to hit (the 24.6 s blast-off) stay decoded
// buffers on the audio clock (src/eggs/bread.js).
//
// When: the first song (always glass-garden: "always" read as the first song of every visit, i.e. every page load)
// starts `firstDelay` s after both the doors are open and the first gesture has made the AudioContext. After each song
// a random `gap` of silence (uniform, 60-180 s), then a random song of the rotation, never one of the last two played
// (p8, so two songs can't flip-flop; fewer unlocked songs: src/core/music-pick.js). The songs played are remembered for
// the visit only (holds, pauses and the books keep them; a reload starts again with glass-garden, as it always does).
// Holds: site.music.hold(reason, { fade }) returns a release. Holds stack; while any is held the music fades out over
// `fade` s and pauses; when the last is released it resumes from the same place, fading in. A gap under way is frozen
// while held (it counts only time in the room) and goes on after. The page's clock held still pauses it at once, by
// reason: the freeze of "flip sideways" ('turn') and the cake's error page ('party'), and any other suspension (flappy
// in a hidden tab); a freeze held only by the books ('book': the grimoire, the achievements) leaves it playing. A
// hidden tab fades it out and pauses it. Each resumes like a hold.
// iPhone: both contexts are made and resumed inside the first gesture (a gesture also resumes the music's if iOS ever
// leaves it suspended); the 'ambient' audio session is page-wide, so the ring/silent switch mutes the music like every
// sound (hence the "turn silence off for sound" card, src/ui/silence.js). The element is load()-ed inside the first
// gesture (as Howler does) so iOS lets it play later without one.
// Off: ?music=0. Under automation it is off unless ?music=1 (as ?doors=1 / ?fs=1), so no other check hears it.
// ?musicgap=a,b sets the gap (seconds) for checks; site.music.setGap(a, b) the same at run time.
import { wallClock } from './page-scheduler.js';
import { pickNext, NO_REPEAT } from './music-pick.js';

export const MUSIC = {
  dir: 'assets/audio/music/',
  rotation: ['glass-garden', 'sequencer-sky', 'phase-cat', 'orbit-loaf'],
  first: 'glass-garden',
  // track -> the store key that unlocks it (set by the galaxy loaf scene when its star twinkles, src/eggs/bread.js)
  unlocks: { 'orbit-loaf': 'music.orbitLoaf' },
  gap: [60, 180],          // seconds of silence between songs, uniform random (C418's 1-3 minutes)
  firstDelay: 2,           // seconds after the doors are open and the first gesture
  // The music's own gain into the master bus. The songs are about -18 LUFS (3 s RMS about -16 to -20 dBFS); the
  // effects are levelled to a loudest-100-ms RMS of -22 dBFS and played at .5 (the taps, the cast's wind: -28 dBFS).
  // At .12 (-18.4 dB) the songs' typical 3 s RMS sits at -35 to -38 dBFS and their loudest 3 s at -31 to -34: every
  // effect stands 6-10 dB over the loudest bar and about 10 over the typical one (measured: checks/music.js).
  gain: 0.12,
  // seconds: a hold's fade out (the 360, the scenes), Flappy's quick one, the fade back in, a new song's first touch,
  // a hidden tab
  fade: { hold: 0.8, quick: 0.35, resume: 1.0, start: 0.05, hidden: 0.3 },
};

// The next song: never one of the last two played (src/core/music-pick.js). Exported for the checks.
export { pickNext, NO_REPEAT } from './music-pick.js';

export function createMusic(site) {
  const { stage, audio, store } = site, C = MUSIC;
  const want = stage.opt('music');
  const off = want === '0' || (want !== '1' && !!navigator.webdriver);
  let gap = [...C.gap];
  const gapOpt = stage.opt('musicgap');
  if (gapOpt) { const [a, b = a] = gapOpt.split(',').map(Number); if (a >= 0 && b >= a) gap = [a, b]; }

  let el = null, gain = null, ctx = null, control = null, meter = null, unlocked = false;
  // the freeze reasons the music plays through (e1116-02: the grimoire and the achievements are the 'book' hold)
  const PLAYS_THROUGH = new Set(['book']);
  let phase = off ? 'off' : 'waiting';          // waiting (for the first song) | playing | gap | off
  let track = null, last = null, ext = null, doorsOpen = false, gestured = false, firstTimer = 0;
  let gapLeft = 0, gapEnds = 0, gapTimer = 0, gapLength = 0;
  let pauseTimer = 0, fadingOut = false, pausedAt = null, blocked = false;
  const holds = new Map();                      // token -> reason
  let frozen = false, hidden = document.hidden;
  const history = [], resumes = [], log = [];
  const say = (s) => { log.push(`${(performance.now() / 1000).toFixed(2)} ${s}`); if (log.length > 60) log.shift(); };

  const format = () => (ext ??= (new Audio().canPlayType('audio/mp4; codecs="mp4a.40.2"') ? 'm4a' : 'mp3'));
  const url = (name, type = format()) => new URL(`../../${C.dir}${name}.${type}`, import.meta.url).href;
  const pool = () => C.rotation.filter((t) => isUnlocked(t));
  const isUnlocked = (t) => !C.unlocks[t] || !!store.get(C.unlocks[t]);
  const quiet = () => holds.size > 0 || frozen || hidden;
  const recent = () => history.slice(-NO_REPEAT).map((h) => h.track);   // the songs the next pick keeps out, oldest first

  function element() {
    if (el) return el;
    el = new Audio(); el.preload = 'auto';
    el.addEventListener('ended', ended);
    el.addEventListener('error', failed);
    return el;
  }
  // Its own context, made when the page's is (inside the first gesture, src/main.js): element -> gain (fades, MUSIC.gain)
  // -> control (the sound control's mute x volume x the music volume) -> meter -> out.
  function makeContext() {
    if (ctx) return ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    control = ctx.createGain(); meter = ctx.createAnalyser(); meter.fftSize = 2048;
    control.connect(meter).connect(ctx.destination);
    // the sound control's mute x volume x the settings screen's music volume (p8 settings lane)
    const level = ({ muted, volume, levels }) => (muted ? 0 : volume * (levels?.music ?? 1));
    audio.onChange((s) => { control.gain.setTargetAtTime(level(s), ctx.currentTime, 0.015); });
    control.gain.value = level(audio.state());
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return ctx;
  }
  function wire() {
    if (gain) return true;
    if (!makeContext()) return false;
    element();
    const source = ctx.createMediaElementSource(el);
    gain = ctx.createGain(); gain.gain.value = 0;
    source.connect(gain).connect(control);
    return true;
  }
  function setGain(v) { if (!gain) return; gain.gain.cancelScheduledValues(0); gain.gain.value = v; }
  function ramp(to, seconds) {
    if (!gain) return;
    const g = gain.gain, t = ctx.currentTime;
    g.cancelScheduledValues(0); g.setValueAtTime(g.value, t);
    if (seconds > 0) g.linearRampToValueAtTime(to, t + seconds); else g.setValueAtTime(to, t);
  }
  function play(fade) {
    blocked = false;
    const p = el.play();
    p?.catch?.((e) => { if (e?.name === 'NotAllowedError') { blocked = true; say('blocked: waits for a gesture'); } });
    ramp(C.gain, fade);
  }

  // ---- the songs and the gaps ----
  function start(name) {
    if (!name || !wire()) return;
    track = name; phase = 'playing'; pausedAt = null; fadingOut = false;
    history.push({ track: name, at: performance.now(), gap: gapLength });
    say('start ' + name);
    el.src = url(name); setGain(0);
    play(C.fade.start);
  }
  function ended() {
    if (phase !== 'playing') return;
    say('ended ' + track);
    last = track; track = null; phase = 'gap'; pausedAt = null; fadingOut = false;
    gapLength = gapLeft = gap[0] + Math.random() * (gap[1] - gap[0]);
    armGap();
  }
  function failed() {
    if (phase !== 'playing' || !track) return;
    if (el.src.endsWith('.m4a')) { say('m4a failed, mp3'); const at = el.currentTime || 0; el.src = url(track, 'mp3'); el.currentTime = at; if (!quiet()) play(C.fade.start); return; }
    say('could not play ' + track); ended();
  }
  function armGap() {
    wallClock.clearTimeout(gapTimer); gapTimer = 0;
    if (phase !== 'gap' || quiet()) return;
    gapEnds = performance.now() + gapLeft * 1000;
    gapTimer = wallClock.setTimeout(nextSong, gapLeft * 1000);
  }
  function freezeGap() {
    if (phase !== 'gap' || !gapTimer) return;
    wallClock.clearTimeout(gapTimer); gapTimer = 0;
    gapLeft = Math.max(0, (gapEnds - performance.now()) / 1000);
  }
  function nextSong() {
    gapTimer = 0;
    if (phase !== 'gap') return;
    if (quiet()) { gapLeft = 0; return; }
    start(pickNext(pool(), recent()));
  }
  function maybeFirst() {
    if (phase !== 'waiting' || !doorsOpen || !gestured || !stage.loaded || firstTimer) return;
    firstTimer = wallClock.setTimeout(() => {
      firstTimer = 0;
      if (phase !== 'waiting') return;
      if (quiet()) return;                       // tried again when the room is free (update)
      start(C.first);
    }, C.firstDelay * 1000);
  }

  // ---- silence and back ----
  function silence(fade) {
    if (!el || pausedAt !== null) return;
    // the clock held still (or no fade asked): at once, even in the middle of a fade (the rest of it would go unheard)
    if (!(fade > 0) || frozen) { wallClock.clearTimeout(pauseTimer); pauseNow(); return; }
    if (fadingOut) return;
    fadingOut = true; ramp(0, fade);
    pauseTimer = wallClock.setTimeout(pauseNow, fade * 1000 + 30);
  }
  function pauseNow() {
    pauseTimer = 0; fadingOut = false;
    if (!el.paused) el.pause();
    pausedAt = el.currentTime; setGain(0);
    say(`paused ${track} at ${pausedAt.toFixed(2)}`);
  }
  function resume(fade) {
    if (!el) return;
    if (pauseTimer) { wallClock.clearTimeout(pauseTimer); pauseTimer = 0; }
    const wasFading = fadingOut; fadingOut = false;
    if (pausedAt !== null) {
      resumes.push({ track, pausedAt, from: el.currentTime, at: performance.now() });
      say(`resume ${track} from ${el.currentTime.toFixed(2)}`);
      pausedAt = null;
    } else if (wasFading) say(`back before it paused ${track} ${el.currentTime.toFixed(2)}`);
    if (el.paused || blocked) play(fade); else ramp(C.gain, fade);
  }
  function update(fade = C.fade.hold) {
    if (phase === 'off') return;
    const q = quiet();
    if (phase === 'playing') { if (q) silence(fade); else resume(C.fade.resume); }
    else if (phase === 'gap') { if (q) freezeGap(); else armGap(); }
    else if (phase === 'waiting' && !q) maybeFirst();
  }

  // ---- what tells it ----
  if (!off) {
    audio.onContext(() => { makeContext(); gestured = true; maybeFirst(); });
    // Paused at once while the page's clock is held still for a reason other than the books (e1116-02).
    const freezeStops = () => {
      const r = audio.suspendReasons?.() ?? [];
      return r.some((x) => x !== 'freeze') || (r.includes('freeze') && (site.freeze?.reasons ?? []).some((x) => !PLAYS_THROUGH.has(x)));
    };
    const refreeze = () => { const f = freezeStops(); if (f !== frozen) { frozen = f; update(0); } };
    audio.onSuspend?.(refreeze);
    site.freeze?.onChange?.(refreeze);
    frozen = freezeStops();
    document.addEventListener('visibilitychange', () => { hidden = document.hidden; update(C.fade.hidden); });
    // iOS: an element load()-ed inside a gesture may play later without one (Howler's unlock); a song refused for want
    // of a gesture (blocked) tries again on the next one.
    const gesture = () => {
      if (!unlocked) { unlocked = true; element(); if (!el.src) el.load(); }
      if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {});
      if (blocked && phase === 'playing' && !quiet()) play(C.fade.resume);
    };
    for (const t of ['pointerup', 'touchend', 'keydown', 'click']) addEventListener(t, gesture, { capture: true, passive: true });
  }

  function hold(reason = 'scene', { fade = C.fade.hold } = {}) {
    const token = {};
    holds.set(token, reason); say('hold ' + reason);
    update(fade);
    let released = false;
    return () => {
      if (released) return; released = true;
      holds.delete(token); say('release ' + reason);
      update();
    };
  }

  stage.debugExtra.push(() => {
    if (phase === 'off') return 'music   off';
    const s = api.state, pos = s.track ? `${s.track} ${s.position.toFixed(1)}/${(s.duration || 0).toFixed(1)} s` : '-';
    const g = s.phase === 'gap' ? `  next in ${s.gapLeft.toFixed(0)} s of ${s.gapLength.toFixed(0)}` : '';
    return `music   ${s.phase}${s.held ? ' (held: ' + s.holds.join(', ') + ')' : ''}  ${pos}${g}  gap ${gap[0]}-${gap[1]} s  recent ${s.recent.join(', ') || '-'}`;
  });

  const api = {
    config: C, hold, pickNext, pool, isUnlocked,
    // the doors are open (src/main.js, after shell.reveal())
    begin() { doorsOpen = true; maybeFirst(); },
    unlock(name) { const k = C.unlocks[name]; if (k && !store.get(k)) { store.set(k, true); store.flush?.(); say('unlocked ' + name); } },
    setGap(a, b = a) { gap = [a, b]; if (phase === 'gap' && gapLeft > b) { freezeGap(); gapLeft = Math.min(gapLeft, b); armGap(); } },
    // checks and #debug: the song ends now, as though it had played out (the gap follows); the gap ends now
    next() { if (phase === 'playing') { el.pause(); ended(); } },
    skipGap() { if (phase === 'gap') { gapLeft = 0; armGap(); } },
    get element() { return el; }, get gain() { return gain; }, get context() { return ctx; }, get control() { return control; },
    // the music's own meter (after the sound control): RMS of the last 43 ms, 0 = silence
    level() { if (!meter) return 0; const a = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(a); let s = 0; for (const v of a) s += v * v; return Math.sqrt(s / a.length); },
    get state() {
      const gl = phase !== 'gap' ? 0 : gapTimer ? Math.max(0, (gapEnds - performance.now()) / 1000) : gapLeft;
      return { phase, track, last, recent: recent(), position: el?.currentTime ?? 0, duration: el?.duration || 0, paused: el?.paused ?? true,
        level: gain?.gain.value ?? 0, held: quiet(), holds: [...holds.values(), ...(frozen ? ['frozen'] : []), ...(hidden ? ['hidden'] : [])],
        fading: fadingOut, pausedAt, gapLeft: gl, gapLength, gap: [...gap], blocked, format: el ? format() : null,
        unlocked: C.rotation.filter(isUnlocked) };
    },
    get history() { return [...history]; }, get resumes() { return [...resumes]; }, get log() { return [...log]; },
  };
  return api;
}
