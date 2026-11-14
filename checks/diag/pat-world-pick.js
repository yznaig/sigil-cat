// Replay the existing crowded-pat contract; log the physical receiver and the
// legacy mesh at the same point without changing layout, input or assertions.
// Reconstruct the old setup even after the functional check gains its measured
// settled-floor precondition; ?settled=1 supplies that control below.
const source=(await (await fetch('/checks/look-pat-return.js')).text()).replace(/\/\/ This is a crowded-floor[\s\S]*?(?=const selected=\[\];)/,'');
const instrumented=source.replace("const selected=[];",`note('pat initial floor fixture',JSON.stringify({time:performance.now(),bodies:[...site.world.entries.values()].map(e=>({id:e.id,asleep:e.body.isSleeping(),p:e.body.translation(),v:e.body.linvel()}))}));
if(new URLSearchParams(location.search).has('settled')){await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));for(let n=0;n<100&&site.world.stats.listening;n++)await sleep(100);note('pat settled control',JSON.stringify({active:site.world.active,bodies:[...site.world.entries.values()].map(e=>({id:e.id,asleep:e.body.isSleeping(),p:e.body.translation()}))}));}
const selected=[];`)
.replace("try { await E.fling.fling(); }",`note('pat fling starts',JSON.stringify({side,time:performance.now(),insets:stage.insets,top:keepsakes.get('top')?.box,position:keepsakes.get('top')?.worldEntry?.body.translation(),asleep:keepsakes.get('top')?.worldEntry?.body.isSleeping()}));try { await E.fling.fling(); }`)
.replace("selected.length=0;",`{
 const ray=new site.THREE.Raycaster();ray.setFromCamera(new site.THREE.Vector2(x/stage.width*2-1,1-y/stage.height*2),stage.camera);
 const hit=site.worldInput.pick({clientX:x,clientY:y});
 const meshes=[];p.object.traverse(o=>{if(o.isMesh)meshes.push({order:o.renderOrder,transparent:o.material.transparent,depthTest:o.material.depthTest});});
 note('pat world pick',JSON.stringify({side,time:performance.now(),insets:stage.insets,pick:hit?.entry.id,point:hit?.point,patRay:ray.intersectObject(p.object,true).map(h=>({distance:h.distance,point:h.point})),meshes,top:keepsakes.get('top')?.worldEntry?.body.translation(),topAsleep:keepsakes.get('top')?.worldEntry?.body.isSleeping(),locked:site.input.locked,pressing:site.input.pressing}));
 await __shot('world-unit5-pat-priority-'+(side<0?'left':'right'));
 }selected.length=0;`).replace("held:[...keepsakes.live.values()]", "worldHeld:site.world.held?.entry.id,held:[...keepsakes.live.values()]");
await eval('(async()=>{'+instrumented+'})()');
