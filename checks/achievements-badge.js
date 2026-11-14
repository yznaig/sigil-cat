// achievements-badge.js: the Platinum Cat badge (e1111-46). With the board up (three cards found), earning Platinum
// Cat drops a heavy physical platinum badge from the top of the page. Dragged (real pointer input) onto the board it
// pins to the middle of it. Playtest 2 (furniture lane): it is round and covers a good part of the board, not all of
// it, and the cards around and under it stay free to take. Its key pins it back (keyboard). Then
// checks/achievements-badge-reload.js: still pinned after a reload.
cat.auto = false;
const W = site.world, S = site.supports, T = site.THREE, A = site.achievements;
const cards = ['paper', 'postcard', 'ticket'].map((id) => keepsakes.give(id));
await Promise.all(cards.map((i) => i.worldTask)); await site.pinboard.task; await sleep(2200);
// nothing goes onto the board by itself (cards lane, playtest 3): the player pins them
check('the new cards wait on the floor', cards.every((i) => !i.worldEntry?.support), cards.map((i) => i.worldEntry?.support?.id).join(','));
for (const i of cards) site.pinboard.pin(i.id, false);
check('the board is up with its three cards pinned', site.pinboard.ready && cards.every((i) => i.worldEntry?.support?.id === 'pinboard'), cards.map((i) => i.worldEntry?.support?.id).join(','));
await until(() => settled(), 10000);

// ---- earning it: the toast, then the badge falls ----
A.grantAll();
check('every other achievement makes Platinum Cat', A.has('platinum') && A.count === A.total, `${A.count} of ${A.total}`);
await until(() => keepsakes.has('platinum'), 8000);
const badge = keepsakes.get('platinum'); await badge.worldTask;
const e = badge.worldEntry, startY = e.body.translation().y;
check(stage.reducedMotion ? 'calm: the badge settles from just above the floor' : 'the badge is a physical world body that starts above the page', !!e && (stage.reducedMotion ? startY > 0.3 && startY < 1 : startY > 2 && stage.toScreen(e.object.position).y < 0), `y ${startY.toFixed(2)}`);
await sleep(stage.reducedMotion ? 200 : 380); await __shot('ach-badge-falling');
await until(() => e.body.isSleeping(), 9000);
const rest = e.body.translation(), r0 = badge.picture.rect;
check('it falls with weight and comes to rest on the floor, inside the page', e.body.isSleeping() && rest.y < 0.1 && r0.x + r0.w > 0 && r0.x < stage.width && r0.y + r0.h <= stage.height, JSON.stringify({ y: rest.y.toFixed(3), rect: r0 }));
const size = site.platinumSize = site.achievements.badge && (await A.badge).boardSize(), m = (await A.badge).model;
check('it is round, sized from the board\'s bounds now: most of its height, not all of it', Math.abs(m.Rp - Math.min(size.h * 0.43, size.w * 0.36)) < 1e-6 && m.w === m.h && m.w < size.h, JSON.stringify({ board: size, badge: { across: m.w } }));
const mats = []; m.group.traverse((o) => { if (o.isMesh) for (const x of [].concat(o.material)) mats.push(x); });
check('platinum PBR: fully metallic, its own environment, polished and brushed parts, engraved bump', mats.every((x) => x.metalness === 1 && x.envMap) && mats.some((x) => x.roughness <= 0.12) && mats.some((x) => x.roughnessMap && x.bumpMap), `${mats.length} materials`);
let meshes = 0; m.group.traverse((o) => { if (o.isMesh) meshes++; });
check('modelled: disc, rim, medallion, cat, a pin head, bar pins on the back', meshes >= 14, `${meshes} meshes`);
await __shot('ach-badge-landed');
// fx lane, playtest 3 (Aaron: the small bell "should also sound when you tap on the platinum cat award"): a real tap on it
{ const voices = [], start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { voices.push(this.buffer); return start.apply(this, a); };
  await audio.load('bell'); const at = stage.toScreen(e.object.position); await tap(at.x, at.y); await sleep(250);
  AudioBufferSourceNode.prototype.start = start;
  check('a tap on the badge rings the small bell', voices.includes(audio.buffer('bell')) && !e.support, `${voices.length} voices`); }

// ---- dragged onto the board with real pointer input ----
const board = site.pinboard, br = board.picture.rect, target = { x: br.x + br.w / 2, y: br.y + br.h / 2 };
const from = stage.toScreen(e.object.position);
check('a press on the badge picks it', site.worldInput.pick({ clientX: from.x, clientY: from.y })?.entry === e);
const path = Array.from({ length: 26 }, (_, n) => { const u = n / 25, k = u * u * (3 - 2 * u); return { x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k - Math.sin(u * Math.PI) * 60 }; });
await drag([...path, target, target, target], 22);
await until(() => !S.active, 3000);
check('dropped over the board, it pins to the board', e.support?.id === 'platinum-cover' && badge.picture.attached, JSON.stringify(e.support));
const fit = m.inner.scale, xs = board.art.vertices.map((v) => v.x), ys = board.art.vertices.map((v) => v.y), bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
check('it stays round, scaled to the board\'s current bounds', fit.x === fit.y && Math.abs(m.Rp * fit.x - Math.min(bh * 0.43, bw * 0.36)) < 1e-3, `scale ${fit.x.toFixed(3)}`);
await sleep(400); document.activeElement?.blur(); await __shot('ach-badge-on-board');

// ---- the cards around and under it stay free (playtest 2) ----
const onBoard = cards.filter((i) => i.worldEntry.support?.id === 'pinboard');
// a point on each card outside the disc (its far corner from the board's centre)
const cardPoint = (i) => { const sx = Math.sign(i.object.position.clone().sub(board.root.position).applyQuaternion(board.root.quaternion.clone().invert()).x) || 1; return stage.toScreen(i.object.localToWorld(new T.Vector3(sx * i.cardDimensions.width * 0.42, i.cardDimensions.height * 0.38, 0.003))); };
check('every card keeps its grab (entry.canGrab)', onBoard.length === 3 && onBoard.every((i) => i.worldEntry.canGrab !== false));
check('a press on a card where it shows picks the card', onBoard.every((i) => { const p = cardPoint(i); return site.worldInput.pick({ clientX: p.x, clientY: p.y })?.entry === i.worldEntry; }));
const mid = stage.toScreen(badge.object.position);
check('a press on the badge picks the badge', site.worldInput.pick({ clientX: mid.x, clientY: mid.y })?.entry === e);
check('the board has no button row left to cover', !document.querySelector('.world-board-actions'));
await __pointer([mid, { x: mid.x - 30, y: mid.y + 40 }, { x: mid.x - 200, y: mid.y + 220 }, { x: mid.x - 420, y: mid.y + 380 }]);   // a native drag on the badge, off the board: it lifts the badge
await until(() => !W.held, 2000);
check('a native drag on the badge moves the badge, never a card', onBoard.every((i) => i.worldEntry.support?.id === 'pinboard') && e.support?.id !== 'platinum-cover', String(e.support?.id));

// ---- lifted off, they are free ----
check('lifted off, the cards are free again', onBoard.every((i) => i.worldEntry.canGrab !== false) && !badge.picture.attached && m.inner.scale.x === 1);
check('and a card can be lifted again', site.worldInput.keyboardLift(onBoard[1].worldEntry) === true && W.held?.entry === onBoard[1].worldEntry);
site.worldInput.cancel(); site.pinboard.pin(onBoard[1].id, false); await sleep(300);
await until(() => e.body.isSleeping() || !!e.support, 8000);

// ---- the keyboard: its key pins it back ----
badge.key.querySelector('button').click(); await until(() => !S.active, 3000);
check('its key button pins it to the board again', e.support?.id === 'platinum-cover' && onBoard.every((i) => i.worldEntry.canGrab !== false));
store.flush(); await sleep(300);
