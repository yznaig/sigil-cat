cat.auto=false;
const C=E.box.recipe,W=site.world,T=site.THREE;
for(const id of ['box','flour','bucket']){const i=keepsakes.give(id);await i.worldTask;}
await cat.ensureButter();cat.setButter(true);await until(()=>keepsakes.get('pat')?.worldReady);
// Deterministic production-physics fixture; no wall-time or frame-cost gate.
const advance=n=>{const hooks=[...W.entries.values()].map(e=>[e,e.sync]);hooks.forEach(([e])=>e.sync=null);for(let k=0;k<n;k++)W.step(1/120);hooks.forEach(([e,s])=>{e.sync=s;W.sync(e);});};
C.state.visit={id:1,milked:false};C.fillMilk();C.state.visit=null;C.save();
for(const k of ['flour','butter','milk']){await C.insert(k);advance(600);}
check('all recipe portions physically inside',C.insideAll(),JSON.stringify({contents:C.state.contents,poses:['recipe-flour','recipe-butter','recipe-milk'].map(id=>({id,p:W.entries.get(id)?.body.translation()}))}));
await __shot('world-unit8-contents');
await E.box.setOpen(false);advance(500);
check('closed box has six colliders',keepsakes.get('box').worldEntry.body.numColliders()===6);
await __shot('world-unit8-closed');
const result=await C.shakeBox();
note('shake result',JSON.stringify({result,shakes:C.shakes,state:C.state,position:C.box.worldEntry.body.translation(),parts:['flour','butter','milk'].map(k=>{const e=W.entries.get('recipe-'+k);return {id:k,p:e?.body.translation(),q:e?.body.rotation()};})}));
check('shake makes one cake',C.state.phase==='baked'&&C.state.bakes===1);
await C.pourBox();advance(800);
note('pour result',JSON.stringify({state:C.state,cake:W.entries.get('cake')?.body.translation(),box:C.box.worldEntry.body.translation()}));
check('pour reveals cake',C.state.phase==='revealed');await __shot('world-unit8-cake');
