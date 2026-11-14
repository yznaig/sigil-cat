// Layout lane (playtest-3; e1113-07, e1113-30): the egg cup. Aaron: "When the players second egg spawns, a little egg
// cup should pop up right where the egg is comparative to the controller stand" / "the egg cup should spawn right next
// to the controller stand (make it so that the controller rack and cup fall from above into place like the hat rack
// does)". Run with checks/lib.js; checks/egg-cup-reload.js is its --then.
//   1 the first egg brings no cup; the second does, and it falls from above the page into its place (a fade, calm)
//   2 it stands right of the stand, in one straight row with the rack and the stand, clear of the cat
//   3 a soft floor shadow like the rack's, real colliders (a hollow bowl), its rect reserved, an occluder like any furniture
//   4 the egg dropped on it by hand snaps in upright ("Release to place"), one slot only; tapped out it comes free
cat.auto = false;
const W = site.world, S = site.supports, T = site.THREE, R = E.box.recipe, calm = stage.reducedMotion;
const { floorRow, STAND } = await import(new URL('src/flappy/stand.js', document.baseURI).href);
await site.rack.ready({ grant: E.hat.hats }); await until(() => !site.rack.arrival || site.rack.arrival.done, 15000);
const cm = await import(new URL('src/flappy/controller.js', document.baseURI).href);
store.set('bird.stand', true); await cm.ensureStand(site);
await until(() => !W.stats.listening, 15000);

// ---- 1. the first egg: no cup; the second: the cup falls in ----
await R.dropEgg({ x: stage.width * .72, y: stage.height * .3 });
let egg = keepsakes.get('egg'); await egg.worldTask;
check('cup the first egg brings no cup', !site.eggCup && !store.get('eggCup'), JSON.stringify({ count: R.state.egg?.count }));
keepsakes.take('egg'); await sleep(200);
await R.dropEgg({ x: stage.width * .72, y: stage.height * .3 });
check('cup the second egg brings the cup', await until(() => site.eggCup?.ready, 10000) && store.get('eggCup') === true && R.state.egg.count === 2, JSON.stringify({ count: R.state.egg?.count, cup: !!site.eggCup }));
const cup = site.eggCup;
if (!calm) { await until(() => (cup.arrival?.samples?.length ?? 0) > 2 && cup.arrival.samples.at(-1).offset < cup.arrival.plan.drop * .6, 3000, 5); await __shot('egg-cup-falling'); }
await until(() => cup.arrival?.done, 8000);
{ const a = cup.arrival, r = cup.rect, s = a?.samples ?? [];
  check(calm ? 'cup calm: it fades in where it stands' : 'cup it falls from above the page into its place and bounces like the hat rack',
    !!a && a.done && (calm ? a.mode === 'fade' : a.mode === 'drop' && s[0].offset >= r.y + r.h && a.impacts.length === 4 && s.at(-1).offset === 0),
    JSON.stringify({ mode: a?.mode, first: s[0], last: s.at(-1), impacts: a?.impacts.length, rect: r })); }
egg = keepsakes.get('egg'); await egg.worldTask; await until(() => egg.worldEntry.body.isSleeping(), 10000);
await sleep(400); await __shot('egg-cup-arrived');

// ---- 2. the row ----
{ const st = site.stand, sr = st.rect, cr = cup.rect, row = floorRow(site), rk = site.rack.picture.rect;
  const sp = st.root.position, cp = cup.root.position, catLeft = stage.toScreen(new T.Vector3(-STAND.catHalf, 0, 0)).x;
  check('cup it stands right of the stand, in one straight row with it (one depth)', Math.abs(sp.z - cp.z) < 1e-6 && cp.x > sp.x && cr.x + cr.w / 2 > sr.x + sr.w && Math.abs(cp.z - row.z) < 1e-6,
    JSON.stringify({ stand: sp.toArray(), cup: cp.toArray(), sr, cr }));
  check('cup the row stands beside the rack, at its depth where there is room', sr.x + sr.w / 2 > rk.x + rk.w / 2 && sp.z <= site.rack.root.position.z + 1e-6 && (MOBILE || stage.width / stage.height > 1.7 ? row.back === 0 : true),
    JSON.stringify({ rack: rk, rackZ: site.rack.root.position.z, rowZ: row.z, back: row.back, gap: row.gap, cupGap: row.cupGap }));
  check('cup the row stays clear of the cat', cr.x + cr.w <= catLeft + 4 && row.fits, JSON.stringify({ cupRight: cr.x + cr.w, catLeft }));
  note('cup the row', JSON.stringify({ size: [stage.width, stage.height], z: +row.z.toFixed(3), back: +row.back.toFixed(2), standX: +sp.x.toFixed(3), cupX: +cp.x.toFixed(3) }));
}

// ---- 3. shadow, colliders, layout, occluder ----
{ const sh = site.worldLayout.shadows.get('egg-cup'), soft = sh?.group.children.find((o) => o.material?.isMeshBasicMaterial && o.material.map);
  check('cup a soft floor shadow like the rack\'s', !!soft && soft.material.opacity > .2 && !!site.worldLayout.shadows.get('stand')?.group.children.find((o) => o.material?.map), JSON.stringify({ cup: !!soft, opacity: soft?.material.opacity }));
  const b = cup.entry.body, n = b.numColliders(), f = site.worldLayout.furniture()['egg-cup'];
  // a ray straight down through the bowl's middle meets its floor, not a solid lid (the bowl is hollow)
  const Rr = W.rapier, top = cup.root.position.clone().add(new T.Vector3(0, .5, 0)), ray = new Rr.Ray(top, { x: 0, y: -1, z: 0 });
  let hit = Infinity; for (let i = 0; i < n; i++) { const t = b.collider(i).castRay(ray, 1, true); if (t >= 0) hit = Math.min(hit, t); }
  const floorY = .5 - hit;
  check('cup real colliders: foot and stem, the bowl hollow', n === 13 && b.isFixed() && floorY > .08 && floorY < .13, JSON.stringify({ colliders: n, bowlFloorAt: +floorY.toFixed(3) }));
  check('cup its page rect is reserved as fixed furniture', !!f?.fixed && f.w > 10 && f.h > 10, JSON.stringify(f));
  // a small keepsake left right behind it, along the line of sight: covered by it, the cup is what hides it
  const pat = keepsakes.give('pat'); await pat.worldTask; await until(() => pat.worldEntry.body.isSleeping(), 8000);
  const pe = pat.worldEntry, mid = stage.toScreen(cup.root.position.clone().add(new T.Vector3(0, .06, 0)));
  const ray2 = stage.ray(mid.x, mid.y), t0 = (0 - ray2.origin.y) / ray2.direction.y, foot = ray2.origin.clone().addScaledVector(ray2.direction, t0);
  const back = foot.clone().sub(stage.camera.position); back.y = 0; back.normalize(); foot.addScaledVector(back, .14);
  S.detach(pe, { wake: false }); W.cancelReturn(pe); pe.body.setTranslation({ x: foot.x, y: .03, z: foot.z }, false); pe.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false); W.sync(pe); W.wake(pe);
  await until(() => pe.body.isSleeping() || !!pe.scoot, 4000);
  const ex = site.occluders.exposure(pe), scoots = site.occluders.stats.scoots;
  await until(() => !!pe.scoot, 5000); const slid = site.occluders.stats.scoots > scoots || !!pe.scoot;
  await until(() => !pe.scoot && pe.body.isSleeping() && !W.stats.listening, 14000);
  const after = site.occluders.exposure(pe);
  check('cup an occluder like any furniture: the butter left behind it is scooted into view', ex.by === 'furniture-egg-cup' && ex.share < .35 && slid && after.share >= .35, JSON.stringify({ first: ex, slid, after }));
  keepsakes.take('pat');
}

// ---- 4. the egg, by hand ----
{ const e = egg.worldEntry; await until(() => e.body.isSleeping(), 8000);
  const centre = stage.toScreen(e.object.position); let grip = null, d0 = Infinity;
  for (let y = egg.box.y + 2; y < egg.box.y + egg.box.h - 2; y += 2) for (let x = egg.box.x + 2; x < egg.box.x + egg.box.w - 2; x += 2) { const d = Math.hypot(x - centre.x, y - centre.y); if (d < d0 && site.worldInput.pick({ clientX: x, clientY: y })?.entry === e) { grip = { x, y }; d0 = d; } }
  const id = ++pointerIds; fire('pointerdown', grip.x, grip.y, id); await sleep(30);
  const h = W.held, p = S.pose('egg-cup', 'egg'), dest = stage.toScreen(p.p.clone().add(h.local.clone().applyQuaternion(p.q)));
  for (let n = 1; n <= 40; n++) { fire('pointermove', grip.x + (dest.x - grip.x) * n / 40, grip.y + (dest.y - grip.y) * n / 40, id); await sleep(25); }
  let shown = false; for (let n = 0; n < 80 && !shown; n++) { fire('pointermove', dest.x, dest.y, id); await sleep(40); shown = document.querySelector('.shelf-preview')?.textContent === 'Release to place'; }
  await __shot('egg-cup-hover');
  fire('pointerup', dest.x, dest.y, id, 0);
  check('cup the egg dropped on it by hand snaps in ("Release to place" over it)', shown && await until(() => e.support?.id === 'egg-cup' && cup.occupant === 'egg', 3000), JSON.stringify({ shown, support: e.support }));
  await until(() => !S.active, 3000); await sleep(400);
  const up = new T.Vector3(0, 1, 0).applyQuaternion(e.object.quaternion);
  check('cup it stands upright in the bowl, blunt end down', up.y > .999 && Math.abs(e.object.position.y - p.p.y) < 1e-4, JSON.stringify({ up: up.toArray().map((v) => +v.toFixed(3)), y: e.object.position.y }));
  check('cup one slot: nothing else is offered it', !S.registry.get('egg-cup').slots.some((s) => [].concat(s.accepts).some((x) => x !== 'egg')) && S.registry.get('egg-cup').slots.length === 1);
  document.activeElement?.blur(); await __shot('egg-cup-filled');
  // the saved pose says so (what the reload reads)
  check('cup the egg\'s place is saved', store.get('worldBodies.egg')?.support?.id === 'egg-cup' && store.get('eggCup') === true, JSON.stringify(store.get('worldBodies.egg')?.support));
}
store.set('eggCupCheck', { cup: cup.root.position.toArray(), stand: site.stand.root.position.toArray(), egg: egg.worldEntry.object.position.toArray() }); store.flush?.();
