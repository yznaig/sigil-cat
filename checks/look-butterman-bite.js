cat.auto=false;
const bm=E.butterman; await bm.clipsReady;
for(const scene of bm.all) {
 ui.caption('');ui.caption(null);
 document.querySelector('#bm-caption').textContent='';
 let textSeen=false;
 const inspect=()=>{if(document.querySelector('#bm-caption').textContent.trim() || document.querySelector('#say').getAttribute('aria-label')?.trim())textSeen=true;};
 const observer=new MutationObserver(inspect);
 observer.observe(document.querySelector('#bm-caption'),{childList:true,subtree:true,characterData:true});
 observer.observe(document.querySelector('#say'),{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label']});
 bm.inspect(scene);const end=bm.state.totalBeats;
 for(let b=0;b<=end;b+=.5){bm.seek(b,scene);await new Promise(requestAnimationFrame);inspect();}
 bm.stop();observer.disconnect();
 check(`look Butterman ${scene} has no caption text`,!textSeen);
}
bm.play({scene:'rise',forceAudio:true});
const row=bm.state.audio.find(r=>/rise-yell/.test(r.file));
const end=row.s+(row.duration??audio.buffer(row.src).duration)/row.rate;
const frames=[];
while(bm.running){await new Promise(requestAnimationFrame);if(bm.state.beat!==null)frames.push({t:bm.state.beat*60/80,visible:bm.state.figureVisible});}
const last=frames.findLastIndex(f=>f.visible), a=frames[last], b=frames[last+1];
check('look Butterman rise disappears on clip end frame',!!a&&!!b&&a.t<=end&&b.t>=end&&end-a.t<=b.t-a.t+.001&&b.t-a.t<.06,`last visible ${a?.t}, first absent ${b?.t}, decoded end ${end}`);
const pet=E.petbite;
for(let i=0;i<6;i++)pet.stroke();const before=pet.bites;
pet.stroke();
check('look bite occurs on seventh stroke',before===0&&pet.bites===1,`after six ${before}, after seven ${pet.bites}`);
// Ensure the original also reaches a bite, to test the separate reload regression.
if(!pet.bites)pet.bite();
// The bite gives the tin 0.6 s later on the stage clock; a loaded frame or an achievement toast can stretch
// that past a fixed wall-clock wait, and the reload half needs the tin. Wait for it, then save.
await until(()=>keepsakes.has('tin'),5000);await sleep(200);store.flush();
