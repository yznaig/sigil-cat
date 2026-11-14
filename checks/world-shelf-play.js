// Full-distance play paths that the near-slot contract fixture cannot cover.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const items=['rifle','top','pat','tin'].map(id=>keepsakes.give(id));await Promise.all(items.map(i=>i.worldTask));await site.shelf.task;await until(()=>!W.stats.listening,12000);
const shelf=site.shelf,top=keepsakes.get('top'),pat=keepsakes.get('pat'),tin=keepsakes.get('tin');
const findHit=i=>{for(let y=i.box.y+4;y<i.box.y+i.box.h-4;y+=3)for(let x=i.box.x+4;x<i.box.x+i.box.w-4;x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};
audio.setMuted(false);await Promise.all(['wood','metal','butter','tin'].map(m=>audio.loadImpacts(m)));
const impactCalls=[],baseAudio=site.audio;site.audio={...baseAudio,impact(e,o){const at=performance.now(),voice=baseAudio.impact(e,o);impactCalls.push({at,id:e?.id??e,strength:o.strength,voice:!!voice});return voice;}};
const start=findHit(top);check('shelf floor top has a native hit',!!start);
if(start){
 const pid=++pointerIds;fire('pointerdown',start.x,start.y,pid);
 // Aim with the bay's upright frame, as the shelf's guide does (the bay rests the top tilted, e1111-42).
 const h=W.held,pose=S.pose('shelf','top'),dest=stage.toScreen(pose.p.clone().add(h.local.clone().applyQuaternion(shelf.root.quaternion)));
 for(let n=1;n<=50;n++){fire('pointermove',start.x+(dest.x-start.x)*n/50,start.y+(dest.y-start.y)*n/50,pid);await sleep(25);}
 const preview=await until(()=>{fire('pointermove',dest.x,dest.y,pid);return !!shelf.preview;},6000,40);
 check('shelf full floor to bay drag previews',preview,JSON.stringify({start,dest,body:top.worldEntry.body.translation(),target:h.target.toArray(),candidate:S.candidate(top.worldEntry)}));
 if(shelf.preview){const r=shelf.preview.getBoundingClientRect();check('shelf preview label fits and stays on screen',shelf.preview.scrollWidth<=shelf.preview.clientWidth&&r.left>=0&&r.right<=stage.width,JSON.stringify({width:r.width,scroll:shelf.preview.scrollWidth,client:shelf.preview.clientWidth,left:r.left,right:r.right}));}
 await __shot('world-unit6-floor-to-shelf');await until(()=>!!shelf.preview,6000,20);note('shelf release instant',JSON.stringify({held:W.held?.entry.id,candidate:S.candidate(top.worldEntry),velocity:top.worldEntry.body.linvel()}));const voices=audio.diagnostics().impacts;fire('pointerup',dest.x,dest.y,pid,0);await sleep(300);
 const plops=impactCalls.filter(c=>c.id==='top'&&c.strength===.3),plop=plops.at(-1),audible=plop&&(plop.voice||impactCalls.some(c=>c.id==='top'&&c.voice&&c.at<=plop.at&&plop.at-c.at<80));
 // Contact sounds are off (Aaron, e1111-58): the mount still reports one plop, and it must stay silent.
 const silent=!audible&&!site.config.sounds.collisions;
 check('shelf full drag inserts with one rate-limited material plop, silent (e1111-58)',top.worldEntry.support?.id==='shelf'&&plops.length===1&&silent,JSON.stringify({support:top.worldEntry.support,voices:audio.diagnostics().impacts-voices,placement:plop,recent:impactCalls.filter(c=>c.id==='top'&&plop&&Math.abs(c.at-plop.at)<100)}));
}
// An animated store (the Store button's old path, kept as API) mounts the same loose body; its plop is silent (e1111-58).
const e=tin.worldEntry;await sleep(150);
const tinVoices=audio.diagnostics().impacts,tinSilent=audio.diagnostics().silentContacts;check('shelf animated store mounts same loose body',shelf.store('tin')&&e.support?.id==='shelf',JSON.stringify({support:e.support}));await sleep(300);
check('shelf animated store plops once, silent (e1111-58)',audio.diagnostics().impacts===tinVoices&&audio.diagnostics().silentContacts===tinSilent+1,JSON.stringify({voices:audio.diagnostics().impacts-tinVoices,silent:audio.diagnostics().silentContacts-tinSilent}));
await __shot('world-unit6-arrange-play');
// A genuinely disabled flight remains unstoreable.
pat.worldEntry.canGrab=false;check('shelf flight cannot be stored',!shelf.store('pat'));pat.worldEntry.canGrab=true;
// Silent restore / explicit nonanimated mount makes no plop.
const before=audio.diagnostics().impacts;shelf.store('rifle',false);check('shelf nonanimated restore is silent',audio.diagnostics().impacts===before);
site.audio=baseAudio;
// Actual keyboard Place uses the same crown support and butter state as pointer return.
const pe=pat.worldEntry;site.worldInput.keyboardLift(pe);W.release();const crown=S.pose('cat-butter','crown');pe.body.setTranslation(crown.p,false);pe.body.setRotation(crown.q,false);pe.body.setLinvel({x:0,y:0,z:0},false);pe.body.setAngvel({x:0,y:0,z:0},false);W.sync(pe);
site.worldInput.keyboardLift(pe);site.worldInput.keyboardPlace();
check('shelf keyboard crown sets physical and saved butter state',pe.support?.id==='cat-butter'&&cat.butterOn&&store.get('butterman.buttered')===true);
await __shot('world-unit6-keyboard-crown');
site.worldInput.keyboardLift(pe);site.worldInput.cancel();check('shelf crown pickup clears butter state',!cat.butterOn&&!store.get('butterman.buttered'));
// A stored top begins spinning where it is tapped, never teleports to the floor.
shelf.store('top',false);const y=top.worldEntry.body.translation().y;top.worldEntry.tap({});const after=top.worldEntry.body.translation().y;
// e1111-58 (polish lane): the tap spins it where it stands, on an authored kinematic spin (src/core/top-spin.js).
check('shelf stored top tap preserves height and identity',!top.worldEntry.support&&Math.abs(y-after)<1e-6&&site.worldProps.topSpin.spinning===top,JSON.stringify({before:y,after,spinning:site.worldProps.topSpin.spinning?.id}));
await sleep(100);await __shot('world-unit6-top-release');W.park(top.worldEntry);shelf.store('top',false);
// Holder geometry has contact surfaces where the prepared art says it does.
const localRay=(x,y,z)=>{const p=shelf.root.localToWorld(new T.Vector3(x,y,z)),d=new T.Vector3(0,-1,0).applyQuaternion(shelf.root.quaternion),ray=new W.rapier.Ray(p,d);let hit=Infinity;for(let n=0;n<shelf.entry.body.numColliders();n++){const t=shelf.entry.body.collider(n).castRay(ray,1,true);if(t>=0)hit=Math.min(hit,t);}return Number.isFinite(hit)?y-hit:null;};
const surfaces={plate:localRay(.035,.2,.07),rim:localRay(.14,.2,.07),rail:localRay(.275,.2,.035)};
check('shelf plate bowl rim and tin rails have fitted collision',Math.abs(surfaces.plate-.064)<.002&&surfaces.rim>.07&&Math.abs(surfaces.rail-.072)<.002,JSON.stringify(surfaces));
// A completed depth throw beyond the visible play band returns after five seconds.
S.detach(pe,{wake:false});const away=stage.onFloor(stage.width*.75,stage.height+150);away.y=.08;pe.body.setTranslation(away,false);pe.body.setLinvel({x:0,y:0,z:0},false);pe.body.setAngvel({x:0,y:0,z:0},false);W.wake(pe);
const count=W.stats.respawns;const pending=await until(()=>!!pe.timer,8000);const t=performance.now();
check('shelf offscreen resting throw schedules recovery',pending,JSON.stringify({box:pat.box,position:pe.body.translation()}));
await until(()=>W.stats.respawns>count,6000);const returnedAfter=performance.now()-t;await until(()=>!W.stats.listening,10000);
check('shelf recovery returns visible reachable same body',W.stats.respawns===count+1&&performance.now()-t>=4700&&!pe.timer&&pat.box.x+pat.box.w>0&&pat.box.x<stage.width&&pat.box.y<stage.height-stage.insets.bottom,JSON.stringify({returnedAfter,settledAfter:performance.now()-t,box:pat.box}));
await __shot('world-unit6-recovered');
