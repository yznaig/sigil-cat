// lib.js: what the page-side check scripts share. checks/run.mjs puts this in front of each script (--lib), so
// everything here is in scope there: the page's parts, a clock, real pointer input, sigils drawn as real strokes.
// MOBILE is set by the runner (true at phone size).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 20000, step = 40) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await sleep(step); } return false; };
while (!(window.site && window.site.stage.loaded)) await sleep(100);
await window.site.ready;
const site = window.site, { stage, cat, audio, keepsakes, registry, input, ui, store } = site, E = site.eggs, canvas = stage.canvas;
audio.context(true);                                             // headless has no real gesture
await until(() => audio.status('thunder') !== 'pending' && audio.status('purr') !== 'pending', 15000);
const check = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
const note = (name, detail) => __say(`CHECK ${name}: ${detail}`);
// site.ready means egg registration, not the deferred shader queue. Interaction
// and resource snapshots need a completed warm-up; startup has its own runner.
check('interaction fixture shader warm-up completes', await until(() => stage.warmLeft === 0, 30000), `${stage.warmLeft} pending`);
// The first sigil ever drawn shows a light bulb and holds its effect ~2 s (e1111-35, src/world/lamp.js). Checks written
// before it cast as though that had already happened; checks/bulb.js clears this to play the sequence itself.
if (!store.get('lamp.stage') && !keepsakes.has('bulb')) store.set('lamp.stage', 'fixture');
const fast = async (k, f) => { stage.timeScale = k; try { return await f(); } finally { stage.timeScale = 1; } };

// ---- real pointer input on the canvas ----
let pointerIds = 10;
const KIND = MOBILE ? 'touch' : 'mouse';
const fire = (type, x, y, id, buttons = 1) => canvas.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: KIND, isPrimary: true, button: 0, buttons }));
const tap = async (x, y) => { const id = ++pointerIds; fire('pointerdown', x, y, id); await sleep(45); fire('pointerup', x, y, id, 0); await sleep(40); };
// press at the first point, move through the rest (ms apart), let go at the last
const drag = async (pts, ms = 6) => { const id = ++pointerIds; fire('pointerdown', pts[0].x, pts[0].y, id); for (const p of pts.slice(1)) { await sleep(ms); fire('pointermove', p.x, p.y, id); } await sleep(ms); const l = pts[pts.length - 1]; fire('pointerup', l.x, l.y, id, 0); await sleep(30); };
// the same with exact timing (the main thread is held between moves): for flicks, whose speed is the point
const flick = (pts, ms) => { const id = ++pointerIds; fire('pointerdown', pts[0].x, pts[0].y, id); let t = performance.now(); for (const p of pts.slice(1)) { t += ms; while (performance.now() < t); fire('pointermove', p.x, p.y, id); } const l = pts[pts.length - 1]; fire('pointerup', l.x, l.y, id, 0); };
const hover = (x, y) => fire('pointermove', x, y, 1, 0);
const catMid = () => cat.screenOf([0, cat.height * 0.45, 0]);

// ---- sigils, drawn as real strokes ----
const { SIGILS } = await import(new URL('src/sigils/templates.js', document.baseURI).href);
function shapeOf(name) {
  if (name === 'cup') return SIGILS.dome.templates[0].map((p) => ({ x: p.x, y: -p.y }));
  if (name === 'eight') return Array.from({ length: 70 }, (_, i) => { const t = Math.PI / 2 + i / 69 * 2 * Math.PI * 1.02; return { x: 50 * Math.sin(t), y: 28 * Math.sin(2 * t) }; });
  return SIGILS[name].templates[name === 'zigzag' ? 4 : 0];
}
// a press here would start a stroke: not on him, a whisker or a keepsake, and clear of the page's words
function isAir(x, y) {
  if (x < 10 || y < stage.insets.top + 8 || x > stage.width - 10 || y > stage.height - stage.insets.bottom - 8) return false;
  if (cat.hitTest(x, y) || E.harp?.whiskerAt(x, y)) return false;
  if (E.bird?.hit(x, y)) return false;
  return ![...keepsakes.live.values()].some((k) => !k.def.inert && k.hits(x, y));
}
// Draw a sigil somewhere its first point is on empty air. Returns what the recognizer made of it.
async function drawSigil(name) {
  const raw = shapeOf(name), xs = raw.map((p) => p.x), ys = raw.map((p) => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 || 1, h = Math.max(...ys) - y0 || 1;
  const size = MOBILE ? 96 : 130, k = size / Math.max(w, h), bw = w * k, bh = h * k;
  const top = stage.insets.top + 12, bottom = stage.height - stage.insets.bottom - 12;
  for (let by = top; by + bh <= bottom; by += 14) for (let bx = 12; bx + bw <= stage.width - 12; bx += 14) {
    const sx = bx + (raw[0].x - x0) * k, sy = by + (raw[0].y - y0) * k;
    if (!isAir(sx, sy)) continue;
    const every = Math.max(1, Math.floor(raw.length / 70));
    const pts = raw.filter((_, i) => i % every === 0 || i === raw.length - 1).map((p) => ({ x: bx + (p.x - x0) * k, y: by + (p.y - y0) * k }));
    const before = site.ink.log.length ? site.ink.log[site.ink.log.length - 1].at : -1;
    await drag(pts, 4);
    await sleep(60);
    const l = site.ink.log[site.ink.log.length - 1];
    return l && l.at !== before ? l : { name: null, reason: 'no stroke taken' };
  }
  return { name: null, reason: 'no empty air to draw on' };
}
const drew = (r) => (r.name ? r.name : `${r.reason}${r.why ? ' (' + r.why + ')' : ''}${r.best ? ' nearest ' + r.best : ''}`);
// wait for him to be himself again: nothing playing, nothing hiding him, his hands free
const settled = () => !cat.hidden && !cat.standIn && !cat.popping && !input.locked && !E.bolt?.busy && !E.circle?.spinning && !E.glass?.busy && !E.box?.busy && !E.eyes?.busy && !E.paradox?.active && !E.fling?.busy && !E.galaxy?.isOpen && E.bread?.state === 'cat';

// ---- spinning him with real swipes (sky lane, playtest 2: the galaxy and the bread's blast-off need a really fast spin) ----
// One swipe across him at `pxPerSec`, a move every 12 ms like a mouse (timer-paced: headless Chromium may not run
// animation frames while the page is idle); `dir` 1 = left to right.
async function swipe(pxPerSec, dir = 1) {
  const m = catMid(), span = MOBILE ? 240 : 320, id = ++pointerIds;
  const a = { x: m.x - dir * 50, y: m.y }, t0 = performance.now();   // pressed on him, carried on past him
  fire('pointerdown', a.x, a.y, id);
  for (let k = 0; k < 1;) {
    await sleep(12);
    k = Math.min(1, (performance.now() - t0) / 1000 * pxPerSec / span);
    fire('pointermove', a.x + dir * span * k, a.y, id);
  }
  fire('pointerup', a.x + dir * span, a.y, id, 0); await sleep(25);
}
// Press and hold him still for a moment (not a tap): stops a coasting spin, so a swipe that happens to come to rest
// one full turn round is not taken for the 360 no-scope.
async function catchHim() { const m = catMid(), id = ++pointerIds; fire('pointerdown', m.x, m.y, id); await sleep(500); fire('pointerup', m.x, m.y, id, 0); await sleep(40); }
// Swipe hard, again and again, until `done()` (or `max` swipes): how a player spins him really fast. If it never
// happens he is caught at the end, so the run's last swipe cannot fire the 360.
async function spinHard(done, { pxPerSec = 2600, max = 40 } = {}) {
  for (let i = 0; i < max && !done(); i++) await swipe(pxPerSec);
  if (!done() && !input.locked) await catchHim();
  return done();
}
