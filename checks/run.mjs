// run.mjs: open one page in headless Chromium, run a check script in it, print what it reports, save its screenshots.
// No window is ever opened. Used by checks/run-all.sh; fine to run by hand:
//   node checks/run.mjs <url> [--js checks/site.js] [--then checks/after-reload.js] [--size desktop|phone|WxH] [--dpr 1]
//                             [--out dir] [--timeout 120] [--gpu nvidia|amd|soft] [--reduced] [--quiet] [--storage '{json}']
//                             [--uncapped]  (frame-rate cap and vsync off: a frame takes as long as its work; speed diagnostics)
// --lib: a script put in front of --js and --then (checks/lib.js). The scripts also get MOBILE (true at phone size).
// --then: reload the page once --js has finished and run this script too (what survives a reload).
// --jpeg: screenshots as .jpg (a quarter of the size; the review shots are kept in the repo).
// --storage: start with this as the page's saved state (the JSON kept under localStorage 'sigilcat.v2').
// The page-side script talks to this runner through three globals:
//   await __shot('name')     saves <out>/<name>-<size>.png (the whole viewport)
//   __say('CHECK ...')       prints a line (console.warn works too: CHECK / PASS / FAIL lines are always printed)
//   __done()                 ends the run (otherwise it ends when the script's promise settles, or on timeout)
// Exit code 1 when a line says FAIL, the page threw, a request failed, or the run timed out.
// Needs playwright-core: set PW_FROM to a folder with it in node_modules. --gpu picks the adapter Mesa's D3D12 driver
// uses under WSL (default nvidia; soft = Chromium's software renderer, slow but works anywhere).
import { createRequire } from 'module';
import { readdirSync, readFileSync, mkdirSync } from 'fs';
import { homedir, loadavg } from 'os';
import { cdnArgs } from './cdn.mjs';
import { cacheCheckFonts, settleCheckFonts } from './fonts.mjs';
const require = createRequire((process.env.PW_FROM || process.cwd()).replace(/\/?$/, '/'));
const { chromium } = require('playwright-core');

const args = process.argv.slice(2), url = args.find((a) => /^https?:/.test(a));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
if (!url) { console.error('usage: node checks/run.mjs <url> [--js file] [--size desktop|phone|WxH] [--out dir]'); process.exit(2); }
const sizeName = opt('size', 'desktop');
// phone: a phone on its side (phones play landscape only, shell lane playtest-2); phone-portrait: held upright, which
// only ever shows the "flip sideways" overlay (checks/shell-turn.js).
const SIZES = { desktop: [1280, 900, 1], phone: [844, 390, 2], 'phone-portrait': [390, 844, 2] };
const PHONE = sizeName === 'phone' || sizeName === 'phone-portrait';
const [W, H, D] = SIZES[sizeName] || [...sizeName.split('x').map(Number), 1];
const dpr = Number(opt('dpr', D)), out = opt('out', 'checks/out'), timeout = Number(opt('timeout', 120)) * 1000, gpu = opt('gpu', 'nvidia');
const exe = process.env.CHROME || (() => {
  const root = homedir() + '/.cache/ms-playwright/';
  const dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  return `${root}${dir}/chrome-linux64/chrome`;
})();
const gpuArgs = gpu === 'soft' ? ['--headless=new'] : ['--headless=new', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'];
const env = { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '' };
if (gpu !== 'soft') Object.assign(env, { GALLIUM_DRIVER: 'd3d12', MESA_D3D12_DEFAULT_ADAPTER_NAME: gpu === 'amd' ? 'AMD' : 'NVIDIA' });

const browser = await chromium.launch({ executablePath: exe, headless: true, args: [...gpuArgs, ...await cdnArgs(), '--autoplay-policy=no-user-gesture-required', ...(flag('uncapped') ? ['--disable-frame-rate-limit', '--disable-gpu-vsync'] : [])], env });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, isMobile: PHONE, hasTouch: PHONE, reducedMotion: flag('reduced') ? 'reduce' : 'no-preference' });
await cacheCheckFonts(ctx);
const page = await ctx.newPage();
const requests = [];
page.on('request', (r) => requests.push(r.url()));
await page.exposeFunction('__requests', () => [...requests]);
// Native hit-tested mouse/touch input, including the browser's range-input default action.
// __key('Enter') / __key('Shift+ArrowUp') below use the browser's real keyboard route.
await page.exposeFunction('__pointer', async (points) => {
  if (PHONE) {
    const cdp = await ctx.newCDPSession(page);
    for (let i = 0; i < points.length; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: i ? 'touchMove' : 'touchStart', touchPoints: [{ x: points[i].x, y: points[i].y }] });
      await new Promise(r => setTimeout(r, 25));
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(points[0].x, points[0].y); await page.mouse.down();
    for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 4 });
    await page.mouse.up();
  }
});
await page.exposeFunction('__key', key => page.keyboard.press(key));
await page.exposeFunction('__resize', (width,height) => page.setViewportSize({width,height}));
let failed = false, finished;
const done = new Promise((r) => { finished = r; });
const print = (s) => { if (/FAIL|PAGEERROR|HTTP |REQUEST/.test(s)) failed = true; console.log(s); };
page.on('console', (m) => { const t = m.text(); if (/^(CHECK|PASS|FAIL|ALL )/.test(t)) print(t); else if (m.type() === 'error' && !/GL Driver|favicon/.test(t) && !(fontHost(m.location()?.url || '') || /ERR_CONNECTION_CLOSED/.test(t) && /fonts\./.test(m.location()?.url || ''))) print('CONSOLE error: ' + t.slice(0, 300)); else if (!flag('quiet') && m.type() === 'warning' && !/GL Driver|GPU stall|WebGL-/.test(t)) console.log('  (warning) ' + t.slice(0, 200)); });
page.on('pageerror', (e) => print('PAGEERROR ' + String(e.stack || e).slice(0, 400)));
page.on('response', (r) => { if (r.status() >= 400) print(`HTTP ${r.status()} ${r.url()}`); });
// a web font that does not arrive is the network's business, not the page's (it falls back)
const fontHost = (u) => /fonts\.(gstatic|googleapis)\.com/.test(u);
page.on('requestfailed', (r) => { if (!/ERR_ABORTED/.test(r.failure()?.errorText || '') && !fontHost(r.url())) print(`REQUEST failed ${r.url()} ${r.failure()?.errorText}`); });
mkdirSync(out, { recursive: true });
const ext = flag('jpeg') ? 'jpg' : 'png', shotOpts = flag('jpeg') ? { type: 'jpeg', quality: 74 } : {};
await page.exposeFunction('__shot', async (name) => { const p = `${out}/${name}-${sizeName}.${ext}`; await page.screenshot({ path: p, ...shotOpts }); console.log('PNG ' + p); return p; });
await page.exposeFunction('__say', (s) => print(String(s)));
await page.exposeFunction('__done', () => finished());
await page.exposeFunction('__loadAverage', () => loadavg());
if (opt('storage')) await ctx.addInitScript((v) => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('sigilcat.v2', v); sessionStorage.setItem('__seeded', '1'); } } catch { /* blocked */ } }, opt('storage'));
await page.goto(url, { waitUntil: 'load' });
await settleCheckFonts(page);
const js = opt('js'), then = opt('then');
const lib = opt('lib') ? readFileSync(opt('lib'), 'utf8') : '';
const runScript = (file) => page.evaluate(`(async () => { const MOBILE = ${PHONE};\n${lib}\n${readFileSync(file, 'utf8')}\n })()`).catch((e) => print('PAGEERROR in check script: ' + String(e).slice(0, 600)));
// (a script that navigates itself, e.g. the grimoire's start over, aborts the reload: its own page load is waited for)
const work = js ? (async () => { await runScript(js); if (then) { await page.reload({ waitUntil: 'load' }).catch(async () => { await new Promise((r) => setTimeout(r, 500)); await page.waitForLoadState('load'); }); await settleCheckFonts(page); await runScript(then); } })() : new Promise(() => {});
const timer = new Promise((r) => setTimeout(() => r('timeout'), timeout));
const how = await Promise.race([done, work, timer]);
if (how === 'timeout') print(`FAIL timed out after ${timeout / 1000}s`);
if (flag('shot') || !js) { const p = `${out}/${opt('name', 'page')}-${sizeName}.${ext}`; await page.screenshot({ path: p, ...shotOpts }); console.log('PNG ' + p); }
await browser.close();
process.exit(failed ? 1 : 0);
