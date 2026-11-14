// Unit 8's prepared, sourced solids. One collider compound and one picture per item.
import {bakeSolid,boxVertices,solidDefinition} from './solid.js';
import {forPicture} from '../core/cat.js';
const flour=()=>import('../../assets/models/prepared/flour.js');
const bucket=()=>import('../../assets/models/prepared/bucket.js');
const fork=()=>import('../../assets/models/prepared/pitchfork.js');
const hay=()=>import('../../assets/models/prepared/hay.js');
const cake=()=>import('../../assets/models/prepared/cake.js');

export function preparedShapes(T,physics,scale=1){
 return physics.colliders.map(c=>{
  const offset=new T.Vector3(...(c.position||[0,0,0])).multiplyScalar(scale);
  const rotation=new T.Quaternion().setFromEuler(new T.Euler(...(c.rotation||[0,0,0])));
  if(c.type==='box')return {half:c.size.map(v=>v*scale/2),offset,rotation};
  if(c.type==='convex')return {type:'hull',points:c.vertices.flatMap(v=>v.map(x=>x*scale)),offset,rotation};
  const points=[],radius=c.radius*scale,hh=(c.height/2||c.halfHeight)*scale;
  for(const y of [-hh,hh])for(let i=0;i<16;i++)points.push(Math.cos(i*Math.PI/8)*radius,y,Math.sin(i*Math.PI/8)*radius);
  if(c.type==='capsule')points.push(0,-hh-radius,0,0,hh+radius,0);
  return {type:'hull',points,offset,rotation};
 });
}
export function shapeVertices(T,shapes){const vertices=shapes.flatMap(c=>{
 const vs=c.type==='hull'?Array.from({length:c.points.length/3},(_,i)=>new T.Vector3(...c.points.slice(i*3,i*3+3))):boxVertices(T,c.half);
 return vs.map(v=>v.applyQuaternion(c.rotation||new T.Quaternion()).add(c.offset||new T.Vector3()));
});return [...new Map(vertices.map(v=>[v.toArray().map(x=>x.toFixed(6)).join(','),v])).values()];}
// Prepared art carries conservative screening shapes. These runtime hulls fit
// the visible surface; the open pail keeps separate wall/handle shapes.
function visualHull(T,mesh){
 const a=mesh.geometry.attributes.position,source=[];for(let n=0;n<a.count;n++)source.push(new T.Vector3().fromBufferAttribute(a,n));
 const directions=[];for(let y=0;y<=16;y++)for(let n=0;n<32;n++){const p=Math.PI*y/16,t=n*Math.PI/16;directions.push(new T.Vector3(Math.sin(p)*Math.cos(t),Math.cos(p),Math.sin(p)*Math.sin(t)));}
 const points=[],seen=new Set();for(const d of directions){let best=source[0],max=-Infinity;for(const p of source){const v=p.dot(d);if(v>max){max=v;best=p;}}const key=best.toArray().map(v=>v.toFixed(5)).join(',');if(!seen.has(key)){seen.add(key);points.push(...best.toArray());}}
 const ys=source.map(p=>p.y),lo=Math.min(...ys),hi=Math.max(...ys);for(const p of source)if(p.y<lo+.00001||p.y>hi-.00001){const key=p.toArray().map(v=>v.toFixed(5)).join(',');if(!seen.has(key)){seen.add(key);points.push(...p.toArray());}}
 return {type:'hull',points};
}
function ringHull(rings,s,n=24){const points=[];for(const [y,r]of rings)for(let i=0;i<n;i++)points.push(Math.cos(i*Math.PI*2/n)*r*s,y*s,Math.sin(i*Math.PI*2/n)*r*s);return {type:'hull',points};}
function pailShapes(T,s,wood){
 const shapes=[],walls=16,point=(r,y,a)=>[Math.sin(a)*r*s,y*s,Math.cos(a)*r*s];
 const bottom=[];for(const [y,r]of [[0,.089],[.008,.096],[.019,.097]])for(let n=0;n<40;n++)bottom.push(...point(r,y,n*Math.PI/20));shapes.push({type:'hull',points:bottom});
 for(let n=0;n<walls;n++){const points=[];for(const [r,y]of [[.089,0],[.096,.008],[.0985,.026],[.123,.201],[.126,.222],[.1285,.231],[.127,.234],[.122,.239],[.116,.233],[.116,.221],[.086,.019]])for(const a of [n*Math.PI*2/walls,(n+1)*Math.PI*2/walls])points.push(...point(r,y,a));shapes.push({type:'hull',points});}
 // The wire handle and its wooden grip are hooks (world.js GROUPS): only the room meets them, never another item.
 for(let n=0;n<12;n++){
  if(n===5||n===6)continue;
  const a=n*Math.PI/12,b=(n+1)*Math.PI/12,pa=new T.Vector3(Math.cos(a)*.13,.21+Math.sin(a)*.135,-Math.sin(a)*.035).multiplyScalar(s),pb=new T.Vector3(Math.cos(b)*.13,.21+Math.sin(b)*.135,-Math.sin(b)*.035).multiplyScalar(s),d=pb.clone().sub(pa),r=.0035*s;
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize()),points=[];
  for(const y of [-d.length()/2,d.length()/2])for(let k=0;k<8;k++)points.push(Math.cos(k*Math.PI/4)*r,y,Math.sin(k*Math.PI/4)*r);
  shapes.push({type:'hull',points,offset:pa.add(pb).multiplyScalar(.5),rotation:q,hook:true});
 }const a=wood.geometry.attributes.position,points=[];for(let n=0;n<a.count;n++)points.push(a.getX(n)*s,a.getY(n)*s,a.getZ(n)*s);shapes.push({type:'hull',points,hook:true});shapes.forEach((shape,n)=>shape.massFraction=n===0?.18:n<=walls?.72/walls:n===shapes.length-1?.03:.07/10);return shapes;
}
export function disposeArt(root){
 const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});
 gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());
}
// The cake keeps five slices (the model has one already cut, a sixth of the round): each one eaten takes one away.
export const CAKE_SLICES=5;
const cakeLeft=inst=>Math.max(1,CAKE_SLICES-(inst.state?.slices||0));
// Its collider: the remaining wedges' rim, rows up its side, plus its middle (a one-slice wedge is still solid).
function cakeHull(s,left){
 const points=[],end=.65+(5.85-.65)*left/CAKE_SLICES;
 for(const [y,r]of [[.001,.157],[.006,.165],[.175,.165],[.183,.159],[.1966,.145]]){for(let n=0;n<=32;n++){const a=.65+(end-.65)*n/32;points.push(Math.cos(a)*r*s,y*s,-Math.sin(a)*r*s);}points.push(0,y*s,0);}
 return points;
}
export function defineIngredients(site,chain){
 const {THREE:T,keepsakes,world,store}=site;
 const scale=()=>chain.state.artScale;
 const defs=[
  ['flour','the flour sack',flour,'create','physics',.30,.95,()=>chain.tapItem('flour')],
  ['bucket','the milk pail',bucket,'create','physics',.27,1.2,()=>chain.tapItem('bucket')],
  ['pitchfork','the pitchfork',fork,'create','physics',.25,3.8,()=>chain.throwFork()],
  ['hay','the hay pile',hay,'create','physics',.42,.35,()=>{}],
  ['recipe-flour','a measure of flour',flour,'createPortion','portionPhysics',.12,.5,()=>chain.tapItem('recipe-flour')],
  ['recipe-milk','a measure of milk',bucket,'createMilk','milkPhysics',.16,.65,()=>chain.tapItem('recipe-milk')],
  ['cake','the cake',cake,'create','physics',.38,.55,inst=>chain.eat(inst.id)],
 ];
 // One prepared solid. id is its kind (what it looks and behaves like); key is its keepsake id (the cakes after the
 // first are 'cake-2', 'cake-3', ... of kind 'cake', playtest 2, e1112-65).
 const defineOne=(id,label,loadModel,createName,physicsName,size,aspect,tap,key=id)=>{
  solidDefinition(site,{id:key,label,category:'recipe',size,aspect,home:()=>({x:id==='flour'?-.85:id==='bucket'?.85:0,y:-.55}),tap,removed(i){chain.removed?.(key);if(i.solidArt)disposeArt(i.solidArt);}},async inst=>{
   const s=store.get('worldBodies.'+key+'.adapter.artScale',scale()*(id==='cake'?.82:id==='recipe-milk'?.5:id==='pitchfork'?.65:1));
   const module=await loadModel(),physics=module[physicsName];
   const model=module[createName](id==='bucket'?{variant:'empty'}:id==='cake'?{left:cakeLeft(inst)}:undefined);model.scale.setScalar(s);
   let visual=bakeSolid(T,model),milk=null;
   if(id==='bucket'){
    // The pail and its liquid share a depth buffer. The opaque surface never draws over the rim.
    const group=new T.Group();group.add(visual);milk=bakeSolid(T,module.createMilk());milk.geometry.scale(s,s,s);milk.position.y=.017*s;milk.visible=chain.state.milkFull;group.add(milk);visual=group;
   }
   let shapes=preparedShapes(T,physics,s);
   if(['flour','recipe-flour','recipe-milk','hay','cake'].includes(id))shapes=[visualHull(T,visual)];
   if(id==='bucket')shapes=pailShapes(T,s,model.children.at(-1));
   if(id==='recipe-milk')shapes=[ringHull([[0,.083],[.147,.109]],s,16)];
   if(id==='flour'||id==='recipe-flour'){const a=visual.geometry.attributes.position,points=[];for(let n=0;n<a.count;n++)points.push(a.getX(n),a.getY(n),a.getZ(n));if(id==='recipe-flour')for(const y of [0,.046])for(let n=0;n<16;n++)points.push(Math.cos(n*Math.PI/8)*.018*s,y*s,Math.sin(n*Math.PI/8)*.018*s);shapes=[{type:'hull',points}];}
   if(id==='cake')shapes=[{type:'hull',points:cakeHull(s,cakeLeft(inst))}];
   if(id==='pitchfork'){
    shapes[0]=preparedShapes(T,{colliders:[{type:'capsule',radius:.016,halfHeight:.3345,position:[0,.6265,0]}]},s)[0];
    for(let n=0;n<3;n++){const x=(n-1)*.084,points=[];for(const [y,z,r]of [[.24,.008,.006],[.17,.008,.006],[.08,.019,.006],[.021,.04,.006],[0,.05,.0005]])for(let k=0;k<8;k++)points.push((x+Math.cos(k*Math.PI/4)*r)*s,y*s,(z+Math.sin(k*Math.PI/4)*r)*s);shapes[n+2]={type:'hull',points};}
   }
   if(['bucket','cake','recipe-flour','recipe-milk'].includes(id))for(const shape of shapes)if(shape.type==='hull')shape.radius=id==='cake'?.003:id==='bucket'?.0002:.001;
   const vertices=shapeVertices(T,shapes);
   const pickGeometry=visual.isMesh?null:visual.children[0].geometry;
   // Not while it is gaining speed (world.js REST: a topple): damping that falls over in seconds (playtest-2, item 1).
   const dampContact=(dt,e)=>{
    if(!['flour','bucket','recipe-flour','recipe-milk','cake'].includes(id)||world.held?.entry===e||e.gaining)return;let contact=false;for(let n=0;n<e.body.numColliders()&&!contact;n++)world.physics.contactPairsWith(e.body.collider(n),other=>world.physics.contactPair(e.body.collider(n),other,m=>{for(let k=0;k<m.numContacts();k++)if(m.contactDist(k)<=.0015)contact=true;}));if(!contact)return;
    const b=e.body,v=b.linvel(),factor=1-Math.exp(-100*dt),m=b.mass(),frame=new T.Quaternion().copy(b.rotation()).multiply(new T.Quaternion().copy(b.principalInertiaLocalFrame())),w=new T.Vector3().copy(b.angvel()).applyQuaternion(frame.clone().invert()),I=b.principalInertia();
    // Let the tiny loose flour mound's normal contact impulse clear any
    // penetration; its contact damping dissipates sliding and rocking only.
    b.applyImpulse({x:-v.x*m*factor,y:id==='recipe-flour'?0:-v.y*m*factor,z:-v.z*m*factor},false);
    w.set(-w.x*I.x*factor,-w.y*I.y*factor,-w.z*I.z*factor).applyQuaternion(frame);b.applyTorqueImpulse(w,false);
   };
   return {visual,pickGeometry,rotation:id==='pitchfork'?new T.Quaternion().setFromEuler(new T.Euler(0,0,Math.PI/2)):undefined,shapes,vertices,mass:physics.mass,height:Math.max(...vertices.map(v=>v.y)),adapterState:{version:1,artScale:s},sound:{material:id==='bucket'?'tin':id==='pitchfork'?'metal':['cake','recipe-milk'].includes(id)?'butter':'paper',size:'small'},
    material:{friction:id==='pitchfork'?.72:.65,restitution:id==='pitchfork'?.035:0,restitutionCombine:id==='pitchfork'?undefined:'min',linearDamping:.8,angularDamping:3,skin:id==='pitchfork'?.0006:id==='cake'?.0004:id==='bucket'?.0003:.001,softCcdPrediction:.08},
    ready(e){e.contactDamping=dampContact;inst.chainScale=s;inst.milk=milk;
     // The pail is a container (world.js JAM): its inside, in its own frame.
     if(id==='bucket')e.interior={min:[-.13*s,.015*s,-.13*s],max:[.13*s,.26*s,.13*s]};chain.ready(inst,e);},
    beforeStep(dt,e){dampContact(dt,e);chain.stepItem(key,dt,e);},sync(e){chain.syncItem(key,e);},rest(e){chain.restItem(key,e);}
   };
  });
 };
 for(const d of defs)defineOne(...d);
 // The cakes after the first (defined when baked, and again on each load for those already baked).
 chain.defineCake=key=>{if(!keepsakes.defs.has(key))defineOne('cake','another cake',cake,'create','physics',.38,.55,inst=>chain.eat(inst.id),key);};
 // A slice eaten (e1112-66): the same cake, one wedge shorter, in place: its picture, its pick shape, its floor shadow
 // and its collider are rebuilt from the model with one slice fewer; the body, its place and its materials stay.
 chain.resliceCake=async inst=>{
  const e=inst.worldEntry;if(!e||!inst.solidArt)return false;
  const s=inst.chainScale,left=cakeLeft(inst),m=await cake(),model=m.create({left});model.scale.setScalar(s);
  const art=bakeSolid(T,model),old=inst.solidArt.geometry;for(const mat of [].concat(art.material))mat.dispose();
  inst.solidArt.geometry=art.geometry;inst.object.geometry=art.geometry;old.dispose();
  const points=cakeHull(s,left),verts=[];for(let n=0;n<points.length;n+=3)verts.push(new T.Vector3(points[n],points[n+1],points[n+2]));
  inst.colliderVertices.splice(0,inst.colliderVertices.length,...verts);
  const c=e.body.collider(0),desc=world.rapier.ColliderDesc.roundConvexHull(new Float32Array(points),.003);
  const get=(f,d)=>{try{return c[f]?.()??d;}catch{return d;}},R=world.rapier;
  desc.setContactSkin(get('contactSkin',.0004)).setMass(get('mass',.18)).setFriction(get('friction',.65)).setRestitution(get('restitution',0)).setRestitutionCombineRule(get('restitutionCombineRule',R.CoefficientCombineRule.Min));
  const ev=get('activeEvents',0);if(ev)desc.setActiveEvents(ev).setContactForceEventThreshold(get('contactForceEventThreshold',.18*32));
  world.physics.removeCollider(c,false);world.physics.createCollider(desc,e.body);
  site.worldLayout.remove(inst.id);inst.picture.invalidate();world.wake(e);world.sync(e);inst.picture.draw(true);return true;
 };
 solidDefinition(site,{id:'recipe-butter',category:'recipe',label:'a measure of butter',size:.12,aspect:.5,home:()=>({x:.3,y:-.5}),tap:()=>chain.tapItem('recipe-butter'),removed(i){chain.removed?.(i.id);}},async inst=>{
  await site.cat.ensureButter();const s=store.get('worldBodies.recipe-butter.adapter.artScale',scale()*.52);
  const geo=site.cat.butterGeometry.clone();geo.scale(s,s,s);geo.translate(0,.0325*s,0);
  const visual=new T.Mesh(geo,forPicture(new T.MeshStandardMaterial({color:0xf3d36b,roughness:.42})));
  const shapes=[{half:[.1*s,.0325*s,.065*s],offset:new T.Vector3(0,.0325*s,0)}];
  return {visual,shapes,vertices:shapeVertices(T,shapes),mass:.025,height:.065*s,sound:{material:'butter',size:'small'},adapterState:{version:1,artScale:s},material:{friction:.85,restitution:.02,skin:.0005},ready(e){inst.chainScale=s;chain.ready(inst,e);},sync(e){chain.syncItem(inst.id,e);},rest(e){chain.restItem(inst.id,e);}};
 });
}
