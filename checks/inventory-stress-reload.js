// After inventory-stress.js reloaded the page in the middle of a move out of the chest: nothing lost or doubled,
// and the inventory still lists only what is in the room.
cat.auto=false;const C=E.box.recipe,W=site.world;
await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));await until(()=>!W.stats.listening,15000);
const known=store.get('inventoryStress')?.known||[],chest=C.state.chest.filter(Boolean).map(e=>e.id);
const lost=known.filter(id=>!chest.includes(id)&&!keepsakes.has(id)),both=chest.filter(id=>keepsakes.has(id));
const inv=C.inventory().filter(Boolean).map(i=>i.id),unlisted=[...keepsakes.live.values()].filter(i=>C.chestable(i)&&!inv.includes(i.id)).map(i=>i.id);
check('inventory a reload in the middle of a move loses and doubles nothing',known.length>5&&!lost.length&&!both.length&&!unlisted.length,JSON.stringify({lost,both,unlisted,chest}));
const away=inv.filter(id=>{const e=keepsakes.get(id)?.worldEntry;return !e||e.timer||!e.object.visible;});
check('inventory after the reload everything listed is in the room',!away.length,JSON.stringify(away));
