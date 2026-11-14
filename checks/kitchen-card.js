// Kitchen lane (e1111-58): once any two of flour, butter, milk and egg are held, a recipe card flutters down; the
// player can pin it to the board like the paper, postcard and ticket, and a tap reads it as a flat sheet (playtest-2:
// a click views a card, a press and move drags it). Playtest 3: nothing goes onto the board by itself; the sheet has
// one small (x) and no 3D reader exists any more.
cat.auto=false;const C=E.box.recipe,W=site.world;
C.source('bread');C.source('bread');await keepsakes.get('flour').worldTask;await sleep(200);
check('card one ingredient is not enough',!keepsakes.has('recipe')&&!C.state.card);
await C.dropEgg({x:stage.width*.4,y:stage.height*.3});await sleep(100);
check('card two ingredients bring the recipe card',await until(()=>keepsakes.get('recipe')?.worldReady,6000)&&C.state.card);
const card=keepsakes.get('recipe');await sleep(stage.reducedMotion?0:350);await __shot('kitchen-card-falling');
await until(()=>card.worldEntry.body.isSleeping(),15000);await sleep(300);
check('card lands on the floor on the page',card.worldEntry.body.translation().y<.1&&card.picture.rect.y+card.picture.rect.h<stage.height-stage.insets.bottom+4,JSON.stringify(card.picture.rect));
await __shot('kitchen-card-floor');
// The board: a second flat card brings it (as before); pin the recipe on it.
keepsakes.give('postcard');await keepsakes.get('postcard').worldTask;await site.pinboard.ensure();await until(()=>!site.pinboard.arriving,15000);await sleep(400);
check('card the board arriving pins neither card: the player places them',!card.worldEntry.support&&!keepsakes.get('postcard').worldEntry.support);
check('card pins to the board',site.pinboard.pin('recipe',false)&&card.worldEntry.support?.id==='pinboard',JSON.stringify(card.worldEntry.support));
site.pinboard.pin('postcard',false);site.pinboard.select('recipe');await sleep(400);await __shot('kitchen-card-board');
// A tap reads it (the flat sheet); a long still press is still only a view, never the old 3D turn-over reader.
{const b=card.picture.attached?site.pinboard.picture.rect:card.picture.rect;let spot=null;
 for(let y=b.y+4;y<b.y+b.h-4&&!spot;y+=4)for(let x=b.x+4;x<b.x+b.w-4;x+=4){const h=site.worldInput.pick({clientX:x,clientY:y});if(h?.entry===card.worldEntry){spot={x,y};break;}}
 if(spot){const id=++pointerIds;fire('pointerdown',spot.x,spot.y,id);await sleep(80);fire('pointerup',spot.x,spot.y,id,0);}
 const sheet=await until(()=>document.querySelector('.recipe-read'),3000);
 check('card a tap reads it as the flat sheet, its one control a small (x)',!!spot&&sheet&&/Cake in a box/.test(document.querySelector('.recipe-read').textContent)&&document.querySelectorAll('.recipe-read button').length===1&&!!document.querySelector('.recipe-read .sheet-x'),JSON.stringify(spot));
 await sleep(300);await __shot('kitchen-card-read');
 await __key('Escape');await sleep(200);
 if(spot){const id=++pointerIds;fire('pointerdown',spot.x,spot.y,id);await sleep(650);fire('pointerup',spot.x,spot.y,id,0);}
 await sleep(300);
 check('card a long still press views it too, the same sheet',!!document.querySelector('.recipe-read')&&document.querySelectorAll('.recipe-read button').length===1&&card.worldEntry.support?.id==='pinboard',String(card.worldEntry.support?.id));
 await __key('Escape');await sleep(200);}
store.flush();
