// Touchfeel lane (playtest 4, 2026-11-14), item 1. Aaron: "I didnt hear him purring when I pet him on mobile, and purr
// sound should be about double as long". On a phone this strokes him with real touches (the browser's own touch
// events, as a finger makes them); on desktop with real-timed mouse moves. Then: every counted stroke plays a purr
// burst twice as long as before, the purr rings on twice as long after the last stroke, and on a phone the purr that
// plays has a voice a phone speaker can make (its level above 300 Hz, where a phone's speaker starts to give sound),
// with the same pulse; on desktop the recording is untouched.
cat.auto = false; audio.setVolume(1); audio.setMuted(false);
const P = E.petbite, PET = P.config, files = site.config.sounds.files;
await audio.loadAll(['purr', 'bell']);
// the phone voice is made just after the clip decodes
await until(() => !MOBILE || audio.buffer('purr')?.getChannelData(0).length > 0, 4000); await sleep(200);
const started = [], nativeStart = AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start = function (...a) { started.push({ buffer: this.buffer, when: a[0] ?? 0, offset: a[1] ?? 0, len: a[2], rate: this.playbackRate.value }); return nativeStart.apply(this, a); };

// ---- a pet by touch counts and purrs ----
const h = cat.height, spot = [.45, .35, .55, .3, .6].map((k) => cat.screenOf([0, h * k, 0])).find((q) => cat.hitTest(q.x, q.y) && !E.harp?.whiskerAt(q.x, q.y));
check('touchfeel purr: a body spot clear of the whiskers', !!spot, JSON.stringify(spot));
const kinds = new Set(); let moves = 0; cat.onDrag.push((k, press) => { if (k === 'move') { moves++; kinds.add(press.type); } });
const span = MOBILE ? 44 : 60, path = [];
for (const [a, b] of [[-.5, .5], [.5, -.5], [-.5, .5]]) for (let i = 0; i <= 8; i++) path.push({ x: spot.x + 1, y: spot.y + span * (a + (b - a) * i / 8) });
const s0 = P.strokes, b0 = P.bursts, i0 = started.length;
if (MOBILE) await __pointer(path);          // real touches, 25 ms apart: three passes in one press (down, up, down)
else { const id = ++pointerIds; fire('pointerdown', path[0].x, path[0].y, id); for (const q of path.slice(1)) { await sleep(25); fire('pointermove', q.x, q.y, id); } fire('pointerup', path.at(-1).x, path.at(-1).y, id, 0); }
const lastStroke = stage.clock, level = P.purr;
await sleep(150);
const bursts = started.slice(i0).filter((s) => s.buffer === audio.buffer('purr') && s.len !== undefined && s.offset > 0);
check(`touchfeel purr: ${MOBILE ? 'a finger' : 'the mouse'} stroking him counts three strokes and plays three purr bursts`,
  kinds.has(MOBILE ? 'touch' : 'mouse') && P.strokes - s0 === 3 && P.bursts - b0 === 3 && bursts.length === 3 && level > 0,
  `${moves} moves as ${[...kinds]}; strokes ${P.strokes - s0}; bursts ${P.bursts - b0}; purr sources ${bursts.length}; level ${level.toFixed(2)}`);

// ---- twice as long ----
const secs = bursts.map((s) => s.len / s.rate), old = [0.32, 0.46];
check('touchfeel purr: each burst lasts twice as long as before (0.64-0.92 s, was 0.32-0.46)',
  PET.burst.seconds[0] === old[0] * 2 && PET.burst.seconds[1] === old[1] * 2 && secs.length === 3 && secs.every((t) => t >= 0.64 - 1e-6 && t <= 0.92 + 1e-6),
  secs.map((t) => t.toFixed(3) + ' s').join(', '));
// one unbroken slice of the recording: no seam inside a burst
check('touchfeel purr: a burst is one unbroken slice of the recording', bursts.every((s) => s.offset + s.len <= audio.buffer('purr').duration + 1e-6),
  bursts.map((s) => `${s.offset.toFixed(2)}+${s.len.toFixed(2)}`).join(' '));
// the purr dies away twice as slowly once the stroking stops
await until(() => P.purr === 0, 9000, 20);
// (from the level read once the press is over; the fade starts within 0.35 s of the last stroke, maybe already)
const ring = stage.clock - lastStroke, before = level / 0.55, expect = level / PET.purrFade;
check('touchfeel purr: after the last stroke the purr rings on twice as long', PET.purrFade === 0.55 / 2 && ring > before * 1.6 && ring > expect - 0.15 && ring < expect + 0.5,
  `level ${level.toFixed(2)} died away in ${ring.toFixed(2)} s (before: ${before.toFixed(2)} s)`);
AudioBufferSourceNode.prototype.start = nativeStart;

// ---- a voice a phone can play ----
// Level above 300 Hz (a 4th-order high-pass: about where a phone's speaker starts), RMS over its louder 10 ms frames.
async function band(buf, hp = 300) {
  const off = new OfflineAudioContext(1, buf.length, buf.sampleRate), src = off.createBufferSource(); src.buffer = buf;
  let node = src; if (hp) for (const Q of [0.5412, 1.3066]) { const f = off.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; f.Q.value = Q; node.connect(f); node = f; }
  node.connect(off.destination); src.start(); const d = (await off.startRendering()).getChannelData(0), n = Math.round(buf.sampleRate / 100), rms = [];
  for (let i = 0; i + n <= d.length; i += n) { let s = 0; for (let j = i; j < i + n; j++) s += d[j] * d[j]; rms.push(Math.sqrt(s / n)); }
  const top = Math.max(...rms), act = rms.filter((r) => r > top * 0.1);
  return { db: 20 * Math.log10(Math.sqrt(act.reduce((s, r) => s + r * r, 0) / act.length)), env: rms };
}
// the pulse: the lag (ms) of the strongest repeat in the 10 ms envelope... at 1 ms steps for precision
async function pulse(buf, hp) {
  const off = new OfflineAudioContext(1, buf.length, buf.sampleRate), src = off.createBufferSource(); src.buffer = buf;
  let node = src; if (hp) for (const Q of [0.5412, 1.3066]) { const f = off.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; f.Q.value = Q; node.connect(f); node = f; }
  node.connect(off.destination); src.start(); const d = (await off.startRendering()).getChannelData(0), n = Math.round(buf.sampleRate / 1000), w = 10, e = [];
  for (let i = 0; i + n * w <= d.length; i += n) { let s = 0; for (let j = i; j < i + n * w; j++) s += d[j] * d[j]; e.push(Math.sqrt(s / (n * w))); }
  const m = e.reduce((a, b) => a + b, 0) / e.length, z = e.map((v) => v - m); let best = 0, lag = 0;
  for (let L = 15; L < 120; L++) { let s = 0; for (let i = 0; i + L < z.length; i++) s += z[i] * z[i + L]; if (s > best) { best = s; lag = L; } }
  return lag;
}
const raw = await (await fetch(files.purr)).arrayBuffer(), recorded = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(raw);
const now = audio.buffer('purr'), bell = audio.buffer('bell');
const [nowHp, recHp, bellHp, nowFull, recFull] = await Promise.all([band(now), band(recorded), band(bell), band(now, 0), band(recorded, 0)]);
const levels = `above 300 Hz: playing ${nowHp.db.toFixed(1)} dBFS, recording ${recHp.db.toFixed(1)}, the bell ${bellHp.db.toFixed(1)}; whole: playing ${nowFull.db.toFixed(1)}, recording ${recFull.db.toFixed(1)}`;
if (MOBILE) {
  const [pNow, pRec] = await Promise.all([pulse(now, 300), pulse(recorded, 0)]);
  check('touchfeel purr: on a phone the purr is loud where a phone speaker plays (+15 dB or more above 300 Hz, within 10 dB of the bell)',
    P.voice === 'phone' && nowHp.db - recHp.db >= 15 && nowHp.db >= bellHp.db - 10, levels);
  check('touchfeel purr: the same purr: whole level within 5 dB, the same pulse', nowFull.db - recFull.db < 5 && Math.abs(pNow - pRec) <= 2,
    `pulse ${pNow} ms (phone band) vs ${pRec} ms (recording); ${levels}`);
} else {
  const a = now.getChannelData(0), b = recorded.getChannelData(0); let diff = a.length === b.length ? 0 : Infinity;
  for (let i = 0; i < a.length && diff < Infinity; i++) diff = Math.max(diff, Math.abs(a[i] - b[i]));
  check('touchfeel purr: on desktop the recording plays untouched', P.voice === 'recording' && diff < 1e-6, `max sample difference ${diff}; ${levels}`);
}
await __shot('touchfeel-purr');
