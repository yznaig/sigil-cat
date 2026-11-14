// Kitchen lane (e1111-58): once found, the controller's mark in the row at the bottom starts the flappy game again,
// with the same return to the page, and gives no second controller.
cat.auto=false;const B=E.bird;
// The game screen pauses the page's own timers (src/core/page-scheduler.js): wait on the wall clock meanwhile.
const {wallClock}=await import(new URL('src/core/page-scheduler.js',document.baseURI));
const wsleep=ms=>new Promise(r=>wallClock.setTimeout(r,ms));
const wuntil=async(f,ms=6000)=>{const t=performance.now();while(performance.now()-t<ms){if(f())return true;await wsleep(40);}return false;};
check('replay the game mark is not a button before it is found',!document.querySelector('#marks button[data-find=bird]'));
registry.find('bird',{quiet:true});await sleep(200);
const mark=document.querySelector('#marks button[data-find=bird]');
check('replay the controller mark is a button once found',!!mark);
const r=mark.getBoundingClientRect();await __pointer([{x:r.x+r.width/2,y:r.y+r.height/2}]);
check('replay pressing it opens the flappy game',await wuntil(()=>document.querySelector('#bird-screen')&&B.screen?.game)&&B.stats.replays===1);
await wsleep(500);await __shot('kitchen-replay-game');
B.debug.death();
// Playtest-2: the game over waits for retry or give up.
await wuntil(()=>B.screen?.over,3000);{const g=document.querySelector('#bird-screen [data-give-up]').getBoundingClientRect();await __pointer([{x:g.x+g.width/2,y:g.y+g.height*.35}]);}
check('replay dying, then give up, returns to the page',await wuntil(()=>!document.querySelector('#bird-screen')&&!B.screen)&&!input.locked);
// Playtest-2: any flappy death with no controller anywhere leaves one (a keepsake now; a lost one can come back),
// and never a second.
check('replay a death with no controller anywhere leaves one',await wuntil(()=>keepsakes.get('controller')?.worldReady,20000));
// Again, and leave with the return button.
await __pointer([{x:r.x+r.width/2,y:r.y+r.height/2}]);await wuntil(()=>B.screen?.game);await wsleep(300);
const exit=document.querySelector('#bird-screen [data-exit]').getBoundingClientRect();await __pointer([{x:exit.x+exit.width/2,y:exit.y+exit.height/2}]);
check('replay the return button comes back too, with no second controller',await wuntil(()=>!B.screen,4000)&&!input.locked&&B.stats.replays===2&&[...keepsakes.live.keys()].filter(id=>id==='controller').length===1);
