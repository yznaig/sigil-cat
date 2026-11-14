// The controller stand (bird lane, playtest-2; Aaron: "once you click it it should spawn a little wooden controller
// stand you can place it in, sitting a few feet to the right of the hat rack"). A small fixed piece of wooden
// furniture on the floor. It has one slot, the controller's: dropped on it (or near it, by keyboard), the controller
// snaps in and stays, leaning with its buttons to the room, a keepsake; clicking it there still plays flappy. Like the
// shelf, it is a fixed world body with a cached picture (no idle frame work) and a support slot (src/core/supports.js).
// Its screen rect is reserved as 'stand' in site.worldLayout.furniture() (what the physics lane's scoot reads, e1112-35).
// Playtest-3 (layout lane; e1113-08 "a bit more stylish", e1113-30 approved from the mock-up on sc/p3-mock):
//  - the stylish design (src/flappy/stand-art.js) at STAND.scale, the controller seated in it at the same scale
//    (src/flappy/controller.js CONTROLLER.width), turned STAND.yawDeg like the shelf;
//  - "arranged in a straight row next to the rack": rack, stand, egg cup (src/world/egg-cup.js), at the rack's depth
//    on every screen (floorRow below);
//  - it falls from above into its place like the hat rack (e1113-07; src/world/rack-drop.js) when it first appears;
//  - a soft floor shadow like the rack's (src/core/soft-floor-shadow.js), the seated controller's included;
//  - colliders that follow the new shape (stand-art.js standShapes);
//  - the controller lies flat against the cradle: on both rest dowels, its lower edge against the front one ("IMG4:
//    the controller should be more flat against the stand it kind of clips right now").
import {forPicture} from '../core/cat.js';
import {createMeshPicture} from '../core/mesh-picture.js';
import {createRackDrop} from '../world/rack-drop.js';
import {stylishStand,standShapes,PLINTH} from './stand-art.js';
import {fitResting} from '../core/floor-home.js';
export const STAND={scale:.8,yawDeg:30,
 // The row (world units): the gap from the rack's right edge (at the row's height, `band`: rackFootRight) to the stand and from the stand to the cup (closed down to
 // `minGap` where room is short), and his half-width at his middle (catHalf): the cup's right edge stays `catMarginPx`
 // left of where that is on the page, so the row never covers him.
 gap:.16,cupGap:.07,minGap:.05,catHalf:.44,catMarginPx:10,band:.36,
 // `back`: where the room between the rack and him is too narrow at the rack's depth for the whole row (a narrower
 // desktop window; a phone on its side and a wide desktop have room), the row steps back along the floor, both pieces
 // together, by `back.step` at a time, at most `back.most`, just far enough to fit.
 back:{step:.05,most:2.4},
 // The controller's pose in the cradle (art units): tilted `tilt` rad about x (buttons toward the room), `position` its
 // body origin (the middle of its underside). Its underside rests on the two rest dowels and its lower edge against
 // the lip dowel (solved against the controller's hull; checks/bird.js measures it).
 slot:{tilt:.96,position:[0,.1753,-.0581]}};
// The stand's footprint half-width along the room's x (turned by yawDeg), world units.
export function standHalf(){const S=STAND.scale,a=STAND.yawDeg*Math.PI/180,w=PLINTH.w/2*S,d=PLINTH.d/2*S;return w*Math.cos(a)+d*Math.sin(a);}
// The rack's right edge on the page at the row's height: its own art (post and foot) up to STAND.band above the floor.
// The hats hang above that (the stand and the cup stand under the cone hat's brim, not beside its tip), so the row does
// not move as hats come and go. Before the rack exists: where its foot will reach (measured, ~.17 of the page height).
const footCache={key:'',right:0};
function rackFootRight(site){
 const {stage,THREE:T}=site,rack=site.rack;
 if(!rack?.root||!rack.art?.visual)return 14+stage.height*.17;
 rack.root.updateMatrixWorld(true);const key=[...rack.root.matrixWorld.elements,...stage.camera.matrixWorld.elements,stage.width,stage.height].join(',');
 if(key===footCache.key)return footCache.right;
 const a=rack.art.visual.geometry.attributes.position,v=new T.Vector3();let right=-Infinity;
 for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(rack.root.matrixWorld);if(v.y<=STAND.band)right=Math.max(right,stage.toScreen(v).x);}
 Object.assign(footCache,{key,right:Number.isFinite(right)?right:14+stage.height*.17});return footCache.right;
}
// The floor row (e1113-30), world units: z its depth (the rack's, or a step back where it must); stand.x and cup.x the
// middles of the stand and the cup.
export function floorRow(site,cupHalf=.1){
 const {stage,THREE:T}=site,L=site.worldLayout,rack=site.rack?.root&&site.rack.picture?site.rack:null,v=new T.Vector3();
 const z0=rack?rack.root.position.z:stage.onFloor(stage.width/2,L.floorY()-12).z;
 const right=rackFootRight(site),half=standHalf();
 const catLeft=stage.toScreen(v.set(-STAND.catHalf,0,0)).x-STAND.catMarginPx;
 let row=null;
 for(let k=0;k*STAND.back.step<=STAND.back.most+1e-9;k++){
  const z=z0-k*STAND.back.step,y=stage.toScreen(v.set(0,0,z)).y,edge=stage.onFloor(right,y).x,limit=stage.onFloor(catLeft,y).x;
  let gap=STAND.gap,cupGap=STAND.cupGap;const span=()=>edge+gap+2*half+cupGap+2*cupHalf;
  if(span()>limit){const t=Math.min(1,(span()-limit)/Math.max(1e-6,gap+cupGap-2*STAND.minGap));gap-=(gap-STAND.minGap)*t;cupGap-=(cupGap-STAND.minGap)*t;}
  const standX=edge+gap+half,cupX=standX+half+cupGap+cupHalf;
  row={z,y,edge,stand:{x:standX},cup:{x:cupX},fits:cupX+cupHalf<=limit+1e-6,back:z0-z,gap,cupGap};
  if(row.fits)break;
 }
 return row;
}
// A piece of the row that appears (or moves, on a resize) where a keepsake lies would leave it inside its colliders: a
// resting body is asleep and nothing pushes it out (world-layout check: the rifle threaded through the stand). Any free
// keepsake whose footprint passes into the piece's (root-local half sizes hx, hz, by more than -margin; below its height h) is moved
// straight toward the room (+z) just clear of it (to its right where the page's footer is in the way, else back),
// kept on the page (floor-home.js fitResting), and woken to settle.
export function clearFootprint(site,root,{hx,hz,h,margin=-.01}){
 const {THREE:T,world,keepsakes,stage}=site,q=new T.Quaternion(),p=new T.Vector3(),v=new T.Vector3();root.updateMatrixWorld(true);
 const meets=(vs)=>{let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity,y0=Infinity;for(const a of vs){v.copy(a).applyQuaternion(q).add(p);y0=Math.min(y0,v.y);root.worldToLocal(v);x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);z0=Math.min(z0,v.z);z1=Math.max(z1,v.z);}
  return y0<h&&x1>-hx-margin&&x0<hx+margin&&z1>-hz-margin&&z0<hz+margin;};
 const moved=[];
 for(const e of world.entries.values()){
  if(e.fixed||e.support||world.held?.entry===e||e.timer||!e.body.isEnabled())continue;
  const vs=keepsakes.get(e.id)?.colliderVertices;if(!vs?.length)continue;
  q.copy(e.body.rotation());p.copy(e.body.translation());if(!meets(vs))continue;
  // toward the room first; where the footer stops that (a phone's thin floor), to the right, then back
  const from=p.clone();
  for(const [dx,dz] of [[0,.04],[.04,0],[0,-.04]]){
   p.copy(from);for(let k=0;k<75&&meets(vs);k++){p.x+=dx;p.z+=dz;}
   e.body.setTranslation(p,false);fitResting(site,e,vs);p.copy(e.body.translation());if(!meets(vs))break;
  }
  world.wake(e);world.sync(e);moved.push(e.id);
 }
 return moved;
}
export function standService(site){return site.stand??=createStand(site);}
function createStand(site){
 const {THREE:T,stage,world,supports}=site,S=STAND.scale;
 let task=null,root=null,visual=null,picture=null,entry=null,dirty=false,last='',drop=null,landed=null,seat=null;
 const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),STAND.slot.tilt);
 const slots=[{id:'controller',accepts:['controller'],position:STAND.slot.position.map(v=>v*S),quaternion:q.toArray()}];
 // The picture's bounds: the stand and the controller sitting in it.
 const vertices=[];for(const x of [-.37,.37])for(const y of [0,.42])for(const z of [-.22,.2])vertices.push(new T.Vector3(x*S,y*S,z*S));
 const shade=()=>site.worldLayout.shadow({id:'stand',physical:true,object:root,worldEntry:entry});
 function invalidate(){if(dirty)return;dirty=true;stage.onRender.push(flush);}
 function flush(){const n=stage.onRender.indexOf(flush);if(n>=0)stage.onRender.splice(n,1);dirty=false;if(!picture)return;picture.draw(true);drop?.apply();reserve();shade();}
 function reserve(){const r=picture.rect;site.worldLayout.reserve('stand',{x:r.x,y:r.y,w:r.w,h:r.h,fixed:true});}
 function home(){const row=floorRow(site);return new T.Vector3(row.stand.x,0,row.z);}
 function layout(force=false){
  if(!root)return;const rk=site.rack?.picture&&site.rack.root,key=[...world.layoutKey(),rk?.position.x,rk?.position.z,rk?.quaternion.y].join(',');if(key===last&&!force)return;last=key;
  root.position.copy(home());root.updateMatrixWorld(true);
  if(entry){entry.body.setTranslation(root.position,false);supports.update('stand');clearRow();}
  site.worldLayout.invalidateShadow('stand');invalidate();
 }
 const clearRow=()=>clearFootprint(site,root,{hx:.37*S,hz:.17*S,h:.4*S});
 // The seated controller casts its part of the soft shadow (the rack does the same for its hats).
 function seatShadow(e){
  seat?.removeFromParent();seat=null;
  if(e?.object){seat=new T.Group();seat.name='stand-shadow/controller';for(const m of e.object.children)if(m.isMesh)seat.add(new T.Mesh(m.geometry,new T.MeshBasicMaterial({visible:false})));
   const p=supports.pose('stand','controller');root.updateMatrixWorld(true);seat.matrix.compose(p.p,p.q,new T.Vector3(1,1,1)).premultiply(root.matrixWorld.clone().invert());seat.matrixAutoUpdate=false;root.add(seat);}
  site.worldLayout.invalidateShadow('stand',{geometry:true});
 }
 // What sits in it hides things too (e1112-35, nothing lost behind furniture): the scoot (src/core/world-occluders.js)
 // reads the furniture's own colliders by itself, and the controller seated in it through this, by its colliders.
 function seatCovers(caster,d){
  const e=slots[0].occupant&&world.entries.get(slots[0].occupant);if(!e||e.support?.id!=='stand')return false;
  const R=world.rapier,r=caster.ray,ray=new R.Ray(r.origin,r.direction);
  for(let i=0;i<e.body.numColliders();i++){const t=e.body.collider(i).castRay(ray,d,true);if(t>=0&&t<d-.002)return true;}
  return false;
 }
 async function ensure({arrive=false}={}){
  if(task)return task;
  task=(async()=>{
   await Promise.all([world.ensure(),stage.ensureEnv()]);
   const {mat}=await import('../../assets/models/prepared/core.js');
   root=new T.Group();root.name='stand';root.rotation.y=STAND.yawDeg*Math.PI/180;visual=new T.Group();
   const art=stylishStand(T,{mat},forPicture);art.scale.setScalar(S);visual.add(art);
   // Invisible floor-shadow proxies: the art's own plinth, cheeks and dowels (the knobs are too small to show).
   const proxies=new T.Group();proxies.name='stand-shadow';proxies.scale.setScalar(S);
   for(const m of art.children)if(m.isMesh&&m.name!=='knob'){const p=new T.Mesh(m.geometry,new T.MeshBasicMaterial({visible:false}));p.position.copy(m.position);p.rotation.copy(m.rotation);proxies.add(p);}
   root.add(proxies);stage.scene.add(root);picture=createMeshPicture(site,root,visual,vertices);
   root.position.copy(home());root.updateMatrixWorld(true);
   entry=await world.add({id:'furniture-stand',object:root,shapes:standShapes(S),fixed:true,sleeping:true,presentation:picture,material:{friction:.7,restitution:.1}});
   entry.canGrab=false;
   supports.register({id:'stand',kind:'slot',object:root,slots,onChange:invalidate,
    onMount(e,{animate}){if(animate)site.audio.impact?.(e.id,{material:'wood',size:'small',strength:.3});},
    adopt(e){e.presentation?.attach(visual,root,invalidate);seatShadow(e);},release(e){e.presentation?.detach();seatShadow(null);invalidate();}});
   site.occluders?.add('stand-seat',{covers:seatCovers});
   // It falls into its place from above the page (e1113-07), only at its live arrival; a reload finds it standing.
   if(arrive){drop=createRackDrop(site,picture,{root,id:'stand',settle:()=>{picture.draw(true);reserve();shade();}});drop.hold();slots[0].disabled=true;}
   picture.draw(true);reserve();shade();last='';layout();clearRow();
   if(drop)drop.start().then(()=>{landed=drop.stats;drop=null;slots[0].disabled=false;invalidate();});
   return api;
  })().catch(e=>{task=null;console.error('controller stand',e);throw e;});
  return task;
 }
 // A controller resting on the floor on top of the stand, or dropped close by, settles into it (the shelf's rule).
 function place(e,animate=true){return !!entry&&!slots[0].disabled&&supports.mount(e,'stand','controller',{animate});}
 stage.onResize.push(()=>layout());
 const api={ensure,place,slots,invalidate,layout:()=>layout(true),relayout:()=>layout(),get ready(){return !!entry;},get root(){return root;},get picture(){return picture;},get entry(){return entry;},
  get rect(){return picture?{...picture.rect}:null;},get occupant(){return slots[0].occupant||null;},get arrival(){return drop?.stats||landed;},get arriving(){return !!drop;}};
 return api;
}
