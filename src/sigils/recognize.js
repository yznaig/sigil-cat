// Sigil recognizer: gates a stroke (too short? just a swipe?), asks $1 which shape it is nearest, then checks what
// $1 cannot see.
// $1 turns and stretches every stroke to a standard square before comparing. That makes it forgiving, and blind to
// some things this page needs:
//   which way up     a dome and a cup are the same curve turned over: the open side decides (opens: 'down' | 'up')
//   closed or not    a circle, a box and a triangle must end near where they began; a half circle must not
//   round or square  stretched to a square, a box with soft corners and a circle look alike: how much of its own
//                    frame the shape fills, and whether it turns evenly or at corners, decide (roundness)
//   curve or corner  a V is not a cup: a half circle bulges well past the triangle on the same base
// The figure eight is found by rule, not by $1 (see isEight).
// Input: array of { x, y } in pixels, in the order they were drawn (y grows downward).
// Output:
//   { name, score }                                  a sigil: name is a key of SIGILS
//   { name: null, reason, best, score, why }         no sigil. reason is:
//        'short'  path under minLength px (a tap or a nudge)
//        'line'   nearly straight (a fling, handled elsewhere)
//        'low'    the best guess scored under minScore, or failed its own check (why). best = that guess's name.
import { DollarRecognizer } from './dollar.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pathLength = (pts) => { let d = 0; for (let i = 1; i < pts.length; i++) d += dist(pts[i], pts[i - 1]); return d; };
function bounds(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const w = maxX - minX, h = maxY - minY;
  return { w, h, short: Math.min(w, h), long: Math.max(w, h), diag: Math.hypot(w, h) };
}

// Hand jitter makes a swipe's raw path much longer than its chord, so judge straightness on a coarse copy: keep a
// point only when it is at least 5% of the stroke's size away from the last kept one.
function decimate(pts, length, frac = 0.05) {
  const gap = Math.min(length, bounds(pts).diag) * frac;
  const kept = [pts[0]];
  for (const p of pts) if (dist(p, kept[kept.length - 1]) >= gap) kept.push(p);
  kept.push(pts[pts.length - 1]);
  return kept;
}
// $1 stretches every stroke to a square, so a straight line would blow up into noise. Reject lines up front: a thin
// bounding box, or ends that are almost the whole path apart.
function isLine(pts, length, { thinRatio, straightRatio }) {
  const { short, long } = bounds(pts);
  if (long === 0 || short < thinRatio * long) return true;
  const coarse = decimate(pts, length);
  return dist(coarse[0], coarse[coarse.length - 1]) > straightRatio * pathLength(coarse);
}

// The same stroke as n points evenly spaced along it.
function resample(pts, n) {
  const step = pathLength(pts) / (n - 1), out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1];
    const b = pts[i];
    let d = dist(a, b);
    while (acc + d >= step && out.length < n - 1) {
      const t = (step - acc) / d;
      a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push(a);
      d = dist(a, b); acc = 0;
    }
    acc += d;
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// How nearly a stroke closes, as a fraction of its size: the gap between its ends, or less if the end ran on past
// the start (a hand overshoots) or the start was passed again.
function closure(pts, long) {
  const n = pts.length, a = pts[0], b = pts[n - 1], q = Math.max(2, Math.floor(n / 4));
  let m = dist(a, b);
  for (let i = n - q; i < n; i++) m = Math.min(m, dist(pts[i], a));
  for (let i = 0; i < q; i++) m = Math.min(m, dist(pts[i], b));
  return m / (long || 1);
}
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };
// A closed stroke with any run past its start cut off (a hand overshoots).
function loop(pts) {
  let end = pts.length - 1, near = Infinity;
  for (let i = Math.floor(pts.length * 0.7); i < pts.length; i++) { const d = dist(pts[i], pts[0]); if (d < near) { near = d; end = i; } }
  return pts.slice(0, end + 1);
}
// Round or square? Two measures of a closed shape, both blind to size, tilt and stretch:
//   fill   how much of its own frame it fills: its area over the tightest box around it at any tilt. A box is near 1
//          (soft corners and a wobbly hand bring it to about 0.8), a circle or oval is 0.79, a triangle 0.5.
//   share  how much of its turning happens in a third of its length. A circle turns evenly (about a third); a box
//          does nearly all its turning at its corners, however soft.
// A fast finger leaves few points (a phone reports ~60 a second: a quick circle is 12-20 points, 30-50 px apart), and
// the straight chords between them turn only at the points: a circle of 12 chords turns at 12 corners, so its turning
// looked as bunched as a box's and it was taken for the box (playtest 4, gags lane: Aaron's circles on his phone said
// the box's intro line). So a sparse loop is first drawn through its points as a smooth closed curve (Catmull-Rom),
// at least `dense` points round; a box's sharp corners stay where most of its turning is.
function smooth(p, dense = 72) {
  const n = p.length;
  if (n < 4 || n >= dense) return p;
  const k = Math.ceil(dense / n), out = [];
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      out.push({ x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                 y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3) });
    }
  }
  return out;
}
// loop(), cut where the stroke passes nearest its start along a segment, not only at a point: with points far apart
// the nearest one can lie well past the start, and the closed shape would double back there (a sharp turn at the seam).
function seam(pts) {
  let end = pts.length - 1, at = pts[end], near = Infinity;
  for (let i = Math.max(1, Math.floor(pts.length * 0.7)); i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
    const t = L ? Math.min(1, Math.max(0, ((pts[0].x - a.x) * dx + (pts[0].y - a.y) * dy) / L)) : 0;
    const c = { x: a.x + dx * t, y: a.y + dy * t }, d = dist(c, pts[0]);
    if (d < near) { near = d; end = i; at = c; }
  }
  const out = pts.slice(0, end);
  if (dist(at, pts[0]) > 1e-6 && dist(at, out[out.length - 1]) > 1e-6) out.push(at);
  return out;
}
function roundness(pts) {
  const p = smooth(seam(pts)), a = Math.abs(area(p));
  let box = Infinity;
  for (let deg = 0; deg < 90; deg += 3) {
    const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of p) { const x = q.x * c + q.y * s, y = q.y * c - q.x * s; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    box = Math.min(box, (x1 - x0) * (y1 - y0));
  }
  const N = 24, r = resample([...p, p[0]], N + 1).slice(0, N), turns = [];
  for (let i = 0; i < N; i++) {
    const u = r[(i - 1 + N) % N], v = r[i], w = r[(i + 1) % N];
    turns.push(Math.abs(Math.atan2((v.x - u.x) * (w.y - v.y) - (v.y - u.y) * (w.x - v.x), (v.x - u.x) * (w.x - v.x) + (v.y - u.y) * (w.y - v.y))));
  }
  turns.sort((x, y) => y - x);
  const total = turns.reduce((x, y) => x + y, 0) || 1;
  return { fill: a / (box || 1), share: turns.slice(0, N / 3).reduce((x, y) => x + y, 0) / total };
}
// An open curve against the line between its ends: which way it opens (from its deepest point toward the middle of
// that line), whether it stays on one side (an S does not), and how far it bulges past the triangle on the same base
// and depth (a V is 1, a half circle about 1.5).
function arcShape(pts) {
  const a = pts[0], b = pts[pts.length - 1], mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const len = dist(a, b) || 1, nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
  let lo = 0, hi = 0, apex = mid, far = 0;
  for (const p of pts) {
    const d = (p.x - a.x) * nx + (p.y - a.y) * ny;
    lo = Math.min(lo, d); hi = Math.max(hi, d);
    if (Math.abs(d) > Math.abs(far)) { far = d; apex = p; }
  }
  const ang = Math.atan2(mid.y - apex.y, mid.x - apex.x) * 180 / Math.PI;      // 90 = straight down the screen
  const way = Math.abs(ang - 90) <= 40 ? 'down' : Math.abs(ang + 90) <= 40 ? 'up' : 'side';
  return { way, depth: Math.abs(far) / len, oneSided: Math.min(-lo, hi) < 0.12 * Math.max(-lo, hi), bulge: Math.abs(area(pts)) / (0.5 * len * Math.abs(far) || 1) };
}
// A figure eight lying on its side: a closed stroke that crosses itself in one place, making two loops that turn
// opposite ways, side by side. Looked for directly ($1 cannot hold it: an eight that starts at its crossing has no
// steady angle to be turned to).
export function isEight(points, B = bounds(points)) {
  if (closure(points, B.long) > 0.4) return false;
  const p = resample(loop(points), 64), m = p.length, seg = (k) => [p[k], p[(k + 1) % m]];   // walked as a closed loop of 64 points
  const meet = ([a, b], [c, d]) => {
    const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y, den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
    return t > 0 && t < 1 && u > 0 && u < 1 ? { x: a.x + rx * t, y: a.y + ry * t } : null;
  };
  // Every place the loop crosses itself, leaving out the seam (where its last few points meet its first few). One
  // crossing must split the loop into two like halves; any others must lie right by it (a stroke that starts at its
  // own crossing passes it three times).
  const hits = [];
  for (let i = 0; i < m; i++) for (let j = i + 2; j < m; j++) {
    if (i < 8 && j >= m - 8) continue;
    const at = meet(seg(i), seg(j));
    if (at) hits.push({ ...at, i, j });
  }
  if (!hits.length || hits.length > 8) return false;
  const split = hits.reduce((a, b) => (Math.abs(b.j - b.i - m / 2) < Math.abs(a.j - a.i - m / 2) ? b : a));
  if (Math.abs(split.j - split.i - m / 2) > m * 0.2) return false;       // the two loops are of like length
  for (const h of hits) if (dist(h, split) > 0.2 * B.long) return false;
  const lobe = (idx) => { const q = idx.map((k) => p[k]); return { area: area(q), x: q.reduce((s, v) => s + v.x, 0) / q.length, y: q.reduce((s, v) => s + v.y, 0) / q.length }; };
  const inner = [], outer = [];
  for (let k = split.i + 1; k <= split.j; k++) inner.push(k);
  for (let k = split.j + 1; k < m; k++) outer.push(k);
  for (let k = 0; k <= split.i; k++) outer.push(k);
  const A = lobe(inner), C = lobe(outer), box = B.w * B.h || 1;
  if (A.area * C.area >= 0) return false;                               // both loops turn the same way: not an eight
  if (Math.abs(A.area) < 0.09 * box || Math.abs(C.area) < 0.09 * box) return false;
  const ratio = Math.abs(A.area / C.area);
  if (ratio < 0.3 || ratio > 3.3) return false;
  return Math.abs(A.x - C.x) > Math.abs(A.y - C.y);                     // side by side, not one above the other
}

export function createRecognizer(SIGILS, { minScore = 0.8, minLength = 120, thinRatio = 0.2, straightRatio = 0.9 } = {}) {
  const templates = [];
  for (const [name, sigil] of Object.entries(SIGILS)) for (const points of sigil.templates) templates.push({ name, points });
  const dollar = new DollarRecognizer(templates);

  function recognize(points) {
    if (!Array.isArray(points) || points.length < 2) return { name: null, reason: 'short', best: null, score: 0 };
    const length = pathLength(points);
    if (length < minLength) return { name: null, reason: 'short', best: null, score: 0 };
    if (isLine(points, length, { thinRatio, straightRatio })) return { name: null, reason: 'line', best: null, score: 0 };
    const B = bounds(points);
    if (SIGILS.eight && isEight(points, B)) return { name: 'eight', score: 1 };

    const scores = dollar.Scores(points);
    let best = null;
    // a sign may veto itself by its own shape test (accept: his sign, src/sigils/templates.js); then the next best wins
    const ok = (n) => !SIGILS[n]?.accept || SIGILS[n].accept(points);
    for (const [n, s] of Object.entries(scores)) if (Number.isFinite(s) && (!best || s > scores[best]) && ok(n)) best = n;
    let score = best ? scores[best] : 0;
    const low = (why) => ({ name: null, reason: 'low', best, score, why });
    if (!best || score < minScore) return low('score');
    const S = SIGILS[best];

    if (S.closed !== undefined) {                                  // circle, box, triangle
      if (closure(points, B.long) > S.closed) return low('not closed');
      if (S.round !== undefined) {                                 // the circle and the box: which is it really?
        const r = roundness(points), boxy = r.fill >= 0.83 || (r.fill >= 0.74 && r.share >= 0.64);
        if (boxy === S.round) {                                    // $1 picked the other one
          const other = Object.keys(SIGILS).find((n) => SIGILS[n].round === !S.round);
          if (!other || (scores[other] ?? 0) < minScore - 0.1) return low(boxy ? 'too square' : 'too round');
          best = other; score = Math.max(scores[other], minScore);
        }
      }
      return { name: best, score };
    }
    if (S.opens) {                                                 // the half circle: open, smooth, one-sided, named by its open side
      if (closure(points, B.long) < S.open) return low('closed');
      const shape = arcShape(decimate(points, length, 0.03));
      if (!shape.oneSided || shape.depth < 0.22 || shape.depth > 0.95) return low('not a half circle');
      if (shape.bulge < 1.2) return low('a corner, not a curve');
      const name = Object.keys(SIGILS).find((n) => SIGILS[n].opens === shape.way && (n === best || SIGILS[n].shares === best || SIGILS[best].shares === n));
      if (!name) return low('opens sideways');
      return { name, score };
    }
    return { name: best, score };
  }
  return { recognize };
}
