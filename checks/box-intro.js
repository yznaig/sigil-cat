// box-intro.js (gags lane, playtest 4; Aaron, on his phone: "I seem to be getting a 'tap the box to open it; hold it
// to lift it' voiceline every single time I do the circle sigil"). Two causes, both checked here with real strokes:
//   1. every square after the first said the box's intro again: now it is said once per save (on the first arrival)
//   2. a quick circle on a phone (few points, far apart, a little past its start) was read as the square
// Run with checks/lib.js, then checks/box-intro-reload.js after a reload (the intro is not said again).
cat.auto = false;
const spoken = [], speak0 = ui.speak;
ui.speak = (text, ...rest) => { spoken.push([].concat(text).join(' ')); return speak0(text, ...rest); };
const intros = () => spoken.filter((s) => /tap the box to open it/.test(s)).length;
// A quick circle as a phone delivers it: n points ~16 ms apart, running ~10% past its start, on empty air. (12 and 16
// points: both were read as the square before the fix, every start angle and stretch tried; 14 happened not to be.)
async function quickCircle(n) {
  const R = MOBILE ? 55 : 70, turns = 1.1;
  for (let cy = stage.insets.top + R + 14; cy < stage.height - stage.insets.bottom - R - 14; cy += 18)
    for (let cx = R + 14; cx < stage.width - R - 14; cx += 18) {
      const a0 = -Math.PI / 2, pts = Array.from({ length: n }, (_, i) => { const a = a0 + turns * 2 * Math.PI * i / (n - 1); return { x: cx + R * 1.15 * Math.cos(a), y: cy + R * Math.sin(a) }; });
      if (!pts.every((p) => isAir(p.x, p.y))) continue;
      const before = site.ink.log.at(-1)?.at ?? -1;
      await drag(pts, 16); await sleep(60);
      const l = site.ink.log.at(-1);
      return l && l.at !== before ? l : { name: null, reason: 'no stroke taken' };
    }
  return { name: null, reason: 'no empty air' };
}

await until(settled, 10000);
const first = await drawSigil('square');
await until(() => E.box.busy, 3000); await until(() => !E.box.busy, 15000); await sleep(1600);
check('box-intro the first square brings the box and the intro is said once', first.name === 'square' && keepsakes.has('box') && intros() === 1 && !!store.get('box.introSaid') && E.box.introSaid === 1,
  `drew ${drew(first)}; intros ${intros()}; spoken ${JSON.stringify(spoken)}`);
await until(settled, 8000);
const hops0 = cat.emoteLog.length, again = await drawSigil('square'); await sleep(1500);
check('box-intro a second square: no intro, a hop', again.name === 'square' && intros() === 1 && cat.emoteLog.slice(hops0).some((s) => /box again/.test(s)), `drew ${drew(again)}; intros ${intros()}`);
const circles = [];
for (let k = 0; k < 2; k++) { await until(settled, 8000); circles.push(await drawSigil('circle')); await until(() => E.circle.spinning, 2000); await until(() => !E.circle.spinning, 6000); await sleep(400); }
check('box-intro two circles: he spins both times, no intro', circles.every((r) => r.name === 'circle') && intros() === 1 && E.circle.casts >= 2, `drew ${circles.map(drew).join(', ')}; intros ${intros()}`);
const quick = [];
for (const n of [12, 16]) { await until(settled, 8000); quick.push(await quickCircle(n)); await until(() => !E.circle.spinning, 6000); await sleep(300); }
check(`box-intro quick ${MOBILE ? 'touch' : 'mouse'} circles (12 and 16 points, a little past the start) are the circle, not the box`, quick.every((r) => r.name === 'circle') && intros() === 1,
  `drew ${quick.map(drew).join(', ')} (${quick.map((r) => r.n).join(', ')} points); intros ${intros()}`);
store.flush();
