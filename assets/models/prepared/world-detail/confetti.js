import {T,rng,body,cuboid} from './forms.js';
export const COUNT=48,DURATION=2.4;
export const piecePhysics=body(.0002,[cuboid([.012,.022,.0056],[0,0,.002])]);
// Temporary particles use analytic gravity/contact, not 48 persistent world bodies.
export const physics={mode:'finite-analytic-particles',count:COUNT,mass:.0002*COUNT,massPerPiece:.0002,colliders:piecePhysics.colliders,duration:DURATION,gravity:1.4,restitution:.18};
function geometry(){const g=new T.BoxGeometry(.012,.022,.0006,1,5,1),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.0025*Math.sin((p.getY(i)/.022+.5)*Math.PI));g.computeVertexNormals();return g;}
export function create({variant}={}){const g=new T.Group();g.name='confetti';const m=new T.MeshStandardMaterial({color:'#ffffff',roughness:.68}),pieces=new T.InstancedMesh(geometry(),m,COUNT);pieces.name='confetti.instances';pieces.instanceMatrix.setUsage(T.DynamicDrawUsage);pieces.castShadow=pieces.receiveShadow=true;const r=rng(811106),palette=['#e0b847','#d7536e','#4f9d90','#eaddb6','#8e7aaf'],data=[];
 for(let i=0;i<COUNT;i++){const side=i%2?1:-1;data.push({start:[side*(.48+r()*.12),.26+r()*.08,(r()-.5)*.12],velocity:[-side*(.20+r()*.38),.55+r()*.40,(r()-.5)*.42],spin:[(r()-.5)*14,(r()-.5)*14,(r()-.5)*14],angle:[r()*6,r()*6,r()*6],scale:[.65+r()*.70,.60+r()*.95,1],delay:r()*.12});pieces.setColorAt(i,new T.Color(palette[i%palette.length]));}
 pieces.instanceColor.needsUpdate=true;g.add(pieces);g.userData.burst=data;g.userData.physics=physics;sampleBurst(g,variant==='late'?1.75:variant==='start'?.15:.65);
 if(variant==='pieces'){for(let i=0;i<COUNT;i++){dummy.position.set((i%8-3.5)*.030,.014,(Math.floor(i/8)-2.5)*.038);dummy.rotation.set(Math.PI/2+(i%3-1)*.35,0,(i%5-2)*.23);dummy.scale.set(...data[i].scale);dummy.updateMatrix();pieces.setMatrixAt(i,dummy.matrix);}pieces.instanceMatrix.needsUpdate=true;pieces.computeBoundingBox();pieces.computeBoundingSphere();}return g;}
const dummy=new T.Object3D();
// seconds is caller-owned, finite and clamped; returns true only while active.
export function sampleBurst(g,seconds,{floor=0}={}){const pieces=g.getObjectByName('confetti.instances'),active=Number.isFinite(seconds)&&seconds>=0&&seconds<DURATION;pieces.visible=active;pieces.count=active?COUNT:0;g.userData.active=active;if(!active)return false;const gravity=physics.gravity;
 for(let i=0;i<COUNT;i++){const p=g.userData.burst[i],t=Math.max(0,seconds-p.delay),[x,y,z]=p.start,[vx,vy,vz]=p.velocity,support=Math.hypot(.006*p.scale[0],.011*p.scale[1])+.003,hit=(vy+Math.sqrt(vy*vy+2*gravity*Math.max(0,y-floor-support)))/gravity,dt=Math.max(0,t-hit);let yy=y+vy*t-.5*gravity*t*t,xx=x+vx*t,zz=z+vz*t;
 if(dt>0){const impact=gravity*hit-vy,bounce=physics.restitution*impact,land=2*bounce/gravity;if(dt<land)yy=floor+support+bounce*dt-.5*gravity*dt*dt;else yy=floor+.0028;const travel=(1-Math.exp(-dt*9))/9;xx=x+vx*hit+vx*travel;zz=z+vz*hit+vz*travel;}
 dummy.position.set(xx,yy,zz);const a=p.angle,s=p.spin;dummy.rotation.set(a[0]+s[0]*t,a[1]+s[1]*t,a[2]+s[2]*t);if(dt>.12){const k=Math.min(1,(dt-.12)/.2);dummy.rotation.x=T.MathUtils.lerp(dummy.rotation.x,Math.PI/2,k);dummy.rotation.y*=1-k;}
 dummy.scale.set(...p.scale);dummy.updateMatrix();
 // Conservative contact projection prevents a tumbling corner crossing the floor.
 if(dt>0){const a=pieces.geometry.attributes.position,m=dummy.matrix.elements;let low=Infinity;for(let j=0;j<a.count;j++)low=Math.min(low,m[1]*a.getX(j)+m[5]*a.getY(j)+m[9]*a.getZ(j)+m[13]);if(low<floor){dummy.position.y+=floor-low;dummy.updateMatrix();}}
 pieces.setMatrixAt(i,dummy.matrix);
 }pieces.instanceMatrix.needsUpdate=true;pieces.computeBoundingBox();pieces.computeBoundingSphere();return true;}
