// Native floor-to-slot insertion for every bay, using a visible central grip.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const items=['rifle','top','tin','pat'].map(id=>keepsakes.give(id));await Promise.all(items.map(i=>i.worldTask));await site.shelf.task;await until(()=>!W.stats.listening,12000);
for(const i of items){
 const centre=stage.toScreen(i.object.position);let hit=null,distance=Infinity;
 for(let y=i.box.y+2;y<i.box.y+i.box.h-2;y+=2)for(let x=i.box.x+2;x<i.box.x+i.box.w-2;x+=2){const d=Math.hypot(x-centre.x,y-centre.y);if(d<distance&&site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry){hit={x,y};distance=d;}}
 check('shelf '+i.id+' floor surface pickable',!!hit);if(!hit)continue;
 const id=++pointerIds;fire('pointerdown',hit.x,hit.y,id);const h=W.held,p=S.pose('shelf',i.id),dest=stage.toScreen(p.p.clone().add(h.local.clone().applyQuaternion(site.shelf.root.quaternion)));// the bay's upright frame (the top's bay is tilted, e1111-42)
 for(let n=1;n<=50;n++){fire('pointermove',hit.x+(dest.x-hit.x)*n/50,hit.y+(dest.y-hit.y)*n/50,id);await sleep(25);}
 const preview=await until(()=>{fire('pointermove',dest.x,dest.y,id);return !!site.shelf.preview;},6000,30),candidate=S.candidate(i.worldEntry);
 fire('pointerup',dest.x,dest.y,id,0);await sleep(300);
 check('shelf '+i.id+' full native drag inserts',preview&&i.worldEntry.support?.id==='shelf'&&i.worldEntry.support.slot===i.id,JSON.stringify({hit,dest,local:h.local.toArray(),candidate,support:i.worldEntry.support}));
}
await __shot('world-unit6-drag-all');
