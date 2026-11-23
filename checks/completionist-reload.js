// completionist-reload.js: after checks/completionist.js, reload. Completionist is still earned, with its time.
await sleep(800);
const t = store.get('completionistCheck');
check('completionist still earned after the reload, same time', site.achievements.has('complete') && t > 0 && store.get('achievements.complete') === t, String(t));
