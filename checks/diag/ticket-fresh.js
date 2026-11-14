// Fresh-body control complements the 100 reused-body production seeds.
cat.auto=false;const W=site.world,T=site.THREE,i=keepsakes.give('ticket');await i.worldTask;
for(const e of W.entries.values()){W.park(e);e.body.setEnabled(false);}
const rows=[];
for(let seed=0;seed<100;seed++){
 const e=await W.add({id:'fresh-ticket-'+seed,object:new T.Group(),shapes:i.colliderShapes,mass:i.cardDimensions.mass,position:{x:0,y:.6+seed%5*.2,z:0},rotation:new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27)),beforeStep:i.worldEntry.beforeStep,material:{linearDamping:.35,angularDamping:3,friction:.8,restitution:.02,skin:.001,softCcdPrediction:.03}});
 e.body.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);e.body.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);
 let n=0;for(;n<480&&!e.body.isSleeping();n++)W.step(1/120);
 rows.push({seed,seconds:n/120,sleeping:e.body.isSleeping(),up:Math.abs(new T.Vector3(0,0,1).applyQuaternion(e.body.rotation()).y)});W.remove(e.id);
}
check('ticket fresh-body 100 seeds lie flat <=4s',rows.every(r=>r.sleeping&&r.up>.9),JSON.stringify({worstSeconds:Math.max(...rows.map(r=>r.seconds)),minUp:Math.min(...rows.map(r=>r.up)),failed:rows.filter(r=>!r.sleeping||r.up<=.9)}));
note('ticket fresh-body rows',JSON.stringify(rows));
