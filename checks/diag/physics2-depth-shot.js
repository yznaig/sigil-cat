// Physics lane: a resting scene for the eye: props on the floor behind and in front of the cat, overlapping him.
cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
for(const id of ['rifle','top','tin','box','bucket'])keepsakes.give(id);
await Promise.all(['rifle','top','tin','box','bucket'].map(id=>keepsakes.get(id).worldTask));await site.shelf.task;
await until(()=>!W.stats.listening,20000);
const put=(id,x,z,yaw=0)=>{const e=keepsakes.get(id).worldEntry;S.detach(e,{wake:false});W.cancelReturn(e);e.body.setTranslation({x,y:.4,z},true);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(0,yaw,0)),true);e.body.setLinvel({x:0,y:0,z:0},true);e.body.setAngvel({x:0,y:0,z:0},true);W.wake(e);};
put('rifle',-.15,-.75,.3);put('box',.55,-.7);put('tin',.3,.55);put('top',-.4,.5);put('bucket',-.75,-.2);
await until(()=>!W.stats.listening,20000);await sleep(300);
note('depth shot behind',String(site.worldPresentation.stats.behindCat));
await __shot('physics2-depth-scene');
