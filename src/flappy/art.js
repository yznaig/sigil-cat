import {PLAYER,PLAYER_SCALE,CLONE_IMAGES} from './config.js';
// Modified Canvas presentation of nebez/floppybird's Apache-2.0 CSS layout and
// score helpers. Original sprites, fixed portrait framing and shared page audio.
// See vendor/floppybird/SOURCES.md for changes, commit and separate art provenance.
// The original distant silhouette remains only the missing-player-file fallback.
export const birdSVG = `<svg viewBox="-25 -22 50 44" xmlns="http://www.w3.org/2000/svg"><g fill="#302f2c"><path d="M-13 3-24-3-19 7-24 10-10 9Z"/><ellipse rx="13" ry="8"/><circle cx="10" cy="-4" r="7"/><path d="m15-5 9 3-9 2Z"/><path class="wing" d="M-5 2Q-23-13-9-20Q-5-9 5 1Z"/></g><circle cx="12" cy="-6" r="1.2" fill="#f7ede3"/></svg>`;

const art={player:null,bird:null,digits:[],smallDigits:[],splash:null,scoreboard:null,replay:null,giveUp:null,medals:{}};
let ready=null;
function image(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Bird art '+src));img.src=src;});}
export function loadFlightArt(){
  return ready??=Promise.all([
    image(PLAYER.src).then(v=>art.player=v,()=>null),
    image(CLONE_IMAGES+'bird.png').then(v=>art.bird=v),
    ...Array.from({length:10},(_,i)=>image(CLONE_IMAGES+'font_big_'+i+'.png').then(v=>art.digits[i]=v)),
    ...Array.from({length:10},(_,i)=>image(CLONE_IMAGES+'font_small_'+i+'.png').then(v=>art.smallDigits[i]=v)),
    ...['splash','scoreboard','sky','land','pipe','pipe-up','pipe-down','replay'].map(key=>image(CLONE_IMAGES+key+'.png').then(v=>art[key]=v)),
    ...['bronze','silver','gold','platinum'].map(key=>image(CLONE_IMAGES+'medal_'+key+'.png').then(v=>art.medals[key]=v)),
  ]).then(()=>{art.giveUp=giveUpButton(art.replay);return art;});
}
export const flightArt=()=>art;
// The clone's own replay button (115x70, drawn at 2x) twinned as "give up" (playtest-2): the same frame and fills,
// its green play triangle swapped for a little orange surrender flag. Built once, from the clone's PNG.
function giveUpButton(replay){
  const k=document.createElement('canvas');k.width=replay.width;k.height=replay.height;const c=k.getContext('2d');c.drawImage(replay,0,0);
  const fill=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  fill('rgb(250,250,250)',46,16,24,14);fill('rgb(237,237,237)',46,30,24,14);
  fill('rgb(84,56,71)',48,14,2,30);fill('rgb(84,56,71)',46,42,6,2);
  // cloth: one fold of wave on its free edge
  fill('rgb(84,56,71)',50,14,18,2);fill('rgb(84,56,71)',50,28,18,2);fill('rgb(84,56,71)',66,16,2,4);fill('rgb(84,56,71)',64,20,2,4);fill('rgb(84,56,71)',66,24,2,4);
  fill('rgb(252,120,40)',50,16,16,4);fill('rgb(252,120,40)',50,20,14,4);fill('rgb(252,120,40)',50,24,16,4);fill('rgb(255,170,90)',50,16,16,2);
  return k;
}
// Game-over buttons in playfield coordinates: the clone's replay spot under the scoreboard, split in two.
export const OVER_BUTTONS={y:269,w:115,h:70,retry:26,giveUp:147};
export const playerFrame=(elapsed,reduced=false,distant=false)=>reduced?1:PLAYER.order[Math.floor(elapsed*(distant?4:10))%PLAYER.order.length];
export function drawPlayer(c,x,y,angle,frame){
  c.save();c.translate(x,y);c.rotate(angle);c.imageSmoothingEnabled=false;
  if(art.player)c.drawImage(art.player,frame*PLAYER.frameWidth,0,PLAYER.frameWidth,PLAYER.frameHeight,
    -PLAYER.pivot[0]*PLAYER_SCALE,-PLAYER.pivot[1]*PLAYER_SCALE,PLAYER.frameWidth*PLAYER_SCALE,PLAYER.frameHeight*PLAYER_SCALE);
  else if(art.bird)c.drawImage(art.bird,0,frame*24,34,24,-17,-12,34,24);
  c.restore();
}
function digits(c,value,x,y,small=false){
  const images=String(value).split('').map(n=>(small?art.smallDigits:art.digits)[+n]);
  const width=images.reduce((sum,img)=>sum+img.width+2,0)-2;
  let left=Math.round(x-(small?width:width/2));
  for(const img of images){c.drawImage(img,left,y);left+=img.width+2;}
}
function strip(c,img,left,right,y,offset){
  const start=Math.floor((left+offset)/img.width)*img.width-offset;
  for(let x=start;x<right;x+=img.width)c.drawImage(img,Math.round(x),y);
}
function scenery(c,game,view){
  const left=-view.x/view.scale,right=(view.viewportWidth-view.x)/view.scale;
  const top=-view.y/view.scale,bottom=(view.viewportHeight-view.y)/view.scale;
  c.fillStyle='#4ec0ca';c.fillRect(left,top,right-left,bottom-top);
  strip(c,art.sky,left,right,game.floor-art.sky.height,game.distance*.25);
  c.fillStyle='#ded895';c.fillRect(left,game.floor,right-left,bottom-game.floor);
  strip(c,art.land,left,right,game.floor,game.distance);
  // Wide screens retain the classic landscape, with a quiet edge around the
  // actual portrait lane. Obstacles and hit tests never extend into the margins.
  if(view.x>0){
    c.fillStyle='#183f4224';c.fillRect(left,top,-left,bottom-top);c.fillRect(game.width,top,right-game.width,bottom-top);
    c.fillStyle='#183f4238';c.fillRect(-1/view.scale,top,1/view.scale,bottom-top);c.fillRect(game.width,top,1/view.scale,bottom-top);
  }
}
function pipes(c,game,top){
  for(const p of game.pipes){
    if(p.centerX+p.w<0||p.centerX>game.width)continue;
    const x=Math.round(p.centerX),upper=Math.round(p.centerY-game.gap/2),lower=Math.round(p.centerY+game.gap/2);
    // The one-row tube stretches only vertically; both 52×26 caps stay intact.
    c.drawImage(art.pipe,x,top,p.w,upper-top);c.drawImage(art['pipe-down'],x,upper-26);
    c.drawImage(art.pipe,x,lower,p.w,game.floor-lower);c.drawImage(art['pipe-up'],x,lower);
  }
}
export function drawFlight(c,game,elapsed,reduced,view,over=0,best=game.score){
  c.save();c.translate(view.x,view.y);c.scale(view.scale,view.scale);c.imageSmoothingEnabled=false;
  scenery(c,game,view);
  // Tall phones extend the sky above the native frame. Pipes continue offscreen
  // through that margin instead of ending abruptly below the controls.
  const top=-view.y/view.scale;
  c.save();c.beginPath();c.rect(0,top,game.width,game.floor-top);c.clip();pipes(c,game,top);
  drawPlayer(c,game.bird.vx,game.bird.vy,game.bird.play?game.bird.rotation:0,playerFrame(elapsed,reduced||game.dead));
  c.restore();
  if(!game.bird.play)c.drawImage(art.splash,Math.round((game.width-art.splash.width)/2),75);
  else if(!game.dead)digits(c,game.score,game.width/2,24);
  if(game.dead){
    const x=Math.round((game.width-art.scoreboard.width)/2),y=64;
    c.drawImage(art.scoreboard,x,y);
    if(game.score>=10){const medal=game.score>=40?'platinum':game.score>=30?'gold':game.score>=20?'silver':'bronze';c.drawImage(art.medals[medal],x+32,y+114);}
    digits(c,game.score,x+211,y+105,true);digits(c,Math.max(best,game.score),x+211,y+147,true);   // the best line: the kept high score (e1113-22)
    if(over>0&&art.replay){
      c.save();c.globalAlpha=Math.min(1,over);const lift=reduced?0:Math.round((1-Math.min(1,over))*12),b=OVER_BUTTONS;
      c.drawImage(art.replay,b.retry,b.y+lift);c.drawImage(art.giveUp,b.giveUp,b.y+lift);c.restore();
    }
  }
  c.restore();
}
