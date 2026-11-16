// Loaf to bread. The half-circle sigil (and only the sigil: Aaron, e1111-58, "it should only happen on the sigil")
// turns him into a literal loaf of bread: a photoreal loaf (a Gaussian splat, Aaron's pick bread-2,
// docs/reference/bread/SOURCE.md) sits where he was, turning with him, the butter riding on top. Tap the bread to turn
// him back at once; otherwise he stays bread for about five seconds (N12). He never turns into bread by himself.
// The riser and the pop belong to the loaf (e1113-06, playtest 3: "it turns into bread when it plays the pop"): the
// sigil starts Aaron's riser and he trembles harder as it builds; right at its end comes one pop, a cartoon puff, and
// he is bread.
// The blast-off (N12): spin the bread really fast (the galaxy's own trigger, src/eggs/galaxy.js, with the bread's
// quicker tally). The page goes into space exactly as the galaxy's does (playtest 3: "it needs to cover all the other
// stuff just like the regular galaxy scene does": the dark closes over everything and the chrome fades; only the
// bread is drawn over it) while the bread trembles; then it launches, drifting out into the void inside a circle in
// the middle of the screen (never off it), shrinks away and is gone with one twinkle. Then the page comes back and the
// cat pops back into place. The twinkle stays in the sky. No riser and no pop here any more (e1113-06).
// Music round (2026-11-15, e1115-13; Aaron: "orbit loaf 1 for the galaxy loaf scene and extend how long it takes the
// loaf to float into space. Star Ding at 23 sec"): the scene plays Aaron's orbit-loaf-blastoff from its first moment,
// on the audio clock, and the float is stretched so the twinkle and the star land `twinkleAt` (23.0 s) after the scene
// starts (the song fades out from about 19 s and is close to silent there). The tremble and the float follow the audio
// clock while it runs (as the furniture arrivals do), so slow frames never put the star out of step with the music.
// The float reads as drifting off into the distance: it shrinks at a steady rate on a log scale (by half about every
// 3.8 s) after a gentle start, and closes on its point as things far away do, so it never hangs still nor rushes.
// The background music holds during the scene (src/core/music.js); when the star twinkles, orbit-loaf joins the
// music's rotation on this device.
// Keepsakes: crumbs on the floor, spilled from the bread on every second loaf (playtest 3: "only show up every 2 times
// you do the loaf (max of 1 per usual)"), and a gold star stuck to the sky (after the first blast-off).
import {defineCrumbs,warmFragment,prepareFragment} from '../world/fragments.js';
import {defineStar} from '../world/sky-items.js';
import { fetchSplat, makeSplatMesh } from '../core/splats.js';
import { puff } from '../core/puff.js';
import { css, rand, smooth, ease } from '../core/util.js';

export const BREAD = {
  sigilHold: 5,        // seconds as bread from the sigil (Aaron, 2026-11-09)
  file: 'assets/splats/bread.spz',   // upright, long axis along x, solid (tools/splats/)
  length: 1.25,        // the loaf's length, as a fraction of his height
  turn: [0.12, 0.45, 0],   // its turn (x, y, z radians): mostly side-on, so its length and its scores show
  // The loaf sigil (e1113-06): Aaron's riser (assets/audio/designed/bread-riser.mp3, tools/audio/make-bread-sounds.py)
  // is played from `from` s, where it becomes audible; its build ends at `end` s, where the pop plays and he is bread.
  rise: { riser: { from: 1.5, end: 5.12, gain: 0.8 }, pop: { gain: 0.9 }, shake: { rot: 0.05, x: 0.012 } },
  // Crumbs spill from the bread on every `crumbsEvery`-th loaf, when he turns back (never more than one pile).
  crumbsEvery: 2,
  // seconds: the tremble as the dark closes, the drift out (windup + fly = twinkleAt), the twinkle, the page coming back
  blast: { windup: 1.6, fly: 21.4, hold: 0.7, back: 1.1,
    // music round (e1115-13): the scene's song and where the twinkle lands, seconds from the scene's start
    track: ['assets/audio/music/orbit-loaf-blastoff.m4a', 'assets/audio/music/orbit-loaf-blastoff.mp3'], trackGain: 0.9, twinkleAt: 23.0,
    // the float: its size at the end (it shrinks to this, evenly on a log scale), the gentle start (fraction of the
    // float over which it gathers speed) and the slow roll (radians over the whole float)
    far: 0.02, gather: 0.07, roll: 0.65,
    // Where it goes (playtest 2: "more scoped to a circular center of the screen"): a point in the upper part of a
    // circle round the middle of the screen, `ring` x the screen's shorter side across (radius), at `reach` of it.
    ring: 0.3, reach: [0.55, 0.95], spread: 1.1,   // spread: radians either side of straight up
    shake: { rot: 0.07, x: 0.018 },
  },
};

css('bread', `
.blast-star { position: fixed; left: 0; top: 0; z-index: 8; pointer-events: none; width: 0; height: 0; }
.blast-star svg { position: absolute; width: 90px; height: 90px; left: -45px; top: -45px; overflow: visible; }
`);
const STAR = 'M12 1c.9 6.200 3.900 9.200 11 11-7.100 1.800-10.100 4.800-11 11-.9-6.200-3.900-9.200-11-11 7.100-1.800 10.100-4.800 11-11z';
export default function createBread(site) {
  const { stage, cat, audio, keepsakes, input, store, THREE } = site, B = BREAD;
  audio.loadAll(['ding', 'tap-pop', 'bread-riser', 'bread-pop', 'twinkle', 'bite']);
  let stand = null, loading = null, flight = null, blastAt = null;
  const st = { state: 'cat', t: 0, hold: 0, count: 0, by: null, blasting: false, blasts: 0 };

  // The loaf loads in the background once he is on screen.
  function loadBread() {
    return (loading ??= (async () => {
      const splat = await fetchSplat(new URL('../../' + B.file, import.meta.url).href);
      const mesh = makeSplatMesh(splat), size = splat.box.getSize(new THREE.Vector3()), c = splat.box.getCenter(new THREE.Vector3());
      const k = B.length * cat.height / size.x;
      mesh.scale.setScalar(k); mesh.position.set(-c.x * k, -splat.box.min.y * k, -c.z * k);
      const group = new THREE.Group(); group.add(mesh); group.rotation.set(...B.turn);
      stand = { group, mesh, crown: [0, size.y * k - 0.045, 0], shadow: 1.05, splat, size };   // splat, size: for anyone who wants a loaf of their own (the paradox)
      return stand;
    })());
  }
  stage.onLoaded.push(() => loadBread().catch((e) => console.warn('bread:', e.message)));
  const mid = () => cat.screenOf([0, cat.height * 0.4, 0]);
  const catPx = () => cat.rect.ppu * cat.height;
  // A tremble that grows to the end of `seconds`, then settles exactly at rest in its last tenth (no shake offset left
  // to snap away when what follows takes over). `elapsed(dt)`: seconds since it began (the audio clock when it runs,
  // so it ends right on a scheduled sound). `stop()`: true to end it early. Resolves true at its end, false if stopped.
  function tremble(seconds, shake, elapsed, stop = () => false) {
    const fx = cat.fx, calm = stage.reducedMotion;
    return new Promise((resolve) => {
      const f = (dt) => {
        const s = Math.min(seconds, elapsed(dt)), u = s / seconds, quit = stop();
        const envelope = u * u * (1 - smooth((u - 0.9) / 0.1));
        fx.rot = calm || quit ? 0 : Math.sin(s * 38) * shake.rot * envelope;
        fx.x = calm || quit ? 0 : Math.sin(s * 53) * shake.x * envelope;
        if (u >= 1 || quit) { stage.onFrame.splice(stage.onFrame.indexOf(f), 1); resolve(!quit); }
      };
      stage.onFrame.push(f);
    });
  }
  // The crumbs come from the bread (playtest 3): on every second loaf, as he turns back, one pile spills out of the
  // front of the loaf onto the floor in front of him (never more than one pile; none once recycling's six stars are
  // done). Warmed when that loaf is cast and built, hidden, on its pop (src/world/fragments.js; the puff covers the
  // moment the build costs), so they come with the turn back, not seconds later.
  const crumbsWanted = () => !keepsakes.has('crumbs') && !site.eggs.recycle?.done;
  let crumbs = null;
  function readyCrumbs() {
    if (crumbs || !crumbsWanted()) return;
    const land = site.worldLayout.reachable(new THREE.Vector3(rand(-0.18, 0.18) * cat.height, 0, 0.62 * cat.height));
    const f = prepareFragment(site, 'crumbs', land); if (f) crumbs = { f, land };
  }
  async function spillCrumbs() {
    const c = crumbs; crumbs = null; if (!c) return null;
    // out of the front of the loaf, at its middle height, tossed a little up and toward you
    const from = new THREE.Vector3(c.land.x * 0.6, cat.config.float.lift + 0.22 * cat.height, 0.42 * cat.height);
    const inst = await c.f.show({ from, velocity: { x: c.land.x * 0.8, y: 0.9, z: 0.9 },
      spin: { x: rand(-3, 3), y: rand(-2, 2), z: rand(-3, 3) }, yaw: rand(-0.6, 0.6) });
    if (inst?.worldEntry) spilled = { at: performance.now(), from: from.clone(), pop: popAt };
    return inst;
  }
  let spilled = null, popAt = null, rising = null;

  // The loaf sigil (e1113-06): the riser builds while he trembles; on the pop at its end he is bread.
  function toBread(by) {
    if (st.state !== 'cat' || !stand || cat.hidden || cat.popping || st.blasting || cat.standIn) return false;
    st.state = 'rising'; st.by = by;
    const loaf = (store.get('loaves') || 0) + 1; store.set('loaves', loaf);
    const due = loaf % B.crumbsEvery === 0;
    if (due && crumbsWanted()) warmFragment(site, 'crumbs');
    const R = B.rise, windup = R.riser.end - R.riser.from, c = audio.context(), live = c?.state === 'running', a0 = live ? c.currentTime : 0;
    const riser = audio.play('bread-riser', { gain: R.riser.gain, offset: R.riser.from });
    const pop = live ? audio.play('bread-pop', { gain: R.pop.gain, when: a0 + windup }) : null;
    audio.load(B.blast.track);     // the blast-off's song (music round), fetched while he is bread, in case he is spun
    let t = 0;
    const run = rising = { riser: a0, pop: live ? a0 + windup : null, swap: null, started: performance.now() };
    // Something else took him meanwhile (hidden, another stand-in, the galaxy): no bread, and the pop is called off.
    const away = () => cat.hidden || !!cat.standIn || !!site.eggs.galaxy?.isOpen;
    tremble(windup, R.shake, (dt) => (live ? c.currentTime - a0 : (t += dt)), away).then((ok) => {
      if (rising !== run) return;
      if (!ok) { try { riser?.stop(); pop?.stop(); } catch { /* already ended */ } st.state = 'cat'; rising = null; store.set('loaves', loaf - 1); return; }
      if (!live) audio.play('bread-pop', { gain: R.pop.gain });
      st.state = 'bread'; st.t = 0; st.count++; st.hold = B.sigilHold; st.crumbs = due;
      run.swap = live ? c.currentTime : null; popAt = performance.now();
      window.dispatchEvent(new CustomEvent('sigilcat:ingredient-source', {detail:'bread'}));
      const m = mid(); puff(m.x, m.y, catPx() * 1.0);
      cat.setStandIn(stand); site.eyesWorld?.updateCatSeat();
      if (due) warmFragment(site, 'crumbs').then(() => { if (st.state === 'bread' && st.crumbs) readyCrumbs(); });
    });
    return true;
  }
  function toCat(tapped) {
    if (st.state !== 'bread' || st.blasting) return;
    st.state = 'cat';
    const m = mid(); puff(m.x, m.y, catPx() * 1.0);
    if (tapped) audio.play('tap-pop', { gain: 0.6 });
    const due = st.crumbs; st.crumbs = false;
    if (due) readyCrumbs();                              // (a tap before it was built: it is built now)
    stage.after(0.08).then(() => {
      cat.setStandIn(null); site.eyesWorld?.updateCatSeat();
      if (due) spillCrumbs().catch((e) => console.warn('crumbs:', e.message));
    });
  }
  cat.onTap.push(() => { if (st.state === 'bread' && !st.blasting) { toCat(true); return true; } return false; });
  stage.onFrame.push((dt) => {
    if (!cat.loaded) return;
    if (st.state === 'bread' && !st.blasting) { st.t += dt; if (st.t > st.hold) toCat(false); }
  });
  site.spells.dome = () => toBread('sigil');

  // ---- the blast-off ----
  // The float's shape at u (0..1 of the float): p, how far along the way to its point; s, its size; rot, its roll.
  function curve(u) {
    const T = B.blast, a = T.gather, norm = 1 - a * (1 - Math.exp(-1 / a));
    const g = Math.max(0, (u - a * (1 - Math.exp(-u / a))) / norm);        // speed gathers over the first `gather`, then steady
    const s = Math.pow(T.far, g);                                          // steady on a log scale: steadily further away
    return { g, s, p: (1 - s) / (1 - T.far), rot: T.roll * g };
  }
  async function blastOff() {
    if (st.state !== 'bread' || st.blasting) return false;
    st.blasting = true; st.blasts++; st.crumbs = false;           // this loaf leaves for space: no crumbs from it
    crumbs?.f.cancel(); crumbs = null;
    input.lock('blastoff', true);
    const music = site.music?.hold('blastoff');                     // the background music waits (music round)
    const T = B.blast, calm = stage.reducedMotion, space = site.eggs.galaxy;
    // its song is fetched as he turns to bread; a spin sooner than it arrives waits for it a moment (at most 1.2 s)
    if (audio.status(T.track) === 'pending') await Promise.race([audio.load(T.track), stage.after(1.2)]);
    space?.space(true, T.windup);                                          // the dark closes in over everything
    const fx = cat.fx, ppu = cat.rect.ppu;
    // the destination, in screen pixels, and so the drift (world units on his card) from where he floats
    const ang = rand(-T.spread, T.spread), radius = T.ring * Math.min(stage.width, stage.height) * rand(...T.reach);
    const goal = { x: stage.width / 2 + Math.sin(ang) * radius, y: stage.height / 2 - Math.cos(ang) * radius };
    const to = { x: (goal.x - cat.pivotPx.x) / ppu, y: -(goal.y - cat.pivotPx.y) / ppu };
    // The song from the scene's first moment, and the twinkle at twinkleAt, both on the audio clock (decoded buffers:
    // they have to land on a moment). Without a running clock (no sound yet) the scene keeps the page's own time.
    const c = audio.context(), live = c?.state === 'running' && !!audio.buffer(T.track);
    const a0 = live ? c.currentTime + 0.05 : 0, w0 = performance.now();
    const song = live ? audio.play(T.track, { when: a0, gain: T.trackGain }) : null;
    const twinkle = live ? audio.play('twinkle', { gain: 0.7, when: a0 + T.twinkleAt }) : null;
    let wall = 0, lastWall = performance.now();
    const clock = () => {                                                  // seconds since the scene started
      if (live) return Math.max(0, c.currentTime - a0);
      const now = performance.now(); wall += (now - lastWall) / 1000 * stage.timeScale; lastWall = now; return wall;
    };
    blastAt = { started: w0, live, a0, songAt: live ? a0 : null, twinkleWhen: live ? a0 + T.twinkleAt : null, song: !!song, twinkle: !!twinkle };
    await tremble(T.windup, T.shake, () => clock());
    fx.rot = 0; fx.x = 0;
    Object.assign(blastAt, { windup: clock(), launch: performance.now() });
    cat.hideShadow('blastoff', true);
    await new Promise(resolve => {
      flight = { u: 0, started: performance.now(), ended: null, from: { x: fx.x, y: fx.y }, goal, radius: T.ring * Math.min(stage.width, stage.height) };
      const update = (u) => {
        const k = curve(u);
        fx.x = to.x * k.p; fx.y = to.y * k.p;
        fx.scale = k.s; fx.rot = calm ? 0 : k.rot;
        flight.u = u;
      };
      update(0);
      const frame = () => {
        update(Math.min(1, Math.max(0, (clock() - T.windup) / T.fly)));
        if (flight.u === 1) {
          flight.ended = performance.now();
          stage.onFrame.splice(stage.onFrame.indexOf(frame), 1);resolve();
        }
      };
      stage.onFrame.push(frame);
    });
    // gone, with one twinkle where it went
    const at = { x: cat.pivotPx.x + fx.x * ppu, y: cat.pivotPx.y - fx.y * ppu };
    fx.opacity = 0;
    if (!twinkle) audio.play('twinkle', { gain: 0.7 });
    Object.assign(blastAt, { star: clock(), starAudio: live ? c.currentTime : null, starWall: performance.now() });
    site.music?.unlock('orbit-loaf');                                      // the scene has reached its star (music round)
    const star = document.createElement('div'); star.className = 'blast-star';
    star.innerHTML = `<svg viewBox="0 0 24 24"><path d="${STAR}" fill="#fff"/></svg>`;
    star.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`;
    document.body.appendChild(star);
    star.firstChild.animate([{ scale: 0, opacity: 0 }, { scale: 1, opacity: 1, offset: 0.35 }, { scale: 0.1, opacity: 0 }], { duration: 650, easing: 'ease-out', fill: 'both' });
    await stage.after(T.hold);
    star.remove();
    space?.space(false, T.back);
    await stage.after(T.back * 0.75);
    // the cat just pops back into place
    cat.setStandIn(null); site.eyesWorld?.updateCatSeat(); st.state = 'cat';
    Object.assign(fx, { x: 0, y: 0, rot: 0, opacity: 1, scale: 0.5 });
    cat.hideShadow('blastoff', false);
    audio.play('tap-pop', { gain: 0.6 });
    await stage.tween(0.32, (u) => { fx.scale = 0.5 + 0.5 * ease.back(u, 2.4); });
    fx.scale = 1;
    st.blasting = false;
    input.lock('blastoff', false);
    music?.();
    if (!keepsakes.has('twinkle')) keepsakes.give('twinkle', { at: keepsakes.toUnits(at.x, Math.max(stage.insets.top + 30, at.y)), from: at });
    return true;
  }

  defineCrumbs(site);
  site.skyItems=defineStar(site);

  return {
    find: 'loaf', config: BREAD, now: (by = 'sigil') => toBread(by), blastOff, toCat, curve,
    get isBread() { return st.state === 'bread' && !st.blasting; }, get state() { return st.blasting ? 'blasting' : st.state; },
    get isRising() { return st.state === 'rising'; },
    get flight() { return flight; }, get blastAt() { return blastAt; }, get rising() { return rising; }, get spilled() { return spilled; },
    get crumbsDue() { return st.crumbs; }, whenBread: () => new Promise((resolve) => {   // once a rising loaf has popped (true) or been called off (false)
      const f = () => { if (st.state === 'rising') return; stage.onFrame.splice(stage.onFrame.indexOf(f), 1); resolve(st.state === 'bread'); };
      stage.onFrame.push(f);
    }), get count() { return st.count; }, get blasts() { return st.blasts; }, get ready() { return !!stand; }, whenReady: () => loadBread(),
    again: () => site.cast('dome'),
  };
}
