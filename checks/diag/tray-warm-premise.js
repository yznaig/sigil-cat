while(!window.site?.stage)await new Promise(r=>setTimeout(r,20));
let holdWarm=true;
window.site.stage.setBusyCheck(()=>holdWarm&&window.site.stage.warmLog.some((s,i,a)=>s.includes('s butterman ')&&a.length>i+2));
// Run with checks/run.mjs --js checks/diag/tray-warm-premise.js --size phone.
// Hold the deferred queue after Butterman's initial upload, then release it with
// no tray changes. Trace actual WebGL texture creation, not JS object counts.
const site=window.site,{stage,cat,audio,keepsakes}=site;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=20000)=>{const end=performance.now()+ms;while(performance.now()<end){if(f())return true;await sleep(40);}return false;};
const check=(name,ok,detail)=>__say(`CHECK ${name}: ${detail} ${ok?'PASS':'FAIL'}`);
await until(()=>stage.loaded);await site.ready;audio.context(true);
await until(()=>audio.status('thunder')!=='pending'&&audio.status('purr')!=='pending',15000);
cat.auto=false;
const R=stage.renderer,events=[],gl=R.getContext();Error.stackTraceLimit=35;
let drawing=null;const direct=R.renderBufferDirect;
R.renderBufferDirect=function(camera,scene,geometry,material,object,...rest){drawing={geometry:geometry.type,object:object.name||object.type,material:material.type};try{return direct.call(this,camera,scene,geometry,material,object,...rest);}finally{drawing=null;}};
for(const name of ['createTexture','deleteTexture']){const prior=gl[name];gl[name]=function(...args){events.push({event:name,drawing,stack:new Error().stack.split('\n').filter(l=>l.includes('localhost')).slice(-8)});return prior.apply(this,args);};}
const cards=['paper','postcard','ticket'].map(id=>keepsakes.give(id));await Promise.all(cards.map(i=>i.worldTask));await sleep(2000);site.pinboard.select('paper');site.pinboard.pin('paper',false);await sleep(300);
await until(()=>stage.warmLog.some((s,i,a)=>s.includes('s butterman ')&&a.length>i+2),10000);
const before={...R.info.memory},warmBefore=[...stage.warmLog];events.length=0;
holdWarm=false;await until(()=>stage.warmLeft===0,20000);await sleep(100);
await __say('CHECK deferred warm allocations without any tray layout '+JSON.stringify({before,after:R.info.memory,warmBefore,warmAfter:stage.warmLog,events}));
const warmed={...R.info.memory};for(let n=0;n<12;n++){site.pinboard.select(cards[n%3].id);await sleep(50);}site.pinboard.select('paper');await sleep(150);
check('warmed repeated tray resource stability',R.info.memory.geometries<=warmed.geometries+2&&R.info.memory.textures<=warmed.textures+1,JSON.stringify({before:warmed,after:R.info.memory}));
