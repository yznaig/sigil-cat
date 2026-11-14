// achievements.js: e1111-40/-47/-48 and the rare bonks (e1111-39/-43). Run on the page with checks/lib.js, then
// --then checks/achievements-reload.js. A sample of each way an achievement is earned, through the page's own input
// where there is one: a real tap (First Bonk), a real fizzled stroke (Scribble), a drawn sigil (Full Circle), a fast
// flick (Spin Doctor), strokes (Purr-fect), a find (360 No Scope), a saved state (Shelf Life, Got Milk), the window
// event (Let There Be Light), the bird game's score; then the bonk tiers, the meta ones, the toast, the mark, the
// gold rare-bonk line, and that nothing was earned twice.
cat.auto = false;
const A = site.achievements;
check('achievements start empty on a fresh page', A.count === 0 && document.getElementById('achievements').hidden, `${A.count} earned`);
check('rare bonk chance is 1 in 400', site.config.sounds.rareChance === 400, String(site.config.sounds.rareChance));
check('no rare line before the first rare bonk', document.getElementById('rare').hidden);
const toasts = [];
A.onUnlock((a, { quiet }) => { if (!quiet) toasts.push(a.id); });

// ---- a tap: First Bonk, with its toast and chime ----
await until(() => settled(), 20000);
site.config.sounds.rareChance = 1e9;                      // no rare bonk by chance in this part
// fx lane, playtest 3: the chime is Aaron's point-in-space (achieve-space), recorded at the bus
const chimeVoices = [], nativeStart = AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start = function (...a) { chimeVoices.push(this.buffer); return nativeStart.apply(this, a); };
await audio.load('achieve-space');
const mid = catMid(); await tap(mid.x, mid.y);
// The reveal (e1112-31, playtest-2 text lane) replaced the toast: on the message line, his script settles into the
// name, then a wax seal stamps with the chime. checks/text.js checks its parts; here, that the first one arrives.
await until(() => A.has('bonk-1') && A.reveal && !A.reveal.hidden, 3000);
check('a real tap earns First Bonk', A.has('bonk-1'), JSON.stringify(toasts));
const toast = A.reveal;
check('the reveal shows its name', !!toast && !toast.hidden && /First Bonk/.test(toast.querySelector('b')?.getAttribute('aria-label') || ''), toast?.textContent);
await until(() => A.chimes === 1, 4000);
check('the seal chimes when it lands (a real voice on the audio bus)', A.chimes === 1, `${A.chimes} chimes`);
AudioBufferSourceNode.prototype.start = nativeStart;
check('the chime is Aaron\'s point-in-space (playtest 3), not the old two-note chime', chimeVoices.includes(audio.buffer('achieve-space')) && !chimeVoices.includes(audio.buffer('achieve')), `${chimeVoices.length} voices`);
await sleep(700); await __shot('ach-toast');
const r = toast.getBoundingClientRect(), footer = document.getElementById('footer').getBoundingClientRect(), marksTop = document.getElementById('marks').getBoundingClientRect().top;
check('the reveal sits on the message line, above the marks, inside the page', r.bottom <= marksTop + 2 && r.top >= footer.top - 80 && r.left >= 0 && r.right <= stage.width, JSON.stringify({ r, marksTop }));
const markEl = document.getElementById('achievements');
check('the mark next to the grimoire link appears and opens the book', !markEl.hidden && markEl.getAttribute('href') === 'achievements.html' && /1 of/.test(markEl.getAttribute('aria-label')), markEl.getAttribute('aria-label'));

// ---- a stroke he does not know: Scribble ----
const scrawl = []; const s0 = { x: stage.width * 0.12, y: stage.insets.top + 140 };
for (let i = 0; i < 40; i++) scrawl.push({ x: s0.x + i * 4, y: s0.y + Math.sin(i * 1.7) * 26 + (i % 5) * 7 });
if (isAir(scrawl[0].x, scrawl[0].y)) await drag(scrawl, 6);
await sleep(200);
check('a fizzled drawing earns Scribble', A.has('scribble'), drew(site.ink.log.at(-1) || {}));

// ---- a sigil: Full Circle (a find) ----
await until(() => settled(), 8000);
const circle = await drawSigil('circle');
await until(() => A.has('circle'), 4000);
check('drawing the circle earns Full Circle', A.has('circle') && registry.has('circle'), drew(circle));
await until(() => settled(), 12000);

// ---- a fast flick: Spin Doctor ----
// (the press starts on him: at phone size his middle is narrower than 60 px either side, and a press beside him is a
// stroke in the air, not a spin; integration, playtest-3)
const m2 = catMid(), flickPts = Array.from({ length: 6 }, (_, i) => ({ x: m2.x - 20 + i * 30, y: m2.y }));
flick(flickPts, 4);
await sleep(100);
check('a fast flick earns Spin Doctor', A.has('spin'), `vel ${cat.vel.toFixed(1)} rad/s`);
await until(() => Math.abs(cat.vel) < 0.3 && settled(), 12000);
check('a fast flick that is not a 360 does not earn the 360', !A.has('noscope') || registry.has('noscope'));

// ---- strokes: Purr-fect (before the bite) ----
const pm = catMid();
for (let n = 0; n < 2; n++) await drag([{ x: pm.x, y: pm.y - 30 }, { x: pm.x, y: pm.y - 10 }, { x: pm.x, y: pm.y + 10 }, { x: pm.x, y: pm.y + 30 }, { x: pm.x, y: pm.y + 10 }, { x: pm.x, y: pm.y - 10 }, { x: pm.x, y: pm.y - 30 }], 14);
check('stroking him earns Purr-fect before any bite', A.has('purr') && !registry.has('bite'), `purr ${E.petbite?.purr.toFixed(2)}`);

// ---- a find made another way: 360 No Scope ----
registry.find('noscope'); await sleep(300);
check('a find made any other way (the 360) earns its achievement', A.has('noscope'));

// ---- saved state: Shelf Life (two solid discoveries), Got Milk (the cake chain's pail) ----
store.set('worldDiscoveries.ach-a', 'solid'); store.set('worldDiscoveries.ach-b', 'solid');
await until(() => A.has('shelf'), 2000);
check('two solid discoveries earn Shelf Life', A.has('shelf'));
store.del('worldDiscoveries.ach-a'); store.del('worldDiscoveries.ach-b');
store.set('cakeChain', { ...(store.get('cakeChain') || {}), milkFull: true });
await until(() => A.has('milk'), 2000);
check('a full pail in the saved cake chain earns Got Milk', A.has('milk'));

// ---- the lamp's documented event ----
dispatchEvent(new Event('sigilcat:lamp-lit'));
check('the sigilcat:lamp-lit event earns Let There Be Light', A.has('light'));

// ---- the bird game's score, through the same call the game makes ----
A.score(1); check('a score of 1 earns Flappy, not Pipe Dream', A.has('flappy') && !A.has('pipes'));
A.score(15); check('a score of 15 earns Pipe Dream', A.has('pipes'));

// ---- hats, one at a time ----
for (const h of ['wizard', 'cone', 'party']) store.set('hat', h);
await sleep(300);
check('three of four hats is not Dress Up', !A.has('dressup'));
store.set('hat', 'crown'); await until(() => A.has('dressup'), 2000);
check('all four hats worn earns Dress Up', A.has('dressup'), JSON.stringify(store.get('achievementProgress.hats')));
store.set('hat', null);

// ---- the bonk tiers (the counter's own bonk), and the rare-bonk line ----
for (let n = ui.count; n < 100; n++) ui.bonk();
await until(() => A.has('bonk-100'), 2000);
check('a hundred bonks earns Bonk Apprentice, not Adept', A.has('bonk-100') && !A.has('bonk-500'), `${ui.count} bonks`);
const tallyBefore = document.getElementById('tally').getBoundingClientRect().bottom;
site.config.sounds.rareChance = 1;                        // the next tap is rare
const before = ui.count; await until(() => settled(), 8000); const m3 = catMid(); await tap(m3.x, m3.y); site.config.sounds.rareChance = 400;
await sleep(200);
const rare = document.getElementById('rare'), cs = getComputedStyle(rare), bonks = document.getElementById('bonks');
check('a rare bonk earns Lucky Bonk and counts both', A.has('lucky') && store.get('rareBonks') === 1 && ui.count === before + 1, `rare ${store.get('rareBonks')}, bonks ${before} -> ${ui.count}`);
check('the rare line appears above the bonk count', !rare.hidden && rare.textContent === '1 rare bonk' && rare.getBoundingClientRect().bottom <= bonks.getBoundingClientRect().top + 1, rare.textContent);
check('the rare line is metallic gold text (clipped gradient)', /gradient/.test(cs.backgroundImage) && /text/.test(cs.backgroundClip + cs.webkitBackgroundClip) && cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)', cs.backgroundImage.slice(0, 60));
const anims = rare.getAnimations().filter((a) => a.animationName === 'rare-sheen');
check('its sheen is finite (it rests; nothing loops)', anims.every((a) => a.effect.getTiming().iterations !== Infinity), anims.map((a) => a.effect.getTiming().iterations).join(','));
await sleep(2600); await __shot('ach-rare-line');
const tallyAfter = document.getElementById('tally').getBoundingClientRect().bottom;
check('the tally keeps its bottom edge when the rare line arrives (the board under it stays put)', Math.abs(tallyAfter - tallyBefore) < 1.5, `${tallyBefore.toFixed(1)} -> ${tallyAfter.toFixed(1)}`);

// ---- meta: Fluent needs all ten signs ----
check('Fluent waits for every sign', !A.has('fluent'));
for (const f of registry.FINDS.filter((x) => x.kind === 'sigil')) store.set('found.' + f.id, 1);
await until(() => A.has('fluent'), 2000);
check('all ten sign finds earn every sign achievement and Fluent', A.has('fluent') && A.has('fork') && A.has('cup'));

// ---- toasts: one at a time, none twice ----
const counts = toasts.reduce((m, id) => ((m[id] = (m[id] || 0) + 1), m), {});
check('nothing is earned (or toasted) twice', Object.values(counts).every((n) => n === 1), JSON.stringify(counts));
check('reveals queue one at a time', document.querySelectorAll('.ach-reveal').length === 1 && A.queued > 1, `${A.queued} waiting`);
check('platinum is not earned by a partial set', !A.has('platinum') && !keepsakes.has('platinum'));
store.set('achCheck', { earned: A.ACHIEVEMENTS.filter((a) => A.has(a.id)).map((a) => a.id), rare: store.get('rareBonks') }); store.flush();
note('achievements earned in this run', `${A.count} of ${A.total}: ${A.ACHIEVEMENTS.filter((a) => A.has(a.id)).map((a) => a.id).join(' ')}`);
