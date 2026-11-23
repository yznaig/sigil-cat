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

// ---- his own sign: the cat-head outline (the Journey's tenth sign, docs/journey/design.md §5.2) ----------------
// The head mark on every bonk seal (HEAD in src/achievements.js) as one open stroke: up his left side, over the left
// ear, along the dip between the ears, over the right ear, down his right side. No bottom: the stroke stays open.
// Not a find (src/finds.js has no row for it): src/journey/lastpage.js casts it to end the game.
function catheadPath({ ear = 0, dip = 21, inner = 36, bulge = 6, side = 36 } = {}) {
  // the sides bow out a little, like his cheeks: left from (0,100) up to (0,side), right from (100,side) down
  const left = arc(0, (100 + side) / 2, bulge, (100 - side) / 2, HALF, Math.PI * 1.5);
  const right = arc(100, (100 + side) / 2, bulge, (100 - side) / 2, -HALF, HALF);
  return join(left, polyline([pt(0, side), pt(6, ear), pt(inner, dip), pt(100 - inner, dip), pt(94, ear), pt(100, side)]), right);
}
// $1 alone takes some tall M-shaped bolts for it. What an M lacks: his two sides run the opposite way to each other
// and nearly parallel (up his left cheek, down his right), whatever the tilt or stretch. The first and last fifth of
// the stroke, as chords, must point within ~25 degrees of opposite, and stay apart.
function catheadAccept(pts) {
  let total = 0;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  if (!total) return false;
  const at = (s) => pts[Math.max(0, cum.findIndex((c) => c >= s))];
  const a0 = pts[0], a1 = at(total * 0.2), b0 = at(total * 0.8), b1 = pts[pts.length - 1];
  const ux = a1.x - a0.x, uy = a1.y - a0.y, vx = b1.x - b0.x, vy = b1.y - b0.y;
  const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1);
  // and they stay as far apart as the stroke's ends (an M's legs lean in toward its middle)
  const gap = Math.hypot(b0.x - a1.x, b0.y - a1.y) / (Math.hypot(b1.x - a0.x, b1.y - a0.y) || 1);
  // and it is a head, not a bowl: the middle of the stroke (the dip between the ears) is above its open ends, within
  // 50 degrees of straight up the screen ($1 cannot tell up from down; a U is not his sign)
  const m = at(total * 0.5), up = (a0.y + b1.y) / 2 - m.y, aside = Math.abs(m.x - (a0.x + b1.x) / 2);
  return cos < -Math.cos(Math.PI / 7) && gap > 0.8 && up > 0 && aside < up * Math.tan((50 * Math.PI) / 180);
}
function catheadTemplates() {
  const out = [];
  for (const shape of [{}, { bulge: 0.01, side: 40 }, { ear: -8, dip: 24, inner: 32 }, { side: 30, dip: 16, inner: 40, bulge: 9 }]) {
    const head = catheadPath(shape);
    out.push(head, reversed(head));     // from his left (the dot), or a hand that starts on the other side
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
  cathead: { label: 'His Sign', templates: catheadTemplates(), accept: catheadAccept },
};
