// achievements-badge-reload.js: after checks/achievements-badge.js. The badge is still pinned to the board and the
// cards stay free (playtest 2); Platinum Cat is still earned and nothing drops a second badge.
cat.auto = false;
const T = site.THREE;
await until(() => keepsakes.get('platinum')?.worldReady && site.pinboard.ready, 15000);
const badge = keepsakes.get('platinum'), e = badge.worldEntry;
await until(() => e.support?.id === 'platinum-cover', 8000); await sleep(1500);
check('after a reload the badge is still pinned to the board', e.support?.id === 'platinum-cover' && badge.picture.attached);
const cards = ['paper', 'postcard', 'ticket'].map((id) => keepsakes.get(id)).filter((i) => i?.worldEntry?.support?.id === 'pinboard');
check('and the cards are still free to take', cards.length === 3 && cards.every((i) => i.worldEntry.canGrab !== false));
check('Platinum Cat is still earned, and there is one badge', site.achievements.has('platinum') && [...keepsakes.live.keys()].filter((k) => k === 'platinum').length === 1);
document.activeElement?.blur(); await __shot('ach-badge-reload');
