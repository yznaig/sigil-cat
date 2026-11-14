// The merged adapters share prepared/core.js. No prepared art may precede the cat.
cat.auto=false;
const ids=['eyes','crumbs','shards','box','flour','bucket','pitchfork','hay','recipe-flour','recipe-butter','recipe-milk','cake'];
for(const id of ids)keepsakes.give(id);
await Promise.all(ids.map(id=>keepsakes.get(id).worldTask));
const {createCup}=await import('/src/world/cup.js');const cup=await createCup(site,.22);cup.dispose();
check('all lazy prepared adapters construct physical bodies',ids.every(id=>keepsakes.get(id)?.worldReady&&!keepsakes.get(id).worldError));
const assets=performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/models/prepared/'));
check('all prepared art loads after visible cat',assets.length>=10&&assets.every(e=>e.startTime>=site.timing.shown),JSON.stringify({shown:site.timing.shown,assets:assets.map(e=>({url:e.name,start:e.startTime}))}));
