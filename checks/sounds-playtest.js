// Aaron's sound playtest (e1111-58), in the real page: the star's tap (the small bell since playtest 3), the eight kept originals at every
// trigger exercised here (no impact layer on top), no collision sounds, and a purr burst per counted pet stroke.
// Every started AudioBufferSourceNode is recorded and named by the decoded buffer it plays.
cat.auto = false;
audio.setVolume(1); audio.setMuted(false);
const files = site.config.sounds.files;
const named = Object.keys(files).filter((n) => !n.startsWith('impact-'));
await audio.loadAll(named);
const started = [], nativeStart = AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start = function (...a) { started.push({ node: this, buffer: this.buffer, at: a[0] ?? 0, offset: a[1] ?? 0, rate: this.playbackRate.value }); return nativeStart.apply(this, a); };
const nameOf = (b) => named.find((n) => audio.buffer(n) === b) ?? (b ? `unnamed ${b.duration.toFixed(2)}s` : 'none');
async function record(task, settle = 300) { const i = started.length; await task(); await sleep(settle); return started.slice(i).map((s) => ({ ...s, name: nameOf(s.buffer) })); }
const list = (r) => r.map((s) => s.name).join(', ');
const impactRequests = async () => (await __requests()).filter((u) => /assets\/audio\/impacts\//.test(u));
const ORIGINAL = ['bite', 'slap', 'glass-slide', 'glass-smash', 'choir', 'paper', 'twinkle', 'click'];
check('playtest the eight originals map to their kept files', ORIGINAL.every((n) => files[n] === `assets/audio/designed/${n}.wav` && audio.status(n) === 'loaded'),
  ORIGINAL.map((n) => files[n]).join(', '));
const P = Object.values(E).find((e) => e?.find === 'bite');

// ---- 6. collisions removed: the adapter is off at its source and nothing of the impact set loads ----
{ const d0 = audio.diagnostics();
  const direct = ['wood', 'metal', 'paper', 'butter', 'glass', 'tin'].map((m) => audio.impact({ id: 'probe-' + m }, { material: m, size: 'medium', strength: 1 }));
  await audio.loadImpacts('glass');
  const W = site.world, T = site.THREE; await W.ensure();
  W.cat?.suspend('fixture', true);   // the probe falls where he floats (cat-body.js): isolate it from him
  const e = await W.add({ id: 'playtest-drop', object: new T.Group(), position: { x: 0, y: .6, z: 0 }, shapes: [{ half: [.05, .05, .05] }], mass: .2, sound: { material: 'glass', size: 'medium' } });
  const slept = await until(() => e.body.isSleeping(), 6000); W.remove(e.id); W.cat?.suspend('fixture', false);
  const d1 = audio.diagnostics();
  check('playtest collisions: a real drop and direct contact calls make no voice', direct.every((v) => v === null) && slept && d1.impacts === d0.impacts && d1.silentContacts > d0.silentContacts + 6,
    `impacts ${d1.impacts - d0.impacts}; silent contacts ${d1.silentContacts - d0.silentContacts}`);
  check('playtest collisions: no impact file is fetched', !site.config.sounds.collisions && (await impactRequests()).length === 0); }

// ---- 2. cup scoot and glass break: only drip and the two kept glass originals ----
{ const slides = E.recycle.stats.slides, r = await record(() => E.glass.show(), 2500);
  // Playtest 2: the broken glass alone now brings the recycling bin, whose slide-in (whoosh, thud) is the bin's own.
  const bin = E.recycle.stats.slides > slides, names = r.map((s) => s.name), allowed = new Set(['drip', 'glass-slide', 'glass-smash', ...(bin ? ['whoosh', 'box-thud'] : [])]);
  check('playtest cup scoot plays the original glass-slide on every shove and the tip', names.filter((n) => n === 'glass-slide').length === 4, list(r));
  check('playtest glass break plays the original glass-smash once', names.filter((n) => n === 'glass-smash').length === 1);
  check('playtest cup and break add no other layer (no impacts, no redesigned sound)', names.every((n) => allowed.has(n)) && (await impactRequests()).length === 0, list(r));
  await until(settled, 8000); }

// ---- the other kept originals at their triggers ----
async function expectOriginal(label, name, task, settle) {
  const r = await record(task, settle);
  check(`playtest ${label} plays the original ${name}`, r.some((s) => s.name === name && s.buffer === audio.buffer(name)) && r.every((s) => !/unnamed|impact/.test(s.name)), list(r));
  return r;
}
await expectOriginal('unmuting', 'click', async () => { document.querySelector('#sound').click(); await sleep(80); document.querySelector('#sound').click(); });
audio.setMuted(false);
{ const tin = keepsakes.give('tin'); await tin.worldTask; await expectOriginal('the plaster tin tap', 'paper', () => tin.def.tap(tin)); }
await expectOriginal('the googly eyes', 'choir', async () => { site.spells.eight(); await until(() => !E.eyes.busy, 12000); }, 200);
await until(settled, 8000);
await expectOriginal('the bread blast-off', 'twinkle', async () => {
  site.cast('dome'); await until(() => E.bread.isBread, 9000); await sleep(300); E.bread.blastOff();
  await until(() => keepsakes.has('twinkle') && E.bread.state === 'cat' && !input.locked, 20000);
}, 200);
{ const crumbs = keepsakes.get('crumbs') || keepsakes.give('crumbs'); await crumbs.worldTask; await expectOriginal('the crumbs tap', 'bite', () => crumbs.def.tap(crumbs)); }
{ await cat.ensureButter(); const pat = keepsakes.get('pat') || keepsakes.give('pat'); await pat.worldTask; await expectOriginal('the butter pat tap', 'slap', () => pat.def.tap(pat)); }

// ---- 1. the star sticker: Aaron's small bell (playtest 3: "'ding-small-bell-sfx' should be used for the sound when you
// click a sticker"; it was the glass tink, star-tink), never the twinkle ----
{ const star = keepsakes.get('twinkle'); await star.worldTask; const taps = [];
  for (let i = 0; i < 4; i++) { taps.push(...await record(() => star.def.tap(star), 700)); }
  const bells = taps.filter((s) => s.name === 'bell');
  check('playtest the star tap plays the small bell, not the twinkle or the old tink', bells.length === 4 && !taps.some((s) => s.name === 'twinkle' || s.name === 'star-tink'), list(taps));
  check('playtest the star bell varies a little each tap', new Set(bells.map((s) => s.rate.toFixed(4))).size >= 3 && bells.every((s) => Math.abs(s.rate - 1) <= .03 + 1e-6), bells.map((s) => s.rate.toFixed(3)).join(', '));
  const b = audio.buffer('bell'); let pk = 0; for (const v of b.getChannelData(0)) pk = Math.max(pk, Math.abs(v));
  check('playtest the bell is short and peak-safe', b.duration < 1.2 && b.numberOfChannels === 1 && 20 * Math.log10(pk) <= -4, `${b.duration.toFixed(3)} s, peak ${(20 * Math.log10(pk)).toFixed(2)} dBFS`); }
await until(settled, 8000);

// ---- playtest 3 (fx lane): a successful cast is Aaron's wind-magic (e1113-09), the bolt his energy beam (e1113-10) ----
{ const c0 = E.bolt.casts, hadCloud = keepsakes.has('cloud');
  const r = await record(async () => { site.cast('zigzag'); await until(() => E.bolt.casts > c0 && !E.bolt.busy, 15000); }, 200);
  const names = r.map((s) => s.name);
  check('playtest 3 a successful cast plays the wind-magic once, never the old three-note cast', names.filter((n) => n === 'cast-wind').length === 1 && !names.includes('cast'), list(r));
  check('playtest 3 the bolt strikes with the energy beam, not the thunder', names.filter((n) => n === 'bolt-beam').length === 1 && (hadCloud || !names.includes('thunder')), list(r));
  const w = audio.buffer('cast-wind');
  check('playtest 3 the cast is short (about a second)', w.duration > .8 && w.duration < 1.3, `${w.duration.toFixed(2)} s`); }
await until(settled, 8000);

// ---- 4. a low purr burst for every counted stroke, varied and rate-limited ----
{ const m = catMid(), h = MOBILE ? 50 : 70, b0 = P.bursts, s0 = P.strokes;
  const passes = [];
  const r = await record(async () => {
    for (let k = 0; k < 4; k++) {   // four real passes: down, up, down, up (each a separate drag, as a hand strokes)
      const dir = k % 2 ? -1 : 1, pts = Array.from({ length: 9 }, (_, i) => ({ x: m.x + 2, y: m.y + dir * (i / 8 - .5) * h }));
      await drag(pts, 16); passes.push(P.strokes); await sleep(260);
    }
  }, 600);
  const bursts = r.filter((s) => s.name === 'purr' && s.node.loop !== true && s.at > 0 && s.offset > 0);
  check('playtest each counted pet stroke plays a purr burst', P.strokes - s0 === 4 && P.bursts - b0 === 4 && bursts.length >= 4, `strokes ${P.strokes - s0}; bursts ${P.bursts - b0}; ${list(r)}`);
  check('playtest purr bursts are low and varied', bursts.every((s) => s.rate >= .82 && s.rate <= .92) && new Set(bursts.map((s) => s.offset.toFixed(2))).size === bursts.length,
    bursts.map((s) => `${s.offset.toFixed(2)}s@${s.rate.toFixed(3)}`).join(' '));
  const quick0 = P.bursts; P.purrBurst(); P.purrBurst();
  check('playtest purr bursts are rate-limited', P.bursts - quick0 <= 1, `${P.bursts - quick0} for two calls in one frame`);
  // the burst rides with the building loop: both audible together, and the sum stays under the safety limit
  await sleep(200); P.stroke(); await sleep(120); let pk = 0, lv = 0; for (let i = 0; i < 10; i++) { await sleep(20); pk = Math.max(pk, audio.peak()); lv = Math.max(lv, audio.level()); }
  check('playtest burst and building loop sound together under -1 dBFS', P.purr > 0 && lv > 1e-4 && pk < 10 ** (-1 / 20), `purr level ${P.purr.toFixed(2)}; RMS ${lv.toExponential(2)}; peak ${(20 * Math.log10(pk || 1e-9)).toFixed(2)} dBFS`);
  audio.setMuted(true); await sleep(80); const m0 = P.bursts; P.stroke(); await sleep(200);
  check('playtest a muted stroke stays silent', P.bursts - m0 === 1 && audio.level() < 1e-6, `RMS ${audio.level().toExponential(2)}; bursts ${P.bursts - m0}`); audio.setMuted(false);
  // the seventh counted stroke bites instead: the kept bite original, and no burst on that stroke
  const before = P.bursts; let r2 = [];
  while (!P.plastered && P.strokes < 40) { r2.push(...await record(async () => { await sleep(200); P.stroke(); }, 100)); }
  check('playtest the bite stroke plays the original bite and hiss, no burst', P.plastered && r2.some((s) => s.name === 'bite') && r2.some((s) => s.name === 'hiss') && P.bursts - before === r2.filter((s) => s.name === 'purr' && s.offset > 0).length,
    `${P.bursts - before} bursts before the bite; ${list(r2.slice(-3))}`);
}

AudioBufferSourceNode.prototype.start = nativeStart;
check('playtest no impact file was fetched during the whole session', (await impactRequests()).length === 0);
await __shot('sounds-playtest');
