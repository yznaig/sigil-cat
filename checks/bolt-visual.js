// bolt-visual.js (fx lane, playtest 3, e1113-10: "make the lighning bolt be a way sicker/cooler visual effect"): the bolt
// is a branching, jagged, animated bolt with a white-hot core and a soft blue glow, drawn additively into a canvas the
// size of the bolt's own box (never the whole screen); the screen flashes once; sparks fly where it strikes and an
// afterglow lingers there; its drawing costs next to nothing. Reduced motion: the calm version (no flash, shake, sparks
// or crackle; it fades in and out, the afterglow stays). Pixel checks read the bolt's own canvas mid-strike.
cat.auto = false;
await until(() => settled(), 20000);
const B = E.bolt, calm = stage.reducedMotion, cv = B.canvas;
await audio.load('bolt-beam');
const f0 = B.flashes, a0 = B.stats.afterglows, gaps = [];
let lastT = 0, watching = true;
const tick = (t) => { if (lastT) gaps.push(t - lastT); lastT = t; if (watching) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const done = B.strike();
// mid-strike: a few frames after the return stroke lands (calm: near its brightest), the page's clock held still while
// its pixels are read (the strike keeps drawing the same moment)
await until(() => calm ? B.stats.draws >= 1 : B.stats.sparkDraws > 4, 4000, 2);
if (calm) await sleep(300);
stage.timeScale = 0; await sleep(120);
const box = B.stats.box, px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, sc = B.sparksCanvas, spx = sc.getContext('2d').getImageData(0, 0, sc.width, sc.height).data;
let core = 0, glow = 0, warm = 0;
const rows = new Set();
for (let i = 0; i < px.length; i += 4) {
  const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
  if (a > 180 && Math.min(r, g, b) > 190) { core++; rows.add(Math.floor(i / 4 / cv.width)); }      // white-hot
  else if (a > 8 && b > r + 25) glow++;
}
for (let i = 0; i < spx.length; i += 4) if (spx[i + 3] > 30 && spx[i] > spx[i + 2] + 40) warm++;   // the sparks: orange-white streaks
// the rows from the top of the page down to where it struck, in canvas pixels
const strikeRow = (cat.screenOf([cat.seat.position.x, cat.seat.position.y + 0.04, cat.seat.position.z]).y - box.y) * box.dpr;
await __shot(calm ? 'bolt-calm-strike' : 'bolt-strike');
const canvasW = cv.width;
stage.timeScale = 1;
const area = box.w * box.h, screen = stage.width * stage.height, len = box.h / box.dpr;
check('the bolt is drawn in its own box, not the whole screen', area < screen * 0.6 && canvasW === Math.ceil(box.w * box.dpr), `${box.w}x${box.h} of ${stage.width}x${stage.height} (${(100 * area / screen).toFixed(0)}%)`);
check('a white-hot core runs the length of the bolt', rows.size > strikeRow * 0.85, `white-hot in ${rows.size} of ${Math.round(strikeRow)} rows down to the strike; ${core} px`);
check('a soft blue glow, many times wider than the core', glow > core * 3, `${glow} glow px, ${core} core px`);
check('it branches (forks off the trunk)', B.stats.paths >= 5, `${B.stats.paths} paths`);
check(calm ? 'calm: no sparks' : 'sparks fly where it strikes', calm ? B.stats.sparks === 0 && warm === 0 : B.stats.sparks >= 20 && warm > 30, `${B.stats.sparks} sparks, ${warm} warm px`);
check('an afterglow is left where it struck', B.stats.afterglows === a0 + 1);
await done;
watching = false;
check(calm ? 'calm: no flash and no shake' : 'one flash, never a strobe', B.flashes === f0 + (calm ? 0 : 1) && !document.body.style.translate, `${B.flashes - f0} flashes`);
check(calm ? 'calm: drawn once, faded by its opacity, then its canvases are given back' : 'animated: redrawn as it forks down and crackles, its sparks every frame, then its canvases are given back',
  (calm ? B.stats.draws >= 1 : B.stats.draws >= 10 && B.stats.sparkDraws >= 20) && cv.width === 1 && sc.width === 1, `${B.stats.draws} bolt draws, ${B.stats.sparkDraws} spark draws`);
const mean = B.stats.drawMs / Math.max(1, B.stats.draws + B.stats.sparkDraws);
check('it costs next to nothing to draw (main thread, per frame)', mean < 1.5 && B.stats.maxDrawMs < 10, `mean ${mean.toFixed(2)} ms, worst ${B.stats.maxDrawMs.toFixed(2)} ms over ${B.stats.draws + B.stats.sparkDraws} draws`);
gaps.sort((a, b) => a - b);
const p95 = gaps[Math.floor(gaps.length * 0.95)] ?? 0;
note('bolt frames during the strike (info)', `${gaps.length} frames, median ${gaps[gaps.length >> 1]?.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, worst ${gaps.at(-1)?.toFixed(1)} ms`);
await sleep(400);
