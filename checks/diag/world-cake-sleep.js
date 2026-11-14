cat.auto=false;const W=site.world,T=site.THREE,i=keepsakes.give('cake');await i.worldTask;const e=i.worldEntry,b=e.body,sync=e.sync,step=e.beforeStep;e.sync=null;e.rest=null;
for(const mode of [100,12,4])for(const seed of [3,6,13]){
 e.beforeStep=null;const floors=[];W.physics.forEachCollider(c=>{if(!c.parent())floors.push(c);});floors.forEach(c=>W.physics.removeCollider(c,true));W.physics.createCollider(W.rapier.ColliderDesc.cuboid(mode,.1,mode).setTranslation(0,-.1,0).setFriction(.6).setRestitution(.25));const q=new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),low=Math.min(...i.colliderVertices.map(v=>v.clone().applyQuaternion(q).y));b.setTranslation({x:0,y:.6+seed%5*.2-low,z:0},true);b.setRotation(q,true);b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
 let p;for(let n=0;n<1920;n++){W.step(1/120);if(n===839)p=b.translation();if([959,1919].includes(n))note('sleep premise',JSON.stringify({mode,seed,seconds:(n+1)/120,sleeping:b.isSleeping(),v:b.linvel(),w:b.angvel(),p:b.translation(),q:b.rotation(),drift:p?Math.hypot(...['x','y','z'].map(k=>b.translation()[k]-p[k])):0}));}
}
e.sync=sync;W.sync(e);
