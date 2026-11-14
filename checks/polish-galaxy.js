// World polish lane (e1111-58, item 1; the black hole itself went in playtest 2): deep-space background near black,
// and the dark fully opaque over the page (pinboard, shelf, props, furniture buttons). Run with checks/lib.js.
// Pixels are read straight after the frame is drawn (stage.onPresented), with the stage clock stopped so two frames
// differ only in what is under the overlay.
cat.auto=false;
const {collectFinal}=await import('/checks/world-final-collection.mjs');
await collectFinal(site,{cake:false});
await until(()=>!site.world.stats.listening&&!site.supports.listening,20000);
const g=E.galaxy,U=g.uniforms,overlay=stage.scene.getObjectByName('galaxy'),gl=stage.renderer.getContext();
const furniture=[...document.querySelectorAll('.world-furniture-actions')].filter(el=>!el.hidden);
const before=furniture.map(el=>el.getAttribute('style'));
async function grab(){
 let out=null;const f=()=>{const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);out={w,h,px};};
 stage.onPresented.push(f);await until(()=>out,3000,10);stage.onPresented.splice(stage.onPresented.indexOf(f),1);return out;
}
const lum=(px,i)=>.2126*px[i]+.7152*px[i+1]+.0722*px[i+2];
g.open('check');
await until(()=>g.phase==='hold',15000);await sleep(200);
await __shot('polish-galaxy-hold');
stage.timeScale=0;await sleep(150);
const A=await grab();
// the page under the overlay: everything but the cat and the overlay goes
const keep=o=>o===overlay||o===stage.scene||o.isLight||o===cat.card||o===cat.spin||!!cat.card.getObjectById(o.id)||!!cat.spin.getObjectById(o.id);
const hidden=[];for(const o of stage.scene.children)if(o.visible&&!keep(o)){hidden.push(o);o.visible=false;}
await sleep(150);const B=await grab();
for(const o of hidden)o.visible=true;
const r=cat.rect,d=stage.dpr;let worst=0,count=0;
for(let y=0;y<A.h;y+=2)for(let x=0;x<A.w;x+=2){
 const sx=x/d,sy=(A.h-y)/d;if(sx>=r.x-4&&sx<=r.x+r.w+4&&sy>=r.y-4&&sy<=r.y+r.h+4)continue;
 const i=(y*A.w+x)*4,diff=Math.max(Math.abs(A.px[i]-B.px[i]),Math.abs(A.px[i+1]-B.px[i+1]),Math.abs(A.px[i+2]-B.px[i+2]));
 worst=Math.max(worst,diff);if(diff>2)count++;
}
check('galaxy dark is opaque over the whole collection',worst<=2&&U.uDark.value===1,`largest change from removing every prop, shelf, board and shadow: ${worst}/255 (${count} pixels over 2)`);
const opacities=furniture.map(el=>+getComputedStyle(el).opacity);
// The furniture button rows were removed (e1111-34, sc/arrive); whatever action row remains still falls in.
check('galaxy furniture action rows fall in with the page chrome',opacities.every(o=>o<.03),JSON.stringify(opacities));
// deep space: the screen's corners (outside the disk) are near black and colourless
const corner=[];const cw=Math.round(A.w*.12),ch=Math.round(A.h*.14);
for(const [x0,y0]of [[0,0],[A.w-cw,0],[0,A.h-ch],[A.w-cw,A.h-ch]])for(let y=y0;y<y0+ch;y+=2)for(let x=x0;x<x0+cw;x+=2){const i=(y*A.w+x)*4;corner.push([A.px[i],A.px[i+1],A.px[i+2]]);}
const median=c=>corner.map(p=>p[c]).sort((a,b)=>a-b)[corner.length>>1],m=[0,1,2].map(median);
check('galaxy background is deep space: near black, not purple',Math.max(...m)<=10&&Math.max(...m)-Math.min(...m)<=4,`corner median rgb ${m}`);
// (The accretion disk and the black hole's centring were checked here; playtest 2 removed the black hole.)
check('galaxy has no black hole left to draw',!/hBlackHole|uHoleBH/.test(overlay.material.fragmentShader));
stage.timeScale=1;
g.skip();                                  // it holds until a click now (playtest 2)
await until(()=>!g.isOpen,15000);
check('galaxy restores the furniture buttons',!g.isOpen&&!input.locked&&furniture.every((el,i)=>el.getAttribute('style')===before[i]));
