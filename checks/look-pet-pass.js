// Exercise the real input route with many small move events, not pet.stroke().
cat.auto=false;await sleep(700);
const pet=E.petbite, m=catMid();
let p;
// The long pass is 300 px, or as long as the page allows below his body: a phone on its side (844x390, shell lane,
// playtest 2) has no room for 300 px below him. At least 140 px (ten times PET.stroke) so a pass that counted more than
// once would show.
const room=y=>Math.min(300,Math.floor((stage.height-8-y)/5)*5);
for(const dy of [-24,0,24,-48,48])if(cat.hitTest(m.x,m.y+dy)&&!E.harp.whiskerAt(m.x,m.y+dy)&&room(m.y+dy)>=140){p={x:m.x,y:m.y+dy};break;}
if(!p)throw Error('No body target for a long downward pass');
const L=room(p.y);
let moves=0;
const observed=(kind)=>{if(kind==='move')moves++;};cat.onDrag.push(observed);
let id=++pointerIds;
fire('pointerdown',p.x,p.y,id);
for(let i=0;i<10;i++){await sleep(12);fire('pointermove',p.x,p.y+(i%2?0:13),id);}
fire('pointerup',p.x,p.y,id,0);
check('look sub-threshold pet wiggles count nothing',moves===10&&pet.strokes===0&&pet.bites===0&&pet.purr===0,`${moves} routed moves, ${pet.strokes} strokes, ${pet.bites} bites`);
id=++pointerIds;fire('pointerdown',p.x,p.y,id);
for(let y=5;y<=L;y+=5){await sleep(8);fire('pointermove',p.x,p.y+y,id);}
fire('pointerup',p.x,p.y+L,id,0);
check('look one long pet pass counts once without biting',moves===10+L/5&&pet.strokes===1&&pet.bites===0,`${L} px pass, ${moves-10} routed moves, ${pet.strokes} strokes, ${pet.bites} bites`);
// Start the independent seven-pass check after reload with a fresh save, including on the original bug.
store.reset();store.flush();
