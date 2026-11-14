// Gags lane, playtest 3 (2026-11-13): the loaf and its crumbs, the blast-off's cover. Run with checks/lib.js.
//   1. the loaf sigil: the riser builds while he is still the cat; he becomes bread on the pop at its end (e1113-06)
//   2. crumbs: on every second loaf, at most one pile, spilled out of the bread as he turns back, at once
//   3. the blast-off: no riser and no pop; the dark covers everything exactly as the galaxy's does, the bread over it
cat.auto = false; cat.setButter(false, 'quiet');
const B = E.bread, g = E.galaxy, T = site.THREE, overlay = stage.scene.getObjectByName('galaxy');
await B.whenReady(); await audio.loadAll(['bread-riser', 'bread-pop']);
const started = [], nativeStart = AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start = function (...a) { started.push({ buffer: this.buffer, at: a[0] ?? 0, offset: a[1] ?? 0, real: performance.now() }); return nativeStart.apply(this, a); };
const nameOf = (b) => ['bread-riser', 'bread-pop', 'ding', 'twinkle', 'tap-pop'].find((n) => audio.buffer(n) === b) || 'other';
const ctx = audio.context();
store.del('loaves'); keepsakes.take('crumbs');

// ---- 1. the loaf: riser, then bread on the pop ----
await until(settled, 8000);
const s0 = started.length, c0 = ctx.currentTime;
let swapAt = null, rising = 0;
const watch = () => { if (B.isRising) rising++; if (swapAt === null && cat.standIn) swapAt = ctx.currentTime; };
stage.onFrame.push(watch);
const r = await drawSigil('dome');
await sleep(1500);
const stillCat = B.state === 'rising' && !cat.standIn;
const popped = await B.whenBread();
await sleep(200); stage.onFrame.splice(stage.onFrame.indexOf(watch), 1);
const loaf = started.slice(s0).map((s) => ({ ...s, name: nameOf(s.buffer) }));
const riser = loaf.find((s) => s.name === 'bread-riser'), pop = loaf.find((s) => s.name === 'bread-pop'), R = B.config.rise.riser, windup = R.end - R.from;
check('bread the loaf sigil starts the riser while he is still the cat', r.name === 'dome' && !!riser && Math.abs(riser.offset - R.from) < 1e-6 && stillCat && rising > 10,
  `drew ${drew(r)}; riser from ${riser?.offset} s; ${rising} rising frames; at 1.5 s he is ${stillCat ? 'still the cat' : B.state}`);
check('bread the pop lands on the riser\'s end, and he becomes bread on it', popped && !!pop && Math.abs(pop.at - riser.at - windup) < 0.02 && swapAt !== null && Math.abs(swapAt - pop.at) < 0.07 && B.isBread,
  pop ? `pop ${(pop.at - riser.at).toFixed(3)} s after the riser (${windup.toFixed(2)}); bread ${((swapAt - pop.at) * 1000).toFixed(0)} ms from the pop` : 'no pop');
check('bread no ding on the swap any more: the pop is the sound', !loaf.some((s) => s.name === 'ding'), loaf.map((s) => s.name).join(', '));
await __shot('bread-loaf');

// ---- 2. crumbs on every second loaf ----
async function loafBack() {   // a loaf, tapped back to the cat; resolves with how long the crumbs took (or null)
  await until(settled, 8000); B.now('check'); await B.whenBread(); await sleep(250);
  const m = catMid(); await tap(m.x, m.y); const back = performance.now();
  await until(() => B.state === 'cat' && !cat.standIn, 3000);
  const came = await until(() => keepsakes.get('crumbs')?.worldReady, 1500, 10);
  return came ? performance.now() - back : null;
}
{ const m = catMid(); await tap(m.x, m.y); }                                // the first loaf (above), tapped back
await until(() => B.state === 'cat' && !cat.standIn, 3000);
const first = !(await until(() => keepsakes.has('crumbs'), 1200));
const ms = await loafBack();                                                 // the second loaf
const crumbs = keepsakes.get('crumbs'), spill = B.spilled;
const p = crumbs?.worldEntry && new T.Vector3().copy(crumbs.worldEntry.body.translation());
check('bread the first loaf leaves no crumbs; the second does, at once', first && ms !== null && ms < 450, `crumbs ${ms?.toFixed(0)} ms after he turns back`);
check('bread the crumbs come out of the bread: from its middle height, in front of him', !!spill && spill.from.y > 0.15 && spill.from.z > 0.3,
  spill ? `from ${spill.from.toArray().map((v) => v.toFixed(2)).join(', ')}` : 'not spilled');
const rested = await until(() => crumbs?.worldEntry?.body.isSleeping(), 6000);
const at = crumbs && stage.toScreen(new T.Vector3().copy(crumbs.worldEntry.body.translation()));
check('bread the crumbs land on the floor in front of him, on the page', rested && at.y > site.cat.screenOf([0, 0, 0]).y && at.y < stage.height - stage.insets.bottom && at.x > 0 && at.x < stage.width,
  `at ${at?.x.toFixed(0)}, ${at?.y.toFixed(0)}; his feet at ${site.cat.screenOf([0, 0, 0]).y.toFixed(0)}`);
await __shot('bread-crumbs');
const spills = () => B.spilled;
const before = spills();
await loafBack(); await loafBack();                                         // the third and fourth: one pile at most
check('bread one pile at most: the fourth loaf finds crumbs there and spills none', keepsakes.has('crumbs') && spills() === before, `loaves ${store.get('loaves')}`);
keepsakes.take('crumbs'); await loafBack(); const fifth = !keepsakes.has('crumbs');
const sixth = await loafBack();
check('bread with the pile gone, the next second loaf spills a new one', fifth && sixth !== null, `loaves ${store.get('loaves')}`);
keepsakes.take('crumbs');
{ const R6 = E.recycle.state, count = R6.count; R6.count = E.recycle.config.total;   // recycling's six done
  await loafBack(); const none = await loafBack(); R6.count = count;
  check('bread after recycling\'s six stars no crumbs come', none === null && !keepsakes.has('crumbs'), `loaves ${store.get('loaves')}`); }

// ---- 3. the blast-off covers everything, like the galaxy ----
await until(settled, 8000); B.now('check'); await B.whenBread(); await sleep(200);
const b0 = started.length, sprite = cat.sprite, order0 = sprite.renderOrder;
const gl = stage.renderer.getContext();
async function pixels(points) {
  let out = null;
  const f = () => { const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); out = { w, h, px }; };
  stage.onPresented.push(f); await until(() => out, 3000, 10); stage.onPresented.splice(stage.onPresented.indexOf(f), 1);
  // the darkest of a 5x5 drawing-buffer patch round each probe: the space has stars, one of which can sit on the probe's
  // own pixel (the fx lane's star field put one there on a phone: 28/255), while anything left uncovered is far bigger
  // than the patch (integration, playtest-3)
  const at = (X, Y) => { const i = (Y * out.w + X) * 4; return Math.max(out.px[i], out.px[i + 1], out.px[i + 2]); };
  return points.map(([x, y]) => { const X = Math.round(x * stage.dpr), Y = Math.round(out.h - y * stage.dpr); let m = 255;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) m = Math.min(m, at(Math.min(out.w - 1, Math.max(0, X + dx)), Math.min(out.h - 1, Math.max(0, Y + dy)))); return m; });
}
const furniture = ['shelf', 'pinboard'].map((id) => keepsakes.get(id)?.picture?.rect || site[id]?.picture?.rect).filter((r) => r?.w > 0);
const probes = [[stage.width * 0.05, stage.height * 0.5], [stage.width * 0.95, stage.height * 0.6], ...furniture.map((r) => [r.x + r.w / 2, r.y + r.h / 2])];
const blast = B.blastOff();
await until(() => B.flight && B.flight.u > 0.15, 10000, 10);
const during = { dim: g.dim, order: overlay.renderOrder, dark: g.uniforms.uDark.value, lifted: sprite.renderOrder > overlay.renderOrder && !sprite.material.depthTest,
  showing: document.body.classList.contains('galaxy-showing'), stickers: getComputedStyle(document.getElementById('stickers') || document.body).opacity,
  chrome: [...document.querySelectorAll('.top > *, #front')].filter((e) => getComputedStyle(e).opacity > 0.05).length };
const dark = await pixels(probes);
await __shot('bread-blast-covered');
await blast; await until(() => B.state === 'cat' && !input.locked && !g.dim, 15000);
const blastSounds = started.slice(b0).map((s) => nameOf(s.buffer));
check('bread the blast-off plays no riser and no pop (they belong to the loaf now)', !blastSounds.includes('bread-riser') && !blastSounds.includes('bread-pop'), blastSounds.join(', '));
check('bread the blast-off dark covers everything as the galaxy\'s does', during.dim > 0.99 && during.order === 1e6 && during.dark === 1 && during.showing && during.chrome === 0 && dark.every((v) => v < 24),
  JSON.stringify({ ...during, probes: dark }));
check('bread the bread is drawn over the dark', during.lifted, `sprite order ${sprite.renderOrder}`);
check('bread afterwards the page is back as it was', sprite.renderOrder === order0 && sprite.material.depthTest && !document.body.classList.contains('galaxy-showing') && !overlay.visible && keepsakes.has('twinkle'));
AudioBufferSourceNode.prototype.start = nativeStart;
