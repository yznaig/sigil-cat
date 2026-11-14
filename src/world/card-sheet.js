// The page a card opens when it is read. Playtest 3 (Aaron): "These pages dont need any buttons on them. they just
// need an (x) button to close or/and the ability to just click off to the side of the open page to close out of it",
// and "Only the physics paper and the cake recipe paper actually need to open up to a page like this". So only the
// rejected paper (src/gags/paradox.js) and the recipe card (src/world/recipes.js) open one; the postcard flips in place
// and the ticket wiggles (src/world/cards.js). The 3D card reader (FRONT / BACK / EDGE, LIFT / PIN, PUT IT DOWN) is gone.
// The page has one small round (x) on its top right corner, nothing else; Escape or a click outside closes it too
// (e1112-41); focus goes back where it was.
//   cardSheet(site, {className, sheetClass, label, html}) -> {host, close, open}
import {css} from '../core/util.js';
css('card-sheet',`
.card-sheet{position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:rgba(43,39,36,.35);padding:20px;text-transform:none;letter-spacing:normal;font-stretch:normal}
.card-sheet .sheet-frame{position:relative;display:flex;flex-direction:column;max-height:100%;width:min(var(--sheet-width,520px),100%)}
.card-sheet .sheet-frame>.page{flex:0 1 auto;min-height:0;width:100%;box-sizing:border-box}
.card-sheet .sheet-x{position:absolute;top:-11px;right:-11px;z-index:1;width:30px;height:30px;padding:0;display:grid;place-items:center;color:#2b2724;cursor:pointer}
.card-sheet .sheet-x::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;translate:-50% -50%}
.card-sheet .sheet-x svg{width:12px;height:12px;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;fill:none}
.card-sheet .sheet-x:focus{outline:none}.card-sheet .sheet-x:focus-visible{outline:2px solid #2b2724;outline-offset:3px}
`);
// The recipe card's own page: an index card (playtest 2: "single clicking the cake recipe should open it up the same
// way the rotational equilibrium paper gets opened up").
css('recipe-sheet',`
.recipe-read{--sheet-width:560px}
.recipe-read .index-card{position:relative;overflow:auto;rotate:1deg;background:#f7f2e4;color:#26305a;box-shadow:0 12px 30px rgba(40,28,16,.4);padding:22px 30px 26px;font:italic 1.25rem/2.2rem Georgia,serif;
 background-image:linear-gradient(transparent 0,transparent calc(2.2rem - 1px),rgba(84,128,186,.42) calc(2.2rem - 1px),rgba(84,128,186,.42) 2.2rem);background-size:100% 2.2rem;background-position:0 .9rem}
.recipe-read header{display:flex;align-items:baseline;gap:18px;flex-wrap:wrap;border-bottom:2px solid #b8473b;background:#f7f2e4;margin:-22px -30px 0;padding:22px 30px 8px}
.recipe-read .kind{font:700 .95rem/1 Georgia,serif;font-style:normal;letter-spacing:.2em;color:#b8473b}
.recipe-read h2{font:italic 700 1.9rem/1.1 Georgia,serif;margin:0;color:#26305a}
.recipe-read .from{width:100%;font-size:.95rem;line-height:1.4;color:#b8473b;margin:0}.recipe-read .from b{color:#26305a;font-weight:400;font-size:1.15rem}
.recipe-read .cols{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:0 18px;margin-top:.9rem}
.recipe-read ul,.recipe-read ol{margin:0;padding:0 0 0 1.2em}.recipe-read li{margin:0}
.recipe-read .serves{text-align:right;rotate:-2deg;font-size:1.05rem;color:rgba(38,48,90,.75);margin:.4rem 0 0}
@media(max-height:500px){.recipe-read .index-card{font-size:1.05rem;line-height:1.8rem;background-size:100% 1.8rem}}
`);
const X='<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg>';
export function cardSheet(site,{className,sheetClass='index-card',label,html}){
 const previous=document.activeElement,host=document.createElement('div');host.className='card-sheet '+className;
 host.innerHTML=`<div class="sheet-frame" role="dialog" aria-modal="true"><div class="page ${sheetClass}">${html}</div><button type="button" class="felt sheet-x" aria-label="Close">${X}</button></div>`;
 const frame=host.firstElementChild,x=frame.querySelector('.sheet-x');frame.setAttribute('aria-label',label);
 let open=true;const close=()=>{if(!open)return;open=false;host.remove();removeEventListener('keydown',onKey,true);previous?.focus?.({preventScroll:true});};
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();close();}else if(e.key==='Tab'){e.preventDefault();x.focus({preventScroll:true});}};   // the (x) is its one control
 // A click outside closes it only when its press began outside too: the touch that opened it ends in a click right
 // where the card was, which is often beside the page (a pinned card on a phone), and must not close it again.
 let outside=false;host.addEventListener('pointerdown',e=>{outside=e.target===host;});
 host.addEventListener('mousedown',e=>{if(e.target===host)e.preventDefault();});   // a press outside keeps focus on the (x)
 host.addEventListener('click',e=>{if((e.target===host&&outside)||e.target.closest('.sheet-x'))close();outside=false;});addEventListener('keydown',onKey,true);
 document.body.appendChild(host);x.focus({preventScroll:true});site.audio.play('paper',{gain:.5});
 return {host,close,get open(){return open;}};
}
