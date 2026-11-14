// Fixed accepted pre-conversion foundation, retained for all later furniture units.
// No second checkout: route only page/source/CSS requests to immutable git blobs.
import {createRequire} from 'node:module';
import {readdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {homedir,loadavg} from 'node:os';
import {cdnArgs} from './cdn.mjs';
import {cacheCheckFonts,settleCheckFonts} from './fonts.mjs';
import {verdict} from './world-board-rest-verdict.mjs';
const require=createRequire((process.env.PW_FROM||process.env.HOME+'/command-hq/scripts/shot')+'/');
const {chromium}=require('playwright-core'),BASELINE='677f535';
const base=process.argv[2]||'http://localhost:18743/',size=process.argv[3]||'desktop',final=process.argv.includes('final');
const [width,height,dpr]=size==='phone'?[844,390,2]:[1280,900,1];   // phones play on their side (shell lane)
const root=homedir()+'/.cache/ms-playwright/',exe=process.env.CHROME||root+readdirSync(root).filter(s=>/^chromium-\d+$/.test(s)).sort().at(-1)+'/chrome-linux64/chrome';
const browser=await chromium.launch({executablePath:exe,headless:true,args:['--headless=new','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-frame-rate-limit','--disable-gpu-vsync',...await cdnArgs()],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',GALLIUM_DRIVER:'d3d12',MESA_D3D12_DEFAULT_ADAPTER_NAME:'NVIDIA'}});
const blobs=new Map(),results={baseline:[],unlit:[],lit:[]},errors=[];
try{
for(let round=0;round<5;round++)for(const condition of round%2?['lit','unlit','baseline']:['baseline','unlit','lit']){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:size==='phone',hasTouch:size==='phone'}),page=await context.newPage();
 await cacheCheckFonts(context);
 page.on('pageerror',e=>errors.push(String(e)));
 if(condition==='baseline')await page.route(new URL('**',base).href,async route=>{
  const url=new URL(route.request().url()),path=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(path==='index.html'||path.startsWith('src/')||path.endsWith('.css')){
   if(!blobs.has(path))blobs.set(path,execFileSync('git',['show',BASELINE+':'+path]));
   await route.fulfill({status:200,contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html',body:blobs.get(path)});
  }else await route.continue();
 });
 const loadBefore=loadavg();await page.goto(base+'?dpr='+dpr);
 await settleCheckFonts(page);
 await page.waitForFunction(()=>window.site?.stage.loaded,{},{timeout:60000});
 await page.evaluate(async ({condition,final})=>{
  const s=window.site;await s.ready;s.cat.auto=false;
  if(final&&condition!=='baseline')await (await import('/checks/world-final-collection.mjs')).collectFinal(s);
  else for(const id of ['cloud','top','crumbs','twinkle','postcard','rifle','paper','shards','puddle','box','eyes','rack','ticket','tin','pat','grease'])if(s.keepsakes.defs.has(id))s.keepsakes.give(id);
  await Promise.all([...s.keepsakes.live.values()].map(i=>i.worldTask));
  await s.eggs.hat.wear('party');s.cat.setButter(true,'quiet');
  if(s.lamp){await s.lamp.award();await s.lamp.inst.worldTask;await s.lamp.use();s.lamp.setOn(condition==='lit');}
 },{condition,final});
 await page.waitForFunction(()=>!site.world.stats.listening&&!site.supports?.listening,{},{timeout:30000}).catch(async error=>{
  console.log('CHECK rack rest unsettled premise: '+JSON.stringify(await page.evaluate(()=>({world:site.world.stats.listening,supports:site.supports.listening,awake:[...site.world.entries.values()].filter(e=>!e.fixed&&!e.support&&!e.body.isSleeping()).map(e=>({id:e.id,p:e.body.translation(),v:e.body.linvel(),w:e.body.angvel(),timer:!!e.timer}))}))));throw error;
 });
 await page.waitForFunction(()=>site.stage.warmLeft===0,{},{timeout:30000});
 await page.waitForTimeout(6500);
 const sample=await page.evaluate(async()=>{
  const s=site,R=s.stage.renderer,gl=R.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
  // Freeze the same unmigrated legacy effects at one phase in both conditions.
  // The stage and browser still render/composite every frame; no RAF cap.
  s.stage.timeScale=0;const original=R.render.bind(R),queries=[],gpu=[],cpu=[],frames=[];let last=0,started=performance.now();
  R.render=(scene,camera)=>{if(scene!==s.stage.scene||R.getRenderTarget())return original(scene,camera);const q=timer?gl.createQuery():null;if(q)gl.beginQuery(timer.TIME_ELAPSED_EXT,q);const begin=performance.now();original(scene,camera);cpu.push(performance.now()-begin);if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);queries.push(q);}};
  await new Promise(resolve=>{function tick(t){if(last)frames.push(t-last);last=t;while(queries.length&&gl.getQueryParameter(queries[0],gl.QUERY_RESULT_AVAILABLE)){const q=queries.shift();if(!gl.getParameter(timer.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}if(frames.length<1200&&performance.now()-started<20000)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
  R.render=original;
  // GPU results arrive asynchronously after the last sampled RAF. Drain the
  // already submitted queries without adding any frames to the CPU sample.
  gl.flush();const deadline=performance.now()+2000;
  while(queries.length&&performance.now()<deadline){while(queries.length&&gl.getQueryParameter(queries[0],gl.QUERY_RESULT_AVAILABLE)){const q=queries.shift();if(!gl.getParameter(timer.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}if(queries.length)await new Promise(r=>setTimeout(r,10));}
  for(const q of queries)gl.deleteQuery(q);
  const stats=a=>{a=a.slice(100).sort((a,b)=>a-b);return {n:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]};};
  return {renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),gpu:stats(gpu),submission:stats(cpu),frame:stats(frames),scene:[...s.keepsakes.live.keys()].sort(),dpr:s.stage.dpr};
 });
 results[condition].push({...sample,round,loadBefore,loadAfter:loadavg()});console.log('CHECK rack rest round: '+JSON.stringify({round,condition,...sample,loadBefore,loadAfter:loadavg()}));
 await context.close();
}
}finally{await browser.close();}
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
let pass=true;const states={};
for(const state of ['unlit','lit']){
 const delta={};for(const k of ['gpu','submission','frame'])delta[k]=median(results[state].map(r=>r[k].median))-median(results.baseline.map(r=>r[k].median));
 const out={baseline:BASELINE,size,viewport:[width,height,dpr],method:'five alternating warmed rounds, uncapped RAF full frames and GPU elapsed queries; desktop CPU, not iPhone',results:{baseline:results.baseline,converted:results[state]},delta,errors};
 out.decision=verdict(out);out.decision.hardware=Object.values(out.results).flat().every(r=>/NVIDIA|AMD|Intel/.test(r.renderer)&&!/SwiftShader|llvmpipe/i.test(r.renderer));out.decision.pass&&=out.decision.hardware;if(final)out.decision.pass&&=out.decision.gpuAvailable;states[state]=out;pass&&=out.decision.pass;
 console.log(`CHECK rack ${state} whole collection rest vs fixed foundation: full frame delta=${delta.frame.toFixed(4)}ms GPU delta=${delta.gpu.toFixed(4)}ms submission delta=${delta.submission.toFixed(4)}ms ${out.decision.pass?'PASS':'FAIL'}`);
}
writeFileSync('checks/diag/'+(final?'world-final':'world-unit7')+'-rest-'+size+'.json',JSON.stringify(states,null,2)+'\n');
if(!pass)process.exitCode=1;
