cat.auto=false;await site.rack.ready();await site.lamp.inst?.worldTask;await sleep(2300);
const expected=store.get('rackCheck'),T=site.THREE,S=site.supports;
S.refreshAttachments();
const drift=expected.items.map(s=>{const i=keepsakes.get(s.id),a=stage.toScreen(new T.Vector3(...s.p)),b=stage.toScreen(i.object.position);return {id:s.id,px:Math.hypot(a.x-b.x,a.y-b.y),support:JSON.stringify(s.support||null)===JSON.stringify(i.worldEntry.support||null),identity:site.world.entries.get(s.id)===i.worldEntry};});
// Worn parents bob with the cat; their serialized local attachment is exact.
check('rack reload supported identity and <0.5px fixed drift',drift.every(r=>(r.id==='rack/'+expected.wearing||r.px<.5)&&r.support&&r.identity),JSON.stringify(drift));
check('rack reload remembers worn hat lamp occupancy and on',E.hat.wearing===expected.wearing&&site.lamp.on===expected.on&&site.lamp.occupied&&site.lamp.light.visible===expected.on);
// Playtest 2 (gags lane): the rack holds the hats he owns (the party hat only once the cake gave it), so the same set
// comes back that was saved: four in world-rack (granted), three in world-rack-off.
const hats=[...site.rack.hats.keys()].sort().join();
check('rack reload silently asleep',!site.world.stats.listening&&!site.supports.listening&&hats===expected.hats.join(),JSON.stringify({hats,saved:expected.hats,listening:site.world.stats.listening,supports:site.supports.listening}));
await __shot(expected.on?'world-unit7-reload':'world-unit7-off-reload');
