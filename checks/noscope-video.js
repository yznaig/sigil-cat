cat.auto=false;
// Measure the sequence after its small preloaded riser is ready and startup rendering settles.
// The video remains completely unfetched until the trigger below.
await audio.load('assets/audio/noscope-riser.mp3');await stage.after(.5);
const before=(await __requests()).filter(url=>/assets\/video\//.test(url)).length;
const frames=[];let sampling=true;
const t0=performance.now();
function sample(){const root=document.querySelector('.noscope-video'),v=root?.querySelector('video');frames.push({t:(performance.now()-t0)/1000,black:root?+getComputedStyle(root).opacity:0,opacity:v?+getComputedStyle(v).opacity:0,playing:!!v&&!v.paused&&v.currentTime>0,time:v?.currentTime??0,riser:E.noscopeVideo?.audio.riser??false,locked:input.locked});if(sampling)requestAnimationFrame(sample);}
requestAnimationFrame(sample);const done=site.fire('noscope');
await sleep(6800);sampling=false;
const api=E.noscopeVideo,v=document.querySelector('.noscope-video video');
const black=frames.find(f=>f.black>=.9999),playing=frames.find(f=>f.playing),full=frames.find(f=>f.playing&&f.opacity>=.9999);
check('noscope first 360 lazily fetches video',before===0&&!!v?.currentSrc&&(await __requests()).some(url=>/assets\/video\//.test(url)));
check('noscope riser and locked fade reach black at five seconds',frames.some(f=>f.riser&&f.locked)&&!!black&&Math.abs(black.t-5)<=.15,`black ${black?.t.toFixed(3)} s`);
check('noscope video starts at five and fades in by six',!!playing&&!!full&&Math.abs(playing.t-5)<=.15&&Math.abs(full.t-6)<=.15,`playing ${playing?.t.toFixed(3)}, full ${full?.t.toFixed(3)}`);
check('noscope riser ends with video fade-in',!!full&&frames.some(f=>f.t>=full.t&&f.t<=full.t+.1&&!f.riser));
const a=v?.currentTime;await sleep(1000);
check('noscope video advances in real time inline',!!v&&v.currentTime-a>.85&&v.currentTime-a<1.2&&v.playsInline&&getComputedStyle(v).objectFit==='contain',`${a} -> ${v?.currentTime}`);
document.querySelector('#sound')?.click();await sleep(150);
const playingMuted=!!v&&!v.paused&&v.muted&&api?.audio.gain===0&&api.level()<1e-6;
audio.setMuted(false);
await until(()=>!E.noscope.active,35000);await done;
check('noscope video end restores page and rifle',!!api&&api.lastEnd==='ended'&&!input.locked&&!document.querySelector('.noscope-video')&&keepsakes.has('rifle'));
// A second showing must start again, and both media paths must obey the page controls.
audio.setMuted(true);const again=site.fire('noscope');await sleep(350);
const active=E.noscopeVideo, video=document.querySelector('.noscope-video video');
check('noscope muted video and riser have zero output',playingMuted&&!!active&&active.audio.riser&&active.audio.gain===0&&active.level()<1e-6&&!!video?.muted&&audio.output().gain.value===0);
const slider=document.querySelector('#volume');if(slider){slider.value='37';slider.dispatchEvent(new Event('input',{bubbles:true}));}audio.play('thunder');await sleep(100);
check('noscope volume follows slider while page sounds stay quiet',!!active&&Math.abs(active.audio.gain-.37)<.001&&audio.output().gain.value===0&&audio.level()<1e-6);
const root=document.querySelector('.noscope-video');const id=++pointerIds;
(root||canvas).dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,pointerType:KIND,bubbles:true,clientX:20,clientY:200,buttons:1}));
(root||canvas).dispatchEvent(new PointerEvent('pointerup',{pointerId:id,pointerType:KIND,bubbles:true,clientX:20,clientY:200,buttons:0}));
await sleep(1100);
check('noscope tap skips and restores input',!!active&&!E.noscope.active&&!input.locked&&!document.querySelector('.noscope-video')&&Math.abs(audio.output().gain.value-.37)<.001);
await again;
const third=site.fire('noscope');await sleep(150);dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await sleep(1100);
check('noscope Escape skips every subsequent 360',!!active&&!E.noscope.active&&!input.locked);await third;
