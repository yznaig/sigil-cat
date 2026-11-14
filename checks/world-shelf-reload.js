cat.auto=false;await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));await site.shelf.task;await sleep(300);
const saved=store.get('shelfCheck'),drifts=saved.map(s=>{const i=keepsakes.get(s.id);return {id:s.id,px:Math.hypot(i.box.x-s.box.x,i.box.y-s.box.y),support:i.worldEntry.support?.id,handle:i.worldEntry.body.handle};});
check('shelf exact supported reload <.5px',drifts.every(d=>d.px<.5&&d.support==='shelf'),JSON.stringify(drifts));check('shelf restore is quiet with four unique bodies',!site.world.stats.listening&&new Set(drifts.map(d=>d.handle)).size===4);
await __shot('world-unit6-reload');
