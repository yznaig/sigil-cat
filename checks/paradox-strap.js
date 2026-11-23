// paradox-strap.js (p8): the Paradox's loaf sits on his back and its strap wraps him, in every pose and through a pose
// change during the gag. Aaron: "the bread straps visually onto the cat at least in the standing position really
// weird and floating". Measured on the screen, from the page's own frames: with time stopped mid-hover, the frame is
// read with him hidden, with him but no loaf, with him and the loaf but no strap, and with everything; the
// differences are his silhouette, the loaf's (with its butter) and the strap's. Then:
//   the loaf touches him: its nearest pixel is within `touch` of his silhouette, and a good part of its edge
//     (`contact` of its long side) lies along him: it rests on him rather than meeting him at one corner;
//   the strap wraps him: (almost) none of it is out in the air, away from him and the loaf (`air`), and it shows all
//     the way round his near side: its end furthest from the loaf comes to his outline (within `reach` of the
//     background), rather than sinking out of sight inside him halfway down (the old round hoop did).
// And in 3D, against the pose's own splats (what the screen cannot show: a strap standing off his flank toward the
// camera, a loaf off to one side of his back):
//   the loaf's underside (its lowest splats) lies on his fur: at least `under` of it within `underGap` of a splat of
//     his (the rest is where it bridges a dip or overhangs a rounded end);
//   the strap lies on his fur or the loaf: at most `off` of its length further than `offGap` from both.
// Gaps are in cat-heights (1 = his sitting height), so desktop and phone are judged alike.
const P = E.paradox, R = stage.renderer, gl = R.getContext();
const LIMIT = { touch: 0.015, contact: 0.35, air: 0.08, airGap: 0.025, reach: 0.03, under: 0.5, underGap: 0.04, off: 0.1, offGap: 0.04 };
cat.auto = false;
await E.bread.whenReady(); cat.setButter(true, 'quiet'); await cat.ensureButter();

const frames = (n) => new Promise((r) => { let k = 0; const f = () => { if (++k >= n) { stage.onPresented.splice(stage.onPresented.indexOf(f), 1); r(); } }; stage.onPresented.push(f); });
function grab() {
  return new Promise((r) => {
    const f = () => {
      stage.onPresented.splice(stage.onPresented.indexOf(f), 1);
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); r({ w, h, px });
    };
    stage.onPresented.push(f);
  });
}
async function shotOf(setup) { setup(); cat.touch(); await frames(3); return grab(); }
const differ = (a, b) => { const m = new Uint8Array(a.w * a.h); for (let i = 0; i < m.length; i++) { const j = i * 4; m[i] = Math.abs(a.px[j] - b.px[j]) + Math.abs(a.px[j + 1] - b.px[j + 1]) + Math.abs(a.px[j + 2] - b.px[j + 2]) > 36 ? 1 : 0; } return m; };
// distance (px) from every pixel to the nearest pixel of a mask: two-pass chamfer (3-4)
function distance(m, w, h) {
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = m[i] ? 0 : 1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3); if (y > 0) { v = Math.min(v, d[i - w] + 3); if (x > 0) v = Math.min(v, d[i - w - 1] + 4); if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4); }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + 3); if (y < h - 1) { v = Math.min(v, d[i + w] + 3); if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4); if (x > 0) v = Math.min(v, d[i + w - 1] + 4); }
    d[i] = v;
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}
const count = (m) => m.reduce((s, v) => s + v, 0);

// ---- in 3D: his splats (each pose's file), the loaf's, and the strap, all in his own space ----
const { parseSpz } = await import(new URL('src/core/spz.js', document.baseURI).href);
const CELL = 0.03, furOf = {};
function grid(points) {
  const g = new Map(), key = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
  for (const p of points) { const k = key(...p); (g.get(k) ?? g.set(k, []).get(k)).push(p); }
  return (q, r = 0.1) => {                        // distance to the nearest point (r when none is nearer)
    let best = r; const c = Math.ceil(r / CELL), [cx, cy, cz] = q.map((v) => Math.floor(v / CELL));
    for (let a = -c; a <= c; a++) for (let b = -c; b <= c; b++) for (let d = -c; d <= c; d++) for (const p of g.get(`${cx + a},${cy + b},${cz + d}`) ?? []) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
    return best;
  };
}
async function furNear(pose) {                     // his fur: splats from a fifth opacity up (what shows of him; the stretch's
                                                   // fur is thick, its half-opaque splats lie well inside it)
  if (furOf[pose]) return furOf[pose];
  const s = parseSpz(new Uint8Array(await (await fetch(new URL(cat.config.files[pose], document.baseURI))).arrayBuffer())), pts = [];
  for (let i = 0; i < s.count; i++) if (s.rgba[i * 4 + 3] >= 50) pts.push([s.center[i * 3], s.center[i * 3 + 1], s.center[i * 3 + 2]]);
  return (furOf[pose] = grid(pts));
}
const inSpin = (o) => { cat.spin.updateMatrixWorld(true); return new THREE.Matrix4().copy(cat.spin.matrixWorld).invert().multiply(o.matrixWorld); };
const THREE = cat.THREE;
async function measure3d(pose) {
  const rig = P.rig, fur = await furNear(pose), stand = await E.bread.whenReady(), b = stand.splat;
  // the loaf's splats in his space; its underside: those in the lowest fifth of its height
  const m = inSpin(rig.loaf), v = new THREE.Vector3(), loafPts = [], low = [], cut = b.min[1] + (b.max[1] - b.min[1]) * 0.2;
  for (let i = 0; i < b.count; i++) {
    if (b.tColor[i * 4 + 3] < 128) continue;
    v.set(b.center[i * 3], b.center[i * 3 + 1], b.center[i * 3 + 2]).applyMatrix4(m);
    loafPts.push([v.x, v.y, v.z]); if (b.center[i * 3 + 1] < cut) low.push([v.x, v.y, v.z]);
  }
  const under = low.filter((p) => fur(p) <= LIMIT.underGap).length / low.length;
  // the strap's middle line: its own geometry's vertices, each tube ring's centre
  const strap = rig.straps[rig.shownFor], g = strap.geometry, pos = g.attributes.position, sm = inSpin(strap), line = [];
  const ring = (g.parameters.radialSegments ?? 8) + 1, rings = pos.count / ring;
  for (let r = 0; r < rings; r++) {
    const c = new THREE.Vector3();
    for (let j = 0; j < ring; j++) c.add(v.fromBufferAttribute(pos, r * ring + j));
    line.push(c.multiplyScalar(1 / ring).applyMatrix4(sm));
  }
  const nearLoaf = grid(loafPts);
  const off = line.filter((p) => { const q = [p.x, p.y, p.z]; return Math.min(fur(q), nearLoaf(q)) > LIMIT.offGap + P.config.strap; }).length / line.length;
  return { under, off };
}

// With time stopped and him in the air: his silhouette, the loaf's and the strap's, and how they meet.
async function measure(label) {
  const rig = P.rig, strap = rig.straps[rig.shownFor];
  const all = await shotOf(() => {});
  const noStrap = await shotOf(() => { strap.visible = false; });
  const noRig = await shotOf(() => { rig.group.visible = false; });
  const empty = await shotOf(() => { cat.hide('paradox-strap-check', true); });
  cat.hide('paradox-strap-check', false); rig.group.visible = true; strap.visible = true; cat.touch(); await frames(2);
  const { w, h } = all, him = differ(noRig, empty), loaf = differ(noStrap, noRig), band = differ(all, noStrap);
  const unit = cat.height * cat.rect.ppu * stage.dpr;                 // one cat-height in device pixels
  const dHim = distance(him, w, h);
  // the loaf: its nearest pixel to him, and how much of its edge lies along him
  let near = Infinity, edge = 0, along = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (!loaf[i]) continue;
    near = Math.min(near, dHim[i]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    if (loaf[i - 1] && loaf[i + 1] && loaf[i - w] && loaf[i + w]) continue;
    edge++; if (dHim[i] <= LIMIT.touch * unit) along++;
  }
  const long = Math.max(x1 - x0, y1 - y0) + 1, contact = along / long;
  const dLoaf = distance(loaf, w, h), open = new Uint8Array(w * h);
  for (let i = 0; i < open.length; i++) open[i] = him[i] || loaf[i] || band[i] ? 0 : 1;
  const dOpen = distance(open, w, h);
  // the strap: the share of it that is out in the air, more than airGap from him and from the loaf
  const both = new Uint8Array(w * h); for (let i = 0; i < both.length; i++) both[i] = him[i] | loaf[i];
  const dBoth = distance(both, w, h);
  let strapPx = 0, out = 0, worst = 0, end = -1;
  for (let i = 0; i < band.length; i++) if (band[i]) {
    strapPx++; worst = Math.max(worst, dBoth[i]); if (dBoth[i] > LIMIT.airGap * unit) out++;
    if (end < 0 || dLoaf[i] > dLoaf[end]) end = i;
  }
  const reach = end < 0 ? Infinity : dOpen[end] / unit;
  const d3 = await measure3d(rig.shownFor);
  const r = { label, pose: rig.shownFor, ...d3, him: count(him), loafPx: count(loaf), strapPx, touch: near / unit, contact, reach, air: strapPx ? out / strapPx : 1, worst: worst / unit };
  const ok = r.him > 1000 && r.loafPx > 200 && r.strapPx > 50 && r.touch <= LIMIT.touch && r.contact >= LIMIT.contact && r.reach <= LIMIT.reach && r.air <= LIMIT.air && r.under >= LIMIT.under && r.off <= LIMIT.off;
  check(`paradox ${label}: the loaf rests on him and the strap wraps him`, ok,
    `loaf ${(r.touch * 100).toFixed(1)}% of his height from him, ${(r.contact * 100).toFixed(0)}% of its length along him; strap ends ${(r.reach * 100).toFixed(1)}% from his outline, ${(r.air * 100).toFixed(1)}% in the air (furthest ${(r.worst * 100).toFixed(1)}%); in 3D ${(r.under * 100).toFixed(0)}% of the loaf's underside on his fur, ${(r.off * 100).toFixed(0)}% of the strap off him; px him ${r.him} loaf ${r.loafPx} strap ${r.strapPx}`);
  return r;
}

async function poseTo(p) {
  cat.request(p);
  return until(() => cat.pose === p && cat.phase === 'hold' && !cat.popping && cat.shown === p, 10000);
}
// start the gag and stop time once he is up and side-on
async function upAndStill() {
  const run = P.start();
  await until(() => P.active && cat.fx.y > P.config.rise * 0.9 && Math.abs(cat.yaw - P.config.side) < 0.05, 8000);
  stage.timeScale = 0;
  return { run };                       // (not the promise itself: awaiting this would wait for the whole gag)
}
async function finish({ run }) { stage.timeScale = 8; await run; stage.timeScale = 1; await until(() => !P.active, 5000); await sleep(300); }

for (const p of ['sit', 'lie', 'sleep', 'stretch']) {
  check(`paradox ${p}: he holds the pose first`, await poseTo(p));
  cat.setButter(true, 'quiet'); await sleep(100);
  const run = await upAndStill();
  check(`paradox ${p}: the loaf is put on the pose he shows`, P.rig.shownFor === p && cat.showing === p, `${P.rig.shownFor} on ${cat.showing}`);
  await __shot(`paradox-${p}`);
  await measure(p);
  await finish(run);
}

// a pose change during the gag: the loaf and strap follow the pose he shows, from the frame it appears
check('paradox change: he sits first', await poseTo('sit'));
cat.setButter(true, 'quiet'); await sleep(100);
{
  const run = await upAndStill();
  stage.timeScale = 1;
  let seen = 0, wrong = 0;
  const watch = () => { seen++; if (P.rig.shownFor !== cat.showing) wrong++; };
  stage.onRender.push(watch);
  cat.request('lie');
  const landed = await until(() => cat.shown === 'lie' && !cat.popping, 6000);
  stage.onRender.splice(stage.onRender.indexOf(watch), 1);
  stage.timeScale = 0; await frames(2);
  check('paradox change: the loaf follows him into the new pose, every frame', landed && wrong === 0 && seen > 5 && P.rig.shownFor === 'lie', `${wrong} of ${seen} frames on the wrong pose; now on ${P.rig.shownFor}`);
  await __shot('paradox-sit-to-lie');
  await measure('sit to lie');
  await finish(run);
}
check('paradox: it ends cleanly (loaf off him, butter back on his head, time running)', !P.active && !P.rig.group.parent && cat.butterOn && stage.timeScale === 1);
__done();
