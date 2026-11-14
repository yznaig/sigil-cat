// The rack's arrival when it is unlocked (e1111-37): it falls from above the top of the page, lands on its foot with a
// wooden thud and bounces three times, each lower, into its place. Reloads never replay it.
// Scripted, not simulated: the rack is fixed furniture, so its body, pegs, reservation and saved place stay at rest the
// whole time and only its cached picture card moves (along the camera's up, so the drop is straight down the page).
// One drawn picture, moved; the rack is not re-lit per frame. Reduced motion: a short fade-in where it stands.
// Playtest-3 (e1113-07, layout lane): the controller stand and the egg cup arrive the same way. `root`: the piece's
// fixed root (default the rack's); `id`: its name for its impact sound and its soft floor shadow (default 'rack').
export const RACK_DROP = {
  fall: .5,                        // seconds from above the page to the first touch
  bounces: [.15, .055, .018],      // each rebound's height, as a share of the rack's height on the page
  thuds: [1, .55, .32, .16],       // the impact's strength at each touch (the last is the settle)
  squash: .085,                    // how much the first landing squashes it (scaled by each thud)
  wobble: .03,                     // radians of rock about its foot after a landing (scaled by each thud)
  fade: .35,                       // reduced motion: seconds to fade in
};
export function createRackDrop(site, picture, {ui, onImpact, settle, root = null, id = 'rack'} = {}) {
  const {THREE: T, stage, audio} = site, C = RACK_DROP;
  const up = new T.Vector3(), base = new T.Vector3(), roll = new T.Quaternion(), forward = new T.Vector3();
  let plan = null, now = 0, offset = 0, sx = 1, sy = 1, tilt = 0, opacity = 1, pending = false, finished = null;
  const stats = {mode: null, impacts: [], samples: [], duration: 0, done: false};
  const shadowQuad = () => site.worldLayout.shadows.get(id)?.group.children.find((o) => o.material?.isMeshBasicMaterial);
  // Heights in page pixels, times in seconds, one constant gravity so every arc agrees with the fall.
  function makePlan() {
    const r = picture.rect, drop = Math.max(r.y + r.h + 24, 200), g = 2 * drop / C.fall ** 2, arcs = [];
    let t = C.fall;
    for (const share of C.bounces) {
      const h = Math.max(2.5, share * r.h), v = Math.sqrt(2 * g * h), d = 2 * v / g;
      arcs.push({start: t, v, d, h}); t += d;
    }
    return {drop, g, arcs, end: t, touches: [C.fall, ...arcs.map((a) => a.start + a.d)]};
  }
  function heightAt(t) {
    const p = plan; if (t < C.fall) return p.drop - .5 * p.g * t * t;
    for (const a of p.arcs) if (t < a.start + a.d) { const u = t - a.start; return Math.max(0, a.v * u - .5 * p.g * u * u); }
    return 0;
  }
  // The squash and rock after the latest touch, settling within about a fifth of a second.
  function afterTouch(t) {
    let last = -1; for (let i = 0; i < plan.touches.length; i++) if (t >= plan.touches[i]) last = i;
    if (last < 0) { const v = plan.g * t; return {sx: 1 - .03 * v / (plan.g * C.fall), sy: 1 + .05 * v / (plan.g * C.fall), tilt: 0}; }   // stretched by speed in the fall
    const k = C.thuds[last], u = t - plan.touches[last], q = C.squash * k * Math.exp(-u * 18) * Math.cos(u * 34);
    return {sx: 1 + q * .55, sy: 1 - q, tilt: C.wobble * k * Math.exp(-u * 7) * Math.sin(u * 19) * (last % 2 ? -1 : 1)};
  }
  // Called after every draw of the rack's picture (which puts the card back at rest), and on every frame of the drop.
  function apply() {
    if (!plan && !pending) return;
    const card = picture.card, plane = card.children[0];
    base.setFromMatrixPosition((root || site.rack?.root || card).matrixWorld);
    const ppu = stage.pxPerUnit(base);
    up.set(0, 1, 0).applyQuaternion(stage.camera.quaternion);
    forward.set(0, 0, 1).applyQuaternion(stage.camera.quaternion);
    card.position.copy(base).addScaledVector(up, (pending ? 4000 : offset) / ppu);
    card.quaternion.copy(stage.camera.quaternion).premultiply(roll.setFromAxisAngle(forward, tilt));
    card.scale.set(sx, sy, 1);
    plane.material.opacity = pending ? 0 : opacity;
    const s = shadowQuad();
    if (s) s.material.opacity = .24 * (pending ? 0 : opacity * Math.max(0, 1 - offset / (plan?.drop || 1)) ** 1.6);
    picture.invalidateCard?.();
  }
  function frame(dt) {
    now += dt; const t = Math.min(now, stats.duration);
    if (stats.mode === 'fade') { opacity = Math.min(1, t / C.fade); }
    else {
      offset = heightAt(t); ({sx, sy, tilt} = afterTouch(t));
      for (let i = stats.impacts.length; i < plan.touches.length && t >= plan.touches[i]; i++) {
        const voice = audio.impact(id, {material: 'wood', size: 'medium', strength: C.thuds[i]});
        stats.impacts.push({t: plan.touches[i], strength: C.thuds[i], sound: voice?.soundName || null});
        onImpact?.(i, C.thuds[i]);
      }
    }
    stats.samples.push({t, offset, sx, sy, tilt, opacity});
    if (ui) ui.style.opacity = String(stats.mode === 'fade' ? opacity : Math.max(0, Math.min(1, (t - plan.end + .25) / .25)));
    apply();
    if (now >= stats.duration) finish();
  }
  function finish() {
    const i = stage.onFrame.indexOf(frame); if (i >= 0) stage.onFrame.splice(i, 1);
    offset = 0; sx = sy = 1; tilt = 0; opacity = 1; apply(); plan = null;
    picture.card.scale.set(1, 1, 1); if (ui) ui.style.opacity = '';
    stats.done = true; picture.draw(true); finished?.();
  }
  return {
    stats, apply,
    // Before the first frame anyone sees: keep it above the page until the hats have been hung on it.
    hold() { pending = true; if (ui) ui.style.opacity = '0'; apply(); },
    start() {
      pending = false; now = 0; stats.mode = stage.reducedMotion ? 'fade' : 'drop';
      settle?.();                    // draw it at rest with every hat hung (and sync its hit box with it), then plan from those bounds
      audio.loadImpacts('wood');
      plan = makePlan(); stats.duration = stats.mode === 'fade' ? C.fade : plan.end; stats.plan = {drop: plan.drop, g: plan.g, touches: plan.touches, heights: plan.arcs.map((a) => a.h)};
      if (stats.mode === 'fade') { offset = 0; opacity = 0; }
      else { offset = plan.drop; opacity = 1; }
      apply();
      // The pose drawn at start, before the first frame's dt moves it (that first dt can be long while the page loads).
      stats.samples.push({t: 0, offset, sx, sy, tilt, opacity});
      stage.onFrame.push(frame);
      return new Promise((r) => { finished = r; });
    },
    get active() { return !!plan || pending; },
  };
}
