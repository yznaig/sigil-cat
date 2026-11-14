// Run from repo root: PW_FROM=~/command-hq/scripts/shot node checks/diag/run.mjs [URL]
// Uses the unchanged acceptance workload; injects read-only floor observations only
// in run 1 at each viewport. Every run uses a fresh context and original setup.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {homedir,loadavg,cpus} from 'node:os';
const require=createRequire((process.env.PW_FROM||process.cwd())+'/');
const {chromium}=require('playwright-core');
const root=homedir()+'/.cache/ms-playwright/',dir=readdirSync(root).filter(x=>/^chromium-\d+$/.test(x)).sort().pop();
const browser=await chromium.launch({executablePath:root+dir+'/chrome-linux64/chrome',headless:true,args:['--headless=new','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',GALLIUM_DRIVER:'d3d12',MESA_D3D12_DEFAULT_ADAPTER_NAME:'NVIDIA'}});
const lib=readFileSync('checks/lib.js','utf8'),original=readFileSync('checks/world-core.js','utf8'),probe=readFileSync('checks/diag/floor-probe.js','utf8');
const result={date:new Date().toISOString(),cpu:cpus()[0].model,logicalCpus:cpus().length,method:'Unchanged world-core workload, fresh context per repeat, original 180 samples of two 120Hz W.step calls, p95 index171; floor observer only repeat1. Viewport is not phone CPU.',runs:[]};
try {
 for(const [size,width,height,dpr] of [['desktop',1280,900,1],['phone',390,844,2]])for(let repeat=1;repeat<=5;repeat++){
  const before=loadavg(),ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:size==='phone',hasTouch:size==='phone'}),page=await ctx.newPage();
  const messages=[];await page.exposeFunction('__say',s=>messages.push(s));await page.exposeFunction('__shot',()=>{});
  await page.goto(process.argv[2]||'http://localhost:18743/',{waitUntil:'load'});
  let script=original;
  if(repeat===1)script=script.replace('for(let seed=0;',probe+'\nfor(let seed=0;').replace('const y=support(a);','probe(seed,n);const y=support(a);');
  script+=`\nreturn {p95,samples,renderer:gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER),floor:${repeat===1?'finishProbe()':'null'}};`;
  const data=await page.evaluate(`(async()=>{const MOBILE=${size==='phone'};${lib}\n${script}})()`);
  result.runs.push({size,repeat,loadBefore:before,loadAfter:loadavg(),...data,messages});
  writeFileSync('checks/diag/results.json',JSON.stringify(result,null,2)+'\n');
  console.log(size,repeat,data.p95,'load',loadavg(),data.floor?`min ${data.floor.worst.checkMinY} seed ${data.floor.worst.seed}`:'');await ctx.close();
 }
} finally {await browser.close();}
