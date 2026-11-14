// Production interactions; no cost or frame-time gates. See the separate reload runner.
cat.auto=false;
const C=E.box.recipe,W=site.world,T=site.THREE;
const settle=async()=>{await until(()=>!W.stats.listening,16000);};
// Keep production sync active: sleep recovery reads the current projected bounds.
const advance=n=>{for(let k=0;k<n;k++)W.step(1/120);};
const hit=i=>{for(let y=i.box.y+4;y<i.box.y+i.box.h-4;y+=5)for(let x=i.box.x+4;x<i.box.x+i.box.w-4;x+=5)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};
await E.bread.whenReady();
await fast(8,async()=>{site.cast('dome');await E.bread.whenBread();E.bread.toCat();await stage.after(.3);site.cast('dome');await E.bread.whenBread();E.bread.toCat();await stage.after(.3);});
await fast(12,async()=>{await site.cast('cup');await site.cast('cup');});
for(const id of ['flour','bucket'])await keepsakes.get(id)?.worldTask;
check('cake bread twice gives flour and cup twice gives pail',C.state.bread>=2&&C.state.cup===2&&keepsakes.get('flour')?.worldReady&&keepsakes.get('bucket')?.worldReady);
await site.cast('square');const box=keepsakes.get('box');await box.worldTask;advance(600);
check('cake original box entry ends and never repeats',C.state.intro&&!cat.hidden&&!E.box.inside&&await E.box.drop()&&!E.box.inside);
const p=hit(box),body=box.worldEntry.body;
check('cake box is closed by default (a chest, e1111-61)',!C.state.open&&box.hinge.rotation.x===0);
if(p){fire('pointerdown',p.x,p.y,++pointerIds);check('cake short press creates no grip',!W.held);await sleep(45);fire('pointerup',p.x,p.y,pointerIds,0);await until(()=>C.screen.isOpen&&!E.box.lidMoving,5000);}
check('cake short click opens the lid and the chest screen',p&&C.state.open&&C.screen.isOpen&&!E.box.inside&&!cat.hidden);
await __shot('world-unit8-open');await C.screen.close();await until(()=>!C.state.open&&!E.box.lidMoving,5000);advance(360);
const hp=hit(box);if(hp){const id=++pointerIds;fire('pointerdown',hp.x,hp.y,id);await sleep(260);check('cake hold creates weighted point grip',W.held?.entry===box.worldEntry);fire('pointercancel',hp.x,hp.y,id,0);}
check('cake hold cancellation keeps the chest shut and releases grip',!C.state.open&&!C.screen.isOpen&&!W.held);advance(480);
// Fork hook is the production sigil event; only the upper exit starts the visit.
site.cast('fork');await keepsakes.get('pitchfork').worldTask;
check('cake fork event supplies exactly one physical pitchfork',keepsakes.get('pitchfork').worldReady&&[...W.entries.keys()].filter(id=>id==='pitchfork').length===1);
await C.throwFork();advance(180);await until(()=>keepsakes.get('hay')?.worldReady,10000);advance(800);
check('cake upward fork exit gives one fixed hay pile',C.state.hay?.landed&&keepsakes.get('hay')?.worldEntry.fixed,JSON.stringify(C.state.hay));
{const h=keepsakes.get('hay'),b=h.worldEntry.body,q=new T.Quaternion().copy(b.rotation()),p=new T.Vector3().copy(b.translation()),v=h.colliderVertices.map(v=>v.clone().applyQuaternion(q).add(p)).sort((a,b)=>a.y-b.y)[0],a=stage.toScreen(v),floor=stage.toScreen(new T.Vector3(v.x,0,v.z));check('cake fixed hay has actual floor contact <=2px',Math.hypot(a.x-floor.x,a.y-floor.y)<=2,JSON.stringify({position:p,gap:Math.hypot(a.x-floor.x,a.y-floor.y)}));}
check('cake hay starts licensed cow visit',await until(()=>C.cow.actor,20000));
// Move the visitor along its finite production path to a visible milking position.
if(C.cow.actor){C.state.visit.x=C.state.visit.target-.1;C.state.visit.phase='enter';C.save();await sleep(500);await __shot('world-unit8-hay-cow');await C.cow.milk();advance(180);await sleep(500);}
check('cake actual pail cow contact yields milk once',C.state.milkFull&&C.state.visit?.milked);
const full=keepsakes.get('bucket');await __shot('world-unit8-milk');
await cat.ensureButter();cat.setButter(true);await until(()=>keepsakes.get('pat')?.worldReady);
{const pat=keepsakes.get('pat');pat.worldEntry.grabbed?.();pat.moveWorld({x:stage.width*.3,y:site.worldLayout.floorY()+20});}
await C.dropEgg({x:stage.width*.6,y:stage.height*.3});advance(600);
// The chest screen's own moves: inventory slot to chest slot, each despawning the item from the room.
C.inventory();const four=['flour','pat','bucket','egg'];
for(const [k,id]of four.entries())await C.move({kind:'inv',i:C.state.inv[id]},{kind:'chest',i:k});
check('cake four ingredients go into the chest and leave the room',C.insideAll()&&four.every(id=>!keepsakes.has(id)&&!W.entries.has(id)),JSON.stringify(C.chest.map(e=>e?.id||null)));
await C.openChest();await until(()=>C.screen.isOpen,3000);await __shot('world-unit8-contents');await C.screen.close();await until(()=>!C.state.open&&!E.box.lidMoving,5000);
await C.shakeBox();await until(()=>C.state.phase==='baked',3000);
check('cake several physical reversals consume the four once',C.state.phase==='baked'&&C.state.bakes===1&&['flour','pat','egg'].every(id=>!keepsakes.has(id)&&!C.chest.some(e=>e?.id===id))&&C.chest.some(e=>e?.id==='cake')&&C.chest.some(e=>e?.id==='bucket')&&!C.state.milkFull,JSON.stringify({phase:C.state.phase,bakes:C.state.bakes,room:['flour','pat','egg'].filter(id=>keepsakes.has(id)),chest:C.chest.map(e=>e?.id||null).filter(Boolean),milk:C.state.milkFull}));
check('cake stays in the chest and cannot be eaten before it is opened',!keepsakes.has('cake')&&await C.eat()===false);
await C.openChest();await until(()=>C.screen.isOpen,3000);
check('cake opening the chest reveals it',C.state.phase==='revealed');
await __shot('world-unit8-inverted');
await C.move({kind:'chest',i:C.chest.findIndex(e=>e?.id==='cake')},{kind:'inv',i:27});await keepsakes.get('cake')?.worldTask;await C.screen.close();advance(700);
check('cake comes out of the chest grabbable',C.state.phase==='revealed'&&keepsakes.get('cake')?.worldEntry.canGrab);
const cake=keepsakes.get('cake');await __shot('world-unit8-cake');
input.lock('cake-refusal-fixture',true);const refused=await C.eat();input.lock('cake-refusal-fixture',false);check('cake refused party handoff preserves edible reward',refused===false&&C.state.phase==='revealed'&&keepsakes.get('cake')===cake&&C.state.eaten===0);
check('cake poured reward remains reachable',cake&&cake.box.x<stage.width-20&&cake.box.x+cake.box.w>20&&cake.box.y+cake.box.h<stage.height-stage.insets.bottom+2,JSON.stringify(cake?.box));
// Save this complete physical state for the ordinary reload check.
for(const i of keepsakes.live.values())if(i.worldEntry)W.save(i.worldEntry,true);C.save(true);
store.set('cakeCheck',{phase:C.state.phase,bakes:C.state.bakes,ids:[...keepsakes.live.keys()],box:body.translation(),cake:cake?.worldEntry.body.translation()});store.flush();
function PORTION_IDS(){return ['recipe-flour','recipe-butter','recipe-milk'];}
