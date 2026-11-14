// The Platinum Cat badge (e1111-46): earned with every other achievement. A heavy round platinum badge falls from the
// top of the page. Grab it and let go anywhere over the board: it pins to the middle of the board.
// Playtest 2 (2026-11-12): "should be circular and cover a good amount of the pin board, not all of it". It is a
// disc whose diameter is most of the board's height (BADGE.radius), centred on the board, so the cards show around
// it. It no longer locks the cards: like a card pinned over another (src/world/pinboard.js), a card partly under the
// badge comes out with a pull. The googly eyes can sit on its embossed cat (eyesAnchor, src/world/eyes.js).
// Our own modelled geometry: a bevelled disc with a brushed field, a polished raised rim, one pin head, a mirror
// medallion with fine guilloche rings and an embossed satin cat head, "PLATINUM CAT" engraved under it and the nine
// signs engraved in an arc over it, two bar pins on the back. The engraving is canvas-drawn bump/roughness detail;
// the metal reflects its own small studio environment (soft boxes on a warm room), made here, not loaded.
// Sized from the pinboard's current bounds when it is made, and scaled to the board's bounds again whenever it is
// pinned (the board can change size with the layout). Uses the frozen support API (docs/plans/world.md):
// one extra support, 'platinum-cover', on the board's own root.
import { forPicture } from '../core/cat.js';
import { createMeshPicture } from '../core/mesh-picture.js';
import { FINDS } from '../finds.js';
import { fitResting } from '../core/floor-home.js';

export const BADGE = {
  radius: { ofHeight: 0.43, ofWidth: 0.36 },   // its radius: the smaller of these shares of the board's height and width
  depth: 0.010, bevel: 0.005,
  coverZ: 0.053,          // its centre in front of the board's face (the frame's front is at .030; its pins reach .021 behind)
  mass: 1.6,              // heavy: falls with weight and settles without a bounce
  dropHeight: 2.5,        // world units above the floor it starts falling from (above the top of the page)
  calmHeight: 0.45,       // reduced motion: it settles from just above the floor instead
  material: { friction: 0.6, restitution: 0.04, linearDamping: 0.12, angularDamping: 1.6, skin: 0.001 },
};
const SIGNS = FINDS.filter((f) => f.kind === 'sigil');
let service = null;
export function platinumBadge(site) { return (service ??= createBadge(site)); }

function createBadge(site) {
  const { THREE: T, stage, world, keepsakes, supports, audio } = site;
  let inst = null, built = null, unregister = null, env = null;
  audio.load('bell');   // its tap (fx lane, playtest 3)

  // ---- size: the board's bounds now (board-local units), or the board's own defaults before it exists ----
  function boardSize() {
    const v = site.pinboard?.art?.vertices;
    if (v?.length) {
      const xs = v.map((p) => p.x), ys = v.map((p) => p.y);
      return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    return { w: 1.07, h: 0.71 };     // one board everywhere (phones play on their side, shell lane playtest-2)
  }

  // ---- its own studio environment: soft boxes on a warm room, so polished platinum has something to reflect ----
  function studio() {
    if (env) return env;
    const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#a29c95'); sky.addColorStop(0.42, '#6a635c'); sky.addColorStop(0.5, '#4f4842'); sky.addColorStop(0.56, '#9a9087'); sky.addColorStop(1, '#b8aea3');
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    x.filter = 'blur(7px)';
    const box = (cx, cy, w, h, color, a = 1) => { x.globalAlpha = a; x.fillStyle = color; x.fillRect(cx - w / 2, cy - h / 2, w, h); x.globalAlpha = 1; };
    // +Z (towards the viewer, what a face-on plate mirrors) is u = .75 in three's equirect mapping.
    box(694, 158, 150, 118, '#ffffff');            // the key soft box behind the viewer, up and to the left: a face-on
    box(850, 312, 110, 90, '#d9d2c8', 0.55);       // plate mirrors its edge as a soft sheen; a dimmer fill lower right
    box(900, 150, 36, 170, '#fff6e8', 0.9);        // a narrow strip on the right, for the bevels
    box(512, 40, 620, 46, '#f4f1ec', 0.9);         // overhead
    box(256, 210, 120, 130, '#fbf2e2', 0.7);       // behind the plate (rims)
    box(40, 230, 70, 110, '#e9eef7', 0.6); box(990, 230, 70, 110, '#e9eef7', 0.6);
    x.filter = 'none';
    const t = new T.CanvasTexture(c); t.mapping = T.EquirectangularReflectionMapping; t.colorSpace = T.SRGBColorSpace;
    const pmrem = new T.PMREMGenerator(stage.renderer);
    env = pmrem.fromEquirectangular(t).texture; pmrem.dispose(); t.dispose();
    return env;
  }

  // ---- engraving: canvas bump (dark = cut in), roughness (G channel) and a patina tint, in the plate's own units ----
  function canvasTex(c, srgb) { const t = new T.CanvasTexture(c); t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 8; return t; }
  // the face of a disc of radius Rp: a square texture over it, (0,0) at its centre
  function field(Rp, cy, R) {
    const W = 1536, H = W, k = W / (2 * Rp), L = k / 1366 * 1.6;
    const make = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
    const [bc, b] = make(), [rc, r] = make(), [pc, p] = make();
    b.fillStyle = '#fff'; b.fillRect(0, 0, W, H);
    p.fillStyle = '#fff'; p.fillRect(0, 0, W, H);
    // brushed: long horizontal streaks of slightly different roughness
    r.fillStyle = 'rgb(0,82,0)'; r.fillRect(0, 0, W, H);
    let seed = 1111; const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 2600; i++) {
      const y = rnd() * H, len = W * (0.25 + rnd() * 0.75), x0 = rnd() * W - len * 0.3, g = 58 + rnd() * 52;
      r.strokeStyle = `rgba(0,${g | 0},0,${0.25 + rnd() * 0.5})`; r.lineWidth = 0.6 + rnd() * 1.4;
      r.beginPath(); r.moveTo(x0, y); r.lineTo(x0 + len, y + (rnd() - 0.5) * 1.2); r.stroke();
    }
    const cut = (draw, { depth = 0, rough = 168, tint = 150, blur = 0.8 } = {}) => {
      for (const [ctx, style] of [[b, `rgb(${depth},${depth},${depth})`], [r, `rgb(0,${rough},0)`], [p, `rgb(${tint},${tint},${tint})`]]) {
        ctx.save(); ctx.filter = ctx === b ? `blur(${blur}px)` : 'none'; ctx.fillStyle = ctx.strokeStyle = style; draw(ctx); ctx.restore();
      }
    };
    const X = (u) => W / 2 + u * k, Y = (v) => H / 2 - v * k;
    // a double engraved ring inside the raised rim, with four small diamonds on it
    for (const [inset, lw] of [[0.064, 2.2], [0.074, 1.2]]) cut((ctx) => { ctx.lineWidth = lw * L; ctx.beginPath(); ctx.arc(X(0), Y(0), (Rp - inset) * k, 0, Math.PI * 2); ctx.stroke(); });
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) cut((ctx) => {
      const rr = Rp - 0.069, cx = X(Math.cos(a) * rr), cy2 = Y(Math.sin(a) * rr), s = 0.014 * k;
      ctx.beginPath(); ctx.moveTo(cx, cy2 - s); ctx.lineTo(cx + s, cy2); ctx.lineTo(cx, cy2 + s); ctx.lineTo(cx - s, cy2); ctx.closePath(); ctx.fill();
    });
    // PLATINUM CAT, cut deep, letter by letter (a tracked wide face), and a small line under it
    const letters = (ctx, text, ty, cap, track, weight, maxWidth) => {
      const set = (c) => { ctx.font = `${weight} ${Math.round(c * k * 1.38)}px Archivo, "Arial Narrow", sans-serif`; try { ctx.fontStretch = 'expanded'; } catch { /* older canvas */ } };
      const measure = (c) => { set(c); const ws = [...text].map((ch) => ctx.measureText(ch).width); return [ws, ws.reduce((sum, x) => sum + x, 0) + track * c * k * (text.length - 1)]; };
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      let [ws, total] = measure(cap);
      if (total > maxWidth * k) { cap *= maxWidth * k / total; [ws, total] = measure(cap); }
      const gap = track * cap * k;
      let x0 = W / 2 - total / 2;
      [...text].forEach((ch, i) => { ctx.fillText(ch, x0, Y(ty) + cap * k / 2); x0 += ws[i] + gap; });
    };
    const textY = cy - R * 1.07 - Rp * 0.17, cap = Rp * 0.1;
    cut((ctx) => letters(ctx, 'PLATINUM CAT', textY, cap, 0.24, 800, Rp * 1.04), { depth: 0, rough: 178, tint: 118, blur: 1 });
    cut((ctx) => letters(ctx, 'SIGIL CAT  ·  EVERY LAST ONE', textY - cap * 1.45, cap * 0.32, 0.5, 700, Rp * 0.78), { depth: 60, rough: 150, tint: 160, blur: 0.5 });
    // a short rule either side of the small line
    for (const sgn of [-1, 1]) cut((ctx) => { ctx.lineWidth = 1.6 * L; ctx.beginPath(); ctx.moveTo(X(sgn * Rp * 0.44), Y(textY - cap * 1.45)); ctx.lineTo(X(sgn * Rp * 0.58), Y(textY - cap * 1.45)); ctx.stroke(); });
    // the signs (nine since the star became a secret, sky lane playtest-2), evenly on an arc over the medallion from
    // lower left round to lower right: one at the top, four a side
    const ring = Rp * 0.66, mark = Rp * 0.15, a0 = Math.PI * 1.16, a1 = -Math.PI * 0.16;
    SIGNS.forEach((f, i) => {
      const a = a0 + (a1 - a0) * i / (SIGNS.length - 1), cx = Math.cos(a) * ring, cyy = Math.sin(a) * ring + cy * 0.4;
      cut((ctx) => {
        ctx.translate(X(cx) - mark * k / 2, Y(cyy) - mark * k / 2); ctx.scale(mark * k / 24, mark * k / 24);
        ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(f.d));
      }, { depth: 10, rough: 165, tint: 140, blur: 0.6 });
    });
    const t = { bump: canvasTex(bc), rough: canvasTex(rc), tint: canvasTex(pc, true) };
    for (const tex of Object.values(t)) { tex.repeat.set(1 / (2 * Rp), 1 / (2 * Rp)); tex.offset.set(0.5, 0.5); }
    return t;
  }
  function rings(R) {
    const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d'), k = S / (2 * R), m = S / 2;
    const rc = document.createElement('canvas'); rc.width = rc.height = S; const y = rc.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, S, S); y.fillStyle = 'rgb(0,30,0)'; y.fillRect(0, 0, S, S);
    // guilloche: fine wavy rings, the way an engine-turned watch dial catches the light
    for (let rr = R * 0.08; rr < R * 0.86; rr += R * 0.0105) {
      x.beginPath(); y.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.02) {
        const q = (rr + Math.sin(a * 18 + rr * 90) * R * 0.004) * k, px = m + Math.cos(a) * q, py = m + Math.sin(a) * q;
        if (a === 0) { x.moveTo(px, py); y.moveTo(px, py); } else { x.lineTo(px, py); y.lineTo(px, py); }
      }
      x.strokeStyle = 'rgba(0,0,0,.42)'; x.lineWidth = 1.3; x.stroke(); y.strokeStyle = 'rgba(0,95,0,.55)'; y.lineWidth = 1.2; y.stroke();
    }
    // a cut groove near the edge
    for (const [ctx, s] of [[x, '#000'], [y, 'rgb(0,150,0)']]) { ctx.strokeStyle = s; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(m, m, R * 0.92 * k, 0, Math.PI * 2); ctx.stroke(); }
    const t = { bump: canvasTex(c), rough: canvasTex(rc) };
    for (const tex of Object.values(t)) { tex.repeat.set(1 / (2 * R), 1 / (2 * R)); tex.offset.set(0.5, 0.5); }
    return t;
  }

  // ---- the model ----
  function catHead(size) {
    // the page's own cat (the favicon's ears and round chin), with two almond eyes cut through
    const k = size / 23, s = new T.Shape(), P = (px, py) => [(px - 16) * k, (11.5 - py) * k - 0.5 * k];
    s.moveTo(...P(6, 17)); s.lineTo(...P(6, 4)); s.lineTo(...P(12, 10)); s.lineTo(...P(20, 10)); s.lineTo(...P(26, 4)); s.lineTo(...P(26, 17));
    s.absarc(P(16, 17)[0], P(16, 17)[1], 10 * k, 0, -Math.PI, true);
    for (const ex of [11.6, 20.4]) { const e = new T.Path(), [cx, cy] = P(ex, 16.2); e.absellipse(cx, cy, 1.55 * k, 2.4 * k, 0, Math.PI * 2, false); s.holes.push(e); }
    return s;
  }
  function disc(r) { const d = new T.Shape(); d.absarc(0, 0, r, 0, Math.PI * 2, false); return d; }
  function model(Rp) {
    const D = BADGE.depth, B = BADGE.bevel, front = D / 2 + B, envMap = studio();
    const metal = (o) => forPicture(new T.MeshPhysicalMaterial({ color: 0xe6e4e1, metalness: 1, envMap, envMapIntensity: 1.1, ...o }));
    const R = Rp * 0.36, cy = Rp * 0.1, tex = field(Rp, cy, R), ring = rings(R);
    const mats = {
      polished: metal({ roughness: 0.1 }),
      field: metal({ roughness: 1, roughnessMap: tex.rough, bumpMap: tex.bump, bumpScale: 1.6, map: tex.tint }),
      medal: metal({ roughness: 1, roughnessMap: ring.rough, bumpMap: ring.bump, bumpScale: 0.9 }),
      satin: metal({ roughness: 0.4, color: 0xdcdad6 }),
      back: metal({ roughness: 1, roughnessMap: tex.rough, color: 0xd8d6d2 }),
      steel: metal({ roughness: 0.26, color: 0xb9babd }),
    };
    const group = new T.Group(), inner = new T.Group(); group.add(inner);
    const add = (geometry, material, z = 0, at = [0, 0]) => { const m = new T.Mesh(geometry, material); m.position.set(at[0], at[1], z); inner.add(m); return m; };
    const extrude = (shape, depth, bevel, segments = 4) => {
      const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 1.2, bevelOffset: -bevel * 1.2, bevelSegments: segments, curveSegments: 64 });
      g.translate(0, 0, -depth / 2); return g;
    };
    // the disc: brushed engraved field on the caps, polished bevelled edge
    add(extrude(disc(Rp), D, B, 5), [mats.field, mats.polished]);
    const back = new T.CircleGeometry(Rp - B * 1.2, 64); back.rotateY(Math.PI);
    add(back, mats.back, -front - 0.0004);
    // the raised polished rim
    const m = 0.036, t = 0.0075, rim = disc(Rp - m); rim.holes.push(new T.Path().absarc(0, 0, Rp - m - t, 0, Math.PI * 2, true));
    add(extrude(rim, 0.0016, 0.0012, 3), mats.polished, front + 0.0014);
    // the medallion: mirror disc with guilloche rings, the cat embossed in satin on it
    add(extrude(disc(R), 0.0035, 0.0035, 6), [mats.medal, mats.polished], front + 0.0035, [0, cy]);
    const ringShape = disc(R * 1.07); ringShape.holes.push(new T.Path().absarc(0, 0, R * 1.015, 0, Math.PI * 2, true));
    add(extrude(ringShape, 0.0012, 0.001, 3), mats.polished, front + 0.0012, [0, cy]);
    const headSize = R * 1.22, headZ = front + 0.007 + 0.0012 + 0.0016;
    add(extrude(catHead(headSize), 0.0024, 0.0016, 3), [mats.satin, mats.polished], headZ, [0, cy + R * 0.02]);
    // one pin head at the top, inside the rim: what holds it to the board
    const dome = new T.SphereGeometry(0.0155, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); dome.rotateX(Math.PI / 2); dome.scale(1, 1, 0.55);
    add(dome, mats.polished, front, [0, Rp - 0.064]);
    // two bar pins on the back
    const bar = new T.CylinderGeometry(0.0032, 0.0032, Rp * 0.9, 12); bar.rotateZ(Math.PI / 2);
    const block = new T.BoxGeometry(0.022, 0.018, 0.007), hook = new T.TorusGeometry(0.0045, 0.0018, 8, 16, Math.PI); hook.rotateY(Math.PI / 2);
    for (const sy of [-1, 1]) {
      const y = sy * Rp * 0.36;
      add(bar, mats.steel, -front - 0.0045, [0, y]);
      add(block, mats.steel, -front - 0.0035, [-Rp * 0.48, y]); add(block, mats.steel, -front - 0.0035, [Rp * 0.48, y]);
      add(hook, mats.steel, -front - 0.004, [Rp * 0.45 + 0.004, y]);
    }
    // where googly eyes sit: between the embossed cat's eyes, just proud of its face (src/world/eyes.js)
    const k = headSize / 23, eyes = [0, cy + R * 0.02 + (11.5 - 16.2) * k - 0.5 * k, headZ + 0.0024 / 2 + 0.0016 + 0.004];
    const textures = [tex.bump, tex.rough, tex.tint, ring.bump, ring.rough];
    return { group, inner, Rp, w: 2 * Rp, h: 2 * Rp, front, eyes, textures, dispose() {
      const gs = new Set(), ms = new Set(); inner.traverse((o) => { if (o.isMesh) { gs.add(o.geometry); for (const mm of [].concat(o.material)) ms.add(mm); } });
      for (const g of gs) g.dispose(); for (const mm of ms) mm.dispose(); for (const x of textures) x.dispose();
    } };
  }

  // ---- the keepsake ----
  function create(i) {
    inst = i; i.physical = true;
    const root = new T.Group();
    i.worldTask = (async () => {
      await Promise.all([world.ensure(), stage.ensureEnv(), document.fonts.ready, site.pinboard?.task]);
      if (keepsakes.get('platinum') !== i) return;
      const Rp = radiusFor(boardSize());
      built = model(Rp); i.art = built;
      const back = BADGE.depth / 2 + BADGE.bevel + 0.011, front = BADGE.depth / 2 + BADGE.bevel + 0.012;
      // pick geometry (and the shape its shadow is cast from): the disc's drum
      const pick = new T.Mesh(new T.CylinderGeometry(Rp, Rp, back + front, 48).rotateX(Math.PI / 2).translate(0, 0, (front - back) / 2), new T.MeshBasicMaterial({ visible: false }));
      root.add(pick); i.pick = pick;
      const vertices = [];
      for (let n = 0; n < 24; n++) { const a = n * Math.PI / 12; for (const z of [-back, front]) vertices.push(new T.Vector3(Math.cos(a) * Rp, Math.sin(a) * Rp, z)); }
      i.colliderVertices = vertices;
      i.eyesAnchor = () => [built.eyes[0] * built.inner.scale.x, built.eyes[1] * built.inner.scale.y, built.eyes[2]];
      const picture = createMeshPicture(site, root, built.group, vertices); i.picture = picture;
      // it falls face up, tipped a little, from above the top of the page, to the right of him
      const start = site.worldLayout.anchor(stage.width * 0.66); start.y = stage.reducedMotion ? BADGE.calmHeight : BADGE.dropHeight;
      const rotation = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2 + (stage.reducedMotion ? 0 : 0.32), stage.reducedMotion ? 0 : 0.12, stage.reducedMotion ? 0 : -0.05));
      const sync = (e) => { i.resting = !!e.support || e.body.isSleeping(); picture.draw(); keepsakes.syncWorld(i, picture.rect); site.worldLayout.shadow(i); };
      const e = await world.add({ id: 'platinum', object: root, persist: true, mass: BADGE.mass, position: start, rotation, material: BADGE.material,
        // three crossed boxes (a twelve-sided disc): a convex-hull drum rocked on the floor for ever without sleeping
        shapes: [0, 1, 2].map((n) => ({ half: [Rp * 0.97, Rp * 0.56, (back + front) / 2], offset: { x: 0, y: 0, z: (front - back) / 2 }, rotation: new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), n * Math.PI / 3), massFraction: 1 / 3 })),
        presentation: picture, sound: { material: 'metal', size: 'medium' }, sync, rest: () => keepsakes.saveWorld(i),
        tap: () => ting(), home: () => { const p = site.worldLayout.anchor(stage.width * 0.6); p.y = 1.2; return p; },
        // where it may rest is the shared rule (floor-home.js fitResting, fix round C); never fitted on a same-layout restore
        resize: (e) => fitResting(site, e, vertices) });
      if (keepsakes.get('platinum') !== i) { world.remove('platinum'); picture.dispose(); return; }
      i.worldEntry = e; e.gripHeight = Rp * 0.7; i.worldReady = true;
      // the googly eyes on it are picked before it (it picks above the cards it covers)
      const eyeRay = new T.Raycaster();
      e.visibleHit = (point) => { const eyes = keepsakes.get('eyes'); if (eyes?.state.on !== 'platinum' || !eyes.object?.visible) return true; eyeRay.set(stage.camera.position, point.clone().sub(stage.camera.position).normalize()); return !eyeRay.intersectObject(eyes.object, true).length; };
      e.grabbed = () => { i.autoHome = false; i.resting = false; };
      // let go over the board (the pointer anywhere over the board's picture): it pins over the whole board
      e.dropped = (ev) => { const r = site.pinboard?.picture?.rect, c = ev ? { x: ev.clientX, y: ev.clientY } : stage.toScreen(e.object.position); return !!r && c.x > r.x - 24 && c.x < r.x + r.w + 24 && c.y > r.y - 24 && c.y < r.y + r.h + 24 && pin(true); };
      if (!e.support && !e.silentRestore && !stage.reducedMotion) e.body.setAngvel({ x: 0.6, y: 0.2, z: -0.35 }, true);
      world.sync(e); keepsakes.saveWorld(i);
      await cover();
      return e;
    })().catch((error) => { i.worldError = String(error); console.error('world platinum', error); });
    return root;
  }
  // fx lane, playtest 3 (Aaron: the small bell "should also sound when you tap on the platinum cat award"); the impact
  // layer it used is silent while collisions are off (e1111-58)
  // The bell is the stickers' pitch exactly (playtest 3). Polish lane (2026-11-13): this comment once sat mid-line and
  // swallowed the closing brace, so the module failed to parse and no Platinum Cat badge could ever load.
  function ting() { audio.play('bell', { gain: 0.8, rate: 1 }); audio.impact?.('platinum', { material: 'metal', size: 'small', strength: 0.5 }); inst?.wiggle?.(); }

  // ---- the cover: one more support on the board's root ----
  async function cover() {
    if (unregister) return;
    const board = await site.pinboard?.ensure?.();
    if (!board?.root || unregister) return;
    unregister = supports.register({
      id: 'platinum-cover', kind: 'slot', object: board.root,
      slots: [{ id: 'cover', accepts: ['platinum'], position: [0, 0, BADGE.coverZ], quaternion: [0, 0, 0, 1] }],
      adopt: (e) => adopt(e), release: (e) => release(e),
      shadow: () => ({ object: board.root, parent: board.art.group, z: 0.018, invalidate: board.invalidate }),
      onMount: (e, { animate }) => { if (animate) audio.impact?.('platinum', { material: 'metal', size: 'medium', strength: 0.9 }); },
    });
  }
  supports.onDiscover((id, category) => { if (category === 'flat' && inst) cover(); });
  function radiusFor(s) { return Math.min(s.h * BADGE.radius.ofHeight, s.w * BADGE.radius.ofWidth); }
  // Pinned, it takes the board's current size (uniformly: it stays round); lifted off, its own size again.
  function fitToBoard(on) {
    if (!built || !inst) return;
    const k = on ? radiusFor(boardSize()) / built.Rp : 1;
    built.inner.scale.set(k, k, 1); inst.pick.scale.set(k, k, 1);
  }
  function adopt(e) {
    const board = site.pinboard;
    if (!board?.art || !inst?.picture) return;
    fitToBoard(true);
    inst.picture.attach(board.art.group, board.root, board.invalidate);
    e.object.userData.pictureOrder = 1e4;                 // over the cards it covers, for picking
    board.cardGroups?.(e, true);                          // a card under it slides out (src/world/pinboard.js)
    inst.resting = true; keepsakes.saveWorld(inst);
  }
  function release(e) {
    fitToBoard(false); site.pinboard?.cardGroups?.(e, false);
    if (inst) { inst.object.visible = true; inst.picture?.detach(); }
    site.pinboard?.invalidate();
  }
  // the board can be rebuilt or moved by a layout change: put the badge back on whatever the board is now
  stage.onResize.push(() => { if (inst?.worldEntry?.support?.id === 'platinum-cover') supports.update('platinum-cover'); });

  function pin(animate = true) {
    const e = inst?.worldEntry;
    if (!e || !unregister) return false;
    return supports.mount(e, 'platinum-cover', 'cover', { animate });
  }
  function lift() {
    const e = inst?.worldEntry;
    if (!e || e.support?.id !== 'platinum-cover') return false;
    supports.detach(e); return true;
  }
  async function drop() {
    if (keepsakes.has('platinum')) return keepsakes.get('platinum');
    const i = keepsakes.give('platinum'); await i.worldTask; return i;
  }

  keepsakes.define({
    id: 'platinum', label: 'the platinum badge', kind: 'gl', size: 1.1, aspect: 0.68,
    home: () => ({ x: 0.9, y: 0 }), object: (_, i) => create(i), place() {},
    // its key (and a tap): on the board, lift it off; off the board, pin it on
    tap: () => { if (!inst?.worldEntry) return; if (!lift() && !pin(true)) ting(); },
    removed(i) {
      if (i.worldEntry?.support) supports.detach(i.worldEntry, { wake: false, save: false });
      world.remove(i.id); site.worldLayout.remove(i.id); i.picture?.dispose(); i.art?.dispose(); i.pick?.geometry.dispose();
      site.store.del('worldBodies.' + i.id); inst = null; built = null;
    },
  });
  return { drop, pin, lift, cover, boardSize, get inst() { return inst; }, get locked() { return false; }, get model() { return built; }, get registered() { return !!unregister; } };
}
