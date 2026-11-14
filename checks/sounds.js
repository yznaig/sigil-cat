// Browser checks use the real audio bus, real decoded buffers and a reload (--then).
cat.auto = false;
await audio.loadAll(Object.keys(site.config.sounds.files));
const names = Object.keys(site.config.sounds.files);
// 74 since playtest-2: the sky lane's bread-riser and bread-pop added, the unplayed rocket removed (integration to-do 7)
// playtest 3 (fx lane): + Aaron's four clips: the achievement, the bell, the cast (e1113-09), the bolt (e1113-10)
const P3 = ['achieve-space', 'bell', 'cast-wind', 'bolt-beam'];
check('sounds all 78 named voices decode (palette, impacts, star tink, the bread\'s riser and pop, the four playtest-3 clips; no rocket)', names.length === 78 && names.includes('star-tink') && names.includes('bread-riser') && names.includes('bread-pop') && P3.every(n => names.includes(n)) && !names.includes('rocket') && names.every(n => audio.status(n) === 'loaded'), String(names.length));
audio.setVolume(1); audio.setMuted(false); await sleep(100);
// Exercise the per-frame gag callback too: it must operate the new loop handle.
await E.bread.whenReady(); await cat.ensureButter(); cat.setButter(true, 'quiet'); hover(0,0);
const humBefore=audio.diagnostics().loops;
const hovering=E.paradox.start();
await sleep(2200); const humLevel=audio.level();
const returned=await hovering;
check('sounds paradox loop completes its full hover and returns the cat', returned && audio.diagnostics().loops>humBefore && humLevel>1e-4 && !E.paradox.active && cat.butterOn && keepsakes.has('paper'), `returned ${returned}; hover RMS ${humLevel.toExponential(2)}; paper ${keepsakes.has('paper')}`);
let live = [];
const item = { id: 'sound-contact-probe' };
// Contact sounds are off on the page (e1111-58). The adapter stays intact for `collisions: true`: switch its groups
// on for these few lines only, then back off.
check('sounds contact adapter is off on the page', !site.config.sounds.collisions && audio.impact({ id: 'off-probe' }, { material: 'glass' }) === null);
audio.setNames(site.config.sounds.files, site.config.sounds.impacts);
for (let i=0; i<100; i++) {
  const s = audio.impact(item, { material: i%2 ? 'metal' : 'wood', size: 'small' });
  if (s) live.push(s);
}
const separate = audio.impact({ id: 'sound-second-item' }, { material: 'glass' });
check('sounds 100 contact callbacks produce one principal voice per item', live.length === 1 && !!separate, `${live.length} first item; ${Number(!!separate)} independent item`);
await sleep(90);
const next = audio.impact(item, { material:'tin', size:'medium' });
check('sounds same item can sound again after 80 ms', !!next);
const selections=[];
// Use an unused material/size bag. The paradox's new physical paper can land
// during this probe and legitimately consume paper/medium variants itself.
for(let i=0;i<9;i++) {
  const s=audio.impact({id:'sound-bag-probe'}, {material:'tin',size:'small'});
  selections.push(s?.soundName); await sleep(90);
}
audio.setNames(site.config.sounds.files, {});
check('sounds material bag exhausts variants and never repeats adjacent', selections.every((n,i)=>n && (!i || n!==selections[i-1])) && [0,3,6].every(i=>new Set(selections.slice(i,i+3)).size===3), selections.join(', '));

await sleep(1400);
// The merged paradox leaves a real falling paper. Its last contact/tail must
// finish before testing whether the deliberately denied calls create a voice.
await keepsakes.get('paper')?.worldTask;
check('sounds silence baseline is naturally settled', await until(() => !site.world.active && audio.level()<1e-6, 10000));
const before=audio.diagnostics();
const denied=[];
await audio.silenceDuring(async()=>{
  denied.push(audio.play('tap-bonk'),audio.loop('purr'),audio.tone());
  await sleep(30);
  denied.push(audio.impact(item,{material:'wood'}));
  audio.silenceDuring(()=>denied.push(audio.play('ding')));
});
denied.push(audio.impact(item,{material:'wood',sleeping:true}));
denied.push(audio.impact({id:'body-sleep',body:{isSleeping:()=>true}},{material:'glass'}));
denied.push(audio.impact(item,{material:'wood',restoring:true}));
denied.push(audio.impact(item,{material:'wood',strength:0}));
const after=audio.diagnostics();
note('sounds silence measurement',JSON.stringify({before,after,allDenied:denied.every(s=>s===null),rms:audio.level(),bodies:[...site.world.entries.values()].map(e=>({id:e.id,sleeping:e.body.isSleeping()}))}));
check('sounds sleeping and nested async restore schedule zero voices', denied.every(s=>s===null) && after.clips===before.clips && after.loops===before.loops && after.tones===before.tones && !after.restoring && audio.level()<1e-6);

// Deliberately stress the sum, including the bypass destination used by the montage.
const starts=new WeakMap(), nativeStart=AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start=function(...args){starts.set(this,args[0]??audio.context().currentTime);return nativeStart.apply(this,args);};
try {
  live = names.slice(0,31).map(n=>audio.play(n,{gain:4})).filter(Boolean);
  live.push(audio.play('choir',{gain:12,dest:audio.destination()}));
} finally { AudioBufferSourceNode.prototype.start=nativeStart; }
let peak=0;
for(let i=0;i<20;i++){await sleep(15);peak=Math.max(peak,audio.peak());}
const stoppedAt=audio.context().currentTime, firstStart=Math.min(...live.map(s=>starts.get(s)));
for(const s of live) s?.stop();
check('sounds crowded page and montage sum stays below -1 dBFS', peak>0.1 && peak < 10**(-1/20), `${(20*Math.log10(peak)).toFixed(3)} dBFS for 32 overlapping voices`);
await sleep(150);

// Re-render the actual buffers, gains and scheduled start offsets. Read both output
// channels directly, including the oversampling filter tail after the voices stop.
async function renderCueMix(curve,rate) {
  const mix=new OfflineAudioContext(2,Math.ceil((stoppedAt-firstStart+.1)*rate),rate), protection=mix.createWaveShaper();
  protection.curve=curve;protection.oversample='4x';protection.connect(mix.destination);
  for(const original of live) {
    const source=mix.createBufferSource(),gain=mix.createGain();source.buffer=original.buffer;
    source.playbackRate.value=original.playbackRate.value;gain.gain.value=original.gain.gain.value;
    source.connect(gain).connect(protection);source.start(starts.get(original)-firstStart);source.stop(stoppedAt-firstStart);
  }
  const result=await mix.startRendering();let bound=0;
  for(let c=0;c<result.numberOfChannels;c++)for(const sample of result.getChannelData(c))bound=Math.max(bound,Math.abs(sample));
  return {rate,channels:result.numberOfChannels,peakDbfs:20*Math.log10(bound)};
}
const rates=[...new Set([audio.context().sampleRate,44100,48000])],mixPeaks=[];
for(const rate of rates)mixPeaks.push(await renderCueMix(audio.safetyCurve(),rate));
check('sounds actual stereo cue sums stay below -1 dBFS',mixPeaks.every(r=>r.peakDbfs < -1),JSON.stringify(mixPeaks));

// Independently render the actual safety curve offline, across positive/negative overloads.
const offline=new OfflineAudioContext(1,48000,48000), shaper=offline.createWaveShaper();
shaper.curve=audio.safetyCurve();shaper.oversample='4x';shaper.connect(offline.destination);
const source=offline.createBufferSource(), b=offline.createBuffer(1,48000,48000);
b.getChannelData(0).set(Float32Array.from({length:48000},(_,i)=>8*Math.sin(2*Math.PI*997*i/48000)));
source.buffer=b;source.connect(shaper);source.start();
const rendered=(await offline.startRendering()).getChannelData(0);
const bound=rendered.reduce((p,x)=>Math.max(p,Math.abs(x)),0);
check('sounds oversampled safety handles 8x input overload', bound<10**(-1/20), `${(20*Math.log10(bound)).toFixed(3)} dBFS`);

const audible=audio.play('thunder');await sleep(200);const heard=audio.level();
audio.setMuted(true);await sleep(250);const quiet=audio.level();audible.stop();
check('sounds master mute silences a playing replacement', heard>1e-3&&quiet<1e-6, `${heard.toExponential(2)} to ${quiet.toExponential(2)} RMS`);
for(const id of ['paper','tin','box','ticket']) keepsakes.give(id);
// Physical crown ownership now persists the paradox's butter. Park it as a
// player can before isolating silent collection restore: a crowned pat owns
// Butterman's intentionally running zero-gain whisper loop.
await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));await site.shelf.task;
check('sounds restore fixture stores butter off the whisper seat',site.shelf.store('pat',false)&&!cat.butterOn&&!store.get('butterman.buttered'));
store.set('worldBodies.sound-sleep-probe',{version:1,position:[0,.1,0],quaternion:[0,0,0,1],support:'floor'});
audio.setVolume(.43);audio.setMuted(true);
sessionStorage.setItem('sounds.reload','ready');
await __shot('sound-check');
