// Matched corrected workload at the merge checkpoint and the optimized source.
// Immutable git blobs are routed in this one worktree; no checkout is modified.
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {homedir,loadavg} from 'node:os';
const require=createRequire(process.env.HOME+'/command-hq/scripts/shot/'),{chromium}=require('playwright-core');
const base=process.argv[2]||'http://localhost:18743/',cache=homedir()+'/.cache/ms-playwright/';
const executablePath=cache+readdirSync(cache).filter(n=>/^chromium-\d+$/.test(n)).sort().at(-1)+'/chrome-linux64/chrome';
const browser=await chromium.launch({executablePath,headless:true,args:['--headless=new','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist'],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',GALLIUM_DRIVER:'d3d12',MESA_D3D12_DEFAULT_ADAPTER_NAME:'NVIDIA'}});
const report=[];
try{for(const size of ['desktop','phone'])for(const ref of ['c45201e','working']){
 const [width,height,dpr]=size==='phone'?[390,844,2]:[1280,900,1];
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:size==='phone',hasTouch:size==='phone'}),page=await context.newPage();
 if(ref!=='working')await page.route(new URL('**/src/**',base).href,route=>{const path=new URL(route.request().url()).pathname.slice(1);return route.fulfill({contentType:'text/javascript',body:execFileSync('git',['show',ref+':'+path])});});
 const lines=[],errors=[];await page.exposeFunction('__say',line=>lines.push(line));await page.exposeFunction('__loadAverage',()=>loadavg());page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base);const before=loadavg();
 const result=await page.evaluate(`(async()=>{const MOBILE=${size==='phone'};${readFileSync('checks/lib.js','utf8')}
 await site.world.ensure();const totals={physics:0,render:0,sort:0,targets:0,renders:0},frames=[];
 const wrap=(obj,key,metric,count)=>{const f=obj[key].bind(obj);obj[key]=(...args)=>{const t=performance.now(),r=f(...args);totals[metric]+=performance.now()-t;if(count)totals[count]++;return r;};};
 wrap(site.world.physics,'step','physics');wrap(stage.renderer,'render','render','renders');wrap(stage.renderer,'setRenderTarget','targets');
 const wrapped=new Set(),step=site.world.step;
 site.world.step=dt=>{for(const id of ['rifle','top']){const m=keepsakes.get(id)?.picture?.mesh;if(m&&!wrapped.has(m)){wrap(m,'sortFor','sort');wrapped.add(m);}}
 const old={...totals},t=performance.now();step(dt);if(site.world.entries.size>10)frames.push({total:performance.now()-t,...Object.fromEntries(Object.keys(totals).map(k=>[k,totals[k]-old[k]]))});};
 let source=await(await fetch('/checks/world-board-cost.js')).text();source=source.slice(0,source.indexOf('const median=a=>'));await eval('(async()=>{'+source+'})()');
 const p95=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length*.95)],median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
 const runs=[];for(let n=0;n<5;n++){const samples=frames.slice(n*181+1,(n+1)*181);runs.push(Object.fromEntries(['total','physics','render','sort','targets','renders'].map(k=>[k,p95(samples.map(f=>f[k]))])));}
 const medians=Object.fromEntries(['total','physics','render','sort','targets','renders'].map(k=>[k,median(runs.map(r=>r[k]))]));
 const gl=stage.renderer.getContext();return {runs,medians,frames:frames.length,renderer:gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)};})()`);
 const row={size,ref,viewport:[width,height,dpr],loadBefore:before,loadAfter:loadavg(),...result,lines,errors};report.push(row);console.log('CHECK matched world render profile: '+JSON.stringify(row));await context.close();
}}finally{await browser.close();}
writeFileSync('checks/diag/world-unit5-render-profile.json',JSON.stringify({method:'same corrected non-overlapping fixture; five back-to-back runs; full adapters; standard headless browser; independent percentiles are not additive',report},null,2)+'\n');
if(report.some(r=>r.errors.length))process.exitCode=1;
