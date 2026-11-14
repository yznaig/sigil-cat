// Gags lane, playtest 2 (item 5): stickers are flat 2D stickers in a layer above the room. One can be dragged
// anywhere on the screen, even over the cat or the pinboard, and picked up again from there; its place is saved as a
// fraction of the screen; a tap tilts it in 3D with a tink. --then gags-stickers-reload.js: it stays put.
cat.auto=false;
const star=keepsakes.give('twinkle',{at:keepsakes.toUnits(stage.width*.3,stage.height*.3)}),el=star.el;await sleep(700);
const mid=()=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width};};
check('the star is a sticker in the top layer, over the room',el.closest('#stickers')&&getComputedStyle(document.getElementById('stickers')).zIndex>getComputedStyle(stage.canvas).zIndex&&el.querySelector('canvas').width>0);
const a=mid();check('it is where it was given',Math.abs(a.x-stage.width*.3)<3&&Math.abs(a.y-stage.height*.3)<3,JSON.stringify(a));
// Drag it (real input) onto the middle of the cat.
const c=cat.screenOf([0,cat.height*.5,0]);
await __pointer(Array.from({length:12},(_,i)=>({x:a.x+(c.x-a.x)*i/11,y:a.y+(c.y-a.y)*i/11})));await sleep(200);
const b=mid();
check('dragged onto the cat, it sits on top of him',Math.hypot(b.x-c.x,b.y-c.y)<4&&document.elementFromPoint(c.x,c.y)?.closest('.sticker')===el,JSON.stringify({b,c}));
await __shot('gags-sticker-on-cat');
// And it can be picked up from there and put anywhere, even the top right corner.
const to={x:stage.width-10,y:12};
await __pointer(Array.from({length:12},(_,i)=>({x:b.x+(to.x-b.x)*i/11,y:b.y+(to.y-b.y)*i/11})));await sleep(200);
const d=mid(),r=el.getBoundingClientRect();
check('picked up again from on top of him and taken to the corner, it stays whole on the screen',r.right<=stage.width+.5&&r.top>=-.5&&d.x>stage.width-80&&d.y<80,JSON.stringify(r));
const f=star.state.f;check('its place is saved as a fraction of the screen',Math.abs(f[0]-d.x/stage.width)<.002&&Math.abs(f[1]-d.y/stage.height)<.002,JSON.stringify(f));
// A tap: the tilt toward you and a tink.
const tinks0=audio.diagnostics?.().clips;el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:91,clientX:d.x,clientY:d.y,bubbles:true,button:0,buttons:1,pointerType:'mouse'}));
el.dispatchEvent(new PointerEvent('pointerup',{pointerId:91,clientX:d.x,clientY:d.y,bubbles:true,button:0,pointerType:'mouse'}));await sleep(200);
check('a tap tilts it in 3D (unless motion is reduced)',stage.reducedMotion||el.querySelector('.face').getAnimations().length===1);
await __shot('gags-sticker-tilt');
// A smaller screen: the same fraction.
// Layout coordinates (a phone's emulated zoom scales client rects after a resize).
// A phone plays on its side only (shell lane, playtest-2): held upright the page freezes under "flip sideways", so
// the phone's other screen is a smaller phone on its side (fix round B), and the way back is the phone's own 844x390.
await (MOBILE?__resize(740,360):__resize(900,640));   // a smaller phone on its side, or a smaller window
await sleep(500);const e={x:parseFloat(el.style.left)+parseFloat(el.style.width)/2,y:parseFloat(el.style.top)+parseFloat(el.style.height)/2};
const half=parseFloat(el.style.width)/2*1.08+4,want={x:Math.max(half,Math.min(stage.width-half,f[0]*stage.width)),y:Math.max(half,Math.min(stage.height-half,f[1]*stage.height))};
check('on another screen size it keeps its place (as a fraction, kept whole on the screen)',Math.abs(e.x-want.x)<1&&Math.abs(e.y-want.y)<1,JSON.stringify({e,f,w:stage.width,h:stage.height}));
await __resize(MOBILE?844:1280,MOBILE?390:900);await sleep(400);
// Put back somewhere ordinary for the reload.
place:{const p=mid();await __pointer(Array.from({length:8},(_,i)=>({x:p.x+(stage.width*.62-p.x)*i/7,y:p.y+(stage.height*.25-p.y)*i/7})));}
await sleep(300);store.set('stickerCheck',{f:star.state.f});store.flush();
