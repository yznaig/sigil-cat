// text.js: the text lane of playtest-2 (2026-11-12). Run on the page with checks/lib.js and the storage run-all.sh
// gives it (some sigils and secrets found, the bird found, Platinum Cat already earned with a few others missing),
// then --then checks/text-reload.js.
//   1 cat speech (ui.speak): his script settles into words over his head, a hop and one bonk per sentence, fits
//   2 the first pickup: once ever, in the cat's voice, the right words for wheel or touch, sent by a real lift
//   3 the buttons wear the felt patch (outline, round ends)
//   4 the row shows only sigils, plus the controller as a round button; "N of M found" counts the row
//   5 the achievement reveal: waits for the message line, runes settle, the wax seal stamps with the chime, the
//     shimmer, one at a time; a say that comes meanwhile waits and then plays
//   6 the bonk tiers' metals (wood .. platinum) on the wax, in the reveal and in the book
//   7 a stored Platinum Cat is kept though new achievements are missing
//   8 no ask-the-butter hint points at a drawn star
cat.auto = false;
const A = site.achievements, C = site.config;
const calm = stage.reducedMotion;
await until(() => settled(), 20000);

// ---- 7: Platinum kept ----
check('7 a stored Platinum Cat is kept though others are missing (e1112-37)', A.has('platinum') && A.count < A.total, `${A.count} of ${A.total}, platinum ${A.has('platinum')}`);
A.evaluate(true);
check('7 re-evaluating never takes it back', A.has('platinum') && !!store.get('achievements.platinum'));

// ---- 4: the row ----
const sigils = registry.FINDS.filter((f) => f.kind === 'sigil');
const lis = [...document.querySelectorAll('#marks li')];
const rowIds = [...document.querySelectorAll('#marks button')].map((b) => b.dataset.find);
check('4 the row has one place per sigil, plus the controller', lis.length === sigils.length + 1 && lis.at(-1).classList.contains('again'), `${lis.length} places for ${sigils.length} sigils`);
check('4 no non-sigil find is in the row but the controller', rowIds.every((id) => id === 'bird' || registry.byId.get(id).kind === 'sigil') && !rowIds.includes('noscope') && !rowIds.includes('harp') && !rowIds.includes('blastoff'), rowIds.join(' '));
const birdBtn = document.querySelector('#marks li.again button[data-find=bird]'), bcs = birdBtn && getComputedStyle(birdBtn);
check('4 the controller is a round outlined button', !!birdBtn && parseFloat(bcs.borderTopWidth) >= 1 && parseFloat(bcs.borderTopLeftRadius) >= birdBtn.offsetWidth / 2 - 1, bcs ? `${bcs.borderTopWidth} ${bcs.borderTopLeftRadius}` : 'missing');
const nSig = sigils.filter((f) => registry.has(f.id)).length;
check('4 "N of M sigils" counts the sigils the row shows', document.getElementById('found').textContent === `${nSig} of ${sigils.length} sigils`, document.getElementById('found').textContent);

// ---- 3: the footer's buttons ----
for (const [label, el] of [['sound', document.querySelector('#footer .sound')], ['ask the butter', document.getElementById('ask')], ['grimoire', document.getElementById('grimoire')], ['achievements mark', document.getElementById('achievements')]]) {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  check(`3 ${label} wears the felt patch (outline, round ends, on screen)`, parseFloat(cs.borderTopWidth) >= 1 && parseFloat(cs.borderTopLeftRadius) >= r.height / 2 - 1 && /gradient/.test(cs.backgroundImage) && r.right <= stage.width && r.left >= 0, `${cs.borderTopWidth} ${cs.borderTopLeftRadius} ${Math.round(r.left)}..${Math.round(r.right)}`);
}
const fl = document.querySelector('#footer .fl').getBoundingClientRect(), mid = document.querySelector('#footer .mid').getBoundingClientRect(), fr = document.querySelector('#footer .fr').getBoundingClientRect();
// (phones play on their side now, shell lane: the landscape phone footer is three columns too; integration playtest-2)
check('3 the footer\'s three columns do not overlap', (MOBILE && innerWidth < innerHeight) || (fl.right <= mid.left + 1 && mid.right <= fr.left + 1), JSON.stringify({ fl: Math.round(fl.right), mid: [Math.round(mid.left), Math.round(mid.right)], fr: Math.round(fr.left) }));
await __shot('text-footer');

// ---- 1: speech ----
const sp = document.getElementById('speech');
const hops0 = cat.emoteLog.filter((l) => l.startsWith('speech')).length, b0 = ui.speechBonks;
const said = ui.speak(['hey.', 'did you know you can use your keyboard to play my whiskers?']);
await sleep(120);
const runesFirst = !!sp.querySelector('.ch:not(.done) svg');
check('1 the line starts in his script', calm ? sp.classList.contains('plain') : runesFirst, sp.getAttribute('aria-label'));
check('1 the first sentence: one hop and one bonk (a real voice)', ui.speechBonks === b0 + 1 && (calm || cat.emoteLog.filter((l) => l.startsWith('speech')).length === hops0 + 1), `${ui.speechBonks - b0} bonks, log ${cat.emoteLog.slice(-2).join(' | ')}`);
await until(() => sp.getAttribute('aria-label')?.startsWith('did you'), 6000);
await sleep(80);
check('1 the second sentence: another hop and bonk', ui.speechBonks === b0 + 2 && (calm || cat.emoteLog.filter((l) => l.startsWith('speech')).length === hops0 + 2), `${ui.speechBonks - b0} bonks`);
// calm: the words are plain at once (no .done marks); waiting for them would outlast the sentence and measure a line
// that is already gone (fix round B, playtest-2). The measures below are taken while he is still saying it.
await until(() => calm || [...sp.querySelectorAll('.ch')].every((c) => c.classList.contains('done')), 6000);
const sr = sp.getBoundingClientRect(), head = cat.screenOf([0, C.cat.crown[cat.pose][1], 0]);
check('1 measured while he is still saying the second sentence', sp.classList.contains('on') && sp.getAttribute('aria-label')?.startsWith('did you'), sp.className);
check('1 it settles into words, all of them', sp.querySelectorAll('.ch').length > 30 && [...sp.querySelectorAll('.ch')].every((c) => c.classList.contains('done') || calm), '');
check('1 it fits on the page', sr.left >= 0 && sr.right <= stage.width && sr.top >= 0 && sr.width > 0, JSON.stringify({ l: Math.round(sr.left), r: Math.round(sr.right), t: Math.round(sr.top), w: stage.width }));
check('1 it sits above his head, around his middle', sr.bottom <= head.y + 4 && Math.abs((sr.left + sr.right) / 2 - head.x) < stage.width * 0.25, `bottom ${Math.round(sr.bottom)} head ${Math.round(head.y)}`);
check('1 it wraps between words, never inside one', [...sp.querySelectorAll('.w')].every((w) => w.getClientRects().length === 1), '');
const name = document.getElementById('name').getBoundingClientRect();
check('1 it does not cover the name (or the name steps aside)', sr.top >= name.bottom || document.body.classList.contains('speech-over-name'), `${Math.round(sr.top)} vs ${Math.round(name.bottom)}`);
await __shot('text-speech');
check('1 ui.speak resolves when he is done', await Promise.race([said, sleep(9000).then(() => false)]) === true && !sp.classList.contains('on'));
// a sentence far too long for one line still fits
ui.speak('a very long thing to say, so long that no screen could hold it on one line, and it must wrap and maybe shrink to fit.');
await sleep(200); const lr = sp.getBoundingClientRect();
check('1 a very long sentence still fits on the page', lr.left >= 0 && lr.right <= stage.width && lr.top >= 0, JSON.stringify({ l: Math.round(lr.left), r: Math.round(lr.right), t: Math.round(lr.top), fs: sp.style.fontSize }));
await until(() => !ui.speaking, 12000);

// ---- 2: the first pickup ----
store.del('tips.pickup');
const tin = keepsakes.give('tin'); await tin.worldTask; await until(() => !site.world.stats.listening, 8000); await sleep(300);
const findHit = (i) => { for (let y = i.box.y + 4; y < i.box.y + i.box.h - 4; y += 3) for (let x = i.box.x + 4; x < i.box.x + i.box.w - 4; x += 3) if (site.worldInput.pick({ clientX: x, clientY: y })?.entry === i.worldEntry) return { x, y }; return null; };
const pickups = []; addEventListener('sigilcat:pickup', (e) => pickups.push(e.detail));
const lift = async () => { const s = findHit(tin); if (!s) return false; const pid = ++pointerIds; fire('pointerdown', s.x, s.y, pid); for (let n = 1; n <= 12; n++) { fire('pointermove', s.x + n * 4, s.y - n * 3, pid); await sleep(25); } await sleep(60); const bar = !!site.worldInput.bar; fire('pointerup', s.x + 48, s.y - 36, pid, 0); await sleep(100); return { bar }; };
const first = await lift();
await sleep(150);
const want = first?.bar ? C.ui.pickupTip.touch : C.ui.pickupTip.wheel;
check('2 lifting an item tells the page once (world-input.js)', pickups.length === 1 && pickups[0].id === 'tin', JSON.stringify(pickups));
check('2 the first pickup: he says how to move it, in his voice', ui.speaking && sp.getAttribute('aria-label') === want && !!store.get('tips.pickup'), `"${sp.getAttribute('aria-label')}" bar ${first?.bar}`);
check('2 the words match the device: wheel down = nearer; touch names Nearer and Deeper', MOBILE ? /nearer/.test(want) && /deeper/.test(want) : /scroll down to bring it nearer/.test(want), want);
await sleep(1600); await __shot('text-pickup');
await until(() => !ui.speaking, 12000);
await lift(); await sleep(200);
check('2 only once: the second pickup is quiet', pickups.length === 2 && !ui.speaking, `${pickups.length} pickups, speaking ${ui.speaking}`);

// ---- 5, 6: the reveal ----
A.forget(); A.evaluate(true);   // a clean slate (quiet), so the bonk tiers can be earned again
for (const id of ['bonk-1', 'bonk-100', 'scribble']) store.del('achievements.' + id);
ui.say('new: something', { ms: 1400 });
const chimes0 = A.chimes;
A.unlock('bonk-1'); A.unlock('scribble');
await sleep(400);
check('5 the reveal waits while a message is on the line', !A.showing && A.queued === 2, `showing ${A.showing}, queued ${A.queued}`);
await until(() => A.showing, 4000);
const rv = A.reveal;
check('5 then it takes the line: the message line steps aside', !rv.hidden && document.getElementById('say').classList.contains('yield'));
await sleep(60);
check('5 the name starts in his script', calm || !!rv.querySelector('b .ch:not(.done) svg'), rv.querySelector('b')?.getAttribute('aria-label'));
const wax0 = rv.querySelector('.wax');
check('6 First Bonk\'s seal is wood', wax0?.classList.contains('metal-wood'), wax0?.className);
check('5 the seal waits for the name to settle', getComputedStyle(wax0).opacity === '0' || calm);
ui.say('new: waiting', { ms: 900 });
await until(() => A.chimes > chimes0, 6000);
check('5 the seal stamps with the chime once the name has settled', A.chimes === chimes0 + 1 && [...rv.querySelectorAll('b .ch')].every((c) => c.classList.contains('done') || calm), `${A.chimes - chimes0} chimes`);
await until(() => rv.classList.contains('shine'), 2000);
const bcs2 = getComputedStyle(rv.querySelector('b'));
check('5 then the shimmer: a gold band through the letters', rv.classList.contains('shine') && /gradient/.test(bcs2.backgroundImage) && (calm || rv.querySelector('b').getAnimations().some((a) => a.animationName === 'reveal-sweep')), bcs2.backgroundImage.slice(0, 50));
const rr = rv.getBoundingClientRect(), marksTop = document.getElementById('marks').getBoundingClientRect().top;
check('5 it sits on the message line, above the marks, on the page', rr.bottom <= marksTop + 2 && rr.left >= 0 && rr.right <= stage.width, JSON.stringify({ b: Math.round(rr.bottom), marksTop: Math.round(marksTop), l: Math.round(rr.left), r: Math.round(rr.right) }));
check('5 a say during the reveal waits', document.getElementById('say').getAttribute('aria-label') !== 'new: waiting');
await __shot('text-reveal');
check('5 one at a time: the second waits for the first', document.querySelectorAll('.ach-reveal').length === 1 && A.queued === 2);
await until(() => !A.showing, 8000);
await until(() => document.getElementById('say').getAttribute('aria-label') === 'new: waiting' && document.getElementById('say').classList.contains('on'), 3000);
check('5 the waiting say plays after it', document.getElementById('say').getAttribute('aria-label') === 'new: waiting');
await until(() => A.showing, 6000);
check('5 then the next reveal: Scribble, in gold wax', /Scribble/.test(A.reveal.querySelector('b').getAttribute('aria-label')) && A.reveal.querySelector('.wax').classList.contains('metal-gold'));
await until(() => !A.showing && A.queued === 0, 10000);
check('5 the queue empties and the line is free again', A.queued === 0 && ui.lineFree && !document.getElementById('say').classList.contains('yield'));
// 6: the metals, as the book and the reveal draw them
const { ACHIEVEMENTS } = await import(new URL('src/achievements.js', document.baseURI).href);
const { wax } = await import(new URL('src/ui/achievements.js', document.baseURI).href);
const metals = ['bonk-1', 'bonk-100', 'bonk-500', 'bonk-1000', 'bonk-10000'].map((id) => ACHIEVEMENTS.find((a) => a.id === id).metal);
check('6 First Bonk .. Bonk Legend are wood, bronze, silver, gold, platinum', metals.join() === 'wood,bronze,silver,gold,platinum', metals.join());
// playtest-3 (e1113-02): the book's earned cards are the reveal's own wax, so the metal is the same in both
const { achievementsHTML } = await import(new URL('src/ui/books.js', document.baseURI).href);
const bookDoc = new DOMParser().parseFromString(achievementsHTML().body, 'text/html');
const tiersEarned = ACHIEVEMENTS.filter((a) => a.metal && store.get('achievements.' + a.id));
check('6 the book draws each earned tier as wax in its metal, and no .seal', tiersEarned.length > 0 && tiersEarned.every((a) => bookDoc.querySelector(`.ach[data-id="${a.id}"] .wax.metal-${a.metal}`))
  && (!store.get('achievements.platinum') || bookDoc.querySelector('.ach[data-id="platinum"] .wax.metal-platinum')) && !bookDoc.querySelector('.seal'), ACHIEVEMENTS.filter((a) => a.metal && store.get('achievements.' + a.id)).map((a) => a.id).join());
check('6 the reveal wax: the tier\'s metal, Platinum Cat platinum, the rest gold', wax(ACHIEVEMENTS.find((a) => a.id === 'platinum')).includes('metal-platinum') && wax(ACHIEVEMENTS.find((a) => a.id === 'lucky')).includes('metal-gold'));

// ---- 8: the hints ----
check('8 no ask-the-butter hint points at drawing a star', !C.ui.hints.some((h) => /star|five|point/i.test(h)), C.ui.hints.join(' | '));
store.flush();
