import {T,lathe,ring,mesh,body,cylinder,finish} from './forms.js';import {radius,glassMaterial,edgeMaterial,thickness} from './glass-form.js';
const walls=Array.from({length:8},(_,i)=>{const vertices=[];for(const y of [.012,.22])for(const r of [radius(y),radius(y)-thickness])for(const a of [(i-.5)*Math.PI/4,(i+.5)*Math.PI/4])vertices.push([Math.sin(a)*r,y,Math.cos(a)*r]);return {type:'convex',vertices};});
export const physics=body(.12,[cylinder(.072,.014,[0,.007,0]),...walls],{waterLevel:.152,breakProfile:'glass-form.js radius(y), thickness .004'});
export function create(){const g=new T.Group();g.name='cup';const glass=glassMaterial(),edge=edgeMaterial(),water=new T.MeshPhysicalMaterial({color:'#c9e6e5',roughness:.06,metalness:.15,transparent:true,opacity:.26,depthWrite:false,clearcoat:1});
 lathe(g,[[0,0],[.065,0],[.073,.004],[.073,.014],[.091,.211],[.093,.218],[.092,.222],[.088,.222],[.087,.215],[.069,.018],[0,.018]],glass,undefined,56);ring(g,.090,.0018,edge,[0,.220,0],undefined,56);ring(g,.0695,.0017,edge,[0,.008,0],undefined,48);
 // Contained closed water volume with a subtly raised meniscus. No refraction RT.
 lathe(g,[[0,.019],[.068,.019],[.0805,.149],[.081,.154],[.078,.152],[0,.152]],water,undefined,48);return finish(g,physics);}
