cat.auto=false;await site.rack.ready();const W=site.world,S=site.supports,T=site.THREE,i=site.rack.hats.get('party');let e=i.worldEntry,b=e.body;
S.detach(e,{wake:false});for(const a of W.entries.values())if(a!==e)a.body.setEnabled(false);e.sync=null;W.step(1/120);
const trace=[];const fresh=await W.add({id:'party-contact-fresh',object:new T.Group(),shapes:i.colliderShapes,mass:.03,material:{friction:.8,restitution:.02,linearDamping:.3,angularDamping:3,skin:.001},sleeping:true});fresh.body.setEnabled(false);note('rack party inertia',JSON.stringify({mass:b.mass(),com:b.localCom(),inertia:b.principalInertia(),freshMass:fresh.body.mass(),freshCom:fresh.body.localCom(),freshInertia:fresh.body.principalInertia()}));
for(const variant of ['reused','fresh']){if(variant==='fresh'){b.setEnabled(false);e=fresh;b=fresh.body;b.setEnabled(true);W.step(1/120);}const seed=15;
 b.setTranslation({x:0,y:.6+seed%5*.2,z:0},true);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),true);b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
 for(let n=0;n<1440&&!b.isSleeping();n++){W.step(1/120);if(n%120===119)trace.push({variant,seed,t:(n+1)/120,p:b.translation(),v:b.linvel(),w:b.angvel(),q:b.rotation(),sleep:b.isSleeping()});}
}
note('rack party compound contacts',JSON.stringify(trace));
