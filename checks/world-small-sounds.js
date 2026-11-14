cat.auto=false;const W=site.world,S=site.supports;audio.setMuted(false);
// Contact sounds are off (Aaron, e1111-58): each body keeps its material, reaches the adapter, and stays silent.
for(const [id,material]of [['crumbs','butter'],['shards','glass'],['eyes','tin']]){   // the star is a 2D sticker now (playtest 2)
 const i=keepsakes.give(id);await i.worldTask;await audio.loadImpacts(material);const quiet=audio.diagnostics().silentContacts;
 const e=i.worldEntry,b=e.body;S.detach(e,{wake:false});
 const sync=e.sync,rest=e.rest;e.sync=null;e.rest=null;
 site.world.cat?.suspend('fixture',true); // isolated drops where the cat floats (cat-body.js)
 b.setTranslation({x:0,y:.6,z:0},false);b.setLinvel({x:0,y:-1,z:0},false);b.setAngvel({x:0,y:0,z:0},false);W.wake(e);
 const before=audio.diagnostics().impacts;let n=0;for(;n<960&&!b.isSleeping();n++)W.step(1/120);
 const voices=audio.diagnostics().impacts-before,contacts=audio.diagnostics().silentContacts-quiet;
 check('small '+id+' actual material contact is silent, then sleep',e.sound.material===material&&e.sound.size==='small'&&voices===0&&contacts>0&&b.isSleeping(),JSON.stringify({material,voices,contacts,seconds:n/120}));
 e.sync=sync;e.rest=rest;W.sync(e);
 if(id==='shards'&&stage.reducedMotion){await audio.loadAll(['hit']);const clips=audio.diagnostics().clips;i.def.tap(i);check('small reduced shard tap keeps its clink without a hop',audio.diagnostics().clips===clips+1&&b.isSleeping());}
 keepsakes.take(id);await sleep(90);
}
const before={steps:W.stats.steps,impacts:audio.diagnostics().impacts};await sleep(300);
check('small material contacts leave no idle work',W.stats.steps===before.steps&&audio.diagnostics().impacts===before.impacts&&!W.stats.listening);
