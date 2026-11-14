// Headless only. PW_FROM points to the existing external playwright-core installation.
import {createRequire} from 'node:module';
import {readdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
const {chromium}=createRequire((process.env.PW_FROM||process.env.HOME+'/command-hq/scripts/shot')+'/')('playwright-core');
const root=homedir()+'/.cache/ms-playwright/', exe=process.env.CHROME||root+readdirSync(root).filter(x=>/^chromium-\d+$/.test(x)).sort().pop()+'/chrome-linux64/chrome';
const browser=await chromium.launch({executablePath:exe,headless:true,args:['--headless=new','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist'],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',GALLIUM_DRIVER:'d3d12',MESA_D3D12_DEFAULT_ADAPTER_NAME:'NVIDIA'}});
const summary=a=>{const s=[...a].sort((a,b)=>a-b);return {n:a.length,mean:a.reduce((a,b)=>a+b,0)/a.length,p95:s[Math.floor(s.length*.95)],max:s.at(-1)};};
const results=[];
try{for(const [size,width,height,dpr] of [['desktop',1280,900,1],['phone',390,844,2]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:size==='phone',hasTouch:size==='phone'}),page=await context.newPage(),errors=[],network=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',async r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 page.on('requestfinished',async r=>{try{network.push({url:r.url(),...await r.sizes()});}catch{}});
 await page.goto('http://localhost:8743/prototypes/world-spike/');await page.waitForFunction(()=>window.spike,{timeout:60000});
 const cdp=await context.newCDPSession(page);
 let cursor={x:0,y:0},down=false;
 const input={async move(x,y,opts={}){const start={...cursor};for(let i=1;i<=(opts.steps||1);i++){cursor={x:start.x+(x-start.x)*i/(opts.steps||1),y:start.y+(y-start.y)*i/(opts.steps||1)};if(size==='phone'){if(down)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...cursor,id:1}]});}else await page.mouse.move(cursor.x,cursor.y);}},async down(){down=true;if(size==='phone')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...cursor,id:1}]});else await page.mouse.down();},async up(){down=false;if(size==='phone')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();}};
 const renderer=await page.evaluate(()=>{const gl=spike.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);});
 console.log("RENDERER",renderer);
 const result={size,width,height,dpr,renderer,errors,initMs:await page.evaluate(()=>spike.stats.initMs),moving:[]};
 for(const count of [3,20]){
  const physics=await page.evaluate(n=>{spike.manual(true);spike.reset(n);spike.advance(240);return {step:[...spike.stats.stepSamples],contacts:spike.stats.contacts.length};},count);
  await page.evaluate(n=>{spike.reset(n);spike.manual(false);},count);await page.waitForTimeout(2500);
  const samples=await page.evaluate(()=>({step:spike.stats.stepSamples,frame:spike.stats.frameSamples,gap:spike.stats.gaps,contacts:spike.stats.contacts.length}));
  result.moving.push({count,stepMs:summary(physics.step),frameCpuMs:summary(samples.frame),rafGapMs:summary(samples.gap),contacts:physics.contacts});
 }
 await page.evaluate(()=>spike.reset(2));
 await page.evaluate(()=>{spike.manual(true);for(let n=0;n<2400&&spike.items.some(i=>i.body.sleepState!==2);n++)spike.advance(1,false);spike.manual(false);});
 await page.waitForFunction(()=>!spike.pending,null,{timeout:30000});
 const before=await page.evaluate(()=>({steps:spike.stats.steps,frames:spike.stats.frames}));await page.waitForTimeout(1100);
 result.idle=await page.evaluate(b=>({steps:spike.stats.steps-b.steps,frames:spike.stats.frames-b.frames,pending:spike.pending}),before);
 await page.screenshot({path:`docs/shots/world-spike-rest-${size}.jpg`,type:'jpeg',quality:85});
 // Pick the actual rendered surface through browser input, then lift and wait for weight to swing it.
 result.grabs=[];
 for(const n of [0,1]){
  const p=await page.evaluate(n=>spike.project(n,n===0?[-.37,0,0]:[0,.05,0]),n);
  await input.move(p.x,p.y);await input.down();
  // Surface projection can miss a thin rifle silhouette. Search near its projected center if necessary.
  if(!await page.evaluate(()=>!!spike.held)){
   await input.up();let found=false;
   for(let dy=-12;dy<=12&&!found;dy+=3)for(let dx=-12;dx<=12&&!found;dx+=3){await input.move(p.x+dx,p.y+dy);await input.down();found=await page.evaluate(()=>!!spike.held);if(!found)await input.up();}
  }
  const picked=await page.evaluate(()=>spike.held?.item.name||null);
  await input.move(width*.5,height*.38,{steps:35});await page.evaluate(()=>new Promise(requestAnimationFrame));await page.evaluate(()=>{spike.manual(true);spike.advance(160);});
  result.grabs.push({n,picked,error:await page.evaluate(()=>spike.gripError())});
  await page.screenshot({path:`docs/shots/world-spike-held-${n}-${size}.jpg`,type:'jpeg',quality:85});await input.up();
  await page.evaluate(()=>{spike.manual(true);for(let n=0;n<2400&&spike.items.some(i=>i.body.sleepState!==2);n++)spike.advance(1,false);spike.manual(false);});
 await page.waitForFunction(()=>!spike.pending,null,{timeout:30000});
 }
 // Frame sequence at known simulation times, insulated from software renderer wall-clock speed.
 await page.evaluate(()=>{spike.manual(true);spike.reset(2);});
 for(const [index,steps] of [[0,0],[1,30],[2,25],[3,20],[4,45],[5,360]]){
  await page.evaluate(n=>spike.advance(n),steps);
  await page.screenshot({path:`docs/shots/world-spike-drop-${index}-${size}.jpg`,type:'jpeg',quality:85});
 }
 result.network=network;result.downloadBodyBytes=network.reduce((n,r)=>n+r.responseBodySize,0);
 result.pass=errors.length===0&&result.idle.steps===0&&result.idle.frames===0&&result.grabs.every((g,n)=>g.picked===(n===0?'rifle':'top-0')&&g.error<.015);
 results.push(result);console.log(JSON.stringify(result));await context.close();
}}finally{await browser.close();writeFileSync('prototypes/world-spike/results.json',JSON.stringify(results,null,2)+'\n');}
if(results.length!==2||results.some(r=>!r.pass))process.exitCode=1;
