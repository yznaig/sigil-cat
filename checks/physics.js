// Converted solids use the actual Y=0 floor. The old upright DOM-box/squash
// assertions are superseded by the hollow container and its 100-seed unit gate.
cat.auto=false;const W=site.world,T=site.THREE;
const floor=()=>site.worldLayout.floorY();
const t=keepsakes.give('box');await t.worldTask;const e=t.worldEntry,b=e.body;
const advance=n=>{const hooks=[...W.entries.values()].map(e=>[e,e.sync]);hooks.forEach(([e])=>e.sync=null);for(let k=0;k<n;k++)W.step(1/120);hooks.forEach(([e,s])=>{e.sync=s;W.sync(e);});};
function onFloor(i){const e=i.worldEntry,q=new T.Quaternion().copy(e.body.rotation()),p=new T.Vector3().copy(e.body.translation()),v=i.colliderVertices.map(v=>v.clone().applyQuaternion(q).add(p)).sort((a,b)=>a.y-b.y)[0],a=stage.toScreen(v),f=stage.toScreen(new T.Vector3(v.x,0,v.z));return Math.hypot(a.x-f.x,a.y-f.y)<=2;}
let falls=true,rests=true;
site.world.cat?.suspend('fixture',true); // the box's release spot is in front of where the cat floats (cat-body.js)
for(const height of [.35,.75,1.2]){
 const p=site.worldLayout.anchor(stage.width*.45,floor());p.y=height;b.setTranslation(p,false);b.setRotation({x:0,y:0,z:0,w:1},false);b.setLinvel({x:0,y:0,z:0},false);b.setAngvel({x:0,y:0,z:0},false);W.wake(e);advance(12);falls&&=b.translation().y<height-.02;advance(948);rests&&=b.isSleeping()&&onFloor(t);
}
check('physics three release heights fall and settle on one 3D floor',falls&&rests);site.world.cat?.suspend('fixture',false);
const rest={...b.translation()},steps=W.stats.steps;await sleep(1100);
check('physics rests within half a pixel without recurring solver work',Math.hypot(...['x','y','z'].map(k=>b.translation()[k]-rest[k]))*stage.pxPerUnit(new T.Vector3().copy(rest))<.5&&W.stats.steps===steps&&!W.stats.listening);
// An actual off-centre native hold keeps its spherical pivot and cancels cleanly.
const point=t.object.localToWorld(new T.Vector3(.25*t.chainScale,.18*t.chainScale,.23*t.chainScale)),s=stage.toScreen(point),id=++pointerIds;
fire('pointerdown',s.x,s.y,id);await sleep(260);const held=W.held?.entry===e;fire('pointermove',s.x-30,s.y-50,id);await sleep(100);fire('pointercancel',s.x-30,s.y-50,id,0);
check('physics box native hold and cancel use one weighted grip',held&&!W.held);advance(960);
// A lost free prop returns with its original identity instead of becoming unreachable.
b.setTranslation({x:9,y:.1,z:1},false);W.wake(e);W.sync(e);const handle=b.handle;
check('physics offscreen box schedules recovery',!!e.timer);
await until(()=>!e.timer,7000);advance(960);
check('physics recovered box remains reachable on the floor',e.body.handle===handle&&onFloor(t)&&t.box.x<stage.width-16&&t.box.x+t.box.w>16);
await __shot('physics-rest');
keepsakes.take('box');
let materials=true;
for(const id of ['paper','pat','tin']){
 const i=keepsakes.give(id);await i.worldTask;site.supports.detach(i.worldEntry);const p=site.worldLayout.anchor(stage.width*.3,floor());p.y=.8;i.worldEntry.body.setTranslation(p,false);W.wake(i.worldEntry);advance(960);
 materials&&=i.worldEntry.body.isSleeping()&&onFloor(i);
 if(id==='paper')materials&&=Math.abs(new T.Vector3(0,0,1).applyQuaternion(i.object.quaternion).y)>.9;
 if(id==='pat')materials&&=i.worldEntry.body.collider(0).restitution()<=.031;
 keepsakes.take(id);
}
check('physics paper broad face and butter soft contact remain',materials);
const row=[];for(const [id,x]of [['box',.72],['paper',.25],['tin',.44]]){const i=keepsakes.give(id);await i.worldTask;i.moveWorld({x:stage.width*x,y:floor()});row.push(i);}advance(960);
await __shot('physics-floor-row');
const oldTop=stage.insets.top,oldBottom=stage.insets.bottom;stage.setInsets(oldTop+30,oldBottom+40);const resized=row.every(onFloor);stage.setInsets(oldTop,oldBottom);
check('physics layout preserves actual floor contact',resized&&row.every(onFloor));
for(const i of row)W.save(i.worldEntry);sessionStorage.setItem('physics.rest',JSON.stringify(row.map(i=>({id:i.id,x:i.x,y:i.y}))));
store.set('keepsakes.ticket',{x:-.2,y:1.1,state:{}});store.flush();
