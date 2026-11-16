// floor-outline-reload.js: the reload half of checks/floor-outline.js (floor lane, music round 2026-11-15). After the
// reload the items come back where they were left: the seven carry the outline again (state and canvas pixels with it
// on and off), and no other item does.
const L = await import('/checks/floor-outline-lib.mjs');
const FO = site.floorOutline, W = site.world, show = (o) => JSON.stringify(o);
cat.auto = false;
const all = [...L.SEVEN, ...L.OTHERS];
await until(() => all.every((id) => keepsakes.get(id)?.worldReady || keepsakes.get(id)?.picture?.card), 30000);
await Promise.all(all.map((id) => keepsakes.get(id)?.worldTask).filter(Boolean));
await until(() => !W.stats.listening, 15000); await sleep(1500);
const restored = all.filter((id) => keepsakes.get(id)?.picture?.card?.visible);
check('outline reload: the items are back on the floor', L.SEVEN.every((id) => restored.includes(id)), show({restored}));
const state = Object.fromEntries(all.map((id) => [id, FO.has(id) && FO.drawn(id)]));
check('outline after a reload: on exactly the seven', FO.on && L.SEVEN.every((id) => state[id]) && L.OTHERS.every((id) => !state[id]), show(state));
const sils = L.SEVEN.map((id) => L.silhouette(site, id)), F = await L.frames(site);
const lines = L.near(sils, Math.ceil(4 * L.rectOf(site, L.SEVEN[0]).k)), px = {};
for (const id of restored) px[id] = L.changed(F, L.rectOf(site, id, 6), L.SEVEN.includes(id) ? null : lines);
check('outline after a reload: pixels round each of the seven, none round the others',
  L.SEVEN.every((id) => px[id] >= 40) && L.OTHERS.every((id) => !(id in px) || px[id] === 0), show(px));
await __shot('outline-reload');
__done();
