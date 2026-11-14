// Recipe handoff and finite ending, independent of a loaded machine's RAF rate.
// The party.js check owns the real ~10 s and wall-time assertions.
cat.auto=false;const C=E.box.recipe,P=E.party,W=site.world;
const {wallClock}=await import(new URL('src/core/page-scheduler.js',document.baseURI));
const wallSleep=ms=>new Promise(r=>wallClock.setTimeout(r,ms));
for(const id of ['box','flour','bucket']){const i=keepsakes.give(id);await i.worldTask;}
await cat.ensureButter();cat.setButter(true);await keepsakes.get('pat').worldTask;
C.state.phase='revealed';C.state.bakes=1;const cake=keepsakes.give('cake');await cake.worldTask;C.save(true);
const hooks=[...W.entries.values()].map(e=>[e,e.sync]);hooks.forEach(([e])=>e.sync=null);for(let n=0;n<1200;n++)W.step(1/120);hooks.forEach(([e,s])=>{e.sync=s;W.sync(e);});
const ids=['box','flour','bucket','pat'],same=ids.map(id=>keepsakes.get(id));
// e1111-34 removed the Box & baking panel: a real tap on the cake eats it.
const hitOn=i=>{const b=i.picture.rect;for(let y=b.y+4;y<b.y+b.h-4;y+=3)for(let x=b.x+4;x<b.x+b.w-4;x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};
// Playtest 2 (shell lane, e1112-33/e1112-41): the crash screen is Chrome's "Aw, Snap!" page with no way out; it lifts
// on its own when its timer runs out (playtest 3: the cat pops in over it at ~9 s and it opens like the loading doors).
// party.js waits the real 9 s; here the same timer is cut to 3 s.
const {PARTY}=await import(new URL('src/gags/party.js',document.baseURI)),errorSeconds=PARTY.errorSeconds;PARTY.errorSeconds=3;
const spot=hitOn(cake);// Page timers pause with the interlude, so the press is timed on the wall clock (lib's tap() would wait out the frozen page).
if(spot){const pid=++pointerIds;fire('pointerdown',spot.x,spot.y,pid);await wallSleep(45);fire('pointerup',spot.x,spot.y,pid,0);}
// Playtest 2: the cake does not despawn once clicked; it stays as a keepsake.
check('cake native tap on the cake eats it exactly once, and the cake stays',!!spot&&P.state.active&&C.state.phase==='eaten'&&C.state.eaten===1&&keepsakes.get('cake')===cake,JSON.stringify({spot,phase:C.state.phase,active:P.state.active,canGrab:cake.worldEntry?.canGrab,rect:cake.picture?.rect}));
if(!P.state.active)throw Error('Recipe handoff refused in normal play');
const done=P.eatCake(),frozen={steps:W.stats.steps,syncs:W.stats.syncs,clock:stage.clock},ctx=audio.context();
await wallSleep(650);
check('cake removal leaves world and audio suspended',frozen.steps===W.stats.steps&&frozen.syncs===W.stats.syncs&&frozen.clock===stage.clock&&ctx.state==='suspended',JSON.stringify({before:frozen,steps:W.stats.steps,syncs:W.stats.syncs}));
await __shot(stage.reducedMotion?'world-unit8-error-calm':'world-unit8-error');
check('cake crash screen has no way out',!!document.getElementById('party-error')&&!document.querySelector('#party-error button, #party-error a')&&P.state.active);await done;
await until(()=>stage.timeScale===1,5000);await stage.after(.4);
check('cake return restores sources and the party hook once (the party hat and the rack only)',P.state.returns===1&&E.hat.wearing==='party'&&site.rack.hats.size===1&&site.rack.owned().join()==='party'&&P.state.toots===1&&ids.every((id,n)=>keepsakes.get(id)===same[n])&&!input.locked);
check('cake return has physical celebration meshes',stage.scene.getObjectByName('party-blower')?.children.some(o=>o.isMesh)&&(stage.reducedMotion?!stage.scene.getObjectByName('party-confetti'):stage.scene.getObjectByName('party-confetti')?.isInstancedMesh));
await __shot(stage.reducedMotion?'world-unit8-party-calm':'world-unit8-party');
// Advance the author's scene clock, not its duration or cleanup condition.
await fast(40,()=>until(()=>!P.state.effects,12000));
check('cake celebration ends without retained meshes',!P.state.effects&&!stage.scene.getObjectByName('party-confetti')&&!stage.scene.getObjectByName('party-blower'));
check('cake cannot be consumed a second time (a tap on the kept cake is only a nibble)',await C.eat()===false&&C.state.eaten===1&&P.state.returns===1&&!P.state.active&&keepsakes.has('cake'));
await until(()=>!W.stats.listening,12000);await sleep(300);
const snapshot=()=>({steps:W.stats.steps,syncs:W.stats.syncs,shadows:site.worldLayout.stats.shadowUpdates,atlas:site.meshPictures.stats.passes,supports:site.supports.stats.frames,callbacks:stage.onFrame.length});const before=snapshot();await sleep(2100);
check('cake party leaves zero idle world work',JSON.stringify(before)===JSON.stringify(snapshot()),JSON.stringify({before,after:snapshot()}));
// The mute ramps the bus to silence (15 ms) before the crash suspends the sound, so the meter's last buffer is quiet.
audio.setMuted(true);await wallSleep(200);await until(()=>!cat.popping&&!E.hat.busy,5000);const muted=P.eatCake();check('cake muted crash fixture starts',P.state.active);
if(P.state.active){await __key('Escape');await wallSleep(150);check('cake muted Escape does not lift the crash screen',P.state.active&&input.locked);await muted;check('cake muted crash screen lifts silently on its own',!input.locked&&audio.output().gain.value===0&&audio.level()<.00001,JSON.stringify({locked:input.locked,gain:audio.output().gain.value,level:audio.level()}));await until(()=>stage.timeScale===1,5000);await fast(40,()=>until(()=>!P.state.effects,12000));}
PARTY.errorSeconds=errorSeconds;
