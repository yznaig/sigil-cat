// Headless, real-GPU galaxy measurements, using checks/run.mjs's viewport and launch settings.
// PW_FROM=~/command-hq/scripts/shot node tools/perf/galaxy.mjs http://localhost:18746 --out docs/perf/galaxy-before.json
// Add --shots docs/shots --prefix galaxy to capture a separate, paused sequence (never timed as performance).
import { createRequire } from 'module';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { dirname } from 'path';
import { homedir, loadavg } from 'os';
const require = createRequire((process.env.PW_FROM || process.cwd()).replace(/\/?$/, '/'));
const { chromium } = require('playwright-core');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const base = args.find(a => /^https?:/.test(a)) || 'http://localhost:18746';
const root = homedir() + '/.cache/ms-playwright/';
const exe = process.env.CHROME || root + readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort().pop() + '/chrome-linux64/chrome';
// Pin the shader source for the entire batch, including when comparing a historical file with --source.
const source = readFileSync(opt('source', 'src/eggs/galaxy.js'), 'utf8');
const results = { base, date: new Date().toISOString(), browser: exe,
  sourceSha256: createHash('sha256').update(source).digest('hex'), sizes: {} };
const out = opt('out', 'checks/out/galaxy-perf.json');
const save = () => { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(results, null, 2) + '\n'); };
const browser = await chromium.launch({ executablePath: exe, headless: true,
  args: ['--headless=new', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  env: { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '', GALLIUM_DRIVER: 'd3d12', MESA_D3D12_DEFAULT_ADAPTER_NAME: 'NVIDIA' } });
try {
  for (const [size, width, height, dpr] of [['desktop', 1280, 900, 1], ['phone', 390, 844, 2]]) {
    const data = results.sizes[size] = { width, height, dpr, runs: [], shots: [] };
    const fresh = async () => {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: size === 'phone', hasTouch: size === 'phone' });
      const page = await context.newPage();
      await page.route('**/src/eggs/galaxy.js', route => route.fulfill({ contentType: 'text/javascript', body: source }));
      const loadingErrors = [];
      page.on('requestfailed', r => loadingErrors.push(`${r.url()}: ${r.failure()?.errorText}`));
      page.on('pageerror', e => { throw e; });
      page.on('console', m => { if (m.type() === 'error') loadingErrors.push(m.text()); if (m.type() === 'error' && /THREE|shader|WebGLProgram/.test(m.text())) throw Error(m.text()); });
      await page.goto(base, { timeout: 90000 });
      try {
        await page.waitForFunction(() => window.site?.eggs.galaxy && document.querySelector('canvas#c.on'), null, { timeout: 90000 });
      } catch (e) {
        data.loadingFailure = { errors: loadingErrors, state: await page.evaluate(() => ({ site: !!window.site,
          loaded: window.site?.stage.loaded, canvas: document.querySelector('canvas#c')?.className,
          warm: window.site?.stage.warmLog, status: document.querySelector('#status')?.textContent })) };
        throw e;
      }
      await page.waitForTimeout(7000);
      data.gpu = await page.evaluate(() => {
        const gl = site.stage.renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info');
        return gl.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
      });
      return { context, page };
    };
    for (let run = 0; run < Number(opt('runs', 3)); run++) {
      const { context, page } = await fresh();
      const sample = await page.evaluate(async () => {
        const egg = site.eggs.galaxy, gaps = [], phases = {}, longFrames = [];
        const warm = { left: site.stage.warmLeft, log: [...site.stage.warmLog] };
        let last = performance.now();
        const t0 = last;
        site.fire('galaxy');
        await new Promise(resolve => {
          const tick = t => {
            const gap = t - last; last = t;
            if (gap > 0) { gaps.push(gap); (phases[egg.phase] ??= []).push(gap); }
            if (gap > 50) longFrames.push({ atMs: +(t - t0).toFixed(1), gapMs: +gap.toFixed(1), phase: egg.phase });
            if (egg.isOpen) requestAnimationFrame(tick); else resolve();
          };
          requestAnimationFrame(tick);
        });
        const stats = values => {
          const sorted = values.slice().sort((a, b) => a - b);
          const round = n => +n.toFixed(2);
          return { frames: values.length, meanMs: round(values.reduce((a, b) => a + b, 0) / values.length),
            p95Ms: round(sorted[Math.floor(sorted.length * .95)]), worstMs: round(sorted.at(-1)), over25ms: values.filter(v => v > 25).length };
        };
        return { durationMs: +(performance.now() - t0).toFixed(1), ...stats(gaps), phases: Object.fromEntries(Object.entries(phases).map(([k, v]) => [k, stats(v)])), warm, longFrames };
      });
      data.runs.push(sample);
      sample.hostLoad = loadavg();
      save();
      const { warm, longFrames, ...summary } = sample;
      console.log(size, run + 1, JSON.stringify(summary));
      await context.close();
    }
    if (opt('shots')) {
      mkdirSync(opt('shots'), { recursive: true });
      const { context, page } = await fresh();
      await page.evaluate(() => { window.__galaxyStart = site.stage.clock; site.fire('galaxy'); });
      for (const [name, at] of [['start', .25], ['spin', 1.15], ['peak-swirl', 2.65], ['hold', 6.3], ['recede', 8.8]]) {
        const state = await page.evaluate(at => new Promise(resolve => {
          const { stage, eggs } = site;
          const capture = () => {
            if (stage.clock - window.__galaxyStart < at) return;
            stage.timeScale = 0;
            stage.onFrame.splice(stage.onFrame.indexOf(capture), 1);
            resolve({ at: stage.clock - window.__galaxyStart, phase: eggs.galaxy.phase, level: eggs.galaxy.level, dim: eggs.galaxy.dim });
          };
          stage.onFrame.push(capture); stage.timeScale = 1;
        }), at);
        const path = `${opt('shots')}/${opt('prefix', 'galaxy')}-${name}-${size}.jpg`;
        await page.screenshot({ path, type: 'jpeg', quality: 90 });
        data.shots.push({ path, ...state });
        save();
      }
      await context.close();
    }
  }
} finally { await browser.close(); save(); }
console.log('Saved ' + out);
