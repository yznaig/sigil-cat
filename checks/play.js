// play.js: the unit-1 check. It plays the whole page the way a visitor would (real presses, drags and strokes on the
// canvas) and prints one CHECK line per thing, ending PASS or FAIL. It also takes the review screenshots as it goes.
// Run through checks/run-all.sh (which runs it at desktop and phone size, then after-reload.js on the reloaded page).
// Order matters: later parts need what earlier parts leave (the butter, the puddle).
cat.auto = false;                                // he keeps the pose we ask for
const shot = (name) => __shot(name);
const m0 = catMid();
await sleep(600);
await shot('01-rest');

// ---- the core ----
check('first cat', cat.loaded && canvas.classList.contains('on'), `pose ${cat.pose}, picture ${Math.round(cat.rect.w)}x${Math.round(cat.rect.h)} px at ${cat.quality}x`);
{ const r0 = cat.renders; await sleep(1000); check('at rest his splats are not redrawn', cat.renders - r0 <= 1, `${cat.renders - r0} picture draws in 1 s of floating`); }
{ const y0 = cat.yaw; await drag(Array.from({ length: 11 }, (_, i) => ({ x: m0.x + i * 15, y: m0.y })), 14); await sleep(60);
  check('spin: a 150 px drag turns him', Math.abs(cat.yaw - y0) > 1, `${(cat.yaw - y0).toFixed(2)} rad`); }
{ const t0 = cat.taps, b0 = ui.count; let slow = 0, made = 0;
  // A side-on hop can put a visible whisker over the projected middle. This check
  // asks for body bonks; whisker presses correctly pluck instead (checked below).
  const bodyPoint = () => {
    const m = catMid();
    for (const dy of [0, 24, -24, 48, -48]) {
      const p = { x: m.x, y: m.y + dy };
      if (cat.hitTest(p.x, p.y) && !E.harp.whiskerAt(p.x, p.y)) return p;
    }
    throw new Error('No unclaimed cat body point for the bonk check');
  };
  // four quick taps. On a busy machine a 45 ms press can come out longer than a tap is allowed to be (0.45 s): such a
  // press is a hold, not a miss, and is done again.
  while (made < 4 && made + slow < 12) { const m = bodyPoint(), t = performance.now(); await tap(m.x, m.y); if (performance.now() - t > 380) slow++; else made++; await sleep(140); }
  check('tap: bonks counted', cat.taps - t0 >= 4 && cat.taps - t0 <= 4 + slow && ui.count - b0 === cat.taps - t0, `${made} taps made${slow ? ' (' + slow + ' presses ran long on this busy machine and were redone)' : ''}, ${cat.taps - t0} counted, count ${b0} -> ${ui.count}, shows "${document.getElementById('bonks').textContent}"`);
  check('tap: emotes', cat.emoteLog.length > 0, cat.emoteLog.slice(-2).join(' | ')); }
check('page hit test', cat.hitTest(m0.x, m0.y) && !cat.hitTest(14, stage.height * 0.4), 'on him / in the corner');
{ canvas.focus(); const y0 = cat.yaw; canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  // Turning integrates the stage clock. The measured startup window had only
  // 2 RAFs in 500ms; sample after the intended half-second of simulation.
  await Promise.race([stage.after(0.5),sleep(3000)]);
  const t0 = cat.taps; canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(80);
  check('keyboard: arrows turn him, Enter taps him', Math.abs(cat.yaw - y0) > 0.15 && cat.taps === t0 + 1, `turned ${(cat.yaw - y0).toFixed(2)} rad, taps +${cat.taps - t0}`); canvas.blur(); }

// ---- N1: no shake between loaf and sleep; the pop itself still plays; every other pair still shakes ----
await fast(3, async () => {
  const pop = async (to) => {
    let shake = 0, big = 0, popped = false; const from = cat.pose;
    cat.request(to);
    await until(() => { shake = Math.max(shake, Math.abs(cat.shake)); if (cat.popping) popped = true; const p = cat.poses[to]; if (p) big = Math.max(big, p.pivot.scale.x); return popped && !cat.popping && cat.pose === to; }, 9000, 8);
    return { pair: `${from}>${to}`, shake, big, popped, landed: cat.pose === to };
  };
  await until(() => cat.poses.lie && cat.poses.sleep && cat.poses.stretch, 15000);
  const a = await pop('lie'), b = await pop('sleep'), c = await pop('lie'), d = await pop('stretch'), e = await pop('sit');
  check('N1 loaf > sleep and sleep > loaf: no shake, the pop still plays', b.shake === 0 && c.shake === 0 && b.big > 1.1 && c.big > 1.1 && b.landed && c.landed,
    [b, c].map((r) => `${r.pair} shake ${r.shake.toFixed(3)} rad, springs to ${r.big.toFixed(2)}x`).join('; '));
  check('N1 every other pair still shakes', a.shake > 0.02 && d.shake > 0.02 && e.shake > 0.02, [a, d, e].map((r) => `${r.pair} ${r.shake.toFixed(3)} rad`).join(', '));
});

// ---- the sigils, each drawn as a real stroke ----
// the bolt
{ const r = await drawSigil('zigzag'); await sleep(MOBILE ? 620 : 620); await shot('02-bolt');
  const mid = E.bolt.busy, flashes = E.bolt.flashes; await until(() => !E.bolt.busy, 9000);
  check('zig-zag casts the bolt: one flash, and it leaves the cloud', r.name === 'zigzag' && mid && flashes === 1 && keepsakes.has('cloud') && registry.has('bolt'), `drew ${drew(r)}; ${flashes} flash; cloud ${keepsakes.has('cloud')}`);
  await shot('03-bolt-after'); }
// N6: the circle
{ const y0 = cat.yaw, g0 = E.galaxy.trips, n0 = E.noscope.fired, t0 = performance.now(); let maxVel = 0, galaxy = false;
  const r = await drawSigil('circle'); await sleep(250); await shot('04-circle-spinning');
  await until(() => { maxVel = Math.max(maxVel, Math.abs(cat.vel)); galaxy = galaxy || E.galaxy.isOpen; return !E.circle.spinning; }, 6000, 8);
  const secs = (performance.now() - t0) / 1000, turns = (cat.yaw - y0) / (2 * Math.PI), home = cat.config.rotate.homeYaw;
  const off = Math.abs(Math.atan2(Math.sin(cat.yaw - home), Math.cos(cat.yaw - home)));
  await sleep(2200);                                               // long enough for a galaxy to have opened, if it were going to
  check('N6 the circle: 20 turns in about 2 s, facing his usual way after', r.name === 'circle' && Math.abs(Math.round(Math.abs(turns)) - 20) <= 0 && secs < 3.2 && off < 0.05, `drew ${drew(r)}; ${turns.toFixed(2)} turns in ${secs.toFixed(2)} s (stroke included), ${off.toFixed(3)} rad off home`);
  check('N6 the circle opens neither the galaxy nor the 360', !galaxy && !E.galaxy.isOpen && E.galaxy.trips === g0 && E.noscope.fired === n0 && maxVel < 1, `galaxy opened ${galaxy}, 360 fired ${E.noscope.fired - n0}, his own spin speed stayed ${maxVel.toFixed(2)} rad/s`);
  check('the circle leaves the top', keepsakes.has('top'), ''); }
// N11: the loaf is a half circle
{ await E.bread.whenReady();
  const r = await drawSigil('dome'); await E.bread.whenBread(); await sleep(700); await shot('05-bread');
  check('N11 a half circle casts the loaf', r.name === 'dome' && E.bread.isBread, `drew ${drew(r)}; he is ${E.bread.state}`);
  const m = catMid(); await tap(m.x, m.y); await until(() => E.bread.state === 'cat' && !cat.standIn, 4000);
  // playtest 3: crumbs on every second loaf
  const none = !(await until(() => keepsakes.has('crumbs'), 1200));
  await until(settled, 6000); await drawSigil('dome'); await E.bread.whenBread(); await sleep(300);
  { const m2 = catMid(); await tap(m2.x, m2.y); } await until(() => E.bread.state === 'cat' && !cat.standIn, 4000);
  check('tap the bread: he is back; the second loaf leaves crumbs', E.bread.state === 'cat' && none && await until(() => keepsakes.has('crumbs'), 2000), `first loaf crumbs ${!none}`); }
// N12: the loaf, then spin him really fast = the blast-off, never the galaxy (playtest 2: the star is a spin, not a sign)
{ await until(settled, 6000);
  const g0 = E.galaxy.trips, b0 = E.bread.blasts; let opened = false;
  const a = await drawSigil('dome'); await E.bread.whenBread(); await sleep(350); const b = await spinHard(() => E.bread.state === 'blasting', { pxPerSec: 2600, max: 30 });
  await sleep(4800); await shot('06-blastoff');
  await until(() => { opened = opened || E.galaxy.isOpen; return E.bread.state === 'cat' && !input.locked; }, 20000);
  check('N12 loaf then a really fast spin: the bread blasts off and the galaxy does not open', a.name === 'dome' && b && E.bread.blasts === b0 + 1 && !opened && E.galaxy.trips === g0 && registry.has('blastoff'),
    `drew ${drew(a)}, then spun; blast-offs ${E.bread.blasts - b0}; galaxy opened ${opened}`);
  check('N12 the cat pops back, a star stays', !cat.standIn && !cat.hidden && await until(() => keepsakes.has('twinkle'), 2000), `he is ${E.bread.state}`); }
// a really fast spin on the cat: the galaxy (and N12's other order: the galaxy, then the loaf, is just bread)
await fast(3, async () => {
  await until(settled, 6000);
  const r = await spinHard(() => E.galaxy.isOpen, { pxPerSec: 2600, max: 90 });   // ~7 s of hard swiping (playtest 3)
  const locked = await until(() => E.galaxy.isOpen && input.locked, 3000);
  const s0 = input.swallowed, t0 = cat.taps, m = catMid(); await tap(m.x, m.y);   // his hands are taken away
  await until(() => E.galaxy.phase === 'hold', 20000); await shot('07-galaxy');
  const held = E.galaxy.phase === 'hold';
  await tap(m.x, m.y);                                                    // the hold ends on a click
  await until(() => !E.galaxy.isOpen && !input.locked, 30000);
  check('a really fast spin opens the galaxy; nothing gets through while it has him; a click ends the hold', r && locked && held && input.swallowed > s0 && cat.taps === t0,
    `${input.swallowed - s0} presses swallowed, ${cat.taps - t0} reached him`);
  check('the galaxy leaves a postcard', await until(() => keepsakes.has('postcard'), 2500), '');
});
{ await until(settled, 6000);
  const b0 = E.bread.blasts, r = await drawSigil('dome'); await E.bread.whenBread(); await sleep(500);
  check('N12 the other order (galaxy first, loaf after): just bread', r.name === 'dome' && E.bread.isBread && E.bread.blasts === b0, `he is ${E.bread.state}`);
  E.bread.toCat(false); await until(() => E.bread.state === 'cat' && !cat.standIn, 3000); }
// N6: a player's own fast spin still opens it
await fast(3, async () => {
  await until(settled, 6000);
  const id = ++pointerIds, m = catMid(); let x = m.x; fire('pointerdown', x, m.y, id);
  await until(() => { x += 20; fire('pointermove', x, m.y, id); return E.galaxy.isOpen; }, 9000, 12);
  fire('pointerup', x, m.y, id, 0);
  check('N6 a player\'s own fast spin still opens the galaxy', E.galaxy.isOpen && E.galaxy.phase !== 'closed', `fast for ${E.galaxy.fast.toFixed(1)} s`);
  await until(() => E.galaxy.phase === 'hold', 15000); await tap(m.x, m.y);   // it holds until a click (playtest 2)
  await until(() => !E.galaxy.isOpen && !input.locked, 30000);
});
// the 360: one flick, a whole turn
{ await until(settled, 6000); await sleep(1300);
  const n0 = E.noscope.fired, m = catMid();
  const timing=[];let tracking=true;
  function traceVideo(){const root=document.querySelector('.noscope-video'),v=root?.querySelector('video');if(root)timing.push({t:performance.now(),black:+getComputedStyle(root).opacity,opacity:v?+getComputedStyle(v).opacity:0,playing:!!v&&!v.paused&&v.currentTime>0,riser:E.noscopeVideo?.audio.riser??false});if(tracking)requestAnimationFrame(traceVideo);}
  requestAnimationFrame(traceVideo);
  flick(Array.from({ length: 11 }, (_, i) => ({ x: m.x - 0.2 * cat.rect.ppu + i * 16, y: m.y })), 8);
  await until(() => E.noscope.fired > n0, 5000);const triggered=performance.now();await sleep(950);await shot('08-360');
  await sleep(5700);tracking=false;
  const black=timing.find(f=>f.black>=.9999), playing=timing.find(f=>f.playing), full=timing.find(f=>f.playing&&f.opacity>=.9999);
  check('noscope real flick runs the timed riser and video',timing.some(f=>f.riser)&&!!black&&!!playing&&!!full&&Math.abs((black.t-triggered)/1000-5)<.15&&Math.abs((playing.t-triggered)/1000-5)<.15&&Math.abs((full.t-triggered)/1000-6)<.15&&!E.noscopeVideo?.audio.riser,`black ${black?((black.t-triggered)/1000).toFixed(3):'missing'}, play ${playing?((playing.t-triggered)/1000).toFixed(3):'missing'}, full ${full?((full.t-triggered)/1000).toFixed(3):'missing'}`);
  const log = E.noscope.log; await until(() => !E.noscope.active, 35000);
  check('one flick of a whole turn fires the 360 and leaves the rifle', !E.noscope.active && !input.locked && E.noscopeVideo.lastEnd === 'ended' && E.noscope.fired === n0 + 1 && await until(() => keepsakes.has('rifle'), 2000) && registry.has('noscope'), `turned ${log.length ? log[log.length - 1].deg : '?'} degrees`); }
// B: Butterman, scene 1, to the slap
{ await until(settled, 6000);
  const bm = E.butterman; await bm.clipsReady;
  const r = await drawSigil('butter');
  const playing = await until(() => bm.state.mode === 'playing', 3000), scene = bm.state.scene;
  await until(() => (bm.state.beat ?? 0) > 6, 15000); await shot('09-butterman-walk');
  const caption = document.getElementById('bm-caption').textContent;
  await until(() => cat.butterOn, 20000); await sleep(350); await shot('10-butterman-slap');
  check('B summons Butterman: scene 1 plays to his song and he butters the cat', r.name === 'butter' && playing && scene === 'butter' && cat.butterOn && !!store.get('butterman.buttered') && !caption, `drew ${drew(r)}; scene ${scene}; clock ${bm.state.clock}; captions off`);
  bm.stop(); await sleep(200);
  // N2: scene 2, measured from its own motion
  const p = bm.pathScan('loop'), legs = bm.all.filter((id) => id !== 'rise').map((id) => bm.legScan(id));
  check('N2 scene 2: once round the cat without touching him, then out to open floor', Math.abs(p.turnsRoundCat - 1) < 0.02 && p.nearestToCat >= 0.5 && Math.hypot(...p.endsAt) > 0.7, `${p.turnsRoundCat} turns, nearest ${p.nearestToCat} from his axis (he is 0.43 wide), stands at ${p.endsAt}`);
  check('N2 scene 2: still for the last second, gone in one frame as the clip ends', p.stillForS >= 1 && Math.abs(p.sceneEndS - p.clipEndS) < 0.03 && p.sceneEndS - p.lastSeenS < 0.08, `still for ${p.stillForS} s; last there ${p.lastSeenS} s, clip ends ${p.clipEndS} s`);
  check('his legs never clip (every scene)', legs.every((l) => l.frames > 100 && l.gap >= 0 && l.poke <= 0.01), legs.map((l) => `${l.scene} gap ${l.gap} poke ${l.poke}`).join(', '));
  const ex = ['butter'].map((id) => bm.exitScan(id));
  check('scene 1: off screen 2 s or more before the clip ends', ex.every((e) => e.lead >= 1.95), ex.map((e) => `${e.scene} ${e.lead} s`).join(', '));
  for (const [beat, name] of [[18, '11-butterman-loop-behind'], [24, '12-butterman-loop-front'], [31, '13-butterman-loop-stands']]) { bm.seek(beat, 'loop'); await sleep(700); await shot(name); }
  bm.seek(9, 'rise'); await sleep(900); await shot('14-butterman-rise');
  bm.stop(); cat.setButter(true, 'quiet'); cat.auto = false; await sleep(900); }

// ---- the whisper: silent far from the butter, audible near it, never restarted ----
{ const bm = E.butterman, b = bm.butterScreen();
  // Achievements earned during his scenes reveal after the takeover, each with its chime (text lane, e1112-31): that
  // chime, not a sound of his, was what two lanes heard here (traced: achieve.wav, 1.7 s, started ~1 s after he left).
  // Let them finish first, so "silent" measures his whisper alone.
  await until(() => !site.achievements.queued, 20000); await sleep(200);
  hover(20, stage.height - 20); await sleep(900);
  const far = { gain: bm.state.whisper.gain, level: audio.level(), looping: bm.state.whisper.looping };
  for (let i = 0; i <= 10; i++) { hover(b.x + (1 - i / 10) * 200, b.y + (1 - i / 10) * 120); await sleep(60); }
  await sleep(1300);
  const near = { gain: bm.state.whisper.gain, level: 0 }; for (let i = 0; i < 12; i++) { near.level = Math.max(near.level, audio.level()); await sleep(80); }
  hover(20, stage.height - 20); await sleep(1300);
  const away = { gain: bm.state.whisper.gain, level: audio.level() };
  check('the whisper is silent far from the butter', far.looping && far.gain === 0 && far.level < 1e-5 && away.gain === 0 && away.level < 1e-4, `loop running ${far.looping}; far: gain ${far.gain}, heard ${far.level.toExponential(1)}; away again: ${away.level.toExponential(1)}`);
  check('the whisper is audible near the butter, and very quiet', near.gain > 0.05 && near.gain <= 0.08 && near.level > 2e-4, `gain ${near.gain.toFixed(3)}, heard ${near.level.toExponential(1)}`);
  check('finding the whisper counts', registry.has('whisper'), ''); }

// ---- the gags ----
// 2. butter fling (the circle on a buttered cat), wiping the streak, putting the pat back
{ await until(settled, 6000);
  const r = await drawSigil('circle'); await until(() => E.fling.busy, 3000); await sleep(600); await shot('15-fling');
  await until(() => !E.fling.busy && !E.circle.spinning, 9000);
  check('gag 2 the butter is flung off: a streak on the glass and the pat at the bottom', r.name === 'circle' && !cat.butterOn && keepsakes.has('grease') && keepsakes.has('pat') && registry.has('fling'), `butter on him ${cat.butterOn}`);
  await shot('16-fling-after');
  const g = keepsakes.get('grease').box; await drag(Array.from({ length: 40 }, (_, i) => ({ x: g.x + g.w / 2 + Math.sin(i) * 6, y: g.y + 4 + (g.h - 8) * i / 39 })), 5);
  check('gag 2 a finger wipes the streak away', !keepsakes.has('grease'), '');
  const p = keepsakes.get('pat'), m = catMid(); await drag(Array.from({ length: 16 }, (_, i) => ({ x: p.px.x + (m.x - p.px.x) * i / 15, y: p.px.y - p.h / 2 + (m.y - p.px.y + p.h / 2) * i / 15 })), 10);
  check('gag 2 the pat dragged back onto him butters him again', cat.butterOn && await until(()=>keepsakes.get('pat')?.worldEntry?.support?.id==='cat-butter',500) && !!store.get('butterman.buttered'), ''); await sleep(700); }
// 1. the paradox (the loaf on a buttered cat)
await fast(2.5, async () => {
  await until(settled, 6000);
  const r = await drawSigil('dome'); const on = await until(() => E.paradox.active, 3000);
  await until(() => cat.fx.y > 0.2 && Math.abs(cat.fx.rot) > 1.5, 12000); await shot('17-paradox');
  const bread = E.bread.state, butterOnLoaf = !cat.butterOn;
  await until(() => !E.paradox.active, 30000);
  check('gag 1 a buttered cat who becomes bread hovers and turns instead, and a rejected paper is left', r.name === 'dome' && on && bread === 'cat' && butterOnLoaf && cat.butterOn && await until(() => keepsakes.has('paper'), 2500) && registry.has('paradox'), `drew ${drew(r)}`);
});
{ const p = keepsakes.get('paper');await p.worldTask;site.pinboard.select('paper');await sleep(100); // a point on the paper's own picture that the world gives to it (it lies wherever the floor search put it, playtest 3)
  const r = p.picture.rect; let at = null; for (let y = r.y + 2; y < r.y + r.h - 2 && !at; y += 2) for (let x = r.x + 2; x < r.x + r.w - 2; x += 2) if (site.worldInput.pick({ clientX: x, clientY: y })?.entry === p.worldEntry) { at = { x, y }; break; }
  await tap(at?.x ?? p.px.x, at?.y ?? p.px.y - p.h * 0.3); await sleep(300); await shot('18-paper-read');
  const open = E.paradox.reading; document.querySelector('.paper-read .sheet-x')?.click();   // its one (x) (playtest 3)
  check('gag 1 tap the paper to read the rejection', open && !E.paradox.reading, ''); }
// 3. the glass
await fast(2, async () => {
  await until(settled, 6000);
  const r = await drawSigil('cup'); await until(() => E.glass.busy, 3000); await sleep(900); await shot('19-glass');
  await until(() => !E.glass.busy, 30000);
  check('gag 3 the cup: he pushes the glass off the edge; shards and a puddle are left', r.name === 'cup' && await until(() => keepsakes.has('puddle') && keepsakes.has('shards'), 2500) && registry.has('glass'), `drew ${drew(r)}`);
});
{ keepsakes.get('puddle').moveTo(0.02, -0.2); await sleep(500); await shot('20-puddle-mirror');
  await until(settled, 6000);
  const r = await drawSigil('zigzag'); await sleep(640); await shot('21-bolt-through-puddle');
  const via = E.bolt.lastVia; await until(() => !E.bolt.busy, 9000);
  check('gag 3 a bolt with a puddle on the floor goes through the water', r.name === 'zigzag' && !!via, via ? `struck the puddle at ${Math.round(via.x)},${Math.round(via.y)}` : 'struck him directly'); }
// 4. the box
{ await until(settled, 6000);
  const r = await drawSigil('square'); await until(() => E.box.inside, 4000); await sleep(350); await shot('22-box');
  const hid = cat.hidden; await until(() => !E.box.busy, 12000);
  check('gag 4 the square: a box drops, he is in it (ears out), and the box stays', r.name === 'square' && hid && !cat.hidden && keepsakes.has('box') && registry.has('box'), `drew ${drew(r)}`);
  const b = keepsakes.get('box'), open = E.box.recipe.state.open;
  b.key.querySelector('button').click(); await until(() => E.box.recipe.screen.isOpen && E.box.recipe.state.open !== open, 2500);
  check('gag 4 use the box opens it as a chest without another cat visit', E.box.recipe.state.open !== open && E.box.recipe.screen.isOpen && !E.box.inside && !cat.hidden, 'e1111-08: one original visit only; e1111-61: a chest');
  await E.box.recipe.screen.close(); await until(() => !E.box.recipe.state.open && !E.box.lidMoving, 2500); }
// 5. googly eyes
{ await until(settled, 6000); cat.setYaw(-0.2);
  const r = await drawSigil('eight'); await sleep(1500); await shot('23-eyes');
  const on = E.eyes.on; await until(() => !E.eyes.busy, 12000); await sleep(700);
  // playtest 2 (furniture lane): they stay on him after the choir, until taken off
  check('gag 5 the eight: eyes on his face, a choir, and they stay on him', r.name === 'eight' && on === 'cat' && E.eyes.on === 'cat' && keepsakes.has('eyes') && registry.has('eyes'), `drew ${drew(r)}`);
  // The physical eyes are two separate discs: the middle of their box is the
  // gap between them. Press where a player would, on an eye itself.
  const e = keepsakes.get('eyes'), c = keepsakes.get('cloud'); await until(() => e.worldEntry?.body.isSleeping() || e.worldEntry?.support, 4000);
  let s = { x: e.px.x, y: e.px.y - e.h / 2 };
  find: for (let y = e.box.y + 2; y < e.box.y + e.box.h - 2; y += 2) for (let x = e.box.x + 2; x < e.box.x + e.box.w - 2; x += 2) if (site.worldInput.pick({ clientX: x, clientY: y })?.entry === e.worldEntry) { s = { x, y }; break find; }
  await drag(Array.from({ length: 20 }, (_, i) => ({ x: s.x + (c.px.x - s.x) * i / 19, y: s.y + (c.px.y - s.y) * i / 19 })), 10);
  await sleep(400); await shot('24-eyes-on-cloud');
  // only him and the Platinum Cat badge take them: pulled off him and let go over the cloud, they just fall
  check('gag 5 pulled off him onto the cloud, the eyes come off and do not stick to it', E.eyes.on === null, `stuck to ${E.eyes.on}`); }
// 6. the hat
{ await until(settled, 6000); cat.setYaw(cat.config.rotate.homeYaw);
  const r = await drawSigil('triangle'); await until(() => E.hat.wearing && !E.hat.busy, 5000); await sleep(500); await shot('25-hat');
  const first = E.hat.wearing, lift = site.rack.hats.get(first)?.worldEntry?.support?.position[1] ?? 0;
  // e1111-58: the butter goes under the hat: the pat stays on his head and the hat rests on it
  check('gag 6 the triangle: a hat lands on him, on top of the butter, and there is a rack', r.name === 'triangle' && !!first && lift > 0 && cat.butterSlot.position.y === 0 && site.supports.crownHeight > lift && cat.butterOn && keepsakes.has('rack') && registry.has('hat'), `drew ${drew(r)}; hat ${first}; hat lifted ${lift.toFixed(3)} onto the butter`);
  check('N11 the triangle no longer casts the loaf', r.name === 'triangle' && E.bread.state === 'cat', 'it is the hat now');
  // playtest 3: one hat per triangle; a second cast unlocks the next, so the rack has two to go round
  await until(() => !E.hat.busy && !cat.popping, 5000); site.cast('triangle'); await until(() => !E.hat.busy && E.hat.wearing && E.hat.wearing !== first, 5000); await sleep(300);
  check('gag 6 a second triangle unlocks the next hat', site.rack.owned().filter((n) => n !== 'party').length === 2 && !!E.hat.wearing && E.hat.wearing !== first, `${first} -> ${E.hat.wearing}; owned ${site.rack.owned().join()}`);
  const k = keepsakes.get('rack'); let taps = 0; const second = E.hat.wearing;
  do { await tap(k.px.x, k.px.y - k.h * 0.5); await sleep(300); taps++; } while ((!E.hat.wearing || E.hat.wearing === second) && taps < 6);   // the last tap of a round takes the hat off
  check('gag 6 tap the rack: another hat', !!E.hat.wearing && E.hat.wearing !== second, `${second} -> ${E.hat.wearing} (${taps} tap${taps > 1 ? 's' : ''})`);
  await fast(3, async () => { cat.request('lie'); await until(() => cat.pose === 'lie' && !cat.popping, 6000); }); await sleep(300); await shot('26-hat-loaf-pose');
  await fast(3, async () => { cat.request('sit'); await until(() => cat.pose === 'sit' && !cat.popping, 6000); }); }
// 7. the whisker harp
{ await until(settled, 6000); cat.setYaw(0); await sleep(500);
  const bm = E.butterman, ws = E.harp.whiskers();
  let plucked = 0; const p0 = E.harp.plucks;
  // he bobs: aim afresh each time; the googly eyes stay on his face now (furniture lane) and stickers sit in a top
  // layer (gags lane), so aim at a part of the whisker nothing covers, as a player would
  const aim = (w) => { for (const k of [.5, .65, .8, .35, .9, .2]) { const t = { x: w.pts[1].x + (w.pts[2].x - w.pts[1].x) * k, y: w.pts[1].y + (w.pts[2].y - w.pts[1].y) * k }; if (!site.worldInput.pick({ clientX: t.x, clientY: t.y }) && document.elementFromPoint(t.x, t.y) === stage.canvas && E.harp.whiskerAt(t.x, t.y)?.index === w.index) return t; } note('harp aim', 'no clear point on whisker ' + w.index); return { x: (w.pts[1].x + w.pts[2].x) / 2, y: (w.pts[1].y + w.pts[2].y) / 2 }; };
  for (const i of E.harp.config.tune) { const t = aim(E.harp.whiskers()[i]); await tap(t.x, t.y); await sleep(160); }
  plucked = E.harp.plucks - p0;
  const enc = await until(() => bm.state.mode === 'playing' && bm.state.scene === 'encore', 4000);
  await until(() => (bm.state.beat ?? 0) > 9, 12000); await shot('27-harp-encore');
  check('gag 7 the theme plucked on his whiskers brings the encore, and a ticket', plucked === E.harp.config.tune.length && enc && E.harp.unlocked && await until(() => keepsakes.has('ticket'), 2500) && registry.has('harp'), `${plucked} plucks landed on whiskers; scene ${bm.state.scene}`);
  bm.stop(); cat.auto = false; cat.setYaw(cat.config.rotate.homeYaw); await sleep(300); }
// 8. pet, pet, bite
{ await until(settled, 6000);
  const m = catMid(), id = ++pointerIds, pet = E.petbite; let purr = 0, y = m.y, dirn = 1;
  fire('pointerdown', m.x, y, id);
  await until(() => { for (let k = 0; k < 3; k++) { y += dirn * 9; if (Math.abs(y - m.y) > 36) dirn = -dirn; fire('pointermove', m.x, y, id); } purr = Math.max(purr, pet.purr); return pet.bites > 0; }, 15000, 14);
  fire('pointerup', m.x, y, id, 0); await sleep(700); await shot('28-bite');
  check('gag 8 seven strokes build a purr and leave a permanent plaster and tin', purr > 0.5 && pet.bites === 1 && pet.plastered && pet.config.patience === 7 && store.get('plaster') === true && await until(() => keepsakes.has('tin'), 2500) && registry.has('bite'), `purr reached ${purr.toFixed(2)}; ${pet.strokes} strokes`); }

// ---- the sound control ----
{ const btn = document.getElementById('sound'), vol = document.getElementById('volume');
  audio.play('thunder', { gain: 0.8 }); await sleep(350); const loud = audio.level();
  btn.click(); await sleep(350); const muted = audio.level(), label = btn.textContent;
  audio.play('thunder', { gain: 0.8 }); E.butterman.play({ scene: 'rise', forceAudio: true }); await sleep(900);
  let peak = 0; for (let i = 0; i < 10; i++) { peak = Math.max(peak, audio.level()); await sleep(60); }
  E.butterman.stop();
  check('the sound control mutes everything (a clip, a song, the loops)', loud > 1e-3 && muted < 1e-6 && peak < 1e-6 && audio.state().muted && /off/i.test(label), `playing ${loud.toExponential(1)} -> muted ${muted.toExponential(1)}; a song started while muted ${peak.toExponential(1)}; button says "${label}"`);
  btn.click(); audio.play('thunder', { gain: 0.8 }); await sleep(350); const back = audio.level();
  vol.value = '55'; vol.dispatchEvent(new Event('input', { bubbles: true })); await sleep(100);
  check('sound on again, volume set', back > 1e-3 && !audio.state().muted && Math.abs(audio.state().volume - 0.55) < 0.01, `heard ${back.toExponential(1)}, volume ${audio.state().volume}`);
  btn.click();                                                   // left muted, to see it survive the reload
}

// ---- arranging: a keepsake dragged somewhere else stays there ----
{ const t = keepsakes.get('tin'), x0 = t.x, y0 = t.y, way = t.px.x > stage.width / 2 ? -1 : 1;      // the newest one: nothing lies on top of it
  await drag(Array.from({ length: 12 }, (_, i) => ({ x: t.px.x + way * i * 6, y: t.px.y - t.h / 2 - i * 3 })), 10); await sleep(250);
  check('a keepsake can be dragged to a new place', Math.hypot(t.x - x0, t.y - y0) > 0.1, `the tin moved ${Math.hypot(t.x - x0, t.y - y0).toFixed(2)} cat-heights`); }
// A flick is still moving after 250 ms; compare saved positions only once it has settled.
await until(() => !keepsakes.physics?.active, 3500);
{ const r = await drawSigil('fork'); check('fork joins the found marks', r.name === 'fork' && registry.has('fork'), drew(r)); }
// The late visitor is part of a complete playthrough too. Preserve the all-finds gate.
{
  const B=E.bird,{wallClock}=await import(new URL('src/core/page-scheduler.js',document.baseURI));
  const wallSleep=ms=>new Promise(r=>wallClock.setTimeout(r,ms));
  const wait=async(f,ms=20000)=>{const t=performance.now();while(performance.now()-t<ms){if(f())return true;await wallSleep(25);}return false;};
  B.debug?.skipTo(90);await wait(()=>B.state==='flying',95000);await B.start();
  // Playtest-2 (bird lane): the game over waits for retry / give up; the controller stays and its stand arrives.
  B.screen?.game.flap();await wait(()=>B.screen?.over);document.querySelector('#bird-screen [data-give-up]')?.click();
  await wait(()=>!B.screen&&keepsakes.get('controller')?.worldReady);
  const controller=keepsakes.get('controller');await wait(()=>controller?.worldEntry?.body.isSleeping());
  controller?.key.querySelector('button').click();await wait(()=>B.screen?.root.classList.contains('trailer'),5000);await wait(()=>!B.screen&&site.stand?.ready);
  check('the distant bird and fallen controller join the found marks',registry.has('bird')&&!B.screen&&!input.locked&&keepsakes.has('controller')&&site.stand?.ready);
}
await shot('29-a-page-played-with');
check('found', registry.count() === registry.total, `${registry.count()} of ${registry.total}: ${registry.FINDS.filter((f) => !registry.has(f.id)).map((f) => f.id).join(', ') || 'all'}`);
// what must still be there after a reload
const keep = { keepsakes: Object.fromEntries([...keepsakes.live.values()].map((k) => [k.id, [+k.x.toFixed(3), +k.y.toFixed(3)]])), found: registry.count(), bonks: ui.count, attachments: Object.fromEntries([...keepsakes.live.values()].filter(k=>site.supports.registry.get(k.worldEntry?.support?.id)?.kind==='attachment').map(k=>[k.id,k.worldEntry.support])), hat: E.hat.wearing, butter: cat.butterOn, eyesOn: E.eyes.on, volume: audio.state().volume };
note('before the reload', `${Object.keys(keep.keepsakes).length} keepsakes: ${Object.keys(keep.keepsakes).join(', ')}`);
store.flush();
sessionStorage.setItem('check.keep', JSON.stringify(keep));
