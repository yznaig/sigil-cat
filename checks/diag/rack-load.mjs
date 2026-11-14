// Diagnostic only: source observers injected into HTTP responses in this isolated browser.
// No product file is written, no placement/clamp call is replaced, and no solver is tuned.
// PW_FROM=~/command-hq/scripts/shot node checks/diag/rack-load.mjs http://localhost:18743/
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
const require=createRequire((process.env.PW_FROM||process.cwd())+'/');
const {chromium}=require('playwright-core');
const root=homedir()+'/.cache/ms-playwright/',dir=readdirSync(root).filter(x=>/^chromium-\d+$/.test(x)).sort().pop();
const observer=`
  function rackTrace(phase, value=null, extra={}) {
    const d=defs.get('rack'),i=value||live.get('rack');
    const record={phase,at:performance.now(),...extra,insets:{...stage.insets},viewport:[stage.width,stage.height],fonts:document.fonts.status,footer:document.getElementById('footer')?.getBoundingClientRect().toJSON(),saved:JSON.parse(JSON.stringify(store.get('keepsakes.rack')))};
    if(d&&i&&Number.isFinite(i.x)){
      const q=clampUnits(d,i),w=widthOf(d);
      Object.assign(record,{unitsX:i.x,pxX:toPx(i.x,i.y).x,width:w,lowestAllowedCenter:12+w/2,clampUnitsX:q.x,clampPxX:toPx(q.x,q.y).x,fixedHomeX:site.worldLayout.furniture().rack.x,box:i.box?{...i.box}:null});
    }
    globalThis.__rackTrace.push(record);
  }
  globalThis.__rackSnapshot=rackTrace;
`;
function replaceOnce(s,from,to){if(s.split(from).length!==2)throw new Error('Source observation anchor changed: '+from);return s.replace(from,to);}
let source=readFileSync('src/core/keepsakes.js','utf8');
source=replaceOnce(source,'  function measure() {',observer+'\n  function measure() {');
source=replaceOnce(source,'  function build(def, saved) {',"  function build(def, saved) {\n    if(def.id==='rack')rackTrace('constructor.saved-input',saved);");
source=replaceOnce(source,"    if(def.id==='rack'){const p=site.worldLayout.furniture().rack;saved={...saved,...toUnits(p.x,p.y)};}","    if(def.id==='rack'){const p=site.worldLayout.furniture().rack;saved={...saved,...toUnits(p.x,p.y)};rackTrace('constructor.fixed-home-overwrite',saved);}");
source=replaceOnce(source,'    live.set(def.id, inst);',"    live.set(def.id, inst);\n    if(def.id==='rack')rackTrace('constructor.before-first-place',inst);");
source=replaceOnce(source,'    // the keyboard\'s way to it',"    if(def.id==='rack')rackTrace('constructor.after-first-place',inst);\n    // the keyboard's way to it");
source=replaceOnce(source,'  function layoutAll() {',"  function layoutAll() {\n    rackTrace('layoutAll.enter');");
source=replaceOnce(source,"      if(inst.id==='rack'){const p=site.worldLayout.furniture().rack;Object.assign(inst,toUnits(p.x,p.y));}","      if(inst.id==='rack'){const p=site.worldLayout.furniture().rack;Object.assign(inst,toUnits(p.x,p.y));rackTrace('layoutAll.fixed-home',inst);}");
source=replaceOnce(source,'      Object.assign(inst, clampUnits(inst.def, inst));',"      Object.assign(inst, clampUnits(inst.def, inst));\n      if(inst.id==='rack')rackTrace('layoutAll.after-clamp',inst);");
source=replaceOnce(source,'      constrain(inst); place(inst);\n    }\n  }\n  stage.onResize',"      constrain(inst); place(inst);\n      if(inst.id==='rack')rackTrace('layoutAll.after-place',inst);\n    }\n  }\n  stage.onResize");
source=replaceOnce(source,'        measure(); const inst = build(def, saved);',"        if(def.id==='rack')rackTrace('define.saved-restore',saved);\n        measure(); const inst = build(def, saved);");
source=replaceOnce(source,'  const save = (inst) => store.set(',"  const save = (inst) => (inst.id==='rack'&&rackTrace('save.input',inst), store.set(");
source=replaceOnce(source,'world: site.worldLayout.pose(inst),\n  });','world: site.worldLayout.pose(inst),\n  }));');
let stageSource=readFileSync('src/core/stage.js','utf8');
stageSource=stageSource.replaceAll('    for (const f of onResize) f();',"    globalThis.__rackSnapshot?.('stage.before-resize-callbacks');\n    for (const f of onResize) f();\n    globalThis.__rackSnapshot?.('stage.after-resize-callbacks');");
stageSource=replaceOnce(stageSource,'function setInsets(top, bottom) {',"function setInsets(top, bottom) { globalThis.__rackSnapshot?.('stage.setInsets',null,{requestedInsets:{top,bottom}});");
const browser=await chromium.launch({executablePath:root+dir+'/chrome-linux64/chrome',headless:true,args:['--headless=new','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist'],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',GALLIUM_DRIVER:'d3d12',MESA_D3D12_DEFAULT_ADAPTER_NAME:'NVIDIA'}});
const result={premise:'The same fixed-home position was assumed to be clamped consistently on construction and reload, and saved rack coordinates were assumed to control restoration.',method:'Single 390x844 DPR2 isolated-context experiment: fresh unlock, ordinary reload, explicit resize event, then saved-x sentinel reload. HTTP response observers only; product source files unchanged.',loads:[],errors:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(String(e)));
 await page.addInitScript(()=>{
  window.__rackTrace=[];
  const event=phase=>{if(window.__rackSnapshot)window.__rackSnapshot(phase);else window.__rackTrace.push({phase,at:performance.now(),fonts:document.fonts.status});};
  document.fonts.addEventListener('loadingdone',()=>event('fonts.loadingdone'));
  document.addEventListener('DOMContentLoaded',()=>{
   event('DOMContentLoaded');document.fonts.ready.then(()=>event('fonts.ready'));
   const f=document.getElementById('footer');if(f)new ResizeObserver(()=>event('footer.ResizeObserver')).observe(f);
  });
 });
 await page.route('**/src/core/keepsakes.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:source}));
 await page.route('**/src/core/stage.js',r=>r.fulfill({status:200,contentType:'text/javascript',body:stageSource}));
 const collect=async name=>{
  await page.waitForFunction(()=>window.site?.stage.loaded&&site.eggs.hat,{},{timeout:60000});
  await page.evaluate(async()=>{await site.ready;__rackSnapshot('site.ready');});
  if(name==='fresh')await page.evaluate(()=>{for(const id of ['paper','postcard','ticket','tin','box','rack','top','rifle','pat'])site.keepsakes.give(id);__rackSnapshot('fresh.after-give');});
  for(const [ms,label]of [[500,'after-0.5s'],[2500,'after-3s'],[5000,'after-8s'],[4000,'after-12s']]){await page.waitForTimeout(ms);await page.evaluate(label=>__rackSnapshot(label),label);}
  await page.evaluate(async()=>{await document.fonts.ready;__rackSnapshot('settled.fonts-and-footer');site.store.flush();});
  const data=await page.evaluate(()=>({trace:__rackTrace,saved:site.store.get('keepsakes.rack'),renderer:(()=>{const gl=site.stage.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER);})()}));
  result.loads.push({name,...data});console.log(name,JSON.stringify(data.trace.filter(r=>/constructor|settled/.test(r.phase)).map(r=>({phase:r.phase,x:r.pxX,clamp:r.clampPxX,savedX:r.saved?.x,box:r.box}))));
 };
 await page.goto(process.argv[2]||'http://localhost:18743/',{waitUntil:'load'});await collect('fresh');
 await page.reload({waitUntil:'load'});await collect('reload');
 await page.evaluate(()=>{__rackSnapshot('controlled-resize.before');dispatchEvent(new Event('resize'));__rackSnapshot('controlled-resize.after');});
 result.resize=await page.evaluate(()=>__rackTrace.filter(r=>r.phase.startsWith('controlled-resize')));
 // A changed coordinate is the independent-variable control, not a proposed product change.
 result.sentinel=await page.evaluate(()=>{const before=site.store.get('keepsakes.rack');site.store.set('keepsakes.rack',{...before,x:.314159});site.store.flush();return {before,changed:site.store.get('keepsakes.rack')};});
 await page.reload({waitUntil:'load'});await collect('saved-x-sentinel');
}finally{
 result.findings={
  cause:'build() overwrites saved coordinates with the raw fixed home and places without clampUnits; layoutAll clamps that same home later. This affects fresh creation as well as restore.',
  timingCaveat:'Both fresh and reload eventually reached the clamped position in this experiment. The previous 17px comparison depends on when a resize/adaptive-resolution callback has occurred, not a permanent saved-position divergence.',
  proposedFix:'Use one home-to-clamped-position path before first place and on all later layouts. Keep saving rack ownership/state/order, but do not treat stored coordinates as the position of immovable furniture.',
  phases:result.loads.map(l=>{const first=l.trace.find(t=>t.phase==='constructor.after-first-place'),clamped=l.trace.find(t=>t.phase==='layoutAll.after-place');return {name:l.name,first,firstClamped:clamped,correctionPx:clamped&&first?clamped.pxX-first.pxX:null};})
 };
 writeFileSync('checks/diag/rack-load-results.json',JSON.stringify(result,null,2)+'\n');await browser.close();
}
