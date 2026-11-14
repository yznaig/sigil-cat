cat.auto=false;await site.rack.ready();await E.hat.wear('wizard');await cat.ensureButter();cat.setButter(true,'quiet');
let frames=0;const tick=()=>frames++;stage.onFrame.push(tick);
const trace=[];cat.request('lie');
for(let n=0;n<15;n++){await sleep(200);trace.push({n,frames,pose:cat.pose,phase:cat.phase,popping:cat.popping,loaded:Object.keys(cat.poses),hatParent:site.rack.hats.get('wizard').hatArt.parent?.uuid,seat:cat.seat.uuid,scale:stage.timeScale,hidden:document.hidden});}
stage.onFrame.splice(stage.onFrame.indexOf(tick),1);note('rack pose premise',JSON.stringify(trace));
