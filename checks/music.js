// music.js (music lane, music round 2026-11-15; decisions e1115-12, e1115-13). Run with ?music=1&musicgap=0.4,0.8
// (the music is off under automation otherwise) and --then checks/music-reload.js.
// The background music: glass-garden first; never the same song twice in a row over a long run (the picker 20000 times,
// and 40 real song changes through the element with the gap shrunk); the gap is drawn from 60-180 s by default and
// honours the shrunk one (measured); the music goes through the master bus (mute silences it) and sits under the effects
// (numbers noted); the 360, Flappy (quickly), the freeze, a hidden tab, the galaxy, Butterman and the cake's error page
// pause it and give it back at the same place; a gap is frozen while held; orbit-loaf is locked until the galaxy loaf
// scene has played, which plays its song from its first moment and lands the twinkle at 23.0 s on the audio clock
// (+-0.1 s, the twinkle heard on the bus), after which orbit-loaf is in the rotation (the reload keeps it: music-reload).
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
const { MUSIC, pickNext } = await import(new URL('src/core/music.js', document.baseURI));
const wait = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));        // page timers stop under flappy / the freeze
const poll = async (f, ms = 15000, step = 20) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wait(step); } return false; };
const M = site.music, ctx = audio.context(true), dB = (x) => 20 * Math.log10(Math.max(x, 1e-9));
const st = () => M.state, pos = () => M.element?.currentTime ?? 0;
cat.auto = false; cat.setButter(false, 'quiet');

// ---- 1. the first song ----
check('music on under ?music=1, gap from the address', st().phase !== 'off' && st().gap[0] === 0.4 && st().gap[1] === 0.8, JSON.stringify(st().gap));
await poll(() => st().phase === 'playing' && pos() > 0.3, 20000);
check('music the first song is glass-garden', st().track === 'glass-garden' && M.history[0]?.track === 'glass-garden', `${M.history.map((h) => h.track).join(', ')} (${st().format})`);
check('music orbit-loaf is locked before the galaxy loaf scene', !M.isUnlocked('orbit-loaf') && !st().unlocked.includes('orbit-loaf') && !store.get('music.orbitLoaf'), st().unlocked.join(', '));

// ---- 2. through the master bus, and under the effects ----
// 43 ms RMS windows, every ~25 ms: the effects on the page bus (post master, pre safety); the music on its own meter
// (its own context since e1116-02, after its mirror of the sound control: the same scale)
async function rms(seconds, meter = audio.level, step = 25) {
  const v = [], t = performance.now(); while (performance.now() - t < seconds * 1000) { v.push(meter()); await wait(step); } return v;
}
const ml = () => M.level();
const meanSq = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0) / Math.max(1, v.length));
M.element.currentTime = 60; await poll(() => pos() > 60.3, 5000);       // into the song proper
const music = await rms(4, ml);
check('music is heard (its own meter, after the sound control)', meanSq(music) > 1e-4, `4 s RMS ${dB(meanSq(music)).toFixed(1)} dBFS at volume ${audio.state().volume}`);
audio.setMuted(true); await wait(400);
const mutedLevel = Math.max(...await rms(0.6, ml));
check('music mute silences it (the sound control)', mutedLevel < 1e-5 && !M.element.paused, `level ${mutedLevel.toExponential(1)} while the song plays on at ${pos().toFixed(1)} s`);
audio.setMuted(false); await wait(300);
check('music unmute brings it back', Math.max(...await rms(0.5, ml)) > 1e-4);
{ // volume scales it: the mirrored control follows the slider (and the page bus's master)
  audio.setVolume(0.4); await wait(300); const at4 = M.control.gain.value, master4 = audio.output().gain.value;
  audio.setVolume(0.8); await wait(300);
  check('music volume scales it with the page (mirrored mute x volume)', Math.abs(at4 - 0.4) < 0.01 && Math.abs(master4 - 0.4) < 0.01 && Math.abs(M.control.gain.value - 0.8) < 0.01,
    `control ${at4.toFixed(3)} at volume .4 (master ${master4.toFixed(3)}), ${M.control.gain.value.toFixed(3)} at .8`);
  check('music plays on a context of its own (e1116-02)', !!M.context && M.context !== audio.context() && M.context.state === 'running');
}
// the effects at their own play gains, the music held out of the way (sampled the same way)
const holdFx = M.hold('check-effects', { fade: 0 }); await wait(250);
// an effect's peak window: sampled every ~6 ms, so its loudest 43 ms is not missed between samples
async function peakOf(play) { play(); const v = await rms(0.9, audio.level, 6); return Math.max(...v); }
const S = site.config.sounds;
const bonk = await peakOf(() => audio.play('tap-bonk', { gain: S.volume }));
const wind = await peakOf(() => audio.play('cast-wind', { gain: 0.5 }));
holdFx(); await poll(() => !st().held && !M.element.paused, 4000); await wait(1200);
const loud = Math.max(...music), typical = meanSq(music);
note('music level vs effects', `music gain ${MUSIC.gain}: glass-garden 60-64 s RMS ${dB(typical).toFixed(1)} dBFS, loudest 43 ms ${dB(loud).toFixed(1)}; ` +
  `tap bonk peak ${dB(bonk).toFixed(1)}, cast wind peak ${dB(wind).toFixed(1)} dBFS (all after master volume ${audio.state().volume})`);
check('music sits under the effects (each effect >= 6 dB over the music\'s 4 s RMS, and over its loudest 43 ms)', dB(bonk) - dB(typical) >= 6 && dB(wind) - dB(typical) >= 6 && bonk > loud && wind > loud,
  `bonk +${(dB(bonk) - dB(typical)).toFixed(1)} dB, wind +${(dB(wind) - dB(typical)).toFixed(1)} dB`);

// ---- 3. holds: pause and resume at the same place ----
async function holdCase(name, enter, leave, { reason, fade = MUSIC.fade.hold, during } = {}) {
  await poll(() => st().phase === 'playing' && !st().held && !M.element.paused && st().level > MUSIC.gain * 0.9, 8000);
  const track = st().track, at = pos(), atWall = performance.now(), n = M.resumes.length;
  await enter();
  const paused = await poll(() => st().pausedAt !== null, 6000);
  const p = st().pausedAt, why = st().holds.join(', ');
  // where the song was when the hold came (enter() may load first, as Flappy does): from the music's own log
  const held = M.log.filter((l) => / hold /.test(l) && parseFloat(l) * 1000 >= atWall - 20).at(-1), heldAt = held ? at + (parseFloat(held) * 1000 - atWall) / 1000 : at;
  await during?.();
  await wait(600);
  const still = pos();
  await leave();
  const resumed = await poll(() => M.resumes.length > n && !M.element.paused, 30000);
  const r = M.resumes.at(-1) || {};
  await wait(500);
  const playing = !M.element.paused && pos() > (r.from ?? 0) && st().track === track;
  check(`music ${name}: pauses (fading ${fade} s) and resumes the same song at the same place`,
    paused && (!reason || why.includes(reason)) && Math.abs(still - p) < 0.05 && resumed && r.track === track && Math.abs(r.from - r.pausedAt) <= 0.25 && playing &&
    Math.abs(p - heldAt - fade) < Math.max(0.3, fade * 0.6),
    `${track}: held at ${heldAt.toFixed(2)} s, paused at ${p?.toFixed(2)} (${why}), resumed from ${r.from?.toFixed(2)} (paused ${r.pausedAt?.toFixed(2)}), playing ${playing}`);
}
// the 360: its cutscene and riser (src/eggs/noscope-video.js)
await holdCase('the 360', () => { E.noscope.fire(); }, async () => { await wait(1200); site.eggs.noscopeVideo.stop(); }, { reason: '360', fade: 0 });
// Flappy: quickly
await poll(() => !input.locked, 8000);
await holdCase('flappy', async () => { await E.bird.replay(); await poll(() => !!document.querySelector('#bird-screen'), 8000); },
  async () => { await wait(800); E.bird.screen?.close(false); await poll(() => !document.querySelector('#bird-screen'), 8000); }, { reason: 'flappy', fade: MUSIC.fade.quick });
// the trailer screen (YOU JUST LOST THE GAME) uses the same screen: its hold, by the module directly
const screenMod = await import(new URL('src/flappy/screen.js', document.baseURI));
await holdCase('the trailer screen', () => { window.__trailer = screenMod.openScreen(site, 'trailer', () => {}); },
  async () => { window.__trailer.close(true); await poll(() => !document.querySelector('#bird-screen'), 8000); }, { reason: 'trailer' });
// the freeze of "flip sideways" (and any reason but the books): the page's clock stops, so at once
let releaseFreeze = null;
await holdCase('the flip-sideways freeze', () => { releaseFreeze = site.freeze.hold('turn'); }, () => releaseFreeze(), { reason: 'frozen', fade: 0 });
// e1116-02 ("the music shouldnt stop when you open the achievements panel or the grimoire"): a book's freeze leaves the
// music playing on its own clock, while the page's clock (room loops, scheduled scene sounds) holds still
for (const book of ['grimoire', 'achievements']) {
  await poll(() => st().phase === 'playing' && !st().held && !M.element.paused && st().level > MUSIC.gain * 0.9, 8000);
  const n = M.resumes.length, track = st().track, p0 = pos();
  site.books.open(book);
  const opened = await poll(() => site.books.showing === book && site.freeze.frozen, 5000);
  const c0 = audio.context().currentTime; await wait(300); const pageClock = audio.context().currentTime - c0;
  const p1 = pos(); await wait(1500); const p2 = pos();
  const heard = meanSq(await rms(0.5, ml));
  check(`music ${book} open: the music plays on, its place moving, the page clock held`, opened && !M.element.paused && !st().held && p2 - p1 > 1.2 && heard > 1e-4 && pageClock < 0.05 && st().track === track,
    `${track} ${p0.toFixed(2)} -> ${p2.toFixed(2)} s with the book open (${(p2 - p1).toFixed(2)} s in 1.5 s), level ${dB(heard).toFixed(1)} dBFS; page clock moved ${pageClock.toFixed(3)} s; freeze ${site.freeze.reasons.join(',')}`);
  if (book === 'grimoire') {   // the turn on top of an open book still stops it, and gives it back
    const rel = site.freeze.hold('turn'); const stopped = await poll(() => M.element.paused && st().pausedAt !== null, 2000); const at = st().pausedAt;
    await wait(500); rel(); const back = await poll(() => !M.element.paused && M.resumes.length > n, 3000);
    check('music the turn over an open book pauses it at once, and its release (book still open) resumes it in place', stopped && back && Math.abs(M.resumes.at(-1).from - at) <= 0.25 && site.freeze.reasons.join() === 'book',
      `paused at ${at?.toFixed(2)}, resumed from ${M.resumes.at(-1)?.from.toFixed(2)}`);
    await wait(1300);   // its fade back in
  }
  const k = M.resumes.length, q0 = pos();
  site.books.close(); await poll(() => !site.books.showing && !site.freeze.frozen, 5000); await wait(600);
  check(`music ${book} closed: nothing changes (no pause, no resume, still playing on)`, !M.element.paused && M.resumes.length === k && pos() > q0 + 0.3 && st().track === track && !st().fading && st().level > MUSIC.gain * 0.9,
    `${q0.toFixed(2)} -> ${pos().toFixed(2)} s`);
}
// a hidden tab (simulated: document.hidden and its event)
const hiddenDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
const setHidden = (v) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => v }); document.dispatchEvent(new Event('visibilitychange')); };
await holdCase('a hidden tab', () => setHidden(true), () => { delete document.hidden; setHidden(false); delete document.hidden; }, { reason: 'hidden', fade: MUSIC.fade.hidden });
check('music the hidden-tab stand-in is put back', Object.getOwnPropertyDescriptor(document, 'hidden') === undefined && !!hiddenDesc && document.hidden === false);
// the galaxy (its hum), Butterman (his song)
await holdCase('the galaxy', () => { E.galaxy.open('check'); }, async () => { await wait(E.galaxy.wayIn * 1000 + 300); E.galaxy.skip(); await poll(() => !E.galaxy.isOpen, 15000); }, { reason: 'galaxy' });
await holdCase('butterman', () => { E.butterman.play({ scene: 'butter', forceAudio: true }); }, async () => { await wait(1500); E.butterman.stop(); }, { reason: 'butterman' });
// the cake's error page (its freeze too), through to the party
await poll(() => !input.locked && !E.party.state.effects, 15000);
await holdCase('the cake\'s error page', () => { window.__party = E.party.eatCake(); }, async () => { await window.__party; }, { reason: 'party', fade: 0 });   // its freeze stops the clock on the same frame
// two holds stack: the music comes back only when the last lets go
{
  await poll(() => st().phase === 'playing' && !st().held && !M.element.paused, 8000);
  const a = M.hold('a', { fade: 0 }), b = M.hold('b', { fade: 0 }); await wait(300);
  a(); a(); await wait(400); const stillHeld = M.element.paused && st().holds.join() === 'b';
  b(); await poll(() => !M.element.paused, 4000);
  check('music holds stack (a release twice counts once)', stillHeld && !M.element.paused && !st().held);
}

// ---- 4. the gap: frozen while held ----
{
  M.setGap(2, 2); M.next();
  const t0 = performance.now(); await wait(700);
  const h = M.hold('gap-check'); await wait(1500); h();
  await poll(() => st().phase === 'playing', 8000);
  const took = (M.history.at(-1).at - t0) / 1000;
  check('music a gap is frozen while held, then goes on', took > 3.3 && took < 4.4, `2 s gap + 1.5 s held: next song after ${took.toFixed(2)} s`);
}

// ---- 5. the rotation over a long run (orbit-loaf locked) ----
async function run(n, gap) {
  M.setGap(...gap); const got = [], gaps = [];
  await poll(() => st().phase === 'playing', 8000); const start = st().track;   // the song playing as the run begins
  for (let i = 0; i < n; i++) {
    await poll(() => st().phase === 'playing', 8000);
    const before = M.history.length; M.next(); const ended = performance.now(), length = st().gapLength;
    await poll(() => M.history.length > before, 8000);
    const h = M.history.at(-1); got.push(h.track); gaps.push({ length, took: (h.at - ended) / 1000 });
  }
  return { start, got, gaps };
}
const first = await run(40, [0.4, 0.8]);
// p8: a song can't come back until two others have played (no A A, no A B A)
const repeats = (list) => list.filter((t, i) => (i && t === list[i - 1]) || (i > 1 && t === list[i - 2])).length;
const counts = (list) => Object.fromEntries(MUSIC.rotation.map((t) => [t, list.filter((x) => x === t).length]));
check('music 40 songs, locked: never one of the last two again (three go round in turn), never orbit-loaf, all three come round', repeats([first.start, ...first.got]) === 0 && !first.got.includes('orbit-loaf') &&
  ['glass-garden', 'sequencer-sky', 'phase-cat'].every((t) => first.got.includes(t)), JSON.stringify(counts(first.got)));
check('music the shrunk gap is honoured (0.4-0.8 s drawn, the next song starts after it)', first.gaps.every((g) => g.length >= 0.4 && g.length <= 0.8 && g.took >= g.length - 0.02 && g.took < g.length + 0.5),
  `drawn ${Math.min(...first.gaps.map((g) => g.length)).toFixed(2)}-${Math.max(...first.gaps.map((g) => g.length)).toFixed(2)} s, waited ${Math.min(...first.gaps.map((g) => g.took)).toFixed(2)}-${Math.max(...first.gaps.map((g) => g.took)).toFixed(2)} s`);
// the default gap: 60-180 s, drawn 40 times (each skipped once drawn)
{
  check('music default gap config is 60-180 s', MUSIC.gap[0] === 60 && MUSIC.gap[1] === 180, JSON.stringify(MUSIC.gap));
  M.setGap(...MUSIC.gap); const drawn = [];
  for (let i = 0; i < 40; i++) {
    await poll(() => st().phase === 'playing', 8000);
    M.next(); drawn.push(st().gapLength);
    const left = st().gapLeft; if (i === 0) note('music default gap first draw', `${drawn[0].toFixed(1)} s, ${left.toFixed(1)} s left on the clock`);
    M.skipGap();
  }
  check('music the default gap is drawn within 60-180 s (40 draws, spread over it)', drawn.every((g) => g >= 60 && g <= 180) && Math.max(...drawn) - Math.min(...drawn) > 60,
    `${Math.min(...drawn).toFixed(1)}-${Math.max(...drawn).toFixed(1)} s`);
}
// the picker alone, many times
{
  const played = [], n = {}; const pool = MUSIC.rotation; let bad = 0;
  for (let i = 0; i < 20000; i++) { const t = pickNext(pool, played.slice(-2)); if (played.slice(-2).includes(t)) bad++; n[t] = (n[t] || 0) + 1; played.push(t); }
  check('music the picker: 20000 picks of four, never one of the last two, each about a quarter', bad === 0 && pool.every((t) => n[t] > 4300 && n[t] < 5700), JSON.stringify(n));
}

// ---- 6. the galaxy loaf scene: its song, the twinkle at 23.0 s, the unlock ----
M.setGap(0.4, 0.8);
await poll(() => st().phase === 'playing' && !st().held, 8000);
await E.bread.whenReady();
await site.cast('dome'); await E.bread.whenBread(); await wait(150);
const T = E.bread.config.blast;
check('bread blast-off config: windup + float = 23.0 s', Math.abs(T.windup + T.fly - 23) < 1e-9 && T.twinkleAt === 23, `${T.windup} + ${T.fly}`);
check('bread blast-off song is decoded by the time he is bread', audio.status(T.track) === 'loaded');
const trackBefore = st().track, posBefore = pos(), n0 = M.resumes.length;
const trace = []; let tracing = true;
const sample = () => { const b = E.bread.blastAt; if (b?.live) trace.push({ t: ctx.currentTime - b.a0, level: audio.level() }); if (tracing) wallClock.requestAnimationFrame(sample); };
wallClock.requestAnimationFrame(sample);
const blast = E.bread.blastOff();
await poll(() => st().pausedAt !== null, 4000);
const heldDuring = st().holds.includes('blastoff');
await poll(() => E.bread.blastAt?.star !== undefined, 40000, 10);
await wait(600); tracing = false;
const b = E.bread.blastAt;
check('bread blast-off: the music holds, its song starts with the scene', heldDuring && b.live && b.song && b.twinkle, JSON.stringify({ heldDuring, live: b.live, song: b.song }));
check('bread blast-off: the twinkle is scheduled 23.0 s after the song starts', Math.abs(b.twinkleWhen - b.songAt - 23) < 1e-6);
check('bread blast-off: the star lands within 0.1 s of 23.0 s on the audio clock', Math.abs(b.starAudio - b.a0 - 23) <= 0.1, `star at ${(b.starAudio - b.a0).toFixed(3)} s; wall ${((b.starWall - b.started) / 1000).toFixed(3)} s`);
// the twinkle heard: the first 43 ms window after 22.5 s that jumps well over the song's tail
const tail = trace.filter((p) => p.t > 22.0 && p.t < 22.85).map((p) => p.level), floor = Math.max(1e-5, tail.sort((x, y) => x - y)[Math.floor(tail.length / 2)] || 0);
const onset = trace.find((p) => p.t > 22.5 && p.level > floor * 3 && p.level > 3e-3);   // +9.5 dB over the song tail and the galaxy hum
if (!onset) note('bread blast-off trace 22.4-23.4 s', trace.filter((p) => p.t > 22.4 && p.t < 23.4).map((p) => `${p.t.toFixed(2)}:${dB(p.level).toFixed(0)}`).join(' '));
check('bread blast-off: the twinkle is heard on the bus within 0.1 s of 23.0 s', !!onset && Math.abs(onset.t - 23) <= 0.1,
  onset ? `heard at ${onset.t.toFixed(3)} s (song tail ${dB(floor).toFixed(1)} dBFS, twinkle window ${dB(onset.level).toFixed(1)} dBFS; ${trace.length} samples)` : `not found (${trace.length} samples)`);
check('bread blast-off: orbit-loaf unlocked when the star twinkles, saved', M.isUnlocked('orbit-loaf') && store.get('music.orbitLoaf') === true);
await blast; await poll(() => M.resumes.length > n0 && !M.element.paused, 8000);
const r = M.resumes.at(-1);
check('bread blast-off: the music comes back after, the same song at the same place', r?.track === trackBefore && Math.abs(r.from - r.pausedAt) <= 0.25 && r.pausedAt >= posBefore,
  `${trackBefore} ${posBefore.toFixed(2)} -> paused ${r?.pausedAt?.toFixed(2)}, resumed ${r?.from?.toFixed(2)}`);
// the float: on screen to the end, steadily smaller (checks/bread-float.js has its shape)
await __shot('music-after-blastoff');

// ---- 7. the rotation with orbit-loaf in ----
const second = await run(40, [0.4, 0.8]);
check('music 40 more songs, unlocked: never one of the last two again, orbit-loaf comes round', repeats([second.start, ...second.got]) === 0 && second.got.includes('orbit-loaf') &&
  MUSIC.rotation.every((t) => second.got.includes(t)), JSON.stringify(counts(second.got)));
// the loudest 4 s of the loudest song (sequencer-sky at 98.2 s, measured offline from the file) against the same effects
for (let i = 0; i < 30 && st().track !== 'sequencer-sky'; i++) { const n = M.history.length; M.next(); await poll(() => M.history.length > n, 8000); }
await poll(() => st().phase === 'playing' && !M.element.paused && M.element.readyState >= 3, 8000);
M.element.currentTime = 98.2; await poll(() => pos() > 98.4, 8000);
const loudest = await rms(4, ml);
check('music the loudest 4 s of the loudest song (sequencer-sky 98-102 s) still sits under the effects', st().track === 'sequencer-sky' && pos() > 101 && dB(bonk) - dB(meanSq(loudest)) >= 6 && dB(wind) - dB(meanSq(loudest)) >= 3,
  `${dB(meanSq(loudest)).toFixed(1)} dBFS (loudest 43 ms ${dB(Math.max(...loudest)).toFixed(1)}); bonk +${(dB(bonk) - dB(meanSq(loudest))).toFixed(1)} dB, wind +${(dB(wind) - dB(meanSq(loudest))).toFixed(1)} dB`);
check('music the debug readout has a music line', /music\s+\w+/.test(stage.debugExtra.map((f) => f()).join('\n')), stage.debugExtra.map((f) => f()).find((l) => l.startsWith('music')));
// p8: the whole visit's songs (through the holds, the blast-off and orbit-loaf unlocking): no A A and no A B A anywhere
{
  const seq = M.history.map((h) => h.track), short = (t) => t.split('-')[0][0].toUpperCase() + t.split('-')[1][0];
  note('music the songs played this visit', `${seq.length}: ${seq.map(short).join(' ')}`);
  check('music the whole visit: no song back within two (no A B A), the debug line shows the last two', repeats(seq) === 0 && seq.length > 80 &&
    stage.debugExtra.map((f) => f()).some((l) => l.includes('recent ' + st().recent.join(', '))) && st().recent.join() === seq.slice(-2).join(), `${repeats(seq)} of ${seq.length}; recent ${st().recent.join(', ')}`);
}
store.flush();
