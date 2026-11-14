// Butterman lane (playtest-2, 2026-11-12): rarer cameos, his model drawn in depth against the keepsakes, and the
// once-ever encore (he walks to the middle, arms up, the ticket falls from the sky and lands behind him, he walks off).
// Run with checks/lib.js; checks/butterman-p2-reload.js is its --then (what survives a reload).
cat.auto = false;
const bm = E.butterman, T = site.THREE, W = site.world, K = bm.config.cameo, ENC = bm.config.encore;
const fig = stage.scene.getObjectByName('butterman'), felt = fig.children.find((m) => m.isMesh).material, gl = stage.renderer.getContext();
await bm.clipsReady;
async function pixel(p) {
  let out = null;
  const f = () => { const d = stage.dpr, x = Math.round(p.x * d), y = gl.drawingBufferHeight - Math.round(p.y * d), px = new Uint8Array(4); gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); out = [...px]; };
  stage.onPresented.push(f); await until(() => out, 3000, 10); stage.onPresented.splice(stage.onPresented.indexOf(f), 1); return out;
}
const sum = (c) => c[0] + c[1] + c[2], near = (a, b) => Math.abs(sum(a) - sum(b)) < 45 && Math.abs(a[3] - b[3]) < 40;
const isHim = (c) => c[3] > 250 && sum(c) < 220;                   // his black felt, solid there (not an edge)
// one page point four ways, same camera, same frame of his scene: everything; without him (his felt hidden); him alone
// (the keepsakes' pictures hidden)
// (and neither, to tell him from the cat, who is the same black felt)
async function three(p) {
  const all = await pixel(p), root = site.worldPresentation.root;
  felt.visible = false; await sleep(60); const props = await pixel(p);
  root.visible = false; await sleep(60); const neither = await pixel(p); felt.visible = true;
  await sleep(60); const him = await pixel(p); root.visible = true; await sleep(60);
  return { all, props, him, neither };
}
// points across a keepsake's picture: an n x n grid over the middle `share` of it
const around = (id, n = 5, share = 0.6) => { const c = centre(id), r = keepsakes.get(id).picture?.rect, w = (r?.w ?? 40) * share, h = (r?.h ?? 40) * share, out = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push({ x: c.x + w * (i / (n - 1) - 0.5), y: c.y + h * (j / (n - 1) - 0.5) }); return out; };
// of the points where both he and a keepsake are drawn: which one shows
async function overlap(idList, n, share) {
  const rows = [];
  for (const id of idList) for (const p of around(id, n, share)) {
    const t = await three(p);
    // not both there, or indistinguishable. The cat is the same black felt and the edge of his body moves a little
    // between the four frames, so a point where any of the cat is drawn can read as "him" without being him (fix
    // round B, playtest-2: the suite's 3 of 4 was such a point, on the bucket's rim over the cat's flank).
    if (!isHim(t.him) || near(t.him, t.neither) || t.neither[3] > 24 || t.props[3] < 200 || near(t.props, t.him)) continue;
    rows.push({ id, him: near(t.all, t.him), keepsake: near(t.all, t.props), t });
  }
  return rows;
}
const put = (id, x, z, yaw = 0) => {
  const e = keepsakes.get(id).worldEntry; site.supports.detach(e, { wake: false }); W.cancelReturn(e);
  e.body.setTranslation({ x, y: 0.4, z }, true); e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(0, yaw, 0)), true);
  e.body.setLinvel({ x: 0, y: 0, z: 0 }, true); e.body.setAngvel({ x: 0, y: 0, z: 0 }, true); W.wake(e);
};
const centre = (id) => stage.toScreen(new T.Vector3().copy(keepsakes.get(id).worldEntry.body.translation()));

// ---- 1. cameos: rarer, and the gap runs from the page load ----
{
  const mean = K.minGap + 1 / K.chancePerSecond;
  check('p2 cameos are about one every 8-10 minutes, never closer than 4', K.minGap >= 240 && mean >= 480 && mean <= 600, `minGap ${K.minGap} s, then ${(K.chancePerSecond * 100).toFixed(2)}%/s: ${(mean / 60).toFixed(1)} min on average`);
  const keep = K.chancePerSecond, before = bm.state.cameos.count; K.chancePerSecond = 1e6;   // any chance at all would fire now
  await sleep(1500); K.chancePerSecond = keep;
  check('p2 no cameo inside the gap after the page loads, even at any chance', bm.state.cameos.count === before && !bm.state.cameos.active, `${bm.state.cameos.count} cameos ${(performance.now() / 1000).toFixed(0)} s after load`);
}

// ---- 2. depth: the keepsakes against his model ----
const ids = ['box', 'tin', 'top', 'bucket'];
for (const id of ids) keepsakes.give(id);
await Promise.all(ids.map((id) => keepsakes.get(id).worldTask));
await until(() => !W.stats.listening, 20000);
put('box', 0.55, -0.7); put('tin', 0.3, 0.55); put('top', -0.4, 0.5); put('bucket', -0.75, -0.2);
await until(() => !W.stats.listening, 20000); await sleep(300);
{ // the rise (scene 3): he is right at the lens; every keepsake his head covers on screen is hidden by him
  bm.seek(10, 'rise'); await sleep(500);
  const rows = await overlap(ids);
  await __shot('butterman-p2-rise-depth');
  check('p2 the rise: keepsakes behind him are covered by his model', rows.length >= 4 && rows.every((r) => r.him), `${rows.filter((r) => r.him).length} of ${rows.length} overlapping points show him (${[...new Set(rows.map((r) => r.id))].join(', ')})`);
  bm.stop(); await sleep(400);
}
{ // the encore standing at the middle: a keepsake behind him is covered, one in front of him covers him
  const z = bm.config.scenes.find((s) => s.id === 'encore').depth;
  for (const id of ['box', 'top', 'tin']) keepsakes.take(id);      // one keepsake at a time near him
  put('bucket', 0.0, z - 0.28);
  await until(() => !W.stats.listening, 20000); await sleep(200);
  bm.seek(13, 'encore'); await sleep(500);
  const back = await overlap(['bucket'], 9, 0.8);   // 9x9: points over the cat are left out now (fix round B)
  await keepsakes.give('tin').worldTask; await until(() => !W.stats.listening, 20000);
  put('tin', 0.0, z + 0.1); await until(() => !W.stats.listening, 20000); await sleep(200);
  const front = await overlap(['tin'], 9, 0.9);
  await __shot('butterman-p2-encore-depth');
  check('p2 the walking scenes: a keepsake behind him is covered by him', back.length >= 1 && back.every((r) => r.him), `${back.filter((r) => r.him).length} of ${back.length} points where he overlaps the bucket show him`);
  check('p2 the walking scenes: a keepsake in front of him covers him', front.length >= 1 && front.every((r) => r.keepsake), `${front.filter((r) => r.keepsake).length} of ${front.length} points where the tin overlaps him show the tin`);
  bm.stop(); await sleep(300);
  for (const id of ['bucket', 'tin']) keepsakes.take(id);
  await sleep(300);
}

// ---- 2b. the end of scene 2 against the floor row (layout lane, playtest-3, e1113-30: "Just have butterman end the
// scene a bit more to the right and have them arranged in a straight row next to the rack"). The rack, the controller
// stand with its controller and the egg cup with its egg in their row; at the end of scene 2 he stands to the right
// of where he stood, out in front of the row: never behind any of it, and drawn over whatever of it he overlaps.
{
  await site.rack.ready({ grant: E.hat.hats }); await until(() => !site.rack.arrival || site.rack.arrival.done, 15000);
  const cm = await import(new URL('src/flappy/controller.js', document.baseURI).href), cu = await import(new URL('src/world/egg-cup.js', document.baseURI).href);
  await cm.ensureStand(site); let c = keepsakes.give('controller'); if (!c) { cm.defineController(site, () => {}); c = keepsakes.give('controller'); } await c.worldTask;
  await until(() => site.stand.ready, 10000); site.stand.place(c.worldEntry, false);
  const cup = cu.eggCupService(site); await cup.ensure(); const egg = keepsakes.give('egg'); await egg.worldTask; cup.place(egg.worldEntry, false);
  await until(() => !W.stats.listening, 20000); await sleep(300);
  const L = bm.config.scenes.find((x) => x.id === 'loop').loop;
  bm.seek(31, 'loop'); await sleep(600);
  const box = new T.Box3().setFromObject(fig), ps = []; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) ps.push(stage.toScreen(new T.Vector3(x, y, z)));
  const him = { x: Math.min(...ps.map((p) => p.x)), y: Math.min(...ps.map((p) => p.y)) }; him.w = Math.max(...ps.map((p) => p.x)) - him.x; him.h = Math.max(...ps.map((p) => p.y)) - him.y;
  const meet = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  const fwd = stage.camera.getWorldDirection(new T.Vector3()), depth = (p) => p.clone().sub(stage.camera.position).dot(fwd);
  const rows = [['stand', site.stand], ['cup', cup]].map(([id, f]) => ({ id, meets: meet(him, f.rect), nearer: depth(fig.position) < depth(f.root.position) - 0.05 }));
  check('p3 the end of scene 2: he stands right of where he stood (x ' + L.end[0] + ' against ' + (Math.cos(L.at) * L.radius + -Math.sin(L.at) * L.open).toFixed(2) + ')', fig.position.x > Math.cos(L.at) * L.radius - Math.sin(L.at) * L.open + 0.2 && Math.abs(fig.position.x - L.end[0]) < 1e-3 && Math.abs(fig.position.z - L.end[1]) < 1e-3, JSON.stringify(fig.position.toArray()));
  check('p3 the end of scene 2: never behind the row (in front of every piece he overlaps on the page)', rows.every((r) => !r.meets || r.nearer), JSON.stringify({ him, rows }));
  // where he overlaps a piece, the page shows him (the pictures' depth order, measured on the drawn frame)
  const pts = []; for (const [, f] of [['stand', site.stand], ['cup', cup]]) { const r = f.rect, x0 = Math.max(r.x, him.x), x1 = Math.min(r.x + r.w, him.x + him.w), y0 = Math.max(r.y, him.y), y1 = Math.min(r.y + r.h, him.y + him.h);
    if (x1 > x0 && y1 > y0) for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) pts.push({ x: x0 + (x1 - x0) * (i + .5) / 5, y: y0 + (y1 - y0) * (j + .5) / 5 }); }
  const shown = []; for (const p of pts) { const t = await three(p); if (!isHim(t.him) || near(t.him, t.neither) || t.props[3] < 200 || near(t.props, t.him)) continue; shown.push(near(t.all, t.him)); }
  check('p3 the end of scene 2: where he overlaps the stand or the cup, he is drawn in front', shown.every(Boolean), `${shown.filter(Boolean).length} of ${shown.length} overlapping points show him`);
  await __shot('butterman-p3-scene2-end');
  bm.stop(); await sleep(300);
  keepsakes.take('egg'); keepsakes.take('controller'); await sleep(200);
}

// ---- 3. the encore: cut off before the ticket falls, nothing is lost and it can still play ----
check('p2 the encore has not been seen on a fresh page', !bm.encoreSeen && !bm.state.encoreDone && store.get(ENC.seenKey) == null);
{
  check('p2 encore() plays it', bm.encore() === true && await until(() => bm.state.mode === 'playing' && bm.state.scene === 'encore', 3000));
  await until(() => (bm.state.beat ?? 0) > 6, 15000); await until(() => keepsakes.get('ticket')?.worldReady, 8000);
  bm.stop(); await sleep(400);
  const t = keepsakes.get('ticket'), e = t?.worldEntry;
  check('p2 cut off before the ticket falls: it is put back in the room, not lost, and the encore is not spent',
    !!e && e.body.isEnabled() && e.object.visible !== false && !bm.state.encoreDone && !bm.encoreSeen, `ticket ${!!t}, enabled ${e?.body.isEnabled()}, done ${bm.state.encoreDone}`);
}

// ---- 4. the encore through the harp's tune: once, with the ticket falling right behind him ----
{
  let event = 0; addEventListener('sigilcat:encore-seen', () => event++);
  const hist = bm.state.history.length, z = bm.config.scenes.find((s) => s.id === 'encore').depth;
  for (const i of E.harp.config.tune) E.harp.pluck(i);
  check('p2 the harp tune plays the encore and its achievement fires', await until(() => bm.state.mode === 'playing' && bm.state.scene === 'encore', 3000) && registry.has('harp'), `scene ${bm.state.scene}`);
  await until(() => (bm.state.beat ?? 0) > 9, 15000);
  const t = keepsakes.get('ticket'), e = t.worldEntry;
  check('p2 the ticket is out of sight before it falls', e.object.visible === false || !e.body.isEnabled(), `visible ${e.object.visible}, enabled ${e.body.isEnabled()}`);
  await until(() => bm.state.ticketFalling, 8000);
  let high = Infinity; const watch = () => { high = Math.min(high, stage.toScreen(e.object.position).y); }; stage.onRender.push(watch);
  await sleep(150); await __shot('butterman-p2-ticket-falling');
  await until(() => !bm.state.ticketFalling, 8000);
  stage.onRender.splice(stage.onRender.indexOf(watch), 1);
  const landedAt = bm.state.beat, p = e.body.translation();
  await sleep(200); await __shot('butterman-p2-ticket-landed');
  check('p2 the ticket falls from above the page', high < stage.insets.top + 40, `first seen at y ${high.toFixed(0)} px`);
  check('p2 it lands right behind him while he stands there, then he walks off', landedAt > 11 && landedAt < 15.25 && p.z < z && p.z > z - 0.6 && Math.abs(p.x) < 0.2 && p.y < 0.05,
    `landed at beat ${landedAt?.toFixed(2)} at ${p.x.toFixed(2)}, ${p.y.toFixed(3)}, ${p.z.toFixed(2)}; he stands at z ${z}`);
  await until(() => bm.state.mode === 'done', 40000);
  const r = t.picture?.rect;
  check('p2 the ticket stays as a keepsake, on the page', keepsakes.has('ticket') && !!r && r.y > stage.insets.top && r.y + r.h < stage.height - stage.insets.bottom && r.x > 0 && r.x + r.w < stage.width, JSON.stringify(r));
  check('p2 the encore is marked seen once it has played (the flag other modules wait on)', bm.encoreSeen && store.get(ENC.seenKey) === true && event === 1, `${ENC.seenKey} = ${store.get(ENC.seenKey)}, event ${event}`);
  // never again: the tune, the ticket, the found mark
  for (const i of E.harp.config.tune) E.harp.pluck(i);
  await sleep(1500);
  const rt = t.picture.rect; await tap(rt.x + rt.w / 2, rt.y + rt.h / 2); await sleep(600);
  E.harp.again?.(); await sleep(800);
  check('p2 it never plays again: not by the tune, a tap on the ticket or the found mark', bm.state.mode === 'done' && bm.state.history.length === hist + 1 && bm.encore() === false, `history ${bm.state.history.join(',')}`);
}
// ---- 5. his scenes are still sound ----
{
  const ex = bm.exitScan('encore'), legs = bm.legScan('encore'), ref = bm.legScan('butter');
  check('p2 the encore: he is off screen before the song ends', ex.lead !== null && ex.lead >= 1.8, JSON.stringify(ex));
  check('p2 the encore: his legs keep clear of each other and inside his body', legs.gap > -0.005 && legs.poke <= Math.max(ref.poke, 0) + 0.005, `encore ${JSON.stringify(legs)} / butter poke ${ref.poke}`);
}
