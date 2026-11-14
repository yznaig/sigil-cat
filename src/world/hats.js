import {createMeshPicture} from '../core/mesh-picture.js';
import {prepareArt,preparedShapes,pickMesh,resizeProp} from './rack-art.js';
import {css} from '../core/util.js';
import {createRackDrop} from './rack-drop.js';
export const HAT_NAMES=['wizard','cone','party','crown'];
// Which hats the player has (playtest 2; playtest 3: one per cast): each hat sigil brings the next of these three
// (src/gags/hat.js), and the rack with it; the party hat comes only from the cake (party.js wears it as a gift).
// Saved as hats.owned; a save from before counts the hats it already had.
export const SIGIL_HATS=['wizard','cone','crown'];
const RACK_SCALE=.42,HAT_SCALE=.42,SINK=.025;
// The butter goes under the hat (e1111-58): the pat stays on his head and a worn hat rests on the pat's top
// (.0525 above the crown) sunk .004 into it, instead of the pat riding on the hat.
const BUTTER_UNDER=.0525-.004+SINK;
css('world-rack',`.world-rack-actions{position:fixed;z-index:5;display:flex;gap:4px;pointer-events:auto}.world-rack-actions button{font:600 12px/1.1 system-ui;min-width:44px;min-height:44px;padding:5px 7px;border:1px solid #9f8a70;border-radius:5px;background:#faf4e9;color:#493321}.world-rack-actions button[aria-pressed=true]{background:#735132;color:#fff5dc}.world-rack-actions button:disabled{opacity:.5}`);
export function createHats(site){
 const {THREE:T,stage,world,supports,keepsakes,store,cat}=site;
 let createHat,hatPhysics,createRack,rackPhysics;
 let task=null,root=null,entry=null,picture=null,art=null,ui=null,dirty=false,last='',restoring=true,arrival=null,landing=null,landed=null,defining=false;
 // Things that belong on the rack from the moment it exists (the lamp's shade): f(composite, socket) once, before its first picture.
 const furnish=[];
 const hats=new Map(),shadowParts=new Map(),slots=[],vertices=[],rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/4);
 // The fixed assembly is oblique: rotated AABB corners reserve empty space
 // beside the hats and push the visible rack into the cat on a narrow screen.
 const surfaceVertices=visual=>{
  const a=visual.geometry.attributes.position,unique=new Map();
  for(let n=0;n<a.count;n++){const v=new T.Vector3().fromBufferAttribute(a,n);unique.set(v.toArray().join(','),v);}
  return [...unique.values()];
 };
 const catSlots=[{id:'hat',accepts:HAT_NAMES.map(n=>'rack/'+n),position:[0,-SINK+(cat.butterOn?BUTTER_UNDER:0),0]}];
 function worn(){return HAT_NAMES.find(n=>hats.get(n)?.worldEntry?.support?.id==='cat-hat')||null;}
 const hatLift=()=>catSlots[0].position[1]+SINK;
 function changed(){
  if(restoring)return;const name=worn();store.set('hat',name);supports.setCrownHeight('rack',name?hatPhysics[name].anchors.butter[1]*HAT_SCALE-SINK+hatLift():null);
  cat.setExtent('hat',name?1.02+cat.config.float.lift+hatPhysics[name].anchors.butter[1]*HAT_SCALE+hatLift()+.2:null);
  invalidate();
 }
 supports.registerCatSeat({id:'cat-hat',slots:catSlots,onChange:changed});
 // The pat arriving or leaving lifts or lowers a worn hat: a short springy settle, a plain move under reduced motion.
 let lifting=null;
 function liftHat(){
  const slot=catSlots[0],to=-SINK+(cat.butterOn?BUTTER_UNDER:0),from=slot.position[1];if(Math.abs(to-from)<1e-6)return;
  const set=y=>{slot.position=[0,y,0];supports.update('cat-hat');};
  const token=lifting={};
  if(stage.reducedMotion||!worn()){set(to);changed();return;}
  stage.tween(.26,u=>{if(lifting!==token)return;const k=1+2.70158*(u-1)**3+1.70158*(u-1)**2;set(from+(to-from)*k);}).then(()=>{if(lifting!==token)return;set(to);changed();});
 }
 cat.onButter.push(()=>liftHat());
 function invalidate(){if(dirty)return;dirty=true;stage.onRender.push(flush);}
 function flush(){
  const n=stage.onRender.indexOf(flush);if(n>=0)stage.onRender.splice(n,1);dirty=false;if(!picture)return;
  // Attached pictures live in the cached furniture scene. Matching invisible
  // meshes in the fixed root supply their floor shadows during finite sway.
  let moved=false;for(const {e,mesh}of shadowParts.values())if(!mesh.matrix.equals(e.presentation.visual.matrix)){mesh.matrix.copy(e.presentation.visual.matrix);moved=true;}
  if(moved)site.worldLayout.invalidateShadow('rack');
  picture.draw(true);arrival?.apply();keepsakes.syncWorld(keepsakes.get('rack'),picture.rect);site.worldLayout.shadow(keepsakes.get('rack'));const a=picture.rect,b={x:a.x,y:a.y,right:a.x+a.w,bottom:a.y+a.h};site.worldLayout.reserve('rack',{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.max(a.x+a.w,b.right)-Math.min(a.x,b.x),h:Math.max(a.y+a.h,b.bottom)-Math.min(a.y,b.y),fixed:true});
  // The floor row stands beside it (layout lane, playtest-3, e1113-30): the stand and the egg cup follow its place (keyed: no work unless it moved).
  site.stand?.relayout?.();site.eggCup?.relayout?.();
 }
 function adopt(e,composite){
  e.presentation.attach(composite,root,invalidate);
  if(!shadowParts.has(e.id)){
   const mesh=pickMesh(T,e.presentation.visual);mesh.name='rack-shadow/'+e.id;mesh.matrixAutoUpdate=false;mesh.matrix.copy(e.presentation.visual.matrix);root.add(mesh);shadowParts.set(e.id,{e,mesh});site.worldLayout.invalidateShadow('rack',{geometry:true});
  }
  invalidate();
 }
 function release(e){
  e.presentation.detach();const part=shadowParts.get(e.id);
  if(part){part.mesh.removeFromParent();part.mesh.material.dispose();shadowParts.delete(e.id);site.worldLayout.invalidateShadow('rack',{geometry:true});}
  invalidate();
 }
 // The rack is seen from the same side on every screen (integration, playtest-2). It sits at the left edge, so on a
 // wide, short screen (a phone on its side, 844x390) the camera looks at it 9 degrees further from its right than at
 // 1280x900: the front and back pegs lined up, the party hat hid behind the crown (a third of it) and a lifted wizard
 // hat dragged against its neighbours. It turns by that difference in view angle (VIEW.faceRef: the angle at
 // 1280x900, where it stands as before), in whole hundredths of a radian so a small resize does not nudge it.
 const VIEW={faceRef:.2933};
 const facing=()=>{stage.camera.updateMatrixWorld();const c=root.position.clone().applyMatrix4(stage.camera.matrixWorldInverse);return Math.round((Math.atan2(-c.x,-c.z)-VIEW.faceRef)*100)/100;};
 function place(){
  root.position.set(0,0,0);root.updateMatrixWorld(true);
  const zero=stage.toScreen(new T.Vector3()),ps=vertices.map(v=>stage.toScreen(v.clone().applyQuaternion(root.quaternion))),left=Math.min(...ps.map(p=>p.x))-zero.x;
  root.position.copy(site.worldLayout.anchor(14-left,site.worldLayout.floorY()-12));root.updateMatrixWorld(true);
  for(let n=0;n<3;n++){const actual=vertices.map(v=>stage.toScreen(v.clone().applyMatrix4(root.matrixWorld))),min=Math.min(...actual.map(p=>p.x)),base=stage.toScreen(root.position);root.position.copy(site.worldLayout.anchor(base.x+18-min,base.y));root.updateMatrixWorld(true);}
 }
 function layout(){
  if(!root||!picture)return;const key=world.layoutKey().join(',');if(key===last)return;last=key;
  // Derive home independently of the reservation. Full assembly bounds are
  // stable even when a peg is empty, preventing a first-paint / wearing jump.
  root.quaternion.copy(rotation);place();
  const turn=facing();if(turn){root.quaternion.copy(rotation).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),turn));place();}
  if(entry){entry.body.setTranslation(root.position,false);entry.body.setRotation(root.quaternion,false);world.sync(entry);}
  supports.update('rack');supports.update('rack-lamp');invalidate();
 }
 // No button row (e1111-34, e1111-58 note 6): tapping the post cycles hats, tapping a hung hat wears it; drag the bulb
 // onto the lampshade to fit it, tap the fitted bulb to switch it. The empty row that stayed for the drop fade is gone.
 function buildHat(name,inst){
  const bodyRoot=new T.Group();inst.physical=true;hats.set(name,inst);
  inst.worldTask=(async()=>{
   await ensure();const data=prepareArt(T,createHat({variant:name}),HAT_SCALE),visual=data.visual,shapes=preparedShapes(T,hatPhysics[name],HAT_SCALE);bodyRoot.add(pickMesh(T,visual));
   // Beveled brim follows the real lathe profile. A flat thin cylinder hull
   // produced a persistent near-upright contact cycle in seeds 12/14/15/24.
   if(name==='wizard'){
    const points=[];for(const [r,y]of [[.22,0],[.24,.01],[.235,.023]])for(let n=0;n<16;n++){const a=n*Math.PI/8;points.push(Math.sin(a)*r*HAT_SCALE,y*HAT_SCALE,Math.cos(a)*r*HAT_SCALE);}
    shapes[1]={type:'hull',points};
   }
   // One outer hull includes the voxel pom without assigning half the paper
   // hat mass to a separate tiny tip collider. All supporting extrema are art vertices.
   if(name==='party')shapes.splice(0,shapes.length,{type:'hull',points:Array.from(visual.geometry.attributes.position.array)});
   inst.art=data;inst.hatArt=visual;inst.colliderVertices=data.vertices;inst.colliderShapes=shapes;const p=createMeshPicture(site,bodyRoot,visual,data.vertices);inst.picture=p;
   const sync=e=>{inst.resting=!!e.support||e.body.isSleeping();p.draw();keepsakes.syncWorld(inst,p.rect);site.worldLayout.shadow(inst);};
   const saved=store.get('worldBodies.'+inst.id);inst.mass=hatPhysics[name].mass;inst.physicsMaterial={friction:name==='party'?.8:.65,restitution:name==='party'?.02:.08,linearDamping:.3,angularDamping:name==='party'?3:1.5,skin:.001};
   const e=await world.add({id:inst.id,object:bodyRoot,shapes,mass:hatPhysics[name].mass,persist:true,sleeping:true,presentation:p,position:root.position.clone(),sync,resize:resizeProp(site,data.vertices),
    material:inst.physicsMaterial,sound:{material:name==='crown'?'metal':name==='cone'?'tin':'paper',size:'small'},
    tap:()=>site.eggs.hat?.wear(worn()===name?null:name),rest:()=>keepsakes.saveWorld(inst),home:()=>{const v=site.worldLayout.anchor(stage.width*.55);v.y=1;return v;}});
   inst.worldEntry=e;e.gripHeight=.12;e.grabbed=()=>{inst.autoHome=false;inst.resting=false;};
   if(!saved)supports.mount(e,'rack',name,{animate:false});
   if(e.support)supports.update(e.support.id);world.sync(e);world.save(e);keepsakes.saveWorld(inst);inst.worldReady=true;return e;
  })().catch(error=>{inst.worldError=String(error);console.error('world hat',name,error);});return bodyRoot;
 }
 function ensure(quiet=false){
  if(task)return task;
  task=(async()=>{
   await world.ensure();
   const [hatModule,rackModule]=await Promise.all([import('../../assets/models/prepared/hats.js'),import('../../assets/models/prepared/rack.js'),stage.ensureEnv()]);
   ({create:createHat,physics:hatPhysics}=hatModule);({create:createRack,physics:rackPhysics}=rackModule);
   const i=keepsakes.get('rack')||keepsakes.give('rack');root=i.object;
   const rackArt=createRack({upperReach:.36});rackPhysics=rackArt.userData.physics;
   // Separate the two lower hanging brims from the upper pair. Move the entire
   // lower brass arms and their collars together; the turned post is unchanged.
   rackArt.traverse(o=>{if(!o.isMesh||o.material.metalness<.5)return;const p=o.geometry.attributes.position;for(let n=0;n<p.count;n++)if(p.getY(n)>1.02&&p.getY(n)<1.10)p.setY(n,p.getY(n)-.20);p.needsUpdate=true;});
   art=prepareArt(T,rackArt,RACK_SCALE);const composite=new T.Group();composite.add(art.visual);root.add(pickMesh(T,art.visual));
   vertices.push(...surfaceVertices(art.visual));
   // The lower two hats hang out/down; the upper two point out/up. Their
   // hollow brims rest over four permanent knobs, with one stable name each.
   for(const name of HAT_NAMES){
    const a=[...rackPhysics.anchors.pegs[name]];if(name==='wizard'||name==='cone')a[1]-=.20;const pos=new T.Vector3(...a).multiplyScalar(RACK_SCALE);
    const z={wizard:2.05,cone:-2.05,party:-.42,crown:.42}[name],q=new T.Quaternion().setFromEuler(new T.Euler(0,0,z));
    const peg=new T.Vector3(...hatPhysics[name].anchors.peg).multiplyScalar(HAT_SCALE);pos.sub(peg.applyQuaternion(q));
    slots.push({id:name,accepts:['rack/'+name],position:pos.toArray(),quaternion:q.toArray(),pivot:[0,.02,0]});
    const temp=prepareArt(T,createHat({variant:name}),HAT_SCALE);for(const v of surfaceVertices(temp.visual))vertices.push(v.applyQuaternion(q).add(pos));temp.dispose();
   }
   const socket=new T.Vector3(...rackPhysics.anchors.socket).multiplyScalar(RACK_SCALE);for(const f of furnish)f(composite,socket.clone());vertices.push(socket.clone().add(new T.Vector3(-.13,-.06,-.13)),socket.clone().add(new T.Vector3(.13,.18,.13)));
   picture=createMeshPicture(site,root,composite,vertices);i.picture=picture;
   // Unlocked now (not restored from a save or an older party hat): it drops in once its hats hang on it (rack-drop.js).
   if(!i.restored&&!quiet){arrival=createRackDrop(site,picture,{ui,settle:flush,onImpact:n=>{if(!n&&!stage.reducedMotion&&!cat.hidden&&!cat.standIn)cat.playEmote('startle','rack');}});arrival.hold();}
   layout();
   entry=await world.add({id:'rack',object:root,shapes:preparedShapes(T,{...rackPhysics,colliders:rackPhysics.colliders.map(c=>c.type==='box'&&c.position[1]===1.04?{...c,position:[c.position[0],.84,c.position[2]]}:c)},RACK_SCALE),fixed:true,sleeping:true,presentation:picture,sync:()=>invalidate()});i.worldEntry=entry;i.worldReady=true;
   supports.register({id:'rack',kind:'pin',object:root,slots,onChange:changed,
    adopt(e){adopt(e,composite);},release});
   // Only a charged bulb fits, and only once the lampshade is there (src/world/lamp.js).
   supports.register({id:'rack-lamp',kind:'slot',object:root,slots:[{id:'socket',accepts:e=>e.id==='bulb'&&site.lamp?.fits!==false,position:socket.toArray()}],onChange:()=>site.lamp?.changed(),onMount:(e,o)=>site.lamp?.mounted(e,o),
    adopt(e){adopt(e,composite);},release});
   last='';layout();site.lamp?.changed();return api;
  })();return task;
 }
 function owned(){
  const saved=store.get('hats.owned');if(Array.isArray(saved))return HAT_NAMES.filter(n=>saved.includes(n));
  const worn=store.get('hat');return HAT_NAMES.filter(n=>store.get('keepsakes.rack/'+n)||keepsakes.has('rack/'+n)||n===worn);
 }
 function own(names=[]){const have=owned();store.set('hats.owned',HAT_NAMES.filter(n=>have.includes(n)||names.includes(n)));}
 // grant: hats this call adds (the sigil's next one, or the cake's party hat). With none given and none owned yet (a
 // fixture, the lamp's award, an old rack save), the rack comes with the sigil's three, as it would from the sigil.
 async function ready({quiet=false,grant=null}={}){if(grant)own(grant);else own(owned().length?[]:SIGIL_HATS);await ensure(quiet);for(const name of owned())if(!keepsakes.has('rack/'+name))keepsakes.give('rack/'+name);await Promise.all([...hats.values()].map(i=>i.worldTask));
  if(restoring){restoring=false;const saved=store.get('hat');if(saved&&hats.has(saved)&&!worn()&&!store.get('worldBodies.rack/'+saved)?.support?.id?.startsWith('cat')){const i=hats.get(saved);if(i.worldEntry?.support?.id==='rack')supports.mount(i.worldEntry,'cat-hat','hat',{animate:false});}changed();}
  if(arrival&&!landing)landing=arrival.start().then(()=>{landed=arrival.stats;arrival=null;invalidate();});
  if(landing)await landing;return api;}
 // Wearing before the rack was ever found (the party's hat on his return) builds it quietly: the drop-in arrival
 // belongs to finding the rack, not to a hat handed to him.
 async function wear(name,{gift=false}={}){if(name&&!HAT_NAMES.includes(name))return false;if(name&&!gift&&!owned().includes(name))return false;await ready({quiet:!task,grant:name&&gift?[name]:null});const old=worn();if(old===name)return true;
  if(old)supports.mount(hats.get(old).worldEntry,'rack',old,{animate:false});
  if(name)supports.mount(hats.get(name).worldEntry,'cat-hat','hat',{animate:false});changed();return true;}
 async function hang(name,animate=true){await ready();const e=hats.get(name)?.worldEntry;return !!e&&supports.mount(e,'rack',name,{animate});}
 defining=true;keepsakes.define({id:'rack',label:'the hat rack',kind:'gl',fixed:true,size:.42,aspect:1.9,home:()=>keepsakes.toUnits(Math.max(46,stage.width*.07),site.worldLayout.floorY()),
  object:(_,i)=>{i.physical=true;i.restored=defining;const g=new T.Group();i.worldTask=Promise.resolve().then(()=>ready());return g;},place(){},tap:()=>site.eggs.hat?.cycle()});defining=false;
 for(const name of HAT_NAMES)keepsakes.define({id:'rack/'+name,label:name+' hat',kind:'gl',size:.32,aspect:1,home:()=>({x:0,y:.2}),object:(_,i)=>buildHat(name,i),place(){},tap:()=>site.eggs.hat?.wear(worn()===name?null:name),removed(i){world.remove(i.id);site.worldLayout.remove(i.id);i.picture?.dispose();i.art?.dispose();hats.delete(name);changed();}});
 stage.onResize.push(layout);
 // The fixed post can be tapped, but can never start a physical grip.
 site.input.claim(94,e=>{const i=keepsakes.get('rack');if(!entry||site.input.locked||root.userData.collectionHidden||!i.hits(e.clientX,e.clientY))return null;
  const p=stage.toScreen(root.localToWorld(new T.Vector3(0,.45,0)));if(Math.abs(e.clientX-p.x)>14||e.clientY<p.y-50)return null;let moved=false;return {move(ev){if(Math.hypot(ev.clientX-e.clientX,ev.clientY-e.clientY)>8)moved=true;},end(ev){if(!moved&&ev.type==='pointerup')site.eggs.hat?.cycle();}};});
 const api={ensure,ready,wear,hang,owned,hats,slots,invalidate,layout,furnish,get arrival(){return arrival?.stats||landed;},get landing(){return landing;},get wearing(){return worn();},get root(){return root;},get entry(){return entry;},get picture(){return picture;},get art(){return art;},get ui(){return ui;},get task(){return task;},scale:HAT_SCALE,rackScale:RACK_SCALE};return api;
}
