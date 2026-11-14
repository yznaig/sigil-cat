// fullscreen.js (fullscreen lane, playtest-3): full screen on a phone (src/ui/fullscreen.js). Run with ?doors=hold&fs=1
// (under automation the step is off unless fs=1) and ?case=:
//   api        (phone)            the step after landscape, before he pops in; "full screen" goes full screen inside the
//                                 tap and the doors open on the re-laid-out room; the button leaves and enters again and
//                                 follows a system exit. --then fullscreen-reload.js: no second step this visit.
//   later      (phone, --reduced) Escape is "not now": no full screen, no fades, the reveal goes on, not asked again.
//   noapi      (phone)            no element full screen (iPhone Safari, stubbed): the step says Share, then Add to Home
//                                 Screen, with one "ok"; a click outside closes it; no button.
//   standalone (phone)            opened from the home screen (display-mode stubbed): no step, no button.
//   portrait   (phone-portrait)   loaded upright: "flip sideways" first, the step only once it is on its side.
//   desktop    (desktop)          neither the step nor the button.
// No --lib: the page holds still under the step and the turn overlay, so this keeps to the wall clock.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(25); } return false; };
const check = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
const kase = new URLSearchParams(location.search).get('case') || (MOBILE ? 'api' : 'desktop');
await until(() => window.site?.stage?.loaded, 60000);
const S = window.site, { stage, cat, shell, fullscreen: F } = S;
const btn = () => document.getElementById('fs-toggle'), stepEl = () => document.getElementById('fs-step');
const shown = (el) => !!el && !el.hidden && el.getBoundingClientRect().width > 0;
const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
const centre = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const tap = (el) => __pointer([centre(el)]);
let passes = 0; stage.onResize.push(() => passes++);
const laidOut = () => stage.width === innerWidth && stage.height === innerHeight && stage.camera.aspect === innerWidth / innerHeight;
const flow = () => shell.log.join(' > ');

if (kase === 'noapi') {
  // iPhone Safari: no element full screen at all
  for (const k of ['requestFullscreen', 'webkitRequestFullscreen']) delete Element.prototype[k];
  for (const k of ['fullscreenEnabled', 'webkitFullscreenEnabled']) Object.defineProperty(Document.prototype, k, { get: () => undefined, configurable: true });
  Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', configurable: true });
}
if (kase === 'standalone') {
  const mm = window.matchMedia.bind(window);
  window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm(q));
}

if (kase === 'desktop') {
  shell.go();
  await until(() => shell.revealed, 15000);
  check('fullscreen desktop: no step and no button, the doors as before', flow() === 'pop > doors > revealed' && !stepEl() && !F.shown && !shown(btn()) && !document.body.classList.contains('fullscreen'),
    JSON.stringify({ flow: flow(), button: btn() ? (btn().hidden ? 'hidden' : 'shown') : 'none' }));
  return;   // (the check script runs inside an async function)
}

if (kase === 'portrait') {
  check('fullscreen this run is a phone held upright', shell.phone && shell.upright, `${innerWidth}x${innerHeight}`);
  shell.go();
  await until(() => shell.turnShown, 5000); await wsleep(600);
  check('fullscreen upright: "flip sideways" first, no step under it', shell.turnShown && !F.shown && !stepEl(), flow());
  await __resize(844, 390);
  await until(() => F.shown, 5000);
  check('fullscreen turned on its side: the step comes after the flip, before he pops in', F.shown && flow() === 'turn shown > turn hidden > fullscreen step' && cat.fx.scale === 0 && !!document.getElementById('loader'), flow());
  await __key('Escape');
  await until(() => shell.revealed, 8000);
  check('fullscreen then he pops in and the doors part', flow() === 'turn shown > turn hidden > fullscreen step > fullscreen later > pop > doors > revealed' && !F.active, flow());
  return;   // (the check script runs inside an async function)
}

check('fullscreen this run is a phone on its side', shell.phone && !shell.upright && matchMedia('(pointer: coarse)').matches, `${innerWidth}x${innerHeight}`);
shell.go();

if (kase === 'standalone') {
  await until(() => shell.revealed, 15000); await wsleep(300);
  check('fullscreen opened from the home screen: no step, no button', F.standalone && flow() === 'pop > doors > revealed' && !stepEl() && !shown(btn()),
    JSON.stringify({ flow: flow(), standalone: F.standalone, button: btn()?.hidden }));
  return;   // (the check script runs inside an async function)
}

await until(() => F.shown, 6000);
const el = stepEl();
check('fullscreen the step: after landscape, over the closed doors, before he pops in', F.shown && !!document.getElementById('loader') && !shell.log.includes('pop') && (stage.reducedMotion || cat.fx.scale === 0) &&
  flow() === 'fullscreen step' && document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('#fs-step') === el && getComputedStyle(el).zIndex === '40',
  JSON.stringify({ flow: flow(), z: el && getComputedStyle(el).zIndex }));

if (kase === 'noapi') {
  const buttons = [...el.querySelectorAll('button')];
  check('fullscreen no element full screen (iPhone Safari): the step says how, with one "ok", and there is no button', el.classList.contains('hint') && /tap share, then add to home screen/i.test(el.textContent) &&
    buttons.length === 1 && /^ok$/i.test(buttons[0].textContent.trim()) && document.activeElement?.closest('#fs-step') === el && !shown(btn()) && !F.supported,
    JSON.stringify({ text: el.querySelector('p')?.textContent, buttons: buttons.map((b) => b.textContent), button: btn()?.hidden }));
  await wsleep(400);
  await __shot('fullscreen-hint');
  const card = el.querySelector('.card-confirm').getBoundingClientRect();
  await __pointer([{ x: Math.max(8, card.left / 2), y: innerHeight / 2 }]);           // a click outside the card (e1112-41)
  await until(() => !F.shown, 3000);
  await until(() => shell.revealed, 8000);
  check('fullscreen a click outside closes the hint, the reveal goes on, still no button', !stepEl() && flow() === 'fullscreen step > fullscreen ok > pop > doors > revealed' && !shown(btn()) && !F.active, flow());
  return;   // (the check script runs inside an async function)
}

const go = el.querySelector('[data-fs="go"]'), later = el.querySelector('[data-fs="later"]');
check('fullscreen the step offers "full screen" (the card takes focus) and a quiet "not now"', /^full screen$/i.test(go?.textContent.trim()) && /^not now$/i.test(later?.textContent.trim()) && document.activeElement?.classList.contains('fs-card') &&
  getComputedStyle(later).borderStyle !== 'solid' && go.getBoundingClientRect().height >= 44 && later.getBoundingClientRect().height >= 44, JSON.stringify({ go: go?.textContent, later: later?.textContent }));

if (kase === 'later') {
  const anims = () => document.getAnimations().filter((a) => a.effect?.target === el || a.effect?.target?.closest?.('#fs-step')).length;
  check('fullscreen reduced motion: the step comes without a fade', stage.reducedMotion && anims() === 0, `animations ${anims()}`);
  await __key('Escape');
  check('fullscreen Escape is "not now": gone at once (reduced motion), not full screen', !F.shown && !stepEl() && !F.active && sessionStorage.getItem('sigilcat.fullscreen.asked') === 'later', flow());
  await until(() => shell.revealed, 8000);
  await F.step();
  check('fullscreen the reveal goes on, and the step is not asked again this visit', flow() === 'fullscreen step > fullscreen later > revealed' && !F.shown && !stepEl(), flow());
  check('fullscreen the button is there for later, showing "full screen"', shown(btn()) && btn().getAttribute('aria-pressed') === 'false' && btn().getAttribute('aria-label') === 'full screen', btn()?.outerHTML.slice(0, 160));
  return;   // (the check script runs inside an async function)
}

// ---- api: choosing it ----
await wsleep(400);
await __shot('fullscreen-step');
passes = 0;
await tap(go);
await until(() => F.active && F.log.includes('in'), 3000);   // (the element is set a moment before fullscreenchange)
check('fullscreen "full screen" goes full screen inside the tap', document.fullscreenElement === document.documentElement && sessionStorage.getItem('sigilcat.fullscreen.asked') === 'chosen' && document.body.classList.contains('fullscreen'),
  JSON.stringify({ el: document.fullscreenElement?.tagName, log: F.log }));
await until(() => shell.revealed, 8000); await wsleep(500);
check('fullscreen then he pops in and the doors part, on a room laid out again for the full screen', flow() === 'fullscreen step > fullscreen chosen > pop > doors > revealed' && !stepEl() && passes >= 1 && laidOut(),
  JSON.stringify({ flow: flow(), passes, stage: [stage.width, stage.height], window: [innerWidth, innerHeight] }));

// ---- the button ----
const b = btn();
const r = rect(b), hit = (x, y) => document.elementFromPoint(x, y)?.closest('#fs-toggle') === b, c = centre(b);
const others = ['.top .tl', '#name', '#tally', '#footer .sound', '#footer .fr', '#marks', '#say', '#hint'].map((s) => [s, document.querySelector(s)]).filter(([, e]) => e && e.getBoundingClientRect().width);
const clash = others.filter(([, e]) => { const o = e.getBoundingClientRect(); return !(o.right <= r.x - 4 || o.left >= r.x + r.w + 4 || o.bottom <= r.y - 4 || o.top >= r.y + r.h + 4); }).map(([s]) => s);
check('fullscreen the button: shown, "leave full screen" while in, a 44 px target, clear of the other chrome', shown(b) && b.getAttribute('aria-pressed') === 'true' && b.getAttribute('aria-label') === 'leave full screen' &&
  hit(c.x - 21, c.y) && hit(c.x + 21, c.y) && hit(c.x, c.y + 21) && hit(c.x, Math.max(1, c.y - 21)) && !clash.length && r.y + r.h < stage.insets.top + 8,
  JSON.stringify({ rect: r, clash, top: stage.insets.top }));
await wsleep(300);
await __shot('fullscreen-button');
passes = 0;
await tap(b);
await until(() => !F.active, 3000); await wsleep(300);
check('fullscreen the button leaves full screen, the room laid out again', !document.fullscreenElement && b.getAttribute('aria-pressed') === 'false' && b.getAttribute('aria-label') === 'full screen' && passes >= 1 && laidOut() && !document.body.classList.contains('fullscreen'),
  JSON.stringify({ passes, stage: [stage.width, stage.height], window: [innerWidth, innerHeight] }));
passes = 0;
await tap(b);
await until(() => F.active, 3000); await wsleep(300);
check('fullscreen and enters it again', document.fullscreenElement === document.documentElement && b.getAttribute('aria-pressed') === 'true' && passes >= 1 && laidOut(), JSON.stringify({ passes }));
// the system back gesture leaves full screen without the button: the button follows it
await document.exitFullscreen();
await until(() => !F.active, 3000); await wsleep(300);
check('fullscreen a system exit (back gesture) shows on the button', !document.fullscreenElement && b.getAttribute('aria-pressed') === 'false' && b.getAttribute('aria-label') === 'full screen' && laidOut(), b.getAttribute('aria-label'));
