// Unit 7 production shapes, actual input and attachment lifecycle.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE,R=site.rack;
// All four pegs filled (playtest 2: the party hat is the cake's; this fixture grants all four to test the rack itself).
await R.ready({grant:E.hat.hats});await sleep(1800);
// e1111-37: unlocked here, so it dropped in (checks/world-rack-drop.js covers the motion) and rests exactly at its place.
check('rack arrived by dropping in, resting at its place',R.arrival?.mode==='drop'&&R.arrival.done&&R.arrival.impacts.length===4&&R.picture.card.position.distanceTo(new T.Vector3().setFromMatrixPosition(R.root.matrixWorld))<1e-9,JSON.stringify(R.arrival?.impacts));
const hats=E.hat.hats.map(n=>R.hats.get(n));
const assets=performance.getEntriesByType('resource').filter(e=>/assets\/models\/prepared\/(rack|hats|core)\.js/.test(e.name));
check('rack prepared art loads after visible cat',assets.length>=2&&assets.every(e=>e.startTime>=site.timing.shown),JSON.stringify({shown:site.timing.shown,assets:assets.map(e=>({url:e.name,start:e.startTime,bytes:e.encodedBodySize}))}));
check('rack fixed four permanent named pegs',R.entry.fixed&&R.slots.length===4&&new Set(R.slots.map(s=>s.id)).size===4&&R.slots.every(s=>s.occupant==='rack/'+s.id));
check('rack shaped pixel hats single physical identities',hats.every(i=>i.worldReady&&i.hatArt.isMesh&&i.hatArt.geometry.groups.length>=2&&i.worldEntry.presentation===i.picture&&!i.el.firstChild)&&hats.length===4);
const shadowMatches=i=>{const mesh=R.root.getObjectByName('rack-shadow/'+i.id),pair=site.worldLayout.shadows.get('rack')?.pairs.find(([o])=>o===mesh);return !!mesh&&!!pair&&mesh.geometry===i.hatArt?.geometry&&mesh.matrix.equals(i.picture.visual.matrix)&&pair[1].uniforms.sourceMatrix.value.equals(mesh.matrixWorld);};
check('rack every pegged hat casts its matching floor shadow',hats.every(shadowMatches));
check('rack bottom left and clear of pet stroke',R.picture.rect.x>=0&&R.picture.rect.x+R.picture.rect.w<catMid().x&&R.picture.rect.y+R.picture.rect.h<=stage.height-stage.insets.bottom-24,JSON.stringify(R.picture.rect));
check('rack has no button row (e1111-58 note 6)',!R.ui&&!document.querySelector('.world-rack-actions'));
const fixed=R.root.position.clone();W.grab(R.entry,R.root.position);check('rack cannot be gripped',!W.held&&R.root.position.equals(fixed));
await __shot('world-unit7-pegs');
await cat.ensureButter();cat.setButter(true,'quiet');
for(const name of E.hat.hats){
 await E.hat.wear(name);await sleep(150);
 // e1111-58: the butter is on (above) and goes under the hat, which rests on it .0735 higher.
 const i=R.hats.get(name),h=i.hatArt.geometry.boundingBox.max.y-.025+.0735;
 check('rack '+name+' worn once with true crown offset',E.hat.wearing===name&&i.worldEntry.support?.id==='cat-hat'&&!R.slots.find(s=>s.id===name).occupant&&i.picture.visual.parent===cat.seat&&Math.abs(S.crownHeight-h)<.002&&cat.butterSlot.position.y===0&&Math.abs(i.worldEntry.support.position[1]-(.0735-.025))<1e-6,`height=${h} lift=${S.crownHeight}`);
 check('rack '+name+' leaves no shadow on its empty peg',!R.root.getObjectByName('rack-shadow/'+i.id)&&!site.worldLayout.shadows.get('rack').pairs.some(([o])=>o.name==='rack-shadow/'+i.id));
 await __shot('world-unit7-worn-'+name);
 for(const pose of ['lie','sleep','stretch','sit']){cat.request(pose);check('rack '+name+' follows '+pose,await until(()=>cat.pose===pose&&!cat.popping,10000)&&i.picture.visual.parent===cat.seat&&cat.butterSlot.position.y===0&&Math.abs(S.crownHeight-h)<.002);}
 await __shot('world-unit7-butter-'+name);
}
await E.hat.wear(null);
const first=hats[0].worldEntry,identity=first.body.handle;
S.detach(first,{wake:false});S.mount(first,'rack','wizard');let swing=0;await until(()=>{swing=Math.max(swing,first.object.quaternion.angleTo(S.pose('rack','wizard').q));return !S.active;},2100,10);
check('rack peg sway <=8 degrees ends in 2s',swing<=8*Math.PI/180&&!S.active&&!S.listening,`degrees=${swing*180/Math.PI}`);
await sleep(80);check('rack shadow follows the completed peg sway',shadowMatches(hats[0]));
const support=JSON.stringify(first.support);check('rack named peg refuses wrong hat atomically',!S.mount(first,'rack','cone')&&JSON.stringify(first.support)===support);
// Actual mouse/touch routing. Find a point on the rendered shape, then lift at
// an off-centre surface point; a supported tap alone must not detach it.
function hitFor(e){const b=e.presentation.rect;for(let y=b.y+5;y<b.y+b.h-4;y+=4)for(let x=b.x+5;x<b.x+b.w-4;x+=4){const hit=site.worldInput.pick({clientX:x,clientY:y});if(hit?.entry===e)return {x,y,point:hit.point};}return null;}
for(const i of hats){
 const e=i.worldEntry,hit=hitFor(e);check('rack '+i.id+' has visible pick surface',!!hit);if(!hit)continue;
 const pid=++pointerIds;fire('pointerdown',hit.x,hit.y,pid);check('rack supported tap preserves peg',!!e.support&&!W.held);
 fire('pointermove',hit.x+25,hit.y-20,pid);await sleep(550);
 const grip=W.held,at=grip?e.object.localToWorld(grip.local.clone()):null,a=at&&stage.toScreen(at),b=grip&&stage.toScreen(grip.target),error=grip?Math.hypot(a.x-b.x,a.y-b.y):Infinity;
 check('rack '+i.id+' off-centre grip <=4px',grip?.entry===e&&!e.support&&error<=4,`error=${error}`);await __shot('world-unit7-grip-'+i.id.split('/')[1]);
 fire('pointercancel',hit.x+25,hit.y-20,pid,0);check('rack cancel leaves no joint',!W.held&&W.physics.impulseJoints.len()===0);await R.hang(i.id.split('/')[1],false);
 // Browser-native route in addition to the pointer ownership assertions.
 const native=hitFor(e);if(native){const detaches=S.stats.detaches;await __pointer([native,{x:native.x+18,y:native.y+12},{x:native.x+35,y:native.y+22}]);check('rack native '+KIND+' lifts and releases hat',S.stats.detaches>detaches&&!W.held,JSON.stringify({detaches:S.stats.detaches-detaches,support:e.support}));await R.hang(i.id.split('/')[1],false);}
 i.key.querySelector('button').focus();await __key('ArrowUp');check('rack native keyboard lifts',W.held?.entry===e);await __key('Escape');check('rack keyboard escape releases',!W.held&&W.physics.impulseJoints.len()===0);await R.hang(i.id.split('/')[1],false);
}
document.activeElement?.blur();
// e1111-35: a wet bolt keeps unit 4's result but no longer awards a bulb (the first drawn sigil does; checks/bulb.js).
// The fixture award gives one charged bulb, once, and grows the lampshade on the standing rack.
await fast(8,()=>E.glass.show());await fast(8,()=>site.cast('zigzag'));
check('rack wet bolt retains shock and awards no bulb',!keepsakes.has('bulb')&&E.bolt.lastVia);
check('rack lamp fixture awards one charged bulb under a lampshade',await site.lamp.award()&&keepsakes.has('bulb')&&!!site.lamp.shade&&site.lamp.stage==='lit'&&store.get('lamp.unlocked'));
const bulb=site.lamp.inst,bulbHandle=bulb.worldEntry.body.handle;await fast(8,()=>site.cast('zigzag'));
check('rack repeated wet bolt never duplicates bulb',bulb.worldEntry.body.handle===bulbHandle&&[...W.entries.keys()].filter(id=>id==='bulb').length===1);
await until(()=>bulb.worldEntry.body.isSleeping(),8000);await __shot('world-unit7-bulb-loose');
check('rack bulb-only socket refuses hat',!S.mount(first,'rack-lamp','socket')&&first.support.id==='rack');
await site.lamp.use();await sleep(350);
check('rack socket glows warm without shadow light',site.lamp.occupied&&site.lamp.on&&site.lamp.light.visible&&!site.lamp.light.castShadow&&bulb.art.visual.material.some(m=>m.name==='lamp-filament'&&m.emissiveIntensity===3));
check('rack socketed bulb joins the furniture shadow',R.root.getObjectByName('rack-shadow/bulb')?.geometry===bulb.art.visual.geometry);
await __shot('world-unit7-warm');
const small=[...hats,bulb],reports=[];
// 100 fresh production bodies avoid teleporting stale contact manifolds. The
// repeated real-lift check below separately exercises one persistent identity. Adapter
// picture cost is measured in world-rack-cost; physics here never fakes sleep.
for(const i of small){
 const original=i.worldEntry;let e=original,b=e.body;S.detach(e,{wake:false});for(const other of W.entries.values())if(other!==e)other.body.setEnabled(false);
 const sync=e.sync;e.sync=null;W.step(1/120);const positions=i.art.visual.geometry.attributes.position,local=[];
 for(let n=0;n<positions.count;n++)local.push(new T.Vector3().fromBufferAttribute(positions,n));
 // Collapse duplicate triangle vertices once, then project the actual surface
 // onto world Y each fixed step. Transient penetration is reported, not gated.
 const unique=[...new Map(local.map(v=>[v.toArray().join(','),v])).values()];
 let worst=0,gap=0,minY=Infinity,minVisibleY=0,maxDipSteps=0,maxGain=0;const failed=[];
 const dipMatrix=new T.Matrix4(),dipQ=new T.Quaternion();
 function visibleLow(){dipMatrix.makeRotationFromQuaternion(dipQ.copy(b.rotation()));const m=dipMatrix.elements;let y=Infinity;for(const v of unique)y=Math.min(y,m[1]*v.x+m[5]*v.y+m[9]*v.z);return y+b.translation().y;}
 const energy=()=>{const p=b.translation(),v=b.linvel(),w=new T.Vector3().copy(b.angvel()).applyQuaternion(new T.Quaternion().copy(b.rotation()).invert()).applyQuaternion(new T.Quaternion().copy(b.principalInertiaLocalFrame()).invert()),I=b.principalInertia();return b.mass()*(9.81*p.y+.5*(v.x*v.x+v.y*v.y+v.z*v.z))+.5*(I.x*w.x*w.x+I.y*w.y*w.y+I.z*w.z*w.z);};
 site.world.cat?.suspend('fixture',true); // isolated drops where the cat floats (cat-body.js)
 for(let seed=0;seed<100;seed++){
  original.body.setEnabled(false);e=await W.add({id:'rack-drop-fixture',object:new T.Group(),shapes:i.colliderShapes,mass:i.mass,material:i.physicsMaterial,position:new T.Vector3(0,.6+seed%5*.2,0),rotation:new T.Quaternion().setFromEuler(new T.Euler(seed*.73,seed*.41,seed*.27))});b=e.body;b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(e);
  let n=0,last=energy(),dipSteps=0;for(;n<960&&!b.isSleeping();n++){W.step(1/120);const now=energy();maxGain=Math.max(maxGain,now-last);last=now;minY=Math.min(minY,b.translation().y);const low=visibleLow();minVisibleY=Math.min(minVisibleY,low);dipSteps=low<0?dipSteps+1:0;maxDipSteps=Math.max(maxDipSteps,dipSteps);}
  if(!b.isSleeping())failed.push(seed);worst=Math.max(worst,n/120);
  const q=new T.Quaternion().copy(b.rotation()),p=new T.Vector3().copy(b.translation()),low=local.map(v=>v.clone().applyQuaternion(q).add(p)).sort((a,b)=>a.y-b.y)[0],a=stage.toScreen(low),f=stage.toScreen(new T.Vector3(low.x,0,low.z));gap=Math.max(gap,Math.hypot(a.x-f.x,a.y-f.y));W.remove(e.id);
 }
 e=original;b=e.body;e.sync=sync;reports.push({id:i.id,failed,worstSeconds:worst,restGapPx:gap,maxEnergyGain:maxGain,minBodyY:minY,transientVisibleDip:{depthWorldUnits:-minVisibleY,longestSeconds:maxDipSteps/120}});
 check('rack '+i.id+' 100 drops sleep <=8s gap <=2px no energy growth',!failed.length&&gap<=2&&maxGain<.01,JSON.stringify(reports.at(-1)));
 for(const other of W.entries.values())other.body.setEnabled(true);
 if(i===bulb)S.mount(e,'rack-lamp','socket',{animate:false});else await R.hang(i.id.split('/')[1],false);
 // Inspect the actual back and underside at page scale, using the one body.
 S.detach(e,{wake:false});W.park(e);b.setTranslation(stage.onWall(stage.width*.65,stage.height*.57,0),false);b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(.7,Math.PI,.4)),false);W.sync(e);await __shot('world-unit7-back-'+i.id.replace('rack/',''));
 b.setRotation(new T.Quaternion().setFromEuler(new T.Euler(-1.35,.6,.2)),false);W.sync(e);await __shot('world-unit7-underside-'+i.id.replace('rack/',''));
 if(i===bulb)S.mount(e,'rack-lamp','socket',{animate:false});else await R.hang(i.id.split('/')[1],false);
}
// Real repeated handling never teleports the body or changes its orientation.
const repeated=R.hats.get('party').worldEntry;S.detach(repeated,{wake:false});for(const other of W.entries.values())if(other!==repeated)other.body.setEnabled(false);
const repeatSync=repeated.sync;repeated.sync=null;let repeatWorst=0;const repeatFailed=[];W.step(1/120);
for(let seed=0;seed<100;seed++){
 const b=repeated.body,p=new T.Vector3().copy(b.translation());W.grab(repeated,p.clone().add(new T.Vector3(.02,.04,0)));const target=p.clone();target.y=1;
 for(let n=0;n<120;n++){W.move(target);W.step(1/120);}W.release();b.setLinvel({x:(seed%7-3)*.3,y:-2,z:0},true);b.setAngvel({x:seed%5-2,y:seed%7-3,z:2},true);W.wake(repeated);
 let n=0;for(;n<960&&!b.isSleeping();n++)W.step(1/120);if(!b.isSleeping())repeatFailed.push(seed);repeatWorst=Math.max(repeatWorst,n/120);
}
repeated.sync=repeatSync;for(const other of W.entries.values())other.body.setEnabled(true);await R.hang('party',false);
check('rack party 100 continuous physical lifts sleep <=8s',!repeatFailed.length,JSON.stringify({failed:repeatFailed,worstSeconds:repeatWorst,identity:repeated.body.handle}));
check('rack transfer preserves original identity',first.body.handle===identity);
await E.hat.wear('party');await sleep(2300);
const snapshot=()=>({steps:W.stats.steps,syncs:W.stats.syncs,shadows:site.worldLayout.stats.shadowUpdates,frames:S.stats.frames,rack:R.picture.stats.draws,pictures:small.map(i=>i.picture.stats.draws),uploads:small.flatMap(i=>i.art.visual.material.flatMap(m=>m.map?[m.map.version]:[])),atlas:site.meshPictures.stats.passes,callbacks:stage.onFrame.length});
for(const on of [true,false]){site.lamp.setOn(on);await sleep(250);const quiet=snapshot();await sleep(2100);check('rack '+(on?'lit':'unlit')+' zero ongoing world work',JSON.stringify(quiet)===JSON.stringify(snapshot())&&!W.stats.listening&&!S.listening,JSON.stringify({before:quiet,after:snapshot()}));}
site.lamp.setOn(true);await sleep(100);store.set('rackCheck',{hats:[...R.hats.keys()].sort(),reports,wearing:E.hat.wearing,on:site.lamp.on,items:small.map(i=>({id:i.id,p:i.object.position.toArray(),q:i.object.quaternion.toArray(),support:i.worldEntry.support}))});store.flush();await __shot('world-unit7-rest');
