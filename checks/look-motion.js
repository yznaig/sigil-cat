cat.setButter(true, 'quiet'); await sleep(1000);
// The physical pat's world adapter loads asynchronously (~1.2s). Sampling
// before it exists recorded its seated pose as the "rest" phase.
await keepsakes.get('pat')?.worldTask;
const samples = []; let running = true;
function sample() {
 const fly = document.querySelector('.flying-pat'), pat = keepsakes.get('pat');
 let p;
 if (pat?.object) {const q=stage.toScreen(pat.object.position);p={x:q.x,y:q.y,phase:fly?'slide':'rest'};}
 else if (fly) { const b = fly.getBoundingClientRect(); p = { x:b.x+b.width/2,y:b.y+b.height/2,phase:'slide' }; }
 else if (pat) { if (pat.object) { const q=stage.toScreen(pat.object.position); p={x:q.x,y:q.y,phase:'rest'}; } else { const b=pat.el.getBoundingClientRect(); p={x:b.x+b.width/2,y:b.y+b.height/2,phase:'rest'}; } }
 if(p) samples.push({...p,anchor:pat?.px.y,inset:stage.insets.bottom,t:performance.now()});
 if(running) requestAnimationFrame(sample);
}
requestAnimationFrame(sample); await E.fling.fling(); await sleep(1100); running=false;
const i=samples.findIndex(p=>p.phase==='rest'), rest=samples.slice(i), prev=samples[i-1];
const span=rest.at(-1).t-rest[0].t;
const drift=Math.max(...rest.map(p=>Math.hypot(p.x-rest[0].x,p.y-rest[0].y)));
const around=samples.slice(Math.max(0,i-3),i+4);
const largest=Math.max(...around.slice(1).map((p,j)=>Math.hypot(p.x-around[j].x,p.y-around[j].y)));
const step=prev?Math.hypot(rest[0].x-prev.x,rest[0].y-prev.y):Infinity;
check('look butter rest stable for one second',drift<0.5 && span>=1000 && rest.length>=10,`${drift.toFixed(3)} px over ${span.toFixed(0)} ms (${rest.length} frames)`);
check('look butter handover below half a pixel',step<0.5 && largest<8,`${step.toFixed(3)} px; largest step across 7 frames ${largest.toFixed(3)} px; frames ${samples.length}`);
note('look measured handover',JSON.stringify(samples.slice(i-3,i+8)));

note('look initial layout',JSON.stringify(samples[0]));
