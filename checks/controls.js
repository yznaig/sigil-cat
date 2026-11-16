// Controls lane (playtest-4, 2026-11-14). Aaron (on his phone): "The Nearer and Deeper buttons don't work. You should be
// able to hold them to move it nearer or deeper, and they should also show up at the very bottom of the screen" and
// "everything could be a little bit bigger and tighter in on mobile ... the hat rack is covered by the little black
// pill phones have now. Perhaps there could be a zoom slider alongside the sound slider?"
// Run with checks/lib.js; --then checks/controls-reload.js. URL options: ?safe=l,r,t,b sets the screen's safe-area
// insets through Chromium's DevTools protocol (a notch / Dynamic Island), ?zooms=0 skips the zoom sweep.
//  1 (touch) Nearer / Deeper with real touch: one finger holds an item, a second presses the button; at the very bottom,
//    clear of SOUND, ZOOM, the books and the sigil row, inside the safe area; a press moves it at once, holding keeps
//    moving it, letting go stops it; the item stays held; letting the item go takes the buttons and their frame work away.
//  2 the zoom slider beside SOUND: named, keyboard-driven, the device's default; at its least, default and most, all
//    furniture and every keepsake on the page inside the safe sides, none hidden under the page's controls, nothing
//    scooted-for left behind furniture or him; (the reload: the setting survives).
//  3 (?safe) the room inside the safe sides: furniture and keepsakes clear of the inset, him centred in the safe width.
cat.auto=false;const W=site.world,T=site.THREE,q=new URLSearchParams(location.search);
const show=(o)=>JSON.stringify(o);
const R=(r)=>r&&{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.w??r.width),h:Math.round(r.h??r.height)};
const rectOf=(el)=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0?{x:r.left,y:r.top,w:r.width,h:r.height}:null;};
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const SAFE=q.get('safe')?q.get('safe').split(',').map(Number):null;
if(SAFE){const [left,right,top,bottom]=SAFE;const ok=await __safeArea({left,right,top,bottom});dispatchEvent(new Event('resize'));await sleep(600);
 check('controls safe area emulated (DevTools protocol)',ok&&stage.insets.left===left&&stage.insets.right===right,show({ok,insets:stage.insets}));}
const L=()=>stage.insets.left||0,Rt=()=>stage.width-(stage.insets.right||0);
// the page's controls a keepsake must not lie under
const uiRects=()=>['.top .tl','.top .name','#tally','.fs-toggle','#footer .sound','#footer .zoom','#footer .fr > *','#marks > li','#hint']
 .flatMap(s=>[...document.querySelectorAll(s)]).filter(e=>!e.hidden&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).opacity!=='0').map(e=>({el:e.id||e.className?.baseVal||e.className,r:rectOf(e)})).filter(u=>u.r);

// ---- 1. Nearer / Deeper, real touch ----
if(MOBILE){
 const tin=keepsakes.give('tin');await tin.worldTask;await until(()=>!W.stats.listening,10000);await sleep(800);
 for(const id of ['grimoire','achievements'])document.getElementById(id).hidden=false;   // the books shown: the right end's room is the least
 const p=stage.toScreen(tin.worldEntry.object.getWorldPosition(new T.Vector3()));
 const finger={x:p.x,y:p.y,id:1};
 await __touch('touchStart',[finger]);for(let k=1;k<=6;k++){await sleep(30);finger.x+=4;finger.y-=3;await __touch('touchMove',[finger]);}
 await sleep(150);
 const bar=document.querySelector('.world-grip'),[near,deep]=bar?[...bar.querySelectorAll('button')]:[];
 check('controls 1 a finger holding an item shows Nearer and Deeper',W.held?.entry?.id==='tin'&&!!near&&!!deep&&near.textContent==='Nearer'&&deep.textContent==='Deeper',show({held:W.held?.entry?.id,bar:!!bar}));
 if(near&&deep){
  const nb=rectOf(near),db=rectOf(deep),others=uiRects().filter(u=>!/hint/.test(u.el));
  const hits=[nb,db].flatMap((b,i)=>others.filter(u=>overlap(b,u.r)>0).map(u=>(i?'Deeper':'Nearer')+' over '+u.el));
  check('controls 1 at the very bottom: their feet within 8 px of the screen (above its safe bottom), each 44 px tall or more (28 px under the row)',
   ['bottom','under'].includes(bar.dataset.place)&&[nb,db].every(b=>stage.height-(SAFE?.[3]||0)-(b.y+b.h)<=8&&stage.height-(SAFE?.[3]||0)-(b.y+b.h)>=0&&b.h>=(bar.dataset.place==='under'?28:44)),show({place:bar.dataset.place,near:R(nb),deep:R(db),H:stage.height}));
  check('controls 1 clear of SOUND, ZOOM, the grimoire, achievements, the sigils and the safe sides (over the hint line is fine)',
   !hits.length&&[nb,db].every(b=>b.x>=L()&&b.x+b.w<=Rt()),show({hits,near:R(nb),deep:R(db),insets:stage.insets}));
  await __shot('controls-nearer-deeper');
  const fwd=new T.Vector3(),depth=()=>{stage.camera.getWorldDirection(fwd);return W.held?fwd.dot(W.held.target.clone().sub(stage.camera.position)):null;};
  const frames=stage.onFrame.length;
  // press one with a second finger (real touch), hold for `ms`, let go of it (the second finger only), report depths
  // (a new id per press: CDP never lifts one finger of two, so each press is a new second finger)
  let fid=1;
  async function hold(btn,ms){
   const c=rectOf(btn),pt={x:c.x+c.w/2,y:c.y+c.h/2,id:++fid};let pid=null;btn.addEventListener('pointerdown',e=>{pid=e.pointerId;},{once:true});
   const d0=depth();await __touch('touchStart',[finger,pt]);await sleep(60);const dTap=depth();await sleep(ms);const dHeld=depth();const busy=stage.onFrame.length>frames;
   // CDP cannot lift one finger of two, so the second finger's release is the browser's event on the button it is captured to
   btn.dispatchEvent(new PointerEvent('pointerup',{pointerId:pid,bubbles:true,pointerType:'touch'}));
   await sleep(80);const dUp=depth();await sleep(400);const dLater=depth();
   return {pid,d0,dTap,dHeld,dUp,dLater,busy,idle:stage.onFrame.length===frames,held:W.held?.entry?.id};
  }
  const a=await hold(near,900);
  check('controls 1 Nearer: a press moves it nearer at once, holding keeps moving it, letting go stops it; the item stays in hand',
   a.pid!=null&&a.dTap<a.d0-.05&&a.dHeld<a.dTap-.3&&Math.abs(a.dLater-a.dUp)<1e-6&&a.busy&&a.idle&&a.held==='tin',show(a));
  const b=await hold(deep,900);
  check('controls 1 Deeper: the same, away from you',b.dTap>b.d0+.05&&b.dHeld>b.dTap+.3&&Math.abs(b.dLater-b.dUp)<1e-6&&b.busy&&b.idle&&b.held==='tin',show(b));
  const c=await hold(near,0);
  check('controls 1 a quick tap still nudges it one step (.08) and no more',Math.abs((c.d0-c.dLater)-.08)<.02,show(c));
  // held to the near end of the room: it stops there (world.js bound) and the press stops pushing
  const e=await hold(near,4000);
  check('controls 1 held long it stops at the room\'s near end (1.2 from the lens)',Math.abs(e.dHeld-1.2)<.02&&Math.abs(e.dLater-1.2)<.02,show(e));
  await __touch('touchEnd',[]);await sleep(150);
  check('controls 1 letting the item go takes the buttons away and leaves no frame work',!document.querySelector('.world-grip')&&!W.held&&stage.onFrame.length===frames,show({bar:!!document.querySelector('.world-grip'),held:W.held?.entry?.id,frames:[frames,stage.onFrame.length]}));
 }
}

// ---- 2. the zoom ----
const Z=site.zoom,{ZOOM}=await import(new URL('src/ui/zoom.js',document.baseURI).href);
const zin=document.querySelector('#footer .zoom input#zoom'),snd=document.querySelector('#footer .sound');
{const zr=rectOf(document.querySelector('#footer .zoom')),sr=rectOf(snd);
 const beside=zr&&sr&&(Math.abs(zr.y-sr.y)<4&&zr.x>=sr.x+sr.w||Math.abs(zr.x-sr.x)<4&&zr.y+zr.h<=sr.y);
 check('controls 2 a ZOOM slider beside SOUND (desktop: after it; a phone: over it), named for assistive tech, the device\'s default',
  !!zin&&zin.getAttribute('aria-label')==='Zoom'&&beside&&Math.abs(stage.zoom-(MOBILE?ZOOM.phone:ZOOM.other))<1e-6&&Number(zin.value)===Math.round(stage.zoom*100),
  show({zoom:stage.zoom,value:zin?.value,zoomPill:R(zr),sound:R(sr)}));}
{const before=stage.zoom;zin.focus();await __key('ArrowRight');await sleep(ZOOM.settle+250);const up=stage.zoom;await __key('ArrowLeft');await sleep(ZOOM.settle+250);
 check('controls 2 the keyboard moves it (arrows), and the room follows',Math.abs(up-before-ZOOM.step)<1e-6&&Math.abs(stage.zoom-before)<1e-6&&document.activeElement===zin,show({before,up,after:stage.zoom}));
 zin.blur();}
if(q.get('zooms')!=='0'){
 const {collectFinal}=await import('/checks/world-final-collection.mjs');
 await collectFinal(site,{cake:true});
 await until(()=>!W.stats.listening&&!site.supports.listening,20000);await sleep(1500);
 const {SCOOT}=await import('/src/core/world-occluders.js'),lostWait=(SCOOT.patience+4)*1000;
 for(const [name,z] of [['least',ZOOM.min],['default',MOBILE?ZOOM.phone:ZOOM.other],['most',ZOOM.max]]){
  Z.set(z);await sleep(400);
  // the re-plan settles (scoots, supports), then the room is still
  await until(()=>!W.stats.listening&&!site.supports.listening&&![...W.entries.values()].some(e=>e.scoot),20000);await sleep(1200);
  // (not the grease: a streak on the glass, page-sized by design)
  const items=[...keepsakes.live.values()].filter(i=>!i.stored&&i.box&&i.box.w>0&&!i.def.sky&&i.id!=='grease');
  const furn=[['shelf',site.shelf?.picture?.rect],['pinboard',site.pinboard?.picture?.rect],['rack',site.rack?.picture?.rect],['stand',site.stand?.picture?.rect]].filter(([,r])=>r&&r.w>0);
  // (a floor decal that can't be picked up, the puddle, may reach below the footer's line as it always has: on the page)
  const off=[...furn.map(([id,r])=>({id,r})),...items.map(i=>({id:i.id,r:i.box,inert:i.def.inert}))].filter(({r,inert})=>r.x<L()-1||r.x+r.w>Rt()+1||r.y<-1||r.y+r.h>(inert?stage.height:stage.height-stage.insets.bottom+30));
  const U=uiRects(),under=[...furn.map(([id,r])=>({id,r,f:1})),...items.map(i=>({id:i.id,r:i.box,f:0}))].map(({id,r,f})=>({id,f,share:U.reduce((n,u)=>n+overlap(r,u.r),0)/(r.w*r.h),by:U.filter(u=>overlap(r,u.r)>0).map(u=>u.el)})).filter(o=>o.f?o.share>0:o.share>.15);
  const free=[...W.entries.values()].filter(e=>!e.fixed&&!e.support&&!e.timer&&e.object.visible&&!e.object.userData.collectionHidden&&e.body.isDynamic?.()&&!keepsakes.get(e.id)?.def.sky);
  if(lostWait)await until(()=>!free.some(e=>{const x=site.occluders.exposure(e);return x.points>=3&&x.share<SCOOT.hidden;}),lostWait);
  const lost=free.map(e=>({id:e.id,x:site.occluders.exposure(e)})).filter(o=>o.x.points>=3&&o.x.share<SCOOT.hidden).map(o=>({id:o.id,share:+o.x.share.toFixed(2),by:o.x.by}));
  check(`controls 2 zoom ${name} (${Math.round(z*100)}%): all furniture and every keepsake on the page, inside the safe sides`,Math.abs(stage.zoom-z)<1e-6&&!off.length,show({zoom:stage.zoom,off:off.map(o=>({id:o.id,r:R(o.r)}))}));
  check(`controls 2 zoom ${name}: no furniture under the page's controls, no keepsake more than 15% under them`,!under.length,show(under));
  if(lost.length)note('lost detail',show(lost.map(o=>{const e=W.entries.get(o.id);return {id:o.id,scoot:e.scoot,sleeping:e.body.isSleeping(),pos:e.body.translation(),stats:site.occluders.stats};})));
  check(`controls 2 zoom ${name}: nothing left mostly hidden behind furniture or him (the scoot rule, share >= ${SCOOT.hidden})`,!lost.length,show(lost));
  note(`controls 2 zoom ${name} layout`,show({cat:R(cat.rect),furniture:Object.fromEntries(furn.map(([id,r])=>[id,R(r)]))}));
  await __shot('controls-zoom-'+name);
 }
 Z.set(ZOOM.max);store.flush?.();
}else{Z.set(ZOOM.max);store.flush?.();}

// ---- 3. the safe sides ----
if(SAFE){
 const mid=stage.toScreen(new T.Vector3(0,.5,0)).x,want=L()+(Rt()-L())/2;
 const furn=[['shelf',site.shelf?.picture?.rect],['pinboard',site.pinboard?.picture?.rect],['rack',site.rack?.picture?.rect]].filter(([,r])=>r&&r.w>0);
 check('controls 3 him centred in the safe width; the shelf, rack and board inside the safe sides',Math.abs(mid-want)<2&&furn.every(([,r])=>r.x>=L()&&r.x+r.w<=Rt()),show({mid,want,insets:stage.insets,furniture:Object.fromEntries(furn.map(([id,r])=>[id,R(r)]))}));
}
