// Sigil Cat: the page, wired together. The core is in src/core/ (stage, cat, input, audio, saved state, keepsakes),
// the chrome in src/ui/hush.js, the sigils in src/sigils/, one file per egg in src/eggs/ and one per gag in src/gags/.
// Each egg or gag is a function (site) => api that hooks itself in: it defines its keepsake, registers its spell or
// watches the cat, and is listed in EGGS below. Nothing here knows what any of them does.
import { installPageScheduler } from './core/page-scheduler.js';
import { SITE } from './config.js';
import { FINDS } from './finds.js';
import { COMBOS } from './combos.js';
import { store } from './core/store.js';
import * as audio from './core/audio.js';
import { createStage } from './core/stage.js';
import { createCat } from './core/cat.js';
import { createInput } from './core/input.js';
import { createRegistry, createCombos } from './core/registry.js';
import { createWorldLayout } from './core/world-layout.js';
import { warmShared } from './core/warm-shared.js';
import { createWorld } from './core/world.js';
import { createWorldProps } from './core/world-props.js';
import { createSupports } from './core/supports.js';
import { createWorldInput } from './core/world-input.js';
import { createOccluders } from './core/world-occluders.js';
import { createKeepsakes } from './core/keepsakes.js';
import { createUI } from './ui/hush.js';
import { createInk } from './sigils/ink.js';
import { createAchievements } from './ui/achievements.js';
import { createFreeze } from './core/freeze.js';
import { createShell } from './ui/shell.js';
import { createBooks } from './ui/books.js';
import { createFullscreen } from './ui/fullscreen.js';

installPageScheduler();
const stage = createStage(document.getElementById('c'));
const site = { THREE: stage.THREE, config: SITE, store, audio, stage, eggs: {}, spells: {} };
window.site = site;
site.timing = { main: performance.now(), eggs: 0 };      // ms: when this file ran, building the eggs, his pose in, shown
// The whole page held still (the pop-up books, the "flip sideways" overlay, the cake's crash screen): built before
// anything else listens to the window, so its resize hold comes first (src/core/freeze.js).
site.freeze = createFreeze(site);
audio.setNames(SITE.sounds.files, SITE.sounds.collisions ? SITE.sounds.impacts : {});
site.cat = createCat(site);
site.input = createInput(site);
site.registry = createRegistry(site, FINDS);
site.combos = createCombos(site, COMBOS);
site.worldLayout = createWorldLayout(site);
site.keepsakes = createKeepsakes(site);
site.world = createWorld(site);
site.supports = createSupports(site);
site.worldInput = createWorldInput(site);
site.occluders = createOccluders(site);   // physics lane, playtest-2: nothing lost behind the cat or furniture
site.worldProps = createWorldProps(site);
warmShared(site);        // speed lane (e1112-59): the programs every keepsake shares, drawn once ahead
// Unit 1 installs the service; units 2/3 opt art adapters into rigid-body ownership.
const solidIds = new Set(['rifle', 'top', 'pat', 'tin', 'box', 'rack']);
const loadWorld = i => { if (solidIds.has(i.id)) site.world.ensure().catch(e => console.warn('world:', e.message)); };
site.keepsakes.onGive(loadWorld);
stage.onEarly.push(() => { for (const i of site.keepsakes.live.values()) loadWorld(i); });
site.ui = createUI(site);
const { cat, ui, registry, input } = site;
// The loading screen's doors and the phone held upright (src/ui/shell.js); the two books as pop-ups (src/ui/books.js).
site.shell = createShell(site);
site.books = createBooks(site);
site.fullscreen = createFullscreen(site);   // fullscreen lane (playtest-3): the step after "flip sideways" and the button
// (the loading screen's doors count as busy: no shader warm-up hitches the pop or the slide)
stage.setBusyCheck(() => cat.pressing || Math.abs(cat.vel) > 0.5 || cat.popping || (site.shell && !site.shell.revealed));

// Sounds wait until he is on screen: the cat gets the network to himself first.
audio.holdUntil(new Promise((r) => stage.onLoaded.push(r)));
// Any press makes the AudioContext (inside the gesture), so the first tap's sound is never lost. iOS only unlocks
// audio on the release, so do it there too: a visitor who only drags still gets sound.
for (const t of ['pointerdown', 'pointerup', 'keydown']) addEventListener(t, () => audio.context(), { capture: true });

// One way to cast: a drawn sigil, a mark pressed again, a debug button and the checks all come through here.
// A combo row that claims the cast replaces what the sigil would have done alone (src/combos.js).
site.cast = (name, info = {}) => {
  audio.play('cast-wind', { gain: 0.5 });   // e1113-09: Aaron's wind-magic on every successful cast (was the three-note 'cast')
  // The first sigil ever drawn lights a bulb over his head first; its effect follows ~2 s later (src/world/lamp.js).
  const held = site.beforeCast?.(name, info);
  return held ? held.then(() => castNow(name, info)) : castNow(name, info);
};
function castNow(name, info) {
  const f = FINDS.find((x) => x.sigil === name);
  if (f) registry.find(f.id);
  const row = site.combos.resolve(name);
  site.combos.note(name);
  if (row) { if (registry.byId.has(row.id)) registry.find(row.id); return row.run(site, info); }
  return site.spells[name]?.(info);
}
// a found mark pressed again: do it again (each egg may say how; a sigil is simply cast)
site.again = async (id) => {
  if (input.locked) return false;
  if (id === 'whisper') return site.eggs.butterman.replayWhisper();
  if (id === 'blastoff') {
    const bread = site.eggs.bread;
    if (cat.hidden || cat.popping || site.eggs.butterman.running || site.eggs.paradox.active) {
      ui.say('a moment. he is still somewhere else.');return false;
    }
    input.lock('replay-blastoff', true);
    try {
      await bread.whenReady();
      if (!bread.isBread && !bread.now('replay')) return false;
      if (!bread.isBread && !(await bread.whenBread())) return false;   // the loaf's riser and pop first (gags lane, playtest 3)
      await stage.after(.1); // Let the bread replacement finish its existing puff.
      return await bread.blastOff();
    } finally { input.lock('replay-blastoff', false); }
  }
  const egg = Object.values(site.eggs).find((e) => e.again && e.find === id);
  if (egg) return egg.again();
  const f = registry.byId.get(id);
  if (f?.kind === 'sigil') site.cast(f.sigil);
};

site.ink = createInk(site);

// Tap: a random sound (the rare bonk 1 in 400), the count, a milestone spin.
const S = SITE.sounds;
audio.loadAll([...S.tap, S.rare, 'click']);
const nextTap = audio.bag(S.tap);
cat.onTap.push(() => {
  const rare = Math.random() * S.rareChance < 1;
  audio.play(rare ? S.rare : nextTap(), { gain: S.volume, rate: 1 + (Math.random() * 2 - 1) * S.pitchJitter });
  const milestone = ui.bonk();
  ui.hintDone(1);
  if (milestone) cat.playEmote('spin', 'milestone');
  if (rare) ui.rareBonk();
  if (!milestone && rare) { cat.playEmote('startle', 'rare bonk'); ui.say('rare bonk'); }
});
cat.onDrag.push((kind, press) => { if (kind === 'end' && press.moved) ui.hintDone(0); });

// The eggs and gags. Each file's default export is (site) => api.
const EGGS = ['eggs/bolt', 'eggs/circle', 'eggs/bread', 'eggs/galaxy', 'eggs/noscope', 'eggs/butterman', 'eggs/bird',
  'gags/paradox', 'gags/fling', 'gags/glass', 'gags/box', 'gags/eyes', 'gags/hat', 'gags/harp', 'gags/petbite', 'gags/fork', 'gags/party', 'gags/recycle'];
const wanted = (stage.opt('eggs') ?? '').split(',').filter(Boolean);
const eggList = EGGS.filter((e) => !wanted.length || wanted.includes(e.split('/')[1]));
let eggsIn = 0;
const eggsReady = audio.silenceDuring(() => Promise.all(eggList.map(async (path) => {
  try { const m = await import(`./${path}.js`), t = performance.now(); site.eggs[path.split('/')[1]] = m.default(site); site.timing.eggs += performance.now() - t; }
  catch (e) { console.error(`egg ${path} failed to start:`, e); }
  window.__boot?.set('eggs', ++eggsIn / eggList.length);      // the loading screen's ring
})));

// #debug: a row of buttons, and site.fire(name) for the checks and the perf harness.
site.fire = (name) => ({
  party: () => site.eggs.party?.eatCake(),
  bolt: () => site.cast('zigzag'), butterman: () => site.eggs.butterman?.play({ scene: 'butter', forceAudio: true }),
  galaxy: () => site.eggs.galaxy?.open('debug'), bread: () => site.eggs.bread?.now('debug'), noscope: () => site.eggs.noscope?.fire(),
  cake: () => debugCake(),
  'bonks 0': () => ui.setBonks(0), 'bonks +1000': () => ui.setBonks(ui.count + 1000), 'bonks +1000000': () => ui.setBonks(ui.count + 1e6),
})[name]?.();
// fx lane, playtest 3 (Aaron: "add a debug for spawning in a cake"): the next cake, as though it was baked and taken out
// of the box: counted as a bake (the first is the party cake, ready to tap), defined like any later cake, given to the room.
function debugCake() {
  const R = site.eggs.box?.recipe;
  if (!R) return null;
  const n = R.state.bakes + 1, id = R.cakeId(n);
  if (n > 1) R.defineCake(id);
  R.state.bakes = n; if (n === 1) R.state.phase = 'baked';   // it turns 'revealed' as it reaches the room (recipes.js syncItem)
  R.save(true);
  return site.keepsakes.give(id);
}
if (stage.params.has('debug')) {
  const bar = document.createElement('div'); bar.className = 'controls';
  const add = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', fn); bar.appendChild(b); };
  for (const p of ['sit', 'lie', 'sleep', 'stretch']) add(p, () => cat.request(p));
  add('butter', () => cat.setButter(!cat.butterOn));
  add('auto', () => { cat.auto = !cat.auto; });
  eggsReady.then(() => {
    for (const f of FINDS.filter((x) => x.kind === 'sigil')) add('✶ ' + f.id, () => site.cast(f.sigil));
    for (const n of ['galaxy', 'bread', 'noscope', 'party']) add(n, () => site.fire(n));
    for (const s of site.eggs.butterman?.scenes ?? []) add('bm ' + s, () => site.eggs.butterman.play({ scene: s }));
    // fx lane, playtest 3: a cake, and the bonk count (achievements react to it as to real bonks; none is taken back)
    for (const n of ['cake', 'bonks 0', 'bonks +1000', 'bonks +1000000']) add(n, () => site.fire(n));
    // polish lane (2026-11-13): 'ach all' is earning them all: the last one made Platinum Cat anyway (quietly, with no
    // reveal), so it now plays Platinum's reveal and drops the badge like the real path; the 'platinum' button that did
    // the same is gone
    add('ach all', () => site.achievements.grantAll());
    add('ach forget', () => { site.achievements.forget(); location.reload(); });
    add('forget all', () => { store.reset(); location.reload(); });
  });
  document.body.appendChild(bar);
}

// Boot: his first pose (and his butter, if he kept it from an earlier visit), then show him.
const statusEl = document.getElementById('status');
const BOOT_WARM_MS = 8000;   // the longest the warm-ups may hold the doors closed
const buttered = !!store.get('butterman.buttered');
(async () => {
  try {
    await Promise.all([cat.start(stage.params.get('pose')).then(() => window.__boot?.set('cat', 1)), buttered ? cat.ensureButter() : null, eggsReady]);
    site.timing.cat = performance.now();
    if (buttered) cat.setButter(true, 'quiet');
    stage.start();
    // Everything the eggs and the keepsakes will draw is drawn once, unseen, before he is shown: the loading screen's
    // doors are still closed, so the first use of each shader (a stop of up to 0.8 s on a slow driver, each) happens
    // behind them while the ring fills its last part, and nothing stalls once he is there (integration, playtest-2:
    // the speed lane's boot frames of 500-780 ms). At most BOOT_WARM_MS; the rest goes on after the doors, a piece per
    // quiet moment, as before. ?warm=late keeps the old order (all of it after he is shown).
    const warm0 = performance.now();
    // A returning player's room (the world, restored keepsakes and furniture: the rack and its lamp) is built now, behind
    // the doors, so its first pictures and their shaders are not built in his first seconds (a 1-2 s frame on a reload
    // with the rack and a lit lamp). At most BOOT_WARM_MS, shared with the warm-ups below.
    stage.prepare();
    const restored = Promise.all([...site.keepsakes.live.values()].map((i) => i.worldTask).filter(Boolean)).catch(() => {});
    await Promise.race([restored, new Promise((r) => setTimeout(r, BOOT_WARM_MS))]);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));   // their first pictures drawn
    // his floor shadow is first drawn as he pops in (hidden until then): its program is built here too (24 ms otherwise)
    stage.warm(cat.shadow);
    if (stage.opt('warm') !== 'late') await stage.warmAll(Math.max(1000, BOOT_WARM_MS - (performance.now() - warm0)), (n, of) => window.__boot?.set('warm', n / of));
    site.timing.warm = performance.now() - warm0;
    window.__boot?.set('warm', 1);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    stage.ready();
    site.timing.shown = performance.now();
    // Then the way in: "flip sideways" on a phone held upright, he pops in over the loading screen, its doors part.
    // An old book address (spellbook.html, achievements.html) opens its pop-up once the doors are open.
    site.shell.reveal().then(() => site.books.fromAddress());
  } catch (e) { if (statusEl) statusEl.textContent = 'he could not come: ' + e.message; console.error(e); }
})();
site.ready = eggsReady;
site.achievements = createAchievements(site);
