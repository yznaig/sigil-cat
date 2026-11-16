// Touchfeel lane (playtest 4, 2026-11-14), item 5. Aaron (on his phone): "The star stickers all be straight, all of
// them are at a slight angle and I dont like it". Every sticker (the bread's gold star and the six recycling stars)
// rests at 0 degrees: when given, after a reload of the layout (a resize), after a drag, and after the tap's tilt and
// glint, which still plays and ends straight. Desktop at 1280x900; the phone run also at 932x430.
cat.auto = false;
const { RECYCLE, stickerId } = await import('/src/gags/recycle.js');
const ids = ['twinkle', ...RECYCLE.tiers.map((_, n) => stickerId(n + 1))];
for (const [k, id] of ids.entries()) keepsakes.give(id, { at: keepsakes.toUnits(stage.width * (.15 + .1 * k), stage.height * (k % 2 ? .3 : .55)) });
await sleep(900);   // the arrival pop is over
// its turn on the page: the sticker's own transform and its face's, outside any running animation (0 = upright)
// (the transform's turn plus the CSS `rotate` property, which the keepsake wiggle animates)
const angle = (el) => { const cs = getComputedStyle(el), m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform); return Math.atan2(m.b, m.a) * 180 / Math.PI + (cs.rotate === 'none' ? 0 : parseFloat(cs.rotate) || 0); };
const turns = () => ids.map((id) => { const el = keepsakes.get(id)?.el, face = el?.querySelector('.face'); return el ? +(angle(el) + (face.getAnimations().length ? 0 : angle(face))).toFixed(2) : null; });
const upright = (label) => { const t = turns(); check(`touchfeel stickers ${label}: all ${ids.length} rest upright (0 degrees)`, t.every((a) => a === 0), JSON.stringify(t)); };
check('touchfeel stickers: no sticker carries a tilt any more', RECYCLE.tiers.every((t) => !('tilt' in t)) && ids.every((id) => keepsakes.get(id)?.sticker && !('tilt' in keepsakes.get(id).sticker)));
upright(`${stage.width}x${stage.height}`);
await __shot('touchfeel-stickers');
// a tap still tilts it in 3D with the glint, and it comes back straight
const star = keepsakes.get('twinkle'), face = star.el.querySelector('.face'), r = star.el.getBoundingClientRect();
await __pointer([{ x: r.x + r.width / 2, y: r.y + r.height / 2 }]);
const tilting = face.getAnimations().length === 1;
await sleep(150); await __shot('touchfeel-stickers-tap');
await until(() => !face.getAnimations().length, 2000); await sleep(50);
check('touchfeel stickers: a tap still tilts it with the glint, and it ends straight', (stage.reducedMotion || tilting) && angle(face) === 0 && angle(star.el) === 0, `animated ${tilting}; face ${angle(face)}; sticker ${angle(star.el)}`);
// dragged and let go: still straight
{ const g = keepsakes.get(stickerId(2)), b = g.el.getBoundingClientRect(), p = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await __pointer(Array.from({ length: 8 }, (_, i) => ({ x: p.x + i * 12, y: p.y + i * 5 }))); await sleep(200); }
upright('after a drag');
if (MOBILE) { await __resize(932, 430); await sleep(600); upright('932x430'); await __shot('touchfeel-stickers-wide'); await __resize(844, 390); await sleep(400); }
