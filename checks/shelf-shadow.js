// shelf-shadow.js: the shelf's soft shadow lies on the floor (shelfshadow lane, music round, e1116-23; Aaron: "the shelfs
// shadow should appear further back on the floor, more realistically since it is sort of floating mid air"; mock-up
// option b). The room: the shelf with the rifle, the hat rack with its hats, the controller in its stand.
//   0 (with ?arrivals=1) the shelf's slide-in: the shadow stays on the floor, moves with the shelf, fades in with the
//     slide (nothing on the floor while the shelf is still off the page), and lands where a fresh paint puts it
//   1 at the zoom's least, default and most: on the floor plane (every corner at y=.001, face up), further back than the
//     shelf, below it on the page, and drawn (pixels with and without it)
//   2 it never lies under him: none of its pixels (drawn with him hidden) where he is drawn (2 px round him included),
//     unless the shelf itself runs behind him there (noted: a large zoom on a wide window)
//   3 nothing per frame: over 2.1 s idle no repaint, no move, no rebuild of the world presentation
//   4 a full-screen scene covers it: in the galaxy's hold, pixels with and without it at most 2 levels apart
//   node checks/run.mjs '<url>?arrivals=1' --lib checks/lib.js --js checks/shelf-shadow.js --size 1536x864|phone --dpr 1|2
const T = site.THREE, B = site.worldPresentation, R = stage.renderer, gl = R.getContext();
const show = (o) => JSON.stringify(o), live = new URLSearchParams(location.search).get('arrivals') === '1';
const {ZOOM} = await import(new URL('src/ui/zoom.js', document.baseURI).href);
cat.auto = false;
if (cat.pose !== 'sit') { await cat.load('sit'); cat.request('sit'); stage.timeScale = 8; await until(() => cat.pose === 'sit' && cat.phase === 'hold', 20000); stage.timeScale = 1; }
const settle = async () => { await until(() => !site.world.stats.listening && !B.pending, 15000); await sleep(400); };
function corners(s) {
  s.card.updateMatrixWorld(true); s.quad.updateMatrixWorld(true);
  return [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]].map(([u, v]) => new T.Vector3(u, v, 0).applyMatrix4(s.quad.matrixWorld));
}
const centre = (s) => { const c = corners(s); return c.reduce((a, p) => a.add(p), new T.Vector3()).divideScalar(4); };
const onFloor = (s) => corners(s).every((p) => Math.abs(p.y - .001) < 1e-4) && new T.Vector3(0, 0, 1).transformDirection(s.quad.matrixWorld).y > .999;

// ---- 0 the slide-in ----
const tin = keepsakes.give('tin'); await tin.worldTask;
const rifle = keepsakes.give('rifle'); await rifle.worldTask;
await site.shelf.task; const shelf = site.shelf;
if (live) {
  const A = site.arrivals || (await import(new URL('src/world/arrival.js', document.baseURI).href)).furnitureArrivals(site), plan = A.plans.get('shelf');
  await until(() => plan && plan.state !== 'waiting', 8000, 10);
  const trace = [];
  while (plan.state === 'moving') {
    const s = shelf.shadow; if (s?.painted) { const c = centre(s); trace.push({u: plan.u, want: .24 * plan.opacity * plan.u, floor: onFloor(s), shown: s.card.visible ? +s.quad.material.opacity.toFixed(4) : 0, x: stage.toScreen(c).x, shelfX: shelf.picture.rect.x}); }
    await sleep(stage.reducedMotion ? 30 : 120);
  }
  await until(() => !shelf.arriving, 4000, 20); await sleep(200);
  const slid = trace.filter((p) => p.u > .02 && p.u < .98), lead = trace.filter((p) => p.u === 0);
  check('0 the slide-in: the shadow stays on the floor', trace.length > 20 && trace.every((p) => p.floor), show({samples: trace.length}));
  check('0 the slide-in: nothing on the floor while the shelf is still off the page; it fades in with the slide (opacity .24 x the slide)',
    lead.every((p) => p.shown === 0) && trace.every((p) => Math.abs(p.shown - p.want) < .002), show({lead: lead.length, last: trace.at(-1)}));
  if (!stage.reducedMotion) check('0 the slide-in: the shadow moves right with the shelf, never back',
    slid.length > 10 && slid.at(-1).x - slid[0].x > 60 && slid.every((p, i) => !i || p.x >= slid[i - 1].x - 1.5) && slid.at(-1).shelfX > slid[0].shelfX, show({first: slid[0], last: slid.at(-1)}));
  const at = shelf.shadow.card.position.clone(); shelf.shadow.paint(); const again = shelf.shadow.card.position;
  check('0 landed: the shadow is where a fresh paint puts it, at full strength', at.distanceTo(again) < 1e-4 && shelf.shadow.card.visible && Math.abs(shelf.shadow.quad.material.opacity - .24) < 1e-6, show({moved: at.distanceTo(again)}));
} else note('0 the slide-in', 'not run (headless places the shelf at once; run with ?arrivals=1)');

// ---- the room ----
for (let i = 0; i < 20 && rifle.worldEntry.support?.id !== 'shelf'; i++) { shelf.store('rifle', false); await sleep(150); }
keepsakes.take?.('tin');
const st = document.createElement('style'); st.textContent = '.ach-reveal{display:none!important}'; document.head.append(st);
const m = await import(new URL('src/flappy/controller.js', document.baseURI).href);
store.set('bird.stand', true); await m.ensureStand(site);
let c = keepsakes.give('controller'); if (!c) { m.defineController(site, () => {}); c = keepsakes.give('controller'); } await c.worldTask;
await until(() => site.stand.ready, 20000); site.stand.place(c.worldEntry, false);
await site.rack.ready({grant: site.eggs.hat.hats}); await until(() => !site.rack.arrival || site.rack.arrival.done, 15000);
document.activeElement?.blur(); ui.say?.(''); ui.speak?.(''); await settle();

// ---- frames: the page's own frame right after it is drawn ----
function grab() {
  return new Promise((res) => {
    const f = () => { stage.onPresented.splice(stage.onPresented.indexOf(f), 1); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); res({px, w, h}); };
    stage.onPresented.push(f);
  });
}
// with the clock held: what the shadow changes (on vs off, minus what moves anyway: off vs off again), as a mask
async function shadowMask() {
  const s = shelf.shadow;
  try { s.card.visible = true; await grab(); const A = await grab(); s.card.visible = false; await grab(); const Bf = await grab(), B2 = await grab(); return diff(A, Bf, B2); }
  finally { s.card.visible = true; }
}
async function maskOf(card) {
  try { card.visible = true; await grab(); const A = await grab(); card.visible = false; await grab(); const Bf = await grab(), B2 = await grab(); return diff(A, Bf, B2); }
  finally { card.visible = true; }
}
// how many pixels of `a` lie on or within 2 px of `b`
function touching(a, b) {
  let n = 0; const {w, h} = a;
  for (let p = 0; p < w * h; p++) {
    if (!a.mask[p]) continue; const x = p % w, y = (p / w) | 0;
    search: for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && b.mask[Y * w + X]) { n++; break search; } }
  }
  return n;
}
function diff(A, Bf, B2) {
  const n = A.w * A.h, mask = new Uint8Array(n); let count = 0, moving = 0, maxDiff = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4; let still = true, d = 0;
    for (let k = 0; k < 4; k++) { if (Bf.px[i + k] !== B2.px[i + k]) still = false; d = Math.max(d, Math.abs(A.px[i + k] - Bf.px[i + k])); }
    if (!still) { moving++; continue; }
    maxDiff = Math.max(maxDiff, d); if (d > 2) { mask[p] = 1; count++; }
  }
  return {mask, count, moving, maxDiff, w: A.w, h: A.h};
}

// ---- 1 + 2 at the zoom's least, default and most ----
const zoom0 = stage.zoom;
for (const [name, z] of [['least', ZOOM.min], ['default', zoom0], ['most', ZOOM.max]]) {
  stage.setZoom(z); await sleep(600); await settle();
  const s = shelf.shadow, cs = corners(s), mid = centre(s), r = shelf.picture.rect, top = Math.min(...cs.map((p) => stage.toScreen(p).y));
  check(`1 zoom ${name} (${z}): the shadow lies on the floor, face up`, s.painted && s.card.visible && onFloor(s), show({y: cs.map((p) => +p.y.toFixed(5))}));
  check(`1 zoom ${name}: further back than the shelf, below it on the page`, mid.z < shelf.root.position.z && top > r.y + r.h, show({shadowZ: +mid.z.toFixed(3), shelfZ: +shelf.root.position.z.toFixed(3), shadowTop: Math.round(top), shelfBottom: Math.round(r.y + r.h)}));
  const ts = stage.timeScale; stage.timeScale = 0;
  let S, C, F;
  try { cat.card.visible = false; S = await shadowMask(); cat.card.visible = true; C = await maskOf(cat.card); F = await maskOf(shelf.picture.card); }
  finally { cat.card.visible = true; stage.timeScale = ts; }
  check(`1 zoom ${name}: the shadow is drawn`, S.count > 200 && S.maxDiff >= 8, show({pixels: S.count, maxDiff: S.maxDiff, moving: S.moving}));
  // Where the shelf itself runs behind him (a large zoom on a wide window: the controls lane's shelf layout), its shadow
  // does too, as it should; that is noted, not failed. Otherwise none of the shadow may lie under him.
  const under = touching(S, C), shelfUnder = touching(F, C);
  if (shelfUnder > 0) note(`2 zoom ${name}: the shelf itself runs behind him here, and its shadow with it`, show({shadowPixels: S.count, under, shelfPixelsUnderHim: shelfUnder}));
  else check(`2 zoom ${name}: the shadow never lies under him`, C.count > 1000 && under === 0, show({shadowPixels: S.count, catPixels: C.count, under}));
  await __shot(`shelf-shadow-zoom-${name}`);
}
stage.setZoom(zoom0); await sleep(600); await settle();

// ---- 3 nothing per frame ----
{
  const s = shelf.shadow, n = {paint: 0, place: 0}, p0 = s.paint, q0 = s.place;
  s.paint = (...a) => { n.paint++; return p0(...a); }; s.place = (...a) => { n.place++; return q0(...a); };
  const before = show(B.stats); let frames = 0; const tick = () => frames++; stage.onRender.push(tick);
  await sleep(2100); stage.onRender.splice(stage.onRender.indexOf(tick), 1); s.paint = p0; s.place = q0;
  check('3 idle 2.1 s: the shadow is not repainted or moved, the presentation not rebuilt', frames > 60 && n.paint === 0 && n.place === 0 && show(B.stats) === before, show({...n, frames}));
}

// ---- 4 the galaxy covers it ----
{
  const galaxy = E.galaxy; galaxy.open('check');
  stage.timeScale = 4; await until(() => galaxy.phase === 'hold', 15000); stage.timeScale = 1; await sleep(300);
  const ts = stage.timeScale; stage.timeScale = 0; let S; try { S = await shadowMask(); } finally { stage.timeScale = ts; }
  await __shot('shelf-shadow-galaxy');
  check('4 the galaxy covers it: pixels with and without it at most 2 levels apart', galaxy.phase === 'hold' && S.maxDiff <= 2, show({phase: galaxy.phase, maxDiff: S.maxDiff, moving: S.moving}));
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  await until(() => !galaxy.isOpen, 6000);
}
__done();
