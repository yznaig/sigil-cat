// The spinning top's spin (e1111-58): "it should spin a bit longer ... +4 seconds, and should also spin when you do
// the circle sigil, and it shouldnt just teleport upright, it should smoothly move to the spinning position".
// Rapier has no gyroscopic stiffness, so a freely simulated top fell over in about 0.7 s. The spin is therefore
// authored, the way the charged top's rotor is, but on a kinematic body so it still shoves whatever it meets:
//  1. righting: from however it lies, it swings up about its tip (which stays on the surface), spinning up as it
//     rises and overshooting upright a little before it settles (a springy, physical-looking turn, never a jump);
//  2. spinning: a slowly decaying spin with a small lean that precesses round and opens out as it slows;
//  3. falling: physics takes over with the spin and a tip in the lean's direction, so it topples, rolls and rests.
// Nothing runs at rest: the world's own step calls this only while the top is awake.
export const TOP_SPIN = {
  seconds: 4.4,            // spinning upright (was ~0.7 s of free spin before it toppled; +4 s per e1111-58)
  omega: [30, 9],          // spin speed at the start and end of it, rad/s
  lean: [.035, .2],        // lean from upright as it starts and just before it falls, radians
  precess: [2.2, 5.5],     // how fast the lean wanders round, rad/s
  rise: [.42, .7],         // seconds to right itself from a slight tilt / from lying flat
  tip: 2.6,                // rad/s it is tipping over when physics takes it back
};
export function createTopSpin(site) {
  const { world, stage, THREE: T } = site, S = TOP_SPIN, Y = new T.Vector3(0, 1, 0);
  let run = null;
  const stats = { spins: 0, steps: 0 };
  const smooth = (u) => u * u * (3 - 2 * u);
  // swing-twist: q = swing * twist, twist about the top's own axis
  function decompose(q) {
    const twist = new T.Quaternion(0, q.y, 0, q.w).normalize(), swing = q.clone().multiply(twist.clone().invert());
    const up = Y.clone().applyQuaternion(q);
    return { swing, theta: 2 * Math.atan2(twist.y, twist.w), lean: Math.acos(Math.min(1, Math.max(-1, up.y))), dir: Math.atan2(up.z, up.x) };
  }
  const leanQ = (lean, dir, out = new T.Quaternion()) => out.setFromAxisAngle(new T.Vector3(Math.sin(dir), 0, -Math.cos(dir)), lean);
  function spin(inst) {
    const e = inst?.worldEntry;
    if (!e || !inst.worldReady || inst.state.charged || world.held?.entry === e || run?.inst === inst || stage.reducedMotion) return false;
    if (e.support) site.supports.detach(e, { wake: false });
    world.cancelReturn(e);
    const b = e.body, q0 = new T.Quaternion().copy(b.rotation()), p0 = new T.Vector3().copy(b.translation());
    const vs = inst.colliderVertices, tipLocal = vs.reduce((a, v) => (v.y < a.y ? v : a), vs[0]).clone();
    const surface = Math.min(...vs.map((v) => v.clone().applyQuaternion(q0).add(p0).y));
    const tip = tipLocal.clone().applyQuaternion(q0).add(p0); tip.y = surface + .001;
    const d = decompose(q0);
    run = { inst, e, b, t: 0, tip, tipLocal, theta: d.theta, lean0: d.lean, dir0: d.dir, phi: d.dir + Math.PI, omega: 0,
      rise: S.rise[0] + (S.rise[1] - S.rise[0]) * Math.min(1, d.lean / (Math.PI / 2)), grabbed: e.grabbed, q: new T.Quaternion(), p: new T.Vector3() };
    b.setBodyType(world.rapier.RigidBodyType.KinematicPositionBased, true);
    e.beforeStep = step; e.grabbed = () => { const g = run?.grabbed; stop(false); g?.(); };
    inst.elapsed = 0; stats.spins++; world.wake(e);
    return true;
  }
  function pose(r) {
    const t = r.t, q = r.q;
    let lean, dir;
    if (t < r.rise) {
      // About the tip, from its resting lean to upright, a little past it, and back: a critically-damped-ish swing.
      const u = t / r.rise, k = smooth(Math.min(1, u * 1.15)), wob = Math.sin(u * Math.PI * 1.6) * Math.exp(-u * 3) * .16 * (1 - u);
      lean = r.lean0 * (1 - k) - r.lean0 * wob + S.lean[0] * smooth(u); dir = r.dir0;
      r.omega = S.omega[0] * smooth(Math.min(1, u * 1.4));
      r.phi = dir;
    } else {
      const u = Math.min(1, (t - r.rise) / S.seconds);
      r.omega = S.omega[0] + (S.omega[1] - S.omega[0]) * Math.pow(u, 1.3);
      r.phi += (S.precess[0] + (S.precess[1] - S.precess[0]) * u * u) * r.dt;
      lean = S.lean[0] + (S.lean[1] - S.lean[0]) * u * u; dir = r.phi;
    }
    r.theta += r.omega * r.dt;
    leanQ(lean, dir, q).multiply(new T.Quaternion().setFromAxisAngle(Y, r.theta));
    r.p.copy(r.tip).sub(r.tipLocal.clone().applyQuaternion(q));
    r.lean = lean; r.dir = dir;
  }
  function step(dt, e) {
    const r = run; if (!r || r.e !== e) { e.beforeStep = null; return; }
    r.dt = dt; r.t += dt; stats.steps++;
    pose(r);
    r.b.setNextKinematicRotation(r.q); r.b.setNextKinematicTranslation(r.p);
    if (r.t >= r.rise + S.seconds) stop(true);
  }
  // fall: hand it back to physics with its spin and a tip in the direction it leans
  function stop(fall) {
    const r = run; if (!r) return; run = null;
    const { e, b, inst } = r;
    e.beforeStep = null; e.grabbed = r.grabbed;
    b.setBodyType(world.rapier.RigidBodyType.Dynamic, true);
    b.setRotation(r.q, true); b.setTranslation(r.p, true); b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    if (fall) {
      const axis = Y.clone().applyQuaternion(r.q).multiplyScalar(r.omega), tipAxis = new T.Vector3(Math.sin(r.dir), 0, -Math.cos(r.dir)).multiplyScalar(S.tip);
      b.setAngvel(axis.add(tipAxis), true);
    } else b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    world.wake(e); inst.elapsed = 0;
  }
  return { spin, stop: () => stop(false), stats, config: S, get spinning() { return run?.inst ?? null; }, get phase() { return !run ? 'rest' : run.t < run.rise ? 'righting' : 'spinning'; } };
}
