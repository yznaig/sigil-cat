// e1112-11 (Aaron): the speed limit on this PC is 4.0 ms median p95; 2.5 ms stays the reported target.
const COST_GATE_MS=4.0;
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
await site.rack.ready({grant:E.hat.hats});await site.lamp.award();await site.lamp.inst.worldTask;
const collection=['cloud','crumbs','twinkle','shards','puddle','box','eyes','tin','pat','grease'].map(id=>keepsakes.give(id));await Promise.all(collection.map(i=>i.worldTask));
await cat.ensureButter();cat.setButter(true,'quiet');
const previous=['rifle','top','paper','postcard','ticket'].map(id=>keepsakes.give(id));await Promise.all(previous.map(i=>i.worldTask));
const small=[...site.rack.hats.values(),site.lamp.inst],originals=[...previous,...small];
await sleep(2000);
const {createMeshPicture}=await import('/src/core/mesh-picture.js');
const gl=stage.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');note('rack cost renderer',gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER));
for(const i of originals){S.detach(i.worldEntry,{wake:false});i.object.visible=true;i.cardArt&&(i.cardArt.visible=true);}
site.pinboard.entry.body.setEnabled(false);site.rack.entry.body.setEnabled(false);await sleep(50);
const runs=[],maximum=[];
for(let run=0;run<5;run++){
 site.pinboard.entry.body.setEnabled(false);site.rack.entry.body.setEnabled(false);
 const loadBefore=await __loadAverage(),fixtures=[];
 for(let n=0;n<10;n++){
  const src=small[n%small.length],object=new T.Group(),source=src.art.visual;object.add(new T.Mesh(source.geometry,new T.MeshBasicMaterial({visible:false,side:T.DoubleSide})));stage.scene.add(object);
  const visual=source.clone();visual.matrixAutoUpdate=true;visual.position.set(0,0,0);visual.quaternion.identity();visual.scale.setScalar(1);visual.visible=true;visual.layers.set(0);
  const picture=createMeshPicture(site,object,visual,src.colliderVertices),fake={id:'cost-rack-'+n,physical:true,object,el:document.createElement('div'),state:{}};
  const mass=({wizard:.06,cone:.08,party:.03,crown:.10,bulb:.06})[src.id.replace('rack/','')];
  const e=await W.add({id:fake.id,object,shapes:src.colliderShapes,mass,material:src.physicsMaterial,sync(){picture.draw();keepsakes.syncWorld(fake,picture.rect);site.worldLayout.shadow(fake);}});
  fixtures.push({e,picture,fake});
 }
 const list=[...originals.map(i=>i.worldEntry),...fixtures.map(f=>f.e)];
 function reset(entries){for(const [n,e]of entries.entries()){e.body.setTranslation({x:(n%5-2)*1.05,y:.7+Math.floor(n/5)*.22,z:(Math.floor(n/5)-1.5)*.9},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);}}
 reset(list);W.physics.propagateModifiedBodyPositionsToColliders();let overlapPairs=0;
 for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++)for(let i=0;i<list[a].body.numColliders();i++)for(let j=0;j<list[b].body.numColliders();j++)if(list[a].body.collider(i).contactCollider(list[b].body.collider(j),0)?.distance<0)overlapPairs++;
 check('rack cost starts without interpenetration',!overlapPairs,`run=${run+1} pairs=${overlapPairs}`);
 W.step(1/60);const times=[];
 for(let n=0;n<180;n++){if(n%45===0)reset(list);const t=performance.now();W.step(1/60);times.push(performance.now()-t);}times.sort((a,b)=>a-b);runs.push(times[171]);
 for(const f of fixtures){W.remove(f.e.id);site.worldLayout.remove(f.fake.id);f.picture.dispose();stage.scene.remove(f.e.object);}
 // The reachable workload includes the full unlocked collection and the real
 // fixed furniture colliders. Only the synthetic 20-body grid isolates them.
 site.pinboard.entry.body.setEnabled(true);site.rack.entry.body.setEnabled(true);
 const costs=[];for(let n=0;n<180;n++){if(n%45===0)reset(originals.map(i=>i.worldEntry));const t=performance.now();W.step(1/60);costs.push(performance.now()-t);}costs.sort((a,b)=>a-b);maximum.push(costs[171]);
 note('rack production budget run',JSON.stringify({run:run+1,p95:times[171],maxReachableTenP95:costs[171],loadBefore,loadAfter:await __loadAverage()}));
}
const median=a=>a.slice().sort((a,b)=>a-b)[2];
check('rack 20 production bodies with adapters median p95 <=4.0ms gate, 2.5ms target',median(runs)<=COST_GATE_MS,JSON.stringify({runs,median:median(runs),composition:'2 selected splats + 3 printed cards + 12 shaped hats + 3 bulbs, real pictures, shadows and DOM sync; desktop CPU viewport proxy'}));
check('rack all ten converted movable items <=4.0ms gate, 2.5ms target',median(maximum)<=COST_GATE_MS,JSON.stringify({runs:maximum,median:median(maximum),scene:[...keepsakes.live.keys()].sort(),fixedFurnitureEnabled:site.pinboard.entry.body.isEnabled()&&site.rack.entry.body.isEnabled()}));
