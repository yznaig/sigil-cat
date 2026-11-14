// Modified from nebez/floppybird js/main.js (Apache-2.0): gameloop, playerJump,
// updatePlayer, updatePipes and score-after-clearing. See vendor/floppybird/SOURCES.md.
// Changes: seconds/120Hz simulation, fixed portrait area, body-only ellipse,
// callback-owned lifecycle instead of jQuery/global timers, no cookies or audio.
// Earlier module scaffolding: Varun Pant's MIT CrappyBird, retained in vendor/crappybird.
import {PLAYER,PLAYER_SCALE,PLAYFIELD} from './config.js';
// Ellipse/rectangle overlap: transform each rectangle edge into the body's unit
// circle. Wing tips, transparent corners and the sprite's ear are not obstacles.
export function bodyHitsRect(bird,x,y,w,h){
  if(bird.vx>=x&&bird.vx<=x+w&&bird.vy>=y&&bird.vy<=y+h)return true;
  const co=Math.cos(bird.rotation),si=Math.sin(bird.rotation),rx=bird.width/2,ry=bird.height/2;
  const points=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([px,py])=>{const dx=px-bird.vx,dy=py-bird.vy;return [(dx*co+dy*si)/rx,(-dx*si+dy*co)/ry];});
  return points.some((a,i)=>{const b=points[(i+1)%4],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/(dx*dx+dy*dy||1)));return (a[0]+t*dx)**2+(a[1]+t*dy)**2<=1;});
}
export function createFlight(random = Math.random) {
  const {width,height,floor}=PLAYFIELD;
  // Upstream's 0.25 px/frame² and -4.6 px/frame, converted from its 60Hz loop.
  const bird = { vx: 77, vy: 192, width: PLAYER.body.width*PLAYER_SCALE, height: PLAYER.body.height*PLAYER_SCALE,
    gravity: .25*60*60, velocity: 0, jump: -4.6*60, rotation: 0, play: false };
  const gap=90,speed=1000/7.5,spacing=speed*1.4,pipes=[];
  let score = 0, dead = false, accumulator = 0, distance = 0;
  const nextGap=()=>80+Math.floor(random()*(floor-gap-160))+gap/2;
  function pipe(x) {
    return { centerX: x, centerY: nextGap(), w: 52, h: floor, passed: false,
      respawn() { this.centerX = Math.max(...pipes.map(p => p.centerX)) + spacing;
        this.centerY = nextGap(); this.passed = false; } };
  }
  const first = width+32;
  for (let x = first; x < first + Math.ceil(width / spacing + 2) * spacing; x += spacing) pipes.push(pipe(x));
  function collides(p) {
    const upper=p.centerY-gap/2,lower=p.centerY+gap/2;
    return bodyHitsRect(bird,p.centerX,0,p.w,upper)||bodyHitsRect(bird,p.centerX,lower,p.w,floor-lower);
  }
  function flap() { if (dead) return false; bird.play = true; bird.velocity = bird.jump; return true; }
  function step(dt) {
    if (!bird.play || dead) return;
    accumulator += Math.min(.05, dt);
    while (accumulator >= 1 / 120 && !dead) {
      accumulator -= 1 / 120;
      bird.velocity += bird.gravity / 120; bird.vy += bird.velocity / 120;
      bird.rotation = Math.min((bird.velocity / 600) * Math.PI / 2, Math.PI/2);
      distance += speed / 120;
      for (const p of pipes) {
        p.centerX -= speed / 120;
        if (p.centerX < -p.w) p.respawn();
        if (!p.passed && bird.vx - bird.width / 2 > p.centerX + p.w) { p.passed = true; score++; }
        if (collides(p)) dead = true;
      }
      const extent=Math.hypot(bird.width/2*Math.sin(bird.rotation),bird.height/2*Math.cos(bird.rotation));
      if (bird.vy + extent >= floor) {bird.vy=floor-extent;dead=true;}
      // Upstream clamps the ceiling instead of treating it as a death.
      if (bird.vy < extent) bird.vy=extent;
    }
  }
  return { bird, pipes, floor, gap, width, height, flap, step,
    get dead() { return dead; }, get score() { return score; }, get distance() { return distance; } };
}
