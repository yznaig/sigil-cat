// One controlled contact-margin sweep after the low/high margins missed opposite sides.
const {defineController}=await import(new URL('src/flappy/controller.js',document.baseURI));
defineController(site,()=>{});const inst=keepsakes.give('controller');await inst.worldTask;
const W=site.world,T=site.THREE,original=inst.worldEntry;
const position=new T.Vector3().copy(original.body.translation()),rotation=new T.Quaternion().setFromEuler(new T.Euler(.1,-.18,.14));
W.remove('controller');stage.timeScale=0;audio.setMuted(true);const rows=[];
for(const skin of [.001,.003,.004,.006]){
 const root=new T.Group(),e=await W.add({id:'contact-probe',object:root,shapes:inst.colliderShapes,mass:.3,position,rotation,
  material:{restitution:.14,friction:.75,angularDamping:1.5,skin}});
 e.body.setAngvel({x:.5,y:.25,z:-.4},true);let steps=0;
 while(!e.body.isSleeping()&&steps++<1800)W.step(1/120);
 const p=new T.Vector3().copy(e.body.translation()),q=new T.Quaternion().copy(e.body.rotation());
 const minArt=Math.min(...inst.colliderVertices.map(v=>v.clone().applyQuaternion(q).add(p).y));
 const hull=inst.colliderShapes[0].points,ys=[];for(let i=0;i<hull.length;i+=3)ys.push(new T.Vector3(...hull.slice(i,i+3)).applyQuaternion(q).add(p).y);
 rows.push({skin,steps,sleeping:e.body.isSleeping(),minArt,minHull:Math.min(...ys),pixels:minArt*stage.pxPerUnit(p),position:p.toArray(),rotation:q.toArray()});
 W.remove(e.id);
}
note('bird controller contact premise',JSON.stringify(rows));stage.timeScale=1;
