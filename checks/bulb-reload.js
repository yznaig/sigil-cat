// After bulb.js: a reload keeps the lit lamp, its shade and the rack where they are, replays nothing and fires nothing.
cat.auto = false; await site.rack.ready(); await site.lamp.inst?.worldTask; await sleep(1500);
const L = site.lamp, R = site.rack;
check('bulb reload: the lamp is still lit, in its shade', L.stage === 'lamp' && L.occupied && L.on && L.light.visible && L.halo.visible && !!L.shade && L.shade.group.parent === R.picture.visual);
check('bulb reload: nothing replays (no idea, no arrival, no lamp-lit event)', !L.hovering && L.stats.lit === 0 && L.stats.casts === 0 && !R.arrival && !cat.emoteLog.some((s) => s.startsWith('bulb')));
check('bulb reload: the next drawn sigil is not held', site.beforeCast('star', {stroke: [{x: 0, y: 0}]}) === null);
await __shot(stage.reducedMotion ? 'bulb-calm-reload' : 'bulb-reload');
