// The Journey's ending unit (docs/journey/design.md §5.1-5.3, §7 unit 3): the last page in the grimoire shows exactly
// as many scraps as pieces earned and the whole sign only at eight; his own sign drawn as a real stroke with seven
// pieces gets "not yet." and no ending (and no first-sigil bulb); with eight it plays the ending: hands locked, the four
// end lines said, asleep, the credits in the page, then journey.ended saved, Goodnight earned, 'ending-done', hands
// back, the room card once (closed, it stays closed). checks/journey-ending-reload.js: after a reload no replay, the post-game, a replay by drawing the sign once.
const J = site.journey, A = site.achievements;
await until(() => J.parts.lastpage && J.parts.ending, 10000);
const LP = J.lastpage, EN = J.ending, CALM = stage.reducedMotion;
const said = [], events = [];
J.on('said', (d) => said.push(d.id));
for (const n of ['piece', 'ending-start', 'ending-done']) J.on(n, (d) => events.push(n + (d?.n ? ':' + d.n : '')));
let cards = 0; J.on('snapshot-open', () => cards++);
const PIECES = J.PIECES;
const page = () => document.querySelector('.book-sheet [data-journey="lastpage"]');
async function readPage() {
  site.books.open('grimoire');
  await until(() => page(), 3000);
  const el = page();
  el?.scrollIntoView({ block: 'center' });
  const r = { scraps: el?.querySelectorAll('.lp-scrap').length ?? -1, inks: el?.querySelectorAll('.lp-ink').length ?? -1, sign: !!el?.querySelector('.sign'), dot: !!el?.querySelector('.dot'),
    line: el?.querySelector('.lp-line')?.textContent || '', count: el?.querySelector('.lp-count')?.textContent || '', fresh: el?.querySelectorAll('.lp-scrap.fresh').length ?? -1 };
  return r;
}
// (while a book is open the page's timers are held still, src/core/page-scheduler.js: no sleep() here; wait for the
// scraps' own fade-in animations instead, which run)
const settleScraps = async () => { const el = page(); if (el) await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))); };
const closeBook = async () => { site.books.close(); await until(() => !site.books.showing, 2000); await sleep(300); };
const seed = (ids) => { for (const id of ids) store.set('achievements.' + id, Date.now()); };

// ---- the sign is a sigil, and not a find ----
check('ending: his sign is a sigil with a spell, and not in the grimoire\'s finds', !!SIGILS.cathead && typeof site.spells.cathead === 'function' && !registry.byId.has('cathead') && ![...registry.byId.values()].some((f) => f.sigil === 'cathead'));
check('ending: Goodnight is an achievement, in mastery, before Completionist', (() => { const L = A.ACHIEVEMENTS || []; const i = L.findIndex((a) => a.id === 'ending'), c = L.findIndex((a) => a.id === 'complete'); return i >= 0 && i < c && L[i].group === 'mastery' && L[i].name === 'Goodnight'; })());

// ---- 0 pieces ----
let p = await readPage();
check('ending: no pieces: a torn edge, no scraps, no sign, "a page is missing."', p.scraps === 0 && !p.sign && p.line === 'a page is missing.', JSON.stringify(p));
await __shot('ending-page-0');
await closeBook();

// ---- 3 pieces ----
seed(PIECES.slice(0, 3));
p = await readPage();
check('ending: three pieces: exactly three scraps, all fading in, no sign yet', p.scraps === 3 && p.inks === 3 && !p.sign && p.fresh === 3 && p.count === 'three of eight', JSON.stringify(p));
await settleScraps();
await __shot('ending-page-3');
await closeBook();
p = await readPage();
check('ending: seen scraps do not fade in again', p.scraps === 3 && p.fresh === 0, JSON.stringify(p));
await closeBook();

// ---- 7 pieces: the sign drawn too early ----
seed(PIECES.slice(3, 7));
check('ending: seven pieces counted', LP.count() === 7 && !LP.whole(), String(LP.count()));
store.del('lamp.stage');                                   // as if no sigil was ever drawn: the sign must not bring the bulb
const bulbBefore = keepsakes.has('bulb'), scribbleBefore = A.has('scribble');
await until(settled, 8000);
let r = await drawSigil('cathead');
check('ending: his sign, drawn as a real stroke, is recognised', r.name === 'cathead', drew(r));
await sleep(400);
check('ending: with seven pieces he says "not yet." and nothing ends', said.includes('not-yet') && !EN.running && !input.locked && !events.includes('ending-start') && !store.get('journey.ended'), JSON.stringify({ said, events, locked: input.locked }));
check('ending: and no first-sigil bulb for his sign', keepsakes.has('bulb') === bulbBefore && !store.get('lamp.stage'), String(keepsakes.has('bulb')));
store.set('lamp.stage', 'fixture');
check('ending: no fizzle (Scribble) for the early sign', A.has('scribble') === scribbleBefore);
await sleep(2500);

// ---- the eighth piece, earned live ----
A.unlock(PIECES[7]);
check('ending: the eighth piece is told (piece n=8) and marks the grimoire link', await until(() => events.includes('piece:8'), 3000) && document.getElementById('grimoire').classList.contains('lp-new'), JSON.stringify(events));
p = await readPage();
check('ending: eight pieces: eight scraps and the whole sign with its start dot', p.scraps === 8 && p.sign && p.dot && /draw it when the room is full/.test(p.line), JSON.stringify(p));
check('ending: opening the grimoire clears the link\'s mark', !document.getElementById('grimoire').classList.contains('lp-new'));
await settleScraps();
await __shot('ending-page-8');
await closeBook();

// ---- the ending ----
// a few trophies in the room, so there is something to glint (a seeded save has the achievements but not the things)
for (const id of ['top', 'tin', 'postcard', 'controller']) if (keepsakes.defs.has(id) && !keepsakes.has(id)) keepsakes.give(id);
await until(() => ['top', 'tin', 'postcard', 'controller'].filter((id) => keepsakes.has(id)).every((id) => { const i = keepsakes.live.get(id); return i && (i.box || i.el?.getBoundingClientRect().width); }), 20000);
await sleep(2500);
await until(() => !ui.speaking, 15000);
await until(settled, 8000);
const t0 = performance.now();
let maxGlints = 0;
const glintWatch = setInterval(() => { maxGlints = Math.max(maxGlints, document.querySelectorAll('.journey-glint').length); }, 50);
r = await drawSigil('cathead');
check('ending: the sign with the page whole starts the ending', r.name === 'cathead' && await until(() => events.includes('ending-start'), 3000), drew(r) + ' ' + JSON.stringify(events));
check('ending: the player\'s hands are taken away', input.locked && EN.running);
check('ending: the room dims to dusk', await until(() => { const d = document.querySelector('.journey-dusk'); return d && Number(getComputedStyle(d).opacity) > 0.5; }, CALM ? 1500 : 5000));
await sleep(CALM ? 300 : 1200);
await __shot('ending-dusk');
check('ending: his four end lines, in order', await until(() => ['end-1', 'end-2', 'end-3', 'end-4'].every((id) => said.includes(id)), 30000) && said.filter((id) => /^end-\d$/.test(id)).join() === 'end-1,end-2,end-3,end-4', JSON.stringify(said));
check('ending: he goes to sleep', await until(() => cat.landingPose() === 'sleep', 8000), cat.landingPose());
check('ending: the credits are written in the page', await until(() => /thank you for playing/.test(document.querySelector('.journey-credits')?.getAttribute('aria-label') || document.querySelector('.journey-credits')?.textContent || '') || [...document.querySelectorAll('.journey-credits p')].some((x) => /thank you for playing/.test(x.getAttribute('aria-label') || x.textContent)), 10000));
await sleep(CALM ? 300 : 2500);
await __shot('ending-credits');
const creditText = [...document.querySelectorAll('.journey-credits p')].map((x) => x.getAttribute('aria-label') || x.textContent).join(' / ');
note('ending: credits read', creditText);
check('ending: still locked while the credits show', input.locked);
check('ending: ending-done, hands back', await until(() => events.includes('ending-done'), 30000) && !input.locked && !EN.running, JSON.stringify(events));
const secs = (performance.now() - t0) / 1000;
check('ending: it took about twenty seconds', secs > 12 && secs < 40, secs.toFixed(1) + ' s');
check('ending: journey.ended saved and Goodnight earned', !!store.get('journey.ended') && A.has('ending'));
const glints = Number(EN.log.find((l) => /^glints/.test(l.what))?.what.split(' ')[1]);
check('ending: every trophy in the room glints once (none drawn in reduced motion)', glints >= 3 && (CALM ? maxGlints === 0 : maxGlints >= 1), `${glints} spots, at most ${maxGlints} drawn at once`);
clearInterval(glintWatch);
check('ending: no glint left behind, and none at all in reduced motion', !document.querySelector('.journey-glint'));
check('ending: he is still asleep after, under the dusk', cat.landingPose() === 'sleep' && !!document.querySelector('.journey-dusk') && EN.sleeping);
// the room card comes a few seconds after Goodnight (src/journey/ending.js, its one opener). While it is up the page is
// frozen and page timers wait (this check's own sleep too), so these waits keep to the wall clock.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const wuntil = async (f, ms = 10000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(40); } return false; };
check('ending: the room card comes once, after Goodnight', !!J.snapshot && await wuntil(() => J.snapshot.showing && document.querySelector('.room-pop img')?.complete) && cards === 1, `cards ${cards}`);
J.snapshot?.close(); await wuntil(() => !document.querySelector('.room-pop'), 3000);
await wsleep(5000);
check('ending: closed, the card stays closed', !J.snapshot?.showing && !document.querySelector('.room-pop') && cards === 1, `cards ${cards}`);
await __shot('ending-after');
// the post-game: a tap on him wakes him and lifts the dusk
const m = catMid();
await tap(m.x, m.y);
check('ending: a tap wakes him and the dusk lifts', await until(() => !EN.sleeping && !document.querySelector('.journey-dusk'), 5000) && await until(() => cat.landingPose() !== 'sleep', 4000), cat.landingPose());
note('ending: what happened', EN.log.map((l) => l.what).join(' | '));
