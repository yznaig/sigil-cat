// The space the cat takes (e1111-58, note 2): a kinematic body of three overlapping convex hulls, fitted once per pose
// to that pose's own solid splats (feet and tail, body, head and ears), turning with him. Items bump off it; it never
// pushes him (he is a picture, not a body). It is updated only from world.step, so a sleeping world does no work for
// him, and only when his pose or turn has changed. While he is away (hidden, stood in for, flying off) it is disabled.
export const CAT_BODY = {
  alpha: 150,                 // a splat at least this opaque (of 255) is his body; the fuzz around him is not
  trim: .01,                  // drop this share of points at each end of every axis (stray Gaussians)
  bands: [[0, .42], [.3, .78], [.66, 1]],   // overlapping height bands, as fractions of his height
  points: 1200,               // at most this many points per band go to the hull
  friction: .4, restitution: .2,
};
export function createCatBody(site, world) {
  const { THREE: T, stage } = site, R = world.rapier, physics = world.physics, fits = new Map();
  const stats = { fits: 0, rebuilds: 0, turns: 0 };
  let body = null, pose = null, yaw = null, enabled = false;
  const suspended = new Set();
  function fit(name) {
    if (fits.has(name)) return fits.get(name);
    const splat = site.cat.poses?.[name]?.mesh?.splat; if (!splat) return null;
    const { center: c, tColor: rgba, count: n } = splat, keep = [], stride = Math.max(1, Math.floor(n / 16000));
    for (let i = 0; i < n; i += stride) if (rgba[i * 4 + 3] >= CAT_BODY.alpha) keep.push(i);
    if (keep.length < 64) return null;
    const lo = [], hi = [];
    for (let k = 0; k < 3; k++) {
      const v = keep.map(i => c[i * 3 + k]).sort((a, b) => a - b);
      lo[k] = v[Math.floor(v.length * CAT_BODY.trim)]; hi[k] = v[Math.ceil(v.length * (1 - CAT_BODY.trim)) - 1];
    }
    const inside = keep.filter(i => [0, 1, 2].every(k => c[i * 3 + k] >= lo[k] && c[i * 3 + k] <= hi[k]));
    const hulls = [], height = hi[1] - lo[1];
    for (const [a, b] of CAT_BODY.bands) {
      const y0 = lo[1] + a * height, y1 = lo[1] + b * height, band = inside.filter(i => c[i * 3 + 1] >= y0 && c[i * 3 + 1] <= y1);
      if (band.length < 16) continue;
      const step = Math.max(1, Math.floor(band.length / CAT_BODY.points)), points = [];
      for (let j = 0; j < band.length; j += step) { const i = band[j]; points.push(c[i * 3], c[i * 3 + 1], c[i * 3 + 2]); }
      hulls.push(new Float32Array(points));
    }
    stats.fits++; fits.set(name, hulls); return hulls;
  }
  function rebuild(name) {
    const hulls = fit(name); if (!hulls) return false;
    body ??= physics.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, site.cat.spin.position.y, 0));
    body.userData = 'cat';
    while (body.numColliders()) physics.removeCollider(body.collider(0), false);
    for (const points of hulls) {
      const desc = R.ColliderDesc.convexHull(points); if (!desc) continue;
      physics.createCollider(desc.setFriction(CAT_BODY.friction).setRestitution(CAT_BODY.restitution).setContactSkin(.002), body);
    }
    pose = name; stats.rebuilds++; return true;
  }
  const q = new T.Quaternion(), up = new T.Vector3(0, 1, 0);
  function present() {
    const cat = site.cat, fx = cat.fx;
    return !suspended.size && cat.loaded && !cat.hidden && !cat.standIn && fx.opacity > .5 && Math.abs(fx.x) < .05 && Math.abs(fx.y) < .05 && Math.abs(fx.scale - 1) < .2;
  }
  // query: called for picking outside a step. A sleeping world gets the current pose at once (no sweep).
  function update(query = false) {
    const cat = site.cat; if (!cat) return;
    const on = present();
    if (on && cat.shown !== pose && !rebuild(cat.shown)) return;
    if (!body) return;
    if (on !== enabled) {
      // A disabled kinematic body's colliders still held dropped bodies up in this Rapier build (the 100-drop
      // fixtures came to rest on him at y≈.36 while he was suspended). Out of the world means out of the room too.
      body.setEnabled(on); enabled = on;
      body.setTranslation(on ? { x: 0, y: site.cat.spin.position.y, z: 0 } : { x: 0, y: -50, z: 0 }, false);
      physics.propagateModifiedBodyPositionsToColliders();
      if (on) yaw = null;
    }
    if (!on) return;
    const jump = yaw === null || query && !world.stats.listening;
    const y = cat.spin.rotation.y;
    if (yaw !== null && Math.abs(y - yaw) < 1e-3) return;
    q.setFromAxisAngle(up, y);
    // A turn while the world sleeps is a jump to the new angle; a turn while it steps sweeps, pushing what it meets.
    if (jump) { body.setRotation(q, false); physics.propagateModifiedBodyPositionsToColliders(); } else body.setNextKinematicRotation(q);
    yaw = y; stats.turns++;
  }
  // suspend(reason, on): take him out of the physical world for a while (an isolated physics fixture dropping bodies
  // where he floats). Takes effect at the next step or query.
  function suspend(reason, on) { on ? suspended.add(reason) : suspended.delete(reason); update(true); }
  return { update, fit, suspend, stats, get body() { return body; }, get pose() { return pose; }, get enabled() { return enabled; } };
}
