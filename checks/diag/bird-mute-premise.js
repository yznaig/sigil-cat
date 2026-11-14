const {wallClock,pausePageCallbacks}=await import(new URL('src/core/page-scheduler.js',document.baseURI));
const wait=ms=>new Promise(r=>wallClock.setTimeout(r,ms));
await audio.load('assets/audio/designed/bird-boom.wav');
const c=audio.context(),rows=[];
for(const mode of ['warm','cold','cold-explicit-zero']){
  const frozen=false,resume=()=>{};
  audio.setVolume(.8);await wait(200);audio.play('assets/audio/designed/bird-boom.wav');await wait(mode==='warm'?150:1300);
  const wall=performance.now(),clock=c.currentTime;audio.setVolume(.27);audio.setMuted(true);
  await wait(300);rows.push({mode,phase:'before new voice',clock:c.currentTime-clock,gain:audio.output().gain.value,rms:audio.level()});
  if(mode==='cold-explicit-zero'){audio.output().gain.cancelScheduledValues(0);audio.output().gain.value=0;}
  audio.play('assets/audio/designed/bird-boom.wav');
  for(const ms of [40,40,40,100,200]){await wait(ms);rows.push({mode,phase:'new voice',wall:performance.now()-wall,clock:c.currentTime-clock,gain:audio.output().gain.value,rms:audio.level()});}
  resume();
}
note('bird mute premise',JSON.stringify(rows));
