// Stickers (playtest 2, gags lane): the gold star from the bread's blast-off and the recycling bin's gold stars are
// flat 2D stickers on the screen itself, above the room, so nothing (the pinboard, the cat) can ever hide one. Drag one
// anywhere on the screen and let go; it stays there, saved as a fraction of the viewport so it keeps its place on any
// size of screen. A tap (or Enter on its keyboard key) tilts it toward you in 3D with a glint and a small bell (playtest 3).
// Arrow keys on its keyboard key move it. Each sticker is still a keepsake (keepsakes.has / get / take work as
// before), but its picture is a canvas drawn once, in its own top-level layer; nothing here runs per frame at rest.
//   defineSticker(site, {id, label, art: 'star' | 'goodjob', lines: ['GOOD', 'JOB!'], spot: [fx, fy], tilt, tapped})
//   stickerLayer(site).place(id, {x, y})   move one (screen px of its middle)
import {css} from '../core/util.js';

export const STICKER = {
  size: {star: [.075, 38, 70], goodjob: [.12, 60, 112]},   // [share of the viewport's short side, min px, max px]
  margin: 4,               // px it keeps inside the screen's edge
  drag: 6,                 // px a press moves before it is a drag, not a tap
  glint: 550,              // ms of the tilt on a tap
};
css('stickers', `
#stickers { position: fixed; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; contain: strict; transition: opacity .4s; }
body.galaxy-showing #stickers, body.bm-big #stickers { opacity: 0; }
#stickers .sticker { position: absolute; left: 0; top: 0; pointer-events: auto; touch-action: none; cursor: grab; will-change: transform; perspective: 420px; }
#stickers .sticker .face { width: 100%; height: 100%; transform-style: preserve-3d; filter: drop-shadow(0 1.5px 1.5px rgba(70, 45, 15, .28)); }
#stickers .sticker canvas { width: 100%; height: 100%; display: block; }
#stickers .sticker.held { cursor: grabbing; }
#stickers .sticker.held .face { scale: 1.08; filter: drop-shadow(0 9px 8px rgba(70, 45, 15, .3)); }
#stickers .sticker.focus { outline: 2px dashed rgba(43, 39, 36, .5); outline-offset: 4px; border-radius: 50%; }
`);

export function stickerLayer(site) { return site.stickerLayer ??= createLayer(site); }
function createLayer(site) {
  const {stage} = site;
  const layer = document.createElement('div'); layer.id = 'stickers'; layer.setAttribute('aria-hidden', 'true');
  (document.getElementById('ink') || document.body.lastElementChild).after(layer);
  const live = new Map();
  const sizeOf = (art) => { const [k, lo, hi] = STICKER.size[art]; return Math.round(Math.max(lo, Math.min(hi, k * Math.min(stage.width, stage.height)))); };
  // Its middle, in px, kept so the whole sticker stays on the screen.
  // (1.08: room for its slightly turned corners.)
  function clampPx(s, x, y) { const h = s.px / 2 * 1.08 + STICKER.margin; return {x: Math.max(h, Math.min(stage.width - h, x)), y: Math.max(h, Math.min(stage.height - h, y))}; }
  function layout(s) {
    const size = sizeOf(s.art);
    if (size !== s.px) { s.px = size; s.draw(); }
    const p = clampPx(s, s.f[0] * stage.width, s.f[1] * stage.height); s.at = p;
    // Placed by left/top, so the keepsake's own arrival pop and wiggle (CSS scale, rotate, translate) turn about its middle.
    Object.assign(s.el.style, {width: size + 'px', height: size + 'px', left: (p.x - size / 2).toFixed(1) + 'px', top: (p.y - size / 2).toFixed(1) + 'px', transform: `rotate(${s.tilt}deg)`});
    s.moved?.(p);
  }
  function place(id, {x, y}, save = true) {
    const s = live.get(id); if (!s) return false;
    const p = clampPx(s, x, y); s.f = [p.x / stage.width, p.y / stage.height]; layout(s); if (save) s.save(); return true;
  }
  function add(s) {
    live.set(s.id, s); layer.append(s.el); layout(s);
    // Pointer: press and drag to move it, a short press is a tap. The layer is above the room, so the room never sees it.
    s.el.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || site.input.locked) return;
      e.preventDefault(); e.stopPropagation(); try { s.el.setPointerCapture(e.pointerId); } catch { /* a synthetic press */ }
      const start = {x: e.clientX, y: e.clientY, at: {...s.at}}; let dragging = false;
      const move = (ev) => {
        if (!dragging && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < STICKER.drag) return;
        if (!dragging) { dragging = true; s.el.classList.add('held'); }
        place(s.id, {x: start.at.x + ev.clientX - start.x, y: start.at.y + ev.clientY - start.y}, false);
      };
      const end = (ev) => {
        s.el.removeEventListener('pointermove', move); s.el.removeEventListener('pointerup', end); s.el.removeEventListener('pointercancel', end);
        s.el.classList.remove('held');
        if (dragging) s.save(); else if (ev.type === 'pointerup') s.tap();
      };
      s.el.addEventListener('pointermove', move); s.el.addEventListener('pointerup', end); s.el.addEventListener('pointercancel', end);
    });
  }
  function remove(id) { const s = live.get(id); if (!s) return; s.el.remove(); live.delete(id); }
  stage.onResize.push(() => { for (const s of live.values()) layout(s); });
  return {layer, live, add, remove, place, layout, sizeOf, get(id) { return live.get(id) || null; }};
}

// One sticker kind as a keepsake. The keepsake's own element is the sticker; its saved state.f is where it is.
export function defineSticker(site, def) {
  const {keepsakes, audio, stage} = site, L = stickerLayer(site);
  audio.load('bell');
  let glintAnim = null;
  return keepsakes.define({id: def.id, label: def.label, kind: 'dom', sky: true, size: .1, aspect: 1, anchor: 'center', inert: false,
    home: () => keepsakes.toUnits(def.spot[0] * stage.width, def.spot[1] * stage.height),
    make(el, inst) {
      el.classList.add('sticker'); el.dataset.sticker = def.art;
      const face = document.createElement('div'); face.className = 'face';
      const canvas = document.createElement('canvas'); face.append(canvas); el.append(face);
      // Older saves: the physical sticker kept state.sky (fractions of the play area between the top and bottom chrome).
      const old = inst.state.sky;
      if (!inst.state.f && old) { const top = stage.insets.top, h = stage.height - top - stage.insets.bottom; inst.state.f = [old[0], (top + old[1] * h) / stage.height]; delete inst.state.sky; }
      // New: where it was given (keepsakes.give's `at`, or its home spot). Saved: where it was left.
      const given = keepsakes.toPx(inst.x, inst.y);
      const s = {id: def.id, art: def.art, el, px: 0, tilt: def.tilt ?? 0, f: inst.state.f || [given.x / stage.width, given.y / stage.height],
        draw() { paint(canvas, def, s.px); },
        save() { inst.state.f = s.f.map((v) => +v.toFixed(4)); const u = keepsakes.toUnits(s.at.x, s.at.y); inst.x = u.x; inst.y = u.y; inst.setState({}); },
        tap: () => def_tap(inst),
        moved(p) { inst.box = {x: p.x - s.px / 2, y: p.y - s.px / 2, w: s.px, h: s.px}; inst.px = {x: p.x, y: p.y}; s.units = keepsakes.toUnits(p.x, p.y); inst.x = s.units.x; inst.y = s.units.y; },
      };
      inst.sticker = s;
      // keepsakes.place() positions DOM keepsakes in its own layer by units; the sticker layer owns this one.
      inst.placed = () => {
        if (el.parentNode !== L.layer) L.add(s);
        // Its keyboard key's arrows move it in the keepsake's units; a resize re-lays units too, so only a focused key counts.
        else if (s.units && inst.key?.contains(document.activeElement) && (Math.abs(inst.x - s.units.x) > 1e-6 || Math.abs(inst.y - s.units.y) > 1e-6)) { const p = keepsakes.toPx(inst.x, inst.y); L.place(def.id, p); return; }
        L.layout(s);
      };
      inst.removing = () => { glintAnim?.cancel(); L.remove(def.id); };
      if (!inst.state.f) inst.state.f = s.f;
    },
    tap: (inst) => def_tap(inst),
  });
  // The 3D tilt toward you, with a glint: kept from the physical sticker (Aaron liked it), now a CSS turn of the face.
  function def_tap(inst) {
    const face = inst.el.querySelector('.face'); if (!face) return;
    // fx lane, playtest 3 (Aaron: "'ding-small-bell-sfx' should be used for the sound when you click a sticker"): the
    // small bell (was the glass tink, star-tink). One pitch for every sticker and the Platinum Cat (playtest 3, Aaron:
    // "need to not be different pitches. It should all just be the same pitch"); only the loudness differs.
    audio.play('bell', {gain: def.art === 'star' ? .8 : .72, rate: 1});
    def.tapped?.(inst);
    if (stage.reducedMotion) return;
    glintAnim?.cancel();
    glintAnim = face.animate([{transform: 'rotateY(0deg) rotateX(0deg)', filter: 'drop-shadow(0 1.5px 1.5px rgba(70,45,15,.28)) brightness(1)'},
      {transform: 'rotateY(28deg) rotateX(-8deg)', filter: 'drop-shadow(0 4px 4px rgba(70,45,15,.3)) brightness(1.32)', offset: .45},
      {transform: 'rotateY(0deg) rotateX(0deg)', filter: 'drop-shadow(0 1.5px 1.5px rgba(70,45,15,.28)) brightness(1)'}], {duration: STICKER.glint, easing: 'ease-out'});
  }
}

// ---- the art: drawn once per size, at the screen's pixel ratio ----
function paint(canvas, def, px) {
  const dpr = Math.min(3, devicePixelRatio || 1), S = Math.round(px * dpr); canvas.width = canvas.height = S;
  const c = canvas.getContext('2d'); c.clearRect(0, 0, S, S);
  if (def.art === 'star') paintStar(c, S); else paintGoodJob(c, S, def.lines || ['GOOD', 'JOB!']);
}
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
// The bread's star: a four-pointed gold-foil star with curved sides (the old model's outline), a brushed grain and a
// thin darker edge.
function paintStar(c, S) {
  const k = S / 24, path = () => { c.beginPath(); c.moveTo(12 * k, 1 * k); c.bezierCurveTo(12.9 * k, 7.2 * k, 15.9 * k, 10.2 * k, 23 * k, 12 * k); c.bezierCurveTo(15.9 * k, 13.8 * k, 12.9 * k, 16.8 * k, 12 * k, 23 * k); c.bezierCurveTo(11.1 * k, 16.8 * k, 8.1 * k, 13.8 * k, 1 * k, 12 * k); c.bezierCurveTo(8.1 * k, 10.2 * k, 11.1 * k, 7.2 * k, 12 * k, 1 * k); c.closePath(); };
  const g = c.createRadialGradient(S * .4, S * .36, S * .02, S / 2, S / 2, S * .55);
  g.addColorStop(0, '#fff1b8'); g.addColorStop(.4, '#e9bf55'); g.addColorStop(1, '#b8862a');
  path(); c.fillStyle = g; c.fill();
  c.save(); path(); c.clip(); const r = rng(811104);
  for (let i = 0; i < 46; i++) { c.strokeStyle = i % 2 ? 'rgba(255,244,200,.18)' : 'rgba(110,72,16,.14)'; c.lineWidth = (.4 + r() * .8) * S / 90; c.beginPath(); const x = r() * S, y = r() * S; c.moveTo(x, y); c.lineTo(x + (r() - .5) * S * .5, y + (r() - .5) * S * .5); c.stroke(); }
  c.restore();
  path(); c.lineWidth = S * .018; c.strokeStyle = '#9a7020'; c.stroke();
}
// The recycling stars: a five-pointed gold-foil teacher's sticker with its words in red over a white keyline (the
// GOOD JOB sticker's look: kitchen/goodjob.js).
function paintGoodJob(c, S, lines) {
  const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? .43 : 1) * S * .485; pts.push([S / 2 + Math.cos(a) * r, S * .515 + Math.sin(a) * r]); }
  const path = (k = 1) => { c.beginPath(); pts.forEach(([x, y], i) => { const X = S / 2 + (x - S / 2) * k, Y = S * .515 + (y - S * .515) * k; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath(); };
  const g = c.createRadialGradient(S * .38, S * .3, S * .02, S / 2, S / 2, S * .62);
  g.addColorStop(0, '#fff0b0'); g.addColorStop(.45, '#f3cb57'); g.addColorStop(1, '#cf9a2c');
  path(); c.fillStyle = g; c.fill();
  c.save(); path(); c.clip(); const r = rng(811140);
  for (let i = 0; i < 70; i++) { c.strokeStyle = i % 2 ? 'rgba(255,240,190,.12)' : 'rgba(120,80,20,.12)'; c.lineWidth = (.6 + r()) * S / 512 * 2; c.beginPath(); const x = r() * S, y = r() * S, d = (r() - .5) * .5 + .6; c.moveTo(x, y); c.lineTo(x + Math.cos(d) * S * .35, y + Math.sin(d) * S * .35); c.stroke(); }
  c.restore();
  c.lineWidth = S * .014; c.strokeStyle = 'rgba(120,82,18,.55)'; path(.84); c.stroke(); c.lineWidth = S * .006; c.strokeStyle = 'rgba(255,236,170,.6)'; path(.81); c.stroke();
  path(); c.lineWidth = S * .012; c.strokeStyle = '#a77a22'; c.stroke();
  const one = lines.length === 1, size = S * (one ? .25 : .19), y0 = S * (one ? .56 : .48), gap = S * .175;
  lines.forEach((text, n) => {
    c.save(); c.font = `900 ${size}px "Arial Black","Archivo",Impact,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(text).width, k = Math.min(1, S * .44 / w); c.translate(S / 2, y0 + n * gap); c.scale(k, 1); c.lineJoin = 'round';
    c.lineWidth = size * .14; c.strokeStyle = '#fffaf0'; c.strokeText(text, 0, 0); c.fillStyle = '#b0141a'; c.fillText(text, 0, 0); c.restore();
  });
}
