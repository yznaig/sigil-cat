// achievements-view.js (playtest-3, e1113-05): the achievements book's "all at once" view. A felt button by the
// tally switches between the sections and compact columns, one per section in GROUPS order, each headed by its short
// name across the top and n/m, every stamp running down it. All 46 fit the page's width with no sideways scroll (and
// are all on screen at once on a desktop). A tapped stamp's name and line show in a bar at the top that stays in
// view while the columns scroll; a locked secret says only "locked" and gives nothing away. The choice is kept on
// this device (store 'books.achView'): checks/achievements-view-reload.js reloads and finds it, then switches back.
// Run on ./?book=achievements with the book's --storage (checks/run-all.sh), at desktop, phone (844x390) and 640x360.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(30); } return false; };
await until(() => window.site?.books?.showing === 'achievements', 60000);
await wsleep(300);
const say = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
const site = window.site, { store } = site, pop = site.books.element, sheet = pop.querySelector('.book-sheet');
const { ACHIEVEMENTS, GROUPS } = await import(new URL('src/achievements.js', document.baseURI).href);
const saved = JSON.parse(localStorage.getItem('sigilcat.v2')).achievements || {};
const tap = async (el) => { el.scrollIntoView({ block: 'center' }); await wsleep(80); const r = el.getBoundingClientRect(); await __pointer([{ x: r.x + r.width / 2, y: r.y + r.height / 2 }]); await wsleep(120); };
const inside = (a, b, slack = 0.5) => a.left >= b.left - slack && a.right <= b.right + slack && a.top >= b.top - slack && a.bottom <= b.bottom + slack;

const btn = () => sheet.querySelector('[data-ach-view]');
say('by section is the default; the button offers all at once', !store.get('books.achView') && sheet.querySelector('.ach-group') && !sheet.querySelector('.ach-cols') && /all at once/i.test(btn()?.textContent), btn()?.textContent);
const tally = sheet.querySelector('.tally').getBoundingClientRect(), br = btn().getBoundingClientRect();
say('the button is a felt patch beside the tally', btn().matches('.felt') && Math.abs((br.top + br.bottom) / 2 - (tally.top + tally.bottom) / 2) < 12 && (br.left >= tally.right - 1 || br.top >= tally.bottom - 1), JSON.stringify({ tally: [Math.round(tally.right), Math.round(tally.top)], btn: [Math.round(br.left), Math.round(br.top)] }));
// the sheet's opening slide is finished before anything is tapped (under load it can still be moving)
await until(() => !sheet.getAnimations().length && !pop.getAnimations().length, 3000);
const hit = (() => { const r = btn().getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-ach-view]') === btn(); })();
await tap(btn());
await until(() => sheet.querySelector('.ach-cols'), 3000);
const cols = [...sheet.querySelectorAll('.ach-col')], stamps = [...sheet.querySelectorAll('.ach-col button.stamp')];
const stored = JSON.parse(localStorage.getItem('sigilcat.v2'))?.books?.achView;
say('the button switches to all at once, kept on this device', site.books.showing === 'achievements' && cols.length === GROUPS.length && store.get('books.achView') === 'all' && stored === 'all' && /by section/i.test(btn()?.textContent), `${cols.length} columns, saved ${stored}, the tap point on the button ${hit}`);
say('every achievement is a stamp, in GROUPS order', stamps.length === ACHIEVEMENTS.length && cols.every((c, i) => c.querySelectorAll('.stamp').length === ACHIEVEMENTS.filter((a) => a.group === GROUPS[i][0]).length), `${stamps.length} stamps`);
say('earned stamps are wax, locked ones the dashed blob', stamps.every((s) => (s.classList.contains('earned') ? s.querySelector('.wax') && !s.querySelector('.blank') : s.querySelector('.blank svg.out') && !s.querySelector('.wax'))) && stamps.filter((s) => s.classList.contains('earned')).length === Object.keys(saved).length);
// names: each column's short name, horizontal and inside its column; a section of unearned secrets stays ???
const heads = cols.map((c) => c.querySelector('h3 span'));
const shorts = GROUPS.map(([id, , short]) => { const list = ACHIEVEMENTS.filter((a) => a.group === id); return list.some((a) => saved[a.id] || !a.secret) ? short : '???'; });
say('column names are the short names (??? for an untouched secret section)', heads.map((h) => h.textContent).join() === shorts.join(), heads.map((h) => h.textContent).join(' | '));
const flat = heads.every((h) => { const cs = getComputedStyle(h), hs = getComputedStyle(h.parentElement); return cs.writingMode === 'horizontal-tb' && cs.transform === 'none' && hs.transform === 'none' && h.getBoundingClientRect().width > h.getBoundingClientRect().height; });
const fit = heads.every((h, i) => inside(h.getBoundingClientRect(), cols[i].getBoundingClientRect()) && h.scrollWidth <= Math.ceil(h.getBoundingClientRect().width) + 0.5);
say('every column name is horizontal and inside its column', flat && fit, heads.map((h, i) => `${h.textContent} ${Math.round(h.getBoundingClientRect().width)}/${Math.round(cols[i].getBoundingClientRect().width)}`).join(' '));
const minFont = Math.min(...heads.map((h) => parseFloat(getComputedStyle(h).fontSize)));
say('the column counts read n/m', cols.every((c, i) => /^\d+\/\d+$/.test(c.querySelector('h3 small').textContent)));
// width: nothing scrolls sideways, every stamp is inside the page's width
const vw = document.documentElement.clientWidth;
say('no sideways scroll; every stamp inside the page', sheet.scrollWidth <= sheet.clientWidth && document.documentElement.scrollWidth <= vw && stamps.every((s) => { const r = s.getBoundingClientRect(); return r.left >= 0 && r.right <= vw; }), `sheet ${sheet.scrollWidth}/${sheet.clientWidth}, page ${document.documentElement.scrollWidth}/${vw}, header font ${minFont}px`);
const sr = sheet.getBoundingClientRect();
const onScreen = stamps.filter((s) => inside(s.getBoundingClientRect(), sr, 1)).length;
if (innerWidth >= 1200) say('on a desktop all of them are on screen at once', onScreen === stamps.length, `${onScreen} of ${stamps.length} in the sheet's view at ${innerWidth}x${innerHeight}`);
else __say(`NOTE ${onScreen} of ${stamps.length} stamps in view before scrolling at ${innerWidth}x${innerHeight}`);
// nothing about a locked secret is in the page; its stamp says only "locked"
const text = document.body.textContent + document.body.innerHTML;
const leaks = ACHIEVEMENTS.filter((a) => a.secret && !saved[a.id]).filter((a) => text.includes(a.name) || text.includes(a.d) || text.includes(a.said));
const secretStamps = stamps.filter((s) => !s.dataset.id);
say('a locked secret is a button named "locked", with no id, name, line or drawing in the page', leaks.length === 0 && secretStamps.length === ACHIEVEMENTS.filter((a) => a.secret && !saved[a.id]).length && secretStamps.every((s) => s.getAttribute('aria-label') === 'locked' && s.querySelector('.blank i')?.textContent === '?' && !s.querySelector('svg.mark')), `${secretStamps.length} secret, leaks ${leaks.map((a) => a.id).join(',')}`);
say('the others are buttons named for the achievement', stamps.filter((s) => s.dataset.id).every((s) => s.tagName === 'BUTTON' && s.getAttribute('aria-label') === ACHIEVEMENTS.find((a) => a.id === s.dataset.id).name));
// the bar at the top
const bar = sheet.querySelector('.ach-peek');
const head = sheet.querySelector('header').getBoundingClientRect(), colTop = Math.min(...cols.map((c) => c.getBoundingClientRect().top));
say('the bar sits between the header and the columns and reads "tap a stamp"', bar && /tap a stamp/i.test(bar.textContent) && bar.getBoundingClientRect().top >= head.bottom && bar.getBoundingClientRect().bottom <= colTop + 0.5, bar?.textContent);
await __shot('ach-all');
const bar0 = bar.getBoundingClientRect().top + sheet.scrollTop;   // where the bar sits before any scroll
const pick = (f) => stamps.find((s) => s.dataset.id && f(ACHIEVEMENTS.find((a) => a.id === s.dataset.id)));
const won = pick((a) => saved[a.id]), hinted = pick((a) => !saved[a.id] && !a.secret), hidden = secretStamps[secretStamps.length - 1];
await tap(won);
const wa = ACHIEVEMENTS.find((a) => a.id === won.dataset.id);
say('a tapped earned stamp: its name and its line in the bar, and a ring on it', bar.querySelector('b')?.textContent === wa.name && bar.querySelector('span')?.textContent === wa.said && won.classList.contains('on') && getComputedStyle(won).outlineStyle !== 'none' && sheet.querySelectorAll('.stamp.on').length === 1, `${bar.textContent}`);
await tap(hinted);
const ha = ACHIEVEMENTS.find((a) => a.id === hinted.dataset.id);
say('a tapped locked stamp: its name and its hint; the ring moves', bar.querySelector('b')?.textContent === ha.name && bar.querySelector('span')?.textContent === ha.hint && hinted.classList.contains('on') && !won.classList.contains('on'), bar.textContent);
// tap a secret: "locked"; then scroll to the end (the columns move under the bar): the bar holds the top, still saying it
await tap(hidden);
sheet.scrollTop = 1e6; await wsleep(150);
const b2 = bar.getBoundingClientRect(), s2 = sheet.getBoundingClientRect();
say('a tapped secret says only "locked", and it is still there after the scroll', bar.querySelector('b')?.textContent === '???' && bar.querySelector('span')?.textContent === 'locked' && hidden.classList.contains('on'), bar.textContent);
const want = Math.max(s2.top, bar0 - sheet.scrollTop);   // sticky: once the sheet has scrolled past it, it holds the top
say('after scrolling the bar is still at the top, in view', Math.abs(b2.top - want) < 1.5 && b2.bottom <= s2.bottom && document.elementFromPoint(b2.left + b2.width / 2, b2.top + b2.height / 2)?.closest('.ach-peek') === bar
  && (sheet.scrollHeight <= sheet.clientHeight + 1 || sheet.scrollTop > 0), `scrollTop ${Math.round(sheet.scrollTop)}, bar top ${Math.round(b2.top)} (held at ${Math.round(want)}), sheet top ${Math.round(s2.top)}`);
await __shot('ach-all-scrolled');
// the stamps here are static too; Escape still closes the book
say('the stamps are static (no stamp-down, no glint)', [...sheet.querySelectorAll('.wax, .wax *')].every((n) => !n.getAnimations().length));
store.flush();
