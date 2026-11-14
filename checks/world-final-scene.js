const {collectFinal}=await import('/checks/world-final-collection.mjs');
await collectFinal(site,{cake:true});
check('final collection naturally settles',await until(()=>!site.world.stats.listening&&!site.supports.listening,20000));
note('final awake bodies',JSON.stringify([...site.world.entries.values()].filter(e=>!e.fixed&&!e.support&&!e.body.isSleeping()).map(e=>({id:e.id,position:e.body.translation(),velocity:e.body.linvel(),angular:e.body.angvel(),timer:!!e.timer}))));
await sleep(2500);await __shot('world-final-collected');
const boxes=[...keepsakes.live.values()].map(i=>({id:i.id,box:i.box,support:i.worldEntry?.support}));
note('final collection placement',JSON.stringify({footer:stage.height-stage.insets.bottom,cat:cat.rect,rack:site.rack.picture.rect,items:boxes}));
const counts=()=>({steps:site.world.stats.steps,syncs:site.world.stats.syncs,shadows:site.worldLayout.stats.shadowUpdates,presentation:{...site.worldPresentation.stats}});
const before=counts();await sleep(2100);const after=counts();check('final settled collection has zero world work',JSON.stringify(before)===JSON.stringify(after),JSON.stringify({before,after}));
