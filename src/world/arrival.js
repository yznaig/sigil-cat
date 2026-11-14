// Furniture arrivals (Aaron, e1111-37, timing e1111-55). For whichever of the shelf and the pinboard is unlocked first,
// a concrete scrape fades in, very slowly, over 15 s with nothing on screen yet; then, still scraping at full level,
// the furniture grinds in from its own side (shelf from the left, board from the right) over the next 15 s and lands
// on the FF7R victory fanfare. The second one grinds in for exactly as long as the Spellsword fanfare takes to
// reach its climactic bong, and lands on it. Only at the live unlock: a reload (or an unlock restored from saved
// discoveries) places the furniture at once. The furniture cannot be used until it lands. Reduced motion: a short
// fade in place, the fanfares still play. Progress follows the audio clock, so slow frames or a hidden tab never put
// the landing out of step with the music, and mute/volume come from the one master bus.
// ?arrivals=0 places at once; ?arrivals=1 plays them even under automation (headless checks skip them otherwise).
import {clamp,smooth} from '../core/util.js';

export const ARRIVAL={
 first:{lead:15,seconds:15,scrape:'assets/audio/arrivals/concrete-scrape-loop.wav',scrapeGain:1,fadeSeconds:15,
  fanfare:['assets/audio/arrivals/ff7r-victory-fanfare.m4a','assets/audio/arrivals/ff7r-victory-fanfare.mp3'],gain:.9},
 // The bong's onset in rpg-victory-fanfare-2 (spectral-flux peak, ~11x the median; tools/audio/prepare-arrivals.py --bong):
 // 32.127 s (mp3) / 32.160 s (m4a). The slide lasts exactly this long, so it lands on the bong.
 second:{bong:32.14,fanfare:['assets/audio/arrivals/rpg-victory-fanfare-2.m4a','assets/audio/arrivals/rpg-victory-fanfare-2.mp3'],gain:.9},
 reducedSeconds:1.2,      // reduced motion: fade in place over this long
 queueGap:4.5,            // a second unlock during the first slide waits for it to land, plus its fanfare
 // The uneven pace of something heavy dragged by hand: speed lurches at these rates [Hz, depth, phase].
 grind:[[.43,.5,.4],[1.17,.27,1.9],[2.9,.08,.3]],
 judderPx:1.1,            // tiny vertical shudder while it grinds
 thunk:{seconds:.32,px:3},// the drop into place on landing
};
const FURNITURE={shelf:{category:'solid',side:-1},pinboard:{category:'flat',side:1}};

export function furnitureArrivals(site){return site.arrivals??=createArrivals(site);}
function createArrivals(site){
 const {stage,audio,supports}=site;
 let settled=stage.loaded;if(!settled)stage.onLoaded.push(()=>{settled=true;});
 const plans=new Map();
 const instant=()=>{const m=stage.opt('arrivals');return m==='0'||(m!=='1'&&!!navigator.webdriver);};
 // Called from the furniture's own discovery listener, the moment its category reaches two unique finds.
 function unlock(id){
  const f=FURNITURE[id];if(!f||!settled||instant()||plans.has(id)||supports.count(f.category)!==2)return null;
  const other=Object.keys(FURNITURE).find(k=>k!==id),otherUnlocked=supports.count(FURNITURE[other].category)>=2;
  // Reduced motion fades in place: it waits at home, transparent, never off screen.
  let land;const plan={id,side:f.side,ordinal:otherUnlocked?2:1,state:'waiting',u:stage.reducedMotion?1:0,dy:0,opacity:stage.reducedMotion?0:1,landed:new Promise(r=>land=r),hooks:null};
  plan.resolve=land;plans.set(id,plan);return plan;
 }
 // Velocity lurches, integrated to a monotonic progress table that ends exactly at 1 at `seconds`.
 function profile(seconds){
  const n=2048,table=new Float32Array(n+1),speed=new Float32Array(n+1);let sum=0;
  for(let i=0;i<=n;i++){const t=i/n*seconds;let v=1;for(const [hz,d,ph]of ARRIVAL.grind)v+=d*Math.sin(2*Math.PI*hz*t+ph);
   v*=.18+.82*smooth(t/1.6);v*=.35+.65*smooth((seconds-t)/.7);speed[i]=v;if(i)sum+=(v+speed[i-1])/2;table[i]=sum;}
  for(let i=0;i<=n;i++){table[i]/=sum;speed[i]=speed[i]/(sum/n);}
  return t=>{const x=clamp(t/seconds)*n,i=Math.min(n-1,Math.floor(x)),k=x-i;return {u:table[i]+(table[i+1]-table[i])*k,speed:speed[i]};};
 }
 async function begin(plan,hooks){
  plan.hooks=hooks;hooks.apply(plan);
  const before=[...plans.values()].find(p=>p!==plan&&p.state!=='landed');
  if(before){await before.landed;await new Promise(r=>setTimeout(r,ARRIVAL.queueGap*1000));}
  const reduced=stage.reducedMotion,first=plan.ordinal===1,C=ARRIVAL;
  const files=first?[C.first.fanfare,...(reduced?[]:[C.first.scrape])]:[C.second.fanfare];
  await Promise.race([Promise.all(files.map(f=>audio.load(f))),new Promise(r=>setTimeout(r,5000))]);
  // e1111-55: the first arrival's lead-in is heard before anything moves; the slide itself fills the last `seconds`.
  const lead=first&&!reduced?C.first.lead:0,seconds=lead+(reduced?C.reducedSeconds:first?C.first.seconds:C.second.bong),ctx=audio.context(),at=profile(seconds-lead);
  const clock=()=>ctx&&ctx.state!=='closed'?ctx.currentTime:performance.now()/1000;
  const t0=clock()+.08;let t=0,lastPerf=performance.now(),scrape=null;
  Object.assign(plan,{state:'moving',seconds,lead,reduced,t0,startedAt:performance.now(),audioClock:!!ctx});
  if(first){
   if(!reduced&&(scrape=audio.loop(C.first.scrape,{gain:0,cross:.6}))){
    // Slow fade in (gain grows with the square of time), cut on landing under the fanfare's first hit.
    const g=scrape.node.gain,curve=Float32Array.from({length:96},(_,i)=>C.first.scrapeGain*(i/95)**2);
    g.cancelScheduledValues(0);g.setValueAtTime(0,t0);g.setValueCurveAtTime(curve,t0,Math.min(C.first.fadeSeconds,seconds));g.setTargetAtTime(0,t0+seconds,.07);
   }
   plan.fanfareWhen=t0+seconds;plan.fanfare=audio.play(C.first.fanfare,{when:plan.fanfareWhen,gain:C.first.gain});
  }else{plan.fanfareWhen=t0;plan.fanfareOffset=reduced?C.second.bong-seconds:0;plan.fanfare=audio.play(C.second.fanfare,{when:t0,gain:C.second.gain,offset:plan.fanfareOffset});}
  plan.scrape=scrape;
  const tick=()=>{
   const now=performance.now(),dt=Math.min(.1,(now-lastPerf)/1000);lastPerf=now;
   // The audio clock when it runs (a hidden tab catches up on return); the frame clock if it ever stalls.
   t=ctx&&ctx.state==='running'?Math.max(t,ctx.currentTime-t0):t+(document.hidden?0:dt);
   if(plan.state==='moving'){
    const p=at(t-lead);plan.t=t;
    if(reduced){plan.u=1;plan.opacity=smooth(t/seconds);plan.dy=0;}
    else{plan.u=p.u;plan.dy=t<lead?0:ARRIVAL.judderPx*Math.sin(2*Math.PI*11.3*t)*Math.sin(2*Math.PI*2.7*t+.6)*Math.min(1.6,p.speed);}
    if(t>=seconds){plan.u=1;plan.opacity=1;plan.dy=0;plan.state='settling';plan.landedAt=clock();plan.landedPerf=now;hooks.apply(plan);hooks.land(plan);plan.resolve(plan);
     setTimeout(()=>scrape?.stop(.1),400);return;}
    hooks.apply(plan);return;
   }
   const k=(t-seconds)/ARRIVAL.thunk.seconds;
   if(k<1&&!reduced){plan.dy=ARRIVAL.thunk.px*Math.sin(Math.PI*k)*(1-k);hooks.apply(plan);return;}
   plan.dy=0;plan.state='landed';hooks.apply(plan);const i=stage.onFrame.indexOf(tick);if(i>=0)stage.onFrame.splice(i,1);
  };
  stage.onFrame.push(tick);
  return plan.landed;
 }
 return {unlock,begin,plans,instant,config:ARRIVAL,get active(){return [...plans.values()].some(p=>p.state!=='landed');}};
}
