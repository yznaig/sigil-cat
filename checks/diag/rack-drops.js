cat.auto=false;const W=site.world,S=site.supports,T=site.THREE,R=site.rack;await R.ready();await site.lamp.award();await site.lamp.inst.worldTask;const hats=[...R.hats.values()],bulb=site.lamp.inst;
const small=[...hats,bulb],reports=[];
// Production bodies, 100 reproducible bounded-speed releases each. Adapter
// picture cost is measured in world-rack-cost; physics here never fakes sleep.
for(const i of small){
 const e=i.worldEntry,b=e.body;S.detach(e,{wake:false});for(const other of W.entries.values())if(other!==e)other.body.setEnabled(false);
 const sync=e.sync;e.sync=null;W.step(1/120);const positions=i.art.visual.geometry.attributes.position,local=[];
 for(let n=0;n<positions.count;n++)local.push(new T.Vector3().fromBufferAttribute(positions,n));
 let worst=0,gap=0,minY=Infinity,maxGain=0;const failed=[];
 const energy=()=>{const p=b.translation(),v=b.linvel(),w=new T.Vector3().copy(b.angvel()).applyQuaternion(new T.Quaternion().copy(b.rotation()).invert()).applyQuaternion(new T.Quaternion().copy(b.principalInertiaLocalFrame()).invert()),I=b.principalInertia();return b.mass()*(9.81*p.y+.5*(v.x*v.x+v.y*v.y+v.z*v.z))+.5*(I.x*w.x*w.x+I.y*w.y*w.y+I.z*w.z*w.z);};
 for(let seed=0;seed<100;seed++){
  b.setTranslation({x:0,y:.6+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
  let n=0,last=energy();for(;n<960&&!b.isSleeping();n++){W.step(1/120);const now=energy();maxGain=Math.max(maxGain,now-last);last=now;minY=Math.min(minY,b.translation().y);}
  if(!b.isSleeping())failed.push(seed);worst=Math.max(worst,n/120);
  const q=new T.Quaternion().copy(b.rotation()),p=new T.Vector3().copy(b.translation()),low=local.map(v=>v.clone().applyQuaternion(q).add(p)).sort((a,b)=>a.y-b.y)[0],a=stage.toScreen(low),f=stage.toScreen(new T.Vector3(low.x,0,low.z));gap=Math.max(gap,Math.hypot(a.x-f.x,a.y-f.y));
 }
 e.sync=sync;reports.push({id:i.id,failed,worstSeconds:worst,restGapPx:gap,maxEnergyGain:maxGain,minBodyY:minY});
 check('rack '+i.id+' 100 drops sleep <=8s gap <=2px no energy growth',!failed.length&&gap<=2&&maxGain<.01,JSON.stringify(reports.at(-1)));
 for(const other of W.entries.values())other.body.setEnabled(true);
 if(i===bulb)S.mount(e,'rack-lamp','socket',{animate:false});else await R.hang(i.id.split('/')[1],false);
 // Inspect the actual back and underside at page scale, using the one body.
 S.detach(e,{wake:false});W.park(e);b.setTranslation(stage.onWall(stage.width*.65,stage.height*.57,0),false);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(.7,Math.PI,.4)),false);W.sync(e);await __shot('world-unit7-back-'+i.id.replace('rack/',''));
 b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(2.2,.6,.2)),false);W.sync(e);await __shot('world-unit7-underside-'+i.id.replace('rack/',''));
 if(i===bulb)S.mount(e,'rack-lamp','socket',{animate:false});else await R.hang(i.id.split('/')[1],false);
}
