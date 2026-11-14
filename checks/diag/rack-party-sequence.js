cat.auto=false;await site.rack.ready();const W=site.world,S=site.supports,T=site.THREE,i=site.rack.hats.get('party');
for(const e of W.entries.values()){W.park(e);e.body.setEnabled(false);}
const material={friction:.8,restitution:.02,linearDamping:.3,angularDamping:3,skin:.001};
const results=[];
for(const mode of ['fresh','physical-lift']){
 let e=null;const failed=[];let worst=0,maxEnergyGain=0;
 for(let seed=0;seed<100;seed++){
  if(mode==='fresh'||!e){e=await W.add({id:'party-sequence',object:new T.Group(),shapes:i.colliderShapes,mass:.03,material,position:new T.Vector3(0,.6+seed%5*.2,0),rotation:new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27))});}
  const b=e.body;
  if(mode==='physical-lift'){
   const p=new T.Vector3().copy(b.translation());W.grab(e,p.clone().add(new T.Vector3(.02,.04,0)));
   const target=p.clone();target.y=1;
   for(let n=0;n<120;n++){W.move(target);W.step(1/120);}W.release();
  }
  b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
  const energy=()=>{const p=b.translation(),v=b.linvel(),w=new T.Vector3().copy(b.angvel()).applyQuaternion(new T.Quaternion().copy(b.rotation()).invert()).applyQuaternion(new T.Quaternion().copy(b.principalInertiaLocalFrame()).invert()),I=b.principalInertia();return b.mass()*(9.81*p.y+.5*(v.x*v.x+v.y*v.y+v.z*v.z))+.5*(I.x*w.x*w.x+I.y*w.y*w.y+I.z*w.z*w.z);};
  let n=0,last=energy();for(;n<960&&!b.isSleeping();n++){W.step(1/120);const now=energy();maxEnergyGain=Math.max(maxEnergyGain,now-last);last=now;}
  if(!b.isSleeping())failed.push(seed);worst=Math.max(worst,n/120);
  if(mode==='fresh'){W.remove(e.id);e=null;}
 }
 if(e)W.remove(e.id);results.push({mode,failed,worst,maxEnergyGain});
}
note('rack party sequence premise',JSON.stringify(results));
