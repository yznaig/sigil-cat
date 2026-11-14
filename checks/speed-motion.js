// Speed lane (playtest-2): moving pictures are drawn to a pixel budget (src/core/picture-motion.js) and sharp again
// once still; the cat's pop counts as motion; the desktop and phone check sizes are untouched by the budget.
// Run at desktop (1280x900) and phone; the big-window part resizes the page to 1920x1080 itself (desktop only).
const {MOTION,motionScale}=await import('/src/core/picture-motion.js');
const W=site.world,T=site.THREE,dpr=stage.dpr;
const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e;
// the check sizes keep full sharpness in motion, so the cost gates measure the same work as before
check('speed: the check size keeps full sharpness in motion',near(motionScale(stage),dpr),JSON.stringify({w:stage.width,h:stage.height,dpr,scale:motionScale(stage),budget:MOTION.budget}));
// The pop: he is redrawn every frame of it, at the moving scale, and sharp again after.
cat.auto=false;await until(()=>!cat.popping&&cat.phase==='hold',8000);
const rest=Math.max(dpr,cat.config.picture.rest),q=[];
cat.request(cat.pose==='sit'?'lie':'sit');
await until(()=>cat.popping,4000);
while(cat.popping){q.push(cat.quality);await new Promise(r=>requestAnimationFrame(r));}
await until(()=>cat.phase==='hold',4000);await sleep(400);
check('speed: a pop is drawn at the moving scale',q.length>5&&Math.max(...q.slice(2))<=motionScale(stage)+1e-6,JSON.stringify({frames:q.length,max:Math.max(...q.slice(2)),motion:motionScale(stage)}));
check('speed: after the pop he is sharp again',near(cat.quality,rest),JSON.stringify({quality:cat.quality,rest}));
if(!MOBILE){
 await __resize(1920,1080);await until(()=>innerWidth===1920,5000);await sleep(800);
 const k=motionScale(stage);
 check('speed: a 1920x1080 window draws moving pictures lighter',k<dpr&&near(k,Math.sqrt(MOTION.budget/(1920*1080)),1e-6),JSON.stringify({k,dpr}));
 const {collectFinal}=await import('/checks/world-final-collection.mjs');
 const items=await collectFinal(site,{cake:false});await until(()=>!W.stats.listening&&!site.supports.listening,20000);
 for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}
 const rifle=W.entries.get('rifle'),tin=W.entries.get('tin');
 // What a picture last drew, against what it would draw at the moving scale k and at full: both are the picture's
 // screen box times the scale, rounded up to 32 px. A splat prop's own target; an atlas tile's render size.
 const drawn=e=>{const p=e.presentation;if('renderWidth' in p)return p.renderWidth;const m=p.card.children[0].material.uniforms;return Math.round(m.region.value.x*m.map.value.image.width);};
 const at=(e,s)=>Math.ceil(e.presentation.rect.w*s/32)*32;
 // ('same': the two round to the same size, so the frame tells nothing)
 const kind=e=>{const d=drawn(e),light=at(e,k),full=at(e,dpr);return light===full?'same':d===light?'light':d===full?'full':'other '+d+'/'+light+'/'+full;};
 const throwUp=e=>{W.cancelReturn(e);e.body.setTranslation({x:e===rifle?-.3:.3,y:1.1,z:.2},true);e.body.setLinvel({x:0,y:1.5,z:0},true);e.body.setAngvel({x:2,y:3,z:1},true);W.wake(e);};
 throwUp(rifle);throwUp(tin);const moving={rifle:[],tin:[]};
 const spin=e=>{const v=e.body.linvel(),w=e.body.angvel();return Math.hypot(v.x,v.y,v.z)+Math.hypot(w.x,w.y,w.z);};
 for(let n=0;n<20;n++){await new Promise(r=>requestAnimationFrame(r));for(const [id,e]of [['rifle',rifle],['tin',tin]])if(spin(e)>.3)moving[id].push(kind(e)+(stage.opt('why')?' '+[e.presentation.precise,e.body.isSleeping(),!!e.support,spin(e).toFixed(2),e.object.position.y.toFixed(2)].join(','):''));}
 throwUp(rifle);await sleep(250);await __shot('speed-motion-moving-1920');
 const lighter=a=>{const told=a.filter(x=>!x.startsWith('same'));return told.length>5&&told.every(x=>x.startsWith('light'));};
 check('speed: a tumbling splat prop is drawn at the moving scale',lighter(moving.rifle),JSON.stringify({k,seen:moving.rifle}));
 check('speed: a tumbling mesh item is drawn at the moving scale',lighter(moving.tin),JSON.stringify({k,seen:moving.tin}));
 // Visibly still but not yet asleep (Rapier waits about 2 s): sharp already.
 await until(()=>spin(rifle)<.002&&spin(tin)<.002,8000,16);await sleep(MOTION.stillMs+250);      // still for a moment, well before Rapier's ~2 s sleep
 const asleep={rifle:rifle.body.isSleeping(),tin:tin.body.isSleeping()};
 check('speed: still before sleep, the pictures are sharp again',kind(rifle)!=='light'&&kind(tin)!=='light'&&!kind(rifle).startsWith('other')&&!kind(tin).startsWith('other'),JSON.stringify({asleep,rifle:kind(rifle),tin:kind(tin)}));
 await until(()=>!W.stats.listening,10000);await sleep(200);
 check('speed: at rest the pictures are full sharpness',['full','same'].includes(kind(rifle))&&['full','same'].includes(kind(tin)),JSON.stringify({rifle:kind(rifle),tin:kind(tin)}));
 await __shot('speed-motion-rest-1920');
}
__done();
