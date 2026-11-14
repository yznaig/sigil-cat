// The way in, and the phone held the right way (playtest-2, shell lane).
//
// Loading: index.html paints the loading screen before any script runs: two paper doors meeting in the middle, a ring
// of his runes on the seam where he will appear, and a progress line that is drawn as things really arrive (the inline
// script there counts the files on the way to his first frame and the bytes of his first pose; main.js reports the
// eggs and his first pose being built). Once he is ready the cat pops into the middle of the ring, on top of the
// doors, and the doors slide apart, showing the room, the chrome and everything the player has. Reduced motion: no
// pop and no slide, the whole loading screen fades. No sound (e1112-40). Under automation the doors open at once
// (?doors=1 plays them, ?doors=0 skips them anywhere, ?doors=hold waits for shell.go()), as the furniture arrivals do.
//   How the cat is above the doors and the room is not: during the sequence the canvas sits above the loading screen
//   and each frame is drawn in two passes, the whole room only inside the gap between the doors (a scissor), then the
//   cat alone over everything. Two passes for a second or two; nothing is left behind once the doors are gone.
//
// Phone: landscape only ("mobile users have to flip their screen sideways to play the game"). A phone held upright
// gets a translucent grey "flip sideways" overlay with a turning phone; the page is frozen under it (src/core/
// freeze.js: drawing, physics, timers and sound all stop) and picks up exactly where it was when the phone turns.
// At boot the overlay comes after loading and before the cat pops in. "A phone" = a coarse pointer and a short side
// of at most 600 px (tablets and desktop windows of any shape play as they are). ?turn=0 turns the rule off.
const DOORS = { pop: 0.55, beat: 0.22, open: 0.95, fade: 0.6 };

export function createShell(site) {
  const { stage, cat, freeze } = site;
  const boot = window.__boot, loader = document.getElementById('loader');
  const doorEls = loader ? [...loader.querySelectorAll('.door')] : [];
  const calm = () => stage.reducedMotion;
  const want = stage.opt('doors');
  const instant = !loader || want === '0' || (want !== '1' && want !== 'hold' && !!navigator.webdriver);
  let go = null;                                 // ?doors=hold: the checks start the reveal themselves (shell.go())
  let sequence = null, started = false, revealed = false, gap = 0, masking = false, turned = null;
  const log = [];

  // ---- the ring sits where he will be ----
  function placeRing() {
    if (!loader || revealed) return;
    // his middle where he floats (from the scene, not his drawn picture: that is not laid out before his first frame)
    const mid = stage.toScreen(new site.THREE.Vector3(0, cat.config.float.lift + cat.height * 0.45, 0)), ppu = stage.pxPerUnit();
    const ring = Math.max(150, Math.min(stage.height * 0.74, cat.height * ppu * 1.32, stage.width * 0.8));
    loader.style.setProperty('--cy', Math.round(mid.y) + 'px');
    loader.style.setProperty('--ring', Math.round(ring) + 'px');
    loader.style.setProperty('--words', Math.round(Math.min(mid.y + ring / 2 + 16, stage.height - 64)) + 'px');
  }
  placeRing();
  stage.onResize.push(placeRing);

  // ---- the two-pass frame while the doors are closed or opening ----
  const keep = new Set([cat.card, cat.shadow]);
  function beforePresent() {
    if (!masking) return;
    const r = stage.renderer, W = stage.width, H = stage.height, w = Math.round(W * gap), x = Math.round((W - w) / 2);
    r.setScissorTest(false); r.clear();
    r.setScissor(x, 0, w, H); r.setScissorTest(true);
  }
  function afterPresent() {
    if (!masking) return;
    const r = stage.renderer, hidden = [], auto = r.autoClear;
    r.setScissorTest(false);
    for (const o of stage.scene.children) if (o.visible && !o.isLight && !keep.has(o)) { o.visible = false; hidden.push(o); }
    r.autoClear = false;
    try { r.render(stage.scene, stage.camera); } finally { r.autoClear = auto; for (const o of hidden) o.visible = true; }
  }
  stage.onPresent.push(beforePresent);
  stage.onPresented.push(afterPresent);

  // Before he is first drawn: he waits at nothing, and only he is drawn (until the doors part).
  if (!instant && !calm()) { cat.fx.scale = 0; cat.fx.opacity = 0; masking = true; document.body.classList.add('shell-boot'); }

  // ---- the phone held upright ----
  let turnEl = null, releaseTurn = null;
  const phoneish = () => matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) <= 600;
  const upright = () => stage.opt('turn') !== '0' && phoneish() && innerHeight > innerWidth;
  function showTurn() {
    if (turnEl) return;
    releaseTurn = freeze.hold('turn');
    turnEl = document.createElement('div'); turnEl.id = 'turn'; turnEl.className = 'turn' + (calm() ? ' calm' : '');
    turnEl.setAttribute('role', 'alertdialog'); turnEl.setAttribute('aria-modal', 'true'); turnEl.setAttribute('aria-labelledby', 'turn-words');
    turnEl.innerHTML = `<div class="turn-card"><svg class="turn-phone" viewBox="-40 -40 80 80" aria-hidden="true"><g class="ph"><rect x="-13" y="-22" width="26" height="44" rx="5"/><path d="M-4 -17.5h8"/><circle cx="0" cy="17" r="1.6"/></g><path class="arc" d="M-25 -21a32 32 0 0 1 21 -10"/><path class="arc" d="M-8.5 -35.5l4.5 4.5l-5 4"/></svg>
      <p id="turn-words">flip sideways</p><small>he plays in landscape</small></div>`;
    document.body.append(turnEl);
    turnEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    log.push('turn shown');
  }
  function hideTurn() {
    if (!turnEl) return;
    const el = turnEl, r = releaseTurn; turnEl = null; releaseTurn = null;
    // "the overlay quickly fades": the page runs again under it as it goes
    el.style.pointerEvents = 'none';
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove());
    r?.();
    log.push('turn hidden');
    if (turned) { const t = turned; turned = null; t(); }
  }
  function checkTurn() {
    if (!started) return;                      // while loading, the loading screen is all there is; asked after it
    if (upright()) showTurn(); else hideTurn();
  }
  freeze.onViewport(checkTurn);
  // The stage's own resize handler may run before the freeze hears of the turn: an upright phone never lays the room
  // out for itself (it is frozen under the overlay a moment later, and turned back it is the same size again).
  stage.setLayoutGate(() => started && upright());
  matchMedia('(orientation: portrait)').addEventListener?.('change', checkTurn);
  const landscape = () => upright() ? new Promise((r) => { turned = r; showTurn(); }) : Promise.resolve();

  // ---- the reveal ----
  function finish() {
    masking = false; gap = 1;
    cat.fx.scale = 1; cat.fx.opacity = 1;
    document.body.classList.remove('shell-boot', 'shell-opening');
    loader?.remove();
    revealed = true; boot?.done?.();
    log.push('revealed');
  }
  async function reveal() {
    if (sequence) return sequence;
    started = true;
    return (sequence = (async () => {
      boot?.set?.('ready', 1);
      loader?.classList.add('loaded');
      // the full-screen step (fullscreen lane, playtest-3, src/ui/fullscreen.js) comes once the phone is on its side
      if (instant) { finish(); checkTurn(); landscape().then(() => site.fullscreen?.step()); return; }
      if (want === 'hold') await new Promise((r) => { go = r; });
      await landscape();
      await site.fullscreen?.step();
      placeRing();
      if (calm()) {
        // one fade, the whole loading screen at once
        loader.style.pointerEvents = 'none';
        await loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DOORS.fade * 1000, easing: 'ease-in-out', fill: 'forwards' }).finished.catch(() => {});
        finish(); return;
      }
      log.push('pop');
      await pop();
      log.push('doors');
      document.body.classList.add('shell-opening');
      await openDoors((e) => {
        if (doorEls[0]) doorEls[0].style.transform = `translate3d(${(-e * 100).toFixed(3)}%,0,0)`;
        if (doorEls[1]) doorEls[1].style.transform = `translate3d(${(e * 100).toFixed(3)}%,0,0)`;
      });
      finish();
    })());
  }
  // He pops in where he floats (from nothing, over whatever covers the room), then a beat.
  async function pop() {
    await stage.tween(DOORS.pop, (u) => { cat.fx.scale = backOut(u); cat.fx.opacity = Math.min(1, u * 5); });
    cat.fx.scale = 1; cat.fx.opacity = 1;
    await stage.after(DOORS.beat);
  }
  // The room shows through a gap that opens from the middle; move(e) slides the two halves (e: 0 shut .. 1 open).
  async function openDoors(move) {
    await stage.tween(DOORS.open, (u) => { const e = inOut(u); gap = e; move(e); });
  }
  // The same pop and doors over another page (gags lane, playtest 3: the cake's error page, "the cat should pop up
  // overtop like how it does on the loading screen"): only he is drawn while that page covers the room (the canvas is
  // lifted over it by its owner's CSS), he pops in, then the room shows through the gap as move(e) slides the page's
  // halves apart. beforeDoors() runs between the pop and the doors. Reduced motion: no pop, no slide; fade(): the
  // owner fades its page out. Resolves once the room is back.
  async function popOver({ move, beforeDoors, fade }) {
    if (masking || !revealed) { beforeDoors?.(); await fade?.(); return; }       // (the loading screen's own run)
    if (calm()) { beforeDoors?.(); await fade?.(); return; }
    masking = true; gap = 0; cat.fx.scale = 0; cat.fx.opacity = 0;
    try {
      log.push('pop over');
      await pop();
      beforeDoors?.();
      await openDoors(move);
    } finally { masking = false; gap = 1; cat.fx.scale = 1; cat.fx.opacity = 1; }
  }
  const backOut = (u) => { const s = 2.2; u -= 1; return 1 + u * u * ((s + 1) * u + s); };
  const inOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  return {
    reveal, checkTurn, popOver, go() { go?.(); }, doors: DOORS,
    get revealed() { return revealed; }, get masking() { return masking; }, get gap() { return gap; },
    get instant() { return instant; }, get upright() { return upright(); }, get phone() { return phoneish(); }, get turnShown() { return !!turnEl; }, log,
  };
}
