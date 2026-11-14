// Fixed accepted pre-conversion foundation, retained for all later furniture units.
// No second checkout: route only page/source/CSS requests to immutable git blobs.
import {createRequire} from 'node:module';
import {readdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {homedir,loadavg} from 'node:os';
import {cdnArgs} from './cdn.mjs';
import {verdict} from './world-board-rest-verdict.mjs';
const require=createRequire((process.env.PW_FROM||process.env.HOME+'/command-hq/scripts/shot')+'/');
const {chromium}=require('playwright-core'),BASELINE='677f535';
const base=process.argv[2]||'http://localhost:18743/',size=process.argv[3]||'desktop',unit=process.argv[4]||'5';
const [width,height,dpr]=size==='phone'?[844,390,2]:[1280,900,1];   // phones play on their side (shell lane)
const root=homedir()+'/.cache/ms-playwright/',exe=process.env.CHROME||root+readdirSync(root).filter(s=>/^chromium-\d+$/.test(s)).sort().at(-1)+'/chrome-linux64/chrome';
const browser=await chromium.launch({executablePath:exe,headless:true,args:[...await cdnArgs(),'--headless=new','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-frame-rate-limit','--disable-gpu-vsync'],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',GALLIUM_DRIVER:'d3d12',MESA_D3D12_DEFAULT_ADAPTER_NAME:'NVIDIA'}});
const blobs=new Map(),results={baseline:[],converted:[]},errors=[];
try{
for(let round=0;round<5;round++)for(const condition of round%2?['converted','baseline']:['baseline','converted']){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:size==='phone',hasTouch:size==='phone'}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e)));
 if(condition==='baseline')await page.route(new URL('**',base).href,async route=>{
  const url=new URL(route.request().url()),path=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(path==='index.html'||path.startsWith('src/')||path.endsWith('.css')){
   if(!blobs.has(path))blobs.set(path,execFileSync('git',['show',BASELINE+':'+path]));
   await route.fulfill({status:200,contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html',body:blobs.get(path)});
  }else await route.continue();
 });
 const loadBefore=loadavg();await page.goto(base+'?dpr='+dpr);
 await page.waitForFunction(()=>window.site?.stage.loaded,{},{timeout:60000});
 await page.evaluate(async()=>{
  const s=window.site;await s.ready;s.cat.auto=false;
  for(const id of ['cloud','top','crumbs','twinkle','postcard','rifle','paper','shards','puddle','box','eyes','rack','ticket','tin','pat','grease'])if(s.keepsakes.defs.has(id))s.keepsakes.give(id);
  await Promise.all([...s.keepsakes.live.values()].map(i=>i.worldTask));
 });
 await page.waitForFunction(()=>!site.world.stats.listening&&!site.supports?.listening,{},{timeout:30000});
 await page.waitForTimeout(6500);
 const sample=await page.evaluate(async()=>{
  const s=site,R=s.stage.renderer,gl=R.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
  // Freeze the same unmigrated legacy effects at one phase in both conditions.
  // The stage and browser still render/composite every frame; no RAF cap.
  s.stage.timeScale=0;const original=R.render.bind(R),queries=[],gpu=[],cpu=[],frames=[];let last=0,started=performance.now();
  R.render=(scene,camera)=>{if(scene!==s.stage.scene||R.getRenderTarget())return original(scene,camera);const q=timer?gl.createQuery():null;if(q)gl.beginQuery(timer.TIME_ELAPSED_EXT,q);const begin=performance.now();original(scene,camera);cpu.push(performance.now()-begin);if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);queries.push(q);}};
  await new Promise(resolve=>{function tick(t){if(last)frames.push(t-last);last=t;while(queries.length&&gl.getQueryParameter(queries[0],gl.QUERY_RESULT_AVAILABLE)){const q=queries.shift();if(!gl.getParameter(timer.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}if(frames.length<1200&&performance.now()-started<20000)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
  R.render=original;for(const q of queries)gl.deleteQuery(q);
  const stats=a=>{a=a.slice(100).sort((a,b)=>a-b);return {n:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]};};
  return {renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),gpu:stats(gpu),submission:stats(cpu),frame:stats(frames),scene:[...s.keepsakes.live.keys()].sort(),dpr:s.stage.dpr};
 });
 results[condition].push({...sample,round,loadBefore,loadAfter:loadavg()});console.log('CHECK board rest round: '+JSON.stringify({round,condition,...sample,loadBefore,loadAfter:loadavg()}));
 await context.close();
}
}finally{await browser.close();}
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
const delta={};for(const k of ['gpu','submission','frame'])delta[k]=median(results.converted.map(r=>r[k].median))-median(results.baseline.map(r=>r[k].median));
const out={baseline:BASELINE,size,viewport:[width,height,dpr],method:'five alternating warmed rounds, uncapped RAF full frames and GPU elapsed queries; desktop CPU, not iPhone',results,delta,errors};
out.decision=verdict(out);
writeFileSync('checks/diag/world-unit'+unit+'-rest-'+size+'.json',JSON.stringify(out,null,2)+'\n');
const {gpuAvailable,pass}=out.decision;
console.log(`CHECK board whole collection rest vs fixed foundation: full frame delta=${delta.frame.toFixed(4)}ms GPU delta=${gpuAvailable?delta.gpu.toFixed(4):'unavailable'}ms submission delta=${delta.submission.toFixed(4)}ms ${pass?'PASS':'FAIL'}`);
if(!pass)process.exitCode=1;
