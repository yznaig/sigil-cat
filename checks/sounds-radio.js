// Butterman through the old radio (e1111-58). Offline renders use the page's own chain (audio.buildRadio) on the
// real decoded song; the live part plays a scene and checks every one of his clips starts exactly when scheduled.
cat.auto = false;
audio.setVolume(1); audio.setMuted(false);
const BM = E.butterman, R = audio.RADIO;
const song = BM.config.scenes.flatMap((s) => s.actions).find((a) => /theme-song-1/.test(a.audio?.file?.[0]))?.audio.file;
const buf = await audio.load(song);
const db = (v) => 20 * Math.log10(v + 1e-12);
const rms = (a, i0 = 0, i1 = a.length) => { let s = 0; for (let i = i0; i < i1; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, i1 - i0)); };
const peakOf = (a) => a.reduce((p, v) => Math.max(p, Math.abs(v)), 0);
const RATE = 48000, SECONDS = 12;
async function render(mode, { bed = false, seconds = SECONDS } = {}) {
  const oc = new OfflineAudioContext(1, seconds * RATE, RATE), s = oc.createBufferSource();
  s.buffer = bed ? audio.radioBed(oc) : buf;
  s.connect(mode === 'dry' ? oc.destination : audio.buildRadio(oc, oc.destination)); s.start(0, 0, Math.min(seconds, s.buffer.duration));
  return (await oc.startRendering()).getChannelData(0);
}
// loudest 400 ms window, stepped 100 ms
const loudest = (a) => { let m = 0, at = 0; for (let i = 0; i + .4 * RATE < a.length; i += .1 * RATE) { const r = rms(a, i, i + .4 * RATE); if (r > m) { m = r; at = i; } } return [m, at]; };
// energy in a band, by an 8th-order filter in its own offline render
async function band(data, type, hz) {
  const oc = new OfflineAudioContext(1, data.length, RATE), b = oc.createBuffer(1, data.length, RATE); b.getChannelData(0).set(data);
  const s = oc.createBufferSource(); s.buffer = b; let n = s;
  for (const q of [.5098, .6013, .9000, 2.5629]) { const f = oc.createBiquadFilter(); f.type = type; f.frequency.value = hz; f.Q.value = q; n.connect(f); n = f; }
  n.connect(oc.destination); s.start(); return rms((await oc.startRendering()).getChannelData(0));
}
const dry = await render('dry'), wet = await render('wet');
const [dl] = loudest(dry), [wl, at] = loudest(wet);
check('radio keeps his loudness (loudest 400 ms within 1 dB of the dry recording)', Math.abs(db(wl) - db(dl)) <= 1, `dry ${db(dl).toFixed(2)} / radio ${db(wl).toFixed(2)} dBFS`);
check('radio peaks stay under the page safety knee', db(peakOf(wet)) < -3, `${db(peakOf(wet)).toFixed(2)} dBFS`);
const lowCut = db(await band(wet, 'lowpass', 100)) - db(await band(dry, 'lowpass', 100));
const highCut = db(await band(wet, 'highpass', 8000)) - db(await band(dry, 'highpass', 8000));
const mid = db(await band(wet, 'bandpass', 1500)) - db(await band(dry, 'bandpass', 1500));
check('radio band: lows under 100 Hz and highs over 8 kHz are gone, the 1.5 kHz cone is up', lowCut < -20 && highCut < -25 && mid > 0,
  `below 100 Hz ${lowCut.toFixed(1)} dB, above 8 kHz ${highCut.toFixed(1)} dB, at 1.5 kHz ${mid.toFixed(1)} dB`);
// the valve: residual against the same chain with a linear valve, on his loudest window
const keep = [R.drive, R.bias]; R.drive = .02; R.bias = 0; const lin = await render('wet'); [R.drive, R.bias] = keep;
const resid = Float32Array.from(wet, (v, i) => v - lin[i]), dist = db(rms(resid, at, at + .4 * RATE)) - db(rms(lin, at, at + .4 * RATE));
check('radio valve is mild (residual 20-32 dB under the voice at its loudest)', dist < -20 && dist > -32, `${dist.toFixed(2)} dB`);
// timing: the filters' group delay only; nothing is scheduled late
let best = -Infinity, lag = 0;
for (let d = -96; d <= 96; d++) { let s = 0; for (let i = RATE; i < RATE * 8; i++) s += dry[i] * wet[i + d]; if (s > best) { best = s; lag = d; } }
check('radio adds no time shift beyond the filters (under 1 ms)', Math.abs(lag) / RATE < .001, `${(lag / RATE * 1000).toFixed(3)} ms`);
const wowMs = R.wow.depth / (2 * Math.PI * R.wow.hz) * 1000;
check('radio wow is slight and zero-mean (cosine rate, at most 0.5 ms ahead or behind)', wowMs < .5 && R.wow.depth <= .002, `±${(R.wow.depth * 100).toFixed(2)}% at ${R.wow.hz} Hz = ±${wowMs.toFixed(3)} ms`);
const bed = await render('wet', { bed: true, seconds: 7 }), voice = rms(wet);
check('radio bed is faint: hiss and crackle well under his singing', db(voice) - db(rms(bed)) > 34 && db(peakOf(wet)) - db(peakOf(bed)) > 18,
  `bed RMS ${db(rms(bed)).toFixed(1)} vs voice ${db(voice).toFixed(1)} dBFS; bed peak ${db(peakOf(bed)).toFixed(1)} dBFS`);

// ---- live: a scene, his clips through the radio, every start exactly as scheduled ----
const starts = [], nativeStart = AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start = function (...a) { starts.push({ node: this, at: a[0] ?? 0, buffer: this.buffer }); return nativeStart.apply(this, a); };
await BM.clipsReady; const v0 = audio.diagnostics().radioVoices;
BM.play({ scene: 'butter', forceAudio: true }); await sleep(400);
const rows = BM.state.scheduled, songRow = rows.find((r) => /theme-song/.test(r.file)), slapRow = rows.find((r) => r.file === 'slap');
const songStart = starts.find((s) => s.buffer === audio.buffer(songRow.src)), slapStart = starts.find((s) => s.buffer === audio.buffer('slap'));
const run0 = songStart && songStart.at - songRow.s;
check('radio his song starts exactly at its scheduled time', !!songStart && !!songStart.node.radio && starts.every((s) => s.buffer !== audio.buffer(songRow.src) || s === songStart),
  `start ${songStart?.at.toFixed(6)}; row ${songRow?.s}`);
check('radio every scheduled clip keeps its offset from the song (no shift)', !!slapStart && Math.abs((slapStart.at - run0) - slapRow.s) < 1e-9 && !slapStart.node.radio,
  `slap ${(slapStart?.at - run0).toFixed(6)} vs ${slapRow?.s}; slap is an effect, not his voice`);
check('radio bed and wow start with his clip', audio.diagnostics().radioVoices === v0 + 1 && starts.some((s) => s.node.loop && s.at === songStart?.at), `${audio.diagnostics().radioVoices - v0} radio voices`);
let heard = 0; for (let i = 0; i < 20; i++) { await sleep(50); heard = Math.max(heard, audio.level()); }
audio.setMuted(true); await sleep(250); const quiet = audio.level(); audio.setMuted(false);
check('radio is heard, and mute silences his voice and its bed', heard > 1e-3 && quiet < 1e-6, `${heard.toExponential(2)} -> ${quiet.toExponential(2)} RMS`);
const bedNode = songStart?.node.radio?.bed; let bedEnded = false; bedNode?.addEventListener('ended', () => { bedEnded = true; });
BM.stop(); await sleep(300);
check('radio a scene cut short takes its hiss with it', bedEnded && audio.level() < 1e-5, `bed ended ${bedEnded}; RMS ${audio.level().toExponential(2)}`);
// the whisper: loop and replay both through the radio
await cat.ensureButter(); cat.setButter(true, 'quiet');
const w0 = audio.diagnostics().radioVoices;
await until(() => BM.state.whisper.looping, 6000);
const replay = await BM.replayWhisper(); await sleep(200);
check('radio the whisper loop and the whispered replay are on the radio', BM.state.whisper.looping && replay && audio.diagnostics().radioVoices >= w0 + 2, `${audio.diagnostics().radioVoices - w0} radio voices`);
AudioBufferSourceNode.prototype.start = nativeStart;
await __shot('sounds-radio');
