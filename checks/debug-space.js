// debug-space.js (music lane, 2026-11-15; e1115-14: "the debug screen should be toggleable with space bar on desktop").
// The debug screen = the #debug readout and the button bar (src/main.js). Real key presses (the browser's keyboard).
//   #debug, desktop: Space hides and shows both; it no longer taps the cat (Enter still does); a focused debug button is
//     not pressed by it; nothing while typing in a field, while a pop-up / mode that uses Space is up (the books, flappy),
//     or while the page is locked.
//   #debug, phone: nothing changes (Space taps the cat as before, the screen stays).
//   no #debug (desktop): nothing changes (Space taps the cat).
const debug = location.hash.includes('debug') || new URLSearchParams(location.search).has('debug');
const pre = document.getElementById('debug'), bar = () => document.querySelector('body > .controls');
const shown = () => !!pre && !pre.hidden && getComputedStyle(pre).display !== 'none' && !!bar() && getComputedStyle(bar()).display !== 'none';
cat.auto = false;
await until(() => !input.locked && stage.warmLeft === 0, 20000);
// the books and flappy freeze the page's timers (lib's sleep): wait on the wall clock here
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const wuntil = async (f, ms = 8000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(30); } return false; };
const press = async (key) => { await __key(key); await wsleep(150); };
const focusCanvas = () => canvas.focus({ preventScroll: true });

if (debug && !MOBILE) {
  await until(() => [...bar().querySelectorAll('button')].some((b) => b.textContent === 'auto'), 15000);
  check('debug space: the debug screen starts shown', shown() && pre.textContent.length > 0);
  focusCanvas(); const n0 = ui.count;
  await press('Space');
  check('debug space: Space hides the readout and the button bar, and does not tap the cat', !shown() && pre.hidden && getComputedStyle(bar()).display === 'none' && ui.count === n0, `bonks ${n0} -> ${ui.count}`);
  await sleep(300); await __shot('debug-space-hidden');
  const text = pre.textContent; await sleep(300);
  check('debug space: the hidden readout is not rewritten every frame', pre.textContent === text);
  await press('Space');
  check('debug space: Space shows them again', shown() && site.debugScreen.toggles === 2);
  await sleep(300); await __shot('debug-space-shown');
  focusCanvas(); await press('Enter');
  check('debug space: Enter still taps the cat', ui.count === n0 + 1, `bonks ${ui.count}`);
  // a focused debug button: Space toggles, the button is not pressed
  const auto = [...bar().querySelectorAll('button')].find((b) => b.textContent === 'auto'), a0 = cat.auto;
  auto.focus(); await press('Space');
  check('debug space: on a focused debug button Space toggles and does not press it', !shown() && cat.auto === a0, `auto ${a0} -> ${cat.auto}`);
  await press('Space'); check('debug space: and back', shown());
  // typing in a field
  const field = document.createElement('input'); field.type = 'text'; field.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:99';
  document.body.append(field); field.focus(); await press('Space');
  check('debug space: typing in a field types a space, no toggle', shown() && field.value === ' ', JSON.stringify(field.value));
  field.remove();
  // a pop-up up (the grimoire: aria-modal)
  site.books.open('grimoire');
  const modal = await wuntil(() => !!document.querySelector('[aria-modal="true"]'), 5000);
  await press('Space');
  check('debug space: not while a pop-up is up (the grimoire)', modal && shown(), modal ? '' : 'no pop-up opened');
  await __key('Escape'); await wuntil(() => !document.querySelector('[aria-modal="true"]'), 5000); await wsleep(300);
  // flappy (its Space flaps)
  const kf = site.debugScreen.toggles;
  await E.bird.replay(); await wuntil(() => !!document.querySelector('#bird-screen'), 8000); await wsleep(300);
  await press('Space');
  check('debug space: not in flappy (Space flaps there)', shown() && site.debugScreen.toggles === kf, `toggles ${kf} -> ${site.debugScreen.toggles}`);
  E.bird.screen?.close(false); await wuntil(() => !document.querySelector('#bird-screen'), 8000); await wsleep(300);
  // a locked page (a scene)
  input.lock('check', true); focusCanvas(); await press('Space'); input.lock('check', false);
  check('debug space: not while the page is locked', shown());
  // held down: one toggle, not a flicker
  focusCanvas(); const k0 = site.debugScreen.toggles;
  const down = (repeat) => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', repeat, bubbles: true }));
  down(false); down(true); down(true); await sleep(100);
  check('debug space: a held key toggles once', site.debugScreen.toggles === k0 + 1);
  down(false); await sleep(100);
  check('debug space: and leaves it shown at the end', shown());
} else {
  // a phone with #debug, or no #debug at all: Space on the canvas taps the cat, as before
  await sleep(500);
  const before = shown(); focusCanvas(); const n0 = ui.count;
  await press('Space');
  check(`debug space: ${debug ? 'phone with #debug' : 'without #debug'}: Space taps the cat, nothing toggles`, ui.count === n0 + 1 && shown() === before && !site.debugScreen?.toggles,
    `bonks ${n0} -> ${ui.count}; screen ${before} -> ${shown()}`);
}
