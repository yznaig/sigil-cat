// Copied from command-hq/output/sigil-cat-speed-tools/ (speed lane, playtest-2): adds the first lamp-on moment (out.lamp).
// speed.mjs — scratch copy built on sigil-cat/tools/perf/measure.mjs (same launch, same GPU flags), plus a pop and a trace.
//   node speed.mjs <base-url> --size phone|desktop [--gpu nvidia] [--mode frames|trace] [--out file]
// cost: frame-rate cap off (as measure.mjs "rest"), one fresh browser; rest 5 s, three pops, Butterman scene 1 (first play),
//         reload, galaxy cutscene (first play). Per moment: frames, mean, p95, longest ms, draw calls. Plus every gap >50 ms
//         from first cat and the stage's warm-up log (spec N7).
// trace:  vsync on, the same sequence under a browser-wide Chrome trace (CPU profiler on); moments marked with performance.mark.
import { createRequire } from 'module';
import { readdirSync, writeFileSync, createWriteStream } from 'fs';
import { homedir } from 'os';
const require = createRequire((process.env.PW_FROM || process.cwd()).replace(/\/?$/, '/'));
const { chromium } = require('playwright-core');

const args = process.argv.slice(2), base = args.find((a) => /^https?:/.test(a)) || 'http://localhost:8740/';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const size = opt('size', 'desktop'), gpu = opt('gpu', 'nvidia'), mode = opt('mode', 'cost'), outFile = opt('out', null);
const SIZES = { phone: { width: 844, height: 390, dpr: 3 }, desktop: { width: 1920, height: 1080, dpr: 1 } };
const exe = process.env.CHROME || (() => {
  const root = homedir() + '/.cache/ms-playwright/';
  const dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  return `${root}${dir}/chrome-linux64/chrome`;
})();
const GPU = ['--headless=new', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'];
const UNCAPPED = ['--disable-frame-rate-limit', '--disable-gpu-vsync'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: exe, headless: true, args: [...GPU, ...(mode === 'cost' ? UNCAPPED : [])], env: { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '', GALLIUM_DRIVER: 'd3d12', MESA_D3D12_DEFAULT_ADAPTER_NAME: gpu === 'amd' ? 'AMD' : 'NVIDIA' } });
const S = SIZES[size];
const ctx = await browser.newContext({ viewport: { width: S.width, height: S.height }, deviceScaleFactor: S.dpr, isMobile: size === 'phone', hasTouch: size === 'phone' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
await page.addInitScript(() => {
  window.__m = { firstCat: null, gaps: [], calls: [] };
  const look = () => { if (document.querySelector('canvas#c.on')) { window.__m.firstCat = performance.now(); performance.mark('m:boot:start'); } else requestAnimationFrame(look); };
  requestAnimationFrame(look);
  let last = 0;
  const tick = (t) => {
    if (last) window.__m.gaps.push([t, t - last]);
    last = t;
    const r = window.site?.stage?.renderer; if (r) window.__m.calls.push([t, r.info.render.calls]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// trace mode only: time the WebGL calls that can stall or move bytes, and keep where they came from (the page's own frames)
if (mode === 'trace') await page.addInitScript(() => {
  const P = WebGL2RenderingContext.prototype, slow = window.__gl = { calls: [], agg: {} };
  Error.stackTraceLimit = 60;
  const where = () => { const f = (new Error().stack || '').split('\n').slice(3).map((l) => l.trim().replace(/^at /, '').replace(/\(?https?:\/\/[^/]+\/(npm\/)?/, '(').replace(/@[0-9.]+\/build\//, '/'));
    const lib = f.filter((l) => /three|spark/.test(l)).slice(0, 2), own = f.filter((l) => !/three|spark|<anonymous>/.test(l)).slice(0, 6); return [...lib, '|', ...own].join(' < '); };
  const bytesOf = (name, a) => { for (const x of a) if (x && x.byteLength) return x.byteLength; if (/tex/.test(name)) { const w = a.find((x, i) => i > 2 && typeof x === 'number'); return 0; } return typeof a[1] === 'number' && /buffer/.test(name) ? a[1] : 0; };
  for (const name of ['linkProgram', 'compileShader', 'getProgramParameter', 'getShaderParameter', 'getProgramInfoLog', 'getShaderInfoLog', 'getError', 'readPixels', 'texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'texStorage2D', 'texStorage3D', 'bufferData', 'bufferSubData', 'generateMipmap', 'getUniformLocation', 'getActiveUniform', 'clientWaitSync', 'finish', 'fenceSync']) {
    const f = P[name]; if (!f) continue;
    P[name] = function (...a) {
      const t = performance.now(), r = f.apply(this, a), d = performance.now() - t;
      const k = slow.agg[name] ??= { n: 0, ms: 0, bytes: 0 }; k.n++; k.ms += d; k.bytes += bytesOf(name, a);
      if (d > 4) slow.calls.push({ t: +t.toFixed(0), fn: name, ms: +d.toFixed(1), bytes: bytesOf(name, a), at: where() });
      return r;
    };
  }
});

let tracing = null;
if (mode === 'trace') {
  tracing = await browser.newBrowserCDPSession();
  await tracing.send('Tracing.start', {
    transferMode: 'ReturnAsStream',
    traceConfig: { recordMode: 'recordContinuously', includedCategories: ['toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'v8.execute', 'v8', 'disabled-by-default-v8.cpu_profiler', 'blink.user_timing', 'gpu'] },
  });
}

const firstCat = async () => { await page.waitForFunction(() => window.__m.firstCat !== null, null, { timeout: 90000 }); return page.evaluate(() => window.__m.firstCat); };
const mark = (n) => page.evaluate((n) => { performance.mark(n); if (window.__gl) (window.__gl.snaps ??= []).push([n, +performance.now().toFixed(0), JSON.parse(JSON.stringify(window.__gl.agg))]); }, n);
const now = () => page.evaluate(() => performance.now());
const settle = async () => {
  // past his warm-ups and the other poses: the warm queue empty, then 7 s (measure.mjs waits 7 s)
  await page.waitForFunction(() => window.site?.stage?.loaded && window.site.stage.warmLeft === 0, null, { timeout: 90000 }).catch(() => {});
  await sleep(7000);
};
const stats = (t0, t1) => page.evaluate(([t0, t1]) => {
  const g = window.__m.gaps.filter(([t]) => t > t0 && t <= t1).map((x) => x[1]);
  const c = window.__m.calls.filter(([t]) => t > t0 && t <= t1).map((x) => x[1]);
  const s = g.slice().sort((a, b) => a - b);
  return { frames: g.length, ms: +(t1 - t0).toFixed(0), meanMs: +(g.reduce((a, b) => a + b, 0) / g.length).toFixed(3), p95Ms: +s[Math.floor(s.length * 0.95)].toFixed(3), longestMs: +s[s.length - 1].toFixed(1),
    over50: g.filter((x) => x > 50).length, drawCalls: c.length ? +(c.reduce((a, b) => a + b, 0) / c.length).toFixed(1) : null, drawCallsMax: c.length ? Math.max(...c) : null };
}, [t0, t1]);
const longGaps = (from, to) => page.evaluate(([a, b]) => window.__m.gaps.filter(([t, d]) => t > a && t <= b && d > 50).map(([t, d]) => [+(t - d - a).toFixed(0), +d.toFixed(0)]), [from, to]);

const out = { size, gpu: null, mode, when: new Date().toISOString(), load: (await import('fs')).readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' ') };

await page.goto(base);
const fc = await firstCat();
out.gpu = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : gl.RENDERER); });
await settle();
await mark('m:boot:end');
out.dpr = await page.evaluate(() => window.site.stage.dpr);
out.startupLong = await longGaps(fc, await now());          // [ms after first cat the frame began, its length], gaps > 50 ms
out.warmLogBoot = await page.evaluate(() => window.site.stage.warmLog.slice());

// --- rest: pose cycle off, he holds
await page.evaluate(() => { window.site.cat.auto = false; });
await page.waitForFunction(() => window.site.cat.phase === 'hold' && !window.site.cat.popping, null, { timeout: 20000 });
await sleep(1500);
let t0 = await now(); await mark('m:rest:start'); await sleep(5000); let t1 = await now(); await mark('m:rest:end');
out.rest = await stats(t0, t1);

// --- three pops (each from the pose he holds to another one; window = request until he holds again)
// a fixed route (sit -> lie -> stretch -> sit, each one hop where the cycle allows) so runs compare
const pops = [], windows = [];
for (const goal of ['lie', 'stretch', 'sit']) {
  const a = await now(); await mark('m:pop:start');
  const from = await page.evaluate((g) => { const c = window.site.cat, f = c.pose; c.request(g === f ? 'sleep' : g); return f; }, goal);
  await page.waitForFunction(() => window.site.cat.popping, null, { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => window.site.cat.phase === 'hold' && !window.site.cat.popping, null, { timeout: 20000 });
  const b = await now(); await mark('m:pop:end');
  windows.push([a, b]);
  pops.push({ from, to: await page.evaluate(() => window.site.cat.pose), ...(await stats(a, b)) });
  await sleep(800);
}
// all three pop windows together (the gaps between pops left out)
out.pop = { ...(await page.evaluate((w) => {
  const g = window.__m.gaps.filter(([t]) => w.some(([a, b]) => t > a && t <= b)).map((x) => x[1]);
  const c = window.__m.calls.filter(([t]) => w.some(([a, b]) => t > a && t <= b)).map((x) => x[1]);
  const s = g.slice().sort((a, b) => a - b);
  return { frames: g.length, meanMs: +(g.reduce((a, b) => a + b, 0) / g.length).toFixed(3), p95Ms: +s[Math.floor(s.length * 0.95)].toFixed(3), longestMs: +s[s.length - 1].toFixed(1),
    drawCalls: +(c.reduce((a, b) => a + b, 0) / c.length).toFixed(1), drawCallsMax: Math.max(...c) };
}, windows)), each: pops };

// --- Butterman scene 1, first play
const warmBefore = await page.evaluate(() => window.site.stage.warmLog.length);
t0 = await now(); await mark('m:butterman:start');
await page.evaluate(() => window.site.fire('butterman'));
await page.waitForFunction(() => window.site.eggs.butterman.running, null, { timeout: 5000 }).catch(() => {});
await page.waitForFunction(() => !window.site.eggs.butterman.running, null, { timeout: 40000, polling: 100 }).catch(() => { out.bmTimeout = true; });
t1 = await now(); await mark('m:butterman:end');
out.butterman = await stats(t0, t1);
out.butterman.long = await longGaps(t0, t1);
out.butterman.warmLog = await page.evaluate((n) => window.site.stage.warmLog.slice(n), warmBefore);
await sleep(1500);

// --- the lamp, first time on (speed lane, after the gags lane's 4-6 s freeze): setup unmeasured, then the switch
await page.evaluate(async () => { const s = window.site; s.cat.auto = false; await s.rack.ready(); await s.lamp.award(); if (!s.lamp.inst) s.keepsakes.give('bulb'); await s.lamp.inst.worldTask; });
await page.waitForFunction(() => window.site.stage.warmLeft === 0, null, { timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 1500));
t0 = await now(); await mark('m:lamp:start');
await page.evaluate(() => window.site.lamp.use());
await sleep(3000);
t1 = await now(); await mark('m:lamp:end');
out.lamp = await stats(t0, t1); out.lamp.long = await longGaps(t0, t1); out.lamp.on = await page.evaluate(() => window.site.lamp.on);
// --- galaxy, first play on a fresh page (as measure.mjs)
out.gl1 = await page.evaluate(() => window.__gl ? { calls: window.__gl.calls, snaps: window.__gl.snaps } : null);
await page.evaluate(() => { window.__m.gaps = []; window.__m.calls = []; window.__m.firstCat = null; });
await page.reload();
const fc2 = await firstCat();
await settle();
await mark('m:boot:end');
out.startupLong2 = await longGaps(fc2, await now());
await page.evaluate(() => { window.site.cat.auto = false; });
t0 = await now(); await mark('m:galaxy:start');
await page.evaluate(() => window.site.fire('galaxy'));
await page.waitForFunction(() => window.site.eggs.galaxy.isOpen, null, { timeout: 5000 }).catch(() => {});
// the galaxy holds until a click or Esc now (sky lane, playtest-2)
await page.waitForFunction(() => window.site.eggs.galaxy.phase === 'hold', null, { timeout: 30000, polling: 100 }).catch(() => {}); await page.keyboard.press('Escape');
await page.waitForFunction(() => !window.site.eggs.galaxy.isOpen, null, { timeout: 60000, polling: 100 }).catch(() => { out.galaxyTimeout = true; });
t1 = await now(); await mark('m:galaxy:end');
out.galaxy = await stats(t0, t1);
out.galaxy.long = await longGaps(t0, t1);
out.galaxy.warmLog = await page.evaluate(() => window.site.stage.warmLog.slice());
out.errors = errors;
out.gl = await page.evaluate(() => window.__gl ? { calls: window.__gl.calls, snaps: window.__gl.snaps, ext: document.querySelector('canvas#c') && (window.site.stage.renderer.getContext().getSupportedExtensions() || []) } : null);

if (tracing) {
  const done = new Promise((r) => tracing.once('Tracing.tracingComplete', r));
  await tracing.send('Tracing.end');
  const { stream } = await done;
  const file = outFile.replace(/\.json$/, '') + '.trace.json', ws = createWriteStream(file);
  for (;;) { const { data, eof, base64Encoded } = await tracing.send('IO.read', { handle: stream, size: 1 << 20 }); ws.write(base64Encoded ? Buffer.from(data, 'base64') : data); if (eof) break; }
  await new Promise((r) => ws.end(r));
  await tracing.send('IO.close', { handle: stream });
  out.trace = file;
}
await browser.close();
const json = JSON.stringify(out, null, 1);
if (outFile) writeFileSync(outFile, json);
console.log(json);
