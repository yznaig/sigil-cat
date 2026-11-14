await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));
const saved = JSON.parse(sessionStorage.getItem('physics.rest'));
const floor = () => keepsakes.floorY?.() ?? keepsakes.feet.y + 12;
const items = saved.map(({ id }) => keepsakes.get(id));
const ys = items.map((k) => k.px.y), steps = keepsakes.physics?.steps;
await sleep(1100);
check('physics reload restores saved x and settled floor bases without falling',
  items.every((k, n) => (k.physical?k.worldEntry.body.isSleeping():Math.abs(k.box.y+k.box.h-floor())<.5) && Math.abs(k.x - saved[n].x) < .005 && Math.abs(k.px.y - ys[n]) < .5) && keepsakes.physics?.active === 0);
const old = keepsakes.get('ticket');
check('physics old airborne saves set down quietly without a frame',
  old.worldEntry.body.isSleeping()&&!old.worldEntry.support&&steps===0 && keepsakes.physics?.steps === 0);
