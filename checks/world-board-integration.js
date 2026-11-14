cat.auto=false;const W=site.world,S=site.supports,T=site.THREE;
const cards=['paper','postcard','ticket'].map(id=>keepsakes.give(id));await Promise.all(cards.map(i=>i.worldTask));await sleep(2000);
const paper=cards[0];site.pinboard.select('paper');site.pinboard.pin('paper',false);await sleep(100);
paper.key.querySelectorAll('button')[1].focus();await __key('Enter');await sleep(50);
check('board native Enter lifts it into the hand (no joint, e1111-58)',W.held?.entry===paper.worldEntry&&W.physics.impulseJoints.len()===0);
const target=W.held.target.clone();await __key('ArrowUp');await __key('Shift+ArrowUp');
check('board native arrows move grip and depth',W.held.target.distanceTo(target)>.04);
await __key('Escape');check('board native Escape leaves no joint',!W.held&&W.physics.impulseJoints.len()===0);
site.pinboard.pin('paper',false);await sleep(100);let grabs=0;const prior=paper.worldEntry.grabbed;paper.worldEntry.grabbed=()=>{grabs++;prior?.();};
const p=stage.toScreen(paper.object.localToWorld(new T.Vector3(-.1,.03,.003)));
// let go clear of the board: anywhere over it now pins it back (playtest 2, furniture lane)
const off={x:site.pinboard.picture.rect.x-90,y:p.y+60};await __pointer([p,{x:p.x-30,y:p.y+30},{x:p.x-55,y:p.y+60},off]);
check('board native mouse or finger detaches once',grabs===1&&!paper.worldEntry.support&&!W.held,`grabs=${grabs}`);document.activeElement?.blur();
paper.worldEntry.grabbed=prior;site.pinboard.pin('paper',false);await sleep(150);
// Breakpoint/selected-stock rebuilds must release the old owned resources.
// The merged galaxy/cat warm-ups also allocate GPU resources. Finish those before
// taking the baseline so their first uploads cannot be attributed to tray layouts.
check('board resource baseline finishes shader warm-up',await until(()=>stage.warmLeft===0,30000),`${stage.warmLeft} pending`);
const before={...stage.renderer.info.memory};for(let n=0;n<12;n++){site.pinboard.select(cards[n%3].id);await sleep(50);}site.pinboard.select('paper');await sleep(150);
const after={...stage.renderer.info.memory};check('board repeated tray layouts do not leak resources',after.geometries<=before.geometries+2&&after.textures<=before.textures+1,JSON.stringify({before,after}));
const box=site.pinboard.picture.rect,reservation=site.worldLayout.furniture().pinboard;
check('board reservation covers current art and controls',reservation.x<=box.x+5&&reservation.x+reservation.w>=box.x+box.w-5&&reservation.h>=box.h,JSON.stringify({box,reservation}));
// Registration can precede or follow restored keepsake creation.
for(const late of [false,true]){
 const id='restore-category-'+late;store.set('keepsakes.'+id,{x:0,y:0,state:{}});if(!late)S.registerCategory(id,'fixture');
 keepsakes.define({id,label:id,size:.1,home:()=>({x:0,y:0}),make(){}});if(late)S.registerCategory(id,'fixture');
 check('supports restored discovery order '+late,store.get('worldDiscoveries.'+id)==='fixture');keepsakes.take(id);store.del('worldDiscoveries.'+id);
}
// A shelf uses real selected splat geometry inside its cached support picture.
const {createMeshPicture}=await import('/src/core/mesh-picture.js'),{forPicture}=await import('/src/core/cat.js');
const root=new T.Group(),art=new T.Group();root.position.copy(site.worldLayout.anchor(stage.width*.32));root.position.y=.3;stage.scene.add(root);
const shelf=new T.Mesh(new T.BoxGeometry(.65,.025,.3),forPicture(new T.MeshStandardMaterial({color:0x70452b,roughness:.5})));art.add(shelf);
const vertices=[];for(const x of [-.4,.4])for(const y of [-.05,.4])for(const z of [-.2,.2])vertices.push(new T.Vector3(x,y,z));
const picture=createMeshPicture(site,root,art,vertices);let dirty=false;const invalidate=()=>{dirty=true;};
const remove=S.register({id:'splat-slot-fixture',kind:'slot',object:root,slots:[{id:'top',accepts:['top'],position:[0,.016,0]}],adopt:e=>e.presentation.attach(art,root,invalidate),release:e=>e.presentation.detach()});
const top=keepsakes.give('top');await top.worldTask;site.worldProps.charged.charge(top);S.mount(top.worldEntry,'splat-slot-fixture','top',{animate:false});picture.draw(true);
check('supports selected splat is real geometry inside slot picture',top.picture.attached&&top.picture.visual.parent===art&&!top.picture.card.visible&&dirty);
check('supports charged top pauses in slot',top.state.charged&&!site.worldProps.charged.listening);
const count=top.picture.stats.draws,frames=site.worldProps.charged.stats.frames;await sleep(300);
check('supports stored splat and charged top stay idle',top.picture.stats.draws===count&&site.worldProps.charged.stats.frames===frames);
await __shot('world-unit5-splat-support');const pos=top.object.position.clone();W.grab(top.worldEntry,pos);
check('supports splat lift keeps pose and stops charge',!top.picture.attached&&!top.state.charged&&top.object.position.distanceTo(pos)<1e-6);W.release();
remove();picture.dispose();root.removeFromParent();shelf.geometry.dispose();shelf.material.dispose();keepsakes.take('top');
await __shot('world-unit5-native-input');
