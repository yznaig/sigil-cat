// Reduced motion retains real physical placement; the box is no longer a DOM drop.
cat.auto=false;const i=keepsakes.give('box');await i.worldTask;
const W=site.world,T=site.THREE,e=i.worldEntry;
check('physics reduced initial box is already at rest',stage.reducedMotion&&e.body.isSleeping()&&keepsakes.physics.steps===0);
site.worldInput.keyboardLift(e);site.worldInput.keyboardMove(e,'ArrowUp');site.worldInput.cancel();
const sync=e.sync;e.sync=null;for(let n=0;n<960&&!e.body.isSleeping();n++)W.step(1/120);e.sync=sync;W.sync(e);
const p=e.body.translation(),q=new T.Quaternion().copy(e.body.rotation()),v=i.colliderVertices.map(v=>v.clone().applyQuaternion(q).add(p)).sort((a,b)=>a.y-b.y)[0],a=stage.toScreen(v),b=stage.toScreen(new T.Vector3(v.x,0,v.z));
check('physics reduced player movement remains weighted and settles on real floor',e.body.isSleeping()&&Math.hypot(a.x-b.x,a.y-b.y)<=2&&!W.held&&keepsakes.physics.steps===0);
