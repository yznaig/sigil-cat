// Real production meshes, colliders and contact: no draw-box approximation.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE,items=[];
for(const id of ['tin','pat']){const i=keepsakes.give(id);await i.worldTask;if(!i.physical)continue;items.push(i);check('shelf '+id+' physical adapter',i.worldReady&&!i.worldError,i.worldError||'');}
const reports=[];
for(const i of items){
 const e=i.worldEntry,b=e.body;S.detach(e,{wake:false});for(const other of W.entries.values())other.body.setEnabled(other===e);
 const sync=e.sync;e.sync=null;W.step(1/120);let worst=0,gap=0,visualGap=0,minY=0,maxGain=0;const failed=[];
 const low=()=>{const q=new T.Quaternion().copy(b.rotation()),p=new T.Vector3().copy(b.translation());return i.colliderVertices.map(v=>v.clone().applyQuaternion(q).add(p)).sort((a,b)=>a.y-b.y)[0];};
 const energy=()=>{const p=b.translation(),v=b.linvel(),w=new T.Vector3().copy(b.angvel()).applyQuaternion(new T.Quaternion().copy(b.rotation()).invert()).applyQuaternion(new T.Quaternion().copy(b.principalInertiaLocalFrame()).invert()),I=b.principalInertia();return b.mass()*(9.81*p.y+.5*(v.x*v.x+v.y*v.y+v.z*v.z))+.5*(I.x*w.x*w.x+I.y*w.y*w.y+I.z*w.z*w.z);};
 site.world.cat?.suspend('fixture',true); // isolated drops where the cat floats (cat-body.js)
 for(let seed=0;seed<100;seed++){
  b.setTranslation({x:0,y:.6+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
  let n=0,last=energy();for(;n<960&&!b.isSleeping();n++){W.step(1/120);const now=energy();maxGain=Math.max(maxGain,now-last);last=now;minY=Math.min(minY,low().y);}
  if(!b.isSleeping())failed.push(seed);worst=Math.max(worst,n/120);const l=low(),a=stage.toScreen(l),f=stage.toScreen(new T.Vector3(l.x,0,l.z));gap=Math.max(gap,Math.hypot(a.x-f.x,a.y-f.y));
  const attr=i.solidArt.geometry.attributes.position,q=new T.Quaternion().copy(b.rotation()),p=new T.Vector3().copy(b.translation());let lowArt=new T.Vector3(0,Infinity,0);
  for(let k=0;k<attr.count;k++){const v=new T.Vector3().fromBufferAttribute(attr,k).applyQuaternion(q).add(p);if(v.y<lowArt.y)lowArt.copy(v);}
  const va=stage.toScreen(lowArt),vf=stage.toScreen(new T.Vector3(lowArt.x,0,lowArt.z));visualGap=Math.max(visualGap,Math.hypot(va.x-vf.x,va.y-vf.y));
 }
 e.sync=sync;const result={id:i.id,failed,worstSeconds:worst,restGapPx:gap,visualGapPx:visualGap,minY,maxEnergyGain:maxGain};reports.push(result);
 check('shelf '+i.id+' 100 drops sleep <=8s contact <=2px energy',!failed.length&&gap<=2&&visualGap<=2&&maxGain<.01,JSON.stringify(result));
 for(const other of W.entries.values())other.body.setEnabled(true);
 i.moveWorld({x:stage.width*.7,y:site.worldLayout.floorY()-15});await until(()=>b.isSleeping(),8000);await __shot('world-unit6-'+i.id);
}
note('shelf solid diagnostics',JSON.stringify(reports));
