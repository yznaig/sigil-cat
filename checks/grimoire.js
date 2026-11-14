// grimoire.js: N5. Run on ./?book=grimoire (the address spellbook.html sends you to: the grimoire is a pop-up over the
// cat now, shell lane playtest-2) and a few things found (the runner's --storage). An unfound sigil shows no
// shape at all, and its shape is not in the page; found ones show theirs; combos stay off the page until found.
// No --lib: with a book open from the address the world is frozen, page timers wait; this keeps to the wall clock.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(30); } return false; };
await until(() => window.site?.books?.showing === 'grimoire', 60000);
const site = window.site;
await wsleep(300);
const say = (name, ok, detail) => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
const book = site.books.element;
say('the old address opened the grimoire pop-up and tidied the address', !!book && !/book=/.test(location.href), location.href);
const cards = [...book.querySelectorAll('.card')], unknown = cards.filter((c) => c.classList.contains('unknown')), found = cards.filter((c) => !c.classList.contains('unknown'));
const shapes = unknown.filter((c) => c.querySelector('svg, path, canvas, img')).length;
say('N5 unfound cards show no shape, only ??? and a riddle', unknown.length > 0 && shapes === 0 && unknown.every((c) => c.querySelector('.fig').textContent.trim() === '???' && /not yet found/i.test(c.textContent) && c.querySelector('p').textContent.length > 8),
  `${unknown.length} unfound cards, ${shapes} with a drawing`);
say('N5 found cards show their shape', found.length === Number(book.querySelector('.tally b').textContent) && found.every((c) => c.querySelector('svg path')), `${found.length} found cards, tally says ${book.querySelector('.tally').textContent}`);
say('N5 no unfound shape is anywhere in the book', book.querySelectorAll('svg path').length - book.querySelectorAll('.name svg path').length === found.length, `${book.querySelectorAll('.cards svg').length} drawings for ${found.length} found`);
const names = cards.map((c) => c.querySelector('h2').textContent);
say('combos stay off the page until found', !/paradox|fling/i.test(book.querySelector('.cards').textContent) && names.includes('Blasting off'), `cards: ${cards.length}`);
await __shot('31-grimoire');

const cowCredit=book.querySelector('.credits');
say('cow credit names artist and links source and license', !!cowCredit&&/Rukh3D/.test(cowCredit.textContent)&&/CC BY 4.0/.test(cowCredit.textContent)&&!!cowCredit.querySelector('a[href*="creativecommons.org/licenses/by/4.0"]')&&!!cowCredit.querySelector('a[href*="sketchfab.com/3d-models"]'),cowCredit?.textContent.trim());
// e1111-38: Lux Aeterna Audio asked for the piece's name and a link to the channel, in the credits.
const lux=[...(cowCredit?.querySelectorAll('li')||[])].find(li=>/Lux Aeterna Audio/.test(li.textContent));
say('credits name "RPG Victory Fanfare 2" by Lux Aeterna Audio and link the channel', !!lux&&/“RPG Victory Fanfare 2” by Lux Aeterna Audio/.test(lux.textContent)&&!!lux.querySelector('a[href="https://www.youtube.com/@LuxAeterna22878"]'),lux?.textContent.trim());
const style=getComputedStyle(cowCredit.querySelector('ul'));
say('credits are quiet: small soft type below the cards', parseFloat(style.fontSize)<=13&&cowCredit.getBoundingClientRect().top>book.querySelector('.cards').getBoundingClientRect().bottom,`${style.fontSize}`);
cowCredit.scrollIntoView({block:'center'});await wsleep(200);await __shot('32-grimoire-credits');
