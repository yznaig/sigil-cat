// A fixed physics body can still have a moving visual (the charged top).
cat.auto=false;const W=site.world;
const items=['rifle','top','tin','pat'].map(id=>keepsakes.give(id));await Promise.all(items.map(i=>i.worldTask));await site.shelf.task;await until(()=>!W.stats.listening,12000);
const B=site.worldPresentation,C=site.worldProps.charged,top=keepsakes.get('top');C.charge(top);await sleep(250);B.flush();
const before={builds:B.stats.shadowBuilds,frames:C.stats.frames};await sleep(1000);
check('presentation live rotor leaves sleeping shadow layer untouched',C.stats.frames>before.frames&&!site.worldLayout.shadows.get('top').batch.stationary&&B.stats.shadowBuilds===before.builds,JSON.stringify({before,after:{builds:B.stats.shadowBuilds,frames:C.stats.frames},stationary:B.stationaryShadows}));
C.stop();await until(()=>!W.stats.listening,12000);await sleep(100);check('presentation stopped rotor rejoins sleeping layer',site.worldLayout.shadows.get('top').batch.stationary);
