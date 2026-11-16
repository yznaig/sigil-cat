// Touchfeel lane (playtest 4, 2026-11-14), item 2. Aaron: "If youre on mobile, there should be no bandaid for when
// you drag your finger around". After a bite: on a phone a real finger dragged round the room shows no plaster at all
// (none follows the finger, none rests by the controls); the mouse pointer still wears its plaster. Nothing that comes
// from the bite is lost on a phone: the bite find, Purr-fect, the tin, the saved plaster and his refusal to be petted.
cat.auto = false;
const P = E.petbite, A = site.achievements;
P.again(); await sleep(200);
check('touchfeel plaster: a bite leaves the plaster saved, the bite found, Purr-fect earned, the tin given',
  P.plastered && store.get('plaster') === true && registry.has('bite') && A.has('purr') && await until(() => keepsakes.has('tin'), 3000),
  `plastered ${P.plastered}; bite ${registry.has('bite')}; purr ${A.has('purr')}; tin ${keepsakes.has('tin')}`);
// anything on the page that draws a plaster, other than the mouse cursor and the tin itself
const plasters = () => [...document.querySelectorAll('.touch-plaster, [aria-label*="plaster" i]')].filter((el) => !el.closest('.keepsake-key, .keys, [data-keepsake]') && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0);
const seen = [], cursors = new Set();
const watch = (e) => { if (e.buttons) { seen.push(plasters().length); cursors.add(getComputedStyle(canvas).cursor.includes('data:image/svg+xml')); } };
addEventListener('pointermove', watch, true);
// a drag across open air, the way a finger wanders over the room (real touches on a phone, the real mouse on desktop)
const y = stage.height * .55, path = Array.from({ length: 16 }, (_, i) => ({ x: stage.width * (.12 + .5 * i / 15), y: y + Math.sin(i / 2) * 30 }));
await __pointer(path); await sleep(100);
removeEventListener('pointermove', watch, true);
if (MOBILE) {
  check('touchfeel plaster: on a phone no plaster follows the dragged finger or rests anywhere', seen.length >= 8 && seen.every((n) => n === 0) && plasters().length === 0 && !document.querySelector('.touch-plaster'),
    `${seen.length} moves sampled; plasters seen ${Math.max(0, ...seen)}`);
} else {
  check('touchfeel plaster: the mouse pointer still wears its plaster while dragging', seen.length >= 8 && cursors.size === 1 && cursors.has(true) && seen.every((n) => n === 0),
    `${seen.length} moves; cursor plaster ${[...cursors]}`);
}
await __shot('touchfeel-plaster');
// he still refuses to be petted after the bite (the bite's lasting effect, on any device)
const h = cat.height, spot = [.45, .35, .55].map((k) => cat.screenOf([0, h * k, 0])).find((q) => cat.hitTest(q.x, q.y) && !E.harp?.whiskerAt(q.x, q.y));
const b0 = P.bites, s0 = P.strokes;
await __pointer(Array.from({ length: 18 }, (_, i) => ({ x: spot.x + 1, y: spot.y + (i % 6 < 3 ? i % 6 : 6 - i % 6) * 14 - 20 })));
await sleep(100);
check('touchfeel plaster: after the bite, strokes are refused (no purr, no second bite)', P.strokes > s0 && P.bites === b0 && P.purr === 0, `strokes ${P.strokes - s0}; bites ${P.bites - b0}; purr ${P.purr}`);
