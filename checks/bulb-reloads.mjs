// The light bulb sequence (e1111-35) across real reloads at every stage, in the order bulb.js does not cover: the
// rack is standing before the bulb is charged, so the lampshade grows onto it. Uses the standard headless GPU/CDN/font
// setup.   node checks/bulb-reloads.mjs <url> [phone]
import {createRequire} from 'node:module';
import {readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {cdnArgs} from './cdn.mjs';
import {cacheCheckFonts,settleCheckFonts} from './fonts.mjs';
const require=createRequire((process.env.PW_FROM||process.cwd())+'/');
const {chromium}=require('playwright-core');
const url=process.argv[2]||'http://localhost:18762/',phone=process.argv.includes('phone');
const root=homedir()+'/.cache/ms-playwright/',dir=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().pop();
const browser=await chromium.launch({executablePath:process.env.CHROME||`${root}${dir}/chrome-linux64/chrome`,headless:true,args:['--headless=new','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist',...await cdnArgs(),'--autoplay-policy=no-user-gesture-required'],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',GALLIUM_DRIVER:'d3d12',MESA_D3D12_DEFAULT_ADAPTER_NAME:'NVIDIA'}});
const ctx=await browser.newContext({viewport:phone?{width:844,height:390}:{width:1280,height:900},deviceScaleFactor:phone?2:1,isMobile:phone,hasTouch:phone});await cacheCheckFonts(ctx);
const page=await ctx.newPage();let failed=false;
page.on('pageerror',e=>{failed=true;console.log('PAGEERROR '+e.message);});
page.on('console',m=>{if(m.type()==='error'&&!/GL Driver|favicon|fonts\./.test(m.text())){failed=true;console.log('CONSOLE error: '+m.text());}});
const check=(name,ok,detail='')=>{if(!ok)failed=true;console.log(`CHECK bulb reloads ${phone?'phone':'desktop'} ${name}: ${detail} ${ok?'PASS':'FAIL'}`);};
// Wait for the page, then for every restored keepsake's body; record lamp-lit events from the very start of the page.
await ctx.addInitScript(()=>{window.__lampEvents=[];addEventListener('sigilcat:lamp-lit',e=>window.__lampEvents.push(e.detail));});
async function settle(){await settleCheckFonts(page);await page.waitForFunction(()=>window.site?.stage.loaded&&site.stage.warmLeft===0,null,{timeout:60000});await page.evaluate(async()=>{await site.ready;site.cat.auto=false;site.audio.context(true);await Promise.all([...site.keepsakes.live.values()].map(i=>i.worldTask));await new Promise(r=>setTimeout(r,900));});}
async function reload(){await page.evaluate(()=>site.store.flush());await page.reload({waitUntil:'load'});await settle();}
const state=()=>page.evaluate(()=>{const L=site.lamp,e=L.inst?.worldEntry,p=e?.body.translation();return {stage:L.stage,hovering:L.hovering,glow:L.glow,bulbs:[...site.world.entries.keys()].filter(id=>id==='bulb').length,p:p&&[p.x,p.y,p.z],support:e?.support?.id||null,on:L.on,lit:!!L.light?.visible,shade:!!L.shade,shadeOnRack:!!L.shade&&L.shade.group.parent===site.rack.picture?.visual,arrival:!!site.rack.arrival,stats:L.stats,events:window.__lampEvents.length,emotes:site.cat.emoteLog.filter(s=>s.startsWith('bulb')).length,button:site.rack.ui?.querySelector('.rack-light')?.hidden};});
try{
 await page.goto(url,{waitUntil:'load'});await settle();
 // idea
 await page.evaluate(async()=>{site.cast('cup',{stroke:[{x:0,y:0}]});await new Promise(r=>{const t=setInterval(()=>{if(site.lamp.hovering){clearInterval(t);r();}},20);});});
 let s=await state();check('idea shows on the first drawn cast',s.stage==='idea'&&s.hovering&&s.glow===1&&s.emotes===1);
 await page.waitForFunction(()=>!site.eggs.glass.busy&&site.keepsakes.has('puddle'),null,{timeout:40000});
 await reload();s=await state();
 check('idea: reload keeps it hovering, lit, quietly (no shake, no hold)',s.stage==='idea'&&s.hovering&&s.glow===1&&s.emotes===0&&s.bulbs===1&&s.stats.casts===0,JSON.stringify(s));
 check('idea: the next drawn sigil is not held',await page.evaluate(()=>site.beforeCast('star',{stroke:[{x:0,y:0}]})===null));
 // the rack arrives before the bulb is charged: no shade yet
 await page.evaluate(async()=>{site.keepsakes.give('rack');await site.rack.ready();});
 s=await state();check('rack first: no lampshade before the bulb is charged',!s.shade&&s.button===undefined);
 // dropped
 await page.evaluate(async()=>{site.lamp.knock();const e=site.lamp.inst.worldEntry;await new Promise(r=>{const t=setInterval(()=>{if(e.body.isSleeping()){clearInterval(t);r();}},40);});});
 const before=(await state()).p;await reload();s=await state();
 check('dropped: reload keeps it on the floor, dark, where it lay',s.stage==='dropped'&&!s.hovering&&s.glow===0&&s.p[1]<.1&&Math.hypot(s.p[0]-before[0],s.p[2]-before[2])<1e-3,JSON.stringify({before,after:s.p}));
 // charged in the puddle: the shade grows onto the standing rack
 const lit=await page.evaluate(async()=>{const L=site.lamp,e=L.inst.worldEntry,pool=site.keepsakes.get('puddle').state.floor,T=site.THREE;
  e.body.setTranslation(new T.Vector3(pool[0],.06,pool[1]),true);site.world.wake(e);
  await new Promise(r=>{const t=setInterval(()=>{if(e.body.isSleeping()){clearInterval(t);r();}},40);});
  const wet=L.inPuddle();site.cast('zigzag');await new Promise(r=>{const t=setInterval(()=>{if(L.stats.grown&&!site.eggs.bolt.busy&&e.body.isSleeping()){clearInterval(t);r();}},40);});return wet;});
 s=await state();check('lit: the strike in the water charges it and grows the shade on the rack',lit&&s.stage==='lit'&&Math.abs(s.glow-.85)<1e-6&&s.shadeOnRack&&!s.lit&&s.button===undefined,JSON.stringify(s));
 await page.screenshot({path:`checks/out/bulb-shade-grown-${phone?'phone':'desktop'}.jpg`,type:'jpeg',quality:80});
 await reload();s=await state();
 check('lit: reload keeps it glowing and the shade on the rack, lamp dark',s.stage==='lit'&&Math.abs(s.glow-.85)<1e-6&&s.shadeOnRack&&!s.lit&&!s.on&&!s.arrival,JSON.stringify(s));
 // lamp
 await page.evaluate(()=>site.lamp.use());s=await state();
 check('lamp: fitting it lights the lamp and fires one event',s.stage==='lamp'&&s.support==='rack-lamp'&&s.on&&s.lit&&s.events===1);
 await reload();s=await state();
 check('lamp: reload keeps it lit in the shade and fires nothing',s.stage==='lamp'&&s.support==='rack-lamp'&&s.on&&s.lit&&s.events===0&&s.stats.lit===0&&!s.arrival,JSON.stringify(s));
 // switched off, then reloaded
 await page.evaluate(()=>site.lamp.use());await reload();s=await state();
 check('lamp: off is remembered',s.stage==='lamp'&&s.support==='rack-lamp'&&!s.on&&!s.lit&&s.glow===0);
}finally{await browser.close();}
process.exit(failed?1:0);
