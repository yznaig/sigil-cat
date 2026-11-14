// Speed lane (playtest-2): frame time and GPU time against window size, in one page. Diagnostic only, no gate.
//   node checks/run.mjs "$BASE/?dpr=1" --lib checks/lib.js --js checks/diag/speed-window.js --size 1280x720 --dpr 1 --uncapped --timeout 900
// The runner's --uncapped turns the browser's frame-rate cap off, so a frame takes as long as its work. Sizes come from
// ?sizes=1280x720,1920x1080,... (default four); scenes from ?scenes=cat,rest,moving. For each scene and size: the live
// render loop runs N frames (?frames=240) and reports the frame interval (mean, p95), the loop's main-thread time, and
// GPU time (EXT_disjoint_timer_query_webgl2) split into 'pictures' (everything drawn before the main pass: the cat's
// picture, prop pictures, the atlas) and 'main' (the main pass into the page's canvas).
// 'cat': only the cat, his pose cycle off. 'pop': only the cat, popping between sit and lie without a break. 'rest': the final-cost twenty bodies, settled. 'moving': the same twenty tumbling (reset every
// 45 frames, as the cost gate does), through the live loop instead of the gate's tight W.step loop.
const sizes=(stage.opt('sizes')||'1280x720,1920x1080,2560x1440,3840x2160').split(',').map(s=>s.split('x').map(Number));
const scenes=(stage.opt('scenes')||'cat,pop,rest,moving').split(','),FR=Number(stage.opt('frames')||240);
const gl=stage.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
note('speed renderer',String(gl.getParameter((gl.getExtension('WEBGL_debug_renderer_info')||{}).UNMASKED_RENDERER_WEBGL||gl.RENDERER))+' timer '+!!ext+' dpr '+stage.dpr);
const W=site.world,T=site.THREE,pending=[];
let current=null,sums=null;
const begin=k=>{if(!ext||current)return;const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);current={q,k,f:sums?.frame};};
const end=()=>{if(!current)return;gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(current);current=null;};
function poll(){for(let i=pending.length-1;i>=0;i--){const p=pending[i];if(!gl.getQueryParameter(p.q,gl.QUERY_RESULT_AVAILABLE))continue;
 const ns=gl.getQueryParameter(p.q,gl.QUERY_RESULT),bad=gl.getParameter(ext.GPU_DISJOINT_EXT);gl.deleteQuery(p.q);pending.splice(i,1);
 if(!bad&&sums&&p.f!=null){const g=sums.gpu[p.f]??={pictures:0,main:0};g[p.k]+=ns/1e6;}}}
let t0=0,lastNow=0;
const onF=(dt,now)=>{if(!sums)return;sums.frame++;if(lastNow)sums.dt.push(now-lastNow);lastNow=now;t0=performance.now();if(ext)poll();begin('pictures');};
const onP=()=>{if(!sums)return;end();begin('main');};
const sync=stage.opt('sync')!=='0',px=new Uint8Array(4);
// total: the loop's time with this frame's GPU work done too (a 1-pixel read-back waits for it; gl.finish does not
// here). Headless frames are otherwise not held back by the GPU, so this is the frame time a real screen would see,
// as an upper bound (the CPU and GPU parts do not overlap). With it on, the frame interval includes it too.
const onD=()=>{if(!sums)return;end();const t=performance.now();sums.cpu.push(t-t0);if(sync){gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);sums.total.push(performance.now()-t0);}};
stage.onFrame.unshift(onF);stage.onPresent.unshift(onP);stage.onPresented.push(onD);
const stat=a=>{const s=a.slice().sort((x,y)=>x-y);return {mean:+(s.reduce((x,y)=>x+y,0)/Math.max(1,s.length)).toFixed(2),p95:+(s[Math.floor(s.length*.95)]??0).toFixed(2)};};
const pictureDraws=()=>{let n=0;for(const e of W.entries.values())n+=e.presentation?.stats?.draws??0;return n;};
async function measure(tick){
 const d0=pictureDraws(),c0=cat.renders;let awake=0;
 sums={frame:0,dt:[],cpu:[],total:[],gpu:[]};lastNow=0;
 while(sums.frame<FR){await new Promise(r=>requestAnimationFrame(r));tick?.(sums.frame);if(W.stats.listening)awake++;}
 const s=sums;sums=null;end();await sleep(250);
 // results of the last few frames land after the run: let them in
 sums=s;poll();sums=null;
 const g=s.gpu.filter(Boolean);
 return {fps:+(1000/stat(s.dt).mean).toFixed(0),dt:stat(s.dt),cpu:stat(s.cpu),total:stat(s.total),gpuPictures:stat(g.map(x=>x.pictures)),gpuMain:stat(g.map(x=>x.main)),gpu:stat(g.map(x=>x.pictures+x.main)),gpuN:g.length,calls:stage.renderer.info.render.calls,pictureDraws:pictureDraws()-d0,catRenders:cat.renders-c0,awakeFrames:awake,catQuality:cat.quality};
}
const out=[];
async function sizeTo([w,h]){await __resize(w,h);await until(()=>innerWidth===w&&innerHeight===h,5000);await sleep(700);}
async function run(scene,tick){for(const s of sizes){await sizeTo(s);const r=await measure(tick);const row={scene,size:s.join('x'),dpr:stage.dpr,canvas:stage.renderer.domElement.width+'x'+stage.renderer.domElement.height,...r};out.push(row);note('speed '+scene+' '+row.size+' dpr '+row.dpr,JSON.stringify(row));}}
cat.auto=false;await until(()=>!cat.popping,5000);
if(scenes.includes('cat'))await run('cat');
if(scenes.includes('pop')){await run('pop',()=>{if(!cat.popping&&cat.phase==='hold')cat.request(cat.pose==='sit'?'lie':'sit');});await until(()=>!cat.popping&&cat.phase==='hold',8000);cat.request('sit');await until(()=>!cat.popping&&cat.pose==='sit'&&cat.phase==='hold',8000);}
let list=null;
const ids=['rifle','top','tin','pat','eyes','twinkle','crumbs','shards','box','flour','bucket','pitchfork','recipe-flour','recipe-butter','recipe-milk','rack/wizard','rack/cone','rack/crown','bulb','controller'];
function reset(){for(const [n,e]of list.entries()){const row=Math.floor(n/2);W.cancelReturn(e);e.body.setTranslation({x:(n%2-.5)*1.4,y:.7+(row%4)*.22,z:-row*.9},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);}}
if(scenes.includes('rest')||scenes.includes('moving')){
 const {collectFinal}=await import('/checks/world-final-collection.mjs');
 const items=await collectFinal(site,{cake:false});await until(()=>!W.stats.listening&&!site.supports.listening,20000);
 for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}
 const entries=items.map(i=>i.worldEntry);list=ids.map(id=>W.entries.get(id));
 for(const e of entries)if(!list.includes(e))site.supports.mount(e,e.id==='rack/party'?'rack':'pinboard',e.id==='rack/party'?'party':e.id,{animate:false});
 for(const e of list){site.supports.detach(e,{wake:false});e.body.setEnabled(true);e.object.visible=true;}
 if(scenes.includes('rest')){reset();await until(()=>!W.stats.listening,20000);await sleep(500);await run('rest');}
 if(scenes.includes('moving'))await run('moving',n=>{if(n%45===0)reset();});
 if(stage.opt('shot')==='1'){reset();await until(()=>!W.stats.listening,20000);await sleep(500);await __shot('speed-window-rest');}
}
note('speed table',JSON.stringify(out.map(r=>[r.scene,r.size,r.dpr,r.fps,r.dt.p95,r.cpu.p95,r.total.mean,r.total.p95,r.gpu.mean,r.gpu.p95,r.gpuPictures.mean,r.gpuMain.mean,r.pictureDraws,r.catRenders,r.awakeFrames])));
__done();
