cat.auto=false;
const W=site.world,T=site.THREE;
const props=['rifle','top'].map(id=>keepsakes.give(id));
await Promise.all(props.map(i=>i.worldTask));
check('props selected splats loaded',props.every(i=>i.worldReady&&i.picture?.mesh&&i.colliderVertices?.length>0),props.map(i=>i.worldError||i.id).join(','));
const gl=stage.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
note('props renderer',gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER));
const snapshots=props.map(i=>({p:{...i.worldEntry.body.translation()},q:{...i.worldEntry.body.rotation()}}));
const advance=n=>{for(let k=0;k<n;k++)W.step(1/120);};
site.world.cat?.suspend('fixture',true); // isolated drops where the cat floats (cat-body.js)
function low(i){const b=i.worldEntry.body,q=new T.Quaternion().copy(b.rotation()),p=new T.Vector3().copy(b.translation());return i.colliderVertices.reduce((best,v)=>{const x=v.clone().applyQuaternion(q).add(p);return !best||x.y<best.y?x:best;},null);}
function energy(b){const v=b.linvel(),w=new T.Vector3().copy(b.angvel()).applyQuaternion(new T.Quaternion().copy(b.rotation()).invert()).applyQuaternion(new T.Quaternion().copy(b.principalInertiaLocalFrame()).invert()),I=b.principalInertia();return b.mass()*(9.81*(new T.Vector3().copy(b.localCom()).applyQuaternion(new T.Quaternion().copy(b.rotation())).add(b.translation()).y)+.5*(v.x*v.x+v.y*v.y+v.z*v.z))+.5*(I.x*w.x*w.x+I.y*w.y*w.y+I.z*w.z*w.z);}
// Physics seeds use the production bodies/colliders, with picture submission disabled only
// for the synchronous batch. The visible replay below exercises the complete adapter.
const reports=[];
for(const inst of props){
 const e=inst.worldEntry,b=e.body,other=props.find(i=>i!==inst).worldEntry;
 other.body.setEnabled(false);other.body.sleep();
 W.step(1/120); // refresh mass/inertia after re-enabling this body
 check('props '+inst.id+' initialized mass',b.mass()>0,`mass=${b.mass()}`);
 const sync=e.sync;e.sync=null;let worstSeconds=0,maxGain=0,minY=Infinity,restGap=0;const failures=[];
 for(let seed=0;seed<100;seed++){
  b.setTranslation({x:0,y:.6+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);
  b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:2,y:1,z:3},true);W.wake(e);
  const initial=energy(b);let peak=initial,n=0;
  while(n<960&&!b.isSleeping()){W.step(1/120);n++;peak=Math.max(peak,energy(b));minY=Math.min(minY,low(inst).y);}
  worstSeconds=Math.max(worstSeconds,n/120);maxGain=Math.max(maxGain,(peak-initial)/initial);
  if(!b.isSleeping())failures.push(seed);
  const p=low(inst),a=stage.toScreen(p),f=stage.toScreen(new T.Vector3(p.x,0,p.z));restGap=Math.max(restGap,Math.hypot(a.x-f.x,a.y-f.y));
 }
 reports.push({id:inst.id,worstSeconds,maxGain,minY,restGap,failures});
 e.sync=sync;other.body.setEnabled(true);
 check('props '+inst.id+' 100 drops settle within 8s',failures.length===0,JSON.stringify(reports.at(-1)));
 check('props '+inst.id+' energy does not grow',maxGain<.01,`max relative gain=${maxGain}`);
 check('props '+inst.id+' resting contact within 2px',restGap<=2,`max=${restGap.toFixed(3)}px`);
}
note('props seeded drop results',JSON.stringify(reports));
// Four off-centre surface grips, two per actual fitted collider.
for(const i of props){
 const b=i.worldEntry.body;
 for(const side of [-1,1]){
  b.setTranslation({x:0,y:.7,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(.35,0,.2)),true);b.setLinvel({x:0,y:0,z:0},true);b.setAngvel({x:0,y:0,z:0},true);W.wake(i.worldEntry);advance(1);
  const sorted=[...i.colliderVertices].sort((a,b)=>i.id==='rifle'?a.x-b.x:a.y-b.y);
  const local=sorted[side<0?0:sorted.length-1],p=local.clone().applyQuaternion(i.object.quaternion).add(i.object.position);
  W.grab(i.worldEntry,p);const before=i.object.quaternion.clone();advance(90);
  const h=W.held,a=stage.toScreen(h.local.clone().applyQuaternion(i.object.quaternion).add(i.object.position)),target=stage.toScreen(h.target);
  const error=Math.hypot(a.x-target.x,a.y-target.y),angle=before.angleTo(i.object.quaternion);
  check(`props ${i.id} grip ${side}`,error<4&&angle>.05,`error=${error.toFixed(3)}px rotation=${angle.toFixed(3)}`);
  await __shot(`world-unit3-${i.id}-grip-${side}`);W.release();
 }
}
// Eight review orientations for both selected assets, then a slow physical drop sequence.
for(let n=0;n<8;n++){
 for(let k=0;k<props.length;k++){const i=props[k],e=i.worldEntry;e.body.setTranslation({x:(k-.5)*.8,y:.5,z:0},true);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.43,n*Math.PI/4,n*.21)),true);e.body.setLinvel({x:0,y:0,z:0},true);e.body.setAngvel({x:0,y:0,z:0},true);W.wake(e);}
 advance(1);stage.timeScale=0;await __shot('world-unit3-orientation-'+n);stage.timeScale=1;
}
for(let k=0;k<props.length;k++){const e=props[k].worldEntry;e.body.setTranslation({x:(k-.5)*.8,y:.5,z:.5},true);e.body.setLinvel({x:.1,y:-1,z:0},true);e.body.setAngvel({x:2,y:1,z:3},true);W.wake(e);}
const costs=[];
for(let n=0;n<120;n++){
 advance(2);costs.push(props.reduce((a,i)=>a+i.picture.stats.pictureMs,0));
 if([0,8,16,24,40,80,119].includes(n)){stage.timeScale=0;await __shot('world-unit3-drop-'+n);stage.timeScale=1;}
}
costs.sort((a,b)=>a-b);const p95=costs[Math.floor(costs.length*.95)];
check('props combined sort and picture <=2ms',p95<=2,`p95=${p95.toFixed(3)}ms desktop CPU at ${stage.width}x${stage.height}; iPhone unmeasured`);
advance(1200);const draws=props.map(i=>i.picture.stats.draws),steps=W.stats.steps;
await sleep(2100);
check('props no sorts pictures or steps at rest',props.every((i,n)=>i.picture.stats.draws===draws[n])&&W.stats.steps===steps&&!W.stats.listening);
for(const i of props){const was=i.worldEntry.body.isSleeping();i.def.tap(i);check('props '+i.id+' tap retained',was&&!i.worldEntry.body.isSleeping());}
advance(1200);store.flush();
await __shot('world-unit3-rest');
