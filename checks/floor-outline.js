// floor-outline.js (floor lane, music round 2026-11-15, e1115-55: the mock-up's ink line, on the seven items that melt
// into the floor). Run with checks/lib.js, then checks/floor-outline-reload.js after the reload:
//   node checks/run.mjs <url>?dpr=N --lib checks/lib.js --js checks/floor-outline.js --then checks/floor-outline-reload.js
//     --size 1536x864|phone --storage '{"bird":{"seen":true,"away":-100000000,"gap":300000}}'
// The outline (src/world/floor-outline.js) is on by default and, with the items laid out on the floor in front of him:
//  1 the seven (recipe card, googly eyes, measure of flour, rejected paper, broken glass, cup of milk, light bulb) carry
//    it and nothing else does: the outline's state, and the canvas's pixels with it on and off (page clock held): round
//    each of the seven they change, round every other item not one pixel does
//  2 each of the seven stands out from the floor: the floormock lane's edge measure (median dE across the item's
//    outline, in the screen as shown) is at least 15 (before: 3-7), gated at dpr 1 where the mock-up measured
//  3 it costs nothing while the room is idle: no batch rebuild and no callback over a still window
//  4 it follows the item: while held, while flying after a throw, and where it lands; it goes while the card is pinned
//    to the board and comes back when it is taken off, without the card moving
// The reload half checks the seven still carry it after a reload (state and pixels).
const L = await import('/checks/floor-outline-lib.mjs');
const T = site.THREE, W = site.world, P = site.worldPresentation, FO = site.floorOutline, show = (o) => JSON.stringify(o);
check('outline is on by default', !!FO && FO.on && FO.INK.px === 1.4);
cat.auto = false;
if (cat.pose !== 'sit') { await cat.load('sit'); cat.request('sit'); stage.timeScale = 8; await until(() => cat.pose === 'sit' && cat.phase === 'hold', 20000); stage.timeScale = 1; }
const st = document.createElement('style'); st.textContent = '.ach-reveal{display:none!important}'; document.head.append(st);
const all = await L.layOut(site, MOBILE, {until, sleep});
const BD = E.bird; if (BD && BD.state !== 'waiting') { if (BD.state === 'flying') BD.leave(); await until(() => BD.state === 'waiting', 20000); }
document.activeElement?.blur(); ui.say?.(''); ui.speak?.(''); await sleep(800);
const missing = all.filter((id) => !keepsakes.get(id)?.picture?.card?.visible);
check('outline fixture: every item lies loose on the floor, drawn as its own picture', !missing.length, show({missing, support: all.filter((id) => keepsakes.get(id)?.worldEntry?.support)}));

// 1 which items carry it
const state = Object.fromEntries(all.map((id) => [id, FO.has(id) && FO.drawn(id)]));
check('outline on exactly the seven', L.SEVEN.every((id) => state[id]) && L.OTHERS.every((id) => !state[id]), show(state));
const sils = Object.fromEntries(all.map((id) => [id, L.silhouette(site, id)]));
const F = await L.frames(site), size = [F.A.w, F.A.h];
const lines = L.near(L.SEVEN.map((id) => sils[id]), Math.ceil(4 * L.rectOf(site, all[0]).k));
const px = {};
for (const id of all) px[id] = L.changed(F, L.rectOf(site, id, 6), L.SEVEN.includes(id) ? null : lines);
check('outline pixels round each of the seven', L.SEVEN.every((id) => px[id] >= 40), show(Object.fromEntries(L.SEVEN.map((id) => [id, px[id]]))));
check('outline leaves every other item untouched (pixels, off its neighbours\' lines)', L.OTHERS.every((id) => px[id] === 0), show(Object.fromEntries(L.OTHERS.map((id) => [id, px[id]]))));

// 2 contrast against the floor, in the screen as shown (outline off: before; on: after)
const ts = stage.timeScale; stage.timeScale = 0;
FO.set(false); await L.grab(site); await L.grab(site); await sleep(100); const off = await L.screen();
FO.set(true); await L.grab(site); await L.grab(site); await sleep(100); const on = await L.screen();
stage.timeScale = ts;
const measure = {};
const items = L.near(all.map((id) => sils[id]), 0, 64);
for (const id of all) { const r = L.rectOf(site, id, 8); measure[id] = {before: L.contrast(off, sils[id], r, items), after: L.contrast(on, sils[id], r, items)}; }
note('outline edge dE before/after (median dE / faint share / samples)', show(Object.fromEntries(all.map((id) => [id, `${measure[id].before.edge}/${measure[id].before.faint} -> ${measure[id].after.edge}/${measure[id].after.faint} (${measure[id].after.samples})`]))));
// Gated where the mock-up measured (dpr 1: 1536x864 and 844x390). At dpr 2 the eyes' clear plastic domes (25-60%
// alpha, no line round them by design: the line follows the white discs) count as silhouette and read ~13 there, so
// at dpr 2 and up the numbers are reported, with the opaque-only measure beside them (the eyes 28 on a phone).
const contrastOk = L.SEVEN.every((id) => measure[id].after.edge >= 15 && measure[id].after.samples >= 20), contrastLine = show(Object.fromEntries(L.SEVEN.map((id) => [id, measure[id].after.edge]))) + ' screen ' + show([on.w, on.h]) + ' buffer ' + show(size);
if (stage.dpr === 1) check('outline edge contrast of each of the seven >= 15', contrastOk, contrastLine);
else note('outline edge contrast of each of the seven (gated at dpr 1 only; dpr ' + stage.dpr + ')', contrastLine);
note('outline edge dE of the seven counting only their opaque parts (alpha > 200; a clear part such as the eyes\' plastic domes left out)', show(Object.fromEntries(L.SEVEN.map((id) => [id, L.contrast(on, sils[id], L.rectOf(site, id, 8), items, 200).edge]))));
await __shot('outline-floor');

// 3 nothing while idle: a still window with no rebuild, no pending batch and no new callback
let idle = false;
for (let attempt = 0; attempt < 6 && !idle; attempt++) {
  await until(() => !W.stats.listening && !P.pending && !P.listening, 10000);
  const before = P.stats.pictureBuilds, callbacks = [stage.onRender.length, stage.onFrame.length], dpr = stage.dpr; await sleep(2100);
  if (stage.dpr !== dpr) continue;
  idle = P.stats.pictureBuilds === before && !P.pending && !P.listening && stage.onRender.length === callbacks[0] && stage.onFrame.length === callbacks[1];
  if (!idle) note('outline idle window busy', show({builds: [before, P.stats.pictureBuilds], callbacks: [callbacks, [stage.onRender.length, stage.onFrame.length]], world: W.stats.listening}));
}
check('outline adds no work while the room is idle', idle);
// cost lines (no gate here: the speed gate is checks/world-final-cost.js): one batch rebuild, and the room's pictures
// drawn alone 300 times (synced by a pixel read), median of 5, with the outline on and off
{
  const R = stage.renderer, gl = R.getContext(), p4 = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p4);
  const scene = new T.Scene(), parent = P.root.parent, out = {};
  const time = (n = 300) => { sync(); const t = performance.now(); for (let i = 0; i < n; i++) R.render(scene, stage.camera); sync(); return (performance.now() - t) / n; };
  for (const v of [false, true]) {
    FO.set(v); P.flush();
    const t0 = performance.now(); for (let i = 0; i < 20; i++) { P.refresh(); P.flush(); } const rebuild = (performance.now() - t0) / 20;
    stage.paused = true; scene.add(P.root); time(20); const r = []; for (let k = 0; k < 5; k++) r.push(time());
    parent.add(P.root); stage.paused = false; r.sort((a, b) => a - b);
    out[v ? 'on' : 'off'] = {gpuMs: +r[2].toFixed(4), rebuildMs: +rebuild.toFixed(3), quads: P.stats.pictureQuads};
  }
  note('outline cost (the room\'s pictures alone; rebuild = one batch build)', show(out));
}

// 4 it follows the item. Held: a real press-and-drag on the recipe card, checked between moves.
{
  const id = 'recipe', i = keepsakes.get(id), e = i.worldEntry, {x, y} = L.hitPoint(site, id);
  const pid = 9001, to = {x: x + (x > stage.width / 2 ? -1 : 1) * Math.min(160, stage.width * .15), y: y - 30};
  fire('pointerdown', x, y, pid); let heldDrawn = true, held = false;
  for (let n = 1; n <= 16; n++) { await sleep(30); fire('pointermove', x + (to.x - x) * n / 16, y + (to.y - y) * n / 16, pid); if (W.held?.entry === e) { held = true; heldDrawn &&= FO.drawn(id); } }
  await sleep(60); const lifted = W.held?.entry === e && FO.drawn(id); fire('pointerup', to.x, to.y, pid, 0);
  check('outline stays on the card while it is held', held && heldDrawn && lifted, show({held, heldDrawn, lifted}));
  await until(() => e.body.isSleeping() && !W.stats.listening, 12000); await sleep(400);
  const F2 = await L.frames(site), n2 = L.changed(F2, L.rectOf(site, id, 6));
  check('outline on the card where it was dropped', FO.drawn(id) && n2 >= 40 && !e.support, show({pixels: n2, at: [Math.round(i.picture.rect.x), Math.round(i.picture.rect.y)]}));
}
// Thrown: the googly eyes flicked, checked in flight and where they land.
{
  const id = 'eyes', i = keepsakes.get(id), e = i.worldEntry, {x, y} = L.hitPoint(site, id);
  // sideways, away from him and slightly up (thrown at him, the eyes stick to his face: seated, no outline by design)
  const c = catMid(), dir = x > c.x ? 1 : -1, room = dir > 0 ? stage.width - 40 - x : x - 40, step = Math.max(8, Math.min(22, room / 7));
  const pts = Array.from({length: 7}, (_, n) => ({x: x + dir * n * step, y: y - n * 5}));
  flick(pts, 12); let flying = false, flyingDrawn = true;
  await until(() => { if (W.held?.entry !== e && !e.body.isSleeping() && i.picture.card.visible) { flying = true; flyingDrawn &&= FO.drawn(id); } return flying && e.body.isSleeping(); }, 12000, 16);
  await until(() => !W.stats.listening, 8000); await sleep(400);
  const F3 = await L.frames(site), n3 = L.changed(F3, L.rectOf(site, id, 6));
  check('outline stays on the eyes in flight and where they land', flying && flyingDrawn && FO.drawn(id) && n3 >= 40, show({flying, flyingDrawn, pixels: n3}));
}
// Seated: the rejected paper pinned to the board (no outline: it is drawn in the board's picture), then taken off
// without moving (the support's own event brings it back).
{
  const id = 'paper', i = keepsakes.get(id), e = i.worldEntry;
  await site.pinboard?.ensure?.();
  const pinned = site.supports.mount(e, 'pinboard', id, {animate: false}); await sleep(300); P.flush();
  const gone = pinned && !FO.has(id) && !FO.drawn(id);
  site.supports.detach(e, {wake: false}); P.flush(); const back = FO.drawn(id) && FO.has(id) && !e.support;
  check('outline goes while the paper is pinned and comes back when it is taken off', gone && back, show({pinned, gone, back}));
  W.wake(e); await until(() => e.body.isSleeping() && !W.stats.listening, 12000);
}
// leave the seven on the floor for the reload half (no __done here: it would end the run before the reload)
await sleep(1500);
