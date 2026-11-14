// World unit 1: optional rigid-body service. Art/layout adapters opt in through add().
// Rapier compat 0.19.3, Apache-2.0: https://github.com/dimforge/rapier.js/blob/master/LICENSE
// Never request the engine before the cat is visible. A sleeping world has no stage callback.
import {impactSound,contactSound} from './world-impact.js';
import {createCatBody} from './cat-body.js';
import {clearSpot} from './floor-home.js';
import {puff} from './puff.js';
const ENGINE = 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs';
const DT = 1 / 120;
// The hand (e1111-58, notes 1 and 3): a held body is driven by a force-limited, velocity-level ball joint at the grip
// point, not welded to an unlimited kinematic anchor. It pushes what it meets, stops on the floor, and cannot spin up.
//   rate: 1/s, grip-point velocity per unit of distance to the pointer; speed: its cap (units/s);
//   accel: the most the hand can accelerate the body, beyond holding its weight (units/s²);
//   spin/spinDamp: angular speed cap and damping (rad/s, 1/s) while held; release: caps on a throw.
// Playtest-2 (Aaron, item 1): "up the speed they can spin/move a little bit, I still want you to be able to swing them
// around": speed 7 → 9.5, spin 4 → 6.5 (less held-spin damping), throws 6/5 → 8/7.5, a slightly stronger hand.
export const HOLD = { rate: 16, speed: 9.5, accel: 80, spin: 6.5, spinDamp: 2, release: { speed: 8, spin: 7.5 }, offscreen: { visible: .2, grace: .4, near: .35 }, sunk: { depth: .01, deep: .08, after: .3 }, ccd: .75 };
// Coming to rest (playtest-2, item 1: "when you set them down on the ground they really slowly settle"). Measured on
// the baseline: a set-down body is still to the eye within ~.2–1 s, then Rapier waits its fixed 2 s below a coarse
// threshold before sleeping; meanwhile the round ones (the rifle, the top, the butter) roll and rock 2–5 px per frame
// for up to 2.5 s, because their own damping is tiny and Rapier has no rolling resistance. So, per frame, for a free
// body that is touching something and slow (its farthest point under `slow` px/s on the page), rolling/rocking damping
// rises to at least `angular`/`linear` (1/s); a body whose farthest point stays under `px` px/s for `after` seconds
// is put to sleep at once. Viscous damping never holds a body against gravity, so a real topple still falls.
// Touching: any contact point within `touch` units; a body sunk more than `sunk` units into what it lies on is not put
// to sleep until the solver has pushed it out (fix round A, playtest-2); one whose lowest point is more than `sunk` inside
// the floor is lifted to `lift` above it (playtest-3).
// Rapier interaction groups, membership << 16 | filter. Bit 0 is the room (the floor, fixed furniture, the cat:
// Rapier's default all-bits groups); loose items are members of every group but that one.
export const GROUPS = { item: 0xfffeffff, hook: 0x00020001, freed: 0xfffe7fff, jammed: 0x8000ffff };
// A long thin item wedged inside a container (playtest-2, item 3): while it is held, its contacts with a container
// (an entry with `interior`, a box in its own frame, min/max) are judged; when one of them lies inside the interior
// and either the hand has been more than `lag` units from where it is pulling for `after` seconds, or the container
// is being lifted with it (`lift` units/s up) or hangs from it (its lowest point `carried` above the floor), the two
// stop meeting (GROUPS.freed/jammed) until they are apart.
export const JAM = { lag: .15, after: .15, lift: .25, carried: .02, apart: 2 };
export const RETURN = { ms: 5000, quick: 350 };
// Too far into him (playtest-3, physics lane item 3: "if something gets inside of the cats space too deep it just
// despawns and respawns. Buttaman just pushed the box into the cat and it started tweaking out"). A loose body whose
// origin is inside one of his hulls, or that is more than `deep` units into him, or pressed into him (more than `wedge`
// units in, and not back out past `free`) for `after` seconds of page time, whoever pushed it (the hand, Butterman, a
// neighbour), goes in a puff and comes back RETURN.quick later in a puff on a clear floor spot in view (floor-home.js
// clearSpot). Resting against him, or eased against him, is a contact distance of about +.002..+.003 (his contact skin);
// forced in, it hovers .008-.018 in and slides round him (measured), so the clock keeps running until it is out past `free`.
export const CAT_IN = { deep: .06, wedge: .008, free: .003, after: .4, grace: 1000 };
// Restoring a page (playtest-3, the orchestrator; found by the cards lane: a card resting partly on another moved after
// a reload). A body restored asleep in the layout it was saved in keeps that exact pose for the world's first `hold`
// steps after it was added (half a second of world time; the world does not step while everything sleeps): when the new contacts between restored bodies (or his body appearing) wake it at its first steps, it is
// put back where it was saved and to sleep, whatever order the bodies were added in. Anything that really moves it
// (the hand, an adapter's own wake, a tap) ends the hold at once (wake()).
export const RESTORE = { hold: 60 };
export const REST = { px: 5, after: .25, slow: 150, angular: 6, linear: 3, touch: .004, sunk: .002, lift: .0008, group: 8 };
export function createWorld(site) {
  const { stage, THREE } = site, entries = new Map(), active = new Set(), pushers = new Map();
  const stats = { steps: 0, syncs: 0, frames: 0, listening: false, requestedAt: null, initializedAt: null, stepMs: 0, respawns: 0, unsunk: 0, ccdToggles: 0, settled: 0, jams: 0, unjammed: 0, catRespawns: 0 };
  let slots = 0;
  let R, physics, events, loading, accumulator = 0, held = null, disposed = false, syncing = false, floor = null, cat = null, simTime = 0;
  // (the cat is in: his first pose is loaded, the doors still closed or already open; stage.prepare)
  const visible = new Promise(resolve => stage.early ? resolve() : stage.onEarly.push(resolve));
  function listen() {
    if (disposed || stats.listening || document.hidden || !active.size && !held && !pushers.size) return;
    accumulator = 0; stage.onFrame.push(step); stats.listening = true;
  }
  function unlisten() {
    const n = stage.onFrame.indexOf(step); if (n >= 0) stage.onFrame.splice(n, 1);
    stats.listening = false; accumulator = 0;
  }
  async function ensure() {
    if (disposed) throw new Error('World disposed');
    if (!loading) loading = (async () => {
      await visible;
      // onLoaded runs within ready(); defer until its caller records the visible-cat timestamp.
      await new Promise(resolve => setTimeout(resolve, 0));
      if (disposed) throw new Error('World disposed');
      stats.requestedAt = performance.now();
      R = (await import(ENGINE)).default; await R.init();
      physics = new R.World({ x: 0, y: -9.81, z: 0 }); physics.timestep = DT;
      events = new R.EventQueue(true);
      physics.numSolverIterations = 12;
      physics.integrationParameters.maxCcdSubsteps = 4;
      physics.integrationParameters.normalizedAllowedLinearError = .0001;
      physics.integrationParameters.normalizedPredictionDistance = .02;
      physics.integrationParameters.contact_natural_frequency = 60;
      // The surface every body rests on stays the original thin slab: a single 2-unit-thick cuboid made resting hulls
      // jitter (rack hats awake past 8 s, the party hat gaining energy, the cone 2.5 px proud). A thick block under
      // it still stops anything pressed or teleported through from coming out underneath.
      floor = physics.createCollider(R.ColliderDesc.cuboid(100, .1, 100).setTranslation(0, -.1, 0).setFriction(.6).setRestitution(.25));
      physics.createCollider(R.ColliderDesc.cuboid(100, 2, 100).setTranslation(0, -2.2, 0).setFriction(.6).setRestitution(.25));
      cat = createCatBody(site, api);
      stats.initializedAt = performance.now(); return api;
    })().catch(error => { loading = null; throw error; });
    return loading;
  }
  function wake(entry, restoring = false) {
    if (!entries.has(entry.id) || entry.timer) return;
    if (!restoring) { entry.silentRestore = false; entry.hold = null; }
    entry.sleepNext = false; site.worldPresentation?.wake(entry.id);entry.body.wakeUp(); active.add(entry); listen();
  }
  function sync(entry) {
    // A body in motion gets a lighter picture (pictures.js MOTION); at rest, supported or fixed, an exact one.
    if (entry.presentation && 'precise' in entry.presentation) entry.presentation.precise = entry.fixed || !!entry.support || entry.body.isSleeping();
    entry.object.position.copy(entry.body.translation()); entry.object.quaternion.copy(entry.body.rotation());
    entry.object.updateMatrixWorld(true); if (entry.sync) { entry.sync(entry); entry.drawnAt = stats.frames; } stats.syncs++;
  }
  // A lost body is out of the room for RETURN.ms, then dropped in at its home. Sooner (RETURN.quick) while the
  // inventory is showing (site.inventoryOpen) or for a body just taken out of it (entry.quickUntil, performance.now
  // time): the inventory lists what is in the room, so nothing it lists may be away (playtest-2, item 5).
  // entry.returnNow(), when set, finishes an outstanding return at once (another adapter's return sets its own).
  // clear (CAT_IN): it goes in a puff, and comes back RETURN.quick later in a puff, resting on a clear floor spot near
  // its arrival spot (floor-home.js clearSpot), rather than dropped in at its home.
  function returnLater(entry, { clear = false } = {}) {
    if (entry.timer) return;
    if (held?.entry === entry) release();
    if (clear) puffOver(entry);
    entry.body.setEnabled(false); entry.object.visible = false; entry.sync?.(entry); active.delete(entry); entry.catAt = null;
    const back = () => {
      clearTimeout(entry.timer); entry.timer = null; entry.returnNow = null; if (disposed || !entries.has(entry.id)) return;
      let p = site.worldLayout?.reachable(entry.home()) || entry.home();
      const inst = clear && site.keepsakes?.get(entry.id), spot = inst?.colliderVertices?.length && clearSpot(site, inst, inst.colliderVertices, new THREE.Quaternion().copy(entry.body.rotation()), p);
      if (spot) p = spot;
      entry.body.setTranslation(p, false); entry.body.setLinvel({x:0,y:0,z:0}, false); entry.body.setAngvel({x:0,y:0,z:0}, false);
      entry.body.setEnabled(true); entry.object.visible = true; stats.respawns++; sync(entry); wake(entry);
      if (clear) puffOver(entry);
    };
    entry.returnNow = back;
    entry.timer = setTimeout(back, clear || quick(entry) ? RETURN.quick : RETURN.ms);
  }
  function puffOver(entry) { const r = entry.presentation?.rect; if (r && r.w > 0 && r.w < stage.width * 2) puff(r.x + r.w / 2, r.y + r.h / 2, Math.max(60, Math.min(200, r.w * 1.3))); }
  // See CAT_IN. Once a frame while the world steps: only the pairs his hulls are in, so nothing runs for bodies apart from him.
  const catIn = new Set(), _cp = { x: 0, y: 0, z: 0 };let catMoves = -1, catMovedAt = -Infinity;
  function intoCat() {
    const body = cat?.enabled && cat.body;
    const seen = new Map();
    if (body) for (let i = 0; i < body.numColliders(); i++) {
      const c = body.collider(i);
      physics.contactPairsWith(c, other => {
        const e = entries.get(other.parent()?.userData);
        if (!e || e.fixed || e.support || e.timer || !e.body.isEnabled() || !e.body.isDynamic()) return;
        let d = seen.get(e) ?? Infinity;
        physics.contactPair(c, other, m => { for (let k = 0, n = m.numContacts(); k < n; k++) d = Math.min(d, m.contactDist(k)); });
        const t = e.body.translation(); _cp.x = t.x; _cp.y = t.y; _cp.z = t.z;
        if (c.containsPoint(_cp)) d = -Infinity;
        seen.set(e, d);
      });
    }
    for (const e of catIn) if (!(seen.get(e) < -CAT_IN.free)) { e.catAt = null; catIn.delete(e); }
    const now = performance.now(), moved = cat ? cat.stats.rebuilds + cat.stats.turns : 0;
    // His own motion is not a push: when his body changes (a new pose, a turn, his body appearing after a reload), what
    // it now overlaps is pushed out by the solver, as before, for CAT_IN.grace; only then is a new overlap judged.
    if (moved !== catMoves) { catMoves = moved; catMovedAt = now; }
    for (const [e, d] of seen) {
      if (!(d < -CAT_IN.wedge) && !catIn.has(e)) continue;
      if (!catIn.has(e) && now - catMovedAt < CAT_IN.grace) continue;
      e.catAt ??= now; catIn.add(e);
      if (d < -CAT_IN.deep || now - e.catAt >= CAT_IN.after * 1000) { catIn.delete(e); stats.catRespawns++; returnLater(e, { clear: true }); }
    }
  }
  const quick = entry => !!site.inventoryOpen || performance.now() < (entry.quickUntil || 0);
  // Explicit placement takes ownership from an outstanding offscreen return.
  function cancelReturn(entry) {
    if (!entry.timer) return false;
    clearTimeout(entry.timer); entry.timer = null; entry.returnNow = null;
    entry.body.setEnabled(true); entry.object.visible = true;
    return true;
  }
  // See RESTORE. Woken by Rapier itself (a contact starting at its first steps), not by anything that moves it: back to
  // its saved pose and asleep before the next step (sleepNext, as REST does).
  function holdBack(entry) {
    const h = entry.hold, b = entry.body;
    if (stats.steps > h.until || entry.support || held?.entry === entry || !b.isEnabled()) { entry.hold = null; return; }
    b.setTranslation(h.p, false); b.setRotation(h.q, false); b.setLinvel({ x: 0, y: 0, z: 0 }, false); b.setAngvel({ x: 0, y: 0, z: 0 }, false);
    entry.sleepNext = true; stats.held = (stats.held || 0) + 1;
  }
  function step(dt) {
    const begin = performance.now(); stats.frames++;
    accumulator += Math.min(Math.max(dt, 0), .05);
    if (accumulator + 1e-10 >= DT) { cat?.update(); for (const entry of active) ccd(entry); }
    while (accumulator + 1e-10 >= DT) {
      for (const entry of active) if (!entry.support && !entry.body.isSleeping()) entry.beforeStep?.(DT, entry);
      if (held) drive();
      site.occluders?.drive(DT);
      for (const entry of active) if (entry.sleepNext) { entry.sleepNext = false; const b = entry.body; if (held?.entry !== entry && b.isEnabled() && !entry.support) { b.setLinvel({ x: 0, y: 0, z: 0 }, false); b.setAngvel({ x: 0, y: 0, z: 0 }, false); b.sleep(); } }
      physics.step(events); events.drainContactForceEvents(contactImpact); stats.steps++; accumulator -= DT; simTime += DT;
      if (held) capSpin(held.entry.body, HOLD.spin);
    }
    if (held || jam) jams(Math.min(Math.max(dt, 0), .05));
    intoCat();
    site.occluders?.check();
    // Contacts can wake neighbours not already in the active set.
    physics.forEachActiveRigidBody(body => { const entry = entries.get(body.userData); if (entry) { if (entry.hold) holdBack(entry); active.add(entry); } });
    syncing=true;
    for (const entry of active) {
      const p = entry.body.translation();
      if (Math.abs(p.x) > 12 || Math.abs(p.z) > 12 || p.y < -3 || p.y > 12) { returnLater(entry); continue; }
      unsink(entry, p);
      sync(entry);
      // More than 80% of its picture outside the page (or at the lens): start the respawn (e1111-58, note 5).
      // (Not while a scene has the camera: see cameraBack below.)
      if (!stage.cameraBorrowed && offscreen(entry)) { returnLater(entry); continue; }
      // Put to rest here: drawn once more, exactly (sync reads isSleeping for `precise`).
      if (settle(entry)) sync(entry);
      if (entry.body.isSleeping() && held?.entry !== entry) { active.delete(entry); entry.silentRestore=false; if (stage.cameraBorrowed) { restLater.add(entry); continue; } save(entry); entry.rest?.(entry); site.occluders?.rested(entry); }
    }
    syncing=false;site.meshPictures?.flush();site.worldPresentation?.flush();
    stats.stepMs = performance.now() - begin;
    if (!active.size && !held && !pushers.size) unlisten();
  }
  let jam = null, jamFor = 0;
  const _jp = new THREE.Vector3(), _jq = new THREE.Quaternion();
  function setGroups(entry, from, to) { for (let i = 0; i < entry.body.numColliders(); i++) if (entry.groups[i] === GROUPS.item) { if (entry.off) entry.off[i][0] = to ?? entry.groups[i]; else entry.body.collider(i).setCollisionGroups(to ?? entry.groups[i]); } }
  // Out of the room and back (fix round A, playtest-2). In this Rapier build (0.19.3) a body disabled while awake (or put
  // to sleep by hand and disabled before a step) keeps its colliders in the broad phase: an invisible block where it
  // was (measured: a box disabled in mid-air held the flour up). Its colliders' collision and solver groups are set to
  // none while it is disabled, which the narrow phase honours, and put back when it is enabled.
  function disable(entry, raw = entry.body.setEnabled) {
    const b = entry.body;
    if (!entry.off) { entry.off = []; for (let i = 0; i < b.numColliders(); i++) { const c = b.collider(i); entry.off.push([c.collisionGroups(), c.solverGroups()]); c.setCollisionGroups(0); c.setSolverGroups(0); } }
    raw(false);
  }
  function enable(entry, raw = entry.body.setEnabled) {
    const b = entry.body, off = entry.off;
    if (off) { entry.off = null; for (let i = 0; i < b.numColliders() && i < off.length; i++) { const c = b.collider(i); c.setCollisionGroups(off[i][0]); c.setSolverGroups(off[i][1]); } }
    raw(true);
  }
  function unjam() { if (!jam) return; for (const e of [jam.held, jam.box]) if (entries.has(e.id)) setGroups(e, null, null); jam = null; stats.unjammed++; }
  function insideOf(box, p) {
    const b = box.body, r = box.interior; _jq.copy(b.rotation()).invert(); _jp.copy(p).sub(b.translation()).applyQuaternion(_jq);
    return _jp.x > r.min[0] && _jp.x < r.max[0] && _jp.y > r.min[1] && _jp.y < r.max[1] && _jp.z > r.min[2] && _jp.z < r.max[2];
  }
  function jams(dt) {
    if (jam) {
      const { held: h, box } = jam, apart = !entries.has(h.id) || !entries.has(box.id) || _jp.copy(h.body.translation()).distanceTo(box.body.translation()) > h.reach + box.reach;
      if (apart || held?.entry !== h && simTime - jam.at > JAM.apart) unjam();
      return;
    }
    const h = held?.entry; if (!h || h.interior || !h.body.isDynamic()) { jamFor = 0; return; }
    let box = null;
    for (let i = 0; i < h.body.numColliders() && !box; i++) {
      const c = h.body.collider(i);
      physics.contactPairsWith(c, other => {
        if (box) return; const e = entries.get(other.parent()?.userData);
        if (!e?.interior || e === h || !e.body.isDynamic()) return;
        physics.contactPair(c, other, m => { for (let k = 0; k < m.numSolverContacts() && !box; k++) if (insideOf(e, m.solverContactPoint(k))) box = e; });
      });
    }
    if (!box) { jamFor = 0; return; }
    const q = h.body.rotation(); _jq.set(q.x, q.y, q.z, q.w); _jp.copy(held.local).applyQuaternion(_jq).add(h.body.translation());
    const stuck = _jp.distanceTo(held.target) > JAM.lag || box.body.linvel().y > JAM.lift || lowest(box) > JAM.carried;
    jamFor = stuck ? jamFor + dt : 0;
    if (jamFor < JAM.after) return;
    jamFor = 0; jam = { held: h, box, at: simTime }; stats.jams++;
    setGroups(h, null, GROUPS.freed); setGroups(box, null, GROUPS.jammed); box.body.wakeUp();
  }
  // See REST. Runs once per frame for awake bodies only; the contact query runs only for slow ones.
  // The nearest contact distance of any point of any of its manifolds (negative: sunk in), or null with no contact.
  // Every point is read: a hull's first point is often a predicted one a few hundredths away while another point is on
  // the floor (fix round A: the googly eyes lay still for seconds unjudged).
  function touching(b) {
    let near = null;
    for (let i = 0; i < b.numColliders(); i++) {
      const c = b.collider(i);
      physics.contactPairsWith(c, other => physics.contactPair(c, other, m => { for (let k = 0, n = m.numContacts(); k < n; k++) { const d = m.contactDist(k); if (near === null || d < near) near = d; } }));
    }
    return near;
  }
  function calm(entry) {
    if (entry.calm) { entry.body.setLinearDamping(entry.damping.linear); entry.body.setAngularDamping(entry.damping.angular); entry.calm = false; }
    entry.calmAt = null;
  }
  // The page speed of a body's farthest point (see REST).
  function pxOf(e) { const b = e.body, v = b.linvel(), w = b.angvel(), p = b.translation(); return (Math.hypot(v.x, v.y, v.z) + Math.hypot(w.x, w.y, w.z) * e.reach) * stage.pxPerUnit(_rel.set(p.x, p.y, p.z)); }
  // A body and the awake loose bodies it touches (and theirs), when every one of them is slow; null while any is not.
  function restingGroup(entry) {
    const group = [entry], seen = new Set(group);
    for (let n = 0; n < group.length; n++) {
      const b = group[n].body;
      for (let i = 0; i < b.numColliders(); i++) {
        const c = b.collider(i);
        physics.contactPairsWith(c, other => {
          const e = entries.get(other.parent()?.userData);
          if (!e || seen.has(e) || e.fixed || e.support || e.timer || !e.body.isEnabled() || !e.body.isDynamic() || e.body.isSleeping()) return;
          let near = Infinity; physics.contactPair(c, other, m => { for (let k = 0, n2 = m.numContacts(); k < n2; k++) near = Math.min(near, m.contactDist(k)); });
          if (near < REST.touch) { seen.add(e); group.push(e); }
        });
      }
    }
    if (group.length > REST.group) return null;
    for (const e of group) if (e !== entry && (held?.entry === e || e.restless || e.scoot || e.gaining || pxOf(e) >= REST.px)) return null;
    return group;
  }
  function settle(entry) {
    const b = entry.body;
    if (entry.sleepNext) return;
    if (held?.entry === entry || entry.fixed || entry.support || entry.restless || entry.scoot || !b.isEnabled() || !b.isDynamic() || b.isSleeping()) { calm(entry); return; }
    const v = b.linvel(), w = b.angvel(), p = b.translation();
    const px = (Math.hypot(v.x, v.y, v.z) + Math.hypot(w.x, w.y, w.z) * entry.reach) * stage.pxPerUnit(_rel.set(p.x, p.y, p.z));
    // A body gaining speed (toppling off an edge, starting down a slope) is left to gravity: damping it would slow the fall.
    // Judged per tenth of a second (a slow topple gains only a fraction of a percent per frame), and only after three
    // tenths in a row turning the same way: a rocking body also gains speed, but for a quarter swing at a time.
    if (simTime - entry.pxAt >= .1) {
      const r = entry.wRef, same = w.x * r.x + w.y * r.y + w.z * r.z > 0;
      entry.gainRun = px > entry.pxRef * 1.02 + .3 && same ? entry.gainRun + 1 : 0; entry.gaining = entry.gainRun >= 3;
      entry.pxRef = px; entry.pxAt = simTime; r.x = w.x; r.y = w.y; r.z = w.z;
    }
    const gaining = entry.gaining;
    // (Rapier would otherwise put a slow topple to sleep half way over, after its own 2 s below .4 units/s.)
    if (gaining && px >= REST.px) { b.wakeUp(); calm(entry); return; }
    const near = px < REST.slow ? touching(b) : null;
    if (near === null || !(near < REST.touch)) { calm(entry); return; }
    if (!entry.calm) { b.setLinearDamping(Math.max(entry.damping.linear, REST.linear)); b.setAngularDamping(Math.max(entry.damping.angular, REST.angular)); entry.calm = true; }
    if (px >= REST.px) { entry.calmAt = null; return; }
    // Still sunk into what it lies on: never put to sleep inside; the solver pushes it out first (fix round A: a body
    // slept 2.6 px into the floor). It keeps the calm damping: dropping it there let the push-out kick a hat back up.
    if (near < -REST.sunk) { entry.calmAt = null; return; }
    // The floor's own measure too (playtest-3, physics lane item 5): a thin card pressed edge-first into the floor can
    // keep a contact whose normal points half sideways, at a positive distance, while a corner is .0077 inside it
    // (measured: the postcard, seed 30 of world-board's drops, 2.59 px in). The solver never pushes it out and the
    // contact distance above looks like a rest, so REST slept it there. Its lowest collider point (lowest()) says
    // where it really is: a calm body more than REST.sunk inside the floor is lifted out and settles again.
    const deep = lowest(entry);
    if (deep < -REST.sunk) {
      b.setTranslation({ x: p.x, y: p.y - deep + REST.lift, z: p.z }, true); if (v.y < 0) b.setLinvel({ x: v.x, y: 0, z: v.z }, true);
      entry.calmAt = null; stats.unsunk++; return;
    }
    entry.calmAt ??= simTime;
    // Stopped here and put to sleep just before the next physics step (step()), never between steps: in this Rapier build
    // a body sent to sleep by hand and then disabled before a step has run (the chest, the box, the butter's park and
    // disable) kept its colliders in the room, an invisible block where it had rested (fix round A, playtest-2).
    if (simTime - entry.calmAt >= REST.after) {
      // Bodies resting on one another sleep together (playtest-3: a card lying partly on another never slept, so a
      // reload restored both awake and they drifted). Put to sleep alone while touching an awake neighbour, Rapier woke
      // it at the next step, and the two took turns for ever (fix round A, note 3). Now the awake bodies it touches,
      // and theirs (up to REST.group), go to sleep in the same step once every one of them is slow too; until then it waits.
      const group = restingGroup(entry); if (!group) return false;
      for (const e of group) { e.body.setLinvel({ x: 0, y: 0, z: 0 }, false); e.body.setAngvel({ x: 0, y: 0, z: 0 }, false); e.sleepNext = true; calm(e); stats.settled++; }
      return true;
    }
    return false;
  }
  // Continuous collision detection where it is needed (e1111-58, note 1; cost gate): every body keeps Rapier's cheap
  // soft-CCD envelope (predicted contacts within `soft` units), and hard CCD switches on only while the body (or its
  // far end, spinning) is fast enough to need it, or while it is held. Hard CCD on bodies too slow to tunnel was
  // about 40% of a tumbling scene's solver time.
  function ccd(entry, now = false) {
    const b = entry.body; if (entry.fixed || !b.isEnabled() || !b.isDynamic()) return;
    let need = held?.entry === entry;
    // Re-judged every third frame per body (staggered); a grab or a release judges at once.
    if (!need && !now && !entry.ccd && (stats.frames + entry.slot) % 3) return;
    // Rapier runs its CCD pass for the whole world while any body asks for it, so the bar is where soft CCD stops being
    // enough: a sweep per substep beyond HOLD.ccd of the soft-prediction envelope (soft CCD predicts the contact first).
    if (!need) { const v = b.linvel(), w = b.angvel(); need = (Math.hypot(v.x, v.y, v.z) + Math.hypot(w.x, w.y, w.z) * entry.reach) * DT > entry.soft * HOLD.ccd; }
    if (need !== entry.ccd) { b.enableCcd(need); entry.ccd = need; stats.ccdToggles++; }
  }
  // A body found inside the floor is lifted out once, rather than left to jitter and rattle there. Checked only for
  // awake bodies low enough to touch the floor, one frame in six per body.
  // The lowest point of a body's colliders (world y).
  function lowest(entry) {
    const q = entry.body.rotation(), lp = entry.low, x = q.x, y = q.y, z = q.z, w = q.w;
    const r0 = 2 * (x * y + w * z), r1 = 1 - 2 * (x * x + z * z), r2 = 2 * (y * z - w * x);
    let low = Infinity; for (let n = 0; n < lp.length; n += 4) low = Math.min(low, r0 * lp[n] + r1 * lp[n + 1] + r2 * lp[n + 2] - lp[n + 3]);
    return low + entry.body.translation().y;
  }
  function unsink(entry, p) {
    if (entry.fixed || entry.support || p.y > entry.reach) { entry.sunkAt = null; return; }
    if ((stats.frames + entry.slot) % 6) return;
    // The lowest point of its colliders, from their own local points (Rapier's pair query misreported some compounds).
    const q = entry.body.rotation(), lp = entry.low, x = q.x, y = q.y, z = q.z, w = q.w;
    // y row of the rotation matrix
    const r0 = 2 * (x * y + w * z), r1 = 1 - 2 * (x * x + z * z), r2 = 2 * (y * z - w * x);
    let deepest = Infinity;
    for (let n = 0; n < lp.length; n += 4) deepest = Math.min(deepest, r0 * lp[n] + r1 * lp[n + 1] + r2 * lp[n + 2] - lp[n + 3]);
    deepest += p.y; if (!(deepest < 0)) deepest = 0;
    // An impact dips a few hundredths in for a few steps and the solver brings it back; that is left alone. Only a body
    // still in after HOLD.sunk.after seconds, or deeper than HOLD.sunk.deep, is lifted.
    if (deepest > -HOLD.sunk.depth) { entry.sunkAt = null; return; }
    entry.sunkAt ??= simTime;
    if (deepest > -HOLD.sunk.deep && simTime - entry.sunkAt < HOLD.sunk.after) return;
    entry.sunkAt = null;
    entry.body.setTranslation({ x: p.x, y: p.y - deepest + .002, z: p.z }, true); p.y -= deepest - .002;
    const v = entry.body.linvel(); if (v.y < 0) entry.body.setLinvel({ x: v.x, y: 0, z: v.z }, true);
    stats.unsunk++;
  }
  const _fwd = new THREE.Vector3(), _rel = new THREE.Vector3();
  function viewDepth(p) { stage.camera.getWorldDirection(_fwd); return _rel.copy(p).sub(stage.camera.position).dot(_fwd); }
  // The share of a body's projected picture inside the page between its chrome; 0 at or behind the lens.
  function visibleShare(entry) {
    if (viewDepth(entry.object.position) < HOLD.offscreen.near) return 0;
    // Only a picture drawn this frame tells where the body is (a fixture may switch its adapter's sync off).
    const r = entry.presentation?.rect; if (!r || !(r.w > 0) || !(r.h > 0) || entry.drawnAt !== stats.frames) return 1;
    const top = stage.insets.top, bottom = stage.height - stage.insets.bottom;
    const w = Math.max(0, Math.min(r.x + r.w, stage.width) - Math.max(r.x, 0)), h = Math.max(0, Math.min(r.y + r.h, bottom) - Math.max(r.y, top));
    return w * h / (r.w * r.h);
  }
  function offscreen(entry) {
    if (entry.fixed || entry.support || held?.entry === entry || entry.canGrab === false || !entry.body.isEnabled()) { entry.offAt = null; return false; }
    if (visibleShare(entry) >= HOLD.offscreen.visible) { entry.offAt = null; return false; }
    // Falling into the page from above (the controller's drop-in, a high throw coming down) is arriving, not lost.
    const r = entry.presentation?.rect;
    if (r && r.y + r.h < stage.height / 2 && !entry.body.isSleeping() && entry.body.linvel().y < -.05) { entry.offAt = null; return false; }
    // A resting body goes at once; a flying one gets a moment to come back into view.
    if (entry.body.isSleeping()) return true;
    entry.offAt ??= simTime; return simTime - entry.offAt >= HOLD.offscreen.grace;
  }
  function contactImpact(event) {
    const impulse=event.totalForceMagnitude()*DT;
    for(const handle of [event.collider1(),event.collider2()]){
      const body=physics.getCollider(handle)?.parent(),entry=body&&entries.get(body.userData);
      if(!entry?.sound||entry.fixed||entry.support)continue;
      // Remove the support impulse from gravity; resting pressure is not a hit.
      contactSound(site.audio,entry,entry.sound,impulse/Math.max(body.mass(),1e-6)-9.81*DT,entry.silentRestore);
    }
  }
  async function add({ id, object, shapes, mass = 1, position = object.position, rotation = object.quaternion, sleeping = false, sync: onSync, resize: onResize, rest, home, tap, persist = false, beforeStep, material = {}, fixed = false, presentation = null, sound: soundOverride, adapterState = null }) {
    await ensure(); if (disposed) throw new Error('World disposed');
    if (entries.has(id)) throw new Error('Duplicate world body: ' + id);
    const saved=persist&&site.store.get('worldBodies.'+id);
    const sound=impactSound(id,soundOverride);if(sound)site.audio.loadImpacts(sound.material);
    if(saved?.version===1&&saved.position?.length===3&&saved.quaternion?.length===4){
      position=new THREE.Vector3(...saved.position);rotation=new THREE.Quaternion(...saved.quaternion);sleeping=saved.awake!==true;
    }
    // .08 soft-CCD envelope covers the measured .065-unit extremity sweep.
    const body = physics.createRigidBody((fixed?R.RigidBodyDesc.fixed():R.RigidBodyDesc.dynamic()).setTranslation(position.x, position.y, position.z).setRotation(rotation)
      .setLinearDamping(material.linearDamping??.18).setAngularDamping(material.angularDamping??.4).setCcdEnabled(true).setSoftCcdPrediction(material.speculative===false?0:material.softCcdPrediction??.08).setCanSleep(true));
    body.userData = id;
    const groups = [];
    for (const shape of shapes) {
      let desc;
      if (shape.type === 'hull') desc = shape.radius ? R.ColliderDesc.roundConvexHull(new Float32Array(shape.points),shape.radius) : R.ColliderDesc.convexHull(new Float32Array(shape.points));
      else if (shape.type === 'ball') desc = R.ColliderDesc.ball(shape.radius);
      else desc = R.ColliderDesc.cuboid(...shape.half);
      if (!desc) { physics.removeRigidBody(body); throw new Error('Invalid collider: ' + id); }
      const p = shape.offset || {x:0,y:0,z:0};
      desc.setContactSkin(material.skin??.002).setTranslation(p.x,p.y,p.z).setMass(mass * (shape.massFraction ?? 1 / shapes.length)).setFriction(material.friction??.55).setRestitution(material.restitution??.25);
      // Soft ingredients must not inherit the floor's bounce through averaging.
      if(material.restitutionCombine==='min')desc.setRestitutionCombineRule(R.CoefficientCombineRule.Min);
      if (shape.rotation) desc.setRotation(shape.rotation);
      if(sound&&!fixed)desc.setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(mass*32);
      // Thin hooks (playtest-2, item 3: "The pitchfork just got stuck in the bucket"): a pail's wire handle caught the
      // fork's head and the pail hung from it. A shape marked `hook` meets only the room (floor, furniture, the cat):
      // loose items carry the room bit (GROUPS.room) in no membership, so they pass a wire instead of hanging on it.
      if(!fixed)desc.setCollisionGroups(shape.hook?GROUPS.hook:GROUPS.item);
      groups.push(fixed?null:shape.hook?GROUPS.hook:GROUPS.item);
      physics.createCollider(desc, body);
    }
    // reach: how far any collider extends from the body origin (the floor check's cheap filter); thin: the smallest
    // extent of the body's local bounding box (the CCD switch's measure; a box of thin walls is not a thin body)
    let reach = 0;
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    const grow = (x, y, z, r) => { const p = [x, y, z]; for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k] - r); hi[k] = Math.max(hi[k], p[k] + r); } reach = Math.max(reach, Math.hypot(x, y, z) + r); };
    for (const shape of shapes) {
      const o = shape.offset || { x: 0, y: 0, z: 0 };
      if (shape.type === 'ball') grow(o.x, o.y, o.z, shape.radius);
      else if (shape.type === 'hull') for (let n = 0; n < shape.points.length; n += 3) grow(o.x + shape.points[n], o.y + shape.points[n + 1], o.z + shape.points[n + 2], shape.radius || 0);
      else { const r = Math.hypot(...shape.half); grow(o.x, o.y, o.z, 0); for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], [o.x, o.y, o.z][k] - shape.half[k]); hi[k] = Math.max(hi[k], [o.x, o.y, o.z][k] + shape.half[k]); } reach = Math.max(reach, Math.hypot(o.x, o.y, o.z) + r); }
    }
    const thin = Math.min(...hi.map((h, k) => h - lo[k]));
    // local points (x, y, z, radius) whose lowest one is the body's lowest point, for the floor check (unsink)
    const low = [];
    for (const shape of shapes) {
      const o = shape.offset || { x: 0, y: 0, z: 0 }, rq = shape.rotation ? new THREE.Quaternion(shape.rotation.x, shape.rotation.y, shape.rotation.z, shape.rotation.w) : null;
      const put = (x, y, z, r) => { const v = new THREE.Vector3(x, y, z); if (rq) v.applyQuaternion(rq); low.push(v.x + o.x, v.y + o.y, v.z + o.z, r); };
      if (shape.type === 'ball') put(0, 0, 0, shape.radius);
      else if (shape.type === 'hull') { const step = Math.max(1, Math.floor(shape.points.length / 3 / 256)); for (let n = 0; n < shape.points.length; n += 3 * step) put(shape.points[n], shape.points[n + 1], shape.points[n + 2], shape.radius || 0); }
      else for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) put(sx * shape.half[0], sy * shape.half[1], sz * shape.half[2], 0);
    }
    const entry = { id, body, object, persist, fixed, presentation, adapterState:adapterState??saved?.adapter??null, sound, silentRestore:!!saved, beforeStep, sync: onSync, resize: onResize, rest, tap, timer: null, reach, low: new Float32Array(low), thin: Math.max(thin, .002), soft: material.softCcdPrediction ?? .08, groups, damping: { linear: material.linearDamping ?? .18, angular: material.angularDamping ?? .4 }, calm: false, calmAt: null, pxRef: Infinity, pxAt: -1, gaining: false, gainRun: 0, wRef: { x: 0, y: 0, z: 0 }, ccd: true, slot: slots++, offAt: null, home: home || (() => ({x:0,y:2,z:0})) };
    entries.set(id, entry); if(sleeping)body.sleep();
    // See RESTORE: an exact restore (same layout, asleep, on the floor or another body) is held at its saved pose.
    if(saved&&sleeping&&!fixed&&sameLayout(saved.layout))entry.hold={p:{x:position.x,y:position.y,z:position.z},q:{x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w},until:stats.steps+RESTORE.hold};
    // Every disable of this body goes through disable()/enable() below, whoever calls body.setEnabled.
    const setEnabled = body.setEnabled.bind(body);
    body.setEnabled = on => on ? enable(entry, setEnabled) : disable(entry, setEnabled);
    if (saved?.support && typeof saved.support==='object') site.supports?.restore(entry,saved.support);
    // Where a resting prop may be is one rule (floor-home.js fitResting, fix round C): a body restored into the layout
    // it was saved in keeps its pose exactly; a new body, or one saved in another layout, is fitted by its adapter.
    if(onResize&&!entry.support&&!(saved&&sameLayout(saved.layout)))onResize(entry); entry.fitKey=layoutKey().join(','); sync(entry);
    if (!sleeping&&!fixed&&!entry.support) wake(entry,!!saved);
    return entry;
  }
  // A borrowed camera (butterman lane, playtest-3). Butterman's rise dollies the page camera in and widens it
  // (stage.cameraBorrowed is true meanwhile). What the world does with the page camera (fitting a prop that comes to
  // rest onto the page, sending one "off the page" home, saving its layout) would use that close-up view: the box came
  // back from scene 3 drawn huge, others were refitted or saved under the wrong view (IMG7). Meanwhile those wait; when
  // the camera is the page's again (cameraBack), the rests that waited run.
  // The redraw itself is the presentation's camera watch (world-presentation.js, visual lane): the lens's
  // updateProjectionMatrix arms it, and two still frames after the camera is back it redraws every picture drawn with
  // another camera, through this world's sync, ~1.5 ms a frame (integration, playtest-3: one redraw, not two).
  const restLater = new Set();
  function cameraBack() {
    for (const entry of restLater) {
      if (!entries.has(entry.id) || held?.entry === entry || !entry.body.isEnabled() || !entry.body.isSleeping()) continue;
      save(entry); entry.rest?.(entry); site.occluders?.rested(entry);
    }
    restLater.clear();
  }
  function sameLayout(saved) { const now = layoutKey(); return Array.isArray(saved) && saved.length === now.length && saved.every((v, i) => Math.abs(v - now[i]) < 1e-6); }
  function layoutKey() { return [stage.width,stage.height,stage.insets.top,stage.insets.bottom,...stage.camera.matrixWorld.elements,...stage.camera.projectionMatrix.elements]; }
  function save(entry, resume = false) {
    if(!entry.persist||(!entry.support&&!entry.body.isSleeping()&&!resume))return;
    const p=entry.body.translation(),q=entry.body.rotation();
    site.store.set('worldBodies.'+entry.id,{version:1,position:[p.x,p.y,p.z],quaternion:[q.x,q.y,q.z,q.w],support:entry.support?structuredClone(entry.support):'floor',awake:!entry.support&&!entry.body.isSleeping(),layout:layoutKey(),adapter:entry.adapterState?structuredClone(entry.adapterState):undefined});
  }
  // An adaptive pixel-ratio step (stage.js setDpr) fires onResize too, but moves nothing in the world: only a new
  // layout re-places and re-saves the floor bodies. (Their pictures follow the new ratio at their next draw, as the
  // supported ones already did.)
  let resizedKey='';
  function resize(){
    if(!site.worldLayout)return;
    const key=layoutKey().join(',');if(key===resizedKey)return;resizedKey=key;
    for(const entry of entries.values()){
      // Each body is fitted once per layout: a body added (restored exactly, or fitted) in this layout is left alone.
      if(!entry.persist||entry.timer||entry.support||entry.fitKey===key)continue;entry.fitKey=key;
      // The adapter's resize is the shared minimal fit (floor-home.js fitResting); a body without one stays put.
      entry.resize?.(entry);
      sync(entry);save(entry);
    }
  }
  stage.onResize.push(resize);
  // Leaving the page keeps every body where it is now (fix round C). A body still settling is saved as it is, awake,
  // and resumes its settling after the reload (save's resume); before, it kept its last REST save, so a prop nudged
  // since (a scoot, a neighbour landing) came back where it had been before. And the store's own pagehide flush runs
  // before this listener (store.js registers first), so these saves were never written: flush them here.
  addEventListener('pagehide',()=>{for(const entry of entries.values())save(entry,!entry.timer&&held?.entry!==entry&&entry.body.isEnabled());site.store.flush?.();});
  function remove(id) {
    const entry = entries.get(id); if (!entry) return;
    if (held?.entry === entry) release();
    if (jam && (jam.held === entry || jam.box === entry)) unjam();
    site.supports?.forget(entry);
    clearTimeout(entry.timer); physics.removeRigidBody(entry.body); active.delete(entry); entries.delete(id);
    if (!active.size && !held && !pushers.size) unlisten();
  }
  // A kinematic capsule that walks through the world and moves loose bodies out of its way (Butterman, e1111-58).
  // It is not an entry: never synced, saved or picked. While one is on, the world keeps stepping; off, it waits far
  // below. A walker only shoves straight ahead what it hits square on, so as it comes near, whatever lies across its
  // line is eased sideways off it (away from its line, or away from the cat when dead ahead), a small sideways
  // acceleration per frame up to a gentle slide; the capsule itself stops anything being walked through.
  // nearCat (butterman lane, playtest-3: "Buttaman just pushed the box into the cat ... and is stuck now"): an item this
  // near the cat's axis is always eased off the line on the side away from the cat, even when its middle lies on the cat's
  // side of the line (it crosses ahead of the walker); before, it went toward the cat, and the walker then pressed it in.
  // The walk measures each item by its footprint (flatReach), not its middle: a big box overlapping the line by an edge
  // was walked into square on. accel .06 -> .2 (per frame): the floor's friction takes about .13 u/s a frame from a
  // sliding prop (friction .8), so at .06 the ease never got a box moving; the walker's capsule did the moving, square on.
  const SWEEP = { margin: .14, ahead: .26, speed: .5, accel: .2, nearCat: 1.1 };
  // How far an item's footprint reaches from its middle on the floor (its colliders' points, `low`: x, y, z, radius).
  function flatReach(entry) {
    if (entry.flatReach != null) return entry.flatReach;
    let r = 0; const l = entry.low; for (let i = 0; i + 3 < l.length; i += 4) r = Math.max(r, Math.hypot(l[i], l[i + 2]) + l[i + 3]);
    return (entry.flatReach = r || entry.reach);
  }
  function pusher(id, { radius, halfHeight }) {
    if (!physics) return null;
    const body = physics.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -50, 0));
    body.userData = 'pusher:' + id;
    physics.createCollider(R.ColliderDesc.capsule(halfHeight, radius).setFriction(.2).setRestitution(0), body);
    let last = null;
    function sweep(pos) {
      const dx = pos.x - last.x, dz = pos.z - last.z, len = Math.hypot(dx, dz);
      if (len < 1e-4) return;
      const ux = dx / len, uz = dz / len, reach = radius + SWEEP.margin;
      for (const entry of entries.values()) {
        const b = entry.body;
        if (entry.fixed || entry.support || entry.timer || held?.entry === entry || !b.isEnabled() || !b.isDynamic()) continue;
        const t = b.translation(), rx = t.x - pos.x, rz = t.z - pos.z, along = rx * ux + rz * uz, across = rz * ux - rx * uz;
        const fr = flatReach(entry), wide = reach + fr;
        if (along < -radius - fr || along > wide + SWEEP.ahead || Math.abs(across) > wide) continue;
        const out = Math.sign(t.z * ux - t.x * uz) || 1;                 // the side away from the cat (his axis is the origin)
        const side = Math.hypot(t.x, t.z) < SWEEP.nearCat || Math.abs(across) <= .02 ? out : Math.sign(across);
        const want = SWEEP.speed * (.35 + .65 * (1 - Math.abs(across) / wide)), v = b.linvel(), lateral = v.z * ux - v.x * uz;
        if (lateral * side >= want) continue;
        const add = Math.min(SWEEP.accel, want - lateral * side) * side;
        b.setLinvel({ x: v.x - add * uz, y: v.y, z: v.z + add * ux }, true); wake(entry);
      }
    }
    const p = { id, radius, halfHeight, body, get on() { return pushers.has(id); },
      move(pos) {
        if (!pushers.has(id)) { body.setTranslation(pos, true); pushers.set(id, p); listen(); }
        else { body.wakeUp(); body.setNextKinematicTranslation(pos); sweep(pos); }
        last = { x: pos.x, z: pos.z };
      },
      off() { last = null; if (!pushers.delete(id)) return; body.setTranslation({ x: 0, y: -50, z: 0 }, true); },
      remove() { p.off(); physics.removeRigidBody(body); } };
    return p;
  }
  function park(entry) { entry.body.sleep(); active.delete(entry); if(!active.size&&!held&&!pushers.size)unlisten(); }
  function grab(entry, point) {
    if(entry.fixed)return;
    release(); site.supports?.detach(entry); entry.grabbed?.();
    const local = new THREE.Vector3(point.x, point.y, point.z).sub(entry.body.translation()).applyQuaternion(new THREE.Quaternion().copy(entry.body.rotation()).invert());
    held = { entry, local, target: bound(new THREE.Vector3().copy(point)) }; wake(entry);
  }
  // The pointer target stays above the floor and between the lens and the back of the room, so the hand never
  // presses a body into the ground or carries it into the camera.
  function bound(t) {
    if (t.y < 0) t.y = 0;
    const d = viewDepth(t), near = 1.2, far = viewDepth(_rel.set(0, .5, 0)) + 3.5;
    if (d < near || d > far) t.addScaledVector(_fwd, Math.min(far, Math.max(near, d)) - d);
    return t;
  }
  function move(point) {
    if (!held) return;
    bound(held.target.copy(point)); wake(held.entry);
  }
  const _q = new THREE.Quaternion(), _g = new THREE.Vector3(), K = new Float64Array(9), A = new Float64Array(9);
  // One substep of the hand: the held body's spin damped and capped, then a velocity-level ball joint at the grip
  // point (it also carries the weight, so an off-centre grip hangs naturally) whose impulse is capped: a finite hand.
  function drive() {
    const { entry, local, target } = held, b = entry.body;
    if (entry.support || !b.isEnabled() || !b.isDynamic()) return;
    const m = b.mass(); if (!(m > 0)) return;
    let w = b.angvel();
    const wl = Math.hypot(w.x, w.y, w.z), keep = Math.exp(-HOLD.spinDamp * DT) * Math.min(1, HOLD.spin / Math.max(wl, 1e-9));
    if (keep < 1) { w = { x: w.x * keep, y: w.y * keep, z: w.z * keep }; b.setAngvel(w, true); }
    const t = b.translation(), q = b.rotation(), c = b.worldCom(), v = b.linvel();
    _q.set(q.x, q.y, q.z, q.w); _g.copy(local).applyQuaternion(_q).add(t);
    const rx = _g.x - c.x, ry = _g.y - c.y, rz = _g.z - c.z;
    // grip-point velocity, and the velocity it should have
    let ex = target.x - _g.x, ey = target.y - _g.y, ez = target.z - _g.z;
    const want = Math.hypot(ex, ey, ez) * HOLD.rate, cap = want > HOLD.speed ? HOLD.speed / want : 1;
    ex *= HOLD.rate * cap; ey *= HOLD.rate * cap; ez *= HOLD.rate * cap;
    // the step's gravity will take g·dt from it: ask for that much more
    const dx = ex - (v.x + w.y * rz - w.z * ry), dy = ey + 9.81 * DT * b.gravityScale() - (v.y + w.z * rx - w.x * rz), dz = ez - (v.z + w.x * ry - w.y * rx);
    // K = (1/m)·E - [r]× I⁻¹ [r]×: the grip point's response to an impulse there
    const e = b.effectiveWorldInvInertia().elements, I = [e[0], e[1], e[2], e[1], e[3], e[4], e[2], e[4], e[5]], S = [0, -rz, ry, rz, 0, -rx, -ry, rx, 0];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) A[i * 3 + j] = I[i * 3] * S[j] + I[i * 3 + 1] * S[3 + j] + I[i * 3 + 2] * S[6 + j];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) K[i * 3 + j] = (i === j ? 1 / m : 0) - (S[i * 3] * A[j] + S[i * 3 + 1] * A[3 + j] + S[i * 3 + 2] * A[6 + j]);
    const [a, b2, c2, d, e2, f, g, h, k] = K, c0 = e2 * k - f * h, c1 = f * g - d * k, c3 = d * h - e2 * g, det = a * c0 + b2 * c1 + c2 * c3;
    if (!(Math.abs(det) > 1e-12)) return;
    let jx = (c0 * dx + (c2 * h - b2 * k) * dy + (b2 * f - c2 * e2) * dz) / det;
    let jy = (c1 * dx + (a * k - c2 * g) * dy + (c2 * d - a * f) * dz) / det;
    let jz = (c3 * dx + (b2 * g - a * h) * dy + (a * e2 - b2 * d) * dz) / det;
    const jl = Math.hypot(jx, jy, jz), max = m * HOLD.accel * DT;
    if (jl > max) { jx *= max / jl; jy *= max / jl; jz *= max / jl; }
    b.applyImpulseAtPoint({ x: jx, y: jy, z: jz }, _g, true);
    // An off-centre pull turns the body; never faster than the cap (the joint catches up next substep).
    capSpin(b, HOLD.spin);
  }
  function capSpin(b, cap) {
    if (!b.isEnabled() || !b.isDynamic()) return;
    const w = b.angvel(), l = Math.hypot(w.x, w.y, w.z);
    if (l > cap) b.setAngvel({ x: w.x * cap / l, y: w.y * cap / l, z: w.z * cap / l }, true);
  }
  function release() {
    if (!held) return;
    const { entry } = held, b = entry.body; held = null;
    // A throw keeps its direction but not an impossible speed or spin.
    if (b.isEnabled() && b.isDynamic()) {
      const v = b.linvel(), w = b.angvel(), vl = Math.hypot(v.x, v.y, v.z), wl = Math.hypot(w.x, w.y, w.z), R2 = HOLD.release;
      if (vl > R2.speed) b.setLinvel({ x: v.x * R2.speed / vl, y: v.y * R2.speed / vl, z: v.z * R2.speed / vl }, true);
      if (wl > R2.spin) b.setAngvel({ x: w.x * R2.spin / wl, y: w.y * R2.spin / wl, z: w.z * R2.spin / wl }, true);
    }
    wake(entry); ccd(entry, true); entry.released?.();
  }
  function visibility() { release(); if (document.hidden) unlisten(); else listen(); }
  document.addEventListener('visibilitychange', visibility);
  const api = { ensure, add, remove, wake, park, disable: e => disable(e), enable: e => enable(e), pusher, flatReach, sync, save, cameraBack, resize, grab, move, release, step, cancelReturn, entries, stats,
    layoutKey, get syncing(){return syncing;}, get ready() { return !!physics; }, get held() { return held; }, get active() { return active.size; },
    get rapier() { return R; }, get physics() { return physics; }, get cat() { return cat; }, get floor() { return floor; },
    visibleShare, viewDepth, get jam() { return jam && { held: jam.held.id, box: jam.box.id }; },
    dispose() { release(); for (const id of [...entries.keys()]) remove(id); disposed = true; unlisten(); events?.free(); physics?.free(); document.removeEventListener('visibilitychange', visibility); },
  };
  return api;
}
