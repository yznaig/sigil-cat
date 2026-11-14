// One 60Hz production frame: two fixed 120Hz steps, one pose/picture sync.
// Non-overlapping 5x4 floor grid, with .9/1.05 spacing. Twenty large props extend
// beyond the phone viewport; every adapter still draws (no visibility bypass).
// The original world-core fixture is retained separately, unchanged.
// e1112-11 (Aaron): the speed limit on this PC is 4.0 ms median p95; 2.5 ms stays the reported target.
const COST_GATE_MS=4.0;
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const originals=['rifle','top','paper','postcard','ticket'].map(id=>keepsakes.give(id));await Promise.all(originals.map(i=>i.worldTask));await sleep(2000);
const {createMeshPicture}=await import('/src/core/mesh-picture.js');
const gl=stage.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');note('board cost renderer',gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER));
for(const i of originals){S.detach(i.worldEntry,{wake:false});i.object.visible=true;i.cardArt&&(i.cardArt.visible=true);}
site.pinboard.entry.body.setEnabled(false);site.pinboard.picture.card.visible=false;
const runs=[],maximum=[];
for(let run=0;run<5;run++){
 const loadBefore=await __loadAverage(),fixtures=[];
 for(let n=0;n<15;n++){
  const src=originals[2+n%3],object=new T.Group();object.add(new T.Mesh(src.cardArt.geometry,new T.MeshBasicMaterial({visible:false,side:T.DoubleSide})));stage.scene.add(object);
  const visual=src.cardArt.clone();visual.matrixAutoUpdate=true;visual.position.set(0,0,0);visual.quaternion.identity();visual.scale.setScalar(1);visual.visible=true;
  const picture=createMeshPicture(site,object,visual,src.colliderVertices),fake={id:'cost-card-'+n,physical:true,object,el:document.createElement('div'),state:{}};
  const e=await W.add({id:fake.id,object,shapes:src.colliderShapes,mass:src.cardDimensions.mass,beforeStep:src.worldEntry.beforeStep,material:{linearDamping:.35,angularDamping:3,friction:.8,restitution:.02,skin:.001,softCcdPrediction:.03},sync(){picture.draw();keepsakes.syncWorld(fake,picture.rect);site.worldLayout.shadow(fake);}});
  fixtures.push({e,picture,fake});
 }
 const list=[...originals.map(i=>i.worldEntry),...fixtures.map(f=>f.e)];
 function reset(entries){for(const [n,e]of entries.entries()){e.body.setTranslation({x:(n%5-2)*1.05,y:.7+Math.floor(n/5)*.22,z:(Math.floor(n/5)-1.5)*.9},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);}}
 reset(list);W.physics.propagateModifiedBodyPositionsToColliders();
 let overlapPairs=0,deepest=0;
 for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++)for(let i=0;i<list[a].body.numColliders();i++)for(let j=0;j<list[b].body.numColliders();j++){
  const contact=list[a].body.collider(i).contactCollider(list[b].body.collider(j),0);
  if(contact?.distance<0){overlapPairs++;deepest=Math.min(deepest,contact.distance);}
 }
 check('board drop fixture starts without interpenetration',overlapPairs===0,JSON.stringify({run:run+1,overlapPairs,deepest}));
 W.step(1/60); // shader/material warm-up, outside timing
 const times=[];
 for(let n=0;n<180;n++){if(n%45===0)reset(list);const t=performance.now();W.step(1/60);times.push(performance.now()-t);}
 times.sort((a,b)=>a-b);runs.push(times[171]);
 for(const f of fixtures){W.remove(f.e.id);site.worldLayout.remove(f.fake.id);f.picture.dispose();stage.scene.remove(f.e.object);}
 const costs=[];
 for(let n=0;n<180;n++){if(n%45===0)reset(originals.map(i=>i.worldEntry));const t=performance.now();W.step(1/60);costs.push(performance.now()-t);}costs.sort((a,b)=>a-b);maximum.push(costs[171]);
 note('board production budget run',JSON.stringify({run:run+1,p95:times[171],maxReachableFiveP95:costs[171],loadBefore,loadAfter:await __loadAverage()}));
}
const median=a=>a.slice().sort((a,b)=>a-b)[2];
check('board 20 production bodies with adapters median p95 <=4.0ms gate, 2.5ms target',median(runs)<=COST_GATE_MS,JSON.stringify({runs,median:median(runs),composition:'2 selected splats + 18 printed cards; 20 awake at each restart, real pictures, contact shadows, DOM sync and passive air drag; desktop CPU viewport proxy'}));
check('board all five converted bodies moving <=4.0ms gate, 2.5ms target',median(maximum)<=COST_GATE_MS,JSON.stringify({runs:maximum,median:median(maximum)}));
for(const i of originals)keepsakes.take(i.id);
