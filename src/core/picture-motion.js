// Pictures of moving bodies (physics lane, e1111-58 cost gates; speed lane, playtest-2). A tumbling or carried body's
// cached picture is redrawn every frame it moves, so its cost grows with the window: the same item covers four times
// the pixels in a 4K window as in a 1080p one, and on a weak graphics chip (Windows Chrome on Aaron's PC draws on the
// AMD chip) that is what made a big window stutter (docs/REVIEW.md, speed lane). So a moving picture is drawn to a
// pixel budget: at most sqrt(MOTION.budget / window area) picture pixels per page pixel, never more than the screen
// has and never less than MOTION.floor of it, and stretched on screen. A small window keeps full sharpness. At rest
// (asleep, supported, fixed, or no longer moving: `still`) it is drawn exactly again, once.
// For a splat prop, only the share MOTION.splats of its Gaussians may be drawn while it moves (default 1: all).
// ?motion= (picture px per page px), ?mbudget= (megapixels) and ?lod= try others.
const query = new URLSearchParams(typeof location === 'object' ? location.search : '');
const knob = (k) => { const v = Number(query.get(k)); return Number.isFinite(v) && v > 0 ? v : null; };
export const MOTION = { pxPerCss: knob('motion') ?? Infinity, splats: Math.min(1, knob('lod') ?? 1), budget: (knob('mbudget') ?? 1.5) * 1e6, floor: 0.5 };
// picture pixels per page pixel for something moving, in this window
export function motionScale(stage) {
  const k = Math.sqrt(MOTION.budget / Math.max(1, stage.width * stage.height));
  return Math.min(stage.dpr, MOTION.pxPerCss, Math.max(MOTION.floor * stage.dpr, k));
}
export function pictureScale(stage, precise) { return precise ? stage.dpr : motionScale(stage); }
export function splatShare(stage, precise) { return precise ? 1 : MOTION.splats; }
// A body can sit visibly still for a moment before the physics puts it to sleep (Rapier waits about 2 s). still(a, b):
// two world matrices differ by less than 1e-3 in every element (a thousandth of a unit, about a pixel; a twentieth of
// a degree). A picture whose body has stayed still for MOTION.stillMs is drawn sharp at once, not when it falls
// asleep. (Time, not one frame: on a fast screen some frames have no physics step, and those must not count.)
MOTION.stillMs = 150;
export function still(a, b) {
  const x = a.elements, y = b.elements;
  for (let i = 0; i < 16; i++) if (Math.abs(x[i] - y[i]) > 1e-3) return false;
  return true;
}
