// Contact/material gates for every new tangible item. No renderer/cost gate.
cat.auto=false;const W=site.world,T=site.THREE;
const ids=['bucket'];
const items=[];for(const id of ids){const i=keepsakes.give(id);await i.worldTask;items.push(i);check('cake solid '+id+' has real mesh and body',i.worldReady&&i.object&&i.solidArt&&i.worldEntry.body.mass()>0,i.worldError||'');}
const hooks=[...W.entries.values()].map(e=>[e,e.sync,e.rest,e.beforeStep]);for(const [e]of hooks){e.sync=null;e.rest=null;e.beforeStep=e.contactDamping||null;W.park(e);}
const reports=[];
for(const i of items){
 const e=i.worldEntry,b=e.body;for(const [other]of hooks)other.body.setEnabled(other===e);
 W.step(1/120);const geometry=[];i.solidArt.updateMatrixWorld(true);i.solidArt.traverse(o=>{if(o.isMesh){const inv=i.solidArt.matrixWorld.clone().invert().multiply(o.matrixWorld),a=o.geometry.attributes.position;for(let n=0;n<a.count;n++)geometry.push(new T.Vector3().fromBufferAttribute(a,n).applyMatrix4(inv));}});
 let worst=0,gap=0,artGap=0,energyGain=0;const failures=[];
 const low=vs=>{const p=new T.Vector3().copy(b.translation()),q=new T.Quaternion().copy(b.rotation());let lo=new T.Vector3(0,Infinity,0);for(const v of vs){const a=v.clone().applyQuaternion(q).add(p);if(a.y<lo.y)lo=a;}return lo;};
 const energy=()=>{const p=new T.Vector3().copy(b.worldCom()),v=b.linvel(),w=new T.Vector3().copy(b.angvel()).applyQuaternion(new T.Quaternion().copy(b.rotation()).invert()).applyQuaternion(new T.Quaternion().copy(b.principalInertiaLocalFrame()).invert()),I=b.principalInertia();return b.mass()*(9.81*p.y+.5*(v.x*v.x+v.y*v.y+v.z*v.z))+.5*(I.x*w.x*w.x+I.y*w.y*w.y+I.z*w.z*w.z);};
 const px=v=>{const a=stage.toScreen(v),f=stage.toScreen(new T.Vector3(v.x,0,v.z));return Math.hypot(a.x-f.x,a.y-f.y);};
 for(let seed=0;seed<100;seed++){
  const rotation=new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),lowY=Math.min(...i.colliderVertices.map(v=>v.clone().applyQuaternion(rotation).y));
  b.setTranslation({x:0,y:.6+seed%5*.2-lowY,z:0},true);b.setRotation(rotation,true);b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
  const initial=energy();let peak=initial,n=0;for(;n<960&&!b.isSleeping();n++){W.step(1/120);peak=Math.max(peak,energy());}
  if(!b.isSleeping())failures.push(seed);worst=Math.max(worst,n/120);gap=Math.max(gap,px(low(i.colliderVertices)));if(px(low(geometry))>artGap){artGap=px(low(geometry));note('bucket worst',JSON.stringify({seed,p:b.translation(),q:b.rotation(),art:low(geometry),collider:low(i.colliderVertices),artGap}));}energyGain=Math.max(energyGain,(peak-initial)/Math.max(.001,initial));
 }
 const result={id:i.id,failures,worstSeconds:worst,colliderGap:gap,visibleGap:artGap,energyGain};reports.push(result);
 check('cake '+i.id+' 100 drops settle <=8s contact <=2px no energy growth',!failures.length&&gap<=2&&artGap<=2&&energyGain<.01,JSON.stringify(result));
}
for(const [e,s,r,b]of hooks){e.sync=s;e.rest=r;e.beforeStep=b;e.body.setEnabled(true);W.sync(e);}
note('cake solid diagnostics',JSON.stringify(reports));
