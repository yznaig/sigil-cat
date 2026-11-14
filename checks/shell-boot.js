// shell-boot.js (shell lane, playtest-2): the loading screen and its doors, run with ?doors=hold (under automation the
// doors otherwise open at once; hold waits for the check to start them, so a slow start never misses them). Real progress (no timer), he pops in over the closed doors with only him drawn, the
// doors part and the room shows through the gap, then nothing of the loading screen is left and the frame is one pass.
// Reduced motion (--reduced): no pop and no slide, the loading screen fades.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 30000, step = 16) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await sleep(step); } return false; };
const check = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
const loader = document.getElementById('loader'), seen = [];
// The ring's first value is drawn by index.html before the first paint. Usually nothing has landed by then (0); on a busy
// machine a preloaded file or two can land while the page is parsed, and that real progress is in the first draw
// (fix round B, playtest-2: those values used to be recorded twice, before the ring existed and again at its draw).
await until(() => performance.getEntriesByType('paint').length > 0, 10000);
const firstPaint = performance.getEntriesByType('paint').find((e) => e.name === 'first-paint')?.startTime ?? Infinity, h0 = window.__boot.history[0];
check('shell the loading screen is there from the first paint', !!loader && getComputedStyle(loader).zIndex === '30' && loader.querySelectorAll('.ring .rune').length === 48 && loader.querySelectorAll('.door').length === 2 && h0[0] <= firstPaint + 1 && h0[1] < 0.03,
  JSON.stringify({ firstDraw: h0, firstPaint: Math.round(firstPaint) }));
// the ring's value only ever comes from __boot's parts; sample it as it climbs
let last = -1, back = 0;
const sampler = setInterval(() => { const v = window.__boot?.value ?? 0; if (v < last - 1e-6) back++; last = Math.max(last, v); seen.push(+v.toFixed(3)); }, 30);
if (window.__boot.value < 1) await __shot('shell-loading');
await until(() => window.site?.stage?.loaded, 60000);
const S = window.site, { stage, cat, shell } = S, calm = stage.reducedMotion;
await sleep(400);
check('shell loaded: the loading screen waits, the ring is full and sits on him', !!document.getElementById('loader') && !shell.revealed && Math.abs(parseFloat(loader.style.getPropertyValue('--cy')) - cat.screenOf([0, cat.height * 0.45, 0]).y) < 16 && loader.querySelectorAll('.rune.lit').length === 48,
  JSON.stringify({ cy: loader.style.getPropertyValue('--cy'), ring: loader.style.getPropertyValue('--ring'), lit: loader.querySelectorAll('.rune.lit').length }));
await __shot('shell-loaded');
shell.go();
// __boot.history: every value the ring was drawn at, from the first paint, with its time
const parts = window.__boot.parts, hist = window.__boot.history, vals = hist.map((h) => h[1]);
check('shell progress is real: every part reported, it only climbs, in many steps over the load', ['files', 'splat', 'eggs', 'cat', 'warm', 'ready'].every((k) => parts[k] === 1) && back === 0 &&
  vals.every((v, i) => !i || v > vals[i - 1]) && vals.length >= 12 && vals[0] < 0.1 && vals[vals.length - 1] === 1 && hist[hist.length - 1][0] - hist[0][0] > 200,
  JSON.stringify({ parts, steps: vals.length, first: hist[0], last: hist[hist.length - 1] }));
check('shell the splat worker reported its bytes on the way', vals.some((v, i) => i && v - vals[i - 1] > 0 && v - vals[i - 1] < 0.06), `${vals.length} steps`);
// frame times through the pop and the slide (reported; the speed gates live in the cost checks)
const gaps = [], slow = []; let prev = 0; const tick = (dt, now) => { if (prev) { gaps.push(now - prev); if (now - prev > 100) slow.push(`${(now - prev).toFixed(0)}ms@${shell.log[shell.log.length - 1] || 'start'} gap ${shell.gap.toFixed(2)} scale ${cat.fx.scale.toFixed(2)}`); } prev = now; }; stage.onFrame.push(tick);
if (!calm) {
  await until(() => shell.log.includes('pop') && cat.fx.scale > 0.6, 8000, 5);
  const mid = cat.screenOf([0, cat.height * 0.45, 0]);
  const top = document.elementFromPoint(stage.width * 0.1, stage.height * 0.5);
  check('shell he pops in above the closed doors, drawn alone', shell.masking && shell.gap === 0 && document.body.classList.contains('shell-boot') && getComputedStyle(stage.canvas).zIndex === '31' && !!top?.closest('#loader'),
    JSON.stringify({ masking: shell.masking, gap: shell.gap, scale: cat.fx.scale.toFixed(2), ring: loader.style.getPropertyValue('--cy'), catY: mid.y.toFixed(0) }));
  await __shot('shell-pop');
  await until(() => shell.gap > 0.35 && shell.gap < 0.7, 6000, 5);
  const l = loader.querySelector('.door-l').getBoundingClientRect(), r = loader.querySelector('.door-r').getBoundingClientRect();
  check('shell the doors slide apart and the room shows in the gap', l.right < stage.width / 2 - 20 && r.left > stage.width / 2 + 20 && Math.abs((stage.width / 2 - l.right) - (r.left - stage.width / 2)) < 3,
    JSON.stringify({ gap: shell.gap.toFixed(2), left: l.right.toFixed(0), right: r.left.toFixed(0) }));
  await __shot('shell-doors');
}
await until(() => shell.revealed, 8000);
stage.onFrame.splice(stage.onFrame.indexOf(tick), 1);
gaps.sort((a, b) => a - b);
__say(`CHECK shell frames through the reveal: ${gaps.length} frames, median ${gaps[gaps.length >> 1]?.toFixed(1)} ms, worst ${gaps[gaps.length - 1]?.toFixed(0)} ms, warm-ups waiting ${stage.warmLeft}; slow: ${slow.join(', ') || 'none'}`);
let presented = 0; const count = () => presented++; stage.onPresented.push(count);
await sleep(1000);
stage.onPresented.splice(stage.onPresented.indexOf(count), 1);
check('shell after the reveal: no loading screen, he is whole, the frame is one pass again', !document.getElementById('loader') && !shell.masking && cat.fx.scale === 1 && cat.fx.opacity === 1 && !document.body.classList.contains('shell-boot') && getComputedStyle(stage.canvas).zIndex === '2' && presented >= 1,
  JSON.stringify({ log: shell.log, presented }));
check('shell the doors took their time (no pop or slide under reduced motion)', calm ? !shell.log.includes('pop') && !shell.log.includes('doors') : shell.log.includes('pop') && shell.log.includes('doors'), shell.log.join(' > '));
clearInterval(sampler);
await sleep(600);
await __shot('shell-revealed');
