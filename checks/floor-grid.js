// floor-grid.js (grid lane, playtest-4, e1114-13: "A it is for the grid lines"). Run with checks/lib.js.
//   node checks/run.mjs <url>?dpr=N --lib checks/lib.js --js checks/floor-grid.js --size desktop|phone|1536x864|phone-notch
// URL options: ?safe=l,r,t,b the screen's safe area (as checks/controls.js); ?doors=hold checks the loading doors instead.
// The floor grid (src/world/floor-grid.js) is always on and:
//  1 draws: at the default zoom and at the zoom slider's least and most (85%, 130%), the frame with the grid differs from
//    the same frame without it (the page's clock held, two frames without it to show the rest is still);
//  2 sits under everything: it is the main pass's FIRST draw (so every floor shadow, keepsake, piece of furniture and
//    the cat paint over it), and where any of them is opaque over a grid line the pixels are identical with and without
//    it (the grid alone is drawn into a target to know where its lines are);
//  3 reaches past the screen at every zoom: the floor under every point of the screen's sides and bottom where the
//    grid still shows is inside its plane;
//  4 costs nothing a frame on the CPU (no per-frame, render or resize hook), one draw call, and a GPU line (the grid
//    alone drawn 300 times, as checks/diag/gridmock-cost.js);
//  5 never shows through or over a full-screen scene: the galaxy's dark (pixels with and without it), the flappy game and
//    the YOU JUST LOST THE GAME trailer, the grimoire's sheet (an opaque element over every grid point), the cake's error
//    page (the canvas is hidden under it); with ?doors=hold the loading doors (closed: only he is drawn; parting: the
//    grid only inside the gap).
const T = site.THREE, R = stage.renderer, gl = R.getContext(), grid = site.floorGrid, q = new URLSearchParams(location.search);
const show = (o) => JSON.stringify(o);
check('grid is on by default and sits in the room', !!grid && grid.mesh.parent === stage.scene && grid.visible && grid.mesh.renderOrder === -20);
if (!grid) { __done(); throw Error('no grid'); }
const SAFE = q.get('safe') ? q.get('safe').split(',').map(Number) : null;
if (SAFE) {
  const [left, right, top, bottom] = SAFE, ok = await __safeArea({left, right, top, bottom}); dispatchEvent(new Event('resize')); await sleep(600);
  check('grid safe area emulated', ok && stage.insets.left === left && stage.insets.right === right, show(stage.insets));
}
// ---- frames: read the page's own frame right after it is drawn ----
function grab() {
  return new Promise((res) => {
    const f = () => {
      stage.onPresented.splice(stage.onPresented.indexOf(f), 1);
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      const calls = R.info.render.calls; gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      res({px, w, h, calls, gap: site.shell?.gap});
    };
    stage.onPresented.push(f);
  });
}
// with the page's clock held: grid on, off, off again (the second off frame shows what moves anyway)
async function pair() {
  const ts = stage.timeScale; stage.timeScale = 0;
  try { await grab(); grid.visible = true; const A = await grab(); grid.visible = false; const B = await grab(); const B2 = await grab(); return {A, B, B2}; }
  finally { grid.visible = true; stage.timeScale = ts; }
}
// the grid alone, into a target of the same size: where its lines are
function gridAlone() {
  const s = R.getDrawingBufferSize(new T.Vector2()), rt = new T.WebGLRenderTarget(s.x, s.y), sc = new T.Scene();
  const m = new T.Mesh(grid.mesh.geometry, grid.mesh.material); m.matrixAutoUpdate = false; m.matrix.copy(grid.mesh.matrixWorld); m.frustumCulled = false; sc.add(m);
  const prev = R.getRenderTarget(), px = new Uint8Array(s.x * s.y * 4);
  try { R.setRenderTarget(rt); R.clear(); R.render(sc, stage.camera); R.readRenderTargetPixels(rt, 0, 0, s.x, s.y, px); }
  finally { R.setRenderTarget(prev); rt.dispose(); }
  return {px, w: s.x, h: s.y};
}
function compare({A, B, B2}, G) {
  const r = {pixels: A.w * A.h, drawn: 0, moving: 0, opaqueOnLines: 0, changedOpaque: 0, maxDiff: 0, calls: [A.calls, B.calls]};
  for (let i = 0; i < A.px.length; i += 4) {
    if (B.px[i] !== B2.px[i] || B.px[i + 1] !== B2.px[i + 1] || B.px[i + 2] !== B2.px[i + 2] || B.px[i + 3] !== B2.px[i + 3]) { r.moving++; continue; }
    const d = Math.max(Math.abs(A.px[i] - B.px[i]), Math.abs(A.px[i + 1] - B.px[i + 1]), Math.abs(A.px[i + 2] - B.px[i + 2]), Math.abs(A.px[i + 3] - B.px[i + 3]));
    if (d) r.drawn++; r.maxDiff = Math.max(r.maxDiff, d);
    if (G && B.px[i + 3] === 255 && G.px[i + 3] > 0) { r.opaqueOnLines++; if (d) r.changedOpaque++; }
  }
  return r;
}
// css-pixel points on the grid's lines (strongest first), for the full-screen covers
function gridPoints(G, n = 240) {
  const dpr = G.w / stage.width, all = [];
  for (let i = 0; i < G.px.length; i += 4 * 7) if (G.px[i + 3] > 8) { const p = i / 4; all.push({x: (p % G.w) / dpr, y: (G.h - 1 - Math.floor(p / G.w)) / dpr, a: G.px[i + 3]}); }
  all.sort((a, b) => b.a - a.a); const step = Math.max(1, Math.floor(all.length / n));
  return all.filter((_, i) => i % step === 0).slice(0, n);
}
// what covers the canvas at a css point: an element above it, fully opaque (its own background, its whole chain's opacity)
function coverAt(x, y) {
  if (getComputedStyle(canvas).visibility === 'hidden') return 'canvas hidden';
  for (const el of document.elementsFromPoint(x, y)) {
    // (the page's own background is beneath the canvas; a full-screen scene may make the canvas inert, so it is not hit)
    if (el === canvas || el === document.body || el === document.documentElement) return null;
    const cs = getComputedStyle(el); if (cs.visibility !== 'visible') continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
    const opaque = (c) => { const v = (c.match(/[\d.]+/g) ?? []).map(Number); return v.length >= 3 && (v.length < 4 || v[3] >= .99); };
    // an opaque colour, or a gradient of only opaque colours (the trailer's dark)
    const gradient = /gradient/.test(cs.backgroundImage) && !/transparent|url\(/.test(cs.backgroundImage) && (cs.backgroundImage.match(/rgba?\([^)]*\)/g) ?? []).every(opaque);
    if (op >= .99 && (opaque(cs.backgroundColor) || gradient)) return el.id || el.className || el.tagName;
  }
  return null;
}
const covered = (pts) => { const by = {}; let open = 0; for (const p of pts) { const c = coverAt(p.x, p.y); if (c) by[c] = (by[c] ?? 0) + 1; else open++; } return {open, by, of: pts.length}; };
const settle = async () => { await until(() => !site.world.stats.listening && !site.worldPresentation.pending, 15000); await sleep(400); };

// ---- the loading doors (?doors=hold) ----
if (stage.opt('doors') === 'hold') {
  const shell = site.shell;
  check('grid doors are held closed', shell.masking && shell.gap === 0, show({masking: shell.masking, gap: shell.gap}));
  const closed = compare(await pair());
  check('grid not drawn while the doors are closed (only he is drawn over them)', closed.drawn === 0, show(closed));
  shell.go();
  await until(() => shell.gap > .15 && shell.gap < .7, 20000, 4);
  const p = await pair(), gap = Math.max(p.A.gap, p.B.gap, p.B2.gap), w = p.A.w, x0 = Math.floor(w * (1 - gap) / 2) - 1, x1 = Math.ceil(w * (1 + gap) / 2) + 1;
  let inGap = 0, outside = 0;
  for (let i = 0; i < p.A.px.length; i += 4) {
    if (p.A.px[i + 3] === p.B.px[i + 3] && p.A.px[i] === p.B.px[i] && p.A.px[i + 1] === p.B.px[i + 1] && p.A.px[i + 2] === p.B.px[i + 2]) continue;
    const x = (i / 4) % w; if (x >= x0 && x <= x1) inGap++; else outside++;
  }
  check('grid while the doors part: only inside the gap', outside === 0 && inGap > 0, show({gap: +gap.toFixed(3), inGap, outside}));
  await until(() => shell.revealed, 20000);
  await __shot('grid-doors-open');
  __done();
} else {
  // ---- a room to sit on it: keepsakes on the floor ----
  for (const id of ['paper', 'tin', 'top', 'pat', 'ticket']) keepsakes.give(id);
  await Promise.all(['paper', 'tin', 'top', 'pat', 'ticket'].map((id) => keepsakes.get(id).worldTask));
  await settle();

  // 2 the main pass's first draw
  {
    const seen = [], wrapped = []; let armed = false;
    stage.scene.traverse((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      const own = Object.prototype.hasOwnProperty.call(o, 'onBeforeRender'), prev = o.onBeforeRender;
      wrapped.push([o, own, prev]); o.onBeforeRender = function (...a) { if (armed) seen.push(this); return prev.apply(this, a); };
    });
    const on = () => { armed = true; }, off = () => { armed = false; };
    stage.onPresent.unshift(on); stage.onPresented.unshift(off);
    await grab();
    stage.onPresent.splice(stage.onPresent.indexOf(on), 1); stage.onPresented.splice(stage.onPresented.indexOf(off), 1);
    for (const [o, own, prev] of wrapped) { if (own) o.onBeforeRender = prev; else delete o.onBeforeRender; }
    const name = (o) => o.name || o.parent?.name || o.type, shadows = seen.filter((o) => /shadow/i.test(name(o)) || o === site.worldPresentation.shadowMesh);
    check('grid is the first draw of the main pass (every shadow, keepsake, piece of furniture and the cat after it)',
      seen[0] === grid.mesh && seen.indexOf(grid.mesh) === seen.lastIndexOf(grid.mesh) && shadows.length > 0,
      show({first: seen.slice(0, 6).map(name), draws: seen.length, shadows: shadows.length}));
  }

  // 1, 2, 3 at the default zoom and the slider's ends
  const Z = site.zoom.ZOOM, zooms = [site.zoom.value, Z.min, Z.max];
  for (const z of zooms) {
    if (Math.abs(site.zoom.value - z) > 1e-6) { site.zoom.set(z); await settle(); }
    const tag = `zoom ${Math.round(z * 100)}%`, G = gridAlone(), r = compare(await pair(), G);
    check(`grid draws on the floor (${tag})`, r.drawn > r.pixels * .002 && r.moving < r.pixels * .01, show(r));
    check(`grid under every opaque pixel of the cat, the keepsakes and the furniture (${tag})`, r.opaqueOnLines > 200 && r.changedOpaque === 0, show({opaqueOnLines: r.opaqueOnLines, changed: r.changedOpaque}));
    check(`grid one draw call (${tag})`, r.calls[0] - r.calls[1] === 1, show(r.calls));
    // 3: along the screen's sides and bottom, wherever the grid still shows (in front of its far fade), the floor there
    // is inside its plane
    const A = grid.AREA, out = [];
    for (let k = 0; k <= 20; k++) for (const [x, y] of [[0, stage.height * k / 20], [stage.width, stage.height * k / 20], [stage.width * k / 20, stage.height]]) {
      const ray = stage.ray(x, y); if (ray.direction.y >= 0) continue;
      const f = stage.onFloor(x, y); if (f.z < A.fadeZ[1]) continue;
      if (f.x < A.x[0] || f.x > A.x[1] || f.z < A.z[0] || f.z > A.z[1]) out.push([Math.round(x), Math.round(y), +f.x.toFixed(2), +f.z.toFixed(2)]);
    }
    check(`grid plane reaches past the screen's sides and bottom (${tag})`, out.length === 0, show(out.slice(0, 4)));
    await __shot(`grid-zoom${Math.round(z * 100)}`);
  }
  if (Math.abs(site.zoom.value - site.zoom.deviceDefault) > 1e-6) { site.zoom.set(site.zoom.deviceDefault); await settle(); }
  const G = gridAlone(), pts = gridPoints(G);

  // 4 cost
  {
    // a second grid, built synchronously while every page hook list counts what is added to it
    const { floorGrid } = await import(new URL('src/world/floor-grid.js', document.baseURI).href), lists = {onFrame: stage.onFrame, onRender: stage.onRender, onPresent: stage.onPresent, onPresented: stage.onPresented, onResize: stage.onResize}, added = {};
    const lengths = Object.fromEntries(Object.entries(lists).map(([k, l]) => [k, l.length]));
    const extra = floorGrid(site);
    for (const [k, l] of Object.entries(lists)) if (l.length !== lengths[k]) added[k] = l.length - lengths[k];
    extra.dispose();
    check('grid adds no per-frame, render or resize work', Object.keys(added).length === 0, show(added));
    const scene = new T.Scene(), empty = new T.Scene(), copy = new T.Mesh(grid.mesh.geometry, grid.mesh.material);
    copy.matrixAutoUpdate = false; copy.matrix.copy(grid.mesh.matrixWorld); copy.frustumCulled = false; scene.add(copy);
    const px = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px), ac = R.autoClear;
    const time = (s, n = 300) => { sync(); const t = performance.now(); for (let i = 0; i < n; i++) R.render(s, stage.camera); sync(); return (performance.now() - t) / n; };
    const med = (a) => a.sort((x, y) => x - y)[a.length >> 1], withGrid = [], without = [];
    stage.paused = true; R.autoClear = true;
    try { time(scene, 20); time(empty, 20); for (let r = 0; r < 5; r++) { withGrid.push(time(scene)); without.push(time(empty)); } }
    finally { R.autoClear = ac; stage.paused = false; }
    const ms = med(withGrid) - med(without), s = R.getDrawingBufferSize(new T.Vector2());
    check('grid GPU cost per frame under 0.25 ms', ms < .25, `${ms.toFixed(3)} ms at ${s.x}x${s.y} (grid ${med(withGrid).toFixed(3)}, empty ${med(without).toFixed(3)}); nothing a frame on the CPU, one draw call`);
  }

  // 5 full-screen scenes
  // the galaxy: its dark covers the room, and the grid with it
  {
    const galaxy = E.galaxy; cat.auto = false;
    galaxy.open('check');
    await fast(4, () => until(() => galaxy.phase === 'hold', 15000));
    await sleep(300);
    const r = compare(await pair());
    await __shot('grid-galaxy');
    check('grid does not show through the galaxy (pixels with and without it at most 2 levels apart)', galaxy.phase === 'hold' && r.maxDiff <= 2, show({phase: galaxy.phase, maxDiff: r.maxDiff, drawn: r.drawn, moving: r.moving}));
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await until(() => !galaxy.isOpen, 6000); cat.auto = true; await settle();
  }
  // the flappy game, then the trailer (YOU JUST LOST THE GAME)
  // (the screen pauses the page's own timers: these waits run on the wall clock, as checks/flappy-unfreeze.js)
  const {openScreen, loadFlightArt} = await import(new URL('src/flappy/screen.js', document.baseURI).href);
  const {wallClock} = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
  const wait = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
  const poll = async (f, ms) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wait(20); } return false; };
  await loadFlightArt();   // as the bird's circle does before it opens the game
  for (const kind of ['game', 'trailer']) {
    const s = openScreen(site, kind, () => {});
    await poll(() => s.root.classList.contains('shown') && Number(getComputedStyle(s.root).opacity) >= .99, 4000);
    await wait(kind === 'trailer' ? 900 : 300);
    const c = covered(pts);
    check(`grid covered by flappy's ${kind} screen at every grid point`, c.open === 0 && c.of > 50, show(c));
    s.close(false);
    await poll(() => !document.querySelector('#bird-screen'), 25000);
    await wait(300);
  }
  // the grimoire: its sheet covers the room; round it, the room (grid and all) shows dimmed, as it should
  {
    // (the book freezes the page under it: wall-clock waits here too)
    site.books.open('grimoire'); await poll(() => site.books.showing === 'grimoire', 4000); await wait(500);
    const sheet = document.querySelector('.book-sheet').getBoundingClientRect(), inside = pts.filter((p) => p.x > sheet.left + 2 && p.x < sheet.right - 2 && p.y > sheet.top + 2 && p.y < sheet.bottom - 2);
    const c = covered(inside);
    await __shot('grid-grimoire');
    check('grid covered by the grimoire\'s sheet at every grid point under it', c.open === 0 && c.of > 30, show(c));
    site.books.close(); await poll(() => !site.books.showing, 4000); await wait(300);
  }
  // the cake's error page: body.party-error hides everything but the page (src/gags/party.js), the canvas with it
  {
    document.body.classList.add('party-error'); const v = getComputedStyle(canvas).visibility; document.body.classList.remove('party-error');
    check('grid hidden under the cake\'s error page (the canvas is hidden while it shows)', v === 'hidden' && canvas.parentElement === document.body, v);
  }
  check('grid back on after every scene', grid.visible && grid.mesh.parent === stage.scene);
  await __shot('grid-room');
  __done();
}
