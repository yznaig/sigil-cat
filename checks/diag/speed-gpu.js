// Speed lane (playtest-2): GPU cost of the pictures that move, per window size, measured in isolation. Diagnostic only.
//   node checks/run.mjs "$BASE/?dpr=1" --lib checks/lib.js --js checks/diag/speed-gpu.js --size 1280x720 --gpu amd --timeout 900
// The live-loop numbers (speed-window.js) swing with the host's load: a GPU timer measures from its first command to
// its last, so a main thread starved by other work stretches it. Here each case is submitted back to back, REPS times
// in one timer query, so the GPU is never waiting on the page, and a 1-pixel read-back after it gives a wall time too.
// Cases, at each window size:
//   pop-before     his picture drawn at his still sharpness (picture px per page px = max(dpr, 2)), as every pop frame was
//   pop-after      the same at the moving scale (src/core/picture-motion.js motionScale), as a pop frame is now
//   props-before   the final-cost twenty bodies' pictures, all redrawn once, at full sharpness (a moving frame before)
//   props-after    the same at the moving scale (a moving frame now)
//   splats-after   only the three splat props (rifle, top, controller); splats-lod: the same with half their Gaussians
//   atlas-after    only the mesh items (one atlas pass)
//   main           the page's main pass (what every frame costs, moving or not)
const sizes=(stage.opt('sizes')||'1280x720,1920x1080,2560x1440,3840x2160').split(',').map(s=>s.split('x').map(Number));
const REPS=Number(stage.opt('reps')||12),ROUNDS=Number(stage.opt('rounds')||3);
const {MOTION,motionScale}=await import('/src/core/picture-motion.js');
const gl=stage.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),R=stage.renderer,T=site.THREE,W=site.world;
note('speed gpu renderer',String(gl.getParameter((gl.getExtension('WEBGL_debug_renderer_info')||{}).UNMASKED_RENDERER_WEBGL||gl.RENDERER))+' timer '+!!ext);
const px=new Uint8Array(4);
async function cost(fn){
 fn();R.setRenderTarget(null);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);      // warm, and drain the queue
 const q=ext&&gl.createQuery();if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
 const t0=performance.now();for(let i=0;i<REPS;i++)fn();
 if(q)gl.endQuery(ext.TIME_ELAPSED_EXT);R.setRenderTarget(null);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
 const wall=(performance.now()-t0)/REPS;let gpu=NaN;
 if(q){await until(()=>gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE),5000,5);if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6/REPS;gl.deleteQuery(q);}
 return {gpu,wall};
}
// his picture, drawn the way src/core/cat.js draws it, at q picture pixels per page pixel
const catRT=new T.WebGLRenderTarget(4,4,{depthBuffer:true,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter});
const catCam=stage.camera.clone();
function catPicture(q){const r=cat.rect,w=Math.max(1,Math.ceil(r.w*q)),h=Math.max(1,Math.ceil(r.h*q));if(catRT.width!==w||catRT.height!==h)catRT.setSize(w,h);
 catCam.copy(stage.camera);const v=stage.camera.view;catCam.setViewOffset(stage.width,stage.height,r.x+(v?.enabled?v.offsetX:0),r.y+(v?.enabled?v.offsetY:0),r.w,r.h);catCam.layers.set(1);
 R.setRenderTarget(catRT);R.setClearColor(0,0);R.clear();R.render(stage.scene,catCam);R.setRenderTarget(null);}
// the twenty, in the final-cost gate's tumbling poses (not stepped: same poses every repeat)
const {collectFinal}=await import('/checks/world-final-collection.mjs');
const items=await collectFinal(site,{cake:false});await until(()=>!W.stats.listening&&!site.supports.listening,20000);
for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}
const ids=['rifle','top','tin','pat','eyes','twinkle','crumbs','shards','box','flour','bucket','pitchfork','recipe-flour','recipe-butter','recipe-milk','rack/wizard','rack/cone','rack/crown','bulb','controller'];
const entries=items.map(i=>i.worldEntry),list=ids.map(id=>W.entries.get(id));
for(const e of entries)if(!list.includes(e))site.supports.mount(e,e.id==='rack/party'?'rack':'pinboard',e.id==='rack/party'?'party':e.id,{animate:false});
for(const e of list){site.supports.detach(e,{wake:false});e.body.setEnabled(true);e.object.visible=true;}
function pose(){for(const [n,e]of list.entries()){const row=Math.floor(n/2);W.cancelReturn(e);e.body.setTranslation({x:(n%2-.5)*1.4,y:.45+(row%4)*.22,z:-row*.9},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37+.4,n*.13,n*.23)),false);e.body.setLinvel({x:0,y:0,z:0},false);e.body.setAngvel({x:0,y:0,z:0},false);e.body.sleep();
 e.object.position.copy(e.body.translation());e.object.quaternion.copy(e.body.rotation());e.object.updateMatrixWorld(true);}}
let fake=false;const real=Object.getOwnPropertyDescriptor(W,'syncing');Object.defineProperty(W,'syncing',{configurable:true,get:()=>fake||real.get.call(W)});
MOTION.stillMs=Infinity;      // the poses do not change between repeats; they stand for one moving frame each
const isSplat=e=>!('renderWidth' in e.presentation);
function props(only){fake=true;for(const e of list)if(!only||only(e)){e.presentation.precise=false;e.presentation.draw(true);}fake=false;site.meshPictures.flush();}
const out=[];
async function sizeTo([w,h]){await __resize(w,h);await until(()=>innerWidth===w&&innerHeight===h,5000);await sleep(600);}
const keep=MOTION.budget;
for(const s of sizes){
 await sizeTo(s);pose();await sleep(300);
 const k=motionScale(stage),rest=Math.max(stage.dpr,cat.config.picture.rest),res={};
 for(let round=0;round<ROUNDS;round++){
  const cases={'pop-before':()=>catPicture(rest),'pop-after':()=>catPicture(k),
   'props-before':()=>{MOTION.budget=Infinity;props();},'props-after':()=>{MOTION.budget=keep;props();},
   'splats-after':()=>{MOTION.budget=keep;props(isSplat);},'splats-lod':()=>{MOTION.budget=keep;MOTION.splats=.5;props(isSplat);MOTION.splats=1;},
   'atlas-after':()=>{MOTION.budget=keep;props(e=>!isSplat(e));},
   main:()=>{R.setRenderTarget(null);stage.renderer.render(stage.scene,stage.camera);}};
  for(const [name,fn]of Object.entries(cases)){const r=await cost(fn);(res[name]??=[]).push(r);}
 }
 MOTION.budget=keep;
 const med=a=>{const s=a.slice().sort((x,y)=>x-y);return +s[s.length>>1].toFixed(2);};
 const row={size:s.join('x'),dpr:stage.dpr,k:+k.toFixed(3),rest,cat:[Math.round(cat.rect.w),Math.round(cat.rect.h)],load:(await __loadAverage())[0].toFixed(1)};
 for(const [n,a]of Object.entries(res))row[n]={gpu:med(a.map(x=>x.gpu)),wall:med(a.map(x=>x.wall))};
 out.push(row);note('speed gpu '+row.size+' dpr '+row.dpr,JSON.stringify(row));
}
note('speed gpu table',JSON.stringify(out.map(r=>[r.size,r.dpr,r.k,r['pop-before'].gpu,r['pop-after'].gpu,r['props-before'].gpu,r['props-after'].gpu,r['splats-after'].gpu,r['splats-lod'].gpu,r['atlas-after'].gpu,r.main.gpu,r['pop-before'].wall,r['pop-after'].wall,r['props-before'].wall,r['props-after'].wall,r.main.wall])));
__done();
