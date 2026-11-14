cat.auto=false;
const startup=audio.diagnostics();
const remembered=audio.state();
await audio.loadAll(['thunder','purr']);
const s=audio.play('thunder'), loop=audio.loop('purr',{gain:.8});
await sleep(350);
check('sounds mute and volume survive a real reload', sessionStorage.getItem('sounds.reload')==='ready' && remembered.muted && Math.abs(remembered.volume-.43)<1e-6 && audio.level()<1e-6 && /off/i.test(document.querySelector('#sound').textContent));
s?.stop();loop?.stop(.01);await sleep(400);
audio.setMuted(false);await sleep(100);
const before=audio.diagnostics(), object=new site.THREE.Object3D();
const entry=await site.world.add({id:'sound-sleep-probe',object,shapes:[{type:'ball',radius:.1}],persist:true});
let heard=0;
for(let i=0;i<30;i++){await sleep(40);heard=Math.max(heard,audio.level());}
const after=audio.diagnostics();
check('sounds saved keepsakes and sleeping body restore silently while unmuted',
  startup.clips===0&&startup.loops===0&&startup.tones===0 && ['paper','tin','box','ticket'].every(id=>keepsakes.has(id)) && entry.body.isSleeping() &&
  before.clips===after.clips&&before.loops===after.loops&&before.tones===after.tones&&heard<1e-6,
  `startup ${startup.clips+startup.loops+startup.tones} voices; restore peak RMS ${heard.toExponential(1)}; sleeping ${entry.body.isSleeping()}`);
site.world.remove(entry.id);
