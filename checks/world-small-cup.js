cat.auto=false;const W=site.world,T=site.THREE;
const {createCup}=await import('/src/world/cup.js');
const cup=await createCup(site,.36*cat.height);
const probe=await W.add({id:'cup-contact-probe',object:new T.Group(),shapes:[{half:[.025,.025,.025]}],mass:.04,position:{x:.34,y:.026,z:.66},sleeping:true});
cup.pose(new T.Vector3(.34,.002,.3));
const first=probe.body.translation().z;
for(let n=1;n<=20;n++){cup.pose(new T.Vector3(.34,.002,.3+n*.015));W.step(1/120);}
check('small cup kinematic shell pushes another real body',cup.entry.body.isKinematic()&&probe.body.translation().z>first+.04,JSON.stringify({from:first,to:probe.body.translation().z}));
const p=new T.Vector3(.34,.18,.6),q=new T.Quaternion().setFromEuler(new T.Euler(.2,0,-.7));cup.pose(p,q);W.step(1/120);
const broke=cup.fall();let n=0;for(;n<960&&cup.mode!=='broken';n++){W.step(1/120);await Promise.resolve();}
const at=await broke;
check('small cup free fall removes shell once',cup.mode==='broken'&&cup.stats.handoffs===1&&!W.entries.has('glass')&&n<960&&!!at&&!cup.finish(),JSON.stringify({steps:n,handoffs:cup.stats.handoffs,at}));
W.remove(probe.id);check('small temporary cup cleanup stops solver',!W.active&&!W.stats.listening&&!W.entries.has('glass'));
