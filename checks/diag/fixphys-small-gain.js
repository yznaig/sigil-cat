cat.auto=false;const W=site.world,T=site.THREE,S=site.supports;
const reports=[];
// Complete async construction before isolated, synchronous seed sequences.
// Otherwise loading the next model lets RAF advance the previous drop, changing
// the contact-cache history between runs even though every seed is identical.
const staged=['crumbs','shards','eyes'].map(id=>keepsakes.give(id));   // the star is a 2D sticker now (playtest 2)
await Promise.all(staged.map(i=>i.worldTask));
const gains=[];for(const id of (stage.opt('ids')||'crumbs,shards,eyes').split(',')){
 const i=keepsakes.get(id);
 check('small drop adapter '+id,i.worldReady,i.worldError||'');if(!i.worldReady)continue;
 const e=i.worldEntry,b=e.body;S.detach(e,{wake:false});
 for(const other of W.entries.values())if(other!==e)other.body.setEnabled(false);
 const sync=e.sync,sound=e.sound,rest=e.rest;e.sync=null;e.sound=null;e.rest=null;
 W.step(1/120);let worst=0,gap=0,visualGap=0,minY=Infinity,minFlat=1,energyGain=0;const failures=[];
 const low=()=>{const q=new T.Quaternion().copy(b.rotation()),p=new T.Vector3().copy(b.translation());return i.colliderVertices.map(v=>v.clone().applyQuaternion(q).add(p)).sort((a,b)=>a.y-b.y)[0];};
 const energy=()=>{const v=b.linvel(),w=new T.Vector3().copy(b.angvel()).applyQuaternion(new T.Quaternion().copy(b.rotation()).invert()).applyQuaternion(new T.Quaternion().copy(b.principalInertiaLocalFrame()).invert()),I=b.principalInertia();return b.mass()*(9.81*b.translation().y+.5*(v.x*v.x+v.y*v.y+v.z*v.z))+.5*(I.x*w.x*w.x+I.y*w.y*w.y+I.z*w.z*w.z);};
 site.world.cat?.suspend('fixture',true); // isolated drops where the cat floats (cat-body.js)
 for(let seed=0;seed<100;seed++){
  b.setTranslation({x:0,y:.5+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);
  b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
  let n=0,last=energy();for(;n<960&&!b.isSleeping();n++){const u=W.stats.unsunk,y0=b.translation().y,pre=[b.linvel(),b.angvel()],ccd0=e.ccd,cc0=b.isCcdEnabled?.();W.step(1/120);if(id==='eyes'&&seed===41&&n>=44&&n<=60){const P=W.physics,cs=[];for(let k=0;k<b.numColliders();k++){const c=b.collider(k);P.contactPairsWith(c,o=>P.contactPair(c,o,m=>{const nn=m.normal(),ds=[];for(let j=0;j<m.numContacts();j++)ds.push(+m.contactDist(j).toFixed(4));cs.push({k,o:o.handle,n:[+nn.x.toFixed(2),+nn.y.toFixed(2),+nn.z.toFixed(2)],ds});}));}note('t41',JSON.stringify({n,y:+b.translation().y.toFixed(4),v:[b.linvel().x,b.linvel().y,b.linvel().z].map(x=>+x.toFixed(3)),w:[b.angvel().x,b.angvel().y,b.angvel().z].map(x=>+x.toFixed(2)),E:+energy().toFixed(5),ccd:[ccd0,e.ccd],calm:e.calm,cs}));}const next=energy();if(next-last>.002)gains.push({id,seed,n,gain:+(next-last).toFixed(5),lift:W.stats.unsunk-u,dy:+(b.translation().y-y0).toFixed(5),v:+Math.hypot(b.linvel().x,b.linvel().y,b.linvel().z).toFixed(3),w:+Math.hypot(b.angvel().x,b.angvel().y,b.angvel().z).toFixed(2)});energyGain=Math.max(energyGain,next-last);last=next;minY=Math.min(minY,low().y);}
  if(!b.isSleeping())failures.push(seed);worst=Math.max(worst,n/120);
  const l=low(),a=stage.toScreen(l),f=stage.toScreen(new T.Vector3(l.x,0,l.z));gap=Math.max(gap,Math.hypot(a.x-f.x,a.y-f.y));
  const q=new T.Quaternion().copy(b.rotation()),p=new T.Vector3().copy(b.translation());let artLow=new T.Vector3(0,Infinity,0);
  i.object.traverse(o=>{if(!o.geometry)return;const a=o.geometry.attributes.position;for(let k=0;k<a.count;k++){const v=new T.Vector3().fromBufferAttribute(a,k).applyQuaternion(q).add(p);if(v.y<artLow.y)artLow=v;}});
  const va=stage.toScreen(artLow),vf=stage.toScreen(new T.Vector3(artLow.x,0,artLow.z));visualGap=Math.max(visualGap,Math.hypot(va.x-vf.x,va.y-vf.y));
  if(id==='twinkle')minFlat=Math.min(minFlat,Math.abs(new T.Vector3(0,0,1).applyQuaternion(b.rotation()).y));
 }
 e.sync=sync;e.sound=sound;e.rest=rest;for(const other of W.entries.values())other.body.setEnabled(true);
 reports.push({id,failures,worstSeconds:worst,restGapPx:gap,visualGapPx:visualGap,minY,minFlat,energyGain});
 note('gains '+id,JSON.stringify({mass:b.mass(),top:gains.filter(g=>g.id===id).sort((a,b)=>b.gain-a.gain).slice(0,8)}));check('small '+id+' 100 natural drops',!failures.length&&gap<=2&&visualGap<=2&&energyGain<.01&&(id!=='twinkle'||minFlat>.8),JSON.stringify(reports.at(-1)));
 i.moveWorld({x:stage.width*({crumbs:.22,shards:.77,eyes:.48,twinkle:.62}[id]),y:site.worldLayout.floorY()});
}
check('small loose final settle',await until(()=>!W.active,12000));
const snapshot=()=>({dpr:stage.dpr,steps:W.stats.steps,syncs:W.stats.syncs,pictures:[...keepsakes.live.values()].map(i=>i.picture?.stats.draws),callbacks:stage.onFrame.length});const before=snapshot();await sleep(2100);
check('small loose zero work',before.steps===W.stats.steps&&before.syncs===W.stats.syncs&&JSON.stringify(before.pictures)===JSON.stringify([...keepsakes.live.values()].map(i=>i.picture?.stats.draws))&&before.callbacks===stage.onFrame.length,JSON.stringify({before,after:snapshot()}));
store.set('smallLooseCheck',[...keepsakes.live.values()].filter(i=>i.physical).map(i=>({id:i.id,p:i.object.position.toArray(),q:i.object.quaternion.toArray(),box:{...i.box}})));store.flush();
await __shot('world-small-loose-rest');
