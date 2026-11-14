// The rack's arrival when it is unlocked (e1111-37): it falls from above the page, lands with a wooden thud and bounces
// two or three times, each lower, into exactly its place. Reduced motion: a short fade-in. --then world-rack-drop-reload.js:
// a reload never replays it. Review frames are taken in slow motion (the page clock at a fifth).
cat.auto = false;
const R = site.rack, T = site.THREE, calm = stage.reducedMotion;
const keyRects = [], watchKey = () => { const b = keepsakes.get('rack')?.el.getBoundingClientRect(); if (b && R.picture?.card.visible) keyRects.push([b.x, b.y]); };
stage.onFrame.push(watchKey);
keepsakes.give('rack');                                          // the unlock
check('rack drop starts on unlock', await until(() => R.arrival, 20000, 5));
const A = R.arrival;
// Playtest 2: unlocked without the cake, its hats are the sigil's three; the party peg waits for the cake.
check('rack drop holds it above the page until its hats hang on it', R.slots.every((s) => !R.owned().includes(s.id) || s.occupant === 'rack/' + s.id) || !A.samples.length, JSON.stringify(R.slots.map((s) => s.occupant)));
if (!calm) {
  stage.timeScale = .2;
  const at = async (t, name) => { await until(() => (A.samples.at(-1)?.t ?? 0) >= t || A.done, 8000, 2); await __shot(name); };
  await until(() => A.plan, 4000, 2);
  const P = A.plan;
  await at(P.touches[0] * .55, 'rack-drop-1-falling');
  await at(P.touches[0] + .012, 'rack-drop-2-landing');
  await at(P.touches[0] + (P.touches[1] - P.touches[0]) / 2, 'rack-drop-3-first-bounce');
  await at(P.touches[1] + (P.touches[2] - P.touches[1]) / 2, 'rack-drop-4-second-bounce');
}
await until(() => A.done, 15000, 5); stage.timeScale = 1;
stage.onFrame.splice(stage.onFrame.indexOf(watchKey), 1);
const S = A.samples, rect = R.picture.rect;
if (calm) {
  check('rack drop calm: a short fade where it stands', A.mode === 'fade' && S.every((s) => s.offset === 0 && s.sx === 1 && s.sy === 1) && S.at(-1).opacity === 1 && A.duration <= .4 && S.some((s) => s.opacity > 0 && s.opacity < 1), JSON.stringify({mode: A.mode, duration: A.duration, n: S.length}));
  check('rack drop calm: no thuds', A.impacts.length === 0);
} else {
  check('rack drop falls from above the top of the page', A.mode === 'drop' && A.plan.drop >= rect.y + rect.h && S[0].offset >= rect.y + rect.h, JSON.stringify({drop: A.plan.drop, first: S[0].offset, rect}));
  // rebounds: local peaks after the first touch, each lower than the last
  const after = S.filter((s) => s.t > A.plan.touches[0]), peaks = [];
  for (let i = 1; i < after.length - 1; i++) if (after[i].offset > 0 && after[i].offset >= after[i - 1].offset && after[i].offset > after[i + 1].offset) peaks.push(+after[i].offset.toFixed(2));
  check('rack drop bounces two or three times, each lower', peaks.length >= 2 && peaks.length <= 3 && peaks.every((p, i) => !i || p < peaks[i - 1]) && A.plan.heights.length === 3, JSON.stringify({peaks, planned: A.plan.heights}));
  // Collision sounds are off (Aaron, e1111-58): each touch still reaches the impact adapter, softer each time, and is
  // silent; with SITE.sounds.collisions back on it must be a wooden thud again.
  const voiced = site.config.sounds.collisions !== false;
  check('rack drop touches at each bounce, softer each time, ' + (voiced ? 'thudding on wood' : 'silent (e1111-58)'), A.impacts.length === 4 && A.impacts.every((m, i) => !i || m.strength < A.impacts[i - 1].strength) && (voiced ? A.impacts.filter((m) => /^impact-wood-medium-/.test(m.sound || '')).length >= 3 : A.impacts.every((m) => !m.sound)), JSON.stringify(A.impacts));
  check('rack drop squashes on landing and rocks a little', S.some((s) => s.sy < .95 && s.sx > 1.02) && S.some((s) => Math.abs(s.tilt) > .005), JSON.stringify({minSy: Math.min(...S.map((s) => s.sy)), maxTilt: Math.max(...S.map((s) => Math.abs(s.tilt)))}));
  check('rack drop takes about a second', A.duration > .8 && A.duration < 1.4, `${A.duration.toFixed(3)}s`);
}
// It ends exactly where it lives: the card at its body, square to the camera, full size and opacity, shadow restored.
const card = R.picture.card, base = new T.Vector3().setFromMatrixPosition(R.root.matrixWorld);
const turn = card.quaternion.angleTo(stage.camera.quaternion), body = R.entry.body.translation();
check('rack drop rests exactly at its place', card.position.distanceTo(base) < 1e-9 && turn < 1e-6 && card.scale.x === 1 && card.scale.y === 1 && card.children[0].material.opacity === 1, JSON.stringify({d: card.position.distanceTo(base), turn, scale: card.scale.toArray(), opacity: card.children[0].material.opacity}));
const keyMoved = Math.max(0, ...keyRects.map(([x, y]) => Math.hypot(x - keyRects[0][0], y - keyRects[0][1])));
check('rack drop never moved its body or its keyboard/hit box', Math.abs(body.x - R.root.position.x) < 1e-6 && Math.abs(body.y - R.root.position.y) < 1e-6 && keyMoved <= .5, JSON.stringify({keyMoved, body, root: R.root.position, n: keyRects.length}));
const shadow = site.worldLayout.shadows.get('rack')?.group.children.find((o) => o.material?.isMeshBasicMaterial);
check('rack drop restores its floor shadow and controls', Math.abs((shadow?.material.opacity ?? .24) - .24) < 1e-9 && !R.ui);
await sleep(400); await __shot(calm ? 'rack-drop-calm-rest' : 'rack-drop-5-rest');
store.set('rackDropCheck', {x: R.root.position.x, y: R.root.position.y}); store.flush();
