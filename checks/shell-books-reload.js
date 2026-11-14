// shell-books-reload.js: after "start over" the page has reloaded into a fresh game, and the old book addresses open
// their pop-ups.
const saved = JSON.parse(localStorage.getItem('sigilcat.v2') || '{}');
check('books start over: a fresh game after the reload, nothing kept', window.__notReloaded === undefined && registry.count() === 0 && ui.count === 0 && !keepsakes.has('top') && !keepsakes.has('rifle') && site.achievements.count === 0 &&
  !saved.found && !saved.keepsakes && !saved.achievements && !(saved.bonks > 0) && document.getElementById('grimoire').hidden && !/book=/.test(location.href),
  JSON.stringify({ keys: Object.keys(saved), finds: registry.count(), bonks: ui.count, href: location.href }));
await __shot('books-fresh');
// the old addresses still work: each redirects to the page with its book up
const redirects = await Promise.all(['spellbook.html', 'achievements.html'].map(async (p) => (await (await fetch(p)).text())));
check('books the old addresses redirect to the pop-ups', /location\.replace\('\.\/\?book=grimoire'/.test(redirects[0]) && /location\.replace\('\.\/\?book=achievements'/.test(redirects[1]));
