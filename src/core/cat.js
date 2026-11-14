// The cat. Four still Gaussian-splat poses that pop into each other (e1108-35), turning left and right only (e1107-36).
//
// How he is drawn: he is a still model that only ever changes when he turns, pops or puts something on, so his
// splats are drawn into a picture (a render target the size of his patch of screen) only then. Every frame the page
// just shows that picture on one flat card standing where he is. The idle float, the buoy rock, a hop, the tap
// squash and the shake before a pop all move the card, not the splats, so a cat at rest costs one textured quad.
// Things that sit on him (the butter, a hat) are drawn into the same picture, so they hide behind his ears properly.
//
// Scene graph, picture pass (camera layer 1):  spin (yaw, lifted off the floor) -> pose pivots -> splats
//                                              spin -> seat (the crown of the current pose) -> butter, hat, ...
// Main pass (layer 0):  card (faces the camera at his middle) -> roll -> sprite (the picture)
// Settings: SITE.cat in src/config.js.
import * as THREE from 'three';
import { fetchSplat, makeSplatMesh } from './splats.js';
import { motionScale } from './picture-motion.js';

const TAU = Math.PI * 2;
const rand = ([a, b]) => a + Math.random() * (b - a);
const seg = (u, a, b) => Math.min(1, Math.max(0, (u - a) / (b - a)));
const spring = (x, freq, damp) => Math.exp(-damp * x) * Math.cos(freq * TAU * x);

// A material that is drawn into the cat's picture: three leaves tone mapping and sRGB off for render targets, and the
// picture is kept in display colours (as the splats are stored), so the material does both itself.
export function forPicture(material) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
// the renderer's "neutral" tone curve (Khronos PBR Neutral), written out here because three only includes its own
// when it is drawing to the screen
vec3 pictureTone( vec3 color ) {
  const float start = 0.8 - 0.04, desat = 0.15;
  float x = min( color.r, min( color.g, color.b ) );
  color -= x < 0.08 ? x - 6.25 * x * x : 0.04;
  float peak = max( color.r, max( color.g, color.b ) );
  if ( peak < start ) return color;
  float d = 1.0 - start, newPeak = 1.0 - d * d / ( peak + d - start );
  color *= newPeak / peak;
  return mix( color, vec3( newPeak ), 1.0 - 1.0 / ( desat * ( peak - newPeak ) + 1.0 ) );
}`)
      .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = pictureTone( gl_FragColor.rgb );')
      .replace('#include <colorspace_fragment>', 'gl_FragColor = sRGBTransferOETF( gl_FragColor );');
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => 'picture:' + (key ? key() : '');
  return material;
}

export function createCat(site) {
  const { stage, config } = site, C = config.cat, R = C.rotate, CY = C.cycle;
  const { scene, camera, renderer } = stage;
  const onTap = [], onDrag = [], onPose = [], onPress = [], onButter = [], onPicture = [];

  // ---- the model ----
  const spin = new THREE.Group(); spin.position.y = C.float.lift; scene.add(spin);
  const seat = new THREE.Group(); spin.add(seat);              // the crown of his head, where things sit
  // The middle of his face on the shown pose (the googly eyes, src/world/eyes.js). Moved with the seat at the pop's swap,
  // so what sits on his face follows the new pose the frame it appears, like a hat (playtest-3, physics lane item 1).
  const face = new THREE.Group(); spin.add(face);
  const poses = {};                                            // name -> { pivot, mesh, center }
  const loading = {};
  let current = null, standIn = null;
  // layer 1: drawn into his picture. solid: also layer 2, the things on him that stay solid when he is a hole in space.
  const inPicture = (o, solid = false) => { o.traverse((c) => { c.layers.set(1); if (solid) c.layers.enable(2); }); return o; };
  inPicture(spin);

  function load(name) {
    return (loading[name] ??= (async () => {
      const splat = await fetchSplat(new URL('../../' + C.files[name], import.meta.url).href);
      const mesh = makeSplatMesh(splat), center = splat.box.getCenter(new THREE.Vector3());
      const pivot = new THREE.Group();                         // pops scale about the pose's own middle
      pivot.position.copy(center); mesh.position.copy(center).negate();
      pivot.add(mesh); pivot.visible = false; spin.add(inPicture(pivot));
      return (poses[name] = { pivot, mesh, center, box: splat.box });
    })());
  }
  const seatOf = (name) => (standIn ? standIn.crown : C.crown[name] || [0, 1, 0]);
  let seatLift = 0;                                            // how high what he wears reaches above his crown
  function faceOf(name) {
    if (!standIn?.splat?.box || !standIn.mesh) return C.face[name] || C.face.sit;
    // a stand-in (the bread): the front of its own splat's box, at the box's middle height
    spin.updateWorldMatrix(true, false); standIn.mesh.updateWorldMatrix(true, false);
    const box = standIn.splat.box.clone().applyMatrix4(spin.matrixWorld.clone().invert().multiply(standIn.mesh.matrixWorld)), c = box.getCenter(new THREE.Vector3());
    return [c.x, c.y, box.max.z];
  }
  function placeSeat(name) { const b = seatOf(name), f = faceOf(name); seat.position.set(b[0], b[1], b[2]); face.position.set(f[0], f[1], f[2]); touch(); }
  function show(name) {
    for (const [k, p] of Object.entries(poses)) { p.pivot.visible = k === name && !standIn; p.pivot.scale.setScalar(1); p.mesh.phase = 0; }
    current = name; placeSeat(name);
  }

  // ---- the butter ----
  let butter = null, butterOn = false, butterAnim = null, butterMaker = null, butterOwned = false;
  const butterSlot = new THREE.Group(); seat.add(butterSlot);
  const BUTTER = { size: [0.2, 0.065, 0.13], color: 0xf3d36b, roughness: 0.42 };
  function ensureButter() {
    return (butterMaker ??= (async () => {
      const [{ RoundedBoxGeometry }] = await Promise.all([import('three/addons/geometries/RoundedBoxGeometry.js'), stage.ensureEnv()]);
      const geo = new RoundedBoxGeometry(...BUTTER.size, 4, 0.016);
      butter = new THREE.Mesh(geo, forPicture(new THREE.MeshStandardMaterial({ color: BUTTER.color, roughness: BUTTER.roughness })));
      butter.position.set(0, 0.02, 0); butter.rotation.set(0, 0.25, 0.05); butter.visible = butterOn && !butterOwned;
      butterSlot.add(inPicture(butter, true));
      api.butterGeometry = geo;
      // the same pat for anything that carries one in the main pass (Butterman's hand, the fling)
      api.butterMaterial = new THREE.MeshStandardMaterial({ color: BUTTER.color, roughness: BUTTER.roughness });
      if (!butterOn) stage.warm(butter, 1);        // drawn once ahead, so the slap does not hitch
      stage.warm(butter, 2);                       // and in the galaxy's solid mask pass (no lights there), speed lane e1112-59
      touch();
      return butter;
    })());
  }
  // mode 'drop': it falls on from above; 'slap': it lands where it is, with a squash; 'quiet': it is just there
  function setButter(on, mode = 'drop') {
    butterOn = on;
    if (on) ensureButter().then((b) => { b.visible = butterOn && !butterOwned; touch(); });
    if (butter) butter.visible = on && !butterOwned;
    butterAnim = on && !butterOwned && mode !== 'quiet' ? { t: 0, mode } : null;
    if (on && mode !== 'quiet') trigger('butter');
    for(const f of onButter)f(on,mode);
    touch();
  }

  // ---- the picture ----
  const P = C.picture;
  const rt = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  rt.texture.colorSpace = THREE.NoColorSpace;
  const solids = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true });   // only drawn while something asks (wantSolids)
  let wantSolids = false;
  const card = new THREE.Group(), roll = new THREE.Group();
  const spriteU = { map: { value: rt.texture }, uUv: { value: new THREE.Vector2(1, 1) }, uOpacity: { value: 1 } };
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: spriteU, transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    vertexShader: 'uniform vec2 uUv; varying vec2 vUv; void main() { vUv = uv * uUv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D map; uniform float uOpacity; varying vec2 vUv; void main() { gl_FragColor = texture2D(map, vUv) * uOpacity; }',
  }));
  sprite.frustumCulled = false; sprite.renderOrder = 0;
  roll.add(sprite); card.add(roll); scene.add(card);
  // what the picture must hold, in his own space: every pose at any turn, the pop's overshoot, and what he wears
  const extent = { r: 0.95, bottom: -0.16, top: 1.24, extra: {} };
  const pivot0 = new THREE.Vector3(), pivotPx = {}, rect = { x: 0, y: 0, w: 1, h: 1, k: 1, ppu: 1 };
  let dirty = true, version = 0, lastSig = '', settleAt = 0, renders = 0, quality = P.rest, slowSpin = 0;
  function touch() { dirty = true; version++; }
  function setExtent(key, top) { if (top == null) delete extent.extra[key]; else extent.extra[key] = top; touch(); }

  // Where the card stands and what patch of the screen the picture covers (page pixels, whole numbers).
  function layout() {
    pivot0.set(0, spin.position.y + C.middle, 0);
    stage.toScreen(pivot0, pivotPx);
    const ppu = stage.pxPerUnit(pivot0), top = Math.max(extent.top, ...Object.values(extent.extra));
    const x0 = Math.floor(pivotPx.x - extent.r * ppu), x1 = Math.ceil(pivotPx.x + extent.r * ppu);
    const y0 = Math.floor(pivotPx.y - (top - C.middle) * ppu), y1 = Math.ceil(pivotPx.y + (C.middle - extent.bottom) * ppu);
    Object.assign(rect, { x: x0, y: y0, w: x1 - x0, h: y1 - y0, ppu });
    card.position.copy(pivot0); card.quaternion.copy(camera.quaternion);
    sprite.scale.set(rect.w / ppu, rect.h / ppu, 1);
    sprite.position.set((x0 + rect.w / 2 - pivotPx.x) / ppu, -(y0 + rect.h / 2 - pivotPx.y) / ppu, 0);
  }
  const _vp = new THREE.Vector4();
  function drawPicture(now) {
    layout();
    // speed lane (playtest-2): a pop redraws him every frame for 1.5 s, so it counts as moving too
    const turning = Math.abs(yawRate) > 0.3 || !!scripted || !!pop;
    if (turning) settleAt = now + P.settleMs;
    const moving = now < settleAt;
    // picture pixels per page pixel: sharp at rest; while he turns or pops, only as sharp as the screen, and in a big
    // window only as sharp as the moving-picture pixel budget allows (src/core/picture-motion.js), or less if this
    // machine has shown it cannot keep up
    const want = moving ? Math.min(Math.max(1, stage.dpr * P.moving), motionScale(stage)) / (1 + slowSpin) : Math.max(stage.dpr, P.rest);
    const sig = `${yaw.toFixed(4)}|${version}|${want}|${rect.x},${rect.y},${rect.w},${rect.h}|${camera.fov.toFixed(3)}|${camera.position.z.toFixed(4)}|${stage.dpr}`;
    if (!dirty && sig === lastSig && !pop && !butterAnim) return;
    dirty = false; lastSig = sig; quality = want; renders++;
    for (const f of onPicture) f();
    const full = Math.max(stage.dpr, P.rest), W = Math.ceil(rect.w * full), H = Math.ceil(rect.h * full);
    if (rt.width !== W || rt.height !== H) rt.setSize(W, H);
    const vw = Math.max(1, Math.round(rect.w * want)), vh = Math.max(1, Math.round(rect.h * want));
    rt.viewport.set(0, 0, vw, vh); rt.scissor.set(0, 0, W, H);
    spriteU.uUv.value.set(vw / W, vh / H);
    // the main camera, cropped to his patch of the screen
    const view = camera.view && camera.view.enabled ? { ...camera.view } : null;
    camera.setViewOffset(stage.width, stage.height, rect.x + (view ? view.offsetX : 0), rect.y + (view ? view.offsetY : 0), rect.w, rect.h);
    camera.layers.set(1);
    spin.updateMatrixWorld(true);
    for (const p of Object.values(poses)) if (p.pivot.visible) p.mesh.sortFor(camera);
    if (standIn?.mesh.visible) standIn.mesh.sortFor(camera);
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    if (wantSolids) {
      if (solids.width !== W || solids.height !== H) solids.setSize(W, H);
      solids.viewport.set(0, 0, vw, vh); solids.scissor.set(0, 0, W, H);
      camera.layers.set(2);
      renderer.setRenderTarget(solids); renderer.clear(); renderer.render(scene, camera);
    }
    renderer.setRenderTarget(null);
    camera.layers.set(0);
    if (view) camera.setViewOffset(view.fullWidth, view.fullHeight, view.offsetX, view.offsetY, view.width, view.height); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  stage.onResize.push(touch);

  // ---- the floor shadow ----
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.3, 'rgba(0,0,0,0.7)'); grad.addColorStop(0.6, 'rgba(0,0,0,0.3)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: C.shadow.opacity, color: 0x000000, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; shadow.renderOrder = -5;
  scene.add(shadow);

  // ---- turning ----
  let yaw = stage.params.has('yaw') ? THREE.MathUtils.degToRad(Number(stage.params.get('yaw'))) : R.homeYaw;
  let vel = 0, yawRate = 0, lastYaw = yaw, press = null, lastTouch = performance.now(), holdYaw = stage.params.has('yaw');
  let yawTarget = null, yawTargetSpeed = 3, scripted = null;
  const rotateBy = (d) => { yaw += d; };
  function easeYawTo(t, speed, dt) {
    const d = THREE.MathUtils.euclideanModulo(t - yaw + Math.PI, TAU) - Math.PI;
    rotateBy(d * (1 - Math.exp(-speed * dt)));
  }
  function dragStart(e) {
    if (press || scripted) return;
    press = { id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, t0: e.timeStamp, lastT: e.timeStamp, moved: false };
    vel = 0; holdYaw = false;
    for (const f of onDrag) f('start', press, 0, 0);
  }
  function dragMove(e) {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.lastX, dy = e.clientY - press.lastY;
    if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > R.tapSlop) { press.moved = true; stage.canvas.classList.add('dragging'); }
    if (press.moved && yawTarget === null && !scripted && !press.noSpin) {
      const dt = Math.max((e.timeStamp - press.lastT) / 1000, 1 / 240);
      rotateBy(dx * R.radiansPerPixel);
      vel = 0.6 * vel + 0.4 * (dx * R.radiansPerPixel / dt);
    }
    press.lastX = e.clientX; press.lastY = e.clientY; press.lastT = e.timeStamp; lastTouch = performance.now();
    for (const f of onDrag) f('move', press, dx, dy);
  }
  function dragEnd(e) {
    if (!press || e.pointerId !== press.id) return false;
    let tapped = false;
    if (!press.moved && e.type === 'pointerup' && e.timeStamp - press.t0 < R.tapMs) tapped = tap(e.clientX, e.clientY);
    if (e.timeStamp - press.lastT > 100) vel = 0;
    stage.canvas.classList.remove('dragging');
    const was = press;
    press = null; lastTouch = performance.now();
    for (const f of onDrag) f('end', was, 0, 0);
    return tapped;
  }
  function fling(v) { vel = v; holdYaw = false; lastTouch = performance.now(); }
  // A spin the page does to him (the O sigil): `turns` whole turns in `seconds`, ending on his home angle. It never
  // touches `vel`, so nothing that watches the player's own spinning (the galaxy, the 360) counts it.
  function spinTurns(turns, seconds, done) {
    const from = yaw, home = R.homeYaw + Math.round((yaw - R.homeYaw) / TAU) * TAU;
    scripted = { t: 0, seconds, from, to: home + Math.sign(turns || 1) * Math.abs(turns) * TAU, done };
    vel = 0; holdYaw = false;
  }

  // A directed Hermite turn: preserve the incoming speed, arrive at a whole turn
  // with zero velocity. Choose enough distance to keep the cubic monotone.
  function landFacing(seconds, velocity, cruise) {
    const direction = Math.sign(cruise) || 1, speed = Math.abs(velocity);
    const distance = Math.max(Math.abs(cruise) * seconds / 2, speed * seconds / 3);
    const turns = (yaw + direction * distance) / TAU;
    const to = (cruise === 0 ? Math.round(turns) : direction > 0 ? Math.ceil(turns) : Math.floor(turns)) * TAU;
    scripted = { t: 0, seconds, from: yaw, to, slope: velocity * seconds };
    vel = 0; holdYaw = false; yawTarget = null; turnFx = null;
    return () => { scripted = null; vel = 0; lastTouch = performance.now(); };
  }

  // His hit area: a generous ellipsoid over him (cheap, forgiving, right in any pose).
  const _o = new THREE.Vector3(), _d = new THREE.Vector3();
  function hitTest(x, y) {
    if (!current || hidden.size) return false;
    const ray = stage.ray(x, y), h = C.height;
    const rx = 0.42, ry = h * 0.52, cy = spin.position.y + bobNow + h * 0.5;
    _o.copy(ray.origin); _o.y -= cy; _o.set(_o.x / rx, _o.y / ry, _o.z / rx);
    _d.set(ray.direction.x / rx, ray.direction.y / ry, ray.direction.z / rx);
    const a = _d.dot(_d), b = 2 * _o.dot(_d), c = _o.dot(_o) - 1;
    return b * b - 4 * a * c >= 0;
  }
  let taps = 0, squash = null;
  function tap(x, y) {
    if (!current || (x !== undefined && !hitTest(x, y))) return false;
    taps++;
    squash = { t: 0 };
    let handled = false;
    for (const f of onTap) if (f(taps, x, y) === true) handled = true;   // a gag that takes the tap (the bread) says so
    if (!handled) trigger('tap');
    return true;
  }

  // ---- the pose cycle ----
  let pose = CY.start, target = null, phase = 'hold', route = [], goal = null, held = null, heldBefore = null, holdUntil = Infinity;
  let auto = !stage.reducedMotion, clock = 0, lastSpinEmote = -Infinity, stayUntil = -Infinity;   // stayUntil: cat.stay() (gags lane, playtest 2)
  const emoteLog = [];
  const nextOf = (p, before = heldBefore) => CY.poses[p].after?.[before] ?? CY.poses[p].next;
  function pickWeighted(weights) {
    const options = Object.entries(weights);
    let r = Math.random() * options.reduce((s, [, w]) => s + w, 0);
    for (const [name, w] of options) if ((r -= w) <= 0) return name;
    return options[0][0];
  }
  function pathTo(from, to) {
    const prev = { [from]: null }, queue = [from];
    while (queue.length) {
      const p = queue.shift();
      if (p === to) break;
      for (const n of CY.moves[p]) if (!(n in prev)) { prev[n] = p; queue.push(n); }
    }
    if (!(to in prev)) return [to];
    const path = [];
    for (let p = to; p !== from; p = prev[p]) path.unshift(p);
    return path;
  }
  function enter(p) {
    pose = p; target = null; phase = 'hold';
    if (held !== p) { heldBefore = held; held = p; }
    holdUntil = clock + rand(CY.poses[p].hold);
    for (const f of onPose) f(p, heldBefore);
  }
  function moveTo(next) { phase = 'moving'; target = next; startPop(next); }
  function land() {
    pose = target ?? pose;
    route = goal && goal !== pose ? pathTo(pose, goal) : [];
    if (!route.length) goal = null;
    route.length ? moveTo(route.shift()) : enter(pose);
  }
  const landingPose = () => (phase === 'moving' ? target : pose);
  function request(to) {
    if (!current || !CY.poses[to]) return;
    goal = to;
    if (phase === 'hold') {
      if (to === pose) { goal = null; return; }
      route = pathTo(pose, to);
      moveTo(route.shift());
    }
  }
  function trigger(action) {
    if (action === 'butter') return playEmote('startle', 'butter');
    const map = CY[action];
    if (!map) return null;
    const choice = map[landingPose()] ?? map.default;
    return choice ? playEmote(typeof choice === 'string' ? choice : pickWeighted(choice), action) : null;
  }
  // hop, startle: whole-body moves. spin: a hop with one full turn. wake: a startled pop from sleep to the loaf.
  let hop = null, turnFx = null;
  function playEmote(name, why = name) {
    if (!current || frozen.size) return null;
    if (name === 'spin') {
      if (clock - lastSpinEmote < CY.spinCooldown) return playEmote('hop', why);
      lastSpinEmote = clock;
      hop = { ...C.emotes.hop, t: 0 }; turnFx = { t: 0, turns: 1 };
    } else if (name === 'wake') {
      if (phase !== 'hold') { emoteLog.push(`${why}: wake (skipped, mid pop)`); return null; }
      hop = { ...C.emotes.startle, t: 0 }; moveTo('lie');
    } else if (C.emotes[name]) hop = { ...C.emotes[name], t: 0 };
    else return null;
    if (phase === 'hold') holdUntil += 0.5;
    emoteLog.push(`${why}: ${name} (in ${phase} ${pose})`); if (emoteLog.length > 30) emoteLog.shift();
    return name;
  }

  // ---- the pop ----
  let pop = null, heldPop = null;
  const hidden = new Set(), frozen = new Set(), shadowOff = new Set();
  const quiet = (a, b) => C.noShake.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  function startPop(to) {
    if (pop) finishPop();
    if (frozen.size) { heldPop = to; load(to); return; }
    const noShake = quiet(current, to);
    // no shake: the pop starts where the shake would have ended
    pop = { from: current, to, t: noShake ? C.pop.out[0] * C.pop.seconds : 0, noShake, swapped: false };
    // A pose that cannot load would keep him in the pre-pop shake for good: give the pop up and stay as he is
    // (a later pop tries the file again).
    load(to).catch(() => { delete loading[to]; if (pop?.to === to && !poses[to]) abandonPop(); });
  }
  function abandonPop() {
    const A = poses[pop.from];
    if (A) { A.mesh.phase = 0; A.pivot.scale.setScalar(1); A.pivot.visible = !standIn; }
    pop = null; shakeRoll = shakeX = 0; goal = null; route = [];
    target = null; enter(current);
  }
  function finishPop() {
    const to = pop.to;
    pop = null;
    if (poses[to]) show(to);
    land();
  }
  let shakeRoll = 0, shakeX = 0;
  function stepPop(dt) {
    const Pp = C.pop, A = poses[pop.from], B = poses[pop.to], T = Pp.seconds;
    pop.t += dt;
    if (!B) pop.t = Math.min(pop.t, Pp.shakeEnd * T);           // the next pose is still loading: keep shaking
    const u = Math.min(1, pop.t / T);
    const s = seg(u, 0, Pp.shakeEnd), amp = s < 1 && !pop.noShake ? Pp.shakeDeg * Math.PI / 180 * Math.sin(s * Math.PI / 2) : 0;
    shakeRoll = Math.sin(pop.t * TAU * Pp.shakeHz) * amp;
    shakeX = Math.sin(pop.t * TAU * Pp.shakeHz * 1.3 + 1) * amp * 0.06;
    const o = seg(u, Pp.out[0], Pp.out[1]);
    if (A && !standIn) { A.mesh.phase = o * o; A.pivot.scale.setScalar(1 - 0.35 * o * o); A.pivot.visible = o < 1; }
    if (B && u >= Pp.in[0]) {
      if (!pop.swapped) { pop.swapped = true; B.pivot.visible = !standIn; placeSeat(pop.to); }
      const i = seg(u, Pp.in[0], Pp.in[1]);
      B.mesh.phase = (1 - i) * (1 - i);
      const k = seg(u, Pp.in[0], 1);
      const sc = k < 0.25 ? Pp.overshoot * (1 - (1 - k / 0.25) ** 2) : 1 + (Pp.overshoot - 1) * spring((k - 0.25) / 0.75, 1.4, 4);
      B.pivot.scale.setScalar(Math.max(0.01, sc));
    }
    if (u >= 1) { shakeRoll = shakeX = 0; finishPop(); }
  }

  // ---- each frame ----
  let bobNow = 0, buoyClock = 0, still = 1;
  const fx = { x: 0, y: 0, scale: 1, rot: 0, opacity: 1 };      // an egg's own extra move of the card (the blast-off)
  function update(dt, now) {
    if (!current) return;
    clock += dt;
    // turning
    if (scripted) {
      scripted.t += dt;
      const u = Math.min(1, scripted.t / scripted.seconds), e = u * u * (3 - 2 * u);
      yaw = scripted.from + (scripted.to - scripted.from) * e + (scripted.slope || 0) * u * (1 - u) ** 2;
      if (u >= 1) { const d = scripted.done; scripted = null; lastTouch = performance.now(); d?.(); }
    } else if (yawTarget !== null) { vel = 0; easeYawTo(yawTarget, yawTargetSpeed, dt); }
    else if (!press && !holdYaw) {
      if (Math.abs(vel) > 1e-3) { rotateBy(vel * dt); vel *= Math.exp(-R.damping * dt); }
      else if (R.returnHome && !frozen.size && performance.now() - lastTouch > R.returnDelay * 1000) easeYawTo(R.homeYaw, R.returnSpeed, dt);
    }
    if (turnFx) {                                               // the spin emote: one full turn while he hops
      turnFx.t += dt;
      const u = Math.min(turnFx.t / 0.75, 1);
      turnFx.add = TAU * turnFx.turns * (u * u * (3 - 2 * u));
      if (u >= 1) turnFx = null;
    }
    const shownYaw = yaw + (turnFx ? turnFx.add : 0);
    if (dt > 0) yawRate = (shownYaw - lastYaw) / dt;
    lastYaw = shownYaw;
    spin.rotation.y = shownYaw;
    // the cycle
    if (auto && phase === 'hold' && clock > holdUntil && clock > stayUntil && !frozen.size && !standIn) moveTo(pickWeighted(nextOf(pose)));
    if (pop) stepPop(dt);
    if (butterAnim && butter) {
      butterAnim.t += dt;
      const u = Math.min(butterAnim.t / 0.5, 1), bounce = 1 + Math.sin(u * Math.PI) * (butterAnim.mode === 'slap' ? 0.4 : 0.25) * (1 - u);
      butter.position.y = 0.02 + (butterAnim.mode === 'slap' ? 0 : (1 - u) ** 2 * 0.25);
      butter.scale.set(bounce, 2 - bounce, bounce);
      if (u >= 1) { butterAnim = null; touch(); }
    }
    // the card: float, buoy, hop, squash, shake. None of this redraws his splats.
    // frozen: he settles level and still over a third of a second (the galaxy's mask needs him square to the page)
    still += ((frozen.size ? 0 : 1) - still) * Math.min(1, dt * 9);
    const calm = (stage.reducedMotion ? 0.3 : 1) * still, F = C.float, B = C.buoy, d2r = Math.PI / 180;
    if (!frozen.size) buoyClock += dt;
    bobNow = Math.sin(buoyClock * TAU / F.period) * F.bob * calm;
    let rollZ = Math.sin(buoyClock * TAU / B.periods[0]) * B.rollDeg * d2r * calm + shakeRoll;
    let y = bobNow + Math.sin(buoyClock * TAU / B.periods[1] + 1.3) * B.nod * calm, x = shakeX;
    if (hop) {
      hop.t += dt;
      const k = Math.min(1, hop.t / hop.seconds);
      y += Math.sin(k * Math.PI) * hop.height * C.height;
      if (hop.shakeDeg) rollZ += Math.sin(hop.t * TAU * 9) * (1 - k) * hop.shakeDeg * d2r;
      if (k >= 1) hop = null;
    }
    let sx = 1, sy = 1;
    if (squash) {
      squash.t += dt;
      const s = Math.exp(-squash.t * 7) * Math.sin(squash.t * 28) * 0.12;
      sx = 1 + s; sy = 1 - s;
      if (squash.t > 0.8) squash = null;
    }
    // rock about his middle; squash with his feet planted
    roll.rotation.z = rollZ + fx.rot;
    roll.scale.set(sx * fx.scale, sy * fx.scale, 1);
    roll.position.set(x + fx.x, y + fx.y - C.middle * (1 - sy), 0);
    spriteU.uOpacity.value = fx.opacity;
    sprite.visible = !hidden.size;
    // shadow: under him, smaller and fainter as he rises
    const lift = F.lift + y + Math.max(0, fx.y);
    shadow.visible = !shadowOff.size && fx.opacity > 0.02;
    shadow.material.opacity = C.shadow.opacity * Math.max(0, 1 - lift * 1.5) * fx.opacity;
    const sh = C.height * C.shadow.scale * Math.max(0.2, 1 - lift * 0.6) * (standIn ? standIn.shadow ?? 1 : 1);
    shadow.scale.set(1.25 * sh, 0.75 * sh, 1);
    shadow.position.x = fx.x;
  }
  stage.onFrame.push(update);
  stage.onRender.push((dt, now) => { if (current && !hidden.size) drawPicture(now); else layout(); });
  // a spin this machine cannot keep up with: draw the turning picture a step coarser from then on
  let spinFrames = 0, spinMs = 0;
  stage.onFrame.push((dt) => {
    if (Math.abs(yawRate) < 1 || dt <= 0) { if (spinFrames > 30 && spinMs / spinFrames > 21 && slowSpin < 1) slowSpin += 0.5; spinFrames = spinMs = 0; return; }
    spinFrames++; spinMs += dt * 1000 / (stage.timeScale || 1);
  });

  // Page pixels of a point given in his own space (x, y up from his feet, z toward his face), as he is turned now.
  const _p = new THREE.Vector3(), _s = {};
  function screenOf(local, out = {}) {
    _p.set(local[0], local[1], local[2]).applyAxisAngle(THREE.Object3D.DEFAULT_UP, spin.rotation.y);
    _p.y += spin.position.y;
    stage.toScreen(_p, _s);
    // then the card's own move (scale, rock about his middle, shift), in card units with y up
    const lx = (_s.x - pivotPx.x) / rect.ppu * roll.scale.x, ly = -(_s.y - pivotPx.y) / rect.ppu * roll.scale.y;
    const c = Math.cos(roll.rotation.z), sn = Math.sin(roll.rotation.z);
    out.x = pivotPx.x + (lx * c - ly * sn + roll.position.x) * rect.ppu;
    out.y = pivotPx.y - (lx * sn + ly * c + roll.position.y) * rect.ppu;
    out.facing = Math.cos(spin.rotation.y + Math.atan2(local[0], local[2]));   // > 0: that side of him is toward the camera
    return out;
  }

  const api = {
    THREE, spin, seat, face, butterSlot, poses, config: C, card, sprite, shadow, fx,
    onTap, onDrag, onPose, onPress, onButter, onPicture,
    get loaded() { return !!current; }, get height() { return C.height; },
    get pose() { return pose; }, get shown() { return current; }, get phase() { return phase; }, get popping() { return !!pop; },
    get auto() { return auto; }, set auto(v) { auto = v; if (v && phase === 'hold') holdUntil = Math.min(holdUntil, clock + rand(CY.poses[pose].hold)); },
    get heldBefore() { return heldBefore; }, get emoteLog() { return [...emoteLog]; }, nextPose: (p, before) => pickWeighted(nextOf(p, before)),
    // Keep his pose for at least this long (no idle pose change): a whisker pluck asks for 4 s (gags lane, playtest 2).
    stay(seconds) { stayUntil = Math.max(stayUntil, clock + seconds); }, get staying() { return clock <= stayUntil; },
    get yaw() { return yaw; }, get vel() { return vel; }, get yawRate() { return yawRate; }, get pressing() { return !!press; }, get taps() { return taps; },
    get scripted() { return !!scripted; },
    get butterOn() { return butterOn; }, get butter() { return butter; },
    get picture() { return rt.texture; }, get solids() { return solids.texture; },
    get wantSolids() { return wantSolids; }, set wantSolids(v) { wantSolids = v; touch(); }, get rect() { return rect; }, get uv() { return spriteU.uUv.value; }, get quality() { return quality; },
    get renders() { return renders; }, get sorts() { return Object.values(poses).reduce((n, p) => n + p.mesh.sorts, 0); },
    get shake() { return shakeRoll; }, get popInfo() { return pop ? { from: pop.from, to: pop.to, noShake: pop.noShake } : null; },
    get bob() { return bobNow; }, get rollNow() { return roll.rotation.z; }, get pivotPx() { return pivotPx; },
    load, request, playEmote, trigger, setButter, ensureButter, rotateBy, tap, hitTest, dragStart, dragMove, dragEnd, fling, spinTurns, landFacing,
    landingPose, screenOf, touch, setExtent, inPicture,
    setYaw(rad) { yaw = rad; holdYaw = true; },
    setYawTarget(t, speed = 3) { yawTarget = t; yawTargetSpeed = speed; if (t === null) lastTouch = performance.now(); },
    // where his crown is in the scene when he is turned to `atYaw` (Butterman aims his slap here)
    crownWorld(atYaw = spin.rotation.y, out = new THREE.Vector3()) {
      return out.copy(seat.position).applyAxisAngle(THREE.Object3D.DEFAULT_UP, atYaw).setY(seat.position.y + spin.position.y + 0.02 + seatLift);
    },
    // how high a worn hat reaches above his crown (the butter goes under it)
    get seatLift(){return seatLift;},
    ownButterPresentation(on=true) { butterOwned=on;if(butter)butter.visible=butterOn&&!on;butterAnim=null;touch(); },
    // the height of what he wears on his crown (a hat). The butter stays on his head, under a hat (e1111-58).
    setSeatLift(v) { seatLift = v; touch(); },
    // Hide him for a moment (the box, space); hideShadow hides only his shadow.
    hide(reason, on) { on ? hidden.add(reason) : hidden.delete(reason); touch(); },
    hideShadow(reason, on) { on ? shadowOff.add(reason) : shadowOff.delete(reason); },
    get hidden() { return hidden.size > 0; },
    // Freeze him as he is (the galaxy): no float, no hops, pose changes wait until he thaws. A pop under way lands first.
    freeze(reason, on) {
      if (on === frozen.has(reason)) return;
      if (on) { if (pop) finishPop(); frozen.add(reason); return; }
      frozen.delete(reason);
      if (!frozen.size && heldPop) { const h = heldPop; heldPop = null; startPop(h); }
    },
    get frozen() { return frozen.size > 0; },
    // Something else stands where he is, drawn into his picture (the bread): { mesh (a splat mesh under a group), crown, shadow }.
    setStandIn(s) {
      if (standIn) spin.remove(standIn.group);
      standIn = s;
      if (s) spin.add(inPicture(s.group));
      for (const [k, p] of Object.entries(poses)) p.pivot.visible = !s && k === current;
      placeSeat(current);
    },
    get standIn() { return standIn; },
    // boot: his first pose (and the butter, if he kept it), then he is shown; the other poses follow
    async start(first) {
      const name = CY.poses[first] ? first : CY.start;
      await load(name);
      pose = name; show(name); enter(name);
      stage.onLoaded.push(() => { (async () => { for (const n of Object.keys(C.files)) await load(n).catch(() => {}); })(); });
    },
  };
  stage.perfExtra.push(() => `picture ${rt.width}×${rt.height} at ${quality.toFixed(2)}×, ${renders} draws, ${api.sorts} sorts${slowSpin ? ', coarse spin ' + slowSpin : ''}`);
  stage.debugExtra.push(() => `pose    ${phase} ${pose}${target ? ' -> ' + target : ''}  next in ${phase === 'hold' && auto ? Math.max(0, holdUntil - clock).toFixed(1) + ' s' : '-'}\nyaw     ${yaw.toFixed(2)}  vel ${vel.toFixed(2)}  butter ${butterOn}  taps ${taps}`);
  return api;
}
