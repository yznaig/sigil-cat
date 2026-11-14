// e1111-11. One delayed discovery, one game death, one physical controller, one punchline.
// Playtest-2 (bird lane): the bird is a visitor. It first comes 90 s into a player's first visit; afterwards it comes
// back after a random 1.5 to 5 minutes without it, never longer (the limiter), counted in visible play time and
// kept across reloads. It circles for 2.5 minutes, or until a flappy death, then flies off. Each time it comes and the
// player has no egg anywhere (room, inventory, box), it lets one go (src/world/recipes.js decides). The controller is
// now a keepsake: the first click plays the trailer and brings a wooden stand (src/flappy/stand.js); later clicks
// play flappy.
import {css} from '../core/util.js';
import {birdSVG,flightArt,playerFrame} from '../flappy/art.js';
import {PLAYER} from '../flappy/config.js';
// Distant bird size in px (was 27; Aaron: "a bit bigger").
const SIZE=40;
export const VISITS={first:90000,gap:[90000,300000],cap:300000,stay:150000,settle:15000,leave:2.4};
css('distant-bird',`
.distant-bird{position:absolute;width:${SIZE}px;height:${Math.round(SIZE*24/27)}px;left:0;top:0;opacity:.64;will-change:transform;pointer-events:none}
.distant-bird svg{width:100%;height:100%;overflow:visible}.distant-bird .wing{transform-origin:0 0}
.distant-bird.sprite{background-repeat:no-repeat;image-rendering:pixelated}
.bird-orbit-focus{position:fixed;pointer-events:none;border:1px dashed #786e5a80;border-radius:50%;display:none}
.bird-key{position:fixed;left:-9999px;top:76px;z-index:6}.bird-key:focus-visible{left:18px;padding:10px;background:#302f29;color:#f7ede3}
body:has(.bird-key:focus-visible) .bird-orbit-focus{display:block}
`);
export default function createBird(site) {
  const {stage,input,cat,keepsakes,audio,store}=site;
  const num=(v,d=0)=>v!==null&&v!==undefined&&Number.isFinite(+v)?+v:d;
  const draw=()=>VISITS.gap[0]+Math.random()*(VISITS.gap[1]-VISITS.gap[0]);
  // away: visible play time since the bird was last here. gap: how long this absence lasts (drawn when it leaves).
  // The page's open time before this module armed counts too, so the first visit still means 90 s after opening.
  let away=num(store.get('bird.away'))+performance.now(),gap=Math.min(VISITS.cap,num(store.get('bird.gap'),store.get('bird.seen')?draw():VISITS.first));
  let state='waiting',timer=null,armedAt=0,forced=null,stayLeft=VISITS.stay,flightTime=0,leaving=null,eggOwed=false;
  let bird=null,key=null,focusRing=null,listening=false,screen=null,resources=null;
  const stats={frames:0,appearedAt:null,arrivals:0,departures:0,eggCalls:0,gameStarts:0,returns:0,payoffs:0,beats:[],loads:0,replays:0};
  const circle={x:0,y:0,rx:0,ry:0};
  function layout(){
    circle.x=stage.width*.73;circle.y=Math.max(stage.insets.top+90,stage.height*.28);
    circle.rx=Math.min(80,stage.width*.15);circle.ry=27;
    if(focusRing)Object.assign(focusRing.style,{left:(circle.x-circle.rx-18)+'px',top:(circle.y-circle.ry-18)+'px',width:(circle.rx*2+36)+'px',height:(circle.ry*2+36)+'px'});
  }
  function hit(x,y){return state==='flying'&&!input.locked&&!cat.hidden&&((x-circle.x)/(circle.rx+24))**2+((y-circle.y)/(circle.ry+24))**2<=1;}
  function unlisten(){const i=stage.onFrame.indexOf(tick);if(i>=0)stage.onFrame.splice(i,1);listening=false;}
  function listen(){if(!listening&&(state==='flying'||state==='leaving')&&!document.hidden){stage.onFrame.push(tick);listening=true;}}
  function position(){const a=flightTime*(stage.reducedMotion?.24:.36);return {x:circle.x+Math.cos(a)*circle.rx,y:circle.y+Math.sin(a)*circle.ry};}
  function tick(dt){
    stats.frames++;if(!bird)return;
    bird.hidden=input.locked||cat.hidden;if(key)key.disabled=bird.hidden||state!=='flying';if(bird.hidden)return;
    // An arrival during a cutscene owes its egg until the bird can be seen letting it go.
    if(eggOwed&&state==='flying'){eggOwed=false;dropEgg();}
    flightTime+=dt;const a=flightTime*(stage.reducedMotion?.24:.36);let {x,y}=position(),opacity=.64;
    let facing=-Math.sin(a)>=0?1:-1;
    if(leaving){
      // Off it goes: out along the right and up, fading over the last stretch. Reduced motion: a fade where it is.
      leaving.t+=dt;const u=Math.min(1,leaving.t/(stage.reducedMotion?1:VISITS.leave));
      if(!stage.reducedMotion){x=leaving.x+(stage.width+60-leaving.x)*u*u;y=leaving.y-u*90;facing=1;}else{x=leaving.x;y=leaving.y;}
      opacity=.64*Math.min(1,(1-u)*2.5);if(u>=1){gone();return;}
    }
    const sprite=flightArt().player,ratio=SIZE/PLAYER.frameWidth;
    const anchor=sprite?PLAYER.pivot.map(v=>v*ratio):[SIZE/2,SIZE*12/27];
    bird.style.transform=`translate3d(${x-anchor[0]}px,${y-anchor[1]}px,0) scale(${facing*(.78+.12*Math.sin(a))},${.78+.12*Math.sin(a)})`;
    if(bird.style.opacity!==String(opacity))bird.style.opacity=opacity;
    if(sprite){
      if(!bird.classList.contains('sprite')){
        bird.innerHTML='';bird.classList.add('sprite');bird.dataset.playerSource=PLAYER.src;
        Object.assign(bird.style,{width:SIZE+'px',height:PLAYER.frameHeight*ratio+'px',backgroundImage:`url("${PLAYER.src}")`,backgroundSize:`${PLAYER.columns*SIZE}px ${PLAYER.frameHeight*ratio}px`,transformOrigin:anchor.map(v=>v+'px').join(' ')});
      }
      const frame=playerFrame(flightTime,stage.reducedMotion,true);
      if(bird.dataset.frame!==String(frame)){bird.dataset.frame=String(frame);bird.style.backgroundPosition=(-frame*SIZE)+'px 0';}
    }else bird.querySelector('.wing').style.transform=stage.reducedMotion?'none':`scaleY(${.5+.5*Math.cos(flightTime*4.8)})`;
  }
  function clearBird(){unlisten();bird?.remove();key?.remove();focusRing?.remove();bird=key=focusRing=null;}
  async function prepare(){
    if(!resources){stats.loads++;resources=import('../flappy/screen.js').then(async m=>{await Promise.all([m.loadFlightArt(),audio.loadAll(Object.values(m.SOUNDS)),document.fonts.load('110px BirdTrailer')]);return m;});}
    return resources;
  }
  function save(){store.set('bird.away',Math.round(away));store.set('bird.gap',Math.round(gap));}
  // ---- The one timer: in 'waiting' it brings the bird, in 'flying' it sends it off. Hidden tabs pause it. ----
  function due(){
    if(state==='flying')return stayLeft;
    if(forced!==null)return forced;
    return Math.max(VISITS.settle-performance.now(),Math.min(gap,VISITS.cap)-away);
  }
  function arm(){
    if(timer!==null||document.hidden||(state!=='waiting'&&state!=='flying'))return;
    armedAt=performance.now();timer=setTimeout(fire,Math.max(0,due()));
  }
  function pauseTimer(){
    if(timer===null)return;clearTimeout(timer);timer=null;const spent=performance.now()-armedAt;
    if(state==='waiting'){away+=spent;if(forced!==null)forced=Math.max(0,forced-spent);save();}
    else if(state==='flying')stayLeft=Math.max(0,stayLeft-spent);
  }
  function fire(){
    timer=null;const spent=performance.now()-armedAt;
    if(state==='waiting'){away+=spent;forced=null;appear();}
    else if(state==='flying'){stayLeft=0;leave();}
  }
  function appear(){
    if(state!=='waiting'||document.hidden){arm();return;}
    state='flying';stats.appearedAt=performance.now();stats.arrivals++;stayLeft=VISITS.stay;flightTime=0;leaving=null;
    away=0;gap=draw();store.set('bird.seen',true);save();showBird();
    // Media and game code start only once the secret itself exists.
    prepare();
    // As it flies on, it lets an egg go when the player has none anywhere (e1111-58; playtest-2: every visit).
    setTimeout(()=>{if(state!=='flying')return;if(bird&&!bird.hidden)dropEgg();else eggOwed=true;},stage.reducedMotion?200:1400);
    arm();
  }
  function dropEgg(){stats.eggCalls++;dispatchEvent(new CustomEvent('sigilcat:bird-egg',{detail:position()}));}
  function leave(){
    if(state!=='flying')return;
    if(timer!==null){clearTimeout(timer);timer=null;}
    if(!bird||document.hidden||bird.hidden){gone();return;}
    state='leaving';eggOwed=false;const p=position();leaving={t:0,x:p.x,y:p.y};if(key)key.disabled=true;listen();
  }
  function gone(){
    clearBird();leaving=null;eggOwed=false;state='waiting';stats.departures++;away=0;gap=draw();save();arm();
  }
  function showBird(){
    bird=document.createElement('div');bird.className='distant-bird';bird.innerHTML=birdSVG;document.getElementById('back').append(bird);
    focusRing=document.createElement('div');focusRing.className='bird-orbit-focus';document.getElementById('back').append(focusRing);
    key=document.createElement('button');key.className='bird-key';key.type='button';key.textContent='Follow the distant bird';key.onclick=start;document.body.append(key);
    layout();tick(0);listen();
  }
  // ---- The controller (src/flappy/controller.js): a keepsake now, kept across reloads. ----
  const controllerAnywhere=()=>keepsakes.has('controller')||!!site.eggs?.box?.recipe?.chest?.some(e=>e?.id==='controller');
  let controllerModule=null;
  const loadController=()=>controllerModule??=import('../flappy/controller.js').then(m=>{if(!keepsakes.defs.has('controller'))m.defineController(site,useController);return m;});
  // A saved controller (and its stand) come back with the page; nothing else of the bird loads before it arrives.
  const chestController=(store.get('cakeChain')?.chest||[]).some(e=>e?.id==='controller');
  // The stand belongs to a controller whose trailer has been seen (an older save may have the find and no stand yet).
  const standDue=()=>store.get('bird.stand')||site.registry.has('bird')&&controllerAnywhere();
  if(store.get('keepsakes.controller')||store.get('bird.stand')||chestController)loadController().then(m=>{if(standDue()){store.set('bird.stand',true);m.ensureStand(site);}}).catch(e=>console.error('controller',e));
  let focusAfter=false;
  function afterGame(died){
    // Any flappy death leaves a controller in the room if there is none anywhere (a lost one can always come back).
    if(died&&!controllerAnywhere()){const inst=keepsakes.give('controller');if(focusAfter)inst?.key.querySelector('button')?.focus({preventScroll:true});
      if(site.registry.has('bird')&&!store.get('bird.stand')){store.set('bird.stand',true);loadController().then(m=>m.ensureStand(site,{arrive:true}));}}
  }
  async function start(){
    if(state!=='flying'||input.locked||cat.hidden)return false;
    focusAfter=document.activeElement===key;
    // Reserve synchronously so two taps cannot race the lazy imports.
    pauseTimer();state='loading';clearBird();input.lock('bird-load',true);site.achievements?.unlock('birdwatch');
    try {
      const [m]=await Promise.all([prepare(),loadController()]);
      input.lock('bird-load',false);state='game';stats.gameStarts++;
      screen=m.openScreen(site,'game',died=>{
        screen=null;stats.returns++;
        // A death sends the bird off (it comes back within the limiter); leaving alive keeps it circling, afresh.
        if(died){afterGame(true);gone();}
        else {state='flying';stayLeft=VISITS.stay;showBird();arm();if(focusAfter)key.focus({preventScroll:true});}
      });
      return true;
    }catch(e){input.lock('bird-load',false);state='flying';showBird();arm();console.error('bird game',e);return false;}
  }
  let trailer=false;
  async function useController(inst){
    if(input.locked||trailer||screen||!inst?.worldEntry)return false;
    const keyboardEntry=inst.key.contains(document.activeElement);
    // Found already (the trailer has been seen): the controller plays the game, wherever it sits.
    if(site.registry.has('bird'))return replay(keyboardEntry);
    trailer=true;input.lock('bird-load',true);
    try{
      const m=await prepare();
      input.lock('bird-load',false);stats.payoffs++;site.registry.find('bird',{quiet:true});
      // The controller stays (playtest-2); the dark screen fades in over the room, and the stand is there after it.
      const run=m.openScreen(site,'trailer',()=>{stats.beats=run.beats;screen=null;trailer=false;
        store.set('bird.stand',true);store.flush();loadController().then(c=>c.ensureStand(site,{arrive:true}));
        if(keyboardEntry)stage.canvas.focus({preventScroll:true});});screen=run;
      return true;
    }catch(e){input.lock('bird-load',false);trailer=false;console.error('bird trailer',e);return false;}
  }
  // The controller's mark in the row at the bottom, and the controller itself once found, play the game again
  // (e1111-58), with retry / give up at its end.
  async function replay(keyboardEntry=false){
    if(screen||trailer||input.locked||cat.hidden||state==='loading')return false;
    focusAfter=false;input.lock('bird-load',true);
    try{const [m]=await Promise.all([prepare(),loadController()]);input.lock('bird-load',false);stats.gameStarts++;stats.replays++;
      // The circling bird waits out the game (the page's timers are frozen), and keeps circling after.
      screen=m.openScreen(site,'game',died=>{screen=null;stats.returns++;afterGame(died);if(keyboardEntry)stage.canvas.focus({preventScroll:true});});return true;}
    catch(e){input.lock('bird-load',false);console.error('bird replay',e);return false;}
  }
  input.claim(42,e=>{
    if(!hit(e.clientX,e.clientY))return null;
    const x=e.clientX,y=e.clientY;let moved=false;
    return {move(ev){if(Math.hypot(ev.clientX-x,ev.clientY-y)>12)moved=true;},end(ev){if(!moved&&ev.type==='pointerup')start();}};
  });
  input.cursors.push(e=>hit(e.clientX,e.clientY)?'pointer':null);
  stage.onResize.push(layout);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){pauseTimer();unlisten();}else{arm();listen();}
  });
  // A reload or a closed tab keeps the time spent waiting (the 5-minute limiter holds across visits).
  addEventListener('pagehide',()=>{if(state==='waiting'){pauseTimer();store.flush();}});
  layout();arm();
  return {find:'bird',again:()=>replay(),replay,start,hit,leave,get screen(){return screen;},get state(){return state;},get circle(){return {...circle};},
    get stats(){return {...stats,beats:screen?.beats??stats.beats,listening,timer:timer!==null,callbacks:Number(listening)+(screen?.callbacks||0)};},
    get schedule(){return {away:Math.round(away+(state==='waiting'&&timer!==null?performance.now()-armedAt:0)),gap:Math.round(gap),stayLeft:Math.round(stayLeft),due:Math.round(due())};},
    // Only the dedicated headless fixture gets a skip; ordinary visits cannot summon it early.
    debug:stage.opt('birdcheck')==='1'?{
      skipTo(seconds){if(state!=='waiting')return false;pauseTimer();forced=Math.max(0,VISITS.first-seconds*1000);arm();return true;},
      stay(ms){if(state!=='flying')return false;pauseTimer();stayLeft=ms;arm();return true;},
      death(){if(!screen?.game)return;screen.game.bird.play=true;screen.game.bird.vy=screen.game.floor;}}:null};
}
