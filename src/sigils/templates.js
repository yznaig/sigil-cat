// Sigil templates for the $1 recognizer, generated from code instead of recorded by hand.
// Screen coordinates: x grows right, y grows DOWN. All shapes are built in a ~100-unit box;
// the recognizer rescales, so only the shape and the drawing order matter.
//
// Why many variants per sigil: $1 compares points in drawing order, so the same shape drawn the
// other way round (or started elsewhere) is a different template. Each sigil lists the ways a
// person really draws it.

// ---- tiny path helpers -------------------------------------------------------------------

const pt = (x, y) => ({ x, y });

// Straight run from a to b, sampled about every 2 units so corners stay sharp after resampling.
function line(a, b) {
  const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
  return Array.from({ length: n + 1 }, (_, i) => pt(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n));
}

// Elliptical arc from angle a0 to a1 (radians). Screen y points down, so an increasing angle
// runs clockwise as the visitor sees it.
function arc(cx, cy, rx, ry, a0, a1) {
  const n = Math.max(8, Math.ceil((Math.abs(a1 - a0) * Math.max(rx, ry)) / 2));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return pt(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
  });
}

// Join several runs into one stroke, skipping each run's first point (it repeats the last).
const join = (...runs) => runs.flatMap((run, i) => (i === 0 ? run : run.slice(1)));

// Straight segments through the given corner points.
const polyline = (corners) => join(...corners.slice(1).map((c, i) => line(corners[i], c)));

const mirrorX = (pts) => pts.map((p) => pt(-p.x, p.y));
const mirrorY = (pts) => pts.map((p) => pt(p.x, -p.y));
const reversed = (pts) => pts.slice().reverse();

// ---- B (butter) --------------------------------------------------------------------------
// The B is a spine plus two bumps that return to the spine. Bumps are half-ellipses; the arc
// angle runs -90deg (top of the bump) through 0 (outermost) to +90deg (where it meets the spine).

const HALF = Math.PI / 2;

function bumps({ upperWidth, lowerWidth, split = 50, bottom = 100, reverseOrder = false }) {
  const upper = arc(0, split / 2, upperWidth, split / 2, -HALF, HALF); // (0,0) -> (0,split)
  const lowerH = (bottom - split) / 2;
  const lower = arc(0, split + lowerH, lowerWidth, lowerH, -HALF, HALF); // (0,split) -> (0,bottom)
  // Some people go bottom bump first (up the spine side): same ink, other order.
  return reverseOrder ? join(reversed(lower), reversed(upper)) : join(upper, lower);
}

const B_SHAPES = [
  { upperWidth: 36, lowerWidth: 44 },
  { upperWidth: 45, lowerWidth: 50, split: 48 },
  { upperWidth: 30, lowerWidth: 36, split: 52 },
];

function butterTemplates() {
  const spineDown = line(pt(0, 0), pt(0, 100));
  const spineUp = line(pt(0, 100), pt(0, 0));
  const out = [];
  for (const shape of B_SHAPES) {
    // 1. Spine down, back up, then upper and lower bump (the classic one-stroke B).
    out.push(join(spineDown, spineUp, bumps(shape)));
    // 2. Start at the bottom, spine up, then the bumps from the top.
    out.push(join(spineUp, bumps(shape)));
    // 3. Spine down, then build the bumps from the bottom up (ends at the top).
    out.push(join(spineDown, bumps({ ...shape, reverseOrder: true })));
  }
  return out;
}

// ---- circle ------------------------------------------------------------------------------

function circleTemplates() {
  const out = [];
  for (const start of [-HALF, 0]) { // starting at the top, or at the right
    for (const turns of [1.0, 1.1]) { // closed exactly, or overshooting a little like a hand does
      for (const dir of [1, -1]) { // clockwise, counter-clockwise
        out.push(arc(0, 0, 50, 50, start, start + dir * turns * 2 * Math.PI));
      }
    }
  }
  return out;
}

// ---- zig-zag ------------------------------------------------------------------------------

// A lightning-style zig-zag: n segments alternating between the top and bottom of a wide box.
function lightning(n) {
  const corners = Array.from({ length: n + 1 }, (_, i) => pt((i * 100) / n, i % 2 === 0 ? 0 : 60));
  return polyline(corners);
}

// A "Z": across, diagonal back, across.
const zShape = () => polyline([pt(0, 0), pt(100, 0), pt(0, 100), pt(100, 100)]);

function zigzagTemplates() {
  const out = [];
  for (const base of [lightning(4), lightning(5), zShape()]) {
    // left-to-right and right-to-left, starting high or low
    out.push(base, mirrorX(base), mirrorY(base), mirrorX(mirrorY(base)));
  }
  return out;
}

// (The star's templates are gone: the star is found by spinning him, not drawn. Aaron, playtest 2.)

// ---- triangle (the hat; it was the loaf's sign until the loaf became a half circle) ---------

function triangleTemplates() {
  const out = [];
  // Equilateral-ish and a squat isosceles; start at each corner; both directions.
  for (const apex of [pt(50, 0), pt(40, 5)]) {
    const corners = [apex, pt(100, 87), pt(0, 87)]; // apex, bottom-right, bottom-left (clockwise)
    for (let s = 0; s < 3; s++) {
      const loop = [corners[s], corners[(s + 1) % 3], corners[(s + 2) % 3], corners[s]];
      const tri = polyline(loop);
      out.push(tri, reversed(tri));
    }
  }
  return out;
}

// ---- half circle: the loaf's dome and the cup ---------------------------------------------------
// $1 turns every stroke to a standard angle before comparing, so a dome drawn left to right and a cup drawn right to
// left are the same shape to it. Both sigils therefore share these templates ("arc"); the recognizer then looks at
// which way the stroke opens (recognize.js): open at the bottom is the dome (the loaf), open at the top is the cup.

function arcTemplates() {
  const out = [];
  for (const sweep of [Math.PI, Math.PI * 1.12]) {          // a half circle, or a little more (a hand overshoots)
    for (const ry of [50, 38, 64]) {                        // round, flatter, taller
      const dome = arc(0, 0, 50, ry, Math.PI - (sweep - Math.PI) / 2, Math.PI + sweep - (sweep - Math.PI) / 2);   // left to right over the top
      out.push(dome, reversed(dome));
    }
  }
  return out;
}

// ---- square (the box) ------------------------------------------------------------------------

function squareTemplates() {
  const out = [];
  const corners = [pt(0, 0), pt(100, 0), pt(100, 100), pt(0, 100)];
  for (let s = 0; s < 4; s++) {
    const loop = [0, 1, 2, 3, 0].map((k) => corners[(s + k) % 4]);
    const sq = polyline(loop);
    // overshoot: a hand runs a little past the corner it started from
    const [a, b] = [loop[4], loop[3]];
    const over = join(sq, line(a, pt(a.x + (a.x - b.x) * 0.1, a.y + (a.y - b.y) * 0.1)));
    out.push(sq, reversed(sq), over, mirrorX(over));
  }
  return out;
}

// ---- fork: one long handle and three uneven teeth, retracing the shallow bowl ---------------
function forkTemplates() {
  const out = [];
  for (const bowl of [40, 46]) for (const stem of [44, 52]) {
    const fork = polyline([pt(stem, 102), pt(stem, bowl), pt(8, bowl - 3), pt(6, 13),
      pt(10, bowl), pt(stem, bowl), pt(stem, 0), pt(stem + 2, bowl), pt(92, bowl + 5), pt(94, 24)]);
    out.push(fork, reversed(fork));
  }
  return out;
}

// ---- the table ------------------------------------------------------------------------------

// closed: the stroke must end within this fraction of its size from where it began; open: it must not.
// round: the circle (true) and the box (false) are told apart by recognize.js's roundness, whichever $1 preferred.
// opens: for the shared half circle, which way the open side must face.
export const SIGILS = {
  butter: { label: 'B for Butter', templates: butterTemplates() },
  circle: { label: 'The Circle', templates: circleTemplates(), closed: 0.38, round: true },
  zigzag: { label: 'The Bolt', templates: zigzagTemplates() },
  dome: { label: 'The Loaf', templates: arcTemplates(), open: 0.55, opens: 'down' },
  cup: { label: 'The Cup', templates: [], open: 0.55, opens: 'up', shares: 'dome' },
  square: { label: 'The Box', templates: squareTemplates(), closed: 0.38, round: false },
  eight: { label: 'The Eyes', templates: [], rule: true },   // a figure eight on its side: found by rule (recognize.js, isEight)
  triangle: { label: 'The Hat', templates: triangleTemplates(), closed: 0.38 },
  fork: { label: 'The Fork', templates: forkTemplates() },
};
