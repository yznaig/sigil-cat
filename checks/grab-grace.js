// Grab lane (2026-11-13). Aaron: "mobile users should get a little bit more grace with grabbing items, some extra grab
// area perhaps". A finger press a few px outside an item takes it (a drag lifts it, a tap does what a tap does); the same
// press with a mouse does not (it starts a sigil stroke, as before); a press on him stays his; open air still draws;
// past the reach (src/core/input.js GRACE.px) it is air again. Run with checks/lib.js, phone (touch) and desktop (mouse).
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE,G=(await import(new URL('src/core/input.js',document.baseURI).href)).GRACE;
const OUT=8;                                                      // "a few px outside"
// The fixture: an egg on the floor, the postcard pinned, the tin on the shelf, the party hat on the rack.
for(const id of ['egg','postcard','paper','tin','top'])keepsakes.give(id);
await E.hat.wear('party',{gift:true});await until(()=>site.rack.hats.get('party')?.worldReady,15000);await E.hat.wear(null);
await Promise.all(['egg','postcard','paper','tin','top'].map(id=>keepsakes.get(id).worldTask));await site.pinboard.task;await site.shelf.task;
await until(()=>!site.pinboard.arriving,15000);site.pinboard.pin('postcard',false);S.mount(keepsakes.get('tin').worldEntry,'shelf','tin',{animate:false});
await site.rack.hang('party',false);await until(()=>!S.active&&!W.stats.listening,15000);await sleep(1200);
const entry=id=>keepsakes.get(id).worldEntry;
check('grace fixture: postcard pinned, tin shelved, party hat racked, egg on the floor',entry('postcard').support?.id==='pinboard'&&entry('tin').support?.id==='shelf'&&entry('rack/party').support?.id==='rack'&&!entry('egg').support,
 ['postcard','tin','rack/party','egg'].map(id=>id+':'+(entry(id).support?.id||'floor')).join(' '));
await __shot('grab-grace-fixture');

// What a press at (x, y) meets exactly: the world's pick, him, a whisker, the bird, the rack's post, or another layer.
const post=()=>{const r=site.rack.root;return r?stage.toScreen(r.localToWorld(new T.Vector3(0,.45,0))):null;};
function open(x,y){
 if(x<6||y<stage.insets.top+6||x>stage.width-6||y>stage.height-stage.insets.bottom-6||document.elementFromPoint(x,y)!==canvas)return false;
 if(cat.hitTest(x,y)||E.harp?.whiskerAt(x,y)||E.bird?.hit(x,y))return false;
 const p=post();if(p&&Math.abs(x-p.x)<=18&&y>=p.y-54)return false;
 return !site.worldInput.pick({clientX:x,clientY:y});
}
// A point OUT px (+-1) outside `id`'s picked surface, on open air, with no other item within the reach: the only item
// a finger's grace there could give. The surface is mapped pixel by pixel with the world's own pick.
function nearMiss(id,out=OUT){
 const e=entry(id),b=new T.Box3().setFromObject(e.object),v=new T.Vector3();let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 for(let k=0;k<8;k++){v.set(k&1?b.max.x:b.min.x,k&2?b.max.y:b.min.y,k&4?b.max.z:b.min.z);const p=stage.toScreen(v);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
 const pad=out+G.px+6;x0=Math.max(0,Math.floor(x0-pad));y0=Math.max(0,Math.floor(y0-pad));x1=Math.min(stage.width,Math.ceil(x1+pad));y1=Math.min(stage.height,Math.ceil(y1+pad));
 const mine=[],other=[];
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const h=site.worldInput.pick({clientX:x,clientY:y});if(h)(h.entry===e?mine:other).push([x,y]);}
 const dist=(list,x,y)=>{let d=1e9;for(const [a,c] of list)d=Math.min(d,Math.hypot(a-x,c-y));return d;};
 const list=[];
 for(let y=y0;y<=y1;y+=2)for(let x=x0;x<=x1;x+=2){
  const d=dist(mine,x,y);if(Math.abs(d-out)>1||!open(x,y))continue;
  if(dist(other,x,y)<=G.px+4||[...keepsakes.live.values()].some(k=>!k.physical&&!k.def.inert&&k.hits(x,y)))continue;
  list.push({x,y,d:+d.toFixed(1)});
 }
 list.sort((a,b)=>Math.abs(a.y-(y0+y1)/2)-Math.abs(b.y-(y0+y1)/2));   // beside it rather than above or below
 return {p:list[0]||null,pixels:mine.length};
}
// One press: down, an optional drag (30 px, in steps), up. Reports what took it.
async function press(p,{moveTo=null,cancel=false}={}){
 const id=++pointerIds,g0=input.graced;fire('pointerdown',p.x,p.y,id);await sleep(30);
 const r={graced:input.graced>g0,grace:input.lastGrace,drawing:site.ink.drawing,cat:cat.pressing,heldDown:W.held?.entry?.id||null};
 if(moveTo){for(let n=1;n<=8;n++){fire('pointermove',p.x+(moveTo.x-p.x)*n/8,p.y+(moveTo.y-p.y)*n/8,id);await sleep(25);}r.held=W.held?.entry?.id||null;}
 const at=moveTo||p;fire(cancel?'pointercancel':'pointerup',at.x,at.y,id,0);await sleep(60);
 return r;
}
const show=(o)=>JSON.stringify(o);
const settle=async()=>{await until(()=>!S.active&&!W.held&&!W.stats.listening,8000);await sleep(400);};

// 1. Drags from a near miss: the egg (small, on the floor), the pinned postcard, the hat on the rack, the tin on the shelf.
for(const id of ['egg','postcard','rack/party','tin']){
 const {p,pixels}=nearMiss(id);
 if(!p){check(`grace ${id}: a press ${OUT} px outside`,false,`no open point ${OUT} px outside (${pixels} px of it picked)`);continue;}
 const back=entry(id).support?{...p}:null,r=await press(p,{moveTo:{x:p.x+(p.x<stage.width/2?30:-30),y:p.y-24}});
 if(MOBILE)check(`grace touch ${id}: a press ${OUT} px outside its edge lifts it`,r.graced&&r.held===id&&!r.drawing&&!r.cat&&Math.hypot(r.grace.dx,r.grace.dy)<=G.px,show({p,...r}));
 else check(`grace mouse ${id}: the same press ${OUT} px outside does not take it; it starts a sigil stroke`,!r.graced&&!r.held&&r.drawing,show({p,...r}));
 await settle();
 // put it back where the fixture had it
 if(id==='postcard'&&entry(id).support?.id!=='pinboard')site.pinboard.pin('postcard',false);
 if(id==='tin'&&entry(id).support?.id!=='shelf')S.mount(entry('tin'),'shelf','tin',{animate:false});
 if(id==='rack/party'&&entry(id).support?.id!=='rack')await site.rack.hang('party',false);
 await settle();
}
await __shot('grab-grace-after-drags');

// 2. A tap from a near miss does what a tap on it does: the pinned postcard flips.
{
 const {p}=nearMiss('postcard');const before=!!keepsakes.get('postcard').state.flipped;
 if(!p)check('grace postcard tap',false,'no open point');
 else{const r=await press(p);await sleep(300);const after=!!keepsakes.get('postcard').state.flipped;
  if(MOBILE)check(`grace touch postcard: a tap ${OUT} px outside the pinned card flips it, like a tap on it`,r.graced&&after!==before,show({p,...r,before,after}));
  else check(`grace mouse postcard: the same tap outside leaves it as it was`,!r.graced&&after===before,show({p,...r,before,after}));
  if(after!==before){await sleep(900);await press(spotOn('postcard')||p);}   // flip it back (a tap on it)
  await settle();}
}
function spotOn(id){const e=entry(id),r=keepsakes.get(id).picture?.rect;if(!r)return null;for(let y=r.y+r.h/2,dy=0;dy<r.h/2;dy+=2)for(const yy of [y-dy,y+dy])for(let x=r.x+2;x<r.x+r.w-2;x+=2)if(site.worldInput.pick({clientX:x,clientY:yy})?.entry===e)return {x,y:yy};return null;}

// 3. A press on him, with an item within the reach, is his: he turns, nothing is lifted, no grace is used.
{
 // set the egg down against his side first (carried by the world's own hand), so an item lies within reach of his edge
 {const m=catMid();let y=m.y+60,x=m.x;while(cat.hitTest(x+2,y)&&x<stage.width)x+=2;
  const e=entry('egg'),grip=e.object.getWorldPosition(new T.Vector3());W.grab(e,grip);
  const to=stage.onFloor(x+14,y).setY(grip.y);for(let n=1;n<=20;n++){W.move(grip.clone().lerp(to,n/20));await sleep(30);}W.release();await settle();}
 const m=catMid();let best=null;
 for(let y=m.y-160;y<m.y+160;y+=3)for(let x=m.x-160;x<m.x+160;x+=3){
  if(!cat.hitTest(x,y)||E.harp?.whiskerAt(x,y)||site.worldInput.pick({clientX:x,clientY:y})||document.elementFromPoint(x,y)!==canvas)continue;
  let d=1e9,near=null;for(let a=0;a<24&&d>4;a++)for(let rr=2;rr<=G.px-2;rr+=2){const h=site.worldInput.pick({clientX:x+rr*Math.cos(a/24*2*Math.PI),clientY:y+rr*Math.sin(a/24*2*Math.PI)});if(h){if(rr<d){d=rr;near=h.entry.id;}break;}}
  if(d<=G.px-2&&(!best||d<best.d))best={x,y,d,near};
 }
 if(!best){
  check('grace near him: an item within reach of his edge',false,'no point on him with an item within '+G.px+' px');
 }else{
  const yaw0=cat.yaw,r=await press(best,{moveTo:{x:best.x+60,y:best.y}});await sleep(200);
  check(`grace ${MOBILE?'touch':'mouse'}: a press on him ${best.d} px from an item (${best.near}) still turns him`,!r.graced&&r.cat&&!r.held&&!r.heldDown&&!r.drawing,show({best,...r,turned:+(cat.yaw-yaw0).toFixed(3)}));
  await __shot('grab-grace-by-him');await settle();
 }
}

// 4. Open air far from everything still draws a sigil; so does a press just past the reach of an item.
{
 let far=null;
 for(let y=stage.insets.top+20;y<stage.height-stage.insets.bottom-20&&!far;y+=10)for(let x=20;x<stage.width-20&&!far;x+=10){
  if(!open(x,y)||site.worldInput.near(x,y,60)||[...keepsakes.live.values()].some(k=>!k.def.inert&&k.hits(x,y)))continue;far={x,y};
 }
 if(!far)check('grace open air',false,'no open air found');
 else{const r=await press(far,{moveTo:{x:far.x+20,y:far.y+10}});check(`grace ${MOBILE?'touch':'mouse'}: a press on open air starts a sigil stroke`,!r.graced&&r.drawing&&!r.held,show({far,...r}));}
 await settle();
 const {p}=nearMiss('egg',G.px+6);
 if(!p)check('grace past the reach',false,'no open point '+(G.px+6)+' px outside the egg');
 else{const r=await press(p);check(`grace ${MOBILE?'touch':'mouse'}: ${G.px+6} px outside the egg (past the ${G.px} px reach) is air: a sigil stroke`,!r.graced&&r.drawing&&!r.heldDown,show({p,...r}));}
 await settle();
}

// 5. The box keeps its own press (a tap opens it): a finger's near miss is a tap on the box, not a generic lift.
{
 const run=site.cast('square'),box=keepsakes.get('box');await box.worldTask;await run;await until(()=>!E.box.busy&&box.worldEntry.body.isSleeping(),15000);await sleep(400);
 const {p}=nearMiss('box'),open0=!!E.box.recipe.state.open;
 if(!p)check('grace box tap',false,'no open point');
 else{const r=await press(p);await until(()=>!E.box.lidMoving,4000);const open1=!!E.box.recipe.state.open;
  if(MOBILE)check(`grace touch box: a tap ${OUT} px outside the box opens it, like a tap on it`,r.graced&&open1!==open0&&!r.heldDown,show({p,...r,open0,open1}));
  else check('grace mouse box: the same tap outside leaves it shut',!r.graced&&open1===open0,show({p,...r,open0,open1}));}
}
await __shot('grab-grace-end');
