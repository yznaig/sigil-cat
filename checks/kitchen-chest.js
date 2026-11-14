// Kitchen lane (e1111-61): the baking box as a Minecraft chest, played with real pointer input on the box and on
// the chest screen (mouse on desktop, touch on a phone). Then the reload check (kitchen-chest-reload.js).
cat.auto=false;
const C=E.box.recipe,W=site.world,T=site.THREE,S=C.screen;
const hitOn=i=>{const b=i.picture.rect;for(let y=Math.max(b.y+4,stage.insets.top);y<Math.min(b.y+b.h-4,stage.height-stage.insets.bottom);y+=3)for(let x=Math.max(4,b.x+4);x<Math.min(stage.width-4,b.x+b.w-4);x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};
const mid=r=>({x:r.x+r.width/2,y:r.y+r.height/2});
const slot=(kind,i)=>mid(S.rect(kind,i));
const invSlot=id=>C.state.inv[id];
const chestIds=()=>C.state.chest.map(e=>e?.id||null);
const rest=()=>until(()=>!W.stats.listening,15000);
const heard=name=>C.stats.sounds.some(([n,ok])=>n===name&&ok);
async function dragSlot(from,to){const a=slot(...from),b=slot(...to);await __pointer([a,{x:(a.x+b.x)/2,y:(a.y+b.y)/2-10},b]);await sleep(120);}
async function tapAt(p){await __pointer([p]);await sleep(120);}

// ---- set the kitchen up: flour, a full pail, a loose pat, the bird's egg, a tin and the box ----
for(const k of ['bread','cup']){C.source(k);C.source(k);}
const box=keepsakes.give('box');await box.worldTask;C.state.intro=true;
for(const id of ['flour','bucket'])await keepsakes.get(id).worldTask;
C.state.visit={id:9,milked:false,x:-9,target:-9,z:0,scale:.3,time:0,walkTime:0,phase:'leave'};C.fillMilk();C.state.visit=null;C.save(true);
await cat.ensureButter();cat.setButter(true);const pat=keepsakes.get('pat');await pat.worldTask;
pat.worldEntry.grabbed?.();pat.moveWorld({x:stage.width*.3,y:site.worldLayout.floorY()+20});
await C.dropEgg({x:stage.width*.62,y:stage.height*.3});const tin=keepsakes.give('tin');await tin.worldTask;
await rest();await sleep(300);
check('chest box is closed by default',C.state.open===false&&box.hinge.rotation.x===0&&!S.isOpen);

// ---- a short click on the box opens it: lid, sound, the chest screen ----
const p=hitOn(box);if(p)await tap(p.x,p.y);
check('chest short click opens the chest screen',!!p&&await until(()=>S.isOpen,4000)&&C.state.open,JSON.stringify(p));
await until(()=>!E.box.lidMoving,3000);
check('chest lid opens and the opening half plays',Math.abs(box.hinge.rotation.x+Math.PI)<.01&&heard('chest-open'),JSON.stringify(C.stats.sounds));
const live=[...keepsakes.live.values()].filter(C.chestable).map(i=>i.id).sort(),shown=C.inventory().filter(Boolean).map(i=>i.id).sort();
check('chest inventory mirrors every movable room item, not fixed ones',JSON.stringify(live)===JSON.stringify(shown)&&!shown.includes('box')&&['flour','bucket','pat','egg','tin'].every(id=>shown.includes(id)),JSON.stringify(shown));
await sleep(200);
const imgs=[...S.root.querySelectorAll('.chest-slot[data-kind=inv] img:not([hidden])')];
check('chest every item shows a picture of its own model',imgs.length===shown.length&&imgs.every(i=>i.src.startsWith('data:image/png')&&i.naturalWidth>=64),`${imgs.length} pictures for ${shown.length}`);
const panel=S.root.querySelector('.chest-panel').getBoundingClientRect();
check('chest screen fits the viewport at a whole-pixel scale',panel.x>=8&&panel.right<=innerWidth-8&&panel.y>=0&&panel.bottom<=innerHeight&&(MOBILE?S.scale===2:S.scale===3),JSON.stringify({x:panel.x,w:panel.width,h:panel.height,scale:S.scale}));
await __shot('kitchen-chest-open');

// ---- hover shows the name, as the game's tooltip ----
{const at=slot('inv',invSlot('egg'));S.root.dispatchEvent(new PointerEvent('pointermove',{clientX:at.x+4,clientY:at.y+4,bubbles:true,pointerType:'mouse'}));await sleep(80);
 const tip=S.root.querySelector('.chest-tip');check('chest hover shows the item name tooltip',tip.classList.contains('on')&&tip.width>=20&&getComputedStyle(tip).display!=='none',`${tip.width}x${tip.height}`);
 if(!MOBILE)await __shot('kitchen-chest-tooltip');
 S.root.dispatchEvent(new PointerEvent('pointermove',{clientX:5,clientY:5,bubbles:true,pointerType:'mouse'}));}

// ---- inventory to chest despawns; drag, and click-then-click (tap-then-tap on a phone) ----
await dragSlot(['inv',invSlot('flour')],['chest',0]);
check('chest dragging an item into the chest despawns it from the room',chestIds()[0]==='flour'&&!keepsakes.has('flour')&&!W.entries.has('flour'),JSON.stringify(chestIds()));
{const from=slot('inv',invSlot('egg'));await tapAt(from);const held=S.carried?.item.id;await tapAt(slot('chest',1));
 check('chest pick up and put down by two presses',held==='egg'&&chestIds()[1]==='egg'&&!keepsakes.has('egg'),JSON.stringify({held,chest:chestIds()}));}
{const before=invSlot('tin'),target=before===0?1:0;await dragSlot(['inv',before],['inv',target]);
 check('chest items can be rearranged within the inventory',invSlot('tin')===target&&keepsakes.has('tin'),JSON.stringify(C.state.inv));}
await dragSlot(['inv',invSlot('pat')],['chest',2]);await dragSlot(['inv',invSlot('bucket')],['chest',3]);
await dragSlot(['inv',invSlot('tin')],['chest',4]);
check('chest four ingredients and the tin are in the chest',JSON.stringify(chestIds().slice(0,5))===JSON.stringify(['flour','egg','pat','bucket','tin'])&&C.insideAll(),JSON.stringify(chestIds()));
await __shot('kitchen-chest-filled');

// ---- chest to inventory respawns it like any arrival: on a clear floor spot in view, never in or against the box ----
// (playtest-3, physics lane item 2: "taking something out of the box should just spawn it like regular (somewhere on the
// screen) instead of spawning it 'out' the box, things get stuck in the box". It used to be dropped in front of the box.)
await dragSlot(['chest',4],['inv',35]);await keepsakes.get('tin')?.worldTask;await sleep(200);
{const t=keepsakes.get('tin');await until(()=>t?.worldEntry?.body.isSleeping(),5000);
 const r=t?.picture?.rect,bx=box.picture.rect,o=r&&Math.max(0,Math.min(r.x+r.w,bx.x+bx.w)-Math.max(r.x,bx.x))*Math.max(0,Math.min(r.y+r.h,bx.y+bx.h)-Math.max(r.y,bx.y));
 const inView=r&&r.x>=0&&r.x+r.w<=stage.width&&r.y+r.h<=stage.height-stage.insets.bottom;
 check('chest dragging an item out respawns it on a clear floor spot in view, clear of the box',t?.worldReady&&invSlot('tin')===35&&!chestIds().includes('tin')&&inView&&o<.1*r.w*r.h,JSON.stringify({tin:r,box:bx,overlap:o}));}

// ---- Escape closes: the closing half plays and the lid shuts ----
await __key('Escape');
check('chest Escape closes the screen',await until(()=>!S.isOpen,2000));
await until(()=>!E.box.lidMoving&&box.hinge.rotation.x===0,3000);
check('chest closing plays the closing half and shuts the lid',heard('chest-close')&&box.hinge.rotation.x===0&&!C.state.open);
await rest();

// ---- bake: hold the box and shake it ----
{const q=hitOn(box),id=++pointerIds;let shaken=false;
 if(q){fire('pointerdown',q.x,q.y,id);await sleep(280);
  for(let n=0;n<22&&C.state.phase==='ingredients';n++){const dx=(n%2?-1:1)*(MOBILE?60:110);fire('pointermove',q.x+dx,q.y-50,id);await sleep(110);}
  // Settle the hand before letting go, as a person setting the box down would.
  fire('pointermove',q.x,q.y-30,id);await sleep(350);fire('pointermove',q.x,q.y-10,id);await sleep(350);
  fire('pointerup',q.x,q.y-10,id,0);shaken=C.state.phase==='baked';}
 if(!shaken)note('chest real shake did not bake; scripted shake used',JSON.stringify({q,shakes:C.shakes}));
 if(!shaken)await C.shakeBox();
 check('chest shaking the closed box with the four bakes once',C.state.phase==='baked'&&C.state.bakes===1&&chestIds().includes('cake')&&!['flour','egg','pat'].some(id=>chestIds().includes(id)||keepsakes.has(id))&&chestIds().includes('bucket')&&!C.state.milkFull,JSON.stringify({phase:C.state.phase,chest:chestIds(),real:shaken}));
 note('chest real pointer shake baked',String(shaken));}
// A hard shake can throw the box off the page; it comes back by itself (5 s), as any item does.
await until(()=>!box.worldEntry.timer&&box.object.visible,9000);await rest();
if(!hitOn(box)){note('chest box ended out of reach after the shake; set down by hand',JSON.stringify(box.picture.rect));box.moveWorld({x:stage.width*.72,y:Math.min(stage.height-stage.insets.bottom-40,site.worldLayout.floorY()+60)});await rest();}

// ---- open again: the cake is there; bring it into the room ----
{const q=hitOn(box);if(q)await tap(q.x,q.y);await until(()=>S.isOpen,4000);await until(()=>!E.box.lidMoving,3000);await sleep(150);
 check('chest the next opening shows the cake',S.isOpen&&C.state.phase==='revealed'&&!!S.root.querySelector(`.chest-slot[data-kind=chest][data-item=cake] img:not([hidden])`));
 await __shot('kitchen-chest-cake');
 const k=chestIds().indexOf('cake');await dragSlot(['chest',k],['inv',27]);await keepsakes.get('cake')?.worldTask;await sleep(150);
 const cake=keepsakes.get('cake');
 check('chest the cake comes out into the room, ready to eat',cake?.worldReady&&cake.worldEntry.canGrab&&!cake.key.hidden&&!chestIds().includes('cake'));
 const out=S.root.querySelector('.chest-panel').getBoundingClientRect();await tapAt({x:Math.max(4,out.x/2),y:Math.max(stage.insets.top+4,out.y/2)});
 check('chest clicking outside closes it',await until(()=>!S.isOpen,2000));}
await rest();await sleep(400);await __shot('kitchen-chest-cake-room');
// Kept for the reload check.
for(const i of keepsakes.live.values())if(i.worldEntry)W.save(i.worldEntry,true);C.save(true);
store.set('kitchenCheck',{chest:chestIds(),inv:C.state.inv,phase:C.state.phase});store.flush();
