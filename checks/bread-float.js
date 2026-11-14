cat.auto=false;cat.setButter(false,'quiet');await E.bread.whenReady();
await site.cast('dome');await E.bread.whenBread();await sleep(150);   // the loaf's riser and pop first (playtest 3)
const cfg=E.bread.config.blast,frames=[];
let recording=true;
const sample=()=>{
 const f=E.bread.flight;
 if(f&&(!frames.length||frames.at(-1).u!==f.u))frames.push({u:f.u,t:stage.clock,x:cat.fx.x*cat.rect.ppu,y:cat.fx.y*cat.rect.ppu,rot:cat.fx.rot,scale:cat.fx.scale});
 if(recording)requestAnimationFrame(sample);
};
requestAnimationFrame(sample);
const started=performance.now();await E.bread.blastOff();   // spun off (checks/sky.js tests the spin trigger)
await until(()=>E.bread.state==='cat'&&!input.locked,15000);recording=false;
const flight=E.bread.flight,first=frames[0],last=frames.at(-1),duration=flight?(flight.ended-flight.started)/1000:NaN;
const before=flight?{x:flight.from.x*cat.rect.ppu,y:flight.from.y*cat.rect.ppu}:{x:0,y:0};
check('bread float lasts six seconds',cfg.fly===6&&Math.abs(duration-cfg.fly)<=.15,`${duration.toFixed(3)} s; config ${cfg.fly} s; ${frames.length} samples`);
const distance=p=>Math.hypot(p.x,p.y),far=last?distance(last):0;
check('bread float moves monotonically outward',frames.length>30&&frames.every((p,i)=>!i||distance(p)>=distance(frames[i-1])-1e-6),`${far.toFixed(2)} px outward`);
const eased=u=>u*u*u*(10+u*(-15+6*u));
const edges=frames.slice(1).map((p,i)=>({p,a:frames[i]})).filter(({p,a})=>a.u<.08||p.u>.92);
const excess=Math.max(0,...edges.map(({p,a})=>Math.hypot(p.x-a.x,p.y-a.y)-far*(eased(p.u)-eased(a.u))));
const launchJump=first?Math.hypot(first.x-before.x,first.y-before.y):Infinity;
check('bread float endpoints have no extra jump',!!last&&last.u===1&&first.u===0&&excess<=.5&&launchJump<=.5,`launch ${launchJump.toFixed(3)} px; excess over eased displacement ${excess.toFixed(3)} px`);
check('bread float rolls slowly or stays still in reduced motion',frames.length>0&&Math.max(...frames.map(p=>Math.abs(p.rot)))<.7&&(!stage.reducedMotion||frames.every(p=>p.rot===0)));
check('bread float return restores controls and existing keepsake',E.bread.state==='cat'&&!cat.standIn&&!input.locked&&cat.fx.scale===1&&cat.fx.opacity===1&&keepsakes.has('twinkle'),`${((performance.now()-started)/1000).toFixed(3)} s sequence; reduced ${stage.reducedMotion}`);
