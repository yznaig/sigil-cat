// platinum-earn-reload.js: after checks/platinum-earn.js, a reload keeps Platinum Cat and exactly one badge.
await until(() => keepsakes.get('platinum')?.worldReady, 20000); await sleep(1500);
const A = site.achievements;
check('after a reload: Platinum Cat still earned, every achievement kept', A.has('platinum') && A.count === A.total, `${A.count} of ${A.total}`);
check('after a reload: the badge is back, once, in the page', keepsakes.get('platinum')?.worldReady && [...keepsakes.live.keys()].filter((k) => k === 'platinum').length === 1 && (() => { const r = keepsakes.get('platinum').picture.rect; return r.x + r.w > 0 && r.x < stage.width && r.y < stage.height; })(), JSON.stringify(keepsakes.get('platinum')?.picture?.rect));
await __shot('platinum-earn-reload');
