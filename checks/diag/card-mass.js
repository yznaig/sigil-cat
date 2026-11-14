cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const cards=['paper','postcard','ticket'].map(id=>keepsakes.give(id));await Promise.all(cards.map(i=>i.worldTask));await sleep(2000);
for(let n=0;n<120;n++)W.step(1/120);
const e=cards[2].worldEntry,b=e.body;
function state(){const v=b.linvel(),w=new T.Vector3().copy(b.angvel()).applyQuaternion(new T.Quaternion().copy(b.rotation()).invert()).applyQuaternion(new T.Quaternion().copy(b.principalInertiaLocalFrame()).invert()),I=b.principalInertia(),p=b.translation();return {mass:b.mass(),position:{...p},linear:{...v},angularLocal:w.toArray(),inertia:{...I},energy:b.mass()*(9.81*p.y+.5*(v.x*v.x+v.y*v.y+v.z*v.z))+.5*(I.x*w.x*w.x+I.y*w.y*w.y+I.z*w.z*w.z)};}
const fixed=state();S.detach(e,{wake:false});b.setTranslation({x:0,y:.6,z:0},false);b.setRotation(new T.Quaternion(),false);b.setLinvel({x:-.9,y:-2,z:0},false);b.setAngvel({x:-2,y:-3,z:2},false);W.wake(e);
const before=state();W.step(1/120);const after=state();
const data={fixed,before,after,difference:after.energy-before.energy};note('card fixed-to-dynamic mass diagnostic',JSON.stringify(data));
store.set('cardMassDiagnostic',data);
