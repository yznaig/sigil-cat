// Physics lane: CPU profile (CDP Profiler) of the world-final-cost 'twenty' tight loop; prints self time by function.
//   node checks/diag/physics2-cpuprof.mjs <base url> [desktop|phone]
import { createRequire } from 'module';
import { readdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { cdnArgs } from '../cdn.mjs';
const require = createRequire((process.env.PW_FROM || process.cwd()).replace(/\/?$/, '/'));
const { chromium } = require('playwright-core');
const [base, size = 'desktop'] = process.argv.slice(2);
const [W, H, D] = size === 'phone' ? [390, 844, 2] : [1280, 900, 1];
const root = homedir() + '/.cache/ms-playwright/', dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
const browser = await chromium.launch({ executablePath: `${root}${dir}/chrome-linux64/chrome`, headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', ...await cdnArgs()], env: { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '', GALLIUM_DRIVER: 'd3d12', MESA_D3D12_DEFAULT_ADAPTER_NAME: 'NVIDIA' } });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: D, isMobile: size === 'phone', hasTouch: size === 'phone' });
const page = await ctx.newPage();
page.on('console', (m) => { if (/^CHECK|PROFILE/.test(m.text())) console.log(m.text()); });
await page.goto(`${base}?dpr=${D}`, { waitUntil: 'load' });
const lib = readFileSync('checks/lib.js', 'utf8');
await page.exposeFunction('__say', (s) => console.log(s));
await page.exposeFunction('__loadAverage', () => [0, 0, 0]);
await page.evaluate(`(async () => { const MOBILE = ${size === 'phone'};\n${lib}\n
const {collectFinal}=await import('/checks/world-final-collection.mjs');
let items=await collectFinal(site,{cake:false});const W=site.world,T=site.THREE;
await until(()=>!W.stats.listening&&!site.supports.listening,20000);
for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}
const ids=['rifle','top','tin','pat','eyes','twinkle','crumbs','shards','box','flour','bucket','pitchfork','recipe-flour','recipe-butter','recipe-milk','rack/wizard','rack/cone','rack/crown','bulb','controller'];
const list=ids.map(id=>W.entries.get(id));
for(const e of items.map(i=>i.worldEntry))if(!list.includes(e))site.supports.mount(e,e.id==='rack/party'?'rack':'pinboard',e.id==='rack/party'?'party':e.id,{animate:false});
for(const e of list){site.supports.detach(e,{wake:false});e.body.setEnabled(true);e.object.visible=true;}
window.__reset=()=>{for(const [n,e]of list.entries()){const row=Math.floor(n/2);W.cancelReturn(e);e.body.setTranslation({x:(n%2-.5)*1.4,y:.7+(row%4)*.22,z:-row*.9},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);}};
window.__loop=(frames)=>{const times=[];for(let n=0;n<frames;n++){if(n%45===0)__reset();const t=performance.now();W.step(1/60);times.push(performance.now()-t);}times.sort((a,b)=>a-b);return {mean:times.reduce((a,b)=>a+b,0)/frames,p95:times[Math.floor(frames*.95)]};};
__loop(180);
})()`);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 50 });
await cdp.send('Profiler.start');
const stats = await page.evaluate(() => { const r = []; for (let k = 0; k < 6; k++) r.push(__loop(180)); return r; });
const { profile } = await cdp.send('Profiler.stop');
console.log('loop', JSON.stringify(stats.map((s) => [+s.mean.toFixed(2), +s.p95.toFixed(2)])));
const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas, total = dt.reduce((a, b) => a + b, 0);
const counts = new Map(); profile.samples.forEach((id, i) => counts.set(id, (counts.get(id) || 0) + (dt[i] || 0)));
for (const [id, t] of counts) { const n = byId.get(id), f = n.callFrame, key = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-1)[0]}:${f.lineNumber + 1}`; self.set(key, (self.get(key) || 0) + t); }
const rows = [...self].sort((a, b) => b[1] - a[1]).slice(0, 45);
for (const [k, t] of rows) console.log((t / total * 100).toFixed(1).padStart(5) + '%  ' + (t / 1000).toFixed(0).padStart(6) + 'ms  ' + k);
await browser.close();
