// Butterman ("Buttaman"): a rubber-hose tube man in the cat's felt (docs/ideas/butterman.md; e1107-35, e1107-39,
// e1107-40; look, size and jump e1108-10). Each B sigil plays the next of his scenes (e1108-03): he struts on and
// butters the cat; he walks in, goes once round the cat, stands in the open and is gone on the song's last instant
// (Aaron, 2026-11-09); he rises up close to the lens and yells. Which scene is next is remembered on the device.
// A fourth scene, the encore, is not in that round: the whisker harp's tune plays it, once ever (src/gags/harp.js ->
// encore()): he walks to the middle, throws his arms up, the ticket falls from the sky behind him, and he walks off.
// Everything is timed from ./butterman-config.js. Motion is a pure function of the gag's beat, so it can be frozen
// (#b=12.5&bmscene=loop) and measured by the checks, and retimed by changing a bpm.
//   - a tempo map: each scene runs at its own bpm (Aaron's takes differ), and its beat grid bends to follow his singing
//   - the body: no sticks or joints. Hidden joints carry a skin of bent tubes laid over them every frame, so limbs
//     bend in arcs (Aaron's sheet)
//   - the cat sits still and turns for the butter scene, and keeps the butter
//   - the butter whisper: his whispered song loops silently while the butter is on, and can only be heard with the
//     pointer very near the butter (spec 3.5)
import { BUTTERMAN } from './butterman-config.js';
import { makeFeltMaterial } from '../core/felt.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clamp01 = (u) => clamp(u, 0, 1);
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
const frac = (x) => x - Math.floor(x);
const lerpAngle = (a, b, u) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;
const noise = (t, seed) => Math.sin(t * 26.1 + seed) * 0.6 + Math.sin(t * 45.7 + seed * 2.3) * 0.4;   // deterministic tremble
const r3 = (x) => +x.toFixed(3);
export const EASE = {
  linear: (u) => u,
  sineIn: (u) => 1 - Math.cos(u * Math.PI / 2),
  sineOut: (u) => Math.sin(u * Math.PI / 2),
  sineInOut: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  quadIn: (u) => u * u,
  quadOut: (u) => 1 - (1 - u) ** 2,
  quadInOut: (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  cubicOut: (u) => 1 - (1 - u) ** 3,
  backOut: (u) => 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2,
  elasticOut: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 2 ** (-10 * u) * Math.sin((u * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
};
const ease = (name, u) => (EASE[name] || EASE.linear)(clamp01(u));

export default function createButterman(site) {
  const { stage, cat, audio, ui } = site;
  const THREE = site.THREE, C = BUTTERMAN, scene = stage.scene, camera = stage.camera;
  const params = stage.params;
  // what this file asks of the cat, under the names its choreography has always used
  const world = {
    get catHeight() { return cat.height; }, get loaded() { return cat.loaded; }, get reducedMotion() { return stage.reducedMotion; },
    get auto() { return cat.auto; }, set auto(v) { cat.auto = v; }, get yaw() { return cat.yaw; }, get butterOn() { return cat.butterOn; },
    request: (p) => cat.request(p), playEmote: (n, why) => cat.playEmote(n, why), setYawTarget: (t, speed) => cat.setYawTarget(t, speed),
    setButter: (on, mode) => cat.setButter(on, mode),
  };
  let bpmOverride = params.has('bpm') ? Number(params.get('bpm')) : null;
  const reducedMotion = () => params.get('rm') === '1' || world.reducedMotion;
  const UP = new THREE.Vector3(0, 1, 0);
  const GROUND = 0;
  const store = {      // the page's saved state, read the way this file always has ('1' or null)
    get(k) { const v = site.store.get(k); return v == null || v === false ? null : String(v === true ? 1 : v); },
    set(k, v) { site.store.set(k, v); },
  };
  // One scene per summon, in config order; the next one is remembered per device (C.sequence).
  const ALL = C.scenes.map((sc) => sc.id), ORDER = C.scenes.filter((sc) => !sc.secret).map((sc) => sc.id), SEQ = C.sequence;   // ORDER: the round the B walks through
  // The round's scenes this device has watched to the end (C.sequence.seenKey). Once all of them have been, every B
  // plays the first (the butter) scene (playtest-3).
  const seenList = () => { const v = site.store.get(SEQ.seenKey); return Array.isArray(v) ? v.filter((id) => ORDER.includes(id)) : []; };
  const roundSeen = () => ORDER.every((id) => seenList().includes(id));
  const nextIndex = () => { if (roundSeen()) return 0; const n = Number(store.get(SEQ.storageKey)); return Number.isInteger(n) && n >= 0 && n < ORDER.length ? n : 0; };
  const sceneId = (v) => (typeof v === 'number' ? ORDER[v] : ALL.includes(v) ? v : ORDER[nextIndex()]);
  // The encore plays once ever (C.encore): from the moment its ticket is let go it never plays again.
  const ENC = C.encore;
  const encoreDone = () => !!store.get(ENC.droppedKey) || !!store.get(ENC.seenKey);
  if (store.get(ENC.droppedKey) && !store.get(ENC.seenKey)) store.set(ENC.seenKey, true);   // closed during its walk off

  // -------------------------------------------------------------------------
  // The rig: invisible joints (the prototype's, in figure units, about 2.2 tall; faces local +X).
  // -------------------------------------------------------------------------
  // Proportions from Aaron's sheet (e1108-10): legs about a third of his height, a ball head a third, the body between.
  const F = C.figure;
  const L_THIGH = 0.35, L_SHIN = 0.35, L_UPPER = 0.31, L_FORE = 0.29, GRIP = 0.1, SHOULDER_Y = 0.62, FIG_H = 2.2;
  const ANKLE = F.leg;                                              // the leg's rounded end rests on the ground
  const PELVIS_Y = ANKLE + 0.04 + (L_THIGH + L_SHIN) * F.hose.legSlack;   // standing, legs straight (the sheet's posts)
  const node = (name, parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };
  const fig = new THREE.Group(); fig.name = 'butterman'; fig.visible = false; scene.add(fig);
  const pelvis = node('pelvis', fig, 0, PELVIS_Y, 0);
  const seatN = node('seat', pelvis, 0, -0.19, 0);                  // the bottom of his body, where the legs split
  const spine = node('spine', pelvis);
  const chest = node('chest', spine, 0, 0.36, 0);
  const armRoot = node('armroot', spine, 0, SHOULDER_Y - 0.04, 0);   // the arms grow from inside the shoulders
  const neck = node('neck', spine, 0, 0.74, 0);
  const fhead = node('fhead', neck, 0, 0.1, 0);
  const ARMS = [1, -1].map((side) => {
    const sh = node('shoulder', spine, 0, SHOULDER_Y, side * 0.25);
    const el = node('elbow', sh, 0, -L_UPPER, 0);
    const wr = node('wrist', el, 0, -L_FORE, 0);
    const grip = node('grip', wr, 0, -GRIP * 0.5, 0);
    return { side, sh, el, wr, grip };
  });
  const LEGS = [1, -1].map((side) => {
    const hip = node('hip', pelvis, 0, -0.02, side * (F.leg + F.legGap / 2));
    const knee = node('knee', hip, 0, -L_THIGH, 0);
    const ankle = node('ankle', knee, 0, -L_SHIN, 0);
    return { side, hip, knee, ankle };
  });

  // -------------------------------------------------------------------------
  // The skin: smooth tubes along quadratic curves, rebuilt in place every frame. Same felt as the cat.
  // -------------------------------------------------------------------------
  // Coarser triplanar fibre detail makes him feel near the glass. This is local
  // to Butterman: the shared felt material and the cat's own surface are untouched.
  const felt = makeFeltMaterial(stage.renderer, { grain: { value: F.grain } });
  // Drawn in the transparent pass (still fully opaque, still writing depth) so his draw order can sit between the
  // keepsakes' pictures, which draw without a depth test: see depthOrder() below (playtest-2: items behind him were
  // drawn over him in the rise).
  felt.transparent = true;
  class Tube {
    constructor(seg = 22, rad = 14) {
      this.seg = seg; this.rad = rad;
      const n = (seg + 1) * (rad + 1);
      const g = new THREE.BufferGeometry();
      this.pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
      this.nrm = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', this.pos); g.setAttribute('normal', this.nrm);
      const idx = [];
      for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
        const a = i * (rad + 1) + j, b = a + rad + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);   // counter-clockwise from outside
      }
      g.setIndex(idx);
      this.mesh = new THREE.Mesh(g, felt);
      this.mesh.frustumCulled = false;
      this.N = new THREE.Vector3(); this.T = new THREE.Vector3(); this.B = new THREE.Vector3();
      this.p = new THREE.Vector3(); this.n = new THREE.Vector3();
    }
    // a -> c, bent toward control point b; r(t) gives the radius along it (t = 0..1); flat < 1 squeezes the
    // cross-section front to back (an oval body)
    set(a, b, c, r, flat = 1) {
      this.q1 = (this.q1 || new THREE.Vector3()).copy(a).lerp(b, 2 / 3);
      this.q2 = (this.q2 || new THREE.Vector3()).copy(c).lerp(b, 2 / 3);
      this.set4(a, this.q1, this.q2, c, r, flat);
    }
    // a -> d along a cubic curve with control points b, c (the hose limbs: arcs, swoops and S-waves)
    set4(a, b, c, d, r, flat = 1) {
      const { seg, rad, N, T, B, p, n } = this;
      if (!this.ctrl) this.ctrl = [0, 1, 2, 3].map(() => new THREE.Vector3());
      [a, b, c, d].forEach((v, i) => this.ctrl[i].copy(v)); this.r = r;   // kept for the leg check (legScan)
      for (let i = 0; i <= seg; i++) {
        const t = i / seg, u = 1 - t;
        p.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t);
        T.set(0, 0, 0).addScaledVector(a, -3 * u * u).addScaledVector(b, 3 * u * u - 6 * u * t).addScaledVector(c, 6 * u * t - 3 * t * t).addScaledVector(d, 3 * t * t);
        if (T.lengthSq() < 1e-12) T.subVectors(d, a);
        T.normalize();
        if (i === 0) { N.set(T.y, -T.x, 0); if (N.lengthSq() < 1e-6) N.set(0, T.z, -T.y); N.normalize(); }
        N.addScaledVector(T, -N.dot(T)).normalize();               // parallel transport: no twisting along the tube
        B.crossVectors(T, N);
        const rr = r(t);
        for (let j = 0; j <= rad; j++) {
          const ang = (j / rad) * TAU, k = i * (rad + 1) + j, cs = Math.cos(ang), sn = Math.sin(ang);
          n.copy(N).multiplyScalar(cs * flat).addScaledVector(B, sn);
          this.pos.setXYZ(k, p.x + n.x * rr, p.y + n.y * rr, p.z + n.z * rr);
          n.copy(N).multiplyScalar(cs / flat).addScaledVector(B, sn).normalize();   // the oval's normal
          this.nrm.setXYZ(k, n.x, n.y, n.z);
        }
      }
      this.pos.needsUpdate = true; this.nrm.needsUpdate = true;
    }
  }
  // a point on a tube's centre curve (t = 0..1)
  function curveAt(tube, t, out) {
    const [a, b, c, d] = tube.ctrl, u = 1 - t;
    return out.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t);
  }
  const ball = (r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), felt); m.scale.setScalar(r); m.frustumCulled = false; return m; };
  // Body, limbs and head (Aaron's sheet): an oval body with a rounded bottom and domed shoulders, arm and leg tubes of
  // one even radius whose ends are balls of that same radius (rounded ends, no hands or feet), a ball head.
  const torso = new Tube(22, 20), arms = [new Tube(), new Tube()], legs = [new Tube(16, 14), new Tube(16, 14)];
  const hands = [ball(F.arm), ball(F.arm)], feet = [ball(F.leg), ball(F.leg)], roots = [ball(F.arm), ball(F.arm)];
  feet.forEach((m) => m.scale.x *= F.legDepth);                     // the leg's oval end
  const headBall = ball(F.head); headBall.position.set(0.01, 0.17, 0); fhead.add(headBall);
  fig.add(torso.mesh, ...arms.map((a) => a.mesh), ...legs.map((l) => l.mesh), ...hands, ...feet, ...roots);
  const CAP_LO = 0.14, CAP_HI = 0.34, LEG_TOP = 0.12;                               // the rounded bottom and the shoulder dome (of its length)
  const profile = (t) => {                                          // widest low, a little narrower at the shoulders
    const b = F.body, w = lerp(b.width, b.shoulders, smooth((t - 0.35) / 0.4));
    const cap = t < CAP_LO ? Math.sqrt(1 - (1 - t / CAP_LO) ** 2) : t > 1 - CAP_HI ? Math.sqrt(Math.max(0, 1 - ((t - 1 + CAP_HI) / CAP_HI) ** 2)) : 1;
    return Math.max(0.004, w * cap);
  };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
  const local = (obj, out) => fig.worldToLocal(obj.getWorldPosition(out));

  // The butter in his hand: the cat's own butter shape, so the hand-off is seamless.
  let figButter = null;
  // his own copy of the butter's material, drawn in the transparent pass with him (depthOrder)
  const makeFigButter = () => { const m = cat.butterMaterial.clone(); m.transparent = true; const b = new THREE.Mesh(cat.butterGeometry, m); b.renderOrder = depthOrderNow ?? 0; return b; };
  // His contact shadow
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.9)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const figShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.16, color: 0 }));
  figShadow.rotation.x = -Math.PI / 2; figShadow.renderOrder = -1; figShadow.visible = false; scene.add(figShadow);
  // Warm-up (world.warm): his felt, his shadow and the butter he carries, each drawn once ahead (one per idle moment,
  // so each pause is short) and his first play doesn't freeze
  stage.warm(async function buttermanLight() { await Promise.all([stage.ensureEnv(), cat.ensureButter()]); });
  stage.warm(fig); stage.warm(figShadow);
  stage.warm(function handButter() { if (!cat.butterGeometry) return; figButter = makeFigButter(); figButter.visible = false; scene.add(figButter); stage.warmDraw([figButter]); });

  const figScale = () => F.height * world.catHeight / FIG_H;          // world units per figure unit

  // -------------------------------------------------------------------------
  // Poses (from the prototype): pelvis height, lean, roll, head tilt; per leg a foot target relative to the hip
  // (figure units) + toe angle + spread; per arm shoulder/elbow/wrist angles + spread + shrug.
  // -------------------------------------------------------------------------
  const leg = (x, y, toe = 0, abd = 0.03) => ({ x, y, toe, abd });
  const arm = (sh, el, wr = 0, abd = 0.1, shrug = 0) => ({ sh, el, wr, abd, shrug });
  // At half size the butter is as wide as he is tall (e1108-10), so he carries it high over his head where his head
  // still shows (a tray at the shoulder hid it); the hand-up then pumps it up to full stretch.
  const CARRY = (bob = 0, shrug = 0) => arm(2.62 + bob, 0.32, 0, 0.42, shrug);
  const OVERHEAD = () => arm(2.85, 0.2, 0, 0.42);                  // the butter held high, the arm up beside his head
  const SLAM = () => arm(0.4, 0.05, 0, 0.1);                        // the slap: arm swung down in front, palm on the butter
  const REST = () => arm(0.03, 0.06, 0, 0.27);                     // hanging nearly straight, a little out
  function ik2(dx, dy, L1, L2, bend) {
    const d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4);
    const base = Math.atan2(dx, -dy);
    const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const t1 = base + bend * a, kx = L1 * Math.sin(t1), ky = -L1 * Math.cos(t1);
    return [t1, Math.atan2(dx - kx, -(dy - ky)) - t1];
  }
  function standPose(carryIdx) {
    const ST = C.strut, py = PELVIS_Y;
    return {
      pelvisY: py, lean: ST.lean * 0.35, roll: 0, head: ST.chinUp,
      legs: [leg(0.06, ANKLE - py + 0.02), leg(-0.06, ANKLE - py + 0.02)],
      arms: [0, 1].map((i) => (i === carryIdx ? CARRY() : REST())),
    };
  }
  function lerpPose(a, b, u, stepLift = 0) {
    const L = (x, y) => x + (y - x) * u;
    return {
      pelvisY: L(a.pelvisY, b.pelvisY), lean: L(a.lean, b.lean), roll: L(a.roll, b.roll), head: L(a.head, b.head),
      legs: a.legs.map((l, i) => {
        const m = b.legs[i], lift = Math.abs(m.x - l.x) > 0.04 ? Math.sin(Math.PI * u) * stepLift : 0;
        return { x: L(l.x, m.x), y: L(l.y, m.y) + lift, toe: L(l.toe, m.toe), abd: L(l.abd, m.abd) };
      }),
      arms: a.arms.map((r, i) => { const m = b.arms[i]; return { sh: L(r.sh, m.sh), el: L(r.el, m.el), wr: L(r.wr, m.wr), abd: L(r.abd, m.abd), shrug: L(r.shrug, m.shrug) }; }),
    };
  }
  const lerpArm = (a, b, u) => ({ sh: lerp(a.sh, b.sh, u), el: lerp(a.el, b.el, u), wr: lerp(a.wr, b.wr, u), abd: lerp(a.abd, b.abd, u), shrug: lerp(a.shrug, b.shrug, u) });
  // The jump-slap in the air. tuck 0-1: heels kicked up behind (clear of the cat's head); slam 0-1: the butter arm
  // from high overhead down onto the head; free: the other arm, out for balance.
  function airPose(carry, slam, tuck, crouch = 0) {
    const py = PELVIS_Y - 0.12 * crouch, ground = ANKLE - py + 0.02;
    return {
      pelvisY: py, lean: lerp(0.1 + 0.25 * crouch, 0.5, slam * tuck), roll: 0, head: C.strut.chinUp + 0.15 * tuck - 0.2 * slam,
      legs: [0, 1].map((i) => leg(lerp(i ? -0.06 : 0.06, -0.3 + 0.08 * i, tuck), lerp(ground, -0.24 - 0.06 * i, tuck), lerp(0, 0.5, tuck), 0.05)),
      arms: [0, 1].map((i) => (i === carry ? lerpArm(OVERHEAD(), SLAM(), slam)
        : lerpArm(REST(), arm(-0.9 + 0.5 * slam, 0.6, 0, 0.5), Math.max(tuck, crouch * 0.6)))),
    };
  }
  // The strut. `fw` is steps taken (contact poses at whole numbers = on the beat), already warped by contactHold,
  // so foot plants come from distance: a planted foot never slides.
  function walkPose(fw, S, carryIdx) {
    const ST = C.strut, st = ST.stance, rm = reducedMotion();
    const x = frac(fw);
    const B = ST.bounceShape === 'double' ? 0.5 + 0.5 * Math.cos(2 * TAU * (x - 0.08))
      : ST.bounceShape === 'strut' ? 0.5 - 0.5 * Math.cos(TAU * x) : 0.5 + 0.5 * Math.cos(TAU * (x - 0.15));
    const hipH = Math.min(PELVIS_Y + 0.01, Math.sqrt(Math.max(0.04, ((L_THIGH + L_SHIN) * 0.97) ** 2 - (st * S) ** 2)) + ANKLE);   // a too-long stride bottoms out, never NaN
    // vault: the hips ride up over the planted foot (so the leg under him stays a straight post, as on Aaron's sheet)
    let reach = st * S;
    for (let i = 0; i < 2; i++) { const ph = frac(fw / 2 + i * 0.5); if (ph < st) reach = Math.min(reach, Math.abs(st * S - 2 * S * ph)); }
    const vaultH = Math.sqrt(Math.max(0.04, ((L_THIGH + L_SHIN) * F.hose.legSlack) ** 2 - reach ** 2)) + ANKLE;
    const pelvisY = Math.min(PELVIS_Y + 0.01, lerp(hipH, Math.max(hipH, vaultH), ST.vault ?? 0) + 0.02) - (rm ? 0 : ST.bounce) * B;   // the hip sits 0.02 under the pelvis
    const legs = [0, 1].map((i) => {
      const ph = frac(fw / 2 + i * 0.5);
      if (ph < st) { const peel = clamp01((ph - (st - 0.12)) / 0.12); return leg(st * S - 2 * S * ph, ANKLE - pelvisY + 0.02 * peel, -0.5 * peel); }
      const v = (ph - st) / (1 - st);                       // swinging: fast pick-up, slow put-down (Williams)
      const lift = ST.kneeLift * 0.2 * Math.sin(Math.PI * v ** 0.75);
      return leg(-st * S + 2 * st * S * (1 - (1 - v) ** 2.2), ANKLE - pelvisY + lift, lerp(-0.6, 0.35, v));
    });
    const landing = Math.floor(fw) % 2 === 0 ? 0 : 1;      // the shrug: the landing side's shoulder pops up
    const pop = rm ? 0 : Math.sin(Math.PI * clamp01(x / 0.7)) * (1 - x * 0.3);
    const shr = (i) => (i === landing ? ST.shrug * pop : 0);
    const arms = [0, 1].map((i) => {
      if (i === carryIdx) return CARRY(0.05 * B, shr(i));
      const ph = frac(fw / 2 + i * 0.5);
      const sh = ST.armRaise - ST.armSwing * Math.cos(TAU * (ph + ST.armLead));
      return arm(sh, 0.12 + 0.45 * Math.max(0, sh - ST.armRaise) / Math.max(ST.armSwing, 0.01), 0, 0.2, shr(i));
    });
    const roll = ST.shrugRoll * pop * (landing === 0 ? 1 : -1);
    return { pelvisY, lean: ST.lean + 0.04 * B, roll, head: ST.chinUp - 0.03 * B, legs, arms };
  }
  const warp = (f, hold) => Math.floor(f) + (frac(f) - clamp(hold, 0, 0.9) * Math.sin(TAU * frac(f)) / TAU);
  const armsY = (deg) => Math.PI - THREE.MathUtils.degToRad(deg);
  // The yell: arms up and out as hoses. They sag from the shoulder and swoop up to the hands (the bulge sits in the
  // frontal plane, where the camera sees it; the joints stay straight so no bend hides in depth). `flex` adds to the
  // sag (the wobble after each snap open), `wave` bends both arms into an S (the noodle sway while he climbs).
  function yellPose(spreadDeg, tremble, flex = 0, wave = 0) {
    const py = PELVIS_Y - 0.04, abd = armsY(spreadDeg), H = C.figure.hose;
    return {
      pelvisY: py, lean: 0.06 + 0.02 * tremble, roll: 0, head: 0.12 + 0.05 * tremble,
      legs: [leg(0.03, ANKLE - py, 0, 0.32), leg(-0.03, ANKLE - py, 0, 0.32)],
      arms: [0, 1].map((i) => arm(0.15 + 0.05 * tremble * (i ? -1 : 1), 0, 0, abd + 0.04 * tremble)),
      armSag: Math.max(0.03, H.yellSag + flex), armSwoop: H.swoop, armWave: wave,
    };
  }
  // the hose's follow-through after a snap: the sag lags (grows), then springs back, tb beats after the snap starts
  const hoseWobble = (tb, amount) => amount * Math.exp(-2.2 * tb) * Math.sin(TAU * 1.25 * tb);   // 0 at the snap: no jump
  // From a standing pose to the yell's arms by k (0-1, a little past 1 overshoots): the body stays standing, the arms
  // and their hose sag blend in (the encore's raised arms)
  function armsUp(stand, yell, k) {
    const pose = lerpPose(stand, yell, clamp01(k));
    pose.legs = stand.legs; pose.pelvisY = stand.pelvisY; pose.lean = lerp(stand.lean, yell.lean, clamp01(k));
    pose.arms = stand.arms.map((a, i) => lerpArm(a, yell.arms[i], k));
    if (k > 0) { pose.armSag = Math.max(0.03, yell.armSag * clamp01(k)); pose.armSwoop = yell.armSwoop * clamp01(k); }
    return pose;
  }

  // Hose geometry. The half-angle of a circular arc with chord d and length len: sin(th)/th = d/len.
  function arcHalfAngle(ratio) {
    if (ratio >= 1) return 0;
    let th = Math.sqrt(6 * (1 - ratio));
    for (let k = 0; k < 6; k++) {
      const f = Math.sin(th) / th - ratio, df = (th * Math.cos(th) - Math.sin(th)) / (th * th);
      th = clamp(th - f / df, 1e-4, 2.6);
    }
    return th;
  }
  const _q = new THREE.Quaternion();
  const UPV = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0), FWD = new THREE.Vector3(1, 0, 0);
  const _f = new THREE.Vector3(), _g = new THREE.Vector3(), _u = new THREE.Vector3(), _q1 = new THREE.Vector3(), _q2 = new THREE.Vector3();
  // v made square to the chord a -> c (into out)
  function sidePerp(a, c, v, out) {
    _u.subVectors(c, a).normalize();
    out.copy(v).addScaledVector(_u, -v.dot(_u));
    if (out.lengthSq() < 1e-8) out.set(0, 0, 1).addScaledVector(_u, -_u.z);
    return out.normalize();
  }
  // which way a limb bulges: toward its hidden joint, or `fallback` while the joint is nearly straight
  function bendSide(a, joint, c, fallback) {
    sidePerp(a, c, _g.subVectors(joint, a), _g);
    const off = _f.subVectors(joint, a).dot(_g);                  // how far the joint sits off the chord
    const w = clamp01(off / 0.04);
    return _g.multiplyScalar(w).add(sidePerp(a, c, fallback, _f).multiplyScalar(1 - w)).normalize();
  }
  // Lay `tube` from a to c as a hose of length len bulging toward `side`. sag: the least bulge, as a fraction of the
  // chord; swoop (-1..1): slides the bulge toward the root; wave (radians): tilts both ends the same way (an S).
  // bend (0..1) scales the arc down toward straight
  function hose(tube, a, c, len, side, sag, swoop, wave, r, bend = 1, flat = 1) {
    const d = Math.max(1e-4, a.distanceTo(c));
    let th = arcHalfAngle(d / len);
    if (sag > 0) {
      const sg = Math.min(sag, 0.48) * d, R = (d * d / 4 + sg * sg) / (2 * sg);
      th = Math.max(th, Math.asin(clamp(d / (2 * R), 0, 1)));
    }
    th = Math.min(th, 1.5) * bend;
    _u.subVectors(c, a).normalize();
    const k = th < 1e-3 ? d / 3 : (4 / 3) * Math.tan(th / 2) * d / (2 * Math.sin(th));
    const t1 = th * (1 + swoop) + wave, t2 = th * (1 - swoop) - wave;
    _q1.copy(_u).multiplyScalar(Math.cos(t1)).addScaledVector(side, Math.sin(t1)).multiplyScalar(k).add(a);
    _q2.copy(_u).multiplyScalar(-Math.cos(t2)).addScaledVector(side, Math.sin(t2)).multiplyScalar(k).add(c);
    tube.set4(a, _q1, _q2, c, r, flat);
  }

  // Pose the hidden joints (figure units).
  function poseRig(p) {
    pelvis.position.y = p.pelvisY;
    spine.rotation.set(p.roll, 0, p.lean);
    fhead.rotation.set(-p.roll * 0.6, 0, p.head);
    LEGS.forEach((L, i) => {
      const t = p.legs[i], [a1, a2] = ik2(t.x, t.y + 0.02, L_THIGH, L_SHIN, 1);
      L.hip.rotation.set(-L.side * t.abd, 0, a1); L.knee.rotation.z = a2; L.ankle.rotation.z = t.toe - a1 - a2;
    });
    ARMS.forEach((A, i) => {
      const a = p.arms[i];
      A.sh.position.y = SHOULDER_Y + a.shrug;
      A.sh.rotation.set(-A.side * a.abd, 0, a.sh); A.el.rotation.z = a.el; A.wr.rotation.z = a.wr;
    });
    fig.updateMatrixWorld(true);
  }
  // Where the hand of arm i ends up in a pose, in figure units (the jump aims the hand, not a stretched arm)
  function handIn(p, i) {
    poseRig(p);
    return local(ARMS[i].grip, new THREE.Vector3());
  }
  let armStretch = 0;                                                // the most any arm has been pulled past its length
  // Pose the joints, then lay the skin over them. fs.squash (1 = none) squashes him on the crouch and the landing and
  // stretches him on the leap, keeping his volume.
  function applyFigure(fs) {
    document.body.classList.toggle('bm-big', !!fs?.big);          // the page chrome fades while he fills the screen
    fig.visible = !!fs;
    figShadow.visible = !!fs;
    if (figButter) figButter.visible = false;
    if (!fs) {site.eyesWorld?.hostChanged('butterman');depthOrder(false);return;}
    const s = fs.scale * (fs.punch || 1), p = fs.pose, sq = fs.squash || 1;
    fig.position.copy(fs.pos); fig.rotation.set(0, fs.yaw, 0); fig.scale.set(s / Math.sqrt(sq), s * sq, s / Math.sqrt(sq));
    poseRig(p);
    // body: seat -> chest -> neck, an oval tube closed at both ends
    local(seatN, _a); local(chest, _b); local(neck, _c);
    torso.set(_a, _b, _c, profile, F.body.depth);
    const core = local(armRoot, new THREE.Vector3());
    // Limbs are hoses (docs/ideas/butterman.md "Look"): each is one circular arc of a fixed length from root to end,
    // so it never kinks at an elbow or knee. The hidden joints decide where the end goes and which way the hose
    // bulges; the shorter the gap, the rounder the arc. A pose can add a sag (a minimum bulge), a swoop (the bulge
    // slides toward the root, so the end flicks up) and a wave (an S-bend). Every limb keeps one radius end to end,
    // capped by a ball of the same radius.
    const H = C.figure.hose, legR = () => F.leg, armR = () => F.arm;
    const legRoot = (t) => F.leg * (0.72 + 0.28 * smooth(t / 0.25));    // thinner where it hides inside the body
    LEGS.forEach((L, i) => {
      local(L.hip, _a); local(L.knee, _b); local(L.ankle, _c);
      const side = bendSide(_a, _b, _c, FWD).clone();
      // The hose from hip to foot, then its top made to leave the body heading down (H.legRoot: 0 = along the leg,
      // 1 = straight down) from a root deep inside the body, so a swinging leg bends just under the body instead of
      // its top end swinging out through his back or belly (the leg check measures it).
      hose(legs[i], _a, _c, (L_THIGH + L_SHIN) * H.legSlack, side, 0, 0, 0, legR, 1, F.legDepth);
      const k1 = _a.distanceTo(_q1);
      _e.subVectors(_q1, _a).normalize().lerp(DOWN, H.legRoot ?? 0).normalize();
      _d.copy(_a).addScaledVector(UPV, LEG_TOP);                      // the root, deep inside the body
      _b.copy(_a).addScaledVector(_e, k1 * (H.legRootReach ?? 1.4));  // leaving the seat heading down
      legs[i].set4(_d, _b, _q2, _c, legRoot, F.legDepth);
      feet[i].position.copy(_c);
    });
    ARMS.forEach((A, i) => {
      local(A.sh, _a); local(A.el, _b); local(A.grip, _c);
      const len = (L_UPPER + L_FORE + GRIP * 0.5) * H.slack + _a.distanceTo(core) * 0.3;
      _a.lerp(core, 0.3);                                          // the root starts inside the body: no seam
      roots[i].position.copy(_a);                                  // and its end is closed, so no gap peeks out
      armStretch = Math.max(armStretch, _a.distanceTo(_c) / len);
      const side = p.armSag != null ? sidePerp(_a, _c, DOWN, _f) : bendSide(_a, _b, _c, DOWN);
      hose(arms[i], _a, _c, len, side, p.armSag ?? 0, p.armSwoop || 0, (p.armWave || 0) * (i ? -1 : 1), armR);
      hands[i].position.copy(_c);
    });
    // shadow under his feet (it shrinks and fades as he leaves the ground)
    const sw = world.catHeight * F.height * 0.7 * (fs.scale / figScale());
    const up = fs.pos.y - GROUND, air = clamp(1 - up / (FIG_H * fs.scale * 2), 0.35, 1);
    figShadow.position.set(fs.pos.x, GROUND + 0.002, fs.pos.z);
    figShadow.scale.set(sw * air, sw * 0.55 * air, 1);
    figShadow.material.opacity = up < -0.02 ? 0 : 0.16 * (fs.big ? clamp(1 - up * 3, 0, 1) : air);
    site.eyesWorld?.hostChanged('butterman');
    depthOrder(true);
  }
  const handWorld = (i, out) => fig.localToWorld(out.copy(hands[i].position));

  // Depth against the keepsakes (playtest-2, Aaron: "items behind the butterman should be covered by his model"). The
  // keepsakes are pictures drawn without a depth test, in depth order, split at the cat (src/core/world-presentation.js).
  // While he is shown he is a second split: pictures deeper than his chest draw before him, the rest after. The batch
  // is rebuilt only when the set behind him changes; nothing runs while he is not on screen.
  let depthShown = false, depthOrderNow = null, depthHost = null;
  const _fw = new THREE.Vector3(), _cp = new THREE.Vector3();
  const depthSpec = {
    depth() { if (!fig.visible) return null; camera.getWorldDirection(_fw); return chest.getWorldPosition(_cp).sub(camera.position).dot(_fw); },
    order(n) {
      if (n === depthOrderNow) return;
      depthOrderNow = n;
      fig.traverse((m) => { if (m.isMesh) m.renderOrder = n; });
      if (figButter) figButter.renderOrder = n;
    },
  };
  function depthOrder(shown) {
    const wp = site.worldPresentation;
    if (!wp?.divider || (!shown && !depthShown)) return;
    if (depthHost !== wp) { depthHost = wp; wp.divider.set(depthSpec); }
    depthShown = shown;
    wp.divider.moved();
  }

  // -------------------------------------------------------------------------
  // The schedule, in beats, plus a tempo map (each scene at its own bpm) for beats <-> seconds.
  // -------------------------------------------------------------------------
  const at = (a, v) => (v === 'hit' ? a.hit : v) ?? 0;
  // only: one scene id (a summon plays one scene, from beat 0); null = every scene back to back
  function buildSchedule(only = null) {
    const scenes = [], acts = [], tempo = [];
    let cursor = 0;
    for (const sc of only ? C.scenes.filter((x) => x.id === only) : C.scenes) {
      const bpm = bpmOverride ?? sc.bpm ?? C.bpm;
      const s0 = (typeof sc.start === 'number' ? sc.start : cursor + (scenes.length ? C.gap : 0)) + (sc.shift || 0);
      let bc = 0;
      const mine = [];
      sc.actions.forEach((a, index) => {
        const st = (typeof a.start === 'number' ? a.start : bc) + (a.shift || 0);
        mine.push({ id: `${sc.id}/${a.id}`, scene: sc, cfg: a, index, start: s0 + st, end: s0 + st + a.length });
        bc = st + a.length;
      });
      // Match the final held pose to the scheduled source duration, even at a
      // different tempo. No rounded beat, sinking action, or fade-out at the end.
      if (sc.endOnAudio) {
        const song = mine.find(a => a.cfg.audio?.file), au = song?.cfg.audio;
        const duration = au && (au.endSeconds ?? audio.buffer(au.file)?.duration);
        if (duration != null) {
          const rate = au.bpm ? bpm / au.bpm : 1;
          const end = song.start + at(song.cfg, au.offset) + (duration - (au.beat0 || 0)) / rate * bpm / 60;
          const last = mine.at(-1);
          last.end = end; last.cfg = { ...last.cfg, length: end - last.start };
        }
      }
      const end = typeof sc.length === 'number' ? s0 + sc.length : Math.max(s0, ...mine.map((m) => m.end));
      // Off screen early (C.offscreenLead): he is gone a whole number of beats before the scene (and its clip) ends;
      // a walk still running then is retimed to finish its exit by that beat, the same steps per beat, only longer.
      const lead = sc.offscreenLead ?? C.offscreenLead ?? 0, exit = end - Math.round(lead * bpm / 60);
      mine.forEach((m) => { m.until = Math.max(m.start, Math.min(m.end, exit)); });
      tempo.push({ from: Math.min(cursor, s0), to: end, spb: 60 / bpm, follow: followMap(sc, mine, s0, end, bpm) });
      const out = { id: sc.id, cfg: sc, start: s0, end, exit, bpm, spb: 60 / bpm, actions: mine };
      mine.forEach((m) => { m.sceneRef = out; });
      scenes.push(out);
      acts.push(...mine);
      cursor = end;
    }
    let t = 0;
    for (const seg of tempo) { seg.t0 = t; t += (seg.to - seg.from) * seg.spb; }
    const slap = acts.find((a) => a.cfg.do === 'slap'), handUp = acts.find((a) => a.cfg.do === 'hand-up');
    const walkOut = acts.find((a) => a.cfg.do === 'walk-out');
    return {
      only, scenes, actions: acts, tempo, total: cursor, seconds: t,
      hitB: slap ? slap.start + slap.cfg.hit : null, slap, handUp, walkOut,
    };
  }
  // Follow the singing (scene.followSinging): Aaron sings without a click, so his beats drift up to ~0.18 s off a
  // straight tempo. A scene whose clip lists its `landmarks` (measured sung beats, docs/audio.md) bends its beat grid
  // through them: steps, the slap and captions land on his actual beats. Returns [[beat, seconds early(-)/late(+)]],
  // pinned to 0 at the scene's ends so scenes still join smoothly. Off when the scene runs at another tempo than sung.
  function followMap(sc, mine, s0, end, bpm) {
    if (sc.followSinging === false) return null;
    const a = mine.find((m) => m.cfg.audio?.landmarks && m.cfg.audio.bpm);
    if (!a) return null;
    const au = a.cfg.audio;
    if (Math.abs(au.bpm - bpm) > 1e-6) return null;
    const b0 = a.start + at(a.cfg, au.offset), spb = 60 / bpm, pts = [[s0, 0]];
    for (const [j, T] of au.landmarks) {
      const b = b0 + j;
      if (b > s0 + 0.5 && b < end - 0.5) pts.push([b, T - au.beat0 - j * spb]);
    }
    pts.push([end, 0]);
    return pts.length > 2 ? pts : null;
  }
  function followAt(seg, b) {
    const f = seg.follow;
    if (!f || b <= f[0][0] || b >= f[f.length - 1][0]) return 0;
    let i = 1;
    while (b > f[i][0]) i++;
    return lerp(f[i - 1][1], f[i][1], (b - f[i - 1][0]) / (f[i][0] - f[i - 1][0]));
  }
  function segAt(S, b) { for (const seg of S.tempo) if (b < seg.to) return seg; return S.tempo[S.tempo.length - 1]; }
  // straight = the plain tempo (where a clip's beat 0 lands); otherwise the grid that follows the singing
  function secAt(S, b, straight = false) {
    if (b < 0) return b * S.tempo[0].spb;
    const seg = segAt(S, b);
    return seg.t0 + (b - seg.from) * seg.spb + (straight ? 0 : followAt(seg, b));
  }
  function beatAt(S, t) {
    if (t < 0) return t / S.tempo[0].spb;
    let seg = S.tempo[S.tempo.length - 1];
    for (const s of S.tempo) if (t < s.t0 + (s.to - s.from) * s.spb) { seg = s; break; }
    const b = seg.from + (t - seg.t0) / seg.spb;
    if (!seg.follow) return b;
    let lo = seg.from, hi = Math.max(seg.to, b);                 // invert the bent grid (it only ever moves forward)
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (secAt(S, m) < t) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  // -------------------------------------------------------------------------
  // Staging per scene, from the current camera: where he starts, stops and leaves. One step per beat.
  // -------------------------------------------------------------------------
  const halfFov = () => THREE.MathUtils.degToRad(camera.fov / 2);
  const SPB = () => C.strut.stepsPerBeat || 1;                     // steps per beat on every walk
  const BUTTER_HALF = 0.034;                                        // half the butter's thickness (and a hair)
  const yawOf = (v) => Math.atan2(-v.z, v.x);
  function offscreen(from, v, s) {                                 // distance along v until he is fully off-screen
    const k = Math.tan(halfFov()) * camera.aspect, sx = Math.sign(v.x) || 1;
    const rhs = (camera.position.z - from.z) * k + 0.8 * s * FIG_H / 2 - sx * from.x;
    return Math.max(0.5, rhs / (Math.abs(v.x) + v.z * k));
  }
  // fit (action.fit): the walk spans exactly the ground it needs (edge to mark, or edge to edge), so his steps shrink
  // to fill a long song and he's on screen the whole time. Otherwise steps are at least strut.stride and he may start
  // or end further off-screen.
  function makePath(start, dir, need, steps, s, fit = false) {
    const N = Math.max(1, Math.round(steps)), D = fit ? need : Math.max(need, N * C.strut.stride * s);
    return { start, dir, D, N, S: D / N, yaw: yawOf(dir) };
  }
  const headAtYaw = (yaw) => cat.crownWorld(yaw);                  // where the butter sits on his head, in the scene
  function geometry(sc, run) {
    const key = sc.id;                                             // staged once per run, at its first frame
    if (run.geo[key]) return run.geo[key];
    const t = C.strut.turnToCamera, side = sc.from === 'left' ? -1 : 1, g = {}, s = figScale(), k = SPB();
    const act = (d) => sc.actions.find((a) => a.do === d);
    const beats = (d) => { const m = S.actions.find((x) => x.scene === sc && x.cfg.do === d); return m.until - m.start; };   // after the early exit
    if (act('walk-in')) {
      const h = headAtYaw(sc.cat ? sc.cat.yaw : world.yaw);
      g.mark = new THREE.Vector3(h.x + side * F.reach, GROUND, h.z + F.standInFront);
      const inDir = new THREE.Vector3(-side * Math.cos(t), 0, Math.sin(t)), back = inDir.clone().negate();
      g.in = makePath(null, inDir, offscreen(g.mark, back, s), act('walk-in').length * k, s, act('walk-in').fit);
      g.in.start = g.mark.clone().addScaledVector(back, g.in.D);
      const wo = act('walk-out');
      if (wo) g.out = makePath(g.mark.clone(), back, offscreen(g.mark, back, s), (beats('walk-out') - wo.turn) * k, s, wo.fit);
      g.carry = Math.cos(g.in.yaw) > 0 ? 0 : 1;                    // the arm nearer the camera carries the butter
      // The jump: he faces the cat's head and leaps so that, at the top, his slapping hand (palm on the butter) is
      // right over the spot the butter sits on the head. The leap is as high as the head needs, never a stretched arm.
      g.jumpYaw = yawOf(new THREE.Vector3(h.x - g.mark.x, 0, h.z - g.mark.z));
      const hit = h.clone().addScaledVector(UP, F.arm * s + BUTTER_HALF);
      const hand = handIn(airPose(g.carry, 1, 1), g.carry).multiplyScalar(s).applyAxisAngle(UP, g.jumpYaw);
      g.apex = hit.sub(hand);
    }
    if (act('cross')) {
      const mid = new THREE.Vector3(0, GROUND, sc.depth ?? 0.75), dir = new THREE.Vector3(-side * Math.cos(t), 0, Math.sin(t));
      const Db = offscreen(mid, dir.clone().negate(), s), Df = offscreen(mid, dir, s);
      g.cross = makePath(null, dir, Db + Df, beats('cross') * k, s, act('cross').fit);
      g.cross.start = mid.clone().addScaledVector(dir, -(Db + (g.cross.D - Db - Df) / 2));
    }
    if (act('walk-mid')) {
      // The encore: in to the middle of the screen (in front of the cat), then on along the same line and off the
      // other side, the way his old walk across went.
      const mid = new THREE.Vector3(0, GROUND, sc.depth ?? 0.75), dir = new THREE.Vector3(-side * Math.cos(t), 0, Math.sin(t)), back = dir.clone().negate();
      g.mid = mid;
      g.in = makePath(null, dir, offscreen(mid, back, s), beats('walk-mid') * k, s, act('walk-mid').fit);
      g.in.start = mid.clone().addScaledVector(back, g.in.D);
      const wo = act('walk-off');
      g.out = makePath(mid.clone(), dir, offscreen(mid, dir, s), (beats('walk-off') - (wo.turn || 0)) * k, s, wo.fit);
      g.camYaw = yawOf(new THREE.Vector3(camera.position.x - mid.x, 0, camera.position.z - mid.z));
    }
    if (act('loop')) {
      // Scene 2: in to the middle of the room, once round the cat on a ring, out along the ring's edge to open floor.
      const L = sc.loop, dir = L.dir ?? 1, R = L.radius;
      const on = (a) => new THREE.Vector3(Math.cos(a) * R, GROUND, Math.sin(a) * R);          // a point on the ring
      const tan = (a) => new THREE.Vector3(-Math.sin(a) * dir, 0, Math.cos(a) * dir);          // the way he walks there
      const p0 = on(L.at), t0 = tan(L.at), back = t0.clone().negate();
      g.enter = makePath(null, t0, offscreen(p0, back, s), beats('enter') * k, s, act('enter').fit);
      g.enter.start = p0.clone().addScaledVector(back, g.enter.D);
      const N = Math.max(4, Math.round(beats('loop') * k));
      g.loop = { R, dir, a0: L.at, N, S: 2 * Math.PI * R / N, on, tan };
      g.out = makePath(p0.clone(), t0, L.open, beats('walk-to') * k, s, true);
      g.open = p0.clone().addScaledVector(t0, L.open);
      // Layout lane (playtest-3, e1113-30: "have butterman end the scene a bit more to the right"): with `end`, he walks
      // from the ring to that floor spot instead, turning toward it over his first `turn` beats off the ring.
      if (L.end) {
        const end = new THREE.Vector3(L.end[0], GROUND, L.end[1]), d = end.clone().sub(p0), len = d.length();
        g.out = makePath(p0.clone(), d.divideScalar(len), len, beats('walk-to') * k, s, true);
        g.out.turnFrom = yawOf(t0); g.out.turn = L.turn ?? 0; g.open = end;
      }
      g.faceYaw = yawOf(new THREE.Vector3(camera.position.x - g.open.x, 0, camera.position.z - g.open.z));
    }
    if (act('rise')) {
      // His own size, right up at the lens: in front of the camera as it will be at the full dolly zoom (sc.lens), his
      // upper body (hips to raised hands) filling the screen.
      if (!lens.base) applyLens(0);
      const fov = sc.lens?.fov ?? camera.fov, cam = sc.lens ? lensPos(fov, new THREE.Vector3()) : camera.position.clone();
      const tanH = Math.tan(THREE.MathUtils.degToRad(fov / 2)), fill = sc.fill ?? 0.9;
      // tall screens: his head and shoulders fill the width (the head, nearest the lens, comes out biggest) and the open
      // arms run off the edges from their elbows, so each stage still shows how wide they open
      const dist = Math.max(1.5 * s / (2 * tanH), 1.3 * s / (2 * tanH * camera.aspect)) / fill;
      const P = cam.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()), dist);
      g.top = new THREE.Vector3(P.x, P.y - (sc.drop ?? 1.6) * s, P.z);   // how far below the lens line his feet are (his units)
      // he starts below the frame both of the wide lens and of the normal one (the zoom is still widening as he climbs)
      g.below = g.top.clone(); g.below.y -= dist * tanH + 4 * s;
      const look = camera.getWorldDirection(new THREE.Vector3()), pitch = Math.asin(-look.y);
      const dBase = Math.hypot(P.x - lens.base.pos.x, P.z - lens.base.pos.z);
      const floor = lens.base.pos.y - dBase * Math.tan(THREE.MathUtils.degToRad(lens.base.fov / 2) + pitch);   // the normal frame's bottom there
      g.below.y = Math.min(g.below.y, floor - 3.4 * s);                // hands up, about 3 of his units above his feet
      g.camYaw = yawOf(new THREE.Vector3(camera.position.x - P.x, 0, camera.position.z - P.z));
    }
    return (run.geo[key] = g);
  }

  // -------------------------------------------------------------------------
  // The lens (rise only, scene.lens): a dolly zoom. The camera widens to lens.fov while sliding in, so the cat keeps his
  // size on screen, and Butterman, standing right in front of it at his own size, gets the big-head, wide-angle look of
  // something an arm's length from the lens. lens.ease: beats to widen at the start and to come back after he's gone.
  // -------------------------------------------------------------------------
  const LOOK_AT = new THREE.Vector3(0, 0.5, 0);                     // cat.js frame() aims here
  const lens = { base: null, z: 0, fixing: false };
  function lensAt(gb, S) {
    const sc = S?.scenes[0], L = sc?.cfg.lens;
    if (!L || gb === null || gb < sc.start || gb > sc.end || reducedMotion()) return 0;
    const b = gb - sc.start;
    return Math.min(EASE.sineInOut(clamp01(b / L.ease)), EASE.sineInOut(clamp01((sc.end - sc.start - b) / L.ease)));
  }
  const lensPos = (fov, out) => out.copy(lens.base.pos).sub(LOOK_AT)
    .multiplyScalar(Math.tan(THREE.MathUtils.degToRad(lens.base.fov / 2)) / Math.tan(THREE.MathUtils.degToRad(fov / 2))).add(LOOK_AT);
  function applyLens(z, wide) {
    if (!z && !lens.z) {                                             // idle: follow cat.js
      lens.base ??= { pos: new THREE.Vector3() }; lens.base.fov = camera.fov; lens.base.pos.copy(camera.position);
      lent(false); return;
    }
    lens.z = z;
    camera.fov = lerp(lens.base.fov, wide ?? lens.wide ?? lens.base.fov, z);
    lens.near ??= camera.near;
    camera.near = z ? Math.min(lens.near, 0.01) : lens.near;            // he comes closer than cat.js's near plane
    lensPos(camera.fov, camera.position);
    if (wide) lens.wide = wide;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    // While the page camera is his close-up, the world leaves what it does with the page's view (fits, saves, sending a
    // prop home) until the camera is back (src/core/world.js, cameraBack; playtest-3, IMG7: scene 3 left the box drawn
    // huge). Every picture drawn meanwhile is redrawn for the page's camera by world-presentation.js's camera watch.
    lent(!!z);
  }
  function lent(on) { if (on !== !!stage.cameraBorrowed) { stage.cameraBorrowed = on; if (!on) site.world?.cameraBack?.(); } }
  // First of the resize handlers (playtest-3): a resize mid-rise reframes with the wide fov; the others (the shelf, the
  // rack, the world's fit of every resting prop) must only ever see the page's own frame, which this restores first.
  stage.onResize.unshift(() => {                                     // cat.js reframed with our fov: redo it with its own
    if (!lens.z || lens.fixing) return;
    lens.fixing = true; camera.fov = lens.base.fov; lens.z = 0; camera.near = lens.near ?? camera.near;   // the page's own frame, near plane too
    dispatchEvent(new Event('resize'));
    lens.base = { fov: camera.fov, pos: camera.position.clone() };
    lens.fixing = false;
  });

  // -------------------------------------------------------------------------
  // Actions: each returns { pos, yaw, pose, scale } for the figure at `tb` beats into the action.
  // -------------------------------------------------------------------------
  function walkAlong(path, tb, easing, carry, s) {                // tb in beats; path.N in steps
    const n = clamp(tb * SPB(), 0, path.N), f = Math.floor(n) + (n >= path.N ? 0 : ease(easing, frac(n)));
    const fw = warp(f, C.strut.contactHold);
    return { pos: path.start.clone().addScaledVector(path.dir, fw * path.S), yaw: path.yaw, pose: walkPose(fw, path.S / s, carry), scale: s };
  }
  // The butter arm and the jump, from hand-up to the landing (Aaron, e1108-10: he jumps, the arm never stretches).
  // Hand-up: the butter shoots up over his head and he turns to face the cat's head. Then the anticipation crouch,
  // the leap (up first, then over, so he clears the head), the slap at the top on the hit, the drop back to his mark
  // (out first, then down) and the landing squash.
  const strikeAt = (gb, S) => (S.slap ? ease(S.slap.cfg.easing, (gb - (S.hitB - S.slap.cfg.strike)) / S.slap.cfg.strike) : 0);
  function jumpAt(gb, S, g) {
    const hu = S.handUp.cfg, sl = S.slap.cfg, rm = reducedMotion(), hit = S.hitB;
    const t0 = hit - sl.takeoff, c0 = t0 - sl.crouch, tl = hit + sl.land, tEnd = S.slap.end;
    const sqA = rm ? 0 : sl.squash, stA = rm ? 0 : sl.stretch;
    const pos = g.mark.clone();
    let pose, squash = 1, yaw = g.jumpYaw;
    if (gb < c0) {                                                 // hand-up: butter up high, turning to the head
      const u = ease(hu.easing, (gb - S.handUp.start) / hu.raise);
      pose = standPose(g.carry);
      pose.arms[g.carry] = lerpArm(CARRY(), OVERHEAD(), u);
      yaw = lerpAngle(g.in.yaw, g.jumpYaw, smooth((gb - S.handUp.start) / hu.raise));
    } else if (gb < t0) {                                          // the crouch: sink and squash, wound up
      const u = EASE.quadOut(clamp01((gb - c0) / sl.crouch));
      pose = airPose(g.carry, 0, 0, u);
      squash = 1 - sqA * u;
    } else if (gb < hit) {                                         // the leap: up first, then over
      const u = clamp01((gb - t0) / sl.takeoff);
      pos.lerp(g.apex, u * u);
      pos.y = lerp(g.mark.y, g.apex.y, 1 - (1 - u) ** 2);
      pose = airPose(g.carry, strikeAt(gb, S), smooth(u / 0.5));
      squash = u < 0.12 ? lerp(1 - sqA, 1 + stA, u / 0.12) : lerp(1 + stA, 1, smooth((u - 0.12) / 0.6));
    } else if (gb < tl) {                                          // the drop: out first, then down
      const v = clamp01((gb - hit) / sl.land);
      pos.copy(g.apex).lerp(g.mark, 1 - (1 - v) ** 2);
      pos.y = lerp(g.apex.y, g.mark.y, v * v);
      pose = airPose(g.carry, 1 - smooth(v / 0.8), 1 - smooth((v - 0.3) / 0.7));
      squash = 1 + 0.6 * stA * v * v;                              // stretching as he falls
    } else {                                                       // the landing: squash, spring back, proud
      const w = clamp01((gb - tl) / Math.max(0.05, tEnd - tl)), k = Math.exp(-4 * w) * Math.cos(Math.PI * 1.5 * w);
      pose = standPose(-1);
      pose.pelvisY -= 0.16 * Math.max(0, k);
      pose.lean -= 0.12 * Math.sin(Math.PI * w);                     // chest out, proud
      squash = 1 - 0.9 * sqA * k;
    }
    return { pos, yaw, pose, squash };
  }
  function actionAt(a, tb, S, run) {
    const cfg = a.cfg, sc = a.scene, g = geometry(sc, run), s = figScale(), rm = reducedMotion();
    const gb = a.start + tb;
    const holding = S.hitB !== null && gb < S.hitB;                  // the walk-in carries the butter like a tray
    let out;
    switch (cfg.do) {
      case 'walk-in': out = walkAlong(g.in, tb, cfg.easing, holding ? g.carry : -1, s); break;
      case 'hand-up': case 'slap': {
        out = { ...jumpAt(gb, S, g), scale: s };
        if (a.index > 0 && cfg.do === 'hand-up' && tb < C.strut.blend) {    // blend in from his last step
          out.pose = lerpPose(walkPose(g.in.N, g.in.S / s, g.carry), out.pose, smooth(tb / C.strut.blend), 0.1);
        }
        break;
      }
      case 'walk-out': {
        const turn = cfg.turn;
        if (tb < turn) {                                          // about-face with a hop
          const u = smooth(tb / turn), pos = g.mark.clone();
          if (!rm) pos.y += Math.sin(Math.PI * tb / turn) * 0.08 * s;
          const pose = lerpPose(standPose(-1), walkPose(0, g.out.S / s, -1), u);
          out = { pos, yaw: lerpAngle(g.jumpYaw, g.out.yaw, u), pose, scale: s };
        } else out = walkAlong(g.out, tb - turn, cfg.easing, -1, s);
        break;
      }
      case 'cross': out = walkAlong(g.cross, tb, cfg.easing, -1, s); break;
      case 'enter': out = walkAlong(g.enter, tb, cfg.easing, -1, s); break;
      case 'loop': {                                             // once round the cat, a whole number of steps
        const G = g.loop, n = clamp(tb * SPB(), 0, G.N), f = Math.floor(n) + (n >= G.N ? 0 : ease(cfg.easing, frac(n)));
        const fw = warp(f, C.strut.contactHold), a = G.a0 + G.dir * TAU * fw / G.N;
        out = { pos: G.on(a), yaw: yawOf(G.tan(a)), pose: walkPose(fw, G.S / s, -1), scale: s };
        break;
      }
      case 'walk-to': out = walkAlong(g.out, tb, cfg.easing, -1, s);
        if (g.out.turn && tb < g.out.turn) out.yaw = lerpAngle(g.out.turnFrom, g.out.yaw, smooth(tb / g.out.turn));
        break;
      case 'walk-mid': out = walkAlong(g.in, tb, cfg.easing, -1, s); break;
      case 'raise': {                                            // the encore: face you, arms up in a Y, pump, arms down
        const turn = cfg.turn ?? 0.5, up = cfg.up ?? 0.75, down = cfg.down ?? 0.75, dn0 = cfg.length - down;
        const stand = standPose(-1);
        let pose, yaw = g.camYaw;
        if (tb < turn) {
          const u = smooth(tb / turn);
          pose = lerpPose(walkPose(g.in.N, g.in.S / s, -1), stand, u, 0.1);
          yaw = lerpAngle(g.in.yaw, g.camYaw, u);
        } else {
          const beat = tb - turn - up, pump = rm || beat < 0 || tb > dn0 ? 0 : Math.sin(Math.PI * frac(beat)) ** 2;
          const k = tb < dn0 ? EASE.backOut(clamp01((tb - turn) / up)) : 1 - smooth((tb - dn0) / down);
          pose = armsUp(stand, yellPose((cfg.arms ?? 34) + (cfg.pump ?? 0) * pump, 0), k);
          pose.pelvisY -= 0.035 * pump;                         // a small bounce on every beat
        }
        out = { pos: g.mid.clone(), yaw, pose, scale: s };
        break;
      }
      case 'walk-off': {                                         // turns from you to the way out, then walks off
        const turn = cfg.turn || 0;
        if (tb < turn) {
          const u = smooth(tb / turn);
          out = { pos: g.mid.clone(), yaw: lerpAngle(g.camYaw, g.out.yaw, u), pose: lerpPose(standPose(-1), walkPose(0, g.out.S / s, -1), u), scale: s };
        } else out = walkAlong(g.out, tb - turn, cfg.easing, -1, s);
        break;
      }
      case 'stand': {                                            // turns to face you, then stands quite still
        const u = smooth(tb / (cfg.turn || 0.5));
        out = { pos: g.open.clone(), yaw: lerpAngle(g.out.yaw, g.faceYaw, u), pose: lerpPose(walkPose(g.out.N, g.out.S / s, -1), standPose(-1), u, 0.1), scale: s };
        break;
      }
      case 'rise': case 'open': {
        const prev = sc.actions.slice(0, a.index).reverse().find((x) => x.arms !== undefined);
        const m = ease(cfg.easing, tb / cfg.move);
        const spread = cfg.do === 'rise' ? cfg.arms : lerp(prev ? prev.arms : cfg.arms, cfg.arms, m);
        const I = cfg.intensity ?? 0, shakeAmt = lerp(C.yell.shake[0], C.yell.shake[1], I);
        const tremble = rm || cfg.do === 'rise' ? 0 : shakeAmt * clamp01((tb - cfg.move) / 0.25) * noise(tb * a.sceneRef.spb, a.index);
        const pos = cfg.do === 'rise' && !rm ? g.below.clone().lerp(g.top, m) : g.top.clone();
        if (!rm) pos.x += 0.012 * s * tremble;
        const punch = cfg.do === 'open' && !rm ? 1 + lerp(C.yell.punch[0], C.yell.punch[1], I) * Math.sin(Math.PI * clamp01(tb / 0.6)) : 1;
        const H = C.figure.hose, cyc = TAU * (a.start + tb) / 2;      // the climb's sway: one S-wave every 2 beats
        const flex = rm ? 0 : cfg.do === 'open' ? hoseWobble(tb, H.wobble * (0.6 + 0.6 * I)) : 0;
        const wave = rm || cfg.do !== 'rise' ? 0 : H.wave * Math.sin(cyc) * smooth(tb / 1.5);
        const pose = yellPose(spread, tremble, flex, wave);
        pose.lean -= sc.lean ?? 0;                                      // leaning in over the lens (+ lean is back)
        out = { pos, yaw: g.camYaw, pose, scale: s, punch, big: true };
        break;
      }
      case 'sink': {
        const prev = sc.actions.slice(0, a.index).reverse().find((x) => x.arms !== undefined);
        const k = rm ? (tb < cfg.length * 0.5 ? 0 : 1) : ease(cfg.easing, tb / cfg.length);
        if (rm && k) return null;
        // sinking: the arms trail as he drops (the hose lags), so the sag flattens out
        const lag = rm ? 0 : -C.figure.hose.yellSag * 1.6 * Math.sin(Math.PI * clamp01(tb / cfg.length));
        const pose = yellPose(prev ? prev.arms : 60, 0, lag);
        pose.lean -= sc.lean ?? 0;
        out = { pos: g.top.clone().lerp(g.below, k), yaw: g.camYaw, pose, scale: s, big: k < 0.6 };
        break;
      }
      default: return null;
    }
    return out;
  }
  function figureAt(gb, S, run) {
    let cur = null;
    for (const a of S.actions) if (a.start <= gb && (!cur || a.start >= cur.start)) cur = a;
    if (!cur || gb >= S.total) return null;
    if (cur.index === cur.scene.actions.length - 1 && gb > cur.end) return null;   // between scenes: off-screen
    if (gb >= cur.sceneRef.exit) return null;                                       // gone before the clip ends
    return actionAt(cur, Math.min(gb - cur.start, cur.until - cur.start), S, run);
  }
  // The butter while he has it: on his palm like a tray, flipping under the palm for the slap.
  function placeFigButter(gb, S, run, fs) {
    if (!S.slap || !fs || gb >= S.hitB) return;
    const sc = S.scenes.find((x) => x.cfg === S.slap.scene);
    if (gb < sc.start) return;
    if (!figButter) { if (!cat.butterGeometry) return; figButter = makeFigButter(); scene.add(figButter); }
    const g = geometry(S.slap.scene, run), s = figScale();
    handWorld(g.carry, _a);
    const off = F.arm * s + BUTTER_HALF;
    const flip = gb >= S.hitB - S.slap.cfg.strike ? strikeAt(gb, S) : 0;
    figButter.position.copy(_a).addScaledVector(UP, lerp(off, -off, flip));
    // on his palm it turns with him; through the slap it turns to sit exactly as it will on the head
    figButter.quaternion.setFromEuler(new THREE.Euler(0, fs.yaw + 0.3, 0));
    if (flip > 0) figButter.quaternion.slerp(_q.setFromEuler(new THREE.Euler(0, cat.spin.rotation.y + 0.25, 0.05)), flip);
    figButter.visible = true;
  }

  // -------------------------------------------------------------------------
  // Captions (DOM): the lyric line and the yell, whichever started last.
  // -------------------------------------------------------------------------
  const capEl = document.createElement('p'); capEl.id = 'bm-caption'; capEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(capEl);
  let lyricUp = false;
  // A lyric goes on the page's own message line (held while it is sung); a yell is his own big slammed caption.
  function captionAt(gb, S) {
    let best = null;
    if (C.captions && S && gb !== null) for (const sc of S.scenes) for (const c of sc.cfg.captions || []) {
      const b0 = sc.start + c.at;
      if (gb >= b0 && gb <= b0 + c.hold && (!best || b0 >= best.b0)) best = { b0, c };
    }
    const lyric = !!best && best.c.style !== 'yell';
    if (lyric) { ui.caption(best.c.text); lyricUp = true; } else if (lyricUp) { ui.caption(null); lyricUp = false; }
    if (!best || lyric) { capEl.textContent = ''; capEl.style.opacity = '0'; return best ? best.c.text : null; }
    const { slam, fade } = C.captionStyle, u = gb - best.b0, size = best.c.size ?? 1;
    if (capEl.textContent !== best.c.text) capEl.textContent = best.c.text;   // (Buttaman! is earned in fireEvents)
    capEl.style.opacity = String(clamp(Math.min(u / Math.max(slam * 0.5, 1e-3), (best.c.hold - u) / fade), 0, 1));
    const pop = u < slam ? lerp(2.4, 1, ease('backOut', u / slam)) : 1;
    const shake = reducedMotion() ? 0 : 3 * noise(u, 7) * size;
    capEl.style.transform = `translate(calc(-50% + ${shake.toFixed(1)}px), -50%) rotate(-6deg) scale(${(pop * size * 0.6).toFixed(3)})`;
    return best.c.text;
  }

  // -------------------------------------------------------------------------
  // Audio: every clip and footfall scheduled on the audio clock at play.
  // -------------------------------------------------------------------------
  const clipFiles = () => {
    const f = [];
    for (const sc of C.scenes) for (const a of sc.actions) if (a.audio?.file) f.push(a.audio.file);
    if (C.footsteps?.on) f.push(C.footsteps.file);
    if (C.whisper?.on) f.push(C.whisper.file);
    return f;
  };
  const clipsReady = audio.loadAll(clipFiles());
  function footfallBeats(S) {
    const out = [];
    for (const a of S.actions) {
      const c = a.cfg;
      const k = SPB();
      const n = (a.until - a.start) * k;
      if (c.do === 'walk-in' || c.do === 'cross' || c.do === 'walk-mid') for (let j = 1; j <= n; j++) out.push(a.start + j / k);
      if (c.do === 'walk-out' || c.do === 'walk-off') for (let j = 1; j <= n - (c.turn || 0) * k; j++) out.push(a.start + (c.turn || 0) + j / k);
    }
    return out;
  }
  function audioPlan(S) {                                           // every clip: when, rate, which part; kept even without audio
    const rows = [];
    for (const a of S.actions) {
      const au = a.cfg.audio;
      if (!au?.file) continue;
      const sc = a.sceneRef, rate = au.bpm ? (60 / sc.spb) / au.bpm : 1;
      const beat = a.start + at(a.cfg, au.offset);
      // seconds from beat 0 when the file starts: a sung clip keeps its own (straight) time; anything else, like the
      // slap's plop, sits on the grid that follows the singing
      const start = secAt(S, beat, !!au.bpm) - (au.beat0 || 0) / rate;
      const fileBeat = au.bpm ? 60 / au.bpm : sc.spb;
      const duration = au.endSeconds ?? (au.beats == null ? undefined : (au.beat0 || 0) + au.beats * fileBeat);
      rows.push({ action: a.id, file: Array.isArray(au.file) ? au.file[0] : au.file, src: au.file, beat, s: r3(start), rate: r3(rate), duration: duration && r3(duration), gain: au.gain ?? 1, fade: au.fade || 0, status: audio.status(au.file) });
    }
    return rows;
  }

  // -------------------------------------------------------------------------
  // Play / seek / finish
  // -------------------------------------------------------------------------
  let S = buildSchedule(ORDER[nextIndex()]), run = null, lastDone = null, frozenAt = null;
  // The collection stays on the page during his scenes (e1111-58: "buttaman also shouldnt make everything else on the
  // screen disappear ... if he walks into something it should just be pushed to the side"). While a scene plays live,
  // a kinematic capsule the size of his body walks with him through the physics world and shoves loose props aside.
  // It only follows him: his choreography and beat timings are untouched. Not while he fills the screen (the rise),
  // not for cameos, not in a frozen #b= scene, and it never loads the physics engine by itself.
  let pusher = null;
  function pushAt(fs) {
    const W = site.world;
    if (!fs || fs.big || !run?.live || !W?.ready) { pusher?.off(); return; }
    const radius = (F.body.width + F.leg * 0.5) * fs.scale, halfHeight = Math.max(0.001, FIG_H * fs.scale / 2 - radius);
    if (pusher && Math.abs(pusher.radius - radius) > radius * 0.1) { pusher.remove(); pusher = null; }
    pusher ??= W.pusher('butterman', { radius, halfHeight });
    pusher?.move({ x: fs.pos.x, y: Math.max(fs.pos.y, GROUND) + halfHeight + radius, z: fs.pos.z });
    // Never into the cat (playtest-3, Aaron: "Buttaman just pushed the box into the cat and it started tweaking out a
    // bit. and is stuck now"): the cat's body and his are both moved by hand, so a prop caught between them is crushed
    // into one of them. The world's sweep eases a prop near the cat off his line on the side away from the cat; and
    // while he is about to touch a prop that has no room between itself and the cat, he does not push at all (he walks
    // past in front of or behind it, drawn in depth order).
    if (pusher) {
      const solid = !squeezes(W, fs.pos, radius);
      if (solid !== pusher.solid) { pusher.solid = solid; for (let i = 0; i < pusher.body.numColliders(); i++) pusher.body.collider(i).setCollisionGroups(solid ? 0xffffffff : 0); }
    }
  }
  // A loose prop he is about to touch (C.push.slack) with no room for him between it and the cat.
  function squeezes(W, p, radius) {
    const P = C.push;
    for (const e of W.entries.values()) {
      const b = e.body;
      if (e.fixed || e.support || !b.isEnabled() || !b.isDynamic()) continue;
      const t = b.translation(), fr = W.flatReach?.(e) ?? e.reach;
      if (Math.hypot(t.x, t.z) - fr - P.catRadius > 2 * radius + P.slack) continue;   // room for him between them
      if (Math.hypot(t.x - p.x, t.z - p.z) < radius + fr + P.slack) return true;
    }
    return false;
  }
  const history = [];                                               // scenes played live on this page, in order
  const newRun = (live, scene) => ({ live, scene, geo: {}, log: [], scheduled: [], fired: new Set(), lastGb: -Infinity, gb: null, sources: [] });
  const catScene = () => S.scenes.find((sc) => sc.cfg.cat);
  // opts.scene: a scene id or index; left out = the next scene for this device (the B sigil)
  function play(opts = {}) {
    // Inside the gesture, before any await: wake audio and ask iOS to play through the silent switch (e1107-37).
    const ctx = audio.context(opts.forceAudio);
    whisper.replay?.stop();whisper.replay=null;
    const id = sceneId(opts.scene);
    // a once-ever scene (the encore) does not play again; #debug and the checks may force it
    if (C.scenes.find((sc) => sc.id === id)?.once && encoreDone() && !opts.force && !params.has('debug')) return null;
    const r = newRun(true, id);
    cameo = null;
    cat.ensureButter();
    store.set(C.cameo.storageKey, '1');                           // summoned: no more cameos for this visitor
    if (navigator.audioSession) {
      r.session = { before: navigator.audioSession.type };
      try { navigator.audioSession.type = 'playback'; } catch (e) { r.session.error = String(e); }
    }
    if (run?.sources) for (const src of run.sources) try { src.stop(); } catch { /* done */ }
    S = buildSchedule(id);
    history.push(id);
    r.perf0 = performance.now() / 1000 + C.preroll;
    r.ctx = ctx; r.ctxRead = ctx ? ctx.currentTime : 0; r.ctxT0 = ctx ? ctx.currentTime + C.preroll : 0;
    r.clock = ctx ? 'pending' : 'performance';
    for (const row of audioPlan(S)) {
      if (ctx) {
        const src = audio.play(row.src, { when: r.ctxT0 + row.s, rate: row.rate, gain: row.gain, duration: row.duration, fade: row.fade, radio: voiced(row.file) });
        if (src) { r.sources.push(src); row.scheduled = true; }
      }
      r.scheduled.push(row);
    }
    if (ctx && C.footsteps?.on) for (const b of footfallBeats(S)) {
      const src = audio.play(C.footsteps.file, { when: r.ctxT0 + secAt(S, b), gain: C.footsteps.gain });
      if (src) r.sources.push(src);
    }
    r.footfalls = footfallBeats(S).length;
    // the cat: stop his cycle (and sit, for the butter scene) for this scene only; he gets it back when it ends.
    // A scene restarted mid-run (#debug) keeps the cycle state from before the first one.
    r.catAuto = run?.live ? run.catAuto : world.auto;
    world.auto = false;
    const cs = catScene();
    if (cs?.cfg.cat.pose) world.request(cs.cfg.cat.pose);
    // A cat that already has butter keeps it: the butter scene again brings a fresh pat and slaps it on top.
    run = r; lastDone = null;
    if (S.scenes.some((sc) => sc.cfg.ticket)) prepareTicket();      // the encore's ticket, made ahead of its fall
    return S;
  }
  // cut: the scene was stopped before its end (api.stop); it does not count as watched
  function finish(cut = false) {
    if (run.session && navigator.audioSession) { try { navigator.audioSession.type = run.session.before; } catch { /* Safari only */ } }
    world.setYawTarget(null);
    world.auto = run.catAuto;
    if (ORDER.includes(run.scene) && !cut && !seenList().includes(run.scene)) site.store.set(SEQ.seenKey, [...seenList(), run.scene]);
    if (ORDER.includes(run.scene)) store.set(SEQ.storageKey, String(roundSeen() ? 0 : (ORDER.indexOf(run.scene) + 1) % ORDER.length));   // a cut-off scene plays again
    run.log.push({ event: 'done', beat: r3(run.gb), s: r3(secAt(S, run.gb)) });
    if (ticketFall.want) unparkTicket();                           // cut off before the ticket was let go
    // the encore counts as seen once its ticket fell (cut off before that, the harp's tune can still play it)
    if (run.scene === 'encore' && store.get(ENC.droppedKey) && !store.get(ENC.seenKey)) {
      store.set(ENC.seenKey, true);
      dispatchEvent(new CustomEvent('sigilcat:encore-seen'));
    }
    lastDone = run; run = null; pushAt(null);
    // the harp's tune finished while another scene was playing: the encore follows it
    if (encoreQueued) { encoreQueued = false; stage.after(1).then(() => { if (!run?.live) encore(); }); }
  }
  // The whisker harp's tune (src/gags/harp.js): the encore, once ever. Returns false when it has been seen.
  let encoreQueued = false;
  function encore() {
    if (encoreDone()) return false;
    if (run?.live) { if (run.scene !== 'encore') encoreQueued = true; return true; }
    return !!play({ scene: 'encore' });
  }
  // The ticket falls from the sky and lands just behind him (scene.ticket). A new card takes a couple of seconds to
  // make (its print, its body), so it is made when the scene starts and kept out of the world (hidden, no body) until
  // it is let go. An older save's ticket (from the old encore) is lifted off wherever it is and falls again; one in the
  // chest comes out (the room's copy wins). Cut off before it is let go, it is simply put back where it was.
  const ticketFall = { on: false, t: 0, want: false, ready: null, parked: null };
  function prepareTicket() {
    ticketFall.want = true;
    ticketFall.ready ??= (async () => {
      const K = site.keepsakes, Wd = site.world;
      const inst = K.get('ticket') || K.give('ticket', { at: K.toUnits(stage.width / 2, site.worldLayout?.floorY?.() ?? stage.height * 0.7) });
      if (!inst) return null;
      inst.autoHome = false;
      await inst.worldTask;
      const e = inst.worldEntry;
      if (!e || !Wd || !ticketFall.want || ticketFall.on) return e ? { inst, e } : null;
      if (Wd.held?.entry === e) Wd.release();
      if (e.support) site.supports?.detach(e, { wake: false });
      Wd.cancelReturn?.(e);
      e.body.setEnabled(false); e.object.visible = false; e.sync?.(e);           // out of the world until it falls
      ticketFall.parked = e;
      return { inst, e };
    })();
    return ticketFall.ready;
  }
  function unparkTicket() {                                          // the scene was cut off before it fell
    const e = ticketFall.parked; ticketFall.parked = null; ticketFall.want = false; ticketFall.ready = null;
    if (!e || ticketFall.on) return;
    e.body.setEnabled(true); e.object.visible = true; site.world?.wake(e); site.world?.sync(e);
  }
  async function dropTicket(sc, g) {
    const TK = sc.cfg.ticket, K = site.keepsakes, Wd = site.world;
    store.set(ENC.droppedKey, true);
    const spot = g.mid.clone(); spot.z -= TK.behind;
    const screen = stage.toScreen(spot);
    const got = await prepareTicket();
    ticketFall.parked = null; ticketFall.want = false; ticketFall.ready = null;
    if (!got || !Wd) return;
    const { inst, e } = got;
    if (Wd.held?.entry === e) Wd.release();
    if (e.support) site.supports?.detach(e, { wake: false });
    Wd.cancelReturn?.(e);
    e.body.setEnabled(true); e.object.visible = true;
    const grab = e.canGrab;
    const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.08));
    const rest = -Math.min(...inst.colliderVertices.map((v) => v.clone().applyQuaternion(flat).y)) + 0.003;
    const top = stage.onWall(screen.x, -60, spot.z).y, seconds = TK.fall * 60 / (bpmOverride ?? sc.cfg.bpm ?? C.bpm);
    const place = (p, q) => {
      e.body.setTranslation(p, true); e.body.setRotation(q, true);
      e.body.setLinvel({ x: 0, y: 0, z: 0 }, true); e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      Wd.wake(e); Wd.sync(e);
    };
    const land = () => {
      ticketFall.on = false; e.canGrab = grab;
      place(new THREE.Vector3(spot.x, rest, spot.z), flat); Wd.save(e, true); K.saveWorld?.(inst);
      audio.play('paper', { gain: 0.35 });
    };
    if (reducedMotion()) { land(); return; }
    // a leaf's fall: steady, swaying side to side and rocking, edge-on at first and flat by the time it lands. It can't
    // be caught on the way down (canGrab), which also keeps the world from sending it home while it is above the page.
    ticketFall.on = true; ticketFall.t = 0; e.canGrab = false;
    const q = new THREE.Quaternion(), eu = new THREE.Euler(), p = new THREE.Vector3();
    // (unhooked after the frame: never splice the frame list while it is being walked)
    const unhook = () => queueMicrotask(() => { const i = stage.onFrame.indexOf(step); if (i >= 0) stage.onFrame.splice(i, 1); });
    const step = (dt) => {
      if (!ticketFall.on) return;
      if (!K.get('ticket')) { ticketFall.on = false; unhook(); return; }
      ticketFall.t += dt;
      const u = clamp01(ticketFall.t / seconds), w = 1 - u, sway = Math.sin(TAU * 1.25 * u);
      if (u >= 1) { unhook(); land(); return; }
      p.set(spot.x + TK.sway * sway * w, lerp(top, rest, EASE.sineIn(u) * 0.35 + u * 0.65), spot.z);
      q.setFromEuler(eu.set(-Math.PI / 2 + 0.9 * w * w, 0.5 * w, 0.08 + 0.45 * Math.cos(TAU * 1.25 * u) * w));
      place(p, q);
    };
    stage.onFrame.push(step);
  }
  function seek(beats, id = params.get('bmscene') || ORDER[0]) {
    S = buildSchedule(sceneId(id));
    run = newRun(false, S.only); lastDone = null; frozenAt = beats;
    world.auto = false;
  }
  function gagBeat() {
    if (!run) return null;
    if (!run.live) return frozenAt;
    const perfT = performance.now() / 1000 - run.perf0 - C.nudge, ctx = run.ctx;
    if (run.clock !== 'audio' && !run.stalled) {
      // the audio clock wins as soon as it runs, even if it starts late (iOS can take a moment to wake the hardware);
      // until then the performance clock keeps him moving
      if (ctx && ctx.state === 'running' && ctx.currentTime > run.ctxRead + 0.01) run.clock = 'audio';
      else if (run.clock === 'pending' && perfT + C.preroll > 0.4) run.clock = 'performance';
    }
    if (run.clock === 'audio') {
      // a locked phone or a call stops the audio clock: after 1.5 s of no progress, finish on the performance clock
      const now = performance.now() / 1000;
      if (ctx.currentTime !== run.lastCtx) { run.lastCtx = ctx.currentTime; run.lastCtxAt = now; }
      else if (now - (run.lastCtxAt ?? now) > 1.5) { run.clock = 'performance'; run.stalled = true; run.perf0 = now - (run.lastCtx - run.ctxT0) - C.nudge; }
    }
    const t = run.clock === 'audio' ? ctx.currentTime - (ctx.outputLatency || 0) - run.ctxT0 - C.nudge : performance.now() / 1000 - run.perf0 - C.nudge;
    return beatAt(S, t);
  }
  // One-shot events between last frame's beat and this one's: the butter landing, the cat's startles.
  function fireEvents(gb) {
    const from = run.lastGb, cross = (b) => from < b && gb >= b;
    if (S.hitB !== null && cross(S.hitB) && run.live) { world.setButter(true, 'slap'); store.set(SEQ.butterKey, true); run.log.push({ event: 'butter', beat: S.hitB, s: r3(secAt(S, S.hitB)) }); }
    for (const sc of S.scenes) if (sc.cfg.ticket && run.live && cross(sc.start + sc.cfg.ticket.at)) dropTicket(sc, geometry(sc.cfg, run));
    // Buttaman! ("he said his name. three times."): on his third yell in the rise. It was earned when the yell's caption
    // appeared, but the captions are off (C.captions), so it could not be earned at all, nor Platinum Cat (playtest-3).
    for (const sc of S.scenes) {
      const yells = (sc.cfg.captions || []).filter((c) => c.style === 'yell');
      if (yells.length && run.live && cross(sc.start + yells[yells.length - 1].at)) site.achievements?.unlock('buttaman');
    }
    for (const a of S.actions) {
      const cs = a.cfg.catStartle;
      if (!cs || a.cfg.do === 'slap') continue;                       // the slap's startle comes with setButter
      const b = a.start + at(a.cfg, cs.at);
      if (cross(b) && run.live) world.playEmote('startle', 'butterman');
    }
    run.lastGb = gb;
  }
  // The cat during the gag: turned and still for the butter scene (the drag can't move him then).
  function catAt(gb) {
    const cs = catScene();
    const owned = cs && gb !== null && gb >= cs.start - 1 && gb <= cs.end;
    world.setYawTarget(owned ? cs.cfg.cat.yaw : null, run && !run.live ? 1000 : 2.2);
  }

  // -------------------------------------------------------------------------
  // Background cameos: tiny, far behind the cat, until he's been summoned on this device.
  // -------------------------------------------------------------------------
  let cameo = null, lastCameoEnd = performance.now() / 1000, cameoCount = 0;
  const cameoSpb = () => 60 / C.bpm;
  function startCameo(nowS) {
    const K = C.cameo, s = figScale() * K.scale, t = C.strut.turnToCamera, side = K.from === 'right' ? 1 : -1;
    const halfW = (camera.position.z - K.depth) * Math.tan(halfFov()) * camera.aspect;
    const stop = new THREE.Vector3(side * halfW * K.stopAt, GROUND, K.depth);
    const inDir = new THREE.Vector3(-side * Math.cos(t), 0, Math.sin(t)), back = inDir.clone().negate();
    const D = offscreen(stop, back, s), N = Math.max(2, Math.ceil(D / (C.strut.stride * s)));
    cameo = { t0: nowS, stop, s, pin: { start: stop.clone().addScaledVector(back, D), dir: inDir, D, N, S: D / N, yaw: yawOf(inDir) },
      pout: { start: stop.clone(), dir: back, D, N, S: D / N, yaw: yawOf(back) }, stay: Math.max(1, Math.round(K.duration / cameoSpb())) };
    cameoCount++;
  }
  function cameoAt(nowS, dt) {
    const K = C.cameo;
    if (!cameo) {
      const forced = params.get('cameo') === '1' && !cameoCount;
      const allowed = K.on && world.loaded && !store.get(K.storageKey) && nowS - lastCameoEnd > K.minGap && Math.random() < K.chancePerSecond * dt;
      if (forced || allowed) startCameo(nowS); else return null;
    }
    const c = cameo, b = (nowS - c.t0) / cameoSpb(), s = c.s, inB = c.pin.N / SPB(), outB = c.pout.N / SPB();   // walks in beats
    if (b < inB) return walkAlong(c.pin, b, 'linear', -1, s);
    if (b < inB + c.stay) return { pos: c.stop.clone(), yaw: c.pin.yaw, pose: lerpPose(walkPose(0, c.pin.S / s, -1), standPose(-1), smooth((b - inB) / C.strut.blend), 0.1), scale: s };
    const bo = b - inB - c.stay;
    if (bo < 1) return { pos: c.stop.clone(), yaw: lerpAngle(c.pin.yaw, c.pout.yaw, smooth(bo)), pose: lerpPose(standPose(-1), walkPose(0, c.pout.S / s, -1), smooth(bo)), scale: s };
    if (bo < 1 + outB) return walkAlong(c.pout, bo - 1, 'linear', -1, s);
    cameo = null; lastCameoEnd = nowS;
    return null;
  }

  // -------------------------------------------------------------------------
  // Butter whisper (Aaron, 2026-11-09): "constantly playing at 0 volume on loop until you move close". While the cat
  // wears butter his whispered song loops in silence; its loudness follows how near the pointer (or a held finger) is
  // to the butter, fading in and out, and stays very quiet even at its closest. It never restarts.
  // -------------------------------------------------------------------------
  const W = C.whisper, whisper = { loop: null, gain: 0, d: Infinity, heard: 0, replay: null };
  // His own recordings (not the slap or pop effects in a scene) go through the old radio.
  function voiced(file) { return !!C.radio && /assets\/audio\/butterman\//.test(Array.isArray(file) ? file[0] : file); }
  async function replayWhisper() {
    if (run?.live) { ui.say('a moment. he is still singing.');return false; }
    const ctx=audio.context();
    if (!W?.on || !ctx) return false;
    await audio.load(W.file);
    whisper.replay?.stop();
    whisper.loop?.gain(0, 0);whisper.gain=0;
    const source=audio.play(W.file,{gain:W.volume,radio:voiced(W.file)});
    whisper.replay=source;
    if(source)source.onended=()=>{if(whisper.replay===source)whisper.replay=null;};
    return !!source;
  }
  const _bs = {};
  function butterScreen() {
    const sp = cat.seat.position;
    return cat.screenOf([sp.x, sp.y + 0.03 + cat.butterSlot.position.y, sp.z], _bs);
  }
  function whisperAt(dt) {
    if (!W?.on) return;
    const want = cat.butterOn && !cat.hidden && !(run && run.live) && !whisper.replay;
    if (want && !whisper.loop && audio.context() && audio.buffer(W.file)) whisper.loop = audio.loop(W.file, { gain: 0, cross: 0.8, radio: voiced(W.file) });
    if (!whisper.loop) { whisper.gain = 0; return; }
    const ptr = site.input.pointer, b = butterScreen();
    whisper.d = ptr.inside ? Math.hypot(ptr.x - b.x, ptr.y - b.y) : Infinity;
    const k = want ? smooth((W.far - whisper.d) / (W.far - W.near)) : 0;
    const g = k * k * W.volume;                                    // nothing until fairly near, then it rises
    if (Math.abs(g - whisper.gain) > 1e-4) { whisper.gain = g; whisper.loop.gain(g, W.fade); }
    if (k > 0.6) { whisper.heard += dt; if (whisper.heard > 0.5) site.registry.find('whisper'); } else whisper.heard = 0;
    if (!cat.butterOn && whisper.gain === 0) { whisper.loop.stop(0.2); whisper.loop = null; }
  }

  // -------------------------------------------------------------------------
  // The frame: runs after the cat's step, before the render.
  // -------------------------------------------------------------------------
  function update(dt, now) {
    const gb = gagBeat();
    applyLens(run && gb !== null ? lensAt(gb, S) : 0, S.scenes[0]?.cfg.lens?.fov);
    if (run) {
      run.gb = gb;
      catAt(gb);
      if (gb !== null && gb >= 0) {
        if (run.live) fireEvents(gb);
        const fs = figureAt(gb, S, run);
        applyFigure(fs);
        placeFigButter(gb, S, run, fs);
        pushAt(fs);
        if (!run.live && S.hitB !== null && cat.butterOn !== (gb >= S.hitB)) cat.setButter(gb >= S.hitB, 'quiet');   // frozen butter scene: before / after the slap
        if (run.live && gb > S.total + 0.5) finish();
      } else { applyFigure(null); pushAt(null); }
      captionAt(gb, S);
    } else {
      applyFigure(cameoAt(now / 1000, dt));
      captionAt(null, null);
    }
    whisperAt(dt);
  }
  stage.onFrame.push(update);

  // -------------------------------------------------------------------------
  // Leg check (checks/butterman.js): every walk frame of a scene, sampled `perBeat` times a beat, posed and skinned,
  // then measured in figure units. gap: the closest the two leg tubes come below his body (< 0 = they pass through
  // each other). poke: how far a leg tube sticks out through the side or back of his body above its rounded bottom
  // (> 0 = it shows through). Both legs are oval tubes (legDepth front to back).
  // -------------------------------------------------------------------------
  function legScan(id, perBeat = 8) {
    const keep = { S, run, frozenAt };
    S = buildSchedule(sceneId(id));
    run = newRun(false, S.only);
    const res = { scene: S.only, frames: 0, gap: Infinity, gapAt: null, poke: -Infinity, pokeAt: null };
    const P = [[], []], NS = 48, rl = F.leg, q = new THREE.Vector3();
    const rDir = (v) => { const l = Math.hypot(v.x, v.z) || 1; return rl * Math.hypot(F.legDepth * v.x / l, v.z / l); };
    const body = []; 
    for (const a of S.actions) {
      if (!/walk|cross|loop|enter/.test(a.cfg.do)) continue;
      const until = a.until ?? a.end;
      for (let gb = a.start; gb <= until + 1e-9; gb += 1 / perBeat) {
        const fs = figureAt(Math.min(gb, until - 1e-6), S, run);
        if (!fs) continue;
        applyFigure(fs);
        res.frames++;
        const seatY = local(seatN, _e).y;
        body.length = 0;
        for (let k = 0; k <= 40; k++) {
          const t = k / 40, b = curveAt(torso, t, new THREE.Vector3());
          const T = curveAt(torso, Math.min(1, t + 0.01), new THREE.Vector3()).sub(curveAt(torso, Math.max(0, t - 0.01), new THREE.Vector3())).normalize();
          const N = new THREE.Vector3(1, 0, 0).addScaledVector(T, -T.x).normalize(), B = new THREE.Vector3().crossVectors(T, N);
          body.push([b, t, T, N, B]);                                      // the body's centre, its axis and its oval's axes
        }
        for (let i = 0; i < 2; i++) { P[i].length = 0; for (let k = 0; k <= NS; k++) P[i].push(curveAt(legs[i], k / NS, new THREE.Vector3())); }
        // leg against leg, below the body
        for (const p of P[0]) { if (p.y > seatY) continue; for (const r of P[1]) { if (r.y > seatY) continue;
          q.subVectors(r, p); const g = q.length() - 2 * rDir(q);
          if (g < res.gap) { res.gap = g; res.gapAt = `${a.id} beat ${gb.toFixed(2)}`; } } }
        // leg against body: above the body's bottom cap, the leg's outline must stay inside the body's oval
        for (let i = 0; i < 2; i++) for (let k = 0; k <= NS; k++) {
          const p = P[i][k], rr = legs[i].r(k / NS);                     // the tube's own radius there
          if (p.y < seatY) continue;
          const ax = (b) => Math.abs(q.subVectors(p, b[0]).dot(b[2]));   // the body slice this point lies in
          let best = body[0]; for (const b of body) if (ax(b) < ax(best)) best = b;
          if (best[1] < CAP_LO) continue;
          q.subVectors(p, best[0]);
          const w = profile(best[1]), dep = w * F.body.depth, dx = q.dot(best[3]), dz = q.dot(best[4]);
          for (const [ex, ez] of [[dx + rr * F.legDepth, dz], [dx - rr * F.legDepth, dz], [dx, dz + rr], [dx, dz - rr]]) {
            const out = (Math.hypot(ex / dep, ez / w) - 1) * dep;
            if (out > res.poke) { res.poke = out; res.pokeAt = `${a.id} beat ${gb.toFixed(2)} (body t ${best[1].toFixed(2)})`; }
          }
        }
      }
    }
    S = keep.S; run = keep.run; frozenAt = keep.frozenAt;
    applyFigure(null);
    res.gap = r3(res.gap); res.poke = r3(res.poke);
    return res;
  }

  // Exit check (checks/butterman.js): the scene frozen every 1/perBeat beat; every vertex of him projected through the
  // camera. Returns the last moment any of him is in frame and when the scene's clip ends (its decoded length), both in
  // seconds from beat 0, and the lead between them (C.offscreenLead wants it >= the knob).
  function exitScan(id, perBeat = 8) {
    const keep = { S, run, frozenAt };
    S = buildSchedule(sceneId(id));
    run = newRun(false, S.only);
    const v = new THREE.Vector3();
    let last = null;
    for (let gb = 0; gb <= S.total; gb += 1 / perBeat) {
      applyLens(lensAt(gb, S), S.scenes[0].cfg.lens?.fov);
      const fs = figureAt(gb, S, run);
      applyFigure(fs);
      if (!fs) continue;
      let seen = false;
      fig.traverse((m) => {
        if (seen || !m.isMesh || !m.visible) return;
        const a = m.geometry.attributes.position;
        for (let k = 0; k < a.count && !seen; k += 3) {
          v.fromBufferAttribute(a, k).applyMatrix4(m.matrixWorld).project(camera);
          if (v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) seen = true;
        }
      });
      if (seen) last = gb;
    }
    const ends = audioPlan(S).filter((r) => /theme-song|rise-yell/.test(r.file)).map((r) => {
      const buf = audio.buffer(r.src);
      return buf ? r.s + (r.duration ?? buf.duration) / r.rate : null;
    });
    applyLens(0);
    S = keep.S; run = keep.run; frozenAt = keep.frozenAt;
    applyFigure(null);
    const lastS = last === null ? null : secAt(buildSchedule(sceneId(id)), last), clipEnd = ends[0] ?? null;
    return { scene: id, lastBeat: last, lastS: lastS === null ? null : r3(lastS), clipEnd: clipEnd === null ? null : r3(clipEnd),
      lead: lastS === null || clipEnd === null ? null : r3(clipEnd - lastS) };
  }

  // Path check (checks/): a scene frozen every 1/perBeat beat. Returns how near he comes to the cat's axis, how far round
  // the cat he goes, how long he has been perfectly still when the scene ends, and when he is last there against when
  // the clip ends.
  function pathScan(id, perBeat = 16) {
    const keep = { S, run, frozenAt };
    S = buildSchedule(sceneId(id));
    run = newRun(false, S.only);
    let near = Infinity, swept = 0, lastAng = null, last = null, stillSince = null, lastSeen = null, prev = null;
    for (let gb = 0; gb <= S.total + 1e-9; gb += 1 / perBeat) {
      const fs = figureAt(Math.min(gb, S.total), S, run);
      if (!fs) { prev = null; continue; }
      lastSeen = gb;
      const d = Math.hypot(fs.pos.x, fs.pos.z); near = Math.min(near, d);
      const ang = Math.atan2(fs.pos.z, fs.pos.x);
      const looping = S.actions.some((a) => a.cfg.do === 'loop' && gb >= a.start && gb <= a.end);
      if (looping && lastAng !== null) swept += Math.atan2(Math.sin(ang - lastAng), Math.cos(ang - lastAng));
      lastAng = looping ? ang : null;
      const sig = `${fs.pos.x.toFixed(4)},${fs.pos.y.toFixed(4)},${fs.pos.z.toFixed(4)},${fs.yaw.toFixed(4)},${JSON.stringify(fs.pose)}`;
      if (sig !== prev) stillSince = gb;
      prev = sig; last = fs;
    }
    const plan = audioPlan(S).find((r) => /theme-song|rise-yell/.test(r.file)), buf = plan && audio.buffer(plan.src);
    const clipEnd = buf ? plan.s + (plan.duration ?? buf.duration) / plan.rate : null;
    const out = { scene: S.only, nearestToCat: r3(near), turnsRoundCat: r3(swept / TAU), endsAt: last ? [r3(last.pos.x), r3(last.pos.z)] : null,
      stillForS: stillSince === null || lastSeen === null ? 0 : r3(secAt(S, lastSeen) - secAt(S, stillSince)),
      lastSeenS: lastSeen === null ? null : r3(secAt(S, lastSeen)), sceneEndS: r3(secAt(S, S.total)), clipEndS: clipEnd === null ? null : r3(clipEnd) };
    S = keep.S; run = keep.run; frozenAt = keep.frozenAt;
    applyFigure(null);
    return out;
  }

  const state = {
    get mode() { return run ? (run.live ? 'playing' : 'frozen') : lastDone ? 'done' : 'idle'; },
    get scene() { return (run || lastDone)?.scene ?? null; },     // the scene playing (or that played last)
    get next() { return ORDER[nextIndex()]; },                   // what the next B plays on this device
    get seen() { return seenList(); },                            // the round's scenes watched to the end here
    get roundSeen() { return roundSeen(); },                      // all three: every B now plays scene 1
    get history() { return [...history]; },
    get beat() { return run?.gb ?? null; },
    get clock() { return (run || lastDone)?.clock ?? null; },
    get totalBeats() { return S.total; },
    get totalSeconds() { return r3(S.seconds); },
    get scenes() { return S.scenes.map((sc) => ({ id: sc.id, bpm: r3(60 / sc.spb), beats: [sc.start, sc.end], exit: sc.exit, s: [r3(secAt(S, sc.start)), r3(secAt(S, sc.end))], exitS: r3(secAt(S, sc.exit)) })); },
    get schedule() { return S.actions.map((a) => ({ action: a.id, beat: a.start, length: a.cfg.length, s: r3(secAt(S, a.start)) })); },
    get audio() { return audioPlan(S); },
    get log() { return (run || lastDone)?.log ?? []; },
    get scheduled() { return (run || lastDone)?.scheduled ?? []; },
    get hitBeat() { return S.hitB; },
    get hitSeconds() { return S.hitB === null ? null : r3(secAt(S, S.hitB)); },
    get butterOnHead() { return world.butterOn; },
    get cameos() { return { count: cameoCount, active: !!cameo, summoned: store.get(C.cameo.storageKey) === '1' }; },
    get whisper() { return { looping: !!whisper.loop, gain: whisper.gain, distance: whisper.d, replaying: !!whisper.replay }; },
    get figureVisible() { return fig.visible; },
    get figureHeight() { return r3(FIG_H * figScale()); },
    get armStretch() { return r3(armStretch); },                    // the most an arm's ends were apart over its length (<= 1: never stretched)
    get apex() { const g = run?.geo?.butter; return g?.apex ? r3(g.apex.y) : null; },
    get encoreSeen() { return !!store.get(ENC.seenKey); },         // the store flag other modules wait on (C.encore.seenKey)
    get encoreDone() { return encoreDone(); },                      // seen, or its ticket already let go
    get ticketFalling() { return ticketFall.on; },
  };
  const api = {
    find: 'butter', play, seek, replayWhisper, encore, get encoreSeen() { return state.encoreSeen; }, legScan, exitScan, pathScan, config: C, state, buildSchedule, clipsReady, butterScreen, scenes: ORDER, all: ALL,
    again: () => { if (!(run && run.live)) play(); },
    // end the scene now (the checks; a scene cut off this way does not count as played)
    stop() { if (!run) return; if (run.sources) for (const src of run.sources) try { src.stop(); } catch { /* done */ } const live = run.live; if (live) { const keep = run.scene; finish(true); store.set(SEQ.storageKey, String(Math.max(0, ORDER.indexOf(keep)))); } else { run = null; world.setYawTarget(null); } pushAt(null); applyFigure(null); captionAt(null, null); },
    // where his head is on the page and how big (null while he is not there): for things that want to sit on him
    get headAttachment() { return fig.visible ? headBall : null; },
    headScreen() { if (!fig.visible) return null; const p = headBall.getWorldPosition(new THREE.Vector3()), q = stage.toScreen(p); return { x: q.x, y: q.y, r: F.head * fig.scale.y * stage.pxPerUnit(p) }; },
    setBpm(v) { bpmOverride = v; S = buildSchedule(S.only); },
    inspect(id) { if (!run) S = buildSchedule(sceneId(id)); return state; },   // point state's schedule at a scene (checks)
    resetProgress() { store.set(SEQ.storageKey, '0'); site.store.del?.(SEQ.seenKey); },
    get running() { return !!run && run.live; },
  };
  stage.debugExtra.push(() => `butter  ${state.mode}${state.scene ? ' ' + state.scene : ''}  next ${state.next}${run?.gb != null ? ' beat ' + run.gb.toFixed(2) : ''}  cameos ${cameoCount}  whisper ${whisper.gain.toFixed(3)}` + timeline());
  // #debug timeline: the action under the playhead, its scene's beat, and where each clip is (seconds into the file,
  // its offset, and how far the bent grid has moved this beat to follow the singing).
  function timeline() {
    const gb = run?.gb;
    if (gb == null) return '';
    const cur = S.actions.filter((a) => a.start <= gb).pop(), sc = cur?.sceneRef;
    if (!cur) return '';
    const t = secAt(S, gb), seg = segAt(S, gb), bend = followAt(seg, gb);
    let line = `\ngag     ${cur.id}  beat ${(gb - sc.start).toFixed(2)} of ${sc.end - sc.start} @ ${(60 / sc.spb).toFixed(2)} bpm  t ${t.toFixed(2)}s` +
      (seg.follow ? `  follow ${bend >= 0 ? '+' : ''}${(bend * 1000).toFixed(0)}ms` : '');
    for (const row of audioPlan(S)) {
      const pos = (t - row.s) * row.rate, end = row.duration ?? Infinity;
      if (pos < 0 || pos > end) continue;
      const au = S.actions.find((a) => a.id === row.action).cfg.audio;
      line += `\nclip    ${row.file.split('/').pop()}  ${pos.toFixed(2)}s  offset ${au.offset}  x${row.rate}  ${row.status}`;
    }
    return line;
  }
  // URL: #b=12.5 freezes a scene at that beat (the butter scene, or #bmscene=loop|rise|encore).
  stage.onLoaded.push(() => { if (params.has('b')) seek(Number(params.get('b'))); });
  // the B sigil: his next scene (a B while he is on does nothing)
  site.spells.butter = () => { if (!(run && run.live)) play(); };
  window.butterman = api;
  return api;
}
