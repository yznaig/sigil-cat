cat.auto=false;const W=site.world,T=site.THREE;
await W.ensure();audio.setMuted(false);
site.world.cat?.suspend('fixture',true); // the drops below fall where he floats (cat-body.js): isolate them from him
// Contact sounds are off (Aaron, e1111-58): real contacts reach the adapter and make no voice.
for(const material of ['wood','metal','paper','butter','glass','tin']){
 await audio.loadImpacts(material);
 const before=audio.diagnostics().impacts,quiet=audio.diagnostics().silentContacts;
 const e=await W.add({id:'contact-'+material,object:new T.Group(),position:{x:0,y:.6,z:0},shapes:[{half:[.05,.05,.05]}],mass:.2,sound:{material,size:'small'}});
 await until(()=>e.body.isSleeping(),6000);
 const after=audio.diagnostics().impacts,contacts=audio.diagnostics().silentContacts-quiet;
 check('world real '+material+' contact is silent then sleeps',after===before&&contacts>0&&e.body.isSleeping(),`${after-before} voices; ${contacts} silent contacts`);
 W.remove(e.id);await sleep(100);
}
const id='contact-restore';store.set('worldBodies.'+id,{version:1,position:[0,.6,0],quaternion:[0,0,0,1],awake:true});
const before=audio.diagnostics().impacts;
const restored=await W.add({id,object:new T.Group(),shapes:[{half:[.05,.05,.05]}],mass:.2,persist:true,sound:{material:'glass'}});
await until(()=>restored.body.isSleeping(),6000);
check('world unfinished restored drop stays silent until sleep',audio.diagnostics().impacts===before&&restored.body.isSleeping());
site.world.cat?.suspend('fixture',true); // isolated drops where the cat floats (cat-body.js)
const restoreQuietAfter=audio.diagnostics().silentContacts;restored.body.setTranslation({x:0,y:.6,z:0},false);W.wake(restored);await until(()=>restored.body.isSleeping(),6000);
check('world player drop after restore reaches the (silent) adapter again',audio.diagnostics().impacts===before&&audio.diagnostics().silentContacts>restoreQuietAfter);
W.remove(id);store.del('worldBodies.'+id);
const idle=W.stats.steps;await sleep(300);check('world sound event queue does no sleeping work',W.stats.steps===idle);
