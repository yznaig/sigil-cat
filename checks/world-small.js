cat.auto=false;cat.setYaw(0);
const W=site.world,S=site.supports,T=site.THREE;
// Playtest 2: the star is a 2D sticker now, not a body (checks/gags-stickers.js).
const items=['crumbs','shards','eyes'].map(id=>keepsakes.give(id));
await Promise.all(items.map(i=>i.worldTask));
for(const i of items)check('small '+i.id+' prepared body',i.worldReady&&i.physical&&!i.el.firstChild&&i.colliderShapes.length===(i.id==='eyes'?2:3),i.worldError||JSON.stringify({mass:i.worldEntry?.body.mass(),colliders:i.colliderShapes?.length}));
if(items.some(i=>!i.worldReady))throw Error('Small adapter construction failed');
const [crumbs,shards,eyes]=items,identity=eyes.worldEntry.body.handle;
await until(()=>!W.active,12000);
await __shot('world-small-floor');
check('small eye cat attach',site.eyesWorld.stick('cat')&&eyes.picture.attached&&eyes.worldEntry.body.handle===identity&&eyes.state.on==='cat');
hover(stage.width*.8,stage.height*.25);await until(()=>!site.eyesWorld.pupilsActive,1000);
check('small pupils settle without a callback',!site.eyesWorld.pupilsActive);
await __shot('world-small-eyes-cat');
cat.setYaw(Math.PI);await sleep(350);
check('small eyes hide behind cat',!eyes.smallArt.visible);await __shot('world-small-eyes-away');
cat.setYaw(0);await sleep(200);
await E.bread.whenReady();E.bread.now();await E.bread.whenBread();await sleep(300);
check('small eyes follow bread in cat picture',!!cat.standIn&&eyes.picture.attached&&eyes.state.on==='cat');await __shot('world-small-eyes-bread');
E.bread.toCat();await sleep(300);
check('small eye detach one identity',site.eyesWorld.detach()&&!site.eyesWorld.detach()&&eyes.worldEntry.body.handle===identity&&!eyes.picture.attached&&eyes.state.on===null);
await until(()=>!W.active,12000);
for(const i of [crumbs,shards]){const e=i.worldEntry,y=e.body.translation().y;i.def.tap(i);const up=e.body.linvel().y;let peak=y;for(let n=0;n<16;n++){W.step(1/120);peak=Math.max(peak,e.body.translation().y);}await until(()=>e.body.isSleeping(),5000);check('small '+i.id+' tap is physical',stage.reducedMotion||up>.2&&peak>y+.001,JSON.stringify({up,peak,y}));}
check('small bodies sleep after hop',await until(()=>!W.active,12000));
// Playtest 2 (furniture lane, Aaron's word): only he and the Platinum Cat badge take the eyes. The cloud and the box
// refuse them and are left exactly as they were (the badge is checked in world-small-lifecycle.js).
const cloud=keepsakes.give('cloud');await sleep(200);
const cloudMaterial=cloud.object.material,cloudGeometry=cloud.object.geometry;
check('small eyes refuse the cloud, which is unchanged',!site.eyesWorld.stick('cloud')&&eyes.state.on===null&&!eyes.worldEntry.support&&cloud.object.material===cloudMaterial&&cloud.object.geometry===cloudGeometry);
await sleep(300);await __shot('world-small-eyes-cloud');
const box=keepsakes.give('box');await sleep(300);check('small eyes refuse the box',!site.eyesWorld.stick('box')&&eyes.state.on===null&&!eyes.worldEntry.support);
keepsakes.take('box');await until(()=>!W.active,12000);
// Physical grip through the production picker, then cancellation leaves no joint.
site.eyesWorld.stick('cat');await sleep(80);S.refreshAttachments();
const p=stage.toScreen(eyes.object.localToWorld(new T.Vector3(-.055*eyes.artScale,0,.015*eyes.artScale))),pid=++pointerIds;
fire('pointerdown',p.x,p.y,pid);fire('pointermove',p.x+40,p.y+35,pid);await sleep(160);
check('small native off-centre eye grip',W.held?.entry===eyes.worldEntry&&W.held.local.length()>.005&&!eyes.worldEntry.support);
await __shot('world-small-eyes-grip');fire('pointercancel',p.x+40,p.y+35,pid,0);
check('small eye cancel clears joint',!W.held&&W.physics.impulseJoints.len()===0);
await until(()=>!W.active,12000);
// Cup uses the actual shell and hands over only once, retaining existing rewards.
const shardsHandle=shards.worldEntry.body.handle;const show=E.glass.show();
await until(()=>E.glass.cup?.mode==='choreographed');await sleep(400);
check('small cup is hollow 3D shell',E.glass.cup?.entry.body.numColliders()===9&&E.glass.cup.root.geometry.attributes.position.count>1000);
await __shot('world-small-cup-rim');
await fast(8,()=>show);await until(()=>!W.active,12000);
check('small cup atomic break',E.glass.breaks===1&&E.glass.cup.stats.handoffs===1&&!W.entries.has('glass')&&keepsakes.has('puddle')&&shards.worldEntry.body.handle===shardsHandle);
const patch=JSON.stringify(keepsakes.get('puddle').state.floor);
check('small repeated finish rejected',!E.glass.cup.finish());
await fast(8,()=>E.glass.show());
check('small repeated cast retains single shards and puddle',E.glass.breaks===2&&shards.worldEntry.body.handle===shardsHandle&&JSON.stringify(keepsakes.get('puddle').state.floor)===patch);
await __shot('world-small-break');
site.eyesWorld.stick('cat');await sleep(400);
await until(()=>!W.active,12000);
const snapshot=()=>({dpr:stage.dpr,steps:W.stats.steps,syncs:W.stats.syncs,shadow:site.worldLayout.stats.shadowUpdates,pupils:site.eyesWorld.stats.pupilFrames,support:S.stats.frames,pictures:items.map(i=>i.picture.stats.draws),callbacks:stage.onFrame.length});
const before=snapshot();await sleep(2100);
check('small settled zero world work',JSON.stringify(before)===JSON.stringify(snapshot())&&!W.stats.listening&&!site.eyesWorld.pupilsActive&&!site.skyItems.glinting,JSON.stringify({before,after:snapshot()}));
store.set('smallCheck',items.map(i=>({id:i.id,box:{...i.box},p:i.object.position.toArray(),q:i.object.quaternion.toArray(),support:i.worldEntry.support})));store.flush();
