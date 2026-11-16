cat.auto=false;
await fast(8,()=>E.glass.show());
const fragments=keepsakes.get('shards');await fragments.worldTask;
const fragmentSteps=site.world.stats.steps;
check('water physical fragments finish their break drop',await until(()=>fragments.worldEntry.body.isSleeping(),90000),JSON.stringify({simulatedSeconds:(site.world.stats.steps-fragmentSteps)/120}));
const pool=keepsakes.get('puddle');
check('water glass leaves fixed inert patch',!!pool&&pool.def.fixed&&pool.def.inert);
const patch=[...pool.state.floor];
await drag([{x:pool.px.x,y:pool.px.y},{x:pool.px.x+50,y:pool.px.y-40}],30);
check('water drag cannot move patch',JSON.stringify(pool.state.floor)===JSON.stringify(patch));
await __shot('world-unit4-break');
const top=keepsakes.give('top');await top.worldTask;
const e=top.worldEntry,b=e.body,W=site.world,T=site.THREE,C=site.worldProps.charged;
function put(x,z){b.setTranslation({x,y:.003,z},false);b.setRotation({x:0,y:0,z:0,w:1},false);b.setLinvel({x:0,y:0,z:0},false);b.setAngvel({x:0,y:0,z:0},false);W.park(e);W.sync(e);}
put(patch[0]+patch[2]*2,patch[1]);
await fast(8,()=>site.cast('zigzag'));
check('water outside top is not charged and shock retained',!C.active&&!!E.bolt.lastVia);
await __shot('world-unit4-outside');
put(patch[0],patch[1]);
await fast(8,()=>site.cast('zigzag'));
check('water inside top charged',C.active&&top.state.charged);
await __shot(stage.reducedMotion?'world-unit4-reduced':'world-unit4-charged');
const orientation=top.object.quaternion.clone();
// Let every woken body settle before isolating the charged top's no-step observation.
// (Wet strikes no longer award a bulb: e1111-35, checks/bulb.js.)
await until(()=>!W.stats.listening,8000);
const start=C.stats.frames,p={...b.translation()},steps=W.stats.steps;
await sleep(stage.reducedMotion?1200:30000);
check('water supported spin lasts 30s or is static when reduced',C.active&&(stage.reducedMotion?C.stats.frames===start:C.stats.frames>start+30)&&Math.hypot(b.translation().x-p.x,b.translation().z-p.z)<1e-6&&W.stats.steps===steps,JSON.stringify({frames:C.stats.frames-start,steps:W.stats.steps-steps}));
// The rotor's angle is 20 rad/s times the game clock, mod a full turn: after 30 s it can by chance come back within
// .05 rad of where it started (about 1 run in 60; suite on p3-final, phone). So the turn is also sampled over a few
// short gaps after the 30 s: with motion one of the steps must show a turn; calm, none may.
const rotorQs=[orientation,top.object.quaternion.clone()];for(let i=0;i<2;i++){await sleep(70);rotorQs.push(top.object.quaternion.clone());}
const rotorSteps=rotorQs.slice(1).map((q,i)=>rotorQs[i].angleTo(q));
check('water visual rotor changes only with motion enabled',stage.reducedMotion?rotorSteps.every(a=>a<1e-6):rotorSteps.some(a=>a>.05),JSON.stringify(rotorSteps.map(a=>+a.toFixed(3))));
const desc=Object.getOwnPropertyDescriptor(document,'hidden');
Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
const hiddenFrames=C.stats.frames;await sleep(500);
check('water hidden tab stops rotor work',!C.listening&&C.stats.frames===hiddenFrames);
if(desc)Object.defineProperty(document,'hidden',desc);else delete document.hidden;
document.dispatchEvent(new Event('visibilitychange'));await sleep(100);
check('water visible resumes unless reduced',stage.reducedMotion?!C.listening:C.listening);
W.grab(e,new T.Vector3().copy(b.translation()).add(new T.Vector3(0,.1,0)));
check('water pickup releases support and charge',!C.active&&!top.state.charged&&b.isDynamic());W.release();
put(patch[0],patch[1]);C.charge(top);store.set('waterCheck',patch);store.flush();
