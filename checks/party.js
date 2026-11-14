// Unit 8's non-world half. Real wait (playtest 3: ~9 s on the error page, then the cat pops in over it and it opens
// like the loading screen's doors, ~10.7 s in all); native wall timer stays alive while the app is suspended.
const names = ['fork drawn stroke finds and emits one event', 'party replaces the whole page with an accessible error',
  'party freezes callbacks, world and audio', 'party waits about 9 seconds, the cat pops in over it, it opens like the doors, restored once',
  'party restores the same page and keepsakes', 'party returns with hat, bilateral 3D confetti and a toot',
  'party effects finish without retained callbacks', 'party has no way out: Escape, Enter and a click on its Reload change nothing (e1112-33)',
  'party muted return stays silent', 'party immediate mute is silent on the first return sample'];
const P = E.party;
if (!P) { for (const n of names) check(n, false, 'unit 8 absent'); }
else {
  const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
  const wallSleep = ms => new Promise(r => wallClock.setTimeout(r, ms));
  const wait = async (f, ms=35000) => { const t=performance.now(); while(performance.now()-t<ms) { if(f())return true; await wallSleep(25); } return false; };
  cat.auto=false; await until(settled); await until(()=>stage.warmLeft===0,30000);
  let forkEvents=0; const onFork=()=>forkEvents++; addEventListener('sigilcat:fork',onFork);
  const r=await drawSigil('fork'), forkAge=site.combos.since('fork');
  check(names[0], r.name==='fork' && registry.has('fork') && forkEvents===1 && forkAge<2, `${drew(r)}; events ${forkEvents}; age ${forkAge.toFixed(3)}s`);
  await __shot('party-fork-stroke'); // Screenshot encoding is outside the event's recency assertion.
  removeEventListener('sigilcat:fork',onFork); await sleep(1200);
  const preserved=['paper','rifle'].map(id=>keepsakes.give(id));
  await Promise.all(preserved.map(i=>i.worldTask));
  check('party fixture world adapters finish before suspension',preserved.every(i=>i.worldEntry));await sleep(700);
  // (the page runs again while the cat pops in and the page opens, playtest 3: let the fork's fall settle first, so
  // "the same keepsakes" means nothing moved because of the error page)
  await until(() => !site.world.stats.listening, 12000);
  const body=[...document.body.children], originalTitle=document.title, focus=document.getElementById('sound');focus.focus();
  const saved=[...keepsakes.live].map(([id,i])=>({id,i,x:i.x,y:i.y}));
  const counts={frame:0,render:0,timer:0,interval:0,idle:0,raf:0,stageWait:0};
  const frame=()=>counts.frame++,render=()=>counts.render++;
  stage.onFrame.push(frame);stage.onRender.push(render);
  const callbacks0=new Set(stage.onFrame), world0=site.world.stats.steps;
  const clock0=stage.clock, ctx=audio.context(), audio0=ctx.currentTime;
  let timer=setTimeout(()=>counts.timer++,250);
  const interval=setInterval(()=>counts.interval++,250);
  requestIdleCallback(()=>counts.idle++);
  requestAnimationFrame(()=>counts.raf++);stage.after(.25).then(()=>counts.stageWait++);
  audio.tone({freq:220,dur:.1,gain:.04});
  const start=performance.now(), done=P.eatCake(), duplicate=P.eatCake();
  await wallSleep(650);
  await __key('ArrowRight'); // Every gesture asks for context(); it must not resume the suspended audio.
  await wallSleep(150);
  const error=document.getElementById('party-error');
  // e1112-33: Chrome's "Aw, Snap!" page, as Aaron's screenshot: its icon, heading, line, Learn more and Reload, and
  // nothing on it that works (no button, no link, nothing to tab to).
  const style=error&&getComputedStyle(error), h1=error?.querySelector('h1');
  check(names[1], error?.getAttribute('role')==='dialog' && h1?.textContent==='Aw, Snap!' && /Something went wrong while displaying this webpage\./.test(error.textContent) &&
    /Learn more/.test(error.textContent) && /Reload/.test(error.textContent) && !!error.querySelector('svg.sad') && style.backgroundColor==='rgb(255, 255, 255)' &&
    getComputedStyle(error.querySelector('.reload')).backgroundColor==='rgb(66, 133, 244)' && !error.querySelector('button, a, input, [tabindex]:not(#party-error)') &&
    document.elementFromPoint(20,20)?.closest('#party-error') && body.every(e=>e.inert) && document.activeElement===error && input.locked,
    JSON.stringify({h1:h1?.textContent,font:style?.fontFamily.slice(0,40),focus:document.activeElement?.id}));
  // try every way out while it is up: none works
  await __key('Escape'); await wallSleep(120); await __key('Enter'); await wallSleep(120);
  { const r=error.querySelector('.reload').getBoundingClientRect(); await __pointer([{x:r.x+r.width/2,y:r.y+r.height/2}]); await wallSleep(150); }
  const stuck=P.state.active && !!document.getElementById('party-error') && input.locked && P.state.returns===0;
  check(names[2], Object.values(counts).every(n=>n===0) && stage.clock===clock0 && ctx.state==='suspended' && ctx.currentTime-audio0<.12 && site.world.stats.steps===world0,
    JSON.stringify({...counts,clock:stage.clock-clock0,audio:ctx.currentTime-audio0}));
  await __shot(stage.reducedMotion?'party-error-calm':'party-error');
  // playtest 3: at ~9 s he pops in over the page (only him: the room is still covered), then it opens down the middle
  const errorSeconds=E.party&&(await import(new URL('src/gags/party.js',document.baseURI))).PARTY.errorSeconds;
  const seen={popAt:null,popScale:0,doorsAt:null,doorsMoved:0,lockedThrough:true,shotPop:false,shotDoors:false,stillAt8:null};
  await wait(()=>(performance.now()-start)/1000>8.3,12000);
  seen.stillAt8=!!document.getElementById('party-error')&&!P.state.reopening&&!document.body.classList.contains('party-pop')&&input.locked;
  while(P.state.active){
    const t=(performance.now()-start)/1000,root=document.getElementById('party-error'),doors=root?[...root.querySelectorAll('.pe-door')]:[];
    if(document.body.classList.contains('party-pop')){seen.popAt??=t;seen.popScale=Math.max(seen.popScale,cat.fx.scale);}
    if(root?.classList.contains('opening')){seen.doorsAt??=t;const tr=doors[0]&&getComputedStyle(doors[0]).transform,m=tr&&tr!=='none'?new DOMMatrix(tr).m41:0;seen.doorsMoved=Math.min(seen.doorsMoved,m||0);}
    if(P.state.active&&!input.locked)seen.lockedThrough=false;
    if(!stage.reducedMotion&&!seen.shotPop&&seen.popAt&&cat.fx.scale>.9&&!seen.doorsAt){seen.shotPop=true;await __shot('party-pop');}
    if(!stage.reducedMotion&&!seen.shotDoors&&seen.doorsMoved<-stage.width*.15){seen.shotDoors=true;await __shot('party-doors');}
    await wallSleep(16);
  }
  await done;
  const elapsed=(performance.now()-start)/1000;
  check('party nothing changes before ~9 s: still the error page, no skip',seen.stillAt8&&errorSeconds===9,`at 8.3 s: ${seen.stillAt8}`);
  if(stage.reducedMotion) check('party calm: no pop, no doors; the page fades and the room is back',!site.shell.log.includes('pop over')&&seen.doorsMoved===0&&!seen.popAt,JSON.stringify(seen));
  else check('party at ~9 s he pops in over the page, then it opens like the loading doors',seen.popAt>=8.9&&seen.popAt<9.6&&seen.popScale>.99&&seen.doorsAt>seen.popAt+.5&&seen.doorsMoved<-stage.width*.4&&site.shell.log.includes('pop over'),
    JSON.stringify({...seen,popAt:seen.popAt?.toFixed(2),doorsAt:seen.doorsAt?.toFixed(2),doorsMoved:seen.doorsMoved.toFixed(0)}));
  check(names[3], elapsed>=9.4&&elapsed<=12.5 && seen.lockedThrough && done===duplicate && P.state.returns===1 && !input.locked, `${elapsed.toFixed(3)}s; returns ${P.state.returns}`);
  check(names[4], document.title===originalTitle && body.every(e=>e.isConnected&&!e.inert) && document.activeElement===focus &&
    saved.every(s=>keepsakes.get(s.id)===s.i && s.i.x===s.x && s.i.y===s.y),
    JSON.stringify({title:document.title===originalTitle,inert:body.filter(e=>!e.isConnected||e.inert).map(e=>e.id||e.tagName),focus:document.activeElement?.id,moved:saved.filter(s=>keepsakes.get(s.id)!==s.i||s.i.x!==s.x||s.i.y!==s.y).map(s=>s.id)}));
  await wallSleep(550);
  const fx=P.state, paper=stage.scene.getObjectByName('party-confetti'), blower=stage.scene.getObjectByName('party-blower');
  const visible=[0,0];
  if(paper?.isInstancedMesh) {
    paper.updateWorldMatrix(true,false);
    const m=new site.THREE.Matrix4(),pos=new site.THREE.Vector3(),scale=new site.THREE.Vector3();
    for(let i=0;i<paper.count;i++) {
      paper.getMatrixAt(i,m);
      const p=stage.toScreen(pos.setFromMatrixPosition(m).applyMatrix4(paper.matrixWorld),{});
      // Starts are staggered: measure the visible burst, not two arbitrary particle indices.
      if(scale.setFromMatrixScale(m).length()>0 && !p.behind && p.x>=0 && p.x<=stage.width && p.y>=0 && p.y<=stage.height)
        visible[p.x<stage.width/2?0:1]++;
    }
  }
  const bilateral=visible.every(n=>n>=8);
  // The toot, the blower and the confetti are sampled here, 0.55 s after the return, while they play. The party hat is
  // a gift now (playtest 2): on a first return the rack and that hat are built then (the rack module, its art and
  // pictures load lazily), which took up to ~6 s on a busy machine, so the hat gets its own, longer wait
  // (integration, playtest-2: the old single sample at 0.55 s failed on the base commit too).
  const blowerOn=!!blower?.visible && blower.children.some(o=>o.isMesh), level=audio.level(), hat0=performance.now();
  const hatOn=await wait(()=>E.hat.wearing==='party',10000), hatMs=Math.round(performance.now()-hat0+550);
  check(names[5], hatOn && blowerOn &&
    fx.toots===1 && (stage.reducedMotion ? !paper : paper?.count===160 && bilateral) && level>0,
    JSON.stringify({...fx,visiblePiecesPerSide:visible,hat:E.hat.wearing,hatAfterMs:hatMs,audioLevel:level}));
  await __shot(stage.reducedMotion?'party-return-calm':'party-return');
  await wait(()=>!P.state.effects,9000);
  check(names[6], !P.state.effects && !stage.scene.getObjectByName('party-confetti') && !stage.scene.getObjectByName('party-blower') && P.state.confetti===0 && !P.state.blower && counts.timer===1 && counts.raf===1 && counts.idle===1 && counts.interval>0 && counts.stageWait===1 && counts.frame>0 && counts.render>0 && stage.onFrame.every(fn=>callbacks0.has(fn)),JSON.stringify({party:P.state,counts,extraCallbacks:stage.onFrame.filter(fn=>!callbacks0.has(fn)).map(fn=>fn.name),stageClock:stage.clock}));
  stage.onFrame.splice(stage.onFrame.indexOf(frame),1);stage.onRender.splice(stage.onRender.indexOf(render),1);clearTimeout(timer);clearInterval(interval);
  check(names[7], stuck && P.state.returns===1);
  // a muted player's return stays silent (no way out now: the whole ~10 seconds again)
  audio.setMuted(true);
  let returnGain=-1;
  const mutedEnding=P.eatCake();mutedEnding.then(()=>returnGain=audio.output().gain.value);
  await mutedEnding;await wallSleep(250);
  check(names[9], returnGain===0, `gain ${returnGain}`);
  check(names[8], audio.state().muted && audio.level()<.00001 && !input.locked && P.state.returns===2, `RMS ${audio.level()}`);
  await wait(()=>!P.state.effects,9000);
}
