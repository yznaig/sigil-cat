// Authored pose inspection uses production meshes/materials at their real scale.
// Posed shots are separate from the natural-drop and full-playthrough evidence.
cat.auto=false;const W=site.world,T=site.THREE,C=E.box.recipe;
const ids=(stage.opt('cake-items')||'box,flour,bucket,pitchfork,hay,recipe-flour,recipe-butter,recipe-milk,cake,egg').split(','),items=[];
C.state.phase='revealed';
for(const id of ids){const i=keepsakes.give(id);await i.worldTask;items.push(i);}
for(const e of W.entries.values()){W.park(e);e.body.setEnabled(false);e.object.visible=false;e.presentation?.draw(true);site.worldLayout.remove(e.id);}
cat.hide('material-inspection',true);cat.hideShadow('material-inspection',true);
const title=document.createElement('p');title.style='position:fixed;top:25%;left:0;width:100%;text-align:center;font:18px Georgia;color:#493d32';document.body.append(title);
const hit=i=>{for(let y=Math.max(stage.insets.top,i.box.y+3);y<Math.min(stage.height-stage.insets.bottom,i.box.y+i.box.h-3);y+=3)for(let x=Math.max(5,i.box.x+3);x<Math.min(stage.width-5,i.box.x+i.box.w-3);x+=3)if(site.worldInput.pick({clientX:x,clientY:y})?.entry===i.worldEntry)return {x,y};return null;};
for(const i of items){
 const e=i.worldEntry,b=e.body;e.object.visible=true;e.canGrab=i.id!=='hay';
 const place=q=>{const p=site.worldLayout.anchor(stage.width*.5,stage.height*.64),low=Math.min(...i.colliderVertices.map(v=>v.clone().applyQuaternion(q).y));p.y=-low+.002;b.setTranslation(p,false);b.setRotation(q,false);b.setLinvel({x:0,y:0,z:0},false);b.setAngvel({x:0,y:0,z:0},false);W.sync(e);};
 for(const [view,angles]of [['front',[0,0,0]],['back',[0,Math.PI,0]],['edge',[0,Math.PI/2,0]],['oblique',[.3,.65,.4]],['underside',[-1.5,.65,.4]]]){
  title.textContent=i.def.label+' · '+view;place(new T.Quaternion().setFromEuler(new T.Euler(...angles)));await __shot('world-unit8-art-'+i.id+'-'+view);
 }
 if(i.id!=='hay'){
  b.setEnabled(true);place(new T.Quaternion());const p=hit(i);let error=Infinity,held=false;
  if(p){const pid=++pointerIds;fire('pointerdown',p.x,p.y,pid);if(i.id==='box')await sleep(250);fire('pointermove',p.x+18,p.y-50,pid);await sleep(800);held=W.held?.entry===e;
   if(held){const actual=W.held.local.clone().applyQuaternion(b.rotation()).add(b.translation()),a=stage.toScreen(actual),target=stage.toScreen(W.held.target);error=Math.hypot(a.x-target.x,a.y-target.y);}
   await __shot('world-unit8-held-'+i.id);fire('pointercancel',p.x+18,p.y-50,pid,0);
  }
  check('cake '+i.id+' routed off-centre grip <=4px and cancel',held&&error<=4&&!W.held&&W.physics.impulseJoints.len()===0,JSON.stringify({hit:!!p,error}));
  const p2=hit(i);if(p2){const pid=++pointerIds;fire('pointerdown',p2.x,p2.y,pid);dispatchEvent(new Event('blur'));await sleep(250);check('cake '+i.id+' blur leaves no delayed grip',!W.held&&W.physics.impulseJoints.len()===0);}
  W.park(e);b.setEnabled(false);
 }
 e.object.visible=false;e.presentation.draw(true);site.worldLayout.remove(i.id);b.setTranslation({x:10,y:0,z:0},false);
}
title.remove();cat.hide('material-inspection',false);cat.hideShadow('material-inspection',false);
