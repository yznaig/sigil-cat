// world-arrivals-reload.js: after a reload, unlocked furniture is simply there, at home, usable; no slide replays.
await until(()=>site.shelf?.ready&&site.pinboard?.ready,20000);await sleep(300);
const A=site.arrivals,saved=store.get('arrivalsCheck');
check('arrivals reload places furniture at once, no slide or fanfare',!A?.plans.size&&!site.shelf.arriving&&!site.pinboard.arriving&&site.shelf.entry.body.isEnabled()&&site.pinboard.entry.body.isEnabled(),`plans ${A?.plans.size}`);
check('arrivals reload homes match the landed homes',['shelf','pinboard'].every(k=>Math.abs(site[k].home.x-saved[k].x)<1&&Math.abs(site[k].home.y-saved[k].y)<1),JSON.stringify({saved,now:{shelf:site.shelf.home,board:site.pinboard.home}}));
await __shot('arrivals-reload');
