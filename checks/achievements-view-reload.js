// achievements-view-reload.js (playtest-3, e1113-05): after checks/achievements-view.js left the book in "all at
// once" and the page reloaded, the book opens in that view again; switching back to by section is kept too.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI).href);
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(30); } return false; };
const say = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
await until(() => window.site?.stage?.loaded && window.site?.books, 60000);
await wsleep(400);
const site = window.site;
if (!site.books.showing) site.books.open('achievements');
await until(() => site.books.showing === 'achievements', 5000);
const sheet = site.books.element.querySelector('.book-sheet');
say('reload: the book opens all at once again', !!sheet.querySelector('.ach-cols') && /by section/i.test(sheet.querySelector('[data-ach-view]').textContent), String(site.store.get('books.achView')));
await until(() => !sheet.getAnimations().length && !site.books.element.getAnimations().length, 3000);
const r = sheet.querySelector('[data-ach-view]').getBoundingClientRect();
await __pointer([{ x: r.x + r.width / 2, y: r.y + r.height / 2 }]);
await until(() => sheet.querySelector('.ach-group'), 3000);
const saved = JSON.parse(localStorage.getItem('sigilcat.v2'));
say('the button switches back to by section, and that is kept', !!sheet.querySelector('.ach-group .ach') && !sheet.querySelector('.ach-cols') && /all at once/i.test(sheet.querySelector('[data-ach-view]').textContent) && !saved.books?.achView, JSON.stringify(saved.books || {}));
// start over (the grimoire's store.wipe) takes it with everything else; nothing is written after a wipe, so last
site.store.set('books.achView', 'all'); site.store.flush();
const before = JSON.parse(localStorage.getItem('sigilcat.v2')).books?.achView;
site.store.wipe();
say('start over wipes the choice with everything else', before === 'all' && !JSON.parse(localStorage.getItem('sigilcat.v2')).books, String(before));
