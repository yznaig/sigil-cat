// World polish lane (e1111-58, item 9): the rejected paper wears its pre-unit-5 photocopy look as a 3D card, and opens
// as the same sheet it did before. Run with checks/lib.js.
cat.auto=false;
const paper=keepsakes.give('paper');await paper.worldTask;
await until(()=>!site.world.stats.listening,15000);
const front=paper.prints[0].canvas,back=paper.prints[1].canvas,px=front.getContext('2d').getImageData(0,0,front.width,front.height).data;
let colour=0,dark=0;for(let i=0;i<px.length;i+=4*7){colour=Math.max(colour,Math.abs(px[i]-px[i+1]),Math.abs(px[i+1]-px[i+2]));if(px[i]<90)dark++;}
check('the card is printed as the grey photocopy (no colour)',colour<=3,`largest channel difference ${colour}`);
// the stamp sits where the old sheet had it (left 12%, top 36%, tilted): a dense patch of black there
const s=front.getContext('2d').getImageData(front.width*.15,front.height*.36,front.width*.5,front.height*.12).data;let ink=0;for(let i=0;i<s.length;i+=4)if(s[i]<80)ink++;
check('REJECTED is stamped across it',ink/(s.length/4)>.12,`${(100*ink/(s.length/4)).toFixed(1)}% ink in the stamp band`);
check('the text is the old greyed bars, not set type',paper.prints[0].glyph>40);
const b=back.getContext('2d').getImageData(0,0,back.width,back.height).data;let bdark=0;for(let i=0;i<b.length;i+=4*7)if(b[i]<120)bdark++;
check('its back is the blank side of the sheet',bdark<dark*.05,`${bdark} dark samples on the back, ${dark} on the front`);
await __shot('polish-paper-card');
// tap it: the sheet opens as before
const r=paper.picture.rect;await tap(r.x+r.w/2,r.y+r.h*.5);await sleep(300);
const sheet=document.querySelector('.paper-read .sheet');
check('tapping it opens the old reading sheet, with one small (x) and no other button',!!sheet&&E.paradox.reading&&document.querySelectorAll('.paper-read button').length===1&&!!document.querySelector('.paper-read .sheet-x')&&getComputedStyle(sheet).fontFamily.includes('Times')&&/Please do not send more toast/.test(sheet.textContent));
await __shot('polish-paper-read');
{const f=document.querySelector('.paper-read .sheet-frame').getBoundingClientRect();await __pointer([{x:Math.max(6,f.x/2),y:stage.height/2}]);await sleep(100);}   // a real click off to the side (playtest 3)
check('a tap outside the sheet puts it down',!E.paradox.reading&&!document.querySelector('.paper-read')&&!input.locked);
site.cards.read('paper');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
check('Esc puts it down too',!E.paradox.reading&&!input.locked);
