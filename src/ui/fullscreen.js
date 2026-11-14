// Full screen on a phone (fullscreen lane, playtest-3). Aaron: "Mobile, along with its 'flip screen' step, I think
// needs a full screen step + button people can full screen and un-fullscreen the page, the top bar takes up way too
// much space otherwise".
//
// The step: on a phone (the shell's rule: a coarse pointer, a short side of at most 600 px), once it is on its side,
// a small card over the closed loading doors, before he pops in: "full screen" or "not now". Shown once per visit
// (sessionStorage): either answer, Escape or a click outside ends it for the visit; a reload keeps the answer.
// Choosing it goes full screen inside that tap (the browser needs the gesture), then the doors open on the bigger room.
// The button: a small felt patch beside "Sigil Cat" at the top left, on any touch screen where the browser can do it;
// it enters and leaves full screen and always shows the real state (fullscreenchange: the system back gesture too).
// No element full screen (iPhone Safari): the step says how to get it instead (Share, then Add to Home Screen) with an
// "ok", and there is no button. Opened from the home screen (the manifest asks for fullscreen; apple-mobile-web-app-
// capable on iOS): no step and no button, the page already has the whole screen.
// No sound (e1112-40); reduced motion: no fades. ?fs=0 turns it all off; under automation the step is off unless ?fs=1
// (as ?doors=1 plays the doors), the button stays.
//   site.fullscreen.step()      resolves once the step is answered (or at once when it is not wanted)
//   site.fullscreen.toggle()    from a tap: in or out        site.fullscreen.active / .supported / .standalone / .log
const ASKED = 'sigilcat.fullscreen.asked';
const ENTER = '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>';
const EXIT = '<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>';

export function createFullscreen(site) {
  const { stage, shell } = site;
  const calm = () => stage.reducedMotion;
  const off = stage.opt('fs') === '0', forced = stage.opt('fs') === '1';
  const log = [];
  const root = document.documentElement;
  const element = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  // feature-detected each time (a check can take the API away before the step)
  const supported = () => !!(root.requestFullscreen || root.webkitRequestFullscreen) && (document.fullscreenEnabled ?? document.webkitFullscreenEnabled ?? true) !== false;
  const touch = () => matchMedia('(pointer: coarse)').matches;
  const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // opened from the home screen (display-mode fullscreen also matches inside element full screen: asked only while out of it)
  let homeScreen = null;
  const standalone = () => {
    if (homeScreen === null || !element()) homeScreen = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || (!element() && matchMedia('(display-mode: fullscreen)').matches);
    return homeScreen;
  };
  const asked = () => { try { return !!sessionStorage.getItem(ASKED); } catch { return false; } };
  const remember = (how) => { try { sessionStorage.setItem(ASKED, how); } catch { /* private mode: asked again next load */ } };

  // ---- in and out ----
  function enter() {
    const req = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen?.();
    log.push('enter');
    // held on its side while in full screen where the browser allows it (it is fine when it does not)
    const lock = () => { try { screen.orientation?.lock?.('landscape')?.catch?.(() => {}); } catch { /* no lock */ } };
    if (req?.then) return req.then(lock, (e) => { log.push('refused ' + e?.name); });
    lock(); return Promise.resolve();
  }
  function exit() {
    log.push('exit');
    const r = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen?.();
    return r?.catch ? r.catch(() => {}) : Promise.resolve();
  }
  const toggle = () => (element() ? exit() : enter());

  // ---- the button ----
  let btn = null;
  function button() {
    if (btn) return btn;
    const tl = document.querySelector('.top .tl');
    if (!tl) return null;
    btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'fs-toggle'; btn.className = 'fs-toggle felt'; btn.hidden = true;
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ENTER}</svg>`;
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    tl.append(btn);
    return btn;
  }
  function sync() {
    const b = button(), on = !!element();
    if (b) {
      b.hidden = off || !touch() || !supported() || standalone();
      b.setAttribute('aria-label', on ? 'leave full screen' : 'full screen');
      b.setAttribute('aria-pressed', String(on));
      b.title = on ? 'leave full screen' : 'full screen';
      b.querySelector('svg').innerHTML = on ? EXIT : ENTER;
    }
    document.body.classList.toggle('fullscreen', on);
  }
  // The stage lays itself out again once the browser has settled the new size (most browsers send a resize as they
  // go in or out; some send it before the size changes, some not at all): one more pass, a frame later. A frozen page
  // (a book open) keeps it for its release, like any resize.
  let settle = 0;
  function changed() {
    log.push(element() ? 'in' : 'out');
    sync();
    cancelAnimationFrame(settle);
    settle = requestAnimationFrame(() => { settle = requestAnimationFrame(() => dispatchEvent(new Event('resize'))); });
  }
  document.addEventListener('fullscreenchange', changed);
  document.addEventListener('webkitfullscreenchange', changed);
  sync();

  // ---- the step ----
  let stepEl = null;
  const wanted = () => !off && (forced || !navigator.webdriver) && !!shell?.phone && !standalone() && !asked() && !element();
  function step() {
    sync();
    if (stepEl) return stepEl.done;
    if (!wanted()) return Promise.resolve();
    const can = supported();
    const el = stepEl = document.createElement('div');
    el.id = 'fs-step'; el.className = 'fs-step' + (can ? '' : ' hint');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'fs-title');
    const how = ios() ? 'tap <b>Share</b>, then <b>Add to Home Screen</b>' : 'add it to your home screen from the browser’s menu';
    el.innerHTML = `<div class="card-confirm fs-card" tabindex="-1">
      <h2 id="fs-title">full screen</h2>
      ${can
        ? `<p>He gets the whole screen, without the browser’s bar on top. The corners button at the top left switches it back any time.</p>
      <div class="row"><button type="button" class="pill felt primary" data-fs="go">full screen</button><button type="button" class="fs-later" data-fs="later">not now</button></div>`
        : `<p>This browser can’t hide its bars for a page. To play with the whole screen, ${how}, and open Sigil Cat from there.</p>
      <div class="row"><button type="button" class="pill felt primary" data-fs="ok">ok</button></div>`}
    </div>`;
    let resolve;
    el.done = new Promise((r) => { resolve = r; });
    const close = (how) => {
      if (stepEl !== el) return;
      stepEl = null; remember(how); log.push('step ' + how); shell?.log?.push('fullscreen ' + how);
      removeEventListener('keydown', onKey, true);
      el.style.pointerEvents = 'none';
      const gone = () => { el.remove(); resolve(how); };
      if (calm()) gone(); else el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }).finished.then(gone, gone);
    };
    el.addEventListener('pointerdown', (e) => { el.downOutside = e.target === el; });
    el.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-fs]');
      if (b?.dataset.fs === 'go') { enter(); close('chosen'); return; }      // inside the tap: the gesture counts
      if (b) { close(b.dataset.fs); return; }
      if (e.target === el && el.downOutside) close(can ? 'later' : 'ok');   // a click outside (e1112-41)
    });
    // Escape closes it like the other pop-ups (e1112-41); Tab stays inside the card
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(can ? 'later' : 'ok'); return; }
      if (e.key === 'Tab') {
        const f = [...el.querySelectorAll('button')], i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
      }
    };
    addEventListener('keydown', onKey, true);
    document.body.append(el);
    // focus on the card, not its first button: no focus ring drawn round "full screen" on a phone nobody has typed on
    el.querySelector('.fs-card').focus({ preventScroll: true });
    if (!calm()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    log.push('step ' + (can ? 'shown' : 'hint')); shell?.log?.push('fullscreen step');
    return el.done;
  }

  return {
    step, toggle, enter, exit, sync, log,
    get active() { return !!element(); }, get supported() { return supported(); }, get standalone() { return standalone(); },
    get shown() { return !!stepEl; }, get button() { return btn; },
  };
}
