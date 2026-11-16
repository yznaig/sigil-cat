// fixphys diag: per-step trace of one rack hat drop seed (lowest point, nearest contact, contact normals, lifts). Not in run-all.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE,R=site.rack;let P;
const seed=Number(stage.opt('seed')||37),hat=stage.opt('hat')||'wizard',from=Number(stage.opt('from')||140),to=Number(stage.opt('to')||175);
await R.ready({grant:E.hat.hats});await sleep(1800);P=W.physics;
const i=R.hats.get(hat);S.detach(i.worldEntry,{wake:false});for(const other of W.entries.values())other.body.setEnabled(false);
site.world.cat?.suspend('fixture',true);
const e=await W.add({id:'diag-drop',object:new T.Group(),shapes:i.colliderShapes,mass:i.mass,material:i.physicsMaterial,position:new T.Vector3(0,.6+seed%5*.2,0),rotation:new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27))});
const b=e.body;b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
const lowest=()=>{const q=b.rotation(),lp=e.low,x=q.x,y=q.y,z=q.z,w=q.w,r0=2*(x*y+w*z),r1=1-2*(x*x+z*z),r2=2*(y*z-w*x);let lo=Infinity;for(let n=0;n<lp.length;n+=4)lo=Math.min(lo,r0*lp[n]+r1*lp[n+1]+r2*lp[n+2]-lp[n+3]);return lo+b.translation().y;};
const contacts=()=>{const out=[];for(let k=0;k<b.numColliders();k++){const c=b.collider(k);P.contactPairsWith(c,o=>P.contactPair(c,o,(m,flip)=>{const nn=m.normal();const ds=[];for(let j=0;j<m.numContacts();j++)ds.push(+m.contactDist(j).toFixed(4));out.push({k,other:o.handle,n:[+nn.x.toFixed(2),+nn.y.toFixed(2),+nn.z.toFixed(2)],ds,solver:m.numSolverContacts()});}));}return out;};
const rap=()=>{const out=[];const T3=site.THREE;for(let k=0;k<b.numColliders();k++){const c=b.collider(k),sh=c.shape,vs=sh.vertices,t=c.translation(),r=c.rotation(),q=new T3.Quaternion(r.x,r.y,r.z,r.w);let lo=Infinity;if(vs)for(let j=0;j<vs.length;j+=3){const v=new T3.Vector3(vs[j],vs[j+1],vs[j+2]).applyQuaternion(q);lo=Math.min(lo,v.y+t.y);}out.push({k,type:sh.type,nv:vs?vs.length/3:0,lo:+lo.toFixed(4),skin:c.contactSkin?.()});}return out;};
const rows=[];let u=W.stats.unsunk;
for(let n=0;n<to&&!b.isSleeping();n++){const pre=lowest();W.step(1/120);if(n>=from){const v=b.linvel(),w=b.angvel();rows.push({n,y:+b.translation().y.toFixed(4),pre:+pre.toFixed(4),low:+lowest().toFixed(4),vy:+v.y.toFixed(3),w:+Math.hypot(w.x,w.y,w.z).toFixed(3),lift:W.stats.unsunk-u,rap:rap(),calm:e.calm,c:contacts()});}u=W.stats.unsunk;}
const fl=W.floor;note('floor',JSON.stringify({floor:fl?{t:fl.translation?.(),n:fl.numColliders?.()}:null}));
for(const r of rows)note('lift-trace',JSON.stringify(r));
