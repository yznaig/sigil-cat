// The sources work before the box exists; the chest takes them afterwards (e1111-61 replaced pouring and tipping).
cat.auto=false;const C=E.box.recipe,W=site.world,T=site.THREE;
for(const kind of ['bread','cup']){C.source(kind);C.source(kind);}
for(const id of ['flour','bucket'])await keepsakes.get(id).worldTask;
C.state.visit={id:1,milked:false,x:0,target:0,z:1,scale:.48,time:0,walkTime:0,phase:'eat'};C.save(true);await C.cow.visit();
// The milk action (its panel button is gone, e1111-34) still puts the real pail against the cow's contact proxies.
C.cow.milk();await until(()=>C.state.milkFull,5000);
check('cake milk action contacts cow before box exists',C.state.milkFull&&C.state.visit.milked&&!keepsakes.has('box'));
const bucket=keepsakes.get('bucket'),e=bucket.worldEntry;e.body.setLinvel({x:1,y:0,z:.5},false);W.wake(e);W.sync(e);
check('cake full pail sloshes before box exists',Math.abs(bucket.milk.rotation.z)>0&&Math.abs(bucket.milk.rotation.x)>0);
C.state.visit=null;C.save(true);await until(()=>!C.cow.active,5000);
const box=keepsakes.give('box');await box.worldTask;
C.inventory();await C.move({kind:'inv',i:C.state.inv.bucket},{kind:'chest',i:0});
check('cake a full pail keeps its milk in the chest',C.chest[0]?.id==='bucket'&&C.state.milkFull&&!keepsakes.has('bucket'));
await C.move({kind:'chest',i:0},{kind:'inv',i:30});const back=keepsakes.get('bucket');await back?.worldTask;
check('cake and comes back out full',back?.worldReady&&back.milk.visible&&C.state.milkFull);
check('cake no pouring or tipping portions remain',!keepsakes.has('recipe-milk')&&!keepsakes.has('recipe-flour'));
