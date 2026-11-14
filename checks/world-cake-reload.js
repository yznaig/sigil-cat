cat.auto=false;await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));
const C=E.box.recipe,saved=store.get('cakeCheck');
check('cake revealed recipe survives reload exactly once',saved&&C.state.phase===saved.phase&&C.state.bakes===1&&['flour','pat','egg','recipe-flour','recipe-butter','recipe-milk'].every(id=>!keepsakes.has(id)&&!C.chest.some(e=>e?.id===id))&&keepsakes.has('cake')&&C.chest.some(e=>e?.id==='bucket'));
check('cake source keepsakes persist',saved?.ids.every(id=>keepsakes.has(id)));
const p=keepsakes.get('cake')?.worldEntry.body.translation();
check('cake reward pose reload stays within half a pixel',p&&saved?.cake&&Math.hypot(...['x','y','z'].map(k=>p[k]-saved.cake[k]))*stage.pxPerUnit(new site.THREE.Vector3().copy(p))<.5);
await __shot('world-unit8-reload');

{
// Run after the full chain/reload. Deterministic end of the finite visitor path.
cat.auto=false;const C=E.box.recipe,W=site.world,T=site.THREE;
if(C.state.visit){await C.cow.visit();C.consumeHay();const v=C.state.visit;v.phase='leave';while(stage.toScreen(new T.Vector3(v.x-1.3*v.scale,0,v.z)).x<stage.width+50)v.x+=.5;await until(()=>!C.cow.active,5000);}
check('cake departing cow removes actor body and callback',!C.state.visit&&!C.cow.active&&!W.entries.has('cake-cow'));
await until(()=>![...W.entries.values()].some(e=>e.timer),8000);
await until(()=>!W.stats.listening,16000);await sleep(300);
const snapshot=()=>({steps:W.stats.steps,syncs:W.stats.syncs,shadows:site.worldLayout.stats.shadowUpdates,atlas:site.meshPictures.stats.passes,supports:site.supports.stats.frames,callbacks:stage.onFrame.length,pictures:[...keepsakes.live.values()].map(i=>i.picture?.stats.draws||0)});
const before=snapshot();await sleep(2100);
check('cake settled full chain has zero world work for 2.1s',!W.stats.listening&&JSON.stringify(before)===JSON.stringify(snapshot()),JSON.stringify({before,after:snapshot()}));
// e1111-34: no Box & baking panel; a real tap on the box toggles the same lid.
const hitOn=i=>{const b=i.picture.rect;for(let y=b.y+4;y<b.y+b.h-4;y+=3)for(let x=b.x+4;x<b.x+b.w-4;x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};
const open=C.state.open,boxSpot=hitOn(keepsakes.get('box'));if(boxSpot)await tap(boxSpot.x,boxSpot.y);await until(()=>C.state.open!==open&&!E.box.lidMoving,5000);
check('cake native tap opens the same box as a chest',!!boxSpot&&C.state.open!==open&&C.screen.isOpen&&!W.held,JSON.stringify(boxSpot));
check('cake has no Box & baking panel',!document.querySelector('.cake-actions'));
await __shot('world-unit8-controls');await C.screen.close();await until(()=>!C.state.open&&!E.box.lidMoving,3000);
// Every ordinary side exit retains the fork and never creates another hay pile.
// The thrown fork is gone until its sigil is drawn again (playtest 2, e1112-36): draw it, let it fall in.
let fork=keepsakes.get('pitchfork');if(!fork){site.cast('fork');fork=keepsakes.get('pitchfork');await fork?.worldTask;await until(()=>fork&&!fork.worldEntry?.fromSky,12000);}
if(fork){const e=fork.worldEntry;e.body.setTranslation({x:12,y:.1,z:0},false);e.body.setLinvel({x:2,y:0,z:0},false);W.wake(e);W.sync(e);await sleep(100);check('cake side exit does not summon hay',!C.state.hay&&!C.state.visit&&!!e.timer);await until(()=>!e.timer,8000);check('cake side exit recovers same fork',keepsakes.get('pitchfork')===fork&&e.body.isEnabled());}

}
