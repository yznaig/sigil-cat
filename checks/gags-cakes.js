// Gags lane, playtest 2 (e1112-65, e1112-66): cake after cake. Every ingredient can be got again (one at a time), each
// bake makes a new cake and they pile up; only the first cake's first tap is the party. A tap on a kept cake is the
// cat hopping and nibbling, and a slice is gone; the last slice leaves nothing. --then gags-cakes-reload.js.
cat.auto=false;
const C=E.box.recipe,P=E.party,W=site.world,T=site.THREE;
const advance=n=>{for(let k=0;k<n;k++)W.step(1/120);};
await E.bread.whenReady();
const breadTwice=()=>fast(8,async()=>{for(let n=0;n<2;n++){site.cast('dome');await E.bread.whenBread();E.bread.toCat();await stage.after(.3);}});
async function milk(){
 // The fork's sky throw brings the hay, the hay the cow, the cow the milk (the real chain, then the visit ends).
 site.cast('fork');const f=keepsakes.get('pitchfork');await f.worldTask;await until(()=>!f.worldEntry.fromSky,12000);
 await C.throwFork();advance(180);await until(()=>keepsakes.get('hay')?.worldReady,10000);advance(800);
 await until(()=>C.cow.actor,20000);C.state.visit.x=C.state.visit.target-.1;C.state.visit.phase='enter';C.save();await sleep(500);await C.cow.milk();advance(180);await sleep(300);
 const ok=C.state.milkFull;
 await C.cow.visit();C.consumeHay();const v=C.state.visit;if(v){v.phase='leave';while(stage.toScreen(new T.Vector3(v.x-1.3*v.scale,0,v.z)).x<stage.width+50)v.x+=.5;}await until(()=>!C.cow.active&&!C.state.visit,8000);
 return ok;
}
async function butter(){await cat.ensureButter();cat.setButter(true);await until(()=>keepsakes.get('pat')?.worldReady,8000);const pat=keepsakes.get('pat');pat.worldEntry.grabbed?.();pat.moveWorld({x:stage.width*.3,y:site.worldLayout.floorY()+20});advance(240);return !cat.butterOn&&keepsakes.has('pat');}
async function egg(){
 // the bird's own re-drop (bird lane): a visit lets an egg go whenever the player has none anywhere
 dispatchEvent(new CustomEvent('sigilcat:bird-egg',{detail:{x:stage.width*.6,y:stage.height*.3}}));
 await until(()=>keepsakes.get('egg')?.worldReady,6000);advance(600);return keepsakes.has('egg');
}
const free=kind=>kind==='chest'?C.chest.findIndex(e=>!e):[...Array(36).keys()].find(i=>!C.inventory()[i]);
async function bakeOne(){
 C.inventory();for(const id of ['flour','pat','bucket','egg'])await C.move({kind:'inv',i:C.state.inv[id]},{kind:'chest',i:free('chest')});
 const before=C.stats.bakes;await C.shakeBox();await until(()=>C.stats.bakes>before,3000);
 const id=C.cakeId(C.state.bakes);await C.openChest();await until(()=>C.screen.isOpen,3000);
 await C.move({kind:'chest',i:C.chest.findIndex(e=>e?.id===id)},{kind:'inv',i:free('inv')});await keepsakes.get(id)?.worldTask;
 // the emptied pail stays in the chest after a bake: back into the room for the next cow
 const pail=C.chest.findIndex(e=>e?.id==='bucket');if(pail>=0){await C.move({kind:'chest',i:pail},{kind:'inv',i:free('inv')});await keepsakes.get('bucket')?.worldTask;}
 await C.screen.close();await until(()=>!C.state.open&&!E.box.lidMoving,5000);advance(600);
 return id;
}
// ---- the first cake ----
await breadTwice();await fast(12,async()=>{await site.cast('cup');await site.cast('cup');});
await site.cast('square');await keepsakes.get('box').worldTask;await until(()=>!E.box.busy,12000);advance(600);
const m1=await milk(),b1=await butter(),e1=await egg();
check('cakes the four, the first time',keepsakes.has('flour')&&m1&&b1&&e1);
const first=await bakeOne();
check('cakes the first bake is the cake',first==='cake'&&keepsakes.get('cake')?.worldEntry?.canGrab&&C.state.bakes===1);
const party=C.eat('cake');await until(()=>P.state.active,3000);await __key('Escape');await party;await until(()=>!input.locked&&stage.timeScale===1,8000);await until(()=>E.hat.wearing==='party',6000);
check('cakes the first cake\'s first tap is the party (crash screen, party hat), and the cake stays',P.state.returns===1&&E.hat.wearing==='party'&&C.state.phase==='eaten'&&keepsakes.has('cake'));
await fast(40,()=>until(()=>!P.state.effects,12000));
// ---- every ingredient again, one at a time ----
check('cakes flour is used up, then two more breads bring it back',!keepsakes.has('flour')&&(await breadTwice(),keepsakes.has('flour'))&&[...keepsakes.live.keys()].filter(k=>k==='flour').length===1);
await breadTwice();check('cakes only one flour at a time',[...keepsakes.live.keys()].filter(k=>k==='flour').length===1&&!C.chest.some(e=>e?.id==='flour'));
check('cakes the pail stays; the next cow fills it again',keepsakes.has('bucket')&&!C.state.milkFull&&await milk());
check('cakes the butter comes back on his head (Butterman\'s butter scene) and off again',await butter());
check('cakes another egg',await egg());
const second=await bakeOne();
check('cakes a second bake makes a second cake; both are here',second==='cake-2'&&keepsakes.has('cake')&&keepsakes.has('cake-2')&&C.state.bakes===2);
await __shot('gags-cakes-two');
// ---- nibbling ----
// How far round the cake goes (radians from where its cut starts): five slices ≈ 5.85, each slice eaten ≈ 1.04 less.
const arc=i=>Math.max(...i.colliderVertices.map(v=>Math.hypot(v.x,v.z)>.01?(Math.atan2(-v.z,v.x)+2*Math.PI)%(2*Math.PI):0));
const c2=keepsakes.get('cake-2'),v0=arc(c2),emotes=cat.emoteLog.length,returns=P.state.returns;
await C.eat('cake-2');
check('cakes a tap on a later cake: he hops and nibbles, a slice is gone, no party',c2.state.slices===1&&cat.emoteLog.slice(emotes).some(s=>s.startsWith('nibble'))&&P.state.returns===returns&&!P.state.active&&arc(c2)<v0-.9,JSON.stringify({slices:c2.state.slices,arc:[v0,arc(c2)]}));
await sleep(300);await __shot('gags-cakes-nibbled');
keepsakes.take('crumbs');   // the breads' crumbs: cleared so the last slice is seen to leave none
for(let n=0;n<4;n++){await sleep(200);await C.eat('cake-2');}
check('cakes the last slice leaves nothing behind (no crumbs)',!keepsakes.has('cake-2')&&!W.entries.has('cake-2')&&!keepsakes.has('crumbs')&&C.state.finished?.includes('cake-2'),JSON.stringify({has:keepsakes.has('cake-2'),slices:c2.state.slices,world:W.entries.has('cake-2'),crumbs:keepsakes.has('crumbs'),fin:C.state.finished,n:C.stats.nibbles}));
await C.eat('cake');await sleep(200);await C.eat('cake');
check('cakes the first cake, after its party, is nibbled the same way',keepsakes.get('cake').state.slices===2&&P.state.returns===1);
await sleep(300);await __shot('gags-cakes-first-nibbled');
for(const i of keepsakes.live.values())if(i.worldEntry)W.save(i.worldEntry,true);C.save(true);store.flush();
