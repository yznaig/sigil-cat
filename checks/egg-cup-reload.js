// After checks/egg-cup.js and a reload: the cup comes back standing (no second fall), in the same place in the row,
// and the egg is still in it.
cat.auto = false;
const was = store.get('eggCupCheck');
check('cup comes back after a reload, standing (no second fall)', await until(() => site.eggCup?.ready && site.stand?.ready, 20000) && !site.eggCup.arrival && !site.eggCup.arriving, JSON.stringify({ arrival: site.eggCup?.arrival }));
const egg = keepsakes.get('egg'); await egg?.worldTask;
check('cup the egg is still in it', await until(() => egg?.worldEntry?.support?.id === 'egg-cup' && site.eggCup.occupant === 'egg', 8000), JSON.stringify(egg?.worldEntry?.support));
const d = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
check('cup and stand stand where they stood', !!was && d(was.cup, site.eggCup.root.position.toArray()) < 1e-4 && d(was.stand, site.stand.root.position.toArray()) < 1e-4 && d(was.egg, egg.worldEntry.object.position.toArray()) < 1e-3,
  JSON.stringify({ was, cup: site.eggCup.root.position.toArray(), egg: egg?.worldEntry?.object.position.toArray() }));
await sleep(500); document.activeElement?.blur(); await __shot('egg-cup-reload');
