cat.auto=false;
const C=E.box.recipe;
for(const id of ['box','flour','bucket','pitchfork']){const i=keepsakes.give(id);await i.worldTask;}
await C.throwFork();
for(let n=0;n<14;n++){
 await sleep(1000);const h=keepsakes.get('hay'),e=h?.worldEntry;
 note('hay contact '+n,JSON.stringify({ready:h?.worldReady,error:h?.worldError,position:e?.body.translation(),v:e?.body.linvel(),av:e?.body.angvel(),asleep:e?.body.isSleeping(),hay:C.state.hay,visit:C.state.visit,cow:C.cow.active,steps:site.world.stats.steps}));
 if(C.cow.actor)break;
}
await until(()=>C.cow.actor,30000);
await __shot('world-unit8-cow-contact');
if(C.cow.actor){await C.cow.milk();await sleep(2500);check('milk action makes contact',C.state.milkFull,JSON.stringify(C.state.visit));}
await __shot('world-unit8-milk');
