// Physics lane, playtest-2 item 5 (Aaron: "I broke the inventory somehow, maybe just stress test the boundaries of the
// inventory system"; his repro: an item moved into the chest and back out fell off the page, vanished, and still
// showed in the inventory). The inventory and the room must always agree: everything listed is in the room (or on
// its way back within RETURN.quick while the screen shows), everything in the chest is out of the room, nothing is
// in both, nothing known is lost, and everything listed can be seen and picked up once it has come to rest.
// Then inventory-stress-reload.js: a reload in the middle of a move.
cat.auto=false;
const C=E.box.recipe,W=site.world,T=site.THREE,S=C.screen;
const {RETURN}=await import('/src/core/world.js'),{SCOOT}=await import('/src/core/world-occluders.js');
const rest=()=>until(()=>!W.stats.listening,15000);
const chestIds=()=>C.state.chest.filter(Boolean).map(e=>e.id);
const invIds=()=>C.inventory().filter(Boolean).map(i=>i.id);
const known=new Set();
function agree(){
 const chest=chestIds(),inv=invIds(),bad=[];
 if(new Set(chest).size!==chest.length)bad.push('the chest holds a duplicate');
 for(const id of chest){if(keepsakes.has(id))bad.push(id+' is in the chest and the room');if(!keepsakes.defs.has(id))bad.push(id+' unknown in the chest');}
 for(const id of inv){const e=keepsakes.get(id)?.worldEntry;if(!e)bad.push(id+' listed without a body');else if(e.timer&&!e.returnNow)bad.push(id+' listed while away');else if(!e.timer&&!e.object.visible&&!e.support)bad.push(id+' listed but hidden');}
 for(const i of keepsakes.live.values())if(C.chestable(i)&&!inv.includes(i.id))bad.push(i.id+' in the room but not listed');
 for(const id of known)if(!chest.includes(id)&&!keepsakes.has(id))bad.push(id+' lost');
 return bad;
}
// Seen and picked: some pixel of its picture on the page picks it (the visible-art rule of world-input.js), or picks
// another loose item lying on it (a pile: lift that one first).
function reach(id){
 const i=keepsakes.get(id),e=i?.worldEntry;if(!e||e.timer||!i.picture)return false;const r=i.picture.rect;let pile=false;
 for(let y=Math.max(r.y+3,stage.insets.top);y<Math.min(r.y+r.h-3,stage.height-stage.insets.bottom);y+=4)for(let x=Math.max(3,r.x+3);x<Math.min(stage.width-3,r.x+r.w-3);x+=4){
  const hit=site.worldInput.pick({clientX:x,clientY:y})?.entry;if(hit===e)return true;if(hit&&known.has(hit.id))pile=true;}
 return pile;
}
const fails={};const fail=(name,what)=>{(fails[name]??=[]).push(what);};
async function verdict(name,ids){
 await rest();await until(()=>[...known].every(id=>!keepsakes.get(id)?.worldEntry?.timer),RETURN.ms+3000);await rest();
 // anything left behind the cat or furniture is slid out once it has rested (world-occluders.js)
 await sleep((SCOOT.settle+SCOOT.every)*1000+300);await until(()=>!site.occluders.scooting&&!W.stats.listening,(SCOOT.patience+4)*1000);
 const bad=agree();for(const id of ids||[])if(keepsakes.has(id)&&!reach(id)){const e=keepsakes.get(id).worldEntry,t=e.body.translation();bad.push(id+' cannot be picked up '+JSON.stringify({rect:keepsakes.get(id).picture?.rect,p:[t.x,t.y,t.z].map(v=>+v.toFixed(2)),support:e.support?.id,sleeping:e.body.isSleeping(),visible:e.object.visible}));}
 check('inventory '+name,!bad.length&&!(fails[name]||[]).length,JSON.stringify({bad,also:fails[name]||[]}));
}
const slotOf=id=>C.inventory().findIndex(i=>i?.id===id);
const freeChest=()=>C.state.chest.findIndex(e=>!e);
const stash=id=>C.move({kind:'inv',i:slotOf(id)},{kind:'chest',i:freeChest()});
const unstash=(id,to)=>{const k=C.state.chest.findIndex(e=>e?.id===id);let i=to??[...Array(36).keys()].find(n=>!C.inventory()[n]);return C.move({kind:'chest',i:k},{kind:'inv',i});};

// ---- the room: the box, the kitchen, and every other kind of loose item ----
const box=keepsakes.give('box');await box.worldTask;C.state.intro=true;
for(const k of ['bread','cup']){C.source(k);C.source(k);}
for(const id of ['tin','rifle','top','paper','postcard','ticket','eyes','crumbs','shards'])keepsakes.give(id);
await C.dropEgg({x:stage.width*.62,y:stage.height*.3});
await cat.ensureButter();cat.setButter(true);
await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));await rest();
for(const i of keepsakes.live.values())if(C.chestable(i))known.add(i.id);
note('inventory items in play',[...known].join(','));
await C.openChest();await until(()=>S.isOpen&&!E.box.lidMoving,4000);

// 1. every kind in and out once
{const each=[...known];for(const id of each){if(!keepsakes.has(id))continue;
  if(!await stash(id))fail('every kind goes into the chest and comes back out reachable',id+' would not go in');
  else if(keepsakes.has(id)||!chestIds().includes(id))fail('every kind goes into the chest and comes back out reachable',id+' half moved');
  if(!await unstash(id))fail('every kind goes into the chest and comes back out reachable',id+' would not come out');
  const bad=agree();if(bad.length)fail('every kind goes into the chest and comes back out reachable',id+': '+bad.join('; '));}
 await verdict('every kind goes into the chest and comes back out reachable',each);}

// 2. rapid in and out: overlapping moves (a double click) and ten quick round trips without waiting for rest
{const id='tin';const all=await Promise.all([stash(id),stash(id),unstash(id),stash(id)].map(p=>p.catch(e=>String(e))));
 if(agree().length)fail('rapid moves never duplicate or lose an item',JSON.stringify(all)+' '+agree().join('; '));
 for(let n=0;n<10;n++){if(keepsakes.has(id))await stash(id);else await unstash(id);const bad=agree();if(bad.length)fail('rapid moves never duplicate or lose an item','trip '+n+': '+bad.join('; '));}
 if(!keepsakes.has(id))await unstash(id);
 await verdict('rapid moves never duplicate or lose an item',[id]);}

// 3. everything in, then everything out onto occupied slots (swaps): a full chest of what there is, an empty room
{const ids=[...known].filter(id=>keepsakes.has(id));for(const id of ids)await stash(id);
 const allIn=ids.every(id=>chestIds().includes(id))&&!invIds().length;if(!allIn)fail('a full chest and swaps keep one of each',JSON.stringify({chest:chestIds(),inv:invIds()}));
 await __shot('inventory-stress-full-chest');
 // out one by one onto the hotbar, the second onto the first's slot (a swap: the first goes back into the chest)
 const [a,b]=ids;await unstash(a,27);await unstash(b,27);
 if(!(chestIds().includes(a)&&keepsakes.has(b)&&!keepsakes.has(a)))fail('a full chest and swaps keep one of each','swap '+JSON.stringify({chest:chestIds(),inv:invIds()}));
 // chest to chest swaps
 const k0=C.state.chest.findIndex(Boolean),k1=C.state.chest.findIndex((e,k)=>e&&k>k0);await C.move({kind:'chest',i:k0},{kind:'chest',i:k1});
 for(const id of [...chestIds()])await unstash(id);
 await verdict('a full chest and swaps keep one of each',ids);}

// 4. taking items out while the box is carried about
{const ids=['egg','pat','tin'].filter(id=>keepsakes.has(id));for(const id of ids)await stash(id);
 const e=box.worldEntry,g=new T.Vector3().copy(e.body.worldCom());W.grab(e,g);
 const moving=(async()=>{for(let n=0;n<90;n++){W.move(g.clone().add(new T.Vector3(Math.sin(n/9)*.5,.35,Math.cos(n/9)*.2)));await sleep(16);}})();
 for(const id of ids){await unstash(id);await sleep(120);}
 await moving;W.release();
 await verdict('items taken out while the box moves land in the room, reachable',ids);}

// 5. Aaron's case: an item taken out falls off the page; it is back at once, listed and reachable
{const id='tin';await stash(id);await unstash(id);const e=keepsakes.get(id).worldEntry;
 site.supports.detach(e,{wake:false});e.body.setTranslation({x:9,y:.4,z:1},true);W.wake(e);
 const gone=await until(()=>!!e.timer,2000),t=performance.now(),back=await until(()=>!e.timer&&e.object.visible,3000),ms=performance.now()-t;
 if(!gone||!back||ms>RETURN.quick+600)fail('an item that falls off the page while the inventory shows is back at once',JSON.stringify({gone,back,ms}));
 await verdict('an item that falls off the page while the inventory shows is back at once',[id]);}

// 6. lost while the chest was shut: opening the inventory brings it back before it is listed
{await S.close();await until(()=>!S.isOpen&&!E.box.lidMoving,3000);
 const id='rifle',e=keepsakes.get(id).worldEntry;note('rifle before',JSON.stringify({timer:!!e.timer,held:W.held?.entry?.id,support:e.support?.id,enabled:e.body.isEnabled(),inv:site.inventoryOpen}));site.supports.detach(e,{wake:false});e.body.setTranslation({x:-9,y:.4,z:1},true);W.wake(e);
 await until(()=>!!e.timer,2000);const away=!!e.timer;
 await C.openChest();await until(()=>S.isOpen,4000);
 if(!away||e.timer||!e.object.visible)fail('opening the inventory brings back an item lost off the page',JSON.stringify({away,timer:!!e.timer,visible:e.object.visible}));
 await verdict('opening the inventory brings back an item lost off the page',[id]);}

// 7. the real screen: double presses and drags in quick succession, then Escape in the middle of a move
{const mid=r=>({x:r.x+r.width/2,y:r.y+r.height/2});const at=(k,i)=>mid(S.rect(k,i));
 const id='egg';const k=freeChest();
 await __pointer([at('inv',slotOf(id)),at('chest',k)]);await __pointer([at('chest',k),at('inv',30)]);await __pointer([at('inv',30),at('chest',k)]);await __pointer([at('chest',k),at('inv',31)]);
 await sleep(300);
 const before=agree();if(before.length)fail('quick presses on the screen and Escape mid-move keep the two in step',before.join('; '));
 const p=unstash(chestIds()[0]??'egg');await __key('Escape');await p;
 await verdict('quick presses on the screen and Escape mid-move keep the two in step',[...known].filter(id=>keepsakes.has(id)));}

// For the reload: start a move out of the chest and stop here without waiting for it.
{if(!S.isOpen){await C.openChest();await until(()=>S.isOpen,4000);}
 const id='tin';if(keepsakes.has(id))await stash(id);
 store.set('inventoryStress',{known:[...known]});store.flush();
 unstash(id);await sleep(5);}
