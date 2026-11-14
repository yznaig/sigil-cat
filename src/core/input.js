// Who gets each press. The canvas covers the page (touch-action: none, the page never scrolls) and every press is
// routed once, at pointerdown, to the first taker in priority order:
//   90  keepsakes lying in front of him        60  his whiskers (the harp)       50  the cat (spin, tap, stroke)
//   40  keepsakes behind him                   10  the empty air (sigil strokes)
// A taker is a function (e) => handler | null; the handler gets { move(e), end(e) } for that press only.
// Hover moves (no press) go to input.hover handlers, and input.cursor askers pick the pointer's shape.
// input.lock(reason, on): the galaxy takes the player's hands away; every press, click and key is swallowed
// (Esc is passed to input.onEscape, a press to input.onLockedPress: the galaxy's hold ends on a click). Keyboard: the canvas takes focus; arrows turn him, Enter or Space taps him.
export function createInput(site) {
  const { stage, cat } = site, canvas = stage.canvas, R = cat.config.rotate;
  const takers = [], hover = [], cursors = [], onEscape = [], onLock = [], onLockedPress = [];
  let active = null, pointerId = null, last = { x: -1e4, y: -1e4, inside: false };
  const locks = new Set();

  const claim = (priority, fn) => { takers.push({ priority, fn }); takers.sort((a, b) => b.priority - a.priority); };
  claim(50, (e) => {
    if (!cat.hitTest(e.clientX, e.clientY)) return null;
    cat.dragStart(e);
    return { move: (ev) => cat.dragMove(ev), end: (ev) => cat.dragEnd(ev) };
  });

  function pickCursor(e) {
    for (const f of cursors) { const c = f(e); if (c) { canvas.style.cursor = c; return; } }
    canvas.style.cursor = cat.hitTest(e.clientX, e.clientY) ? (active ? 'grabbing' : 'grab') : 'crosshair';
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (active || locks.size || (e.pointerType === 'mouse' && e.button !== 0)) return;
    last = { x: e.clientX, y: e.clientY, inside: true };
    for (const h of hover) h(e, true, false);
    for (const t of takers) {
      const h = t.fn(e);
      if (h) { active = h; pointerId = e.pointerId; break; }
    }
    if (active) { try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic events */ } }
    pickCursor(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (locks.size) return;
    last = { x: e.clientX, y: e.clientY, inside: true };
    for (const h of hover) h(e, !!active, false);
    if (active && e.pointerId === pointerId) active.move?.(e);
    if (e.pointerType === 'mouse') pickCursor(e);
  });
  const end = (e) => {
    if (!active || e.pointerId !== pointerId) return;
    const h = active;
    active = null; pointerId = null;
    h.end?.(e);
    if (e.pointerType !== 'mouse') { last.inside = false; for (const f of hover) f(e, false, true); }   // a lifted finger is gone
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', (e) => { if (active) end(new PointerEvent('pointercancel', {pointerId:e.pointerId})); });
  addEventListener('blur', () => { if (active) end(new PointerEvent('pointercancel', {pointerId})); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && active) end(new PointerEvent('pointercancel', {pointerId})); });
  canvas.addEventListener('pointerleave', (e) => { if (!active) { last.inside = false; for (const h of hover) h(e, false, true); } });

  // keyboard on the canvas
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', (e) => {
    if (locks.size) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { cat.fling((e.key === 'ArrowLeft' ? -1 : 1) * R.keyStep * R.damping); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { cat.tap(); e.preventDefault(); }
  });

  // the lock
  const EVENTS = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'dblclick', 'contextmenu', 'wheel', 'keydown', 'keyup'];
  let swallowed = 0;
  function swallow(e) {
    if (locks.size && e.type === 'keydown' && e.key === 'Escape') for (const f of onEscape) f();
    if (!locks.size || e.target?.closest?.('.controls, #footer .sound, #party-error, #bird-screen, .book-pop')) return;   // .book-pop: shell lane (src/ui/books.js)
    if (e.type === 'keydown' && e.key === 'Tab') return;          // focus can still move; nothing it lands on will act
    if (e.type === 'pointerdown' && (e.pointerType !== 'mouse' || e.button === 0)) for (const f of onLockedPress) f(e);   // sky lane, playtest 2
    e.stopImmediatePropagation();
    if (e.type === 'click' || e.type === 'pointerdown' || e.type === 'contextmenu' || e.type === 'keydown') e.preventDefault();
    swallowed++;
  }
  for (const t of EVENTS) addEventListener(t, swallow, { capture: true, passive: false });
  function lock(reason, on) {
    if(on)for(const f of onLock)f(reason);
    if (on && !locks.size && active) {                            // a press under way ends cleanly, not mid-air
      const h = active; active = null;
      h.end?.(new PointerEvent('pointercancel', { pointerId }));
      pointerId = null;
    }
    on ? locks.add(reason) : locks.delete(reason);
    document.body.classList.toggle('locked', locks.size > 0);
  }

  return {
    claim, hover, cursors, onEscape, onLock, onLockedPress, lock,
    get locked() { return locks.size > 0; }, get swallowed() { return swallowed; }, get pressing() { return !!active; },
    get pointer() { return last; },
  };
}
