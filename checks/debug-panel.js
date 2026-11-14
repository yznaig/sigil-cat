// debug-panel.js (fx lane, playtest 3; Aaron: "can you add a debug for spawning in a cake, and for changing bonk amounts
// aswell, like set to zero, +1000, +1000000"). Run with #debug. The panel's own buttons, clicked: a cake comes into the
// room (the first is the party cake, then cake-2, ...), the bonk count is set, and the bonk achievements react as they
// do to real bonks (earned tiers are never taken back). Nothing outside the panel changes.
cat.auto = false;
const A = site.achievements, R = E.box.recipe;
await until(() => [...document.querySelectorAll('.controls button')].some((b) => b.textContent === 'cake'), 15000);
const button = (label) => [...document.querySelectorAll('.controls button')].find((b) => b.textContent === label);
check('the debug panel has the four new buttons', ['cake', 'bonks 0', 'bonks +1000', 'bonks +1000000'].every(button));
const bonksText = () => document.getElementById('bonks').textContent;

button('cake').click();
await until(() => keepsakes.get('cake')?.worldReady, 15000);
check('cake: the first cake comes into the room, a bake counted, ready for its party', keepsakes.get('cake')?.worldReady && R.state.bakes === 1 && R.state.phase === 'revealed' && A.has('baker'),
  JSON.stringify({ bakes: R.state.bakes, phase: R.state.phase }));
button('cake').click();
await until(() => keepsakes.get('cake-2')?.worldReady, 15000);
check('cake again: another cake, cake-2, next to it', keepsakes.get('cake-2')?.worldReady && keepsakes.has('cake') && R.state.bakes === 2);
await sleep(1200); await __shot('debug-cakes');

button('bonks +1000').click(); await sleep(300);
check('+1000: the count and its line, saved', ui.count === 1000 && store.get('bonks') === 1000 && /^1000 bonks$/.test(bonksText()), bonksText());
check('+1000: the bonk tiers up to a thousand are earned, not ten thousand', ['bonk-1', 'bonk-100', 'bonk-500', 'bonk-1000'].every((id) => A.has(id)) && !A.has('bonk-10000'));
button('bonks +1000000').click(); await sleep(300);
check('+1000000: added on top, and Bonk Legend earned', ui.count === 1001000 && store.get('bonks') === 1001000 && A.has('bonk-10000'), bonksText());
button('bonks 0').click(); await sleep(300);
check('0: the count is zero, the earned tiers stay earned', ui.count === 0 && store.get('bonks') === 0 && bonksText() === '0 bonks' && A.has('bonk-10000'), bonksText());
const mid = catMid(); await tap(mid.x, mid.y); await sleep(200);
check('and a real bonk counts on from zero', ui.count === 1 && store.get('bonks') === 1, bonksText());
await sleep(500); await __shot('debug-panel');
// polish lane (2026-11-13; Aaron: "I used the achievement all debug, and I did not get the platinum cat item"): 'ach all'
// is earning every achievement, Platinum Cat's reveal and its badge included; the old 'platinum' button (the same) is gone
check('one button earns them all; no separate platinum button', !!button('ach all') && !button('platinum'));
await until(() => !A.queued, 60000);   // the bonk tiers' reveals above play out first (they queue, one at a time)
button('ach all').click();
check('ach all: every achievement earned, Platinum Cat last', A.count === A.total && A.has('platinum'), `${A.count} of ${A.total}`);
check('ach all: Platinum Cat\'s reveal plays', await until(() => A.reveal?.classList.contains('platinum'), 20000), A.reveal?.className);
check('ach all: the Platinum Cat badge falls into the room', await until(() => keepsakes.get('platinum')?.worldReady, 15000), keepsakes.get('platinum')?.worldError || '');
await sleep(1500); await __shot('debug-panel-platinum');
