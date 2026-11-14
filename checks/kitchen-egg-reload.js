// After kitchen-egg.js and a reload: the same one egg, and while it exists the bird's next visit drops no other.
cat.auto=false;await keepsakes.get('egg')?.worldTask;const C=E.box.recipe,B=E.bird;
check('egg survives a reload',keepsakes.get('egg')?.worldReady&&C.state.egg);
B.debug.skipTo(89.4);await until(()=>B.state==='flying',4000);await sleep(3600);
check('egg the bird drops no second egg while one exists',[...keepsakes.live.keys()].filter(id=>id==='egg').length===1&&B.state==='flying');
