import {T,mat,rod,lathe,tube,ring,finish,body,cuboid} from './core.js';
export const physics=body(.60,[{type:'capsule',radius:.015,halfHeight:.32,position:[0,.62,0]},cuboid([.20,.03,.035],[0,.235,0]),...[-.084,0,.084].map(x=>cuboid([.012,.22,.04],[x,.12,.015]))],{grip:[0,.65,0]});
export function create(){const g=new T.Group();g.name='pitchfork';const ash=mat('#97744c',.63,0,'wood'),steel=mat('#505453',.38,.85),bright=mat('#aaaead',.28,.88),dark=mat('#282b2b',.7,.5);
 lathe(g,[[0,.28],[.017,.28],[.015,.39],[.012,.83],[.016,.92],[.016,.96],[.011,.974],[0,.977]],ash,undefined,20);
 lathe(g,[[.012,.275],[.022,.275],[.020,.34],[.016,.365],[.012,.365]],steel,undefined,20);ring(g,.016,.002,bright,[0,.358,0],undefined,20);
 tube(g,[[-.09,.232,.012],[-.06,.244,0],[0,.253,0],[.06,.244,0],[.09,.232,.012]],.012,steel,20);rod(g,[0,.248,0],[0,.29,0],.012,steel,.016,12);
 for(const x of [-.084,0,.084]){tube(g,[[x,.24,.008],[x,.17,.008],[x,.08,.019],[x,.021,.04]],.006,steel,18);rod(g,[x,.027,.038],[x,0,.05],.006,bright,0,10);}
 rod(g,[-.022,.306,0],[.022,.306,0],.003,bright,undefined,10);
 return finish(g,physics);}
