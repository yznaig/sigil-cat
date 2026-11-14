// The chest screen (kitchen lane, e1111-61): the baking box opens as a Minecraft-style chest. A grey bevelled panel,
// "Chest" over a 9 x 3 grid, "Inventory" over a 9 x 3 grid and a 9-slot hotbar, drawn as pixel art at a whole-number
// scale; the page behind dims. Hover a slot for the item's name; press an item to pick it up and drop it on another
// slot (drag, or click then click; tap then tap on a phone). What the slots mean is the model's business
// (src/world/recipes.js): moving an item between grids despawns it from the room or brings it back.
import { css } from '../core/util.js';
import { drawText, measure } from './pixel-font.js';

export const PANEL = { w: 176, h: 167 };
const FRAME = (kind, i) => kind === 'chest' ? [7 + (i % 9) * 18, 17 + Math.floor(i / 9) * 18]
  : i < 27 ? [7 + (i % 9) * 18, 84 + Math.floor(i / 9) * 18] : [7 + (i - 27) * 18, 142];
const COLORS = { fill: '#c6c6c6', light: '#ffffff', shade: '#555555', line: '#000000', slot: '#8b8b8b', slotDark: '#373737', label: '#404040' };

css('chest-screen', `
#chest-screen{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;touch-action:none;user-select:none;-webkit-user-select:none;
 background:linear-gradient(#101010b8,#101010cc);opacity:0;transition:opacity .09s linear}
#chest-screen.shown{opacity:1}
#chest-screen .chest-panel{position:relative;flex:none}
#chest-screen canvas.chest-bg{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
#chest-screen .chest-slot{position:absolute;padding:0;margin:0;border:0;background:none;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}
#chest-screen .chest-slot img{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;-webkit-user-drag:none}
#chest-screen .chest-slot.hover::after,#chest-screen .chest-slot:focus-visible::after{content:'';position:absolute;inset:0;background:#ffffff80}
#chest-screen .chest-slot:focus-visible{box-shadow:0 0 0 2px #fff}
#chest-screen .chest-slot.lifted img{visibility:hidden}
#chest-screen .chest-close{position:absolute;padding:0;border:0;background:none;cursor:pointer;image-rendering:pixelated}
#chest-screen .chest-close canvas{width:100%;height:100%;image-rendering:pixelated;pointer-events:none}
#chest-screen .chest-close:focus-visible{outline:2px solid #fff}
#chest-screen .chest-carried{position:fixed;left:0;top:0;pointer-events:none;z-index:2;display:none}
#chest-screen .chest-carried.on{display:block}
#chest-screen .chest-tip{position:fixed;left:0;top:0;pointer-events:none;z-index:3;display:none;image-rendering:pixelated}
#chest-screen .chest-tip.on{display:block}
#chest-screen .chest-live{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(prefers-reduced-motion:reduce){#chest-screen{transition:none}}
`);

function background() {
  const { w: W, h: H } = PANEL, canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d'), px = (x, y, color) => { c.fillStyle = color; c.fillRect(x, y, 1, 1); };
  // A rounded slab: small cut at the top left, a deeper one at the other corners (as the game's panel has).
  const out = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return true;
    const L = x, R = W - 1 - x, T = y, B = H - 1 - y;
    if (T === 0 && L < 2 || T === 1 && L < 1) return true;
    const cut = (a, b) => a === 0 && b < 3 || a === 1 && b < 2 || a === 2 && b < 1;
    return cut(T, R) || cut(B, L) || cut(B, R);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (out(x, y)) continue;
    if (out(x - 1, y) || out(x + 1, y) || out(x, y - 1) || out(x, y + 1)) { px(x, y, COLORS.line); continue; }
    const near = (dx, dy) => { for (let k = 1; k <= 2; k++) if (out(x + dx * k, y + dy * k) || out(x + dx * k + dx, y + dy * k + dy)) return true; return false; };
    const tl = near(0, -1) || near(-1, 0), br = near(0, 1) || near(1, 0);
    px(x, y, tl && !br ? COLORS.light : br && !tl ? COLORS.shade : COLORS.fill);
  }
  px(3, 3, COLORS.light); px(W - 4, H - 4, COLORS.shade);
  const slot = (fx, fy) => {
    c.fillStyle = COLORS.slot; c.fillRect(fx, fy, 18, 18);
    c.fillStyle = COLORS.slotDark; c.fillRect(fx, fy, 17, 1); c.fillRect(fx, fy, 1, 17);
    c.fillStyle = COLORS.light; c.fillRect(fx + 1, fy + 17, 17, 1); c.fillRect(fx + 17, fy + 1, 1, 17);
  };
  for (let i = 0; i < 27; i++) slot(...FRAME('chest', i));
  for (let i = 0; i < 36; i++) slot(...FRAME('inv', i));
  drawText(c, 'Chest', 8, 6, COLORS.label);
  drawText(c, 'Inventory', 8, 74, COLORS.label);
  return canvas;
}
// The game's item tooltip: near-black violet slab, a faint blue-violet rim, white words with a grey drop shadow.
function tooltip(text) {
  const tw = measure(text), W = tw + 8, H = 17, canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  c.fillStyle = 'rgba(16,0,16,.94)'; c.fillRect(1, 0, W - 2, H); c.fillRect(0, 1, W, H - 2);
  const rim = c.createLinearGradient(0, 1, 0, H - 1); rim.addColorStop(0, 'rgba(80,0,255,.31)'); rim.addColorStop(1, 'rgba(40,0,127,.31)');
  c.fillStyle = rim; c.fillRect(1, 1, W - 2, 1); c.fillRect(1, H - 2, W - 2, 1); c.fillRect(1, 2, 1, H - 4); c.fillRect(W - 2, 2, 1, H - 4);
  drawText(c, text, 4, 4, '#ffffff', { shadow: '#3f3f3f' });
  return canvas;
}
function closeGlyph() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 7; const c = canvas.getContext('2d');
  c.fillStyle = COLORS.label; for (let k = 0; k < 7; k++) { c.fillRect(k, k, 1, 1); c.fillRect(6 - k, k, 1, 1); }
  return canvas;
}

export function createChestScreen(site, model) {
  const { stage, audio } = site;
  let root = null, panel = null, scale = 3, carried = null, hoverSlot = null, last = { x: 0, y: 0 }, press = null, closing = null, opened = 0;
  const buttons = new Map(), stats = { opens: 0, moves: 0 };
  let bg = null, tip = null, carriedEl = null, live = null, previousFocus = null;
  const slotKey = (kind, i) => kind + ':' + i;
  function fit() {
    const vw = innerWidth, vh = innerHeight, room = Math.min((vw - 32) / PANEL.w, (vh - 48) / PANEL.h);
    scale = room >= 2 ? Math.min(3, Math.floor(room)) : Math.max(1, Math.min((vw - 12) / PANEL.w, (vh - 12) / PANEL.h));
    if (!panel) return;
    panel.style.width = PANEL.w * scale + 'px'; panel.style.height = PANEL.h * scale + 'px';
    for (const [key, b] of buttons) {
      const [kind, i] = key.split(':'), [fx, fy] = FRAME(kind, +i);
      Object.assign(b.style, { left: (fx + 1) * scale + 'px', top: (fy + 1) * scale + 'px', width: 16 * scale + 'px', height: 16 * scale + 'px' });
    }
    const close = panel.querySelector('.chest-close');
    Object.assign(close.style, { left: (PANEL.w - 15) * scale + 'px', top: 4 * scale + 'px', width: 9 * scale + 'px', height: 9 * scale + 'px', padding: scale + 'px' });
    if (carriedEl) { carriedEl.style.width = carriedEl.style.height = 16 * scale + 'px'; }
  }
  function build() {
    root = document.createElement('div'); root.id = 'chest-screen'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Chest');
    panel = document.createElement('div'); panel.className = 'chest-panel'; panel.tabIndex = -1; panel.style.outline = 'none'; root.append(panel);
    bg = background(); bg.className = 'chest-bg'; bg.setAttribute('aria-hidden', 'true'); panel.append(bg);
    for (const [kind, count] of [['chest', 27], ['inv', 36]]) for (let i = 0; i < count; i++) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chest-slot'; b.dataset.kind = kind; b.dataset.i = i;
      const img = document.createElement('img'); img.alt = ''; img.hidden = true; b.append(img);
      panel.append(b); buttons.set(slotKey(kind, i), b);
    }
    const close = document.createElement('button'); close.type = 'button'; close.className = 'chest-close'; close.setAttribute('aria-label', 'Close the chest');
    close.append(closeGlyph()); panel.append(close); close.addEventListener('click', (e) => { e.stopPropagation(); requestClose(); });
    carriedEl = document.createElement('img'); carriedEl.className = 'chest-carried'; carriedEl.alt = ''; root.append(carriedEl);
    tip = document.createElement('canvas'); tip.className = 'chest-tip'; root.append(tip);
    live = document.createElement('p'); live.className = 'chest-live'; live.setAttribute('aria-live', 'polite'); root.append(live);
    root.addEventListener('pointerdown', down); root.addEventListener('pointermove', move); root.addEventListener('pointerup', up); root.addEventListener('pointercancel', cancelPress);
    root.addEventListener('keydown', key); root.addEventListener('contextmenu', (e) => e.preventDefault());
    fit();
  }
  const itemAt = (kind, i) => { const s = model.slots(); return (kind === 'chest' ? s.chest : s.inv)[i] || null; };
  function render() {
    if (!root) return;
    const s = model.slots();
    for (const [key, b] of buttons) {
      const [kind, i] = key.split(':'), item = (kind === 'chest' ? s.chest : s.inv)[+i], img = b.firstChild;
      const where = kind === 'chest' ? 'Chest' : +i >= 27 ? 'Hotbar' : 'Inventory', n = kind === 'inv' && +i >= 27 ? +i - 26 : +i + 1;
      b.setAttribute('aria-label', `${where} slot ${n}: ${item ? item.name : 'empty'}`);
      b.dataset.item = item ? item.id : '';
      if (item?.icon) { if (img.getAttribute('src') !== item.icon) img.src = item.icon; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }
      b.classList.toggle('lifted', !!carried && carried.kind === kind && carried.i === +i);
    }
    showTip();
  }
  function showTip() {
    const item = carried ? null : hoverSlot && itemAt(hoverSlot.kind, hoverSlot.i);
    const touchItem = carried && carried.touch ? carried.item : null, which = item || touchItem;
    if (!which) { tip.classList.remove('on'); return; }
    const t = tooltip(which.name); tip.width = t.width; tip.height = t.height; tip.getContext('2d').drawImage(t, 0, 0);
    tip.style.width = t.width * scale + 'px'; tip.style.height = t.height * scale + 'px';
    let x = last.x + 12 * scale, y = last.y - 14 * scale;
    if (touchItem) { x = last.x - t.width * scale / 2; y = last.y - 8 * scale - t.height * scale - 4; }
    x = Math.max(4, Math.min(innerWidth - t.width * scale - 4, x)); y = Math.max(4, Math.min(innerHeight - t.height * scale - 4, y));
    tip.style.transform = `translate(${x}px,${y}px)`; tip.classList.add('on');
  }
  function placeCarried() {
    if (!carried) { carriedEl.classList.remove('on'); return; }
    if (carriedEl.getAttribute('src') !== carried.item.icon && carried.item.icon) carriedEl.src = carried.item.icon;
    const size = 16 * scale, lift = carried.touch ? 6 * scale : 0;
    carriedEl.style.transform = `translate(${last.x - size / 2}px,${last.y - size / 2 - lift}px)`; carriedEl.classList.add('on');
  }
  const slotOf = (target) => { const b = target?.closest?.('.chest-slot'); return b ? { kind: b.dataset.kind, i: +b.dataset.i, b } : null; };
  function setHover(s) {
    if (hoverSlot?.b) hoverSlot.b.classList.remove('hover');
    hoverSlot = s; if (s?.b && (itemAt(s.kind, s.i) || carried)) s.b.classList.add('hover');
  }
  function pick(s, touch) {
    const item = itemAt(s.kind, s.i); if (!item) return false;
    carried = { kind: s.kind, i: s.i, item, touch };
    audio.play('click', { gain: .18, rate: 1.6 });
    render(); placeCarried(); return true;
  }
  async function drop(s) {
    if (!carried) return;
    const from = carried; carried = null; placeCarried();
    if (s && !(s.kind === from.kind && s.i === from.i)) {
      stats.moves++;
      const moved = await model.move({ kind: from.kind, i: from.i }, { kind: s.kind, i: s.i });
      if (moved && live) live.textContent = `${from.item.name} ${s.kind === 'chest' ? 'is in the chest' : 'is back in the room'}`;
      audio.play('click', { gain: .16, rate: 1.25 });
    }
    render(); setHover(s);
  }
  function down(e) {
    if (closing) return;
    last = { x: e.clientX, y: e.clientY };
    const s = slotOf(e.target);
    if (e.target.closest('.chest-close')) return;
    if (!e.target.closest('.chest-panel')) { press = { outside: true }; return; }
    if (!s) { press = null; return; }
    e.preventDefault();
    if (carried) { press = { drop: s }; return; }
    if (pick(s, e.pointerType === 'touch')) press = { from: s, x: e.clientX, y: e.clientY, moved: false };
  }
  function move(e) {
    last = { x: e.clientX, y: e.clientY };
    if (press?.from && !press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) { press.moved = true; if (carried) carried.touch = false; }
    const under = slotOf(document.elementFromPoint(e.clientX, e.clientY));
    if (under?.b !== hoverSlot?.b) setHover(under);
    placeCarried(); showTip();
  }
  function up(e) {
    last = { x: e.clientX, y: e.clientY };
    const p = press; press = null; if (!p) return;
    if (p.outside) { if (!e.target.closest('.chest-panel')) requestClose(); return; }
    if (p.drop) { drop(slotOf(document.elementFromPoint(e.clientX, e.clientY)) || p.drop); return; }
    if (p.from && p.moved) {
      // A drag: let go over a slot to put it there, anywhere else to put it back.
      drop(slotOf(document.elementFromPoint(e.clientX, e.clientY)));
    }
    // A still press keeps the item in hand: the next press on a slot puts it down.
  }
  function cancelPress() { press = null; if (carried) { carried = null; placeCarried(); render(); } }
  function key(e) {
    if (e.key === 'Tab') return;
    const s = slotOf(e.target);
    if ((e.key === 'Enter' || e.key === ' ') && s) {
      e.preventDefault(); const r = s.b.getBoundingClientRect(); last = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      if (carried) drop(s); else pick(s, true);
      return;
    }
    const arrows = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (s && arrows[e.key]) {
      e.preventDefault();
      const order = [...[...Array(27).keys()].map((i) => ['chest', i]), ...[...Array(36).keys()].map((i) => ['inv', i])];
      const at = order.findIndex(([k, i]) => k === s.kind && i === s.i), next = order[Math.max(0, Math.min(order.length - 1, at + arrows[e.key]))];
      const b = buttons.get(slotKey(...next)); b.focus(); const r = b.getBoundingClientRect(); last = { x: r.x + r.width / 2, y: r.y + r.height / 2 }; placeCarried(); showTip();
    }
  }
  const onResize = () => { fit(); placeCarried(); showTip(); };
  // Escape wherever focus is: first it puts back what is in hand, then it closes.
  const onEscape = (e) => { if (e.key !== 'Escape' || !root?.isConnected) return; e.preventDefault(); e.stopImmediatePropagation(); if (carried) { carried = null; placeCarried(); render(); } else requestClose(); };
  let inertSaved = [];
  async function open() {
    if (root?.isConnected) return false;
    if (!root) build();
    stats.opens++; opened = performance.now(); closing = null; carried = null; hoverSlot = null; press = null;
    previousFocus = document.activeElement; fit(); render(); placeCarried(); tip.classList.remove('on');
    // The page behind is out of reach while the chest is open (focus stays in the dialog).
    inertSaved = [...document.body.children].map((n) => [n, n.inert]); for (const [n] of inertSaved) n.inert = true;
    document.body.append(root); addEventListener('resize', onResize); addEventListener('keydown', onEscape, true);
    requestAnimationFrame(() => root.classList.add('shown'));
    // Focus the dialog itself; Tab moves into the slots (a focused first slot would look hovered).
    panel.focus({ preventScroll: true });
    return true;
  }
  let closeResolve = null;
  function requestClose() {
    if (!root?.isConnected || closing) return closing;
    if (carried) { carried = null; placeCarried(); }
    closing = new Promise((r) => { closeResolve = r; });
    root.classList.remove('shown'); removeEventListener('resize', onResize); removeEventListener('keydown', onEscape, true); setHover(null);
    for (const [n, was] of inertSaved) n.inert = was; inertSaved = [];
    setTimeout(() => { root.remove(); tip.classList.remove('on'); if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); const r = closeResolve; closeResolve = null; closing = null; r(); model.closed?.(); }, stage.reducedMotion ? 0 : 90);
    return closing;
  }
  return {
    open, close: requestClose, render, stats,
    get isOpen() { return !!root?.isConnected; }, get root() { return root; }, get scale() { return scale; }, get carried() { return carried; },
    // For checks and keyboard-free automation: the slot button's page rectangle.
    rect(kind, i) { return buttons.get(slotKey(kind, i))?.getBoundingClientRect() || null; },
  };
}
