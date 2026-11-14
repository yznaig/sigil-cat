// Read the rendered mesh, not FLING's settings. Bounds are projected geometry vertices.
cat.auto = false;
await cat.ensureButter(); cat.setButter(true, 'quiet'); await sleep(700);
const trace = [];
const bounds = obj => {
 obj.updateWorldMatrix(true, false);
 const a = obj.geometry.attributes.position, p = new site.THREE.Vector3(), xs = [], ys = [];
 for (let i=0;i<a.count;i++) { p.fromBufferAttribute(a,i).applyMatrix4(obj.matrixWorld); const q=stage.toScreen(p); xs.push(q.x);ys.push(q.y); }
 return {w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
};
let sampling=true;
function sampleButter() {
 const p=keepsakes.get('pat');
 if(p?.flight) { const q=stage.toScreen(p.object.position);trace.push({t:stage.clock,x:q.x/stage.width,y:q.y/stage.height,w:bounds(p.object).w,base:p.w}); }
 if(sampling) requestAnimationFrame(sampleButter);
}
requestAnimationFrame(sampleButter);
const started=stage.clock; await E.fling.fling(); sampling=false;
// The window is timed from the flight's first frame: giving the pat its first body can take a while on a busy host.
const t0=trace[0]?.t??started,impact=trace.filter(p=>p.t-t0>=.36 && p.t-t0<=.54);
check('look butter glass landing central',impact.length>=3 && impact.every(p=>Math.abs(p.x-.5)<=.121 && Math.abs(p.y-.4)<.005),`centre ${impact[0]?.x.toFixed(3)}, ${impact[0]?.y.toFixed(3)}; ${impact.length} impact frames`);
check('look butter glass landing enlarged',impact.length>=3 && Math.max(...impact.map(p=>p.w/p.base))>=2.4,`projected width / resting width ${Math.max(...impact.map(p=>p.w/p.base)).toFixed(3)}`);
await sleep(500);
for (const route of ['sigil','positive','negative']) {
 cat.fling(0); cat.setYaw(route==='sigil' ? .73 : route==='positive' ? -1.2 : 2.1);
 const frames=[]; let recording=true;
 function sampleYaw() { frames.push({t:stage.clock,y:cat.spin.rotation.y,phase:E.galaxy.phase}); if(recording) requestAnimationFrame(sampleYaw); }
 requestAnimationFrame(sampleYaw);
 if(route==='sigil') await spinHard(()=>E.galaxy.isOpen,{pxPerSec:2600,max:90});   // the star is a spin now (playtest 2)
 else {
  // Keep a player's velocity above the trigger threshold, in each direction.
  const v=route==='positive'?19:-27;
  const feed=()=>{if(!E.galaxy.isOpen)cat.fling(v);};stage.onFrame.push(feed);
  await until(()=>E.galaxy.isOpen,10000);stage.onFrame.splice(stage.onFrame.indexOf(feed),1);
 }
 const opened=await until(()=>E.galaxy.phase==='spin',5000);
 await until(()=>E.galaxy.phase==='hold',15000);
 const landed=stage.clock; await stage.after(.55); recording=false;
 const hold=frames.filter(p=>p.phase==='hold');
 const error=Math.max(...hold.map(p=>Math.abs(Math.atan2(Math.sin(p.y),Math.cos(p.y)))));
 const tail=frames.filter(p=>p.t>=landed-.5 && p.t<=landed+.5);
 const steps=tail.slice(1).map((p,i)=>({d:Math.abs(p.y-tail[i].y),phase:p.phase}));
 const approach=frames.filter(p=>p.t>=landed-1 && p.t<landed-.5);
 const own=Math.max(0,...approach.slice(1).map((p,i)=>Math.abs(p.y-approach[i].y)));
 const last=Math.max(0,...steps.map(p=>p.d));
 const windStep=Math.max(0,...steps.filter(p=>p.phase==='spin').map(p=>p.d));
 const holdStep=Math.max(0,...steps.filter(p=>p.phase==='hold').map(p=>p.d));
 check(`look galaxy ${route} faces camera smoothly`,opened && hold.length>10 && error<=.02 && last<=own+1e-8 && holdStep<=windStep+1e-8,`yaw error ${error.toFixed(6)} rad; last .5s + hold max step ${last.toFixed(6)}, preceding wind-down max ${own.toFixed(6)}; hold step ${holdStep.toFixed(6)} vs final wind-down ${windStep.toFixed(6)}`);
 if(route==='sigil') {stage.timeScale=0;await __shot('look-galaxy-landing');stage.timeScale=1;}
 E.galaxy.skip();                 // it holds until a click now (playtest 2)
 await until(()=>!E.galaxy.isOpen,10000);
 await sleep(5500);
 check(`look galaxy ${route} resumes home`,Math.abs(Math.atan2(Math.sin(cat.yaw+.45),Math.cos(cat.yaw+.45)))<.03,`yaw ${cat.yaw}`);
}
