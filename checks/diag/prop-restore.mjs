// One diagnostic run of the existing desktop look-use.js --then look-reload.js.
// HTTP-response observers only; no live source file or solver setting is changed.
// PW_FROM=... node checks/diag/prop-restore.mjs http://localhost:18743/ --lib checks/lib.js --js checks/look-use.js --then checks/look-reload.js --size desktop --out checks/out/restore-diag --jpeg --timeout 180
import {readFileSync,writeFileSync} from 'node:fs';
const hook = `
const diagnosticSources=new Map();
function observeReplace(s,a,b){if(s.split(a).length!==2)throw Error('Diagnostic anchor changed: '+a);return s.replace(a,b);}
let ws=readFileSync('src/core/world.js','utf8');
ws=observeReplace(ws,'export function createWorld(site) {','export function createWorld(site) { globalThis.__diagSite=site;');
ws=observeReplace(ws,"const saved=persist&&site.store.get('worldBodies.'+id);","const saved=persist&&site.store.get('worldBodies.'+id); globalThis.__observe('restore.read',id,{saved});");
ws=observeReplace(ws,'if(saved&&onResize)onResize(entry,true); sync(entry);',"globalThis.__observe('restore.before-clamp',id); if(saved&&onResize)onResize(entry,true); globalThis.__observe('restore.after-clamp',id); sync(entry); globalThis.__observe('restore.first-sync',id);");
ws=observeReplace(ws,'function save(entry) {',"function save(entry) { globalThis.__observe('world.save-call',entry.id,{sleeping:entry.body.isSleeping(),stack:new Error().stack});");
diagnosticSources.set('world.js',ws);
let ps=readFileSync('src/core/world-props.js','utf8');
ps=observeReplace(ps,'const shapes=[],vertices=[];',"globalThis.__observe('prop.bake',id,{scale,offset:offset.toArray(),anchor:position.toArray(),initialBox:inst.box}); const shapes=[],vertices=[];");
ps=observeReplace(ps,'if(!dx&&!dy)break;',"globalThis.__observe('prop.clamp',id,{force,n,l,r,bottom,landing,dx,dy,position:{...p},rotation:{...entry.body.rotation()},sleeping:entry.body.isSleeping()}); if(!dx&&!dy)break;");
ps=observeReplace(ps,'function tap(inst){',"function tap(inst){globalThis.__observe('prop.tap',inst.id);");
diagnosticSources.set('world-props.js',ps);
let ss=readFileSync('src/core/store.js','utf8');
ss=observeReplace(ss,'let timer = 0;',"globalThis.__observe('store.initial-read',null,{worldBodies:data.worldBodies,keepsakes:data.keepsakes}); let timer = 0;");
ss=observeReplace(ss,'localStorage.setItem(KEY, JSON.stringify(data));',"localStorage.setItem(KEY, JSON.stringify(data)); globalThis.__observe('store.flush',null,{written:JSON.parse(localStorage.getItem(KEY))});");
ss=observeReplace(ss,'o[k] = value; save(); return value;',"o[k] = value; if(/^(worldBodies|keepsakes)\\.(top|rifle)$/.test(path))globalThis.__observe('store.set',path,{value}); save(); return value;");
diagnosticSources.set('store.js',ss);
await page.route('**/src/core/*.js',async route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1),body=diagnosticSources.get(name);if(body)await route.fulfill({status:200,contentType:'text/javascript',body});else await route.continue();});
await page.addInitScript(()=>{
 const nav=Number(sessionStorage.getItem('__restoreNav')||0);sessionStorage.setItem('__restoreNav',nav+1);
 const events=[],frames=[];let frame=0;
 const clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
 function state(){const site=globalThis.__diagSite;if(!site)return {};const s=site.stage;
  const props={};for(const id of ['top','rifle']){const e=site.world?.entries.get(id),i=site.keepsakes?.get(id);if(e)props[id]={p:{...e.body.translation()},q:{...e.body.rotation()},sleep:e.body.isSleeping(),box:i?.box?{...i.box}:null,units:i?{x:i.x,y:i.y}:null};}
  return {insets:{...s.insets},unit:site.keepsakes?.unit,feet:site.keepsakes?.feet?{...site.keepsakes.feet}:null,viewport:[s.width,s.height],camera:s.camera.position.toArray(),props};
 }
 globalThis.__observe=(phase,id,extra={})=>{events.push({phase,id,t:performance.now(),frame,...state(),extra:clone(extra)});sessionStorage.setItem('__restoreEvents'+nav,JSON.stringify(events));};
 function sample(){frames.push({t:performance.now(),frame:frame++,...state()});requestAnimationFrame(sample);}requestAnimationFrame(sample);
 addEventListener('pagehide',()=>{__observe('pagehide');sessionStorage.setItem('__restoreFrames'+nav,JSON.stringify(frames));});
 globalThis.__restoreCollect=()=>({nav,events,frames,priorEvents:JSON.parse(sessionStorage.getItem('__restoreEvents0')||'[]'),priorFrames:JSON.parse(sessionStorage.getItem('__restoreFrames0')||'[]'),storage:JSON.parse(localStorage.getItem('sigilcat.v2')||'{}')});
});
`;
let runner=readFileSync('checks/run.mjs','utf8');
runner=runner.replace('const page = await ctx.newPage();','const page = await ctx.newPage();\n'+hook);
runner=runner.replace("const runScript = (file) => page.evaluate(`", "const runScript = async (file) => { if(file.endsWith('look-use.js'))await page.evaluate(async()=>{while(!window.site?.stage.loaded)await new Promise(r=>setTimeout(r,50));await site.ready;const c=site.keepsakes.give('rifle');await c.worldTask;__observe('control.created','rifle');});return page.evaluate(`");
runner=runner.replace("String(e).slice(0, 600)));", "String(e).slice(0, 600)));};");
runner=runner.replace('await browser.close();',`await page.waitForTimeout(3000);
const diagnostic=await page.evaluate(()=>__restoreCollect());
diagnostic.method='Existing desktop look-use.js and look-reload.js, plus untouched rifle control. Read-only HTTP-response observers; one fresh load and one reload. Every rAF frame and all relevant store/world save/restore calls recorded.';
diagnostic.premise='Both attempts assumed saved rigid poses were correct and that restoration could safely re-fit and clamp them against the layout available during construction.';
(await import('node:fs')).writeFileSync('checks/diag/prop-restore-results.json',JSON.stringify(diagnostic)+'\\n');
await browser.close();`);
// Original CLI arguments and exit status are retained, including any CHECK failure.
await import('data:text/javascript;base64,'+Buffer.from(runner).toString('base64'));
