// Inserted immediately before the original 100-seed loop. No solver mutations.
const floor = (()=>{let f;W.physics.forEachCollider(c=>{if(!c.parent())f=c;});return f;})();
const traces=[], summaries=[];
let seedTrace=[];
const copy=v=>v&&({...v});
function probe(seed,n) {
 const body=a.body,colliders=[];
 for(let i=0;i<body.numColliders();i++) {
  const c=body.collider(i),h=c.halfExtents(),q=new T.Quaternion().copy(c.rotation()),p=c.translation();
  // Rapier 0.19.3 exposes no Collider world-AABB accessor. Exact cuboid AABB
  // independently enumerates all 8 collider corners, using Rapier pose/extents.
  const corners=[];for(const x of [-h.x,h.x])for(const y of [-h.y,h.y])for(const z of [-h.z,h.z])corners.push(new T.Vector3(x,y,z).applyQuaternion(q).add(p));
  const low=corners.reduce((a,b)=>a.y<b.y?a:b),u=stage.toScreen(low),v=stage.toScreen(new T.Vector3(low.x,0,low.z));
  const manifolds=[];W.physics.contactPair(c,floor,(m,flipped)=>{
   manifolds.push({flipped,normal:copy(m.normal()),contacts:Array.from({length:m.numContacts()},(_,j)=>({distance:m.contactDist(j),impulse:m.contactImpulse(j),local1:copy(m.localContactPoint1(j)),local2:copy(m.localContactPoint2(j))})),solver:Array.from({length:m.numSolverContacts()},(_,j)=>({distance:m.solverContactDist(j),point:copy(m.solverContactPoint(j))}))});
  });
  colliders.push({index:i,translation:copy(p),rotation:copy(c.rotation()),half:copy(h),aabbMinY:low.y,lowestCorner:copy(low),penetrationCssPixels:low.y<0?Math.hypot(u.x-v.x,u.y-v.y):0,contact:c.contactCollider(floor,2),manifolds});
 }
 const r={seed,step:n,translation:copy(body.translation()),rotation:copy(body.rotation()),linvel:copy(body.linvel()),angvel:copy(body.angvel()),ccdEnabled:body.isCcdEnabled(),ccdActive:typeof body.isCcdActive==='function'?body.isCcdActive():null,checkMinY:support(a),colliders};
 seedTrace.push(r);
 if(n===139){traces.push(seedTrace);summaries.push({seed,minY:Math.min(...seedTrace.map(r=>r.checkMinY)),violations:seedTrace.filter(r=>r.checkMinY<-.01).length});seedTrace=[];}
}
function finishProbe(){
 const worst=summaries.reduce((a,b)=>a.minY<b.minY?a:b),trace=traces[worst.seed],moment=trace.reduce((a,b)=>a.checkMinY<b.checkMinY?a:b);
 let start=moment.step,end=start;while(start>0&&trace[start-1].checkMinY<-.01)start--;while(end<139&&trace[end+1].checkMinY<-.01)end++;
 return {floor:{translation:copy(floor.translation()),half:copy(floor.halfExtents()),top:floor.translation().y+floor.halfExtents().y},summaries,worst:moment,violationRun:{start,end,fixedSteps:end-start+1,milliseconds:(end-start+1)*1000/120,framesAt60Hz:(end-start+1)/2},trace};
}
