// furniture-p2.js: the furniture lane of playtest 2 (2026-11-12), with real pointer input where a player would use it.
//   1 the shelf is level and larger (p3: turned right, level, right/lower, a wall shadow)          
//   2 a drop anywhere over the shelf or the board places the item
//   3 two hooks under the shelf: the pail and the flour hang, swing, and come off with a pull
//   4 Collector = every shelf spot (bays and hooks); Curator = a full board
//   5 a tap on the recipe card opens it as a sheet, like the rejected paper (playtest 3: one small (x), no other button)
//   6 the paper lifts out from under the pinned recipe and stays visible
//   7 the Platinum Cat badge is round and covers a good part of the board, not all of it
//   8 the googly eyes stay on him (choir, pose changes) and go only on him or on the badge
// Then checks/furniture-p2-reload.js: the eyes, the hung items and the badge survive a reload.
cat.auto = false;
const W = site.world, S = site.supports, T = site.THREE, A = site.achievements, shelf = site.shelf;
const press = async (pts, ms = 20) => { const id = ++pointerIds; fire('pointerdown', pts[0].x, pts[0].y, id); for (const p of pts.slice(1)) { await sleep(ms); fire('pointermove', p.x, p.y, id); } return { id, up: (p = pts.at(-1)) => fire('pointerup', p.x, p.y, id, 0) }; };
const line = (a, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }));
// a point on the item's own geometry (pick it the way a player would: on the art, not in a gap)
const grip = (i) => { const r = i.picture.rect; for (let y = r.y + r.h * 0.3; y < r.y + r.h - 2; y += 3) for (let x = r.x + r.w * 0.3; x < r.x + r.w * 0.7; x += 3) if (site.worldInput.pick({ clientX: x, clientY: y })?.entry === i.worldEntry) return { x, y }; return null; };
const ids = ['rifle', 'top', 'pat', 'tin'], cards = ['paper', 'postcard', 'ticket', 'recipe'];

// ---- 1. the shelf ----
for (const id of ids) keepsakes.give(id);
await Promise.all(ids.map((id) => keepsakes.get(id).worldTask)); await shelf.task; await until(() => !shelf.arriving, 30000);
const front = [-0.6, 0.6].map((x) => stage.toScreen(new T.Vector3(x, 0.05, 0.17).applyMatrix4(shelf.root.matrixWorld)));
const slope = Math.abs(front[1].y - front[0].y) / (front[1].x - front[0].x);
// Playtest-3 (e1113-30, approved from the mock-up; IMG3 "it needs to be at a roughly 20 degree angle to the *right*"):
// turned ~30 degrees to its right yet level on screen (the roll solve, src/world/shelf.js SHELF_VIEW.level).
check('1 the shelf reads level: its front edge slopes under 1 percent (e1113-30)', slope < 0.01, `slope ${(slope * 100).toFixed(2)}%`);
{ stage.camera.updateMatrixWorld(); const n = new T.Vector3(0, 0, 1).transformDirection(shelf.root.matrixWorld).transformDirection(stage.camera.matrixWorldInverse);
  const turn = Math.atan2(n.x, n.z) * 180 / Math.PI;   // its front, seen from the camera: + = turned to its right
  check('1 the shelf is turned to its right, about 30 degrees (e1113-30)', turn > 24 && turn < 36, `front turned ${turn.toFixed(1)} deg`);
  const home = { x: 18 + Math.min(stage.width * .34, 450, stage.height * .5) / 2, y: stage.insets.top + Math.min(105, stage.height * .2) };
  const c = stage.toScreen(shelf.root.position);   // its middle, against where it hung before (playtest 2)
  check('1 the shelf sits further right, and lower except on a short screen (e1113-30)', c.x > home.x + stage.width * .045 && (stage.height <= 500 ? Math.abs(c.y - home.y) < 2 : c.y > home.y + stage.height * .075), JSON.stringify({ centre: c, oldHome: home }));
  const w = shelf.wallShadow;
  check('1 the shelf casts a soft static shadow on the wall behind it', !!w?.painted && w.card.visible && w.quad.material.opacity > .1 && w.quad.material.map?.image?.width > 16, JSON.stringify({ painted: w?.painted, opacity: w?.quad.material.opacity })); }
const r1 = shelf.picture.rect;
check('1 the shelf is larger than before (34% of the width, up to 450px; was 31%, 400px)', !MOBILE ? r1.w >= Math.min(stage.width * 0.34, 450) * 0.97 : r1.w > 0, JSON.stringify(r1));
check('1 the shelf stays on the page and clear of the cat', r1.x >= 0 && r1.y >= 0 && r1.x + r1.w <= cat.screenOf([0, cat.height * 0.45, 0]).x - 40, JSON.stringify({ shelf: r1, cat: catMid() }));

// ---- 2. a drop anywhere over the shelf ----
const pat = keepsakes.get('pat'); await until(() => pat.worldEntry.body.isSleeping(), 6000);
const pg = grip(pat), shelfEnd = { x: r1.x + r1.w * 0.08, y: r1.y + r1.h * 0.55 };      // the far left end: the top's bay, not the butter's
const held = await press([pg, ...line({ x: pg.x + 10, y: pg.y - 10 }, shelfEnd)]); await sleep(250);
check('2 over the shelf, the whole shelf is outlined', !!shelf.preview && Math.abs(shelf.preview.getBoundingClientRect().width - r1.w) < 12, JSON.stringify(shelf.preview?.getBoundingClientRect()));
await __shot('p2-shelf-hover');
held.up(); await sleep(500);
check('2 let go anywhere over the shelf: the butter goes to its own bay', pat.worldEntry.support?.id === 'shelf' && pat.worldEntry.support.slot === 'pat');
for (const id of ids) shelf.store(id, false);

// ---- 3. the hooks ----
const bucket = keepsakes.give('bucket'), flour = keepsakes.give('flour'); await Promise.all([bucket.worldTask, flour.worldTask]);
await until(() => bucket.worldEntry.body.isSleeping() && flour.worldEntry.body.isSleeping(), 8000);
const bg = grip(bucket), under = { x: r1.x + r1.w * 0.35, y: r1.y + r1.h + 40 };
const h2 = await press([bg, ...line({ x: bg.x, y: bg.y - 10 }, under)]); await sleep(250);
check('3 the pail over the shelf or under it is offered a hook', S.candidate(bucket.worldEntry)?.id === 'shelf-hooks' && shelf.preview?.textContent === 'Release to hang');
h2.up(); await sleep(120);
check('3 let go: the pail hangs on a hook and swings', bucket.worldEntry.support?.id === 'shelf-hooks' && (stage.reducedMotion || S.active > 0), JSON.stringify(bucket.worldEntry.support));
await sleep(600); await __shot('p2-hook-swing');
const fg = grip(flour), h3 = await press([fg, ...line({ x: fg.x, y: fg.y - 10 }, { x: r1.x + r1.w * 0.75, y: r1.y + r1.h * 0.5 })]); h3.up(); await sleep(200);
check('3 the flour hangs on the other hook', flour.worldEntry.support?.id === 'shelf-hooks' && flour.worldEntry.support.slot !== bucket.worldEntry.support.slot.replace('bucket', 'flour'));
await until(() => !S.active, 5000); await sleep(300); await __shot('p2-hooks');
const hb = bucket.picture.rect, fb = flour.picture.rect, c = catMid();
check('3 they hang under the shelf, beside each other, clear of the cat', hb.y >= r1.y + r1.h * 0.5 && fb.y >= r1.y + r1.h * 0.5 && (hb.x + hb.w <= fb.x || fb.x + fb.w <= hb.x) && Math.max(hb.x + hb.w, fb.x + fb.w) < c.x - 80, JSON.stringify({ hb, fb }));
check('3 the hooks are in the layout\'s furniture list (nothing is lost behind them)', !!site.worldLayout.furniture()['shelf-hooks'] && shelf.hookRects().length === 2);
const bt = grip(bucket); await tap(bt.x, bt.y); await sleep(60);
check('3 a tap swings the pail (no work once it settles)', stage.reducedMotion || S.active > 0);
await until(() => !S.active, 5000); const quiet = S.stats.frames; await sleep(400);
check('3 hanging still costs nothing per frame', S.stats.frames === quiet && !S.listening);

// ---- 4. Collector and Curator ----
await sleep(300);
check('4 every shelf spot filled, hooks too: Collector', A.has('collector'));
const pull = grip(bucket); await __pointer([pull, { x: pull.x + 10, y: pull.y + 20 }, { x: pull.x + 60, y: pull.y + 140 }, { x: pull.x + 120, y: pull.y + 260 }]);
await until(() => !W.held, 2000);
check('3 a pull takes the pail off its hook', !bucket.worldEntry.support);

// ---- 5. the recipe reads with a tap ----
for (const id of cards) keepsakes.give(id);
await Promise.all(cards.map((id) => keepsakes.get(id).worldTask)); await site.pinboard.task; await sleep(1800);
for (const id of ['paper', 'postcard', 'ticket']) site.pinboard.pin(id, false);
const recipe = keepsakes.get('recipe'), board = site.pinboard, br = board.picture.rect;
await until(() => recipe.worldEntry.body.isSleeping(), 6000);
const rg = grip(recipe), corner = { x: br.x + br.w * 0.88, y: br.y + br.h * 0.2 };   // over the postcard's corner of the board
const h4 = await press([rg, ...line({ x: rg.x, y: rg.y - 10 }, corner)]); await sleep(250);
const hl = site.worldInput.highlight?.getBoundingClientRect();
check('2 over the board, the whole board is outlined', !!hl && Math.abs(hl.width - br.w) < 12 && Math.abs(hl.x - br.x) < 12, JSON.stringify({ hl, br }));
h4.up(); await sleep(1900);
check('2 let go anywhere over the board: the recipe pins in its own place', recipe.worldEntry.support?.id === 'pinboard' && recipe.worldEntry.support.slot === 'recipe');
await sleep(300);
check('4 all four cards pinned: Curator ("a full board.")', A.has('curator') && A.ACHIEVEMENTS.find((a) => a.id === 'curator').said === 'a full board.');
const rp = stage.toScreen(recipe.object.localToWorld(new T.Vector3(recipe.cardDimensions.width * 0.3, -0.05, 0.003)));
check('5 the press lands on the recipe', site.worldInput.pick({ clientX: rp.x, clientY: rp.y })?.entry === recipe.worldEntry);
await tap(rp.x, rp.y); await sleep(300);
const sheet = document.querySelector('.recipe-read .index-card');
const sheetX = document.querySelector('.recipe-read .sheet-x');
check('5 a single tap opens the recipe as a sheet, like the paper', !!sheet && /Cake in a box/.test(sheet.textContent) && /an egg/.test(sheet.textContent) && (MOBILE || document.activeElement === sheetX) && document.querySelectorAll('.recipe-read button').length === 1);
await __shot('p2-recipe-sheet');
check('5 the sheet fits and its (x) is a 44px target', sheet.getBoundingClientRect().bottom <= stage.height && parseFloat(getComputedStyle(sheetX, '::before').height) >= 44);
await __key('Escape'); await sleep(150);
check('5 Escape puts it down', !document.querySelector('.recipe-read'));
await tap(rp.x, rp.y); await sleep(200); { const f = document.querySelector('.recipe-read .sheet-frame').getBoundingClientRect(); await __pointer([{ x: Math.max(6, f.x / 2), y: stage.height / 2 }]); } await sleep(100);
check('5 a click outside puts it down', !document.querySelector('.recipe-read'));

// ---- 6. the paper from under the recipe ----
const paper = keepsakes.get('paper'), pr0 = { ...paper.picture.rect };
const pp = stage.toScreen(paper.object.localToWorld(new T.Vector3(0, paper.cardDimensions.height * 0.3, 0.003)));
check('6 the press on the paper\'s top picks the paper', site.worldInput.pick({ clientX: pp.x, clientY: pp.y })?.entry === paper.worldEntry);
const h5 = await press([pp, ...line({ x: pp.x - 2, y: pp.y + 4 }, { x: pp.x - 40, y: pp.y + 30 }, 10)]); await sleep(250);
const plane = paper.picture.card.children[0];
check('6 lifted from under the recipe, the paper moves with the hand', W.held?.entry === paper.worldEntry && Math.hypot(paper.picture.rect.x - pr0.x, paper.picture.rect.y - pr0.y) > 15, JSON.stringify({ before: pr0, now: paper.picture.rect }));
check('6 and it is drawn over the board, not behind it', paper.picture.card.visible && plane.renderOrder > board.root.userData.pictureOrder, `${plane.renderOrder} vs ${board.root.userData.pictureOrder}`);
await __shot('p2-paper-lifted');
check('6 the recipe stays pinned and visible', recipe.worldEntry.support?.id === 'pinboard' && recipe.object.visible);
h5.up({ x: c.x + 260, y: stage.height * 0.72 }); await sleep(900);
site.pinboard.pin('paper', false); await sleep(200);

// ---- 7. the badge ----
A.grantAll(); await until(() => keepsakes.has('platinum'), 8000);
const badge = keepsakes.get('platinum'); await badge.worldTask; await until(() => badge.worldEntry.body.isSleeping(), 9000);
const B = await A.badge, m = B.model, size = B.boardSize();
const bg2 = stage.toScreen(badge.object.position), bt2 = { x: br.x + br.w * 0.3, y: br.y + br.h * 0.7 };
await __pointer(line(bg2, bt2, 20)); await until(() => !S.active, 3000); await sleep(300);
check('7 let go anywhere over the board, the badge pins to it', badge.worldEntry.support?.id === 'platinum-cover');
const k = m.inner.scale.x, rr = m.Rp * k, cover = Math.PI * rr * rr / (size.w * size.h);
check('7 it is round', m.inner.scale.x === m.inner.scale.y && Math.abs(badge.picture.rect.w - badge.picture.rect.h) < 0.12 * badge.picture.rect.w || badge.picture.attached, `${(rr * 2).toFixed(3)} across`);
check('7 it covers a good part of the board, not all of it (30 to 60 percent)', cover > 0.3 && cover < 0.6 && rr * 2 < size.h, `${(cover * 100).toFixed(0)}% of ${size.w.toFixed(2)} x ${size.h.toFixed(2)}`);
await sleep(400); await __shot('p2-badge');
const post = keepsakes.get('postcard'), pc = stage.toScreen(post.object.localToWorld(new T.Vector3(post.cardDimensions.width * 0.4, post.cardDimensions.height * 0.3, 0.003)));
check('7 the cards show around it and stay theirs to take', site.worldInput.pick({ clientX: pc.x, clientY: pc.y })?.entry === post.worldEntry && post.worldEntry.canGrab !== false);

// ---- 8. the googly eyes ----
const eyes = keepsakes.give('eyes'); await eyes.worldTask; await until(() => eyes.worldEntry.body.isSleeping(), 6000);
check('8 nothing but him and the badge takes them', !site.eyesWorld.stick('paper') && !site.eyesWorld.stick('tin') && !site.eyesWorld.stick('butterman') && !eyes.worldEntry.support);
check('8 they go on the badge\'s cat', site.eyesWorld.stick('platinum') && eyes.state.on === 'platinum');
await sleep(300); await __shot('p2-eyes-badge');
const eg = grip(eyes);
check('8 on the badge, a press on them picks them, not the badge', !!eg);
site.eyesWorld.detach(); await until(() => !W.active, 8000);
await fast(8, () => E.eyes.show()); await sleep(200);
check('8 after the choir they stay on him', eyes.state.on === 'cat' && eyes.worldEntry.support?.id === 'eyes-cat');
const next = cat.pose === 'sit' ? 'lie' : 'sit'; await cat.load(next); cat.request(next); await fast(8, () => until(() => cat.pose === next && cat.phase === 'hold', 20000));
check('8 a new pose keeps them on, on his face', eyes.state.on === 'cat');
await __shot('p2-eyes-cat');
store.set('furnitureP2', { pose: cat.pose }); store.flush();
