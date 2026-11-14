cat.auto=false;
const pet=E.petbite;
check('look permanent plaster survives reload',pet.plastered&&store.get('plaster')===true&&getComputedStyle(canvas).cursor.includes('data:image/svg+xml')&&(!MOBILE||(document.querySelector('.touch-plaster')&&getComputedStyle(document.querySelector('.touch-plaster')).display!=='none')),`saved ${store.get('plaster')}, cursor ${pet.plastered}`);
const before=pet.bites, count=pet.strokes;
// Actual pointer strokes, at a verified body target clear of whiskers.
const m=catMid(), id=++pointerIds;
let point=null;
for(const dy of [24,0,-24,48,-48])if(cat.hitTest(m.x,m.y+dy)&&!E.harp.whiskerAt(m.x,m.y+dy)){point={x:m.x,y:m.y+dy};break;}
let peak=0;
if(point){fire('pointerdown',point.x,point.y,id);for(let i=0;i<24;i++){await sleep(25);fire('pointermove',point.x,point.y+(i%2?0:18),id);peak=Math.max(peak,pet.purr);}fire('pointerup',point.x,point.y,id,0);}
check('look bitten cat refuses strokes after reload',!!point&&pet.strokes>count&&peak===0&&pet.bites===before,`attempted ${pet.strokes-count}, purr ${peak}, bites ${pet.bites-before}`);
const tin=keepsakes.get('tin');tin?.def.tap(tin);
check('look tin cannot remove permanent plaster',!!tin&&pet.plastered&&store.get('plaster')===true);
await __shot('look-bite-permanent');
