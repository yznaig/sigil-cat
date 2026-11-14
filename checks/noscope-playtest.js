// The 360's riser and return (e1111-58): the riser is held at the video's opening loudness, and when the video ends
// the page is back at once, with no fade. The loudness numbers themselves are checked by checks/sound-playtest-files.py.
cat.auto = false;
audio.setVolume(.8); audio.setMuted(false);
const C = (await import(new URL('src/eggs/noscope-video.js', document.baseURI).href)).NOSCOPE_VIDEO;
await audio.load(C.riser); await stage.after(.5);
const done = site.fire('noscope'), api = E.noscopeVideo, samples = [];
const ctx = audio.context(), t0 = ctx.currentTime;
let first = null;
while (api.phase !== 'playing' && performance.now() < 3e5) {
  const g = api.audio.riserGain, cap = api.audio.capped;
  if (cap.length && !first) first = cap[0];
  if (g.length && first) samples.push({ t: ctx.currentTime - first.at, gain: g[0] });
  await sleep(40);
}
await sleep(1100);
const capped = api.audio.capped;
check('noscope riser plays as two capped segments (black, then the last second into the video)', capped.length === 2 && capped[0].offset === 0 && capped[0].duration === C.black && capped[1].offset === C.black && capped[1].duration === C.in,
  JSON.stringify(capped.map((c) => [c.offset, c.duration])));
const expect = (t) => { const k = Math.min(C.riserCap.gainDb.length - 1, t / C.riserCap.step), j = Math.min(C.riserCap.gainDb.length - 2, Math.floor(k)); return 10 ** ((C.riserCap.gainDb[j] + (C.riserCap.gainDb[j + 1] - C.riserCap.gainDb[j]) * (k - j)) / 20); };
const worst = samples.reduce((w, s) => Math.max(w, Math.abs(s.gain - expect(s.t))), 0), late = samples.filter((s) => s.t > 4.9);
check('noscope riser gain follows the cap curve on the audio clock', samples.length > 50 && worst < .03 && late.length > 0 && late.every((s) => s.gain < .96),
  `${samples.length} samples; worst ${worst.toFixed(4)}; at 4.9-5 s ${late.map((s) => s.gain.toFixed(3)).join(' ')}`);
const tail = capped[1].curve;
check('noscope riser stays held down into the video', Math.abs(tail[tail.length - 1] - 10 ** (C.riserCap.gainDb.at(-1) / 20)) < 1e-4 && Math.max(...tail) <= 10 ** (C.riserCap.gainDb[50] / 20) + 1e-6,
  `last second ${Math.min(...tail).toFixed(3)}-${Math.max(...tail).toFixed(3)}`);
// End: let it play out (the preview server has no range requests, so it cannot seek) and watch the return.
const v = document.querySelector('.noscope-video video'), root = document.querySelector('.noscope-video');
let atEnd = null;
v.addEventListener('ended', () => {
  atEnd = { overlay: !!document.querySelector('.noscope-video'), showing: document.body.classList.contains('noscope-showing'), locked: input.locked,
    master: audio.output().gain.value, animations: root.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length, t: performance.now() };
});
await until(() => !!atEnd, 40000); await done;
check('noscope the page returns abruptly when the video ends', !!atEnd && !atEnd.overlay && !atEnd.showing && !atEnd.locked && atEnd.animations === 0 && Math.abs(atEnd.master - .8) < 1e-6 && api.lastEnd === 'ended' && C.back === 0,
  JSON.stringify(atEnd));
await sleep(100); await __shot('noscope-playtest');
