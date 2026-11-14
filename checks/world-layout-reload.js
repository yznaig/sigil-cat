await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));
await sleep(3000);
const saved=store.get('worldLayoutCheck');
note('board layout restore after',JSON.stringify({selected:site.pinboard.selected,savedSelected:store.get('pinboard.selected'),root:site.pinboard.root.position.toArray(),paper:keepsakes.get('paper').worldEntry.body.translation(),box:site.pinboard.picture.rect}));
const drifts=saved.map(p=>{const i=keepsakes.get(p.id);return i?Math.hypot(i.px.x-p.x,i.px.y-p.y):Infinity;});
check('world layout reload under half pixel',drifts.every(d=>d<.5),`max=${Math.max(...drifts).toFixed(4)}px; ${JSON.stringify(saved.map((p,n)=>({id:p.id,drift:drifts[n]})))}`);
check('world restored floor idle',!keepsakes.physics.active&&!site.world.stats.listening);
{const was=store.get('worldRowCheck');await until(()=>site.stand?.ready&&site.eggCup?.ready,15000);const d=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 check('world the floor row comes back where it stood, without falling again',!!was&&site.stand?.ready&&site.eggCup?.ready&&d(was.stand,site.stand.root.position.toArray())<1e-4&&d(was.cup,site.eggCup.root.position.toArray())<1e-4&&!site.stand.arrival&&!site.eggCup.arrival,JSON.stringify({was,stand:site.stand?.root?.position.toArray(),cup:site.eggCup?.root?.position.toArray()}));}
await __shot('world-unit2-reloaded');
