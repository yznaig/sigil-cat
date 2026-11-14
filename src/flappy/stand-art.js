// The controller stand's art and shape (layout lane, playtest-3; Aaron, e1113-08: "the controller stand should also be
// a bit more stylish"; the design approved from the mock-up on sc/p3-mock, e1113-30). Units: the art's own (the
// controller .55 wide); the stand draws it at STAND.scale (src/flappy/stand.js). y up, +z toward the room.
// A walnut plinth with rounded ends; on it two maple cheeks, each a swept fin in profile (a lip in front for the
// controller's lower edge, a long back edge at its display angle, a rounded crest above it), joined by turned walnut
// dowels with round ends: the front lip, two behind the controller (its rest), a rail along the crests.
export const PLINTH={w:.72,d:.32,r:.08,h:.03};
// A cheek's profile, [z, y]: the front lip, a dip, the long edge along the controller's back, the crest, the back.
export const FIN=[[.14,.03],[.15,.07],[.135,.096],[.11,.088],[.085,.062],[.05,.07],[.003,.117],[-.083,.24],[-.157,.347],[-.185,.388],[-.214,.375],
 [-.212,.31],[-.193,.2],[-.172,.1],[-.162,.03],[-.05,.026],[.05,.026]];
export const CHEEK={x:.29,t:.03};
// [z, y, radius] of each dowel; each runs between the cheeks, .6 long, with a round knob at either end. The front lip
// and the two rests are where the controller touches (src/flappy/stand.js STAND.slot): its lower edge against the lip,
// its grips on the low rest, its triggers on the high one (its back is hollow between them, as a real one's is).
export const DOWELS=[[.1088,.0787,.013],[.006,.0613,.012],[-.1466,.3084,.012],[-.192,.37,.016]];
export const DOWEL={length:.6,knobX:.31,knob:1.25};
export function stylishStand(T,{mat},forPicture){
 const g=new T.Group(),walnut=mat('#563725',.45,0,'wood'),maple=mat('#9a6b45',.42,0,'wood');
 for(const m of [walnut,maple]){m.map.center.set(.5,.5);m.map.rotation=Math.PI/2;forPicture(m);}
 // Plinth: a rounded slab, its edges eased.
 const {w:W,d:D,r:R,h:H}=PLINTH,s=new T.Shape();
 s.moveTo(-W/2+R,-D/2);s.lineTo(W/2-R,-D/2);s.absarc(W/2-R,-D/2+R,R,-Math.PI/2,0);s.lineTo(W/2,D/2-R);s.absarc(W/2-R,D/2-R,R,0,Math.PI/2);
 s.lineTo(-W/2+R,D/2);s.absarc(-W/2+R,D/2-R,R,Math.PI/2,Math.PI);s.lineTo(-W/2,-D/2+R);s.absarc(-W/2+R,-D/2+R,R,Math.PI,Math.PI*1.5);
 const pg=new T.ExtrudeGeometry(s,{depth:H-.012,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:3,curveSegments:16});
 pg.rotateX(-Math.PI/2);pg.translate(0,.006,0);const plinth=new T.Mesh(pg,walnut);plinth.name='plinth';g.add(plinth);
 // Two cheeks just outside the controller's ends.
 const curve=new T.CatmullRomCurve3(FIN.map(([z,y])=>new T.Vector3(-z,y,0)),true,'centripetal',.5),fin=new T.Shape(curve.getPoints(140).map(p=>new T.Vector2(p.x,p.y)));
 for(const x of [-CHEEK.x,CHEEK.x]){const t=CHEEK.t,geo=new T.ExtrudeGeometry(fin,{depth:t-.01,bevelEnabled:true,bevelThickness:.005,bevelSize:.005,bevelSegments:3,curveSegments:4});
  geo.translate(0,0,-(t-.01)/2);geo.rotateY(Math.PI/2);geo.translate(x,0,0);const m=new T.Mesh(geo,maple);m.name='cheek';g.add(m);}
 for(const [z,y,r] of DOWELS){
  const d=new T.Mesh(new T.CylinderGeometry(r,r,DOWEL.length,20),walnut);d.name='dowel';d.rotation.z=Math.PI/2;d.position.set(0,y,z);g.add(d);
  for(const x of [-DOWEL.knobX,DOWEL.knobX]){const k=new T.Mesh(new T.SphereGeometry(r*DOWEL.knob,16,10),walnut);k.name='knob';k.position.set(x,y,z);g.add(k);}}
 return g;
}
// Its colliders, in art units (scale them with the stand): the plinth, each cheek as two convex pieces (its lip and its
// sloped back; the dip between them and the concave back are filled, a few millimetres of a .03-thick board), and each
// dowel as a 16-sided prism.
export function standShapes(scale=1){
 const S=v=>v*scale,shapes=[{type:'box',half:[S(PLINTH.w/2),S(PLINTH.h/2),S(PLINTH.d/2)],offset:{x:0,y:S(PLINTH.h/2),z:0}}];
 const front=FIN.filter(([z])=>z>=.05),back=FIN.filter(([z])=>z<=.05);
 for(const x of [-CHEEK.x,CHEEK.x])for(const part of [front,back]){const points=[];for(const [z,y] of part)for(const dx of [-CHEEK.t/2,CHEEK.t/2])points.push(S(x+dx),S(y),S(z));shapes.push({type:'hull',points});}
 for(const [z,y,r] of DOWELS){const points=[];for(let n=0;n<16;n++){const a=n*Math.PI/8;for(const x of [-DOWEL.length/2,DOWEL.length/2])points.push(S(x),S(y+Math.sin(a)*r),S(z+Math.cos(a)*r));}shapes.push({type:'hull',points});}
 return shapes;
}
