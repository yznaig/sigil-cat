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
// Nearer / Deeper held down (controls lane, playtest-4; Aaron: "The Nearer and Deeper buttons don't work. You should be
// able to hold them to move it nearer or deeper, and they should also show up at the very bottom of the screen"). Why
// they did nothing: they acted on `click`, and the bar exists only while a finger holds the item, so the press on them
// is always a second finger; a phone makes no click from a tap made while another finger is down (checked with real
// touch, CDP, at 844x390: pointerdown reached the button, no click ever came). Now a press acts on pointerdown: `tap`
// at once (a quick tap still nudges it as before), then after `delay` s it keeps moving while the finger stays,
// `speed` units/s rising by `ramp` per s to `max` (along the view; world.js bound() keeps it between the lens and the
// back of the room, and a press that has reached that end stops pushing). Per frame only while a button is held.
export const DEPTH_HOLD={tap:.08,delay:.2,speed:.8,ramp:1.4,max:2.2};
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
 // Grace for fingers (grab lane, 2026-11-13; src/core/input.js GRACE): is any grabbable item's screen box within r px of
 // (x, y)? Its bounds' eight corners, projected; over-generous is fine, the probes then ask pick() itself.
 const graceBox=new T.Box3(),graceV=new T.Vector3();
 function grabbable(){return [...world.entries.values()].filter(i=>!i.fixed&&i.canGrab!==false&&i.object.visible&&!i.object.userData.collectionHidden&&!i.timer);}
 function nearEntry(i,x,y,r){
  graceBox.setFromObject(i.object);if(graceBox.isEmpty())return false;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(let k=0;k<8;k++){graceV.set(k&1?graceBox.max.x:graceBox.min.x,k&2?graceBox.max.y:graceBox.min.y,k&4?graceBox.max.z:graceBox.min.z);const p=stage.toScreen(graceV);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
  return x>=x0-r&&x<=x1+r&&y>=y0-r&&y<=y1+r;
 }
 const near=(x,y,r)=>grabbable().some(i=>nearEntry(i,x,y,r));
 function pick(e){
  site.supports.refreshAttachments();
  // DOM art is painted above the GL canvas until its owning unit migrates it.
  if([...site.keepsakes.live.values()].some(i=>!i.physical&&!i.object&&!i.def.inert&&i.el.parentElement?.id==='front'&&i.hits(e.clientX,e.clientY)))return null;
  ray.setFromCamera(new T.Vector2(e.clientX/stage.width*2-1,1-e.clientY/stage.height*2),stage.camera);
  const roots=grabbable();
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
 // The touch depth bar, or null on a mouse. onDepth(delta) moves the held item along the view: negative nearer.
 // Placed at the very bottom of the screen (controls lane): Nearer just left of the row of sigils, Deeper just right of
 // it (44 px tall, over the ends of the hint line), never over SOUND, ZOOM, the grimoire and achievements or the
 // sigils, inside the safe sides and above the safe bottom. No room there (the bird game's button lengthens the row):
 // a 28 px pair side by side under the row, over the hint line ('under'). Neither fits (a narrow window): the tray
 // sits just above the footer as before ('above').
 const viewDepth=()=>world.held?stage.camera.getWorldDirection(new T.Vector3()).dot(world.held.target.clone().sub(stage.camera.position)):null;
 function placeBar(el){
  const [near,deep]=el.children,box=r=>r&&r.width>0?r:null,gap=8,pad=6;
  const marks=[...document.querySelectorAll('#marks > li')].map(li=>box(li.getBoundingClientRect())).filter(Boolean);
  const fl=[...document.querySelectorAll('#footer .fl > *')].map(e=>box(e.getBoundingClientRect())).filter(Boolean);
  const links=[...document.querySelectorAll('#footer .fr > *')].filter(a=>!a.hidden).map(a=>box(a.getBoundingClientRect())).filter(Boolean);
  const L=(stage.insets.left||0)+gap,R=stage.width-(stage.insets.right||0)-gap;
  el.classList.remove('under');el.classList.add('low');for(const b of [near,deep])Object.assign(b.style,{left:'',bottom:'calc(4px + env(safe-area-inset-bottom, 0px))'});
  if(marks.length){
   const nw=near.getBoundingClientRect().width,dw=deep.getBoundingClientRect().width;
   const m0=Math.min(...marks.map(r=>r.left))-pad,m1=Math.max(...marks.map(r=>r.right))+pad,mBottom=Math.max(...marks.map(r=>r.bottom));
   const left=Math.max(L,...fl.map(r=>r.right+gap)),linkL=Math.min(R,...links.map(r=>r.left-gap));
   const nx=m0-gap-nw,dx=m1+gap;
   if(nx>=left&&dx+dw<=linkL){near.style.left=nx+'px';deep.style.left=dx+'px';el.dataset.place='bottom';return;}
   el.classList.add('under');for(const b of [near,deep])b.style.bottom='calc(1px + env(safe-area-inset-bottom, 0px))';
   const w=near.getBoundingClientRect().width+gap+deep.getBoundingClientRect().width,mid=(m0+m1)/2,x=Math.max(left,Math.min(linkL-w,mid-w/2));
   if(x>=left&&x+w<=linkL&&near.getBoundingClientRect().top>=mBottom){near.style.left=x+'px';deep.style.left=(x+w-deep.getBoundingClientRect().width)+'px';el.dataset.place='under';return;}
  }
  // (the old place: a tray centred just above the footer)
  el.classList.remove('low','under');for(const b of [near,deep])Object.assign(b.style,{left:'',bottom:''});el.style.bottom=(stage.insets.bottom+10)+'px';el.dataset.place='above';
 }
 function gripBar(onDepth,label='Held object placement'){
  if(!coarse())return null;
  const el=document.createElement('div');el.className='world-grip';el.setAttribute('aria-label',label);
  const stops=[];
  for(const [text,sign]of [['Nearer',-1],['Deeper',1]]){
   const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.dir=sign<0?'nearer':'deeper';
   let pid=null,t=0,stuck=false,pressed=-1e9;
   // one push along the view; a push that no longer moves it (the room's end) stops this press pushing
   const push=d=>{if(stuck)return;const a=viewDepth();onDepth(d);const z=viewDepth();if(a!=null&&z!=null&&Math.abs(z-a)<1e-6)stuck=true;};
   const step=dt=>{t+=dt;if(t<DEPTH_HOLD.delay||!dt)return;push(sign*Math.min(DEPTH_HOLD.max,DEPTH_HOLD.speed+(t-DEPTH_HOLD.delay)*DEPTH_HOLD.ramp)*dt);};
   const stop=e=>{if(pid===null||e&&e.pointerId!==pid)return;pid=null;b.classList.remove('on');const k=stage.onFrame.indexOf(step);if(k>=0)stage.onFrame.splice(k,1);};
   b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(pid!==null)return;pid=e.pointerId;pressed=performance.now();t=0;stuck=false;
    try{b.setPointerCapture(e.pointerId);}catch{/* synthetic */}b.classList.add('on');push(sign*DEPTH_HOLD.tap);stage.onFrame.push(step);});
   for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,stop);
   // a click with no press before it is the keyboard's (Enter, Space): one step, as before
   b.addEventListener('click',e=>{e.preventDefault();if(performance.now()-pressed<1500)return;push(sign*DEPTH_HOLD.tap);});
   stops.push(()=>stop());el.appendChild(b);
  }
  el.addEventListener('contextmenu',e=>e.preventDefault());   // a long press is a hold, not the browser's menu
  document.body.appendChild(el);placeBar(el);
  const replace=()=>placeBar(el);addEventListener('resize',replace);
  // whoever removes the bar (the item let go, Escape, a lock) also ends a held button
  const remove=el.remove.bind(el);el.remove=()=>{for(const s of stops)s();removeEventListener('resize',replace);remove();};
  return el;
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
 },{near});
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
 return {pick,near,keyboardLift,keyboardMove,keyboardPlace,cancel,guideDepth:depth,wheelDepth,gripBar,
  // The page position of the pointer holding this entry, or null (keyboard, or not held).
  pointerOf(entry){return pointer&&pointer.entry===entry&&world.held?.entry===entry?{x:pointer.x,y:pointer.y}:null;},
  get highlight(){return highlight;},get bar(){return bar;},get keyboard(){return keyboard;}};
}
