cat.auto=false;
const centre=el=>{const b=el.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};};
const owns=(el,p)=>{const at=document.elementFromPoint(p.x,p.y);return at===el||el.contains(at);};
registry.find('whisper',{quiet:true});registry.find('blastoff',{quiet:true});await sleep(600);
const controls=['sound','ask','volume','grimoire'].map(id=>document.getElementById(id));
const targets=controls.map(el=>{const p=centre(el);return {id:el.id,points:[[-21.5,-21.5],[21.5,-21.5],[-21.5,21.5],[21.5,21.5],[0,0]].every(([x,y])=>owns(el,{x:p.x+x,y:p.y+y}))};});
check('audit footer utilities have 44px hit areas',targets.every(t=>t.points),JSON.stringify(targets));
// Native presses must get through the lock, without releasing it or triggering a skip.
audio.setMuted(false);E.galaxy.open('check');await sleep(3000);
const sound=document.querySelector('#sound'),volume=document.querySelector('#volume');
const loc=centre(sound),hit=owns(sound,loc);await __pointer([loc]);await sleep(150);
check('audit galaxy mute stays visible and works under lock',hit&&audio.state().muted&&input.locked&&E.galaxy.isOpen&&audio.output().gain.value<.001);
const b=volume.getBoundingClientRect();await __pointer([{x:b.x+b.width*.7,y:b.y+b.height/2},{x:b.x+b.width*.25,y:b.y+b.height/2}]);await sleep(150);
check('audit galaxy volume changes without unlocking',owns(volume,centre(volume))&&!audio.state().muted&&audio.state().volume<.5&&input.locked&&E.galaxy.isOpen);
await __shot('audit-polish-galaxy-sound');dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await until(()=>!input.locked,15000);
// Found marks are exercised through native input, rather than calling replay APIs directly. Since playtest-2 the row
// holds only the sigils and the controller (Aaron: "The 360 and everything to its right on the sigil bar ... dont need to
// be there ... the player can just run them again by doing their actions"; text lane item 4): the blast-off and the
// whisper have no mark, and a found sigil's mark casts it again.
check('audit the blast-off and the whisper have no mark in the row (playtest-2)',!document.querySelector('[data-find="blastoff"]')&&!document.querySelector('[data-find="whisper"]'));
registry.find('eyes',{quiet:true});await sleep(300);
const castFn=site.cast;let recast=null;site.cast=(name)=>{recast=name;};
try{const m=document.querySelector('[data-find="eyes"]');await __pointer([centre(m)]);await sleep(300);}finally{site.cast=castFn;}
check('audit a found sigil mark pressed by native input casts it again',recast==='eight',`cast ${recast}`);
await E.butterman.clipsReady;
// e1111-58 replaced the old curtain: the collection stays on the page through every scene (he moves loose props
// out of his way instead), and nothing about it is touched when he leaves.
for(const id of ['paper','tin','pat','postcard'])keepsakes.give(id);await sleep(1600);
const props=[...keepsakes.live.values()];
const before=props.map(i=>({i,visible:i.object?.visible,visibility:i.el.style.visibility,hits:i.hits}));
let shown=true,drawnFrames=0,drawShown=true;
const inspectDraw=()=>{if(!E.butterman.state.figureVisible)return;drawnFrames++;drawShown=drawShown&&!document.body.classList.contains('bm-scene')&&props.every(i=>!i.object||i.object.visible||i.stored);};
stage.onPresent.push(inspectDraw);
for(const scene of ['butter','loop','rise']){
 E.butterman.seek(9,scene);await sleep(250);
 shown=shown&&props.every(i=>getComputedStyle(i.el).visibility!=='hidden'&&(!i.object||!i.object.userData.collectionHidden));
 if(scene==='rise')await __shot('audit-polish-butterman-clear');
}
E.butterman.stop();await sleep(300);
E.butterman.play({scene:'rise'});await sleep(600);
shown=shown&&props.every(i=>getComputedStyle(i.el).visibility!=='hidden'&&(!i.object||!i.object.userData.collectionHidden));
check('audit Butterman leaves collected props on the page in every scene',shown&&drawShown&&drawnFrames>0,`${drawnFrames} draws with him on the page`);
await until(()=>E.butterman.state.mode==='done',20000);await sleep(100);
check('audit Butterman leaves the collection as it was',E.butterman.state.mode==='done'&&before.every(({i,visible,visibility,hits})=>i.object?.visible===visible&&i.el.style.visibility===visibility&&i.hits===hits));
stage.onPresent.splice(stage.onPresent.indexOf(inspectDraw),1);
await __shot('audit-polish-controls');
