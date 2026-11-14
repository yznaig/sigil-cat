// After cards-tap.js and a reload: a card the player pinned is still pinned (older saves keep their pinned cards), and
// a card left on the floor is still on the floor: the board pins nothing by itself on a reload either (playtest 3).
cat.auto=false;const ids=['paper','postcard','ticket','recipe'],want=store.get('cardsTapCheck');
await Promise.all(ids.map(id=>keepsakes.get(id)?.worldTask));await until(()=>site.pinboard?.ready,15000);await sleep(1500);
const now=Object.fromEntries(ids.map(id=>[id,keepsakes.get(id)?.worldEntry?.support?.id||null]));
check('cards reload: pinned cards stay pinned, loose ones stay on the floor',want.paper==='pinboard'&&want.postcard==='pinboard'&&!want.ticket&&!want.recipe&&JSON.stringify(now)===JSON.stringify(want),JSON.stringify({want,now}));
await __shot('cards-tap-reload');
