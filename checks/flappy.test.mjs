import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLAYER,PLAYER_SCALE,PLAYFIELD,SHORT_FIELD_HEIGHT,flightLayout} from '../src/flappy/config.js';
import {OVER_BUTTONS} from '../src/flappy/art.js';
import {playerFrame} from '../src/flappy/art.js';
import {createFlight,bodyHitsRect} from '../src/flappy/physics.js';
const layout=JSON.parse(readFileSync(PLAYER.src.replace('.png','.frames.json')));
for(const key of ['frameWidth','frameHeight','columns','order','pivot','fitBodyTo'])assert.deepEqual(PLAYER[key],layout[key]);
for(const key of ['x','y','width','height'])assert.equal(PLAYER.body[key],layout.body[key]);
assert.deepEqual([0,.11,.21,.31,.41].map(t=>playerFrame(t)),[0,1,2,1,0]);
assert.deepEqual([0,.26,.51,.76,1.01].map(t=>playerFrame(t,false,true)),[0,1,2,1,0]);
assert.equal(playerFrame(200,true),1);
console.log('CHECK bird shared config matches sprite layout and both flap sequences: PASS');
const bird={vx:0,vy:0,width:PLAYER.body.width*PLAYER_SCALE,height:PLAYER.body.height*PLAYER_SCALE,rotation:0};
assert(bodyHitsRect(bird,-1,-1,2,2));
assert(!bodyHitsRect(bird,15,-10,1,1),'transparent body corner must not collide');
assert(!bodyHitsRect(bird,-17,-20,1,1),'upward wing tip must not collide');
assert(bodyHitsRect(bird,16,-1,2,2));
bird.rotation=Math.PI/2;
assert(bodyHitsRect(bird,-1,16,2,2));
assert(!bodyHitsRect(bird,15,-1,1,1));
console.log('CHECK bird ellipse hitbox follows the body and rotation, excluding corners and wing tips: PASS');
const landing=createFlight();landing.flap();
for(let i=0;i<240&&!landing.dead;i++)landing.step(1/120);
assert(landing.dead);
const extent=Math.hypot(landing.bird.width/2*Math.sin(landing.bird.rotation),landing.bird.height/2*Math.cos(landing.bird.rotation));
assert(Math.abs(landing.bird.vy+extent-landing.floor)<1e-8);
console.log('CHECK flappy natural floor death stops the body at the ground without penetration: PASS');
for(const [width,height] of [[1280,900],[390,844]]){
 const view=flightLayout(width,height);
 assert.equal(view.width/view.height,288/512);
 assert(Math.abs(view.x*2+view.width-width)<1e-8&&Math.abs(view.y*2+view.height-height)<1e-8);
 assert(view.x>=0&&view.y>=0);assert(PLAYER.body.width*PLAYER_SCALE*view.scale>=46);
 if(width>height)assert(view.x>0);
 console.log(`CHECK flappy ${width}x${height} centres the portrait field with a classic-size bird: PASS`);
 const game=createFlight(()=>.5);assert.equal(game.width,PLAYFIELD.width);game.flap();let steps=0;
 while(game.score<5&&!game.dead&&steps++<3600){if(game.bird.vy>210&&game.bird.velocity>0)game.flap();game.step(1/120);}
 assert(!game.dead);assert.equal(game.score,5);
 for(let i=0;i<240&&!game.dead;i++)game.step(1/120);
 assert(game.dead);assert.equal(game.flap(),false);
 const before=JSON.stringify([game.bird,game.pipes,game.score]);game.step(1);assert.equal(JSON.stringify([game.bird,game.pipes,game.score]),before);
 console.log(`CHECK flappy ${width}x${height} clears five classic gates, scores, dies and stays stopped: PASS`);
}
// Playtest-2: a phone held sideways (the site is landscape-only on phones). The field fits its lane and ground to
// 40 px below the floor (the rest of the ground is cropped), so the bird is bigger than whole-field fit allows; the
// game-over scoreboard and its retry / give up buttons sit wholly on screen and above the floor, at a tappable size.
for(const [width,height] of [[844,390],[667,375],[932,430]]){
 const view=flightLayout(width,height),body=PLAYER.body.width*PLAYER_SCALE*view.scale,whole=Math.min(width/288,height/512);
 assert(view.short&&view.scale>whole*1.1&&Math.abs(view.y*2+SHORT_FIELD_HEIGHT*view.scale-height)<1e-8&&view.y>=0&&view.x>0,JSON.stringify(view));
 assert(Math.abs(view.x*2+view.width-width)<1e-8);
 const b=OVER_BUTTONS,top=view.y+b.y*view.scale,bottom=view.y+(b.y+b.h)*view.scale;
 assert(b.y+b.h+18<PLAYFIELD.floor&&top>0&&bottom<height&&b.h*view.scale>=44&&b.w*view.scale>=44&&b.retry+b.w<=b.giveUp&&b.giveUp+b.w<=288);
 console.log(`CHECK flappy ${width}x${height} landscape phone: field ${view.width.toFixed(0)}x${(SHORT_FIELD_HEIGHT*view.scale).toFixed(0)} px, bird body ${body.toFixed(1)} px (whole-field fit ${(PLAYER.body.width*PLAYER_SCALE*whole).toFixed(1)}), buttons ${(b.w*view.scale).toFixed(0)}x${(b.h*view.scale).toFixed(0)} px on screen: PASS`);
}
