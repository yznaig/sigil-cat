import {T,mat,lathe,rod,ring,tube,finish,body,cylinder} from './core.js';
export const physics=body(.06,[{type:'sphere',radius:.061,position:[0,.123,0]},cylinder(.024,.06,[0,.03,0])],{socket:[0,0,0]});
export function create({lit=false,variant}={}){lit=lit||variant==='lit';const g=new T.Group();g.name='bulb';const brass=mat('#b19c70',.29,.85,'metal'),ins=mat('#24211e',.5),wire=mat('#4c4232',.4,.8),glass=new T.MeshPhysicalMaterial({color:'#edf5f2',roughness:.08,metalness:.05,transparent:true,opacity:.24,side:T.DoubleSide,depthWrite:false,clearcoat:1}),filament=mat('#e0a44d',.3,.3,null,{emissive:lit?'#ff9c35':'#000000',emissiveIntensity:lit?3:0});
 lathe(g,[[0,0],[.015,0],[.021,.005],[.023,.01],[.023,.049],[.021,.055],[0,.055]],brass);
 for(let i=0;i<6;i++)ring(g,.023,.0022,brass,[0,.009+i*.007,0]);
 lathe(g,[[0,-.005],[.013,-.005],[.018,0],[.018,.004],[0,.004]],ins);
 lathe(g,[[.018,.05],[.021,.063],[.023,.077],[.037,.089],[.052,.104],[.060,.125],[.060,.145],[.051,.165],[.034,.181],[.015,.188],[0,.19]],glass,undefined,48);
 rod(g,[0,.044,0],[0,.107,0],.004,glass,.003);rod(g,[-.003,.06,0],[-.021,.13,0],.0009,wire);rod(g,[.003,.06,0],[.021,.13,0],.0009,wire);
 const pts=[];for(let i=0;i<=100;i++){let t=i/100;pts.push([-.021+t*.042,.13+Math.sin(t*Math.PI*32)*.002,Math.cos(t*Math.PI*32)*.002]);}tube(g,pts,.0008,filament,100);
 return finish(g,physics);}
