// One premise measurement, before changing the original camera-parallel grip.
cat.auto=false;const i=keepsakes.give('pat');await i.worldTask;await until(()=>!site.world.stats.listening,10000);
const W=site.world,trace=[],record=label=>trace.push({label,body:{...i.worldEntry.body.translation()},target:W.held?.target.toArray(),box:{...i.box},sleeping:i.worldEntry.body.isSleeping()});
record('floor');const start={x:i.box.x+i.box.w/2,y:i.box.y+i.box.h/2},dest={x:stage.width*.3,y:stage.insets.top+110},id=++pointerIds;
fire('pointerdown',start.x,start.y,id);record('grab');
for(let n=1;n<=30;n++){fire('pointermove',start.x+(dest.x-start.x)*n/30,start.y+(dest.y-start.y)*n/30,id);await sleep(25);if(n%5===0)record('move '+n);}
await sleep(500);record('held');fire('pointerup',dest.x,dest.y,id,0);await until(()=>!W.stats.listening,10000);record('rest');
note('shelf grip depth premise',JSON.stringify({size:[stage.width,stage.height],camera:stage.camera.position.toArray(),floor:site.worldLayout.floorY(),trace}));await __shot('world-unit6-depth-premise');
