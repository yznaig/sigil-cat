// Multiple real browser reloads at recipe transaction boundaries, including the
// suspended error screen. Uses the standard headless GPU/CDN/font setup.
import {createRequire} from 'node:module';
import {readdirSync,mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {cdnArgs} from './cdn.mjs';
import {cacheCheckFonts,settleCheckFonts} from './fonts.mjs';
const require=createRequire((process.env.PW_FROM||process.cwd())+'/');
const {chromium}=require('playwright-core');
const url=process.argv[2]||'http://localhost:8758/',phone=process.argv.includes('phone'),size=phone?'phone':'desktop';
const root=homedir()+'/.cache/ms-playwright/',dir=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().pop();
const browser=await chromium.launch({executablePath:process.env.CHROME||`${root}${dir}/chrome-linux64/chrome`,headless:true,args:['--headless=new','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist',...await cdnArgs(),'--autoplay-policy=no-user-gesture-required'],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',GALLIUM_DRIVER:'d3d12',MESA_D3D12_DEFAULT_ADAPTER_NAME:'NVIDIA'}});
const ctx=await browser.newContext({viewport:phone?{width:844,height:390}:{width:1280,height:900},deviceScaleFactor:phone?2:1,isMobile:phone,hasTouch:phone});await cacheCheckFonts(ctx);
const page=await ctx.newPage();let failed=false;
page.on('pageerror',e=>{failed=true;console.log('PAGEERROR '+e.message);});
const check=(name,ok,detail='')=>{if(!ok)failed=true;console.log(`CHECK cake reload ${name}: ${detail} ${ok?'PASS':'FAIL'}`);};
async function boot(){await page.goto(url,{waitUntil:'load'});await settleCheckFonts(page);await page.waitForFunction(()=>window.site?.stage.loaded&&site.stage.warmLeft===0,null,{timeout:60000});await page.evaluate(async()=>{await site.ready;site.cat.auto=false;await Promise.all([...site.keepsakes.live.values()].map(i=>i.worldTask));});}
async function reload(){await page.reload({waitUntil:'load'});await settleCheckFonts(page);await page.waitForFunction(()=>window.site?.stage.loaded&&site.stage.warmLeft===0,null,{timeout:60000});await page.evaluate(async()=>{await site.ready;site.cat.auto=false;await Promise.all([...site.keepsakes.live.values()].map(i=>i.worldTask));});}
const snap=()=>page.evaluate(()=>({state:site.eggs.box.recipe.state,ids:[...site.keepsakes.live.keys()],bodies:[...site.world.entries.keys()]}));
try{
 await boot();await page.evaluate(()=>{site.eggs.box.recipe.source('bread');site.eggs.box.recipe.source('cup');site.store.flush();});await reload();let s=await snap();check('first source casts persist',s.state.bread===1&&s.state.cup===1&&!s.ids.includes('flour'));
 await page.evaluate(()=>{site.eggs.box.recipe.source('bread');site.eggs.box.recipe.source('cup');site.store.flush();});await reload();s=await snap();check('second casts restore each source once',s.ids.filter(id=>id==='flour').length===1&&s.ids.filter(id=>id==='bucket').length===1);
 await page.evaluate(async()=>{const C=site.eggs.box.recipe,i=site.keepsakes.give('box');await i.worldTask;C.state.visit={id:1,milked:false,x:-1,target:0,z:1,scale:.32,time:0,walkTime:0,phase:'eat'};C.fillMilk();C.save(true);});await reload();s=await snap();check('full milk and visit allowance persist',s.state.milkFull&&s.state.visit.milked);
 // The chest (e1111-61): the four go in, leave the room and stay in across a reload.
 await page.evaluate(async()=>{const C=site.eggs.box.recipe;await site.cat.ensureButter();site.cat.setButter(true);const pat=site.keepsakes.get('pat');await pat.worldTask;pat.worldEntry.grabbed?.();pat.moveWorld({x:site.stage.width*.3,y:site.worldLayout.floorY()+20});
  await C.dropEgg({x:site.stage.width*.6,y:site.stage.height*.3});C.inventory();let k=0;for(const id of ['flour','pat','bucket','egg'])await C.move({kind:'inv',i:C.state.inv[id]},{kind:'chest',i:k++});C.save(true);site.store.flush();});
 await reload();s=await snap();check('the four stay in the chest and out of the room',s.state.milkFull&&['flour','pat','bucket','egg'].every((id,k)=>s.state.chest[k]?.id===id&&!s.ids.includes(id))&&!s.state.open);
 await page.evaluate(async()=>{await site.eggs.box.recipe.shakeBox();site.eggs.box.recipe.save(true);});await reload();s=await snap();check('baked cake restores in the chest and the three stay consumed',s.state.phase==='baked'&&s.state.bakes===1&&s.state.chest.some(e=>e?.id==='cake')&&!s.ids.includes('cake')&&!['flour','pat','egg'].some(id=>s.ids.includes(id)||s.state.chest.some(e=>e?.id===id))&&s.state.chest.some(e=>e?.id==='bucket')&&!s.state.milkFull);
 // Crash fixture: the transaction committed but the cake's slot did not.
 await page.evaluate(()=>{const C=site.eggs.box.recipe;C.state.chest=C.state.chest.map(e=>e?.id==='cake'?null:e);C.save(true);site.store.flush();});await reload();s=await snap();check('interrupted bake restores one cake in the chest',s.state.phase==='baked'&&s.state.chest.filter(e=>e?.id==='cake').length===1&&!s.ids.includes('cake')&&s.state.bakes===1);
 await page.evaluate(async()=>{const C=site.eggs.box.recipe;await C.openChest();await C.move({kind:'chest',i:C.state.chest.findIndex(e=>e?.id==='cake')},{kind:'inv',i:27});await site.keepsakes.get('cake').worldTask;await C.screen.close();C.save(true);site.store.flush();});await page.waitForFunction(()=>site.eggs.box.recipe.state.phase==='revealed',null,{timeout:30000});await reload();s=await snap();check('cake taken out stays revealed in the room',s.state.phase==='revealed'&&s.ids.includes('cake')&&!s.state.chest.some(e=>e?.id==='cake'));
 // Promise deliberately not awaited: reload while the scheduler is suspended.
 const accepted=await page.evaluate(()=>{site.eggs.box.recipe.eat();return site.eggs.party.state.active;});check('eat accepted',accepted);
 mkdirSync('docs/shots',{recursive:true});await page.screenshot({path:`docs/shots/world-unit8-eat-reload-${size}.jpg`,type:'jpeg',quality:80});
 await reload();s=await snap();check('reload during error keeps the one eaten cake (playtest 2) and no portions',s.state.phase==='eaten'&&s.state.eaten===1&&s.ids.filter(id=>id==='cake').length===1&&!s.state.chest.some(e=>e?.id==='cake')&&!s.ids.some(id=>id.startsWith('recipe-'))&&s.ids.includes('box')&&s.state.chest.some(e=>e?.id==='bucket'));
}finally{await browser.close();}
process.exit(failed?1:0);
