import {T,mat,lathe,rod,sphere,ring,box,finish,body,cuboid,cylinder} from './core.js';
export const physics=body(0,[cylinder(.21,.055,[0,.0275,0]),cylinder(.034,1.35,[0,.72,0]),cylinder(.043,.082,[0,1.461,0]),...[-1,1].flatMap(s=>[cuboid([.27,.035,.035],[s*.15,1.04,.015]),cuboid([.035,.035,.27],[.015,1.25,s*.15])])],{pegs:{wizard:[-.28,1.065,0],cone:[.28,1.065,0],party:[0,1.275,.28],crown:[0,1.275,-.28]},socket:[0,1.455,0]});
export function create({upperReach=.28}={}){const g=new T.Group();g.name='rack';const wood=mat('#3d2317',.44,0,'wood'),brass=mat('#7c6747',.34,.82,'metal'),dark=mat('#201b17',.6,.2),felt=mat('#262320',.95,0,'cloth');
 lathe(g,[[0,0],[.16,0],[.195,.008],[.21,.024],[.21,.039],[.198,.052],[.16,.062],[.12,.065],[.105,.08],[.06,.086],[.045,.12],[.032,.17],[.029,.23],[.032,.25],[.032,.28],[.025,.30],[.025,.91],[.034,.94],[.034,.97],[.026,.985],[.026,1.38],[.04,1.4],[.04,1.42],[0,1.42]],wood);
 lathe(g,[[0,0],[.17,0],[.17,.005],[0,.005]],felt,[0,-.001,0]);
 for(const h of [.08,.25,.96,1.40])ring(g,h===.08?.086:.031,.003,brass,[0,h,0]);
 // Exactly four hat-bearing arms; the knob at each end stops a hanging brim.
 for(const [i,a] of [0,Math.PI,Math.PI/2,-Math.PI/2].entries()){const h=i<2?1.04:1.25,reach=i<2?.28:upperReach,v=[Math.cos(a),0,Math.sin(a)],start=[v[0]*.022,h, v[2]*.022],end=[v[0]*reach,h+.025,v[2]*reach];rod(g,start,end,.012,brass,.010);sphere(g,.021,brass,end);ring(g,.031,.004,brass,[0,h,0]);}
 lathe(g,[[.024,0],[.041,0],[.043,.015],[.038,.019],[.038,.064],[.043,.07],[.043,.082],[.027,.082],[.027,.02],[.024,.02]],brass,[0,1.42,0]);
 lathe(g,[[.026,0],[.026,.045],[.023,.049],[.023,0]],dark,[0,1.45,0]);
 for(let i=0;i<5;i++)ring(g,.039,.0016,brass,[0,1.447+i*.008,0]);
 // Runtime fitting can separate the upper brims without distorting the turned
 // post or knobs. Keep the corresponding collider/anchor record with the art.
 const extension=upperReach-.28,fitted=extension===0?physics:{...physics,
  colliders:physics.colliders.map(c=>c.type==='box'&&c.position[1]===1.25?{...c,size:[c.size[0],c.size[1],c.size[2]+extension],position:[c.position[0],c.position[1],c.position[2]+Math.sign(c.position[2])*extension/2]}:c),
  anchors:{...physics.anchors,pegs:{...physics.anchors.pegs,party:[0,1.275,upperReach],crown:[0,1.275,-upperReach]}}};
 return finish(g,fitted);}
