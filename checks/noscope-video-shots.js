cat.auto=false;
const done=site.fire('noscope');
const root=document.querySelector('.noscope-video'),video=root.querySelector('video');
// Hold the play request until the black frame has been captured, like a buffered start.
const play=video.play.bind(video);let release;
const gate=new Promise(r=>{release=r;});video.play=()=>gate.then(play);
await sleep(5300);await __shot('noscope-video-black');
release();await until(()=>!video.paused,5000);await sleep(400);
const animation=video.getAnimations()[0];animation?.pause();video.pause();
await __shot('noscope-video-fade-in');animation?.play();await play();
await until(()=>video.currentTime>=8,12000);video.pause();
await __shot('noscope-video-playing');
await play();await done;await sleep(100);
await __shot('noscope-video-back');check('noscope video review shots captured',true);
