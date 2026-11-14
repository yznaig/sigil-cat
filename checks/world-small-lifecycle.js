cat.auto=false;cat.setYaw(0);const W=site.world,S=site.supports,T=site.THREE;
const eyes=keepsakes.give('eyes'),star=keepsakes.give('twinkle');await Promise.all([eyes.worldTask,star.worldTask]);
const handle=eyes.worldEntry.body.handle,beforeRelease=site.eyesWorld.stats.releases;
await fast(8,()=>E.eyes.show());
// Playtest 2 (furniture lane): the eyes stay on him after the choir, and through pose changes, until taken off.
check('small choir leaves the pair on him',E.eyes.on==='cat'&&site.eyesWorld.stats.releases===beforeRelease&&eyes.worldEntry.body.handle===handle);
await until(()=>!W.active,12000);
site.eyesWorld.stick('cat');const poseRelease=site.eyesWorld.stats.releases;
const nextPose=cat.pose==='sit'?'lie':'sit';await cat.load(nextPose);cat.request(nextPose);await fast(8,()=>until(()=>cat.pose===nextPose&&cat.phase==='hold',20000));
check('small pose change keeps them on him',eyes.state.on==='cat'&&site.eyesWorld.stats.releases===poseRelease&&!eyes.worldEntry.body.collider(0).isEnabled(),JSON.stringify({on:eyes.state.on,releases:site.eyesWorld.stats.releases-poseRelease,pose:cat.pose}));
await until(()=>!W.active,12000);
site.eyesWorld.stick('cat');cat.setYaw(0);await sleep(200);S.refreshAttachments();
const target=stage.toScreen(eyes.object.localToWorld(new T.Vector3(-.055*eyes.artScale,0,.015*eyes.artScale)));
let nativeGrip=false;const priorDragging=eyes.worldEntry.dragging;
eyes.worldEntry.dragging=ev=>{priorDragging?.(ev);nativeGrip ||= W.held?.entry===eyes.worldEntry&&!eyes.worldEntry.support&&W.held.local.length()>.005;};
await __pointer([target,{x:target.x-20,y:target.y+20},{x:target.x-45,y:target.y+45}]);
eyes.worldEntry.dragging=priorDragging;
check('small browser mouse or touch grips actual eye geometry',nativeGrip&&!W.held);
site.eyesWorld.detach();await until(()=>!W.active,12000);
const lift=[...eyes.key.querySelectorAll('button')].find(b=>b.textContent.startsWith('Lift / place'));
lift.focus();await __key('Enter');check('small keyboard lift holds it in the hand (no joint, e1111-58)',W.held?.entry===eyes.worldEntry&&W.physics.impulseJoints.len()===0);
const actionBox=lift.getBoundingClientRect();check('small keyboard action is at least 44px',actionBox.width>=44&&actionBox.height>=44);
await __key('Shift+ArrowUp');await __key('Escape');check('small keyboard escape cleans grip',!W.held&&!W.physics.impulseJoints.len());document.activeElement.blur();
await until(()=>!W.active,12000);
// Playtest 2: only him and the Platinum Cat badge take the eyes. A prop, the box and Butterman refuse them.
const tin=keepsakes.give('tin');await tin.worldTask;await until(()=>!W.active,12000);
check('small eyes refuse a prop',!site.eyesWorld.stick('tin')&&!eyes.worldEntry.support);
const box=keepsakes.give('box');box.moveTo(.6,-.4);await sleep(200);
check('small eyes refuse the box',!site.eyesWorld.stick('box')&&!eyes.worldEntry.support);keepsakes.take('box');keepsakes.take('tin');
const {platinumBadge}=await import('/src/world/platinum.js'),badge=await platinumBadge(site).drop();await until(()=>badge.worldEntry?.body.isSleeping(),9000);
check('small eyes attach to the badge',site.eyesWorld.stick('platinum'));
const q=new T.Quaternion().setFromEuler(new T.Euler(-1.2,.35,.1));badge.worldEntry.body.setRotation(q,false);W.sync(badge.worldEntry);
check('small eyes inherit the badge\'s turn',eyes.object.quaternion.angleTo(q)<.001&&!eyes.worldEntry.body.collider(0).isEnabled());
await __shot('world-small-eyes-badge');
const badgeEyes=stage.toScreen(eyes.object.localToWorld(new T.Vector3(-.066*eyes.artScale,0,.015*eyes.artScale)));
check('small visible eyes win the badge\'s picking',site.worldInput.pick({clientX:badgeEyes.x,clientY:badgeEyes.y})?.entry===eyes.worldEntry);
const beforeRemove=site.eyesWorld.stats.releases;keepsakes.take('platinum');
check('small vanished host releases pair once',!eyes.worldEntry.support&&site.eyesWorld.stats.releases===beforeRemove+1);
await until(()=>!W.active,12000);
// Full cinematics intentionally conceal controls. The cameo is interactive.
const bm=E.butterman,K=bm.config.cameo,priorCameo={minGap:K.minGap,chancePerSecond:K.chancePerSecond},summoned=store.get(K.storageKey);
store.del(K.storageKey);K.minGap=-1;K.chancePerSecond=1e6;await until(()=>bm.state.cameos.active&&!!bm.headAttachment,4000);Object.assign(K,priorCameo);if(summoned)store.set(K.storageKey,summoned);
check('small no Butterman button and no eyes on Butterman',![...eyes.key.querySelectorAll('button')].some(b=>/Butterman/.test(b.textContent))&&!site.eyesWorld.stick('butterman'),JSON.stringify({on:eyes.state.on,head:!!bm.headAttachment}));
bm.stop();
await until(()=>!W.active,12000);
// Playtest 2 (gags lane): the star is a flat sticker above the room, not a body; its drag, tilt and layer are
// checked in gags-stickers.js. Here it only joins the hidden-page and resize lines.
site.eyesWorld.stick('cat');
hover(stage.width*.1,stage.height*.2);star.def.tap(star);
const hidden=Object.getOwnPropertyDescriptor(document,'hidden');Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
const snap={steps:W.stats.steps,pupils:site.eyesWorld.stats.pupilFrames,callbacks:stage.onFrame.length};await sleep(350);
// The sticker's tilt is a 550 ms CSS animation (gags lane), not page frame work: the browser pauses it in a hidden tab
// itself, and here (a faked hidden) it must end on its own by 700 ms after the tap with no frame callback added.
const glint=await until(()=>!site.skyItems.glinting,350);
check('small hidden stops bounded work',!site.eyesWorld.pupilsActive&&glint&&!W.stats.listening&&W.stats.steps===snap.steps&&site.eyesWorld.stats.pupilFrames===snap.pupils&&stage.onFrame.length===snap.callbacks,JSON.stringify({pupils:site.eyesWorld.pupilsActive,glint,listening:W.stats.listening,steps:W.stats.steps-snap.steps,frames:site.eyesWorld.stats.pupilFrames-snap.pupils,callbacks:stage.onFrame.length-snap.callbacks}));
if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
site.eyesWorld.detach();await until(()=>!W.active,12000);
const scale=eyes.artScale,original=[stage.width,stage.height];
for(const [width,height]of [[844,390],[1280,900],original]){   // phones play on their side (shell lane)
 await __resize(width,height);await sleep(450);S.refreshAttachments();
 check('small resize remains reachable '+width,eyes.box.x>=0&&eyes.box.x+eyes.box.w<=width&&eyes.box.y+eyes.box.h<=height-stage.insets.bottom+1&&star.box.x>=0&&star.box.x+star.box.w<=width&&eyes.artScale===scale,JSON.stringify({eyes:eyes.box,star:star.box}));
}
const e=eyes.worldEntry,p=stage.onFloor(stage.width*.5,stage.height+120);p.y=.7;e.body.setTranslation(p,true);e.body.setLinvel({x:0,y:0,z:0},true);W.wake(e);
check('small unreachable drop returns to reachable floor',await until(()=>!W.active&&!e.timer,15000)&&eyes.box.y+eyes.box.h<=stage.height-stage.insets.bottom+1,JSON.stringify(eyes.box));
// Legacy DOM-only saves migrate once, without an audible bounce or a new identity.
keepsakes.take('eyes');store.set('keepsakes.eyes',{x:.2,y:.4,order:7,state:{on:'cat'}});keepsakes.define(keepsakes.defs.get('eyes'));
const migrated=keepsakes.get('eyes');await migrated.worldTask;
check('small legacy attachment migrates once',migrated.worldReady&&migrated.state.on==='cat'&&migrated.worldEntry.support?.id==='eyes-cat'&&W.entries.get('eyes')===migrated.worldEntry&&[...W.entries.keys()].filter(id=>id==='eyes').length===1);
await __shot(stage.reducedMotion?'world-small-calm':'world-small-lifecycle');
