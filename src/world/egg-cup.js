// The egg cup (layout lane, playtest-3; Aaron, e1113-07: "When the players second egg spawns, a little egg cup should
// pop up right where the egg is comparative to the controller stand" and "Yup the egg cup should spawn right next to
// the controller stand (make it so that the controller rack and cup fall from above into place like the hat rack
// does)"; his reference photo, img9: a small white footed porcelain cup). Approved from the mock-up (e1113-30).
// A fixed piece of furniture on the floor, the last of the row rack, stand, cup (src/flappy/stand.js floorRow), with
// one slot: the egg. Dropped on it, the egg snaps in upright, blunt end down, and stays there across reloads (the
// stand's rule for the controller; src/core/supports.js). It arrives with the player's second egg, falling into its
// place like the hat rack (src/world/rack-drop.js); a reload finds it standing (store 'eggCup').
// Like the stand: a cached picture (no idle frame work), real colliders (a lathe: its foot and stem, the bowl's floor
// and its wall in twelve pieces, so the bowl is hollow), a soft floor shadow like the rack's (world-layout.js
// SOFT_SHADOWS) and its page rect reserved as 'egg-cup' in site.worldLayout.furniture(); the occluder scoot
// (src/core/world-occluders.js) reads it as it reads any fixed piece with a picture.
import {forPicture} from '../core/cat.js';
import {createMeshPicture} from '../core/mesh-picture.js';
import {createRackDrop} from './rack-drop.js';
import {floorRow,clearFootprint} from '../flappy/stand.js';
// The cup's lathe profile [radius, y] in the units of an egg drawn at REF_SCALE (the room's egg; the cup scales with the
// egg's own art scale): foot, stem, bowl, rim, then down the inside to the bowl's floor.
export const EGG_CUP={refScale:1.15,
 profile:[[0,0],[.074,0],[.08,.005],[.078,.013],[.058,.028],[.041,.048],[.035,.068],[.04,.084],[.062,.1],[.081,.124],[.09,.155],[.093,.19],[.094,.214],[.091,.221],
  [.086,.218],[.084,.19],[.079,.158],[.066,.13],[.035,.112],[0,.106]],
 outer:14,                 // the profile's points up to here are the outside (foot to rim)
 stemTop:.106,             // the stem's collider reaches the bowl's floor
};
export function eggCupService(site){return site.eggCup??=createEggCup(site);}
function createEggCup(site){
 const {THREE:T,stage,world,supports,store,keepsakes}=site,C=EGG_CUP;
 // The egg's art scale (src/world/egg.js): the cup is made for the egg the room has.
 const eggScale=()=>store.get('worldBodies.egg.adapter.artScale',site.eggs?.box?.recipe?.state?.artScale??C.refScale*Math.min(1,stage.width/600));
 const k=eggScale()/C.refScale,radius=Math.max(...C.profile.map(p=>p[0]))*k;
 let task=null,root=null,visual=null,picture=null,entry=null,dirty=false,last='',drop=null,landed=null,seat=null,preview=null,eggArt=null;
 const slots=[{id:'egg',accepts:['egg'],position:[0,.11*k,0],quaternion:[0,0,0,1]}];
 function invalidate(){if(dirty)return;dirty=true;stage.onRender.push(flush);}
 const shade=()=>site.worldLayout.shadow({id:'egg-cup',physical:true,object:root,worldEntry:entry});
 function flush(){const n=stage.onRender.indexOf(flush);if(n>=0)stage.onRender.splice(n,1);dirty=false;if(!picture)return;picture.draw(true);drop?.apply();reserve();shade();}
 function reserve(){const r=picture.rect;site.worldLayout.reserve('egg-cup',{x:r.x,y:r.y,w:r.w,h:r.h,fixed:true});}
 function home(){const row=floorRow(site);return new T.Vector3(row.cup.x,0,row.z);}
 function layout(force=false){
  if(!root)return;const rk=site.rack?.picture&&site.rack.root,key=[...world.layoutKey(),rk?.position.x,rk?.position.z,rk?.quaternion.y].join(',');if(key===last&&!force)return;last=key;
  root.position.copy(home());root.updateMatrixWorld(true);
  if(entry){entry.body.setTranslation(root.position,false);supports.update('egg-cup');clearRow();}
  site.worldLayout.invalidateShadow('egg-cup');invalidate();
 }
 // a keepsake lying where it lands is moved clear (src/flappy/stand.js clearFootprint)
 const clearRow=()=>clearFootprint(site,root,{hx:radius,hz:radius,h:.25*k});
 // The egg sits as low as the bowl lets it: the lowest seat where the shell nowhere passes the bowl's inside.
 function seatHeight(radiusAt,length,s){
  const inner=C.profile.slice(C.outer).map(([r,y])=>[r*k,y*k]).sort((a,b)=>a[1]-b[1]),rim=Math.max(...inner.map(p=>p[1]));
  const innerAt=y=>{if(y<=inner[0][1])return 0;for(let i=1;i<inner.length;i++)if(y<=inner[i][1]){const [r0,y0]=inner[i-1],[r1,y1]=inner[i];return r0+(r1-r0)*(y-y0)/(y1-y0);}return Infinity;};
  for(let y0=inner[0][1];y0<rim;y0+=.0005){let ok=true;for(let h=0;h<=length*s&&ok;h+=length*s/80){const y=y0+h;if(y<rim&&s*radiusAt(h/s)>innerAt(y)+1e-5)ok=false;}if(ok)return y0+.0008;}
  return rim;
 }
 // The seated egg casts its part of the soft shadow (the stand does the same for the controller).
 function seatShadow(e){
  seat?.removeFromParent();seat=null;
  if(e?.object&&eggArt){seat=new T.Mesh(eggArt,new T.MeshBasicMaterial({visible:false}));seat.name='egg-cup-shadow/egg';
   const p=supports.pose('egg-cup','egg');root.updateMatrixWorld(true);seat.matrix.compose(p.p,p.q,new T.Vector3(1,1,1)).premultiply(root.matrixWorld.clone().invert());seat.matrixAutoUpdate=false;root.add(seat);}
  site.worldLayout.invalidateShadow('egg-cup',{geometry:true});
 }
 // What sits in it hides things too (e1112-35, nothing lost behind furniture): the scoot (src/core/world-occluders.js)
 // reads the furniture's own colliders by itself, and the egg seated in it through this, by its colliders.
 function seatCovers(caster,d){
  const e=slots[0].occupant&&world.entries.get(slots[0].occupant);if(!e||e.support?.id!=='egg-cup')return false;
  const R=world.rapier,r=caster.ray,ray=new R.Ray(r.origin,r.direction);
  for(let i=0;i<e.body.numColliders();i++){const t=e.body.collider(i).castRay(ray,d,true);if(t>=0&&t<d-.002)return true;}
  return false;
 }
 async function ensure({arrive=false}={}){
  if(task)return task;
  task=(async()=>{
   const [,,egg]=await Promise.all([world.ensure(),stage.ensureEnv(),import('../../assets/models/prepared/kitchen/egg.js')]);
   const s=eggScale();slots[0].position=[0,seatHeight(egg.radiusAt,egg.EGG.length,s),0];
   // the egg's shape for its share of the shadow (its collider hull, a lathe like the art)
   {const pts=egg.outline(20).map(v=>new T.Vector2(v.x*s,v.y*s));eggArt=new T.LatheGeometry(pts,16);}
   root=new T.Group();root.name='egg-cup';visual=new T.Group();
   const lathe=new T.LatheGeometry(C.profile.map(([r,y])=>new T.Vector2(r*k,y*k)),48);
   const porcelain=forPicture(new T.MeshStandardMaterial({color:'#f3ede3',roughness:.22,metalness:0}));
   visual.add(new T.Mesh(lathe,porcelain));
   // Invisible floor-shadow proxy: the cup's own lathe.
   const proxy=new T.Mesh(lathe,new T.MeshBasicMaterial({visible:false}));proxy.name='egg-cup-shadow';root.add(proxy);
   stage.scene.add(root);
   const top=slots[0].position[1]+egg.EGG.length*s,vertices=[];
   for(const x of [-radius,radius])for(const z of [-radius,radius])for(const y of [0,top])vertices.push(new T.Vector3(x,y,z));
   picture=createMeshPicture(site,root,visual,vertices);
   root.position.copy(home());root.updateMatrixWorld(true);
   entry=await world.add({id:'furniture-egg-cup',object:root,shapes:cupShapes(),fixed:true,sleeping:true,presentation:picture,material:{friction:.6,restitution:.1}});
   entry.canGrab=false;
   supports.register({id:'egg-cup',kind:'slot',object:root,slots,onChange:invalidate,
    onMount(e,{animate}){if(animate)site.audio.impact?.(e.id,{material:'wood',size:'small',strength:.25});},
    adopt(e){e.presentation?.attach(visual,root,invalidate);seatShadow(e);},release(e){e.presentation?.detach();seatShadow(null);invalidate();}});
   site.occluders?.add('egg-cup-seat',{covers:seatCovers});
   // It falls into its place from above the page (e1113-07), only at its live arrival; a reload finds it standing.
   if(arrive){drop=createRackDrop(site,picture,{root,id:'egg-cup',settle:()=>{picture.draw(true);reserve();shade();}});drop.hold();slots[0].disabled=true;}
   picture.draw(true);reserve();shade();last='';layout();clearRow();
   if(drop)drop.start().then(()=>{landed=drop.stats;drop=null;slots[0].disabled=false;invalidate();});
   return api;
  })().catch(e=>{task=null;console.error('egg cup',e);throw e;});
  return task;
 }
 // Colliders (cup-local, scaled): the foot and stem to the bowl's floor as one hull, then the bowl's wall in twelve
 // pieces between its outside and its inside, so the egg (or anything) can sit in the hollow.
 function cupShapes(){
  const P=C.profile.map(([r,y])=>[r*k,y*k]),N=12,ring=(r,y,a)=>[Math.cos(a)*r,y,Math.sin(a)*r];
  const stem=[];for(const [r,y] of P.slice(0,C.outer).filter(([,y])=>y<=C.stemTop*k+1e-9))for(let n=0;n<N;n++)stem.push(...ring(r,y,n*2*Math.PI/N));
  for(let n=0;n<N;n++)stem.push(...ring(.062*k,C.stemTop*k,n*2*Math.PI/N));
  const shapes=[{type:'hull',points:stem}],wall=[...P.slice(8,C.outer),...P.slice(C.outer,C.profile.length-1)];
  for(let n=0;n<N;n++){const points=[];for(const a of [n*2*Math.PI/N,(n+1)*2*Math.PI/N])for(const [r,y] of wall)points.push(...ring(r,y,a));shapes.push({type:'hull',points});}
  return shapes;
 }
 // An egg resting on the floor on top of it, or dropped close by, settles into it (the stand's rule).
 function place(e,animate=true){return !!entry&&!slots[0].disabled&&supports.mount(e,'egg-cup','egg',{animate});}
 // While the egg is held over the cup: the shelf's "Release to place" box (.shelf-preview, src/world/shelf.js).
 function clearPreview(){preview?.remove();preview=null;}
 function showPreview(e){
  const c=world.held?.entry===e&&supports.candidate(e);if(!c||c.id!=='egg-cup'||!c.rect){clearPreview();return;}
  preview??=document.body.appendChild(Object.assign(document.createElement('div'),{className:'shelf-preview',textContent:'Release to place'}));
  Object.assign(preview.style,{left:c.rect.x+'px',top:c.rect.y+'px',width:c.rect.w+'px',height:c.rect.h+'px'});
 }
 stage.onResize.push(()=>layout());
 const api={ensure,place,slots,invalidate,layout:()=>layout(true),relayout:()=>layout(),preview:e=>{if(entry&&(world.held?.entry===e||preview))showPreview(e);},clearPreview,
  get half(){return radius;},get ready(){return !!entry;},get root(){return root;},get picture(){return picture;},get entry(){return entry;},
  get rect(){return picture?{...picture.rect}:null;},get occupant(){return slots[0].occupant||null;},get arrival(){return drop?.stats||landed;},get arriving(){return !!drop;},get egg(){return keepsakes.get('egg')||null;}};
 return api;
}
