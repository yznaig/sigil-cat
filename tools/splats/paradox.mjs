// paradox.mjs: fit the Paradox's strapped loaf to the cat's back in each pose, and the strap round him and the loaf,
// from the splats themselves. Writes src/gags/paradox-fit.js (src/gags/paradox.js reads it).
// Aaron (p8): "the bread straps visually onto the cat at least in the standing position really weird and floating".
// Before this the loaf sat at one hand-placed point per pose and the strap was one round hoop, so on the sit the loaf
// stood off his back like a sail and on the others it hovered over him with the hoop half inside him.
//
// The loaf (scaled from assets/splats/bread.spz as the gag does) lies on a plane that leans `lean` about his x axis.
// For each pose the fit tries every lean in the pose's range, every place along his back and across it (and every
// turn the pose allows), and keeps the one whose underside is closest to his fur near his spine: the plane is pushed
// down until it rests on the highest of his fur under the loaf (so it never sinks into him), and scored by the mean
// gap between it and his back under it.
// The strap is a cut through him and the loaf at one of a few places along it (away from the butter in the middle),
// the one where it lies on him best (see the strap choice below): the cut's splats wrapped tight (convex hull),
// eased in onto his fur where that bridges a narrow waist, kept from hanging below him, and resampled evenly.
// Everything is in his own space (x right, y up from his feet, z toward his face).
// Run from the repo root: node tools/splats/paradox.mjs (about a minute). checks/paradox-strap.js checks the result.
import { readFileSync, writeFileSync } from 'fs';
import { parseSpz } from '../../src/core/spz.js';

const LOAF = 0.6;                 // PARADOX.loaf (cat-heights; his height is 1)
const STRAP = 0.017;              // the strap's thickness (its tube radius)
const ALPHA = 110;                // a splat counts as his fur from this opacity (of 255), for the loaf to rest on
const ALPHA_STRAP = 50;           // and for the strap to go round: his faint outer fur too, or it sinks out of sight in it
const PULL = 0.06;                // how far the strap may sink into a narrow waist (see slice)
// where to look, per pose: the pose file, the lean range (radians; negative leans the loaf's underside toward his
// tail), and `over`: what of him may arch over the loaf (the stretch's tail curls forward above his rump), so the
// loaf can slide in under it; it is never let inside the loaf; `level`: the strap is a level belt (see slice);
// `turn`: the turns to try (about the loaf's own up, from along his spine toward across it; default along it);
// `sink`: how much deeper into his fur it is pulled where it rests (where it has to bridge a dip in his back)
const POSES = {
  sit: { file: 'sit', lean: [-1.4, -0.2], level: true },
  lie: { file: 'loaf', lean: [-0.35, 0.35] },
  sleep: { file: 'sleep', lean: [-0.35, 0.35] },
  // his back is short when he stretches (his head and his raised tail take most of it): the loaf is turned part way
  // across it (turned square across it, it reads as a round bun seen end-on from his side); its front bridges the dip
  // behind his neck, so it is pulled a little deeper into his rump
  stretch: { file: 'stretch', lean: [-0.1, 0.8], over: (p) => p[1] > 0.84 && p[2] < -0.2, turn: [1.0], sink: 0.03 },
};

const load = (f) => parseSpz(new Uint8Array(readFileSync(`assets/splats/${f}.spz`)));
function points(s, step = 1, alpha = ALPHA) {
  const out = [];
  for (let i = 0; i < s.count; i += step) if (s.rgba[i * 4 + 3] >= alpha) out.push([s.center[i * 3], s.center[i * 3 + 1], s.center[i * 3 + 2]]);
  return out;
}

// the loaf as the gag builds it: scaled to LOAF long, centred on x/z, its bottom at 0 (its length along x)
const bread = load('bread'), bmin = bread.min, bmax = bread.max, k = LOAF / (bmax[0] - bmin[0]);
const bc = [(bmin[0] + bmax[0]) / 2, (bmin[2] + bmax[2]) / 2];
const loafAcross = points(bread).map(([x, y, z]) => [(x - bc[0]) * k, (y - bmin[1]) * k, (z - bc[1]) * k]);
// turned by `turn` from lying along his spine (0) toward lying across it (PI/2): rotation.y = PI/2 - turn
const loafTurned = (turn) => { const th = Math.PI / 2 - turn, c = Math.cos(th), s = Math.sin(th); return loafAcross.map(([x, y, z]) => [x * c + z * s, y, -x * s + z * c]); };
const loafW = (bmax[2] - bmin[2]) * k, loafT = (bmax[1] - bmin[1]) * k;

// (y, z) of a point in the leaning frame: v along the underside's normal, t along the loaf (toward his face)
const frame = (lean) => { const c = Math.cos(lean), s = Math.sin(lean); return { n: [c, s], t: [-s, c] }; };   // lean = rotation.x
const dot2 = (a, y, z) => a[0] * y + a[1] * z;

function fit(name, P) {
  const cfg = POSES[name];
  // cells under the loaf: 12 along its length, 5 across. The gap is scored under the cells near his spine (within
  // SPINE of it): a back falls away at his sides, and a loaf lying across him overhangs them.
  const NA = 12, NB = 5, SPINE = 0.15;
  let best = null; const perTurn = {};
  const xs = P.map((p) => p[0]).sort((a, b) => a - b), xmid = xs[xs.length >> 1];
  const cells = Array.from({ length: NA * NB }, () => []);
  for (const turn of cfg.turn ?? [0]) {
    const sg = Math.sin(turn), cg = Math.cos(turn), Lt = LOAF * Math.abs(cg) + loafW * Math.abs(sg);
    const spine = cells.map((_, i) => { const a = ((Math.floor(i / NB) + 0.5) / NA - 0.5) * LOAF, b = ((i % NB + 0.5) / NB - 0.5) * loafW; return Math.abs(a * sg + b * cg) <= SPINE; });
    for (let lean = cfg.lean[0]; lean <= cfg.lean[1] + 1e-9; lean += 0.02) {
      const { n, t } = frame(lean);
      const pv = P.map((p) => dot2(n, p[1], p[2])), pt = P.map((p) => dot2(t, p[1], p[2])), over = P.map((p) => !!cfg.over?.(p));
      let tlo = Infinity, thi = -Infinity; for (const v of pt) { tlo = Math.min(tlo, v); thi = Math.max(thi, v); }
      for (let s = tlo + Lt / 2 - 0.1; s <= thi - Lt / 2 + 0.1; s += 0.02) {
        for (let xc = xmid - 0.16; xc <= xmid + 0.16 + 1e-9; xc += 0.02) {
          for (const c of cells) c.length = 0;
          const arch = [];
          for (let i = 0; i < P.length; i++) {
            const u = P[i][0] - xc, w = pt[i] - s;
            const a = (u * sg + w * cg) / LOAF + 0.5, b = (u * cg - w * sg) / loafW + 0.5;
            if (a < 0 || a >= 1 || b < 0 || b >= 1) continue;
            if (over[i]) { arch.push(pv[i]); continue; }
            cells[Math.floor(a * NA) * NB + Math.floor(b * NB)].push(pv[i]);
          }
          // a cell's top: its 90th percentile, so a stray wisp of fur does not hold the loaf up; the loaf rests on
          // the highest of them (so it never sinks into him), and is scored by the mean gap under it near his spine
          let h = -Infinity, gap = 0, scored = 0;
          const top = cells.map((c) => { if (c.length < 4) return null; c.sort((x, y) => x - y); return c[Math.floor(0.9 * (c.length - 1))]; });
          for (const v of top) if (v !== null) h = Math.max(h, v);
          top.forEach((v, i) => { if (!spine[i]) return; gap += v === null ? 0.25 : h - v; scored++; });   // over air: a big gap
          gap /= scored;
          if (arch.some((v) => v < h + loafT + 0.01)) continue;               // what arches over it must clear the loaf
          const cand = { gap, lean, s, xc, h, turn };
          if (!best || gap < best.gap) best = cand;
          if (!perTurn[turn] || gap < perTurn[turn].gap) perTurn[turn] = cand;
        }
      }
    }
  }
  if ((cfg.turn ?? [0]).length > 1) for (const c of Object.values(perTurn)) console.log(`  ${name} turned ${c.turn.toFixed(2)}: lean ${c.lean.toFixed(2)}, mean gap ${(c.gap * 100).toFixed(1)}`);
  if (cfg.sink) best.h -= cfg.sink;
  return best;
}

// convex hull (monotone chain), counter-clockwise
function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo.at(-2), lo.at(-1), q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (hi.length >= 2 && cross(hi.at(-2), hi.at(-1), q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
const perimeter = (h) => h.reduce((s, p, i) => s + Math.hypot(...[0, 1].map((j) => h[(i + 1) % h.length][j] - p[j])), 0);
// pushed out by d along the corners' normals, then resampled to n points evenly round
function outline(h, d, n) {
  const m = h.length, out = h.map((p, i) => {
    const a = h[(i + m - 1) % m], b = h[(i + 1) % m];
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]];
    const n1 = [e1[1], -e1[0]], n2 = [e2[1], -e2[0]], l1 = Math.hypot(...n1), l2 = Math.hypot(...n2);
    const nx = n1[0] / l1 + n2[0] / l2, ny = n1[1] / l1 + n2[1] / l2, l = Math.hypot(nx, ny) || 1;
    return [p[0] + nx / l * d, p[1] + ny / l * d];
  });
  const L = perimeter(out), res = [];
  let seg = 0, acc = 0;
  for (let i = 0; i < n; i++) {
    const want = (i / n) * L;
    for (;;) {
      const a = out[seg % m], b = out[(seg + 1) % m], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + len >= want || seg > 3 * m) { const u = len ? (want - acc) / len : 0; res.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); break; }
      acc += len; seg++;
    }
  }
  return res;
}

// The strap: a cut through him and the loaf at q (along the loaf, from its middle, at half its thickness). The cut is
// square to the loaf, or level (`level`: on the sit, where the loaf stands up his back, it is a belt round his middle
// rather than a loop down under his seat). Returns the loop in the loaf's own frame (x across, y up from its
// underside, z along it), and how it sits: `contact`, how far his back under the strap is from the loaf (0: touching;
// negative: off it), and `floor`, whether it runs under his feet.
function slice(P, f, q, cfg) {
  const { n, t } = frame(f.lean), W = 0.025;
  const toWorld = ([lx, ly, lz]) => [f.xc + lx, (f.h + ly) * n[0] + (f.s + lz) * t[0], (f.h + ly) * n[1] + (f.s + lz) * t[1]];
  const o = toWorld([0, loafT / 2, q]);
  const m = cfg.level ? [0, 1, 0] : [0, t[0], t[1]];
  const nn = [0, n[0], n[1]], k = nn[1] * m[1] + nn[2] * m[2], e2raw = [0, nn[1] - k * m[1], nn[2] - k * m[2]], el = Math.hypot(e2raw[1], e2raw[2]);
  const e2 = [0, e2raw[1] / el, e2raw[2] / el];
  const rel = (p) => [p[0] - o[0], p[1] - o[1], p[2] - o[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const body = [];
  for (const p of P) { const r = rel(p); if (Math.abs(dot3(r, m)) < W) body.push([r[0], dot3(r, e2), p[1]]); }
  // his fur without its stray wisps: a splat with fewer than 4 others within 2 cm of it in the cut is left out
  const near = (a) => body.reduce((c, b) => c + (Math.abs(a[0] - b[0]) < 0.02 && Math.abs(a[1] - b[1]) < 0.02), 0);
  const fur = body.filter((a) => near(a) > 4);
  const loaf = [];
  for (const lp of loafTurned(f.turn)) { const r = rel(toWorld(lp)); if (Math.abs(dot3(r, m)) < W) loaf.push([r[0], dot3(r, e2)]); }
  const h = hull(fur.map((p) => [p[0], p[1]]).concat(loaf));
  // back to the loaf's frame
  const back = (u, v) => {
    const w = [o[0] + u, o[1] + v * e2[1], o[2] + v * e2[2]];
    return [w[0] - f.xc, w[1] * n[0] + w[2] * n[1] - f.h, w[1] * t[0] + w[2] * t[1] - f.s];
  };
  const under = fur.filter((p) => Math.abs(p[0]) < 0.08 && p[1] < 0);   // his back, under the loaf's middle
  const loafBottom = -loafT / 2 / Math.max(0.2, Math.abs(dot3(nn, e2)));
  // the lowest the loop may go: just inside the underside of him (a cut that is not level runs under his belly or
  // feet, and the faint fur there would otherwise hold it out below him)
  const lowest = e2[1] > 0.2 ? (Math.min(...fur.map((p) => p[2])) + STRAP - o[1]) / e2[1] : -Infinity;
  // Snug: a loop pulled tight is the convex hull, which bridges a narrow waist well off his flank. A strap on soft fur
  // sinks into it there, so each point of the loop that is clear of the loaf is drawn in toward the middle of the cut
  // until it lies on his fur (never more than PULL: it does not dive between his legs), then smoothed.
  const cx = fur.reduce((a, p) => a + p[0], 0) / fur.length, cy = fur.reduce((a, p) => a + p[1], 0) / fur.length;
  const near2 = (pts, x, y) => pts.reduce((d, p) => Math.min(d, Math.hypot(p[0] - x, p[1] - y)), Infinity);
  const snug = (loop, d) => {
    const pulled = loop.map(([x, y]) => {
      if (near2(loaf, x, y) < d + 0.02) return [x, y];
      const l = Math.hypot(cx - x, cy - y), ux = (cx - x) / l, uy = (cy - y) / l;
      let k = 0; while (k < PULL && near2(fur, x + ux * k, y + uy * k) > d) k += 0.004;
      return [x + ux * k, y + uy * k];
    });
    return pulled.map((p, i) => { const a = pulled[(i + pulled.length - 1) % pulled.length], b = pulled[(i + 1) % pulled.length]; return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4]; });
  };
  // how much of a finished loop is off him: further than 4 cm (plus its thickness) from his fur and from the loaf
  const offOf = (loop) => loop.filter(([x, y]) => Math.min(near2(fur, x, y), near2(loaf, x, y)) > 0.04 + STRAP).length / loop.length;
  return { h, back, lowest, snug, offOf, contact: under.length ? Math.max(...under.map((p) => p[1])) - loafBottom : -1, floor: fur.some((p) => p[2] < 0.05) };
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const fits = {};
for (const [name, cfg] of Object.entries(POSES)) {
  const S = load(cfg.file), P = points(S), f = fit(name, P.filter((_, i) => i % 3 === 0)), Pstrap = points(S, 1, ALPHA_STRAP);
  // The strap goes where it lies on him best (the least of it off him, where the loaf overhangs his sides), where
  // his back touches the loaf (so it never hangs off a tapering end, where the loaf is over air), not under his
  // feet if it can help it, clear of the butter on the loaf's middle; the nearer the middle the better.
  let strap = null;
  const reach = (LOAF * Math.abs(Math.cos(f.turn)) + loafW * Math.abs(Math.sin(f.turn))) / 2;   // the loaf's half-length along his spine
  const qs = [0.11, -0.11, 0.14, -0.14, 0.17, -0.17].filter((v) => Math.abs(v) < reach - 0.04);
  for (const q of qs.length ? qs : [0.075, -0.075]) {                 // (closer in only on a loaf lying square across him)
    const sl = slice(Pstrap, f, q, cfg);
    sl.loop = sl.snug(outline(sl.h, STRAP * 0.4, 32), STRAP * 0.4 + 0.004);
    const score = sl.contact - (sl.floor ? 1 : 0) - sl.offOf(sl.loop);
    if (!strap || score > strap.score + 0.01) strap = { q, ...sl, score };
  }
  const { n, t } = frame(f.lean), y = n[0] * f.h + t[0] * f.s, z = n[1] * f.h + t[1] * f.s;
  // the loop: lying on his fur (the splats' centres are a little inside what shows of it)
  const path = strap.loop.map(([u, v]) => strap.back(u, Math.max(v, strap.lowest)).map(r3));
  fits[name] = { at: [r3(f.xc), r3(y), r3(z)], lean: r3(f.lean), turn: r3(f.turn), path };
  console.log(`${name}: lean ${f.lean.toFixed(2)}, underside at ${fits[name].at.join(', ')}, mean gap under it ${(f.gap * 100).toFixed(1)} cm-of-cat; strap ${cfg.level ? 'level ' : ''}at ${strap.q}, ${(-strap.contact * 100).toFixed(1)} cm off his back there${strap.floor ? ', under his feet' : ''}, ${(strap.offOf(strap.loop) * 100).toFixed(0)}% of it off him`);
}

const body = Object.entries(fits).map(([k, v]) => `  ${k}: { at: [${v.at.join(', ')}], lean: ${v.lean}, turn: ${v.turn},\n    strap: [${v.path.map((p) => `[${p.join(', ')}]`).join(', ')}] },`).join('\n');
writeFileSync('src/gags/paradox-fit.js', `// Where the Paradox's loaf lies on his back in each pose and the strap's loop round him and it, measured from the
// splats. Written by tools/splats/paradox.mjs (run it again if a pose's splat or PARADOX.loaf changes); not by hand.
// at: the middle of the loaf's underside in his own space (x right, y up from his feet, z toward his face); lean: the
// loaf's tilt about his x axis (radians; negative leans its underside toward his tail); turn: how far it is turned
// from lying along his spine toward lying across it (radians, about its own up); strap: the strap's loop, in the
// loaf's own frame (x across, y up from its underside, z along it toward his face).
export const PARADOX_FIT = {
${body}
};
`);
console.log('wrote src/gags/paradox-fit.js');
