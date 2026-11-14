// After kitchen-recycle.js and a reload: the six stars stay stuck where they were, the bin stays gone, nothing comes back.
cat.auto=false;const R=E.recycle;await sleep(600);
const stars=['goodjob','goodjob-2','goodjob-3','goodjob-4','goodjob-5','goodjob-6'];
check('recycle the six stars survive a reload, on the screen',stars.every(id=>keepsakes.get(id)?.el.closest('#stickers')&&keepsakes.get(id).el.getBoundingClientRect().width>20));
check('recycle bin stays gone; crumbs and glass stay recycled',!R.bin&&R.state.gone&&R.count===6&&!keepsakes.has('crumbs')&&!keepsakes.has('shards'));
await __shot('kitchen-recycle-reload');
