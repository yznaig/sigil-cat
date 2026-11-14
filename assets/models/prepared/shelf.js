import {T,mat,box,lathe,rod,sphere,mesh,finish,body,cuboid,cylinder} from './core.js';
const slots={rifle:[0,.161,-.09],top:[-.38,.017,.06],pat:[.035,.064,.07],tin:[.46,.055,.035]};
export const physics=body(0,[cuboid([.22,.05,.34],[-.565,.025,0]),cuboid([.97,.05,.34],[.19,.025,0]),cuboid([.15,.05,.155],[-.38,.025,-.0925]),cuboid([.15,.05,.035],[-.38,.025,.1525]),cuboid([.15,.012,.15],[-.38,.006,.06]),...[-.43,.39].flatMap(x=>[cuboid([.055,.10,.035],[x,.10,-.1475]),cuboid([.055,.10,.035],[x,.10,-.0325]),cuboid([.055,.025,.15],[x,.0625,-.09])]),cylinder(.10,.012,[.035,.058,.07])],{slots});
export function create({rifleStops=[{x:-.43,y:.083},{x:.39,y:.083}]}={}){const g=new T.Group();g.name='shelf';const wood=mat('#77543a',.48,0,'wood'),metal=mat('#3b3a33',.38,.8,'metal'),leather=mat('#3b2820',.8,0,'cloth'),ceramic=mat('#e6e5d4',.19),blue=mat('#3a625e',.23),steel=mat('#aba69c',.3,.85);
 const s=new T.Shape();s.moveTo(-.675,-.17);s.lineTo(.675,-.17);s.lineTo(.675,.17);s.lineTo(-.675,.17);s.closePath();const hole=new T.Path();hole.absarc(-.38,-.06,.073,0,Math.PI*2,true);s.holes.push(hole);const geo=new T.ExtrudeGeometry(s,{depth:.042,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,steps:1,curveSegments:24});mesh(g,geo,wood,[0,.004,0],[-Math.PI/2,0,0]);
 lathe(g,[[0,0],[.072,0],[.072,.014],[0,.014]],wood,[-.38,0,.06]);
 for(const {x,y} of rifleStops){box(g,[.032,Math.max(.025,y-.05),.065],metal,[x,(y+.05)/2,-.09],.004);for(const z of [-.133,-.047]){box(g,[.032,.04,.012],metal,[x,y+.012,z],.004);box(g,[.028,.005,.012],leather,[x,y+.034,z],.002);}box(g,[.032,.006,.075],leather,[x,y-.003,-.09],.002);}
 lathe(g,[[0,0],[.067,0],[.067,.005],[.084,.009],[.109,.016],[.111,.024],[.105,.027],[.082,.017],[0,.014]],ceramic,[.035,.05,.07]);
 lathe(g,[[.105,.025],[.111,.024],[.109,.027],[.105,.028]],blue,[.035,.05,.07]);
 for(const x of [.275,.645])box(g,[.012,.022,.24],wood,[x,.061,.035],.003);box(g,[.37,.02,.012],wood,[.46,.06,-.091],.003);
 for(const x of [-.49,.49]){box(g,[.04,.22,.018],metal,[x,-.074,-.145],.004);box(g,[.04,.018,.29],metal,[x,-.014,-.01],.004);rod(g,[x,-.165,-.145],[x,-.025,.12],.009,metal);for(const y of [-.13,-.04]){sphere(g,.011,steel,[x,y,-.132],[1,1,.35]);box(g,[.012,.002,.001],metal,[x,y,-.128],0);}}
 return finish(g,physics);}
