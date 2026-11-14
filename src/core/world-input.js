// Visible art wins. A supported tap keeps its slot; an actual lift releases it once.
import {css} from './util.js';
css('world-grip',`.world-grip{position:fixed;z-index:7;left:50%;transform:translateX(-50%);display:flex;flex-wrap:wrap;justify-content:center;gap:4px;width:max-content;max-width:96vw;background:#f7f2e9ed;border:1px solid #b8aa97;border-radius:8px;padding:5px}.world-grip button{min-width:44px;min-height:44px;font:15px system-ui;padding:6px 9px;background:#fffaf1;border:1px solid #ab9a86;border-radius:4px;color:#30271f}
.support-preview{position:fixed;pointer-events:none;z-index:6;border:2px dashed #648268;border-radius:8px;background:#d9ead02b}`);
// A still press held this long on a body with a hold action (a card: read it up close) is a hold, not a tap.
export const HOLD_MS=520;
// The mouse wheel while holding (e1111-58, notes 3 and 4): scrolling down brings the item nearer. One event moves the
// grip at most `step` along the view; the hand (world.js HOLD) then carries the body there at a bounded speed.
export const WHEEL={perPixel:.0008,step:.06};
// Nearer/Deeper exist for touch only (e1111-58, note 6): a mouse has its wheel.
const coarse=()=>matchMedia('(pointer: coarse)').matches;
export function createWorldInput(site) {
 const {world,stage,input,THREE:T}=site,ray=new T.Raycaster(),plane=new T.Plane();let keyboard=false,bar=null,pointer=null,highlight=null;
 // A body behind the cat is hidden by him where his own body (its collider) covers it.
 function behindCat(entry,hit){
  const cat=world.cat,c=site.cat;if(entry.support||!cat?.body||!c||c.hidden||!c.sprite?.visible)return false;
  cat.update(true);if(!cat.enabled)return false;
  const R=world.rapier,r=new R.Ray(ray.ray.origin,ray.ray.direction);
  for(let i=0;i<cat.body.numColliders();i++){const toi=cat.body.collider(i).castRay(r,hit.distance,true);if(toi>=0&&toi<hit.distance)return true;}
  return false;
 }
 // His whiskers are drawn over everything behind him, past his outline too: a press on a whisker over an item deeper
 // than his middle is the whisker's (the harp, src/gags/harp.js), as it looks (fix round B, playtest-2: the box flung
 // home could sit under all three left whiskers, where the tune now lives, and take every pluck).
 const fwd=new T.Vector3(),mid=new T.Vector3();
 function underWhisker(entry,e){
  const c=world.cat?.body;if(!c||!site.eggs?.harp?.whiskerAt?.(e.clientX,e.clientY))return false;
  stage.camera.getWorldDirection(fwd);const depth=(v)=>fwd.dot(mid.copy(v).sub(stage.camera.position));
  return depth(entry.object.getWorldPosition(new T.Vector3()))>depth(c.translation());
 }
 function pick(e){
  site.supports.refreshAttachments();
  // DOM art is painted above the GL canvas until its owning unit migrates it.
  if([...site.keepsakes.live.values()].some(i=>!i.physical&&!i.object&&!i.def.inert&&i.el.parentElement?.id==='front'&&i.hits(e.clientX,e.clientY)))return null;
  ray.setFromCamera(new T.Vector2(e.clientX/stage.width*2-1,1-e.clientY/stage.height*2),stage.camera);
  const roots=[...world.entries.values()].filter(i=>!i.fixed&&i.canGrab!==false&&i.object.visible&&!i.object.userData.collectionHidden&&!i.timer);
  const hits=ray.intersectObjects(roots.map(i=>i.object),true).map(hit=>({hit,entry:roots.find(i=>{for(let o=hit.object;o;o=o.parent)if(o===i.object)return true;return false;})})).filter(({hit,entry})=>entry.visibleHit?.(hit.point)!==false&&!behindCat(entry,hit)&&!underWhisker(entry,e));
  // The nearest surface wins: pictures are composited by depth (world-presentation.js, playtest-2), so what is seen at a
  // pixel is what the ray meets first (an egg in the pail is picked through the opening, the pail through its wall).
  hits.sort((a,b)=>a.hit.distance-b.hit.distance||(b.entry.object.userData.pictureOrder||0)-(a.entry.object.userData.pictureOrder||0));
  return hits.length?{entry:hits[0].entry,point:hits[0].hit.point}:null;
 }
 function clearHighlight(){highlight?.remove();highlight=null;}
 function clean(){bar?.remove();bar=null;keyboard=false;pointer=null;clearHighlight();}
 function depth(delta){if(!world.held)return;const d=stage.camera.getWorldDirection(new T.Vector3()).multiplyScalar(delta);world.move(world.held.target.clone().add(d));plane.translate(d);}
 // Positive: deeper. Lines and pages are turned into pixels first; one event never moves more than WHEEL.step.
 function wheelDepth(e){const px=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?stage.height:1);return Math.max(-WHEEL.step,Math.min(WHEEL.step,-px*WHEEL.perPixel));}
 // The touch depth bar, or null on a mouse. onDepth receives -.08 (nearer) or +.08 (deeper).
 function gripBar(onDepth,label='Held object placement'){
  if(!coarse())return null;
  const el=document.createElement('div');el.className='world-grip';el.setAttribute('aria-label',label);el.style.bottom=(stage.insets.bottom+10)+'px';
  for(const [text,d]of [['Nearer',-.08],['Deeper',.08]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>onDepth(d);el.appendChild(b);}
  document.body.appendChild(el);return el;
 }
 function toolbar(){if(!bar)bar=gripBar(depth);}
 // Snapping by screen position (e1111-58, note 7): while a pointer holds an item over a compatible slot's footprint,
 // the footprint is outlined; the shelf draws its own "Release to place".
 function showHighlight(entry){
  const c=site.supports.candidate(entry,pointer);
  // (the shelf's hooks too: src/world/shelf.js outlines the shelf and its hooks itself; furniture lane, playtest 2)
  if(!c||!c.rect||c.id==='shelf'||c.id==='shelf-hooks'){clearHighlight();return;}
  highlight??=document.body.appendChild(Object.assign(document.createElement('div'),{className:'support-preview'}));
  Object.assign(highlight.style,{left:c.rect.x+'px',top:c.rect.y+'px',width:c.rect.w+'px',height:c.rect.h+'px'});highlight.dataset.support=c.id;highlight.dataset.slot=c.name;
 }
 input.claim(95,e=>{
  const hit=pick(e);if(!hit)return null;clean();
  const start={x:e.clientX,y:e.clientY,t:performance.now()};let moved=false,grabbed=false;
  plane.setFromNormalAndCoplanarPoint(stage.camera.getWorldDirection(new T.Vector3()),hit.point);
  const begin=()=>{world.grab(hit.entry,hit.point);grabbed=true;const inst=site.keepsakes.get(hit.entry.id);if(inst)inst.autoHome=false;};
  if(!hit.entry.support)begin();
  return {
   move(ev){
    if(!moved&&Math.hypot(ev.clientX-start.x,ev.clientY-start.y)<8)return;
    const first=!moved;moved=true;if(!grabbed)begin();toolbar();pointer={entry:hit.entry,x:ev.clientX,y:ev.clientY};
    // text lane (playtest-2): a lift that moves tells the page once, for the first-pickup tip (src/ui/hush.js)
    if(first)dispatchEvent(new CustomEvent('sigilcat:pickup',{detail:{id:hit.entry.id,pointerType:ev.pointerType}}));
    ray.setFromCamera(new T.Vector2(ev.clientX/stage.width*2-1,1-ev.clientY/stage.height*2),stage.camera);
    const p=ray.ray.intersectPlane(plane,new T.Vector3());if(p)world.move(p);hit.entry.dragging?.(ev);
    if(world.held?.entry===hit.entry)showHighlight(hit.entry);
   },
   end(ev){
    if(grabbed)world.release();clean();if(ev.type!=='pointerup')return;
    if(moved){if(!hit.entry.dropped?.(ev))site.supports.offer(hit.entry,{x:ev.clientX,y:ev.clientY});}
    else if(hit.entry.hold&&performance.now()-start.t>=HOLD_MS)hit.entry.hold(ev);else hit.entry.tap?.(ev);
   }
  };
 });
 // Keyboard lifting keeps working from the keepsake keys (Enter/arrows, Shift+arrows for depth); it shows no buttons.
 function keyboardLift(entry){
  if(!entry||input.locked||entry.fixed||entry.canGrab===false||entry.object.userData.collectionHidden)return false;world.release();clean();keyboard=true;
  site.supports.refreshAttachments();
  const point=entry.object.localToWorld(new T.Vector3(0,entry.gripHeight||0,0));world.grab(entry,point);
  plane.setFromNormalAndCoplanarPoint(stage.camera.getWorldDirection(new T.Vector3()),point);toolbar();return true;
 }
 function keyboardMove(entry,key,shift=false){
  if(!entry||input.locked)return;if(world.held?.entry!==entry)keyboardLift(entry);
  if(!world.held)return;
  const delta={ArrowLeft:[-.06,0,0],ArrowRight:[.06,0,0],ArrowUp:[0,.06,0],ArrowDown:[0,-.06,0]}[key];if(!delta)return;
  if(shift&&(key==='ArrowUp'||key==='ArrowDown')){depth(key==='ArrowUp'?.06:-.06);return;}
  const v=new T.Vector3(...delta).applyQuaternion(stage.camera.quaternion);world.move(world.held.target.clone().add(v));
 }
 function keyboardPlace(){const e=world.held?.entry;world.release();clean();if(e)site.supports.offer(e);}
 function cancel(){world.release();clean();}
 stage.canvas.addEventListener('wheel',e=>{if(!world.held)return;e.preventDefault();depth(wheelDepth(e));},{passive:false});
 input.onEscape.push(cancel);input.onLock.push(cancel);addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});addEventListener('blur',cancel);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 // A nearby support may guide depth while preserving the pointer's drag plane.
 // Later pointer moves must not restore the depth from the original floor grab.
 return {pick,keyboardLift,keyboardMove,keyboardPlace,cancel,guideDepth:depth,wheelDepth,gripBar,
  // The page position of the pointer holding this entry, or null (keyboard, or not held).
  pointerOf(entry){return pointer&&pointer.entry===entry&&world.held?.entry===entry?{x:pointer.x,y:pointer.y}:null;},
  get highlight(){return highlight;},get bar(){return bar;},get keyboard(){return keyboard;}};
}
