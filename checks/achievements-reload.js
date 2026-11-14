// achievements-reload.js: after checks/achievements.js, reload. What was earned is still earned (with its date),
// the rare-bonk line and the mark come back, and nothing toasts again.
await sleep(1500);
const A = site.achievements, saved = store.get('achCheck') || { earned: [] };
check('every achievement earned before the reload is still earned', saved.earned.length > 10 && saved.earned.every((id) => A.has(id)) && A.count === saved.earned.length, `${A.count} now, ${saved.earned.length} before`);
check('each keeps the time it was earned', saved.earned.every((id) => Number(store.get('achievements.' + id)) > Date.now() - 3600e3));
check('no toast and no chime on reload', A.queued === 0 && !A.toast && A.chimes === 0, `${A.queued} queued`);
const rare = document.getElementById('rare');
check('the rare-bonk line comes back', !rare.hidden && rare.textContent === `${saved.rare} rare bonk${saved.rare === 1 ? '' : 's'}`, rare.textContent);
const mark = document.getElementById('achievements');
check('the mark comes back with the count', !mark.hidden && mark.getAttribute('aria-label') === `achievements: ${A.count} of ${A.total}`, mark.getAttribute('aria-label'));
await __shot('ach-after-reload');
