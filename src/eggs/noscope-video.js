// Aaron's own montage. Deliberately separate from the rifle's representation/physics.
import { css } from '../core/util.js';

export const NOSCOPE_VIDEO = {
  file: 'assets/video/noscope.mp4', riser: 'assets/audio/noscope-riser.mp3',
  // back: seconds for the page to return after the video. 0 = at once (Aaron, e1111-58: "it should just abruptly
  // return to normal").
  black: 5, in: 1, back: 0,
  // The riser never gets louder than the video's opening (Aaron, e1111-58). The video's first second peaks at
  // -19.6 LUFS momentary; the riser would reach -14.0. Its gain in dB every 0.1 s of the file, from
  // tools/audio/noscope-riser-cap.py (re-measured with this curve: -19.7 LUFS). The file is untouched.
  riserCap: { lufs: -19.6, step: 0.1, gainDb: [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,-0.45,-1.35,-2.25,-2.95,-3.85,-4.55,-5.35,-5.95,-5.95,-5.95,-5.95,-5.95] },
};
css('noscope-video', `
.noscope-video.controls { position:fixed; inset:0; left:0; top:0; translate:none; width:100%; max-width:none;
  display:block; margin:0; background:#000; opacity:0; z-index:100; overflow:hidden; color:#eee; }
.noscope-video video { display:block; width:100%; height:100%; object-fit:contain; opacity:0; pointer-events:none; }
.noscope-video .video-controls { position:absolute; top:max(12px,env(safe-area-inset-top)); right:16px;
  display:flex; align-items:center; justify-content:center; gap:12px; }
body.noscope-showing #footer { z-index:101; opacity:1; visibility:hidden; }
body.noscope-showing #footer * { pointer-events:none; }
body.noscope-showing #footer .sound.controls { position:relative; left:auto; top:auto; translate:none;
  width:auto; max-width:none; margin:0; display:inline-flex; flex-wrap:nowrap; gap:10px;
  visibility:visible; color:#eee; --dark:#eee; --ink:#eee; letter-spacing:inherit; text-transform:inherit;
  background:#222; border-radius:5px; box-shadow:0 0 0 8px #222; }
body.noscope-showing #footer .sound button { font:inherit; padding:0; border-radius:0; background:none; color:#eee; }
body.noscope-showing #footer .sound button, body.noscope-showing #footer .sound input { pointer-events:auto; }
body.noscope-showing #volume { opacity:1; touch-action:none; }
body.noscope-showing #volume::-webkit-slider-runnable-track { background:linear-gradient(#eee,#eee) 0 / var(--v,80%) 100% no-repeat,#666; }
body.noscope-showing #volume::-moz-range-track { background:#666; }
`);

export function createNoScopeVideo(site) {
  const {audio,input}=site, C=NOSCOPE_VIDEO;
  // Only this small audio clip preloads. No video element or URL assignment exists before fire().
  const ready=audio.load(C.riser);
  let run=null, bus=null, meter=null, lastEnd=null;
  function sound({muted,volume}=audio.state()) {
    if(bus) bus.gain.value=muted?0:volume;
    if(!run)return;
    run.video.muted=muted;run.video.volume=bus?1:volume;
    const master=audio.output();
    if(master){master.gain.cancelScheduledValues(0);master.gain.value=0;}
  }
  audio.onChange(sound);
  // The cap as gain multipliers over [offset, offset + duration] of the file, linearly between the 0.1 s points.
  function capCurve(offset,duration){
    const {step,gainDb}=C.riserCap,n=Math.max(2,Math.round(duration/step)+1),last=gainDb.length-1;
    return Float32Array.from({length:n},(_,i)=>{
      const k=Math.min(last,(offset+i*duration/(n-1))/step),j=Math.min(last-1,Math.floor(k)),f=k-j;
      return 10**((gainDb[j]+(gainDb[j+1]-gainDb[j])*f)/20);
    });
  }
  function riser(r,offset,duration) {
    const source=audio.play(C.riser,{offset,duration,dest:bus});
    if(source){
      const c=audio.context(),curve=capCurve(offset,duration);   // play() starts it at this currentTime
      source.gain.gain.setValueCurveAtTime(curve,c.currentTime,duration);source.cap={offset,duration,at:c.currentTime,curve};
      r.sources.add(source);r.capped.push(source.cap);source.onended=()=>r.sources.delete(source);
    }
  }
  function finish(reason) {
    const r=run;if(!r||r.returning)return;
    r.returning=true;r.phase='back';lastEnd=reason;
    cancelAnimationFrame(r.raf);r.video.pause();
    for(const source of r.sources){try{source.stop();}catch{/* already ended */}}r.sources.clear();
    const opacity=+getComputedStyle(r.root).opacity, videoOpacity=+getComputedStyle(r.video).opacity;
    for(const animation of r.root.getAnimations({subtree:true}))animation.cancel();
    r.video.style.opacity=videoOpacity;
    const restore=()=>{
      r.root.remove();r.video.removeAttribute('src');r.video.load();r.media?.disconnect();
      if(run!==r)return;
      run=null;document.body.classList.remove('noscope-showing');
      r.soundControl?.classList.remove('controls');input.lock('noscope-video',false);
      const master=audio.output(), state=audio.state();
      if(master){master.gain.cancelScheduledValues(0);master.gain.value=state.muted?0:state.volume;}
      r.returnedAt=performance.now();r.resolve();
    };
    // Abrupt by default: the overlay goes and the page's sound is back in the same task.
    if(!(C.back>0)){r.root.style.opacity=0;restore();return;}
    r.root.animate([{opacity},{opacity:0}],{duration:C.back*1000,fill:'forwards'}).finished.then(restore);
  }
  const skip=()=>finish('skip');input.onEscape.push(skip);
  function fire() {
    if(run)return run.promise;
    const root=document.createElement('div');
    // .controls is the input lock's explicit exemption. The overlay consumes its
    // own taps; underlying cat/page input remains locked. Controls share the page bus state.
    root.className='noscope-video controls';root.setAttribute('role','dialog');root.setAttribute('aria-label','360 no-scope video');
    const video=document.createElement('video');video.playsInline=true;video.preload='auto';video.disablePictureInPicture=true;
    const toolbar=document.createElement('div');toolbar.className='video-controls';
    const exit=document.createElement('button');exit.type='button';exit.textContent='skip';
    toolbar.append(exit);root.append(video,toolbar);document.body.appendChild(root);
    let resolve;const promise=new Promise(r=>{resolve=r;});
    const soundControl=document.querySelector('#footer .sound');
    soundControl?.classList.add('controls');document.body.classList.add('noscope-showing');
    const r=run={root,video,soundControl,resolve,promise,sources:new Set(),capped:[],phase:'loading',shown:false,returning:false};
    input.lock('noscope-video',true);
    exit.onclick=skip;
    root.addEventListener('pointerup',e=>{if(!e.target.closest('.video-controls'))skip();});
    root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();skip();}});
    video.onended=()=>finish('ended');video.onerror=()=>finish('error');
    video.onplaying=()=>{
      if(run!==r||r.returning||r.shown)return;
      r.shown=true;r.phase='playing';
      // If loading held us at black, resume the last second of the riser here.
      riser(r,C.black,C.in);
      video.animate([{opacity:0},{opacity:1}],{duration:C.in*1000,fill:'forwards',easing:'linear'});
    };
    const ctx=audio.context();
    if(ctx){
      if(!bus){bus=ctx.createGain();meter=ctx.createAnalyser();meter.fftSize=2048;bus.connect(meter);meter.connect(audio.destination());}
      r.media=ctx.createMediaElementSource(video);r.media.connect(bus);
    }
    sound();
    // Fetch starts now, with five seconds to buffer the faststart MP4.
    video.src=new URL('../../'+C.file,import.meta.url).href;video.load();
    ready.then(()=>{
      if(run!==r||r.returning)return;
      const start=performance.now();r.phase='black';riser(r,0,C.black);
      root.animate([{opacity:0},{opacity:1}],{duration:C.black*1000,fill:'forwards',easing:'linear'});
      const frame=()=>{
        if(run!==r||r.returning)return;
        if(performance.now()-start>=C.black*1000){
          r.phase='waiting';
          if(video.readyState>=3){video.play().catch(()=>finish('blocked'));return;}
        }
        r.raf=requestAnimationFrame(frame);
      };r.raf=requestAnimationFrame(frame);
    });
    return promise;
  }
  const api={fire,stop:skip,get active(){return !!run;},get phase(){return run?.phase??'idle';},get lastEnd(){return lastEnd;},
    get audio(){return {gain:bus?.gain.value??0,riser:!!run?.sources.size,pageGain:audio.output()?.gain.value??0,
      riserGain:[...(run?.sources||[])].map(s=>s.gain.gain.value),capped:run?[...run.capped]:[]};},
    capCurve,
    level(){if(!meter)return 0;const data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((n,x)=>n+x*x,0)/data.length);},
  };
  site.eggs.noscopeVideo=api;
  return api;
}
