// shell-books.js (shell lane, playtest-2): the grimoire and the achievements as pop-ups over the cat. Opened from the
// footer with real clicks; while open the world is frozen (clock, physics, sound) and nothing is reloaded; Escape or a
// click outside closes (e1112-41) and everything is where it was. The grimoire's "start over" (e1112-39): a confirm
// (Escape backs out of the confirm only), then a wipe and a reload into a fresh game (checks/shell-books-reload.js).
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const B = site.books, F = site.freeze, T = site.THREE;
cat.auto = false;
// a little progress to keep: two finds, an achievement, a few keepsakes in the world, some bonks
registry.find('circle', { quiet: true }); registry.find('butter', { quiet: true });
site.achievements.grant('circle', { quiet: true });
for (const id of ['top', 'rifle', 'paper']) keepsakes.give(id);
await Promise.all([...keepsakes.live.values()].map((i) => i.worldTask));
await until(() => ['top', 'rifle'].every((id) => keepsakes.get(id)?.worldEntry?.body.isSleeping()), 12000);
// (each tap waits for him to take it: a tap that lands as his last hop moves him off the point is made again;
// one run in ten here had only two bonks saved; integration, playtest-3)
for (let i = 0, t0 = cat.taps; cat.taps < t0 + 3 && i < 8; i++) { const m = catMid(); await tap(m.x, m.y); await sleep(250); }
store.flush();
window.__notReloaded = true;
const where = () => [...keepsakes.live.values()].filter((i) => i.worldEntry).map((i) => { const p = i.worldEntry.body.translation(); return [i.id, +p.x.toFixed(5), +p.y.toFixed(5), +p.z.toFixed(5)].join(); }).join('|');
const click = async (el) => { el.scrollIntoView({ block: 'center' }); await wsleep(60); const r = el.getBoundingClientRect(); await __pointer([{ x: r.x + r.width / 2, y: r.y + r.height / 2 }]); };

// ---- the grimoire, from its footer link ----
const link = document.getElementById('grimoire');
check('books the footer link keeps its address and is shown', !link.hidden && link.getAttribute('href') === 'spellbook.html');
const before = where(), ctx = audio.context();
let renders = 0; const count = () => renders++; stage.onRender.push(count);
await click(link); await wsleep(400);
const pop = B.element, sheet = pop?.querySelector('.book-sheet');
check('books the grimoire opens as a pop-up over the cat, same address', B.showing === 'grimoire' && pop?.getAttribute('role') === 'dialog' && pop.getAttribute('aria-modal') === 'true' && location.pathname.endsWith('/') && !/spellbook/.test(location.href) && sheet.querySelector('.cards') && document.elementFromPoint(stage.width / 2, stage.height / 2)?.closest('.book-pop'),
  location.href);
const r0 = renders, clock0 = stage.clock, steps0 = site.world.stats.steps; await wsleep(700);
check('books while open the world is frozen: no frames, no physics, clock and sound stopped', F.frozen && F.reasons.includes('book') && renders === r0 && stage.clock === clock0 && site.world.stats.steps === steps0 && ctx.state === 'suspended' && input.locked,
  JSON.stringify({ renders: renders - r0, clock: stage.clock - clock0, steps: site.world.stats.steps - steps0, audio: ctx.state }));
// content: the old page's, inside the pop-up
const cards = [...sheet.querySelectorAll('.card')], unknown = cards.filter((c) => c.classList.contains('unknown')), found = cards.filter((c) => !c.classList.contains('unknown'));
check('books grimoire content: found cards with shapes, unfound with no shape, the tally, the credits', found.length === registry.count() && found.every((c) => c.querySelector('svg path')) && unknown.length > 0 && unknown.every((c) => !c.querySelector('svg, path, canvas, img') && c.querySelector('.fig').textContent.trim() === '???') &&
  sheet.querySelector('.tally b')?.textContent === String(registry.count()) && /Rukh3D/.test(sheet.querySelector('.credits')?.textContent) && !!sheet.querySelector('[data-start-over]'),
  `${found.length} found, ${unknown.length} unfound`);
await __shot('books-grimoire');
// Escape closes; the world runs on from exactly where it was
await __key('Escape'); await wsleep(350);
const after = where();
check('books Escape closes it; every item is where it was; the world runs again; no reload', !B.showing && !document.querySelector('.book-pop') && !F.frozen && !input.locked && after === before && window.__notReloaded === true && ctx.state === 'running',
  JSON.stringify({ same: after === before, audio: ctx.state }));
await sleep(500);
check('books after closing, frames and the clock move again', renders > r0 && stage.clock > clock0, `${renders - r0} frames`);
stage.onRender.splice(stage.onRender.indexOf(count), 1);
// the phone's Back closes an open book (its own history entry) instead of leaving the page (integration, playtest-2);
// a book closed another way (Escape above) stepped back over its entry, so Back is the page's own again
check('books a book closed by Escape leaves no history entry of its own behind', !history.state?.sigilBook, JSON.stringify(history.state));
await click(link); await wsleep(300);
const href0 = location.href;
check('books an open book has a history entry of its own', B.showing === 'grimoire' && history.state?.sigilBook === 'grimoire', JSON.stringify(history.state));
history.back(); await wsleep(450);
check('books Back closes the book and stays on the page', !B.showing && !F.frozen && location.href === href0 && window.__notReloaded === true && !history.state?.sigilBook && where() === before,
  JSON.stringify({ showing: B.showing, href: location.href, state: history.state }));

// ---- the achievements, from the mark; a click outside closes ----
const mark = document.getElementById('achievements');
check('books the achievements mark keeps its address', !mark.hidden && mark.getAttribute('href') === 'achievements.html');
await click(mark); await wsleep(400);
const pop2 = B.element;
check('books the achievements open as a pop-up with their content', B.showing === 'achievements' && pop2.querySelectorAll('.ach').length === site.achievements.total && pop2.querySelector('.ach.earned[data-id="circle"]') && pop2.querySelector('.ach.secret h2')?.textContent === '???',
  `${pop2.querySelectorAll('.ach').length} cards`);
await __shot('books-achievements');
// its "the grimoire" link turns the page to the grimoire, still a pop-up
await click(pop2.querySelector('[data-book="grimoire"]')); await wsleep(200);
check('books the achievements link to the grimoire switches the pop-up', B.showing === 'grimoire' && B.element === pop2 && F.frozen);
// a click on the dimmed margin outside the sheet
const sr = pop2.querySelector('.book-sheet').getBoundingClientRect();
check('books there is margin outside the sheet to click', sr.left >= 8 && sr.top >= 8, JSON.stringify(sr));
await __pointer([{ x: Math.max(2, sr.left / 2), y: stage.height / 2 }]); await wsleep(350);
check('books a click outside the sheet closes it', !B.showing && !F.frozen && where() === before);
// a click inside the sheet does not
await click(link); await wsleep(300);
await click(B.element.querySelector('.lead')); await wsleep(200);
check('books a click inside the sheet leaves it open', B.showing === 'grimoire');

// ---- start over ----
await click(B.element.querySelector('[data-start-over]')); await wsleep(250);
const confirmBox = B.element.querySelector('.book-confirm [role=alertdialog]');
check('books start over asks first, in plain words', B.confirming && /Start over\?/.test(confirmBox?.textContent) && /can't be undone/.test(confirmBox.textContent) && confirmBox.querySelectorAll('button').length === 2 && document.activeElement?.matches('[data-keep]'),
  JSON.stringify({ confirming: B.confirming, text: confirmBox?.textContent.replace(/\s+/g, ' ').trim().slice(0, 300), buttons: confirmBox?.querySelectorAll('button').length, focus: document.activeElement?.outerHTML.slice(0, 60) }));
await __shot('books-start-over');
await __key('Escape'); await wsleep(200);
check('books Escape backs out of the confirm only; nothing was wiped', !B.confirming && B.showing === 'grimoire' && store.get('found.circle') === 1 && Number(store.get('bonks')) >= 3);
await click(B.element.querySelector('[data-start-over]')); await wsleep(200);
await click(B.element.querySelector('.book-confirm [data-keep]')); await wsleep(150);
check('books "keep playing" backs out too', !B.confirming && B.showing === 'grimoire' && store.get('found.circle') === 1);
await click(B.element.querySelector('[data-start-over]')); await wsleep(200);
const saved = JSON.parse(localStorage.getItem('sigilcat.v2'));
check('books before the wipe there is progress saved', saved.found?.circle === 1 && saved.bonks >= 3 && !!saved.keepsakes?.top, Object.keys(saved).join(','));
// The wipe: pressed with a synchronous click so the store can be read in the same task, before the page goes (the
// reload it asks for then lands under the runner's own reload; checks/shell-books-reload.js looks at the fresh game).
B.element.querySelector('.book-confirm [data-wipe]').click();
const wiped = localStorage.getItem('sigilcat.v2');
store.set('bonks', 999); store.flush();
check('books the wipe empties the store at once, and nothing still running can write it back', wiped === '{"migrated":1}' && localStorage.getItem('sigilcat.v2') === wiped, wiped);
