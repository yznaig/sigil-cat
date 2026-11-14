// Gags lane, playtest 2 (item 1, e1112-36): the pitchfork falls from the sky when its sigil is drawn (and that fall
// never brings the hay); thrown up through the top it vanishes with its shadow, the hay falls, and it stays gone
// until the fork is drawn again. Run with checks/lib.js.
cat.auto=false;
const C=E.box.recipe,W=site.world,T=site.THREE;
site.cast('fork');
const fork=keepsakes.get('pitchfork');await fork.worldTask;
const startY=fork.worldEntry.body.translation().y,startRect={...fork.picture.rect};
check('fork sigil: the pitchfork starts above the page and falls',fork.worldEntry.fromSky&&startRect.y+startRect.h<stage.insets.top+4,JSON.stringify({y:startY,rect:startRect}));
let low=Infinity;const watch=()=>{low=Math.min(low,fork.picture.rect.y);};stage.onFrame.push(watch);
await sleep(700);await __shot('gags-fork-falling');
await until(()=>!fork.worldEntry.fromSky&&fork.worldEntry.body.isSleeping(),12000);stage.onFrame.splice(stage.onFrame.indexOf(watch),1);
const r=fork.picture.rect;
check('fork lands on the page, in reach',r.y<stage.height-stage.insets.bottom-30&&r.x>0&&r.x+r.w<stage.width&&r.y>stage.height*.3,JSON.stringify(r));
check('its fall from the sky brings no hay',!C.state.hay&&!keepsakes.has('hay'),JSON.stringify(C.state.hay));
await __shot('gags-fork-landed');
// Thrown up (its own tap): out of the top, gone with its shadow, then the hay.
await C.throwFork();
await until(()=>!keepsakes.has('pitchfork'),8000);
check('thrown into the sky, the pitchfork is gone (no respawn timer)',!keepsakes.has('pitchfork')&&!W.entries.has('pitchfork')&&!store.get('keepsakes.pitchfork'),C.stats.forkGone);
check('and so is its shadow',!site.worldLayout.shadows.has('pitchfork'));
await until(()=>keepsakes.get('hay')?.worldReady,8000);
check('the hay falls after it',!!C.state.hay&&keepsakes.has('hay'));
await __shot('gags-fork-gone');
await sleep(6000);
check('it does not come back by itself',!keepsakes.has('pitchfork'));
// Drawn again: a new one falls; the hay is already down, nothing new.
site.cast('fork');const again=keepsakes.get('pitchfork');await again?.worldTask;
check('drawing the fork again brings it back from the sky',!!again&&again.worldEntry.fromSky);
await until(()=>!again.worldEntry.fromSky,12000);
check('one hay pile only',[...keepsakes.live.keys()].filter(k=>k==='hay').length===1);
store.flush();
