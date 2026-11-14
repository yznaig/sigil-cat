// The light bulb sequence (e1111-35) played with real strokes and real pointer input, then (--then bulb-reload.js)
// what a reload keeps. Order here: idea over his head, the delayed first effect, an undelayed second cast, click to
// drop, a bolt outside the water, the bulb dragged into the puddle and struck, the rack arriving later with its
// lampshade, the bulb dragged into the shade. checks/bulb-reloads.mjs reloads at every stage and covers the other
// order (rack first, shade grown onto it).
cat.auto = false; store.del('lamp.stage'); store.flush();
const calm = stage.reducedMotion, P = calm ? 'bulb-calm-' : 'bulb-';   // review shot names
const L = site.lamp, W = site.world, T = site.THREE;
const events = []; addEventListener('sigilcat:lamp-lit', (e) => events.push(e.detail));
const rectOf = () => L.inst?.picture?.rect;
const mid = (r) => ({x: r.x + r.w / 2, y: r.y + r.h / 2});
check('bulb fixture starts before the first sigil', !L.stage && !keepsakes.has('bulb') && !keepsakes.has('rack') && !keepsakes.has('puddle'));

// A first touch of the page (a tap on the air) fetches the engine and warms the bulb, as it does for a visitor.
const air = {x: stage.width * .82, y: stage.height * .3}; await tap(air.x, air.y);
check('bulb first touch prewarms the engine and the bulb', await until(() => W.ready && stage.warmLeft === 0 && stage.warmLog.some((s) => / bulb /.test(s)), 30000), JSON.stringify(stage.warmLog.slice(-2)));
// 1. The first drawn sigil: the bulb appears and he shakes, and the cup's own effect waits about two seconds.
const t0 = performance.now(), glassBefore = E.glass.count;
const first = await drawSigil('cup');
check('bulb first sigil recognized', first.name === 'cup', drew(first));
const appeared = await until(() => L.hovering && L.inst?.worldEntry, 4000, 10), tAppear = performance.now();
check('bulb appears over his head on the first sigil, promptly', appeared && L.stage === 'idea' && tAppear - t0 < 1200, `after ${(tAppear - t0).toFixed(0)}ms (stroke included)`);
check('bulb his little shake plays', cat.emoteLog.some((s) => s.startsWith('bulb: idea')), JSON.stringify(cat.emoteLog.slice(-3)));
check('bulb effect waits while the idea shows', E.glass.count === glassBefore);
await sleep(260); await __shot(P + 'idea-pop');
await sleep(500);
const r0 = rectOf(), crown = cat.screenOf([cat.seat.position.x, cat.seat.position.y, cat.seat.position.z]);
check('bulb hovers above his crown, centred on him', r0.y + r0.h < crown.y && Math.abs(r0.x + r0.w / 2 - crown.x) < 30 && r0.y > stage.insets.top - 10, JSON.stringify({rect: r0, crown}));
check('bulb is lit while it is an idea', L.glow === 1 && L.inst.picture.materials.some((m) => m.name === 'lamp-filament' && m.emissiveIntensity === 3));
await __shot(P + 'idea');
// its own bob, on top of his float: the gap to his crown changes by a few pixels, never more
const gaps = []; for (let n = 0; n < 12; n++) { const c = cat.screenOf([cat.seat.position.x, cat.seat.position.y, cat.seat.position.z]); gaps.push(+(c.y - rectOf().y).toFixed(1)); await sleep(110); }
const spread = Math.max(...gaps) - Math.min(...gaps);
check(calm ? 'bulb calm: it holds still over his head' : 'bulb bobs gently over his head', calm ? spread < 1.5 : spread > 2 && spread < 16, JSON.stringify(gaps));
const started = await until(() => E.glass.count > glassBefore, 4000, 5), real = (performance.now() - tAppear) / 1000, delay = L.stats.releaseAt - L.stats.appearAt;
check('bulb first effect follows about 2s after the bulb', started && delay >= 2 && delay < 2.12 && real > 1.8 && real < 3, `${delay.toFixed(3)}s on the page clock, ${real.toFixed(2)}s real`);
check('bulb holds the cast once', L.stats.casts === 1 && L.stats.held === 1);
await fast(8, () => until(() => !E.glass.busy && keepsakes.has('puddle'), 30000));

// 2. A second drawn sigil plays at once and gives no second bulb. (It strikes the puddle: no effect on a hovering bulb.)
const boltBefore = E.bolt.casts, t1 = performance.now();
const second = await drawSigil('zigzag');
const quick = await until(() => E.bolt.casts > boltBefore, 1500, 10);
check('bulb second sigil is not delayed', second.name === 'zigzag' && quick && performance.now() - t1 < 900, `${(performance.now() - t1).toFixed(0)}ms ${drew(second)}`);
check('bulb second sigil gives no second bulb', L.stats.casts === 1 && [...W.entries.keys()].filter((id) => id === 'bulb').length === 1 && L.stage === 'idea' && L.hovering);
await until(() => !E.bolt.busy, 6000);

// 3. Click it: it goes out and drops to the floor, beside him and in view.
let r = rectOf(); await tap(mid(r).x, mid(r).y);
check('bulb click drops it', L.stage === 'dropped' && !L.hovering && L.stats.knocks === 1);
const bulb = L.inst, e = bulb.worldEntry;
const rested = await until(() => e.body.isSleeping() && W.held?.entry !== e, 10000);
r = rectOf();
check('bulb lands unlit on the floor, in view', rested && L.glow === 0 && e.body.translation().y < .1 && r.x >= 0 && r.x + r.w <= stage.width && r.y + r.h <= stage.height - stage.insets.bottom, JSON.stringify({p: e.body.translation(), r}));
check('bulb dropped bulb clears his body', r.x > cat.rect.x + cat.rect.w * .75 || r.x + r.w < cat.rect.x + cat.rect.w * .25 || r.y > cat.screenOf([0, 0, 0]).y, JSON.stringify({r, cat: cat.rect}));
await __shot(P + 'dropped');

// 4. Lightning while it lies dry does nothing to it.
if (L.inPuddle()) { e.body.setTranslation(W.entries.get('bulb').home(), true); W.wake(e); await until(() => e.body.isSleeping(), 8000); }
await fast(4, async () => { site.cast('zigzag'); await until(() => !E.bolt.busy, 12000); });
check('bulb bolt outside the water leaves it dark', !L.inPuddle() && L.stage === 'dropped' && L.glow === 0 && E.bolt.lastVia);

// 5. Drag it into the puddle (real pointer), then strike: it lights, with no flicker.
const pick = () => { const b = rectOf(); for (let y = b.y + 3; y < b.y + b.h - 2; y += 2) for (let x = b.x + 3; x < b.x + b.w - 2; x += 2) if (site.worldInput.pick({clientX: x, clientY: y})?.entry === e) return {x, y}; return null; };
const pool = E.glass.puddle; let from = pick();
check('bulb has a pick surface on the floor', !!from);
const path = (a, b, n = 14) => Array.from({length: n + 1}, (_, i) => ({x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n - Math.sin(i / n * Math.PI) * 60}));
await drag(path(from, {x: pool.x, y: pool.y}), 30);
await until(() => e.body.isSleeping() && !W.held, 10000);
const wet = L.inPuddle();
check('bulb dragged into the puddle lies in the water', wet, JSON.stringify({bulb: e.body.translation(), pool: keepsakes.get('puddle').state.floor}));
await __shot(P + 'in-puddle');
const glows = []; const watch = () => glows.push(L.glow); stage.onFrame.push(watch);
site.cast('zigzag');
await until(() => L.stage === 'lit', 3000, 10);
await until(() => !E.bolt.busy && L.glow >= .84, 8000);
stage.onFrame.splice(stage.onFrame.indexOf(watch), 1);
const rises = glows.filter((g, i) => i && g < glows[i - 1] - 1e-6).length;
check('bulb lightning in the water lights it, rising once without flicker', L.stage === 'lit' && Math.abs(L.glow - L.config.loose) < 1e-6 && rises === 0 && (calm || glows.some((g) => g > 0 && g < .8)), `drops=${rises} samples=${glows.length}`);
check('bulb no lampshade yet: the rack is not here', !L.shade && !keepsakes.has('rack'));
await until(() => e.body.isSleeping(), 8000); await sleep(300);
await __shot(P + 'lit-puddle');

// 6. The rack arrives later (the triangle): it falls in carrying the lampshade, then the hat lands on him.
site.cast('triangle');
await until(() => site.rack.arrival, 15000, 5);
const arrival = site.rack.arrival;
check('bulb rack arrives with the lampshade already on it', !!L.shade && L.shade.group.parent === site.rack.picture.visual);
await until(() => arrival.done, 8000, 10);
check('bulb rack arrival dropped and bounced', arrival.mode === (stage.reducedMotion ? 'fade' : 'drop') && (stage.reducedMotion || arrival.impacts.length >= 3 && arrival.impacts.length <= 4), JSON.stringify(arrival.impacts));
await until(() => !E.hat.busy && E.hat.wearing, 8000); await sleep(500);
check('bulb lampshade sits on the socket, dark, with the bulb loose', !L.occupied && !L.light.visible && L.shade.group.position.distanceTo(new T.Vector3(...site.supports.registry.get('rack-lamp').slots[0].position)) < 1e-6);
await __shot(P + 'lampshade');

// 7. Drag the glowing bulb into the shade: the lamp lights.
const shadeAt = mid(L.shadeRect()); from = pick();
await drag(path(from, shadeAt, 18), 30); await sleep(400);
check('bulb dragged into the shade lights the lamp', L.occupied && L.on && L.light.visible && L.halo.visible && L.stage === 'lamp', JSON.stringify({from, shadeAt, occupied: L.occupied}));
check('bulb lamp-lit event fires once, marked first', events.length === 1 && events[0].first === true && events[0].by === 'drag', JSON.stringify(events));
check('bulb lit shade glows (violet: a UV lamp, playtest 2)', L.shade.group.children.some((o) => o.material?.name === 'shade-outside' && o.material.emissiveIntensity > .5));
await sleep(600);
await __shot(P + 'lamp-lit');
store.set('bulbCheck', {wearing: E.hat.wearing}); store.flush();
