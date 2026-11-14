// Nothing gets lost behind things (playtest-2, physics lane, item 4; decision e1112-35). Aaron: "things behind the cat
// should be slowly scooted off to the left or right until they are in frame and grabbable". The same holds behind ANY
// furniture: the shelf, the rack and its lamp, the pinboard, the bin, and whatever later furniture is added.
//
// Data-driven: an occluder is anything that can cover an item from the camera.
//  - the cat: his body's colliders (cat-body.js), the same test the pointer uses (world-input.js behindCat);
//  - every fixed world entry that has a picture (all furniture, including any added later: a controller stand, shelf
//    hangers): its colliders, or, with none (the shelf), its picture's page rectangle at its depth;
//  - anything else registered here: occluders.add(id, { covers(raycaster, distance, x, y) → true when it hides the
//    point at that distance along raycaster.ray (page point x, y) }), occluders.remove(id).
// An item's exposure is the share of its own surface points (a grid over its picture, kept where a ray meets the item)
// that are on the page and not covered. A body at rest with exposure under SCOOT.hidden is slid sideways along the
// floor, at SCOOT.speed, toward the nearer free side of what covers it (the other side if that one is off the page),
// until its exposure reaches SCOOT.shown. A body that cannot get clear in SCOOT.patience seconds is set down beside
// the occluder instead. Resting bodies are judged every SCOOT.every seconds once they have rested SCOOT.settle seconds
// (a timer, not a frame callback); a scoot keeps the world stepping only while it lasts. A body mostly off the page
// is left to the world's own respawn.
export const SCOOT = { hidden: .35, shown: .6, grid: 7, speed: .45, patience: 6, every: .75, settle: 1.2, judge: .25 };
export function createOccluders(site) {
  const { THREE: T, stage, world } = site, extra = new Map(), ray = new T.Raycaster(), ndc = new T.Vector2();
  const stats = { judged: 0, scoots: 0, placed: 0, freed: 0 };
  let timer = 0, scooting = 0;
  const _rel = new T.Vector3(), _fwd = new T.Vector3();
  const depthOf = p => { stage.camera.getWorldDirection(_fwd); return _rel.copy(p).sub(stage.camera.position).dot(_fwd); };
  // A body's colliders in the way along the ray, nearer than d.
  function bodyCovers(body, caster, d) {
    const R = world.rapier, r = caster.ray, rr = new R.Ray(r.origin, r.direction);
    for (let i = 0; i < body.numColliders(); i++) { const toi = body.collider(i).castRay(rr, d, true); if (toi >= 0 && toi < d - .002) return true; }
    return false;
  }
  function catCovers(caster, d) {
    const cat = world.cat, c = site.cat; if (!cat?.body || !c || c.hidden) return false;
    cat.update(true); if (!cat.enabled) return false;
    return bodyCovers(cat.body, caster, d);
  }
  // The furniture and the registered occluders, as covers(ray, distance, x, y) tests.
  function occluders(skip) {
    const out = [['cat', catCovers]];
    for (const e of world.entries.values()) {
      if (!e.fixed || e === skip || !e.presentation || !e.object.visible) continue;
      if (e.object.userData.occluder === false) continue;
      // Its colliders (the furniture's physical shape); with none, its picture's rectangle at its depth.
      out.push([e.id, e.body.numColliders()
        ? (r, d) => bodyCovers(e.body, r, d)
        : (r, d, x, y) => { const q = e.presentation.rect; return x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h && depthOf(e.object.position) < d; }]);
    }
    for (const [id, o] of extra) out.push([id, o.covers]);
    return out;
  }
  // { share, by, points }: by = the occluder covering most of it.
  function exposure(entry) {
    const r = entry.presentation?.rect; if (!r || !(r.w > 0) || !entry.object.visible) return { share: 1, by: null, points: 0 };
    const list = occluders(entry), count = new Map(), n = SCOOT.grid;
    const top = stage.insets.top, bottom = stage.height - stage.insets.bottom;
    let own = 0, hidden = 0, off = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = r.x + r.w * (i + .5) / n, y = r.y + r.h * (j + .5) / n;
      ndc.set(x / stage.width * 2 - 1, 1 - y / stage.height * 2); ray.setFromCamera(ndc, stage.camera);
      const hit = ray.intersectObject(entry.object, true)[0]; if (!hit) continue;
      own++;
      if (x < 0 || x > stage.width || y < top || y > bottom) { hidden++; off++; continue; }
      for (const [id, covers] of list) if (covers(ray, hit.distance, x, y)) { hidden++; count.set(id, (count.get(id) || 0) + 1); break; }
    }
    let by = null, most = 0; for (const [id, k] of count) if (k > most) { most = k; by = id; }
    stats.judged++;
    return { share: own ? (own - hidden) / own : 1, by, points: own, onPage: own ? (own - off) / own : 1 };
  }
  const candidate = e => e && !e.fixed && !e.support && !e.timer && e.canGrab !== false && e.body.isEnabled() && e.body.isDynamic()
    && world.held?.entry !== e && !e.object.userData.collectionHidden && !site.keepsakes.get(e.id)?.def.sky;
  // Which way along the page: away from the middle of what covers it, unless that side is off the page.
  function direction(entry, by) {
    const r = entry.presentation.rect, cx = r.x + r.w / 2;
    let box = null;
    if (by === 'cat') { const c = site.cat.rect; box = c && c.w ? { x: c.x, w: c.w } : null; }
    else { const e = world.entries.get(by); if (e?.presentation?.rect) box = e.presentation.rect; }
    // Covered by nothing but the page's edge: toward the middle of the page.
    if (!box) return cx < stage.width / 2 ? 1 : -1;
    const mid = box.x + box.w / 2;
    let dir = cx >= mid ? 1 : -1;
    const edge = box ? (dir > 0 ? box.x + box.w + r.w / 2 : box.x - r.w / 2) : cx + dir * r.w;
    if (edge - r.w / 2 < 8 || edge + r.w / 2 > stage.width - 8) dir = -dir;
    return dir;
  }
  function judge(entry) {
    if (!candidate(entry) || entry.scoot) return false;
    // Mostly off the page is the world's own business (its respawn, world.js HOLD.offscreen).
    const x = exposure(entry); if (x.points < 3 || x.share >= SCOOT.hidden || x.onPage < .2) return false;
    const dir = direction(entry, x.by);
    entry.scoot = { dir, by: x.by, t: 0, from: stage.toScreen(entry.object.position).x, flips: 0 };
    stats.scoots++; scooting++; world.wake(entry); return true;
  }
  // Each substep (world.js): the scooting bodies slide sideways along the page's horizontal, on the floor.
  const right = new T.Vector3();
  function drive(dt) {
    if (!scooting) return;
    right.set(1, 0, 0).applyQuaternion(stage.camera.quaternion); right.y = 0; right.normalize();
    for (const e of world.entries.values()) {
      const s = e.scoot; if (!s) continue;
      if (!candidate(e)) { stop(e); continue; }
      const v = e.body.linvel();
      e.body.setLinvel({ x: right.x * SCOOT.speed * s.dir, y: Math.min(v.y, .3), z: right.z * SCOOT.speed * s.dir }, true);
      e.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      s.t += dt;
    }
  }
  function stop(e) { if (!e.scoot) return; e.scoot = null; scooting = Math.max(0, scooting - 1); }
  // Once a frame while any scoot runs (world.js calls it after its step): out yet? stuck?
  function check() {
    if (!scooting || stage.cameraBorrowed) return;   // (borrowed camera: world.js cameraBack)
    for (const e of world.entries.values()) {
      const s = e.scoot; if (!s || s.t - (s.judgedAt ?? -1) < SCOOT.judge) continue;
      s.judgedAt = s.t;
      if (!candidate(e)) { stop(e); continue; }
      const x = exposure(e);
      if (x.share >= SCOOT.shown) { stop(e); stats.freed++; e.body.setLinvel({ x: 0, y: e.body.linvel().y, z: 0 }, true); continue; }
      // No headway (a wall, the page's edge): the other way once; then set it down clear of the occluder.
      const px = stage.toScreen(e.object.position).x, moved = Math.abs(px - s.from);
      if (s.t > 1 && moved < 4 && s.flips < 1) { s.dir = -s.dir; s.flips++; s.from = px; s.t = .01; continue; }
      if (s.t > SCOOT.patience) { stop(e); place(e, x.by); }
      if (s.t > .5) s.from = px;
    }
  }
  // Last resort: set it down on the floor just beside what covers it, on the page.
  function place(e, by) {
    const r = e.presentation.rect, dir = direction(e, by);
    let box = by === 'cat' ? site.cat.rect : world.entries.get(by)?.presentation?.rect;
    const x = box && box.w ? (dir > 0 ? box.x + box.w + r.w * .6 : box.x - r.w * .6) : stage.width / 2;
    const p = site.worldLayout.anchor(Math.max(r.w / 2 + 8, Math.min(stage.width - r.w / 2 - 8, x)));
    p.y = Math.max(e.body.translation().y, e.reach * .6);
    e.body.setTranslation(p, true); e.body.setLinvel({ x: 0, y: 0, z: 0 }, true); world.wake(e); stats.placed++;
  }
  // A body that has just come to rest (world.js) is judged; so is every resting body, now and then.
  // Only a body that has stayed at rest SCOOT.settle seconds is judged (one set down for a moment is left alone).
  function rested(entry) { entry.restPose = null; }
  function sweep() {
    timer = 0; if (document.hidden || !world.ready || stage.cameraBorrowed) return schedule();   // (borrowed camera: world.js cameraBack)
    // A resting body is judged again only when the scene in front of it may have changed (cost: no raycasts while
    // nothing moves).
    const now = performance.now(), key = scene();
    for (const e of world.entries.values()) {
      if (!candidate(e) || !e.body.isSleeping()) { e.restedAt = null; e.restPose = null; continue; }
      // rested here since when (a body moved and put back to sleep between two looks counts from now)
      const t = e.body.translation(), pose = Math.round(t.x * 500) + ',' + Math.round(t.y * 500) + ',' + Math.round(t.z * 500);
      if (e.restPose !== pose) { e.restPose = pose; e.restedAt = now; }
      if (now - e.restedAt < SCOOT.settle * 1000 || e.judgedKey === key + '|' + pose) continue;
      e.judgedKey = key + '|' + pose; judge(e);
    }
    schedule();
  }
  function scene() {
    const c = site.cat, r = c?.rect || {};let fixed = 0;
    for (const e of world.entries.values()) if (e.fixed) { const q = e.presentation?.rect; fixed += 1 + (q ? Math.round(q.x + q.y * 7 + q.w * 13) : 0); }
    return [c?.shown, c?.hidden, Math.round((c?.spin?.rotation.y || 0) * 20), Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h), stage.width, stage.height, fixed, extra.size].join();
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(sweep, SCOOT.every * 1000); }
  // Nothing to judge until the world is up (and its engine is never asked for from here).
  schedule();
  return {
    add(id, o) { extra.set(id, o); }, remove(id) { extra.delete(id); },
    exposure, judge, rested, drive, check, stats, get scooting() { return scooting; },
  };
}
