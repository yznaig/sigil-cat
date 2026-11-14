// The light bulb sequence (e1111-35). The first sigil anyone draws gives him an idea: a lit bulb pops up over his head,
// he gives a little shake, and the sigil's own effect follows about two seconds later. Click the bulb and it goes out
// and drops to the floor. It lights again only when a bolt strikes the puddle while the bulb lies in it; then a
// lampshade appears on the rack (or arrives with the rack, if that is still to come), and dragging the glowing bulb into
// the shade lights the lamp. Every stage is saved: lamp.stage = idea | dropped | lit | lamp.
// The bulb is one physical world body throughout (the prepared bulb art). While it hovers it is kinematic and follows
// his crown; that hover and the bounded fall/glow/grow tweens are the only per-frame work in the whole sequence.
// window event `sigilcat:lamp-lit` ({detail:{first, by}}) fires whenever someone lights the lamp (never on a reload).
// Playtest 2: the struck bulb is a UV bulb. The idea over his head is still the warm cartoon bulb; once lightning has
// charged it, it glows violet, lying loose or in the lamp, and the lit lamp shows a smiley someone drew on the floor in
// invisible ink, down and to the right of the lamp (a quiet secret: no achievement, no line). It exists only while the
// lamp is lit and costs nothing otherwise.
import {createMeshPicture} from '../core/mesh-picture.js';
import {prepareArt,preparedShapes,pickMesh,resizeProp} from './rack-art.js';
import {createLampshade,SHADE} from './lampshade.js';
import {smooth} from '../core/util.js';
export const LAMP = {
  hold: 2,                                  // seconds from the bulb popping up to the first sigil's effect
  wait: 3,                                  // the longest the first cast waits for the bulb to load, then plays anyway
  hover: .13,                               // cat-heights between his crown (or his hat, or the butter) and the bulb
  bob: {height: .012, period: 2.3, rock: .07, rockPeriod: 3.4},
  pop: .45,                                 // seconds for the bulb to pop up (springy)
  big: 1.7,                                 // the idea is drawn this much larger than the real bulb; it shrinks as it falls
  rays: 1.1,                                // seconds the cartoon 'idea' rays flare round it when it pops up
  fall: {seconds: .7, side: .5, front: .36},// its arc off his head: time, how far to his side and toward you (cat-heights)
  dim: .3,                                  // seconds for the idea's glow to go out when it is clicked
  warm: .8,                                 // seconds for the struck bulb to warm up (one smooth rise, no flicker)
  loose: .85,                               // how bright a charged bulb glows lying loose (the lamp is 1)
  grow: .5,                                 // seconds for the lampshade to grow onto the rack
  fitPad: 30,                               // px around the shade that still counts as dropping the bulb into it
};
const STAGES = ['idea', 'dropped', 'lit', 'lamp'];
const BULB = 1.3;   // the prepared bulb, a little larger than the rack's own scale so it reads on a phone; it still fits the socket
const springOut = (u) => (u >= 1 ? 1 : 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2);   // ease out, a little overshoot
export function createLamp(site, rack) {
  const {THREE: T, stage, world, keepsakes, supports, store, cat, audio} = site, L = LAMP;
  let late = false, warmCopy = null, rays = null, raysOn = false, inst = null, fill = null, halo = null, shade = null, hovering = false, hoverT = 0, popT = 1, glow = 0, sprite = null, fitting = false;
  const stats = {casts: 0, held: 0, knocks: 0, strikes: 0, charged: 0, lit: 0, grown: 0, heldMs: 0};
  const rank = () => STAGES.indexOf(store.get('lamp.stage')) + 1;
  const setStage = (s) => { if (STAGES.indexOf(s) + 1 > rank()) store.set('lamp.stage', s); };
  const v = new T.Vector3(), q = new T.Quaternion(), zAxis = new T.Vector3(0, 0, 1);
  function occupied() { return inst?.worldEntry?.support?.id === 'rack-lamp'; }
  function isOn() { return !!inst?.worldEntry?.adapterState?.on; }
  const lampLit = () => occupied() && isOn();
  // How bright the bulb itself is: the idea over his head, the lamp, or a charged bulb lying loose.
  function target() { if (hovering) return 1; if (occupied()) return isOn() ? 1 : 0; return rank() >= 3 ? L.loose : 0; }
  // UV once charged (rank lit or lamp), warm only as the idea over his head.
  const uv = () => !hovering && rank() >= 3;
  function paint() {
    if (!inst?.art) return;
    const g = glow, u = uv(), mats = [...inst.art.visual.material, ...(inst.picture?.materials || [])];
    for (const m of mats) {
      if (m.name === 'lamp-filament') { m.emissive.set(g > 0 ? (u ? 0xb070ff : 0xff9c35) : 0); m.emissiveIntensity = 3 * g; }
      if (m.name === 'lamp-envelope') { m.emissive.set(g > 0 ? (u ? 0x8a4dff : 0xffbf5e) : 0); m.emissiveIntensity = 1.15 * g; m.opacity = .24 + .46 * g; }
    }
    if (sprite) { sprite.visible = g > .01 && !occupied(); sprite.material.opacity = .9 * g; sprite.material.map = u ? uvTexture(T) : glowTexture(T); sprite.material.color.set(u ? 0xffffff : 0xffd9a8); }
    if (occupied()) rack.invalidate(); else { inst.picture?.invalidate(); inst.picture?.draw(); }
  }
  function changed() {
    if (!inst?.worldEntry) return;
    const lit = lampLit();
    glow = target(); paint();
    shade?.lit(lit ? 1 : 0); if (fill) fill.intensity = lit ? .35 : 0; if (halo) halo.visible = lit; smiley(lit);
    const button = rack.ui?.querySelector('.rack-light');
    if (button) {
      button.hidden = !(rank() >= 3 && shade);
      button.textContent = occupied() ? (lit ? 'Off' : 'On') : 'Fit bulb'; button.setAttribute('aria-pressed', String(lit));
      button.setAttribute('aria-label', occupied() ? (lit ? 'Turn lamp off' : 'Turn lamp on') : 'Fit the bulb in the lampshade');
    }
    rack.invalidate(); world.save(inst.worldEntry);
  }
  function glowTo(to, seconds) {
    const from = glow;
    if (stage.reducedMotion || seconds <= 0) { glow = to; paint(); return Promise.resolve(); }
    return stage.tween(seconds, (u) => { glow = from + (to - from) * smooth(u); paint(); });
  }
  function lampOn(value, by) {
    if (!inst?.worldEntry) return false;
    const was = lampLit(); inst.worldEntry.adapterState.on = !!value; changed();
    if (!was && lampLit() && by) {
      const first = rank() < 4; setStage('lamp'); stats.lit++;
      audio.play('click', {gain: .55});
      window.dispatchEvent(new CustomEvent('sigilcat:lamp-lit', {detail: {first, by}}));
    }
    return true;
  }

  // ---- the lampshade, on the rack's socket ----
  // Built with the rack when the bulb is already charged, or grown onto a rack that is already standing.
  function furnish(composite, socket) {
    // Speed lane (e1112-59): the lamp's light is in the rack's picture from its first build, at zero until the lamp
    // is lit. A light that appears changes every lit material's shader in that picture (the rack, its hats, the
    // shade, the bulb): turning the lamp on the first time rebuilt them all live, a 4-6 s freeze headless.
    if (!fill) { fill = new T.PointLight(0x9a5cff, 0, .8, 2); fill.castShadow = false; }   // the UV lamp's violet (gags lane)
    if (fill.parent !== composite) composite.add(fill);
    if (shade || rank() < 3) return;
    const s = rack.rackScale;
    shade = createLampshade(T); shade.group.scale.setScalar(s); shade.group.position.copy(socket); composite.add(shade.group);
    // the lamp's light: a small warm fill (no shadow) and a soft halo, inside the rack's cached picture
    const middle = socket.clone(); middle.y += (SHADE.lift + SHADE.height * .5) * s;
    fill.position.copy(middle); if (fill.parent !== composite) composite.add(fill);
    if (inst?.art) warmLit(inst.art.visual);
    halo = new T.Sprite(new T.SpriteMaterial({map: uvTexture(T), transparent: true, depthWrite: false, color: 0xffffff, opacity: .85}));
    halo.position.copy(middle); halo.scale.set(.32, .27, 1);   // inside the rack picture's bounds halo.visible = false; composite.add(halo);
    // the shade's own floor shadow joins the rack's soft shadow
    const proxy = pickMesh(T, shade.shell); proxy.name = 'rack-shadow/shade'; proxy.matrixAutoUpdate = false;
    proxy.matrix.compose(socket, new T.Quaternion(), new T.Vector3(s, s, s)); rack.root?.add(proxy);
    site.worldLayout.invalidateShadow('rack', {geometry: true});
    changed();
  }
  rack.furnish.push(furnish);
  async function growShade(animate = true) {
    if (shade || !rack.task) return false;
    await rack.task; const socket = supports.registry.get('rack-lamp')?.slots[0].position;
    if (shade || !socket) return false;
    furnish(rack.picture.visual, new T.Vector3(...socket)); if (!shade) return false;
    stats.grown++; if (animate) audio.play('tap-pop', {gain: .45, rate: .9});
    if (animate && !stage.reducedMotion) {
      const s = rack.rackScale;
      await stage.tween(L.grow, (u) => { const k = springOut(u); shade.group.scale.set(s * k, s * Math.min(1, u * 4) * k, s * k); rack.invalidate(); });
      shade.group.scale.setScalar(s);
    }
    rack.invalidate(); changed(); return true;
  }

  // ---- the invisible-ink smiley (playtest 2) ----
  // A floor decal down and to the right of the lamp: a soft violet pool where the UV light falls, and in it a wobbly,
  // badly drawn smiley that glows only there. Built the first time the lamp is lit; hidden (not drawn) while it is off.
  let ink = null, inkFade = null, inkOn = false;
  const SMILEY = {w: 1.25, d: .8, offset: [.42, .3], fade: .6};
  function placeSmiley() {
    if (!ink || !rack.root) return;
    rack.root.updateMatrixWorld(true);
    const socket = supports.registry.get('rack-lamp')?.slots[0].position; if (!socket) return;
    const lamp = rack.root.localToWorld(new T.Vector3(...socket));
    // the decal's left edge starts under the lamp; the smiley sits in its right half
    ink.position.set(lamp.x + SMILEY.offset[0], .004, lamp.z + SMILEY.offset[1]);
  }
  function smiley(on) {
    if (!on && !ink) return;
    if (!ink) {
      ink = new T.Mesh(new T.PlaneGeometry(SMILEY.w, SMILEY.d), new T.MeshBasicMaterial({map: inkTexture(T), transparent: true, depthWrite: false, toneMapped: false, opacity: 0}));
      ink.rotation.x = -Math.PI / 2; ink.renderOrder = -7; ink.frustumCulled = false; ink.name = 'uv-smiley'; ink.raycast = () => {};
      stage.scene.add(ink); stage.onResize.push(placeSmiley);
    }
    placeSmiley();
    if (on === inkOn) return; inkOn = on;          // changed() runs often; only a real switch starts a fade
    const to = on ? 1 : 0, m = ink.material, from = m.opacity, token = inkFade = {};
    if (on) ink.visible = true;
    if (stage.reducedMotion || from === to) { m.opacity = to; ink.visible = on; return; }
    stage.tween(SMILEY.fade, (u) => { if (inkFade !== token) return; m.opacity = from + (to - from) * smooth(u); if (u >= 1 && !on) ink.visible = false; });
  }

  // ---- the bulb ----
  async function bulbArt() {
    const {create: createBulb, physics} = await import('../../assets/models/prepared/bulb.js'); const g = createBulb();
    for (const o of g.children) if (o.material.isMeshPhysicalMaterial) o.material.name = 'lamp-envelope';
    for (const o of g.children) if (o.material.emissiveIntensity === 0 && o.material.emissive && o.material.color.getHexString() === 'e0a44d') o.material.name = 'lamp-filament';
    return {art: prepareArt(T, g, rack.rackScale * BULB), physics};
  }
  // Speed lane (e1112-59): in the lamp the bulb is drawn in the rack's picture, lit by the lamp's own light, a shader
  // variant of its own (the envelope's two passes cost ~0.6 s the first time the lamp went on). Drawn once ahead, off
  // screen, in a scene lit the same way (the page's lights, one point light, the room light); shares the materials.
  // Only once there is a lampshade to light (not during the first sigil's idea, which it would make stutter).
  let litWarmed = null;
  function warmLit(visual) {
    if (litWarmed === visual) return; litWarmed = visual;
    stage.warm(async function bulbLit() {
      const scene = new T.Scene(), copy = visual.clone(), rt = new T.WebGLRenderTarget(4, 4, {depthBuffer: true}), r = stage.renderer;
      for (const o of stage.scene.children) if (o.isLight) scene.add(o.clone());
      scene.add(new T.PointLight(0x9a5cff, 0, .8, 2)); scene.environment = stage.scene.environment; scene.environmentIntensity = stage.scene.environmentIntensity;
      scene.add(copy); copy.position.set(0, .5, 0); copy.updateMatrixWorld(true);
      try { await r.compileAsync(scene, stage.camera); const old = r.getRenderTarget(); r.setRenderTarget(rt); r.render(scene, stage.camera); r.setRenderTarget(old); } finally { rt.dispose(); }
    });
  }
  const glowSprite = (opacity) => new T.Sprite(new T.SpriteMaterial({map: glowTexture(T), transparent: true, depthWrite: false, depthTest: false, color: 0xffd9a8, opacity}));
  function create(i) {
    inst = i; i.physical = true; const root = new T.Group();
    i.worldTask = (async () => {
      await world.ensure(); await stage.ensureEnv();
      const {art, physics} = await bulbArt(), p = createMeshPicture(site, root, art.visual, art.vertices);
      i.art = art; i.picture = p; if (shade) warmLit(art.visual); i.colliderVertices = art.vertices; i.colliderShapes = preparedShapes(T, physics, rack.rackScale * BULB); root.add(pickMesh(T, art.visual));
      // the glow round a lit bulb that is not in the lamp (over his head, or charged on the floor); hidden with its body
      sprite = glowSprite(0);
      sprite.position.y = .125 * rack.rackScale * BULB; sprite.scale.set(.2, .2, 1); sprite.renderOrder = 499; sprite.visible = false; sprite.raycast = () => {}; root.add(sprite);
      rays = new T.Sprite(new T.SpriteMaterial({map: raysTexture(T), transparent: true, depthWrite: false, depthTest: false, opacity: 0}));
      rays.position.copy(sprite.position); rays.renderOrder = 499; rays.visible = false; rays.raycast = () => {}; root.add(rays);
      const home = () => { const at = site.worldLayout.anchor(Math.min(stage.width - 40, cat.rect.x + cat.rect.w + 20)); at.y = .3; return at; };
      const saved = store.get('worldBodies.bulb'); i.mass = physics.mass; i.physicsMaterial = {friction: .65, restitution: .12, linearDamping: .3, angularDamping: 1, skin: .001};
      const e = await world.add({id: 'bulb', object: root, shapes: i.colliderShapes, mass: physics.mass, persist: true, presentation: p, position: home(), resize: resizeProp(site, art.vertices), adapterState: saved?.adapter || {version: 1, on: false},
        material: i.physicsMaterial, sound: {material: 'glass', size: 'small'},
        sync(e) { i.resting = !!e.support || e.body.isSleeping(); p.draw(); keepsakes.syncWorld(i, p.rect); if (!hovering) site.worldLayout.shadow(i); },
        rest: () => keepsakes.saveWorld(i), tap: () => tapped(), home});
      i.worldEntry = e; i.worldReady = true; e.gripHeight = .1; warmCopy?.();
      e.dropped = (ev) => intoShade(ev) || intoPuddle(ev);
      if (rank() === 1 && !e.support) hover(!!i.fresh); else { glow = target(); paint(); }
      changed(); world.sync(e); keepsakes.saveWorld(i); return e;
    })().catch((error) => { i.worldError = String(error); console.error('world bulb', error); });
    return root;
  }
  // Over his head: kinematic, following his crown (and whatever he wears on it), bobbing a little. Never grabbed.
  function crownPoint(out) {
    const s = cat.seat.position, lift = cat.seatLift + (cat.butterOn && !cat.seatLift ? .05 : 0) + L.hover * cat.height;   // the butter sits under a worn hat (seatLift already counts it)
    const at = cat.screenOf([s.x, s.y + lift, s.z]);
    return stage.onWall(at.x, at.y, 0, out);
  }
  function hoverFrame(dt) {
    const e = inst?.worldEntry; if (!e || !hovering) return;
    if (e.object.visible === cat.hidden) e.object.visible = !cat.hidden;          // he is away (the box, space): so is his idea
    hoverT += dt; popT = Math.min(1, popT + dt / L.pop);
    const calm = stage.reducedMotion ? 0 : 1, b = L.bob;
    crownPoint(v); v.y += Math.sin(hoverT * Math.PI * 2 / b.period) * b.height * calm;
    q.setFromAxisAngle(zAxis, Math.sin(hoverT * Math.PI * 2 / b.rockPeriod) * b.rock * calm);
    e.body.setTranslation(v, false); e.body.setRotation(q, false);
    e.object.scale.setScalar(Math.max(.001, L.big * (calm ? springOut(popT) : 1)));
    // the rays flare out once as it pops up, then fade (not under reduced motion)
    if (rays) {
      const k = hoverT / L.rays; rays.visible = raysOn && k < 1;
      if (rays.visible) { rays.scale.setScalar(.14 * (.7 + .3 * springOut(Math.min(1, k * 2.4)))); rays.material.opacity = k < .12 ? k / .12 : 1 - smooth((k - .12) / .88); }
    }
    world.sync(e);
  }
  function hover(fresh) {
    const e = inst.worldEntry; hovering = true; hoverT = 0; popT = fresh && !stage.reducedMotion ? 0 : 1; raysOn = fresh && !stage.reducedMotion;
    e.canGrab = false; supports.detach(e, {wake: false}); world.park(e);
    e.body.setBodyType(world.rapier.RigidBodyType.KinematicPositionBased, false);
    glow = 1; paint();
    if (!stage.onFrame.includes(hoverFrame)) stage.onFrame.push(hoverFrame);
    hoverFrame(0);
    if (fresh) { audio.play('ding', {gain: .5, rate: 1.12}); if (!late && !cat.hidden && !cat.standIn) cat.playEmote('idea', 'bulb'); }
  }
  function stopHover() { if (hovering && inst?.object) inst.object.visible = true; hovering = false; if (rays) rays.visible = false; const n = stage.onFrame.indexOf(hoverFrame); if (n >= 0) stage.onFrame.splice(n, 1); }
  function hitsHover(ev) {
    const r = inst?.picture?.rect; if (!hovering || !r || inst.object.userData.collectionHidden) return false;
    return ev.clientX >= r.x - 10 && ev.clientX <= r.x + r.w + 10 && ev.clientY >= r.y - 10 && ev.clientY <= r.y + r.h + 10;
  }
  // Most first sigils come after a first touch of the page: fetch the engine and the bulb's art then, so the idea is on time.
  function prewarm() {
    if (!stage.loaded) return;
    stage.canvas.removeEventListener('pointerdown', prewarm);
    if (store.get('lamp.stage') || keepsakes.has('bulb')) return;
    world.ensure().catch(() => {}); stage.ensureEnv();
    // and compile its shaders in a quiet moment, on a throwaway copy, so its first picture does not stall the page
    stage.warm(async function bulb() {
      if (inst) return;
      const {art} = await bulbArt(), root = new T.Group(), glow = glowSprite(.5), flare = new T.Sprite(new T.SpriteMaterial({map: raysTexture(T), transparent: true, depthWrite: false, depthTest: false}));
      stage.scene.add(root); root.add(glow, flare);
      root.position.copy(site.worldLayout.anchor(stage.width / 2)); root.updateMatrixWorld(true);
      const p = createMeshPicture(site, root, art.visual, art.vertices); p.draw(true); stage.warmDraw([glow, flare]);
      // Kept, hidden, until the real bulb has drawn: disposing the last user of a shader deletes it.
      root.visible = false; p.draw(true); warmCopy = () => { p.dispose(); art.dispose(); glow.material.dispose(); flare.material.dispose(); stage.scene.remove(root); warmCopy = null; };
    });
  }
  stage.canvas.addEventListener('pointerdown', prewarm);
  site.input.claim(96, (ev) => (hitsHover(ev) ? {move() {}, end(e2) { if (e2.type === 'pointerup') knock(); }} : null));
  site.input.cursors.push((ev) => (hitsHover(ev) ? 'pointer' : null));
  // Clicked: the idea goes out and the bulb drops, in a little arc off his head to his side and toward you.
  function knock() {
    const e = inst?.worldEntry; if (!hovering || !e) return false;
    stopHover(); stats.knocks++; setStage('dropped'); e.canGrab = true; if (rays) rays.visible = false;
    // the idea shrinks to the real bulb as it falls
    const big = e.object.scale.x; if (stage.reducedMotion) e.object.scale.setScalar(1);
    else stage.tween(.32, (u) => { e.object.scale.setScalar(big + (1 - big) * smooth(u)); if (u >= 1) e.object.scale.setScalar(1); });
    const from = new T.Vector3().copy(e.body.translation()), side = landingSide(), F = L.fall;
    const to = site.worldLayout.reachable(new T.Vector3(side * F.side * cat.height, .03, F.front * cat.height));
    const t = F.seconds, gravity = 9.81;
    e.body.setBodyType(world.rapier.RigidBodyType.Dynamic, false);
    e.body.setLinvel({x: (to.x - from.x) / t, y: (to.y - from.y + .5 * gravity * t * t) / t, z: (to.z - from.z) / t}, true);
    e.body.setAngvel({x: 1.5, y: .6, z: -side * 6}, true);
    world.wake(e); world.save(e, true);
    audio.play('click', {gain: .5, rate: .92});
    glowTo(0, L.dim);
    return true;
  }
  // His left (the puddle tends to be on his right), unless the rack stands there.
  function landingSide() {
    const r = rack.picture?.rect; if (!r) return -1;
    const left = stage.toScreen(site.worldLayout.reachable(new T.Vector3(-L.fall.side * cat.height, 0, L.fall.front * cat.height)));
    return left.x >= r.x - 20 && left.x <= r.x + r.w + 20 ? 1 : -1;
  }
  function tapped() {
    if (hovering) return knock();
    if (occupied()) return lampOn(!isOn(), 'tap');
    return false;
  }

  // ---- lightning in the puddle ----
  function inPuddle() {
    const e = inst?.worldEntry, pool = keepsakes.get('puddle');
    if (!e || !pool?.state.floor || e.support || hovering || world.held?.entry === e) return false;
    const c = e.object.localToWorld(new T.Vector3(0, .125 * rack.rackScale * BULB, 0)); if (c.y > .12) return false;
    const [x, z, w, d] = pool.state.floor, dx = (c.x - x) * 2 / w, dz = (c.z - z) * 2 / d, angle = Math.atan2(-dz, dx);
    const edge = .78 + .1 * Math.sin(angle * 3 + 1) + .06 * Math.sin(angle * 5 + 4) + .04 * Math.sin(angle * 9);
    return Math.hypot(dx, dz) < edge * 1.08;
  }
  // Let go over the puddle: the page has no depth to aim with, so the floor under the pointer decides. It drops in
  // from just above the water where it was let go (its picture stays under the pointer).
  function intoPuddle(ev) {
    const e = inst?.worldEntry, pool = keepsakes.get('puddle'); if (!ev || !e || !pool?.state.floor || e.support) return false;
    const at = stage.ray(ev.clientX, ev.clientY).intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -.06), new T.Vector3()); if (!at) return false;
    const [x, z, w, d] = pool.state.floor, dx = (at.x - x) * 2 / w, dz = (at.z - z) * 2 / d;
    if (Math.hypot(dx, dz) > .8) return false;
    e.body.setTranslation(at, true); e.body.setLinvel({x: 0, y: 0, z: 0}, true); e.body.setAngvel({x: 0, y: 0, z: 0}, true);
    world.wake(e); world.sync(e); return true;
  }
  // Called by the wet-bolt combo just before the strike: if the dropped bulb lies in the water, the strike charges it.
  function shock() {
    stats.strikes++;
    if (rank() !== 2 || site.eggs.bolt?.busy || !inPuddle()) return false;
    stage.after((site.eggs.bolt?.config.darken ?? .45) + .04).then(charged);
    return true;
  }
  async function charged() {
    const e = inst?.worldEntry; if (!e || rank() !== 2) return;
    setStage('lit'); stats.charged++;
    if (!stage.reducedMotion && !e.support && world.held?.entry !== e) {      // a jolt: it hops in the water
      world.wake(e); const m = e.body.mass();
      e.body.applyImpulse({x: 0, y: m * .9, z: 0}, true); e.body.applyTorqueImpulse({x: m * .002, y: 0, z: m * .003}, true);
    }
    audio.play('twinkle', {gain: .4});
    await glowTo(L.loose, L.warm); changed();
    if (rack.task) { await stage.after(.35); await growShade(); }
  }

  // ---- into the lampshade ----
  function shadeRect() {
    if (!shade || !rack.root) return null;
    rack.root.updateMatrixWorld(true); shade.group.updateMatrix(); shade.shell.geometry.computeBoundingBox();
    const b = shade.shell.geometry.boundingBox, m = rack.root.matrixWorld.clone().multiply(shade.group.matrix), xs = [], ys = [];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { const s = stage.toScreen(new T.Vector3(x, y, z).applyMatrix4(m)); xs.push(s.x); ys.push(s.y); }
    return {x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys)};
  }
  const fits = () => rank() >= 3 && !!shade;
  function intoShade(ev) {
    if (!ev || !fits() || occupied()) return false;
    const r = shadeRect(), pad = L.fitPad; if (!r) return false;
    if (ev.clientX < r.x - pad || ev.clientX > r.x + r.w + pad || ev.clientY < r.y - pad || ev.clientY > r.y + r.h + pad) return false;
    return fit('drag');
  }
  function fit(by) {
    const e = inst?.worldEntry; if (!e || !fits()) return false;
    fitting = true;
    try { if (!occupied() && !supports.mount(e, 'rack-lamp', 'socket')) return false; } finally { fitting = false; }
    return lampOn(true, by);
  }
  // The rack's light button and keyboard: fit the bulb, or switch the lamp. Checks use it as the direct route too.
  async function use() {
    if (!inst) return false; await inst.worldTask;
    if (hovering) return knock();
    if (!occupied()) return fit('button');
    return lampOn(!isOn(), 'button');
  }
  function setOn(value) { return lampOn(value, null); }
  // A bulb mounted by being placed at the socket (keyboard place, a near drop) lights the lamp the same way.
  function mounted(e, {animate} = {}) { if (!fitting && e === inst?.worldEntry && animate && fits() && !isOn()) lampOn(true, 'place'); }

  // ---- the first sigil ----
  site.beforeCast = (name, info) => {
    if (!info?.stroke || store.get('lamp.stage') || keepsakes.has('bulb')) return null;
    stats.casts++; setStage('idea'); store.set('lamp.unlocked', true);
    return idea();
  };
  async function idea() {
    const begin = performance.now(), i = keepsakes.give('bulb');
    const ready = await Promise.race([i.worldTask.then(() => !!i.worldEntry), stage.after(L.wait).then(() => false)]);
    // Too slow (a cold network): the effect plays now, and the bulb pops up quietly when it comes, without his shake.
    if (!ready) late = true;
    if (ready) { stats.appearAt = stage.clock; await stage.after(L.hold); stats.releaseAt = stage.clock; stats.held++; }
    stats.heldMs = performance.now() - begin;
  }
  // Fixture and older-save route: a charged bulb on the floor beside a standing rack (never a second bulb).
  async function award() {
    if (keepsakes.has('bulb') || store.get('lamp.unlocked')) return false;
    store.set('lamp.unlocked', true); setStage('lit'); await rack.ready(); await growShade(false); const i = keepsakes.give('bulb'); await i.worldTask; return true;
  }
  // Saves from before the sequence: a bulb from the old wet-bolt unlock counts as already charged.
  if (!store.get('lamp.stage') && (store.get('keepsakes.bulb') || store.get('lamp.unlocked'))) setStage(store.get('worldBodies.bulb')?.adapter?.on ? 'lamp' : 'lit');
  keepsakes.define({id: 'bulb', label: 'the light bulb', kind: 'gl', size: .13, aspect: 1.6, home: () => ({x: -.5, y: .1}),
    object: (_, i) => { i.fresh = !!site.timing?.shown; return create(i); }, place() {}, tap: () => tapped(),
    removed(i) {
      stopHover(); world.remove(i.id); site.worldLayout.remove(i.id); i.picture?.dispose(); i.art?.dispose(); sprite?.material.dispose(); sprite = null;
      if (fill) fill.intensity = 0; if (halo) halo.visible = false; shade?.lit(0); rack.invalidate(); inst = null;
    }});
  // the lamp's light as the checks read it: visible while it shines (the light itself stays in the picture at zero)
  const light = { get visible() { return !!fill && fill.intensity > 0; }, get castShadow() { return !!fill?.castShadow; }, get object() { return fill; } };
  return {award, use, setOn, changed, shock, knock, fit, mounted, inPuddle, shadeRect, growShade, stats, config: L, get smiley() { return ink; },
    get inst() { return inst; }, get on() { return isOn(); }, get occupied() { return occupied(); }, get light() { return fill && light; }, get halo() { return halo; },
    get shade() { return shade; }, get stage() { return store.get('lamp.stage') || null; }, get hovering() { return hovering; }, get glow() { return glow; }, get fits() { return fits(); }};
}
let glowMap = null;
function glowTexture(T) {
  if (glowMap) return glowMap;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), gradient = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,200,104,.6)'); gradient.addColorStop(.3, 'rgba(255,176,72,.26)'); gradient.addColorStop(.65, 'rgba(255,166,64,.07)'); gradient.addColorStop(1, 'rgba(255,166,64,0)');
  c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
  return (glowMap = new T.CanvasTexture(cv));
}
// The UV bulb's glow: violet, a little hotter in the middle.
let uvMap = null;
function uvTexture(T) {
  if (uvMap) return uvMap;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'), gradient = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(214,186,255,.7)'); gradient.addColorStop(.3, 'rgba(150,92,255,.32)'); gradient.addColorStop(.65, 'rgba(128,70,240,.09)'); gradient.addColorStop(1, 'rgba(128,70,240,0)');
  c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
  uvMap = new T.CanvasTexture(cv); uvMap.colorSpace = T.SRGBColorSpace; return uvMap;
}
// The floor under the UV lamp: a soft violet pool fading out from under the lamp (the decal's left), and a smiley
// drawn in invisible ink, badly: a circle that does not quite close, two dots of different sizes, a lopsided grin,
// every stroke wobbling. The ink glows pale blue-white with a violet bloom, brightest nearest the lamp.
let inkMap = null;
function inkTexture(T) {
  if (inkMap) return inkMap;
  const W = 640, H = 410, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // An oval pool, brightest toward the lamp (the decal's left), fading to nothing well inside the decal's edges.
  c.save(); c.translate(W * .46, H * .5); c.scale(1, H / W * 1.15);
  const pool = c.createRadialGradient(-W * .16, -H * .2, 0, 0, 0, W * .47);
  pool.addColorStop(0, 'rgba(126,64,240,.34)'); pool.addColorStop(.5, 'rgba(126,64,240,.17)'); pool.addColorStop(.85, 'rgba(126,64,240,.04)'); pool.addColorStop(1, 'rgba(126,64,240,0)');
  c.fillStyle = pool; c.fillRect(-W, -W, W * 2, W * 2); c.restore();
  const cx = W * .6, cy = H * .55, R = H * .27, wob = (k) => (rnd() - .5) * k;
  const strokes = [];
  { const pts = []; const a0 = -1.9, a1 = a0 + Math.PI * 2 * .94; for (let i = 0; i <= 46; i++) { const a = a0 + (a1 - a0) * i / 46, r = R * (1 + .07 * Math.sin(a * 3 + 1) + wob(.05)); pts.push([cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * .94]); } strokes.push(pts); }
  const dot = (x, y, r) => { const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2; pts.push([x + Math.cos(a) * r * (1 + wob(.4)), y + Math.sin(a) * r * (1 + wob(.4))]); } strokes.push(pts); };
  dot(cx - R * .38, cy - R * .3, 6); dot(cx + R * .3, cy - R * .36, 9);
  { const pts = []; for (let i = 0; i <= 18; i++) { const t = i / 18, x = cx - R * .55 + R * 1.05 * t, y = cy + R * .16 + Math.sin(t * Math.PI) * R * (.42 - .12 * t) + wob(5); pts.push([x, y]); } strokes.push(pts); }
  const draw = (width, style, blur) => {
    c.save(); c.lineCap = c.lineJoin = 'round'; c.lineWidth = width; c.strokeStyle = style; c.shadowColor = 'rgba(170,110,255,.95)'; c.shadowBlur = blur;
    for (const pts of strokes) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
    c.restore();
  };
  draw(18, 'rgba(160,96,255,.42)', 26); draw(8, 'rgba(206,238,255,.95)', 12); draw(3.5, 'rgba(250,254,255,1)', 0);
  inkMap = new T.CanvasTexture(cv); inkMap.colorSpace = T.SRGBColorSpace; inkMap.anisotropy = 4; return inkMap;
}
// Seven short golden strokes round the bulb: the cartoon sign for an idea.
let raysMap = null;
function raysTexture(T) {
  if (raysMap) return raysMap;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
  c.translate(128, 128); c.lineCap = 'round';
  for (let i = -3; i <= 3; i++) {                          // round the top and sides, clear of the screw base below
    const a = -Math.PI / 2 + i * .7, long = i % 2 ? .8 : 1, x = Math.cos(a), y = Math.sin(a);
    c.strokeStyle = 'rgba(196,124,32,.55)'; c.lineWidth = 14; c.beginPath(); c.moveTo(x * 74, y * 74); c.lineTo(x * 74 * (1 + .5 * long), y * 74 * (1 + .5 * long)); c.stroke();
    c.strokeStyle = '#f2b544'; c.lineWidth = 9; c.beginPath(); c.moveTo(x * 74, y * 74); c.lineTo(x * 74 * (1 + .5 * long), y * 74 * (1 + .5 * long)); c.stroke();
  }
  raysMap = new T.CanvasTexture(cv); raysMap.colorSpace = T.SRGBColorSpace; return raysMap;
}
