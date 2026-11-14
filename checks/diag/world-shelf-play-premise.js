// One shared-premise measurement: does placement always create a new voice,
// and is the butter recovery fixture isolated from the top's cat-spin gag?
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
for(const id of ['top','pat','tin'])await keepsakes.give(id).worldTask;await site.shelf.task;await until(()=>!W.stats.listening,10000);
audio.setMuted(false);await audio.loadImpacts('wood');const calls=[],base=site.audio;
site.audio={...base,impact(e,o){const time=performance.now(),v=base.impact(e,o);calls.push({time,id:e?.id??e,support:e?.support,options:o,voice:!!v});return v;}};
const i=keepsakes.get('top'),e=i.worldEntry;let hit;
for(let y=i.box.y+4;!hit&&y<i.box.y+i.box.h-4;y+=3)for(let x=i.box.x+4;x<i.box.x+i.box.w-4;x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===e){hit={x,y};break;}
const pid=++pointerIds;fire('pointerdown',hit.x,hit.y,pid);const p=S.pose('shelf','top'),dest=stage.toScreen(p.p.clone().add(W.held.local.clone().applyQuaternion(p.q)));
for(let n=1;n<=50;n++){fire('pointermove',hit.x+(dest.x-hit.x)*n/50,hit.y+(dest.y-hit.y)*n/50,pid);await sleep(25);}
await until(()=>{fire('pointermove',dest.x,dest.y,pid);return !!site.shelf.preview;},6000,40);const released=performance.now();fire('pointerup',dest.x,dest.y,pid,0);await sleep(350);
const pat=keepsakes.get('pat'),pe=pat.worldEntry;S.mount(pe,'cat-butter','crown',{animate:false});const before=E.fling.count,flight=[],old=E.fling.butter.beginFlight;
E.fling.butter.beginFlight=i=>{flight.push({at:performance.now(),stack:new Error().stack,butterOn:cat.butterOn});return old(i);};
e.tap({});await sleep(100);W.park(e);site.shelf.store('top',false);S.detach(pe,{wake:false});const away=stage.onFloor(stage.width*.75,stage.height+150);away.y=.08;pe.body.setTranslation(away,false);W.wake(pe);
await sleep(3600);note('shelf play shared premise',JSON.stringify({released,placementCalls:calls.filter(c=>c.id==='top'&&Math.abs(c.time-released)<300),flingCount:[before,E.fling.count],flight,final:{p:pe.body.translation(),timer:!!pe.timer,respawns:W.stats.respawns,busy:E.fling.busy}}));
site.audio=base;E.fling.butter.beginFlight=old;
