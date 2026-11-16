import {css} from '../core/util.js';
import {wallClock, pausePageCallbacks} from '../core/page-scheduler.js';
import {createFlight} from './physics.js';
import {drawFlight,flightArt,OVER_BUTTONS} from './art.js';
import {PLAYER,CLONE_IMAGES,flightLayout} from './config.js';
export {loadFlightArt} from './art.js';
// The trailer lands each word on Aaron's cinematic boom (playtest-2; tools/audio/make-boom.py).
export const SOUNDS = {flap:'assets/audio/designed/bird-flap.wav',boom:'assets/audio/designed/bird-boom.wav',pop:'assets/audio/designed/controller-pop.wav'};
// Playtest 4 (trailer lane; Aaron: "'THE GAME' should be merged into just one slam, so 'YOU' 'JUST' 'LOST' 'THE GAME' with
// THE in red"): four slams, one boom each. The first three keep the 900ms grid; the payoff skips one beat (a held breath)
// so THE GAME lands on the next bar's downbeat, the same moment GAME landed before.
export const WORDS = ['YOU','JUST','LOST','THE GAME'];
export const RED_WORD = 'THE';
// Seconds from each slam to the next, then from the last slam to the fade home. Aaron: "should linger on its final dark
// screen for a couple more seconds before fading back to the sigil cat" — the quiet tail was 1.8 s, now 3.8 s.
export const SLAM_GAPS = [.9,.9,1.8];
export const FINAL_HOLD = 3.8;
css('bird-screen',`
@font-face{font-family:BirdTrailer;src:url('assets/bird/Anton-Regular.ttf') format('truetype');font-display:swap}
#bird-screen{position:fixed;inset:0;z-index:1100;opacity:0;transition:opacity .22s ease;background:#f1e7d8;touch-action:none;color:#302f29;overflow:hidden;isolation:isolate}
#bird-screen.shown{opacity:1} #bird-screen canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
#bird-screen .bird-bar{position:absolute;inset:max(14px,env(safe-area-inset-top)) 18px auto;display:flex;align-items:center;justify-content:space-between;gap:10px;font:11px Silkscreen,monospace;letter-spacing:.08em}
#bird-screen .bird-best{opacity:.7;margin-left:.8em} #bird-screen .bird-actions{display:flex;gap:8px} #bird-screen button{font:11px Silkscreen,monospace;min-height:44px;min-width:44px;padding:8px 12px;color:inherit;border:1px solid #302f2940;border-radius:3px;background:#fff9edb8;cursor:pointer}
#bird-screen .bird-score{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);pointer-events:none}
#bird-screen .bird-instruction{position:absolute;left:16px;right:16px;bottom:max(22px,env(safe-area-inset-bottom));text-align:center;pointer-events:none;font:12px/2 Silkscreen,monospace;letter-spacing:.03em}
#bird-screen .bird-instruction small{display:block;font-size:9px;opacity:.55;margin-top:5px}
#bird-screen .bird-over{position:absolute;inset:0;pointer-events:none}
#bird-screen .bird-over button{position:absolute;pointer-events:auto;padding:0;border:0;border-radius:0;background:none;min-width:0;min-height:0;display:flex;align-items:flex-end;justify-content:center;font:var(--label,11px) Silkscreen,monospace;color:#fff;letter-spacing:.06em;text-shadow:0 2px 0 #543847,2px 0 0 #543847,-2px 0 0 #543847,0 -2px 0 #543847}
#bird-screen .bird-over button:focus-visible{outline:2px dashed #fff;outline-offset:2px}
#bird-screen .bird-over[hidden]{display:none}
#bird-screen.trailer{background:radial-gradient(ellipse at center,#292722 0%,#11110f 57%,#050505 100%);color:#f4ecdc}
#bird-screen .trailer-word{position:absolute;inset:0;display:grid;place-items:center;margin:0;font:clamp(110px,25vw,320px)/1 BirdTrailer,Impact,sans-serif;letter-spacing:-.025em;text-shadow:0 4px 0 #b0a795,0 16px 50px #0008;opacity:0;will-change:transform,opacity}
#bird-screen .trailer-word.final{font-size:clamp(84px,16.5vw,250px);white-space:nowrap}
#bird-screen .trailer-word .red{color:#e2261b;text-shadow:0 4px 0 #6f100b,0 16px 50px #0008}
#bird-screen.trailer button{color:#c2baac;border-color:#ddd3;background:#151512}
@media(prefers-reduced-motion:reduce){#bird-screen{transition-duration:.18s}}
`);

// Freeze the page's own callback graph. Only this finite interlude uses a native RAF.
// The shared audio master remains live, so every cue obeys the existing mute/volume.
export function openScreen(site,kind,onClose) {
  const {stage,input,audio,store}=site;
  // e1113-22 (fx lane, playtest 3): the high score is kept in the store, shown whenever flappy opens and on the scoreboard's
  // best line; the grimoire's start over wipes it with everything else.
  let best=Math.max(0,Number(store?.get('flappy.best',0))||0);
  const saved={focus:document.activeElement,children:[...document.body.children].map(n=>[n,n.inert]),
    animations:document.getAnimations().filter(a=>a.playState==='running')};
  // The page is frozen at the end of this function, in one guarded step (playtest 4, flappybreak lane: see restore()).
  let resume=null,closed=false,raf=0,last=0,elapsed=0,closing=null,deathAt=null,game=null,retries=0,wordIndex=-1,nextWordAt=.32,wordAnimation=null,resized=false,hiddenAudio=null;
  const timers=new Set(), voices=new Set(), beats=[];
  const later=(fn,ms)=>{const id=wallClock.setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
  const root=document.createElement('section');root.id='bird-screen';root.className=kind==='trailer'?'trailer':'';
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',kind==='trailer'?'You just lost the game':'flappy');
  const bar=document.createElement('div');bar.className='bird-bar';bar.innerHTML=`<span>${kind==='game'?'flappy<span class="bird-best" data-best></span>':''}</span><div class="bird-actions"><button type="button" data-sound></button><button type="button" data-exit>return ↗</button></div>`;root.append(bar);
  const sound=bar.querySelector('[data-sound]'),exit=bar.querySelector('[data-exit]'),bestEl=bar.querySelector('[data-best]');
  const showBest=()=>{if(bestEl)bestEl.textContent=best?`best ${best}`:'';};showBest();
  const soundLabel=()=>sound.textContent=audio.state().muted?'unmute':'mute';soundLabel();
  sound.onclick=()=>{audio.setMuted(!audio.state().muted);soundLabel();};exit.onclick=()=>close(died);
  let canvas,c,score,instruction,word,view,over,retryButton,giveUpButton,overAt=null,died=false;
  const resize=()=>{
    if(kind!=='game')return;
    const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    // The same native portrait playfield on every screen; scenery fills the margins.
    view=flightLayout(w,h);c.setTransform(dpr,0,0,dpr,0,0);c.imageSmoothingEnabled=false;
    // Each button covers its sprite plus a label line under it, in playfield units.
    const b=OVER_BUTTONS,label=Math.max(9,Math.round(11*view.scale));over.style.setProperty('--label',label+'px');
    for(const [el,x] of [[retryButton,b.retry],[giveUpButton,b.giveUp]])Object.assign(el.style,{left:view.x+x*view.scale+'px',top:view.y+b.y*view.scale+'px',width:b.w*view.scale+'px',height:b.h*view.scale+label+8+'px'});
  };
  if(kind==='game'){
    game=createFlight();canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Tap or press Space to fly through the gaps.');root.prepend(canvas);c=canvas.getContext('2d');
    canvas.dataset.playerSource=flightArt().player?PLAYER.src:CLONE_IMAGES+'bird.png';canvas.dataset.scenery='floppybird';
    score=document.createElement('div');score.className='bird-score';score.textContent='0';root.append(score);
    instruction=document.createElement('div');instruction.className='bird-instruction';instruction.innerHTML='tap to fly<small>space works too · esc to return</small>';root.append(instruction);
    // Game over (playtest-2): the clone's replay button, twinned. Retry starts a fresh flight here; give up goes home.
    over=document.createElement('div');over.className='bird-over';over.hidden=true;
    over.innerHTML='<button type="button" data-retry>retry</button><button type="button" data-give-up>give up</button>';root.append(over);
    retryButton=over.querySelector('[data-retry]');giveUpButton=over.querySelector('[data-give-up]');
    retryButton.onclick=()=>retry();giveUpButton.onclick=()=>close(true);
    resize();
  } else {word=document.createElement('p');word.className='trailer-word';word.setAttribute('aria-live','off');root.append(word);}
  function play(src,gain=1) {const v=audio.play(src,{gain});if(v){voices.add(v);v.addEventListener('ended',()=>voices.delete(v),{once:true});}return v;}
  function flap(){if(game?.flap()){instruction.hidden=true;play(SOUNDS.flap,.55);}}
  function retry(){
    if(!game?.dead||overAt===null||closing!==null)return false;
    game=createFlight();api.game=game;deathAt=overAt=null;over.hidden=true;score.textContent='0';
    instruction.hidden=false;instruction.innerHTML='tap to fly<small>space works too · esc to give up</small>';root.focus({preventScroll:true});retries++;return true;
  }
  root.addEventListener('pointerdown',e=>{if(e.target.closest('button')||e.button>0)return;e.preventDefault();flap();});
  root.addEventListener('keydown',e=>{
    // At game over Space or Enter is retry, as the clone's Space was its replay button.
    if((e.key===' '||e.key==='Enter')&&!e.repeat&&!e.target.closest('button')){e.preventDefault();if(game?.dead)retry();else if(e.key===' ')flap();}
    if(e.key==='Tab'){e.preventDefault();const ring=[sound,exit,...(over&&!over.hidden?[retryButton,giveUpButton]:[])];ring[(ring.indexOf(document.activeElement)+(e.shiftKey?ring.length-1:1))%ring.length].focus();}
  });
  // Escape (and the return button) leave; once he has died in this sitting, leaving is giving up.
  const escape=()=>close(died);
  // Playtest 4 (flappybreak lane; Aaron, on his phone: "after I played Flappy Bird ... my drawing lines stopped
  // disappearing. The cat is no longer bobbing. I can't actually move my items"). Every exit (give up, return, Escape,
  // the trailer's end, a failed open) goes through this once, and each frozen part is given back in its own guarded
  // step, so one that throws cannot keep the rest frozen. The page's first frame back runs at dt 0 through
  // stage.restartClock(): the old timeScale-0-then-restore, run after the turn overlay's own release while the game
  // was open, read back the 0 and kept it for good (the page drew but its clock never moved).
  let restored=false;
  function restore(){
    if(restored)return;restored=true;
    const step=f=>{try{f();}catch(e){console.error('flappy restore',e);}};
    step(()=>{wallClock.cancelAnimationFrame(raf);raf=0;for(const t of timers)wallClock.clearTimeout(t);timers.clear();});
    step(()=>{for(const v of voices){try{v.stop();}catch{}} voices.clear();});
    step(()=>wordAnimation?.cancel());step(()=>root.remove());
    step(()=>document.removeEventListener('visibilitychange',visibility));step(()=>removeEventListener('resize',onResize,true));
    step(()=>{const i=input.onEscape.indexOf(escape);if(i>=0)input.onEscape.splice(i,1);});
    step(()=>saved.children.forEach(([n,inert])=>n.inert=inert));
    step(()=>saved.animations.forEach(a=>{if(a.playState==='paused')a.play();}));
    step(()=>{hiddenAudio?.();hiddenAudio=null;});
    step(()=>stage.restartClock());step(()=>{const r=resume;resume=null;r?.();});
    step(()=>{if(resized)dispatchEvent(new Event('resize'));});
    step(()=>input.lock('bird',false));
  }
  function finish(died){
    if(closed)return;closed=true;restore();
    if(saved.focus?.isConnected&&!saved.focus.inert)saved.focus.focus({preventScroll:true});
    onClose(died);return true;
  }
  function close(died){if(closed||closing!==null)return;closing={at:elapsed,died};root.classList.remove('shown');}
  function showWord(index){
    wordIndex=index;word.dataset.word=WORDS[index];word.classList.toggle('final',index===WORDS.length-1);wordAnimation?.cancel();
    // One line per slam; the red word sits in its own span (THE GAME stays one slam, one boom).
    // One wrapping span keeps the line a single grid item (bare text and a span would stack as two).
    const line=document.createElement('span');word.replaceChildren(line);
    WORDS[index].split(' ').forEach((w,i)=>{if(i)line.append(' ');line.append(w===RED_WORD?Object.assign(document.createElement('span'),{className:'red',textContent:w}):w);});
    const frames=stage.reducedMotion?[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.8},{opacity:0}]:
      [{opacity:0,transform:'scale(1.38) translateY(-5px)'},{opacity:1,transform:'scale(1) translateY(3px)',offset:.09},
       {opacity:1,transform:'scale(1.025) translateY(-1px)',offset:.17},{opacity:1,transform:'scale(1.04)',offset:.78},{opacity:0,transform:'scale(1.055)'}];
    wordAnimation=word.animate(frames,{duration:850,fill:'forwards',easing:'ease-out'});
    const at=audio.context()?.currentTime??0;play(SOUNDS.boom,.9);beats.push({word:WORDS[index],elapsed,audioAt:at,visualAt:performance.now()});
  }
  function tick(now){
    raf=0;if(closed||document.hidden)return;
    // Held still while the page is frozen over it (a phone turned upright mid-game: the "flip sideways" overlay covers
    // the game and stops the sound), as the room is; it picks up where it was when the phone turns back.
    if(site.freeze?.frozen){last=0;raf=wallClock.requestAnimationFrame(tick);return;}
    const dt=last?Math.max(0,(now-last)/1000):0;last=now;elapsed+=dt;
    if(closing!==null){if(elapsed-closing.at>=.24){finish(closing.died);return;}}
    else if(kind==='game'){
      game.step(dt);
      // No auto-close: the scoreboard waits for retry or give up (playtest-2).
      if(game.dead){if(deathAt===null){deathAt=elapsed;died=true;play(SOUNDS.pop,.55);if(game.score>best){best=game.score;store?.set('flappy.best',best);showBest();}}
        if(overAt===null&&elapsed-deathAt>.6){overAt=elapsed;over.hidden=false;instruction.hidden=true;if(document.activeElement===root)retryButton.focus({preventScroll:true});}}
      drawFlight(c,game,elapsed,stage.reducedMotion,view,overAt===null?0:stage.reducedMotion?1:(elapsed-overAt)/.25,best);
      if(score.textContent!==String(game.score)){score.textContent=game.score;site.achievements?.score(game.score);}
    }else {
      // Four slams on SLAM_GAPS, then FINAL_HOLD of quiet dark before the fade home.
      // Keep every word even after a long frame, never compress missed beats into flashes.
      const lastSlam=WORDS.length-1;
      if(wordIndex<lastSlam&&elapsed>=nextWordAt){showWord(wordIndex+1);nextWordAt=elapsed+(SLAM_GAPS[wordIndex]??FINAL_HOLD);}
      else if(wordIndex===lastSlam&&elapsed>=nextWordAt)close(true);
    }
    raf=wallClock.requestAnimationFrame(tick);
  }
  function visibility(){wallClock.cancelAnimationFrame(raf);raf=0;last=0;
    if(document.hidden){wordAnimation?.pause();hiddenAudio=audio.suspend('bird-hidden');}
    else {hiddenAudio?.();hiddenAudio=null;wordAnimation?.play();raf=wallClock.requestAnimationFrame(tick);}}
  function onResize(e){resized=true;e.stopImmediatePropagation();resize();}
  // Shown and frozen in one guarded step: a failure before it leaves nothing behind, one inside it is undone.
  try{
    document.body.append(root);root.tabIndex=-1;root.focus({preventScroll:true});later(()=>root.classList.add('shown'),16);
    input.lock('bird',true);resume=pausePageCallbacks();saved.animations.forEach(a=>a.pause());saved.children.forEach(([n])=>n.inert=true);
    input.onEscape.push(escape);document.addEventListener('visibilitychange',visibility);addEventListener('resize',onResize,true);
    raf=wallClock.requestAnimationFrame(tick);
  }catch(e){closed=true;restore();throw e;}
  const api={root,game,beats,close,retry,get view(){return {...view};},get elapsed(){return elapsed;},get active(){return !closed;},get callbacks(){return Number(!!raf)+timers.size;},get word(){return WORDS[wordIndex]??null;},
    get over(){return overAt!==null;},get died(){return died;},get retries(){return retries;},get best(){return best;}};
  return api;
}
