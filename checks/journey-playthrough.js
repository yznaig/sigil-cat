// The Journey played through (docs/journey/design.md §7, unit 5: integration). A fresh save, the voice on
// (?voice=1&nudge=fast), walked to the end through the real page:
//   chapter 1: the hook is spoken; all nine sigils drawn as real strokes (each a find; the ninth earns Fluent, the
//     first piece of the last page)
//   the stuck nudges: while the walk goes on, every 'hint' names a node that is not done yet, and each hint lands in
//     the grimoire's "what he said" (the journal)
//   chapters 2-5: the other seven room trophies seeded one by one (achievements.unlock, the slow part of a real game);
//     at each a piece line is spoken (not the trophy's own reaction too), the last page grows by exactly one scrap
//   the end: his sign drawn as a real stroke -> the ending -> Goodnight -> the room card opens by itself -> save gives
//     a PNG -> its close button closes it, and it stays closed through 65 s of dusk. checks/journey-playthrough-reload.js: after a reload, the post-game welcome.
const J = site.journey, A = site.achievements;
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const wuntil = async (f, ms = 20000, step = 50) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(step); } return false; };
check('playthrough: every journey part is up', await until(() => J.voice && J.tells && J.journal && J.lastpage && J.ending && J.snapshot, 15000), Object.keys(J.parts).join());
check('playthrough: the voice is on', J.voice.on === true);
const V = J.voice, said = [], events = [], hints = [], errors = [];
addEventListener('error', (e) => errors.push(String(e.message)));
J.on('said', (d) => said.push(d.id));
for (const n of ['piece', 'ending-start', 'ending-done', 'snapshot-open']) J.on(n, (d) => events.push(n + (d?.n ? ':' + d.n : '') + (d?.ending ? ':ending' : '')));
// a nudge must never name a node already done (checked at the moment it is spoken)
J.on('hint', (d) => { const n = J.node(d.node); hints.push({ node: d.node, done: J.has(d.node) || !!(n?.doneKey && J.get(n.doneKey)) }); });

// ---- the first thirty seconds ----
check('playthrough: a fresh save, a first visit', V.state().firstVisit === true && !A.has('bonk-1') && J.lastpage.count() === 0);
check('playthrough: the doors open, he says hello (hook-1)', await until(() => site.shell.revealed, 15000) && await until(() => said.includes('hook-1'), 9000), said.join());
await until(() => said.includes('hook-2'), 12000);
await until(() => !ui.speaking, 8000);
await __shot('pt-01-hook');
const m0 = catMid(); await tap(m0.x, m0.y);
check('playthrough: the first tap gets hook-3', await until(() => said.includes('hook-3'), 8000), said.join());
await until(() => !ui.speaking, 8000);

// ---- chapter 1: the nine signs, each a real stroke ----
const SIGNS = [['circle', 'circle'], ['zigzag', 'bolt'], ['dome', 'loaf'], ['cup', 'glass'], ['square', 'box'], ['eight', 'eyes'], ['triangle', 'hat'], ['fork', 'fork'], ['butter', 'butter']];
const calm = async () => {   // let whatever a sign started finish, then hand him back
  E.butterman?.state?.mode === 'playing' && E.butterman.stop();
  if (E.bread?.state && E.bread.state !== 'cat') { await until(() => E.bread.isBread || E.bread.state === 'cat', 6000); if (E.bread.state !== 'cat') { const m = catMid(); await tap(m.x, m.y); await until(() => E.bread.state === 'cat' && !cat.standIn, 5000); } }
  await until(settled, 20000);
  await until(() => !ui.speaking, 10000);
};
const drewList = [];
for (const [sig, find] of SIGNS) {
  let r = null;
  for (let tries = 0; tries < 3 && !registry.has(find); tries++) { await calm(); r = await drawSigil(sig); await sleep(600); }
  drewList.push(`${find}:${registry.has(find) ? 'ok' : drew(r || {})}`);
  if (sig === 'butter') { await until(() => E.butterman?.state?.mode === 'playing', 3000); await sleep(1500); }
  await calm();
}
check('playthrough: all nine signs found by drawing them', SIGNS.every(([, f]) => registry.has(f)), drewList.join(' '));
check('playthrough: the ninth earns Fluent, the first piece', A.has('fluent') && await until(() => events.includes('piece:1'), 4000), JSON.stringify(events));
check('playthrough: the first piece is spoken (piece-1)', await until(() => said.includes('piece-1'), 30000), said.slice(-8).join());

// ---- a nudge, forced by standing still (?nudge=fast: stuck after 10 s, then every 15 s) ----
await until(() => !ui.speaking, 10000);
const h0 = hints.length;
check('playthrough: standing still, he nudges', await until(() => hints.length > h0, 45000), JSON.stringify(V.state()));
await sleep(1600);
await __shot('pt-02-nudge');
await until(() => !ui.speaking, 10000);

// the journal holds the hints he has said
const hintTexts = V.log.filter((l) => /^stuck/.test(l.trigger)).map((l) => l.text);
const journalTexts = () => (J.journal.entries?.() || store.get('journey.journal', []) || []).map((e) => e.text);
check('playthrough: every nudge he has said is in the journal', hintTexts.length > 0 && hintTexts.every((t) => journalTexts().includes(t)), `${hintTexts.length} nudges, journal ${journalTexts().length}`);
site.books.open('grimoire');
const jsec = () => document.querySelector('.book-sheet [data-journey="journal"]');
await wuntil(() => jsec(), 3000);
jsec()?.scrollIntoView({ block: 'start' });
check('playthrough: the grimoire shows "what he said" with the nudge in it', !!jsec() && hintTexts.some((t) => jsec().textContent.includes(t)), jsec()?.textContent.slice(0, 120));
await wsleep(500);
await __shot('pt-03-journal');
site.books.close(); await wuntil(() => !site.books.showing, 3000); await sleep(400);

// ---- chapters 2-5: the room trophies, one at a time ----
const pageScraps = async () => {
  site.books.open('grimoire');
  const sel = '.book-sheet [data-journey="lastpage"]';
  await wuntil(() => document.querySelector(sel), 3000);
  const el = document.querySelector(sel), n = el?.querySelectorAll('.lp-scrap').length ?? -1;
  return { el, n };
};
const closeBook = async () => { site.books.close(); await wuntil(() => !site.books.showing, 3000); await sleep(400); };
const REACT_OF = { birthday: 'react-cake' };
const steps = [];
for (const id of J.PIECES.slice(1)) {
  const before = J.lastpage.count(), s0 = said.length;
  A.unlock(id);
  const n = before + 1;
  const told = await until(() => events.includes('piece:' + n), 3000);
  const line = await until(() => said.slice(s0).some((x) => /^piece-/.test(x)), 30000);
  await sleep(2500);
  const doubled = REACT_OF[id] && said.slice(s0).includes(REACT_OF[id]);
  const p = await pageScraps();
  if (n === 5) { p.el?.scrollIntoView({ block: 'center' }); await wsleep(900); await __shot('pt-04-lastpage-half'); }
  steps.push({ id, n, told, line, scraps: p.n, count: J.lastpage.count(), doubled: !!doubled, saidNow: said.slice(s0).join('+') });
  await closeBook();
  await until(() => !ui.speaking, 10000);
}
const p2 = V.log.filter((l) => l.id === 'piece-2');
check('playthrough: "it was in the {thing}" names the same place the last page does', p2.length > 0 && p2.every((l) => Object.values(J.lastpage.things).some((t) => l.text.endsWith(`in the ${t}.`))), p2.map((l) => l.text).join(' | '));
note('playthrough: the pieces', steps.map((s) => `${s.n}:${s.id} ${s.saidNow || '-'} scraps ${s.scraps}`).join(' | '));
check('playthrough: each trophy is a piece, told with a piece line', steps.every((s) => s.told && s.line), JSON.stringify(steps.filter((s) => !s.told || !s.line)));
check('playthrough: the last page grows by exactly one scrap each time', steps.every((s) => s.scraps === s.n && s.count === s.n), steps.map((s) => s.scraps).join());
check('playthrough: a piece line takes the place of the trophy\'s own reaction', steps.every((s) => !s.doubled));
check('playthrough: the eighth piece gets piece-8', said.includes('piece-8'));
check('playthrough: the nudge picker never named a done node', hints.length > 0 && hints.every((h) => !h.done) && !J.frontier().some((nd) => J.has(nd.id)), JSON.stringify(hints));

// ---- the end: his sign ----
const p8 = await pageScraps();
check('playthrough: the page is whole and shows his sign', p8.n === 8 && !!p8.el?.querySelector('.sign'));
await closeBook();
await until(() => !ui.speaking, 15000); await until(settled, 10000); await sleep(800);
let r = null;
for (let tries = 0; tries < 3 && !events.includes('ending-start'); tries++) { r = await drawSigil('cathead'); await until(() => events.includes('ending-start'), 2500); if (!events.includes('ending-start')) { await until(() => !ui.speaking, 8000); await until(settled, 8000); } }
check('playthrough: his sign drawn as a stroke starts the ending', events.includes('ending-start'), drew(r || {}));
await until(() => said.includes('end-1'), 15000); await sleep(1200);
await __shot('pt-05-ending');
check('playthrough: the ending runs to Goodnight', await until(() => events.includes('ending-done'), 60000) && A.has('ending') && !!store.get('journey.ended'), JSON.stringify(events));
check('playthrough: no nudge or idle line during the ending', (() => { const a = said.indexOf('end-1'), b = said.indexOf('end-4'); return a >= 0 && b > a && said.slice(a, b + 1).every((x) => /^end-/.test(x)); })(), said.slice(-8).join());
check('playthrough: the room card opens by itself, the ending one, once', await wuntil(() => J.snapshot.showing && document.querySelector('.room-pop img')?.complete, 20000) && J.snapshot.last?.facts?.ending && events.filter((e) => e.startsWith('snapshot-open')).length === 1, JSON.stringify(events));
await wsleep(800);
await __shot('pt-06-roomcard');
// Goodnight counts: the card's own achievement total includes it
const total = (A.ACHIEVEMENTS || []).filter((a) => A.has(a.id)).length;
const F = J.snapshot.last.facts;
check('playthrough: the card counts Goodnight among the achievements', A.has('ending') && F.ach === total && F.ach === A.count, F.counts);
const clicks = [];
document.addEventListener('click', (e) => { const a = e.target.closest?.('a[download]'); if (a) clicks.push({ name: a.download, href: a.href }); }, true);
const sv = document.querySelector('.room-pop [data-room-save]').getBoundingClientRect();
await __pointer([{ x: sv.left + sv.width / 2, y: sv.top + sv.height / 2 }]);
await wuntil(() => clicks.length, 4000);
let type = '';
try { type = clicks[0] ? (await (await fetch(clicks[0].href)).blob()).type : ''; } catch (e) { type = String(e); }
check('playthrough: save gives the card as a PNG', clicks[0]?.name === 'sigil-cat-room.png' && type === 'image/png', JSON.stringify(clicks) + ' ' + type);
// close it the way a player does (the close button), then let the dusk play on: the card must not come back
// (playtest: closed, the night went on, and it popped up again: an 'ending-done' listener and the ending's own timer,
// held by the card's freeze, each opened one)
const cl = document.querySelector('.room-pop [data-room-close]').getBoundingClientRect();
await __pointer([{ x: cl.left + cl.width / 2, y: cl.top + cl.height / 2 }]);
check('playthrough: the close button closes the card', await wuntil(() => !J.snapshot.showing && !document.querySelector('.room-pop'), 3000) && !input.locked);
const opensAtClose = events.filter((e) => e.startsWith('snapshot-open')).length;
let cardAgain = null;
const tAfter = performance.now();
while (performance.now() - tAfter < 65000) { if (J.snapshot.showing || document.querySelector('.room-pop')) { cardAgain = Math.round(performance.now() - tAfter); break; } await wsleep(250); }
check('playthrough: 65 s of dusk after closing it, the card never comes back (one card per ending)', cardAgain === null && opensAtClose === 1 && events.filter((e) => e.startsWith('snapshot-open')).length === 1 && !!document.querySelector('.journey-dusk'),
  JSON.stringify({ cardAgain, events: events.slice(-4) }));
check('playthrough: no page errors on the way', !errors.length, errors.join(' | '));
store.set('playthroughCheck', { said: said.length });
