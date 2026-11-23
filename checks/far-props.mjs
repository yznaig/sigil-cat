// far-props.mjs (lane p8-farprops; Aaron, iPhone on its side: "A couple of times now when I've opened the app on mobile
// it has spawned my items way way in the back"). A phone room (the whole collection, the zoom at its most) is left at
// rest on its side; then the page is opened again three ways a phone really opens it, and every loose prop on the floor
// must be back exactly where it was left (one layout, one place):
//   upright   loaded held upright (the loading screen), turned on its side once loaded
//   short     loaded on its side with the address bar showing (a shorter page), the bar then goes
//   reload    a plain reload on its side after both
// Before the fix, the upright load built the room for the upright screen and fitted the props to it (inward and back,
// behind him), and the short load pushed the front props back; neither fit ever brought them forward again.
//   node checks/far-props.mjs <base url> [out dir]
import { createRequire } from 'node:module';
import { readdirSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { cdnArgs } from './cdn.mjs';
import { cacheCheckFonts, settleCheckFonts } from './fonts.mjs';
const require = createRequire((process.env.PW_FROM || homedir() + '/command-hq/scripts/shot') + '/');
const { chromium } = require('playwright-core');
const base = (process.argv[2] || 'http://localhost:8739/').replace(/\/?$/, '/'), out = process.argv[3] || 'checks/out';
const [W, H, DPR, BAR] = [844, 390, 2, 60];   // a phone on its side (checks/run.mjs 'phone'); the address bar's height
const root = homedir() + '/.cache/ms-playwright/', exe = process.env.CHROME || root + readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().at(-1) + '/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', ...await cdnArgs()],
  env: { ...process.env, DISPLAY: '', WAYLAND_DISPLAY: '', GALLIUM_DRIVER: 'd3d12', MESA_D3D12_DEFAULT_ADAPTER_NAME: 'NVIDIA' } });
mkdirSync(out, { recursive: true });
let failed = false;
const say = (s) => { if (/FAIL|PAGEERROR/.test(s)) failed = true; console.log(s); };
const check = (name, ok, detail = '') => say(`CHECK far-props ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  await cacheCheckFonts(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => say('PAGEERROR ' + String(e).slice(0, 300)));
  // (polled on a timer, not on frames: a phone held upright is frozen under "flip sideways", no frames at all)
  const loaded = async () => { await settleCheckFonts(page); await page.waitForFunction(() => window.site?.stage?.loaded, null, { timeout: 90000, polling: 250 }); await page.evaluate(() => window.site.ready); };
  // every loose prop's floor position once the room is still (nothing stepping, nothing settling)
  const quiet = () => { const s = window.site; return { early: s.stage.early, world: !!s.world.stats.listening, supports: !!s.supports?.listening, pending: [...s.keepsakes.live.values()].filter((i) => i.worldTask && !i.worldReady && !i.worldError).map((i) => i.id) }; };
  const still = async () => {
    await page.waitForFunction(() => window.site?.stage?.early, null, { timeout: 60000, polling: 250 }).catch(() => {});
    await page.evaluate(() => Promise.race([Promise.all([...window.site.keepsakes.live.values()].map((i) => i.worldTask)), new Promise((r) => setTimeout(r, 60000))]));
    const done = await page.waitForFunction(() => { const s = window.site; return s.stage.early && !s.world.stats.listening && !s.supports?.listening; }, null, { timeout: 120000, polling: 250 }).then(() => true, () => false);
    if (!done) say(`  (not still after 120 s: ${JSON.stringify(await page.evaluate(`(${quiet})()`))})`);
    await wait(2500);
  };
  const where = () => page.evaluate(() => {
    const s = window.site, st = s.stage, props = {};
    for (const i of s.keepsakes.live.values()) { const e = i.worldEntry; if (!e || e.fixed || e.support) continue; const p = e.body.translation(); props[i.id] = [p.x, p.y, p.z]; }
    return { size: [st.width, st.height], zoom: st.zoom, cam: st.camera.position.toArray(), props };
  });
  const compare = (name, a, b) => {
    const moved = Object.keys(a.props).filter((id) => b.props[id]).map((id) => ({ id, d: Math.hypot(a.props[id][0] - b.props[id][0], a.props[id][2] - b.props[id][2]), from: a.props[id].map((v) => +v.toFixed(3)), to: b.props[id].map((v) => +v.toFixed(3)) })).filter((m) => m.d > .01);
    const missing = Object.keys(a.props).filter((id) => !b.props[id]);
    check(`${name}: every floor prop back where it was left`, !moved.length && !missing.length && b.size[0] === W && b.size[1] === H && Math.abs(b.zoom - a.zoom) < 1e-9,
      JSON.stringify({ size: b.size, zoom: b.zoom, moved, missing }));
  };
  await page.goto(base, { waitUntil: 'load' }); await loaded();
  // the room: the whole collection, the zoom at its most (Aaron's slider), left at rest
  await page.evaluate(async () => { const s = window.site; s.cat.auto = false; await (await import('/checks/world-final-collection.mjs')).collectFinal(s); s.zoom.set(s.zoom.ZOOM.max); });
  await still();
  // (one plain reload first: two props, the paper and a recipe card, settle a little on their first reload anyway, on
  // main too: the room as it comes back is the one to keep)
  await page.reload({ waitUntil: 'load' }); await loaded(); await still();
  const left = await where();
  check('the room left at rest', Object.keys(left.props).length >= 15, `${Object.keys(left.props).length} floor props, zoom ${left.zoom}`);
  await page.screenshot({ path: `${out}/far-props-left.png` });

  // 1. held upright while it loads, turned once loaded
  await page.setViewportSize({ width: H, height: W });
  // (turned once loaded, or after 30 s upright at most: either way the room must not be laid out for the upright screen)
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.site?.stage?.loaded, null, { timeout: 30000, polling: 250 }).catch(() => {}); await wait(1500);
  await page.setViewportSize({ width: W, height: H });
  await loaded(); await still();
  const upright = await where(); compare('loaded upright, then turned', left, upright);
  await page.screenshot({ path: `${out}/far-props-upright.png` });

  // 2. on its side with the address bar showing, then the bar goes
  await page.setViewportSize({ width: W, height: H - BAR });
  await page.reload({ waitUntil: 'load' }); await loaded(); await still();
  const bar = await page.evaluate(() => { const s = window.site, f = { l: 12, r: s.stage.width - 12, b: s.stage.height - s.stage.insets.bottom }; return [...s.keepsakes.live.values()].filter((i) => i.worldEntry && !i.worldEntry.fixed && !i.worldEntry.support && i.box).filter((i) => i.box.x + i.box.w < f.l || i.box.x > f.r).map((i) => i.id); });
  check('with the address bar: the props stay on the page', !bar.length, JSON.stringify(bar));
  await page.setViewportSize({ width: W, height: H });
  await still();
  const short = await where(); compare('loaded with the address bar, then it went', left, short);

  // 3. a plain reload after both
  await page.reload({ waitUntil: 'load' }); await loaded(); await still();
  const again = await where(); compare('reloaded on its side after both', left, again);
  await page.screenshot({ path: `${out}/far-props-reloaded.png` });
} catch (e) { say('FAIL far-props ' + String(e?.stack || e).slice(0, 400)); }
await browser.close();
process.exit(failed ? 1 : 0);
