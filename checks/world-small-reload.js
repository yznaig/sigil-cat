cat.auto=false;const W=site.world,T=site.THREE;
await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));
const saved=store.get('smallCheck')||store.get('smallLooseCheck');
for(const old of saved||[]){
 const i=keepsakes.get(old.id),e=i?.worldEntry;
 check('small reload identity '+old.id,!!e&&i.worldReady&&[...W.entries.keys()].filter(id=>id===old.id).length===1);
 if(!e)continue;
 if(old.support?.id==='eyes-cat'){
  check('small reload attached eyes single cat geometry',i.state.on==='cat'&&i.picture.attached&&e.support.id==='eyes-cat'&&JSON.stringify(e.support.position)===JSON.stringify(old.support.position));
 }else{
  const drift=Math.max(Math.abs(i.box.x-old.box.x),Math.abs(i.box.y-old.box.y),Math.abs(i.box.w-old.box.w),Math.abs(i.box.h-old.box.h));
  check('small reload '+old.id+' <.5px',drift<.5&&e.body.isSleeping(),`drift ${drift}`);
 }
}
await sleep(350);const before={dpr:stage.dpr,steps:W.stats.steps,syncs:W.stats.syncs,callbacks:stage.onFrame.length,pictures:saved.map(s=>keepsakes.get(s.id).picture.stats.draws)};
await sleep(2100);check('small reload silent zero work',W.stats.steps===before.steps&&W.stats.syncs===before.syncs&&stage.onFrame.length===before.callbacks&&JSON.stringify(saved.map(s=>keepsakes.get(s.id).picture.stats.draws))===JSON.stringify(before.pictures),JSON.stringify({before,dpr:stage.dpr,steps:W.stats.steps,syncs:W.stats.syncs}));
await __shot('world-small-reload');
