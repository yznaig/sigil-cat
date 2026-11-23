// After the ending, reloaded (checks/journey-ending.js ran first): no replay on its own, the post-game, the last page
// whole with "the room was full.", and drawing the sign replays the scene once per visit (no second achievement).
const J = site.journey, A = site.achievements;
await until(() => J.parts.lastpage && J.parts.ending, 10000);
const EN = J.ending, said = [], events = [];
J.on('said', (d) => said.push(d.id));
for (const n of ['ending-start', 'ending-done']) J.on(n, (d) => events.push(n + (d?.replay ? ':replay' : '')));
let cards = 0; J.on('snapshot-open', () => cards++);
await sleep(3000);
check('ending reload: no replay on its own', !events.length && !EN.running && !input.locked && !document.querySelector('.journey-dusk'), JSON.stringify(events));
check('ending reload: journey.ended kept, Goodnight kept: the post-game', !!store.get('journey.ended') && A.has('ending') && EN.ended);
check('ending reload: the nudge picker never names the ending again', !J.frontier().some((n) => n.id === 'ending'));
site.books.open('grimoire');
await until(() => document.querySelector('.book-sheet [data-journey="lastpage"]'), 3000);
const el = document.querySelector('.book-sheet [data-journey="lastpage"]');
check('ending reload: the last page is whole and says the room was full', el?.querySelectorAll('.lp-scrap').length === 8 && !!el.querySelector('.sign') && /the room was full/.test(el.querySelector('.lp-line')?.textContent || ''), el?.querySelector('.lp-line')?.textContent);
site.books.close(); await until(() => !site.books.showing, 2000); await sleep(400);
await until(settled, 8000);
const endedAt = store.get('journey.ended');
let r = await drawSigil('cathead');
check('ending reload: drawing the sign replays the scene', r.name === 'cathead' && await until(() => events.includes('ending-start:replay'), 3000), drew(r) + ' ' + JSON.stringify(events));
check('ending reload: the replay ends and gives the hands back', await until(() => events.includes('ending-done:replay'), 45000) && !input.locked, JSON.stringify(events));
check('ending reload: a replay does not re-save the ending', store.get('journey.ended') === endedAt);
// the replay's room card (src/journey/ending.js opens it ~0.6 s after): one card; closed, it stays closed. While it is up
// the page is frozen and page timers wait (the check's own sleep too), so these waits keep to the wall clock.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const wuntil = async (f, ms = 8000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(40); } return false; };
check('ending reload: the replay brings the room card, once', await wuntil(() => J.snapshot?.showing && document.querySelector('.room-pop img')?.complete) && cards === 1, `cards ${cards}`);
J.snapshot.close(); await wuntil(() => !document.querySelector('.room-pop'), 3000);
await wsleep(4000);
check('ending reload: closed, the replay\'s card stays closed', !J.snapshot.showing && !document.querySelector('.room-pop') && cards === 1, `cards ${cards}`);
await until(() => !ui.speaking, 10000);
const m = catMid(); await tap(m.x, m.y); await sleep(1200);
await until(settled, 8000);
r = await drawSigil('cathead');
await sleep(500);
check('ending reload: once per visit: the third time he only says so', r.name === 'cathead' && said.includes('end-again') && events.filter((e) => e === 'ending-start:replay').length === 1, JSON.stringify({ said, events }));
