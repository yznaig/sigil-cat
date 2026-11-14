// Box-open stray pictures (2026-11-13; Aaron's playtest-3 img10: "I'm opening the cardboard box ... it's putting these
// textures around the bucket and the flour"). The box's screen box was the shut box's for good (its lid's points are
// swapped in place as it swings; the atlas read them once), so the swinging and open lid fell outside its own atlas
// tile and was painted into whatever lay past it: a neighbour's cached picture, kept until that neighbour next moved.
// In a full room: open and shut the box by tapping it, twice, and at every frame of each swing
//  1. the box's screen box holds all of its art (the lid shows, not cut off), and
//  2. the atlas changes only inside the tiles of the pictures drawn in that frame: nothing is painted outside them.
// Run with checks/lib.js.
cat.auto=false;
const C=E.box.recipe,W=site.world,S=C.screen,T=site.THREE,A=site.meshPictures,R=stage.renderer;
const hitOn=i=>{const b=i.picture.rect;for(let y=Math.max(b.y+4,stage.insets.top);y<Math.min(b.y+b.h-4,stage.height-stage.insets.bottom);y+=3)for(let x=Math.max(4,b.x+4);x<Math.min(stage.width-4,b.x+b.w-4);x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};
const rest=()=>until(()=>!W.stats.listening,15000);
// ---- a room like Aaron's: flour, the pail, an egg, butter, stickers, the recipe card, broken glass, the rack ----
for(const k of ['bread','cup']){C.source(k);C.source(k);}
for(const id of ['twinkle','goodjob','postcard','puddle','shards','box','rack','tin','flour','bucket','recipe-flour'])keepsakes.give(id);
await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));C.state.intro=true;
await cat.ensureButter();cat.setButter(true);await keepsakes.get('pat')?.worldTask;
await C.dropEgg({x:stage.width*.62,y:stage.height*.3});
await rest();await sleep(500);
const box=keepsakes.get('box');
// 1. the box's art, every mesh point, against its picture's screen box (2 px of slack)
const v=new T.Vector3(),sp={};
function overflow(){
 box.solidArt.updateWorldMatrix(true,true);let x=1e9,y=1e9,r=-1e9,b=-1e9;
 box.solidArt.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let n=0;n<a.count;n++){v.fromBufferAttribute(a,n).applyMatrix4(o.matrixWorld);stage.toScreen(v,sp);if(sp.x<x)x=sp.x;if(sp.y<y)y=sp.y;if(sp.x>r)r=sp.x;if(sp.y>b)b=sp.y;}});
 const q=box.picture.rect;return Math.max(0,q.x-x,q.y-y,r-(q.x+q.w),b-(q.y+q.h));
}
// 2. the atlas read back each frame; a pixel that changed outside every tile drawn since the last read is a stray
// (the atlas pushes each tile it draws into to A.trace while a check has set it)
const owner=p=>[...keepsakes.live.values()].find(i=>i.picture===p)?.id||'?';
let prev=null;
function readAtlas(){const t=A.target,px=new Uint8Array(t.width*t.height*4);R.readRenderTargetPixels(t,0,0,t.width,t.height,px);return {w:t.width,h:t.height,px};}
function strays(){
 const now=readAtlas(),drawn=A.trace||[];A.trace=[];
 let n=0,where=null;
 if(prev&&prev.w===now.w&&prev.h===now.h){
  for(let y=0;y<now.h;y++)for(let x=0;x<now.w;x++){
   const k=(y*now.w+x)*4;if(now.px[k]===prev.px[k]&&now.px[k+1]===prev.px[k+1]&&now.px[k+2]===prev.px[k+2]&&now.px[k+3]===prev.px[k+3])continue;
   if(drawn.some(t=>x>=t[0]&&x<t[2]&&y>=t[1]&&y<t[3]))continue;
   n++;where??={x,y,inside:A.list.filter(p=>p.region&&x>=p.region.x&&x<p.region.x+p.renderWidth&&y>=p.region.y&&y<p.region.y+p.renderHeight).map(owner)};
  }
 }
 prev=now;return {n,where};
}
async function swing(open,label){
 A.trace=[];let worst=0,stray=0,first=null,frames=0,on=true;strays();
 const sample=()=>{if(!on)return;frames++;worst=Math.max(worst,overflow());const s=strays();stray+=s.n;if(s.n&&!first)first={frame:frames,...s.where};requestAnimationFrame(sample);};requestAnimationFrame(sample);
 if(open){const p=hitOn(box);if(p)await tap(p.x,p.y);await until(()=>S.isOpen,4000);}
 else{await __key('Escape');await until(()=>!S.isOpen,2000);}
 await until(()=>!E.box.lidMoving&&box.hinge.rotation.x===(open?-Math.PI:0),3000);await sleep(300);on=false;await sleep(50);A.trace=null;
 check(`box ${label}: the lid stays inside the box's own picture`,worst<=2,`art past the screen box by up to ${worst.toFixed(1)} px over ${frames} frames`);
 check(`box ${label}: nothing is painted outside the drawn pictures' tiles`,stray===0,`${stray} stray atlas pixels${first?', first '+JSON.stringify(first):''}`);
}
await __shot('box-open-tiles-before');
for(const round of [1,2]){
 await swing(true,`opens (${round})`);if(round===1)await __shot('box-open-tiles-open');
 await swing(false,`shuts (${round})`);await rest();
}
await sleep(400);await __shot('box-open-tiles-after');
