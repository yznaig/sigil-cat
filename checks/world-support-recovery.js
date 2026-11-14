cat.auto=false;
const W=site.world,T=site.THREE,eyes=keepsakes.give('eyes');await eyes.worldTask;
const e=eyes.worldEntry;site.eyesWorld.detach();e.body.setTranslation({x:20,y:1,z:0},false);W.wake(e);W.step(1/60);
const states=()=>({timer:!!e.timer,enabled:e.body.isEnabled(),support:e.support?.id,visible:e.object.visible,active:W.active,respawns:W.stats.respawns,steps:W.stats.steps,position:{...e.body.translation()}});
note('support recovery pending',JSON.stringify(states()));
site.eyesWorld.stick('cat');const start=states();note('support recovery after explicit reattach',JSON.stringify(start));
await sleep(5200);note('support recovery after old deadline',JSON.stringify(states()));
check('support recovery attachment cancels stale return',!start.timer&&start.enabled&&W.stats.respawns===start.respawns&&W.stats.steps===start.steps);
