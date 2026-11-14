// Visual lane (playtest-3): "the items seem to be getting these strange border lines" (Aaron, img2 and img6).
// Every item, at rest and drawn lighter as while moving, has its picture's border scanned on the real canvas: the
// screen pixels along the card's edge (its outer 2 px; every picture keeps a 4-5 px empty margin round
// its item) are read with the card shown and with it hidden. Anything the card adds there is a line the item does not
// have. A third read with it shown again measures the frame's own noise (a pixel that changes anyway is not counted).
// A line is 3 or more such pixels on one card (a hairline runs along the edge; before the fix they were 4 to 500 a card),
// and one or two stray pixels are not counted (seen once in six runs after the fix, at dpr 1.5: 1 px of 21 levels).
// Run at desktop dpr 1 and at phone (844x390, dpr 2); `?motion=0.6` makes the "moving" draws lighter at check sizes.
const {collectFinal}=await import('/checks/world-final-collection.mjs');
const {worldPresentation}=await import('/src/core/world-presentation.js');
const W=site.world,T=site.THREE,gl=stage.renderer.getContext(),P=worldPresentation(site);
const frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
const items=await collectFinal(site,{cake:false});
await until(()=>!W.stats.listening&&!site.supports.listening,20000);await frames(10);
// the items spread over the floor, the board, the shelf and the rack, as collectFinal leaves them
const names=new Map();for(const e of W.entries.values())if(e.presentation?.card)names.set(e.presentation.card,e.id);
for(const k of ['shelf','rack','board','pinboard','lamp'])if(site[k]?.picture?.card)names.set(site[k].picture.card,k);
const corner=new T.Vector3(),scr={};
function box(p){p.quad.updateWorldMatrix(true,false);let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const [a,b] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]]){stage.toScreen(corner.set(a,b,0).applyMatrix4(p.quad.matrixWorld),scr);x0=Math.min(x0,scr.x);y0=Math.min(y0,scr.y);x1=Math.max(x1,scr.x);y1=Math.max(y1,scr.y);}
 return {x0,y0,x1,y1};}
// the drawing buffer inside a page rect, read once the frame is presented
async function grab(r){let out=null;const d=stage.dpr,H=gl.drawingBufferHeight,X=Math.max(0,Math.floor(r.x0*d)),Y=Math.max(0,Math.floor(r.y0*d)),X1=Math.min(gl.drawingBufferWidth,Math.ceil(r.x1*d)),Y1=Math.min(H,Math.ceil(r.y1*d));
 const w=X1-X,h=Y1-Y;if(w<=0||h<=0)return null;
 const f=()=>{const px=new Uint8Array(w*h*4);gl.readPixels(X,H-Y1,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);out={X,Y,w,h,px};};
 stage.onPresented.push(f);await until(()=>out,3000,5);stage.onPresented.splice(stage.onPresented.indexOf(f),1);return out;}
async function scan(p){
 const b=box(p),d=stage.dpr,pad=3;if(b.x1<0||b.y1<stage.insets.top||b.x0>stage.width||b.y0>stage.height)return null;
 const r={x0:b.x0-pad,y0:b.y0-pad,x1:b.x1+pad,y1:b.y1+pad};
 await frames(2);const A=await grab(r);p.card.visible=false;await frames(2);const B=await grab(r);p.card.visible=true;await frames(2);const C=await grab(r);
 if(!A||!B||!C)return null;
 let lines=0,worst=0,at=null;
 for(let j=0;j<A.h;j++)for(let i=0;i<A.w;i++){
  // page position of this device pixel's centre, row 0 = the top of the read rect (readPixels rows run bottom-up)
  const x=(A.X+i+.5)/d,y=(A.Y+(A.h-1-j)+.5)/d;
  // the band: pixels whose centre is on the card, within 2 px of its edge (outside it the card draws nothing; a change
  // there is only the batch's order shifting under the scan)
  const edge=Math.min(x-b.x0,b.x1-x,y-b.y0,b.y1-y);if(edge<0||edge>2)continue;
  const k=(j*A.w+i)*4;let dab=0,dac=0;for(let c=0;c<3;c++){dab=Math.max(dab,Math.abs(A.px[k+c]-B.px[k+c]));dac=Math.max(dac,Math.abs(A.px[k+c]-C.px[k+c]));}
  if(dac<=3&&dab>12){lines++;if(dab>worst){worst=dab;at=[Math.round(x),Math.round(y)];}}
 }
 return {lines,worst,at,box:[b.x0,b.y0,b.x1,b.y1].map(Math.round)};}
async function pass(label){
 const found={};
 for(const p of P.list){if(p.depthMode==='none'||!p.card.visible||!p.quad.material.visible)continue;const id=names.get(p.card)||'picture';const s=await scan(p);if(s&&s.lines>=3)found[id+(found[id]?'+':'')]=s;}
 return found;}
await __shot('visual-hairlines-rest');
const rest=await pass('rest');
check('visual hairlines: no picture adds a line along its border at rest',!Object.keys(rest).length,JSON.stringify(rest));
// After play: each item has been carried near the lens and back (its picture drawn far bigger, then its own size; the
// atlas grows and re-packs on the way), as a long session leaves them.
{const cam=stage.camera.position,keep=new T.Vector3(),q=new T.Quaternion(),turn=new T.Quaternion().setFromEuler(new T.Euler(.4,.9,.2));
 for(const e of W.entries.values()){const p=e.presentation,o=e.object;if(!p?.draw||!p.card?.visible||e.support)continue;
  keep.copy(o.position);q.copy(o.quaternion);o.position.lerp(cam,.45);o.quaternion.multiply(turn);o.updateMatrixWorld(true);p.invalidate();p.draw(true);await frames(1);
  o.position.copy(keep);o.quaternion.copy(q);o.updateMatrixWorld(true);p.invalidate();p.draw(true);}
 await frames(4);await __shot('visual-hairlines-after-play');
 const after=await pass('after play');
 check('visual hairlines: none after each item was carried near the lens and back',!Object.keys(after).length,JSON.stringify(after));}
// "while moving": each body's picture drawn at the moving scale (what a tumbling frame draws), held there for the scan
const lighter=[];for(const e of W.entries.values()){const p=e.presentation;if(!p||!('precise' in p)||!p.card?.visible)continue;p.precise=false;p.invalidate();p.draw(true);lighter.push(p);}
await frames(3);await __shot('visual-hairlines-moving');
const moving=await pass('moving');
check('visual hairlines: no picture adds a line along its border drawn at the moving scale',!Object.keys(moving).length,JSON.stringify(moving));
for(const p of lighter){p.precise=true;p.invalidate();p.draw(true);}
__done();
