import {forPicture} from '../core/cat.js';
import {createMeshPicture} from '../core/mesh-picture.js';
import {boxVertices} from './solid.js';
import {css} from '../core/util.js';
import {furnitureArrivals} from './arrival.js';
import {softWallShadow} from '../core/soft-floor-shadow.js';
css('world-shelf',`.shelf-preview{position:fixed;pointer-events:none;z-index:6;color:#39543e;border:2px dashed #648268;border-radius:8px;background:#d9ead02b;font:600 12px system-ui;letter-spacing:0;text-transform:none;white-space:nowrap;display:grid;place-items:end center;padding:4px}`);
const IDS=['rifle','top','pat','tin'];
export const SHELF_IDS=IDS;
// Depth (e1111-36): the shelf turns to face the cat a little past square-on, so its far (right) end recedes.
// Playtest 2 (2026-11-12): "looks weirdly angled down, it should still stay flat and can be a little bit bigger".
// Turned to face the cat (and 11 degrees past), the plank receded to the right above eye level and read as sloping
// down; the display tilt added to it. Now it is square to the screen (`square`: no turn toward the camera) plus a
// hair of turn (2 degrees, its front edge slopes about half a percent), tilts just enough to show its top (.1 rad),
// and is drawn larger, which puts it nearer the camera.
// Playtest 3 (e1113-30, approved from the mock-up on sc/p3-mock, "IMG3: ... it needs to be at a roughly 20 degree angle
// to the *right* and brought down a little bit lower and to the right"): turned 30 degrees to its right (yawDeg; +
// turns its front to the right), moved right by dx of the page's width and down by dy of its height (on a short
// screen, `short` px tall or less, dyShort: the hat rack is under it there). Turned that far, its receding end above
// eye level reads as sloping down, so `level` rolls it about its own depth axis until its front edge is level on screen.
export const SHELF_VIEW={square:true,yawDeg:30,tilt:.1,width:.34,maxWidth:450,ofHeight:.5,level:true,dx:.05,dy:.08,dyShort:0,short:500};
// Two hooks under the plank (playtest 2): the pail and the flour sack hang from either one, swing a little when hung
// or tapped, and come off with a pull. Shelf-local: x along the plank, the plank's underside is y=0, z toward you.
export const HOOKS={x:[-.21,.2],y:-.058,z:.05,takes:['bucket','flour']};
// The resting top (e1111-42) leans this way in shelf space (radians from +x toward the front): forward and to the
// left, its crown toward you and its stem away from the rifle.
// The recess sits at the art's TOP_X (assets/models/prepared/shelf.js; polish lane, playtest 3: moved left from -.38
// so the top no longer hides the rifle's stock).
const TOP_LEAN=Math.PI-.55,HOLE={x:-.53,z:.06,r:.073,floor:.014,top:.05};
export function shelfService(site){return site.shelf??=createShelf(site);}
function createShelf(site){
 const {THREE:T,world,stage,supports,keepsakes,store}=site;
 let shelfArt,shelfPhysics;
 let task=null,root,picture,entry,art,preview,dirty=false,last='',stopKey='',home=null,homeRect=null,arrival=null,wall=null;
 const arrivals=furnitureArrivals(site);
 const vertices=boxVertices(T,[.71,.27,.20],[0,.07,0]);
 const slots=IDS.map(id=>({id,accepts:[id],position:({rifle:[0,.14,-.09],top:[HOLE.x,.016,.06],pat:[.035,.064,.07],tin:[.46,.05,.035]})[id],quaternion:[0,0,0,1]}));
 const receiver=new T.Group();receiver.position.y=.05;receiver.rotation.x=-Math.PI/2;
 // The point an item hangs from, in its own frame: the middle of its topmost points (the pail's grip, the sack's
 // folded top). Its slot puts that point on the hook; the swing pivots about it.
 function hangPoint(id){const vs=keepsakes.get(id)?.colliderVertices;if(!vs?.length)return [0,.3,0];const top=Math.max(...vs.map(v=>v.y)),near=vs.filter(v=>v.y>top-.012);return [near.reduce((a,v)=>a+v.x,0)/near.length,top,near.reduce((a,v)=>a+v.z,0)/near.length];}
 // One slot per (hook, item) so each item hangs at its own height; a hook holds one thing (its sibling must be free).
 const hookSlots=HOOKS.x.flatMap((x,n)=>HOOKS.takes.map(id=>{const s={id:'hook'+n+':'+id,hook:n,item:id,kind:'hang',quaternion:[0,0,0,1],
  accepts:e=>e.id===id&&!hookSlots.some(o=>o.hook===n&&o!==s&&o.occupant),
  get position(){const h=hangPoint(id);return [x-h[0],HOOKS.y-h[1],HOOKS.z-h[2]];},get pivot(){return hangPoint(id);}};return s;}));
 let hookArt=null;
 function invalidate(){if(dirty)return;dirty=true;stage.onRender.push(flush);}
 function flush(){const n=stage.onRender.indexOf(flush);if(n>=0)stage.onRender.splice(n,1);dirty=false;picture?.draw(true);if(picture){const a=arrival&&homeRect?homeRect:picture.rect;site.worldLayout.reserve('shelf',{x:a.x,y:a.y,w:a.w,h:a.h});}}
 function clearPreview(){preview?.remove();preview=null;}
 function showPreview(e){
  if(!root||world.held?.entry!==e){clearPreview();return;}
  const held=world.held,slot=slots.find(s=>s.id===e.id),target=slot&&supports.pose('shelf',slot.id);
  if(target&&!slot.occupant){
   // Aim with the bay's upright frame: a resting slot may be tilted (the top, e1111-42) but the hanging body is not,
   // and a goal that follows the swinging body only feeds the swing.
   const goal=target.p.clone().add(held.local.clone().applyQuaternion(root.quaternion)),p=stage.toScreen(held.target),dest=stage.toScreen(goal),i=keepsakes.get(e.id);
   if(Math.abs(p.x-dest.x)<Math.max(28,(i?.box.w||50)/2)&&Math.abs(p.y-dest.y)<Math.max(28,(i?.box.h||50)/2)){
    const normal=stage.camera.getWorldDirection(new T.Vector3());
    const delta=goal.sub(held.target).dot(normal);if(Math.abs(delta)>.01)site.worldInput.guideDepth(Math.max(-.08,Math.min(.08,delta)));
   }
  }
  const c=supports.candidate(e);if(!c||(c.id!=='shelf'&&c.id!=='shelf-hooks')){clearPreview();return;}
  preview??=document.body.appendChild(Object.assign(document.createElement('div'),{className:'shelf-preview'}));
  preview.textContent=c.id==='shelf-hooks'?'Release to hang':'Release to place';preview.dataset.slot=c.name;
  // Over the furniture (playtest 2): the whole shelf (and, for the pail and the sack, the hooks' hanging room) is
  // outlined, not one bay.
  if(c.rect){const r=c.rect,x=Math.max(4,r.x),y=Math.max(4,r.y);Object.assign(preview.style,{left:x+'px',top:y+'px',width:Math.min(stage.width-4,r.x+r.w)-x+'px',height:r.y+r.h-y+'px'});return;}
  const p=stage.toScreen(supports.pose(c.id,c.name).p),i=keepsakes.get(e.id);
  const w=Math.max(132,Math.min(220,i?.box.w||80)),h=Math.max(44,i?.box.h||44);Object.assign(preview.style,{left:Math.max(8,Math.min(stage.width-w-8,p.x-w/2))+'px',top:(p.y-h/2)+'px',width:w+'px',height:h+'px'});
 }
 function hook(i){if(HOOKS.takes.includes(i?.id)&&i.worldEntry&&!i.shelfHook){i.shelfHook=true;const e=i.worldEntry,oldSync=e.sync,oldRelease=e.released;e.sync=x=>{oldSync?.(x);if(world.held?.entry===x)showPreview(x);};e.released=()=>{oldRelease?.();clearPreview();};return;}
  if(!IDS.includes(i?.id)||!i.worldEntry||i.shelfHook)return;i.shelfHook=true;const e=i.worldEntry,oldSync=e.sync,oldGrab=e.grabbed,oldRelease=e.released;
  e.sync=x=>{oldSync?.(x);if(world.held?.entry===x)showPreview(x);};
  e.grabbed=()=>{oldGrab?.();};e.released=()=>{oldRelease?.();clearPreview();};
  fit();
 }
 function disposeArt(){if(!art)return;const gs=new Set(),ms=new Set(),ts=new Set();art.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});art.removeFromParent();for(const x of gs)x.dispose();for(const x of ms)x.dispose();for(const x of ts)x.dispose();}
 function sectionLow(v,x){let y=Infinity;for(let n=0;n<v.length;n+=3)for(let j=0;j<3;j++){const a=v[n+j],b=v[n+(j+1)%3];if(!a||!b||x<Math.min(a.x,b.x)||x>Math.max(a.x,b.x)||Math.abs(a.x-b.x)<1e-9)continue;y=Math.min(y,a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x));}return Number.isFinite(y)?y:0;}
 function fit(){
  if(!root)return;const rifle=keepsakes.get('rifle'),vs=rifle?.colliderShapes?.flatMap(s=>{const a=[];for(let n=0;n<s.points.length;n+=3)a.push(new T.Vector3(...s.points.slice(n,n+3)));return a;});
  let stops=[{x:-.3,y:.14},{x:.3,y:.19}];
  if(vs?.length){const min=Math.min(...vs.map(v=>v.x)),max=Math.max(...vs.map(v=>v.x));stops=[.22,.78].map(t=>{const x=min+(max-min)*t;return {x,y:.14+sectionLow(vs,x)};});}
  const k=JSON.stringify(stops);if(k!==stopKey){
   stopKey=k;for(const id of IDS){const i=keepsakes.get(id);if(i?.worldEntry?.support?.id==='shelf')i.picture.detach();}
   disposeArt();art=shelfArt({rifleStops:stops});art.traverse(o=>{if(o.material)forPicture(o.material);});root.userData.visual.add(art);wall?.paint();
   if(entry){
    while(entry.body.numColliders())world.physics.removeCollider(entry.body.collider(0),false);
    const R=world.rapier,add=d=>world.physics.createCollider(d.setFriction(.65),entry.body),box=(size,p)=>add(R.ColliderDesc.cuboid(...size.map(v=>v/2)).setTranslation(...p));
    for(const s of shelfPhysics.colliders.slice(0,5))box(s.size,s.position);
    for(const s of stops){box([.032,s.y-.05,.075],[s.x,(s.y+.05)/2,-.09]);for(const z of [-.133,-.047])box([.032,.044,.012],[s.x,s.y+.014,z]);}
    // The plate is a flat dish plus a sloped annular rim, not a solid cylinder
    // filling the bowl. These cross-sections follow the prepared ceramic art.
    add(R.ColliderDesc.cylinder(.007,.067).setTranslation(.035,.057,.07));
    const profile=[[.067,.055],[.109,.066],[.111,.074],[.105,.077],[.082,.067],[.067,.064]];
    for(let n=0;n<16;n++){const points=[];for(const a of [n*Math.PI/8,(n+1)*Math.PI/8])for(const [r,y]of profile)points.push(.035+r*Math.cos(a),y,.07+r*Math.sin(a));add(R.ColliderDesc.convexHull(new Float32Array(points)));}
    for(const x of [.275,.645])box([.012,.022,.24],[x,.061,.035]);box([.37,.02,.012],[.46,.06,-.091]);
   }
  }
  const pat=keepsakes.get('pat');slots[2].position[1]=.064-(pat?.colliderVertices?Math.min(...pat.colliderVertices.map(v=>v.y)):0);
  const tin=keepsakes.get('tin');slots[3].position[1]=.05-(tin?.colliderVertices?Math.min(...tin.colliderVertices.map(v=>v.y)):0);
  // Tip rests in the recess. The broad top can overhang its rim.
  const top=keepsakes.get('top');if(top?.colliderVertices){const rest=topRest(top);slots[1].position=rest.position;slots[1].quaternion=rest.quaternion;}
  supports.update('shelf');supports.update('shelf-hooks');invalidate();
 }
 function update(){for(const s of [...slots,...hookSlots])s.disabled=!!arrival;invalidate();reserveHooks();}
 // The hooks' own screen bounds, for the layout's furniture list (other lanes read it: nothing is lost behind them).
 function hookRects(){if(!root)return [];root.updateMatrixWorld(true);return HOOKS.x.map(x=>{const a=stage.toScreen(new T.Vector3(x-.02,.004,HOOKS.z).applyMatrix4(root.matrixWorld)),b=stage.toScreen(new T.Vector3(x+.02,HOOKS.y-.016,HOOKS.z).applyMatrix4(root.matrixWorld));return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)};});}
 function reserveHooks(){const rs=hookRects();if(!rs.length||arrival){site.worldLayout.reserve('shelf-hooks',null);return;}const l=Math.min(...rs.map(r=>r.x)),t=Math.min(...rs.map(r=>r.y)),r=Math.max(...rs.map(r=>r.x+r.w)),b=Math.max(...rs.map(r=>r.y+r.h));site.worldLayout.reserve('shelf-hooks',{x:l,y:t,w:r-l,h:b-t});}
 // Iron screw hooks: a short stem into the plank and an open J facing you, in the shelf's own picture.
 function buildHooks(){
  const g=new T.Group(),iron=forPicture(new T.MeshStandardMaterial({color:0x3b3a33,roughness:.38,metalness:.8})),stem=new T.CylinderGeometry(.0048,.0048,.032,10),plate=new T.CylinderGeometry(.012,.012,.003,16),curl=new T.TorusGeometry(.0145,.0044,8,24,Math.PI*1.35),tip=new T.SphereGeometry(.0052,10,8);
  for(const x of HOOKS.x){
   const h=new T.Group();h.position.set(x,0,HOOKS.z);
   const p=new T.Mesh(plate,iron);p.position.y=-.0015;h.add(p);const s=new T.Mesh(stem,iron);s.position.y=-.016;h.add(s);
   // the J: a torus arc hanging from the stem's foot, its open end up toward you
   const c=new T.Mesh(curl,iron);c.rotation.set(0,Math.PI/2,-Math.PI/2);c.position.set(0,HOOKS.y+.0145+.003,0);c.rotateZ(-.2);h.add(c);
   const t=new T.Mesh(tip,iron);t.position.set(0,HOOKS.y+.0145+.003+Math.sin(-.2+Math.PI*.35)*.0145,Math.cos(-.2+Math.PI*.35)*.0145);h.add(t);
   g.add(h);
  }
  g.userData.dispose=()=>{for(const x of [stem,plate,curl,tip,iron])x.dispose();};return g;
 }
 // A real top at rest leans on its shoulder (e1111-42). Of the poses with the tip in the bored recess and every
 // collider point on or above the recess floor / shelf top, take the one whose centre of mass is lowest.
 function topRest(top){
  const vs=top.colliderVertices,c=top.worldEntry?.body.localCom?.(),com=c?new T.Vector3(c.x,c.y,c.z):vs.reduce((a,v)=>a.add(v),new T.Vector3()).divideScalar(vs.length);
  const key=vs.length+':'+com.toArray().map(v=>v.toFixed(4)).join(',');if(topRest.key===key)return topRest.result;
  const dir=new T.Vector3(Math.cos(TOP_LEAN),0,Math.sin(TOP_LEAN)),axis=new T.Vector3(0,1,0).cross(dir).normalize(),q=new T.Quaternion(),p=new T.Vector3();let best=null;
  const solve=(a0,a1,da,s0,s1,ds)=>{for(let a=a0;a<=a1+1e-9;a+=da){q.setFromAxisAngle(axis,a);const rv=vs.map(v=>v.clone().applyQuaternion(q)),cy=p.copy(com).applyQuaternion(q).y;
   for(let s=s0;s<=s1+1e-9;s+=ds){let lift=-Infinity;for(const v of rv){const x=v.x+s*dir.x,z=v.z+s*dir.z;lift=Math.max(lift,(Math.hypot(x,z)<HOLE.r?HOLE.floor:HOLE.top)-v.y);}
    if(!best||lift+cy<best.h-1e-7)best={h:lift+cy,a,s,lift};}}};
  solve(0,1.3,.02,-.08,.08,.004);const b=best;solve(b.a-.02,b.a+.02,.002,b.s-.004,b.s+.004,.0005);
  q.setFromAxisAngle(axis,best.a);
  topRest.key=key;return topRest.result={position:[HOLE.x+best.s*dir.x,best.lift+.0005,HOLE.z+best.s*dir.z],quaternion:q.toArray(),tiltDeg:best.a*180/Math.PI};
 }
 function storeItem(id,animate=true){const i=keepsakes.get(id);if(!i?.worldEntry||!entry||arrival)return false;const e=i.worldEntry,v=e.body.linvel();if(animate&&!e.support&&(e.canGrab===false||Math.hypot(v.x,v.y,v.z)>.65))return false;return supports.mount(e,'shelf',id,{animate});}
 function layout(){if(!root)return;
  // (the camera too: the footer can grow mid-game and move it; a stale key left the shelf where the old camera put it, integration playtest-2)
  const key=[...world.layoutKey(),...Object.values(SHELF_VIEW)].join(",");if(last===key){applyArrival();return;}last=key;
  // One shelf everywhere (phones play on their side, shell lane playtest-2); on a short screen it also keeps to
  // SHELF_VIEW.ofHeight x the height, so it and its hooks fit (.5: the shell lane's landscape layout).
  const width=Math.min(stage.width*SHELF_VIEW.width,SHELF_VIEW.maxWidth,stage.height*SHELF_VIEW.ofHeight),ppu=width/1.42;
  const distance=stage.height/(2*Math.tan(stage.camera.fov*Math.PI/360)*ppu),normal=stage.camera.getWorldDirection(new T.Vector3()),centre=stage.camera.position.clone().addScaledVector(normal,distance);
  const x=18+width/2+stage.width*SHELF_VIEW.dx,y=stage.insets.top+Math.min(105,stage.height*.2)+stage.height*(stage.height<=SHELF_VIEW.short?SHELF_VIEW.dyShort:SHELF_VIEW.dy);
  const plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,centre);root.position.copy(stage.ray(x,y).intersectPlane(plane,new T.Vector3()));
  // Square to the screen (SHELF_VIEW.square), or facing the camera across (the old look), then SHELF_VIEW.yawDeg
  // further. A shallow display tilt reveals the recessed tray and padded saddles.
  stage.camera.updateMatrixWorld();const c=root.position.clone().applyMatrix4(stage.camera.matrixWorldInverse),face=Math.atan2(-c.x,-c.z);
  const turn=(roll=0)=>{root.quaternion.copy(stage.camera.quaternion).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),(SHELF_VIEW.square?0:face)+SHELF_VIEW.yawDeg*Math.PI/180)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),roll)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),SHELF_VIEW.tilt));root.updateMatrixWorld(true);};
  turn();
  // Level (SHELF_VIEW.level): the roll about its own depth axis (its z) that makes its front edge level on screen, by a
  // few secant steps (the slope is smooth and nearly linear in the roll; it converges in 3-4).
  if(SHELF_VIEW.level){const slope=()=>{const [a,b]=[-.6,.6].map(x=>stage.toScreen(new T.Vector3(x,.05,.17).applyMatrix4(root.matrixWorld)));return (b.y-a.y)/(b.x-a.x);};
   let r0=0,s0=slope(),r1=.02;turn(r1);let s1=slope();for(let i=0;i<8&&Math.abs(s1)>1e-5&&s1!==s0;i++){const r2=r1-s1*(r1-r0)/(s1-s0);r0=r1;s0=s1;r1=r2;turn(r1);s1=slope();}
   root.userData.rollDeg=+(r1*180/Math.PI).toFixed(2);}
  if(entry){entry.body.setTranslation(root.position,false);entry.body.setRotation(root.quaternion,false);}
  picture?.draw(true);
  const r=picture.rect,dx=Math.max(0,14-r.x),dy=Math.max(0,stage.insets.top+12-r.y);if(dx||dy){root.position.add(stage.onWall(x+dx,y+dy,root.position.z).sub(stage.onWall(x,y,root.position.z)));root.updateMatrixWorld(true);if(entry)entry.body.setTranslation(root.position,false);picture.draw(true);}
  home=root.position.clone();homeRect={...picture.rect};
  // Its soft shadow on the wall (e1113-30): repainted for the new turn (the light meets it at another angle), static after.
  wall?.paint();
  supports.update('shelf');supports.update('shelf-hooks');update();applyArrival();
 }
 // Arrival (e1111-37): slide the picture in from the left; the body waits at home, disabled, until it lands.
 function applyArrival(plan=arrival){
  if(!root||!home||!plan)return;
  const s=stage.toScreen(home),off=-(1-plan.u)*(homeRect.x+homeRect.w+40);
  root.position.copy(home);if(off||plan.dy){const n=stage.camera.getWorldDirection(new T.Vector3()),hit=stage.ray(s.x+off,s.y+plan.dy).intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(n,home),new T.Vector3());if(hit)root.position.copy(hit);}
  root.updateMatrixWorld(true);const plane=picture?.card.children[0];if(plane&&plane.material.opacity!==plan.opacity){plane.material.opacity=plan.opacity;}
  wall?.place(plan.opacity);
  picture?.draw(true);
 }
 function land(){arrival=null;root.position.copy(home);root.updateMatrixWorld(true);wall?.place(1);if(entry){entry.body.setTranslation(home,false);entry.body.setEnabled(true);}supports.update('shelf');supports.update('shelf-hooks');update();invalidate();}
 async function ensure(){if(supports.count('solid')<2)return null;if(!task)task=(async()=>{
  await Promise.all([world.ensure(),stage.ensureEnv(),document.fonts.ready]);
  ({create:shelfArt,physics:shelfPhysics}=await import('../../assets/models/prepared/shelf.js'));
  await Promise.all(IDS.map(id=>keepsakes.get(id)?.worldTask));
  root=new T.Group();root.userData.visual=new T.Group();root.add(receiver);stage.scene.add(root);picture=createMeshPicture(site,root,root.userData.visual,vertices);
  wall=softWallShadow(site,root,root.userData.visual,()=>[art,hookArt]);fit();layout();
  entry=await world.add({id:'furniture-shelf',object:root,shapes:[],fixed:true,sleeping:true,presentation:picture});
  hookArt=buildHooks();root.userData.visual.add(hookArt);wall.paint();
  const area=()=>picture&&!arrival?picture.rect:null;
  supports.register({id:'shelf',kind:'slot',object:root,slots,onChange:update,area,onMount(e,{animate}){if(animate)site.audio.impact(e.id,{material:e.id==='pat'?'butter':e.id==='tin'?'tin':e.id==='rifle'?'metal':'wood',size:'small',strength:.3});},shadow:()=>({object:receiver,parent:root.userData.visual,z:0,invalidate}),
   adopt(e){e.presentation?.attach(root.userData.visual,root,invalidate);},release(e){e.presentation?.detach();invalidate();}});
  // The hooks: a second support on the same root. Hung items keep their own pictures (they hang below the shelf's),
  // cast no shadow, and a tap on one sets it swinging.
  supports.register({id:'shelf-hooks',kind:'slot',object:root,slots:hookSlots,area,onChange:update,
   onMount(e,{animate}){if(animate)site.audio.impact(e.id,{material:e.id==='bucket'?'tin':'paper',size:'small',strength:.25});},
   adopt(e){if(e.hookTap)return;const tap=e.tap;e.hookTap=true;e.tap=ev=>{if(e.support?.id==='shelf-hooks'){supports.swing(e,.8);return;}tap?.(ev);};}});
  stopKey='';fit();last='';layout();for(const id of [...IDS,...HOOKS.takes])hook(keepsakes.get(id));
  if(arrival){entry.body.setEnabled(false);arrivals.begin(arrival,{apply:applyArrival,land});}
  return api;
 })();return task;}
 for(const id of IDS)supports.registerCategory(id,'solid');supports.onDiscover((id,category)=>{if(category!=='solid')return;if(!task&&!arrival)arrival=arrivals.unlock('shelf');ensure();});keepsakes.onGive(i=>{if(IDS.includes(i.id))Promise.resolve(i.worldTask).then(()=>{ensure();hook(i);update();});if(HOOKS.takes.includes(i.id))Promise.resolve(i.worldTask).then(()=>{if(entry)hook(i);});});stage.onResize.push(layout);
 function hang(id,hook,animate=true){const i=keepsakes.get(id);if(!i?.worldEntry||!entry||arrival)return false;const free=hookSlots.filter(s=>s.item===id&&(hook==null||s.hook===hook)&&s.accepts(i.worldEntry)&&(!s.occupant||s.occupant===id));return !!free.length&&supports.mount(i.worldEntry,'shelf-hooks',free[0].id,{animate});}
 const api={ensure,store:storeItem,hang,hookRects,hookSlots,fit,invalidate,slots,topRest:()=>topRest.result,get ready(){return !!entry;},get arriving(){return !!arrival;},get task(){return task;},get root(){return root;},get picture(){return picture;},get entry(){return entry;},get art(){return art;},get preview(){return preview;},get home(){return homeRect;},get wallShadow(){return wall;}};
 ensure();return api;
}
