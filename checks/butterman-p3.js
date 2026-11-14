// Butterman lane (playtest-3, 2026-11-13). Run with checks/lib.js; checks/butterman-p3-reload.js is its --then.
//   1 the B's round: a fresh save plays scenes 1, 2, 3; once all three have been watched, every B plays scene 1
//   2 his walks through a room full of keepsakes never press one into the cat (scenes 1 and 2, played live)
//   3 scene 3 (the rise) leaves the page as it found it: a snapshot before and after, with props set moving and
//     coming to rest while his close-up has the camera, and the pail hanging on its hook
// run-all.sh keeps the bird away (--storage): its egg arriving mid-check repacks the shelf (floor-home), which the
// scene-3 snapshot would otherwise read as the scene's doing.
cat.auto = false;
const bm = E.butterman, T = site.THREE, W = site.world, SEQ = bm.config.sequence;
await bm.clipsReady;
const B = async () => { site.spells.butter(); await until(() => bm.state.mode === 'playing', 3000); return bm.state.scene; };   // what the B sigil does
const played = [];
async function watchB(during) {                                  // one B, watched to the end
  const scene = await B(); played.push(scene);
  await during?.(scene);
  await until(() => bm.state.mode === 'done', 70000);
  return scene;
}

// ---- 1. a fresh save; a scene cut off does not count ----
check('p3 a fresh save: the B plays scene 1, nothing watched yet', bm.state.next === 'butter' && (bm.state.seen ?? []).length === 0 && !store.get(SEQ.seenKey), `next ${bm.state.next}, seen ${JSON.stringify(bm.state.seen)}`);
{ const s = await B(); await sleep(600); bm.stop(); await sleep(300);
  check('p3 a scene cut off is not watched: the next B plays it again', s === 'butter' && bm.state.next === 'butter' && (bm.state.seen ?? []).length === 0, `played ${s}, next ${bm.state.next}, seen ${JSON.stringify(bm.state.seen)}`); }

// ---- 2. a room full of keepsakes, some in his path and some between his path and the cat ----
const ids = ['box', 'tin', 'top', 'bucket', 'flour', 'postcard', 'paper', 'rifle'];
for (const id of ids) keepsakes.give(id);
await Promise.all(ids.map((id) => keepsakes.get(id).worldTask));
await until(() => !W.stats.listening, 20000);
const entry = (id) => keepsakes.get(id).worldEntry;
const put = (id, x, z, yaw = 0) => {
  const e = entry(id); site.supports.detach(e, { wake: false }); W.cancelReturn(e);
  e.body.setTranslation({ x, y: 0.3, z }, true); e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(0, yaw, 0)), true);
  e.body.setLinvel({ x: 0, y: 0, z: 0 }, true); e.body.setAngvel({ x: 0, y: 0, z: 0 }, true); W.wake(e);
};
const cb = W.cat.body;
// how far a keepsake is sunk into the cat's body (its contacts' least distance; negative = in), and whether its middle is
// inside him
function depth(e) {
  let near = null; const b = e.body;
  for (let i = 0; i < b.numColliders(); i++) for (let j = 0; j < cb.numColliders(); j++)
    W.physics.contactPair(b.collider(i), cb.collider(j), (m) => { for (let k = 0, n = m.numContacts(); k < n; k++) { const d = m.contactDist(k); if (near === null || d < near) near = d; } });
  return near;
}
const inside = (e) => { const t = e.body.translation(); for (let j = 0; j < cb.numColliders(); j++) if (cb.collider(j).containsPoint(t)) return true; return false; };
// Keepsakes round the cat. Scene 1: on his own walk in (sampled from the frozen scene), one at his mark beside the cat
// and the box just before it, where he arrives walking toward the cat. Scene 2: on the ring he walks round the cat (0.53
// from his axis), just inside and just outside it; the box (0.68 x 0.52) across it, where the base build's capsule
// pressed it 0.026 into the cat (scene 2, 5.5 radians round). Each is checked to lie where it was
// put once it has settled (a keepsake put into the cat is thrown out of him, which would test nothing).
const ring = (k, r, yaw) => { const L = bm.config.scenes.find((s) => s.id === 'loop').loop, a = L.at + L.dir * k; return [Math.cos(a) * r, Math.sin(a) * r, yaw]; };
async function walkIn() {
  const fig = stage.scene.getObjectByName('butterman'), path = [];
  bm.inspect('butter'); const hit = bm.state.hitBeat;
  for (let b = 0; b < hit; b += 0.125) { bm.seek(b, 'butter'); await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); if (bm.state.figureVisible) path.push(fig.position.clone()); }
  bm.stop(); await sleep(300);
  // the path point nearest the given distance from the cat's axis, and a nudge off his line (+: away from the camera)
  const at = (d, off = 0, yaw = 0) => { const p = path.reduce((a, c) => Math.abs(Math.hypot(c.x, c.z) - d) < Math.abs(Math.hypot(a.x, a.z) - d) ? c : a); return [p.x, p.z - off, yaw]; };
  const end = path[path.length - 1];
  return { end: +Math.hypot(end.x, end.z).toFixed(2), spots: { box: at(1.02, 0, 0.35), tin: at(0.7), top: at(1.45, -0.05), paper: at(0.66, 0.04, 1.2), bucket: ring(2.6, 0.7, 0), flour: ring(3.6, 0.72, 0.3), postcard: ring(4.4, 0.62, 0.6), rifle: ring(5.2, 0.9, 1.4) } };
}
function room(spots) {
  for (const id of ids) { const v = spots[id]; if (v) put(id, ...v); }
}
const placed = (spots) => ids.filter((id) => spots[id]).map((id) => { const t = entry(id).body.translation(); return { id, off: Math.hypot(t.x - spots[id][0], t.z - spots[id][1]) }; });
async function walk(name, spots) {
  room(spots); await until(() => !W.stats.listening, 20000); await sleep(200);
  const where = placed(spots).filter((w) => w.id !== 'rifle');   // (the rifle is long and rolls a little where it is put)
  // (the box is the one that matters: the others can be nudged by a neighbour as they settle)
  check(`p3 scene ${name}: the room is set (the box lies where it was put)`, where.find((w) => w.id === 'box').off < 0.2, where.map((w) => `${w.id} ${w.off.toFixed(2)}`).join(', '));
  const start = ids.map((id) => { const t = entry(id).body.translation(); return Math.hypot(t.x, t.z); });
  const worst = {};
  const watch = () => { if (!bm.state.figureVisible) return; for (const id of ids) { const e = entry(id); if (!e.body.isEnabled()) continue;
    const d = depth(e), w = worst[id] ??= { d: Infinity, in: false };
    if (d !== null && d < w.d) { const t = e.body.translation(), f = stage.scene.getObjectByName('butterman').position; w.d = d; w.at = `beat ${bm.state.beat?.toFixed(1)}, him ${Math.hypot(f.x - t.x, f.z - t.z).toFixed(2)} away, cat yaw ${cat.yaw.toFixed(2)}`; }
    w.in ||= inside(e); } };
  stage.onRender.push(watch);
  let shot = false;
  const scene = await watchB(async () => { await until(() => (bm.state.beat ?? 0) > (name === 'butter' ? 9 : 16), 30000); await __shot(`butterman-p3-walk-${name}`); shot = true; });
  stage.onRender.splice(stage.onRender.indexOf(watch), 1);
  const rested = await until(() => ids.every((id) => !entry(id).body.isEnabled() || entry(id).body.isSleeping()), 6000);
  const rows = ids.map((id, i) => { const e = entry(id), t = e.body.translation(), w = worst[id] || { d: Infinity, in: false }, now = depth(e);
    return { id, from: +start[i].toFixed(2), to: +Math.hypot(t.x, t.z).toFixed(2), worst: w.d === Infinity ? null : +w.d.toFixed(3), now: now === null ? null : +now.toFixed(3), in: w.in || inside(e), asleep: e.body.isSleeping() }; });
  const bad = rows.filter((r) => r.in || (r.worst ?? 1) < -0.01 || (r.now ?? 1) < -0.01);   // (contacts rest at +0.002..0.012)
  check(`p3 scene ${name}: no keepsake is pushed into the cat`, scene === name && shot && !bad.length,
    `${scene}; ` + rows.map((r) => `${r.id} ${r.from}->${r.to}${r.worst !== null ? ` touch ${r.worst}` : ''}${r.in ? ' INSIDE' : ''}${(r.worst ?? 1) < -0.01 ? ` (${worst[r.id].at})` : ''}`).join(', '));
  check(`p3 scene ${name}: every keepsake is at rest again after it (nothing stuck shaking)`, rested, rows.filter((r) => !r.asleep).map((r) => r.id).join(', ') || 'all asleep');
  return rows;
}
{ const w = await walkIn(); note('p3 scene 1 his mark', `${w.end} from the cat's axis`); await walk('butter', w.spots); }
check('p3 after scene 1 the B plays scene 2', bm.state.next === 'loop' && JSON.stringify(bm.state.seen) === '["butter"]', `next ${bm.state.next}, seen ${JSON.stringify(bm.state.seen)}`);
// [radians past where he joins the ring, his way round; distance from the cat's axis; turn]
await walk('loop', Object.fromEntries([[5.5, 0.7, 0.4], [1.5, 0.56, 0], [2.3, 0.6, 0], [3.1, 0.66, 1], [3.9, 0.7, 0], [4.7, 0.56, 0.5], [0.2, 0.66, 2], [0.9, 0.86, 0.3]].map((v, i) => [ids[i], ring(...v)])));
check('p3 after scene 2 the B plays scene 3', bm.state.next === 'rise', `next ${bm.state.next}, seen ${JSON.stringify(bm.state.seen)}`);

// ---- 3. scene 3 leaves the page as it found it ----
// the pail on its hook under the shelf; the rest at rest on the floor
await site.shelf?.ensure?.(); await until(() => !site.shelf?.arriving, 20000);
const pail = entry('bucket'); site.supports.mount(pail, 'shelf-hooks', 'hook0:bucket', { animate: false });
check('p3 the pail hangs on its hook for scene 3', pail.support?.id === 'shelf-hooks', JSON.stringify(pail.support));
const kicked = ['box', 'flour', 'top'];
{ const L = bm.config.scenes.find((s) => s.id === 'loop').loop;
  [[0.6, 1.0, 0.3], [1.6, 0.9, 0], [2.6, 0.95, 0], [3.6, 0.9, 1], [4.6, 1.0, 0], [5.4, 0.95, 0.5], [5.9, 1.05, 2], [0.1, 1.1, 1]].forEach(([k, r, yaw], i) => {
    if (ids[i] !== 'bucket') put(ids[i], Math.cos(L.at + k) * r, Math.sin(L.at + k) * r, yaw); }); }
await until(() => !W.stats.listening, 20000); await sleep(400);
const r4 = (x) => +(+x).toFixed(4);
function snapshot() {
  const cam = stage.camera, o = {};
  o.camera = [cam.fov, cam.near, cam.far, ...cam.position.toArray(), ...cam.quaternion.toArray(), ...cam.projectionMatrix.elements].map(r4).join(',');
  o.view = JSON.stringify(cam.view && { ...cam.view });
  o.layout = W.layoutKey().map(r4).join(',');
  o.page = [stage.width, stage.height, stage.insets.top, stage.insets.bottom, stage.dpr, stage.cameraBorrowed ? 1 : 0].join(',');
  o.classes = [...document.body.classList].filter((c) => !/^(ach-|reveal)/.test(c)).sort().join(' ');
  o.cat = [cat.shown, cat.hidden, cat.auto, r4(cat.yaw), cat.butterOn].join(',');
  o.him = [bm.state.figureVisible, stage.scene.getObjectByName('butterman').visible, document.getElementById('bm-caption').style.opacity || '0'].join(',');
  const wp = site.worldPresentation; o.presentation = [wp.root.visible, wp.stats.pictureQuads].join(',');   // (which side of the cat a kicked prop lies on may change)
  for (const [id, inst] of keepsakes.live) {
    const e = inst.worldEntry, p = inst.picture;
    o['body ' + id] = e ? [e.body.isEnabled(), e.support?.id ?? 'floor', e.support?.slot ?? '', inst.object?.visible, ...(kicked.includes(id) ? [] : Object.values(e.body.translation()).map(r4))].join(',') : 'none';
    if (p?.card) o['picture ' + id] = [p.card.visible, kicked.includes(id) ? '' : JSON.stringify(p.rect)].join(',');
  }
  return o;
}
const before = snapshot();
let zoomed = null, kickedAt = null;
await watchB(async (scene) => {
  check('p3 the third B plays scene 3', scene === 'rise', scene);
  await until(() => (bm.state.beat ?? 0) > 3.5, 20000);
  zoomed = { fov: stage.camera.fov, borrowed: stage.camera.fov !== +before.camera.split(',')[0] && stage.cameraBorrowed };
  // props set moving while his close-up has the camera (the cat's startles shove what is near him), at rest before he goes
  for (const id of kicked) { const e = entry(id); e.body.setLinvel({ x: 0.2, y: 0.3, z: 0.1 }, true); W.wake(e); }
  kickedAt = bm.state.beat;
  await until(() => kicked.every((id) => entry(id).body.isSleeping()), 7000);
  // (the cat's startles on each stage can wake one near him again: at least one has to have come to rest in the close-up)
  zoomed.restedInZoom = stage.cameraBorrowed ? kicked.filter((id) => entry(id).body.isSleeping()) : [];
  await __shot('butterman-p3-rise-zoomed');
});
await sleep(800); await until(() => !W.stats.listening, 20000); await sleep(300);
const after = snapshot();
const diff = Object.keys({ ...before, ...after }).filter((k) => before[k] !== after[k]);
check('p3 scene 3 had the camera, and props came to rest while it did', !!zoomed?.borrowed && zoomed.restedInZoom.length > 0, JSON.stringify({ ...zoomed, kickedAt }));
check('p3 scene 3 leaves the page as it found it (camera, layout, chrome, him, every body and picture, the pail on its hook)',
  !diff.length && pail.support?.id === 'shelf-hooks', diff.map((k) => `${k}: ${before[k]} -> ${after[k]}`).join(' | ') || `${Object.keys(after).length} values the same`);
// the props that moved in his close-up are drawn for the page's camera, and saved under its layout
const stale = [];
for (const [id, inst] of keepsakes.live) {
  const p = inst.picture; if (!p?.draw || !p.rect) continue;
  const was = JSON.stringify(p.rect), shown = p.card?.visible; p.draw(true);
  if (JSON.stringify(p.rect) !== was || p.card?.visible !== shown) stale.push(`${id} ${was} -> ${JSON.stringify(p.rect)}`);
}
const key = W.layoutKey(), wrong = kicked.filter((id) => { const s = store.get('worldBodies.' + id); return !s || !s.layout.every((v, i) => Math.abs(v - key[i]) < 1e-6); });
check('p3 after scene 3 every picture is the page camera\'s (none left from his close-up)', !stale.length, stale.join(' | ') || 'redrawing each changes nothing');
check('p3 after scene 3 the props that came to rest in it are saved under the page\'s layout', !wrong.length, wrong.join(', ') || kicked.join(', '));
await __shot('butterman-p3-after-rise');

// ---- 1 again: all three watched, so every B is scene 1 ----
check('p3 all three watched: the round is seen and the next B plays scene 1', bm.state.roundSeen && bm.state.next === 'butter' && JSON.stringify(played) === '["butter","loop","rise"]', `played ${JSON.stringify(played)}; seen ${JSON.stringify(bm.state.seen)}; next ${bm.state.next}`);
// the fourth B watched to the end (the old round would then go on to scene 2), then a fifth
await watchB();
played.push(await B()); await sleep(400); bm.stop(); await sleep(300);
check('p3 a fresh save gives 1, 2, 3, then 1, 1', JSON.stringify(played) === '["butter","loop","rise","butter","butter"]' && bm.state.next === 'butter', JSON.stringify(played));
check('p3 Buttaman! is earned by the rise (his third yell), captions off', site.achievements.has('buttaman') && !bm.config.captions, `earned ${site.achievements.has('buttaman')}`);
check('p3 the encore is separate: still not seen, still playable once', !bm.state.encoreSeen && !bm.state.encoreDone, JSON.stringify({ seen: bm.state.encoreSeen, done: bm.state.encoreDone }));
store.flush?.();
