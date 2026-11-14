// Layout lane shots (playtest-3, e1113-30): the room with the shelf (rifle on it), the hat rack with its hats, the
// controller in its stand and (when built) the egg in its cup; then the end of Butterman's scene 2.
//   node checks/run.mjs <url> --lib checks/lib.js --js checks/diag/p3-layout-shot.js --size WxH --dpr 1 --out <dir>
//   --storage '{"bird":{"seen":true,"away":-100000000,"gap":300000}}' keeps the bird away.
const T = site.THREE;
cat.auto = false;
if (cat.pose !== 'sit') { await cat.load('sit'); cat.request('sit'); stage.timeScale = 8; await until(() => cat.pose === 'sit' && cat.phase === 'hold', 20000); stage.timeScale = 1; }
store.set('worldDiscoveries', { ...store.get('worldDiscoveries', {}), top: 'solid' });
const rifle = keepsakes.give('rifle'); await rifle.worldTask;
await until(() => site.shelf?.task, 10000); const shelf = site.shelf; await shelf.ensure(); await shelf.task; await until(() => !shelf.arriving, 30000);
await until(() => rifle.worldEntry && rifle.worldEntry.body.isSleeping(), 8000);
for (let i = 0; i < 20 && rifle.worldEntry.support?.id !== 'shelf'; i++) { shelf.store('rifle', false); await sleep(150); }
const st = document.createElement('style'); st.textContent = '.ach-reveal{display:none!important}'; document.head.append(st);
const m = await import(new URL('src/flappy/controller.js', document.baseURI).href);
store.set('bird.stand', true); await m.ensureStand(site);
let c = keepsakes.give('controller'); if (!c) { m.defineController(site, () => {}); c = keepsakes.give('controller'); } await c.worldTask;
await until(() => site.stand.ready, 20000);
site.stand.place(c.worldEntry, false);
await site.rack.ready({ grant: site.eggs.hat.hats }); await until(() => !site.rack.arrival || site.rack.arrival.done, 15000);
// The egg cup (when this build has one) with the egg in it.
if (site.eggs.box?.recipe && !keepsakes.has('egg')) { await site.eggs.box.recipe.dropEgg({ x: stage.width * .7, y: stage.height * .3 }); }
const egg = keepsakes.get('egg'); if (egg) await egg.worldTask;
const cupMod = await import(new URL('src/world/egg-cup.js', document.baseURI).href).catch(() => null);
if (cupMod && egg?.worldEntry) { const cup = cupMod.eggCupService(site); await cup.ensure(); cup.place(egg.worldEntry, false); }
else if (egg?.worldEntry) { keepsakes.take('egg'); }
await sleep(1800);
document.activeElement?.blur();
const r = (x) => x && { x: Math.round(x.x), y: Math.round(x.y), w: Math.round(x.w), h: Math.round(x.h) };
const fe = [-.6, .6].map((x) => stage.toScreen(new T.Vector3(x, .05, .17).applyMatrix4(shelf.root.matrixWorld)));
const info = { size: [stage.width, stage.height], shelf: r(shelf.picture.rect), shelfSlopePct: +((fe[1].y - fe[0].y) / (fe[1].x - fe[0].x) * 100).toFixed(2),
  rack: r(site.rack.picture.rect), rackPos: site.rack.root.position.toArray().map((v) => +v.toFixed(3)), stand: r(site.stand.rect),
  standPos: site.stand.root.position.toArray().map((v) => +v.toFixed(3)), cup: r(site.eggCup?.rect), cupPos: site.eggCup?.root?.position.toArray().map((v) => +v.toFixed(3)),
  occupant: site.stand.occupant, cupOccupant: site.eggCup?.occupant ?? null, rifle: rifle.worldEntry.support?.id };
__say('INFO ' + JSON.stringify(info));
await __shot('room');
site.eggs.butterman.seek(31, 'loop'); await sleep(1500);
const fig = stage.scene.getObjectByName('butterman');
if (fig) { const b = new T.Box3().setFromObject(fig), ps = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) ps.push(stage.toScreen(new T.Vector3(x, y, z)));
  const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y); __say('INFO bm ' + JSON.stringify({ x: Math.round(Math.min(...xs)), y: Math.round(Math.min(...ys)), w: Math.round(Math.max(...xs) - Math.min(...xs)), h: Math.round(Math.max(...ys) - Math.min(...ys)), pos: fig.position.toArray().map((v) => +v.toFixed(3)) })); }
await __shot('bm2');
__done();
