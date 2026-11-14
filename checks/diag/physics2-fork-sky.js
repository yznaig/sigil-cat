// Physics lane: the pitchfork thrown out of the top of the page still brings the hay (recipes.js stepItem, trimmed).
cat.auto=false;const W=site.world,T=site.THREE;
site.cast('fork');const f=keepsakes.get('pitchfork');await f.worldTask;await until(()=>!W.stats.listening,15000);
const e=f.worldEntry,p=site.worldLayout.anchor(stage.width*.7);p.y=.6;e.body.setTranslation(p,true);e.body.setLinvel({x:0,y:0,z:0},true);W.wake(e);
await sleep(300);const armed=!!e.skyArmed;e.body.setLinvel({x:0,y:14,z:0},true);W.wake(e);
const hay=await until(()=>keepsakes.has('hay'),6000);
check('physics2 fork thrown out of the top brings the hay',armed&&hay,JSON.stringify({armed,hay}));
