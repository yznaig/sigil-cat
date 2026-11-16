// floor-outline-lib.mjs: what checks/floor-outline.js and its reload half share (floor lane, music round 2026-11-15).
// The seven items that get the floor outline (src/world/floor-outline.js), the others it must leave alone, a fixed
// layout on the floor in front of the cat, and three measurements:
//   frames()      the canvas's own frame with the outline on, off, and off again (the page's clock held), so a pixel the
//                 outline changes is told from one that moves anyway
//   silhouette()  an item's picture drawn alone into a target: its exact silhouette (alpha), in device pixels
//   contrast()    the floormock lane's edge measure (checks/diag/floormock-measure.py on that branch), ported: in the
//                 screen as shown (the CSS floor under the canvas, a lossless screenshot), each silhouette pixel one in
//                 from its rim against the floor pixel D = 3 CSS px out of it in 8 directions, CIE76 dE; the median
export const SEVEN = ['recipe', 'eyes', 'recipe-flour', 'paper', 'shards', 'recipe-milk', 'bulb'];
export const OTHERS = ['rifle', 'ticket', 'tin', 'top', 'postcard', 'crumbs', 'pat', 'egg', 'recipe-butter'];
// cards and the googly eyes lie face up, as they land in play
const FLAT = new Set(['postcard', 'recipe', 'paper', 'ticket', 'eyes']);
export function rows(site, MOBILE) {
  const {stage, THREE: T} = site, feetY = stage.toScreen(new T.Vector3()).y, lowY = stage.height - stage.insets.bottom - 28;
  const zAt = (f) => stage.onFloor(stage.width / 2, feetY + f * (lowY - feetY)).z;
  return [
    {z: -.2, avoid: .62, ids: ['rifle', 'ticket', 'tin', 'top']},
    {z: zAt(.34), avoid: 0, ids: ['postcard', 'recipe', 'crumbs', 'pat', 'egg', 'bulb', 'recipe-butter']},
    {z: zAt(.88), avoid: 0, from: MOBILE ? .3 : .05, ids: ['recipe-flour', 'recipe-milk', 'paper', 'eyes', 'shards']},
  ];
}
// lays the items out across the rows and lets them settle (the mock-up's floormock-shot.js layout)
export async function layOut(site, MOBILE, {until, sleep}) {
  const {stage, keepsakes, THREE: T} = site, W = site.world, R = rows(site, MOBILE), all = R.flatMap((r) => r.ids);
  for (const id of all) { const i = keepsakes.give(id); await Promise.race([i?.worldTask, sleep(8000)]); }
  await until(() => !W.stats.listening, 15000); await sleep(600);
  const yOf = (z) => stage.toScreen(new T.Vector3(0, 0, z)).y;
  for (const row of R) {
    const y = yOf(row.z), left = stage.onFloor(stage.width * (row.from ?? .05), y).x, right = stage.onFloor(stage.width * (row.z > .3 ? .85 : .93), y).x;
    const n = row.ids.length, segs = row.avoid ? [[left, -row.avoid, Math.ceil(n / 2)], [row.avoid, right, n - Math.ceil(n / 2)]] : [[left, right, n]];
    const xs = segs.flatMap(([a, b, m]) => Array.from({length: m}, (_, k) => a + (b - a) * (k + .5) / m));
    row.ids.forEach((id, k) => {
      const e = keepsakes.get(id)?.worldEntry; if (!e) return;
      if (e.support) site.supports.detach(e);
      const b = e.body; b.setEnabled(true); b.setTranslation({x: xs[k], y: .25, z: row.z}, true);
      b.setRotation(FLAT.has(id) ? new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, 0)) : {x: 0, y: 0, z: 0, w: 1}, true);
      b.setLinvel({x: 0, y: 0, z: 0}, true); b.setAngvel({x: 0, y: 0, z: 0}, true); W.wake(e);
    });
  }
  stage.timeScale = 6;
  await until(() => all.every((id) => { const e = keepsakes.get(id)?.worldEntry; return !e || e.body.isSleeping(); }), 20000);
  stage.timeScale = 1; await sleep(1200);
  return all;
}
// a page point that presses this item: on its silhouette, at least 3 CSS px inside it, nearest its middle (the
// rect's centre is not always on it: the eyes are two lobes)
export function hitPoint(site, id) {
  const sil = silhouette(site, id), r = rectOf(site, id, 0), {w, a} = sil, in_ = (x, y) => a[y * w + x] > 200, m = Math.max(2, Math.round(3 * r.k));
  const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2; let best = null;
  for (let y = r.y0 + m; y < r.y1 - m; y++) for (let x = r.x0 + m; x < r.x1 - m; x++) {
    if (!(in_(x, y) && in_(x - m, y) && in_(x + m, y) && in_(x, y - m) && in_(x, y + m))) continue;
    const d = Math.hypot(x - cx, y - cy); if (!best || d < best.d) best = {x, y, d};
  }
  return best ? {x: best.x / r.k, y: best.y / r.k} : {x: cx / r.k, y: cy / r.k};
}
// ---- frames ----
export function grab(site) {
  const {stage} = site, gl = stage.renderer.getContext();
  return new Promise((res) => {
    const f = () => {
      stage.onPresented.splice(stage.onPresented.indexOf(f), 1);
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); res({px, w, h});
    };
    stage.onPresented.push(f);
  });
}
// the outline on, off, off again, with the page's clock held (and back on after)
export async function frames(site) {
  const {stage} = site, FO = site.floorOutline, ts = stage.timeScale; stage.timeScale = 0;
  try {
    FO.set(true); await grab(site); const A = await grab(site);
    FO.set(false); await grab(site); const B = await grab(site), B2 = await grab(site);
    return {A, B, B2};
  } finally { FO.set(true); site.worldPresentation.flush(); stage.timeScale = ts; }
}
// device pixels per CSS pixel and an item's screen rect in device pixels (top-down), grown by pad CSS px
export function rectOf(site, id, pad = 0) {
  const i = site.keepsakes.get(id), r = i?.picture?.rect; if (!r) return null;
  const k = site.stage.renderer.getDrawingBufferSize(new site.THREE.Vector2()).x / site.stage.width;
  return {x0: Math.floor((r.x - pad) * k), y0: Math.floor((r.y - pad) * k), x1: Math.ceil((r.x + r.w + pad) * k), y1: Math.ceil((r.y + r.h + pad) * k), k};
}
// the item's picture alone, into a target the size of the drawing buffer: alpha per device pixel (top-down rows)
export function silhouette(site, id) {
  const {THREE: T, stage} = site, R = stage.renderer, card = site.keepsakes.get(id).picture.card;
  const s = R.getDrawingBufferSize(new T.Vector2()), rt = new T.WebGLRenderTarget(s.x, s.y), sc = new T.Scene(), px = new Uint8Array(s.x * s.y * 4);
  const parent = card.parent, prev = R.getRenderTarget(), clear = R.getClearAlpha(), colour = R.getClearColor(new T.Color());
  try { sc.add(card); R.setRenderTarget(rt); R.setClearColor(0, 0); R.clear(); R.render(sc, stage.camera); R.readRenderTargetPixels(rt, 0, 0, s.x, s.y, px); }
  finally { card.removeFromParent(); parent?.add(card); R.setRenderTarget(prev); R.setClearColor(colour, clear); rt.dispose(); }
  const a = new Uint8Array(s.x * s.y);
  for (let y = 0; y < s.y; y++) for (let x = 0; x < s.x; x++) a[y * s.x + x] = px[((s.y - 1 - y) * s.x + x) * 4 + 3];
  return {a, w: s.x, h: s.y};
}
// changed pixels (max channel delta > 8) between the on and off frames inside a device rect, skipping what moved anyway
// and (optional) what lies in the mask `skip`; frames are bottom-up
export function changed({A, B, B2}, r, skip = null) {
  let n = 0;
  for (let y = Math.max(0, r.y0); y < Math.min(A.h, r.y1); y++) for (let x = Math.max(0, r.x0); x < Math.min(A.w, r.x1); x++) {
    if (skip && skip[y * A.w + x]) continue;
    const i = ((A.h - 1 - y) * A.w + x) * 4; let moving = false, d = 0;
    for (let c = 0; c < 4; c++) { if (B.px[i + c] !== B2.px[i + c]) moving = true; d = Math.max(d, Math.abs(A.px[i + c] - B.px[i + c])); }
    if (!moving && d > 8) n++;
  }
  return n;
}
// a lossless screenshot of the viewport as shown, as RGBA rows (top-down)
export async function screen() {
  const b64 = await window.__png(), blob = await (await fetch('data:image/png;base64,' + b64)).blob(), bmp = await createImageBitmap(blob);
  const c = new OffscreenCanvas(bmp.width, bmp.height), x = c.getContext('2d'); x.drawImage(bmp, 0, 0);
  return {px: x.getImageData(0, 0, bmp.width, bmp.height).data, w: bmp.width, h: bmp.height};
}
function lab(px, i) {
  const f = (v) => { v /= 255; return v > .04045 ? ((v + .055) / 1.055) ** 2.4 : v / 12.92; };
  const r = f(px[i]), g = f(px[i + 1]), b = f(px[i + 2]);
  const X = (.4124 * r + .3576 * g + .1805 * b) / .95047, Y = .2126 * r + .7152 * g + .0722 * b, Z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883;
  const t = (v) => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116, fx = t(X), fy = t(Y), fz = t(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
// the edge measure for one item: {edge (median dE), faint (share of the edge under dE 6), samples}. `items` (optional):
// a mask of every item's silhouette; an outside pixel on another item is not floor and is skipped (as the mock-up's
// mask did: its silhouettes were every item at once)
// min: the alpha (0-255) from which a pixel counts as the item's (64: the mock-up's magenta mask, about a quarter)
export function contrast(shot, sil, r, items = null, min = 64) {
  const {w, h} = sil, fg = (x, y) => x >= 0 && y >= 0 && x < w && y < h && sil.a[y * w + x] > min;
  const D = Math.max(2, Math.round(3 * r.k)), dirs = [[D, 0], [-D, 0], [0, D], [0, -D], [D, D], [D, -D], [-D, D], [-D, -D]], dE = [];
  const sx = shot.w / w; // screenshot pixels per drawing-buffer pixel (1 when the page's dpr is the device's)
  const at = (x, y) => (Math.round(y * sx) * shot.w + Math.round(x * sx)) * 4;
  for (let y = Math.max(1, r.y0); y < Math.min(h - 1, r.y1); y++) for (let x = Math.max(1, r.x0); x < Math.min(w - 1, r.x1); x++) {
    if (!(fg(x, y) && fg(x + 1, y) && fg(x - 1, y) && fg(x, y + 1) && fg(x, y - 1))) continue;   // one in from the rim
    let inside = null;
    for (const [dy, dx] of dirs) {
      const qx = x + dx, qy = y + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h || fg(qx, qy) || items?.[qy * w + qx]) continue;
      inside ??= lab(shot.px, at(x, y)); const o = lab(shot.px, at(qx, qy));
      dE.push(Math.hypot(o[0] - inside[0], o[1] - inside[1], o[2] - inside[2]));
    }
  }
  if (!dE.length) return {edge: 0, faint: 1, samples: 0};
  dE.sort((a, b) => a - b);
  return {edge: +dE[dE.length >> 1].toFixed(1), faint: +(dE.filter((v) => v < 6).length / dE.length).toFixed(2), samples: dE.length};
}
// a mask of every given silhouette grown by `grow` device pixels (where their lines may fall), above alpha `min`
export function near(sils, grow, min = 8) {
  const {w, h} = sils[0], m = new Uint8Array(w * h);
  for (const s of sils) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (s.a[y * w + x] <= min) continue;
    for (let dy = -grow; dy <= grow; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -grow; dx <= grow; dx++) { const xx = x + dx; if (xx >= 0 && xx < w) m[yy * w + xx] = 1; } }
  }
  return m;
}
