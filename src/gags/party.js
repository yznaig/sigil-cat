// Cake-chain boundary. The recipe owns consuming/removing the cake once eatCake() accepts it.
// This module owns a reversible mock unload and a finite celebration, never world bodies.
import { css } from '../core/util.js';
import { wallClock } from '../core/page-scheduler.js';
import { celebrate } from './party-effects.js';
// errorSeconds: how long the error page stays before he pops in over it (playtest 3, proceed-unless-objected: "After
// about 9 seconds on the error page, the cat should pop up overtop like how it does on the loading screen"); then the
// page opens like the loading screen's doors (~1.7 s more, src/ui/shell.js) and the player is back in the room.
export const PARTY = { errorSeconds:9, celebrationSeconds:4.8, reducedSeconds:1.6,
  toot:'assets/audio/designed/party-toot.wav', tootGain:.8 };
// The crash screen copies Chrome's "Aw, Snap!" page (e1112-33, Aaron's aw-snap-crash.png): Chrome's own layout,
// sad-tab icon, fonts and colours, at Chrome's own sizes (its screenshot was taken at 150% display scaling). No way
// out: no working control, no Escape, no skip; when the timer runs out the cat pops in over it, as on the loading
// screen, and it opens down the middle like the loading screen's doors. "Learn more" and "Reload" are drawn as part of
// the picture, not buttons ("itll just be a screenshot"). The page is two halves of the same picture (the right one
// hidden from screen readers), so it can open.
css('party', `
body.party-error > :not(#party-error) {visibility:hidden !important;}
#party-error {position:fixed;inset:0;z-index:1000;background:#fff;color:#646464;overflow:hidden;cursor:default;
  font:12px/1.6 'Segoe UI',Tahoma,system-ui,-apple-system,'Helvetica Neue',Roboto,Arial,sans-serif;font-stretch:normal;
  letter-spacing:normal;text-transform:none;-webkit-user-select:text;user-select:text;outline:none;}
#party-error .pe-door {position:absolute;inset:0;background:#fff;overflow:hidden;will-change:transform;}
#party-error .pe-l {clip-path:inset(0 50% 0 0);}
#party-error .pe-r {clip-path:inset(0 0 0 50%);}
#party-error.opening {background:transparent;}
body.party-pop canvas#c {visibility:visible !important;z-index:1001;pointer-events:none;transition:none;}
body.party-opening > :not(#party-error) {visibility:visible !important;}
#party-error .snap {box-sizing:border-box;width:100%;max-width:600px;margin:0 auto;padding:80px 20px 40px;}
#party-error .sad {display:block;width:50px;height:42px;margin:0 0 27px;color:#5f6368;}
#party-error h1 {margin:0 0 15px;color:#333;font-size:1.6em;font-weight:400;line-height:1.25;letter-spacing:normal;}
#party-error p {margin:0;font-size:1.1em;}
#party-error .nav {display:flex;align-items:center;justify-content:space-between;margin-top:26px;}
#party-error .learn {color:#4285f4;font-size:1.1em;}
#party-error .reload {display:inline-block;padding:7px 17px;border-radius:2px;background:#4285f4;color:#fff;
  font-size:1.1em;font-weight:600;line-height:1.6;box-shadow:0 1px 1px rgba(0,0,0,.08);}
`);
// Chrome's sad tab, redrawn as square "pixels" from the screenshot (viewBox in its own pixels).
const SAD_TAB = '<svg class="sad" viewBox="0 0 74 62" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">' +
  '<rect x="4.4" y="0" width="20" height="4"/><rect x="29.6" y="0" width="20" height="4"/><rect x="0" y="4.6" width="4" height="57.4"/>' +
  '<rect x="0" y="58" width="74" height="4"/><rect x="70" y="14.6" width="4" height="47.4"/><rect x="25" y="4.6" width="4" height="10"/>' +
  '<rect x="25" y="10.6" width="45" height="4"/><rect x="49.6" y="4.6" width="4" height="6"/>' +
  [15.6, 49.6].map((x) => [[0, 0], [6, 0], [3, 3], [0, 6], [6, 6]].map(([dx, dy]) => `<rect x="${x + dx}" y="${25.4 + dy}" width="3" height="3"/>`).join('')).join('') +
  '<rect x="17" y="48" width="6" height="2.6"/><rect x="23.6" y="44" width="21" height="2.6"/><rect x="45" y="48" width="7" height="2.6"/><rect x="52.6" y="50.6" width="7.4" height="2.4"/></svg>';
export default function createParty(site) {
  const {stage,cat,audio,input}=site;
  let run=null, effects=null, returns=0, toots=0;
  audio.load(PARTY.toot);
  // The way back (playtest 3): the page runs again under the error page, he pops in over it, it opens like the
  // loading screen's doors, and the room is back. Input stays locked until the end; still no skip.
  async function reopen(r) {
    if(run!==r||r.reopening)return;r.reopening=true;
    r.release();
    const body=document.body.classList,[l,rt]=r.root.querySelectorAll('.pe-door');
    if(!stage.reducedMotion)body.add('party-pop');   // (calm: the page just fades off the room, no canvas over it)
    try{
      await site.shell.popOver({
        beforeDoors(){r.root.classList.add('opening');body.add('party-opening');},
        move(e){l.style.transform=`translate3d(${(-e*50).toFixed(3)}%,0,0)`;rt.style.transform=`translate3d(${(e*50).toFixed(3)}%,0,0)`;},
        fade:()=>r.root.animate([{opacity:1},{opacity:0}],{duration:600,easing:'ease-in-out',fill:'forwards'}).finished.catch(()=>{}),
      });
    }catch(e){console.error('party reopen',e);}
    finally{body.remove('party-pop','party-opening');}
    restore(r);
  }
  function restore(r) {
    if(run!==r)return;
    run=null;wallClock.clearTimeout(r.timer);
    r.root.remove();document.body.classList.remove('party-error');
    r.children.forEach(([node,inert])=>{node.inert=inert;});
    // The shared freeze (src/core/freeze.js) resumes the loop at dt = 0, the timers, the sound and a resize that
    // happened while the page was away.
    r.release();
    input.lock('party',false);
    if(r.focus?.isConnected)r.focus.focus({preventScroll:true});
    // Existing hat API: unit 7 replaces its art without any dependency on this module.
    // The cake gives the party hat (and the rack to hang it on) and nothing else (playtest 2, gags lane).
    site.eggs.hat.wear('party',{gift:true});
    effects=celebrate(site,stage.reducedMotion?PARTY.reducedSeconds:PARTY.celebrationSeconds);
    if(audio.play(PARTY.toot,{gain:PARTY.tootGain}))toots++;
    returns++;r.resolve(true);
  }
  function eatCake() {
    if(run)return run.promise;
    // A recipe should offer eating only in normal play. Refuse competing cinematics/pose swaps.
    if(input.locked||effects?.active||!stage.loaded||cat.hidden||cat.standIn||cat.popping||site.eggs.butterman?.running||site.eggs.hat?.busy)return Promise.resolve(false);
    const r={focus:document.activeElement,children:[...document.body.children].map(n=>[n,n.inert]),resolve:null};
    r.promise=new Promise(resolve=>r.resolve=resolve);run=r;
    input.lock('party',true);
    r.release=site.freeze.hold('party');
    r.children.forEach(([n])=>n.inert=true);
    document.body.classList.add('party-error');
    const root=document.createElement('section');r.root=root;root.id='party-error';root.tabIndex=-1;
    root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','party-error-title');
    const snap=(title)=>`<div class="snap">${SAD_TAB}<h1${title?' id="party-error-title"':''}>Aw, Snap!</h1>
      <p>Something went wrong while displaying this webpage.</p>
      <div class="nav" aria-hidden="true"><span class="learn">Learn more</span><span class="reload">Reload</span></div></div>`;
    root.innerHTML=`<div class="pe-door pe-l">${snap(true)}</div><div class="pe-door pe-r" aria-hidden="true">${snap(false)}</div>`;
    document.body.append(root);
    // Nothing on it can be reached: Tab stays put, and Escape does nothing here (e1112-33, e1112-41).
    root.addEventListener('keydown',e=>{if(e.key==='Tab')e.preventDefault();});
    root.focus({preventScroll:true});
    r.timer=wallClock.setTimeout(()=>reopen(r),PARTY.errorSeconds*1000);
    return r.promise;
  }
  return {eatCake,get state(){return {active:!!run,reopening:!!run?.reopening,returns,toots,effects:!!effects?.active,
    confetti:effects?.confetti||0,blower:!!effects?.blower,sides:effects?.sides||0};}};
}
