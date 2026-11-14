// Sky lane (playtest 2, 2026-11-12). Run with checks/lib.js, desktop at dpr 1 (and 844x390 for a landscape phone):
//   1. the star is a secret found by spinning him really fast, not a sigil; Starstruck is gone, Fluent is nine signs
//   2. two spin thresholds: one fast flick earns Spin Doctor and never the galaxy; ~7 s of hard swiping opens it
//   3. the galaxy has no black hole, comes in about 3x slower, and holds until a click (Esc too)
//   4. spinning the bread really fast blasts it off (playtest 3: no riser or pop here, they are the loaf's), the
//      drift kept inside a circle in the middle of the screen
//   5. a bolt that charges a top in the puddle tints the water instead of turning it bright
cat.auto = false;
const g = E.galaxy, U = g.uniforms, overlay = stage.scene.getObjectByName('galaxy'), A = site.achievements;
const { FINDS } = await import(new URL('src/finds.js', document.baseURI).href);
const { ACHIEVEMENTS, SIGN_IDS } = await import(new URL('src/achievements.js', document.baseURI).href);
const W = stage.width, H = stage.height;

// ---- 1. the star ----
const star = FINDS.find((f) => f.id === 'star'), fluent = ACHIEVEMENTS.find((a) => a.id === 'fluent');
check('sky the star is a secret, not a sigil', star.kind === 'secret' && !star.sigil && !SIGILS.star && !site.spells.star
  && !site.combos.ROWS.some((r) => r.second === 'star'), `kind ${star.kind}; templates ${Object.keys(SIGILS).join(' ')}`);
{ // a five-point star drawn on the air: a scribble now
  await until(settled, 8000);
  const c = { x: W * 0.2, y: stage.insets.top + 130 }, R = 60, pts = [];
  for (const j of [0, 2, 4, 1, 3, 0]) { const a = -Math.PI / 2 + j * 2 * Math.PI / 5; pts.push({ x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) }); }
  const dense = pts.slice(1).flatMap((p, i) => Array.from({ length: 12 }, (_, k) => ({ x: pts[i].x + (p.x - pts[i].x) * k / 12, y: pts[i].y + (p.y - pts[i].y) * k / 12 })));
  const n0 = site.ink.log.length;
  await drag([...dense, pts.at(-1)], 4); await sleep(400);
  const l = site.ink.log.at(-1);
  check('sky a drawn star casts nothing', site.ink.log.length > n0 && !l.name && !g.isOpen && !registry.has('star'), `recognizer: ${l ? drew(l) : 'no stroke'}`);
}
check('sky Starstruck is gone and Fluent is the nine signs', !ACHIEVEMENTS.some((a) => a.id === 'star') && SIGN_IDS.length === 9 && /nine/.test(fluent.said),
  `${SIGN_IDS.length} signs: ${SIGN_IDS.join(' ')}; "${fluent.said}"`);
store.set('achievements.star', Date.now());                 // an old save's Starstruck
check('sky an old saved Starstruck is harmless', A.total === ACHIEVEMENTS.length && A.count === ACHIEVEMENTS.filter((a) => A.has(a.id)).length && !A.has('fluent'),
  `${A.count} of ${A.total}`);

// ---- 2. two spin thresholds ----
await until(settled, 8000);
await swipe(1500); await sleep(150);
check('sky one fast flick earns Spin Doctor and not the galaxy', A.has('spin') && !g.isOpen && !A.has('void'), `tally ${g.fast.toFixed(2)} s of ${g.config.spin.seconds}`);
await catchHim();
const slow = await spinHard(() => g.isOpen, { pxPerSec: 1400, max: 14 });
check('sky swiping at Spin Doctor speed never opens the galaxy', !slow && !g.isOpen, `14 swipes at 1400 px/s; tally ${g.fast.toFixed(2)} s`);
check('sky (no 360 got in the way)', await until(settled, 3000), `locked ${input.locked}`);
await sleep(1600);

// ---- 3. the galaxy ----
check('sky the galaxy has no black hole', !/hBlackHole|hDisk|uHoleBH|uGravityMotion|photon/i.test(overlay.material.fragmentShader)
  && !('uHoleBH' in U) && !g.config.cutscene.hole && !g.config.cutscene.swirlDeg);
// playtest 3 (Aaron: "it needs to activate after roughly 7 seconds of fast spinning"): four seconds of hard swiping
// is not enough; about seven seconds of it opens the galaxy (GALAXY.spin.seconds, a named config value)
{ const t = performance.now(); let n = 0; while (performance.now() - t < 4000) { await swipe(2600); n++; }
  check('sky four seconds of hard swiping does not open the galaxy', !g.isOpen && !input.locked, `${n} swipes; tally ${g.fast.toFixed(2)} s of ${g.config.spin.seconds}`);
  await catchHim(); await until(() => g.fast === 0, 6000); await sleep(1600);
  await until(settled, 20000); }      // (a coast that ends one full turn round is the 360 no-scope: let it finish first)
let swipes = 0;
const t0 = performance.now();
const opened = await spinHard(() => { swipes++; return g.isOpen; }, { pxPerSec: 2600, max: 90 });
const spun = (performance.now() - t0) / 1000;
check('sky about seven seconds of hard swiping opens the galaxy and finds the star', opened && registry.has('star') && A.has('void') && input.locked
  && g.config.spin.seconds === 7 && spun >= 6.3 && spun <= 9.5, `${swipes - 1} swipes at 2600 px/s, ${spun.toFixed(2)} s`);
{
  const at = stage.clock, trace = [];
  const rec = () => trace.push({ t: stage.clock - at, level: g.level, dim: g.dim, phase: g.phase });
  stage.onFrame.push(rec);
  await sleep(2000);
  const m = catMid(); await tap(m.x, m.y); await tap(W * 0.1, H * 0.5);      // presses on the way in do nothing
  check('sky a press on the way in does not end it', g.isOpen && g.phase === 'spin' && input.locked, `phase ${g.phase}`);
  await until(() => g.phase === 'hold', 15000);
  const held = stage.clock - at;
  await sleep(2600);                                                          // past the old 8 s automatic end
  stage.onFrame.splice(stage.onFrame.indexOf(rec), 1);
  const full = (k) => trace.find((p) => p[k] >= 0.999)?.t;
  check('sky the way in is about three times slower', Math.abs(full('level') - 2.7) < 0.25 && Math.abs(full('dim') - 6.6) < 0.35 && Math.abs(held - g.wayIn) < 0.2,
    `felt to sky in ${full('level')?.toFixed(2)} s (was 0.9), dark closed in ${full('dim')?.toFixed(2)} s (was 2.2), hold from ${held.toFixed(2)} s`);
  check('sky the galaxy holds until a click', g.phase === 'hold' && input.locked && stage.clock - at > 9 && document.body.classList.contains('galaxy-hold'),
    `still holding at ${(stage.clock - at).toFixed(1)} s`);
  await __shot('sky-galaxy-hold');
  await tap(W * 0.15, H * 0.4);
  check('sky a click brings him back', g.phase === 'recede' && !document.body.classList.contains('galaxy-hold'), `phase ${g.phase}`);
  await until(() => !g.isOpen && !input.locked, 8000);
  check('sky the page is back, with the postcard', !g.isOpen && !input.locked && !overlay.visible && await until(() => keepsakes.has('postcard'), 2500));
}
{ // Esc ends the hold too, and the found mark replays it
  await until(settled, 8000);
  await fast(4, async () => { E.galaxy.again(); await until(() => g.phase === 'hold', 10000); });
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const esc = g.phase === 'recede';
  await until(() => !g.isOpen && !input.locked, 8000);
  check('sky Esc ends the hold; the star mark replays the galaxy', esc && !g.isOpen && !input.locked);
}

// ---- 4. the bread ----
await E.bread.whenReady(); cat.setButter(false, 'quiet');
const circle = () => ({ x: W / 2, y: H / 2, r: E.bread.config.blast.ring * Math.min(W, H) });
async function blast(start) {
  await until(settled, 10000);
  E.bread.now('check'); await until(() => E.bread.isBread, 9000); await sleep(200);
  const path = [];
  const rec = () => { const f = E.bread.flight; if (f && f.ended === null && E.bread.state === 'blasting') path.push(cat.screenOf([0, cat.height * 0.4, 0])); };
  stage.onRender.push(rec);
  const b0 = E.bread.blasts, g0 = g.trips;
  await start();
  await until(() => E.bread.blasts > b0, 6000);
  await until(() => E.bread.state === 'cat' && !input.locked, 25000);
  stage.onRender.splice(stage.onRender.indexOf(rec), 1);
  const c = circle(), d = (p) => Math.hypot(p.x - c.x, p.y - c.y), first = path[0], last = path.at(-1);
  return { blasted: E.bread.blasts === b0 + 1, galaxy: g.trips !== g0 || g.isOpen, path, c, start: first ? d(first) : NaN, end: last ? d(last) : NaN,
    worst: Math.max(...path.map(d)), onScreen: path.every((p) => p.x > 0 && p.x < W && p.y > 0 && p.y < H), at: E.bread.blastAt };
}
const b = await blast(() => spinHard(() => E.bread.state === 'blasting', { pxPerSec: 2600, max: 30 }));
check('sky spinning the bread really fast blasts it off, not the galaxy', b.blasted && !b.galaxy && registry.has('blastoff'), `${b.path.length} flight frames`);
// playtest 3 (e1113-06): the riser and the pop belong to the loaf sigil now (checks/bread.js); the blast-off trembles
// while the dark closes in, then launches
const T = E.bread.config.blast;
check('sky the blast-off trembles while the dark closes, then launches (no riser, no pop: those are the loaf\'s)', !!b.at && Math.abs(b.at.windup - T.windup) < 0.1 && !T.riser && !T.pop,
  b.at ? `windup ${b.at.windup.toFixed(2)} s of ${T.windup}` : 'no timing');
const inside = (r) => r.end <= r.c.r + 2 && r.worst <= Math.max(r.c.r, r.start) + 2 && r.onScreen;
const random = Math.random;
const ends = [];
for (const k of [0, 0.999]) {                       // the widest throws either way: furthest out, furthest round
  Math.random = () => k;
  const r = await blast(() => E.bread.blastOff()); Math.random = random;
  ends.push(r);
}
check('sky the bread drifts inside the circle in the middle of the screen', [b, ...ends].every(inside),
  [b, ...ends].map((r) => `end ${r.end.toFixed(0)} px, furthest ${r.worst.toFixed(0)} px from the middle (circle ${r.c.r.toFixed(0)} px, start ${r.start.toFixed(0)}), on screen ${r.onScreen}`).join('; '));

// ---- 5. charged water ----
await until(settled, 8000);
await fast(8, () => E.glass.show());
const pool = keepsakes.get('puddle'), [px, pz, pw] = pool.state.floor, top = keepsakes.give('top'); await top.worldTask;
const e = top.worldEntry, body = e.body, Wd = site.world, C = site.worldProps.charged;
body.setTranslation({ x: px + pw * 0.3, y: 0.003, z: pz }, false); body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false);
body.setLinvel({ x: 0, y: 0, z: 0 }, false); body.setAngvel({ x: 0, y: 0, z: 0 }, false); Wd.park(e); Wd.sync(e);
await until(() => !Wd.stats.listening, 8000);
const gl = stage.renderer.getContext();
async function poolPixels() {
  let out = null;
  const f = () => { const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, p = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, p); out = { w, h, p }; };
  stage.onPresented.push(f); await until(() => out, 3000, 10); stage.onPresented.splice(stage.onPresented.indexOf(f), 1);
  const P = stage.toScreen(pool.object.position), dpr = stage.dpr, s = { over: 0, blue: 0, n: 0 };
  for (let dy = -8; dy <= 8; dy += 2) for (let dx = -70; dx <= 30; dx += 2) {
    const X = Math.round((P.x + dx) * dpr), Y = Math.round(out.h - (P.y + dy) * dpr), i = (Y * out.w + X) * 4;
    s.over = Math.max(s.over, Math.max(out.p[i], out.p[i + 1], out.p[i + 2]) - out.p[i + 3]);   // colour past its own coverage = added light
    s.blue += out.p[i + 2] - out.p[i]; s.n++;
  }
  s.blue /= s.n; return s;
}
const plain = await poolPixels();
await fast(8, () => site.cast('zigzag')); await until(() => !E.bolt.busy, 8000); await sleep(300);
const charged = await poolPixels();
await __shot('sky-charged-water');
// the water's own highlights add a little light (plain); the charge must add none on top
check('sky charged water tints blue instead of turning bright', C.active && charged.over <= plain.over + 3 && charged.blue > plain.blue + 3,
  `colour past coverage: plain ${plain.over}, charged ${charged.over}; blue lean ${plain.blue.toFixed(1)} -> ${charged.blue.toFixed(1)}`);
C.stop();
