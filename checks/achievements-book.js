// achievements-book.js: the book (achievements.html), run with a few earned (the runner's --storage). Earned ones
// show the reveal's wax stamp in the same metal (e1113-02), name and date; locked ones the same blob as a dashed
// outline with a faint mark, name and hint; a secret one is only ??? and its name, hint and drawing are nowhere in the
// page. "N of M" is right. A section of only secrets is untitled until one is earned. Platinum, when earned, gets
// platinum wax. No old round .seal is left in the book. The bonk tiers are "the cat sees stars" (e1113-03), no dots.
// Run on ./?book=achievements (where achievements.html sends you: a pop-up over the cat now, shell lane playtest-2), --lib.
// No --lib: with a book open from the address the world is frozen, page timers wait; this keeps to the wall clock.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(30); } return false; };
await until(() => window.site?.books?.showing === 'achievements', 60000);
const site = window.site;
await wsleep(300);
const say = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
const book = site.books.element;
const { ACHIEVEMENTS } = await import(new URL('src/achievements.js', document.baseURI).href);
const saved = JSON.parse(localStorage.getItem('sigilcat.v2')).achievements || {};
const cards = [...book.querySelectorAll('.ach')], earned = cards.filter((c) => c.classList.contains('earned'));
const locked = cards.filter((c) => c.classList.contains('locked')), secret = cards.filter((c) => c.classList.contains('secret'));
say('one card per achievement', cards.length === ACHIEVEMENTS.length, `${cards.length} cards`);
say('the tally says N of M earned', book.querySelector('.tally').textContent === `${Object.keys(saved).length} of ${ACHIEVEMENTS.length} earned`, book.querySelector('.tally').textContent);
const { metalOf } = await import(new URL('src/ui/achievements.js', document.baseURI).href);
const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
say('earned cards show the wax stamp, name and date', earned.length === Object.keys(saved).length && earned.every((c) => c.querySelector('.wax svg path') && c.querySelector('h2').textContent.length > 2 && /\d{4}/.test(c.querySelector('small').textContent)), earned.map((c) => c.dataset.id).join(','));
say('each earned stamp is in its reveal\'s metal (tiers their own, Platinum Cat platinum, the rest gold)', earned.every((c) => c.querySelector(`.wax.metal-${metalOf(byId.get(c.dataset.id))}`)) && book.querySelector('.ach[data-id="bonk-100"] .wax.metal-bronze') && book.querySelector('.ach[data-id="lucky"] .wax.metal-gold'), earned.map((c) => c.dataset.id + ':' + [...c.querySelector('.wax').classList].join('.')).join(' '));
say('no old .seal is left in the book', !book.querySelector('.seal'));
say('the book\'s stamps are static (no stamp-down, no glint)', [...book.querySelectorAll('.wax, .wax *')].every((n) => !n.getAnimations().length));
say('locked secrets show only ??? (no drawing, no hint)', secret.length > 0 && secret.every((c) => c.querySelector('h2').textContent === '???' && !c.querySelector('svg.mark, .wax') && !c.querySelector('p')?.textContent.trim()), `${secret.length} secret`);
const text = document.body.textContent + document.body.innerHTML;
const leaks = ACHIEVEMENTS.filter((a) => a.secret && !saved[a.id]).filter((a) => text.includes(a.name) || text.includes(a.d) || text.includes(a.said));
say('no locked secret\'s name, line or drawing is anywhere in the page', leaks.length === 0, leaks.map((a) => a.id).join(','));
const plain = locked.filter((c) => !c.classList.contains('secret'));
say('locked non-secrets show the dashed blob with a faint mark, the name and a hint', plain.length > 0 && plain.every((c) => c.querySelector('.blank svg.out') && c.querySelector('.blank svg.mark') && !c.querySelector('.wax') && c.querySelector('h2').textContent !== '???' && c.querySelector('p').textContent.length > 6 && /locked/.test(c.querySelector('small').textContent)));
const out = book.querySelector('.blank svg.out path'), ocs = out && getComputedStyle(out);
say('a locked stamp is the wax blob drawn dashed', ocs && ocs.strokeDasharray.replace(/px/g, '') === '5, 4' && ocs.vectorEffect === 'non-scaling-stroke', ocs && `${ocs.strokeDasharray} ${ocs.vectorEffect}`);
say('locked secrets are the dashed blob with only ?', secret.every((c) => c.querySelector('.blank svg.out') && c.querySelector('.blank i')?.textContent === '?' && !c.querySelector('.blank svg.mark')));
const heads = [...book.querySelectorAll('.ach-group h3')].map((h) => h.firstChild.textContent.trim());
say('a section of only secrets is untitled until one is earned', heads.includes('???') && heads.includes('Signs') && heads.includes('Bonks') && !heads.includes('The bird'), heads.join(' | '));
say('a section with one earned is titled', saved.milk ? heads.includes('The kitchen') : true);
const plat = book.querySelector('.ach[data-id="platinum"]');
say('Platinum Cat earned shows platinum wax', !saved.platinum || plat.querySelector('.wax.metal-platinum'));
// the bonk tiers: the cat sees stars (e1113-03): his head; 0, 1, 2, 3 stars; X eyes at gold and platinum; the ring
const tiers = ['bonk-1', 'bonk-100', 'bonk-500', 'bonk-1000', 'bonk-10000'].map((id) => byId.get(id).d);
const stars = (d) => (d.match(/M[\d.]+ -?[\d.]+v[\d.]+M[\d.]+ -?[\d.]+h[\d.]+/g) || []).length, xeyes = (d) => /l2 2M[\d.]+ 15l-2 2/.test(d);
const ring = (d) => /c0-2(\.\d)? 1\d(\.\d)?-2(\.\d)? 1\d(\.\d)? 0s/.test(d);
say('the bonk tiers are the cat seeing stars: no dots, 0-3 stars, X eyes from gold, a ring at platinum',
  tiers.every((d) => d.startsWith('M6.2 21c') && !/21v\.01|M4 21h16/.test(d)) && tiers.map(stars).join() === '0,1,2,3,3'
  && tiers.map(xeyes).join() === 'false,false,false,true,true' && tiers.map(ring).join() === 'false,false,false,false,true' && new Set(tiers).size === 5, tiers.map(stars).join());
say('the earned bonk stamps in the book draw those marks', ['bonk-1', 'bonk-100'].every((id) => book.querySelector(`.ach[data-id="${id}"] .wax path`)?.getAttribute('d') === byId.get(id).d));
// the clover (e1113-04): flipped and centred; the stem leaves the join and curves left, below every leaf
const lucky = byId.get('lucky').d;
say('the clover\'s stem curves left from the leaves\' join', lucky.endsWith('M10.5 12c-.5 3-1.8 6-4.5 9') && lucky.startsWith('M10.5 12a3.2'), lucky.slice(-30));
await __shot('ach-book');
book.querySelector('.book-sheet').scrollTop = 1e6; await wsleep(200);
await __shot('ach-book-end');
