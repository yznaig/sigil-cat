// physics-p3-reload.js: after checks/physics-p3.js. The googly eyes left on the Platinum Cat badge, pinned to the board,
// are still on its cat after a reload, and show (playtest-3, physics lane item 1: "they entirely despawn when I try to
// place them on the platinum cat").
cat.auto=false;const T=site.THREE;
await until(()=>keepsakes.get('eyes')?.worldReady&&keepsakes.get('platinum')?.worldReady&&site.pinboard.ready,20000);await sleep(1500);
const eyes=keepsakes.get('eyes'),badge=keepsakes.get('platinum');
const gl=stage.renderer.getContext();
// the page's pixels in a rect (device pixels), read right after a frame is presented
async function pixels(r){let out=null;const f=()=>{const d=stage.dpr,x=Math.max(0,Math.round(r.x*d)),w=Math.round(r.w*d),h=Math.round(r.h*d),y=gl.drawingBufferHeight-Math.round((r.y+r.h)*d),px=new Uint8Array(w*h*4);gl.readPixels(x,y,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);out=px;};
 stage.onPresented.push(f);cat.touch();await until(()=>out!==null,3000,10);stage.onPresented.splice(stage.onPresented.indexOf(f),1);return out;}
// the share of a rect's pixels that differ clearly between two reads (the eyes drawn there, or not)
const changed=(a,b)=>{let n=0;for(let k=0;k<a.length;k+=4)if(Math.abs(a[k]-b[k])+Math.abs(a[k+1]-b[k+1])+Math.abs(a[k+2]-b[k+2])>60)n++;return n/(a.length/4);};
// the same rect with the eyes not drawn (their art hidden, every picture redrawn), then drawn again
async function withoutEyes(r){
 const i=keepsakes.get('eyes'),b=keepsakes.get('platinum'),redraw=()=>{for(const p of [i.picture,b?.picture])if(p){p.invalidate();p.draw();}};
 i.smallArt.visible=false;redraw();await sleep(100);const px=await pixels(r);i.smallArt.visible=true;redraw();await sleep(100);return px;
}
const a=stage.toScreen(badge.object.localToWorld(new T.Vector3(...badge.eyesAnchor()))),p=stage.toScreen(eyes.object.position),r={...eyes.picture.rect};
const on=badge.worldEntry.support?.id==='platinum-cover'&&eyes.state.on==='platinum'&&eyes.worldEntry.support?.id==='eyes-host-platinum'&&eyes.picture.attached,px=await pixels(r);
await __shot('p3-eyes-reload');
const diff=changed(px,await withoutEyes(r));
check('1 reload: the eyes are still on the badge\'s cat, on the board, and show',on&&Math.hypot(a.x-p.x,a.y-p.y)<2&&diff>=.1,JSON.stringify({on,changed:diff,a,p}));
