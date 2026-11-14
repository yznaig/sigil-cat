// One shared-premise test after two attempts: same twenty production bodies,
// (a) original overlapping starts/synchronous frames, (b) same starts paced by
// RAF, (c) separated starts paced by RAF. C isolates initial overlap, not a new gate.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const originals=['rifle','top','paper','postcard','ticket'].map(id=>keepsakes.give(id));await Promise.all(originals.map(i=>i.worldTask));await sleep(2000);
const {createMeshPicture}=await import('/src/core/mesh-picture.js');
for(const i of originals){S.detach(i.worldEntry,{wake:false});i.object.visible=true;if(i.cardArt)i.cardArt.visible=true;}
site.pinboard.entry.body.setEnabled(false);site.pinboard.root.visible=false;site.pinboard.picture.card.visible=false;
const gl=stage.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),report={renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),viewport:[stage.width,stage.height],conditions:[]};
stage.timeScale=0;
const p95=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length*.95)],median=a=>a.slice().sort((a,b)=>a-b)[2];
for(const condition of ['dense-sync','dense-paced','separated-paced']){
 const runs=[];
 for(let run=0;run<5;run++){
  const loadBefore=await __loadAverage(),fixtures=[];
  for(let n=0;n<15;n++){
   const src=originals[2+n%3],object=new T.Group();object.add(new T.Mesh(src.cardArt.geometry,new T.MeshBasicMaterial({visible:false,side:T.DoubleSide})));stage.scene.add(object);
   const visual=src.cardArt.clone();visual.matrixAutoUpdate=true;visual.position.set(0,0,0);visual.quaternion.identity();visual.scale.setScalar(1);visual.visible=true;
   const picture=createMeshPicture(site,object,visual,src.colliderVertices),fake={id:'premise-card-'+n,physical:true,object,el:document.createElement('div'),state:{}};
   const e=await W.add({id:fake.id,object,shapes:src.colliderShapes,mass:src.cardDimensions.mass,beforeStep:src.worldEntry.beforeStep,material:{linearDamping:.35,angularDamping:3,friction:.8,restitution:.02,skin:.001,softCcdPrediction:.03},sync(){picture.draw();keepsakes.syncWorld(fake,picture.rect);site.worldLayout.shadow(fake);}});
   fixtures.push({e,picture,fake});
  }
  const list=[...originals.map(i=>i.worldEntry),...fixtures.map(f=>f.e)],pictures=[...originals.map(i=>i.picture),...fixtures.map(f=>f.picture)];
  function reset(){for(const [n,e]of list.entries()){
   const separated=condition==='separated-paced';
   e.body.setTranslation({x:(n%5-2)*(separated?1.05:.30),y:.7+Math.floor(n/5)*.22,z:separated?(Math.floor(n/5)-1.5)*.9:.15+Math.floor(n/5)*.20},false);
   e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);
  }}
  reset();W.physics.propagateModifiedBodyPositionsToColliders();let overlaps=0,deepest=0;
  for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++)for(let i=0;i<list[a].body.numColliders();i++)for(let j=0;j<list[b].body.numColliders();j++){
   const c=list[a].body.collider(i).contactCollider(list[b].body.collider(j),0);if(c?.distance<0){overlaps++;deepest=Math.min(deepest,c.distance);}
  }
  W.step(1/60);const hook=stage.onFrame.indexOf(W.step);if(hook>=0)stage.onFrame.splice(hook,1);
  const drawings=pictures.map(p=>p.stats.draws),samples=[],physicsTimes=[],renderTimes=[],resizeCounts=[];
  const physicsStep=W.physics.step.bind(W.physics),render=stage.renderer.render.bind(stage.renderer),setSize=T.WebGLRenderTarget.prototype.setSize;
  let physicsMs=0,renderMs=0,resizes=0;
  W.physics.step=(...args)=>{const t=performance.now();const r=physicsStep(...args);physicsMs+=performance.now()-t;return r;};
  stage.renderer.render=(...args)=>{const t=performance.now();const r=render(...args);renderMs+=performance.now()-t;return r;};
  T.WebGLRenderTarget.prototype.setSize=function(...args){if(this.width!==args[0]||this.height!==args[1])resizes++;return setSize.apply(this,args);};
  for(let n=0;n<180;n++){
   if(condition!=='dense-sync')await new Promise(requestAnimationFrame);if(n%45===0)reset();
   const a=physicsMs,b=renderMs,c=resizes,t=performance.now();W.step(1/60);samples.push(performance.now()-t);physicsTimes.push(physicsMs-a);renderTimes.push(renderMs-b);resizeCounts.push(resizes-c);
  }
  W.physics.step=physicsStep;stage.renderer.render=render;T.WebGLRenderTarget.prototype.setSize=setSize;
  const row={run:run+1,p95:p95(samples),physicsP95:p95(physicsTimes),renderP95:p95(renderTimes),initialOverlappingColliderPairs:overlaps,initialWorstIntersection:deepest,renderTargetGrowths:resizeCounts.reduce((a,b)=>a+b,0),drawsPerItem:pictures.map((p,n)=>p.stats.draws-drawings[n]),loadBefore,loadAfter:await __loadAverage()};runs.push(row);note('board premise '+condition,JSON.stringify(row));
  for(const f of fixtures){W.remove(f.e.id);site.worldLayout.remove(f.fake.id);f.picture.dispose();stage.scene.remove(f.e.object);}
 }
 report.conditions.push({condition,runs,medianP95:median(runs.map(r=>r.p95)),medianPhysicsP95:median(runs.map(r=>r.physicsP95)),medianRenderP95:median(runs.map(r=>r.renderP95))});
}
// Exact production ticket seeds, then the narrow-phase contacts at the worst edge rest.
const ticket=originals.at(-1),e=ticket.worldEntry,b=e.body,oldSync=e.sync;e.sync=null;
for(const other of W.entries.values())if(other!==e)other.body.setEnabled(false);b.setEnabled(true);W.step(1/120);
function resetTicket(seed){b.setTranslation({x:0,y:.6+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);}
const edge=[];for(let seed=0;seed<100;seed++){resetTicket(seed);let n=0;for(;n<480&&!b.isSleeping();n++)W.step(1/120);const dot=Math.abs(new T.Vector3(0,0,1).applyQuaternion(b.rotation()).y);if(dot<.9)edge.push({seed,dot,seconds:n/120,sleeping:b.isSleeping()});}
report.ticket={edge};
if(edge.length){
 const worst=edge.reduce((a,b)=>a.dot<b.dot?a:b);resetTicket(worst.seed);for(let n=0;n<480&&!b.isSleeping();n++)W.step(1/120);
 let floor;W.physics.forEachCollider(c=>{if(!c.parent())floor=c;});const manifolds=[];
 for(let n=0;n<b.numColliders();n++)W.physics.contactPair(b.collider(n),floor,m=>manifolds.push({collider:n,normal:{...m.normal()},contacts:Array.from({length:m.numSolverContacts()},(_,j)=>({point:{...m.solverContactPoint(j)},distance:m.solverContactDist(j)}))}));
 const saved={position:{...b.translation()},quaternion:{...b.rotation()},linvel:{...b.linvel()},angvel:{...b.angvel()},mass:b.mass(),manifolds};
 e.sync=oldSync;W.sync(e);await __shot('world-unit5-ticket-edge-diagnostic');
 W.wake(e);for(let n=0;n<360;n++)W.step(1/120);
 Object.assign(report.ticket,{worst,atRest:saved,afterWakeWithoutImpulse:{position:{...b.translation()},quaternion:{...b.rotation()},sleeping:b.isSleeping(),dot:Math.abs(new T.Vector3(0,0,1).applyQuaternion(b.rotation()).y)}});
}
note('board shared-premise result',JSON.stringify(report));
