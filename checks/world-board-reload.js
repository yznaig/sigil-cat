await Promise.all(['paper','postcard','ticket'].map(id=>keepsakes.get(id)?.worldTask));await sleep(2300);
const expected=store.get('boardCheck'),T=site.THREE;
const drift=expected.map(s=>{const i=keepsakes.get(s.id),a=stage.toScreen(new T.Vector3(...s.p)),b=stage.toScreen(i.object.position);return {id:s.id,px:Math.hypot(a.x-b.x,a.y-b.y),support:JSON.stringify(s.support)===JSON.stringify(i.worldEntry.support),identity:site.world.entries.get(s.id)===i.worldEntry};});
check('board pinned reload <0.5px one identity per card',drift.every(r=>r.px<.5&&r.support&&r.identity),JSON.stringify(drift));
check('board supported reload idle',!site.world.stats.listening&&!site.supports.listening);
await __shot('world-unit5-reload');
