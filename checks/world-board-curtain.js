// e1111-58: Butterman's scenes no longer conceal the collection (the old curtain is gone). The pinboard and its cards
// stay drawn and pickable through a scene, and a card unlocked during one lands in the tray as usual.
cat.auto=false;
await Promise.all(['paper','postcard'].map(id=>keepsakes.give(id).worldTask));await sleep(1900);
site.pinboard.select('paper');await sleep(100);await E.butterman.clipsReady;
let frames=0,shown=true;
const duringDraw=()=>{if(!E.butterman.state.figureVisible)return;frames++;shown=shown&&!document.body.classList.contains('bm-scene')&&site.pinboard.picture.card.visible&&['paper','postcard','ticket'].every(id=>{const i=keepsakes.get(id);return !i||i.stored||i.object.visible;});};
stage.onPresent.push(duringDraw);
E.butterman.seek(9,'rise');await sleep(200);
await keepsakes.give('ticket').worldTask;await sleep(1900);
const ticket=keepsakes.get('ticket');
check('board cards stay pickable during his scene',!ticket.object.userData.collectionHidden&&ticket.worldEntry.canGrab!==false);
E.butterman.stop();await sleep(200);stage.onPresent.splice(stage.onPresent.indexOf(duringDraw),1);
check('board stays drawn through his scene',frames>0&&shown,`${frames} draws`);
const states=['paper','postcard','ticket'].map(id=>{const i=keepsakes.get(id);return {id,stored:i.stored,root:i.object.visible,art:i.cardArt.visible,shadow:site.worldLayout.shadows.get(id).group.visible,masked:!!i.object.userData.collectionHidden};});
check('board unlock during a scene keeps tray visibility',states.every(s=>!s.masked&&s.root===!s.stored&&s.art===!s.stored&&s.shadow===!s.stored),JSON.stringify(states));
const before={steps:site.world.stats.steps,supports:site.supports.stats.frames,draws:site.pinboard.picture.stats.draws};await sleep(500);
check('board after his scene stays idle',JSON.stringify(before)===JSON.stringify({steps:site.world.stats.steps,supports:site.supports.stats.frames,draws:site.pinboard.picture.stats.draws}));
await __shot('world-unit5-curtain-unlock');
