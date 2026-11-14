// World polish lane (e1111-58, item 6): the spinning top spins about 4 s longer when tapped, the circle sigil spins it
// too, and it rights itself smoothly (no teleport upright). Run with checks/lib.js; with --reduced it stays still.
cat.auto=false;
const T=site.THREE,W=site.world,spinner=site.worldProps.topSpin;
const top=keepsakes.give('top');await top.worldTask;
await until(()=>!W.stats.listening,15000);
const b=top.worldEntry.body,up=new T.Vector3(0,1,0);
const tilt=()=>up.clone().applyQuaternion(new T.Quaternion().copy(b.rotation())).angleTo(up)*180/Math.PI;
const restTilt=tilt();
check('the top lies tipped over at rest',restTilt>(stage.reducedMotion?5:20),`${restTilt.toFixed(0)} degrees from upright`);
// record every rendered frame: lean, position, spin speed
const frames=[];let rec=null;
const sample=()=>{const p=b.translation();frames.push({t:performance.now(),tilt:tilt(),p:{x:p.x,y:p.y,z:p.z},w:b.angvel?Math.abs(new T.Vector3().copy(b.angvel()).dot(up.clone().applyQuaternion(new T.Quaternion().copy(b.rotation())))):0,phase:spinner.phase});};
stage.onRender.push(sample);
top.def.tap(top);
if(stage.reducedMotion){
 await sleep(800);stage.onRender.splice(stage.onRender.indexOf(sample),1);
 check('reduced motion: the top does not spin',spinner.phase==='rest'&&Math.abs(tilt()-restTilt)<1);
}else{
 await sleep(190);await __shot('polish-top-righting');
 await sleep(1800);await __shot('polish-top-spinning');
 await until(()=>spinner.phase==='rest'&&W.stats.listening===false,20000);
 stage.onRender.splice(stage.onRender.indexOf(sample),1);
 const t0=frames[0].t,firstUp=frames.findIndex(f=>f.tilt<15),fell=frames.findIndex((f,i)=>i>firstUp&&f.tilt>45);
 const steps=frames.slice(1).map((f,i)=>({lean:Math.abs(f.tilt-frames[i].tilt),move:Math.hypot(f.p.x-frames[i].p.x,f.p.y-frames[i].p.y,f.p.z-frames[i].p.z)}));
 const righting=steps.slice(0,Math.max(1,firstUp));
 check('it rises smoothly to upright, never snapping',firstUp>8&&Math.max(...righting.map(s=>s.lean))<9&&Math.max(...righting.map(s=>s.move))<.02,
  `${firstUp} frames from ${restTilt.toFixed(0)} to upright; largest step ${Math.max(...righting.map(s=>s.lean)).toFixed(1)} degrees, ${Math.max(...righting.map(s=>s.move)).toFixed(4)} units`);
 const spinS=(frames[fell]?.t-t0)/1000;
 check('it spins about 4 s longer than the old ~0.7 s',spinS>4.5&&spinS<7.5,`upright and spinning for ${spinS.toFixed(2)} s after the tap`);
 const upright=frames.filter(f=>f.phase==='spinning');
 check('while it spins it stays near upright, leaning more as it slows',Math.max(...upright.map(f=>f.tilt))<16&&upright.slice(0,20).every(f=>f.tilt<6),`max lean ${Math.max(...upright.map(f=>f.tilt)).toFixed(1)} degrees`);
 check('then it falls over and rests on the floor',b.isSleeping()&&tilt()>20&&top.elapsed>=6);
}
// the circle sigil spins a loose top too
await until(()=>!W.stats.listening,15000);
const before=spinner.stats.spins;
site.cast('circle');await sleep(120);
check(stage.reducedMotion?'reduced motion: the circle leaves the top still':'the circle sigil spins a loose top',stage.reducedMotion?spinner.stats.spins===before:spinner.spinning===top&&spinner.stats.spins===before+1);
await until(()=>!E.circle.spinning&&spinner.phase==='rest'&&!W.stats.listening,20000);
// put away on the shelf it stays put away
const tin=keepsakes.give('tin');await tin.worldTask;await site.shelf.ensure();await until(()=>!W.stats.listening,15000);
const stored=!!site.shelf.store('top',false)&&await until(()=>top.worldEntry.support?.id==='shelf',3000);
const n=spinner.stats.spins;site.cast('circle');await sleep(200);
check('a top stored on the shelf stays put when the circle is cast',stored&&spinner.stats.spins===n&&top.worldEntry.support?.id==='shelf');
await until(()=>!E.circle.spinning,6000);
