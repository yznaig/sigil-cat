// Observe every rendered frame, including restoration before site.ready.
import {createRequire} from 'node:module';
import {readdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {cdnArgs} from './cdn.mjs';
import {cacheCheckFonts,settleCheckFonts} from './fonts.mjs';
const {chromium}=createRequire((process.env.PW_FROM||process.cwd())+'/')('playwright-core');
const root=homedir()+'/.cache/ms-playwright/',dir=readdirSync(root).filter(s=>/^chromium-\d+$/.test(s)).sort().pop();
const browser=await chromium.launch({executablePath:root+dir+'/chrome-linux64/chrome',headless:true,args:['--headless=new','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist',...await cdnArgs()],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',GALLIUM_DRIVER:'d3d12',MESA_D3D12_DEFAULT_ADAPTER_NAME:'NVIDIA'}});
const results=[];let failed=false;
try{for(const [size,width,height]of [['desktop',1280,900],['phone',844,390]]){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:size==='phone'?2:1}),page=await ctx.newPage();
 await cacheCheckFonts(ctx);
 await page.addInitScript(()=>{window.rackFrames=[];function sample(){const el=document.querySelector('.k-rack');if(el&&(!window.site?.rack||site.rack.picture?.card.visible)){const b=el.getBoundingClientRect();rackFrames.push({t:performance.now(),x:b.x,y:b.y,w:b.width});}requestAnimationFrame(sample);}requestAnimationFrame(sample);});
 for(const mode of ['fresh','reload']){
  // e1112-11 (Aaron): a run that recorded no frames at all (a page still loading on a busy machine) is tried once more.
  let r;for(let attempt=1;attempt<=2;attempt++){
   if(mode==='fresh'&&attempt===1)await page.goto(process.argv[2]||'http://localhost:18743/');else await page.reload();
   await settleCheckFonts(page);
   await page.waitForFunction(()=>window.site?.stage.loaded&&site.eggs.hat);
   await page.evaluate(async mode=>{await site.ready;if(mode==='fresh'&&!site.keepsakes.has('rack'))site.keepsakes.give('rack');site.store.flush();},mode);
   await page.waitForTimeout(6500); // includes 3s after load and adaptive-resolution startup
   r=await page.evaluate(()=>{const a=rackFrames;return {samples:a.length,minLeft:Math.min(...a.map(x=>x.x)),jump:Math.max(0,...a.slice(1).map((p,i)=>Math.hypot(p.x-a[i].x,p.y-a[i].y))),first:a[0],last:a.at(-1)};});
   if(r.samples>0)break;console.log(`(rack frames ${size} ${mode}: no frames recorded, trying once more)`);
  }
  const pass=r.samples>30&&r.minLeft>=0&&r.jump<=.5;failed||=!pass;results.push({size,mode,...r,pass});console.log(`CHECK rack frames ${size} ${mode}: ${JSON.stringify(r)} ${pass?'PASS':'FAIL'}`);
 }
 await page.evaluate(()=>{for(const id of ['rifle','top','pat','ticket','tin','postcard','paper','box'])site.keepsakes.give(id);});
 await page.evaluate(async()=>{await Promise.all(['rifle','top'].map(id=>site.keepsakes.get(id)?.worldTask));});
 await page.setViewportSize(size==='phone'?{width:1280,height:900}:{width:844,height:390});
 await page.waitForTimeout(500);
 const bounds=await page.evaluate(()=>[...site.keepsakes.live.values()].map(i=>({id:i.id,x:i.box.x,right:i.box.x+i.box.w,bottom:i.box.y+i.box.h,width:site.stage.width,footer:site.stage.height-site.stage.insets.bottom})));
 const reachable=bounds.every(b=>b.x>=0&&b.right<=b.width&&b.bottom<=b.footer-24);
 results.push({size,mode:'resize',bounds,pass:reachable});failed||=!reachable;
 console.log(`CHECK collection ${size} resized: ${reachable?'PASS':'FAIL'}`);
 await ctx.close();
}}finally{await browser.close();writeFileSync(process.env.RACK_RESULTS||'checks/diag/rack-frames-results.json',JSON.stringify(results,null,2)+'\n');}
process.exitCode=failed?1:0;
