// Physics lane: the rifle's 100 seeded drops (world-props) under variants, energy gain per variant.
const {HOLD}=await import('/src/core/world.js');
cat.auto=false;const W=site.world,T=site.THREE;
const props=['rifle','top'].map(id=>keepsakes.give(id));await Promise.all(props.map(i=>i.worldTask));
site.world.cat?.suspend('fixture',true);
function energy(b){const v=b.linvel(),w=new T.Vector3().copy(b.angvel()).applyQuaternion(new T.Quaternion().copy(b.rotation()).invert()).applyQuaternion(new T.Quaternion().copy(b.principalInertiaLocalFrame()).invert()),I=b.principalInertia();return b.mass()*(9.81*(new T.Vector3().copy(b.localCom()).applyQuaternion(new T.Quaternion().copy(b.rotation())).add(b.translation()).y)+.5*(v.x*v.x+v.y*v.y+v.z*v.z))+.5*(I.x*w.x*w.x+I.y*w.y*w.y+I.z*w.z*w.z);}
const variants=JSON.parse(stage.opt('variants')||'[{}]');
for(const id of ['rifle','top']){
 const inst=keepsakes.get(id),e=inst.worldEntry,b=e.body,other=props.find(i=>i!==inst).worldEntry;other.body.setEnabled(false);other.body.sleep();W.step(1/120);
 for(const v of variants){
  Object.assign(HOLD,v);if(v.iterations)W.physics.numSolverIterations=v.iterations;
  const sync=e.sync;e.sync=null;let maxGain=0,worstSeed=-1,worst=0,unsunk=W.stats.unsunk;const t0=performance.now();let steps=0;
  for(let seed=0;seed<100;seed++){
   b.setTranslation({x:0,y:.6+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);
   b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:2,y:1,z:3},true);W.wake(e);
   const initial=energy(b);let peak=initial,n=0;
   while(n<960&&!b.isSleeping()){W.step(1/120);n++;peak=Math.max(peak,energy(b));}
   steps+=n;worst=Math.max(worst,n);const g=(peak-initial)/initial;if(g>maxGain){maxGain=g;worstSeed=seed;}
  }
  e.sync=sync;
  note('drops '+id+' '+JSON.stringify(v),JSON.stringify({maxGain,worstSeed,worstSeconds:worst/120,unsunk:W.stats.unsunk-unsunk,msPerStep:(performance.now()-t0)/steps}));
 }
 other.body.setEnabled(true);
}
