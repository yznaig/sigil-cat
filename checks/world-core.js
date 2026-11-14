// Core acceptance: exercise the live service before art/layout migration in units 2/3.
// e1112-11 (Aaron): the speed limit on this PC is 4.0 ms median p95; 2.5 ms stays the reported target.
const COST_GATE_MS=4.0;
const W = site.world, T = stage.THREE;
check('world no eager engine before first solid', !W.ready && W.stats.requestedAt === null);
keepsakes.give('top');
check('world lazy engine loads after cat', await until(()=>W.ready,30000) && W.stats.requestedAt >= site.timing.shown);
const gl = stage.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
note('world renderer', gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
keepsakes.take('top'); cat.auto = false;
// The check props are dropped where his body can reach once he has lain down during the engine wait (cat-body.js
// fits each pose): isolate the core fixture from him, as the other drop fixtures do.
W.cat?.suspend('fixture', true);
function prop(id, x, type = 'rifle') {
  const object = new T.Group(), shapes=[];
  function box(half, offset, color) {
    const mesh = new T.Mesh(new T.BoxGeometry(...half.map(x=>x*2)),new T.MeshStandardMaterial({color,roughness:.45}));
    mesh.position.copy(offset);object.add(mesh);shapes.push({half,offset});
  }
  if(type==='rifle') {box([.25,.035,.035],{x:0,y:0,z:0},0x4b5139);box([.14,.012,.012],{x:.35,y:.012,z:0},0x292929);box([.07,.025,.025],{x:.03,y:.07,z:0},0x252525);}
  else {box([.065,.04,.065],{x:0,y:0,z:0},0xb88b46);box([.012,.06,.012],{x:0,y:.09,z:0},0xb88b46);}
  stage.scene.add(object);
  return W.add({id,object,shapes,position:{x,y:.8,z:.5},mass:type==='rifle'?1.2:.2});
}
const a=await prop('check-rifle',-.35), b=await prop('check-top',.45,'top');
// Synchronous stepping uses the same registered callback, so software rendering cannot hide missed contacts.
const advance=(n)=>{for(let i=0;i<n;i++)W.step(1/120);};
let minY=Infinity, longestDip=0, worstDip=null, worstDepth=null;
const dips=[];
function support(entry) {
  const p=entry.body.translation(),q=new T.Quaternion().copy(entry.body.rotation());let min=Infinity;
  for(let i=0;i<entry.body.numColliders();i++){
    const c=entry.body.collider(i),h=c.halfExtents(),o=c.translation(),r=new T.Quaternion().copy(c.rotation());
    const ay=Math.abs(new T.Vector3(1,0,0).applyQuaternion(r).y)*h.x+Math.abs(new T.Vector3(0,1,0).applyQuaternion(r).y)*h.y+Math.abs(new T.Vector3(0,0,1).applyQuaternion(r).y)*h.z;
    min=Math.min(min,o.y-ay);
  }return min;
}
for(let seed=0;seed<100;seed++){
 const q=new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27));
 a.body.setTranslation({x:-.4,y:.6+(seed%5)*.2,z:.2},true);a.body.setRotation(q,true);
 a.body.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);a.body.setAngvel({x:2,y:1,z:3},true);W.wake(a);
 let dip=null;
 // Include two closing samples so an episode at the original boundary cannot be hidden.
 for(let n=0;n<142;n++){
  W.step(1/120);const y=support(a);
  if(y<minY){minY=y;worstDepth={seed,step:n,depth:y};}
  if(y<0){if(!dip)dip={seed,start:n,steps:0,depth:y};dip.steps++;dip.depth=Math.min(dip.depth,y);}
  else if(dip){dips.push(dip);if(dip.steps>longestDip){longestDip=dip.steps;worstDip=dip;}dip=null;}
 }
 if(dip){dip.unresolved=true;dips.push(dip);if(dip.steps>longestDip){longestDip=dip.steps;worstDip=dip;}}
}
const deepestEpisode=dips.reduce((best,d)=>!best||d.depth<best.depth?d:best,null);
note('world transient floor depth',JSON.stringify({worstDepth,deepestEpisode,longestDip,worstDip,dips}));
note('world transient duration (diagnostic only, e1110-15)',`longest=${longestDip} steps / ${(longestDip*1000/120).toFixed(3)}ms`);
// Put both test props in visible air; routed input must hold an off-centre surface point.
a.body.setTranslation({x:-.3,y:.65,z:.5},true);a.body.setRotation({x:0,y:0,z:0,w:1},true);a.body.setLinvel({x:0,y:0,z:0},true);W.wake(a);
b.body.setTranslation({x:.45,y:.65,z:.5},true);b.body.setRotation({x:0,y:0,z:0,w:1},true);b.body.setLinvel({x:0,y:0,z:0},true);W.wake(b);advance(1);
for(const entry of [a,b]){
 const local=entry===a?new T.Vector3(-.2,0,.035):new T.Vector3(0,.12,.012);
 const point=local.applyQuaternion(entry.object.quaternion).add(entry.object.position),p=stage.toScreen(point),id=++pointerIds;
 fire('pointerdown',p.x,p.y,id);const picked=W.held?.entry===entry;
 const before=new T.Quaternion().copy(entry.body.rotation());
 fire('pointermove',p.x+24,p.y-70,id);advance(90);
 const grip=W.held, actual=grip && new T.Vector3().copy(grip.local).applyQuaternion(new T.Quaternion().copy(entry.body.rotation())).add(entry.body.translation());
 const target=grip && grip.target.clone();
 const u=actual&&stage.toScreen(actual),v=target&&stage.toScreen(target),err=u?Math.hypot(u.x-v.x,u.y-v.y):Infinity;
 const angle=before.angleTo(new T.Quaternion().copy(entry.body.rotation()));
 check('world '+entry.id+' off-centre grip',picked&&err<4&&angle>.05,`error=${err.toFixed(3)}px angle=${angle.toFixed(3)}`);
 await __shot('world-unit1-held-'+entry.id);
 fire('pointercancel',p.x,p.y,id,0);
 check('world cancellation removes joint',!W.held&&W.physics.impulseJoints.len()===0);
}
// A captured press must also end when the window loses focus.
advance(600);
const p=stage.toScreen(a.object.position),id=++pointerIds;fire('pointerdown',p.x,p.y,id);window.dispatchEvent(new Event('blur'));
check('world blur releases input',!W.held&&!input.pressing&&W.physics.impulseJoints.len()===0);
advance(1200);
const idle={steps:W.stats.steps,syncs:W.stats.syncs};await sleep(2100);
check('world sleeping unregisters callback',!W.stats.listening&&W.active===0&&W.stats.steps===idle.steps&&W.stats.syncs===idle.syncs,`steps=${W.stats.steps-idle.steps} syncs=${W.stats.syncs-idle.syncs}`);
for(const entry of W.entries.values()){
 let low=null;
 for(let i=0;i<entry.body.numColliders();i++){
  const c=entry.body.collider(i),h=c.halfExtents(),q=new T.Quaternion().copy(c.rotation());
  for(const x of [-h.x,h.x])for(const y of [-h.y,h.y])for(const z of [-h.z,h.z]){
   const v=new T.Vector3(x,y,z).applyQuaternion(q).add(c.translation());if(!low||v.y<low.y)low=v;
  }
 }
 const u=stage.toScreen(low),v=stage.toScreen(new T.Vector3(low.x,0,low.z)),px=Math.hypot(u.x-v.x,u.y-v.y);
 check('world resting collider within 2px '+entry.id,entry.body.isSleeping()&&px<=2,`gap=${px.toFixed(3)}px y=${low.y.toFixed(6)}`);
}
await __shot('world-unit1-rest');
// Collider and artwork now share the original .012 barrel radial half-extents.
// Measure the actual resting visible geometry against y=0, in CSS pixels.
a.object.updateMatrixWorld(true);
let low=null;
for(const mesh of a.object.children){
 const vertices=mesh.geometry.attributes.position;
 for(let i=0;i<vertices.count;i++){
  const v=new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
  if(!low||v.y<low.y)low=v;
 }
}
const floorPoint=new T.Vector3(low.x,0,low.z),screenLow=stage.toScreen(low),screenFloor=stage.toScreen(floorPoint);
const gap=Math.hypot(screenLow.x-screenFloor.x,screenLow.y-screenFloor.y);
check('world resting art gap',gap<2,`gap=${gap.toFixed(3)}px height=${low.y.toFixed(5)}`);
const ruler=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(low.x-.12,0,low.z),new T.Vector3(low.x+.12,0,low.z)]),new T.LineBasicMaterial({color:0xff4444,depthTest:false}));
stage.scene.add(ruler);await __shot('world-unit1-barrel-gap');stage.scene.remove(ruler);ruler.geometry.dispose();ruler.material.dispose();
// One 5-second timer, no per-frame polling while out of bounds.
a.body.setTranslation({x:20,y:1,z:0},true);W.wake(a);advance(1);
const respawnBefore=W.stats.respawns,at=performance.now();await sleep(4700);
check('world respawn waits five seconds',!!a.timer&&!a.object.visible&&W.stats.respawns===respawnBefore);
await until(()=>W.stats.respawns>respawnBefore,1500);
check('world respawn falls once from above',W.stats.respawns===respawnBefore+1&&a.object.visible&&a.body.translation().y>1,`delay=${(performance.now()-at).toFixed(0)}ms`);
// Median of five independent, identical 20-body workloads at this viewport.
// Recreate bodies so sleeping/contact caches from one run cannot cheapen the next.
// Includes W.step sync/bookkeeping; excludes body creation and load-average RPC.
for(const entry of [...W.entries.values()]){stage.scene.remove(entry.object);W.remove(entry.id);}
const runs=[];
for(let run=0;run<5;run++) {
 const loadBefore=await __loadAverage();
 await prop('check-rifle',-.35);
 await prop('check-top',.45,'top');
 for(let i=0;i<18;i++)await prop('check-load-'+i,(i%6-3)*.2,'top');
 const samples=[];
 for(let n=0;n<180;n++){const t=performance.now();advance(2);samples.push(performance.now()-t);}
 samples.sort((a,b)=>a-b);
 const p95=samples[Math.floor(samples.length*.95)];
 for(const entry of [...W.entries.values()]){stage.scene.remove(entry.object);W.remove(entry.id);}
 const loadAfter=await __loadAverage();
 runs.push(p95);
 note('world budget run '+(run+1),JSON.stringify({p95,loadBefore,loadAfter}));
}
const median=[...runs].sort((a,b)=>a-b)[2];
check('world 20 bodies desktop CPU budget',median<=COST_GATE_MS,`median p95=${median.toFixed(3)}ms/60Hz frame (shared-CPU gate 4.0ms, e1112-11; target 2.5ms, design aim 2.0ms); runs=${runs.map(x=>x.toFixed(3))}; phone viewport is not iPhone hardware`);
check('world cleanup zero bodies and joints',W.entries.size===0&&!W.stats.listening&&W.physics.impulseJoints.len()===0);
