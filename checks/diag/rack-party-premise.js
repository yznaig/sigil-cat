cat.auto=false;await site.rack.ready();const W=site.world,S=site.supports,T=site.THREE,i=site.rack.hats.get('party'),e=i.worldEntry,b=e.body;
S.detach(e,{wake:false});for(const a of W.entries.values())if(a!==e)a.body.setEnabled(false);e.sync=null;W.step(1/120);
const trace=[];
for(const seed of [18]){
 b.setTranslation({x:0,y:.6+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
 for(let n=0;n<1920&&!b.isSleeping();n++){W.step(1/120);if(n%120===119)trace.push({seed,t:(n+1)/120,p:b.translation(),v:b.linvel(),w:b.angvel(),q:b.rotation(),sleep:b.isSleeping()});}
}
note('rack party compound contacts',JSON.stringify(trace));
