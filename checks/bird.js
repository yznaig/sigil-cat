// e1111-11. Uses native clocks because the game deliberately freezes page callbacks.
const {wallClock}=await import(new URL('src/core/page-scheduler.js',document.baseURI));
const wait=ms=>new Promise(r=>wallClock.setTimeout(r,ms));
const poll=async(f,ms=12000)=>{const t=performance.now();while(performance.now()-t<ms){if(f())return true;await wait(20);}return false;};
const B=E.bird,prefix=stage.reducedMotion?'bird-calm':'bird';
const {PLAYER}=await import(new URL('src/flappy/config.js',document.baseURI));
const {flightArt}=await import(new URL('src/flappy/art.js',document.baseURI));
const snapshot=()=>({clock:stage.clock,yaw:cat.yaw,pose:cat.state,objects:stage.scene.children.length,bonks:store.get('bonks'),butter:cat.butterOn});
await poll(()=>!cat.popping);
const beforeCallbacks=[...stage.onFrame],beforeFrames=B.stats.frames;
check('bird has no pre-arrival frame work or media loads',B.state==='waiting'&&B.stats.loads===0&&B.stats.callbacks===0&&beforeFrames===0,JSON.stringify(B.stats));
check('bird artwork is not requested before arrival',!(await __requests()).some(url=>/assets\/flappy\/|vendor\/(?:crappybird\/images|floppybird\/assets)\//.test(url)));
Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));await wait(180);
check('bird arrival timer pauses in a hidden tab',!B.stats.timer&&B.state==='waiting'&&B.stats.frames===0);
delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
B.debug.skipTo(89);const start=performance.now();await wait(710);
check('bird does not appear before 90 seconds',B.state==='waiting'&&!document.querySelector('.distant-bird')&&B.stats.frames===0);
await poll(()=>B.state==='flying',2000);const arrival=B.stats.appearedAt-start+89000;
check('bird arrives at 90 seconds within one second',Math.abs(arrival-90000)<1000&&B.stats.listening,`${arrival.toFixed(1)}ms; ${stage.onFrame.length-beforeCallbacks.length} added stage callbacks`);
await poll(()=>document.querySelector('.distant-bird')?.dataset.playerSource===PLAYER.src);await wait(300);await __shot(prefix+'-circling');
check('bird distant visitor uses Aaron’s registered sprite',document.querySelector('.distant-bird')?.dataset.playerSource===PLAYER.src&&flightArt().player?.naturalWidth===84&&flightArt().player?.naturalHeight===28);
check('bird circle has a generous target behind the cat',B.circle.rx*2>=100&&B.circle.ry*2+48>=96&&document.querySelector('.distant-bird').parentNode.id==='back',JSON.stringify(B.circle));
const flyFrames=B.stats.frames;
Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));await wait(180);
check('bird hidden tab pauses its loop',B.stats.frames===flyFrames&&!B.stats.listening);
delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
if(stage.reducedMotion)check('bird reduced motion glides with a still wing',document.querySelector('.distant-bird').dataset.frame==='1');
const preserved=keepsakes.give('paper');await preserved.worldTask;await poll(()=>preserved.worldEntry.body.isSleeping());
const bodyPose=()=>JSON.stringify([preserved.worldEntry.body.translation(),preserved.worldEntry.body.rotation()]);
const preservedPose=bodyPose();
// Native, hit-tested mouse/touch clicks in the circle, away from the tiny bird itself.
// The bird lets its egg go as it first flies on (kitchen, e1111-58); while it falls through the circle it is the
// thing under the pointer. Click once it has landed, as a player aiming at the circle would.
await poll(()=>{const egg=keepsakes.get('egg');return !!egg?.worldEntry&&egg.worldEntry.body.isSleeping();},15000);
await poll(()=>!cat.popping);const c0=B.circle;await __pointer([{x:c0.x,y:c0.y}]);
check('bird circle click opens the full screen game',await poll(()=>B.state==='game')&&input.locked&&document.querySelector('#bird-screen')?.getBoundingClientRect().width===innerWidth);
await wait(300);const frozen=snapshot();await wait(180);
check('bird game freezes the underlying page',JSON.stringify(snapshot())===JSON.stringify(frozen),JSON.stringify(frozen));
const gameTime=B.screen.elapsed;
Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
const audioPaused=await poll(()=>audio.context().state==='suspended',2000);await wait(80);
check('bird hidden game pauses simulation and audio',B.screen.elapsed===gameTime&&audioPaused);
delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));await wait(60);
await __key('Escape');
check('bird Escape returns and permits another flight',await poll(()=>B.state==='flying')&&!input.locked&&!document.querySelector('#bird-screen'));
await __pointer([{x:B.circle.x,y:B.circle.y}]);await poll(()=>B.state==='game');await wait(300);
await __shot(prefix+'-game');
const flightCanvas=document.querySelector('#bird-screen canvas'),canvasContext=flightCanvas.getContext('2d'),drawImage=canvasContext.drawImage;
const drawn=[];canvasContext.drawImage=function(image,...args){drawn.push({src:image.src||'canvas',args});return drawImage.call(this,image,...args);};
await poll(()=>drawn.some(d=>d.src.endsWith(PLAYER.src))&&drawn.some(d=>d.src.endsWith('/splash.png')));
check('bird game draws Aaron’s sprite and the classic clone UI with nearest-neighbour sampling',flightCanvas.dataset.playerSource===PLAYER.src&&flightCanvas.dataset.scenery==='floppybird'&&!canvasContext.imageSmoothingEnabled&&drawn.some(d=>d.src.endsWith(PLAYER.src)&&d.args[2]===28&&d.args[3]===28)&&drawn.some(d=>d.src.endsWith('/splash.png')));
const view=B.screen.view,bodyWidth=B.screen.game.bird.width*view.scale;
// A phone on its side (playtest-2) fits the lane and 40 px of ground (src/flappy/config.js), so the bird is ~30 px there.
if(view.short)check('bird landscape phone playfield fits its lane with a larger bird',B.screen.game.width===288&&Math.abs(view.x*2+view.width-innerWidth)<1&&view.y>=0&&view.y+400*view.scale<innerHeight&&bodyWidth>=28&&view.x>0,JSON.stringify({field:[view.width,view.height],bodyWidth,y:view.y}));
else check('bird portrait playfield stays centred with a clearly visible classic-size bird',B.screen.game.width===288&&B.screen.game.height===512&&Math.abs(view.x*2+view.width-innerWidth)<1&&Math.abs(view.y*2+view.height-innerHeight)<1&&bodyWidth>=46&&(MOBILE||view.x>0),JSON.stringify({field:[view.width,view.height],bodyWidth}));
// The velocity each flap sets, read at the flap itself (a touch tap takes longer to arrive than a key; reading it
// later measures the input route's delay, not the impulse).
const flaps=[],flapOf=B.screen.game.flap;B.screen.game.flap=()=>{const ok=flapOf();flaps.push(ok?B.screen.game.bird.velocity:null);return ok;};
await __key('Space');await poll(()=>flaps.length===1&&B.screen.game.bird.velocity>-200);
await __pointer([{x:innerWidth*.45,y:innerHeight*.5}]);await poll(()=>flaps.length===2,1000);const [first,second]=flaps;
check('bird game accepts Space and tap with the same impulse',B.screen.game.bird.play&&first<0&&second===first&&first===B.screen.game.bird.jump,`${first?.toFixed(2)} / ${second?.toFixed(2)}`);
await wait(300);await __pointer([{x:innerWidth*.45,y:innerHeight*.5}]);await wait(300);await __shot(prefix+'-game-flight');
check('bird draws classic capped pipes, skyline, striped ground and large score digits', ['pipe.png','pipe-up.png','pipe-down.png','sky.png','land.png','font_big_0.png'].every(name=>drawn.some(d=>d.src.endsWith('/floppybird/assets/'+name)))&&drawn.some(d=>d.src.endsWith('/pipe.png')&&Math.abs(view.y+d.args[1]*view.scale)<.1)&&!(await __requests()).some(url=>url.includes('/vendor/crappybird/')));
// e1113-22 (fx lane, playtest 3): the high score persists. This flight scores 7 (the count stood in for: pipes take a
// minute), dies, and 7 is kept as the best, on the bar and the scoreboard's best line; checks/bird-stand-reload.js sees it again.
const bestBar=()=>document.querySelector('#bird-screen [data-best]')?.textContent;
check('bird a fresh player has no best yet',B.screen.best===0&&bestBar()===''&&store.get('flappy.best')===null,JSON.stringify(bestBar()));
Object.defineProperty(B.screen.game,'score',{configurable:true,get:()=>7});
const retained=snapshot();B.debug.death();
await poll(()=>B.screen?.game.dead&&drawn.some(d=>d.src.endsWith('/scoreboard.png')));
// Freeze the already-rendered game-over frame through the existing hidden-tab
// lifecycle so screenshot I/O on a busy host cannot consume the physical drop.
Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
try{await __shot(prefix+'-game-over');}finally{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));}
canvasContext.drawImage=drawImage;
check('bird the high score is kept: 7 in the store, on the bar and on the scoreboard\'s best line',await poll(()=>store.get('flappy.best')===7&&B.screen?.best===7&&bestBar()==='best 7',2000),JSON.stringify({stored:store.get('flappy.best'),bar:bestBar()}));
check('bird clone digits and game-over art are actually drawn',drawn.some(d=>/font_small_\d\.png$/.test(d.src))&&drawn.some(d=>d.src.endsWith('/scoreboard.png')));
// Playtest-2: no auto-close. The scoreboard waits with the clone's replay button, twinned: retry and give up.
check('bird game over waits with retry and give up',await poll(()=>B.screen?.over,3000)&&!document.querySelector('#bird-screen [data-retry]').closest('[hidden]')&&!!document.querySelector('#bird-screen [data-give-up]')&&flightArt().replay?.naturalWidth===115&&flightArt().giveUp?.width===115);
await wait(300);await __shot(prefix+'-game-over-buttons');
await wait(900);check('bird game over does not close by itself',!!B.screen&&B.state==='game'&&!keepsakes.has('controller'));
{const r=document.querySelector('#bird-screen [data-retry]').getBoundingClientRect();await __pointer([{x:r.x+r.width/2,y:r.y+r.height*.35}]);}
check('bird retry starts a fresh flight in place',await poll(()=>B.screen?.retries===1&&!B.screen.game.dead&&B.screen.game.score===0,2000)&&document.querySelector('#bird-screen .bird-over').hidden&&B.state==='game');
B.debug.death();await poll(()=>B.screen?.over,3000);await wait(120);
await __key('Space');check('bird Space at game over is retry, as in the clone',await poll(()=>B.screen?.retries===2&&!B.screen.game.dead,2000));
B.debug.death();await poll(()=>B.screen?.over,3000);await wait(120);
{const r=document.querySelector('#bird-screen [data-give-up]').getBoundingClientRect();await __pointer([{x:r.x+r.width/2,y:r.y+r.height*.35}]);}
check('bird give up returns with controller and the bird flies off',await poll(()=>!B.screen&&keepsakes.get('controller')?.worldReady,20000)&&!input.locked&&B.state==='waiting'&&!document.querySelector('.distant-bird')&&B.stats.departures===1);
const inst=keepsakes.get('controller'),entry=inst?.worldEntry;
check('bird return preserves page state',cat.butterOn===retained.butter&&store.get('bonks')===retained.bonks&&!cat.hidden&&!document.querySelector('#bird-screen')&&![...document.body.children].some(n=>n.inert)&&keepsakes.get('paper')===preserved&&bodyPose()===preservedPose);
check('bird controller enters above screen as a real body',!!entry&&site.world.entries.get('controller')===entry&&inst.physical&&site.supports.categories.get('controller')==='solid'&&inst.spawnBottom<0,`spawn bottom ${inst.spawnBottom.toFixed(2)}px`);
check('bird controller picture is the selected splat with its baked physical hull',inst.splatSource==='assets/splats/controller-1.spz'&&inst.splatCount===66043&&inst.picture.mesh.geometry.instanceCount===inst.splatCount&&inst.colliderShapes[0].points.length===188*9);
const falling=await poll(()=>{const y=stage.toScreen(entry.object.position).y;return !entry.body.isSleeping()&&entry.body.linvel().y<-.1&&y>stage.height*.12&&y<stage.height*.72;},4000);
check('bird controller falls physically through the visible page',falling);
if(falling){const speed=stage.timeScale;stage.timeScale=0;document.activeElement?.blur();try{await __shot(prefix+'-controller-falling');}finally{stage.timeScale=speed;}}
check('bird controller naturally rests on world floor',await poll(()=>entry?.body.isSleeping(),20000),JSON.stringify(entry?.body.translation()));
await wait(100);document.activeElement?.blur();await __shot(prefix+'-controller-resting');
const minY=Math.min(...inst.colliderVertices.map(v=>v.clone().applyQuaternion(entry.object.quaternion).add(entry.object.position).y));
const contactPixels=minY*stage.pxPerUnit(entry.object.position);
check('bird controller floor contact has no visible penetration or gap',minY>=-.001&&Math.abs(contactPixels)<2,`${(minY*1000).toFixed(3)}mm / ${contactPixels.toFixed(3)}px`);
check('bird controller rests with the controls facing upward',new site.THREE.Vector3(0,1,0).applyQuaternion(entry.object.quaternion).y>.8,entry.object.quaternion.toArray().join(','));
const worldAt={steps:site.world.stats.steps,draws:inst.picture.stats.draws};await wait(350);
check('bird resting controller has zero physics and picture work',site.world.stats.steps===worldAt.steps&&inst.picture.stats.draws===worldAt.draws);
// Test actual hit geometry, not the keepsake's keyboard shortcut.
const ctx=audio.context(),originalCreate=ctx.createBufferSource.bind(ctx),slamStarts=[];
ctx.createBufferSource=()=>{const node=originalCreate(),start=node.start.bind(node);node.start=(...args)=>{if(node.buffer===audio.buffer('assets/audio/designed/bird-boom.wav'))slamStarts.push({wall:performance.now(),at:args[0]});return start(...args);};return node;};
const box=inst.box;await __pointer([{x:box.x+box.w*.5,y:box.y+box.h*.43}]);
check('bird controller click starts the trailer and the controller stays',await poll(()=>B.screen?.root.classList.contains('trailer'))&&keepsakes.has('controller')&&site.world.entries.has('controller'));
const shotWords=[];for(const word of ['YOU','JUST','LOST','THE','GAME']){
  const seen=await poll(()=>B.screen?.word===word,2500);if(seen){await wait(160);
    if(word==='YOU'&&stage.reducedMotion)check('bird reduced trailer fades without scale or shake',document.querySelector('.trailer-word').getAnimations().every(a=>a.effect.getKeyframes().every(f=>!f.transform||f.transform==='none')));
    await __shot(prefix+'-word-'+word.toLowerCase());shotWords.push(word);}
}
check('bird trailer presents all five words on separate beats',shotWords.join(' ')==='YOU JUST LOST THE GAME',shotWords.join(' '));
check('bird payoff restores controls after silence',await poll(()=>!B.screen,6000)&&!input.locked&&!document.querySelector('#bird-screen')&&registry.has('bird'));
const beats=B.stats.beats,intervals=beats.slice(1).map((b,i)=>b.elapsed-beats[i].elapsed);
ctx.createBufferSource=originalCreate;
const offsets=beats.map((b,i)=>Math.abs(b.visualAt-(slamStarts[i]?.wall??-1)));
const wallIntervals=beats.slice(1).map((b,i)=>(b.visualAt-beats[i].visualAt)/1000);
check('bird boom cue (Aaron\'s cinematic boom) shares each visual beat',beats.length===5&&slamStarts.length===5&&intervals.every(d=>Math.abs(d-.9)<.06)&&wallIntervals.every(d=>Math.abs(d-.9)<.08)&&offsets.every(ms=>ms<25),JSON.stringify(beats.map((b,i)=>({word:b.word,elapsed:+b.elapsed.toFixed(3),offsetMs:+offsets[i].toFixed(3)}))));
// The stand (playtest-2) comes after the trailer; the controller goes into it and still plays the game from there.
check('bird the trailer brings the wooden stand',await poll(()=>site.stand?.ready,8000)&&store.get('bird.stand')===true&&site.worldLayout.furniture().stand?.fixed,JSON.stringify(site.stand?.rect));
// Playtest-3 (layout lane, e1113-07): it falls from above into its place like the hat rack (a fade, calm), then stands
// in the row beside the rack (e1113-30).
{if(!stage.reducedMotion){await poll(()=>(site.stand.arrival?.samples?.length??0)>2&&site.stand.arrival.samples.at(-1).offset<site.stand.arrival.plan.drop*.6,3000);await __shot(prefix+'-stand-falling');}
 await poll(()=>site.stand.arrival?.done,6000);const a=site.stand.arrival,r=site.stand.rect,sm=a?.samples??[];
 check('bird the stand falls into its place from above like the hat rack',!!a&&a.done&&(stage.reducedMotion?a.mode==='fade':a.mode==='drop'&&sm[0].offset>=r.y+r.h&&a.impacts.length===4&&sm.at(-1).offset===0),JSON.stringify({mode:a?.mode,first:sm[0],impacts:a?.impacts.length,rect:r}));
 const {floorRow}=await import(new URL('src/flappy/stand.js',document.baseURI).href),row=floorRow(site),p=site.stand.root.position;
 check('bird the stand stands in the row beside the rack, turned like the shelf',Math.abs(p.z-row.z)<1e-6&&Math.abs(p.x-row.stand.x)<1e-6&&Math.abs(site.stand.root.rotation.y-Math.PI/6)<1e-6,JSON.stringify({p:p.toArray(),row}));}
await wait(500);document.activeElement?.blur();await __shot(prefix+'-stand');
// A native drag (the shelf checks' way): grab the controller's middle, carry it over the stand's slot, see the
// "Release to place" preview, let go.
let standPreview=false;{await poll(()=>entry.body.isSleeping(),8000);const centre=stage.toScreen(entry.object.position);let grip=null,d0=Infinity;
 for(let y=inst.box.y+2;y<inst.box.y+inst.box.h-2;y+=3)for(let x=inst.box.x+2;x<inst.box.x+inst.box.w-2;x+=3){const d=Math.hypot(x-centre.x,y-centre.y);if(d<d0&&site.worldInput.pick({clientX:x,clientY:y})?.entry===entry){grip={x,y};d0=d;}}
 const id=++pointerIds;fire('pointerdown',grip.x,grip.y,id);const h=site.world.held,p=site.supports.pose('stand','controller'),dest=stage.toScreen(p.p.clone().add(h.local.clone().applyQuaternion(p.q)));
 for(let n=1;n<=40;n++){fire('pointermove',grip.x+(dest.x-grip.x)*n/40,grip.y+(dest.y-grip.y)*n/40,id);await wait(25);}
 standPreview=await poll(()=>{fire('pointermove',dest.x,dest.y,id);return !!document.querySelector('.shelf-preview');},4000);
 fire('pointerup',dest.x,dest.y,id,0);}
check('bird the controller drops into its stand by hand',standPreview&&await poll(()=>entry.support?.id==='stand'&&site.stand.occupant==='controller',3000),JSON.stringify({support:entry.support,stand:site.stand.rect}));
await wait(500);document.activeElement?.blur();await __shot(prefix+'-stand-filled');
const up=new site.THREE.Vector3(0,1,0).applyQuaternion(entry.object.quaternion);
check('bird the controller leans in the stand, buttons to the room',up.z>.6&&up.y>.4,up.toArray().map(v=>v.toFixed(2)).join(','));
// Flat against the cradle (playtest-3, "IMG4: the controller should be more flat against the stand it kind of clips
// right now"): its hull touches the front lip and both rests (within 3 mm of the art's units) and passes into none.
{const A=await import(new URL('src/flappy/stand-art.js',document.baseURI).href),{STAND}=await import(new URL('src/flappy/stand.js',document.baseURI).href),T=site.THREE,Sc=STAND.scale;
 site.stand.root.updateMatrixWorld(true);const inv=site.stand.root.matrixWorld.clone().invert(),m=entry.object.matrixWorld;
 const ps=inst.colliderVertices.map(v=>v.clone().applyMatrix4(m).applyMatrix4(inv).divideScalar(Sc)).filter(v=>Math.abs(v.x)<.3);
 const gaps=A.DOWELS.slice(0,3).map(([z,y,r])=>+Math.min(...ps.map(v=>Math.hypot(v.y-y,v.z-z)-r)).toFixed(4)),floor=+Math.min(...ps.map(v=>v.y-A.PLINTH.h)).toFixed(4);
 check('bird the controller lies flush in the cradle: on the lip and both rests, clipping none',gaps.every(g=>g>-.002&&g<.003)&&floor>-.002,JSON.stringify({lipAndRests:gaps,plinth:floor}));}
{const b=inst.box;await __pointer([{x:b.x+b.w*.5,y:b.y+b.h*.35}]);}
check('bird clicking the controller in its stand plays flappy again',await poll(()=>B.screen?.game,4000)&&B.stats.replays===1&&entry.support?.id==='stand');
B.debug.death();await poll(()=>B.screen?.over,3000);await wait(100);
{const r=document.querySelector('#bird-screen [data-give-up]').getBoundingClientRect();await __pointer([{x:r.x+r.width/2,y:r.y+r.height*.35}]);}
check('bird a later death gives no second controller',await poll(()=>!B.screen,3000)&&[...keepsakes.live.keys()].filter(id=>id==='controller').length===1&&entry.support?.id==='stand');
await wait(400);const idle={frames:B.stats.frames,world:site.world.stats.steps};await wait(600);
check('bird between visits leaves zero added idle work (one return timer)',B.stats.callbacks===0&&B.stats.timer&&B.state==='waiting'&&B.stats.frames===idle.frames&&site.world.stats.steps===idle.world&&stage.onFrame.every(f=>beforeCallbacks.includes(f))&&!await B.start()&&!document.querySelector('.distant-bird')&&B.stats.payoffs===1&&B.schedule.due<=300000,JSON.stringify({stats:B.stats,schedule:B.schedule}));
// Shared master level is used by every authored bird cue; no second AudioContext/bus.
audio.setVolume(.27);audio.setMuted(true);const muteAt=audio.context().currentTime;
await poll(()=>audio.context().currentTime-muteAt>=.25,3000);const clips=audio.diagnostics().clips;
audio.play('assets/audio/designed/bird-boom.wav');const cueAt=audio.context().currentTime;
check('bird muted cue starts with zero master gain even after idle',audio.output().gain.value===0,`gain ${audio.output().gain.value}`);
await poll(()=>audio.context().currentTime-cueAt>=.12,3000);
check('bird boom respects mute and stored volume',audio.state().muted&&audio.state().volume===.27&&audio.level()<.00001&&audio.diagnostics().clips===clips+1,`RMS ${audio.level()}`);
audio.setMuted(false);audio.play('assets/audio/designed/bird-boom.wav');const volumeAt=audio.context().currentTime;
await poll(()=>audio.context().currentTime-volumeAt>=.2,3000);
check('bird unmute uses the stored volume on the actual bus',Math.abs(audio.output().gain.value-.27)<.001&&audio.level()>.00001,`gain ${audio.output().gain.value}; RMS ${audio.level()}`);
audio.setVolume(.8);
