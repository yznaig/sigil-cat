cat.auto=false;await sleep(700);
const pet=E.petbite,m=catMid();
let p;
for(const dy of [0,24,-24,48,-48])if(cat.hitTest(m.x,m.y+dy)&&!E.harp.whiskerAt(m.x,m.y+dy)){p={x:m.x,y:m.y+dy};break;}
if(!p)throw Error('No body target for seven pet passes');
let moves=0;cat.onDrag.push(kind=>{if(kind==='move')moves++;});
let id=++pointerIds,y=p.y;
fire('pointerdown',p.x,y,id);
const passes=[];
for(let pass=0;pass<7;pass++){
 // Three passes in one press, then a fresh press continuing in the SAME direction.
 // This verifies both direction-change and new-press rearming.
 if(pass===3){fire('pointerup',p.x,y,id,0);id=++pointerIds;fire('pointerdown',p.x,y,id);}
 const direction=pass<3?(pass%2?-1:1):(pass%2?1:-1);
 for(let step=0;step<12;step++){y+=direction*5;await sleep(8);fire('pointermove',p.x,y,id);}
 passes.push({strokes:pet.strokes,bites:pet.bites});
}
fire('pointerup',p.x,y,id,0);
check('look seven real pet passes bite only on seventh',moves===84&&passes.every((p,i)=>p.strokes===i+1&&p.bites===(i===6?1:0)),JSON.stringify(passes));
