// The room card (unit sc/p9-share, docs/journey/design.md §6.1 and §7 unit 4): journey.snapshot.render() makes a real
// PNG of the room (wide enough, not one colour, the room and the cat in its picture, not the frame's paper); the card's
// words are the live title and totals; the grimoire's "my room" button opens it with save (a download) and, where the
// phone can share files, share (navigator.share with one PNG); { ending: true } adds the ending line; closing it leaves
// nothing behind (renderer.info.memory as before, frame time back to normal, input and the world free again).
// Seeded with a few finds, achievements and bonks by the runner (--storage) so the counts are not all zero.
// While the card is open the page is frozen (src/core/freeze.js) and page timers wait: waits here keep to the wall clock.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const wuntil = async (f, ms = 20000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(40); } return false; };
const J = site.journey;
check('share: the snapshot part is built', await until(() => typeof J?.snapshot?.render === 'function', 10000), Object.keys(J?.parts || {}).join());
const S = J.snapshot;
// the room settles first: GPU memory unchanged for 3 s (the room's own late loads are not the card's)
const memNow = () => JSON.stringify(stage.renderer.info.memory);
{ let m = memNow(), t = performance.now(); const t0 = t; while (performance.now() - t < 3000 && performance.now() - t0 < 30000) { await sleep(250); if (memNow() !== m) { m = memNow(); t = performance.now(); } } }
// frame time: the median of 60 frames
const frames = async (n = 60) => { const d = []; let t = performance.now(); for (let i = 0; i < n; i++) { await new Promise((r) => wallClock.requestAnimationFrame(r)); const now = performance.now(); d.push(now - t); t = now; } d.sort((a, b) => a - b); return d[n >> 1]; };
const ft0 = await frames();

// ---- the PNG ----
async function pixels(r) {
  const bmp = await createImageBitmap(r.blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
  return { w: bmp.width, h: bmp.height, at: (x, y, w, h) => g.getImageData(x, y, w, h).data };
}
const PAPER = [0xF7, 0xED, 0xE3];
const near = (d, i, rgb, tol = 2) => Math.abs(d[i] - rgb[0]) <= tol && Math.abs(d[i + 1] - rgb[1]) <= tol && Math.abs(d[i + 2] - rgb[2]) <= tol;
for (const orientation of ['portrait', 'landscape']) {
  const r = await S.render({ orientation });
  const p = await pixels(r);
  check(`share ${orientation}: render() gives a PNG at least 1000 px wide`, r.blob?.type === 'image/png' && p.w >= 1000 && p.w === r.width && p.h === r.height, `${r.blob?.type} ${p.w}x${p.h}`);
  const all = p.at(0, 0, p.w, p.h); let differ = 0;
  for (let i = 4; i < all.length; i += 4 * 97) if (Math.abs(all[i] - all[0]) + Math.abs(all[i + 1] - all[1]) + Math.abs(all[i + 2] - all[2]) > 24) differ++;
  check(`share ${orientation}: not one colour`, differ > 50, `${differ} sampled pixels differ from the corner`);
  // the middle of the room's picture: the room's paper and the cat, never the frame's paper
  const [x, y, w, h] = r.picture, mx = Math.round(x + w * 0.4), my = Math.round(y + h * 0.3), mw = Math.round(w * 0.2), mh = Math.round(h * 0.4);
  const mid = p.at(mx, my, mw, mh); let paper = 0, dark = 0, n = 0;
  for (let i = 0; i < mid.length; i += 16) { n++; if (near(mid, i, PAPER)) paper++; if (mid[i] + mid[i + 1] + mid[i + 2] < 150) dark++; }
  check(`share ${orientation}: the picture's middle is the room (the cat in it), not the frame colour`, paper / n < 0.2 && dark / n > 0.08, `frame-coloured ${(100 * paper / n).toFixed(1)}%, dark (the cat) ${(100 * dark / n).toFixed(1)}%`);
  const f = r.facts, A = site.achievements, found = registry.count(), bonks = Number(store.get('bonks', 0));
  check(`share ${orientation}: the card's words are the live title and totals and today's date`,
    f.title === J.title() && f.found === found && f.finds === registry.total && f.ach === A.count && f.achTotal === A.total && f.bonks === bonks
    && r.text.includes(J.title()) && r.text.includes(`${found} of ${registry.total} found · ${A.count} of ${A.total} achievements · ${bonks.toLocaleString('en-US')} bonks`)
    && r.text.some((t) => t === new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase()),
    JSON.stringify(r.text));
  }
const plain = await S.render(), ended = await S.render({ ending: true });
check('share: { ending: true } adds the ending line', ended.text.includes('the room was full.') && !plain.text.includes('the room was full.') && ended.facts.ending, JSON.stringify(ended.text));

// ---- the grimoire's "my room" button ----
const shareCalls = [], clicks = [];
Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d) => !!d?.files?.length });
Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { shareCalls.push(d); } });
document.addEventListener('click', (e) => { const a = e.target.closest?.('a[download]'); if (a) clicks.push({ name: a.download, href: a.href }); }, true);
site.books.open('grimoire');
const btn = await wuntil(() => document.querySelector('.book-sheet header [data-my-room]'), 4000) && document.querySelector('.book-sheet header [data-my-room]');
check('share: the grimoire has a "my room" button in its header', !!btn && /my room/.test(btn.textContent), btn?.outerHTML.slice(0, 80));
await __shot('share-grimoire');
btn.click();
check('share: "my room" opens the card (the book closes under it)', await wuntil(() => S.showing && document.querySelector('.room-pop img')?.complete, 8000) && !site.books.showing, `${S.showing} ${site.books.showing}`);
await wsleep(500);
const pop = document.querySelector('.room-pop'), img = pop.querySelector('img'), ir = img.getBoundingClientRect();
check('share: the card fits the screen, and is modal while open', ir.width > 100 && ir.left >= 0 && ir.top >= 0 && ir.right <= innerWidth + 1 && ir.bottom <= innerHeight + 1 && input.locked && J.busy() && pop.getAttribute('aria-modal') === 'true',
  `${Math.round(ir.left)},${Math.round(ir.top)} ${Math.round(ir.width)}x${Math.round(ir.height)} in ${innerWidth}x${innerHeight}`);
const buttons = [...pop.querySelectorAll('button')].map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent, ok: r.height >= 40 && r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('button') === b }; });
check('share: save, share and close are on screen, finger-sized and on top', buttons.length === 3 && buttons.every((b) => b.ok), JSON.stringify(buttons));
await __shot('share-open');
// save: a real press on the button; the page hands the browser a PNG to download
const save = pop.querySelector('[data-room-save]').getBoundingClientRect();
await __pointer([{ x: save.left + save.width / 2, y: save.top + save.height / 2 }]);
const dl = await wuntil(() => clicks.length, 3000);
let dlType = '';
if (dl) { try { dlType = (await (await fetch(clicks[0].href)).blob()).type; } catch (e) { dlType = 'fetch failed ' + e.message; } }
check('share: save downloads the card as a PNG', dl && clicks[0].name === 'sigil-cat-room.png' && dlType === 'image/png', JSON.stringify(clicks) + ' ' + dlType);
// share: navigator.share with exactly one PNG file
pop.querySelector('[data-room-share]').click();
const shared = await wuntil(() => shareCalls.length, 3000);
const files = shareCalls[0]?.files || [];
check('share: share sends one PNG file to the phone\'s share sheet', shared && files.length === 1 && files[0].type === 'image/png' && files[0].size > 10000 && /\.png$/.test(files[0].name), JSON.stringify(files.map((f) => [f.name, f.type, f.size])));
// close with Escape
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
check('share: Escape closes the card; input and the world are free again', await wuntil(() => !S.showing && !document.querySelector('.room-pop'), 3000) && !input.locked && !site.freeze.frozen,
  `${S.showing} locked ${input.locked} frozen ${site.freeze.frozen} left ${[...document.querySelectorAll('.room-pop')].map((p) => p.className + ' ' + p.style.pointerEvents + ' ' + p.getAnimations().map((a) => a.playState))}`);
await wsleep(800);
const ft1 = await frames();
// GPU memory across one whole card (render, open, close): the room loads things of its own on its own clock (a control
// run with no card at all grows by a geometry and 4 textures at ~8 s and ~23 s), so a cycle that one of those lands
// in is tried again, up to 4 times; the card must leave the counts as it found them in at least one clean cycle
const tries = [];
for (let i = 0; i < 4; i++) {
  const m0 = memNow();
  await S.open(); await wuntil(() => S.showing, 8000); await wsleep(300); S.close(); await wuntil(() => !document.querySelector('.room-pop'), 3000); await wsleep(300);
  tries.push([m0, memNow()]);
  if (m0 === memNow()) break;
}
check('share: no render target or texture left behind by a card', tries.some(([a, b]) => a === b), JSON.stringify(tries));
check('share: frame time back to normal after the card', ft1 < Math.max(ft0 * 1.5, ft0 + 6), `${ft0.toFixed(1)} ms before, ${ft1.toFixed(1)} ms after (median)`);

// without share support: only save and close. The ending card has one opener, src/journey/ending.js (a few seconds
// after 'ending-done'): 'ending-done' alone opens nothing here, and an ending card shows once per ending
Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
J.emit('ending-done', {});
await wsleep(1500);
check('share: ending-done alone opens no card (the ending is its one opener)', !S.showing && !document.querySelector('.room-pop'), `${S.showing}`);
const endOpened = await S.open({ ending: true });
check('share: the ending card opens', endOpened && await wuntil(() => S.showing && document.querySelector('.room-pop img'), 8000) && S.last.facts.ending, `${S.showing}`);
await wsleep(500);
const noShare = !document.querySelector('.room-pop [data-room-share]') && !!document.querySelector('.room-pop [data-room-save].primary');
check('share: with no file sharing, save is the main button and there is no share', noShare);
await __shot('share-ending');
S.close();
check('share: closed again', await wuntil(() => !document.querySelector('.room-pop'), 3000) && !input.locked);
check('share: a second ending card for the same ending is refused', await S.open({ ending: true }) === false && !S.showing && !document.querySelector('.room-pop'), `${S.showing}`);
