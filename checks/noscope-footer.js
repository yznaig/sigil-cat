cat.auto=false;
const slider=document.querySelector('#volume'),button=document.querySelector('#sound');
const centre=el=>{const b=el.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};};
const hit=()=>{const p=centre(slider);return document.elementFromPoint(p.x,p.y)===slider;};
const usualCentre=()=>{
  // Compare the same discovered footer layout, without the sequence styling.
  const showing=document.body.classList.contains('noscope-showing'), sound=slider.closest('.sound');
  const controls=sound.classList.contains('controls');
  document.body.classList.remove('noscope-showing');sound.classList.remove('controls');
  const point=centre(slider);
  if(showing)document.body.classList.add('noscope-showing');if(controls)sound.classList.add('controls');
  return point;
};
site.fire('noscope');await sleep(1200);
check('noscope footer slider hit during black fade',hit()&&input.locked);
await sleep(5500);
check('noscope footer slider hit during video',hit()&&input.locked&&E.noscopeVideo.phase==='playing');
const before=+slider.value,b=slider.getBoundingClientRect();
await __pointer([{x:b.x+b.width*.8,y:b.y+b.height/2},{x:b.x+b.width*.55,y:b.y+b.height/2},{x:b.x+b.width*.25,y:b.y+b.height/2}]);await sleep(100);
check('noscope footer native drag sets video gain',hit()&&Math.abs(+slider.value-before)>15&&Math.abs(E.noscopeVideo.audio.gain-Number(slider.value)/100)<.001&&E.noscopeVideo.phase==='playing');
// Recover after the baseline's intercepted drag so every remaining check has its own live sequence.
if(E.noscopeVideo.phase!=='playing'){E.noscopeVideo.stop();await sleep(700);site.fire('noscope');await sleep(6500);}
await __pointer([centre(slider)]);await sleep(100);
check('noscope footer slider tap does not skip or unlock',hit()&&E.noscopeVideo.phase==='playing'&&input.locked);
if(E.noscopeVideo.phase!=='playing'){E.noscopeVideo.stop();await sleep(700);site.fire('noscope');await sleep(6500);}
audio.setMuted(false);await __pointer([centre(button)]);await sleep(100);
check('noscope footer button mutes without skipping',hit()&&E.noscopeVideo.phase==='playing'&&input.locked&&document.querySelector('.noscope-video video')?.muted&&E.noscopeVideo.audio.gain===0);
await __pointer([centre(button)]);await sleep(100);
check('noscope footer button unmutes without unlocking',hit()&&E.noscopeVideo.phase==='playing'&&input.locked&&E.noscopeVideo.audio.gain>0);
E.noscopeVideo.stop();await sleep(200);const original=usualCentre();
// The return is abrupt (Aaron, e1111-58): no return phase, the footer is simply back where it lives, unlocked.
check('noscope footer is back in place at once after return',hit()&&!input.locked&&Math.hypot(centre(slider).x-original.x,centre(slider).y-original.y)<1,JSON.stringify({original,now:centre(slider),hit:hit(),locked:input.locked}));
await sleep(600);
check('noscope footer restores normal page after return',!input.locked&&!E.noscopeVideo.active&&!document.body.classList.contains('noscope-showing'));
