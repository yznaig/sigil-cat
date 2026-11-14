// Physics lane: floor-to-bay drag of the top, logging the pointer snap at release.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
for(const id of ['rifle','top','pat','tin'])await keepsakes.give(id).worldTask;await site.shelf.task;await until(()=>!W.stats.listening,12000);
const top=keepsakes.get('top'),e=top.worldEntry;let hit;
for(let y=top.box.y+4;!hit&&y<top.box.y+top.box.h-4;y+=3)for(let x=top.box.x+4;x<top.box.x+top.box.w-4;x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===e){hit={x,y};break;}
const pid=++pointerIds;fire('pointerdown',hit.x,hit.y,pid);const h=W.held,pose=S.pose('shelf','top'),dest=stage.toScreen(pose.p.clone().add(h.local.clone().applyQuaternion(site.shelf.root.quaternion)));
for(let n=1;n<=50;n++){fire('pointermove',hit.x+(dest.x-hit.x)*n/50,hit.y+(dest.y-hit.y)*n/50,pid);await sleep(25);}
await sleep(200);
const f=S.footprint(e,'shelf',S.registry.get('shelf').slots.find(s=>s.id==='top'));
note('snap before release',JSON.stringify({dest,footprint:f,cand:S.candidate(e,dest),candDefault:S.candidate(e),pointer:site.worldInput.pointerOf(e),held:W.held?.entry.id,dropped:!!e.dropped,occupant:S.registry.get('shelf').slots.find(s=>s.id==='top').occupant}));
fire('pointerup',dest.x,dest.y,pid,0);await sleep(400);
note('snap after release',JSON.stringify({support:e.support,held:!!W.held}));
note('snap local',JSON.stringify({local:W.held?.local,verts:[Math.min(...top.colliderVertices.map(v=>v.y)),Math.max(...top.colliderVertices.map(v=>v.y))]}));
