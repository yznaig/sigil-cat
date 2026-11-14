// Fix round A (playtest-2), "nothing gets lost or stuck": a body taken out of the room leaves nothing behind.
// In this Rapier build (0.19.3) a body disabled while awake kept its colliders in the room, an invisible block where it
// was. world.disable() (and every body.setEnabled(false), which goes through it) clears the colliders' groups.
// Each case drops the flour (or the pail) where the other body was and asserts it lands on the floor.
cat.auto=false;const W=site.world,C=E.box.recipe;
for(const id of ['box','flour','bucket']){const i=keepsakes.give(id);await i.worldTask;}
await until(()=>!W.stats.listening,12000);
const B=id=>keepsakes.get(id).worldEntry;
W.cat?.suspend('world-disable',true);
// Everything else out of the way, far off the page (taken back by hand below, not by the off-page return).
const others=[...W.entries.values()].filter(e=>!['box','flour','bucket'].includes(e.id)&&!e.fixed&&!e.support);
for(const e of others){W.park(e);e.body.setTranslation({x:9,y:.3,z:-8},false);}
const step=n=>{for(let k=0;k<n;k++)W.step(1/120);};
const place=(e,p,v={x:0,y:-1,z:0})=>{W.cancelReturn(e);site.supports.detach(e,{wake:false});e.body.setTranslation(p,true);e.body.setRotation({x:0,y:0,z:0,w:1},true);e.body.setLinvel(v,true);e.body.setAngvel({x:0,y:0,z:0},true);W.wake(e);};
const at=stage.onFloor(stage.width*.5,site.worldLayout.floorY()-30),spot={x:at.x,z:at.z};
// The lowest point of a body's colliders above the floor (units).
const lowest=e=>{const i=keepsakes.get(e.id),q=new site.THREE.Quaternion().copy(e.body.rotation()),p=e.body.translation();return Math.min(...i.colliderVertices.map(v=>v.clone().applyQuaternion(q).y))+p.y;};
const drop=e=>{place(e,{...spot,y:1.2});let n=0;for(;n<960&&!e.body.isSleeping();n++)step(1);return lowest(e);};
const fl=B('flour'),bx=B('box'),bk=B('bucket');
// The box falling, caught in mid-air, then taken out of the room.
const midAir=how=>{place(bx,{...spot,y:.5});step(20);const y=bx.body.translation().y;how(bx);return y;};
bk.body.setEnabled(false);
{const y=midAir(e=>W.disable(e));const low=drop(fl);
 check('disable: a box taken out of the room in mid-air does not hold up the flour',low<.01&&!bx.body.isEnabled(),JSON.stringify({boxWasAt:+y.toFixed(3),flourLowest:+low.toFixed(4)}));}
{bx.body.setEnabled(true);const y=midAir(e=>e.body.setEnabled(false));const low=drop(fl);
 check('disable: a plain body.setEnabled(false) goes the same way',low<.01,JSON.stringify({boxWasAt:+y.toFixed(3),flourLowest:+low.toFixed(4)}));}
// Back in the room it meets things again: resting at the spot, the flour lands on it.
{fl.body.setEnabled(false);bx.body.setEnabled(true);place(bx,{...spot,y:.3});let n=0;for(;n<960&&!bx.body.isSleeping();n++)step(1);
 fl.body.setEnabled(true);const low=drop(fl);
 check('disable: enabled again, the box is solid again',low>.1,JSON.stringify({flourLowest:+low.toFixed(4)}));}
// A moving item put into the chest (the chest screen's own move: inventory slot to chest slot).
{place(bx,{x:spot.x+3,y:.3,z:spot.z-3});step(240);fl.body.setEnabled(true);place(fl,{...spot,y:.5});step(20);
 C.inventory();const id='flour',slot=C.state.chest.findIndex(e=>!e);const moved=await C.move({kind:'inv',i:C.state.inv[id]},{kind:'chest',i:slot});
 await C.screen.close();
 bk.body.setEnabled(true);const low=drop(bk);
 check('disable: a moving item put in the chest leaves nothing behind',moved&&!keepsakes.has(id)&&low<.01,JSON.stringify({moved,inRoom:keepsakes.has(id),pailLowest:+low.toFixed(4)}));}
W.cat?.suspend('world-disable',false);
