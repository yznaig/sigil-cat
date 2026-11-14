// furniture-p2-reload.js: after checks/furniture-p2.js. What the player left stays: the flour on its hook, the eyes on
// his face, the badge on the board, Collector and Curator earned.
cat.auto = false;
await until(() => keepsakes.get('flour')?.worldReady && keepsakes.get('eyes')?.worldReady && keepsakes.get('platinum')?.worldReady && site.shelf.ready && site.pinboard.ready, 20000);
await sleep(1200);
const flour = keepsakes.get('flour'), eyes = keepsakes.get('eyes'), badge = keepsakes.get('platinum');
check('reload: the flour still hangs on its hook', flour.worldEntry.support?.id === 'shelf-hooks', JSON.stringify(flour.worldEntry.support));
check('reload: the googly eyes are still on him', eyes.state.on === 'cat' && eyes.worldEntry.support?.id === 'eyes-cat');
check('reload: the badge is still on the board', badge.worldEntry.support?.id === 'platinum-cover');
check('reload: Collector and Curator are kept', site.achievements.has('collector') && site.achievements.has('curator'));
await __shot('p2-reload');
