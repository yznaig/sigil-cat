// The recycling bin and its gold stars (e1111-58; playtest 2). While the bread crumbs or the broken glass lie about, a
// small blue recycling bin slides in at the bottom right (fixed furniture). Drag either over it: a "Release to
// recycle" box covers the whole bin, like the shelf's "Release to place"; let go and it drops in and is gone. Every
// one put in earns a gold star sticker, stuck on the screen (src/world/stickers.js), six in all: GOOD JOB, GREAT JOB!,
// THANK YOU!, then WOW, WOW, WOW, and he says each one. With nothing left to recycle the bin slides away, and comes
// back when there is. After the sixth it leaves for good, the achievement is earned, and the glass and the bread
// leave no more shards or crumbs. All of it is remembered.
import {bakeSolid} from '../world/solid.js';
import {createMeshPicture} from '../core/mesh-picture.js';
import {defineSticker, stickerLayer} from '../world/stickers.js';
import {puff} from '../core/puff.js';
import {css} from '../core/util.js';
import {clearFootprint} from '../flappy/stand.js';
const BIN = { margin: 18, slide: .7, leaveAfter: 2.4, pad: 16 };
// The six stars: their words, what he says, its slight turn, and `spot` (fractions of the screen): only its keepsake
// home now. Nothing goes straight onto the pinboard (cards lane, playtest 3: "they should always be droped for the
// player"), and the old spots were on the board, so a star hops out of the bin and lands on the floor beside it
// (landing() below), for the player to stick wherever they like.
export const RECYCLE = {
  total: 6,
  tiers: [
    { lines: ['GOOD', 'JOB!'], said: 'good job.', spot: [.86, .32], tilt: -6 },
    { lines: ['GREAT', 'JOB!'], said: 'GREAT JOB!', spot: [.95, .44], tilt: 7 },
    { lines: ['THANK', 'YOU!'], said: 'THANK YOU!', spot: [.86, .56], tilt: -3 },
    { lines: ['WOW'], said: 'WOW', spot: [.77, .44], tilt: 9 },
    { lines: ['WOW'], said: 'WOW', spot: [.77, .22], tilt: -10 },
    { lines: ['WOW'], said: 'WOW', spot: [.95, .2], tilt: 4 },
  ],
};
const ITEMS = ['crumbs', 'shards'];
export const stickerId = (n) => (n === 1 ? 'goodjob' : 'goodjob-' + n);
// The outline is the furniture's own drop outline (.support-preview, src/core/world-input.js) round the whole bin, one
// look for every drop target (integration, playtest-2); only the words are the bin's.
css('recycle', `.support-preview.recycle-preview{color:#39543e;font:600 12px system-ui;letter-spacing:0;text-transform:none;white-space:nowrap;display:grid;place-items:end center;padding:4px;overflow:visible}`);
export default function createRecycle(site) {
  const { THREE: T, stage, world, keepsakes, store, audio, supports } = site;
  const state = Object.assign({ shown: false, count: undefined, gone: false }, store.get('recycle') || {});
  // Saves from before the six: the one GOOD JOB star counts as the first; the bin only leaves for good after six.
  if (state.count === undefined) state.count = state.sticker ? 1 : 0;
  if (state.count < RECYCLE.total) state.gone = false;
  const save = () => { store.set('recycle', { shown: state.shown, count: state.count, gone: state.gone }); store.flush(); };
  const done = () => state.count >= RECYCLE.total;
  audio.loadAll(['whoosh', 'box-thud', 'paper', 'rattle', 'twinkle', 'bell']);   // bell: the stickers' tap (fx lane, playtest 3)
  let bin = null, task = null, leaving = null, prompt = null, booting = true;
  const stats = { slides: 0, leaves: 0, binned: [], refused: 0 };

  // ---- the stars ----
  RECYCLE.tiers.forEach((t, n) => defineSticker(site, { id: stickerId(n + 1), label: `the ${t.lines.join(' ').toLowerCase()} sticker`, art: 'goodjob', lines: t.lines, spot: t.spot, tilt: t.tilt }));
  // An older save's physical sticker body has nothing to restore into any more.
  store.del('worldBodies.goodjob');
  // Where a new star lands (px, its middle): on the floor just left of the bin (or of where the bin stands, when it is
  // away), the nearest spot clear of the pinboard, him, the bin and the stars already there, above the footer.
  function landing() {
    const px = stickerLayer(site).sizeOf('goodjob'), half = px / 2 * 1.08 + 4, gap = 6;
    const b = bin?.picture.rect || { x: stage.width - BIN.margin - px * 1.1, y: stage.height - stage.insets.bottom - 10 - px * 1.2, w: px * 1.1, h: px * 1.2 };
    const pad = (r, m) => r && { x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m };
    const avoid = [pad(site.pinboard?.picture?.rect, gap), pad(b, gap), pad(site.cat?.rect, 0),
      ...[...stickerLayer(site).live.values()].map((s) => s.at && { x: s.at.x - s.px / 2, y: s.at.y - s.px / 2, w: s.px, h: s.px })].filter(Boolean);
    // (and off the keepsakes lying on the floor, when that is still close to the bin)
    const loose = [...keepsakes.live.values()].filter((i) => i.physical && i.box && !i.worldEntry?.support).map((i) => i.box);
    const clear = (list, x, y) => list.every((r) => x + half <= r.x || x - half >= r.x + r.w || y + half <= r.y || y - half >= r.y + r.h);
    const bottom = Math.min(b.y + b.h, stage.height - stage.insets.bottom - 6) - half, top = Math.max(stage.insets.top, b.y - px * 2) + half;
    const start = { x: b.x - half - gap, y: bottom };
    for (const strict of [true, false]) {
      let best = null;
      for (let y = bottom; y >= top; y -= px * .25) for (let x = start.x; x >= half; x -= px * .25) {
        if (!clear(avoid, x, y) || (strict && !clear(loose, x, y))) continue; const d = Math.hypot(x - start.x, (y - start.y) * 1.5);
        if (!best || d < best.d) best = { x, y, d };
      }
      if (best && (!strict || best.d <= px * 2.5)) return best;
    }
    return start;
  }
  async function award(n) {
    const t = RECYCLE.tiers[n - 1], id = stickerId(n); if (!t || keepsakes.has(id)) return;
    const at = landing(), r = bin?.picture.rect, mouth = r ? { x: r.x + r.w / 2, y: r.y + r.h * .15 } : null;
    const i = keepsakes.give(id, { at: keepsakes.toUnits(at.x, at.y), from: mouth });
    if (mouth) puff(mouth.x, mouth.y, Math.max(70, (i?.box?.w || 60) * 1.2)); else if (i?.box) puff(at.x, at.y, Math.max(70, i.box.w * 1.5));
    audio.play('twinkle', { gain: .7, rate: 1 + (n - 1) * .03 });
    if (site.ui.speak) site.ui.speak(t.said); else site.ui.say(t.said);
  }

  // ---- the bin ----
  // Its own picture decides: the right edge a margin in from the page's, its foot clear of the footer.
  function layout() {
    if (!bin) return;
    // Only when the page's layout changed (fix round A): a pixel-ratio step from the adaptive frame rate also calls
    // onResize, and re-placing the bin then redrew its picture four times for nothing (world-rack's idle check).
    const key = world.layoutKey().join(','); if (bin.layoutKey === key) return; bin.layoutKey = key;
    let x = stage.width * .88, y = stage.height - stage.insets.bottom - 40;
    for (let k = 0; k < 3; k++) {
      place(site.worldLayout.anchor(x, y), false);
      const r = bin.picture.rect;
      x += stage.width - BIN.margin - (r.x + r.w); y += Math.min(0, stage.height - stage.insets.bottom - 10 - (r.y + r.h));
    }
    bin.home = site.worldLayout.anchor(x, y); bin.wide = bin.picture.rect.w;
    if (!bin.sliding) place(bin.home);
  }
  // Once it stands at its home (integration, playtest-3: "nothing gets lost"): a keepsake its footprint landed on is moved
  // clear (the floor row's rule, src/flappy/stand.js clearFootprint), and one it now hides is judged at once, so the
  // occluders' scoot slides it out now, not after its next look seconds later (physics-p3 phone: the crumbs, planned
  // where the bin then arrived, 9% seen).
  function clearRoom(b) {
    clearFootprint(site, bin.root, { hx: (b.max.x - b.min.x) / 2, hz: (b.max.z - b.min.z) / 2, h: b.max.y });
    const r = bin.picture.rect;
    for (const e of world.entries.values()) {
      const q = e.presentation?.rect; if (e.fixed || e.support || !q?.w) continue;
      if (q.x < r.x + r.w && q.x + q.w > r.x && q.y < r.y + r.h && q.y + q.h > r.y) site.occluders?.judge(e);
    }
  }
  function place(p, reserve = true) {
    const { root, entry, picture } = bin;
    root.position.copy(p); root.updateMatrixWorld(true);
    entry?.body.setTranslation(p, false); picture.draw(true);
    const r = picture.rect; if (reserve) site.worldLayout.reserve('recycle-bin', { x: r.x, y: r.y, w: r.w, h: r.h });
  }
  function ensure(slide) {
    if (task) return task;
    task = (async () => {
      await Promise.all([world.ensure(), stage.ensureEnv()]);
      const m = await import('../../assets/models/prepared/kitchen/bin.js');
      const s = .62 * Math.min(1, Math.max(.75, stage.width / 600)), art = m.create(); art.scale.setScalar(s);
      const visual = bakeSolid(T, art), root = new T.Group(); root.name = 'recycle-bin'; stage.scene.add(root);
      art.traverse((o) => { o.geometry?.dispose(); });
      const vertices = []; visual.geometry.computeBoundingBox(); const b = visual.geometry.boundingBox;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) vertices.push(new T.Vector3(x, y, z));
      const picture = createMeshPicture(site, root, visual, vertices);
      // A soft contact shadow, like the cow's.
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const c = canvas.getContext('2d'), g = c.createRadialGradient(32, 32, 4, 32, 32, 31);
      g.addColorStop(0, 'rgba(40,30,20,.28)'); g.addColorStop(1, 'rgba(40,30,20,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
      const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(canvas), transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.scale.set(.42 * s, .42 * s, 1); shadow.position.y = .001; shadow.renderOrder = -4; root.add(shadow);
      bin = { root, picture, visual, s, shadow, entry: null, sliding: false, model: m }; layout();
      bin.entry = await world.add({ id: 'furniture-recycle-bin', object: root, shapes: m.wallShapes(T, s), fixed: true, sleeping: true, presentation: picture, position: bin.home.clone() });
      stage.onResize.push(layout);
      for (const id of ITEMS) arm(keepsakes.get(id));
      if (slide && !stage.reducedMotion) {
        bin.sliding = true; stats.slides++; audio.play('whoosh', { gain: .22, rate: 1.2 });
        const from = site.worldLayout.anchor(stage.width + bin.wide, stage.height - stage.insets.bottom - 16); from.y = 0;
        await stage.tween(BIN.slide, (k) => { const t = 1 - (1 - k) ** 3; place(from.clone().lerp(bin.home, t)); });
        bin.sliding = false; place(bin.home); audio.play('box-thud', { gain: .25, rate: 1.4 });
      } else place(bin.home);
      clearRoom(b);
      syncKeys();
      return bin;
    })().catch((e) => { console.error('recycle bin', e); task = null; });
    return task;
  }
  // Away when there is nothing left to put in it (it comes back when there is), and for good after the sixth.
  function leave() {
    if (!bin || leaving) return leaving;
    leaving = (async () => {
      await stage.after(stage.reducedMotion ? .2 : BIN.leaveAfter);
      if (!done() && ITEMS.some((id) => keepsakes.has(id))) return;           // something new came along meanwhile
      if (done()) { state.gone = true; save(); }
      if (!stage.reducedMotion && bin) {
        bin.sliding = true; stats.leaves++; audio.play('whoosh', { gain: .18, rate: 1.1 });
        const to = site.worldLayout.anchor(stage.width + bin.wide * 1.2, stage.height - stage.insets.bottom - 16); to.y = 0; const from = bin.home.clone();
        await stage.tween(BIN.slide, (k) => place(from.clone().lerp(to, k * k)));
      }
      remove();
    })().finally(() => { leaving = null; check(); });
    return leaving;
  }
  function remove() {
    if (!bin) return;
    const n = stage.onResize.indexOf(layout); if (n >= 0) stage.onResize.splice(n, 1);
    world.remove('furniture-recycle-bin'); bin.picture.dispose(); stage.scene.remove(bin.root);
    bin.visual.geometry.dispose(); for (const m of [].concat(bin.visual.material)) { m.map?.dispose(); m.dispose(); }
    bin.shadow.geometry.dispose(); bin.shadow.material.map.dispose(); bin.shadow.material.dispose();
    site.worldLayout.reserve('recycle-bin', null); bin = null; task = null; hidePrompt(); syncKeys();
  }
  // ---- dropping the crumbs and the glass in ----
  // The whole bin (its picture, padded) is the target, as the shelf's and board's are (Aaron, playtest 2).
  function binRect() { const r = bin.picture.rect, p = BIN.pad; return { x: r.x - p, y: r.y - p * 1.5, w: r.w + 2 * p, h: r.h + 2.5 * p }; }
  function overBin(x, y) {
    if (!bin || bin.sliding || leaving) return false;
    const r = binRect(); return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }
  function showPrompt(on) {
    if (!on) { hidePrompt(); return; }
    prompt ??= document.body.appendChild(Object.assign(document.createElement('div'), { className: 'support-preview recycle-preview', textContent: 'Release to recycle' }));
    const r = binRect();
    Object.assign(prompt.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  }
  function hidePrompt() { prompt?.remove(); prompt = null; }
  function arm(inst) {
    if (!inst || !ITEMS.includes(inst.id)) return;
    inst.worldTask?.then(() => {
      const e = inst.worldEntry; if (!e || e.recycleArmed || keepsakes.get(inst.id) !== inst) return; e.recycleArmed = true;
      const old = e.dropped, oldDragging = e.dragging, oldReleased = e.released;
      e.dropped = (ev) => { hidePrompt(); if (ev && overBin(ev.clientX, ev.clientY)) { drop(inst.id); return true; } return old?.(ev) || false; };
      e.dragging = (ev) => { oldDragging?.(ev); showPrompt(world.held?.entry === e && overBin(ev.clientX, ev.clientY)); };
      e.released = (...a) => { hidePrompt(); return oldReleased?.(...a); };
      if (!inst.key.querySelector('.recycle-key')) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'recycle-key'; b.textContent = 'Put ' + inst.def.label + ' in the recycling bin';
        b.onclick = () => drop(inst.id); inst.key.append(b);
      }
      syncKeys();
    });
  }
  function syncKeys() { for (const id of ITEMS) { const b = keepsakes.get(id)?.key.querySelector('.recycle-key'); if (b) b.hidden = !bin || !!leaving; } }
  async function drop(id) {
    const inst = keepsakes.get(id), e = inst?.worldEntry; if (!e || !bin || bin.sliding || e.dropping || done()) return false;
    e.dropping = true; hidePrompt(); if (world.held?.entry === e) world.release();
    supports.detach(e, { wake: false }); world.park(e); world.disable(e); e.canGrab = false;
    const from = new T.Vector3().copy(e.body.translation()), q = new T.Quaternion().copy(e.body.rotation());
    const mouth = bin.home.clone(); mouth.y = (bin.model.BIN.height + .08) * bin.s; const inside = bin.home.clone(); inside.y = .1 * bin.s;
    await stage.tween(stage.reducedMotion ? 0 : .22, (k) => { e.body.setTranslation(from.clone().lerp(mouth, 1 - (1 - k) ** 2), false); e.body.setRotation(q, false); world.sync(e); });
    await stage.tween(stage.reducedMotion ? 0 : .16, (k) => { e.body.setTranslation(mouth.clone().lerp(inside, k * k), false); world.sync(e); });
    audio.play(id === 'shards' ? 'rattle' : 'paper', { gain: id === 'shards' ? .5 : .45, rate: id === 'shards' ? 1.25 : 1.35 });
    keepsakes.take(id); state.count++; stats.binned.push(id); save();
    await award(state.count);
    if (done()) site.achievements?.unlock('recycle');
    if (done() || !ITEMS.some((k) => keepsakes.has(k))) leave();
    return true;
  }
  // ---- when it comes ----
  function check() {
    if (done() || leaving) return;
    if (!ITEMS.some((id) => keepsakes.has(id))) return;
    const first = !state.shown; if (first) { state.shown = true; save(); }
    if (!bin && !task) ensure(stage.loaded && !booting);
  }
  // After the sixth: the glass and the bread leave nothing more to recycle (glass.js asks `done`; crumbs are taken
  // back the moment they are given, before they are ever drawn).
  // A fragment a gag builds ahead, hidden (src/world/fragments.js prepareFragment), is noticed when it is shown.
  function noticed(i) {
    if (!ITEMS.includes(i.id)) return;
    if (done()) { stats.refused++; keepsakes.take(i.id); return; }
    check(); if (bin) arm(i);
  }
  keepsakes.onGive((i) => { if (!site.fragmentsWaiting?.has(i.id)) noticed(i); });
  // The stars already earned are kept as stickers; an older save's GOOD JOB comes back as the first.
  const boot = () => {
    // (a star the save has lost lands on the floor too, never on the board: cards lane, playtest 3)
    for (let n = 1; n <= Math.min(state.count, RECYCLE.total); n++) if (!keepsakes.has(stickerId(n))) { const at = landing(); keepsakes.give(stickerId(n), { at: keepsakes.toUnits(at.x, at.y) }); }
    if (done()) { for (const id of ITEMS) keepsakes.take(id); site.achievements?.unlock('recycle', { quiet: true }); }
    check(); booting = false;
  };
  if (stage.loaded) boot(); else stage.onLoaded.push(boot);
  return { state, stats, drop, ensure, overBin, noticed, config: RECYCLE, get done() { return done(); }, get count() { return state.count; },
    get bin() { return bin; }, get armed() { return !!bin && !bin.sliding && !leaving; }, get prompt() { return prompt; },
    // Older checks: the stickers are always stuck.
    stick: () => true, peel: () => false };
}
