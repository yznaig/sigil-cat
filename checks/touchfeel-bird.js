// Touchfeel lane (playtest 4, 2026-11-14), item 3. Aaron: "The bird is the perfect size on desktop but its way too big
// on mobile". The distant bird keeps the size it has next to the egg on a 1280x900 page at every screen: measured on
// this page at 1280x900, a phone on its side (844x390) and a wide-notch phone (932x430), against the egg the bird
// let go (its picture's width, less the picture's 5 px pad). And it still flies in from past the right edge.
// Needs ?birdcheck=1 (the bird's own fixture skip).
cat.auto = false;
const B = E.bird, own = [stage.width, stage.height];
B.debug.skipTo(89.4); await until(() => B.state === 'flying', 4000);
await until(() => keepsakes.has('egg'), 8000); const egg = keepsakes.get('egg'); await egg?.worldTask;
await until(() => egg.worldEntry.body.isSleeping(), 12000); await sleep(300);
const rows = [];
for (const [w, h] of [[1280, 900], [844, 390], [932, 430]]) {
  await __resize(w, h); await sleep(700);
  const el = document.querySelector('.distant-bird'), eggW = egg.picture.rect.w - 5;
  rows.push({ size: `${w}x${h}`, bird: B.size, box: el?.offsetWidth, egg: eggW, ratio: +(B.size / eggW).toFixed(3) });
}
await __resize(...own); await sleep(700);
const [desk, ...phones] = rows;
check('touchfeel bird: on a 1280x900 page it is the size Aaron called perfect (70 px)', desk.bird === 70 && desk.box === 70, JSON.stringify(desk));
check('touchfeel bird: on phones it keeps its desktop size next to the egg (within 15%)',
  phones.every((r) => r.box === r.bird && Math.abs(r.ratio / desk.ratio - 1) <= 0.15 && r.bird < 40), JSON.stringify(rows));
// at this run's own size: it flies in from past the right edge, and its egg lands as before
B.leave(); await until(() => B.state === 'waiting', 5000);
if (keepsakes.has('egg')) keepsakes.take('egg');
B.debug.skipTo(89.4); await until(() => B.state === 'flying' && document.querySelector('.distant-bird'), 4000);
const xs = []; for (let i = 0; i < 12; i++) { const r = document.querySelector('.distant-bird')?.getBoundingClientRect(); if (r) xs.push(Math.round(r.left)); await sleep(stage.reducedMotion ? 60 : 120); }
check('touchfeel bird: it still flies in from past the right edge', stage.reducedMotion || (xs[0] >= stage.width - 4 && xs.at(-1) < xs[0]), `${stage.width} px wide; left edge ${xs.join(' ')}`);
await until(() => keepsakes.has('egg'), 6000); await sleep(stage.reducedMotion ? 300 : 1400);
await __shot('touchfeel-bird');
