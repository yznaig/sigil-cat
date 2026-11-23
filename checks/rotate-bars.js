// rotate-bars.js (loadbars lane, p8 follow-up; Aaron, iPhone: "a big white bar similar to that first screenshot at the
// bottom of my flipped screen. It might've been because I flipped my screen too early"). iPhone Safari fills its own
// bar strips (under the status bar, where its toolbar sits) with the page's root background colour, not with our fixed
// layers. On the light paper that is invisible; under one of the grey sheets that come and go around a rotation ("flip
// sideways", the full-screen hint, "turn silence off for sound", a book) it showed as a light band. So at every moment
// of a rotation the screen's top and bottom edges must match the root background colour (and the theme-color, which
// older Safari uses for the same strips), and the room must be laid out for the screen it is on.
// Run at --size phone-portrait with ?doors=hold&fs=1&silence=1, no --lib (the page is frozen at times: wall clock).
// Rotation is emulated by resizing the viewport, the toolbar's late change by a second resize 80px off (the visible
// height settles after the turn), and the safe areas as on an iPhone (Emulation.setSafeAreaInsetsOverride).
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(20); } return false; };
const check = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
const P = [390, 844], L = [844, 390], BAR = 80;
const INSETS = { up: { top: 59, bottom: 34, left: 0, right: 0 }, side: { top: 0, bottom: 21, left: 47, right: 47 } };

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const hex = (s) => s.startsWith('#') ? [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)) : rgb(s);
const grab = async () => {
  const img = new Image(); img.src = 'data:image/png;base64,' + await __png(); await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  return { w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data, k: c.width / innerWidth };
};
// the median colour of a band of device-pixel rows (text or a hairline in it does not move a median)
const median = (g, y0, y1) => [0, 1, 2].map((ch) => { const v = []; for (let y = y0; y < y1; y++) for (let x = 0; x < g.w; x += 3) v.push(g.d[(y * g.w + x) * 4 + ch]); v.sort((a, b) => a - b); return v[v.length >> 1]; });
const off = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

let fails = 0;
async function measure(tag, { room = false } = {}) {
  await wsleep(450);
  const g = await grab(), e = Math.max(1, Math.round(2 * g.k));
  const top = median(g, 0, e), bottom = median(g, g.h - e, g.h);
  // the canvas's background (CSS): the root element's, or the body's when the root has none
  const bg = (el) => getComputedStyle(el).backgroundColor, clear = (c) => /^rgba\(.*, 0\)$|^transparent$/.test(c);
  const root = rgb(clear(bg(document.documentElement)) ? bg(document.body) : bg(document.documentElement));
  const theme = hex(document.querySelector('meta[name="theme-color"]')?.content || '#000');
  const worst = Math.max(off(top, root), off(bottom, root), off(top, theme), off(bottom, theme));
  const what = ['turn', 'silence', 'fs-step'].filter((id) => document.getElementById(id)).concat(document.querySelector('.book-pop') ? ['book'] : [], document.getElementById('loader') ? ['loader'] : []);
  // 14 levels: the room's warm glow at the bottom edge is a little off the paper (by design, 12 on main); a book's
  // shadow darkens the bottom edge under its sheet, so its colour sits between its top and bottom edges (up to 18)
  const ok = worst <= (what.includes('book') ? 18 : 14);
  if (!ok) fails++;
  check(`rotate-bars ${tag}: the screen's top and bottom edges are the colour Safari fills its bars with (root background, theme-color)`, ok,
    JSON.stringify({ size: [innerWidth, innerHeight], showing: what, top, bottom, root, theme, worst }));
  if (room) {
    const S = window.site, c = S.stage.canvas, r = c.getBoundingClientRect();
    const laid = S.freeze.frozen || (S.stage.width === innerWidth && S.stage.height === innerHeight && c.style.width === '' && c.style.height === '' && r.width === innerWidth && r.height === innerHeight);
    check(`rotate-bars ${tag}: the room is laid out for this screen (the canvas the whole screen, its picture this size)`, laid,
      JSON.stringify({ stage: [S.stage.width, S.stage.height], css: [c.style.width, c.style.height], rect: [r.width, r.height], frozen: S.freeze.frozen }));
  }
}
// a turn as on an iPhone: the new size with the toolbar still in, then the visible height settles
async function turn(to, tag, opts) {
  const [w, h] = to === 'side' ? L : P;
  await __safeArea(INSETS[to]);
  await __resize(w, h - BAR);
  await wsleep(120);
  await __resize(w, h);
  await measure(`${tag} (turned ${to === 'side' ? 'on its side' : 'upright'})`, opts);
}

await until(() => window.site?.stage, 60000);
const S = window.site, { shell } = S;
check('rotate-bars this run is a phone held upright, mid-load', matchMedia('(pointer: coarse)').matches && innerHeight > innerWidth && !!document.getElementById('loader'), `${innerWidth}x${innerHeight}`);
await __safeArea(INSETS.up);
await measure('loading, upright');
await turn('side', 'loading');
await turn('up', 'loading');
await until(() => S.stage.loaded && S.fullscreen && S.silence, 60000);
shell.go();
await until(() => shell.turnShown, 5000);
await measure('loaded upright: "flip sideways" over the loading screen');
await __shot('rotate-bars-turn');
await turn('side', 'flip sideways answered: the full-screen hint');
check('rotate-bars the full-screen hint is up', !!document.getElementById('fs-step'), shell.log.join(' > '));
await __shot('rotate-bars-fs-step');
await turn('up', 'the full-screen hint, turned back upright');
await turn('side', 'the full-screen hint again');
document.querySelector('[data-fs="later"], #fs-step button')?.click();
await until(() => !!document.getElementById('silence'), 5000);
await measure('"turn silence off for sound"');
await __shot('rotate-bars-silence');
await until(() => !document.getElementById('silence'), 6000);
// just as the loading screen hands off to the room: the doors part
await until(() => shell.log.includes('pop'), 8000);
await turn('up', 'as the doors part');
await turn('side', 'as the doors part, back on its side', { room: true });
await until(() => shell.revealed, 10000);
await wsleep(800);
await measure('the room', { room: true });
await turn('up', 'the room');
await turn('side', 'the room', { room: true });
// the toolbar coming and going in the room
await __resize(L[0], L[1] - BAR); await measure('the room, toolbar in', { room: true });
await __resize(...L); await measure('the room, toolbar out', { room: true });
await __shot('rotate-bars-room');
// a book open over the room, turned both ways
S.books.open('grimoire');
await until(() => !!document.querySelector('.book-pop'), 3000);
await measure('a book open', { room: true });
await __shot('rotate-bars-book');
await turn('up', 'a book open');
await turn('side', 'a book open', { room: true });
S.books.close();
await until(() => !document.querySelector('.book-pop'), 3000);
await measure('the book closed', { room: true });
check('rotate-bars no band at any moment of any turn', fails === 0, `${fails} moment(s) with a band`);
