// box-intro-reload.js: after a reload the box's intro stays said (once per save): a square and a circle say nothing.
cat.auto = false;
const spoken = [], speak0 = ui.speak;
ui.speak = (text, ...rest) => { spoken.push([].concat(text).join(' ')); return speak0(text, ...rest); };
await until(() => keepsakes.get('box')?.worldReady, 10000); await until(settled, 10000);
const sq = await drawSigil('square'); await sleep(1500); await until(settled, 8000);
const ci = await drawSigil('circle'); await until(() => !E.circle.spinning, 6000); await sleep(400);
check('box-intro after a reload a square and a circle say no intro', sq.name === 'square' && ci.name === 'circle' && !!store.get('box.introSaid') && !spoken.some((s) => /tap the box/.test(s)),
  `drew ${drew(sq)}, ${drew(ci)}; spoken ${JSON.stringify(spoken)}`);
