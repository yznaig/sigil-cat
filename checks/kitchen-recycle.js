// Kitchen lane (e1111-58), playtest 2 (gags lane): with the crumbs or the broken glass about, a recycling bin slides
// in at the bottom right. Dragging one over it shows "Release to recycle" over the whole bin; let go and it is in, and
// a gold star sticker is stuck on the screen. Six in all (GOOD JOB, GREAT JOB!, THANK YOU!, WOW x3), then the bin
// leaves for good, Clean Sweep is earned, and no more shards or crumbs come.
cat.auto=false;const R=E.recycle,W=site.world,calm=stage.reducedMotion;
const said=[];const say0=ui.say,speak0=ui.speak;ui.say=(t,o)=>{said.push(t);return say0(t,o);};if(speak0)ui.speak=(t,o)=>{said.push(...[].concat(t));return speak0(t,o);};
keepsakes.give('crumbs');await keepsakes.get('crumbs').worldTask;
check('recycle one of the two is enough to bring the bin',await until(()=>R.bin,8000)&&R.state.shown);
if(!calm){await sleep(260);await __shot('kitchen-recycle-sliding');}
await until(()=>R.armed,5000);await until(()=>!W.stats.listening,12000);await sleep(200);
const br=R.bin.picture.rect;
check('recycle the bin sits at the bottom right, clear of the footer',br.x+br.w<=stage.width-4&&br.x>stage.width*.5&&br.y+br.h<=stage.height-stage.insets.bottom+6&&br.y>stage.height*.45,JSON.stringify(br));
await __shot('kitchen-recycle-bin');
const hitOn=i=>{const b=i.picture.rect;for(let y=b.y+2;y<b.y+b.h-2;y+=2)for(let x=b.x+2;x<b.x+b.w-2;x+=2)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};
let promptSeen=null;
async function dragIn(id){
 const i=keepsakes.get(id),a=hitOn(i);if(!a)return 'no grip point';const b=R.bin.picture.rect,t={x:b.x+b.w/2,y:b.y+b.h*.25},pid=++pointerIds;
 const up=Math.min(a.y,t.y)-110,path=[{x:a.x,y:up},{x:t.x,y:up},t];let from=a;fire('pointerdown',a.x,a.y,pid);
 for(const to of path){for(let k=1;k<=8;k++){await sleep(30);fire('pointermove',from.x+(to.x-from.x)*k/8,from.y+(to.y-from.y)*k/8,pid);}from=to;}await sleep(250);
 const p=R.prompt?.getBoundingClientRect();promptSeen=p&&{covers:p.x<=b.x+2&&p.x+p.width>=b.x+b.w-2&&p.y<=b.y+2&&p.y+p.height>=b.y+b.h-2,text:R.prompt.textContent,look:R.prompt.classList.contains('support-preview')&&getComputedStyle(R.prompt).borderTopStyle==='dashed'};
 if(id==='crumbs')await __shot('kitchen-recycle-prompt');
 fire('pointerup',t.x,t.y,pid,0);
 await until(()=>!keepsakes.has(id),3000);return keepsakes.has(id)?'still here':'in';
}
const crumbs=await dragIn('crumbs');
check('recycle over the bin, a "Release to recycle" prompt covers the whole bin, in the furniture\'s drop outline',promptSeen?.covers&&promptSeen.look&&promptSeen.text==='Release to recycle',JSON.stringify(promptSeen));
check('recycle dragging the crumbs over the bin puts them in, for the GOOD JOB star',crumbs==='in'&&R.count===1&&!R.prompt&&await until(()=>keepsakes.has('goodjob'),3000)&&said.includes('good job.'),crumbs);
check('recycle with nothing left to recycle the bin slides away',await until(()=>!R.bin,8000)&&!R.state.gone);
await fast(8,()=>E.glass.show());await keepsakes.get('shards').worldTask;
check('recycle the broken glass brings it back',await until(()=>R.armed,8000));await until(()=>!W.stats.listening,12000);await sleep(200);
const shards=await dragIn('shards');
check('recycle the glass goes in: GREAT JOB!',shards==='in'&&R.count===2&&await until(()=>keepsakes.has('goodjob-2'),3000)&&said.includes('GREAT JOB!'),shards);
// Three to six: each given and put in by its keyboard button.
for(const n of [3,4,5,6]){
 const id=n%2?'crumbs':'shards';keepsakes.give(id);await keepsakes.get(id).worldTask;await until(()=>R.armed,8000);
 keepsakes.get(id).key.querySelector('.recycle-key').click();await until(()=>R.count===n,4000);
}
await sleep(900);
const stars=['goodjob','goodjob-2','goodjob-3','goodjob-4','goodjob-5','goodjob-6'];
check('recycle six in, six stars: THANK YOU! then WOW three times',R.count===6&&stars.every(id=>keepsakes.get(id)?.el.closest('#stickers'))&&['THANK YOU!','WOW'].every(t=>said.includes(t))&&said.filter(t=>t==='WOW').length===3,said.join(' | '));
const rects=stars.map(id=>keepsakes.get(id).el.getBoundingClientRect());
check('recycle the stars are on the screen and do not pile on one another',rects.every(r=>r.x>=0&&r.y>=0&&r.right<=stage.width&&r.bottom<=stage.height)&&rects.every((a,i)=>rects.every((b,j)=>i===j||Math.hypot(a.x-b.x,a.y-b.y)>a.width*.5)),JSON.stringify(rects.map(r=>[r.x|0,r.y|0,r.width|0])));
check('recycle the sixth earns Clean Sweep',site.achievements.has('recycle'));
check('recycle after six the bin leaves for good',await until(()=>!R.bin,8000)&&R.state.gone&&R.done);
keepsakes.give('crumbs');await sleep(100);
check('recycle after six no more crumbs come',!keepsakes.has('crumbs'));
await fast(8,()=>E.glass.show());
check('recycle after six the glass leaves no more shards',!keepsakes.has('shards')&&keepsakes.has('puddle'));
await sleep(500);await __shot('kitchen-recycle-six');
store.flush();
