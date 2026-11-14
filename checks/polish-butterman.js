// World polish lane (e1111-58, item 4): Butterman's scenes leave the collection on the page, and a prop in his path is
// shoved aside by him instead of being hidden. His choreography is unchanged. Run with checks/lib.js.
cat.auto=false;
const bm=E.butterman,T=site.THREE,W=site.world,fig=stage.scene.getObjectByName('butterman');
await bm.clipsReady;
const tin=keepsakes.give('tin'),top=keepsakes.give('top');await Promise.all([tin.worldTask,top.worldTask]);await until(()=>!W.stats.listening,15000);
// his path, from the frozen scene: a floor spot on his walk in, clear of the cat and on the page
bm.inspect('butter');const total=bm.state.totalBeats,hit=bm.state.hitBeat,path=[];
for(let b=0;b<hit;b+=.25){bm.seek(b,'butter');await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);if(!bm.state.figureVisible)continue;const p=fig.position.clone(),s=stage.toScreen(p);path.push({b,p,s});}
bm.stop();
const spot=path.filter(q=>Math.hypot(q.p.x,q.p.z)>.62&&q.s.x>60&&q.s.x<stage.width-60&&q.s.y<stage.height-stage.insets.bottom-40&&Math.abs(q.p.y)<.01).sort((a,c)=>Math.abs(Math.hypot(a.p.x,a.p.z)-.95)-Math.abs(Math.hypot(c.p.x,c.p.z)-.95))[0];
check('found a floor spot on his walk in',!!spot,spot?`beat ${spot.b} at ${spot.p.x.toFixed(2)},${spot.p.z.toFixed(2)}`:'');
const e=tin.worldEntry,b=e.body,q=new T.Quaternion().setFromEuler(new T.Euler(0,.3,0));
const low=Math.min(...tin.colliderVertices.map(v=>v.clone().applyQuaternion(q).y));
b.setTranslation({x:spot.p.x,y:-low+.002,z:spot.p.z},false);b.setRotation(q,false);b.setLinvel({x:0,y:0,z:0},false);b.setAngvel({x:0,y:0,z:0},false);W.wake(e);
await until(()=>!W.stats.listening,8000);
const start=new T.Vector3().copy(b.translation());
// play it live and watch
const frames=[];let shot=false,closest=Infinity;
const watch=()=>{if(!bm.state.figureVisible)return;const p=new T.Vector3().copy(b.translation()),d=Math.hypot(fig.position.x-p.x,fig.position.z-p.z),v=b.linvel();
 frames.push({d,speed:Math.hypot(v.x,v.y,v.z),visible:tin.object.visible&&tin.picture.card.visible&&top.object.visible,scene:document.body.classList.contains('bm-scene')});closest=Math.min(closest,d);};
stage.onRender.push(watch);
bm.play({scene:'butter',forceAudio:true});
await until(()=>bm.state.figureVisible&&Math.hypot(fig.position.x-b.translation().x,fig.position.z-b.translation().z)<.16,30000,10);
await sleep(150);await __shot('polish-butterman-push');
await until(()=>bm.state.mode==='done',60000);
stage.onRender.splice(stage.onRender.indexOf(watch),1);
await until(()=>!W.stats.listening,8000);
const end=new T.Vector3().copy(b.translation()),moved=Math.hypot(end.x-start.x,end.z-start.z);
check('the collection stays on the page through his scene',frames.length>30&&frames.every(f=>f.visible&&!f.scene),`${frames.length} frames watched`);
check('the prop in his path is moved aside, not walked through or bulldozed',moved>.04&&moved<.5&&closest>.03,`moved ${moved.toFixed(3)}; his centre came within ${closest.toFixed(3)} of it`);
check('the shove is gentle (no launch)',Math.max(...frames.map(f=>f.speed))<1.5&&end.y<.2,`top speed ${Math.max(...frames.map(f=>f.speed)).toFixed(2)} u/s`);
const log=bm.state.log,butter=log.find(l=>l.event==='butter'),done=log.find(l=>l.event==='done');
check('his choreography keeps its beats',!!butter&&Math.abs(butter.s-bm.state.hitSeconds)<.06&&!!done&&done.beat>=total,JSON.stringify({butter,done,hit:bm.state.hitSeconds}));
check('the world rests again when he has gone',!W.stats.listening&&b.isSleeping());
