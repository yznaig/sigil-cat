// Sigil recognizer test. Run: node checks/sigils.test.mjs
// No dependencies. Synthesizes human-like strokes (random scale, tilt, stretch, wobble, jitter,
// uneven pointermove spacing) with generators that are deliberately separate from the templates,
// so the test measures generalisation instead of replaying the templates back at themselves.
// Seeded PRNG: same numbers every run.

import assert from 'node:assert/strict';
import { SIGILS } from '../src/sigils/templates.js';
import { createRecognizer } from '../src/sigils/recognize.js';

const SEED = Number(process.env.SIGIL_SEED ?? 20261108); // override to probe other draws
const TRIALS = 100; // per sigil
const MIN_ACCURACY = 0.9;
const MAX_SCRIBBLE_HIT = 0.15;
const MIN_SCORE = 0.8;

const recognizer = createRecognizer(SIGILS, { minScore: MIN_SCORE, minLength: 120 });

// ---- seeded random ----------------------------------------------------------------------

function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => { // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = { next };
  rng.range = (lo, hi) => lo + (hi - lo) * next();
  rng.int = (lo, hi) => Math.floor(rng.range(lo, hi + 1));
  rng.pick = (arr) => arr[Math.floor(next() * arr.length)];
  rng.chance = (p) => next() < p;
  rng.gauss = () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
  return rng;
}

// ---- geometry helpers ---------------------------------------------------------------------

const pt = (x, y) => ({ x, y });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function pathLen(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += dist(pts[i - 1], pts[i]);
  return d;
}

// Dense straight-segment path through corners.
function through(corners) {
  const out = [corners[0]];
  for (let i = 1; i < corners.length; i++) {
    const n = Math.max(1, Math.ceil(dist(corners[i - 1], corners[i]) / 2));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push(pt(corners[i - 1].x + (corners[i].x - corners[i - 1].x) * t, corners[i - 1].y + (corners[i].y - corners[i - 1].y) * t));
    }
  }
  return out;
}

function bezier(p0, p1, p2, p3, n = 30) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
    return pt(b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x, b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y);
  });
}

// Chaikin corner cutting: rounds sharp corners the way a hand does.
function roundCorners(corners, rounds) {
  let pts = corners;
  for (let r = 0; r < rounds; r++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      next.push(pt(a.x * 0.75 + b.x * 0.25, a.y * 0.75 + b.y * 0.25), pt(a.x * 0.25 + b.x * 0.75, a.y * 0.25 + b.y * 0.75));
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

// A polyline with optionally rounded corners, then densified.
const handPolyline = (rng, corners) => through(roundCorners(corners, rng.pick([0, 1, 1, 2])));

const jitterPoint = (rng, p, amount) => pt(p.x + rng.gauss() * amount, p.y + rng.gauss() * amount);

// ---- sigil drawers (shape space, roughly 100 units tall) ----------------------------------

function drawButter(rng) {
  const H = 100;
  const x0 = rng.range(-3, 3);
  const slant = rng.range(-4, 4); // the spine leans a little
  const spineX = (y) => x0 + (slant * y) / H;
  const split = rng.range(42, 58);
  const uw = rng.range(26, 52);
  const lw = uw * rng.range(0.9, 1.35);
  const bump = (y0, y1, w) => bezier(
    pt(spineX(y0), y0), pt(spineX(y0) + w * 1.35, y0 - 2), pt(spineX(y1) + w * 1.35, y1 + 2), pt(spineX(y1), y1));
  const upper = bump(0, split, uw);
  const lower = bump(split, H, lw);
  const down = through([pt(spineX(0), 0), pt(spineX(H), H)]);
  const up = through([pt(spineX(H) + rng.range(-4, 4), H), pt(spineX(0), 0)]); // the retrace never lands exactly
  const kind = rng.pick(['down-up-bumps', 'up-bumps', 'down-bumps-from-bottom']);
  if (kind === 'down-up-bumps') return [...down, ...up, ...upper, ...lower];
  if (kind === 'up-bumps') return [...up, ...upper, ...lower]; // starts at the bottom
  return [...down, ...lower.slice().reverse(), ...upper.slice().reverse()];
}

function drawCircle(rng) {
  const dir = rng.pick([1, -1]);
  const start = rng.range(0, 2 * Math.PI);
  const turns = rng.range(0.93, 1.2);
  const wobbleAmp = rng.range(0.02, 0.07);
  const wobblePhase = rng.range(0, 6.28);
  const growth = rng.range(-0.06, 0.06); // radius drifts as the hand goes round
  const n = 120;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const a = start + dir * turns * 2 * Math.PI * t;
    const r = 50 * (1 + wobbleAmp * Math.sin(2 * a + wobblePhase) + growth * t);
    return pt(r * Math.cos(a), r * Math.sin(a));
  });
}

function drawZigzag(rng) {
  const kind = rng.pick(['Z', 'bolt4', 'bolt5', 'bolt5']);
  const wob = () => rng.range(-6, 6);
  let corners;
  if (kind === 'Z') {
    corners = [pt(wob(), wob()), pt(100 + wob(), wob()), pt(wob(), 100 + wob()), pt(100 + wob(), 100 + wob())];
  } else {
    const n = kind === 'bolt4' ? 4 : 5;
    const h = rng.range(45, 85);
    corners = Array.from({ length: n + 1 }, (_, i) => pt((i * 100) / n + wob() * 0.7, (i % 2 === 0 ? 0 : h) + wob()));
  }
  if (rng.chance(0.5)) corners = corners.map((p) => pt(-p.x, p.y)); // right-to-left
  if (rng.chance(0.4)) corners = corners.map((p) => pt(p.x, -p.y)); // start low
  return handPolyline(rng, corners);
}

function drawStar(rng) {
  const dir = rng.pick([1, -1]);
  const first = rng.int(0, 4);
  const rot = rng.range(-0.15, 0.15);
  const radii = Array.from({ length: 5 }, () => 50 * rng.range(0.88, 1.12));
  const vertex = (k) => {
    const a = -Math.PI / 2 + rot + (k * 2 * Math.PI) / 5;
    const r = radii[((k % 5) + 5) % 5];
    return pt(r * Math.cos(a), r * Math.sin(a));
  };
  const corners = [0, 2, 4, 1, 3, 0].map((j) => vertex(first + dir * j));
  const end = corners[5];
  const over = rng.range(-0.08, 0.2); // stop short of, or run past, the start
  corners[5] = pt(end.x + (corners[4].x - end.x) * -over, end.y + (corners[4].y - end.y) * -over);
  return handPolyline(rng, corners);
}

function drawTriangle(rng) {
  const apex = pt(rng.range(25, 75), rng.range(0, 8));
  const br = pt(rng.range(92, 112), rng.range(75, 100));
  const bl = pt(rng.range(-12, 8), rng.range(75, 100));
  let c = [apex, br, bl];
  const s = rng.int(0, 2);
  c = [c[s], c[(s + 1) % 3], c[(s + 2) % 3]];
  if (rng.chance(0.5)) c = [c[0], c[2], c[1]];
  const over = rng.range(-0.05, 0.18);
  const closing = pt(c[0].x + (c[1].x - c[0].x) * over, c[0].y + (c[1].y - c[0].y) * over);
  return handPolyline(rng, [c[0], c[1], c[2], closing]);
}

// A half circle, a little more or less, a bit lopsided. up = false: the dome (open at the bottom); true: the cup.
function drawArc(rng, up) {
  const sweep = rng.range(0.44, 0.6) * 2 * Math.PI, lean = rng.range(-0.18, 0.18);
  const rx = 50, ry = 50 * rng.range(0.7, 1.35), n = 70;
  let pts = Array.from({ length: n + 1 }, (_, i) => {
    const a = Math.PI - (sweep - Math.PI) / 2 + lean + (sweep * i) / n;      // over the top, left to right
    const r = 1 + rng.range(-0.015, 0.015);
    return pt(rx * r * Math.cos(a), ry * r * Math.sin(a));
  });
  if (up) pts = pts.map((p) => pt(p.x, -p.y));
  if (rng.chance(0.5)) pts.reverse();
  return pts;
}
function drawSquare(rng) {
  const w = rng.range(80, 120), h = rng.range(80, 120), wob = () => rng.range(-5, 5);
  let c = [pt(wob(), wob()), pt(w + wob(), wob()), pt(w + wob(), h + wob()), pt(wob(), h + wob())];
  const s = rng.int(0, 3);
  c = [0, 1, 2, 3].map((k) => c[(s + k) % 4]);
  if (rng.chance(0.5)) c = [c[0], c[3], c[2], c[1]];
  const over = rng.range(-0.06, 0.15);
  const closing = pt(c[0].x + (c[1].x - c[0].x) * over + wob() * 0.5, c[0].y + (c[1].y - c[0].y) * over + wob() * 0.5);
  return through(roundCorners([c[0], c[1], c[2], c[3], closing], rng.pick([0, 1, 1])));   // corners soft, as a hand makes them, but still corners
}
function drawEight(rng) {
  const ph = rng.pick([0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) + rng.range(-0.25, 0.25), dir = rng.pick([1, -1]);
  const turns = rng.range(0.97, 1.1), squash = rng.range(0.42, 0.8), n = 140;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ph + dir * turns * 2 * Math.PI * (i / n);
    return pt(50 * Math.sin(t) * (1 + rng.range(-0.02, 0.02)), 50 * squash * Math.sin(2 * t));
  });
}

// Unit 8: handle up, short left tooth, tallest middle tooth, shorter offset right tooth.
// A hand retraces the bowl between the three teeth; no other sign has this stem and comb.
function drawFork(rng) {
  const x = rng.range(43, 53), bowl = rng.range(39, 48), left = rng.range(5, 12), right = rng.range(85, 98);
  let c = [pt(x + rng.range(-6, 4), 102), pt(x, bowl), pt(left, bowl - 3),
    pt(left - 2, rng.range(9, 18)), pt(left + 2, bowl), pt(x, bowl),
    pt(x + rng.range(-3, 3), rng.range(-5, 3)), pt(x + 2, bowl),
    pt(right, bowl + 5), pt(right + 2, rng.range(20, 28))];
  if (rng.chance(.5)) c.reverse();
  return handPolyline(rng, c);
}

const DRAWERS = {
  butter: drawButter,
  circle: drawCircle,
  zigzag: drawZigzag,
  dome: (rng) => drawArc(rng, false),
  cup: (rng) => drawArc(rng, true),
  square: drawSquare,
  eight: drawEight,
  triangle: drawTriangle,
  fork: drawFork,
};

// ---- non-sigils: scribbles, lines, taps --------------------------------------------------

const SCRIBBLES = {
  // smooth wandering curve: a few random sine waves per axis
  wander(rng) {
    const waves = Array.from({ length: 2 }, () => ({ fx: rng.range(0.5, 3.2), fy: rng.range(0.5, 3.2), px: rng.range(0, 6.3), py: rng.range(0, 6.3), a: rng.range(0.4, 1) }));
    return Array.from({ length: 160 }, (_, i) => {
      const t = i / 159 * 2 * Math.PI;
      return pt(waves.reduce((s, w) => s + w.a * Math.sin(w.fx * t + w.px), 0) * 50, waves.reduce((s, w) => s + w.a * Math.cos(w.fy * t + w.py), 0) * 50);
    });
  },
  // random jagged polyline, 6-12 vertices
  jagged(rng) {
    return through(Array.from({ length: rng.int(6, 12) }, () => pt(rng.range(0, 100), rng.range(0, 100))));
  },
  // random walk with persistence
  walk(rng) {
    let p = pt(0, 0), a = rng.range(0, 6.3);
    return Array.from({ length: 150 }, () => { a += rng.gauss() * 0.7; p = pt(p.x + Math.cos(a) * 4, p.y + Math.sin(a) * 4); return p; });
  },
  // spiral, 2.2+ turns
  spiral(rng) {
    const turns = rng.range(2.2, 3.2);
    return Array.from({ length: 200 }, (_, i) => { const t = i / 199; const a = turns * 2 * Math.PI * t; return pt(50 * t * Math.cos(a), 50 * t * Math.sin(a)); });
  },
  // tight hatching: back and forth many times
  hatch(rng) {
    const n = rng.int(7, 12);
    return through(Array.from({ length: n }, (_, i) => pt(i * 8 + rng.range(-3, 3), (i % 2 ? 90 : 0) + rng.range(-8, 8))));
  },
  // a "C" or a backwards "C": half a circle open to the side (open at the top or bottom it would be a sigil)
  openArc(rng) {
    const sweep = rng.range(0.4, 0.62) * 2 * Math.PI;
    const a0 = rng.pick([Math.PI / 2, -Math.PI / 2]) - (sweep - Math.PI) / 2 + rng.range(-0.2, 0.2);
    return Array.from({ length: 60 }, (_, i) => { const a = a0 + (sweep * i) / 59; return pt(50 * Math.cos(a), 50 * Math.sin(a)); });
  },
  // S curve and wave
  wave(rng) {
    const cycles = rng.range(0.8, 2.2);
    return Array.from({ length: 100 }, (_, i) => { const t = i / 99; return pt(100 * t, 40 * Math.sin(cycles * 2 * Math.PI * t)); });
  },
  // a check mark / V / L: two segments
  corner(rng) {
    return through([pt(0, rng.range(0, 40)), pt(rng.range(30, 60), 100), pt(100, rng.range(0, 60))]);
  },
};

function makeLine(rng) {
  const len = rng.range(150, 500);
  const angle = rng.pick([rng.range(-0.15, 0.15), rng.range(-0.15, 0.15), rng.range(0.4, 1.2), rng.range(-1.2, -0.4), rng.range(1.4, 1.7)]);
  const sag = rng.range(-0.04, 0.04) * len; // a flick is never perfectly straight
  const n = 40;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return pt(len * t, sag * Math.sin(Math.PI * t));
  });
  return pts.map((p) => pt(p.x * Math.cos(angle) - p.y * Math.sin(angle), p.x * Math.sin(angle) + p.y * Math.cos(angle)));
}

function makeTap(rng) {
  // A tap/nudge: a few px of wobble, or a short drag.
  const len = rng.range(2, 95);
  const angle = rng.range(0, 6.3);
  return Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return pt(len * t * Math.cos(angle) + rng.gauss() * 1.2, len * t * Math.sin(angle) + rng.gauss() * 1.2);
  });
}

// ---- turn a drawn path into what pointermove would deliver --------------------------------

// Walk along the path with a changing speed, like a hand: slow at the ends, fast in the middle.
function sampleLikeAHand(rng, dense) {
  const total = pathLen(dense);
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + dist(dense[i - 1], dense[i]));
  const at = (s) => {
    let lo = 0, hi = dense.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    const span = cum[hi] - cum[lo] || 1;
    const t = (s - cum[lo]) / span;
    return pt(dense[lo].x + (dense[hi].x - dense[lo].x) * t, dense[lo].y + (dense[hi].y - dense[lo].y) * t);
  };
  const baseSpeed = rng.range(4, 18); // px per event
  let speed = baseSpeed;
  const out = [at(0)];
  let s = 0;
  while (s < total) {
    speed += (baseSpeed - speed) * 0.15 + rng.gauss() * baseSpeed * 0.18; // drifting speed
    speed = Math.min(Math.max(speed, 1.5), baseSpeed * 2.5);
    const ease = 0.35 + 0.65 * Math.sqrt(Math.sin(Math.PI * Math.min(s / total, 1)));
    s += Math.max(1, speed * ease);
    if (s < total) out.push(at(s));
  }
  out.push(at(total));
  return out;
}

// Scale, stretch, tilt, move, jitter.
function placeOnScreen(rng, shape, { stretch = true } = {}) {
  const xs = shape.map((p) => p.x), ys = shape.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs) || 1;
  const h = Math.max(...ys) - Math.min(...ys) || 1;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const size = rng.range(80, 400);
  const k = size / Math.max(w, h);
  const aspect = stretch ? rng.range(0.75, 1.3) : 1;
  const tilt = rng.range(-20, 20) * (Math.PI / 180);
  const ox = rng.range(150, 900), oy = rng.range(150, 600);
  const sampled = sampleLikeAHand(rng, shape);
  const jitter = rng.range(0.8, 2.5);
  return sampled.map((p) => {
    const x = (p.x - cx) * k * aspect, y = (p.y - cy) * k;
    return jitterPoint(rng, pt(ox + x * Math.cos(tilt) - y * Math.sin(tilt), oy + x * Math.sin(tilt) + y * Math.cos(tilt)), jitter);
  });
}

// ---- run ------------------------------------------------------------------------------------

const rng = makeRng(SEED);
const failures = [];
const lines = [];
const check = (ok, message) => {
  lines.push(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
  if (!ok) failures.push(message);
};

const columns = [...Object.keys(SIGILS), 'low', 'line', 'short'];
const outcomeOf = (r) => (r.name ? r.name : r.reason);
const confusion = {}; // true class -> outcome -> count
const tally = (cls, outcome) => {
  confusion[cls] ??= {};
  confusion[cls][outcome] = (confusion[cls][outcome] ?? 0) + 1;
};

// 1. Each sigil: >= 90% recognised as itself.
const worst = {}, misses = {};
for (const name of Object.keys(SIGILS).filter(n => n !== 'fork')) {
  let right = 0;
  const scores = [];
  for (let i = 0; i < TRIALS; i++) {
    const stroke = placeOnScreen(rng, DRAWERS[name](rng));
    const r = recognizer.recognize(stroke);
    tally(name, outcomeOf(r));
    scores.push(r.score ?? 0);
    if (r.name === name) right++;
    else if (process.env.SIGIL_DEBUG && (misses[name] = (misses[name] ?? 0) + 1) <= 6) console.log(`  miss ${name}: said ${outcomeOf(r)} why=${r.why ?? ''} corners=${r.corners ?? ''} best=${r.best ?? ''} score=${(r.score ?? 0).toFixed(2)} n=${stroke.length}`);
  }
  const acc = right / TRIALS;
  scores.sort((a, b) => a - b);
  worst[name] = scores[Math.floor(scores.length * 0.1)];
  check(acc >= MIN_ACCURACY, `${name.padEnd(8)} accuracy ${(acc * 100).toFixed(0)}% (${right}/${TRIALS}), need >= ${MIN_ACCURACY * 100}%; 10th-percentile score ${worst[name].toFixed(2)}`);
}

// 2. Scribbles are rejected.
{
  const kinds = Object.keys(SCRIBBLES);
  let hits = 0, total = 0;
  const perKind = {};
  for (const kind of kinds) {
    for (let i = 0; i < 40; i++) {
      const stroke = placeOnScreen(rng, SCRIBBLES[kind](rng));
      const r = recognizer.recognize(stroke);
      tally('scribble', outcomeOf(r));
      total++;
      if (r.name) { hits++; perKind[kind] = (perKind[kind] ?? 0) + 1; }
    }
  }
  const rate = hits / total;
  const detail = Object.entries(perKind).map(([k, v]) => `${k}:${v}/40`).join(' ') || 'none';
  check(rate <= MAX_SCRIBBLE_HIT, `scribbles falsely cast ${(rate * 100).toFixed(1)}% (${hits}/${total}), need <= ${MAX_SCRIBBLE_HIT * 100}%; by kind: ${detail}`);
}

// 3. Straight swipes are "line".
{
  let ok = 0;
  const N = 100;
  for (let i = 0; i < N; i++) {
    const stroke = placeLine(rng);
    const r = recognizer.recognize(stroke);
    tally('line', outcomeOf(r));
    if (r.reason === 'line') ok++;
  }
  check(ok === N, `straight swipes classed 'line' ${ok}/${N}`);
}
function placeLine(rng) {
  const dense = through(makeLine(rng));
  const sampled = sampleLikeAHand(rng, dense);
  const ox = rng.range(200, 800), oy = rng.range(200, 500);
  return sampled.map((p) => jitterPoint(rng, pt(ox + p.x, oy + p.y), rng.range(0.3, 1.5)));
}

// 4. Tiny strokes are "short".
{
  let ok = 0;
  const N = 100;
  for (let i = 0; i < N; i++) {
    const stroke = makeTap(rng).map((p) => pt(p.x + 400, p.y + 300));
    const r = recognizer.recognize(stroke);
    tally('tap', outcomeOf(r));
    if (r.reason === 'short') ok++;
  }
  check(ok === N, `tiny strokes classed 'short' ${ok}/${N}`);
}

// 4b. The loaf's sign (N11): a half circle casts it, a triangle does not, and it is never taken for the circle or the B.
{
  let asLoaf = 0, triLoaf = 0, circLoaf = 0, bLoaf = 0, cupLoaf = 0;
  const N = 100;
  for (let i = 0; i < N; i++) {
    if (recognizer.recognize(placeOnScreen(rng, drawArc(rng, false))).name === 'dome') asLoaf++;
    if (recognizer.recognize(placeOnScreen(rng, drawTriangle(rng))).name === 'dome') triLoaf++;
    if (recognizer.recognize(placeOnScreen(rng, drawCircle(rng))).name === 'dome') circLoaf++;
    if (recognizer.recognize(placeOnScreen(rng, drawButter(rng))).name === 'dome') bLoaf++;
    if (recognizer.recognize(placeOnScreen(rng, drawArc(rng, true))).name === 'dome') cupLoaf++;
  }
  check(asLoaf >= 90 && triLoaf === 0 && circLoaf === 0 && bLoaf === 0 && cupLoaf === 0,
    `loaf sign: half circles cast it ${asLoaf}/${N}; triangles ${triLoaf}, circles ${circLoaf}, Bs ${bLoaf}, cups ${cupLoaf} taken for it (need 0)`);
}

// Separate RNG keeps the existing regressions' input unchanged when this new class is tested.
{
  const fr = makeRng(8082026);
  const plain = through([pt(48,102),pt(48,44),pt(8,41),pt(6,13),pt(10,44),pt(48,44),pt(48,0),pt(50,44),pt(92,49),pt(94,24)]);
  const clean = [plain, plain.slice().reverse()].map(p => recognizer.recognize(p.map(q => pt(q.x*2+200,q.y*2+150))).name);
  check(clean.every(n => n === 'fork'), `fork positive forward/reverse: ${clean.join(', ')}`);
  let right = 0, confusion = 0;
  for (let i=0;i<100;i++) {
    const result=recognizer.recognize(placeOnScreen(fr,drawFork(fr)));
    tally('fork',outcomeOf(result));
    if(result.name==='fork')right++;
  }
  for (const [name, draw] of Object.entries(DRAWERS)) if(name!=='fork') {
    for(let i=0;i<100;i++) if(recognizer.recognize(placeOnScreen(fr,draw(fr))).name==='fork') confusion++;
  }
  check(right>=90, `fork perturbed: ${right}/100 (need >=90)`);
  check(clean.every(n => n==='fork') && confusion===0, `fork cross-template confusion: ${confusion}/${(Object.keys(DRAWERS).length - 1) * 100} other signs cast fork (need 0)`);
}

// 4c. The star is no longer a sign (playtest 2: it is found by spinning him). A drawn star is a scribble: it casts no
// sign, and is not taken for another one any more often than a scribble is (section 2's limit).
{
  const sr = makeRng(20261112), N = 200, said = {};
  let cast = 0;
  for (let i = 0; i < N; i++) {
    const r = recognizer.recognize(placeOnScreen(sr, drawStar(sr)));
    tally('star (old)', outcomeOf(r));
    if (r.name) { cast++; said[r.name] = (said[r.name] ?? 0) + 1; }
  }
  check(!SIGILS.star && cast / N <= MAX_SCRIBBLE_HIT, `drawn stars cast a sign ${cast}/${N} (need <= ${MAX_SCRIBBLE_HIT * 100}%, no 'star' sigil)${cast ? ': ' + JSON.stringify(said) : ''}`);
}

// 5. Template self-check: a clean template, replayed with the same points, is recognised as itself.
{
  let bad = [];
  for (const [name, sigil] of Object.entries(SIGILS)) {
    sigil.templates.forEach((tpl, i) => {
      const scaled = tpl.map((p) => pt(p.x * 3 + 500, p.y * 3 + 400));
      const r = recognizer.recognize(scaled);
      if (r.name !== name) bad.push(`${name}#${i}->${outcomeOf(r)}`);
    });
  }
  check(bad.length === 0, `every clean template recognises as itself${bad.length ? ' (misses: ' + bad.join(', ') + ')' : ''}`);
}

// 6. Edge cases must not throw or return NaN.
{
  const odd = [[], [pt(1, 1)], [pt(1, 1), pt(1, 1)], Array.from({ length: 50 }, () => pt(5, 5)), [pt(0, 0), pt(300, 0)]];
  let ok = true;
  for (const stroke of odd) {
    try { const r = recognizer.recognize(stroke); ok = ok && r.name === null && typeof r.reason === 'string'; } catch { ok = false; }
  }
  check(ok, 'degenerate input (empty, single point, repeated point, two points) is rejected without throwing');
}

// ---- report -----------------------------------------------------------------------------------

console.log(lines.join('\n'));
console.log('\nConfusion (rows = what was drawn, columns = what the recognizer said):');
const rowsOrder = [...Object.keys(SIGILS), 'star (old)', 'scribble', 'line', 'tap'];
const pad = (s, n) => String(s).padStart(n);
console.log('           ' + columns.map((c) => pad(c, 8)).join(''));
for (const row of rowsOrder) {
  console.log(row.padEnd(11) + columns.map((c) => pad(confusion[row]?.[c] ?? 0, 8)).join(''));
}

if (failures.length) {
  console.log(`\nFAIL: ${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nPASS: all checks passed');
assert.ok(true);
