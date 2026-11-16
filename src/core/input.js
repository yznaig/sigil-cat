// Who gets each press. The canvas covers the page (touch-action: none, the page never scrolls) and every press is
// routed once, at pointerdown, to the first taker in priority order:
//   90  keepsakes lying in front of him        60  his whiskers (the harp)       50  the cat (spin, tap, stroke)
//   40  keepsakes behind him                   10  the empty air (sigil strokes)
// A taker is a function (e) => handler | null; the handler gets { move(e), end(e) } for that press only.
// Grace for fingers (grab lane, 2026-11-13; Aaron: "mobile users should get a little bit more grace with grabbing
// items"): a touch or pen press that nothing takes exactly, and that would become a sigil stroke, is offered to the
// nearest item within GRACE.px on screen before the air gets it (see grace() below). A mouse press is never moved.
// Hover moves (no press) go to input.hover handlers, and input.cursor askers pick the pointer's shape.
// input.lock(reason, on): the galaxy takes the player's hands away; every press, click and key is swallowed
// (Esc is passed to input.onEscape, a press to input.onLockedPress: the galaxy's hold ends on a click). Keyboard: the canvas takes focus; arrows turn him, Enter or Space taps him.
// px: how far (CSS px) a finger's press may land outside an item and still take it. A fingertip's contact is ~8-10 mm
// across (~30-40 CSS px) and the point the browser reports wanders ~2-3 mm (8-12 px) from where the player aimed, with
// the edge hidden under the finger. 16 px covers that error with margin and makes the smallest items (the egg, the
// top: ~30-38 px across on an 844x390 phone) ~60-70 px targets, past the 44-48 px of the platform touch guidelines;
// more starts eating sigil strokes begun beside things and blurs which of two neighbours (cards on the board) is meant.
// In CSS px, so the same physical reach at any device pixel ratio; the finger is the same size on any screen.
// step: the spacing of the probe points on each ring (searched nearest ring first, only on pointerdown).
export const GRACE = { px: 16, step: 4 };
// A press that gets grace: touch or pen; a press of unknown kind on a coarse-pointer screen. Never a mouse.
export const graceFor = (e) => e.pointerType === 'touch' || e.pointerType === 'pen' || (!e.pointerType && matchMedia('(pointer: coarse)').matches);
// The probe points, nearest first: rings GRACE.step apart, a point every ~GRACE.step px round each ring.
const RINGS = [];
for (let r = GRACE.step; r <= GRACE.px; r += GRACE.step) {
  const n = Math.max(8, Math.round(2 * Math.PI * r / GRACE.step));
  for (let i = 0; i < n; i++) RINGS.push([r * Math.cos(i / n * 2 * Math.PI), r * Math.sin(i / n * 2 * Math.PI)]);
}
// The same event, read as though it happened (dx, dy) away: the item keeps the grip it was given, under the finger
// at the same offset, so it does not jump on the first move and a tap's position is the item's.
const shifted = (ev, dx, dy) => new Proxy(ev, { get: (t, k) => k === 'clientX' ? t.clientX + dx : k === 'clientY' ? t.clientY + dy : typeof t[k] === 'function' ? t[k].bind(t) : t[k] });
export function createInput(site) {
  const { stage, cat } = site, canvas = stage.canvas, R = cat.config.rotate;
  const AIR = 10;                                                   // the air's taker (sigil strokes) and below get no grace
  const takers = [], hover = [], cursors = [], onEscape = [], onLock = [], onLockedPress = [];
  let active = null, pointerId = null, last = { x: -1e4, y: -1e4, inside: false };
  const locks = new Set();

  // opts (grace, see GRACE): near(x, y, r) marks a taker of items that a finger may miss by up to r px (true when one
  // of its items is within r of the point, cheaply); covers(x, y) marks a taker whose ground is never given away (the
  // cat, his whiskers, the bird): a probe point there belongs to it, so items behind it get no grace through it.
  const claim = (priority, fn, opts = {}) => { takers.push({ priority, fn, near: opts.near, covers: opts.covers }); takers.sort((a, b) => b.priority - a.priority); };
  claim(50, (e) => {
    if (!cat.hitTest(e.clientX, e.clientY)) return null;
    cat.dragStart(e);
    return { move: (ev) => cat.dragMove(ev), end: (ev) => cat.dragEnd(ev) };
  }, { covers: (x, y) => cat.hitTest(x, y) });
  // Grace: only for a press that missed every taker above the air. Takers with near() that say an item is within reach
  // are asked again at probe points round the press, nearest ring first; at each point the takers are walked in their
  // usual order (what is in front still wins), and a covered point ends that point's walk. The first taker that takes a
  // probe point gets the press, its events moved by the same offset. Nothing near: no probes at all (open air pays one
  // near() per item taker).
  let graced = 0, lastGrace = null;
  function grace(e) {
    const x = e.clientX, y = e.clientY;
    if (!takers.some((t) => t.near?.(x, y, GRACE.px))) return null;
    for (const [dx, dy] of RINGS) {
      const px = x + dx, py = y + dy;
      for (const t of takers) {
        if (t.priority <= AIR) break;
        if (t.covers?.(px, py)) break;
        if (!t.near) continue;
        const h = t.fn(shifted(e, dx, dy));
        if (h) { graced++; lastGrace = { dx, dy, x, y }; return { move: h.move && ((ev) => h.move(shifted(ev, dx, dy))), end: h.end && ((ev) => h.end(shifted(ev, dx, dy))), graced: { dx, dy } }; }
      }
    }
    return null;
  }

  function pickCursor(e) {
    for (const f of cursors) { const c = f(e); if (c) { canvas.style.cursor = c; return; } }
    canvas.style.cursor = cat.hitTest(e.clientX, e.clientY) ? (active ? 'grabbing' : 'grab') : 'crosshair';
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (active || locks.size || (e.pointerType === 'mouse' && e.button !== 0)) return;
    last = { x: e.clientX, y: e.clientY, inside: true };
    for (const h of hover) h(e, true, false);
    let tried = !graceFor(e);
    for (const t of takers) {
      if (!tried && t.priority <= AIR) { tried = true; const g = grace(e); if (g) { active = g; pointerId = e.pointerId; break; } }
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
    get graced() { return graced; }, get lastGrace() { return lastGrace; },
    get pointer() { return last; },
  };
}
