// silence.js (music lane, 2026-11-15; e1115-14: "upon opening the game for the first time on mobile, it should flash
// 'turn silence off for sound' for like 2 seconds, similar to the 'flip screen' screen"). src/ui/silence.js.
// Run with ?doors=hold&silence=1 (under automation it is off unless silence=1) and ?case=:
//   phone    (phone)            after the full-screen step (fs=1 too), over the closed doors, before he pops in: the flip
//                               card's look, the words, about 2 s, then the doors; told once (--then silence-reload.js).
//   calm     (phone, --reduced) the same, no fades, the bell drawn still.
//   desktop  (desktop)          never.
// No --lib: the doors are held, so this keeps to the wall clock.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(15); } return false; };
const check = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
const kase = new URLSearchParams(location.search).get('case') || (MOBILE ? 'phone' : 'desktop');
await until(() => window.site?.stage?.loaded, 60000);
const S = window.site, { shell, store } = S;
const card = () => document.getElementById('silence');
await until(() => S.silence && S.fullscreen, 5000);
shell.go();

if (kase === 'desktop') {
  await until(() => shell.revealed, 20000);
  check('silence desktop: no card, nothing remembered', !card() && !S.silence.log.length && !store.get('shell.silenceTold') && !shell.log.includes('silence shown'), shell.log.join(' > '));
} else {
  // the full-screen step first (fs=1), answered "not now"
  if (await until(() => !!document.getElementById('fs-step'), 8000)) { await wsleep(300); document.querySelector('[data-fs="later"]')?.click(); }
  const seen = await until(() => !!card(), 10000);
  const t0 = performance.now();
  const el = card(), words = el?.querySelector('p')?.textContent, css = el && getComputedStyle(el);
  check('silence the card shows on a phone\'s first visit, after the full-screen step and before he pops in',
    seen && shell.log.indexOf('silence shown') > shell.log.findIndex((l) => l.startsWith('fullscreen')) && !shell.log.includes('pop') && !shell.revealed && !!document.getElementById('loader') && (kase === 'calm' || S.cat.fx.opacity === 0),
    shell.log.join(' > '));
  check('silence the words, the flip card\'s look (the same grey sheet over everything, a drawing above one line)', words === 'turn silence off for sound' && el.classList.contains('turn') &&
    css.position === 'fixed' && +css.zIndex >= 2000 && /rgba\(58, 54, 50/.test(css.backgroundColor) && !!el.querySelector('svg.silence-bell'), `"${words}" ${css?.backgroundColor}`);
  await wsleep(250); await __shot('silence-card');
  const anims = el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running');
  if (kase === 'calm') check('silence calm: nothing moves (no fade, the bell still)', anims.length === 0, `${anims.length} running`);
  else check('silence the bell rings and the slash lifts (CSS loop) under normal motion', anims.length >= 2, `${anims.length} running`);
  check('silence remembered on the device at once', store.get('shell.silenceTold') === true);
  await until(() => !card(), 6000);
  const shownFor = (performance.now() - t0) / 1000, logged = S.silence.log.find((l) => l.startsWith('timed'));
  check('silence stays about 2 s, then goes', !!logged && shownFor > 1.7 && shownFor < (kase === 'calm' ? 2.5 : 2.8), `${logged}; gone after ${shownFor.toFixed(2)} s`);
  const popped = await until(() => shell.log.includes('pop') || shell.revealed, 5000);
  await until(() => shell.revealed, 10000);
  check('silence then he pops in and the doors open', popped && shell.revealed && shell.log.indexOf('silence shown') < (shell.log.includes('pop') ? shell.log.indexOf('pop') : shell.log.indexOf('revealed')), shell.log.join(' > '));
}
