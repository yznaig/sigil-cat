// Shared premise of the intermittent phone idle fixture: no layout event occurs
// during its sampling window. Measure adaptive DPR / resize separately from work.
cat.auto=false;const W=site.world,S=site.supports;
const items=['rifle','top','paper','postcard','ticket','tin','pat'].map(id=>keepsakes.give(id));await Promise.all(items.map(i=>i.worldTask));await site.shelf.task;await until(()=>!W.stats.listening&&!S.listening,12000);
for(const id of ['rifle','top','tin','pat'])site.shelf.store(id,false);
const B=site.worldPresentation,events=[],draws=[];const capture=label=>({label,at:performance.now(),dpr:stage.dpr,insets:{...stage.insets},stats:{...B.stats},shelf:site.shelf.picture.stats.draws,board:site.pinboard.picture.stats.draws});
const resized=()=>events.push(capture('resize'));stage.onResize.push(resized);let last=B.stats.pictureBuilds;
const present=()=>{if(last!==B.stats.pictureBuilds){last=B.stats.pictureBuilds;draws.push(capture('picture build'));}};stage.onPresented.push(present);
await sleep(14000);stage.onResize.splice(stage.onResize.indexOf(resized),1);stage.onPresented.splice(stage.onPresented.indexOf(present),1);
note('presentation idle shared premise',JSON.stringify({events,draws,final:capture('end')}));
