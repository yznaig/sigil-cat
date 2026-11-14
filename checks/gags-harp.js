// Gags lane, playtest 2 (items 7, 8, 9): the harp's tune is C C B C D C, a right note glows clearly, plucking keeps
// him in his pose for 4 s, and once the harp is found the keyboard plays his whiskers (A S D / J K L) and he says so.
// Run with checks/lib.js.
const H=E.harp,bm=E.butterman;
cat.auto=false;cat.setYaw(cat.config.rotate.homeYaw);await sleep(400);
check('the tune is C C B C D C on his whiskers',JSON.stringify(H.config.tune)==='[1,1,0,1,2,1]'&&H.config.tune.map(i=>H.config.notes[i]).join()==='1,1,0,1,3,1');
const key=k=>dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
const p0=H.plucks;key('s');check('before the harp is found the keys do nothing',H.plucks===p0&&H.keyPlucks===0);
// 7: a pluck holds his pose for four seconds, even when his cycle wants to move.
const CY=cat.config.cycle,pose=cat.pose,hold=CY.poses[pose].hold;CY.poses[pose].hold=[.05,.05];
const tapWhisker=async i=>{const w=H.whiskers()[i];await tap((w.pts[1].x+w.pts[2].x)/2,(w.pts[1].y+w.pts[2].y)/2);};
await tapWhisker(3);const t0=performance.now();cat.auto=true;let moved=null;
while(performance.now()-t0<3800){if(cat.popping||cat.pose!==pose){moved=performance.now()-t0;break;}await sleep(30);}
check('after a whisker pluck he keeps his pose for 4 s',moved===null&&cat.staying,`moved at ${moved} ms`);
const changed=await until(()=>cat.popping||cat.pose!==pose,3000);
check('then his cycle goes on',changed);
CY.poses[pose].hold=hold;cat.auto=false;await until(()=>!cat.popping,3000);cat.request(pose);await until(()=>cat.pose===pose&&cat.phase==='hold'&&!cat.popping,8000);await sleep(300);cat.setYaw(cat.config.rotate.homeYaw);await sleep(300);
// 8: a wrong start and a repeated C still lead into the tune (it restarts from what can still begin it).
const right=[];
for(const i of [2,1,1,1,0,1,2,1]){await tapWhisker(i);right.push(H.progress);await sleep(150);}
check('C C C B C D C still plays it (the tune restarts from the last two Cs)',bm.running||H.unlocked,right.join());
await until(()=>bm.running,3000);
// The right note's ring: a wide gold glow; a wrong one is thin and pale.
await until(()=>!bm.running,60000);await sleep(500);cat.setYaw(cat.config.rotate.homeYaw);await sleep(400);
await tapWhisker(1);await sleep(70);const glow=document.querySelector('#harp-fx path[filter]');await __shot('gags-harp-right-note');
check('a right note glows (a blurred gold halo under the line)',!!glow&&+glow.getAttribute('stroke-width')>=12&&!!document.querySelector('#harp-fx filter feGaussianBlur'));
await sleep(1400);const w0=H.plucks;await tapWhisker(5);await sleep(70);
check('a wrong note rings thin, with no glow',H.plucks===w0+1&&!document.querySelector('#harp-fx path[filter]')&&!!document.querySelector('#harp-fx path'),document.getElementById('harp-fx').innerHTML.slice(0,300));
await __shot('gags-harp-wrong-note');
// 9: he told you about the keys once the encore was over (desktop only).
if(!MOBILE){
  check('after the encore he tells you about the keyboard',!!store.get('harp.keysTold'));
  await sleep(4100);const k0=H.keyPlucks,q0=H.plucks,fk=H.flares;for(const k of ['s','s','a','s','d','s'])key(k);
  check('the keyboard plays his whiskers once the harp is found',H.keyPlucks===k0+6&&H.plucks===q0+6);
  // (merged with the butterman lane's once-ever encore: it has played above, so the tune on the keys flares instead)
  check('and the tune on the keys plays the tune: the encore used up, the whiskers flare',await until(()=>H.flares>fk,3000)&&!bm.running,`flares ${H.flares-fk}, running ${bm.running}`);
  const k1=H.keyPlucks;dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true}));dispatchEvent(new KeyboardEvent('keydown',{key:'s',repeat:true}));
  check('modified or repeated keys do nothing',H.keyPlucks===k1);
}else check('on a touch-only phone he does not mention a keyboard',!store.get('harp.keysTold'));
// With the butterman lane's once-ever encore: used up, the tune flares all six whiskers gold, and nothing is said.
await until(()=>!bm.running,60000);await sleep(500);cat.setYaw(cat.config.rotate.homeYaw);await sleep(400);
const said=[];const say0=ui.say,speak0=ui.speak;ui.say=(t,o)=>{said.push(t);return say0(t,o);};if(speak0)ui.speak=(t,o)=>{said.push(t);return speak0(t,o);};
bm.encore=()=>false;const f0=H.flares;
for(const i of H.config.tune){await tapWhisker(i);await sleep(150);}
await until(()=>H.flares>f0,3000);await sleep(60);
check('the encore used up, the tune flares all six whiskers gold and he says nothing',H.flares===f0+1&&document.querySelectorAll('#harp-fx path[filter]').length>=5&&!said.includes('encore')&&!bm.running,said.join('|'));
await __shot('gags-harp-flare');
// The lesson waits for the encore to be seen (the butterman lane's event), and comes once.
if(!MOBILE){store.del('harp.keysTold');dispatchEvent(new CustomEvent('sigilcat:encore-seen'));check('the encore-seen event brings the keyboard lesson',await until(()=>!!store.get('harp.keysTold'),8000));}
delete bm.encore;ui.say=say0;if(speak0)ui.speak=speak0;
// Fix round B (playtest-2): his whiskers are drawn over what is behind him, past his outline too, so a press on a
// whisker over an item deeper than him is a pluck, not a lift (the box flung home could sit under the left whiskers,
// where the whole tune is). The box is held still behind him, under the middle-left whisker.
{ await sleep(1200);cat.setYaw(0);await sleep(600);   // facing you, as play.js plays the tune
  const T=site.THREE,W=site.world,w=H.whiskers()[1],along=(k)=>({x:w.pts[1].x+(w.pts[2].x-w.pts[1].x)*k,y:w.pts[1].y+(w.pts[2].y-w.pts[1].y)*k});
  keepsakes.give('box');await keepsakes.get('box').worldTask;const e=keepsakes.get('box').worldEntry;await until(()=>!W.stats.listening,20000);
  // the box's middle at the whisker's tip (or a little further out), a little deeper than him, held still there; then a
  // point on the whisker where, without the whisker rule, the ray meets the box (clear of his body): the setup is real
  const real=H.whiskerAt,bare=(q)=>{H.whiskerAt=()=>null;try{return site.worldInput.pick({clientX:q.x,clientY:q.y})?.entry?.id;}finally{H.whiskerAt=real;}};
  const c=W.cat.body.translation(),ray=new T.Raycaster(),out={x:w.pts[2].x-w.pts[1].x,y:w.pts[2].y-w.pts[1].y},len=Math.hypot(out.x,out.y)||1;
  let p=null;
  for(const push of [0,.3,.6,.15,.45]){
    const tip={x:w.pts[2].x+out.x/len*push*keepsakes.get('box').w,y:w.pts[2].y+out.y/len*push*keepsakes.get('box').w};
    ray.setFromCamera(new T.Vector2(tip.x/stage.width*2-1,1-tip.y/stage.height*2),stage.camera);
    const at=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),-(c.z-.6)),new T.Vector3());
    site.supports.detach(e,{wake:false});W.cancelReturn(e);e.body.setGravityScale(0,true);e.body.setTranslation(at,true);
    e.body.setLinvel({x:0,y:0,z:0},true);e.body.setAngvel({x:0,y:0,z:0},true);W.wake(e);await sleep(400);
    p=[.95,.9,.8,.7,.6,.5].map(along).find((q)=>bare(q)==='box'&&H.whiskerAt(q.x,q.y)?.index===1);if(p)break;
  }
  const under=p&&site.worldInput.pick({clientX:p.x,clientY:p.y})?.entry?.id;
  const n0=H.plucks;if(p){await tap(p.x,p.y);await sleep(200);}
  check('a whisker over an item behind him is plucked, not the item lifted (fix round B)',!!p&&under!=='box'&&H.plucks===n0+1&&!W.held,JSON.stringify({at:p,under:under??null,plucks:H.plucks-n0,box:keepsakes.get('box').px}));
  await __shot('gags-harp-over-box');
  e.body.setGravityScale(1,true);W.wake(e);
}
