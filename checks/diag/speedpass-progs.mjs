// Copied from command-hq/output/sigil-cat-speed-tools/ (speed lane, playtest-2): adds the first lamp-on moment and a base URL argument.
//   PW_FROM=~/command-hq/scripts/shot node checks/diag/speedpass-progs.mjs desktop|phone http://127.0.0.1:PORT/ [tag]   (writes runs/progs-<size><tag>.json)
// progs.mjs — which shader programs are built when, by which object, and how long the draw that built it took (vsync on).
import { createRequire } from 'module';
import { readdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
const require = createRequire((process.env.PW_FROM).replace(/\/?$/, '/'));
const { chromium } = require('playwright-core');
const size = process.argv[2] || 'desktop', base = process.argv[3] || 'http://127.0.0.1:8740/', tag = process.argv[4] || '';
const SIZES = { phone: { width: 844, height: 390, dpr: 3 }, desktop: { width: 1920, height: 1080, dpr: 1 } };
const root = homedir() + '/.cache/ms-playwright/', exe = `${root}${readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop()}/chrome-linux64/chrome`;
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'], env: { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '', GALLIUM_DRIVER: 'd3d12', MESA_D3D12_DEFAULT_ADAPTER_NAME: 'NVIDIA' } });
const S = SIZES[size];
const page = await (await browser.newContext({ viewport: { width: S.width, height: S.height }, deviceScaleFactor: S.dpr, isMobile: size === 'phone', hasTouch: size === 'phone' })).newPage();
await page.addInitScript(() => {
  window.__p = [];
  const hook = () => {
    const r = window.site?.stage?.renderer; if (!r) return requestAnimationFrame(hook);
    const orig = r.renderBufferDirect.bind(r);
    r.renderBufferDirect = (camera, scene, geometry, material, object, group) => {
      const n = r.info.programs.length, t = performance.now();
      const out = orig(camera, scene, geometry, material, object, group);
      if (r.info.programs.length > n) {
        const chain = []; for (let o = object; o && chain.length < 4; o = o.parent) chain.push(o.name || o.type);
        const warm = (new Error().stack || '').includes('warm') || (window.site.stage.loaded && window.site.stage.warmLeft > 0);
        const u = Object.keys(material.uniforms || {}).filter((k) => !/^(modelMatrix|viewMatrix|projectionMatrix|normalMatrix|cameraPosition|isOrthographic|modelViewMatrix|toneMapping)/.test(k)).slice(0, 6).join(',');
        window.__p.push({ t: +t.toFixed(0), ms: +(performance.now() - t).toFixed(1), material: material.type + (material.name ? ':' + material.name : ''), object: chain.join(' < '), target: r.getRenderTarget() ? 'target' : 'screen', inWarmUp: warm, uniforms: u, frag: (material.fragmentShader || '').replace(/\s+/g, ' ').slice(0, 90) });
      }
      return out;
    };
  };
  requestAnimationFrame(hook);
});
const mark = (n) => page.evaluate((n) => { window.__p.push({ t: +performance.now().toFixed(0), mark: n }); }, n);
await page.goto(base);
await page.waitForFunction(() => document.querySelector('canvas#c.on'), null, { timeout: 90000 });
await mark('first cat');
await page.waitForFunction(() => window.site.stage.warmLeft === 0, null, { timeout: 90000 });
await new Promise((r) => setTimeout(r, 7000));
await page.evaluate(() => { window.site.cat.auto = false; });
await mark('pops');
for (const g of ['lie', 'stretch', 'sit']) { await page.evaluate((g) => window.site.cat.request(g), g); await new Promise((r) => setTimeout(r, 2500)); }
await mark('butterman');
await page.evaluate(() => window.site.fire('butterman'));
await new Promise((r) => setTimeout(r, 1000));
await page.waitForFunction(() => !window.site.eggs.butterman.running, null, { timeout: 40000, polling: 200 });
await mark('lamp setup');
await page.evaluate(async () => { const s = window.site; s.cat.auto = false; await s.rack.ready(); await s.lamp.award(); if (!s.lamp.inst) s.keepsakes.give('bulb'); await s.lamp.inst.worldTask; });
await page.waitForFunction(() => window.site.stage.warmLeft === 0, null, { timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 1500));
await mark('lamp first on');
await page.evaluate(() => window.site.lamp.use());
await new Promise((r) => setTimeout(r, 3000));
const before = await page.evaluate(() => window.__p);
await page.reload();
await page.waitForFunction(() => document.querySelector('canvas#c.on'), null, { timeout: 90000 });
await mark('first cat (reload)');
await page.waitForFunction(() => window.site.stage.warmLeft === 0, null, { timeout: 90000 });
await new Promise((r) => setTimeout(r, 7000));
await mark('galaxy');
await page.evaluate(() => window.site.fire('galaxy'));
await new Promise((r) => setTimeout(r, 1000));
// the galaxy holds until a click or Esc now (sky lane, playtest-2)
await page.waitForFunction(() => window.site.eggs.galaxy.phase === 'hold', null, { timeout: 30000, polling: 100 }).catch(() => {}); await page.keyboard.press('Escape');
await page.waitForFunction(() => !window.site.eggs.galaxy.isOpen, null, { timeout: 60000, polling: 200 });
await new Promise((r) => setTimeout(r, 500));
const after = await page.evaluate(() => window.__p);
const warmLog = await page.evaluate(() => window.site.stage.warmLog);
const res = { size, load: (await import('fs')).readFileSync('/proc/loadavg', 'utf8').trim(), firstLoad: before, reload: after, warmLog };
writeFileSync(`runs/progs-${size}${tag}.json`, JSON.stringify(res, null, 1));
await browser.close();
console.log(warmLog.join('\n'));
for (const x of [...before, { mark: '----' }, ...after]) console.log(x.mark ? `-- ${x.mark} @${x.t ?? ''}` : `${x.t}\t${x.ms}ms\t${x.inWarmUp ? 'warm' : 'LIVE'}\t${x.target}\t${x.material}\t${x.object}\t[${x.uniforms}]\t${x.frag}`);
