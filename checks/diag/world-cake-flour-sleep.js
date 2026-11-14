cat.auto=false;const W=site.world,T=site.THREE,i=keepsakes.give('recipe-flour');await i.worldTask;const e=i.worldEntry,b=e.body;e.sync=null;e.rest=null;
for(const seed of [2,8,9,13,32]){
 const q=new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),low=Math.min(...i.colliderVertices.map(v=>v.clone().applyQuaternion(q).y));b.setTranslation({x:0,y:.6+seed%5*.2-low,z:0},true);b.setRotation(q,true);b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
 for(let n=0;n<1440&&!b.isSleeping();n++){W.step(1/120);if([239,479,959,1439].includes(n)){const q=b.rotation(),contacts=[];W.physics.contactPairsWith(b.collider(0),other=>W.physics.contactPair(b.collider(0),other,m=>{for(let k=0;k<m.numContacts();k++)contacts.push(m.contactDist(k));}));note('flour slow pose',JSON.stringify({seed,t:(n+1)/120,p:b.translation(),q,up:1-2*(q.x*q.x+q.z*q.z),v:b.linvel(),w:b.angvel(),I:b.principalInertia(),contacts}));}}
 note('flour final sleep',JSON.stringify({seed,sleep:b.isSleeping()}));
}
