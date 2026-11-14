import {boardArt} from './board-art.js';
import {createMeshPicture} from '../core/mesh-picture.js';
import {furnitureArrivals} from './arrival.js';
// Depth (e1111-36): the board is a little smaller than it was (1.1 x .75) and turns to face the cat a little past
// square-on, mirroring the shelf, so its inner (left) edge recedes. Cards keep their physical size.
// Phones play on their side now (shell lane, playtest-2): one board everywhere, no one-card-at-a-time phone board.
export const BOARD_VIEW={yawDeg:-11,desktop:{width:1.07,height:.71,poses:[[-.28,0],[.225,.14],[.225,-.18],[-.3,-.215,.026]]}};
export function createPinboard(site){
 const {THREE:T,stage,world,supports,keepsakes,store}=site,ids=['paper','postcard','ticket','recipe'];
 let task=null,root=null,picture=null,entry=null,art=null,last='',selected=store.get('pinboard.selected','paper'),dirty=false,home=null,homeRect=null,arrival=null;
 const arrivals=furnitureArrivals(site),bounds=new T.Box3(),corner=new T.Vector3();
 const slots=ids.map(id=>({id,accepts:[id],position:[0,0,.020],quaternion:[0,0,0,1],pivot:[0,.2,0]})),vertices=[];
 let width=1.1,height=.75;
 function invalidate(){if(dirty)return;dirty=true;stage.onRender.push(flush);}
 function flush(){
  const n=stage.onRender.indexOf(flush);if(n>=0)stage.onRender.splice(n,1);dirty=false;picture?.draw(true);
  if(picture){const a=arrival&&homeRect?homeRect:picture.rect;site.worldLayout.reserve('pinboard',{x:a.x,y:a.y,w:a.w,h:a.h});}
 }
 function updateUI(){
  if(!root)return;
  const present=ids.filter(id=>keepsakes.has(id));if(!present.includes(selected))selected=present[0]||'paper';
  for(const s of slots)s.disabled=!!arrival;
  for(const id of ids){const i=keepsakes.get(id);if(!i?.worldEntry)continue;
   const onBoard=i.worldEntry.support?.id==='pinboard';i.stored=false;i.object.visible=!i.stored;i.el.hidden=i.stored;i.worldEntry.body.setEnabled(!i.stored);const shadow=site.worldLayout.shadows.get(id);if(shadow)shadow.group.visible=!i.stored;
   if(i.cardArt)i.cardArt.visible=!i.stored;if(i.picture.card)i.picture.card.visible=!onBoard&&!i.stored;
   const pin=art?.pins.get(id);if(pin)pin.visible=onBoard&&!i.stored;
  }
  invalidate();
 }
 function select(id){if(!ids.includes(id)||!keepsakes.has(id))return;selected=id;store.set('pinboard.selected',id);last='';layout();}
 // A card held near its own pin guides the grip's depth toward it (the board is turned, its slots sit at different
 // depths), so the unchanged release thresholds can accept it. Same rule as the shelf's bays.
 function guide(e){
  if(!root||arrival)return;const held=world.held,slot=slots.find(s=>s.id===e.id);if(!held||held.entry!==e||!slot||slot.disabled||(slot.occupant&&slot.occupant!==e.id))return;
  const target=supports.pose('pinboard',slot.id);if(!target)return;const goal=target.p.clone().add(held.local.clone().applyQuaternion(target.q)),p=stage.toScreen(held.target),dest=stage.toScreen(goal),i=keepsakes.get(e.id);
  if(Math.abs(p.x-dest.x)<Math.max(28,(i?.box.w||50)/2)&&Math.abs(p.y-dest.y)<Math.max(28,(i?.box.h||50)/2)){const delta=goal.sub(held.target).dot(stage.camera.getWorldDirection(new T.Vector3()));if(Math.abs(delta)>.01)site.worldInput.guideDepth(Math.max(-.08,Math.min(.08,delta)));}
 }
 // Playtest 2 (the rotational-equilibrium paper vanished when lifted from under the recipe). Two causes:
 // 1. The recipe is pinned over the paper's lower left. Lifted, the paper was a loose body boxed in between the
 //    board and the pinned (fixed) recipe, so the hand could not move it; it sat in the board's plane.
 //    Pinned cards now leave loose cards alone (collision groups): a pinned card's only membership is CARD_PINNED,
 //    which every card's filter leaves out. Everything else still meets pinned cards as before.
 // 2. A loose card in the board's plane sorted behind the board's picture: pictures sort by centre distance and the
 //    board's inner (left) side recedes (it pivots on its right edge), so its far side is behind its centre.
 //    A loose card in front of the board's face, over the board, now draws (and picks) above the board's picture.
 const CARD_PINNED=0x4000,ALL=0xffff;
 function cardGroups(e,pinned){if(!e?.body)return;const g=(((pinned?CARD_PINNED:ALL)<<16)|(ALL&~CARD_PINNED))>>>0;for(let n=0;n<e.body.numColliders();n++){if(e.off)e.off[n][0]=g;else e.body.collider(n).setCollisionGroups(g);}}   // a stored (disabled) card keeps no collisions until it is back (world.js disable)
 const _n=new T.Vector3(),_p=new T.Vector3();
 function overBoard(obj,pic){
  if(!root||!picture||arrival||!pic?.card||pic.attached)return;const plane=pic.card.children[0],board=root.userData.pictureOrder;if(plane==null||board==null)return;
  const r=picture.rect,c=pic.rect;if(c.x>r.x+r.w||c.x+c.w<r.x||c.y>r.y+r.h||c.y+c.h<r.y)return;
  _n.set(0,0,1).applyQuaternion(root.quaternion);if(_p.copy(obj.getWorldPosition(_p)).sub(root.position).dot(_n)<0)return;
  if(plane.renderOrder<=board){plane.renderOrder=obj.userData.pictureOrder=board+.5;}
 }
 function dimensions(){width=BOARD_VIEW.desktop.width;height=BOARD_VIEW.desktop.height;}
 function layout(){
  if(!root)return;const key=[stage.width,stage.height,stage.dpr,stage.insets.top,stage.insets.bottom].join(',');if(last===key){applyArrival();return;}last=key;
  const oldWidth=width,oldHeight=height;dimensions();
  if(!art||oldWidth!==width||oldHeight!==height){
   // Rebuild only on the breakpoint: paper keeps its physical dimensions.
   if(art){for(const id of ids){const i=keepsakes.get(id);if(i?.picture.attached)i.picture.detach();}root.userData.visual.clear();art.dispose();}
   art=boardArt(T,width,height);root.userData.visual.add(art.group);vertices.splice(0,vertices.length,...art.vertices);
   if(entry)entry.body.collider(0).setHalfExtents({x:width/2,y:height/2,z:.018});
  }
  const found=document.querySelector('#found'),tally=document.querySelector('#tally');
  const top=Math.max(stage.insets.top,found?.getBoundingClientRect().bottom||0,tally?.getBoundingClientRect().bottom||0)+12;
  const ppu=stage.pxPerUnit(new T.Vector3()),px=width*ppu,py=height*ppu,normal=stage.camera.getWorldDirection(new T.Vector3()),wall=new T.Plane(normal,0);
  root.position.copy(stage.ray(stage.width-18-px/2,top+py/2).intersectPlane(wall,new T.Vector3()));
  stage.camera.updateMatrixWorld();const c=root.position.clone().applyMatrix4(stage.camera.matrixWorldInverse),face=Math.atan2(-c.x,-c.z);
  root.quaternion.copy(stage.camera.quaternion).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),face+BOARD_VIEW.yawDeg*Math.PI/180));root.updateMatrixWorld(true);
  // Turned, its projected corners move: put the actual right edge and top back on their margins.
  for(let n=0;n<2;n++){let right=-Infinity,up=Infinity;for(const v of art.vertices){const p=stage.toScreen(corner.copy(v).applyMatrix4(root.matrixWorld));right=Math.max(right,p.x);up=Math.min(up,p.y);}
   const s=stage.toScreen(root.position),hit=stage.ray(s.x+(stage.width-18-right),s.y+(top-up)).intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(normal,root.position),new T.Vector3());if(hit)root.position.copy(hit);root.updateMatrixWorld(true);}
  // Pivot on the right edge: it keeps its depth and the inner edge recedes, so the board reads smaller and deeper.
  {let near=null,best=Infinity;const view=new T.Vector3();for(const v of art.vertices){if(v.x<=0||v.y<=0||v.z<.05)continue;const w=corner.copy(v).applyMatrix4(root.matrixWorld);const d=view.copy(w).sub(stage.camera.position).dot(normal);if(d<best){best=d;near=w.clone();}}
   const want=stage.camera.position.clone().sub(root.position).dot(normal)*-1;if(near){const s0=stage.toScreen(near);root.position.addScaledVector(normal,want-best);root.updateMatrixWorld(true);
    const s1=stage.toScreen(near.addScaledVector(normal,want-best)),hit=stage.ray(stage.toScreen(root.position).x+(s0.x-s1.x),stage.toScreen(root.position).y+(s0.y-s1.y)).intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(normal,root.position),new T.Vector3());if(hit)root.position.copy(hit);root.updateMatrixWorld(true);}}
  if(entry){entry.body.setTranslation(root.position,false);entry.body.setRotation(root.quaternion,false);}
  home=root.position.clone();
  const poses=BOARD_VIEW.desktop.poses;
  for(let n=0;n<ids.length;n++){
   const id=ids[n],i=keepsakes.get(id),h=i?.cardDimensions.height||({paper:.525,postcard:.34,ticket:.243,recipe:.25})[id],s=slots[n],z=poses[n][2]??.020;
   s.position=[poses[n][0],poses[n][1],z];s.pivot=[0,h/2-.018,0];
   if(i?.state.flipped)s.quaternion=[0,1,0,0];else s.quaternion=[0,0,0,1];
   const pin=art.pin(id,[poses[n][0],poses[n][1]+h/2-.018,z-.003],{paper:0x97382c,postcard:0xddd3b5,ticket:0x253d4e,recipe:0x3f7a3a}[id]);pin.visible=!!i?.worldEntry?.support;
  }
  supports.update('pinboard');updateUI();picture.draw(true);homeRect={...picture.rect};applyArrival();invalidate();
 }
 // Arrival (e1111-37): slide the picture in from the right; the body waits at home, disabled, until it lands.
 function applyArrival(plan=arrival){
  if(!root||!home||!plan)return;
  const s=stage.toScreen(home),off=(1-plan.u)*(stage.width-homeRect.x+40);
  root.position.copy(home);if(off||plan.dy){const hit=stage.ray(s.x+off,s.y+plan.dy).intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(stage.camera.getWorldDirection(new T.Vector3()),home),new T.Vector3());if(hit)root.position.copy(hit);}
  root.updateMatrixWorld(true);const plane=picture?.card.children[0];if(plane)plane.material.opacity=plan.opacity;picture?.draw(true);
 }
 function land(){arrival=null;root.position.copy(home);root.updateMatrixWorld(true);if(entry){entry.body.setTranslation(home,false);entry.body.setEnabled(true);}supports.update('pinboard');updateUI();for(const id of ids)arrive(keepsakes.get(id));invalidate();}
 async function ensure(){
  if(supports.count('flat')<2)return null;
  if(!task)task=(async()=>{
   await Promise.all([world.ensure(),stage.ensureEnv(),document.fonts.ready]);
   root=new T.Group();root.userData.visual=new T.Group();stage.scene.add(root);dimensions();
   art=boardArt(T,width,height);root.userData.visual.add(art.group);vertices.push(...art.vertices);
   picture=createMeshPicture(site,root,root.userData.visual,vertices);layout();
   entry=await world.add({id:'furniture-pinboard',object:root,shapes:[{half:[width/2,height/2,.018]}],fixed:true,sleeping:true,presentation:picture});
   // A drop anywhere over the board pins the card in its own place (playtest 2); src/core/supports.js candidate().
   supports.register({id:'pinboard',kind:'pin',object:root,slots,onChange:updateUI,area:()=>picture&&!arrival?picture.rect:null,shadow:()=>({object:root,parent:art.group,z:.018,invalidate}),
    adopt(e){cardGroups(e,true);const i=keepsakes.get(e.id);if(!i?.picture)return;i.picture.attach(art.group,root,invalidate);i.resting=true;keepsakes.saveWorld(i);},
    release(e){cardGroups(e,false);const i=keepsakes.get(e.id);if(!i)return;i.stored=false;i.object.visible=true;i.cardArt.visible=true;i.picture.detach();invalidate();}
   });
   last='';layout();
   if(arrival){entry.body.setEnabled(false);arrivals.begin(arrival,{apply:applyArrival,land});}
   for(const id of ids)arrive(keepsakes.get(id));
   return api;
  })();return task;
 }
 // Nothing goes straight onto the board (playtest 3, Aaron: "they should always be droped for the player to put on the
 // pinboard"): a new card lands on the floor, and the board arriving pins nothing. A card the player pinned stays
 // pinned through a reload (its saved support, src/core/world.js restore).
 function arrive(i){if(!i?.worldEntry)return;updateUI();}
 function pin(id,animate=true){const i=keepsakes.get(id);if(!i?.worldEntry||!root||arrival)return false;select(id);return supports.mount(i.worldEntry,'pinboard',id,{animate});}
 function flip(i){i.setState({flipped:!i.state.flipped});const s=slots.find(s=>s.id===i.id);s.quaternion=i.state.flipped?[0,1,0,0]:[0,0,0,1];supports.update('pinboard');invalidate();}
 supports.onDiscover((id,category)=>{if(category!=='flat')return;if(!task&&!arrival)arrival=arrivals.unlock('pinboard');ensure();});stage.onResize.push(layout);
 const api={ensure,arrive,pin,cardGroups,overBoard,select,guide,flip,invalidate,slots,get arriving(){return !!arrival;},get home(){return homeRect;},get root(){return root;},get picture(){return picture;},get entry(){return entry;},get art(){return art;},get selected(){return selected;},get ready(){return !!entry;},get task(){return task;}};
 return api;
}
