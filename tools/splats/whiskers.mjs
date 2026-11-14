// whiskers.mjs: find the cat's whiskers and face in each pose's splat, and print them for src/config.js.
// The whisker harp and the googly eyes need to know where his whiskers and his face are in every pose. Whiskers are
// the only thin, straight things on him: a Gaussian whose neighbours lie along a line is whisker. Joined-up runs of
// those are the strands; each is printed as [root, middle, tip] in his own space (x right, y up from his feet, z toward
// his face). The face is the spot on his front surface between the two sets of roots.
// Run from the repo root: node tools/splats/whiskers.mjs
import { readFileSync } from 'fs';
import { parseSpz } from '../../src/core/spz.js';

const POSES = { sit: 'sit', lie: 'loaf', sleep: 'sleep', stretch: 'stretch' };
// the crown of each pose's head (SITE.cat.crown, printed by bake.py): whiskers are looked for just below and beside it
const CROWN = { sit: [0.0, 0.894, 0.135], lie: [-0.18, 0.678, 0.282], sleep: [-0.136, 0.605, 0.258], stretch: [-0.02, 0.571, 0.142] };
const R = 0.045, CELL = 0.045, LINEAR = 0.62, MIN_LEN = 0.08;

function analyse(file) {
  const s = parseSpz(new Uint8Array(readFileSync(file)));
  const n = s.count, P = s.center, key = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
  // only what can be seen: the hidden solid shell (fully opaque, inside him) is left out
  const seen = []; for (let i = 0; i < n; i++) seen.push(i);
  const grid = new Map();
  for (const i of seen) { const k = key(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); (grid.get(k) ?? grid.set(k, []).get(k)).push(i); }
  const near = (i, r) => {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], out = [], c = Math.ceil(r / CELL);
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL);
    for (let a = -c; a <= c; a++) for (let b = -c; b <= c; b++) for (let d = -c; d <= c; d++) for (const j of grid.get(`${cx + a},${cy + b},${cz + d}`) ?? []) {
      if ((P[j * 3] - x) ** 2 + (P[j * 3 + 1] - y) ** 2 + (P[j * 3 + 2] - z) ** 2 <= r * r) out.push(j);
    }
    return out;
  };
  // the largest share of the neighbours' spread that lies along one line (power iteration on their covariance)
  const lineOf = (idx) => {
    const m = [0, 0, 0]; for (const j of idx) for (let k = 0; k < 3; k++) m[k] += P[j * 3 + k] / idx.length;
    const C = [0, 0, 0, 0, 0, 0];
    for (const j of idx) { const a = P[j * 3] - m[0], b = P[j * 3 + 1] - m[1], c = P[j * 3 + 2] - m[2]; C[0] += a * a; C[1] += a * b; C[2] += a * c; C[3] += b * b; C[4] += b * c; C[5] += c * c; }
    let v = [1, 0.3, 0.2];
    for (let it = 0; it < 24; it++) { const w = [C[0] * v[0] + C[1] * v[1] + C[2] * v[2], C[1] * v[0] + C[3] * v[1] + C[4] * v[2], C[2] * v[0] + C[4] * v[1] + C[5] * v[2]]; const l = Math.hypot(...w) || 1; v = w.map((q) => q / l); }
    const top = v[0] * (C[0] * v[0] + C[1] * v[1] + C[2] * v[2]) + v[1] * (C[1] * v[0] + C[3] * v[1] + C[4] * v[2]) + v[2] * (C[2] * v[0] + C[4] * v[1] + C[5] * v[2]);
    return { share: top / ((C[0] + C[3] + C[5]) || 1), dir: v, mean: m };
  };
  const thin = new Set();
  for (const i of seen) { const nb = near(i, R); if (nb.length >= 6 && nb.length < 400 && lineOf(nb).share > LINEAR) thin.add(i); }
  // join them up
  const done = new Set(), strands = [];
  for (const i of thin) {
    if (done.has(i)) continue;
    const run = [], todo = [i]; done.add(i);
    while (todo.length) { const a = todo.pop(); run.push(a); for (const j of near(a, R * 0.8)) if (thin.has(j) && !done.has(j)) { done.add(j); todo.push(j); } }
    if (run.length < 30) continue;
    const L = lineOf(run), t = run.map((j) => (P[j * 3] - L.mean[0]) * L.dir[0] + (P[j * 3 + 1] - L.mean[1]) * L.dir[1] + (P[j * 3 + 2] - L.mean[2]) * L.dir[2]);
    const lo = Math.min(...t), hi = Math.max(...t);
    if (hi - lo < MIN_LEN) continue;
    // the strand's ends and middle: averages of its points near each end (it curves, so not just the line's ends)
    const at = (a, b) => { const m = [0, 0, 0]; let c = 0; run.forEach((j, q) => { if (t[q] >= a && t[q] <= b) { c++; for (let k = 0; k < 3; k++) m[k] += P[j * 3 + k]; } }); return m.map((v) => v / (c || 1)); };
    const w = (hi - lo) * 0.12;
    strands.push({ ends: [at(lo, lo + w), at(lo + (hi - lo) / 2 - w / 2, lo + (hi - lo) / 2 + w / 2), at(hi - w, hi)], n: run.length, len: hi - lo });
  }
  return { s, strands, near, P, seen };
}

const round = (v) => v.map((x) => +x.toFixed(3));
const out = {};
for (const [pose, file] of Object.entries(POSES)) {
  const { strands, P, seen } = analyse(new URL(`../../assets/splats/${file}.spz`, import.meta.url).pathname);
  // Whiskers: below the crown, wholly to one side of the head, sticking out sideways, more level than upright. On each
  // side the three that reach furthest out; root = the end nearer the head. If a side shows fewer than three (two
  // whiskers can touch and read as one), the missing ones are set between or beside those found.
  const cr = CROWN[pose];
  const side = (w) => { const a = w.ends[0][0] - cr[0], b = w.ends[2][0] - cr[0]; return a < -0.1 && b < -0.1 ? -1 : a > 0.1 && b > 0.1 ? 1 : 0; };
  const reach = (w) => Math.max(Math.abs(w.ends[0][0] - cr[0]), Math.abs(w.ends[2][0] - cr[0]));
  const likely = strands.filter((w) => {
    const ym = w.ends[1][1], rise = Math.abs(w.ends[0][1] - w.ends[2][1]) / w.len;
    return side(w) && ym > cr[1] - 0.5 && ym < cr[1] - 0.1 && reach(w) > 0.24 && reach(w) < 0.62 && rise < 0.75 && w.ends[1][2] > cr[2] - 0.2;
  });
  if (process.env.DEBUG) for (const w of strands) console.error('   ', pose, likely.includes(w) ? 'keep' : 'drop', w.len.toFixed(2), w.n, JSON.stringify(w.ends.map(round)));
  const whiskers = [];
  for (const sd of [-1, 1]) {
    let three = likely.filter((w) => side(w) === sd).sort((a, b) => reach(b) - reach(a)).slice(0, 3)
      .map((w) => (Math.abs(w.ends[0][0] - cr[0]) <= Math.abs(w.ends[2][0] - cr[0]) ? w.ends : [w.ends[2], w.ends[1], w.ends[0]]))
      .sort((a, b) => b[1][1] - a[1][1]);
    const shift = (w, dy) => w.map((p) => [p[0], p[1] + dy, p[2]]);
    if (three.length === 2) { const [t, bt] = three; three = [t, t.map((p, i) => p.map((v, k) => (v + bt[i][k]) / 2)), bt]; if (Math.abs(t[1][1] - bt[1][1]) < 0.07) three = [t, bt, shift(bt, -0.055)]; }
    if (three.length === 1) three = [shift(three[0], 0.055), three[0], shift(three[0], -0.055)];
    whiskers.push(...three);
  }
  // his face: between the two sides' roots, a little above them, on the surface nearest the camera when he faces it (+z)
  const avg = (list) => list.reduce((m, v) => m.map((x, k) => x + v[k] / list.length), [0, 0, 0]);
  const c = avg(whiskers.map((w) => w[0]));
  let zmax = -Infinity;
  for (const i of seen) if (Math.hypot(P[i * 3] - c[0], P[i * 3 + 1] - (c[1] + 0.03)) < 0.06) zmax = Math.max(zmax, P[i * 3 + 2]);
  out[pose] = { whiskers: whiskers.map((w) => w.map(round)), face: round([c[0], c[1] + 0.03, zmax]) };
  console.error(`${pose}: ${strands.length} thin strands, ${likely.length} likely, ${whiskers.length} whiskers; face ${out[pose].face}`);
}
console.log('// printed by tools/splats/whiskers.mjs\n' + Object.entries(out).map(([k, v]) => `      ${k}: { face: ${JSON.stringify(v.face)}, whiskers: ${JSON.stringify(v.whiskers)} },`).join('\n'));
