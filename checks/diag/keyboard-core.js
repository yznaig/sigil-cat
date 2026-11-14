// Existing playthrough's core sequence, with velocity/press/frame evidence.
let source=(await (await fetch('/checks/play.js')).text()).split('// ---- N1:')[0];
// Default reproduces the old wall-clock premise; ?simulation=1 is the corrected
// control. Assertions stay identical in both conditions.
if(!new URLSearchParams(location.search).has('simulation'))source=source.replace('await Promise.race([stage.after(0.5),sleep(3000)]);','await sleep(500);');
const calls=[];let frames=0;
const tick=()=>frames++;stage.onFrame.push(tick);
for(const key of ['fling','setYawTarget']){const old=cat[key];cat[key]=function(...args){calls.push({key,args,t:performance.now()});return old.apply(this,args);};}
const state=()=>({time:performance.now(),frames,yaw:cat.yaw,vel:cat.vel,press:cat.pressing,inputPress:input.pressing,locked:input.locked,scripted:cat.scripted,hidden:document.hidden,calls:calls.splice(0)});
try{
 const text=source.replace("canvas.focus(); const y0", "canvas.focus(); note('keyboard before',JSON.stringify(state())); const y0")
 .replace("const t0 = cat.taps;", "note('keyboard after wait',JSON.stringify(state()));const t0 = cat.taps;");
 await eval('(async()=>{'+text+'})()');
}finally{stage.onFrame.splice(stage.onFrame.indexOf(tick),1);}
