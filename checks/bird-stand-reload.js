// After checks/bird.js and a reload (playtest-2): the controller is a keepsake now; it and its wooden stand come
// back, the controller still in the stand, and clicking it still plays flappy.
cat.auto=false;const B=E.bird;
const {wallClock}=await import(new URL('src/core/page-scheduler.js',document.baseURI));
const wait=ms=>new Promise(r=>wallClock.setTimeout(r,ms));
const poll=async(f,ms=12000)=>{const t=performance.now();while(performance.now()-t<ms){if(f())return true;await wait(30);}return false;};
check('bird stand and controller come back after a reload, the stand standing (no second fall)',await poll(()=>site.stand?.ready&&keepsakes.get('controller')?.worldReady,20000)&&!site.stand.arrival&&!site.stand.arriving);
const inst=keepsakes.get('controller'),entry=inst?.worldEntry;
check('bird the controller is still in its stand',await poll(()=>entry?.support?.id==='stand'&&site.stand.occupant==='controller',4000)&&site.worldLayout.furniture().stand?.fixed,JSON.stringify(entry?.support));
await wait(400);document.activeElement?.blur();await __shot((stage.reducedMotion?'bird-calm':'bird')+'-stand-reload');
{const b=inst.box;await __pointer([{x:b.x+b.w*.5,y:b.y+b.h*.35}]);}
check('bird the restored controller plays flappy',await poll(()=>B.screen?.game,6000));
check('bird the high score lives in the saved state the grimoire\'s start over wipes (store.wipe)',store.all.flappy?.best===7);
check('bird the high score is still there when flappy opens again (e1113-22)',B.screen?.best===7&&document.querySelector('#bird-screen [data-best]')?.textContent==='best 7',String(B.screen?.best));
await __key('Escape');check('bird and returns',await poll(()=>!B.screen,4000)&&!input.locked&&keepsakes.has('controller'));
