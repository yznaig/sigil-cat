// measure.mjs: the numbers behind the before/after table in docs/REVIEW.md. Headless Chromium on the machine's real
// GPU (no window is ever opened), against a local server.
//   node tools/perf/measure.mjs <base-url> [--api old|new] [--size phone|desktop] [--gpu nvidia|amd] [--runs 3] [--only load,rest,eggs]
// --gpu picks the adapter Mesa's D3D12 driver uses under WSL (this PC: the RTX card, or the AMD integrated chip that
// Windows Chrome picks by default).
// Needs playwright-core: set PW_FROM to a folder that has it in node_modules (e.g. the shot tool's folder), and
// CHROME to a full Chromium binary if the newest one under ~/.cache/ms-playwright is not wanted.
// What it measures (per size):
//   load  time to first cat (navigation start -> canvas#c.on), requests and bytes before it; cache off; median of runs
//   rest  frame time at rest with the frame-rate cap off (ms per frame, mean and p95), 5 s after he has settled
//   eggs  the longest frame (ms, vsync on) from first cat through the first bolt, Butterman scene 1 and galaxy
import { createRequire } from 'module';
import { readdirSync } from 'fs';
import { homedir } from 'os';
const require = createRequire((process.env.PW_FROM || process.cwd()).replace(/\/?$/, '/'));
const { chromium } = require('playwright-core');

const args = process.argv.slice(2), base = args.find((a) => /^https?:/.test(a)) || 'http://localhost:8732/';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const api = opt('api', 'new'), size = opt('size', 'desktop'), gpu = opt('gpu', 'nvidia'), runs = Number(opt('runs', 3)), only = opt('only', 'load,rest,eggs').split(',');
const SIZES = { phone: { width: 390, height: 844, dpr: 3 }, desktop: { width: 1920, height: 1080, dpr: 1 } };
const exe = process.env.CHROME || (() => {
  const root = homedir() + '/.cache/ms-playwright/';
  const dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  return `${root}${dir}/chrome-linux64/chrome`;
})();
// How each build fires its eggs (the old build has no single door).
const FIRE = {
  old: { bolt: "site.eggs.spells.cast('zigzag')", butterman: "site.eggs.butterman.play({ scene: 'butter' })", galaxy: 'site.eggs.hole.trigger()' },
  new: { bolt: "site.fire('bolt')", butterman: "site.fire('butterman')", galaxy: "site.fire('galaxy')" },
}[api];
const GPU = ['--headless=new', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'];
const median = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function open(extra = []) {
  const browser = await chromium.launch({ executablePath: exe, headless: true, args: [...GPU, ...extra], env: { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '', GALLIUM_DRIVER: 'd3d12', MESA_D3D12_DEFAULT_ADAPTER_NAME: gpu === 'amd' ? 'AMD' : 'NVIDIA' } });
  const S = SIZES[size];
  const ctx = await browser.newContext({ viewport: { width: S.width, height: S.height }, deviceScaleFactor: S.dpr, isMobile: size === 'phone', hasTouch: size === 'phone' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  // first cat: the moment canvas#c gets its `on` class; frames: every rAF gap, kept in the page
  await page.addInitScript(() => {
    window.__m = { firstCat: null, gaps: [], on: true };
    const look = () => { if (document.querySelector('canvas#c.on')) window.__m.firstCat = performance.now(); else requestAnimationFrame(look); };
    requestAnimationFrame(look);
    let last = 0;
    const tick = (t) => { if (last && window.__m.on) window.__m.gaps.push([t, t - last]); last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  return { browser, page, errors };
}
const gpuOf = (page) => page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return gl ? gl.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : 'none'; });
const firstCat = async (page) => { await page.waitForFunction(() => window.__m.firstCat !== null, null, { timeout: 60000 }); return page.evaluate(() => window.__m.firstCat); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { base, api, size, gpu: null };

if (only.includes('load')) {
  const t = [], bytes = [], reqs = [];
  for (let i = 0; i < runs; i++) {
    const { browser, page } = await open();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    // every finished download, the worker's too (his first pose is fetched in one), with when it finished
    const done = [];
    page.on('requestfinished', (r) => { const at = Date.now(); r.sizes().then((z) => done.push([at, z.responseBodySize + z.responseHeadersSize]), () => {}); });
    await page.goto(base, { waitUntil: 'commit' });
    const fc = await firstCat(page);
    out.gpu ??= await gpuOf(page);
    const origin = await page.evaluate(() => performance.timeOrigin);
    await sleep(300);                                          // let the sizes of the last few settle
    const before = done.filter(([at]) => at <= origin + fc);     // what starts once he is shown (the other poses) is after
    t.push(fc); bytes.push(before.reduce((a, [, b]) => a + b, 0)); reqs.push(before.length);
    await browser.close();
  }
  out.load = { firstCatMs: Math.round(median(t)), all: t.map(Math.round), requests: median(reqs), bytes: median(bytes) };
}
if (only.includes('rest')) {
  const { browser, page, errors } = await open(['--disable-frame-rate-limit', '--disable-gpu-vsync']);
  await page.goto(base); await firstCat(page); out.gpu ??= await gpuOf(page);
  await sleep(7000);                                         // past the warm-ups, the other poses and the sounds
  const g = await page.evaluate(async () => { window.__m.gaps = []; await new Promise((r) => setTimeout(r, 5000)); return window.__m.gaps.map((x) => x[1]); });
  const s = g.slice().sort((a, b) => a - b);
  out.rest = { frames: g.length, meanMs: +(g.reduce((a, b) => a + b, 0) / g.length).toFixed(3), p95Ms: +s[Math.floor(s.length * 0.95)].toFixed(3), worstMs: +s[s.length - 1].toFixed(1), errors };
  await browser.close();
}
if (only.includes('eggs')) {
  const worst = { startup: [], bolt: [], butterman: [], galaxy: [] };
  for (let i = 0; i < runs; i++) {
    const { browser, page } = await open();
    await page.goto(base); const fc = await firstCat(page);
    const span = async (name, js, ms) => {
      const t0 = await page.evaluate((code) => { const t = performance.now(); if (code) (0, eval)(code); return t; }, js);
      await sleep(ms);
      const gaps = await page.evaluate(() => window.__m.gaps);
      worst[name].push(Math.max(0, ...gaps.filter(([t]) => t >= t0 && t <= t0 + ms).map((x) => x[1])));
    };
    const gaps0 = async () => { await sleep(7000); const gaps = await page.evaluate(() => window.__m.gaps); worst.startup.push(Math.max(0, ...gaps.filter(([t]) => t > fc + 50).map((x) => x[1]))); };
    await gaps0();
    await span('bolt', FIRE.bolt, 3000);
    await span('butterman', FIRE.butterman, 9000);
    await page.reload(); await firstCat(page); await sleep(7000);   // the galaxy on a page that has not played it
    await span('galaxy', FIRE.galaxy, 9000);
    await browser.close();
  }
  out.longestFrameMs = Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, { worst: Math.round(Math.max(...v)), all: v.map(Math.round) }]));
}
console.log(JSON.stringify(out, null, 1));
