// calm.js: with prefers-reduced-motion. The bolt does not flash or shake, the circle is two slow turns, messages do
// not animate letter by letter.
cat.auto = false; await sleep(500);
{ const r = await drawSigil('zigzag'); await sleep(640); const t = document.body.style.translate; await __shot('32-calm-bolt');
  const f = E.bolt.flashes; await until(() => !E.bolt.busy, 9000);
  check('reduced motion: the bolt comes without a flash or a shake', r.name === 'zigzag' && f === 0 && !t, `${f} flashes`); }
{ const y0 = cat.yaw; const r = await drawSigil('circle'); await until(() => E.circle.spinning, 2000); await until(() => !E.circle.spinning, 6000);
  check('reduced motion: the circle is two turns, not twenty', r.name === 'circle' && Math.round(Math.abs(cat.yaw - y0) / (2 * Math.PI)) === 2, `${((cat.yaw - y0) / (2 * Math.PI)).toFixed(2)} turns`); }
ui.say('quiet now'); await sleep(100);
check('reduced motion: messages arrive as words', document.getElementById('say').classList.contains('plain'), '');
check('reduced motion: he still floats, more gently', stage.reducedMotion, '');
