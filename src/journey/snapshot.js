// The room card (docs/journey/design.md §6.1, unit sc/p9-share): a picture of the player's own room, framed, with
// their title, the counts and the date, to save or share. Opened from the grimoire's "my room" button at any time, and
// by the ending (journey.snapshot.open({ ending: true })).
//   journey.snapshot.render({ ending, orientation }) -> Promise<{ blob, width, height, text }>   the PNG, nothing shown
//   journey.snapshot.open({ ending }) -> Promise<boolean>     render, then show the card with save / share / close
//                                     ({ ending: true } shows once per ending: false again until the next 'ending-start')
//   journey.snapshot.close()          journey.snapshot.showing   journey.snapshot.last   (the last card made)
// The room's picture is the page's own WebGL canvas, read synchronously right after one extra render of the scene
// (no preserveDrawingBuffer, no render target, nothing left behind on the GPU); stickers (DOM canvases over the
// room) are drawn on top at their places. Portrait 1200 x 1500 on a phone (a share sheet's shape), landscape
// 1600 x 900 on a desktop. Everything is drawn here: no server, no upload, nothing personal in the picture.
// "SIGIL CAT" is in the page's own pixel font (src/ui/pixel-font.js), so the card needs no font download.
import { drawText, measure } from '../ui/pixel-font.js';
import { FINDS } from '../finds.js';
import { dateOf } from '../ui/achievements.js';
import { wallClock } from '../core/page-scheduler.js';   // a frozen page (a book open) holds page timers

export const CARD = {
  portrait: [1200, 1500], landscape: [1600, 900],
  paper: '#F7EDE3', ink: '#121212', soft: '#8d8378', dark: '#2b2724', room: '#fdf0e6', gold: '#c9a13b',
  address: 'yznaig.github.io/sigil-cat',
  file: 'sigil-cat-room.png',
  flashMs: 260,                // the camera's flash as the card opens (none with reduced motion)
};
// The cat's line on the card, by title (progress.js TITLES): one dry remark each.
export const REMARKS = {
  'a visitor': 'you can see me. that is a start.',
  'a regular': 'you keep coming back. i noticed.',
  'a friend of the cat': 'the room is filling up. i allowed it.',
  'keeper of signs': 'you draw on the air like you mean it.',
  "the butter's confidant": 'the butter tells you things. it never tells me.',
  'curator of the room': 'almost full. do not tell anyone.',
  'the one who finished it': 'you finished it. i am still the cat.',
};
export const ENDING_LINE = 'the room was full.';
// his head, the mark on every bonk seal and the platinum badge (HEAD in src/achievements.js), in a 24 box
const HEAD = 'M6.2 21c-1.3-2.6-1.3-5.4 0-8l.7-4.6 3.5 2.7h3.2l3.5-2.7.7 4.6c1.3 2.6 1.3 5.4 0 8z';
const SIGNS = FINDS.filter((f) => f.kind === 'sigil');

export default function createSnapshot(site, journey) {
  const { stage, store } = site;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = new URL('./journey.css', import.meta.url).href;
  document.head.append(link);

  // ---- what the card says ----
  function facts({ ending = false } = {}) {
    const found = FINDS.filter((f) => store.get('found.' + f.id)).length;
    const A = site.achievements, bonks = Number(store.get('bonks', 0)) || 0;
    const title = journey.title();
    const ended = ending || !!journey.get('journey.ended');
    return {
      title, found, finds: FINDS.length, ach: A?.count ?? 0, achTotal: A?.total ?? 0, bonks, ending: ended,
      counts: `${found} of ${FINDS.length} found · ${A?.count ?? 0} of ${A?.total ?? 0} achievements · ${bonks.toLocaleString('en-US')} bonk${bonks === 1 ? '' : 's'}`,
      date: dateOf(Date.now()).toLowerCase(),
      remark: REMARKS[title] || REMARKS['a visitor'],
      signs: SIGNS.map((f) => ({ id: f.id, d: f.d, found: !!store.get('found.' + f.id) })),
    };
  }

  // ---- the room's picture: one render, read at once ----
  function captureRoom() {
    const { renderer, scene, camera, canvas } = stage;
    const W = canvas.width, H = canvas.height, k = W / Math.max(1, stage.width);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const c = out.getContext('2d');
    // the page behind the canvas (it is transparent): the paper and its warm wash
    c.fillStyle = CARD.room; c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W / 2, H * 1.05, 0, W / 2, H * 1.05, W * 0.55);
    g.addColorStop(0, 'rgba(240, 214, 190, .45)'); g.addColorStop(1, 'rgba(240, 214, 190, 0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const target = renderer.getRenderTarget();
    try { renderer.setRenderTarget(null); renderer.render(scene, camera); c.drawImage(canvas, 0, 0); }
    catch (e) { console.warn('room card: no picture of the room', e); }
    finally { renderer.setRenderTarget(target); }
    // the stickers sit over the room on the screen itself
    for (const s of document.querySelectorAll('#stickers .sticker canvas')) {
      const r = s.getBoundingClientRect();
      if (r.width && r.height && getComputedStyle(s.closest('#stickers')).opacity !== '0') { try { c.drawImage(s, r.left * k, r.top * k, r.width * k, r.height * k); } catch { /* a tainted or empty canvas */ } }
    }
    // where the room is: between the page's chrome (the room is planned inside it)
    // and where he is: the crop keeps his ears and the floor in front of him (the keepsakes land there)
    const ins = stage.insets, V = stage.THREE.Vector3, at = (y) => stage.toScreen(new V(0, y, 0)).y * k;
    return { canvas: out, scale: k, top: ins.top * k, bottom: H - ins.bottom * k, ears: at(1.25), middle: at(0.35) };
  }

  // the crop of the room picture that fills a box of aspect a (width / height): the whole width when it fits,
  // centred on the band between the chrome; the middle otherwise
  function crop(room, a) {
    const W = room.canvas.width, H = room.canvas.height;
    let w = W, h = W / a;
    if (h > H) { h = H; w = H * a; }
    const y = Math.max(0, Math.min(H - h, room.middle - h / 2, room.ears - h * 0.05)), x = (W - w) / 2;
    return [x, y, w, h];
  }

  // ---- drawing ----
  const FONT = '"Archivo", "Arial Narrow", system-ui, sans-serif';
  async function fontsIn() {
    try { await Promise.race([Promise.all(['800 40px Archivo', '600 20px Archivo'].map((f) => document.fonts.load(f))), new Promise((r) => wallClock.setTimeout(r, 1200))]); } catch { /* the fallback is fine */ }
  }
  function type(c, weight, size, { spacing = 0, stretch = true } = {}) {
    c.font = `${weight} ${size}px ${FONT}`;
    if ('fontStretch' in c) c.fontStretch = stretch ? 'expanded' : 'normal';
    if ('letterSpacing' in c) c.letterSpacing = spacing + 'px';
  }
  function text(c, s, x, y, { align = 'left', color = CARD.dark, weight = 800, size = 20, spacing = 0, upper = false, max = 0 } = {}) {
    type(c, weight, size, { spacing });
    c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic';
    const t = upper ? s.toUpperCase() : s;
    if (max) { const w = c.measureText(t).width; if (w > max) { type(c, weight, size * max / w, { spacing }); } }
    c.fillText(t, x, y);
  }
  function pixelTitle(c, s, cx, y, px, color) {
    const w = measure(s) * px;
    c.save(); c.translate(Math.round(cx - w / 2), y); drawText(c, s, 0, 0, color, { px }); c.restore();
    return w;
  }
  function sign(c, d, x, y, size, color, width = 2) {
    c.save(); c.translate(x, y); c.scale(size / 24, size / 24);
    c.strokeStyle = color; c.lineWidth = width * 24 / size; c.lineCap = 'round'; c.lineJoin = 'round';
    c.stroke(new Path2D(d)); c.restore();
  }
  function signRow(c, f, cx, y, size, gap) {
    const n = f.signs.length, w = n * size + (n - 1) * gap;
    f.signs.forEach((s, i) => {
      const x = cx - w / 2 + i * (size + gap);
      if (s.found) sign(c, s.d, x, y, size, CARD.ink, 2.2);
      else { c.fillStyle = 'rgba(43, 39, 36, .25)'; c.beginPath(); c.arc(x + size / 2, y + size / 2, size * 0.09, 0, Math.PI * 2); c.fill(); }
    });
  }
  // the gold seal with his head (the ending)
  function seal(c, x, y, r) {
    c.save();
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#f6dd8a'); g.addColorStop(0.55, '#d9ae45'); g.addColorStop(1, '#a87a22');
    c.fillStyle = g; c.beginPath();
    for (let i = 0; i <= 64; i++) { const t = i / 64 * Math.PI * 2, rr = r * (1 + 0.035 * Math.sin(t * 9)); c[i ? 'lineTo' : 'moveTo'](x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
    c.closePath(); c.shadowColor = 'rgba(70, 45, 15, .35)'; c.shadowBlur = r * 0.18; c.shadowOffsetY = r * 0.06; c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(120, 80, 20, .45)'; c.lineWidth = r * 0.04; c.beginPath(); c.arc(x, y, r * 0.8, 0, Math.PI * 2); c.stroke();
    sign(c, HEAD, x - r * 0.5, y - r * 0.52, r, '#6b4a12', 2.4);
    c.restore();
  }
  function frame(c, W, H, m) {
    c.fillStyle = CARD.paper; c.fillRect(0, 0, W, H);
    c.strokeStyle = CARD.ink; c.lineWidth = 4; c.strokeRect(m, m, W - 2 * m, H - 2 * m);
    c.lineWidth = 1.5; c.strokeRect(m + 10, m + 10, W - 2 * m - 20, H - 2 * m - 20);
  }
  let box = null;
  function picture(c, room, x, y, w, h) {
    box = [x, y, w, h];
    const [sx, sy, sw, sh] = crop(room, w / h);
    c.save(); c.imageSmoothingQuality = 'high';
    c.drawImage(room.canvas, sx, sy, sw, sh, x, y, w, h);
    c.restore();
    c.strokeStyle = CARD.ink; c.lineWidth = 3; c.strokeRect(x, y, w, h);
  }

  function drawPortrait(c, room, f) {
    const [W, H] = CARD.portrait, m = 36;
    frame(c, W, H, m);
    pixelTitle(c, 'SIGIL CAT', W / 2, 104, 9, CARD.ink);
    text(c, 'a room, as it is', W / 2, 204, { align: 'center', color: CARD.soft, weight: 700, size: 17, spacing: 5, upper: true });
    const px = 84, pw = W - 2 * px, ph = Math.round(Math.min(640, Math.max(500, pw / Math.max(1.35, Math.min(2.2, room.canvas.width / Math.max(1, room.bottom - room.top))))));
    picture(c, room, px, 236, pw, ph);
    let y = 236 + ph;
    if (f.ending) seal(c, W - px - 8, y - 6, 62);
    // the words below it (about 400 px from the title's top to the signs' foot), centred in what is left above the footer
    const left = H - m - 76 - y;
    y += Math.max(40, (left - 400) / 2) + 56;
    text(c, f.title, W / 2, y, { align: 'center', color: CARD.ink, size: 66, spacing: 2, upper: true, max: W - 2 * px });
    y += 56;
    text(c, f.ending ? ENDING_LINE + ' he slept.' : `“${f.remark}”`, W / 2, y, { align: 'center', color: CARD.dark, weight: 500, size: 28, spacing: 0.5, max: W - 2 * px });
    y += 66;
    const cols = [[f.found, `of ${f.finds} found`], [f.ach, `of ${f.achTotal} achievements`], [f.bonks.toLocaleString('en-US'), f.bonks === 1 ? 'bonk' : 'bonks']];
    cols.forEach(([n, label], i) => {
      const cx = px + pw * (i + 0.5) / 3;
      text(c, String(n), cx, y + 46, { align: 'center', color: CARD.ink, size: 54 });
      text(c, label, cx, y + 82, { align: 'center', color: CARD.soft, weight: 700, size: 15, spacing: 3.5, upper: true, max: pw / 3 - 16 });
    });
    y += 136;
    signRow(c, f, W / 2, y, 40, 30);
    text(c, f.date, px, H - m - 40, { color: CARD.soft, weight: 700, size: 16, spacing: 3, upper: true });
    text(c, CARD.address, W - px, H - m - 40, { align: 'right', color: CARD.soft, weight: 700, size: 16, spacing: 2, upper: true });
  }

  function drawLandscape(c, room, f) {
    const [W, H] = CARD.landscape, m = 30;
    frame(c, W, H, m);
    const px = 66, pw = W - 2 * px, top = 130, ph = 560;
    const tw = measure('SIGIL CAT') * 7;
    c.save(); c.translate(px, 62); drawText(c, 'SIGIL CAT', 0, 0, CARD.ink, { px: 7 }); c.restore();
    text(c, 'a room, as it is', px + tw + 28, 104, { color: CARD.soft, weight: 700, size: 15, spacing: 4.5, upper: true });
    text(c, f.date, W - px, 104, { align: 'right', color: CARD.soft, weight: 700, size: 15, spacing: 3, upper: true });
    picture(c, room, px, top, pw, ph);
    if (f.ending) seal(c, W - px - 10, top + ph - 4, 56);
    const y = top + ph + 70, half = pw * 0.5;
    text(c, f.title, px, y, { color: CARD.ink, size: 50, spacing: 2, upper: true, max: half - 20 });
    text(c, f.ending ? ENDING_LINE + ' he slept.' : `“${f.remark}”`, px, y + 40, { color: CARD.dark, weight: 500, size: 23, spacing: 0.5, max: half - 20 });
    text(c, CARD.address, px, y + 74, { color: CARD.soft, weight: 700, size: 12, spacing: 3, upper: true });
    const cols = [[f.found, `of ${f.finds} found`], [f.ach, `of ${f.achTotal} achievements`], [f.bonks.toLocaleString('en-US'), f.bonks === 1 ? 'bonk' : 'bonks']];
    const cw = (pw - half) / 3;
    cols.forEach(([n, label], i) => {
      const cx = px + half + cw * (i + 0.5);
      text(c, String(n), cx, y - 6, { align: 'center', color: CARD.ink, size: 42 });
      text(c, label, cx, y + 20, { align: 'center', color: CARD.soft, weight: 700, size: 12, spacing: 3, upper: true, max: cw - 10 });
    });
    signRow(c, f, px + half + (pw - half) / 2, y + 42, 28, 22);
  }

  const phoneish = () => !!site.shell?.phone || (matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) <= 600);
  let last = null;
  async function render({ ending = false, orientation = phoneish() ? 'portrait' : 'landscape' } = {}) {
    const room = captureRoom();      // first, before anything awaits: the room as it is right now
    const f = facts({ ending });
    await fontsIn();
    const [W, H] = CARD[orientation] || CARD.portrait;
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const c = out.getContext('2d');
    (orientation === 'landscape' ? drawLandscape : drawPortrait)(c, room, f);
    room.canvas.width = room.canvas.height = 0;     // let the capture go
    const blob = await new Promise((r) => out.toBlob(r, 'image/png'));
    const text = ['sigil cat', f.title, f.ending ? ENDING_LINE : f.remark, f.counts, f.date, CARD.address];
    last = { blob, width: W, height: H, orientation, text, facts: f, picture: box };
    journey.emit('snapshot', { width: W, height: H, ending: f.ending });
    return last;
  }

  // ---- the card on screen ----
  let pop = null, url = null, releaseFreeze = null, opener = null, opening = false, endingCard = false;
  const calm = () => stage.reducedMotion;
  const canShare = (file) => { try { return !!navigator.canShare?.({ files: [file] }) && typeof navigator.share === 'function'; } catch { return false; } };

  async function open({ ending = false } = {}) {
    if (pop || opening || (ending && endingCard)) return false;
    opening = true;
    if (ending) endingCard = true;
    try {
      if (site.books?.showing) site.books.close();
      opener = document.activeElement;
      const card = await render({ ending });
      flash();
      show(card);
      return true;
    } finally { opening = false; }
  }
  function flash() {
    if (calm()) return;
    const f = document.createElement('div'); f.className = 'room-flash'; document.body.append(f);
    f.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: CARD.flashMs, easing: 'ease-out' }).finished.finally(() => f.remove());
  }
  function show(card) {
    url = URL.createObjectURL(card.blob);
    const file = new File([card.blob], CARD.file, { type: 'image/png' });
    const sharing = canShare(file);
    pop = document.createElement('div');
    pop.className = `book-pop room-pop ${card.orientation}`;    // .book-pop: the page's input lock lets presses through
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-label', 'my room');
    pop.innerHTML = `<figure class="room-card" tabindex="-1">
      <img src="${url}" width="${card.width}" height="${card.height}" alt="${esc(card.text.join('. '))}">
      <figcaption>
        <p class="room-note">${card.facts.ending ? 'the room was full. here it is.' : 'your room, as it is. keep it.'}</p>
        <div class="room-row">
          ${sharing ? '<button type="button" class="pill felt primary" data-room-share>share</button>' : ''}
          <button type="button" class="pill felt${sharing ? '' : ' primary'}" data-room-save>save</button>
          <button type="button" class="pill felt" data-room-close>close</button>
        </div>
      </figcaption></figure>`;
    document.body.append(pop);
    document.body.classList.add('room-card-open');
    releaseFreeze = site.freeze?.reasons?.includes('book') ? null : site.freeze?.hold('book');   // the books' hold: the music plays on
    site.input?.lock('room-card', true);
    pop.addEventListener('click', (e) => {
      const b = e.target.closest?.('[data-room-save], [data-room-share], [data-room-close]');
      if (e.target === pop) return close();
      if (!b) return;
      if (b.matches('[data-room-close]')) close();
      else if (b.matches('[data-room-save]')) save();
      else if (b.matches('[data-room-share]')) share(file);
    });
    pop.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const items = [...pop.querySelectorAll('button')], i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && (i === items.length - 1 || i < 0)) { e.preventDefault(); items[0].focus(); }
    });
    pop.querySelector('.pill.primary')?.focus({ preventScroll: true });
    pop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: calm() ? 140 : 220, easing: 'ease-out' });
    if (!calm()) pop.querySelector('img').animate([{ transform: 'translateY(18px) rotate(-1.2deg) scale(.96)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1)' });
    journey.emit('snapshot-open', { ending: card.facts.ending });
  }
  function save() {
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = CARD.file; a.rel = 'noopener';
    (pop || document.body).append(a); a.click(); a.remove();   // inside the dialog: the page's input lock lets it through
    note('saved.');
  }
  async function share(file) {
    try { await navigator.share({ files: [file], title: 'sigil cat', text: `${last?.facts.title || ''} · sigil cat` }); note('sent.'); }
    catch (e) { if (e?.name !== 'AbortError') { note('it would not go. saving it instead.'); save(); } }
  }
  function note(s) { const n = pop?.querySelector('.room-note'); if (n) n.textContent = s; }
  function close() {
    if (!pop) return false;
    const was = pop; pop = null;
    document.body.classList.remove('room-card-open');
    site.input?.lock('room-card', false);
    const r = releaseFreeze; releaseFreeze = null; r?.();
    was.style.pointerEvents = 'none';
    const out = was.animate([{ opacity: 1 }, { opacity: 0 }], { duration: calm() ? 100 : 160, easing: 'ease-in', fill: 'forwards' });
    const u = url; url = null;
    let gone = false;
    const drop = () => { if (gone) return; gone = true; was.remove(); if (u) URL.revokeObjectURL(u); };
    out.finished.then(drop, drop); wallClock.setTimeout(drop, 400);   // (an animation can be held by a freeze)
    if (opener?.isConnected && !opener.closest('.book-pop')) opener.focus({ preventScroll: true }); else stage.canvas.focus({ preventScroll: true });
    opener = null;
    journey.emit('snapshot-close');
    return true;
  }
  site.input?.onEscape?.push(() => { if (pop) close(); });

  // ---- "my room" in the grimoire: a button in the header, by the tally ----
  journey.addSection('grimoire', {
    id: 'my-room', order: -100,
    // (a polygon, not a path: the grimoire's checks count every svg path in the book as a sigil drawing)
    html: () => '<button type="button" class="felt my-room" data-my-room><svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="4,8 7,8 8.6,5.8 15.4,5.8 17,8 20,8 20,19 4,19"/><circle cx="12" cy="13.2" r="3.4"/></svg>my room</button>',
    mount(el, sheet) {
      const b = el.querySelector('[data-my-room]'), head = sheet.querySelector('header .head-r');
      if (b && head) { head.append(b); el.hidden = true; }
      // (not on to the book's own click handler: the sheet is a [data-book] itself, and would open the book again)
      b?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open(); });
    },
  });

  // The ending card is opened by src/journey/ending.js alone, a few seconds after 'ending-done' (Goodnight's stamp gets
  // its moment). There used to be an 'ending-done' listener here as well: it opened the card at once, the card's freeze
  // held ending.js's own timer, and closing the card let that timer open a second one (playtest: "it popped up again").
  // So: one opener, and an ending card at most once per ending (reset when the next ending starts), whoever asks.
  journey.on('ending-start', () => { endingCard = false; });

  return { render, open, close, get showing() { return !!pop; }, get last() { return last; }, facts, CARD };
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
