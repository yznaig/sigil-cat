// shell-turn.js (shell lane, playtest-2): phones play on their side. Run at --size phone-portrait with ?doors=hold and
// no --lib (the page is frozen under the overlay, so this script keeps to the wall clock). Loaded upright: the
// "flip sideways" overlay comes after loading and before he pops in, the page frozen under it; turned: the overlay
// goes, he pops in, the doors part. Turned upright mid-game: frozen (no frames, physics, clock or sound) under the
// overlay; turned back: it runs on from exactly where it was.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(25); } return false; };
const check = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
await until(() => window.site?.stage?.loaded, 60000);
const S = window.site, { stage, cat, shell, freeze, keepsakes, audio } = S;
check('turn this run is a phone held upright', matchMedia('(pointer: coarse)').matches && innerHeight > innerWidth && shell.upright, `${innerWidth}x${innerHeight}`);
shell.go();
await until(() => shell.turnShown, 5000);
const turnEl = document.getElementById('turn');
check('turn after loading, before he pops in: the flip sideways overlay over the loading screen, the page frozen', shell.turnShown && !!document.getElementById('loader') && !shell.log.includes('pop') && cat.fx.scale === 0 && freeze.frozen && freeze.reasons.includes('turn') &&
  /flip sideways/i.test(turnEl?.textContent) && getComputedStyle(turnEl).backgroundColor.startsWith('rgba(') && document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('#turn'),
  JSON.stringify({ log: shell.log, reasons: freeze.reasons, bg: getComputedStyle(turnEl).backgroundColor }));
await wsleep(500);
await __shot('turn-boot');
// turned: the overlay quickly fades, he pops in, the doors part
await __resize(844, 390);
await until(() => !shell.turnShown, 3000);
check('turn on its side: the overlay goes and the page runs again', !shell.turnShown && !freeze.frozen, JSON.stringify(shell.log));
await until(() => shell.revealed, 8000);
check('turn then he pops in and the doors part, laid out for landscape', shell.log.join(' > ') === 'turn shown > turn hidden > pop > doors > revealed' && stage.width === 844 && stage.height === 390 && !document.getElementById('turn'),
  shell.log.join(' > '));
await wsleep(1500);
// mid-game: a few things in the world, then the phone goes upright
for (const id of ['top', 'paper']) keepsakes.give(id);
await Promise.all([...keepsakes.live.values()].map((i) => i.worldTask));
const still = () => [...keepsakes.live.values()].filter((i) => i.worldEntry && !i.def.fixed).every((i) => i.worldEntry.body.isSleeping() || i.worldEntry.body.isFixed?.());
await until(still, 15000); await wsleep(1500); await until(still, 15000);
const where = () => [...keepsakes.live.values()].filter((i) => i.worldEntry).map((i) => { const p = i.worldEntry.body.translation(); return [i.id, p.x.toFixed(5), p.y.toFixed(5), p.z.toFixed(5)].join(); }).join('|');
const ctx = audio.context(true), before = where();
let renders = 0; const count = () => renders++; stage.onRender.push(count);
await __resize(390, 844);
await until(() => shell.turnShown, 3000);
const r0 = renders, clock0 = stage.clock, steps0 = S.world.stats.steps; await wsleep(800);
check('turn upright mid-game: the overlay, and everything frozen (frames, physics, clock, sound)', shell.turnShown && freeze.frozen && renders === r0 && stage.clock === clock0 && S.world.stats.steps === steps0 && ctx.state === 'suspended',
  JSON.stringify({ renders: renders - r0, clock: stage.clock - clock0, steps: S.world.stats.steps - steps0, audio: ctx.state }));
check('turn frozen, the page keeps its landscape layout under the overlay (no relayout for the upright screen)', stage.width === 844 && stage.height === 390 && stage.canvas.style.width === '844px', `${stage.width}x${stage.height}, canvas ${stage.canvas.style.width}`);
await __shot('turn-midgame');
await __resize(844, 390);
await until(() => !shell.turnShown, 3000); await wsleep(600);
check('turn back on its side: it runs on from exactly where it was', !freeze.frozen && renders > r0 && stage.clock > clock0 && where() === before && ctx.state === 'running' && stage.canvas.style.width === '' && !document.getElementById('turn'),
  JSON.stringify({ same: where() === before, audio: ctx.state, before, after: where() }));
stage.onRender.splice(stage.onRender.indexOf(count), 1);
await __shot('turn-back');
