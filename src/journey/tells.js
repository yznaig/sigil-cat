// Environmental tells (docs/journey/design.md §5.4): small things in the room that point at a secret without saying it.
// All cheap and event-driven: nothing here runs per frame at rest (the whisker hum reads one getter per frame, and only
// returns at once unless Butterman is on). Each tell draws into one fixed, click-through SVG layer (#tells-fx).
//   scrape          the first solid (flat) keepsake, shelf (board) not here yet: a far-off scrape, panned left (right).
//   butter-shimmer  butter on, whisper not found: a pointer passing near the butter makes it glint (at most every 20 s).
//   whisker-hum     harp not found: as the butter song reaches "what's the butter man", his whiskers glint once each in
//                   the tune's order (C C B C D C), with the harp's own gold ring (src/gags/harp.js glint).
//   shelf-gaps      an empty shelf bay or hook shows a dust outline of the thing that goes there, only for things never
//                   owned (no help placing what you already have).
//   board-pins      a flat keepsake picked up: the board's empty pin heads glint once.
//   empty-peg       three hats, no party hat: when he is turned to face the rack, its empty peg wobbles.
//   seal-head       nothing to build (his head mark is already on every seal).
// Also here (§5.6): journey.visibleCombos(), the combo finds whose riddle the grimoire shows before they are found
// (their graph needs are done); src/ui/books.js reads it.
// (The ghost doodle, an invisible pen drawing the circle in the air, was here; removed after a playtest: it came
// too soon and too often, and it handed out the first sign. A player finds the circle by drawing.)
// Events: journey.emit('tell', { id, phase: 'start' }) on every tell shown.
// Reduced motion: the glints show still (a fade at most) and nothing wobbles.
// api (journey.tells): config, stats, shimmer(), hum(), gaps(), pins(heldId), peg({force}), layer
import { css } from '../core/util.js';
import { FINDS } from '../finds.js';
import { done } from './progress.js';

export const TELLS = {
  scrape: { file: 'assets/audio/arrivals/concrete-scrape-loop.wav', gain: 0.16, pan: 0.85, offset: 2, seconds: 2.6, fade: 0.7, wait: 1.2 },
  shimmer: { near: 120, every: 20 },
  // beats into the butter scene (src/eggs/butterman-config.js captions: "what's the butter man..." starts at 10.5)
  hum: { start: 10.5, step: 0.5, tune: [1, 1, 0, 1, 2, 1] },
  gaps: { every: 1.5 },
  pins: { every: 4 },
  peg: { every: 30, settle: 1.2, facing: 6 },
};
const SOLID = ['rifle', 'top', 'pat', 'tin', 'box', 'rack', 'controller'], FLAT = ['paper', 'postcard', 'ticket', 'recipe'];
const BAYS = ['rifle', 'top', 'pat', 'tin'], HOOK_ITEMS = ['bucket', 'flour'];
const NS = 'http://www.w3.org/2000/svg';

css('journey-tells', `
#tells-fx { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 3; pointer-events: none; overflow: visible; }
#tells-fx .gap path { fill: rgba(141, 131, 120, .07); stroke: rgba(43, 39, 36, .26); stroke-width: 1.4; stroke-dasharray: 2 3.5; stroke-linecap: round; stroke-linejoin: round; }
`);

// Dust outlines of the shelf's things, drawn in a 100 x 100 box (centre 50,50), roughly each thing's shape and size
// ratio (w, h in scene units, so the outline is sized like the real thing on the shelf).
const SIL = {
  rifle: { w: .5, h: .1, d: 'M2 46h58l6-6h14v-4h18v8l-4 4H70l-8 10h-8l3-8H34l-12 12H8l6-12H2z' },
  top: { w: .09, h: .1, d: 'M50 4v14M22 30h56l-28 64zM22 30q28-16 56 0' },
  pat: { w: .2, h: .07, d: 'M10 38l12-12h68l-12 12zM10 38v26h68V38M78 64l12-12V26' },
  tin: { w: .11, h: .08, d: 'M8 30a42 12 0 0 0 84 0a42 12 0 0 0-84 0v40a42 12 0 0 0 84 0V30' },
  bucket: { w: .13, h: .14, d: 'M16 26h68l-8 66H24zM16 26q34-34 68 0' },
  flour: { w: .12, h: .16, d: 'M24 18q26 10 52 0l8 74H16zM40 12l10 8 10-8' },
};

export default function createTells(site, journey) {
  const { stage, cat, store, registry, audio } = site;
  const T = site.THREE, C = TELLS, calm = () => stage.reducedMotion;
  const stats = { scrapes: [], shimmers: 0, hum: [], gaps: [], pins: 0, pegs: 0 };
  const layer = document.createElementNS(NS, 'svg'); layer.id = 'tells-fx'; layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const make = (tag, attrs = {}, parent = layer) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; };
  const tell = (id, phase = 'start', extra = {}) => journey.emit('tell', { id, phase, ...extra });
  const busy = () => journey.busy() || !!site.ink?.drawing || !stage.loaded;
  const found = (id) => registry.has(id);
  const v3 = new T.Vector3();
  const screenOfLocal = (root, p) => { root.updateMatrixWorld(true); return stage.toScreen(v3.set(p[0], p[1], p[2]).applyMatrix4(root.matrixWorld), {}); };

  // a small four-point glint at (x, y), r px; gone after ms. Reduced motion: a still star that fades.
  function glint(x, y, r, { kind, ms = 700, color = '#fffbe8', edge = '#d9a400' } = {}) {
    const g = make('g', { 'data-tell': kind, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
    const k = r / 10;
    const star = make('path', { d: 'M0-10C1 -2 2 -1 10 0C2 1 1 2 0 10C-1 2-2 1-10 0C-2-1-1-2 0-10z', fill: color, stroke: edge, 'stroke-width': (1 / k).toFixed(2), transform: `scale(${k.toFixed(3)})` }, g);
    const anim = calm()
      ? g.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: ms * 0.8, easing: 'ease-in' })
      : star.animate([{ scale: 0, rotate: '0deg', opacity: 0 }, { scale: 1, rotate: '45deg', opacity: 1, offset: 0.35 }, { scale: 0, rotate: '90deg', opacity: 0 }], { duration: ms, easing: 'ease-in-out' });
    anim.finished.then(() => g.remove(), () => g.remove());
    return g;
  }

  // ---- scrape ----
  let panner = null;
  async function scrape(side) {
    await audio.load(C.scrape.file);
    const c = audio.context(); if (!c) return false;
    panner ??= (() => { try { const p = c.createStereoPanner(); p.connect(audio.output()); return p; } catch { return null; } })();
    if (panner) panner.pan.value = side * C.scrape.pan;
    const S = C.scrape, s = audio.play(S.file, { gain: 0, offset: S.offset, duration: S.seconds, dest: panner || undefined });
    stats.scrapes.push(side < 0 ? 'left' : 'right');
    tell('scrape', 'start', { side: side < 0 ? 'left' : 'right' });
    if (!s) return false;
    const g = s.gain.gain, t = c.currentTime;
    g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(S.gain, t + S.fade);
    g.setValueAtTime(S.gain, t + S.seconds - S.fade); g.linearRampToValueAtTime(0.0001, t + S.seconds);
    return true;
  }
  site.supports?.onDiscover?.((id, category) => {
    if (category !== 'solid' && category !== 'flat') return;
    if (site.supports.count(category) !== 1) return;                              // the first of its kind only
    const furniture = category === 'solid' ? 'shelf' : 'board';
    if (journey.has(furniture)) return;
    stage.after(C.scrape.wait).then(() => scrape(category === 'solid' ? -1 : 1));
  });

  // ---- butter shimmer ----
  let lastShimmer = -Infinity, lastMove = 0;
  function shimmer() {
    const b = site.eggs.butterman?.butterScreen?.(); if (!b) return false;
    lastShimmer = performance.now(); stats.shimmers++;
    glint(b.x + 6, b.y - 4, 9, { kind: 'butter-shimmer', ms: 650 });
    tell('butter-shimmer');
    return true;
  }
  addEventListener('pointermove', (e) => {
    if (!cat.butterOn || found('whisper')) return;
    const now = performance.now();
    if (now - lastMove < 80 || now - lastShimmer < C.shimmer.every * 1000) return;
    lastMove = now;
    if (cat.hidden || site.eggs.butterman?.running || site.books?.showing) return;
    const b = site.eggs.butterman?.butterScreen?.(); if (!b) return;
    if (Math.hypot(e.clientX - b.x, e.clientY - b.y) < C.shimmer.near) shimmer();
  }, { passive: true });

  // ---- whisker hum ----
  let humRun = null;
  function humGlint(i) { const shown = !!site.eggs.harp?.glint?.(C.hum.tune[i]); stats.hum.push({ i, whisker: C.hum.tune[i], shown, at: Math.round(performance.now()) }); }
  stage.onFrame.push(() => {
    const bm = site.eggs.butterman;
    if (!bm?.running) { humRun = null; return; }
    if (found('harp') || bm.state.scene !== 'butter') return;
    if (!humRun) { const sc = bm.state.scenes.find((x) => x.id === 'butter'); humRun = { start: sc ? sc.beats[0] : 0, next: 0 }; }
    if (humRun.next >= C.hum.tune.length) return;
    const rel = (bm.state.beat ?? -1) - humRun.start, H = C.hum;
    if (rel > H.start + H.tune.length * H.step + 1) { humRun.next = H.tune.length; return; }   // came in late: not a burst
    while (humRun.next < H.tune.length && rel >= H.start + humRun.next * H.step) {
      if (humRun.next === 0) tell('whisker-hum');
      humGlint(humRun.next++);
    }
  });

  // ---- shelf gaps ----
  const gapLayer = make('g', { 'data-tell': 'shelf-gaps' });
  let gapKey = '';
  const everOwned = (id) => !!store.get('worldDiscoveries.' + id) || site.keepsakes.has(id);
  function gaps() {
    const sh = site.shelf;
    const want = [];
    if (sh?.ready && !sh.arriving && sh.root && !done(journey.node('collector'), journey.has, journey.get)) {
      for (const s of sh.slots) if (BAYS.includes(s.id) && !s.occupant && !everOwned(s.id)) want.push({ id: s.id, p: s.position, hang: false });
      const free = [0, 1].filter((n) => !sh.hookSlots.some((s) => s.hook === n && s.occupant));
      for (const id of HOOK_ITEMS) {
        if (everOwned(id) || !free.length) continue;
        const n = free.includes(HOOK_ITEMS.indexOf(id)) ? HOOK_ITEMS.indexOf(id) : free[0];
        free.splice(free.indexOf(n), 1);
        const s = sh.hookSlots.find((x) => x.hook === n && x.item === id) || sh.hookSlots.find((x) => x.hook === n);
        if (s?.position) want.push({ id, p: s.position, hang: true });
      }
    }
    const placed = want.map((w) => {
      const q = screenOfLocal(sh.root, w.p), sil = SIL[w.id];
      sh.root.updateMatrixWorld(true);
      const ppu = stage.pxPerUnit(v3.set(w.p[0], w.p[1], w.p[2]).applyMatrix4(sh.root.matrixWorld));
      const wpx = sil.w * ppu, hpx = sil.h * ppu, y = w.hang ? q.y + hpx * 0.55 : q.y - hpx * 0.35;
      return { id: w.id, x: q.x, y, w: wpx, h: hpx };
    });
    const key = placed.map((p) => `${p.id}:${p.x | 0},${p.y | 0},${p.w | 0}`).join('|');
    if (key === gapKey) return stats.gaps;
    gapKey = key; gapLayer.textContent = '';
    for (const p of placed) {
      const g = make('g', { class: 'gap', 'data-tell': 'shelf-gap', 'data-item': p.id, transform: `translate(${(p.x - p.w / 2).toFixed(1)} ${(p.y - p.h / 2).toFixed(1)}) scale(${(p.w / 100).toFixed(4)} ${(p.h / 100).toFixed(4)})` }, gapLayer);
      make('path', { d: SIL[p.id].d, 'vector-effect': 'non-scaling-stroke' }, g);
    }
    stats.gaps = placed.map((p) => p.id);
    return stats.gaps;
  }
  // re-placed on the things that can move them (a resize or zoom, a keepsake given, a book closed) and on a slow
  // timer that only projects a few points while the shelf exists
  const refreshGaps = () => { try { gaps(); } catch (e) { console.error('tells gaps', e); } };
  stage.onResize.push(refreshGaps);
  site.keepsakes.onGive(() => setTimeout(refreshGaps, 600));
  journey.on('book-closed', refreshGaps);
  journey.on('progress', refreshGaps);
  setInterval(() => { if (site.shelf?.ready && !document.hidden) refreshGaps(); }, C.gaps.every * 1000);

  // ---- board pins ----
  let lastPins = -Infinity;
  function pins(held = null) {
    const pb = site.pinboard;
    if (!pb?.ready || pb.arriving || !pb.art?.pins) return 0;
    let n = 0;
    for (const [id, pin] of pb.art.pins) {
      if (pin.visible) continue;                                              // a card is pinned there
      const q = stage.toScreen(pin.getWorldPosition(v3), {});
      if (q.behind) continue;
      glint(q.x, q.y, id === held ? 9 : 6, { kind: 'board-pin', ms: id === held ? 800 : 600, color: '#fff6dc', edge: '#9a7a3a' });
      n++;
    }
    if (n) { stats.pins++; lastPins = performance.now(); tell('board-pins'); }
    return n;
  }
  addEventListener('sigilcat:pickup', (e) => {
    const id = e.detail?.id;
    if (!FLAT.includes(id) || journey.has('curator') || performance.now() - lastPins < C.pins.every * 1000) return;
    pins(id);
  });

  // ---- empty peg ----
  let lastPeg = -Infinity;
  function pegPos() {
    const r = site.rack, s = r?.slots?.find((x) => x.id === 'party');
    if (!r?.root || !r.picture || !s) return null;
    return screenOfLocal(r.root, s.position);
  }
  function pegWanted() {
    const owned = site.rack?.owned?.() || [];
    return ['wizard', 'cone', 'crown'].every((n) => owned.includes(n)) && !owned.includes('party') && !journey.has('dressup');
  }
  function peg({ force = false } = {}) {
    const p = pegPos(); if (!p || (!force && !pegWanted())) return false;
    lastPeg = performance.now(); stats.pegs++;
    const g = make('g', { 'data-tell': 'empty-peg', transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` });
    const lines = make('g', {}, g);
    for (const sx of [-1, 1]) make('path', { d: `M${sx * 9} -7q${sx * 4} 7 0 14M${sx * 14} -10q${sx * 6} 10 0 20`, fill: 'none', stroke: 'rgba(43,39,36,.45)', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, lines);
    const a = calm()
      ? g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'ease-in' })
      : lines.animate([{ rotate: '0deg', opacity: 0 }, { rotate: '-14deg', opacity: 1, offset: 0.15 }, { rotate: '12deg', offset: 0.35 }, { rotate: '-9deg', offset: 0.55 }, { rotate: '6deg', offset: 0.75, opacity: 0.8 }, { rotate: '0deg', opacity: 0 }], { duration: 1100, easing: 'ease-in-out' });
    a.finished.then(() => g.remove(), () => g.remove());
    tell('empty-peg');
    return true;
  }
  // he faces the rack: the screen side his nose points to is the rack's side
  function facingRack() {
    const p = pegPos(); if (!p) return false;
    const h = cat.height * 0.5, mid = cat.screenOf([0, h, 0], {}), nose = cat.screenOf([0, h, 0.3], {});
    const dx = nose.x - mid.x;
    return Math.abs(dx) > C.peg.facing && Math.sign(dx) === Math.sign(p.x - mid.x);
  }
  cat.onDrag.push((kind) => {
    if (kind !== 'end' || performance.now() - lastPeg < C.peg.every * 1000 || !pegWanted()) return;
    stage.after(C.peg.settle).then(() => { if (!busy() && facingRack()) peg(); });
  });

  // ---- combo riddles (§5.6) ----
  journey.visibleCombos = () => FINDS.filter((f) => f.kind === 'combo' && !found(f.id)).filter((f) => {
    const n = journey.node(f.id);
    return !!n && n.needs.every((id) => { const m = journey.node(id); return m && done(m, journey.has, journey.get); });
  }).map((f) => f.id);

  return { config: TELLS, stats, layer, shimmer, hum: () => ({ run: humRun, fired: stats.hum }), gaps, pins, peg, facingRack };
}
