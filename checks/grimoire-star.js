// grimoire-star.js (gags lane, playtest 4): Aaron, "the star can be removed from the grimoire its no longer in the game".
// Run with checks/lib.js and an OLD save that found everything, the star included (run-all's --storage): the page
// loads without error, the grimoire has no star card and counts "17 of 17", Completionist is not earned (since p8 it
// also wants every other achievement),
// the marks row and the achievements stay consistent, and the galaxy (the fast spin that used to find the star) is
// Into the Void only.
const { FINDS } = await import(new URL('src/finds.js', document.baseURI).href);
const { ACHIEVEMENTS } = await import(new URL('src/achievements.js', document.baseURI).href);
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const A = site.achievements, B = site.books;
check('grimoire-star the old save still holds found.star (nothing rewrites it)', store.get('found.star') === 1);
check('grimoire-star the star is no find any more', !FINDS.some((f) => f.id === 'star' || /\bstar\b/i.test(f.name)) && !registry.byId.has('star') && registry.total === FINDS.length,
  `${FINDS.length} finds`);
check('grimoire-star the old save counts only real finds: all of them', registry.count() === registry.total && registry.total === 17, `${registry.count()} of ${registry.total}`);
check('grimoire-star Completionist waits: every page, but not every achievement', !A.has('complete'), `${A.count} of ${A.total} achievements`);
check('grimoire-star the achievements list has no star and counts stay whole', !ACHIEVEMENTS.some((a) => a.id === 'star' || a.find === 'star') && A.total === ACHIEVEMENTS.length
  && A.count === ACHIEVEMENTS.filter((a) => A.has(a.id)).length, `${A.count} of ${A.total}`);
check('grimoire-star the marks row: nine sigils and the controller', document.querySelectorAll('#marks button').length === 10 && !document.querySelector('#marks [data-find="star"]')
  && /9 of 9 sigils/.test(document.getElementById('found').textContent), document.getElementById('found').textContent);
B.open('grimoire'); await until(() => B.showing === 'grimoire' && B.element?.querySelector('.cards'), 8000); await wsleep(400);
const book = B.element, cards = [...book.querySelectorAll('.card')], names = cards.map((c) => c.querySelector('h2').textContent);
const tally = book.querySelector('.tally')?.textContent || '';
check('grimoire-star the grimoire has no star card', !names.some((n) => /star/i.test(n)) && !book.querySelector('.cards').innerHTML.includes('M12 3l5.3 16.5'), names.join(', '));
check('grimoire-star the tally reads 17 of 17 and matches the cards', /17 of 17/.test(tally) && cards.length === 17 && cards.every((c) => !c.classList.contains('unknown')), `"${tally}", ${cards.length} cards`);
await __shot('grimoire-star');
B.close(); await wsleep(300);
// the galaxy still opens, earns nothing new as a find
{ const before = registry.count();
  const opened = E.galaxy.open('spin');                   // the way a hard spin opens it (it used to find the star here)
  await fast(4, () => until(() => E.galaxy.phase === 'hold', 15000)); E.galaxy.skip();
  await until(() => !E.galaxy.isOpen && !input.locked, 15000);
  check('grimoire-star the galaxy still opens and finds nothing', opened && registry.count() === before && !registry.find('star') && A.has('void'), `opened ${opened}, phase ${E.galaxy.phase}, open ${E.galaxy.isOpen}, locked ${input.locked}, void ${A.has('void')}, ${registry.count()} vs ${before}`); }
