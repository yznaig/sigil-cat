// platinum-earn.js (polish lane, 2026-11-13; Aaron: "I used the achievement all debug, and I did not get the platinum
// cat item ... If it's not only the debug button and it's actually just broken, then fix it"). The real path, from a save:
//   ?last=circle  the save holds every achievement but Full Circle (and Fluent, made of the signs): the circle drawn as
//                 a real sigil earns both, and Platinum Cat with them
//   ?last=flappy  every achievement but Flappy (a playtest-2 one, e1112-37): the bird game's first point earns it
//   ?last=lost    Platinum Cat earned before, its badge never saved (the badge module once failed to parse): it comes back
// Each time: Platinum Cat is earned, its reveal plays (not for a lost badge), and one physical badge falls into the room.
// checks/platinum-earn-reload.js: after a reload it is still earned and the badge is still there, once.
cat.auto = false;
const A = site.achievements, last = new URLSearchParams(location.search).get('last');
check(`the save: ${last === 'lost' ? 'Platinum Cat earned, no badge saved (run-all gives no keepsakes)' : `every achievement but ${last} (and Platinum Cat)`}`,
  last === 'lost' ? A.has('platinum') : !A.has('platinum') && !A.has(last) && A.count >= A.total - 3, `${A.count} of ${A.total}`);
if (last === 'circle') { const r = await drawSigil('circle'); await until(() => A.has('circle'), 4000); check('the circle, drawn, earns Full Circle and Fluent', A.has('circle') && A.has('fluent'), drew(r)); }
if (last === 'flappy') A.score(1);   // what the bird game calls on each new score (src/flappy/screen.js)
check('Platinum Cat is earned, with every other achievement', A.has('platinum') && A.count === A.total, `${A.count} of ${A.total}`);
if (last !== 'lost') check('Platinum Cat\'s reveal plays', await until(() => A.reveal?.classList.contains('platinum'), 20000), A.reveal?.className);
check('the badge comes into the room as a physical body', await until(() => keepsakes.get('platinum')?.worldReady, 15000), keepsakes.get('platinum')?.worldError || '');
const e = keepsakes.get('platinum').worldEntry;
await until(() => e.body.isSleeping(), 12000);
const r = keepsakes.get('platinum').picture.rect;
check('it comes to rest inside the page', e.body.isSleeping() && r.x + r.w > 0 && r.x < stage.width && r.y + r.h <= stage.height + 1 && r.y < stage.height, JSON.stringify(r));
check('and it is saved', !!store.get('keepsakes.platinum'));
await sleep(600); await __shot(`platinum-earn-${last}`);
store.flush(); await sleep(300);
